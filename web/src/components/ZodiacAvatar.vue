<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { getZodiac } from '@/utils/zodiac';
import { isHumationAvatar } from '@/lib/humation/spec';
import { renderHumationSvg } from '@/lib/humation/render';

const props = withDefaults(defineProps<{
  zodiac?: string;
  size?: number;
  showRing?: boolean;
}>(), {
  size: 64,
  showRing: false,
});

const z = computed(() => getZodiac(props.zodiac));
const isHum = computed(() => isHumationAvatar(props.zodiac));

// humation 规格头像：异步惰性渲染 SVG（资产 chunk 按需加载）
// 必须区分「渲染中」与「渲染失败」：规格非法 / 部件不存在 / chunk 加载失败时
// renderHumationSvg 返回 null，此时要回落到生肖 emoji，而不是永远停在加载态
type HumState = 'loading' | 'ready' | 'failed';
const humSvg = ref<string | null>(null);
const humState = ref<HumState>('loading');

watch(
  () => props.zodiac,
  async (value) => {
    if (!isHumationAvatar(value)) {
      humSvg.value = null;
      humState.value = 'ready';
      return;
    }
    humState.value = 'loading';
    humSvg.value = null;
    const svg = await renderHumationSvg(value);
    if (props.zodiac !== value) return; // 竞态保护
    humSvg.value = svg;
    humState.value = svg ? 'ready' : 'failed';
  },
  { immediate: true }
);

// 是否按 humation 视觉渲染（失败时连同背景/光圈一起回落为生肖样式）
const showHum = computed(() => isHum.value && humState.value !== 'failed');

const style = computed(() => {
  const s = props.size;
  const fontSize = Math.floor(s * 0.78);
  const ringColor = showHum.value ? '#9EC3E6' : z.value.color;
  return {
    width: `${s}px`,
    height: `${s}px`,
    fontSize: `${fontSize}px`,
    background: showHum.value
      ? '#ffffff'
      : `radial-gradient(circle at 30% 25%, #ffffff 0%, ${z.value.color} 60%, ${z.value.color}cc 100%)`,
    boxShadow: props.showRing
      ? `0 0 0 4px #ffffffaa, 0 0 0 7px ${ringColor}aa, 0 8px 24px ${ringColor}66`
      : `0 4px 16px ${ringColor}55, inset 0 1px 2px rgba(255,255,255,0.5)`,
  } as Record<string, string>;
});
</script>

<template>
  <div v-if="showHum && humState === 'ready' && humSvg" class="zodiac-avatar hum" :style="style">
    <div class="hum-svg" v-html="humSvg" />
  </div>
  <div v-else-if="showHum" class="zodiac-avatar hum loading" :style="style">
    <span class="emoji">🎨</span>
  </div>
  <div v-else class="zodiac-avatar" :style="style">
    <span class="emoji">{{ z.emoji }}</span>
  </div>
</template>

<style scoped>
.zodiac-avatar {
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.7);
  position: relative;
  transition: transform 0.2s;
}
.zodiac-avatar:hover {
  transform: scale(1.05);
}
.emoji {
  line-height: 1;
  font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Twemoji Mozilla', sans-serif;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.15));
}
.hum {
  overflow: hidden;
  padding: 2px;
}
.hum-svg,
.hum-svg :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}
.hum-svg :deep(svg) {
  border-radius: 50%;
}
.hum.loading {
  animation: hum-pulse 1.2s ease-in-out infinite;
}
@keyframes hum-pulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}
</style>
