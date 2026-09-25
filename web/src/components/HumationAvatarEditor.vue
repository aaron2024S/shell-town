<script setup lang="ts">
/**
 * humation 自定义形象编辑器：部位选择 + 配色 + 背景 + 随机 + 实时预览。
 * 保存时产出 'hum1:<json>' 规格字符串（写入 users.avatar）。
 */
import { computed, onMounted, ref, shallowRef, watch } from 'vue';
import Modal from '@/components/Modal.vue';
import type { HumationManifest, PartOption } from '@/lib/humation/types';
import {
  draftFromSpec,
  draftToSpec,
  encodeSpec,
  randomDraft,
  type AvatarDraft,
} from '@/lib/humation/spec';
import {
  draftColorVars,
  loadHumationManifest,
  renderDraftSvg,
  renderPartPreviewSvg,
} from '@/lib/humation/render';

const props = defineProps<{ current: string }>();
const emit = defineEmits<{ save: [value: string]; close: [] }>();

const SLOT_LABELS: Record<string, string> = {
  head: '头像',
  body: '上衣',
  bottom: '下装',
  item: '配饰',
  glasses: '眼镜',
};
const COLOR_LABELS: Array<{ key: string; label: string }> = [
  { key: 'hair', label: '发色' },
  { key: 'skin', label: '肤色' },
  { key: 'clothes', label: '上衣' },
  { key: 'bottom', label: '下装' },
  { key: 'stroke', label: '描边' },
];
const BG_SWATCHES = [
  { value: 'F6F5F4', label: '默认' },
  { value: 'FFF7E6', label: '奶油' },
  { value: 'EAF6FF', label: '天空' },
  { value: 'F0FFF4', label: '薄荷' },
  { value: 'FDEFF5', label: '樱粉' },
  { value: 'transparent', label: '透明' },
];

const checkeredStyle = {
  backgroundImage:
    'linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%), linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%)',
  backgroundSize: '8px 8px',
  backgroundPosition: '0 0, 4px 4px',
};

const manifest = shallowRef<HumationManifest | null>(null);
const draft = ref<AvatarDraft | null>(null);
const activeSlot = ref('head');

onMounted(async () => {
  const m = await loadHumationManifest();
  manifest.value = m;
  draft.value = draftFromSpec(props.current) ?? randomDraft(m);
});

const slots = computed(() => {
  const m = manifest.value;
  if (!m) return [];
  const order = new Map(m.uiGroups.map((g) => [g.id, g.order]));
  return [...m.selectionSlots].sort(
    (a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99)
  );
});

/**
 * 部件缩略图的 SVG 骨架缓存：`${slot}|${bg}` → SVG 字符串数组。
 *
 * 关键点：缩略图**不依赖配色**。部件形状内部写的是 `var(--hm-hair, #000000)`，
 * 配色由下面的 `partColorVars` 挂到 .parts 容器上、经 CSS 变量继承进每个 SVG。
 * 于是拖动取色器时不会重建整个部件网格的 DOM —— 只换一个 style 对象。
 */
const partPreviewCache = new Map<string, string[]>();

const activeParts = computed<PartOption[]>(() => {
  const m = manifest.value;
  if (!m) return [];
  return m.parts
    .filter((p) => p.selectionSlot === activeSlot.value && !p.deprecated)
    .sort((a, b) => {
      const aId = a.source?.partId ?? a.id;
      const bId = b.source?.partId ?? b.id;
      return aId.localeCompare(bId);
    });
});

/** 缩略图骨架：只随「槽位 + 背景」变化 */
const partPreviews = computed<string[]>(() => {
  const m = manifest.value;
  const d = draft.value;
  if (!m || !d) return [];
  const cacheKey = `${activeSlot.value}|${d.bg}`;
  const hit = partPreviewCache.get(cacheKey);
  if (hit && hit.length === activeParts.value.length) return hit;

  const svgs = activeParts.value.map((part) =>
    renderPartPreviewSvg(m, part, { background: d.bg, inlineColors: false })
  );
  // 上限保护：正常只有几个槽位 × 几种背景，不会被撑大
  if (partPreviewCache.size > 64) partPreviewCache.clear();
  partPreviewCache.set(cacheKey, svgs);
  return svgs;
});

/** 实时配色 → 容器 CSS 变量（改配色只更新这一个对象，不重建 DOM） */
const partColorVars = computed<Record<string, string>>(() => {
  const m = manifest.value;
  const d = draft.value;
  if (!m || !d) return {};
  return draftColorVars(m, d.col);
});

const previewSvg = computed<string | null>(() => {
  const m = manifest.value;
  const d = draft.value;
  if (!m || !d) return null;
  try {
    return renderDraftSvg(m, d);
  } catch {
    return null;
  }
});

function pickPart(part: PartOption) {
  if (!draft.value) return;
  draft.value.sel = { ...draft.value.sel, [activeSlot.value]: part.id };
}

function setColor(key: string, hex: string) {
  if (!draft.value) return;
  draft.value.col = {
    ...draft.value.col,
    [key]: hex.replace('#', '').toUpperCase(),
  };
}

function setBg(value: string) {
  if (draft.value) draft.value.bg = value;
}

function shuffle() {
  const m = manifest.value;
  if (m) draft.value = randomDraft(m);
}

