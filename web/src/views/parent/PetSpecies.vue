<script setup lang="ts">
// 家长端：宠物物种管理 —— 新建/编辑名称与成长阈值、上传各阶段立绘、删除自定义物种
// 数据即时生效：物种存 DB，图片写 pets 资产目录（Docker 下挂载到宿主机），均无需重启
import { ref, reactive, onMounted } from 'vue';
import { api } from '@/api/client';
import { useToastStore } from '@/stores/toast';
import { resolvePetImage, clearPetAssetCache } from '@/lib/pet/asset';
import { DEFAULT_STAGE_EXP, type SpeciesDef, type PetSeries } from '@/utils/pets';

const toast = useToastStore();

interface AdminSpecies extends SpeciesDef {
  images: Record<string, boolean>;
}

const list = ref<AdminSpecies[]>([]);
const loading = ref(true);

// ── 图片预览（key → 阶段 → url|null）─────────────────────────────────
const previews = reactive<Record<string, Record<number, string | null>>>({});

async function refreshPreview(key: string) {
  const out: Record<number, string | null> = {};
  for (let stage = 0; stage <= 4; stage++) {
    out[stage] = await resolvePetImage(key, stage);
  }
  previews[key] = out;
}

async function load() {
  loading.value = true;
  try {
    const res = await api.get<{ species: AdminSpecies[] }>('/admin/pets/species');
    list.value = res.species;
    list.value.forEach((s) => refreshPreview(s.key));
  } catch (e: any) {
    toast.error(e?.message || '物种清单加载失败');
  } finally {
    loading.value = false;
  }
}

// ── 编辑弹窗 ────────────────────────────────────────────────────────
const editOpen = ref(false);
const editSaving = ref(false);
const editing = ref<AdminSpecies | null>(null);
const form = reactive({
  name: '',
  emoji: '',
  series: 'boy' as PetSeries,
  gender: '♂' as '♂' | '♀',
  stageExp: [...DEFAULT_STAGE_EXP] as number[],
});
const stageExpErr = ref('');

function openEdit(s: AdminSpecies) {
  editing.value = s;
  form.name = s.name;
  form.emoji = s.emoji;
  form.series = s.series;
  form.gender = s.gender;
  form.stageExp = [...s.stageExp];
  stageExpErr.value = '';
  editOpen.value = true;
}

function validateStageExp(): boolean {
  const a = form.stageExp;
  if (a.some((n) => !Number.isInteger(n) || n < 0)) {
    stageExpErr.value = '阈值需为非负整数';
    return false;
  }
  if (a[0] !== 0 || a[1] <= a[0] || a[2] <= a[1] || a[3] <= a[2] || a[4] <= a[3]) {
    stageExpErr.value = '需从 0 开始且逐级严格递增';
    return false;
  }
  stageExpErr.value = '';
  return true;
}

async function saveEdit() {
  if (!editing.value || editSaving.value) return;
  if (!form.name.trim()) { toast.error('名字不能为空'); return; }
  if (!validateStageExp()) return;
  editSaving.value = true;
  try {
    const res = await api.patch<{ species: AdminSpecies }>(`/admin/pets/species/${editing.value.key}`, {
      name: form.name.trim(),
      emoji: form.emoji.trim() || editing.value.emoji,
      series: form.series,
      gender: form.gender,
      stageExp: [...form.stageExp],
    });
    const idx = list.value.findIndex((s) => s.key === editing.value!.key);
    if (idx >= 0) list.value[idx] = res.species;
    // 卡片上的名字/emoji/阈值都是直接绑 list 的响应式字段，替换后即刻重渲染，无需刷新页面
    toast.success('已保存，卡片已立即更新');
    editOpen.value = false;
  } catch (e: any) {
    toast.error(e?.payload?.detail || e?.message || '保存失败');
  } finally {
    editSaving.value = false;
  }
}

// ── 新建弹窗 ────────────────────────────────────────────────────────
const createOpen = ref(false);
const createSaving = ref(false);
const createForm = reactive({
  key: '',
  name: '',
  emoji: '🐣',
  series: 'boy' as PetSeries,
  gender: '♂' as '♂' | '♀',
});
const keyErr = ref('');

function openCreate() {
  createForm.key = '';
  createForm.name = '';
  createForm.emoji = '🐣';
  createForm.series = 'boy';
  createForm.gender = '♂';
  keyErr.value = '';
  createOpen.value = true;
}

