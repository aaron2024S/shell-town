<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { api } from '@/api/client';
import { useToastStore } from '@/stores/toast';
import Modal from '@/components/Modal.vue';
import ZodiacAvatar from '@/components/ZodiacAvatar.vue';

interface Child { id: number; name: string; avatar: string }

/**
 * 编辑模式下用于回填的任务字段。
 *
 * 只要父组件传进来的对象结构上覆盖这些字段即可（parent/Tasks.vue 的 Task 就是）。
 * 原先这里是 `task?: any`，等于关掉了整个组件的 prop 类型检查 ——
 * 服务端改字段名、或父组件传错对象，vue-tsc 一句话都不会说。
 */
interface EditableTask {
  id: number;
  name: string;
  description: string | null;
  points: number;
  deadline: number | null;
  user_id: number;
}

const props = defineProps<{
  modelValue: boolean;
  task?: EditableTask | null;
  children: Child[];
}>();
const emit = defineEmits<{
  'update:modelValue': [v: boolean];
  saved: [];
}>();

const toast = useToastStore();
const isEdit = computed(() => !!props.task);

const name = ref('');
const description = ref('');
const points = ref(10);
const assigneeIds = ref<number[]>([]);
const deadlineEnabled = ref(false);
const deadlineDate = ref('');
const deadlineTime = ref('');
const saving = ref(false);

/**
 * 本地日期串 YYYY-MM-DD。
 * 不能用 `toISOString().slice(0,10)`：那串是 UTC，而 `getHours()` 是本地时间 ——
 * 两者混用会让东八区凌晨 0~8 点回填的日期早一天。
 */
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 截止时间的默认值：今天 22:00；若此刻已过 22:00 则顺延到明天 22:00。
 * 此前固定「今天 + 22:00」，晚上 22 点后新建任务会一创建就处于"已超时"。
 */
function defaultDeadline(): { date: string; time: string } {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return {
    date: localDateStr(target),
    time: `${String(target.getHours()).padStart(2, '0')}:${String(target.getMinutes()).padStart(2, '0')}`,
  };
}

watch(() => props.modelValue, (open) => {
  if (!open) return;
  if (props.task) {
    name.value = props.task.name;
    description.value = props.task.description ?? '';
    points.value = props.task.points;
    // 编辑时单条任务的 user_id
    assigneeIds.value = props.task.user_id ? [props.task.user_id] : [];
    if (props.task.deadline) {
      deadlineEnabled.value = true;
      const d = new Date(props.task.deadline * 1000);
      deadlineDate.value = localDateStr(d);
      deadlineTime.value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } else {
      deadlineEnabled.value = false;
      const def = defaultDeadline();
      deadlineDate.value = def.date;
      deadlineTime.value = def.time;
    }
  } else {
    name.value = '';
    description.value = '';
    points.value = 10;
    assigneeIds.value = [];
    deadlineEnabled.value = false;
    const def = defaultDeadline();
    deadlineDate.value = def.date;
    deadlineTime.value = def.time;
  }
}, { immediate: true }); // 组件由 v-if 挂载，挂载时 modelValue 已为 true；不加 immediate 编辑时表单一片空白

function toggleAssignee(id: number) {
  // 一条任务只属于一个孩子：编辑模式下是单选（改派）
  if (isEdit.value) {
    assigneeIds.value = [id];
    return;
  }
  const idx = assigneeIds.value.indexOf(id);
  if (idx >= 0) assigneeIds.value.splice(idx, 1);
  else assigneeIds.value.push(id);
}

