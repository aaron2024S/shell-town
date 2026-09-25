<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { api } from '@/api/client';
import { useToastStore } from '@/stores/toast';
import Modal from '@/components/Modal.vue';
import CategoryIcon from '@/components/CategoryIcon.vue';
import { PRODUCT_CATEGORIES, PET_ITEM_CATEGORIES, PET_ICON_KEYS } from '@/utils/categories';
import { petEffectText } from '@/utils/pets';

const props = defineProps<{ modelValue: boolean; product?: any }>();
const emit = defineEmits<{ 'update:modelValue': [v: boolean]; saved: [] }>();

const toast = useToastStore();
const isEdit = computed(() => !!props.product);
const name = ref('');
const cost = ref(20);
const stock = ref(-1);
const unlimited = ref(true);
const icon = ref('gift');
const kind = ref<'physical' | 'pet'>('physical');
const saving = ref(false);

// 宠物道具效果（至少填一项）
const exp = ref<number | null>(null);
const satiety = ref<number | null>(null);
const happiness = ref<number | null>(null);
const health = ref<number | null>(null);

// 图标跟随上方「商品类型」联动：类型卡切换时图标网格整组切换，
// 不再两组平铺（那会和类型卡重复表达一遍分类）
const icons = computed(() =>
  kind.value === 'pet' ? PET_ITEM_CATEGORIES : PRODUCT_CATEGORIES
);

/** 图标属于哪个商品类型：宠物道具的那 4 个 key 之外都算实物 */
function iconFamily(key: string): 'physical' | 'pet' {
  return PET_ICON_KEYS.includes(key) ? 'pet' : 'physical';
}

const effectSummary = computed(() =>
  petEffectText({
    exp: exp.value ?? undefined,
    satiety: satiety.value ?? undefined,
    happiness: happiness.value ?? undefined,
    health: health.value ?? undefined,
  })
);

function resetForm() {
  name.value = '';
  cost.value = 20;
  stock.value = -1;
  unlimited.value = true;
  icon.value = 'gift';
  kind.value = 'physical';
  exp.value = null;
  satiety.value = null;
  happiness.value = null;
  health.value = null;
}

// immediate 不能省：本组件由 `v-if` 挂载，挂载时 modelValue 已经是 true，
// 不加 immediate 这个回调永远不会执行，编辑时表单就是一片空白
watch(() => props.modelValue, (open) => {
  if (!open) return;
  if (props.product) {
    const p = props.product;
    name.value = p.name;
    cost.value = p.cost;
    stock.value = p.stock;
    unlimited.value = p.stock === -1;
    icon.value = p.icon || 'gift';
    kind.value = p.kind === 'pet' ? 'pet' : 'physical';
    const e = p.pet_effect || {};
    exp.value = e.exp ?? null;
    satiety.value = e.satiety ?? null;
    happiness.value = e.happiness ?? null;
    health.value = e.health ?? null;
  } else {
    resetForm();
  }
}, { immediate: true });

// 图标即类型：网格里只会出现当前类型自己的图标，选了就算定类型
function pickIcon(key: string) {
  icon.value = key;
}

// 切换类型：只在该图标不属于新类型时才兜底换一个，避免清掉家长已经选好的图标
function pickKind(k: 'physical' | 'pet') {
  if (kind.value === k) return;
  kind.value = k;
  if (iconFamily(icon.value) !== k) {
    icon.value = k === 'pet' ? PET_ITEM_CATEGORIES[0].key : 'gift';
  }
}

async function save() {
  if (!name.value.trim()) return toast.warning('请输入商品名称');
  if (cost.value <= 0) return toast.warning('积分必须大于0');
  if (!unlimited.value && stock.value < 0) return toast.warning('库存不能小于0');

  const petEffect = kind.value === 'pet'
    ? {
        ...(exp.value ? { exp: exp.value } : {}),
        ...(satiety.value ? { satiety: satiety.value } : {}),
        ...(happiness.value ? { happiness: happiness.value } : {}),
        ...(health.value ? { health: health.value } : {}),
      }
    : null;
  if (kind.value === 'pet' && (!petEffect || Object.keys(petEffect).length === 0)) {
    return toast.warning('宠物道具至少要设置一项效果');
  }

  saving.value = true;
  try {
    const body: Record<string, unknown> = {
      name: name.value.trim(),
      cost: cost.value,
      stock: unlimited.value ? -1 : stock.value,
      icon: icon.value,
      kind: kind.value,
    };
    if (kind.value === 'pet') body.petEffect = petEffect;
    if (isEdit.value) {
      await api.patch(`/products/${props.product.id}`, body);
      toast.success('已更新');
    } else {
      await api.post('/products', body);
      toast.success(kind.value === 'pet' ? '宠物道具已添加 🐾' : '商品已添加 🎁');
    }
    emit('saved');
  } catch (e: any) {
    const err = e.payload?.error;
    if (err === 'missing_pet_effect') toast.error('宠物道具必须设置效果');
    else toast.error(e.message);
  } finally { saving.value = false; }
}
</script>

