<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { api } from '@/api/client';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import Modal from '@/components/Modal.vue';
import ZodiacAvatar from '@/components/ZodiacAvatar.vue';
import HumationAvatarEditor from '@/components/HumationAvatarEditor.vue';
import { isHumationAvatar } from '@/lib/humation/spec';
import { BOY_PRESET, GIRL_PRESET, PRESET_VALUES } from '@/lib/humation/presets';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [v: boolean] }>();

const auth = useAuthStore();
const toast = useToastStore();

const avatar = ref<string>(auth.user?.avatar ?? '');
const pin = ref('');
const saving = ref(false);
const showHumEditor = ref(false);

function onHumSave(value: string) {
  avatar.value = value;
  showHumEditor.value = false;
}

// 打开时重置表单（immediate：若组件挂载时已处于打开状态也能正确回填当前头像）
watch(() => props.modelValue, (open) => {
  if (open) {
    avatar.value = auth.user?.avatar ?? '';
    pin.value = '';
  }
}, { immediate: true });

const pinValid = computed(() => pin.value === '' || /^\d{4,6}$/.test(pin.value));

async function save() {
  if (!pinValid.value) {
    toast.error('PIN 必须是 4-6 位数字');
    return;
  }
  if (!avatar.value) {
    toast.error('请选择头像');
    return;
  }
  const body: { avatar?: string; pin?: string } = { avatar: avatar.value };
  if (pin.value) body.pin = pin.value;

  saving.value = true;
  try {
    const res = await api.patch<{ user: any }>('/auth/child/me', body);
    auth.setUser(res.user);
    toast.success('设置已保存');
    emit('update:modelValue', false);
  } catch (e: any) {
    const err = e.payload?.error;
    if (err === 'invalid_pin') toast.error('PIN 必须是 4-6 位数字');
    else if (err === 'invalid_avatar') toast.error('头像无效');
    else toast.error(e.message);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Modal :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" title="我的设置" width="420px">
    <div class="form">
      <!-- 头像选择 -->
      <div class="field">
        <label class="field-label">我的头像</label>
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

      <!-- PIN码 -->
      <div class="field">
        <label class="field-label">登录 PIN 码</label>
        <input
          v-model="pin"
          type="password"
          inputmode="numeric"
          maxlength="6"
          class="input"
          placeholder="留空表示不修改"
        />
        <p class="hint">4-6 位数字</p>
      </div>

      <div class="actions">
        <button class="btn btn-primary" :disabled="saving" @click="save">
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>
  </Modal>

  <HumationAvatarEditor
    v-if="showHumEditor"
    :current="avatar"
    @save="onHumSave"
    @close="showHumEditor = false"
  />
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 20px; }
.field { display: flex; flex-direction: column; gap: 8px; }
.field-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.avatar-row {
  display: flex;
  gap: 12px;
}
.zodiac {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 6px;
  border-radius: var(--r-md);
  background: var(--glass-bg);
  border: 2px solid transparent;
  transition: all 0.2s;
}
.zodiac.active {
  border-color: var(--accent-yellow);
  background: rgba(255, 209, 102, 0.15);
}
.zname {
  font-size: 11px;
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
.input {
  width: 100%;
  padding: 12px 14px;
  border-radius: var(--r-md);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  font-size: 16px;
  color: var(--text-primary);
  font-family: var(--font-cute);
  letter-spacing: 4px;
}
.input:focus {
  outline: none;
  border-color: var(--accent-yellow);
}
.hint {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: -2px;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
