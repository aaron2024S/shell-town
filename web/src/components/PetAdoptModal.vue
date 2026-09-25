<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { api } from '@/api/client';
import { useToastStore } from '@/stores/toast';
import { usePetCatalogStore } from '@/stores/petCatalog';
import PetAvatar from '@/components/PetAvatar.vue';
import PetEvolutionPreview from '@/components/PetEvolutionPreview.vue';
import {
  SERIES_ORDER, SERIES_LABELS, SERIES_HINTS,
  MAX_LEVEL, getPetSpecies,
  type PetSeries,
} from '@/utils/pets';

const catalog = usePetCatalogStore();
onMounted(() => catalog.load());

const props = defineProps<{
  modelValue: boolean;
  /** 当前宠物（换宠时用于对比与提示）；没有宠物传 null */
  current?: { species: string; level: number; nickname?: string | null } | null;
  /** 从图鉴点进来时预选的物种；不传则定位到当前宠物 */
  preset?: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'adopted', pet: any): void;
}>();

const toast = useToastStore();

/** 默认选中目录里的第一只（避免硬编码已下线的旧物种 key） */
const fallbackKey = computed(() => catalog.species[0]?.key ?? 'drake');
const series = ref<PetSeries>('boy');
const selected = ref('');
const nickname = ref('');
const previewLevel = ref(3);
const saving = ref(false);
const errorText = ref('');

const list = computed(() => catalog.species.filter((s) => s.series === series.value));
/** 物种信息一律从目录里取（含家长自建物种），取不到才退回内置表 */
const selectedSpecies = computed(() => catalog.byKey(selected.value) ?? getPetSpecies(selected.value));
const currentSpecies = computed(() => props.current?.species ?? null);
/** 换成不同物种会重置等级 */
const willReset = computed(() => !!currentSpecies.value && selected.value !== currentSpecies.value);
const isSameSpecies = computed(() => !!currentSpecies.value && selected.value === currentSpecies.value);

// 打开时定位到当前宠物所在系列，并预选当前宠物
watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return;
    errorText.value = '';
    const start = props.preset || currentSpecies.value || fallbackKey.value;
    selected.value = start;
    // 系列要从目录取：自建物种不在内置表里，用静态表会定位到错误的系列页签
    series.value = (catalog.byKey(start) ?? getPetSpecies(start)).series;
    previewLevel.value = Math.max(1, Math.min(MAX_LEVEL, props.current?.level || 3));
    nickname.value = props.current?.nickname ?? '';

    // 每次打开都强制重拉目录：家长端刚新增的宠物无需刷新页面就能选到。
    // 拉取是异步的 —— 首次打开时本地还只有内置表，自建物种要等拉完才知道属于哪个系列，
    // 所以拉完后再校正一次（期间用户若已改选别的物种/关掉弹窗就不动）。
    await catalog.load(true);
    if (!props.modelValue || selected.value !== start) return;
    const sp = catalog.byKey(start);
    if (sp) series.value = sp.series;
  },
  { immediate: true }
);

function pick(key: string) {
  selected.value = key;
  errorText.value = '';
}

async function confirm() {
  if (saving.value) return;
  saving.value = true;
  errorText.value = '';
  try {
    const res = await api.post<{ pet: any; reset: boolean; created: boolean }>('/pets/adopt', {
      species: selected.value,
      nickname: nickname.value.trim() || undefined,
    });
    if (res.created) {
      toast.success(`🎉 领养成功！这是你的${res.pet.displayName}啦`);
    } else if (res.reset) {
      toast.success(`换成${res.pet.speciesName}啦，要重新开始养哦~`);
    } else {
      toast.success('名字改好啦');
    }
    emit('adopted', res.pet);
    emit('update:modelValue', false);
  } catch (e: any) {
    const err = e.payload?.error;
    if (err === 'invalid_species') errorText.value = '这个形象暂时没有哦';
    else if (err === 'child_only') errorText.value = '只有小朋友账号可以领养宠物';
    else errorText.value = e.message || '操作失败，再试一次';
  } finally {
    saving.value = false;
  }
}

const confirmText = computed(() => {
  if (!currentSpecies.value) return '就选它了';
  if (isSameSpecies.value) return '保存改名';
  return '换成它，重新养成';
});
</script>

