import { d as defineComponent, c as createElementBlock, b as createBaseVNode, t as toDisplayString, f as createCommentVNode, k as openBlock, _ as _export_sfc } from "./index-DLtaHw3I.js";
const _hoisted_1 = { class: "empty-state" };
const _hoisted_2 = { class: "emoji" };
const _hoisted_3 = { class: "text" };
const _hoisted_4 = {
  key: 0,
  class: "hint"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "EmptyState",
  props: {
    emoji: {},
    text: {},
    hint: {}
  },
  setup(__props) {
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("span", _hoisted_2, toDisplayString(__props.emoji ?? "📭"), 1),
        createBaseVNode("div", _hoisted_3, toDisplayString(__props.text), 1),
        __props.hint ? (openBlock(), createElementBlock("div", _hoisted_4, toDisplayString(__props.hint), 1)) : createCommentVNode("", true)
      ]);
    };
  }
});
const EmptyState = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-b772cb39"]]);
export {
  EmptyState as E
};
