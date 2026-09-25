import type {
  ColorSlotId,
  HexColor,
  HumationManifest,
  PartOption,
  PartOptionId,
} from './types.js';

export type CreatePartPreviewOptions = {
  colors?: Record<ColorSlotId, HexColor>;
  background?: HexColor | 'transparent';
  /**
   * 是否把配色内联到根 `<svg>` 的 `style` 上（默认 true，与历史行为一致）。
   *
   * 传 `false` 时只输出「几何骨架」：形状内部本来就写成
   * `var(--hm-hair, #000000)` 这种「变量 + 兜底色」的形式，配色完全可以由
   * 外层容器用 CSS 变量实时注入（自定义属性会继承进 SVG）。
   *
   * 编辑器借此做到「渲染一次、之后只改变量」：拖动取色器时不再重建 43 个
   * 部件缩略图的 DOM（`item` 槽位有 43 个部件，每次拼 43 个 SVG 字符串 +
   * v-html 重新解析，在低端安卓 WebView 上肉眼可见卡顿）。
   */
  inlineColors?: boolean;
};

export function createPartPreview(
  manifest: HumationManifest,
  part: PartOption | PartOptionId,
  options: CreatePartPreviewOptions = {}
) {
  const resolved =
    typeof part === 'string'
      ? manifest.parts.find((p) => p.id === part)
      : part;
  if (!resolved) throw new Error(`Unknown part: ${part}`);

  const colors: Record<string, string> = {
    ...manifest.defaults.colors,
    ...Object.fromEntries(
      Object.entries(options.colors ?? {}).map(([k, v]) => [k, normalizeHex(v)])
    ),
  };

  const inlineColors = options.inlineColors !== false;
  const styleAttr = inlineColors
    ? ` style="${escapeAttr(formatCssVariables(colors))}"`
    : '';

  const fragments = resolved.layers
    .map((fragment) => {
      const layerSlot = manifest.layerSlots.find(
        (ls) => ls.id === fragment.layerSlot
      );
      if (!layerSlot || !fragment.svg) return '';

      const content = fragment.svg
        .replace(/<svg[^>]*>/, '')
        .replace(/<\/svg>\s*$/, '');
      const transform = fragment.transform
        ? `translate(${formatNumber(layerSlot.offset.x)}, ${formatNumber(layerSlot.offset.y)}) ${fragment.transform}`
        : `translate(${formatNumber(layerSlot.offset.x)}, ${formatNumber(layerSlot.offset.y)})`;

      return `<g transform="${escapeAttr(transform)}">${content}</g>`;
    })
    .join('');

  const layerSlot = manifest.layerSlots.find(
    (ls) => ls.id === resolved.layers[0]?.layerSlot
  );
  const offset = layerSlot?.offset ?? { x: 0, y: 0 };
  const size = layerSlot?.size ?? { width: 80, height: 80 };

  const bg =
    options.background === undefined
      ? 'transparent'
      : options.background;
  const bgRect =
    bg === 'transparent'
      ? ''
      : `<rect x="${formatNumber(offset.x)}" y="${formatNumber(offset.y)}" width="${formatNumber(size.width)}" height="${formatNumber(size.height)}" fill="#${normalizeHex(bg)}" />`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${formatNumber(size.width)}" height="${formatNumber(size.height)}" viewBox="${formatNumber(offset.x)} ${formatNumber(offset.y)} ${formatNumber(size.width)} ${formatNumber(size.height)}"${styleAttr}>${bgRect}${fragments}</svg>`;

  return {
    toString() {
      return svg;
    },
    toDataUri() {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    },
  };
}

/** 把配色表转成 CSS 自定义属性声明串，供 `<svg style>` 使用 */
function formatCssVariables(colors: Record<string, string>): string {
  return Object.entries(colors)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, color]) => `--hm-${key}:#${color}`)
    .join(';');
}

// 说明：这里原有 getPartsForSlot / getPartsForUiGroup 两个导出，全项目零调用
// （编辑器的部件筛选走 HumationAvatarEditor 自己的 computed）。已删除以免误用。

function normalizeHex(color: string) {
  return color.replace(/^#/, '').toUpperCase();
}

function formatNumber(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

function escapeAttr(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
