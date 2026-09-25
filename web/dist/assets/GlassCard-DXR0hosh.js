import { d as defineComponent, c as createElementBlock, G as normalizeStyle, n as normalizeClass, V as renderSlot, k as openBlock, _ as _export_sfc } from "./index-DLtaHw3I.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "GlassCard",
  props: {
    variant: { default: "normal" },
    padding: { default: "20px" },
    hover: { type: Boolean, default: false }
  },
  setup(__props) {
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["glass-card", [__props.variant === "strong" ? "glass-strong" : "glass", { hoverable: __props.hover }]]),
        style: normalizeStyle({ padding: __props.padding })
      }, [
        renderSlot(_ctx.$slots, "default", {}, void 0)
      ], 6);
    };
  }
});
const GlassCard = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-3a6ccfbb"]]);
export {
  GlassCard as G
};
