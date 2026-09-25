<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { api } from '@/api/client';
import Modal from '@/components/Modal.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import ZodiacAvatar from '@/components/ZodiacAvatar.vue';
import HumationAvatarEditor from '@/components/HumationAvatarEditor.vue';
import { isHumationAvatar } from '@/lib/humation/spec';
import { BOY_PRESET, GIRL_PRESET, PRESET_VALUES } from '@/lib/humation/presets';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  'update:modelValue': [v: boolean];
}>();

const auth = useAuthStore();
const toast = useToastStore();

const name = ref('');
const password = ref('');
const avatar = ref(BOY_PRESET.value);
const saving = ref(false);
const showHumEditor = ref(false);
const appVersion = ref('');

// 通知渠道配置（实例级，settings 表）—— 与 server/src/notify.ts 的 NotifyConfig 对应
interface NotifyConfig {
  ntfyUrl: string;
  ntfyToken: string;
  gotifyUrl: string;
  gotifyToken: string;
  wecomWebhook: string;
}
/** 测试发送的单渠道结果（与 server/src/notify.ts 的 NotifyResult 对应） */
interface NotifyTestResult {
  channel: 'ntfy' | 'gotify' | 'wecom';
  ok: boolean;
  detail: string;
}

const ntfyUrl = ref('');
const ntfyToken = ref('');
const gotifyUrl = ref('');
const gotifyToken = ref('');
const wecomWebhook = ref('');
const notifyLoaded = ref(false);
const testing = ref(false);

// 「审核通知推送」折叠态（与下方「记录管理」同款交互）：设置页太长，默认收起。
// 折叠时不显示表单，改为在标题行右侧给一个状态角标，避免"收起后不知道到底配没配"。
const notifyOpen = ref(false);
const notifyChannelCount = computed(
  () => [ntfyUrl, gotifyUrl, wecomWebhook].filter((r) => r.value.trim()).length,
);

// 单词游戏每日积分上限（settings: quiz_daily_cap）
const quizCap = ref(20);

async function loadQuizCap() {
  try {
    const s = await api.get<{ dailyCap: number }>('/quiz/settings');
    quizCap.value = s.dailyCap;
  } catch { /* 读不到就用默认值，不阻断设置页 */ }
}

async function saveQuizCap(): Promise<boolean> {
  try {
    await api.put<{ dailyCap: number }>('/quiz/settings', { dailyCap: quizCap.value });
    return true;
  } catch {
    toast.error('单词游戏上限保存失败');
    return false;
  }
}

async function loadNotify() {
  try {
    const cfg = await api.get<NotifyConfig>('/settings/notify');
    ntfyUrl.value = cfg.ntfyUrl ?? '';
    ntfyToken.value = cfg.ntfyToken ?? '';
    gotifyUrl.value = cfg.gotifyUrl ?? '';
    gotifyToken.value = cfg.gotifyToken ?? '';
    wecomWebhook.value = cfg.wecomWebhook ?? '';
    notifyLoaded.value = true;
  } catch {
    notifyLoaded.value = false;
  }
}

function notifyPayload() {
  return {
    ntfyUrl: ntfyUrl.value.trim(),
    ntfyToken: ntfyToken.value.trim(),
    gotifyUrl: gotifyUrl.value.trim(),
    gotifyToken: gotifyToken.value.trim(),
    wecomWebhook: wecomWebhook.value.trim(),
  };
}

async function saveNotify(): Promise<boolean> {
  try {
    const cfg = await api.put<NotifyConfig>('/settings/notify', notifyPayload());
    ntfyUrl.value = cfg.ntfyUrl ?? '';
    ntfyToken.value = cfg.ntfyToken ?? '';
    gotifyUrl.value = cfg.gotifyUrl ?? '';
    gotifyToken.value = cfg.gotifyToken ?? '';
    wecomWebhook.value = cfg.wecomWebhook ?? '';
    return true;
  } catch (e: any) {
    const err = e.payload?.error;
    toast.error(err === 'invalid_input' ? `通知地址无效：${e.payload?.detail ?? ''}` : '通知设置保存失败');
    return false;
  }
}

