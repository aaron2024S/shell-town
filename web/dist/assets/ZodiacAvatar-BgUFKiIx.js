import { X as __vitePreload, d as defineComponent, w as watch, c as createElementBlock, G as normalizeStyle, b as createBaseVNode, t as toDisplayString, y as computed, i as ref, k as openBlock, _ as _export_sfc } from "./index-DLtaHw3I.js";
const ZODIACS = [
  { key: "rat", name: "小鼠", emoji: "🐭", color: "#c9a0dc" },
  { key: "ox", name: "小牛", emoji: "🐮", color: "#d2b48c" },
  { key: "tiger", name: "小虎", emoji: "🐯", color: "#ffb347" },
  { key: "rabbit", name: "小兔", emoji: "🐰", color: "#ffc8dd" },
  { key: "dragon", name: "小龙", emoji: "🐲", color: "#7ed4b9" },
  { key: "snake", name: "小蛇", emoji: "🐍", color: "#a3d9a5" },
  { key: "horse", name: "小马", emoji: "🐴", color: "#deb887" },
  { key: "goat", name: "小羊", emoji: "🐑", color: "#fef0c1" },
  { key: "monkey", name: "小猴", emoji: "🐵", color: "#ffd166" },
  { key: "rooster", name: "小鸡", emoji: "🐤", color: "#ff9bb0" },
  { key: "dog", name: "小狗", emoji: "🐶", color: "#b5a6c9" },
  { key: "pig", name: "小猪", emoji: "🐷", color: "#ffb6c1" }
];
function getZodiac(key) {
  return ZODIACS.find((z) => z.key === key) ?? ZODIACS[4];
}
const HUMATION_PREFIX = "hum1:";
const HUMATION_MAX_LENGTH = 600;
function isHumationAvatar(value) {
  return !!value && value.startsWith(HUMATION_PREFIX) && value.length <= HUMATION_MAX_LENGTH;
}
function parseSpec(value) {
  if (!isHumationAvatar(value)) return null;
  try {
    const raw = JSON.parse(value.slice(HUMATION_PREFIX.length));
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}
function encodeSpec(spec) {
  return HUMATION_PREFIX + JSON.stringify(spec);
}
function draftFromSpec(value) {
  const spec = parseSpec(value);
  if (!spec) return null;
  return {
    sel: { ...spec.sel ?? {} },
    col: { ...spec.col ?? {} },
    bg: spec.bg ?? "F6F5F4"
  };
}
function draftToSpec(draft) {
  return { sel: { ...draft.sel }, col: { ...draft.col }, bg: draft.bg };
}
const HAIR_COLORS = ["2F2A28", "5B3A29", "8C5A2E", "C98A3D", "E0C388", "7A5230"];
const SKIN_COLORS = ["FFE3C9", "FFD9B3", "F2C19B", "E0A97D", "C98D63"];
const CLOTHES_COLORS = ["E05D5D", "5DA8E0", "7BC47F", "F2B134", "9B7BDC", "EF8FB0", "5CC8C2"];
const BOTTOM_COLORS = ["3B6EA5", "5D5D6E", "7A4A3A", "2F6E5A", "835C9E", "B3543F"];
const BG_COLORS = ["F6F5F4", "FFF7E6", "EAF6FF", "F0FFF4", "FDEFF5"];
function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}
function randomDraft(manifest) {
  const slots = manifest.selectionSlots.map((s) => s.id);
  const sel = {};
  for (const slot of slots) {
    const parts = manifest.parts.filter(
      (p) => p.selectionSlot === slot && !p.deprecated
    );
    if (parts.length > 0) sel[slot] = pick(parts).id;
  }
  return {
    sel,
    col: {
      hair: pick(HAIR_COLORS),
      skin: pick(SKIN_COLORS),
      clothes: pick(CLOTHES_COLORS),
      bottom: pick(BOTTOM_COLORS),
      stroke: "111111"
    },
    bg: pick(BG_COLORS)
  };
}
function createAvatar(manifest, options = {}) {
  const state = resolveAvatarState(manifest, options);
  return {
    toString() {
      return renderSvg(manifest, state);
    },
    toDataUri() {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        renderSvg(manifest, state)
      )}`;
    },
    toJSON() {
      return {
        template: manifest.template.id,
        selections: { ...state.selections },
        colors: { ...state.colors },
        background: state.background,
        crop: state.crop
      };
    },
    /**
     * Structured render output for framework wrappers that build the root
     * <svg> element themselves (React, web components). `content` is the
     * composed fragment markup without the root element, background rect,
     * or inline color style — colors stay as `var(--hm-*, fallback)`
     * references, so wrappers can drive them via CSS custom properties
     * without re-rendering the content.
     */
    toRenderData() {
      const viewBox = resolveViewBox(manifest, state);
      const fragments = collectFragments(manifest, state);
      return {
        viewBox: { ...viewBox },
        background: state.background,
        colors: { ...state.colors },
        content: fragments.map(
          ({ part, fragment, offset }) => renderFragment(part, fragment, offset)
        ).join("")
      };
    }
  };
}
function resolvePartId(input, manifest, slotId) {
  if (manifest.parts.some((part) => part.id === input)) return input;
  if (slotId) {
    const scopedAlias = `${slotId}-${input}`;
    const scoped = manifest.aliases.find(
      (entry) => entry.alias === scopedAlias
    );
    if (scoped) return scoped.targetId;
  }
  const alias = manifest.aliases.find((entry) => entry.alias === input);
  if (alias) return alias.targetId;
  throw new Error(`Unknown part: ${input}`);
}
function resolveAvatarState(manifest, options) {
  const selections = { ...manifest.defaults.selections };
  if (options.seed !== void 0) {
    for (const slot of manifest.selectionSlots) {
      const slotParts = manifest.parts.filter(
        (part) => part.selectionSlot === slot.id
      );
      if (slotParts.length === 0) continue;
      const hash = fnv1a(`${options.seed}:${slot.id}`);
      selections[slot.id] = slotParts[hash % slotParts.length].id;
    }
  }
  for (const [slotId, value] of Object.entries(options.selections ?? {})) {
    const partId = resolvePartId(value, manifest, slotId);
    const part = manifest.parts.find((candidate) => candidate.id === partId);
    if (!part) throw new Error(`Unknown part: ${value}`);
    if (part.selectionSlot !== slotId) {
      throw new Error(`Part ${value} is not selectable in slot ${slotId}`);
    }
    selections[slotId] = partId;
  }
  const colors = { ...manifest.defaults.colors };
  for (const [key, color] of Object.entries(options.colors ?? {})) {
    colors[key] = normalizeHex$1(color);
  }
  const background = options.background ?? manifest.defaults.background;
  return {
    template: manifest.template.id,
    selections,
    colors,
    background: background === "transparent" ? background : normalizeHex$1(background),
    crop: options.crop ?? manifest.defaults.crop
  };
}
function fnv1a(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}
function resolveViewBox(manifest, state) {
  const viewBox = manifest.crops[state.crop] ?? manifest.crops[manifest.defaults.crop];
  if (!viewBox) throw new Error(`Unknown crop: ${state.crop}`);
  return viewBox;
}
function renderSvg(manifest, state) {
  const viewBox = resolveViewBox(manifest, state);
  const fragments = collectFragments(manifest, state);
  const cssVariables = formatCssVariables$1(state.colors);
  const bgRect = state.background === "transparent" ? "" : `<rect x="${formatNumber$1(viewBox.x)}" y="${formatNumber$1(viewBox.y)}" width="${formatNumber$1(viewBox.width)}" height="${formatNumber$1(viewBox.height)}" fill="#${state.background}" />`;
  const content = fragments.map(({ part, fragment, offset }) => renderFragment(part, fragment, offset)).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${formatNumber$1(viewBox.width)}" height="${formatNumber$1(viewBox.height)}" viewBox="${formatNumber$1(viewBox.x)} ${formatNumber$1(viewBox.y)} ${formatNumber$1(viewBox.width)} ${formatNumber$1(viewBox.height)}" style="${escapeAttr$1(cssVariables)}">${bgRect}${content}</svg>`;
}
function collectFragments(manifest, state) {
  return Object.values(state.selections).map((partId) => {
    const part = manifest.parts.find((candidate) => candidate.id === partId);
    if (!part) throw new Error(`Unknown selected part: ${partId}`);
    return part;
  }).flatMap(
    (part) => part.layers.map((fragment) => {
      const layerSlot = manifest.layerSlots.find(
        (candidate) => candidate.id === fragment.layerSlot
      );
      if (!layerSlot) {
        throw new Error(`Unknown layer slot: ${fragment.layerSlot}`);
      }
      return {
        part,
        fragment,
        order: layerSlot.order,
        offset: layerSlot.offset
      };
    })
  ).sort((left, right) => left.order - right.order);
}
function renderFragment(part, fragment, offset) {
  var _a, _b;
  if (!fragment.svg) {
    throw new Error(`Missing SVG for part: ${part.id}`);
  }
  const content = stripSvgWrapper(fragment.svg);
  const transform = fragment.transform ? `translate(${formatNumber$1(offset.x)}, ${formatNumber$1(offset.y)}) ${fragment.transform}` : `translate(${formatNumber$1(offset.x)}, ${formatNumber$1(offset.y)})`;
  const attributes = [
    ["data-hm-layer-slot", fragment.layerSlot],
    ["data-hm-part-id", part.id],
    ["data-hm-selection-slot", part.selectionSlot],
    ["data-hm-source-group-id", (_a = part.source) == null ? void 0 : _a.groupId],
    ["data-hm-source-part-id", (_b = part.source) == null ? void 0 : _b.partId],
    ["transform", transform]
  ].flatMap(
    ([name, value]) => value === void 0 ? [] : [`${name}="${escapeAttr$1(value)}"`]
  ).join(" ");
  return `<g ${attributes}>${content}</g>`;
}
function formatCssVariables$1(colors) {
  return Object.entries(colors).sort(([left], [right]) => left.localeCompare(right)).map(([key, color]) => `--hm-${key}:#${normalizeHex$1(color)}`).join(";");
}
function normalizeHex$1(color) {
  return color.replace(/^#/, "").toUpperCase();
}
function stripSvgWrapper(svg) {
  return svg.replace(/<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
}
function formatNumber$1(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}
function escapeAttr$1(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
function createPartPreview(manifest, part, options = {}) {
  const resolved = typeof part === "string" ? manifest.parts.find((p) => p.id === part) : part;
  if (!resolved) throw new Error(`Unknown part: ${part}`);
  const colors = {
    ...manifest.defaults.colors,
    ...Object.fromEntries(
      Object.entries(options.colors ?? {}).map(([k, v]) => [k, normalizeHex(v)])
    )
  };
  const inlineColors = options.inlineColors !== false;
  const styleAttr = inlineColors ? ` style="${escapeAttr(formatCssVariables(colors))}"` : "";
  const fragments = resolved.layers.map((fragment) => {
    const layerSlot2 = manifest.layerSlots.find(
      (ls) => ls.id === fragment.layerSlot
    );
    if (!layerSlot2 || !fragment.svg) return "";
    const content = fragment.svg.replace(/<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
    const transform = fragment.transform ? `translate(${formatNumber(layerSlot2.offset.x)}, ${formatNumber(layerSlot2.offset.y)}) ${fragment.transform}` : `translate(${formatNumber(layerSlot2.offset.x)}, ${formatNumber(layerSlot2.offset.y)})`;
    return `<g transform="${escapeAttr(transform)}">${content}</g>`;
  }).join("");
  const layerSlot = manifest.layerSlots.find(
    (ls) => {
      var _a;
      return ls.id === ((_a = resolved.layers[0]) == null ? void 0 : _a.layerSlot);
    }
  );
  const offset = (layerSlot == null ? void 0 : layerSlot.offset) ?? { x: 0, y: 0 };
  const size = (layerSlot == null ? void 0 : layerSlot.size) ?? { width: 80, height: 80 };
  const bg = options.background === void 0 ? "transparent" : options.background;
  const bgRect = bg === "transparent" ? "" : `<rect x="${formatNumber(offset.x)}" y="${formatNumber(offset.y)}" width="${formatNumber(size.width)}" height="${formatNumber(size.height)}" fill="#${normalizeHex(bg)}" />`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${formatNumber(size.width)}" height="${formatNumber(size.height)}" viewBox="${formatNumber(offset.x)} ${formatNumber(offset.y)} ${formatNumber(size.width)} ${formatNumber(size.height)}"${styleAttr}>${bgRect}${fragments}</svg>`;
  return {
    toString() {
      return svg;
    },
    toDataUri() {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }
  };
}
function formatCssVariables(colors) {
  return Object.entries(colors).sort(([a], [b]) => a.localeCompare(b)).map(([key, color]) => `--hm-${key}:#${color}`).join(";");
}
function normalizeHex(color) {
  return color.replace(/^#/, "").toUpperCase();
}
function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}
function escapeAttr(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
let manifestPromise = null;
function loadHumationManifest() {
  manifestPromise ?? (manifestPromise = __vitePreload(() => import("./assets-DX8PqPEy.js"), true ? [] : void 0).then(
    (m) => m.manifest,
    (err) => {
      manifestPromise = null;
      throw err;
    }
  ));
  return manifestPromise;
}
async function renderHumationSvg(value) {
  const spec = parseSpec(value);
  if (!spec) return null;
  try {
    const manifest = await loadHumationManifest();
    return createAvatar(manifest, {
      seed: spec.seed,
      selections: spec.sel,
      colors: spec.col,
      background: spec.bg,
      crop: "avatar"
    }).toString();
  } catch {
    return null;
  }
}
function renderPartPreviewSvg(manifest, part, options = {}) {
  return createPartPreview(manifest, part, options).toString();
}
function draftColorVars(manifest, colors) {
  const merged = { ...manifest.defaults.colors, ...colors };
  const out = {};
  for (const [key, color] of Object.entries(merged)) {
    out[`--hm-${key}`] = `#${String(color).replace(/^#/, "").toUpperCase()}`;
  }
  return out;
}
function renderDraftSvg(manifest, draft) {
  return createAvatar(manifest, {
    selections: draft.sel,
    colors: draft.col,
    background: draft.bg,
    crop: "avatar"
  }).toString();
}
const _hoisted_1 = ["innerHTML"];
const _hoisted_2 = { class: "emoji" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "ZodiacAvatar",
  props: {
    zodiac: {},
    size: { default: 64 },
    showRing: { type: Boolean, default: false }
  },
  setup(__props) {
    const props = __props;
    const z = computed(() => getZodiac(props.zodiac));
    const isHum = computed(() => isHumationAvatar(props.zodiac));
    const humSvg = ref(null);
    const humState = ref("loading");
    watch(
      () => props.zodiac,
      async (value) => {
        if (!isHumationAvatar(value)) {
          humSvg.value = null;
          humState.value = "ready";
          return;
        }
        humState.value = "loading";
        humSvg.value = null;
        const svg = await renderHumationSvg(value);
        if (props.zodiac !== value) return;
        humSvg.value = svg;
        humState.value = svg ? "ready" : "failed";
      },
      { immediate: true }
    );
    const showHum = computed(() => isHum.value && humState.value !== "failed");
    const style = computed(() => {
      const s = props.size;
      const fontSize = Math.floor(s * 0.78);
      const ringColor = showHum.value ? "#9EC3E6" : z.value.color;
      return {
        width: `${s}px`,
        height: `${s}px`,
        fontSize: `${fontSize}px`,
        background: showHum.value ? "#ffffff" : `radial-gradient(circle at 30% 25%, #ffffff 0%, ${z.value.color} 60%, ${z.value.color}cc 100%)`,
        boxShadow: props.showRing ? `0 0 0 4px #ffffffaa, 0 0 0 7px ${ringColor}aa, 0 8px 24px ${ringColor}66` : `0 4px 16px ${ringColor}55, inset 0 1px 2px rgba(255,255,255,0.5)`
      };
    });
    return (_ctx, _cache) => {
      return showHum.value && humState.value === "ready" && humSvg.value ? (openBlock(), createElementBlock("div", {
        key: 0,
        class: "zodiac-avatar hum",
        style: normalizeStyle(style.value)
      }, [
        createBaseVNode("div", {
          class: "hum-svg",
          innerHTML: humSvg.value
        }, null, 8, _hoisted_1)
      ], 4)) : showHum.value ? (openBlock(), createElementBlock("div", {
        key: 1,
        class: "zodiac-avatar hum loading",
        style: normalizeStyle(style.value)
      }, [..._cache[0] || (_cache[0] = [
        createBaseVNode("span", { class: "emoji" }, "🎨", -1)
      ])], 4)) : (openBlock(), createElementBlock("div", {
        key: 2,
        class: "zodiac-avatar",
        style: normalizeStyle(style.value)
      }, [
        createBaseVNode("span", _hoisted_2, toDisplayString(z.value.emoji), 1)
      ], 4));
    };
  }
});
const ZodiacAvatar = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-c6ec0c61"]]);
export {
  ZodiacAvatar as Z,
  draftToSpec as a,
  renderPartPreviewSvg as b,
  draftColorVars as c,
  draftFromSpec as d,
  encodeSpec as e,
  renderDraftSvg as f,
  isHumationAvatar as i,
  loadHumationManifest as l,
  randomDraft as r
};
