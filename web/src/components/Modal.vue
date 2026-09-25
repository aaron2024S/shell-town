<script setup lang="ts">
import { watch, onUnmounted } from 'vue';

const props = withDefaults(defineProps<{
  modelValue: boolean;
  title?: string;
  width?: string;
}>(), {
  title: '',
  width: '440px',
});

const emit = defineEmits<{
  'update:modelValue': [v: boolean];
}>();

function close() {
  emit('update:modelValue', false);
}

// ── body 滚动锁 ──────────────────────────────────────────────────────
// 旧实现有三个问题：
//   1. watch 没有 immediate —— 组件被 v-if 包着挂载时 modelValue 已是 true，
//      回调不触发，页面照样能滚；
//   2. 多弹窗叠加时任意一个关闭就把 overflow 清空（其它弹窗还开着却能滚）；
//   3. 不记录打开前的原值，关闭后无条件置空，会覆盖页面原有的 overflow 设置。
// 改为「引用计数 + 保存原值」。
let lockCount = 0;
let savedOverflow = '';

function lockScroll() {
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount++;
}

function unlockScroll() {
  if (lockCount === 0) return;
  lockCount--;
  if (lockCount === 0) document.body.style.overflow = savedOverflow;
}

watch(() => props.modelValue, (open) => {
  if (open) lockScroll();
  else unlockScroll();
}, { immediate: true });

onUnmounted(() => {
  // 打开状态下被卸载（父组件直接销毁弹窗）时也要把锁还回去
  if (props.modelValue) unlockScroll();
});

function onMaskClick() {
  close();
}
</script>

<template>
  <!-- Teleport 到 body：弹窗面板带 backdrop-filter，会成为后代 fixed 元素的包含块，
       不传送的话嵌套弹窗（如账号管理→编辑账号）会被限制在父弹窗内并被裁切 -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="modal-mask" @click.self="onMaskClick">
        <Transition name="slide-up" appear>
          <div v-if="modelValue" class="modal-panel glass-strong" :style="{ width }" @click.stop>
            <header v-if="title" class="modal-header">
              <h3>{{ title }}</h3>
              <button class="close-btn" @click="close" aria-label="关闭">✕</button>
            </header>
            <button v-else class="close-btn floating" @click="close" aria-label="关闭">✕</button>
            <div class="modal-body">
              <slot />
            </div>
            <footer v-if="$slots.footer" class="modal-footer">
              <slot name="footer" />
            </footer>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-panel {
  max-width: calc(100% - 32px);
  max-height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.modal-header h3 {
  font-family: var(--font-cute);
  font-size: 20px;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: background 0.2s;
}
.close-btn:hover {
  background: rgba(255, 255, 255, 0.16);
}
.close-btn.floating {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  scrollbar-width: thin;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
