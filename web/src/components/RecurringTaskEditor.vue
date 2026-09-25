<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { api } from '@/api/client';
import { useToastStore } from '@/stores/toast';
import Modal from '@/components/Modal.vue';
import ZodiacAvatar from '@/components/ZodiacAvatar.vue';

interface Child { id: number; name: string; avatar: string }

const props = defineProps<{
  modelValue: boolean;
  rule?: any; // 编辑时传入
  children: Child[];
}>();
const emit = defineEmits<{
  'update:modelValue': [v: boolean];
  saved: [];
}>();

const toast = useToastStore();
const isEdit = computed(() => !!props.rule);

const name = ref('');
const description = ref('');
const points = ref(5);
const userIds = ref<number[]>([]);   // 多选孩子
const freq = ref<'daily' | 'weekly' | 'monthly'>('daily');
const weekdays = ref<number[]>([]);
const monthdays = ref<number[]>([]);
/** 发布时刻：anytime=当天首次检查即发；exact=指定 HH:MM 到点发布 */
const timeMode = ref<'anytime' | 'exact'>('anytime');
const timeOfDay = ref('08:00');
/** 每期截止：off=不设截止；hours=发布后 N 小时内完成（允许跨期） */
const dueMode = ref<'off' | 'hours'>('off');
const dueHours = ref(24);
const saving = ref(false);

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日']; // 1~7 = 周一~周日

watch(() => props.modelValue, (open) => {
  if (open) {
    if (props.rule) {
      name.value = props.rule.name;
      description.value = props.rule.description ?? '';
      points.value = props.rule.points;
      userIds.value = [...(props.rule.userIds ?? (props.rule.userId ? [props.rule.userId] : []))];
      freq.value = props.rule.freq;
      weekdays.value = [...(props.rule.weekdays ?? [])];
      monthdays.value = [...(props.rule.monthdays ?? [])];
      timeMode.value = props.rule.timeOfDay ? 'exact' : 'anytime';
      timeOfDay.value = props.rule.timeOfDay ?? '08:00';
      dueMode.value = props.rule.dueHours != null ? 'hours' : 'off';
      dueHours.value = props.rule.dueHours ?? 24;
    } else {
      name.value = '';
      description.value = '';
      points.value = 5;
      userIds.value = props.children.length === 1 ? [props.children[0].id] : [];
      freq.value = 'daily';
      weekdays.value = [];
      monthdays.value = [];
      timeMode.value = 'anytime';
      timeOfDay.value = '08:00';
      dueMode.value = 'off';
      dueHours.value = 24;
    }
  }
}, { immediate: true }); // v-if 挂载时 modelValue 已为 true，缺 immediate 表单全空

function toggleChild(id: number) {
  const i = userIds.value.indexOf(id);
  if (i >= 0) userIds.value.splice(i, 1);
  else userIds.value.push(id);
}

function toggleWeekday(d: number) {
  const i = weekdays.value.indexOf(d);
  if (i >= 0) weekdays.value.splice(i, 1);
  else weekdays.value.push(d);
}

function toggleMonthday(d: number) {
  const i = monthdays.value.indexOf(d);
  if (i >= 0) monthdays.value.splice(i, 1);
  else monthdays.value.push(d);
}

