<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { api } from '@/api/client';
import { LIST_PAGE_SIZE } from '@/utils/pagination';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { usePetCatalogStore } from '@/stores/petCatalog';
import { WS_EVENTS } from '@/utils/events';
import GlassCard from '@/components/GlassCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import Pager from '@/components/Pager.vue';
import CategoryIcon from '@/components/CategoryIcon.vue';
import PetAvatar from '@/components/PetAvatar.vue';
import PetAdoptModal from '@/components/PetAdoptModal.vue';
import {
  SERIES_ORDER, SERIES_LABELS, STAT_META, MOOD_META,
  STAGE_NAMES, MAX_LEVEL, stageLabel, petEffectText,
  type PetMood, type PetSeries, type PetEffect,
} from '@/utils/pets';

const catalog = usePetCatalogStore();

interface PetView {
  id: number;
  species: string;
  speciesName: string;
  series: string;
  seriesLabel: string;
  emoji: string;
  nickname: string | null;
  displayName: string;
  exp: number;
  level: number;
  stageName: string;
  isMax: boolean;
  expInLevel: number;
  expToNext: number;
  ratio: number;
  totalMaxExp: number;
  satiety: number;
  happiness: number;
  health: number;
  mood: PetMood;
  moodLabel: string;
  moodTip: string;
  adoptedAt: number;
}

interface Product {
  id: number;
  name: string;
  cost: number;
  stock: number;
  icon: string;
  kind: 'physical' | 'pet';
  pet_effect: PetEffect | null;
}

interface PetLog {
  id: number;
  species: string;
  item_name: string;
  points: number;
  effect: PetEffect | null;
  effectText: string;
  created_at: number;
}

/** 每日喂养额度（家长可配，0/null = 不限） */
interface Quota {
  todayFed: number;
  todayPoints: number;
  feedLimit: number;
  pointsLimit: number;
  feedsLeft: number | null;
  pointsLeft: number | null;
}

const auth = useAuthStore();
const toast = useToastStore();

const pet = ref<PetView | null>(null);
const logs = ref<PetLog[]>([]);
const logPage = ref(1);
const logTotal = ref(0);
const LOG_PAGE_SIZE = LIST_PAGE_SIZE;
const products = ref<Product[]>([]);
const totalSpent = ref(0);
const quota = ref<Quota | null>(null);
const loading = ref(true);
const adoptOpen = ref(false);
const presetSpecies = ref<string | null>(null);
const showGallery = ref(false);
const feedingId = ref<number | null>(null);
const levelUp = ref<{ level: number; stageName: string } | null>(null);

// 改名
const editingName = ref(false);
const nameDraft = ref('');
const savingName = ref(false);

const myPoints = computed(() => auth.user?.totalPoints ?? 0);
const petItems = computed(() => products.value.filter((p) => p.kind === 'pet'));
const moodColor = computed(() => MOOD_META[pet.value?.mood ?? 'ok'].color);

const expPercent = computed(() => {
  if (!pet.value) return 0;
  if (pet.value.isMax) return 100;
  return Math.round(pet.value.ratio * 100);
});

const nextStageName = computed(() => {
  if (!pet.value || pet.value.isMax) return '';
  return STAGE_NAMES[pet.value.level + 1] ?? '';
});

const galleryBySeries = computed(() =>
  SERIES_ORDER.map((s: PetSeries) => ({
    key: s,
    label: SERIES_LABELS[s],
    list: catalog.species.filter((sp) => sp.series === s),
  }))
);

/** 未领养时的展示形象：用目录里的第一只，避免指向已下线的旧物种 key */
const heroSpecies = computed(() => catalog.species[0]?.key ?? 'drake');

/** 拉取喂养记录（分页） */
async function loadLogs(p = logPage.value) {
  const logRes = await api.get<{ logs: PetLog[]; totalPointsSpent: number; total: number }>(
    `/pets/logs/me?limit=${LOG_PAGE_SIZE}&offset=${(p - 1) * LOG_PAGE_SIZE}`
  );
  logs.value = logRes.logs;
  totalSpent.value = logRes.totalPointsSpent;
  logTotal.value = logRes.total ?? logRes.logs.length;
  logPage.value = p;
}

