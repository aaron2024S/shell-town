<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/api/client';
import { LIST_PAGE_SIZE } from '@/utils/pagination';
import { useToastStore } from '@/stores/toast';
import GlassCard from '@/components/GlassCard.vue';
import ZodiacAvatar from '@/components/ZodiacAvatar.vue';
import PetAvatar from '@/components/PetAvatar.vue';
import EmptyState from '@/components/EmptyState.vue';
import AccountManagerModal from '@/components/AccountManagerModal.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import Modal from '@/components/Modal.vue';
import Pager from '@/components/Pager.vue';
import { STAT_META } from '@/utils/pets';

const router = useRouter();
const toast = useToastStore();

interface ChildCard {
  id: number;
  name: string;
  avatar: string;
  total_points: number;
  today_points: number;
}

interface PetInfo {
  id: number;
  species: string;
  speciesName: string;
  displayName: string;
  seriesLabel: string;
  level: number;
  stageName: string;
  isMax: boolean;
  exp: number;
  expToNext: number;
  /** 满级所需累计经验（按物种阈值，服务端 petView 返回） */
  totalMaxExp: number;
  satiety: number;
  happiness: number;
  health: number;
  moodLabel: string;
  moodTip: string;
  adoptedAt: number;
}

interface PetRow {
  id: number;
  name: string;
  totalPoints: number;
  pointsSpentOnPet: number;
  pet: PetInfo | null;
  /** 每日喂养额度（0 = 不限） */
  quota: {
    todayFed: number;
    todayPoints: number;
    feedLimit: number;
    pointsLimit: number;
    feedsLeft: number | null;
    pointsLeft: number | null;
  };
}

interface Dashboard {
  children: ChildCard[];
  todaySummary: { gain: number; loss: number; count: number };
}

interface Log {
  id: number;
  delta: number;
  note: string;
  source: string;
  creator_name: string | null;
  created_at: number;
}

const data = ref<Dashboard | null>(null);
const loading = ref(true);
const accountOpen = ref(false);

// 积分记录弹窗（每页 20 条翻页）
const logsOpen = ref(false);
const logsChild = ref<ChildCard | null>(null);
const logs = ref<Log[]>([]);
const logsLoading = ref(false);
const logsPage = ref(1);
const logsTotal = ref(0);
const LOGS_PAGE_SIZE = LIST_PAGE_SIZE;

// 宠物总览
const petRows = ref<PetRow[]>([]);
const minPetCost = ref<number | null>(null);
/** /pets 拉取失败（区别于"真的没有宠物"）：失败时不能对孩子卡片显示"未领养宠物"，
 *  那会让家长以为宠物丢了，实际只是这次请求挂了。 */
const petLoadFailed = ref(false);
const petMap = computed(() => {
  const m = new Map<number, PetRow>();
  for (const r of petRows.value) m.set(r.id, r);
  return m;
});
const petOpen = ref(false);
const petChild = ref<ChildCard | null>(null);
const petLogs = ref<Array<{ id: number; item_name: string; points: number; effectText: string; created_at: number }>>([]);
const petLogsLoading = ref(false);
const petLogsPage = ref(1);
const petLogsTotal = ref(0);
const PET_LOGS_PAGE_SIZE = LIST_PAGE_SIZE;
const resetOpen = ref(false);

// 每日喂养限制编辑（在宠物详情弹窗里）
const limitFeed = ref(0);
const limitPoints = ref(0);
const limitSaving = ref(false);

function quotaOf(childId: number): PetRow['quota'] | null {
  return petMap.value.get(childId)?.quota ?? null;
}

function petOf(childId: number): PetInfo | null {
  return petMap.value.get(childId)?.pet ?? null;
}
function spentOf(childId: number): number {
  return petMap.value.get(childId)?.pointsSpentOnPet ?? 0;
}

const sortedChildren = computed(() => {
  const list = data.value?.children ?? [];
  return [...list].sort((a, b) => b.total_points - a.total_points);
});

const sourceLabels: Record<string, string> = {
  daily: '⭐ 日常',
  adhoc: '📋 任务',
  exchange: '🎁 兑换',
  adjust: '✏️ 调整',
};

async function load() {
  loading.value = true;
  petLoadFailed.value = false;
  try {
    const [d, p] = await Promise.all([
      api.get<Dashboard>('/dashboard'),
      // 失败时不再假装"没有宠物"：记下失败标记，卡片上提示加载失败而不是"未领养宠物"
      api.get<{ children: PetRow[]; minPetItemCost?: number | null }>('/pets')
        .catch(() => { petLoadFailed.value = true; return { children: [] as PetRow[] }; }),
    ]);
    data.value = d;
    petRows.value = p.children ?? [];
    minPetCost.value = (p as any).minPetItemCost ?? null;
  } finally {
    loading.value = false;
  }
}

