<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { api } from '@/api/client';
import { useToastStore } from '@/stores/toast';
import { WS_EVENTS, REVIEW_UPDATED } from '@/utils/events';
import GlassCard from '@/components/GlassCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import ZodiacAvatar from '@/components/ZodiacAvatar.vue';
import AdhocTaskEditor from '@/components/AdhocTaskEditor.vue';
import RecurringTaskEditor from '@/components/RecurringTaskEditor.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import Pager from '@/components/Pager.vue';
import { LIST_PAGE_SIZE } from '@/utils/pagination';

const toast = useToastStore();

// WebSocket 事件自动刷新
function onWsEvent() { load(); }

onMounted(() => {
  window.addEventListener(WS_EVENTS.taskCompletionSubmitted, onWsEvent);
  window.addEventListener(WS_EVENTS.taskReview, onWsEvent);
  load();
});

onUnmounted(() => {
  window.removeEventListener(WS_EVENTS.taskCompletionSubmitted, onWsEvent);
  window.removeEventListener(WS_EVENTS.taskReview, onWsEvent);
});

interface Task {
  id: number;
  name: string;
  description: string | null;
  points: number;
  deadline: number | null;
  status: string;
  created_at: number;
  completed_at: number | null;
  user_id: number;
  user_name: string;
  user_avatar: string;
  completion_status: 'pending' | 'approved' | 'rejected' | null;
  pending_completion?: { id: number; created_at: number } | null;
}

interface Child {
  id: number;
  name: string;
  avatar: string;
  total_points: number;
}

const tasks = ref<Task[]>([]);
const children = ref<Child[]>([]);
const tab = ref<'active' | 'expired' | 'completed'>('active');
const loading = ref(true);
// 任务列表分页：三个 tab 各自独立计数，所以切 tab 必须把页码归 1
const page = ref(1);
const total = ref(0);
const editorOpen = ref(false);
const editingTask = ref<Task | null>(null);
const deleteTarget = ref<Task | null>(null);

// 周期任务模板
interface RecurringRule {
  id: number;
  name: string;
  description: string | null;
  points: number;
  userId: number;
  userIds: number[];
  userName: string;
  userAvatar: string;
  children: Array<{ id: number; name: string; avatar: string }>;
  freq: 'daily' | 'weekly' | 'monthly';
  weekdays: number[];
  monthdays: number[];
  timeOfDay: string | null;
  active: boolean;
  dueToday: boolean;
  // status: 'active' 进行中 / 'completed' 已完成 / 'voided' 本期已作废（实例被家长删除，凭证仍在）
  lastGenerated: { date: string; status: string } | null;
  dueHours: number | null;
}
const rules = ref<RecurringRule[]>([]);
const recEditorOpen = ref(false);
const editingRule = ref<RecurringRule | null>(null);
const deleteRuleTarget = ref<RecurringRule | null>(null);

const FREQ_TEXT: Record<string, string> = { daily: '每天', weekly: '每周', monthly: '每月' };
const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

function ruleFreqText(r: RecurringRule): string {
  const time = r.timeOfDay ? `${r.timeOfDay} 发布` : '当天即发';
  if (r.freq === 'weekly') return `每周 · ${r.weekdays.map((d) => WEEK_LABELS[d - 1]).join('、')} · ${time}`;
  if (r.freq === 'monthly') return `每月 ${r.monthdays.join('/')} 号 · ${time}`;
  return `每天 · ${time}`;
}

/** 周期任务作用于哪些孩子（多选时展示「名字、名字」） */
function ruleChildNames(r: RecurringRule): string {
  const list = r.children ?? [];
  if (list.length === 0) return r.userName ?? '';
  return list.map((c) => c.name).join('、');
}

async function load(p: number = page.value) {
  loading.value = true;
  try {
    const [taskRes, childRes, ruleRes] = await Promise.all([
      api.get<{ tasks: Task[]; total: number }>(
        `/adhoc-tasks?status=${tab.value}&limit=${LIST_PAGE_SIZE}&offset=${(p - 1) * LIST_PAGE_SIZE}`,
      ),
      api.get<{ children: Child[] }>('/children'),
      api.get<{ rules: RecurringRule[] }>('/recurring-tasks'),
    ]);

    // 删掉当前页最后一条后页码会落在空页上（第 3 页只剩 1 条、删完就空了），
    // 这里自动退回上一页 —— 否则家长会看到「空列表 + 分页条还停在第 3 页」。
    if (taskRes.tasks.length === 0 && p > 1) {
      const retry = await api.get<{ tasks: Task[]; total: number }>(
        `/adhoc-tasks?status=${tab.value}&limit=${LIST_PAGE_SIZE}&offset=${(p - 2) * LIST_PAGE_SIZE}`,
      );
      tasks.value = retry.tasks;
      total.value = retry.total;
      page.value = p - 1;
    } else {
      tasks.value = taskRes.tasks;
      total.value = taskRes.total;
      page.value = p;
    }

    children.value = childRes.children;
    rules.value = ruleRes.rules;
  } finally {
    loading.value = false;
    window.dispatchEvent(new Event(REVIEW_UPDATED));
  }
}

