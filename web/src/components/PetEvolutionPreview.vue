<script setup lang="ts">
import { computed } from 'vue';
import PetAvatar from '@/components/PetAvatar.vue';
import { STAGE_NAMES, MAX_LEVEL } from '@/utils/pets';

const props = withDefaults(defineProps<{
  species: string;
  level: number;
  min?: number;
  max?: number;
}>(), {
  min: 1,
  max: MAX_LEVEL,
});

const emit = defineEmits<{ (e: 'update:level', v: number): void }>();

const lv = computed(() => Math.max(props.min, Math.min(props.max, Math.floor(props.level || props.min))));
const stageName = computed(() => STAGE_NAMES[lv.value] ?? '');
const progress = computed(() => {
  const span = props.max - props.min;
  return span > 0 ? ((lv.value - props.min) / span) * 100 : 100;
});

function onInput(e: Event) {
  emit('update:level', Number((e.target as HTMLInputElement).value));
}
</script>

<template>
  <div class="evo-preview">
    <PetAvatar :species="species" :level="lv" :size="128" mood="happy" />
    <div class="meta">
      <div class="stage">Lv{{ lv }} {{ stageName }}</div>
      <div class="hint">拖一拖，看看它长大的样子</div>
    </div>
    <input
      class="range"
      type="range"
      :min="min"
      :max="max"
      step="1"
      :value="lv"
      @input="onInput"
    />
    <div class="scale">
      <span>Lv{{ min }} {{ STAGE_NAMES[min] }}</span>
      <span>Lv{{ max }} {{ STAGE_NAMES[max] }}</span>
    </div>
  </div>
</template>

<style scoped>
.evo-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 12px 12px;
  border-radius: var(--r-lg);
  background: linear-gradient(180deg, rgba(255, 209, 102, 0.16), rgba(255, 255, 255, 0.55));
}
.meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin-top: 2px;
}
.stage {
  font-family: var(--font-cute);
  font-size: 17px;
  color: var(--text-primary);
}
.hint {
  font-size: 11px;
  color: var(--text-muted);
}
.range {
  width: 100%;
  margin-top: 6px;
  accent-color: var(--accent-orange);
}
.scale {
  width: 100%;
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--text-muted);
}
</style>
