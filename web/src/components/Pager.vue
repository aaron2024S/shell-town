<script setup lang="ts">
import { computed } from 'vue';

/**
 * 通用分页条：‹ 上一页 · 第 X / Y 页 · 下一页 ›
 * 由父组件持有 page 状态并监听 update:page 重新拉数据。
 */
const props = defineProps<{
  page: number;          // 当前页（从 1 开始）
  pageSize: number;      // 每页条数
  total: number;         // 记录总数
  disabled?: boolean;
}>();

const emit = defineEmits<{ 'update:page': [v: number] }>();

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));

function go(p: number) {
  if (props.disabled) return;
  const next = Math.min(Math.max(1, p), totalPages.value);
  if (next !== props.page) emit('update:page', next);
}
</script>

<template>
  <div v-if="total > pageSize" class="pager">
    <button class="pg-btn" :disabled="page <= 1 || disabled" aria-label="上一页" @click="go(page - 1)">‹</button>
    <span class="pg-info">第 {{ page }} / {{ totalPages }} 页 · 共 {{ total }} 条</span>
    <button class="pg-btn" :disabled="page >= totalPages || disabled" aria-label="下一页" @click="go(page + 1)">›</button>
  </div>
</template>

<style scoped>
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 14px;
}
.pg-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--glass-bg);
  color: var(--text-secondary);
  font-size: 18px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.pg-btn:not(:disabled):hover {
  background: var(--glass-bg-strong);
  color: var(--text-primary);
}
.pg-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
.pg-info {
  font-size: 12px;
  color: var(--text-muted);
}
</style>