async function saveCreate() {
  if (createSaving.value) return;
  const key = createForm.key.trim();
  if (!/^[a-z][a-z0-9_]{1,15}$/.test(key)) {
    keyErr.value = '图片目录名需为 2~16 位小写字母/数字/下划线，字母开头';
    return;
  }
  if (!createForm.name.trim()) { toast.error('名字不能为空'); return; }
  keyErr.value = '';
  createSaving.value = true;
  try {
    const res = await api.post<{ species: AdminSpecies }>('/admin/pets/species', {
      key,
      name: createForm.name.trim(),
      emoji: createForm.emoji.trim() || '🐣',
      series: createForm.series,
      gender: createForm.gender,
    });
    list.value.push(res.species);
    refreshPreview(key);
    toast.success('创建成功！接下来给它上传各阶段图片吧');
    createOpen.value = false;
  } catch (e: any) {
    const err = e?.payload?.error;
    if (err === 'key_exists') keyErr.value = '这个图片目录名已被占用';
    else toast.error(e?.payload?.detail || e?.message || '创建失败');
  } finally {
    createSaving.value = false;
  }
}

// ── 图片上传 ────────────────────────────────────────────────────────
const uploadingStage = ref('');  // `${key}:${stage}`

function pickImage(key: string, stage: number) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/png,image/webp,image/jpeg';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    uploadingStage.value = `${key}:${stage}`;
    try {
      const res = await api.upload<{ images: Record<string, boolean> }>(
        `/admin/pets/species/${key}/images/${stage}`, file
      );
      const s = list.value.find((x) => x.key === key);
      if (s) s.images = { ...s.images, ...res.images };
      clearPetAssetCache();
      await refreshPreview(key);
      // 上面已清缓存并重算预览，本页立刻能看到新图，不必刷新页面
      toast.success(`第 ${stage || '蛋'} 阶段图片已上传，预览已更新`);
    } catch (e: any) {
      const err = e?.payload?.error;
      if (err === 'unsupported_type') toast.error('仅支持 PNG / WebP / JPEG');
      else if (err === 'file_too_large') toast.error('图片不能超过 10MB');
      else toast.error(e?.message || '上传失败');
    } finally {
      uploadingStage.value = '';
    }
  };
  input.click();
}

// ── 删除（仅自定义物种）────────────────────────────────────────────
const deleting = ref<AdminSpecies | null>(null);

async function confirmDelete() {
  const s = deleting.value;
  if (!s) return;
  try {
    await api.delete(`/admin/pets/species/${s.key}`);
    list.value = list.value.filter((x) => x.key !== s.key);
    toast.success(`已删除 ${s.name}`);
  } catch (e: any) {
    const err = e?.payload?.error;
    if (err === 'species_in_use') toast.error('有小孩正在养这只宠物，先把他的宠物重置后再删');
    else if (err === 'builtin_protected') toast.error('内置物种不能删除，只能改名/换图');
    else toast.error(e?.message || '删除失败');
  } finally {
    deleting.value = null;
  }
}

const STAGE_LABELS = ['蛋', 'Lv1', 'Lv2', 'Lv3', 'Lv4'];

onMounted(load);
</script>

