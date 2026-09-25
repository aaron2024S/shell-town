// 宠物形象素材解析 —— AI 立绘（打包在 public 下，必定存在）
//
// 目录约定（web/public/pets/，构建时原样拷贝、不打进 JS 包）：
//   pets/<物种key>/<阶段>.webp     例：pets/pyro/3.webp   → 该宠物 Lv3（完全体）的独立形象
//   pets/<物种key>/all.png         兼容保留：通用单图 → Lv1~Lv4 全用它（一张图搞定）
//   pets/<物种key>/0.png           可选：该物种专属蛋形态
//   pets/_egg.webp                 蛋形态（Lv0），所有物种共用
//
// 命中顺序：<等级>.png/webp/jpg → all.png/webp/jpg → 同物种其它阶段 → emoji 兜底（见 PetAvatar.vue）。
// 最后那层"同物种其它阶段"是为家长自建物种准备的：只传了部分阶段的图时，
// 用它已有的图顶上，而不是直接掉成 emoji（缺图的等级不至于开天窗）。
// 当前 12 只 × 4 阶段 + 公共蛋的立绘均已随包提供，内置物种永远命中第一优先级。

import { MAX_LEVEL } from '@/utils/pets';
import { PET_ASSETS_CHANGED } from '@/utils/events';

const BASE = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');

export const PET_ASSET_DIR = 'pets';
/**
 * 素材扩展名探测顺序。
 *
 * 必须把 webp 放在最前：随包的 12 只 × 4 阶段 + 公共蛋**全部是 .webp**，
 * 而探测是「真发一次 <img> 请求、失败才算不命中」的。旧顺序 png→webp→jpg
 * 意味着每次命中前都要先白跑一个不存在的 .png（家长端图鉴页 12 物种 × 5 阶段
 * ≈ 120 个请求，每个都要多一次无效往返）。
 */
export const PET_ASSET_EXTS = ['webp', 'png', 'jpg'] as const;
export const EGG_ASSET_NAME = '_egg';
/** 通用单图名：`pets/<物种>/all.png`，一图覆盖 Lv1~Lv4 */
export const ALL_ASSET_NAME = 'all';

/**
 * 阶段兜底顺序：精确等级 → 同物种其它阶段（先近后远，同级优先更高的形态）。
 * 例：lv=4 → [4,3,2,1]；lv=2 → [2,3,1,4]
 */
export function stageFallbackOrder(lv: number): number[] {
  const order = [lv];
  for (let d = 1; d <= MAX_LEVEL; d++) {
    if (lv + d <= MAX_LEVEL) order.push(lv + d);
    if (lv - d >= 1) order.push(lv - d);
  }
  return order;
}

/** 单只宠物某阶段的所有候选 URL（按优先级） */
export function petAssetUrls(speciesKey: string, level: number): string[] {
  // 等级夹到合法范围：0 = 蛋，1~MAX_LEVEL 为成长形态；超出按满级展示，避免探测不存在的素材
  const lv = Math.max(0, Math.min(MAX_LEVEL, Math.floor(level || 0)));
  if (lv === 0) {
    // 蛋形态：物种专属优先，再落到公共蛋图；不参与其它回落（蛋不该被宠物形态顶替）
    return [
      ...PET_ASSET_EXTS.map((ext) => `${BASE}/${PET_ASSET_DIR}/${speciesKey}/0.${ext}`),
      ...PET_ASSET_EXTS.map((ext) => `${BASE}/${PET_ASSET_DIR}/${EGG_ASSET_NAME}.${ext}`),
    ];
  }
  const urls: string[] = [];
  for (const stage of stageFallbackOrder(lv)) {
    urls.push(...PET_ASSET_EXTS.map((ext) => `${BASE}/${PET_ASSET_DIR}/${speciesKey}/${stage}.${ext}`));
    if (stage === lv) {
      // 通用单图兜底（一个物种只准备一张图时用），紧跟精确等级之后
      urls.push(...PET_ASSET_EXTS.map((ext) => `${BASE}/${PET_ASSET_DIR}/${speciesKey}/${ALL_ASSET_NAME}.${ext}`));
    }
  }
  return urls;
}

/** 同物种所有候选素材 URL（去重，用于图鉴/编辑器批量预热，可选） */
export function petStageUrls(speciesKey: string): string[] {
  const out = new Set<string>();
  for (let lv = 1; lv <= MAX_LEVEL; lv++) {
    for (const url of petAssetUrls(speciesKey, lv)) out.add(url);
  }
  return [...out];
}

const PROBE_TIMEOUT_MS = 10000;

/** 探测一张图片能否真正解码（能解码才算命中，避免 SPA fallback 返回 HTML 被误判） */
function probe(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(false);
      return;
    }
    const img = new Image();
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      img.onload = null;
      img.onerror = null;
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), PROBE_TIMEOUT_MS);
    img.onload = () => {
      clearTimeout(timer);
      finish(true);
    };
    img.onerror = () => {
      clearTimeout(timer);
      finish(false);
    };
    img.src = url;
  });
}

// `${species}:${level}` → 解析结果（含 null）。Promise 级缓存，避免重复探测
const cache = new Map<string, Promise<string | null>>();

/** 解析某只宠物某阶段的外挂图片；无素材返回 null（调用方回落内置 SVG） */
export function resolvePetImage(speciesKey: string, level: number): Promise<string | null> {
  // 缓存键要用**夹取后**的等级：否则 species:7 与 species:4 是两条键，
  // 会各自把同一批 URL 完整探测一遍（petAssetUrls 内部已把 7 夹成 4）。
  const lv = Math.max(0, Math.min(MAX_LEVEL, Math.floor(level || 0)));
  const key = `${speciesKey}:${lv}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const task = (async () => {
    for (const url of petAssetUrls(speciesKey, lv)) {
      if (await probe(url)) return url;
    }
    return null;
  })();

  cache.set(key, task);
  return task;
}

/** 素材变更广播事件名：家长端新增物种/换图后派发，已挂载的 PetAvatar 据此重新解析。
 *  常量定义在 utils/events.ts（与 ws / 审核事件集中登记），此处转发以保持既有引用可用。 */
export { PET_ASSETS_CHANGED };

/** 清空素材解析缓存，并通知已挂载组件重新解析（否则页面上的旧图/emoji 要等刷新才变） */
export function clearPetAssetCache(): void {
  cache.clear();
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PET_ASSETS_CHANGED));
}

/** 订阅素材变更（返回取消订阅函数） */
export function onPetAssetsChanged(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => { /* SSR 无副作用 */ };
  window.addEventListener(PET_ASSETS_CHANGED, cb);
  return () => window.removeEventListener(PET_ASSETS_CHANGED, cb);
}