function reset() {
  const m = manifest.value;
  if (!m) return;
  draft.value = {
    sel: { ...m.defaults.selections },
    col: { ...m.defaults.colors },
    bg: m.defaults.background,
  };
}

function save() {
  if (!draft.value) return;
  emit('save', encodeSpec(draftToSpec(draft.value)));
}

watch(activeSlot, (slot) => {
  if (draft.value && !draft.value.sel[slot]) {
    // 切到尚未选过的槽位时默认选第一个部件
    const first = activeParts.value[0];
    if (first) pickPart(first);
  }
});
</script>

<template>
  <Modal :model-value="true" title="自定义形象" width="600px" @update:model-value="emit('close')">
    <div v-if="!manifest || !draft" class="loading-tip">形象加载中...</div>
    <div v-else class="editor">
      <!-- 预览 + 槽位页签 -->
      <div class="top">
        <div class="preview-box" v-html="previewSvg" />
        <div class="slots">
          <button
            v-for="s in slots"
            :key="s.id"
            type="button"
            :class="['slot-chip', { active: activeSlot === s.id }]"
            @click="activeSlot = s.id"
          >
            {{ SLOT_LABELS[s.id] ?? s.label }}
          </button>
        </div>
      </div>

      <!-- 当前槽位的部件选项（配色通过容器的 CSS 变量实时注入，见 partColorVars） -->
      <div class="parts" :style="partColorVars">
        <button
          v-for="(part, i) in activeParts"
          :key="part.id"
          type="button"
          :class="['part', { active: draft.sel[activeSlot] === part.id }]"
          :title="part.name ?? part.id"
          @click="pickPart(part)"
        >
          <span class="part-svg" v-html="partPreviews[i]" />
        </button>
      </div>

      <!-- 配色 -->
      <div class="colors">
        <label v-for="c in COLOR_LABELS" :key="c.key" class="color-item">
          <input
            type="color"
            :value="'#' + (draft.col[c.key] ?? '000000')"
            @input="setColor(c.key, ($event.target as HTMLInputElement).value)"
          />
          <span>{{ c.label }}</span>
        </label>
      </div>

      <!-- 背景 -->
      <div class="colors">
        <button
          v-for="b in BG_SWATCHES"
          :key="b.value"
          type="button"
          :class="['bg-swatch', { active: draft.bg === b.value }]"
          :style="b.value === 'transparent' ? checkeredStyle : { background: '#' + b.value }"
          @click="setBg(b.value)"
        >
          {{ b.label }}
        </button>
      </div>

      <!-- 操作 -->
      <div class="actions">
        <button type="button" class="btn btn-ghost" @click="shuffle">🎲 随机</button>
        <button type="button" class="btn btn-ghost" @click="reset">↺ 重置</button>
        <span class="spacer" />
        <button type="button" class="btn" @click="emit('close')">取消</button>
        <button type="button" class="btn btn-primary" @click="save">使用这个形象</button>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.loading-tip {
  text-align: center;
  padding: 32px 0;
  color: var(--text-muted);
}
.editor {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.top {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.preview-box {
  width: 150px;
  height: 150px;
  flex-shrink: 0;
  border-radius: var(--r-lg, 16px);
  border: 2px solid var(--glass-border);
  overflow: hidden;
  background: #fff;
}
.preview-box :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}
.slots {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.slot-chip {
  padding: 8px 14px;
  border-radius: 999px;
  border: 2px solid var(--glass-border);
  background: var(--glass-bg);
  font-size: 13px;
  color: var(--text-secondary);
  transition: all 0.2s;
}
.slot-chip.active {
  border-color: var(--accent-yellow);
  background: rgba(255, 209, 102, 0.15);
  color: var(--text-primary);
  font-weight: 600;
}
.parts {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
  padding: 4px;
}
.part {
  border-radius: var(--r-md, 12px);
  border: 2px solid var(--glass-border);
  background: var(--glass-bg);
  padding: 4px;
  transition: all 0.15s;
}
.part:hover {
  border-color: var(--accent-yellow);
}
.part.active {
  border-color: var(--accent-yellow);
  background: rgba(255, 209, 102, 0.15);
}
.part-svg {
  display: block;
}
.part-svg :deep(svg) {
  width: 100%;
  height: auto;
  display: block;
}
.colors {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
.color-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-secondary);
}
.color-item input[type='color'] {
  width: 40px;
  height: 40px;
  border: 2px solid var(--glass-border);
  border-radius: 50%;
  padding: 0;
  cursor: pointer;
  background: none;
}
.color-item input[type='color']::-webkit-color-swatch-wrapper {
  padding: 2px;
}
.color-item input[type='color']::-webkit-color-swatch {
  border: none;
  border-radius: 50%;
}
.bg-swatch {
  width: 44px;
  height: 44px;
  border-radius: var(--r-md, 12px);
  border: 2px solid var(--glass-border);
  font-size: 10px;
  color: var(--text-secondary);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 2px;
  overflow: hidden;
}
.bg-swatch.active {
  border-color: var(--accent-yellow);
  box-shadow: 0 0 0 2px rgba(255, 209, 102, 0.4);
}
.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.spacer {
  flex: 1;
}
.btn-ghost {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
}
</style>