<template>
  <Transition name="modal">
    <div v-if="modelValue" class="mask" @click.self="emit('update:modelValue', false)">
      <div class="sheet glass-strong">
        <header class="head">
          <h2 class="head-title">🐾 选择你的宠物</h2>
          <p class="head-sub">一共 {{ catalog.species.length }} 只，都能从蛋养到究极体</p>
          <button class="close" @click="emit('update:modelValue', false)">✕</button>
        </header>

        <div class="body">
          <div class="tabs">
            <button
              v-for="s in SERIES_ORDER"
              :key="s"
              :class="{ active: series === s }"
              @click="series = s"
            >
              {{ SERIES_LABELS[s] }}
            </button>
          </div>
          <p class="series-hint">{{ SERIES_HINTS[series] }}</p>

          <div class="grid">
            <button
              v-for="sp in list"
              :key="sp.key"
              class="cell"
              :class="{ active: selected === sp.key, mine: currentSpecies === sp.key }"
              @click="pick(sp.key)"
            >
              <PetAvatar :species="sp.key" :level="3" :size="56" />
              <span class="cell-name">{{ sp.name }}</span>
              <span v-if="currentSpecies === sp.key" class="mine-tag">我的</span>
            </button>
          </div>

          <PetEvolutionPreview
            class="preview"
            :species="selected"
            :level="previewLevel"
            @update:level="previewLevel = $event"
          />

          <label class="name-row">
            <span class="name-label">给它起个名字</span>
            <input
              v-model="nickname"
              class="name-input"
              type="text"
              maxlength="12"
              :placeholder="selectedSpecies.name"
            />
          </label>

          <div v-if="willReset" class="warn">
            ⚠️ 换成 <b>{{ selectedSpecies.name }}</b> 会从 Lv1 重新开始养，现在的等级和状态会清空（花掉的积分不退）
          </div>
          <div v-else-if="isSameSpecies" class="info">
            ✏️ 还是同一只宠物，只会更新名字，等级和状态都保留
          </div>

          <p v-if="errorText" class="err">{{ errorText }}</p>
        </div>

        <footer class="foot">
          <button class="btn btn-ghost" @click="emit('update:modelValue', false)">再想想</button>
          <button class="btn btn-primary" :disabled="saving" @click="confirm">
            {{ saving ? '处理中…' : confirmText }}
          </button>
        </footer>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 120;
  padding: 16px;
}
.sheet {
  width: 100%;
  max-width: 460px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  border-radius: var(--r-xl);
  border: 1px solid var(--glass-border);
  overflow: hidden;
}
.head {
  position: relative;
  padding: 18px 20px 12px;
  border-bottom: 1px solid var(--glass-border);
}
.head-title { font-family: var(--font-cute); font-size: 19px; }
.head-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--glass-bg);
  color: var(--text-secondary);
  font-size: 14px;
}
.body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 18px 6px;
}

.tabs {
  display: flex;
  gap: 4px;
  background: var(--glass-bg);
  border-radius: var(--r-md);
  padding: 4px;
}
.tabs button {
  flex: 1;
  padding: 8px;
  border-radius: var(--r-sm);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
}
.tabs button.active {
  background: var(--glass-bg-strong);
  color: var(--text-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}
.series-hint {
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
  margin: 8px 0 12px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}
.cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px 6px;
  border-radius: var(--r-md);
  background: var(--glass-bg);
  border: 2px solid transparent;
  transition: all 0.15s;
}
.cell:hover { transform: translateY(-2px); }
.cell.active {
  border-color: var(--accent-yellow);
  background: rgba(255, 209, 102, 0.16);
}
.cell-name { font-size: 11px; color: var(--text-secondary); }
.cell.mine .cell-name { color: var(--accent-orange); font-weight: 600; }
.mine-tag {
  position: absolute;
  top: -6px;
  right: -4px;
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 8px;
  background: var(--accent-orange);
  color: #fff;
}

.preview { margin-bottom: 14px; }

.name-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.name-label { font-size: 13px; color: var(--text-secondary); flex-shrink: 0; }
.name-input {
  flex: 1;
  min-width: 0;
  padding: 9px 12px;
  border-radius: var(--r-sm);
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  color: var(--text-primary);
}

.warn,
.info {
  font-size: 12px;
  line-height: 1.6;
  padding: 10px 12px;
  border-radius: var(--r-sm);
  margin-bottom: 10px;
}
.warn { background: rgba(255, 122, 122, 0.12); color: var(--danger); }
.info { background: rgba(126, 212, 185, 0.14); color: #3f8e73; }
.err { font-size: 12px; color: var(--danger); margin-bottom: 10px; }

.foot {
  display: flex;
  gap: 10px;
  padding: 12px 18px 16px;
  border-top: 1px solid var(--glass-border);
}
.foot .btn { flex: 1; }

.modal-enter-active,
.modal-leave-active { transition: opacity 0.22s ease; }
.modal-enter-active .sheet,
.modal-leave-active .sheet { transition: transform 0.22s ease; }
.modal-enter-from,
.modal-leave-to { opacity: 0; }
.modal-enter-from .sheet,
.modal-leave-to .sheet { transform: scale(0.94) translateY(10px); }
</style>