async function save() {
  if (!name.value.trim()) return toast.warning('请输入任务名称');
  if (assigneeIds.value.length === 0) {
    return toast.warning(isEdit.value ? '请选择任务归属的小朋友' : '请至少选择一个小朋友');
  }

  let deadline: number | null | undefined;
  if (deadlineEnabled.value && deadlineDate.value) {
    const dt = new Date(`${deadlineDate.value}T${deadlineTime.value || '23:59'}:00`);
    deadline = Math.floor(dt.getTime() / 1000);
  } else if (!isEdit.value) {
    deadline = undefined;
  } else {
    deadline = null;
  }

  saving.value = true;
  try {
    // 先把 props.task 收进局部变量再判空：`isEdit` 只是个 computed 布尔，
    // TS 无法据此收窄 props.task（改动前它是 any，正好把这个问题掩盖了）。
    const editingTask = props.task;
    if (editingTask) {
      await api.patch(`/adhoc-tasks/${editingTask.id}`, {
        name: name.value.trim(),
        description: description.value.trim() || null,
        points: points.value,
        deadline: deadline ?? null,
        // 改派给选中的小朋友（服务端在已有完成申请时会拒绝并给出提示）
        userId: assigneeIds.value[0],
      });
      toast.success('已更新任务');
    } else {
      await api.post('/adhoc-tasks', {
        name: name.value.trim(),
        description: description.value.trim() || undefined,
        points: points.value,
        deadline,
        assigneeIds: assigneeIds.value,
      });
      toast.success(`任务发布成功，共 ${assigneeIds.value.length} 条 🎉`);
    }
    emit('saved');
  } catch (e: any) {
    if (e?.payload?.error === 'has_completion') toast.error('这个任务已经有完成申请了，不能改派给别人');
    else toast.error(e.payload?.detail || e.message || '保存失败');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Modal
    :model-value="modelValue"
    :title="isEdit ? '编辑任务' : '任务发布'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="form">
      <div class="field">
        <label class="label">
          <template v-if="isEdit">归属小朋友（一条任务对应一个孩子）</template>
          <template v-else>选择小朋友（可多选，每人生成一条任务）</template>
        </label>
        <div class="child-grid">
          <button
            v-for="c in children"
            :key="c.id"
            type="button"
            :class="['child-chip', { active: assigneeIds.includes(c.id) }]"
            @click="toggleAssignee(c.id)"
          >
            <ZodiacAvatar :zodiac="c.avatar" :size="56" />
            <span>{{ c.name }}</span>
            <span v-if="assigneeIds.includes(c.id)" class="check">✓</span>
          </button>
        </div>
        <p v-if="children.length === 0" class="hint">还没有小朋友，先去总览页创建</p>
        <p v-else-if="isEdit" class="hint">改派后任务会移到另一个小朋友名下；已有完成申请的任务不能改派</p>
      </div>

      <div class="field">
        <label class="label">任务名称</label>
        <input v-model="name" type="text" maxlength="50" placeholder="如：整理书桌" />
      </div>

      <div class="field">
        <label class="label">任务描述（可选）</label>
        <textarea v-model="description" maxlength="200" rows="2" placeholder="任务详情..."></textarea>
      </div>

      <div class="field">
        <label class="label">奖励积分 🌟</label>
        <input v-model.number="points" type="number" min="1" max="999" />
      </div>

      <div class="field">
        <label class="label">
          <input v-model="deadlineEnabled" type="checkbox" class="checkbox" />
          截止时间
        </label>
        <div v-if="deadlineEnabled" class="deadline-row">
          <input v-model="deadlineDate" type="date" class="date-input" />
          <input v-model="deadlineTime" type="time" class="time-input" />
        </div>
        <p v-if="deadlineEnabled" class="hint">到期后任务会自动结束，并从孩子的任务列表中移除</p>
      </div>
    </div>

    <template #footer>
      <span style="flex:1"></span>
      <button class="btn btn-ghost" @click="emit('update:modelValue', false)">取消</button>
      <button class="btn btn-primary" @click="save" :disabled="saving">
        {{ saving ? '保存中...' : (isEdit ? '保存' : '发布') }}
      </button>
    </template>
  </Modal>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 18px; }
.field { display: flex; flex-direction: column; gap: 8px; }
.label { font-size: 13px; color: var(--text-secondary); padding-left: 4px; display: flex; align-items: center; gap: 6px; }
.hint { font-size: 11px; color: var(--text-muted); padding-left: 4px; line-height: 1.5; }
.checkbox { width: auto; }

textarea { resize: vertical; min-height: 60px; font-family: inherit; }

.child-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.child-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  border-radius: var(--r-md);
  background: var(--glass-bg);
  border: 2px solid transparent;
  transition: all 0.2s;
  position: relative;
  cursor: pointer;
}
.child-chip span { font-size: 12px; font-family: var(--font-cute); }
.child-chip.active {
  border-color: var(--accent-yellow);
  background: rgba(255, 209, 102, 0.15);
}
.child-chip .check {
  position: absolute;
  top: 4px;
  right: 6px;
  color: var(--accent-yellow);
  font-size: 14px;
  font-weight: bold;
}

.deadline-row { display: flex; gap: 8px; }
.date-input, .time-input { flex: 1; }
</style>