<template>
  <div class="species-page">
    <header class="page-head">
      <div>
        <h1 class="title">🐾 宠物管理</h1>
        <p class="sub">新建宠物、改名字、传立绘、调成长阈值 —— 保存后立即生效</p>
      </div>
      <button class="btn btn-primary create-btn" @click="openCreate">＋ 新建宠物</button>
    </header>

    <div v-if="loading" class="empty-hint">加载中…</div>

    <div v-else class="grid">
      <div v-for="s in list" :key="s.key" class="card glass">
        <div class="stage-row">
          <div
            v-for="stage in [0, 1, 2, 3, 4]"
            :key="stage"
            class="stage-cell"
            :title="`第${stage}阶段`"
            @click="pickImage(s.key, stage)"
          >
            <img v-if="previews[s.key]?.[stage]" :src="previews[s.key]![stage]!" alt="" />
            <span v-else class="fallback">{{ s.emoji }}</span>
            <span class="stage-tag">{{ STAGE_LABELS[stage] }}</span>
            <span
              class="upload-mask"
              :class="{ busy: uploadingStage === `${s.key}:${stage}` }"
            >{{ uploadingStage === `${s.key}:${stage}` ? '…' : '⬆' }}</span>
          </div>
        </div>

        <div class="card-body">
          <div class="name-line">
            <span class="pet-name">{{ s.name }}</span>
            <span class="badge" :class="s.series">{{ s.series === 'boy' ? '男生款' : '女生款' }} {{ s.gender }}</span>
            <span v-if="s.isCustom" class="badge custom">自定义</span>
          </div>
          <div class="meta-line">
            <span class="mono">{{ s.key }}</span>
            <span>满级 {{ s.stageExp[4] }} exp</span>
            <span>升阶 {{ s.stageExp.slice(1).join(' / ') }}</span>
          </div>
          <div class="actions">
            <button class="btn btn-ghost sm" @click="openEdit(s)">✏️ 编辑</button>
            <button
              v-if="s.isCustom"
              class="btn btn-ghost sm danger"
              @click="deleting = s"
            >🗑 删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <Transition name="modal">
      <div v-if="editOpen" class="mask" @click.self="editOpen = false">
        <div class="sheet glass-strong">
          <header class="sheet-head">
            <h2>编辑 · {{ editing?.name }}</h2>
            <button class="close" @click="editOpen = false">✕</button>
          </header>
          <div class="sheet-body">
            <label class="field">
              <span>名字</span>
              <input v-model="form.name" maxlength="12" type="text" />
            </label>
            <div class="field-row">
              <label class="field">
                <span>系列</span>
                <select v-model="form.series">
                  <option value="boy">男生款</option>
                  <option value="girl">女生款</option>
                </select>
              </label>
              <label class="field">
                <span>性别</span>
                <select v-model="form.gender">
                  <option value="♂">♂</option>
                  <option value="♀">♀</option>
                </select>
              </label>
              <label class="field">
                <span>兜底 emoji</span>
                <input v-model="form.emoji" maxlength="8" type="text" />
              </label>
            </div>
            <div class="field">
              <span>成长阈值（各阶段累计经验）</span>
              <div class="exp-row">
                <label v-for="(v, i) in form.stageExp" :key="i" class="exp-cell">
                  <em>{{ ['蛋', 'Lv1', 'Lv2', 'Lv3', 'Lv4'][i] }}</em>
                  <input v-model.number="form.stageExp[i]" type="number" min="0" />
                </label>
              </div>
              <p v-if="stageExpErr" class="err">{{ stageExpErr }}</p>
            </div>
            <p class="hint">图片请直接点列表卡片上对应阶段的小图上传</p>
          </div>
          <footer class="sheet-foot">
            <button class="btn btn-ghost" @click="editOpen = false">取消</button>
            <button class="btn btn-primary" :disabled="editSaving" @click="saveEdit">
              {{ editSaving ? '保存中…' : '保存' }}
            </button>
          </footer>
        </div>
      </div>
    </Transition>

    <!-- 新建弹窗 -->
    <Transition name="modal">
      <div v-if="createOpen" class="mask" @click.self="createOpen = false">
        <div class="sheet glass-strong">
          <header class="sheet-head">
            <h2>🐾 新建宠物</h2>
            <button class="close" @click="createOpen = false">✕</button>
          </header>
          <div class="sheet-body">
            <label class="field">
              <span>图片目录名（key，创建后不可改）</span>
              <input v-model="createForm.key" type="text" placeholder="如 ember" class="mono" />
              <p v-if="keyErr" class="err">{{ keyErr }}</p>
            </label>
            <label class="field">
              <span>名字</span>
              <input v-model="createForm.name" maxlength="12" type="text" placeholder="如 小火狐" />
            </label>
            <div class="field-row">
              <label class="field">
                <span>系列</span>
                <select v-model="createForm.series">
                  <option value="boy">男生款</option>
                  <option value="girl">女生款</option>
                </select>
              </label>
              <label class="field">
                <span>性别</span>
                <select v-model="createForm.gender">
                  <option value="♂">♂</option>
                  <option value="♀">♀</option>
                </select>
              </label>
              <label class="field">
                <span>兜底 emoji</span>
                <input v-model="createForm.emoji" maxlength="8" type="text" />
              </label>
            </div>
            <p class="hint">创建后先上传"蛋/Lv1"图片就能领养，其余阶段可以慢慢补</p>
          </div>
          <footer class="sheet-foot">
            <button class="btn btn-ghost" @click="createOpen = false">取消</button>
            <button class="btn btn-primary" :disabled="createSaving" @click="saveCreate">
              {{ createSaving ? '创建中…' : '创建' }}
            </button>
          </footer>
        </div>
      </div>
    </Transition>

    <!-- 删除确认 -->
    <Transition name="modal">
      <div v-if="deleting" class="mask" @click.self="deleting = null">
        <div class="sheet glass-strong small">
          <header class="sheet-head">
            <h2>删除 {{ deleting.name }}？</h2>
            <button class="close" @click="deleting = null">✕</button>
          </header>
          <div class="sheet-body">
            <p class="warn-text">
              将删除物种 <b>{{ deleting.name }}</b>（{{ deleting.key }}）及其上传过的所有图片，且不可恢复。
              有小孩正在养时会被拒绝。
            </p>
          </div>
          <footer class="sheet-foot">
            <button class="btn btn-ghost" @click="deleting = null">再想想</button>
            <button class="btn btn-danger" @click="confirmDelete">确认删除</button>
          </footer>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.species-page { padding: 18px 20px 26px; max-width: 980px; margin: 0 auto; }
