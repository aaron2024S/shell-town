import { d as defineComponent, a as useToastStore, w as watch, q as createBlock, p as withCtx, k as openBlock, b as createBaseVNode, t as toDisplayString, h as withDirectives, v as vModelText, i as ref, z as api, _ as _export_sfc, A as useWsStore, o as onMounted, W as WS_EVENTS, B as onUnmounted, c as createElementBlock, n as normalizeClass, x as createTextVNode, f as createCommentVNode, F as Fragment, r as renderList, e as unref, m as createVNode, R as REVIEW_UPDATED } from "./index-DLtaHw3I.js";
import { L as LIST_PAGE_SIZE, P as Pager } from "./Pager-gbjjgpVA.js";
import { G as GlassCard } from "./GlassCard-DXR0hosh.js";
import { E as EmptyState } from "./EmptyState-3g4kc4Z_.js";
import { Z as ZodiacAvatar } from "./ZodiacAvatar-BgUFKiIx.js";
import { M as Modal } from "./Modal-DiJeCwYw.js";
import { C as ConfirmDialog } from "./ConfirmDialog-BWQPEwj0.js";
import { C as CategoryIcon } from "./CategoryIcon-Cl8_OLmG.js";
const _hoisted_1$1 = { class: "form" };
const _hoisted_2$1 = { class: "hint" };
const _hoisted_3$1 = ["placeholder"];
const _hoisted_4$1 = ["disabled"];
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "RejectModal",
  props: {
    modelValue: { type: Boolean },
    request: {},
    endpoint: { default: "" },
    title: { default: "拒绝兑换申请" },
    hint: { default: "" },
    placeholder: { default: "如：库存不足 / 不合适的兑换" }
  },
  emits: ["update:modelValue", "done"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const toast = useToastStore();
    const reason = ref("");
    const saving = ref(false);
    watch(() => props.modelValue, (open) => {
      if (open) reason.value = "";
    }, { immediate: true });
    async function reject() {
      var _a;
      if (!reason.value.trim()) return toast.warning("请填写拒绝原因");
      saving.value = true;
      try {
        const url = props.endpoint || `/exchange-requests/${props.request.id}/reject`;
        await api.post(url, { reason: reason.value.trim() });
        toast.success("已拒绝");
        emit("done");
      } catch (e) {
        const err = (_a = e.payload) == null ? void 0 : _a.error;
        if (err === "already_reviewed") toast.warning("该申请已处理过");
        else toast.error(e.message);
      } finally {
        saving.value = false;
      }
    }
    return (_ctx, _cache) => {
      return openBlock(), createBlock(Modal, {
        "model-value": __props.modelValue,
        title: __props.title,
        "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => emit("update:modelValue", $event))
      }, {
        footer: withCtx(() => [
          _cache[3] || (_cache[3] = createBaseVNode("span", { style: { "flex": "1" } }, null, -1)),
          createBaseVNode("button", {
            class: "btn btn-ghost",
            onClick: _cache[1] || (_cache[1] = ($event) => emit("update:modelValue", false))
          }, "取消"),
          createBaseVNode("button", {
            class: "btn btn-danger",
            onClick: reject,
            disabled: saving.value
          }, toDisplayString(saving.value ? "处理中..." : "确认拒绝"), 9, _hoisted_4$1)
        ]),
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1$1, [
            createBaseVNode("p", _hoisted_2$1, toDisplayString(__props.hint || `拒绝后，积分将退回给 ${__props.request.user_name}`), 1),
            withDirectives(createBaseVNode("textarea", {
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => reason.value = $event),
              maxlength: "100",
              rows: "3",
              placeholder: __props.placeholder
            }, null, 8, _hoisted_3$1), [
              [vModelText, reason.value]
            ])
          ])
        ]),
        _: 1
      }, 8, ["model-value", "title"]);
    };
  }
});
const RejectModal = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-ede0bfd0"]]);
const _hoisted_1 = { class: "page" };
const _hoisted_2 = { class: "main-tabs" };
const _hoisted_3 = {
  key: 0,
  class: "badge"
};
const _hoisted_4 = {
  key: 0,
  class: "badge"
};
const _hoisted_5 = { class: "tabs" };
const _hoisted_6 = {
  key: 0,
  class: "badge-num"
};
const _hoisted_7 = {
  key: 1,
  class: "badge-num"
};
const _hoisted_8 = {
  key: 1,
  class: "list"
};
const _hoisted_9 = { class: "head" };
const _hoisted_10 = { class: "user" };
const _hoisted_11 = { class: "user-name" };
const _hoisted_12 = { class: "time" };
const _hoisted_13 = { key: 0 };
const _hoisted_14 = { key: 1 };
const _hoisted_15 = { class: "detail" };
const _hoisted_16 = { class: "item" };
const _hoisted_17 = {
  key: 0,
  class: "label"
};
const _hoisted_18 = {
  key: 1,
  class: "label"
};
const _hoisted_19 = {
  key: 2,
  class: "value product"
};
const _hoisted_20 = {
  key: 3,
  class: "value cash"
};
const _hoisted_21 = { class: "item" };
const _hoisted_22 = { class: "value points" };
const _hoisted_23 = {
  key: 0,
  class: "reason"
};
const _hoisted_24 = {
  key: 1,
  class: "reason ok"
};
const _hoisted_25 = {
  key: 2,
  class: "actions"
};
const _hoisted_26 = ["onClick", "disabled"];
const _hoisted_27 = ["onClick"];
const _hoisted_28 = {
  key: 1,
  class: "list"
};
const _hoisted_29 = { class: "head" };
const _hoisted_30 = { class: "user" };
const _hoisted_31 = { class: "user-name" };
const _hoisted_32 = { class: "time" };
const _hoisted_33 = { class: "detail" };
const _hoisted_34 = { class: "item" };
const _hoisted_35 = { class: "value" };
const _hoisted_36 = { class: "item" };
const _hoisted_37 = { class: "value gain" };
const _hoisted_38 = {
  key: 0,
  class: "reason"
};
const _hoisted_39 = {
  key: 1,
  class: "reason ok"
};
const _hoisted_40 = {
  key: 2,
  class: "actions"
};
const _hoisted_41 = ["onClick", "disabled"];
const _hoisted_42 = ["onClick"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Review",
  setup(__props) {
    const toast = useToastStore();
    const ws = useWsStore();
    const mainTab = ref("exchange");
    const requests = ref([]);
    const completions = ref([]);
    const loading = ref(true);
    const tab = ref("pending");
    const rejecting = ref(null);
    const rejectOpen = ref(false);
    const processing = ref(null);
    const taskRejecting = ref(null);
    const taskRejectOpen = ref(false);
    const confirmOpen = ref(false);
    const confirmMessage = ref("");
    const confirmAction = ref(null);
    const PAGE_SIZE = LIST_PAGE_SIZE;
    const page = ref(1);
    const total = ref(0);
    async function load(p = page.value) {
      loading.value = true;
      try {
        if (mainTab.value === "exchange") {
          const suffix = tab.value === "pending" ? `?status=${tab.value}` : `?status=${tab.value}&limit=${PAGE_SIZE}&offset=${(p - 1) * PAGE_SIZE}`;
          const res = await api.get(`/exchange-requests${suffix}`);
          requests.value = res.requests;
          total.value = tab.value === "pending" ? res.requests.length : res.total ?? res.requests.length;
          page.value = tab.value === "pending" ? 1 : p;
        } else {
          const suffix = tab.value === "pending" ? `?status=${tab.value}` : `?status=${tab.value}&limit=${PAGE_SIZE}&offset=${(p - 1) * PAGE_SIZE}`;
          const res = await api.get(`/adhoc-tasks/completions${suffix}`);
          completions.value = res.completions;
          total.value = tab.value === "pending" ? res.completions.length : res.total ?? res.completions.length;
          page.value = tab.value === "pending" ? 1 : p;
        }
      } finally {
        loading.value = false;
        window.dispatchEvent(new Event(REVIEW_UPDATED));
      }
    }
    function switchMainTab(t) {
      mainTab.value = t;
      tab.value = "pending";
      page.value = 1;
      load();
    }
    function switchStatus(t) {
      tab.value = t;
      page.value = 1;
      load();
    }
    function approve(r) {
      confirmMessage.value = `通过${r.user_name}的兑换申请？将扣除 ${r.points} 积分`;
      confirmAction.value = async () => {
        var _a;
        processing.value = r.id;
        try {
          const res = await api.post(`/exchange-requests/${r.id}/approve`, {});
          toast.success(`已通过，${r.user_name} 剩余 ${res.newBalance} 分`);
          ws.refreshPendingCount();
          await load();
        } catch (e) {
          const err = (_a = e.payload) == null ? void 0 : _a.error;
          if (err === "already_reviewed") toast.warning("该申请已处理过");
          else if (err === "insufficient_points") toast.error(`${r.user_name} 积分不足`);
          else if (err === "out_of_stock") toast.error("该商品库存已不足，无法通过；请先补货或拒绝本申请");
          else toast.error(e.message);
        } finally {
          processing.value = null;
        }
      };
      confirmOpen.value = true;
    }
    function approveTask(c) {
      confirmMessage.value = `通过${c.user_name}的「${c.task_name}」完成申请？将加 ${c.task_points} 积分`;
      confirmAction.value = async () => {
        var _a;
        processing.value = c.id;
        try {
          const res = await api.post(`/adhoc-tasks/completions/${c.id}/approve`, {});
          toast.success(`已通过，${c.user_name} 当前 ${res.newBalance} 分`);
          await load();
        } catch (e) {
          const err = (_a = e.payload) == null ? void 0 : _a.error;
          if (err === "already_reviewed") toast.warning("该申请已处理过");
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
    function openReject(r) {
      rejecting.value = r;
      rejectOpen.value = true;
    }
    function openTaskReject(c) {
      taskRejecting.value = c;
      taskRejectOpen.value = true;
    }
    async function onTaskRejected() {
      taskRejectOpen.value = false;
      await load();
    }
    async function onRejected() {
      rejectOpen.value = false;
      await load();
    }
    function fmtTime(ts) {
      const d = new Date(ts * 1e3);
      const now = Date.now();
      const diff = now - ts * 1e3;
      if (diff < 6e4) return "刚刚";
      if (diff < 36e5) return `${Math.floor(diff / 6e4)}分钟前`;
      if (diff < 864e5) return `${Math.floor(diff / 36e5)}小时前`;
      return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
    }
    function onNewRequest() {
      if (mainTab.value === "exchange" && tab.value === "pending") load();
    }
    function onTaskSubmitted() {
      if (mainTab.value === "task" && tab.value === "pending") load();
      else toast.info("有新的任务完成申请待审核");
    }
    onMounted(() => {
      load();
      window.addEventListener(WS_EVENTS.newExchangeRequest, onNewRequest);
      window.addEventListener(WS_EVENTS.taskCompletionSubmitted, onTaskSubmitted);
    });
    onUnmounted(() => {
      window.removeEventListener(WS_EVENTS.newExchangeRequest, onNewRequest);
      window.removeEventListener(WS_EVENTS.taskCompletionSubmitted, onTaskSubmitted);
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        _cache[20] || (_cache[20] = createBaseVNode("header", { class: "page-header" }, [
          createBaseVNode("h1", { class: "title" }, "审核中心"),
          createBaseVNode("p", { class: "subtitle" }, "处理小朋友的兑换申请和任务完成申请")
        ], -1)),
        createBaseVNode("div", _hoisted_2, [
          createBaseVNode("button", {
            class: normalizeClass({ active: mainTab.value === "exchange" }),
            onClick: _cache[0] || (_cache[0] = ($event) => switchMainTab("exchange"))
          }, [
            _cache[9] || (_cache[9] = createTextVNode(" 🎁 兑换审核 ", -1)),
            mainTab.value === "exchange" && tab.value === "pending" && requests.value.length ? (openBlock(), createElementBlock("span", _hoisted_3, toDisplayString(requests.value.length), 1)) : createCommentVNode("", true)
          ], 2),
          createBaseVNode("button", {
            class: normalizeClass({ active: mainTab.value === "task" }),
            onClick: _cache[1] || (_cache[1] = ($event) => switchMainTab("task"))
          }, [
            _cache[10] || (_cache[10] = createTextVNode(" 📋 任务审核 ", -1)),
            mainTab.value === "task" && tab.value === "pending" && completions.value.length ? (openBlock(), createElementBlock("span", _hoisted_4, toDisplayString(completions.value.length), 1)) : createCommentVNode("", true)
          ], 2)
        ]),
        createBaseVNode("div", _hoisted_5, [
          createBaseVNode("button", {
            class: normalizeClass({ active: tab.value === "pending" }),
            onClick: _cache[2] || (_cache[2] = ($event) => switchStatus("pending"))
          }, [
            _cache[11] || (_cache[11] = createTextVNode(" 待审核 ", -1)),
            mainTab.value === "exchange" && tab.value === "pending" && requests.value.length ? (openBlock(), createElementBlock("span", _hoisted_6, toDisplayString(requests.value.length), 1)) : mainTab.value === "task" && tab.value === "pending" && completions.value.length ? (openBlock(), createElementBlock("span", _hoisted_7, toDisplayString(completions.value.length), 1)) : createCommentVNode("", true)
          ], 2),
          createBaseVNode("button", {
            class: normalizeClass({ active: tab.value === "approved" }),
            onClick: _cache[3] || (_cache[3] = ($event) => switchStatus("approved"))
          }, "已通过", 2),
          createBaseVNode("button", {
            class: normalizeClass({ active: tab.value === "rejected" }),
            onClick: _cache[4] || (_cache[4] = ($event) => switchStatus("rejected"))
          }, "已拒绝", 2)
        ]),
        mainTab.value === "exchange" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
          !loading.value && requests.value.length === 0 ? (openBlock(), createBlock(EmptyState, {
            key: 0,
            emoji: tab.value === "pending" ? "📭" : tab.value === "approved" ? "✅" : "❌",
            text: tab.value === "pending" ? "没有待审核申请" : tab.value === "approved" ? "还没有通过记录" : "还没有拒绝记录"
          }, null, 8, ["emoji", "text"])) : (openBlock(), createElementBlock("div", _hoisted_8, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(requests.value, (r) => {
              return openBlock(), createBlock(GlassCard, {
                key: r.id,
                padding: "14px 18px",
                class: "card"
              }, {
                default: withCtx(() => [
                  createBaseVNode("div", _hoisted_9, [
                    createBaseVNode("div", _hoisted_10, [
                      createVNode(ZodiacAvatar, {
                        zodiac: r.user_avatar,
                        size: 48
                      }, null, 8, ["zodiac"]),
                      createBaseVNode("div", null, [
                        createBaseVNode("div", _hoisted_11, toDisplayString(r.user_name), 1),
                        createBaseVNode("div", _hoisted_12, toDisplayString(fmtTime(r.created_at)), 1)
                      ])
                    ]),
                    createBaseVNode("div", {
                      class: normalizeClass(["type-tag", r.type])
                    }, [
                      r.type === "product" ? (openBlock(), createElementBlock("span", _hoisted_13, "🎁 商品兑换")) : (openBlock(), createElementBlock("span", _hoisted_14, "💵 现金兑换"))
                    ], 2)
                  ]),
                  createBaseVNode("div", _hoisted_15, [
                    createBaseVNode("div", _hoisted_16, [
                      r.type === "product" ? (openBlock(), createElementBlock("span", _hoisted_17, "商品")) : (openBlock(), createElementBlock("span", _hoisted_18, "兑换金额")),
                      r.type === "product" ? (openBlock(), createElementBlock("span", _hoisted_19, [
                        createVNode(CategoryIcon, {
                          icon: r.product_icon,
                          size: 24
                        }, null, 8, ["icon"]),
                        createTextVNode(" " + toDisplayString(r.product_name || "已删除"), 1)
                      ])) : (openBlock(), createElementBlock("span", _hoisted_20, toDisplayString(r.amount) + " 元", 1))
                    ]),
                    createBaseVNode("div", _hoisted_21, [
                      _cache[12] || (_cache[12] = createBaseVNode("span", { class: "label" }, "消耗积分", -1)),
                      createBaseVNode("span", _hoisted_22, "-" + toDisplayString(r.points) + " 分", 1)
                    ])
                  ]),
                  r.status === "rejected" && r.reason ? (openBlock(), createElementBlock("div", _hoisted_23, [
                    _cache[13] || (_cache[13] = createBaseVNode("span", { class: "emoji" }, "📝", -1)),
                    createBaseVNode("span", null, "拒绝原因：" + toDisplayString(r.reason), 1)
                  ])) : createCommentVNode("", true),
                  r.status === "approved" && r.reviewed_at ? (openBlock(), createElementBlock("div", _hoisted_24, [
                    _cache[14] || (_cache[14] = createBaseVNode("span", { class: "emoji" }, "✅", -1)),
                    createBaseVNode("span", null, "已于 " + toDisplayString(fmtTime(r.reviewed_at)) + " 通过", 1)
                  ])) : createCommentVNode("", true),
                  r.status === "pending" ? (openBlock(), createElementBlock("div", _hoisted_25, [
                    createBaseVNode("button", {
                      class: "btn btn-success small",
                      onClick: ($event) => approve(r),
                      disabled: processing.value === r.id
                    }, toDisplayString(processing.value === r.id ? "处理中..." : "✅ 通过"), 9, _hoisted_26),
                    createBaseVNode("button", {
                      class: "btn btn-danger small",
                      onClick: ($event) => openReject(r)
                    }, "❌ 拒绝", 8, _hoisted_27)
                  ])) : createCommentVNode("", true)
                ]),
                _: 2
              }, 1024);
            }), 128))
          ]))
        ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
          !loading.value && completions.value.length === 0 ? (openBlock(), createBlock(EmptyState, {
            key: 0,
            emoji: tab.value === "pending" ? "📭" : tab.value === "approved" ? "✅" : "❌",
            text: tab.value === "pending" ? "没有待审核任务" : tab.value === "approved" ? "还没有通过记录" : "还没有拒绝记录"
          }, null, 8, ["emoji", "text"])) : (openBlock(), createElementBlock("div", _hoisted_28, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(completions.value, (c) => {
              return openBlock(), createBlock(GlassCard, {
                key: c.id,
                padding: "14px 18px",
                class: "card"
              }, {
                default: withCtx(() => [
                  createBaseVNode("div", _hoisted_29, [
                    createBaseVNode("div", _hoisted_30, [
                      createVNode(ZodiacAvatar, {
                        zodiac: c.user_avatar,
                        size: 48
                      }, null, 8, ["zodiac"]),
                      createBaseVNode("div", null, [
                        createBaseVNode("div", _hoisted_31, toDisplayString(c.user_name), 1),
                        createBaseVNode("div", _hoisted_32, toDisplayString(fmtTime(c.created_at)), 1)
                      ])
                    ]),
                    _cache[15] || (_cache[15] = createBaseVNode("div", { class: "type-tag task" }, [
                      createBaseVNode("span", null, "📋 任务完成")
                    ], -1))
                  ]),
                  createBaseVNode("div", _hoisted_33, [
                    createBaseVNode("div", _hoisted_34, [
                      _cache[16] || (_cache[16] = createBaseVNode("span", { class: "label" }, "任务", -1)),
                      createBaseVNode("span", _hoisted_35, toDisplayString(c.task_name), 1)
                    ]),
                    createBaseVNode("div", _hoisted_36, [
                      _cache[17] || (_cache[17] = createBaseVNode("span", { class: "label" }, "奖励积分", -1)),
                      createBaseVNode("span", _hoisted_37, "+" + toDisplayString(c.task_points) + " 🌟", 1)
                    ])
                  ]),
                  c.status === "rejected" && c.reason ? (openBlock(), createElementBlock("div", _hoisted_38, [
                    _cache[18] || (_cache[18] = createBaseVNode("span", { class: "emoji" }, "📝", -1)),
                    createBaseVNode("span", null, "拒绝原因：" + toDisplayString(c.reason), 1)
                  ])) : createCommentVNode("", true),
                  c.status === "approved" && c.reviewed_at ? (openBlock(), createElementBlock("div", _hoisted_39, [
                    _cache[19] || (_cache[19] = createBaseVNode("span", { class: "emoji" }, "✅", -1)),
                    createBaseVNode("span", null, "已于 " + toDisplayString(fmtTime(c.reviewed_at)) + " 通过", 1)
                  ])) : createCommentVNode("", true),
                  c.status === "pending" ? (openBlock(), createElementBlock("div", _hoisted_40, [
                    createBaseVNode("button", {
                      class: "btn btn-success small",
                      onClick: ($event) => approveTask(c),
                      disabled: processing.value === c.id
                    }, toDisplayString(processing.value === c.id ? "处理中..." : "✅ 通过"), 9, _hoisted_41),
                    createBaseVNode("button", {
                      class: "btn btn-danger small",
                      onClick: ($event) => openTaskReject(c)
                    }, "❌ 拒绝", 8, _hoisted_42)
                  ])) : createCommentVNode("", true)
                ]),
                _: 2
              }, 1024);
            }), 128))
          ]))
        ], 64)),
        tab.value !== "pending" ? (openBlock(), createBlock(Pager, {
          key: 2,
          page: page.value,
          "page-size": unref(PAGE_SIZE),
          total: total.value,
          disabled: loading.value,
          "onUpdate:page": _cache[5] || (_cache[5] = ($event) => load($event))
        }, null, 8, ["page", "page-size", "total", "disabled"])) : createCommentVNode("", true),
        rejecting.value ? (openBlock(), createBlock(RejectModal, {
          key: 3,
          "model-value": rejectOpen.value,
          request: rejecting.value,
          "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => rejectOpen.value = $event),
          onDone: onRejected
        }, null, 8, ["model-value", "request"])) : createCommentVNode("", true),
        taskRejecting.value ? (openBlock(), createBlock(RejectModal, {
          key: 4,
          "model-value": taskRejectOpen.value,
          request: taskRejecting.value,
          endpoint: `/adhoc-tasks/completions/${taskRejecting.value.id}/reject`,
          title: "拒绝任务完成",
          hint: `拒绝后，${taskRejecting.value.user_name} 可以重新提交完成申请`,
          placeholder: "如：看起来还没做完 / 请重新整理一遍",
          "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => taskRejectOpen.value = $event),
          onDone: onTaskRejected
        }, null, 8, ["model-value", "request", "endpoint", "hint"])) : createCommentVNode("", true),
        createVNode(ConfirmDialog, {
          modelValue: confirmOpen.value,
          "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => confirmOpen.value = $event),
          title: "确认通过",
          message: confirmMessage.value,
          confirmText: "通过",
          onConfirm: runConfirm
        }, null, 8, ["modelValue", "message"])
      ]);
    };
  }
});
const Review = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-d8b498e0"]]);
export {
  Review as default
};