async function save() {
  if (!name.value.trim()) return toast.warning('请输入任务名称');
  if (userIds.value.length === 0) return toast.warning('请至少选择一个小朋友');
  if (freq.value === 'weekly' && weekdays.value.length === 0) return toast.warning('请选择重复的星期');
  if (freq.value === 'monthly' && monthdays.value.length === 0) return toast.warning('请选择重复的日期');
  if (timeMode.value === 'exact' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(timeOfDay.value)) {
    return toast.warning('请选择有效的发布时间');
  }
  if (dueMode.value === 'hours' && (!Number.isInteger(dueHours.value) || dueHours.value < 1 || dueHours.value > 720)) {
    return toast.warning('截止时长需为 1~720 的整数小时');
  }

  const payload = {
    name: name.value.trim(),
    description: description.value.trim() || null,
    points: points.value,
    userIds: [...userIds.value].sort((a, b) => a - b),
    freq: freq.value,
    weekdays: freq.value === 'weekly' ? [...weekdays.value].sort((a, b) => a - b) : null,
    monthdays: freq.value === 'monthly' ? [...monthdays.value].sort((a, b) => a - b) : null,
    timeOfDay: timeMode.value === 'exact' ? timeOfDay.value : null,
    dueHours: dueMode.value === 'hours' ? dueHours.value : null,
  };

  saving.value = true;
  try {
    if (isEdit.value) {
      const res = await api.patch<{ generated: number }>(`/recurring-tasks/${props.rule.id}`, payload);
      toast.success(res.generated > 0 ? '周期任务已更新，今天这一期已发布 🎉' : '周期任务已更新');
    } else {
      const res = await api.post<{ generated: number }>('/recurring-tasks', payload);
      toast.success(res.generated > 0 ? '周期任务已创建，今天的一期已发布 🎉' : '周期任务已创建，到了时间会自动发布 🎉');
    }
    emit('saved');
  } catch (e: any) {
    const detail = e?.payload?.detail;
    toast.error(detail || e.message || '保存失败');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Modal
    :model-value="modelValue"
    :title="isEdit ? '编辑周期任务' : '周期任务'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="form">
      <div class="field">
        <label class="label">选择小朋友（可多选）</label>
        <div class="child-grid">
          <button
            v-for="c in children"
            :key="c.id"
            type="button"
            :class="['child-chip', { active: userIds.includes(c.id) }]"
            @click="toggleChild(c.id)"
          >
            <ZodiacAvatar :zodiac="c.avatar" :size="56" />
            <span>{{ c.name }}</span>
            <span v-if="userIds.includes(c.id)" class="check">✓</span>
          </button>
        </div>
        <p v-if="userIds.length > 1" class="hint">已选 {{ userIds.length }} 位，会分别给每人各发一条任务</p>
      </div>

      <div class="field">
        <label class="label">任务名称</label>
        <input v-model="name" type="text" maxlength="50" placeholder="如：叠被子" />
      </div>

      <div class="field">
        <label class="label">任务描述（可选）</label>
        <textarea v-model="description" maxlength="200" rows="2" placeholder="任务详情..."></textarea>
      </div>

      <div class="field">
        <label class="label">奖励积分 🌟（每期）</label>
        <input v-model.number="points" type="number" min="1" max="999" />
      </div>

      <div class="field">
        <label class="label">重复频率</label>
        <div class="freq-row">
          <button type="button" :class="['freq-btn', { active: freq === 'daily' }]" @click="freq = 'daily'">每天</button>
          <button type="button" :class="['freq-btn', { active: freq === 'weekly' }]" @click="freq = 'weekly'">每周</button>
          <button type="button" :class="['freq-btn', { active: freq === 'monthly' }]" @click="freq = 'monthly'">每月</button>
        </div>

        <div v-if="freq === 'weekly'" class="pick-row">
          <button
            v-for="(lbl, i) in WEEK_LABELS"
            :key="i"
            type="button"
            :class="['pick-chip', { active: weekdays.includes(i + 1) }]"
            @click="toggleWeekday(i + 1)"
          >周{{ lbl }}</button>
        </div>
        <div v-if="freq === 'monthly'" class="pick-row wrap">
          <button
            v-for="d in 31"
            :key="d"
            type="button"
            :class="['pick-chip', 'mini', { active: monthdays.includes(d) }]"
            @click="toggleMonthday(d)"
          >{{ d }}</button>
        </div>
      </div>

      <div class="field">
        <label class="label">发布时间</label>
        <div class="freq-row">
          <button
            type="button"
            :class="['freq-btn', { active: timeMode === 'anytime' }]"
            @click="timeMode = 'anytime'"
          >当天即发</button>
          <button
            type="button"
            :class="['freq-btn', { active: timeMode === 'exact' }]"
            @click="timeMode = 'exact'"
          >指定时间点</button>
        </div>
        <div v-if="timeMode === 'exact'" class="time-row">
          <input v-model="timeOfDay" type="time" class="time-input" />
          <span class="time-hint">到 {{ timeOfDay }} 自动发布（服务器时间）</span>
        </div>
        <p class="hint">
          {{ timeMode === 'exact'
            ? '到点后由调度器发布（每分钟检查一次，最多晚 1 分钟）；停机期间错过的，重启后会当天补发。'
            : '当天首次调度检查时发布（不限具体时刻）。' }}
        </p>
        <p class="hint">到了日子会自动发布一期任务，完成后孩子正常提交、你正常审核。</p>
      </div>

      <div class="field">
        <label class="label">截止时间</label>
        <div class="freq-row">
          <button
            type="button"
            :class="['freq-btn', { active: dueMode === 'off' }]"
            @click="dueMode = 'off'"
          >不设截止</button>
          <button
            type="button"
            :class="['freq-btn', { active: dueMode === 'hours' }]"
            @click="dueMode = 'hours'"
          >发布后限时</button>
        </div>
        <div v-if="dueMode === 'hours'" class="time-row">
          <input v-model.number="dueHours" type="number" min="1" max="720" class="time-input" />
          <span class="time-hint">小时内完成（1~720）</span>
        </div>
        <p class="hint">
          {{ dueMode === 'hours'
            ? `每期发布后 ${dueHours} 小时内完成，逾期后任务会自动结束并从孩子的任务列表中移除。`
            : '不设截止，任务一直有效直到完成。' }}
        </p>
        <p v-if="dueMode === 'hours'" class="hint">允许跨期：若截止晚于下一期发布，两期任务会短暂并存，各自独立完成与计分。</p>
      </div>
    </div>

    <template #footer>
      <span style="flex:1"></span>
      <button class="btn btn-ghost" @click="emit('update:modelValue', false)">取消</button>
      <button class="btn btn-primary" @click="save" :disabled="saving">
        {{ saving ? '保存中...' : (isEdit ? '保存' : '创建') }}
      </button>
    </template>
  </Modal>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 18px; }
.field { display: flex; flex-direction: column; gap: 8px; }
.label { font-size: 13px; color: var(--text-secondary); padding-left: 4px; }
.hint { font-size: 11px; color: var(--text-muted); padding-left: 4px; }
textarea { resize: vertical; min-height: 60px; font-family: inherit; }

.child-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.child-chip {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 4px; border-radius: var(--r-md);
  background: var(--glass-bg); border: 2px solid transparent;
  transition: all 0.2s; position: relative; cursor: pointer;
}
.child-chip span { font-size: 12px; font-family: var(--font-cute); }
.child-chip.active { border-color: var(--accent-yellow); background: rgba(255, 209, 102, 0.15); }
.child-chip .check { position: absolute; top: 4px; right: 6px; color: var(--accent-yellow); font-size: 14px; font-weight: bold; }

.freq-row { display: flex; gap: 8px; }
.freq-btn {
  flex: 1; padding: 10px; border-radius: var(--r-sm);
  background: var(--glass-bg); color: var(--text-secondary); font-weight: 600;
  border: 1px solid transparent;   /* 占位：选中态换色时不产生 2px 高度跳动 */
  transition: all 0.2s;
}
/* 选中态：实心暖黄渐变 + 深色文字。
   此前是「淡黄底 + --accent-yellow 文字」—— 同一个 #ffd166 既当背景又当文字色，
   叠在白色玻璃上两者亮度几乎相同（对比度约 1.4:1），标签基本看不见。
   改成实心渐变 + var(--text-primary) 后对比度 ≥ 5:1，
   且与全局的 .btn-primary / .btn-success 是同一套「渐变底 + 深色字」语言。 */
.freq-btn.active {
  background: linear-gradient(135deg, var(--accent-yellow), var(--accent-orange));
  color: var(--text-primary);
  font-weight: 700;
  box-shadow: 0 3px 10px rgba(255, 180, 84, 0.35);
}

.time-row { display: flex; align-items: center; gap: 10px; }
.time-input {
  width: 130px; padding: 8px 10px; border-radius: var(--r-sm);
  background: var(--glass-bg); border: 1px solid var(--glass-border);
  color: var(--text-primary); font-size: 15px; font-family: var(--font-cute);
}
.time-hint { font-size: 12px; color: var(--text-secondary); }

.pick-row { display: flex; gap: 6px; flex-wrap: wrap; }
.pick-row.wrap { max-height: 120px; overflow-y: auto; }
.pick-chip {
  padding: 8px 12px; border-radius: 999px; font-size: 12px;
  background: var(--glass-bg); color: var(--text-secondary);
  border: 1px solid transparent; transition: all 0.15s;
}
.pick-chip.mini { padding: 6px 0; width: 38px; text-align: center; }
/* 同一个毛病的另一处：淡薄荷底 + --accent-mint 文字。改用与 .btn-success
   完全一致的「薄荷→天蓝 渐变 + 深色字」，选中态一眼可见。 */
.pick-chip.active {
  background: linear-gradient(135deg, var(--accent-mint), var(--accent-sky));
  color: #1a1a2e;
  font-weight: 700;
}
</style>
