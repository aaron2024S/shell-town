import { d as defineComponent, w as watch, B as onUnmounted, q as createBlock, U as Teleport, m as createVNode, T as Transition, p as withCtx, k as openBlock, c as createElementBlock, g as withModifiers, G as normalizeStyle, b as createBaseVNode, t as toDisplayString, V as renderSlot, f as createCommentVNode, _ as _export_sfc } from "./index-DLtaHw3I.js";
const _hoisted_1 = {
  key: 0,
  class: "modal-header"
};
const _hoisted_2 = { class: "modal-body" };
const _hoisted_3 = {
  key: 2,
  class: "modal-footer"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Modal",
  props: {
    modelValue: { type: Boolean },
    title: { default: "" },
    width: { default: "440px" }
  },
  emits: ["update:modelValue"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    function close() {
      emit("update:modelValue", false);
    }
    let lockCount = 0;
    let savedOverflow = "";
    function lockScroll() {
      if (lockCount === 0) {
        savedOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
      }
      lockCount++;
    }
    function unlockScroll() {
      if (lockCount === 0) return;
      lockCount--;
      if (lockCount === 0) document.body.style.overflow = savedOverflow;
    }
    watch(() => props.modelValue, (open) => {
      if (open) lockScroll();
      else unlockScroll();
    }, { immediate: true });
    onUnmounted(() => {
      if (props.modelValue) unlockScroll();
    });
    function onMaskClick() {
      close();
    }
    return (_ctx, _cache) => {
      return openBlock(), createBlock(Teleport, { to: "body" }, [
        createVNode(Transition, { name: "fade" }, {
          default: withCtx(() => [
            __props.modelValue ? (openBlock(), createElementBlock("div", {
              key: 0,
              class: "modal-mask",
              onClick: withModifiers(onMaskClick, ["self"])
            }, [
              createVNode(Transition, {
                name: "slide-up",
                appear: ""
              }, {
                default: withCtx(() => [
                  __props.modelValue ? (openBlock(), createElementBlock("div", {
                    key: 0,
                    class: "modal-panel glass-strong",
                    style: normalizeStyle({ width: __props.width }),
                    onClick: _cache[0] || (_cache[0] = withModifiers(() => {
                    }, ["stop"]))
                  }, [
                    __props.title ? (openBlock(), createElementBlock("header", _hoisted_1, [
                      createBaseVNode("h3", null, toDisplayString(__props.title), 1),
                      createBaseVNode("button", {
                        class: "close-btn",
                        onClick: close,
                        "aria-label": "关闭"
                      }, "✕")
                    ])) : (openBlock(), createElementBlock("button", {
                      key: 1,
                      class: "close-btn floating",
                      onClick: close,
                      "aria-label": "关闭"
                    }, "✕")),
                    createBaseVNode("div", _hoisted_2, [
                      renderSlot(_ctx.$slots, "default", {}, void 0, true)
                    ]),
                    _ctx.$slots.footer ? (openBlock(), createElementBlock("footer", _hoisted_3, [
                      renderSlot(_ctx.$slots, "footer", {}, void 0, true)
                    ])) : createCommentVNode("", true)
                  ], 4)) : createCommentVNode("", true)
                ]),
                _: 3
              })
            ])) : createCommentVNode("", true)
          ]),
          _: 3
        })
      ]);
    };
  }
});
const Modal = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-bedb6944"]]);
export {
  Modal as M
};