/** 保存当前配置并逐渠道真实发一条测试消息 */
async function testNotify() {
  testing.value = true;
  try {
    if (!(await saveNotify())) return;
    const { results } = await api.post<{ results: NotifyTestResult[] }>('/settings/notify/test', {});
    const okCount = results.filter((r) => r.ok).length;
    if (results.length === 0) {
      toast.warning('还没有配置任何通知渠道');
    } else if (okCount === results.length) {
      toast.success(`测试通知已发送（${okCount} 个渠道），去手机上看看吧 📲`);
    } else {
      const bad = results.filter((r) => !r.ok).map((r) => `${r.channel}: ${r.detail}`).join('；');
      toast.error(`部分渠道失败 → ${bad}`);
    }
  } catch (e: any) {
    toast.error(e.message || '测试发送失败');
  } finally {
    testing.value = false;
  }
}

function onHumSave(value: string) {
  avatar.value = value;
  showHumEditor.value = false;
}

// ── 记录管理（危险操作）──────────────────────────────────────────
const RECORD_TYPES = [
  { key: 'point_logs', label: '积分流水' },
  { key: 'pet_logs', label: '喂养记录' },
  { key: 'exchange_requests', label: '兑换历史' },
  { key: 'task_completions', label: '任务完成历史' },
] as const;
type RecordTypeKey = (typeof RECORD_TYPES)[number]['key'];

const recordsOpen = ref(false);
const recordStats = ref<Record<RecordTypeKey, { total: number; byUser: Record<string, number> }> | null>(null);
const recordChildren = ref<Array<{ id: number; name: string }>>([]);
const clearType = ref<RecordTypeKey>('point_logs');
const clearUserId = ref(0); // 0 = 全部孩子
const clearConfirmOpen = ref(false);
const clearing = ref(false);

// ── 自动清理（保留策略）────────────────────────────────────────────
const retentionDays = ref(90);
const retentionDefault = ref(90);
// 只有真正展开过「记录管理」才允许把天数写回服务端。
// 否则家长没打开这个折叠区就点「保存」，本地的初始值 90 会把他之前调过的天数覆盖掉。
const retentionLoaded = ref(false);
const cleaning = ref(false);

async function toggleRecords() {
  recordsOpen.value = !recordsOpen.value;
  if (recordsOpen.value) await loadRecordStats();
}

async function loadRecordStats() {
  try {
    const res = await api.get<{
      types: Record<RecordTypeKey, { total: number; byUser: Record<string, number> }>;
      children: Array<{ id: number; name: string }>;
      retentionDays?: number;
      defaultRetentionDays?: number;
    }>('/records/stats');
    recordStats.value = res.types;
    recordChildren.value = res.children;
    retentionDays.value = res.retentionDays ?? 90;
    retentionDefault.value = res.defaultRetentionDays ?? 90;
    retentionLoaded.value = true;
  } catch {
    recordStats.value = null;
  }
}

async function saveRetention(): Promise<boolean> {
  if (!retentionLoaded.value) return true; // 见 retentionLoaded 的注释：没展开过就别写
  const days = Number(retentionDays.value);
  if (!Number.isFinite(days) || days < 0) {
    toast.error('保留天数不能为负数');
    return false;
  }
  try {
    const r = await api.put<{ retentionDays: number }>('/records/retention', { days: Math.floor(days) });
    retentionDays.value = r.retentionDays;
    return true;
  } catch {
    toast.error('自动清理设置保存失败');
    return false;
  }
}

