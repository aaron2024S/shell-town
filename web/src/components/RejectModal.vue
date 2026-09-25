<script setup lang="ts">
// 通用「填写拒绝原因」弹窗：兑换申请与任务完成申请共用。
//
// 任务拒绝此前直接复用 ConfirmDialog —— 那个组件没有输入框，于是 review 接口收到的
// reason 恒为空字符串，孩子端只看得到「原因未说明」，等于拒绝原因功能没实现。
import { ref, watch } from 'vue';
import { api } from '@/api/client';
import { useToastStore } from '@/stores/toast';
import Modal from '@/components/Modal.vue';

const props = withDefaults(defineProps<{
  modelValue: boolean;
  /** 被拒绝的对象（需含 id 与 user_name） */
  request: any;
  /** 提交地址；不给则按「兑换申请」拼 */
  endpoint?: string;
  title?: string;
  hint?: string;
  placeholder?: string;
}>(), {
  endpoint: '',
  title: '拒绝兑换申请',
  hint: '',
  placeholder: '如：库存不足 / 不合适的兑换',
});

const emit = defineEmits<{ 'update:modelValue': [v: boolean]; done: [] }>();

const toast = useToastStore();
const reason = ref('');
const saving = ref(false);

watch(() => props.modelValue, (open) => {
  if (open) reason.value = '';
}, { immediate: true }); // 组件由 v-if 挂载，挂载时 modelValue 可能已为 true，统一加 immediate

async function reject() {
  if (!reason.value.trim()) return toast.warning('请填写拒绝原因');
  saving.value = true;
  try {
    const url = props.endpoint || `/exchange-requests/${props.request.id}/reject`;
    await api.post(url, { reason: reason.value.trim() });
    toast.success('已拒绝');
    emit('done');
  } catch (e: any) {
    const err = e.payload?.error;
    if (err === 'already_reviewed') toast.warning('该申请已处理过');
    else toast.error(e.message);
  } finally { saving.value = false; }
}
</script>

<template>
  <Modal :model-value="modelValue" :title="title" @update:model-value="emit('update:modelValue', $event)">
    <div class="form">
      <p class="hint">
        {{ hint || `拒绝后，积分将退回给 ${request.user_name}` }}
      </p>
      <textarea v-model="reason" maxlength="100" rows="3" :placeholder="placeholder"></textarea>
    </div>
    <template #footer>
      <span style="flex:1"></span>
      <button class="btn btn-ghost" @click="emit('update:modelValue', false)">取消</button>
      <button class="btn btn-danger" @click="reject" :disabled="saving">
        {{ saving ? '处理中...' : '确认拒绝' }}
      </button>
    </template>
  </Modal>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 12px; }
.hint { font-size: 13px; color: var(--text-secondary); }
textarea { resize: vertical; min-height: 80px; font-family: inherit; }
</style>
