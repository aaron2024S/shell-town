<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { resolvePetImage, onPetAssetsChanged } from '@/lib/pet/asset';
import { usePetCatalogStore } from '@/stores/petCatalog';
import { MOOD_META, getPetSpecies, type PetMood } from '@/utils/pets';

const catalog = usePetCatalogStore();

const props = withDefaults(defineProps<{
  /** 物种 key，如 'pyro' */
  species: string;
  /** 等级 0~4（0 = 蛋） */
  level: number;
  mood?: PetMood;
  /** 边长（px） */
  size?: number;
  /** 外部光环（用于首页主视觉） */
  ring?: boolean;
}>(), {
  mood: 'ok',
  size: 96,
  ring: false,
});

// 立绘素材（web/public/pets/<物种>/<阶段>.webp，构建时打包，必定存在）
const imgUrl = ref<string | null>(null);

// 素材被替换（家长端换图/新增物种）时自增，触发重新解析图片
const assetsRev = ref(0);
let stopAssetsWatch: (() => void) | null = null;
onMounted(() => {
  stopAssetsWatch = onPetAssetsChanged(() => { assetsRev.value++; });
});
onUnmounted(() => { stopAssetsWatch?.(); stopAssetsWatch = null; });

watch(
  () => [props.species, props.level, assetsRev.value] as [string, number, number],
  async ([sp, lv]) => {
    imgUrl.value = null;
    const url = await resolvePetImage(sp, lv);
    // 竞态保护：结果回来时配置没变才应用
    if (props.species === sp && props.level === lv) imgUrl.value = url;
  },
  { immediate: true }
);

const boxStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}));

// 图片缺失时的兜底（正常打包后不会出现）。emoji 优先取目录里该物种自己的，
// 自建物种在内置表里查不到，用静态表会错拿内置第一只的火球 emoji
const emojiFallback = computed(
  () => catalog.byKey(props.species)?.emoji ?? getPetSpecies(props.species).emoji
);

const moodColor = computed(() => MOOD_META[props.mood]?.color ?? MOOD_META.ok.color);
</script>

<template>
  <div
    class="pet-avatar"
    :class="{ ring }"
    :style="ring ? { ...boxStyle, '--pet-ring': moodColor } : boxStyle"
  >
    <img
      v-if="imgUrl"
      class="pet-img"
      :src="imgUrl"
      alt="宠物形象"
      @error="imgUrl = null"
    />
    <span v-else class="pet-fallback">{{ emojiFallback }}</span>
  </div>
</template>

<style scoped>
.pet-avatar {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pet-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.pet-fallback {
  font-size: 2.2em;
  line-height: 1;
}
.pet-avatar.ring::before {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--pet-ring, #7ed4b9) 0%, transparent 70%);
  opacity: 0.22;
  pointer-events: none;
}
</style>