async function cleanupNow() {
  if (cleaning.value) return;
  // 先把当前填的天数落盘再清 —— 否则家长改了天数点「立即清理」，
  // 实际执行的还是旧配置，结果和界面对不上。
  if (!(await saveRetention())) return;
  cleaning.value = true;
  try {
    const r = await api.post<{ disabled: boolean; deleted: number; retentionDays: number }>('/records/cleanup', {});
    if (r.disabled) toast.warning('自动清理已关闭（保留天数填的是 0），没有清理任何记录');
    else if (r.deleted === 0) toast.success(`没有超过 ${r.retentionDays} 天的记录需要清理`);
    else toast.success(`已清理 ${r.deleted} 条超过 ${r.retentionDays} 天的记录`);
    await loadRecordStats();
  } catch (e: any) {
    toast.error(e?.message || '清理失败');
  } finally {
    cleaning.value = false;
  }
}

const selectedCount = computed(() => {
  if (!recordStats.value) return 0;
  const t = recordStats.value[clearType.value];
  return clearUserId.value === 0 ? t.total : (t.byUser[String(clearUserId.value)] ?? 0);
});

const selectedTypeName = computed(() => RECORD_TYPES.find((t) => t.key === clearType.value)?.label ?? '');

const clearConfirmMessage = computed(() => {
  const scope = clearUserId.value === 0
    ? '全部孩子'
    : (recordChildren.value.find((c) => c.id === clearUserId.value)?.name ?? '该孩子');
  return `确认清空 ${scope} 的 ${selectedTypeName.value}（共 ${selectedCount.value} 条）？此操作不可恢复，且不影响积分余额与宠物等级。`;
});

async function doClearRecords() {
  if (clearing.value) return;
  clearing.value = true;
  try {
    const payload: Record<string, unknown> = { type: clearType.value };
    if (clearUserId.value !== 0) payload.userId = clearUserId.value;
    const res = await api.post<{ deleted: number }>('/records/clear', payload);
    toast.success(`已清空 ${res.deleted} 条记录`);
    await loadRecordStats();
  } catch (e: any) {
    toast.error(e?.message || '清空失败');
  } finally {
    clearing.value = false;
  }
}

watch(() => props.modelValue, (open) => {
  if (open) {
    name.value = auth.user?.name ?? '';
    password.value = '';
    avatar.value = auth.user?.avatar ?? 'dragon';
    void loadNotify();
    void loadQuizCap();
    api.get<{ version: string }>('/version').then((r) => { appVersion.value = r.version ?? ''; }).catch(() => {});
  }
}, { immediate: true }); // 挂载即打开时也能回填当前头像/名字

