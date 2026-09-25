import { d as defineComponent, c as createElementBlock, b as createBaseVNode, t as toDisplayString, f as createCommentVNode, y as computed, k as openBlock, _ as _export_sfc } from "./index-DLtaHw3I.js";
const LIST_PAGE_SIZE = 20;
const _hoisted_1 = {
  key: 0,
  class: "pager"
};
const _hoisted_2 = ["disabled"];
const _hoisted_3 = { class: "pg-info" };
const _hoisted_4 = ["disabled"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Pager",
  props: {
    page: {},
    pageSize: {},
    total: {},
    disabled: { type: Boolean }
  },
  emits: ["update:page"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));
    function go(p) {
      if (props.disabled) return;
      const next = Math.min(Math.max(1, p), totalPages.value);
      if (next !== props.page) emit("update:page", next);
    }
    return (_ctx, _cache) => {
      return __props.total > __props.pageSize ? (openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("button", {
          class: "pg-btn",
          disabled: __props.page <= 1 || __props.disabled,
          "aria-label": "上一页",
          onClick: _cache[0] || (_cache[0] = ($event) => go(__props.page - 1))
        }, "‹", 8, _hoisted_2),
        createBaseVNode("span", _hoisted_3, "第 " + toDisplayString(__props.page) + " / " + toDisplayString(totalPages.value) + " 页 · 共 " + toDisplayString(__props.total) + " 条", 1),
        createBaseVNode("button", {
          class: "pg-btn",
          disabled: __props.page >= totalPages.value || __props.disabled,
          "aria-label": "下一页",
          onClick: _cache[1] || (_cache[1] = ($event) => go(__props.page + 1))
        }, "›", 8, _hoisted_4)
      ])) : createCommentVNode("", true);
    };
  }
});
const Pager = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-dd42e330"]]);
export {
  LIST_PAGE_SIZE as L,
  Pager as P
};
