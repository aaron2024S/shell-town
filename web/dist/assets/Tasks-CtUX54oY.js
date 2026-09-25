import { d as defineComponent, a as useToastStore, o as onMounted, W as WS_EVENTS, B as onUnmounted, c as createElementBlock, b as createBaseVNode, q as createBlock, F as Fragment, r as renderList, m as createVNode, i as ref, z as api, k as openBlock, p as withCtx, t as toDisplayString, f as createCommentVNode, _ as _export_sfc } from "./index-DLtaHw3I.js";
import { G as GlassCard } from "./GlassCard-DXR0hosh.js";
import { E as EmptyState } from "./EmptyState-3g4kc4Z_.js";
import { C as ConfirmDialog } from "./ConfirmDialog-BWQPEwj0.js";
const _hoisted_1 = { class: "page" };
const _hoisted_2 = {
  key: 1,
  class: "task-list"
};
const _hoisted_3 = { class: "head" };
const _hoisted_4 = {
  key: 0,
  class: "status expired"
};
const _hoisted_5 = {
  key: 1,
  class: "status review"
};
const _hoisted_6 = {
  key: 2,
  class: "status completed"
};
const _hoisted_7 = {
  key: 3,
  class: "status active"
};
const _hoisted_8 = { class: "reward" };
const _hoisted_9 = { class: "name" };
const _hoisted_10 = {
  key: 0,
  class: "desc"
};
const _hoisted_11 = { class: "meta" };
const _hoisted_12 = {
  key: 1,
  class: "rejected-box"
};
const _hoisted_13 = { class: "actions" };
const _hoisted_14 = {
  key: 0,
  class: "hint"
};
const _hoisted_15 = {
  key: 1,
  class: "hint done"
};
const _hoisted_16 = ["disabled", "onClick"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Tasks",
  setup(__props) {
    const toast = useToastStore();
    const tasks = ref([]);
    const loading = ref(true);
    const processing = ref(null);
    const confirmOpen = ref(false);
    const confirmMessage = ref("");
    const confirmAction = ref(null);
    async function load() {
      loading.value = true;
      try {
        const res = await api.get("/adhoc-tasks/mine");
        tasks.value = res.tasks;
      } finally {
        loading.value = false;
      }
    }
    function submitCompletion(t) {
      confirmMessage.value = `提交「${t.name}」完成申请？`;
      confirmAction.value = async () => {
        var _a;
        processing.value = t.id;
        try {
          await api.post(`/adhoc-tasks/${t.id}/submit-completion`);
          toast.success("已提交完成申请，等爸爸妈妈审核~");
          await load();
        } catch (e) {
          const err = (_a = e.payload) == null ? void 0 : _a.error;
          if (err === "already_pending") toast.warning("已经提交过了，请耐心等待");
          else if (err === "already_approved") toast.warning("这个任务已完成");
          else toast.error(e.message);
        } finally {
          processing.value = null;
        }
      };
      confirmOpen.value = true;
    }
    async function runConfirm() {
      if (confirmAction.value) await confirmAction.value();
      confirmAction.value = null;
    }
    function fmtDeadline(ts) {
      if (!ts) return "无截止";
      const d = new Date(ts * 1e3);
      const now = Date.now();
      const diff = ts * 1e3 - now;
      if (diff < 0) return `已超时 ${Math.abs(Math.floor(diff / 36e5))}小时`;
      if (diff < 864e5) return `今日 ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
      return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
    }
    function onWsEvent() {
      load();
    }
    onMounted(() => {
      load();
      window.addEventListener(WS_EVENTS.taskReview, onWsEvent);
      window.addEventListener(WS_EVENTS.taskGenerated, onWsEvent);
    });
    onUnmounted(() => {
      window.removeEventListener(WS_EVENTS.taskReview, onWsEvent);
      window.removeEventListener(WS_EVENTS.taskGenerated, onWsEvent);
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        _cache[4] || (_cache[4] = createBaseVNode("header", { class: "page-header" }, [
          createBaseVNode("h1", { class: "title" }, "我的任务"),
          createBaseVNode("p", { class: "subtitle" }, "完成任务可以赚积分哦~")
        ], -1)),
        !loading.value && tasks.value.length === 0 ? (openBlock(), createBlock(EmptyState, {
          key: 0,
          emoji: "🎉",
          text: "暂无任务",
          hint: "爸爸妈妈发布任务后这里会显示哦~"
        })) : (openBlock(), createElementBlock("div", _hoisted_2, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(tasks.value, (t) => {
            return openBlock(), createBlock(GlassCard, {
              key: t.id,
              padding: "18px 20px",
              class: "task-card"
            }, {
              default: withCtx(() => [
                createBaseVNode("div", _hoisted_3, [
                  t.display_status === "expired" ? (openBlock(), createElementBlock("span", _hoisted_4, "⏰ 已超时")) : t.completion_status === "pending" ? (openBlock(), createElementBlock("span", _hoisted_5, "⏳ 待审核")) : t.completion_status === "approved" ? (openBlock(), createElementBlock("span", _hoisted_6, "✅ 已完成")) : (openBlock(), createElementBlock("span", _hoisted_7, "🟢 进行中")),
                  createBaseVNode("div", _hoisted_8, "+" + toDisplayString(t.points) + " 🌟", 1)
                ]),
                createBaseVNode("h3", _hoisted_9, toDisplayString(t.name), 1),
                t.description ? (openBlock(), createElementBlock("p", _hoisted_10, toDisplayString(t.description), 1)) : createCommentVNode("", true),
                createBaseVNode("div", _hoisted_11, [
                  createBaseVNode("span", null, "📅 " + toDisplayString(fmtDeadline(t.deadline)), 1)
                ]),
                t.completion_status === "rejected" ? (openBlock(), createElementBlock("div", _hoisted_12, [
                  _cache[1] || (_cache[1] = createBaseVNode("span", { class: "emoji" }, "📝", -1)),
                  createBaseVNode("span", null, "上次未通过：" + toDisplayString(t.completion_reason || "原因未说明"), 1)
                ])) : createCommentVNode("", true),
                createBaseVNode("div", _hoisted_13, [
                  t.completion_status === "pending" ? (openBlock(), createElementBlock("div", _hoisted_14, [..._cache[2] || (_cache[2] = [
                    createBaseVNode("span", { class: "emoji" }, "💡", -1),
                    createBaseVNode("span", null, "已提交完成申请，等待爸爸妈妈审核~", -1)
                  ])])) : t.completion_status === "approved" ? (openBlock(), createElementBlock("div", _hoisted_15, [
                    _cache[3] || (_cache[3] = createBaseVNode("span", { class: "emoji" }, "🎉", -1)),
                    createBaseVNode("span", null, "任务完成！已获得 " + toDisplayString(t.points) + " 积分", 1)
                  ])) : (openBlock(), createElementBlock("button", {
                    key: 2,
                    class: "btn btn-success big",
                    disabled: processing.value === t.id,
                    onClick: ($event) => submitCompletion(t)
                  }, toDisplayString(processing.value === t.id ? "提交中..." : "📤 提交完成"), 9, _hoisted_16))
                ])
              ]),
              _: 2
            }, 1024);
          }), 128))
        ])),
        createVNode(ConfirmDialog, {
          modelValue: confirmOpen.value,
          "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => confirmOpen.value = $event),
          message: confirmMessage.value,
          "confirm-text": "确认提交",
          onConfirm: runConfirm
        }, null, 8, ["modelValue", "message"])
      ]);
    };
  }
});
const Tasks = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-0df48d0b"]]);
export {
  Tasks as default
};