async function save() {
  if (!name.value.trim()) return toast.warning('请输入账号名称');
  if (password.value && password.value.length < 6) {
    return toast.warning('密码至少 6 位');
  }

  saving.value = true;
  try {
    const payload: Record<string, string> = {
      name: name.value.trim(),
      avatar: avatar.value,
    };
    if (password.value) payload.password = password.value;

    await auth.updateMe(payload);
    // 通知配置一起保存（失败不阻断账号设置保存）
    const notifyOk = await saveNotify();
    const quizOk = await saveQuizCap();
    const retentionOk = await saveRetention();
    if (notifyOk && quizOk && retentionOk) toast.success('设置已保存 🎉');
    emit('update:modelValue', false);
  } catch (e: any) {
    const err = e.payload?.error;
    if (err === 'name_taken') toast.error('该账号已被占用，换一个吧');
    else if (err === 'invalid_avatar') toast.error('头像无效');
    else toast.error(e.message || '保存失败');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Modal
    :model-value="modelValue"
    title="设置"
    width="460px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="form">
      <div class="field">
        <label class="label">头像</label>
        <div class="avatar-row">
          <button
            type="button"
            :class="['zodiac', { active: avatar === BOY_PRESET.value }]"
            @click="avatar = BOY_PRESET.value"
          >
            <ZodiacAvatar :zodiac="BOY_PRESET.value" :size="56" />
            <span class="zname">男生</span>
          </button>
          <button
            type="button"
            :class="['zodiac', { active: avatar === GIRL_PRESET.value }]"
            @click="avatar = GIRL_PRESET.value"
          >
            <ZodiacAvatar :zodiac="GIRL_PRESET.value" :size="56" />
            <span class="zname">女生</span>
          </button>
          <button
            type="button"
            :class="['zodiac', { active: isHumationAvatar(avatar) && !PRESET_VALUES.has(avatar) }]"
            @click="showHumEditor = true"
          >
            <ZodiacAvatar v-if="isHumationAvatar(avatar)" :zodiac="avatar" :size="56" />
            <span v-else class="custom-ico">🎨</span>
            <span class="zname">自定义</span>
          </button>
        </div>
      </div>

      <div class="field">
        <label class="label">账号</label>
        <input
          v-model="name"
          type="text"
          maxlength="30"
          placeholder="家长登录账号"
          autocomplete="username"
        />
        <p class="hint">登录时使用的账号名称</p>
      </div>

      <div class="field">
        <label class="label">新密码（留空则不修改）</label>
        <input
          v-model="password"
          type="password"
          maxlength="64"
          placeholder="至少 6 位"
          autocomplete="new-password"
        />
        <p class="hint">修改后下次登录请使用新密码</p>
      </div>

      <div class="divider"></div>

      <!-- 审核通知推送（可折叠，与下方「记录管理」同款交互） -->
      <div class="field">
        <div class="section-head">
          <span class="label">🔔 审核通知推送</span>
          <span class="head-side">
            <span v-if="!notifyOpen" class="head-badge" :class="{ on: notifyChannelCount > 0 }">
              {{ notifyChannelCount > 0 ? `已配置 ${notifyChannelCount} 个渠道` : '未配置' }}
            </span>
            <button type="button" class="btn-toggle" @click="notifyOpen = !notifyOpen">
              {{ notifyOpen ? '收起' : '展开' }}
            </button>
          </span>
        </div>
        <template v-if="notifyOpen">
          <p class="hint">配置后，孩子提交兑换申请或任务完成申请时会即时推送到对应渠道。留空表示停用。</p>

          <label class="label ch-label">ntfy 主题地址</label>
          <input
            v-model="ntfyUrl"
            type="url"
            maxlength="500"
            placeholder="如 https://ntfy.sh/my-family-topic"
          />
          <label class="label ch-label">ntfy 访问令牌（可选）</label>
          <input
            v-model="ntfyToken"
            type="password"
            maxlength="200"
            placeholder="访问令牌 tk_xxx 或 用户:密码，主题无需认证则留空"
          />
          <p class="hint">自部署 ntfy 开了访问控制时填写：填 tk_ 开头的访问令牌走 Bearer 认证，填 用户:密码 走 Basic 认证。</p>

          <label class="label ch-label">Gotify 消息地址</label>
          <input
            v-model="gotifyUrl"
            type="url"
            maxlength="500"
            placeholder="如 https://push.example.com/message?token=xxxx"
          />
          <label class="label ch-label">Gotify 应用令牌（可选）</label>
          <input
            v-model="gotifyToken"
            type="password"
            maxlength="200"
            placeholder="URL 里已带 ?token= 则留空；否则填应用令牌"
          />
          <p class="hint">令牌两种填法任选其一：拼在地址的 ?token= 参数里，或单独填在这里（走 X-Gotify-Key 请求头）。</p>

          <label class="label ch-label">企业微信群机器人 Webhook</label>
          <input
            v-model="wecomWebhook"
            type="url"
            maxlength="500"
            placeholder="如 https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxx"
          />

          <!-- 本节的操作按钮统一放在折叠内容最下方 -->
          <p class="hint">「保存并发送测试」会先保存配置，再向每个已填写的渠道各发一条测试消息。</p>
          <button type="button" class="btn-send-test" :disabled="testing" @click="testNotify">
            {{ testing ? '发送中...' : '保存并发送测试' }}
          </button>
        </template>
      </div>

      <div class="divider"></div>

      <!-- 单词游戏 -->
      <div class="field">
        <label class="label">📚 单词游戏每日积分上限</label>
        <input v-model.number="quizCap" type="number" min="1" max="200" />
        <p class="hint">孩子端「单词闯关」每天最多能获得的积分（1~200，默认 20）</p>
      </div>

      <div class="divider"></div>

      <!-- 记录管理（危险操作） -->
      <div class="field">
        <div class="section-head">
          <span class="label danger-label">🗑️ 记录管理</span>
          <button type="button" class="btn-toggle" @click="toggleRecords">
            {{ recordsOpen ? '收起' : '展开' }}
          </button>
        </div>
        <template v-if="recordsOpen">
          <label class="label ch-label">自动清理</label>
          <p class="hint">
            超过保留期的流水与历史会每天自动清理一次。只删记录明细，<b>不影响积分余额和宠物等级</b>；
            待审核申请、进行中的任务、正在答的题目永不删除。
          </p>
          <div class="retention-row">
            <span class="retention-text">保留最近</span>
            <input
              v-model.number="retentionDays"
              class="retention-input"
              type="number"
              min="0"
              max="3650"
              step="30"
              inputmode="numeric"
            />
            <span class="retention-text">天</span>
            <button type="button" class="btn-toggle" @click="retentionDays = 0">关闭</button>
            <button type="button" class="btn-toggle" @click="retentionDays = retentionDefault">
              恢复默认（{{ retentionDefault }}）
            </button>
          </div>
          <p class="hint">填 0 表示关闭自动清理，记录会一直保留。</p>
          <button
            type="button"
            class="btn-toggle retention-now"
            :disabled="cleaning || retentionDays <= 0"
            @click="cleanupNow"
          >
            {{ cleaning ? '清理中...' : '立即清理一次' }}
          </button>

          <div class="divider"></div>

          <label class="label ch-label">手动清空</label>
          <p class="hint">
            清空后记录不可恢复。只删除记录明细，<b>不影响积分余额和宠物等级</b>；兑换/任务的待审核申请不会被清掉。
          </p>

          <label class="label ch-label">记录类型</label>
          <div class="chip-row">
            <button
              v-for="t in RECORD_TYPES"
              :key="t.key"
              type="button"
              :class="['chip', { active: clearType === t.key }]"
              @click="clearType = t.key"
            >
              {{ t.label }}
            </button>
          </div>

          <label class="label ch-label">范围</label>
          <div class="chip-row">
            <button type="button" :class="['chip', { active: clearUserId === 0 }]" @click="clearUserId = 0">
              全部孩子
            </button>
            <button
              v-for="c in recordChildren"
              :key="c.id"
              type="button"
              :class="['chip', { active: clearUserId === c.id }]"
              @click="clearUserId = c.id"
            >
              {{ c.name }}
            </button>
          </div>

          <div class="clear-summary">
            将清空 <b>{{ selectedCount }}</b> 条记录
          </div>
          <button type="button" class="btn-danger-zone" :disabled="clearing || selectedCount === 0" @click="clearConfirmOpen = true">
            {{ clearing ? '清空中...' : '清空所选记录' }}
          </button>
        </template>
      </div>

      <p v-if="appVersion" class="app-ver">拾贝小镇 v{{ appVersion }}</p>
    </div>

    <ConfirmDialog
      v-model="clearConfirmOpen"
      title="⚠️ 确认清空记录"
      :message="clearConfirmMessage"
      confirmText="确认清空"
      variant="danger"
      @confirm="doClearRecords"
    />

    <template #footer>
      <span style="flex:1"></span>
      <button class="btn btn-ghost" @click="emit('update:modelValue', false)">取消</button>
      <button class="btn btn-primary" @click="save" :disabled="saving">
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </template>
  </Modal>

  <HumationAvatarEditor
    v-if="showHumEditor"
    :current="avatar"
    @save="onHumSave"
    @close="showHumEditor = false"
  />
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.label {
  font-size: 13px;
  color: var(--text-secondary);
  padding-left: 4px;
}
.hint {
  font-size: 12px;
  color: var(--text-muted);
  padding-left: 4px;
}

.divider { height: 1px; background: var(--glass-border); margin: 2px 0; }
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ch-label { margin-top: 4px; }
.danger-label { color: var(--danger, #e05a5a); }

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  background: var(--glass-bg);
  color: var(--text-secondary);
  border: 1px solid transparent;
  transition: all 0.2s;
}
.chip.active {
  background: var(--glass-bg-strong);
  color: var(--text-primary);
  border-color: var(--danger, #e05a5a);
}

/* 保留天数行：数字框 + 两个快捷胶囊。数字框走全局 input 样式，
   这里只约束宽度，免得它把整行撑满。 */
.retention-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding-left: 4px;
}
.retention-text { font-size: 13px; color: var(--text-secondary); }
.retention-input { width: 88px; text-align: center; }
.retention-now { align-self: flex-start; }

.clear-summary {
  font-size: 12px;
  color: var(--text-secondary);
  padding-left: 4px;
}
.clear-summary b { color: var(--danger, #e05a5a); font-size: 14px; }

.btn-danger-zone {
  align-self: flex-start;
  padding: 8px 18px;
  border-radius: var(--r-sm);
  background: rgba(224, 90, 90, 0.12);
  color: var(--danger, #e05a5a);
  font-weight: 600;
  font-size: 13px;
  border: 1px solid rgba(224, 90, 90, 0.35);
  transition: all 0.2s;
}
.btn-danger-zone:not(:disabled):hover {
  background: rgba(224, 90, 90, 0.22);
}
.btn-danger-zone:disabled {
  opacity: 0.45;
  cursor: default;
}

.app-ver {
  text-align: center;
  font-size: 11px;
  color: var(--text-muted);
  padding-left: 0;
}
/* 折叠区的「展开 / 收起」胶囊按钮。
   旧写法 background: rgba(255,209,102,0.18) + color: var(--accent-orange) 是
   「浅黄底 + 浅橙字」——实测对比度只有 1.44:1，几乎看不清（用户 2026-09-24 反馈）。
   改成实心黄→橙渐变 + 深色文字（与 RecurringTaskEditor 的选中态同一套处理）。 */
.btn-toggle {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--accent-yellow), var(--accent-orange));
  color: var(--text-primary);
  font-weight: 600;
  border: 1px solid transparent;
  white-space: nowrap;
  cursor: pointer;
}
.btn-toggle:hover { filter: brightness(1.05); }

/* 折叠时标题行右侧的状态角标：两种底色都用 --text-primary，避免又踩"浅底浅字" */
.head-side {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.head-badge {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(90, 58, 74, 0.08);
  color: var(--text-primary);
  white-space: nowrap;
}
.head-badge.on { background: rgba(126, 212, 185, 0.28); }

/* 「保存并发送测试」：折叠区最下方的操作按钮，几何尺寸对齐 .btn-danger-zone */
.btn-send-test {
  align-self: flex-start;
  padding: 8px 18px;
  border-radius: var(--r-sm);
  background: linear-gradient(135deg, var(--accent-yellow), var(--accent-orange));
  color: var(--text-primary);
  font-weight: 600;
  font-size: 13px;
  border: 1px solid transparent;
  transition: all 0.2s;
}
.btn-send-test:not(:disabled):hover { filter: brightness(1.05); }
.btn-send-test:disabled { opacity: 0.6; cursor: default; }

.avatar-row {
  display: flex;
  gap: 12px;
}
.zodiac {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 6px;
  border-radius: var(--r-sm);
  background: var(--glass-bg);
  border: 2px solid transparent;
  transition: all 0.2s;
}
.zodiac:hover {
  background: var(--glass-bg-strong);
}
.zodiac.active {
  background: var(--glass-bg-strong);
  border-color: var(--accent-orange);
}
.zname {
  font-size: 10px;
  color: var(--text-secondary);
}
.custom-ico {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  line-height: 1;
  border-radius: 50%;
  background: var(--glass-bg);
  border: 2px dashed var(--glass-border);
}
</style>