/** forceCatalog=true 时强制重拉物种目录（进页面用），否则复用 store 缓存 */
async function load(forceCatalog = false) {
  loading.value = true;
  try {
    catalog.load(forceCatalog);
    const [me, prodRes] = await Promise.all([
      api.get<{ pet: PetView | null; quota?: Quota }>('/pets/me'),
      api.get<{ products: Product[] }>('/products'),
    ]);
    pet.value = me.pet;
    quota.value = me.quota ?? null;
    products.value = prodRes.products;
    await loadLogs(1);
  } catch (e: any) {
    toast.error(e?.message || '宠物数据加载失败');
  } finally {
    loading.value = false;
  }
}

function openAdopt(preset: string | null = null) {
  presetSpecies.value = preset;
  adoptOpen.value = true;
}

function onAdopted(p: PetView) {
  pet.value = p;
  // 领养/换宠后刷新记录与积分
  load();
}

async function feed(p: Product) {
  if (feedingId.value !== null) return;
  if (!pet.value) {
    toast.info('先领养一只宠物再来喂它吧~');
    return;
  }
  if (myPoints.value < p.cost) {
    toast.warning(`积分不足，还差 ${p.cost - myPoints.value} 分`);
    return;
  }
  feedingId.value = p.id;
  selfFeedUntil = Date.now() + 5000;
  try {
    const res = await api.post<{
      pet: PetView;
      effectText: string;
      itemName: string;
      leveledUp: boolean;
      levelAfter: number;
      stageNameAfter: string;
      newBalance: number;
      quota?: Quota;
    }>('/pets/use-item', { productId: p.id });

    pet.value = res.pet;
    if (res.quota) quota.value = res.quota;
    if (auth.user) auth.setUser({ ...auth.user, totalPoints: res.newBalance });
    toast.success(`${res.pet.displayName} 吃了「${res.itemName}」，${res.effectText}`);

    if (res.leveledUp) {
      levelUp.value = { level: res.levelAfter, stageName: res.stageNameAfter };
    }
    // 刷新记录（回到第一页看最新）+ 商品库存
    await Promise.all([loadLogs(1), (async () => {
      const prodRes = await api.get<{ products: Product[] }>('/products');
      products.value = prodRes.products;
    })()]);
  } catch (e: any) {
    const err = e.payload?.error;
    if (err === 'insufficient_points') toast.error('积分不足');
    else if (err === 'out_of_stock') toast.error('这个道具已经卖完啦');
    else if (err === 'pet_max_level') toast.info('宠物已经满级啦，不用再喂经验道具了');
    else if (err === 'no_pet') toast.info('你还没有宠物哦');
    else if (err === 'feed_limit_reached') toast.info('今天陪宠物玩的时间用完啦，明天再来陪它吧~');
    else if (err === 'points_limit_reached') toast.info('今天的宠物积分用完啦，明天再来吧~');
    else toast.error(e.message || '喂养失败');
  } finally {
    feedingId.value = null;
  }
}

function startEditName() {
  nameDraft.value = pet.value?.nickname ?? '';
  editingName.value = true;
}

async function saveName() {
  if (!pet.value || savingName.value) return;
  savingName.value = true;
  try {
    const res = await api.patch<{ pet: PetView }>('/pets/me', { nickname: nameDraft.value.trim() });
    pet.value = res.pet;
    editingName.value = false;
    toast.success('名字改好啦');
  } catch (e: any) {
    toast.error(e.payload?.error === 'no_pet' ? '你还没有宠物' : (e.message || '改名失败'));
  } finally {
    savingName.value = false;
  }
}

