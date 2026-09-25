import { M as Modal } from "./Modal-DiJeCwYw.js";
import { l as loadHumationManifest, d as draftFromSpec, r as randomDraft, e as encodeSpec, a as draftToSpec, b as renderPartPreviewSvg, c as draftColorVars, f as renderDraftSvg } from "./ZodiacAvatar-BgUFKiIx.js";
import { d as defineComponent, o as onMounted, w as watch, q as createBlock, p as withCtx, Q as shallowRef, i as ref, k as openBlock, c as createElementBlock, b as createBaseVNode, F as Fragment, r as renderList, n as normalizeClass, t as toDisplayString, G as normalizeStyle, y as computed, _ as _export_sfc } from "./index-DLtaHw3I.js";
const _hoisted_1 = {
  key: 0,
  class: "loading-tip"
};
const _hoisted_2 = {
  key: 1,
  class: "editor"
};
const _hoisted_3 = { class: "top" };
const _hoisted_4 = ["innerHTML"];
const _hoisted_5 = { class: "slots" };
const _hoisted_6 = ["onClick"];
const _hoisted_7 = ["title", "onClick"];
const _hoisted_8 = ["innerHTML"];
const _hoisted_9 = { class: "colors" };
const _hoisted_10 = ["value", "onInput"];
const _hoisted_11 = { class: "colors" };
const _hoisted_12 = ["onClick"];
const _hoisted_13 = { class: "actions" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "HumationAvatarEditor",
  props: {
    current: {}
  },
  emits: ["save", "close"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const SLOT_LABELS = {
      head: "头像",
      body: "上衣",
      bottom: "下装",
      item: "配饰",
      glasses: "眼镜"
    };
    const COLOR_LABELS = [
      { key: "hair", label: "发色" },
      { key: "skin", label: "肤色" },
      { key: "clothes", label: "上衣" },
      { key: "bottom", label: "下装" },
      { key: "stroke", label: "描边" }
    ];
    const BG_SWATCHES = [
      { value: "F6F5F4", label: "默认" },
      { value: "FFF7E6", label: "奶油" },
      { value: "EAF6FF", label: "天空" },
      { value: "F0FFF4", label: "薄荷" },
      { value: "FDEFF5", label: "樱粉" },
      { value: "transparent", label: "透明" }
    ];
    const checkeredStyle = {
      backgroundImage: "linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%), linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%)",
      backgroundSize: "8px 8px",
      backgroundPosition: "0 0, 4px 4px"
    };
    const manifest = shallowRef(null);
    const draft = ref(null);
    const activeSlot = ref("head");
    onMounted(async () => {
      const m = await loadHumationManifest();
      manifest.value = m;
      draft.value = draftFromSpec(props.current) ?? randomDraft(m);
    });
    const slots = computed(() => {
      const m = manifest.value;
      if (!m) return [];
      const order = new Map(m.uiGroups.map((g) => [g.id, g.order]));
      return [...m.selectionSlots].sort(
        (a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99)
      );
    });
    const partPreviewCache = /* @__PURE__ */ new Map();
    const activeParts = computed(() => {
      const m = manifest.value;
      if (!m) return [];
      return m.parts.filter((p) => p.selectionSlot === activeSlot.value && !p.deprecated).sort((a, b) => {
        var _a, _b;
        const aId = ((_a = a.source) == null ? void 0 : _a.partId) ?? a.id;
        const bId = ((_b = b.source) == null ? void 0 : _b.partId) ?? b.id;
        return aId.localeCompare(bId);
      });
    });
    const partPreviews = computed(() => {
      const m = manifest.value;
      const d = draft.value;
      if (!m || !d) return [];
      const cacheKey = `${activeSlot.value}|${d.bg}`;
      const hit = partPreviewCache.get(cacheKey);
      if (hit && hit.length === activeParts.value.length) return hit;
      const svgs = activeParts.value.map(
        (part) => renderPartPreviewSvg(m, part, { background: d.bg, inlineColors: false })
      );
      if (partPreviewCache.size > 64) partPreviewCache.clear();
      partPreviewCache.set(cacheKey, svgs);
      return svgs;
    });
    const partColorVars = computed(() => {
      const m = manifest.value;
      const d = draft.value;
      if (!m || !d) return {};
      return draftColorVars(m, d.col);
    });
    const previewSvg = computed(() => {
      const m = manifest.value;
      const d = draft.value;
      if (!m || !d) return null;
      try {
        return renderDraftSvg(m, d);
      } catch {
        return null;
      }
    });
    function pickPart(part) {
      if (!draft.value) return;
      draft.value.sel = { ...draft.value.sel, [activeSlot.value]: part.id };
    }
    function setColor(key, hex) {
      if (!draft.value) return;
      draft.value.col = {
        ...draft.value.col,
        [key]: hex.replace("#", "").toUpperCase()
      };
    }
    function setBg(value) {
      if (draft.value) draft.value.bg = value;
    }
    function shuffle() {
      const m = manifest.value;
      if (m) draft.value = randomDraft(m);
    }
    function reset() {
      const m = manifest.value;
      if (!m) return;
      draft.value = {
        sel: { ...m.defaults.selections },
        col: { ...m.defaults.colors },
        bg: m.defaults.background
      };
    }
    function save() {
      if (!draft.value) return;
      emit("save", encodeSpec(draftToSpec(draft.value)));
    }
    watch(activeSlot, (slot) => {
      if (draft.value && !draft.value.sel[slot]) {
        const first = activeParts.value[0];
        if (first) pickPart(first);
      }
    });
    return (_ctx, _cache) => {
      return openBlock(), createBlock(Modal, {
        "model-value": true,
        title: "自定义形象",
        width: "600px",
        "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => emit("close"))
      }, {
        default: withCtx(() => [
          !manifest.value || !draft.value ? (openBlock(), createElementBlock("div", _hoisted_1, "形象加载中...")) : (openBlock(), createElementBlock("div", _hoisted_2, [
            createBaseVNode("div", _hoisted_3, [
              createBaseVNode("div", {
                class: "preview-box",
                innerHTML: previewSvg.value
              }, null, 8, _hoisted_4),
              createBaseVNode("div", _hoisted_5, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(slots.value, (s) => {
                  return openBlock(), createElementBlock("button", {
                    key: s.id,
                    type: "button",
                    class: normalizeClass(["slot-chip", { active: activeSlot.value === s.id }]),
                    onClick: ($event) => activeSlot.value = s.id
                  }, toDisplayString(SLOT_LABELS[s.id] ?? s.label), 11, _hoisted_6);
                }), 128))
              ])
            ]),
            createBaseVNode("div", {
              class: "parts",
              style: normalizeStyle(partColorVars.value)
            }, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(activeParts.value, (part, i) => {
                return openBlock(), createElementBlock("button", {
                  key: part.id,
                  type: "button",
                  class: normalizeClass(["part", { active: draft.value.sel[activeSlot.value] === part.id }]),
                  title: part.name ?? part.id,
                  onClick: ($event) => pickPart(part)
                }, [
                  createBaseVNode("span", {
                    class: "part-svg",
                    innerHTML: partPreviews.value[i]
                  }, null, 8, _hoisted_8)
                ], 10, _hoisted_7);
              }), 128))
            ], 4),
            createBaseVNode("div", _hoisted_9, [
              (openBlock(), createElementBlock(Fragment, null, renderList(COLOR_LABELS, (c) => {
                return createBaseVNode("label", {
                  key: c.key,
                  class: "color-item"
                }, [
                  createBaseVNode("input", {
                    type: "color",
                    value: "#" + (draft.value.col[c.key] ?? "000000"),
                    onInput: ($event) => setColor(c.key, $event.target.value)
                  }, null, 40, _hoisted_10),
                  createBaseVNode("span", null, toDisplayString(c.label), 1)
                ]);
              }), 64))
            ]),
            createBaseVNode("div", _hoisted_11, [
              (openBlock(), createElementBlock(Fragment, null, renderList(BG_SWATCHES, (b) => {
                return createBaseVNode("button", {
                  key: b.value,
                  type: "button",
                  class: normalizeClass(["bg-swatch", { active: draft.value.bg === b.value }]),
                  style: normalizeStyle(b.value === "transparent" ? checkeredStyle : { background: "#" + b.value }),
                  onClick: ($event) => setBg(b.value)
                }, toDisplayString(b.label), 15, _hoisted_12);
              }), 64))
            ]),
            createBaseVNode("div", _hoisted_13, [
              createBaseVNode("button", {
                type: "button",
                class: "btn btn-ghost",
                onClick: shuffle
              }, "🎲 随机"),
              createBaseVNode("button", {
                type: "button",
                class: "btn btn-ghost",
                onClick: reset
              }, "↺ 重置"),
              _cache[2] || (_cache[2] = createBaseVNode("span", { class: "spacer" }, null, -1)),
              createBaseVNode("button", {
                type: "button",
                class: "btn",
                onClick: _cache[0] || (_cache[0] = ($event) => emit("close"))
              }, "取消"),
              createBaseVNode("button", {
                type: "button",
                class: "btn btn-primary",
                onClick: save
              }, "使用这个形象")
            ])
          ]))
        ]),
        _: 1
      });
    };
  }
});
const HumationAvatarEditor = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-6a7c4612"]]);
const BOY_SPEC = {
  sel: {
    head: "hm1-p-000007",
    // messy-short 短碎发
    body: "hm1-p-000032",
    // hoodie 连帽衫
    bottom: "hm1-p-000034",
    // tapered-pants 长裤
    item: "hm1-p-000045",
    // sprout 小芽
    glasses: "hm1-p-000056"
    // none
  },
  col: {
    hair: "2F2A28",
    skin: "FFE3C9",
    clothes: "5DA8E0",
    bottom: "3B6EA5",
    stroke: "111111"
  },
  bg: "EAF6FF"
};
const GIRL_SPEC = {
  sel: {
    head: "hm1-p-000017",
    // ponytail 马尾
    body: "hm1-p-000029",
    // tee T恤
    bottom: "hm1-p-000037",
    // mini-skirt 短裙
    item: "hm1-p-000051",
    // flower 小花
    glasses: "hm1-p-000056"
    // none
  },
  col: {
    hair: "5B3A29",
    skin: "FFE3C9",
    clothes: "EF8FB0",
    bottom: "B3543F",
    stroke: "111111"
  },
  bg: "FDEFF5"
};
const BOY_PRESET = {
  key: "boy",
  label: "男生",
  value: encodeSpec(BOY_SPEC)
};
const GIRL_PRESET = {
  key: "girl",
  label: "女生",
  value: encodeSpec(GIRL_SPEC)
};
const PRESET_VALUES = /* @__PURE__ */ new Set([BOY_PRESET.value, GIRL_PRESET.value]);
export {
  BOY_PRESET as B,
  GIRL_PRESET as G,
  HumationAvatarEditor as H,
  PRESET_VALUES as P
};
