import { d as defineComponent, q as createBlock, m as createVNode, T as Transition, p as withCtx, U as Teleport, k as openBlock, c as createElementBlock, b as createBaseVNode, n as normalizeClass, t as toDisplayString, f as createCommentVNode, g as withModifiers, _ as _export_sfc } from "./index-DLtaHw3I.js";
const _hoisted_1 = { class: "dialog glass-strong" };
const _hoisted_2 = { key: 0 };
const _hoisted_3 = { key: 1 };
const _hoisted_4 = {
  key: 0,
  class: "title"
};
const _hoisted_5 = { class: "message" };
const _hoisted_6 = { class: "actions" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "ConfirmDialog",
  props: {
    modelValue: { type: Boolean },
    title: {},
    message: {},
    confirmText: {},
    cancelText: {},
    variant: {}
  },
  emits: ["update:modelValue", "confirm", "cancel"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    function onConfirm() {
      emit("confirm");
      emit("update:modelValue", false);
    }
    function onCancel() {
      emit("update:modelValue", false);
      emit("cancel");
    }
    return (_ctx, _cache) => {
      return openBlock(), createBlock(Teleport, { to: "body" }, [
        createVNode(Transition, { name: "fade" }, {
          default: withCtx(() => [
            __props.modelValue ? (openBlock(), createElementBlock("div", {
              key: 0,
              class: "overlay",
              onClick: withModifiers(onCancel, ["self"])
            }, [
              createBaseVNode("div", _hoisted_1, [
                createBaseVNode("div", {
                  class: normalizeClass(["icon-circle", props.variant])
                }, [
                  props.variant === "danger" ? (openBlock(), createElementBlock("span", _hoisted_2, "⚠️")) : (openBlock(), createElementBlock("span", _hoisted_3, "❓"))
                ], 2),
                props.title ? (openBlock(), createElementBlock("h3", _hoisted_4, toDisplayString(props.title), 1)) : createCommentVNode("", true),
                createBaseVNode("p", _hoisted_5, toDisplayString(props.message), 1),
                createBaseVNode("div", _hoisted_6, [
                  createBaseVNode("button", {
                    class: "btn btn-ghost",
                    onClick: onCancel
                  }, toDisplayString(props.cancelText ?? "取消"), 1),
                  createBaseVNode("button", {
                    class: normalizeClass(["btn", props.variant === "danger" ? "btn-danger" : "btn-primary"]),
                    onClick: onConfirm
                  }, toDisplayString(props.confirmText ?? "确认"), 3)
                ])
              ])
            ])) : createCommentVNode("", true)
          ]),
          _: 1
        })
      ]);
    };
  }
});
const ConfirmDialog = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-526761d8"]]);
export {
  ConfirmDialog as C
};