/** 切换 tab：三个 tab 的条数各不相同，沿用上一 tab 的页码会直接落进空页 */
function switchTab(next: 'active' | 'expired' | 'completed') {
  if (tab.value === next) return;
  tab.value = next;
  void load(1);
}

async function toggleRule(r: RecurringRule) {
  try {
    await api.patch(`/recurring-tasks/${r.id}`, { active: !r.active });
    r.active = !r.active;
    toast.success(r.active ? '已启用，到期自动发布' : '已暂停');
  } catch (e: any) {
    toast.error(e.message || '操作失败');
  }
}

async function rerunRule(r: RecurringRule) {
  try {
    const res = await api.post<{ generated: number; already?: boolean }>(`/recurring-tasks/${r.id}/run`);
    toast.success(res.generated > 0
      ? (res.generated > 1 ? `已补发今天的任务（${res.generated} 位小朋友）` : '已补发今天的任务')
      : '今天这一期已经发过了');
    await load();
  } catch (e: any) {
    toast.error(e.message || '补发失败');
  }
}

async function removeRule(r: RecurringRule) {
  try {
    await api.delete(`/recurring-tasks/${r.id}`);
    toast.success('周期任务已删除（已生成的任务保留）');
    await load();
  } catch (e: any) {
    toast.error(e.message || '删除失败');
  }
}

function openEditor(task?: Task) {
  editingTask.value = task ?? null;
  editorOpen.value = true;
}

async function onSaved() {
  editorOpen.value = false;
  await load();
}

async function remove(task: Task) {
  try {
    await api.delete(`/adhoc-tasks/${task.id}`);
    toast.success('已删除');
    await load();
  } catch (e: any) {
    toast.error(e.message || '删除失败');
  }
}