/** 打开某个孩子的宠物详情 */
async function openPet(c: ChildCard) {
  petChild.value = c;
  petOpen.value = true;
  const q = quotaOf(c.id);
  limitFeed.value = q?.feedLimit ?? 0;
  limitPoints.value = q?.pointsLimit ?? 0;
  await loadPetLogs(c.id, 1);
}

/** 喂养记录分页加载 */
async function loadPetLogs(childId: number, p = petLogsPage.value) {
  petLogsLoading.value = true;
  try {
    const res = await api.get<{ logs: typeof petLogs.value; total: number }>(
      `/pets/${childId}/logs?limit=${PET_LOGS_PAGE_SIZE}&offset=${(p - 1) * PET_LOGS_PAGE_SIZE}`,
    );
    petLogs.value = res.logs ?? [];
    petLogsTotal.value = res.total ?? petLogs.value.length;
    petLogsPage.value = p;
  } catch {
    petLogs.value = [];
    petLogsTotal.value = 0;
  } finally {
    petLogsLoading.value = false;
  }
}

/** 保存每日喂养限制（0 = 不限） */
async function saveLimits() {
  if (!petChild.value || limitSaving.value) return;
  limitSaving.value = true;
  try {
    await api.put(`/pets/${petChild.value.id}/limits`, {
      feedLimit: Math.max(0, Math.floor(Number(limitFeed.value) || 0)),
      pointsLimit: Math.max(0, Math.floor(Number(limitPoints.value) || 0)),
    });
    await load();
  } catch (e: any) {
    // 原来是 `catch { /* 静默失败 */ }`：家长以为限额已经存上，实际没有，孩子那边照旧
    toast.error(e?.payload?.message || e?.message || '保存失败，请重试');
  }
  finally {
    limitSaving.value = false;
  }
}

/** 家长帮孩子重置宠物（误领养等场景） */
async function doResetPet() {
  if (!petChild.value) return;
  try {
    await api.delete(`/pets/${petChild.value.id}`);
    await load();
    petOpen.value = false;
    toast.success('已重置该孩子的宠物');
  } catch (e: any) {
    toast.error(e?.payload?.message || e?.message || '重置失败，请重试');
  }
}

// 点击今日统计卡片 → 积分记录页
function goLogs() {
  router.push('/parent/logs');
}

async function openLogs(c: ChildCard, p = logsPage.value) {
  logsChild.value = c;
  logsOpen.value = true;
  logsLoading.value = true;
  try {
    const res = await api.get<{ logs: Log[]; total: number }>(
      `/point-logs?userId=${c.id}&limit=${LOGS_PAGE_SIZE}&offset=${(p - 1) * LOGS_PAGE_SIZE}`,
    );
    logs.value = res.logs;
    logsTotal.value = res.total ?? res.logs.length;
    logsPage.value = p;
  } finally {
    logsLoading.value = false;
  }
}

