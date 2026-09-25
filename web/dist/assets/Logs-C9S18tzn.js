import { d as defineComponent, o as onMounted, c as createElementBlock, b as createBaseVNode, n as normalizeClass, F as Fragment, r as renderList, q as createBlock, f as createCommentVNode, m as createVNode, e as unref, i as ref, z as api, k as openBlock, t as toDisplayString, p as withCtx, _ as _export_sfc } from "./index-DLtaHw3I.js";
import { L as LIST_PAGE_SIZE, P as Pager } from "./Pager-gbjjgpVA.js";
import { G as GlassCard } from "./GlassCard-DXR0hosh.js";
import { E as EmptyState } from "./EmptyState-3g4kc4Z_.js";
const _hoisted_1 = { class: "page" };
const _hoisted_2 = { class: "filters" };
const _hoisted_3 = ["onClick"];
const _hoisted_4 = {
  key: 1,
  class: "logs"
};
const _hoisted_5 = { class: "content" };
const _hoisted_6 = { class: "row1" };
const _hoisted_7 = { class: "note" };
const _hoisted_8 = { class: "row2" };
const _hoisted_9 = { class: "tag" };
const _hoisted_10 = {
  key: 0,
  class: "op"
};
const _hoisted_11 = { class: "time" };
const _hoisted_12 = { class: "page-actions" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Logs",
  setup(__props) {
    const logs = ref([]);
    const loading = ref(true);
    const filterUserId = ref(null);
    const children = ref([]);
    const PAGE_SIZE = LIST_PAGE_SIZE;
    const page = ref(1);
    const total = ref(0);
    async function load(p = page.value) {
      loading.value = true;
      try {
        const query = filterUserId.value ? `?userId=${filterUserId.value}&limit=${PAGE_SIZE}&offset=${(p - 1) * PAGE_SIZE}` : `?limit=${PAGE_SIZE}&offset=${(p - 1) * PAGE_SIZE}`;
        const res = await api.get(`/point-logs${query}`);
        logs.value = res.logs;
        total.value = res.total ?? res.logs.length;
        page.value = p;
      } finally {
        loading.value = false;
      }
    }
    function switchPage(p) {
      void load(p);
    }
    function switchFilter(id) {
      filterUserId.value = id;
      void load(1);
    }
    async function loadChildren() {
      const res = await api.get("/children");
      children.value = res.children;
    }
    function fmtTime(ts) {
      const d = new Date(ts * 1e3);
      const now = /* @__PURE__ */ new Date();
      const diff = now.getTime() - d.getTime();
      if (diff < 6e4) return "刚刚";
      if (diff < 36e5) return `${Math.floor(diff / 6e4)}分钟前`;
      if (d.toDateString() === now.toDateString()) {
        return `今天 ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
      }
      return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
    }
    const sourceLabels = {
      daily: "日常",
      adhoc: "临时任务",
      exchange: "兑换",
      adjust: "临时",
      quiz: "单词游戏"
    };
    onMounted(async () => {
      await loadChildren();
      await load();
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        _cache[2] || (_cache[2] = createBaseVNode("header", { class: "page-header" }, [
          createBaseVNode("h1", { class: "title" }, "积分流水")
        ], -1)),
        createBaseVNode("div", _hoisted_2, [
          createBaseVNode("button", {
            class: normalizeClass({ active: filterUserId.value === null }),
            onClick: _cache[0] || (_cache[0] = ($event) => switchFilter(null))
          }, " 全部 ", 2),
          (openBlock(true), createElementBlock(Fragment, null, renderList(children.value, (c) => {
            return openBlock(), createElementBlock("button", {
              key: c.id,
              class: normalizeClass({ active: filterUserId.value === c.id }),
              onClick: ($event) => switchFilter(c.id)
            }, toDisplayString(c.name), 11, _hoisted_3);
          }), 128))
        ]),
        !loading.value && logs.value.length === 0 ? (openBlock(), createBlock(EmptyState, {
          key: 0,
          emoji: "📜",
          text: "还没有积分记录哦"
        })) : (openBlock(), createElementBlock("div", _hoisted_4, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(logs.value, (log) => {
            return openBlock(), createBlock(GlassCard, {
              key: log.id,
              padding: "14px 16px",
              class: "log-item"
            }, {
              default: withCtx(() => [
                createBaseVNode("div", {
                  class: normalizeClass(["delta", log.delta > 0 ? "gain" : "loss"])
                }, toDisplayString(log.delta > 0 ? "+" : "") + toDisplayString(log.delta), 3),
                createBaseVNode("div", _hoisted_5, [
                  createBaseVNode("div", _hoisted_6, [
                    createBaseVNode("strong", null, toDisplayString(log.user_name), 1),
                    createBaseVNode("span", _hoisted_7, toDisplayString(log.note), 1)
                  ]),
                  createBaseVNode("div", _hoisted_8, [
                    createBaseVNode("span", _hoisted_9, toDisplayString(sourceLabels[log.source] ?? log.source), 1),
                    log.creator_name ? (openBlock(), createElementBlock("span", _hoisted_10, "操作人：" + toDisplayString(log.creator_name), 1)) : createCommentVNode("", true),
                    createBaseVNode("span", _hoisted_11, toDisplayString(fmtTime(log.created_at)), 1)
                  ])
                ])
              ]),
              _: 2
            }, 1024);
          }), 128))
        ])),
        createBaseVNode("div", _hoisted_12, [
          logs.value.length > 0 ? (openBlock(), createElementBlock("button", {
            key: 0,
            class: "btn btn-ghost",
            onClick: _cache[1] || (_cache[1] = ($event) => load())
          }, "刷新")) : createCommentVNode("", true)
        ]),
        createVNode(Pager, {
          page: page.value,
          "page-size": unref(PAGE_SIZE),
          total: total.value,
          disabled: loading.value,
          "onUpdate:page": switchPage
        }, null, 8, ["page", "page-size", "total", "disabled"])
      ]);
    };
  }
});
const Logs = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-370dc095"]]);
export {
  Logs as default
};
