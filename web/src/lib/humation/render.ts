/**
 * humation 头像的惰性渲染入口。
 *
 * 资产包（assets.ts，约 700KB 源码）按需加载：只有页面真正出现 humation
 * 头像或打开编辑器时才会拉取对应 chunk，生肖 emoji 头像完全不受影响。
 */
import type { HumationManifest, PartOption } from './types';
import { createAvatar } from './create-avatar';
import { createPartPreview } from './ui-helpers';
import { parseSpec } from './spec';

let manifestPromise: Promise<HumationManifest> | null = null;

export function loadHumationManifest(): Promise<HumationManifest> {
  // 失败时清空缓存，避免 rejected promise 被永久记住——否则一次弱网/断网
  // 导致 chunk 拉取失败后，本会话所有 humation 头像都会永久回落、无法重试。
  manifestPromise ??= import('./assets').then(
    (m) => m.manifest,
    (err) => {
      manifestPromise = null;
      throw err;
    }
  );
  return manifestPromise;
}

/**
 * 渲染 humation 头像为 SVG 字符串。
 * 规格非法 / 部件 id 不存在时返回 null（调用方回落到生肖 emoji）。
 */
export async function renderHumationSvg(
  value?: string | null
): Promise<string | null> {
  const spec = parseSpec(value);
  if (!spec) return null;
  try {
    const manifest = await loadHumationManifest();
    return createAvatar(manifest, {
      seed: spec.seed,
      selections: spec.sel,
      colors: spec.col,
      background: spec.bg,
      crop: 'avatar',
    }).toString();
  } catch {
    return null;
  }
}

/** 单个部件的预览 SVG（编辑器选项格用）
 *
 *  `inlineColors: false` 时只输出几何骨架，配色交给外层容器的 CSS 变量，
 *  使编辑器可以「按槽位渲染一次 + 实时改变量」，避免拖动取色器时重建整个部件网格。
 */
export function renderPartPreviewSvg(
  manifest: HumationManifest,
  part: PartOption,
  options: { background?: string; inlineColors?: boolean } = {}
): string {
  return createPartPreview(manifest, part, options).toString();
}

/** 把草稿配色转成可挂到容器上的 CSS 变量（与内联进 <svg> 的写法同源） */
export function draftColorVars(
  manifest: HumationManifest,
  colors: Record<string, string>
): Record<string, string> {
  const merged: Record<string, string> = { ...manifest.defaults.colors, ...colors };
  const out: Record<string, string> = {};
  for (const [key, color] of Object.entries(merged)) {
    out[`--hm-${key}`] = `#${String(color).replace(/^#/, '').toUpperCase()}`;
  }
  return out;
}

/** 用当前草稿直接渲染整只头像（编辑器实时预览用） */
export function renderDraftSvg(
  manifest: HumationManifest,
  draft: { sel: Record<string, string>; col: Record<string, string>; bg: string }
): string {
  return createAvatar(manifest, {
    selections: draft.sel,
    colors: draft.col,
    background: draft.bg,
    crop: 'avatar',
  }).toString();
}
