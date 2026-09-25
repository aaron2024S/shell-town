// 宠物物种目录 store —— 从服务端 /pets/catalog 拉取（家长端管理后的权威数据），
// 拉取失败时回退到内置默认 12 只，保证离线/弱网下页面可用。
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/api/client';
import { PET_SPECIES, DEFAULT_STAGE_EXP, type SpeciesDef } from '@/utils/pets';

const FALLBACK: SpeciesDef[] = PET_SPECIES.map((s) => ({
  ...s,
  stageExp: [...DEFAULT_STAGE_EXP],
  isCustom: false,
}));

export const usePetCatalogStore = defineStore('petCatalog', () => {
  const species = ref<SpeciesDef[]>(FALLBACK);
  const loaded = ref(false);

  async function load(force = false) {
    if (loaded.value && !force) return;
    try {
      const res = await api.get<{ species: SpeciesDef[] }>('/pets/catalog');
      // 服务端返回空数组时也要置 loaded=true —— 否则 loaded 永远是 false，
      // 每次进入相关页面都会重新请求一次（此前只在 length>0 时置位）。
      if (Array.isArray(res.species)) {
        if (res.species.length > 0) species.value = res.species;
        loaded.value = true;
      }
    } catch {
      // 保留回退数据，不打断页面；故意不置 loaded，下次进页面再试一次
    }
  }

  /**
   * 按 key 取物种定义 —— 必须走这里而不是内置静态表，
   * 否则家长自建的物种会退化成内置第一只（系列/名字/emoji 全错）。
   */
  function byKey(key?: string | null): SpeciesDef | undefined {
    if (!key) return undefined;
    return species.value.find((s) => s.key === key);
  }

  return { species, loaded, load, byKey };
});