.page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.title { font-family: var(--font-cute); font-size: 22px; }
.sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
.create-btn { flex-shrink: 0; }
.empty-hint { text-align: center; color: var(--text-muted); padding: 40px 0; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
.card { padding: 14px; border-radius: var(--r-lg); }

.stage-row { display: flex; gap: 6px; margin-bottom: 10px; }
.stage-cell {
  position: relative; flex: 1; aspect-ratio: 1; border-radius: var(--r-md);
  background: var(--glass-bg); overflow: hidden; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--glass-border);
  transition: transform 0.15s;
}
.stage-cell:hover { transform: translateY(-2px); }
.stage-cell img { width: 100%; height: 100%; object-fit: cover; }
.fallback { font-size: 26px; opacity: 0.5; }
.stage-tag {
  position: absolute; left: 4px; bottom: 4px;
  font-size: 9px; padding: 1px 5px; border-radius: 7px;
  background: rgba(0, 0, 0, 0.45); color: #fff;
}
.upload-mask {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-size: 16px; color: #fff; background: rgba(0, 0, 0, 0);
  opacity: 0; transition: all 0.15s;
}
.stage-cell:hover .upload-mask { opacity: 1; background: rgba(0, 0, 0, 0.35); }
.upload-mask.busy { opacity: 1; background: rgba(0, 0, 0, 0.5); }

.name-line { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.pet-name { font-family: var(--font-cute); font-size: 16px; }
.badge {
  font-size: 10px; padding: 2px 7px; border-radius: 9px;
  background: rgba(255, 209, 102, 0.25); color: var(--text-secondary);
}
.badge.girl { background: rgba(255, 155, 176, 0.22); }
.badge.custom { background: rgba(126, 212, 185, 0.22); color: #3f8e73; }
.meta-line {
  display: flex; gap: 10px; flex-wrap: wrap;
  font-size: 11px; color: var(--text-muted); margin: 6px 0 10px;
}
.mono { font-family: ui-monospace, monospace; }
.actions { display: flex; gap: 8px; }

.btn.sm { padding: 6px 12px; font-size: 12px; }
.btn.danger { color: var(--danger); }

.mask {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: center; justify-content: center; z-index: 120; padding: 16px;
}
.sheet {
  width: 100%; max-width: 480px; max-height: 88vh; overflow-y: auto;
  border-radius: var(--r-xl); border: 1px solid var(--glass-border); padding: 0;
}
.sheet.small { max-width: 380px; }
.sheet-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 18px 10px;
}
.sheet-head h2 { font-family: var(--font-cute); font-size: 17px; }
.close {
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--glass-bg); color: var(--text-secondary); font-size: 13px;
}
.sheet-body { padding: 4px 18px 10px; }
.sheet-foot { display: flex; gap: 10px; padding: 12px 18px 16px; }
.sheet-foot .btn { flex: 1; }

.field { display: block; margin-bottom: 12px; }
.field > span { display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 5px; }
.field input, .field select {
  width: 100%; padding: 9px 12px; border-radius: var(--r-sm);
  border: 1px solid var(--glass-border); background: rgba(255, 255, 255, 0.7);
  font-size: 14px; color: var(--text-primary); box-sizing: border-box;
}
.field-row { display: flex; gap: 10px; }
.field-row .field { flex: 1; }
.exp-row { display: flex; gap: 6px; }
.exp-cell { flex: 1; text-align: center; }
.exp-cell em { display: block; font-style: normal; font-size: 10px; color: var(--text-muted); margin-bottom: 3px; }
.exp-cell input { padding: 7px 6px; text-align: center; }
.err { font-size: 11px; color: var(--danger); margin-top: 5px; }
.hint { font-size: 11px; color: var(--text-muted); line-height: 1.6; }
.warn-text { font-size: 13px; line-height: 1.7; color: var(--text-primary); }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