function fmtDeadline(ts: number | null): string {
  if (!ts) return '无截止';
  const d = new Date(ts * 1000);
  const now = Date.now();
  const diff = ts * 1000 - now;
  if (diff < 0) {
    return `已超时 ${Math.abs(Math.floor(diff / 3600000))}小时`;
  }
  if (diff < 86400000) {
    return `今日 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
}

// 完成时刻的展示（completed_at 永远在过去，不能复用截止时间语义的 fmtDeadline，
// 否则会显示成"已超时 xx 小时"）。有截止时间且超时完成的，追加"（超时 x 小时）"。
function fmtCompleted(t: Task): string {
  if (!t.completed_at) return '—';
  const d = new Date(t.completed_at * 1000);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = sameDay ? `今日 ${hh}:${mm}` : `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;

  // deadline / completed_at 均为秒级 unix 时间戳
  if (t.deadline && t.completed_at > t.deadline) {
    const diffSec = t.completed_at - t.deadline;
    const hours = Math.floor(diffSec / 3600);
    const overdue =
      hours >= 1 ? `超时 ${hours} 小时` : `超时 ${Math.floor(diffSec / 60)} 分钟`;
    return `${time}（${overdue}）`;
  }
  return time;
}

function statusText(t: Task): string {
  if (tab.value === 'completed') return '✅ 已完成';
  if (tab.value === 'expired') return '⏰ 已超时';
  if (t.completion_status === 'pending') return '⏳ 待审核';
  if (t.completion_status === 'rejected') return '❌ 被拒绝';
  return '🟢 进行中';
}

// 周期任务「上期」状态：取最近一期任务实例的状态；实例被删光则为 voided（本期作废）
function lastStatusText(s: string): string {
  if (s === 'completed') return '已完成';
  if (s === 'voided') return '已作废';
  return '进行中';
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1 class="title">任务发布</h1>
        <p class="subtitle">发布任务给小朋友完成</p>
      </div>
      <div class="header-btns">
        <button class="btn btn-ghost" @click="editingRule = null; recEditorOpen = true">🔄 周期任务</button>
        <button class="btn btn-primary" @click="openEditor()">＋ 发布</button>
      </div>
    </header>

    <!-- 周期任务模板 -->
    <div v-if="rules.length > 0" class="rules-section">
      <div class="rules-head">🔄 周期任务（到点自动发布，无需重复添加）</div>
      <GlassCard v-for="r in rules" :key="r.id" padding="12px 16px" class="rule-card">
        <div class="rule-main">
          <span class="rule-avatars">
            <ZodiacAvatar
              v-for="c in (r.children ?? []).slice(0, 4)"
              :key="c.id"
              :zodiac="c.avatar"
              :size="32"
            />
          </span>
          <div class="rule-info">
            <div class="rule-name">
              {{ r.name }}
              <span v-if="!r.active" class="rule-badge off">已暂停</span>
              <span v-else-if="r.dueToday" class="rule-badge due">今日该发</span>
            </div>
            <div class="rule-meta">{{ ruleFreqText(r) }} · +{{ r.points }} 🌟 · {{ ruleChildNames(r) }}<template v-if="r.dueHours"> · ⏰发布后{{ r.dueHours }}小时截止</template><span v-if="r.lastGenerated"> · 上期 {{ r.lastGenerated.date }}（{{ lastStatusText(r.lastGenerated.status) }}）</span></div>
          </div>
        </div>
        <div class="rule-actions">
          <button class="btn btn-ghost small" @click="rerunRule(r)">补发今日</button>
          <button class="btn btn-ghost small" @click="editingRule = r; recEditorOpen = true">编辑</button>
          <button class="btn btn-ghost small" @click="toggleRule(r)">{{ r.active ? '暂停' : '启用' }}</button>
          <button class="btn btn-ghost small danger" @click="deleteRuleTarget = r">删除</button>
        </div>
      </GlassCard>
    </div>

    <div class="tabs">
      <button :class="{ active: tab === 'active' }" @click="switchTab('active')">进行中</button>
      <button :class="{ active: tab === 'expired' }" @click="switchTab('expired')">已超时</button>
      <button :class="{ active: tab === 'completed' }" @click="switchTab('completed')">已完成</button>
    </div>

    <EmptyState
      v-if="!loading && tasks.length === 0"
      :emoji="tab === 'active' ? '📝' : tab === 'expired' ? '⏰' : '✅'"
      :text="tab === 'active' ? '没有进行中的任务' : tab === 'expired' ? '没有超时任务' : '还没有完成的任务'"
      :hint="tab === 'active' ? '点击右上角发布新任务' : ''"
    />

    <div v-else class="task-list">
      <GlassCard v-for="t in tasks" :key="t.id" padding="16px 18px" class="task-card">
        <div class="task-head">
          <div class="user-info">
            <ZodiacAvatar :zodiac="t.user_avatar" :size="40" />
            <span class="user-name">{{ t.user_name }}</span>
          </div>
          <span class="status-badge" :class="tab === 'expired' ? 'expired' : tab === 'completed' ? 'completed' : t.completion_status ?? 'active'">
            {{ statusText(t) }}
          </span>
          <div class="points-tag">+{{ t.points }} 🌟</div>
        </div>

        <h3 class="task-name">{{ t.name }}</h3>
        <p v-if="t.description" class="task-desc">{{ t.description }}</p>

        <div class="task-meta">
          <span class="meta-item">📅 {{ fmtDeadline(t.deadline) }}</span>
        </div>

        <div v-if="t.completion_status === 'rejected'" class="rejected-box">
          <span>📝 上次未通过，小朋友可重新提交</span>
        </div>

        <div class="actions">
          <button v-if="tab !== 'completed'" class="btn btn-ghost small" @click="openEditor(t)">编辑</button>
          <span v-if="tab === 'completed'" class="done-text">🎉 已于 {{ fmtCompleted(t) }} 完成</span>
          <button class="btn btn-ghost small danger" @click="deleteTarget = t">删除</button>
        </div>
      </GlassCard>
    </div>

    <Pager
      :page="page"
      :page-size="LIST_PAGE_SIZE"
      :total="total"
      :disabled="loading"
      @update:page="load"
    />

    <AdhocTaskEditor
      v-if="editorOpen"
      v-model="editorOpen"
      :task="editingTask"
      :children="children"
      @saved="onSaved"
    />

    <RecurringTaskEditor
      v-if="recEditorOpen"
      v-model="recEditorOpen"
      :rule="editingRule"
      :children="children"
      @saved="recEditorOpen = false; load()"
    />

    <ConfirmDialog
      :model-value="deleteTarget !== null"
      title="删除任务"
      :message="deleteTarget ? `确定删除任务「${deleteTarget.name}」？删除后不可恢复哦` : ''"
      confirm-text="确定"
      cancel-text="取消"
      variant="danger"
      @update:model-value="!$event && (deleteTarget = null)"
      @confirm="deleteTarget && remove(deleteTarget)"
    />

    <ConfirmDialog
      :model-value="deleteRuleTarget !== null"
      title="删除周期任务"
      :message="deleteRuleTarget ? `确定删除周期任务「${deleteRuleTarget.name}」？以后不再自动发布（已发布的任务保留）` : ''"
      confirm-text="确定"
      cancel-text="取消"
      variant="danger"
      @update:model-value="!$event && (deleteRuleTarget = null)"
      @confirm="deleteRuleTarget && removeRule(deleteRuleTarget)"
    />
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 16px;
  gap: 12px;
}
.title { font-size: 26px; margin-bottom: 2px; }
.subtitle { color: var(--text-secondary); font-size: 13px; }
.header-btns { display: flex; gap: 8px; }

.rules-section { margin-bottom: 18px; display: flex; flex-direction: column; gap: 8px; }
.rules-head { font-size: 13px; color: var(--text-secondary); font-family: var(--font-cute); padding-left: 4px; }
.rule-card { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.rule-main { display: flex; align-items: center; gap: 10px; min-width: 0; }
.rule-avatars { display: flex; flex-shrink: 0; }
.rule-avatars > :deep(*) { margin-left: -8px; }
.rule-avatars > :deep(*:first-child) { margin-left: 0; }
.rule-info { min-width: 0; }
.rule-name { font-size: 15px; font-family: var(--font-cute); display: flex; align-items: center; gap: 6px; }
.rule-meta { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.rule-badge { font-size: 10px; padding: 1px 8px; border-radius: 8px; font-weight: 600; }
.rule-badge.off { background: rgba(160, 160, 160, 0.2); color: var(--text-muted); }
.rule-badge.due { background: rgba(255, 209, 102, 0.2); color: var(--accent-yellow); }
.rule-actions { display: flex; gap: 6px; flex-wrap: wrap; }

.tabs {
  display: flex;
  background: var(--glass-bg);
  border-radius: var(--r-md);
  padding: 4px;
  gap: 4px;
  margin-bottom: 16px;
}
.tabs button {
  flex: 1;
  padding: 10px;
  border-radius: var(--r-sm);
  color: var(--text-secondary);
  font-weight: 600;
  transition: all 0.2s;
}
.tabs button.active {
  background: var(--glass-bg-strong);
  color: var(--text-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.task-list { display: flex; flex-direction: column; gap: 12px; }
.task-card { transition: transform 0.15s; }

.task-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}
.user-name {
  font-family: var(--font-cute);
  font-size: 14px;
}
.status-badge {
  padding: 3px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(126, 212, 185, 0.2);
  color: var(--accent-mint);
}
.status-badge.expired { background: rgba(255, 122, 122, 0.2); color: var(--accent-red); }
.status-badge.completed { background: rgba(126, 212, 185, 0.3); color: var(--accent-mint); }
.status-badge.pending { background: rgba(255, 209, 102, 0.2); color: var(--accent-yellow); }
.status-badge.rejected { background: rgba(255, 122, 122, 0.2); color: var(--accent-red); }
.points-tag {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 14px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(255, 209, 102, 0.28), rgba(255, 209, 102, 0.12));
  border: 1px solid rgba(255, 209, 102, 0.45);
  box-shadow: 0 2px 8px rgba(255, 209, 102, 0.15);
  font-family: var(--font-cute);
  color: var(--accent-yellow);
  font-size: 17px;
  white-space: nowrap;
}

.task-name {
  font-size: 18px;
  margin-bottom: 4px;
  font-family: var(--font-cute);
}
.task-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  line-height: 1.5;
}
.task-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.rejected-box {
  font-size: 12px;
  color: var(--accent-red);
  background: rgba(255, 122, 122, 0.1);
  padding: 6px 10px;
  border-radius: var(--r-sm);
  margin-bottom: 8px;
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.small {
  padding: 6px 14px;
  font-size: 13px;
}
.danger:hover {
  color: var(--accent-red);
}
.done-text {
  font-size: 13px;
  color: var(--accent-mint);
  font-family: var(--font-cute);
}

@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: stretch; }
}
</style>