function fmtTime(ts: number): string {
  const d = new Date(ts * 1000);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`;
  if (d.toDateString() === now.toDateString()) {
    return `今天 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

onMounted(load);
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1 class="title">总览</h1>
        <p class="subtitle">家庭积分排行</p>
      </div>
      <button class="btn btn-primary" @click="accountOpen = true">
        账号管理
      </button>
    </header>

    <!-- 今日统计（点击整卡查看积分记录） -->
    <GlassCard v-if="data" class="today-summary" padding="16px 20px" hover @click="goLogs">
      <div class="summary-grid">
        <div class="summary-item">
          <span class="label">今日加分</span>
          <span class="value gain">+{{ data.todaySummary.gain }}</span>
        </div>
        <div class="divider"></div>
        <div class="summary-item">
          <span class="label">今日扣分</span>
          <span class="value loss">{{ data.todaySummary.loss }}</span>
        </div>
        <div class="divider"></div>
        <div class="summary-item">
          <span class="label">今日操作</span>
          <span class="value">{{ data.todaySummary.count }} 次</span>
        </div>
      </div>
    </GlassCard>

    <!-- 排行榜 -->
    <div v-if="loading" class="loading">
      <div v-for="i in 3" :key="i" class="skeleton-card"></div>
    </div>

    <EmptyState
      v-else-if="sortedChildren.length === 0"
      emoji="🐣"
      text="还没有小朋友呢"
      hint="点击右上角新增一个吧~"
    />

    <div v-else class="rank-list">
      <GlassCard
        v-for="c in sortedChildren"
        :key="c.id"
        hover
        padding="18px 20px"
        class="rank-card"
        @click="openLogs(c)"
      >
        <ZodiacAvatar :zodiac="c.avatar" :size="72" show-ring />
        <div class="info">
          <div class="name">{{ c.name }}</div>
          <div class="meta">
            今日得分 <strong class="today-points">+{{ c.today_points }}</strong>
          </div>
          <!-- 宠物缩略 -->
          <button class="pet-chip" :class="{ none: !petOf(c.id) }" @click.stop="openPet(c)">
            <PetAvatar
              v-if="petOf(c.id)"
              :species="petOf(c.id)!.species"
              :level="petOf(c.id)!.level"
              :size="34"
            />
            <span v-else class="pet-egg">🥚</span>
            <span v-if="petLoadFailed" class="pet-lv pet-lv-fail">宠物信息加载失败，请刷新重试</span>
            <span v-else class="pet-lv">{{ petOf(c.id) ? `Lv${petOf(c.id)!.level} ${petOf(c.id)!.stageName}` : '未领养宠物' }}</span>
            <span class="pet-go">详情 ›</span>
          </button>
        </div>
        <div class="points">
          <span class="num">{{ c.total_points }}</span>
          <span class="unit">分</span>
        </div>
      </GlassCard>
    </div>

    <AccountManagerModal
      v-model="accountOpen"
      @changed="load"
    />

    <!-- 积分记录弹窗 -->
    <Modal
      v-model="logsOpen"
      :title="logsChild ? `${logsChild.name} 的积分记录` : '积分记录'"
      width="480px"
    >
      <div v-if="logsLoading" class="logs-loading">加载中...</div>
      <div v-else-if="logs.length === 0" class="logs-empty">暂无积分记录</div>
      <div v-else class="logs-list">
        <div v-for="log in logs" :key="log.id" class="log-item">
          <div :class="['log-delta', log.delta > 0 ? 'gain' : 'loss']">
            {{ log.delta > 0 ? '+' : '' }}{{ log.delta }} 🌟
          </div>
          <div class="log-body">
            <div class="log-note">
              <span class="log-source">{{ sourceLabels[log.source] || log.source }}</span>
              <span v-if="log.note">· {{ log.note }}</span>
            </div>
            <div class="log-time">{{ fmtTime(log.created_at) }}</div>
          </div>
        </div>
        <Pager
          v-if="logsChild"
          :page="logsPage"
          :page-size="LOGS_PAGE_SIZE"
          :total="logsTotal"
          :disabled="logsLoading"
          @update:page="openLogs(logsChild, $event)"
        />
      </div>
    </Modal>
    <!-- 宠物详情弹窗 -->
    <Modal
      v-model="petOpen"
      :title="petChild ? `${petChild.name} 的宠物` : '宠物详情'"
      width="480px"
    >
      <template v-if="petChild">
        <div v-if="!petOf(petChild.id)" class="pet-empty">
          <span class="pe-emoji">🥚</span>
          <p>{{ petChild.name }} 还没有领养宠物</p>
          <p class="pe-hint">孩子可以在自己的「宠物」页面领养一只</p>
        </div>
        <div v-else class="pet-detail">
          <div class="pd-head">
            <PetAvatar
              :species="petOf(petChild.id)!.species"
              :level="petOf(petChild.id)!.level"
              :size="96"
            />
            <div class="pd-info">
              <div class="pd-name">{{ petOf(petChild.id)!.displayName }}</div>
              <div class="pd-tags">
                <span class="pd-tag lv">Lv{{ petOf(petChild.id)!.level }}</span>
                <span class="pd-tag">{{ petOf(petChild.id)!.stageName }}</span>
                <span class="pd-tag">{{ petOf(petChild.id)!.seriesLabel }}系</span>
              </div>
              <div class="pd-exp">
                <template v-if="petOf(petChild.id)!.isMax">🎉 已满级（究极体）</template>
                <template v-else>经验 {{ petOf(petChild.id)!.exp }} / {{ petOf(petChild.id)!.totalMaxExp }} · 还差 {{ petOf(petChild.id)!.expToNext }} 进化</template>
              </div>
            </div>
          </div>

          <div class="pd-stats">
            <div v-for="m in STAT_META" :key="m.key" class="pd-stat">
              <div class="pds-head">
                <span>{{ m.emoji }} {{ m.label }}</span>
                <span class="pds-num">{{ petOf(petChild.id)![m.key] }}</span>
              </div>
              <div class="pds-bar">
                <div
                  class="pds-fill"
                  :style="{ width: petOf(petChild.id)![m.key] + '%', background: m.color }"
                ></div>
              </div>
            </div>
          </div>

          <div class="pd-mood">{{ petOf(petChild.id)!.moodLabel }} · {{ petOf(petChild.id)!.moodTip }}</div>

          <!-- 每日用量与限额设置（0 = 不限） -->
          <div v-if="quotaOf(petChild.id)" class="pd-quota">
            <div class="pdq-usage">
              <span>今天已喂 <b>{{ quotaOf(petChild.id)!.todayFed }}</b> 次<template v-if="quotaOf(petChild.id)!.feedLimit > 0"> / {{ quotaOf(petChild.id)!.feedLimit }}</template></span>
              <span>今天已用 <b>{{ quotaOf(petChild.id)!.todayPoints }}</b> 🌟<template v-if="quotaOf(petChild.id)!.pointsLimit > 0"> / {{ quotaOf(petChild.id)!.pointsLimit }}</template></span>
            </div>
            <div class="pdq-edit">
              <label>每天最多喂 <input v-model.number="limitFeed" type="number" min="0" max="99" /> 次</label>
              <label>每天宠物积分上限 <input v-model.number="limitPoints" type="number" min="0" max="9999" /> 分</label>
              <button class="pdq-save" :disabled="limitSaving" @click="saveLimits">{{ limitSaving ? '保存中…' : '保存' }}</button>
            </div>
            <p class="pdq-hint">填 0 表示不限制；孩子喂超了会看到「明天再来陪它吧」的提示</p>
            <p v-if="limitPoints > 0 && minPetCost && limitPoints < minPetCost" class="pdq-hint pdq-warn">
              ⚠️ 当前预算低于最便宜的宠物道具（{{ minPetCost }} 分），孩子将无法使用任何道具
            </p>
          </div>

          <div class="pd-spent">宠物玩法累计消耗 {{ spentOf(petChild.id) }} 积分（均为孩子自愿兑换）</div>

          <div class="pd-logs-title">喂养记录</div>
          <div v-if="petLogsLoading" class="logs-loading">加载中...</div>
          <div v-else-if="petLogs.length === 0" class="logs-empty">还没有喂养记录</div>
          <div v-else class="logs-list">
            <div v-for="l in petLogs" :key="l.id" class="log-item">
              <div class="log-delta loss">-{{ l.points }} 🌟</div>
              <div class="log-body">
                <div class="log-note">
                  <span class="log-source">🍽️ {{ l.item_name }}</span>
                  <span v-if="l.effectText">· {{ l.effectText }}</span>
                </div>
                <div class="log-time">{{ fmtTime(l.created_at) }}</div>
              </div>
            </div>
          </div>
          <Pager
            :page="petLogsPage"
            :page-size="PET_LOGS_PAGE_SIZE"
            :total="petLogsTotal"
            :disabled="petLogsLoading"
            @update:page="petChild && loadPetLogs(petChild.id, $event)"
          />

          <button class="pd-reset" @click="resetOpen = true">重置这只宠物</button>
        </div>
      </template>
    </Modal>

    <ConfirmDialog
      v-model="resetOpen"
      title="重置宠物"
      :message="`确认删除${petChild?.name ?? ''}的宠物？删除后孩子需要重新领养，宠物等级会从 Lv1 开始`"
      confirmText="重置"
      variant="danger"
      @confirm="doResetPet"
    />
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 20px;
  gap: 12px;
}
.title { font-size: 26px; margin-bottom: 2px; }
.subtitle { color: var(--text-secondary); font-size: 13px; }

