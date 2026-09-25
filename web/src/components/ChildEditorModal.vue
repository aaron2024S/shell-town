<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { api } from '@/api/client';
import { useToastStore } from '@/stores/toast';
import Modal from '@/components/Modal.vue';
import ZodiacAvatar from '@/components/ZodiacAvatar.vue';
import HumationAvatarEditor from '@/components/HumationAvatarEditor.vue';
import { isHumationAvatar } from '@/lib/humation/spec';
import { BOY_PRESET, GIRL_PRESET, PRESET_VALUES } from '@/lib/humation/presets';

type Gender = 'male' | 'female';

const props = defineProps<{
  modelValue: boolean;
  child?: { id: number; name: string; avatar: string; gender?: Gender | null } | null;
}>();
const emit = defineEmits<{
  'update:modelValue': [v: boolean];
  saved: [];
}>();

const toast = useToastStore();
const isEdit = computed(() => !!props.child);

const name = ref('');
const pin = ref('');
const avatar = ref(BOY_PRESET.value);
const gender = ref<Gender>('male'); // 新增时默认「男生」
const saving = ref(false);
const showHumEditor = ref(false);

function onHumSave(value: string) {
  avatar.value = value;
  showHumEditor.value = false;
}

/**
 * 选择性别 —— 决定孩子端主题配色，并与「头像预设」联动：
 * 当前用的是预置头像（非自定义）时跟着换成对应性别那款；
 * 已经自捏过头像就保持不动，不覆盖孩子的作品。
 */
function pickGender(g: Gender) {
  gender.value = g;
  if (!PRESET_VALUES.has(avatar.value)) return;
  avatar.value = g === 'male' ? BOY_PRESET.value : GIRL_PRESET.value;
}

watch(() => props.modelValue, (open) => {
  if (open) {
    name.value = props.child?.name ?? '';
    pin.value = '';
    avatar.value = props.child?.avatar ?? BOY_PRESET.value;
    // 编辑时回填本人性别；新增默认「男生」（与后端 createChildSchema 缺省一致）
    gender.value = props.child?.gender ?? 'male';
  }
}, { immediate: true }); // 组件由 v-if 挂载时 modelValue 已为 true，必须立即执行才能回填当前头像/名字

async function save() {
  if (!name.value.trim()) return toast.warning('请输入小朋友名字');
  if (!pin.value && !isEdit.value) return toast.warning('请设置PIN码');
  if (pin.value && !/^\d{4,6}$/.test(pin.value)) return toast.warning('PIN必须是4-6位数字');

  saving.value = true;
  try {
    const body: Record<string, unknown> = { name: name.value.trim(), avatar: avatar.value, gender: gender.value };
    if (pin.value) body.pin = pin.value;

    if (isEdit.value) {
      await api.patch(`/children/${props.child!.id}`, body);
      toast.success('已更新小朋友信息');
    } else {
      await api.post('/children', body);
      toast.success('小朋友创建成功 🎉');
    }
    emit('saved');
  } catch (e: any) {
    if (e.payload?.error === 'pin_used') toast.error('PIN已被其他账号使用');
    else toast.error(e.message || '保存失败');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Modal :model-value="modelValue" :title="isEdit ? '编辑小朋友' : '新增小朋友'" @update:model-value="emit('update:modelValue', $event)">
    <div class="form">
      <div class="field">
        <label class="label">头像</label>
        <div class="avatar-row">
          <button
            type="button"
            :class="['zodiac', { active: avatar === BOY_PRESET.value }]"
            @click="avatar = BOY_PRESET.value"
          >
            <ZodiacAvatar :zodiac="BOY_PRESET.value" :size="56" />
            <span class="zname">男生</span>
          </button>
          <button
            type="button"
            :class="['zodiac', { active: avatar === GIRL_PRESET.value }]"
            @click="avatar = GIRL_PRESET.value"
          >
            <ZodiacAvatar :zodiac="GIRL_PRESET.value" :size="56" />
            <span class="zname">女生</span>
          </button>
          <button
            type="button"
            :class="['zodiac', { active: isHumationAvatar(avatar) && !PRESET_VALUES.has(avatar) }]"
            @click="showHumEditor = true"
          >
            <ZodiacAvatar v-if="isHumationAvatar(avatar)" :zodiac="avatar" :size="56" />
            <span v-else class="custom-ico">🎨</span>
            <span class="zname">自定义</span>
          </button>
        </div>
      </div>

      <div class="field">
        <label class="label">性别</label>
        <div class="gender-row">
          <button
            type="button"
            :class="['gender-btn', { active: gender === 'male' }]"
            @click="pickGender('male')"
          >
            <span class="g-ico">♂</span>
            <span class="g-name">男生</span>
          </button>
          <button
            type="button"
            :class="['gender-btn', { active: gender === 'female' }]"
            @click="pickGender('female')"
          >
            <span class="g-ico">♀</span>
            <span class="g-name">女生</span>
          </button>
        </div>
        <p class="hint">决定小朋友端的页面配色：男生是蓝色，女生是粉色</p>
      </div>

      <div class="field">
        <label class="label">名字</label>
        <input v-model="name" type="text" maxlength="20" placeholder="给小朋友起个可爱的名字" />
      </div>

      <div class="field">
        <label class="label">{{ isEdit ? 'PIN码（留空则不修改）' : 'PIN码' }}</label>
        <input
          v-model="pin"
          type="tel"
          inputmode="numeric"
          maxlength="6"
          placeholder="4-6位数字"
        />
        <p class="hint">PIN码是小朋友登录用的，记得告诉Ta哦~</p>
      </div>
    </div>

    <template #footer>
      <button class="btn btn-ghost" @click="emit('update:modelValue', false)">取消</button>
      <button class="btn btn-primary" @click="save" :disabled="saving">
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </template>
  </Modal>

  <HumationAvatarEditor
    v-if="showHumEditor"
    :current="avatar"
    @save="onHumSave"
    @close="showHumEditor = false"
  />
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.label {
  font-size: 13px;
  color: var(--text-secondary);
  padding-left: 4px;
}
.hint {
  font-size: 12px;
  color: var(--text-muted);
  padding-left: 4px;
}

.avatar-row {
  display: flex;
  gap: 12px;
}

/* 性别选择：两枚等宽按钮，沿用头像选择的视觉语言 */
.gender-row {
  display: flex;
  gap: 12px;
}
.gender-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 10px;
  border-radius: var(--r-sm);
  background: var(--glass-bg);
  border: 2px solid transparent;
  transition: all 0.2s;
}
.gender-btn:hover {
  background: var(--glass-bg-strong);
}
.gender-btn.active {
  background: var(--glass-bg-strong);
  border-color: var(--accent-orange);
}
.g-ico {
  font-size: 18px;
  line-height: 1;
  color: var(--accent-orange);
}
.g-name {
  font-size: 14px;
  color: var(--text-primary);
}
.zodiac {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 6px;
  border-radius: var(--r-sm);
  background: var(--glass-bg);
  border: 2px solid transparent;
  transition: all 0.2s;
}
.zodiac:hover {
  background: var(--glass-bg-strong);
}
.zodiac.active {
  background: var(--glass-bg-strong);
  border-color: var(--accent-orange);
}
.zname {
  font-size: 10px;
  color: var(--text-secondary);
}
.custom-ico {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  line-height: 1;
  border-radius: 50%;
  background: var(--glass-bg);
  border: 2px dashed var(--glass-border);
}
</style>