<template>
  <Modal :model-value="modelValue" :title="isEdit ? '编辑商品' : '新增商品'" @update:model-value="emit('update:modelValue', $event)">
    <div class="form">
      <!-- 商品类型 -->
      <div class="field">
        <label class="label">商品类型</label>
        <div class="kind-switch">
          <button
            type="button"
            :class="['kind-btn', { active: kind === 'physical' }]"
            @click="pickKind('physical')"
          >
            <span class="k-emoji">🎁</span>
            <span class="k-text">
              <b>实物好礼</b>
              <i>兑换后需家长审核发放</i>
            </span>
          </button>
          <button
            type="button"
            :class="['kind-btn', { active: kind === 'pet' }]"
            @click="pickKind('pet')"
          >
            <span class="k-emoji">🐾</span>
            <span class="k-text">
              <b>宠物道具</b>
              <i>孩子购买后立即喂给宠物</i>
            </span>
          </button>
        </div>
      </div>

      <div class="field">
        <label class="label">
          图标
          <span class="label-hint">跟随上方商品类型，切换类型即换一组</span>
        </label>
        <div class="icon-grid">
          <button
            v-for="c in icons"
            :key="c.key"
            type="button"
            :class="['icon-chip', { active: icon === c.key }]"
            @click="pickIcon(c.key)"
          >
            <CategoryIcon :icon="c.key" :size="40" />
            <span class="icon-label">{{ c.label }}</span>
          </button>
        </div>
      </div>

      <div class="field">
        <label class="label">{{ kind === 'pet' ? '道具名称' : '商品名称' }}</label>
        <input
          v-model="name"
          type="text"
          maxlength="50"
          :placeholder="kind === 'pet' ? '如：宠物口粮' : '如：冰淇淋一次'"
        />
      </div>

      <div class="field">
        <label class="label">所需积分</label>
        <input v-model.number="cost" type="number" min="1" max="99999" />
      </div>

      <!-- 宠物道具效果 -->
      <div v-if="kind === 'pet'" class="field">
        <label class="label">喂养效果（至少填一项）</label>
        <div class="effect-grid">
          <label class="eff">
            <span class="eff-label">⭐ 经验</span>
            <input v-model.number="exp" type="number" min="1" max="9999" placeholder="0" />
          </label>
          <label class="eff">
            <span class="eff-label">🍚 饱食度</span>
            <input v-model.number="satiety" type="number" min="1" max="100" placeholder="0" />
          </label>
          <label class="eff">
            <span class="eff-label">😊 快乐值</span>
            <input v-model.number="happiness" type="number" min="1" max="100" placeholder="0" />
          </label>
          <label class="eff">
            <span class="eff-label">💚 健康值</span>
            <input v-model.number="health" type="number" min="1" max="100" placeholder="0" />
          </label>
        </div>
        <p class="eff-tip">
          经验决定升级进化（满级所需经验按物种设定，默认 280）；状态值本身不升级也不掉级，
          但会影响宠物心情，进而影响用道具获得的经验倍率（超级开心 ×1.5 ～ 肚子饿 ×0.5）。
        </p>
        <div v-if="effectSummary" class="eff-preview">效果：{{ effectSummary }}</div>
      </div>

      <div class="field">
        <label class="label">
          <input v-model="unlimited" type="checkbox" class="checkbox" />
          不限库存
        </label>
        <input v-if="!unlimited" v-model.number="stock" type="number" min="0" placeholder="库存数量" />
      </div>
    </div>
    <template #footer>
      <span style="flex:1"></span>
      <button class="btn btn-ghost" @click="emit('update:modelValue', false)">取消</button>
      <button class="btn btn-primary" @click="save" :disabled="saving">
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </template>
  </Modal>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 8px; }
.label { font-size: 13px; color: var(--text-secondary); padding-left: 4px; display: flex; align-items: center; gap: 6px; }
.checkbox { width: auto; }

.kind-switch { display: flex; gap: 8px; }
.kind-btn {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 10px;
  border-radius: var(--r-md);
  background: var(--glass-bg);
  border: 2px solid transparent;
  text-align: left;
  transition: all 0.18s;
}
.kind-btn.active {
  border-color: var(--accent-yellow);
  background: rgba(255, 209, 102, 0.15);
}
.k-emoji { font-size: 22px; }
.k-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.k-text b { font-size: 13px; font-family: var(--font-cute); }
.k-text i { font-size: 10px; color: var(--text-muted); font-style: normal; }

.label-hint { font-size: 11px; color: var(--text-muted); }

.icon-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.icon-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border-radius: var(--r-md);
  background: var(--glass-bg);
  border: 2px solid transparent;
  transition: all 0.2s;
  cursor: pointer;
}
.icon-chip.active {
  border-color: var(--accent-yellow);
  background: rgba(255, 209, 102, 0.15);
}
.icon-label { font-size: 11px; color: var(--text-secondary); font-family: var(--font-cute); }

.effect-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.eff { display: flex; flex-direction: column; gap: 4px; }
.eff-label { font-size: 11px; color: var(--text-secondary); padding-left: 2px; }
.eff-tip {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.6;
  padding-left: 4px;
}
.eff-preview {
  font-size: 12px;
  color: var(--accent-orange);
  background: rgba(255, 209, 102, 0.14);
  padding: 8px 10px;
  border-radius: var(--r-sm);
}
</style>