.today-summary {
  margin-bottom: 24px;
}
.summary-grid {
  display: flex;
  align-items: center;
  justify-content: space-around;
}
.summary-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.summary-item .label {
  font-size: 12px;
  color: var(--text-muted);
}
.summary-item .value {
  font-size: 22px;
  font-family: var(--font-cute);
}
.gain { color: var(--accent-mint); }
.loss { color: var(--accent-pink); }
.divider {
  width: 1px;
  height: 32px;
  background: var(--glass-border);
}

.loading {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.skeleton-card {
  height: 88px;
  border-radius: var(--r-lg);
  background: var(--glass-bg);
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.8; }
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rank-card {
  display: flex;
  align-items: center;
  gap: 14px;
}

.info { flex: 1; }
.name { font-size: 17px; font-family: var(--font-cute); }
.meta { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.today-points {
  color: var(--accent-mint);
  font-family: var(--font-cute);
  font-size: 14px;
}

.points {
  text-align: right;
}
.points .num {
  font-size: 26px;
  font-family: var(--font-cute);
  color: var(--accent-yellow);
}
.points .unit {
  font-size: 12px;
  color: var(--text-muted);
  margin-left: 2px;
}

/* 积分记录弹窗 */
.logs-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 4px;
}
.log-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-radius: var(--r-md);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
}
.log-delta {
  font-size: 20px;
  font-family: var(--font-cute);
  flex-shrink: 0;
  min-width: 72px;
  text-align: right;
}
.log-delta.gain { color: var(--accent-mint); }
.log-delta.loss { color: var(--accent-pink); }
.log-body {
  flex: 1;
  min-width: 0;
}
.log-note {
  font-size: 14px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.log-source {
  margin-right: 4px;
  opacity: 0.8;
}
.log-time {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}
.logs-loading, .logs-empty {
  padding: 30px 0;
  text-align: center;
  color: var(--text-muted);
}

/* 孩子卡片上的宠物缩略 */
.pet-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding: 3px 10px 3px 4px;
  border-radius: 999px;
  background: rgba(126, 212, 185, 0.16);
  transition: background 0.15s;
}
.pet-chip:hover { background: rgba(126, 212, 185, 0.28); }
.pet-chip.none { background: var(--glass-bg); }
.pet-egg { font-size: 20px; line-height: 1; padding: 0 4px; }
.pet-lv {
  font-size: 11px;
  color: var(--text-secondary);
  font-family: var(--font-cute);
}
/* 加载失败态：用警示色区别于"真的未领养"，避免家长误判宠物丢失 */
.pet-lv-fail { color: var(--danger); }
.pet-go { font-size: 10px; color: var(--accent-orange); }