function fmtTime(ts: number): string {
  const d = new Date(ts * 1000);
  const diff = Date.now() - ts * 1000;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (d.toDateString() === new Date().toDateString()) {
    return `今天 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function statValue(key: 'satiety' | 'happiness' | 'health'): number {
  return pet.value ? pet.value[key] : 0;
}

// 自己喂养时服务端也会回推 pet_fed，而 POST 响应已经把状态和记录都更新了 ——
// 再按事件重拉一遍就是「一次喂养两轮请求」。用时间窗抑制自触发的那一次。
let selfFeedUntil = 0;

function onFedEvent() {
  if (Date.now() < selfFeedUntil) return;
  load();
}

onMounted(() => {
  // 进页面强制重拉物种目录：家长端刚新增/改名的宠物立即可见（无需刷新，更不用重启容器）
  load(true);
  window.addEventListener(WS_EVENTS.petFed, onFedEvent);
});

onUnmounted(() => {
  window.removeEventListener(WS_EVENTS.petFed, onFedEvent);
});
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1 class="title">我的宠物</h1>
        <p class="subtitle">每天来看看它，陪它一起长大~</p>
      </div>
      <div class="points-box">
        <span class="num">{{ myPoints }}</span>
        <span class="unit">分</span>
        <span class="emoji">🌟</span>
      </div>
    </header>

    <!-- ── 还没有宠物 ───────────────────────────────────────── -->
    <GlassCard v-if="!loading && !pet" class="intro">
      <PetAvatar :species="heroSpecies" :level="0" :size="132" />
      <h2 class="intro-title">你还没有宠物哦</h2>
      <p class="intro-desc">
        去领养一只吧！它会陪着你，一起从蛋慢慢长大，攒积分喂它就能升级进化~
      </p>
      <div class="intro-chips">
        <span v-for="g in galleryBySeries" :key="g.key" class="chip">
          {{ g.label }} {{ g.list.length }} 只
        </span>
      </div>
      <button class="btn btn-primary intro-btn" @click="openAdopt()">🎉 去领养一只</button>
    </GlassCard>

    <!-- ── 宠物房间 ─────────────────────────────────────────── -->
    <template v-else-if="pet">
      <GlassCard class="room" padding="22px 20px">
        <div class="stage-wrap" :style="{ '--mood': moodColor }">
          <PetAvatar :species="pet.species" :level="pet.level" :mood="pet.mood" :size="150" ring />
        </div>

        <div class="name-row">
          <template v-if="editingName">
            <input
              v-model="nameDraft"
              class="name-input"
              type="text"
              maxlength="12"
              :placeholder="pet.speciesName"
              @keyup.enter="saveName"
            />
            <button class="mini-btn" :disabled="savingName" @click="saveName">✓</button>
            <button class="mini-btn" @click="editingName = false">✕</button>
          </template>
          <template v-else>
            <h2 class="pet-name">{{ pet.displayName }}</h2>
            <button class="edit-btn" title="改名" @click="startEditName">✏️</button>
          </template>
        </div>

        <div class="badges">
          <span class="badge lv">Lv{{ pet.level }}</span>
          <span class="badge stage">{{ pet.stageName }}</span>
          <span class="badge series">{{ pet.seriesLabel }}系</span>
        </div>

        <!-- 经验进度 -->
        <div class="exp-block">
          <div class="exp-head">
            <span v-if="pet.isMax" class="max-text">🎉 已经满级啦，它是究极体！</span>
            <span v-else>
              再攒 <b>{{ pet.expToNext }}</b> 经验进化为「{{ nextStageName }}」
            </span>
            <span class="exp-num">{{ pet.exp }} / {{ pet.totalMaxExp }}</span>
          </div>
          <div class="bar">
            <div class="bar-fill exp" :style="{ width: expPercent + '%' }"></div>
          </div>
        </div>

        <!-- 状态值 -->
        <div class="stats">
          <div v-for="m in STAT_META" :key="m.key" class="stat">
            <div class="stat-head">
              <span class="stat-label">{{ m.emoji }} {{ m.label }}</span>
              <span class="stat-num">{{ statValue(m.key) }}</span>
            </div>
            <div class="bar">
              <div
                class="bar-fill"
                :style="{ width: statValue(m.key) + '%', background: m.color }"
              ></div>
            </div>
          </div>
        </div>

        <div class="mood-tip" :style="{ borderColor: moodColor + '55' }">
          <span class="mood-label" :style="{ color: moodColor }">{{ pet.moodLabel }}</span>
          <span class="mood-text">{{ pet.moodTip }}</span>
        </div>

        <p class="growth-hint">💡 状态越好，用道具获得的经验越多：超级开心 ×1.5 · 有点委屈 ×0.6 · 肚子饿 ×0.5</p>

        <div class="room-foot">
          <span class="adopt-time">领养于 {{ fmtTime(pet.adoptedAt) }}</span>
          <button class="link-btn" @click="openAdopt()">换宠物 / 改名 ›</button>
        </div>
      </GlassCard>

      <!-- ── 喂食 ───────────────────────────────────────────── -->
      <h2 class="section-title">喂它吃点东西</h2>
      <p class="section-sub">用积分换道具，喂给它就能升级（不用等家长审核，立即生效）</p>
      <!-- 每日额度（家长设置后才显示）：温和提醒，不出现"限制/禁止"字眼 -->
      <p v-if="quota && (quota.feedLimit > 0 || quota.pointsLimit > 0)" class="quota-chip">
        <template v-if="quota.feedLimit > 0">
          今天已陪它 {{ quota.todayFed }}/{{ quota.feedLimit }} 次<template v-if="quota.feedsLeft">，还能喂 {{ quota.feedsLeft }} 次</template>
        </template>
        <template v-if="quota.pointsLimit > 0">
          {{ quota.feedLimit > 0 ? ' · ' : '' }}宠物积分还剩 {{ quota.pointsLeft }} 🌟
        </template>
      </p>

      <EmptyState
        v-if="petItems.length === 0"
        emoji="🍚"
        text="还没有宠物道具"
        hint="让爸爸妈妈在商城里添加宠物道具吧~"
      />
      <div v-else class="items">
        <GlassCard
          v-for="p in petItems"
          :key="p.id"
          padding="12px 14px"
          hover
          class="item"
          :class="{ disabled: myPoints < p.cost || p.stock === 0 }"
          @click="feed(p)"
        >
          <!-- 与商城/家长端同一套 CategoryIcon，保证三处图标一致 -->
          <CategoryIcon :icon="p.icon" :size="40" />
          <div class="item-info">
            <span class="item-name">{{ p.name }}</span>
            <span class="item-effect">{{ petEffectText(p.pet_effect) }}</span>
          </div>
          <span class="item-cost">{{ p.cost }} 🌟</span>
        </GlassCard>
      </div>

      <!-- ── 喂养记录 ───────────────────────────────────────── -->
      <div class="section-head">
        <h2 class="section-title">喂养记录</h2>
        <span v-if="totalSpent > 0" class="spent">共花 {{ totalSpent }} 🌟</span>
      </div>

      <EmptyState v-if="logs.length === 0" emoji="📜" text="还没有喂过它" hint="喂一次就会记录在这里~" />
      <div v-else class="logs">
        <GlassCard v-for="l in logs" :key="l.id" padding="10px 14px" class="log">
          <span class="log-ico">🍽️</span>
          <div class="log-info">
            <span class="log-name">{{ l.item_name }}</span>
            <span class="log-effect">{{ l.effectText }}</span>
          </div>
          <div class="log-right">
            <span class="log-cost">-{{ l.points }} 🌟</span>
            <span class="log-time">{{ fmtTime(l.created_at) }}</span>
          </div>
        </GlassCard>
      </div>
      <Pager :page="logPage" :page-size="LOG_PAGE_SIZE" :total="logTotal" @update:page="loadLogs" />

      <!-- ── 图鉴 ───────────────────────────────────────────── -->
      <button class="gallery-toggle" @click="showGallery = !showGallery">
        📖 宠物图鉴（{{ catalog.species.length }} 只）<span class="toggle-arrow">{{ showGallery ? '收起 ▲' : '展开 ▼' }}</span>
      </button>

      <div v-if="showGallery" class="gallery">
        <p class="gallery-hint">点一下可以看它的进化预览，也可以直接换成它</p>
        <div v-for="g in galleryBySeries" :key="g.key" class="gallery-group">
          <h3 class="group-title">{{ g.label }}系列</h3>
          <div class="gallery-grid">
            <button
              v-for="sp in g.list"
              :key="sp.key"
              class="g-cell"
              :class="{ mine: pet.species === sp.key }"
              @click="openAdopt(sp.key)"
            >
              <!-- 图鉴展示究极体（Lv4）：素材最高只有 MAX_LEVEL，传更大值会退化成 emoji 兜底 -->
              <PetAvatar :species="sp.key" :level="MAX_LEVEL" :size="52" />
              <span class="g-name">{{ sp.name }}</span>
              <span v-if="pet.species === sp.key" class="g-mine">我的</span>
            </button>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="loading">加载中…</div>

    <!-- ── 进化庆祝 ─────────────────────────────────────────── -->
    <Transition name="pop">
      <div v-if="levelUp && pet" class="celebrate-mask" @click="levelUp = null">
        <div class="celebrate glass-strong">
          <PetAvatar :species="pet.species" :level="levelUp.level" :size="150" mood="happy" />
          <div class="c-title">🎉 进化啦！</div>
          <div class="c-stage">{{ stageLabel(levelUp.level) }}</div>
          <div class="c-hint">点一下继续</div>
        </div>
      </div>
    </Transition>

    <PetAdoptModal
      v-model="adoptOpen"
      :current="pet ? { species: pet.species, level: pet.level, nickname: pet.nickname } : null"
      :preset="presetSpecies"
      @adopted="onAdopted"
    />
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.title { font-size: 24px; margin-bottom: 2px; }
.subtitle { color: var(--text-secondary); font-size: 13px; }
.points-box {
  background: linear-gradient(135deg, var(--accent-yellow), var(--accent-orange));
  padding: 8px 16px;
  border-radius: var(--r-md);
  box-shadow: 0 4px 12px rgba(255, 180, 84, 0.3);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.points-box .emoji { font-size: 16px; }
.points-box .num { font-family: var(--font-cute); font-size: 24px; color: #4a2e00; }
.points-box .unit { font-size: 12px; color: #4a2e00; }

/* 未领养 */
.intro {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  padding: 28px 20px;
}
.intro-title { font-family: var(--font-cute); font-size: 20px; }
.intro-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.7;
  max-width: 300px;
}
.intro-chips { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.chip {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 10px;
  background: var(--glass-bg);
  color: var(--text-secondary);
}
.intro-btn { margin-top: 6px; padding: 10px 24px; }

/* 宠物房间 */
.room {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}
.stage-wrap { display: inline-flex; }

.name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
}
.pet-name { font-family: var(--font-cute); font-size: 22px; }
.edit-btn { font-size: 14px; opacity: 0.6; }
.name-input {
  width: 150px;
  padding: 6px 10px;
  border-radius: var(--r-sm);
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.75);
  font-size: 15px;
  color: var(--text-primary);
  text-align: center;
}
.mini-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--glass-bg);
  color: var(--text-secondary);
  font-size: 13px;
}

.badges { display: flex; gap: 6px; align-items: center; }
.badge {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 10px;
  background: var(--glass-bg);
  color: var(--text-secondary);
}
.badge.lv {
  background: linear-gradient(135deg, var(--accent-yellow), var(--accent-orange));
  color: #4a2e00;
  font-family: var(--font-cute);
  font-size: 12px;
}

.exp-block { width: 100%; margin-top: 4px; }
.exp-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.exp-head b { color: var(--accent-orange); font-size: 14px; }
.exp-num { font-size: 11px; color: var(--text-muted); }
.max-text { color: var(--accent-orange); font-family: var(--font-cute); }

.bar {
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: rgba(90, 58, 74, 0.1);
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease;
}
.bar-fill.exp { background: linear-gradient(90deg, var(--accent-yellow), var(--accent-orange)); }

.stats {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}
.stat-head {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.stat-num { font-family: var(--font-cute); font-size: 13px; }

.mood-tip {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 8px 12px;
  border-radius: var(--r-sm);
  background: var(--glass-bg);
  border-left: 3px solid var(--accent-mint);
  margin-top: 4px;
}
.mood-label { font-family: var(--font-cute); flex-shrink: 0; }
.mood-text { color: var(--text-secondary); line-height: 1.5; }

.growth-hint {
  width: 100%;
  margin: 6px 0 0;
  font-size: 11px;
  color: var(--text-secondary);
  opacity: 0.85;
  text-align: center;
}

.room-foot {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2px;
}
.adopt-time { font-size: 11px; color: var(--text-muted); }
.link-btn { font-size: 12px; color: var(--accent-orange); }

.section-title { font-size: 18px; margin-bottom: 4px; }
.section-sub { font-size: 12px; color: var(--text-muted); margin-bottom: 12px; }
.quota-chip {
  margin: -6px 0 10px;
  font-size: 12px;
  color: var(--accent-orange);
  background: rgba(255, 180, 84, 0.12);
  border-radius: 10px;
  padding: 6px 12px;
  display: inline-block;
}
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-top: 22px;
}
.spent { font-size: 11px; color: var(--text-muted); }

.items { display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px; }
.item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.item.disabled { opacity: 0.5; }
.item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.item-name { font-family: var(--font-cute); font-size: 15px; }
.item-effect { font-size: 11px; color: var(--text-secondary); }
.item-cost { font-family: var(--font-cute); font-size: 18px; color: var(--accent-yellow); }

.logs, .gallery { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.log { display: flex; align-items: center; gap: 10px; }
.log-ico { font-size: 20px; }
.log-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.log-name { font-size: 13px; }
.log-effect { font-size: 11px; color: var(--text-secondary); }
.log-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.log-cost { font-family: var(--font-cute); font-size: 14px; color: var(--accent-orange); }
.log-time { font-size: 10px; color: var(--text-muted); }

.gallery-toggle {
  width: 100%;
  margin-top: 22px;
  padding: 12px;
  border-radius: var(--r-md);
  background: var(--glass-bg);
  color: var(--text-secondary);
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.toggle-arrow { font-size: 11px; color: var(--text-muted); }
.gallery-hint {
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
  margin: 12px 0 4px;
}
.group-title {
  font-family: var(--font-cute);
  font-size: 14px;
  color: var(--text-secondary);
  margin: 10px 0 8px;
}
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.g-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px 6px;
  border-radius: var(--r-md);
  background: var(--glass-bg);
  transition: transform 0.15s;
}
.g-cell:hover { transform: translateY(-2px); }
.g-cell.mine { background: rgba(255, 209, 102, 0.18); }
.g-name { font-size: 11px; color: var(--text-secondary); }
.g-mine {
  position: absolute;
  top: -5px;
  right: -3px;
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 8px;
  background: var(--accent-orange);
  color: #fff;
}

.loading {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
  font-size: 13px;
}

/* 进化庆祝 */
.celebrate-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 150;
  padding: 20px;
}
.celebrate {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 28px 32px;
  border-radius: var(--r-xl);
  border: 1px solid var(--glass-border);
  animation: pop-in 0.35s ease;
}
.c-title { font-family: var(--font-cute); font-size: 22px; margin-top: 4px; }
.c-stage {
  font-family: var(--font-cute);
  font-size: 16px;
  background: linear-gradient(135deg, var(--accent-yellow), var(--accent-orange));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.c-hint { font-size: 11px; color: var(--text-muted); margin-top: 6px; }
@keyframes pop-in {
  from { transform: scale(0.85); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.pop-enter-active, .pop-leave-active { transition: opacity 0.25s ease; }
.pop-enter-from, .pop-leave-to { opacity: 0; }
</style>