/* 宠物详情弹窗 */
.pet-empty {
  text-align: center;
  padding: 20px 0 10px;
  color: var(--text-secondary);
  font-size: 14px;
}
.pet-empty .pe-emoji { font-size: 44px; display: block; margin-bottom: 8px; }
.pet-empty .pe-hint { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

.pet-detail { display: flex; flex-direction: column; gap: 14px; }
.pd-head {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px;
  border-radius: var(--r-lg);
  background: linear-gradient(135deg, rgba(126, 212, 185, 0.16), rgba(255, 209, 102, 0.12));
}
.pd-info { flex: 1; min-width: 0; }
.pd-name { font-family: var(--font-cute); font-size: 19px; margin-bottom: 6px; }
.pd-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.pd-tag {
  font-size: 11px;
  padding: 2px 9px;
  border-radius: 10px;
  background: var(--glass-bg-strong);
  color: var(--text-secondary);
}
.pd-tag.lv {
  background: linear-gradient(135deg, var(--accent-yellow), var(--accent-orange));
  color: #4a2e00;
  font-family: var(--font-cute);
}
.pd-exp { font-size: 11px; color: var(--text-muted); margin-top: 8px; }

.pd-stats { display: flex; flex-direction: column; gap: 8px; }
.pds-head {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.pds-num { font-family: var(--font-cute); }
.pds-bar {
  height: 8px;
  border-radius: 999px;
  background: rgba(90, 58, 74, 0.1);
  overflow: hidden;
}
.pds-fill { height: 100%; border-radius: 999px; }

.pd-mood {
  font-size: 12px;
  color: var(--text-secondary);
  padding: 9px 12px;
  border-radius: var(--r-sm);
  background: var(--glass-bg);
  line-height: 1.5;
}
.pd-spent { font-size: 11px; color: var(--text-muted); }

/* 每日用量与限额 */
.pd-quota {
  padding: 12px 14px;
  border-radius: var(--r-md);
  background: var(--glass-bg);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pdq-usage {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-secondary);
}
.pdq-usage b { font-family: var(--font-cute); color: var(--accent-orange); }
.pdq-edit {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--text-secondary);
}
.pdq-edit input {
  width: 56px;
  padding: 4px 6px;
  border-radius: var(--r-sm);
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.75);
  color: var(--text-primary);
  text-align: center;
  font-size: 13px;
}
.pdq-save {
  margin-left: auto;
  padding: 5px 16px;
  border-radius: 999px;
  background: var(--accent-mint);
  color: #fff;
  font-size: 12px;
}
.pdq-save:disabled { opacity: 0.6; }
.pdq-hint { font-size: 11px; color: var(--text-muted); }
.pdq-warn { color: #d97706; font-weight: 600; }
.pd-logs-title {
  font-family: var(--font-cute);
  font-size: 14px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--glass-border);
}
.pd-reset {
  align-self: flex-start;
  font-size: 11px;
  color: var(--danger);
  opacity: 0.75;
  padding: 4px 0;
}
.pd-reset:hover { opacity: 1; text-decoration: underline; }
</style>
