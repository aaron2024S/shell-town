import { d as defineComponent, a as useToastStore, w as watch, q as createBlock, p as withCtx, y as computed, k as openBlock, b as createBaseVNode, c as createElementBlock, x as createTextVNode, F as Fragment, r as renderList, n as normalizeClass, m as createVNode, t as toDisplayString, f as createCommentVNode, h as withDirectives, v as vModelText, H as vModelCheckbox, i as ref, z as api, _ as _export_sfc, o as onMounted, W as WS_EVENTS, B as onUnmounted, R as REVIEW_UPDATED, e as unref } from "./index-DLtaHw3I.js";
import { G as GlassCard } from "./GlassCard-DXR0hosh.js";
import { E as EmptyState } from "./EmptyState-3g4kc4Z_.js";
import { Z as ZodiacAvatar } from "./ZodiacAvatar-BgUFKiIx.js";
import { M as Modal } from "./Modal-DiJeCwYw.js";
import { C as ConfirmDialog } from "./ConfirmDialog-BWQPEwj0.js";
import { L as LIST_PAGE_SIZE, P as Pager } from "./Pager-gbjjgpVA.js";
const _hoisted_1$2 = { class: "form" };
const _hoisted_2$2 = { class: "field" };
const _hoisted_3$2 = { class: "label" };
const _hoisted_4$2 = { class: "child-grid" };
const _hoisted_5$2 = ["onClick"];
const _hoisted_6$2 = {
  key: 0,
  class: "check"
};
const _hoisted_7$2 = {
  key: 0,
  class: "hint"
};
const _hoisted_8$2 = {
  key: 1,
  class: "hint"
};
const _hoisted_9$2 = { class: "field" };
const _hoisted_10$2 = { class: "field" };
const _hoisted_11$2 = { class: "field" };
const _hoisted_12$2 = { class: "field" };
const _hoisted_13$2 = { class: "label" };
const _hoisted_14$2 = {
  key: 0,
  class: "deadline-row"
};
const _hoisted_15$2 = {
  key: 1,
  class: "hint"
};
const _hoisted_16$2 = ["disabled"];
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "AdhocTaskEditor",
  props: {
    modelValue: { type: Boolean },
    task: {},
    children: {}
  },
  emits: ["update:modelValue", "saved"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const toast = useToastStore();
    const isEdit = computed(() => !!props.task);
    const name = ref("");
    const description = ref("");
    const points = ref(10);
    const assigneeIds = ref([]);
    const deadlineEnabled = ref(false);
    const deadlineDate = ref("");
    const deadlineTime = ref("");
    const saving = ref(false);
    function localDateStr(d) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    function defaultDeadline() {
      const now = /* @__PURE__ */ new Date();
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22, 0, 0);
      if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
      return {
        date: localDateStr(target),
        time: `${String(target.getHours()).padStart(2, "0")}:${String(target.getMinutes()).padStart(2, "0")}`
      };
    }
    watch(() => props.modelValue, (open) => {
      if (!open) return;
      if (props.task) {
        name.value = props.task.name;
        description.value = props.task.description ?? "";
        points.value = props.task.points;
        assigneeIds.value = props.task.user_id ? [props.task.user_id] : [];
        if (props.task.deadline) {
          deadlineEnabled.value = true;
          const d = new Date(props.task.deadline * 1e3);
          deadlineDate.value = localDateStr(d);
          deadlineTime.value = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        } else {
          deadlineEnabled.value = false;
          const def = defaultDeadline();
          deadlineDate.value = def.date;
          deadlineTime.value = def.time;
        }
      } else {
        name.value = "";
        description.value = "";
        points.value = 10;
        assigneeIds.value = [];
        deadlineEnabled.value = false;
        const def = defaultDeadline();
        deadlineDate.value = def.date;
        deadlineTime.value = def.time;
      }
    }, { immediate: true });
    function toggleAssignee(id) {
      if (isEdit.value) {
        assigneeIds.value = [id];
        return;
      }
      const idx = assigneeIds.value.indexOf(id);
      if (idx >= 0) assigneeIds.value.splice(idx, 1);
      else assigneeIds.value.push(id);
    }
    async function save() {
      var _a, _b;
      if (!name.value.trim()) return toast.warning("请输入任务名称");
      if (assigneeIds.value.length === 0) {
        return toast.warning(isEdit.value ? "请选择任务归属的小朋友" : "请至少选择一个小朋友");
      }
      let deadline;
      if (deadlineEnabled.value && deadlineDate.value) {
        const dt = /* @__PURE__ */ new Date(`${deadlineDate.value}T${deadlineTime.value || "23:59"}:00`);
        deadline = Math.floor(dt.getTime() / 1e3);
      } else if (!isEdit.value) {
        deadline = void 0;
      } else {
        deadline = null;
      }
      saving.value = true;
      try {
        const editingTask = props.task;
        if (editingTask) {
          await api.patch(`/adhoc-tasks/${editingTask.id}`, {
            name: name.value.trim(),
            description: description.value.trim() || null,
            points: points.value,
            deadline: deadline ?? null,
            // 改派给选中的小朋友（服务端在已有完成申请时会拒绝并给出提示）
            userId: assigneeIds.value[0]
          });
          toast.success("已更新任务");
        } else {
          await api.post("/adhoc-tasks", {
            name: name.value.trim(),
            description: description.value.trim() || void 0,
            points: points.value,
            deadline,
            assigneeIds: assigneeIds.value
          });
          toast.success(`任务发布成功，共 ${assigneeIds.value.length} 条 🎉`);
        }
        emit("saved");
      } catch (e) {
        if (((_a = e == null ? void 0 : e.payload) == null ? void 0 : _a.error) === "has_completion") toast.error("这个任务已经有完成申请了，不能改派给别人");
        else toast.error(((_b = e.payload) == null ? void 0 : _b.detail) || e.message || "保存失败");
      } finally {
        saving.value = false;
      }
    }
    return (_ctx, _cache) => {
      return openBlock(), createBlock(Modal, {
        "model-value": __props.modelValue,
        title: isEdit.value ? "编辑任务" : "任务发布",
        "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => emit("update:modelValue", $event))
      }, {
        footer: withCtx(() => [
          _cache[12] || (_cache[12] = createBaseVNode("span", { style: { "flex": "1" } }, null, -1)),
          createBaseVNode("button", {
            class: "btn btn-ghost",
            onClick: _cache[6] || (_cache[6] = ($event) => emit("update:modelValue", false))
          }, "取消"),
          createBaseVNode("button", {
            class: "btn btn-primary",
            onClick: save,
            disabled: saving.value
          }, toDisplayString(saving.value ? "保存中..." : isEdit.value ? "保存" : "发布"), 9, _hoisted_16$2)
        ]),
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1$2, [
            createBaseVNode("div", _hoisted_2$2, [
              createBaseVNode("label", _hoisted_3$2, [
                isEdit.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createTextVNode("归属小朋友（一条任务对应一个孩子）")
                ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                  createTextVNode("选择小朋友（可多选，每人生成一条任务）")
                ], 64))
              ]),
              createBaseVNode("div", _hoisted_4$2, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(__props.children, (c) => {
                  return openBlock(), createElementBlock("button", {
                    key: c.id,
                    type: "button",
                    class: normalizeClass(["child-chip", { active: assigneeIds.value.includes(c.id) }]),
                    onClick: ($event) => toggleAssignee(c.id)
                  }, [
                    createVNode(ZodiacAvatar, {
                      zodiac: c.avatar,
                      size: 56
                    }, null, 8, ["zodiac"]),
                    createBaseVNode("span", null, toDisplayString(c.name), 1),
                    assigneeIds.value.includes(c.id) ? (openBlock(), createElementBlock("span", _hoisted_6$2, "✓")) : createCommentVNode("", true)
                  ], 10, _hoisted_5$2);
                }), 128))
              ]),
              __props.children.length === 0 ? (openBlock(), createElementBlock("p", _hoisted_7$2, "还没有小朋友，先去总览页创建")) : isEdit.value ? (openBlock(), createElementBlock("p", _hoisted_8$2, "改派后任务会移到另一个小朋友名下；已有完成申请的任务不能改派")) : createCommentVNode("", true)
            ]),
            createBaseVNode("div", _hoisted_9$2, [
              _cache[8] || (_cache[8] = createBaseVNode("label", { class: "label" }, "任务名称", -1)),
              withDirectives(createBaseVNode("input", {
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => name.value = $event),
                type: "text",
                maxlength: "50",
                placeholder: "如：整理书桌"
              }, null, 512), [
                [vModelText, name.value]
              ])
            ]),
            createBaseVNode("div", _hoisted_10$2, [
              _cache[9] || (_cache[9] = createBaseVNode("label", { class: "label" }, "任务描述（可选）", -1)),
              withDirectives(createBaseVNode("textarea", {
                "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => description.value = $event),
                maxlength: "200",
                rows: "2",
                placeholder: "任务详情..."
              }, null, 512), [
                [vModelText, description.value]
              ])
            ]),
            createBaseVNode("div", _hoisted_11$2, [
              _cache[10] || (_cache[10] = createBaseVNode("label", { class: "label" }, "奖励积分 🌟", -1)),
              withDirectives(createBaseVNode("input", {
                "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => points.value = $event),
                type: "number",
                min: "1",
                max: "999"
              }, null, 512), [
                [
                  vModelText,
                  points.value,
                  void 0,
                  { number: true }
                ]
              ])
            ]),
            createBaseVNode("div", _hoisted_12$2, [
              createBaseVNode("label", _hoisted_13$2, [
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => deadlineEnabled.value = $event),
                  type: "checkbox",
                  class: "checkbox"
                }, null, 512), [
                  [vModelCheckbox, deadlineEnabled.value]
                ]),
                _cache[11] || (_cache[11] = createTextVNode(" 截止时间 ", -1))
              ]),
              deadlineEnabled.value ? (openBlock(), createElementBlock("div", _hoisted_14$2, [
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => deadlineDate.value = $event),
                  type: "date",
                  class: "date-input"
                }, null, 512), [
                  [vModelText, deadlineDate.value]
                ]),
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => deadlineTime.value = $event),
                  type: "time",
                  class: "time-input"
                }, null, 512), [
                  [vModelText, deadlineTime.value]
                ])
              ])) : createCommentVNode("", true),
              deadlineEnabled.value ? (openBlock(), createElementBlock("p", _hoisted_15$2, "到期后任务会自动结束，并从孩子的任务列表中移除")) : createCommentVNode("", true)
            ])
          ])
        ]),
        _: 1
      }, 8, ["model-value", "title"]);
    };
  }
});
const AdhocTaskEditor = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__scopeId", "data-v-e3e8bed4"]]);
const _hoisted_1$1 = { class: "form" };
const _hoisted_2$1 = { class: "field" };
const _hoisted_3$1 = { class: "child-grid" };
const _hoisted_4$1 = ["onClick"];
const _hoisted_5$1 = {
  key: 0,
  class: "check"
};
const _hoisted_6$1 = {
  key: 0,
  class: "hint"
};
const _hoisted_7$1 = { class: "field" };
const _hoisted_8$1 = { class: "field" };
const _hoisted_9$1 = { class: "field" };
const _hoisted_10$1 = { class: "field" };
const _hoisted_11$1 = { class: "freq-row" };
const _hoisted_12$1 = {
  key: 0,
  class: "pick-row"
};
const _hoisted_13$1 = ["onClick"];
const _hoisted_14$1 = {
  key: 1,
  class: "pick-row wrap"
};
const _hoisted_15$1 = ["onClick"];
const _hoisted_16$1 = { class: "field" };
const _hoisted_17$1 = { class: "freq-row" };
const _hoisted_18$1 = {
  key: 0,
  class: "time-row"
};
const _hoisted_19$1 = { class: "time-hint" };
const _hoisted_20$1 = { class: "hint" };
const _hoisted_21$1 = { class: "field" };
const _hoisted_22$1 = { class: "freq-row" };
const _hoisted_23$1 = {
  key: 0,
  class: "time-row"
};
const _hoisted_24$1 = { class: "hint" };
const _hoisted_25$1 = {
  key: 1,
  class: "hint"
};
const _hoisted_26$1 = ["disabled"];
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "RecurringTaskEditor",
  props: {
    modelValue: { type: Boolean },
    rule: {},
    children: {}
  },
  emits: ["update:modelValue", "saved"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const toast = useToastStore();
    const isEdit = computed(() => !!props.rule);
    const name = ref("");
    const description = ref("");
    const points = ref(5);
    const userIds = ref([]);
    const freq = ref("daily");
    const weekdays = ref([]);
    const monthdays = ref([]);
    const timeMode = ref("anytime");
    const timeOfDay = ref("08:00");
    const dueMode = ref("off");
    const dueHours = ref(24);
    const saving = ref(false);
    const WEEK_LABELS = ["一", "二", "三", "四", "五", "六", "日"];
    watch(() => props.modelValue, (open) => {
      if (open) {
        if (props.rule) {
          name.value = props.rule.name;
          description.value = props.rule.description ?? "";
          points.value = props.rule.points;
          userIds.value = [...props.rule.userIds ?? (props.rule.userId ? [props.rule.userId] : [])];
          freq.value = props.rule.freq;
          weekdays.value = [...props.rule.weekdays ?? []];
          monthdays.value = [...props.rule.monthdays ?? []];
          timeMode.value = props.rule.timeOfDay ? "exact" : "anytime";
          timeOfDay.value = props.rule.timeOfDay ?? "08:00";
          dueMode.value = props.rule.dueHours != null ? "hours" : "off";
          dueHours.value = props.rule.dueHours ?? 24;
        } else {
          name.value = "";
          description.value = "";
          points.value = 5;
          userIds.value = props.children.length === 1 ? [props.children[0].id] : [];
          freq.value = "daily";
          weekdays.value = [];
          monthdays.value = [];
          timeMode.value = "anytime";
          timeOfDay.value = "08:00";
          dueMode.value = "off";
          dueHours.value = 24;
        }
      }
    }, { immediate: true });
    function toggleChild(id) {
      const i = userIds.value.indexOf(id);
      if (i >= 0) userIds.value.splice(i, 1);
      else userIds.value.push(id);
    }
    function toggleWeekday(d) {
      const i = weekdays.value.indexOf(d);
      if (i >= 0) weekdays.value.splice(i, 1);
      else weekdays.value.push(d);
    }
    function toggleMonthday(d) {
      const i = monthdays.value.indexOf(d);
      if (i >= 0) monthdays.value.splice(i, 1);
      else monthdays.value.push(d);
    }
    async function save() {
      var _a;
      if (!name.value.trim()) return toast.warning("请输入任务名称");
      if (userIds.value.length === 0) return toast.warning("请至少选择一个小朋友");
      if (freq.value === "weekly" && weekdays.value.length === 0) return toast.warning("请选择重复的星期");
      if (freq.value === "monthly" && monthdays.value.length === 0) return toast.warning("请选择重复的日期");
      if (timeMode.value === "exact" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(timeOfDay.value)) {
        return toast.warning("请选择有效的发布时间");
      }
      if (dueMode.value === "hours" && (!Number.isInteger(dueHours.value) || dueHours.value < 1 || dueHours.value > 720)) {
        return toast.warning("截止时长需为 1~720 的整数小时");
      }
      const payload = {
        name: name.value.trim(),
        description: description.value.trim() || null,
        points: points.value,
        userIds: [...userIds.value].sort((a, b) => a - b),
        freq: freq.value,
        weekdays: freq.value === "weekly" ? [...weekdays.value].sort((a, b) => a - b) : null,
        monthdays: freq.value === "monthly" ? [...monthdays.value].sort((a, b) => a - b) : null,
        timeOfDay: timeMode.value === "exact" ? timeOfDay.value : null,
        dueHours: dueMode.value === "hours" ? dueHours.value : null
      };
      saving.value = true;
      try {
        if (isEdit.value) {
          const res = await api.patch(`/recurring-tasks/${props.rule.id}`, payload);
          toast.success(res.generated > 0 ? "周期任务已更新，今天这一期已发布 🎉" : "周期任务已更新");
        } else {
          const res = await api.post("/recurring-tasks", payload);
          toast.success(res.generated > 0 ? "周期任务已创建，今天的一期已发布 🎉" : "周期任务已创建，到了时间会自动发布 🎉");
        }
        emit("saved");
      } catch (e) {
        const detail = (_a = e == null ? void 0 : e.payload) == null ? void 0 : _a.detail;
        toast.error(detail || e.message || "保存失败");
      } finally {
        saving.value = false;
      }
    }
    return (_ctx, _cache) => {
      return openBlock(), createBlock(Modal, {
        "model-value": __props.modelValue,
        title: isEdit.value ? "编辑周期任务" : "周期任务",
        "onUpdate:modelValue": _cache[13] || (_cache[13] = ($event) => emit("update:modelValue", $event))
      }, {
        footer: withCtx(() => [
          _cache[23] || (_cache[23] = createBaseVNode("span", { style: { "flex": "1" } }, null, -1)),
          createBaseVNode("button", {
            class: "btn btn-ghost",
            onClick: _cache[12] || (_cache[12] = ($event) => emit("update:modelValue", false))
          }, "取消"),
          createBaseVNode("button", {
            class: "btn btn-primary",
            onClick: save,
            disabled: saving.value
          }, toDisplayString(saving.value ? "保存中..." : isEdit.value ? "保存" : "创建"), 9, _hoisted_26$1)
        ]),
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1$1, [
            createBaseVNode("div", _hoisted_2$1, [
              _cache[14] || (_cache[14] = createBaseVNode("label", { class: "label" }, "选择小朋友（可多选）", -1)),
              createBaseVNode("div", _hoisted_3$1, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(__props.children, (c) => {
                  return openBlock(), createElementBlock("button", {
                    key: c.id,
                    type: "button",
                    class: normalizeClass(["child-chip", { active: userIds.value.includes(c.id) }]),
                    onClick: ($event) => toggleChild(c.id)
                  }, [
                    createVNode(ZodiacAvatar, {
                      zodiac: c.avatar,
                      size: 56
                    }, null, 8, ["zodiac"]),
                    createBaseVNode("span", null, toDisplayString(c.name), 1),
                    userIds.value.includes(c.id) ? (openBlock(), createElementBlock("span", _hoisted_5$1, "✓")) : createCommentVNode("", true)
                  ], 10, _hoisted_4$1);
                }), 128))
              ]),
              userIds.value.length > 1 ? (openBlock(), createElementBlock("p", _hoisted_6$1, "已选 " + toDisplayString(userIds.value.length) + " 位，会分别给每人各发一条任务", 1)) : createCommentVNode("", true)
            ]),
            createBaseVNode("div", _hoisted_7$1, [
              _cache[15] || (_cache[15] = createBaseVNode("label", { class: "label" }, "任务名称", -1)),
              withDirectives(createBaseVNode("input", {
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => name.value = $event),
                type: "text",
                maxlength: "50",
                placeholder: "如：叠被子"
              }, null, 512), [
                [vModelText, name.value]
              ])
            ]),
            createBaseVNode("div", _hoisted_8$1, [
              _cache[16] || (_cache[16] = createBaseVNode("label", { class: "label" }, "任务描述（可选）", -1)),
              withDirectives(createBaseVNode("textarea", {
                "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => description.value = $event),
                maxlength: "200",
                rows: "2",
                placeholder: "任务详情..."
              }, null, 512), [
                [vModelText, description.value]
              ])
            ]),
            createBaseVNode("div", _hoisted_9$1, [
              _cache[17] || (_cache[17] = createBaseVNode("label", { class: "label" }, "奖励积分 🌟（每期）", -1)),
              withDirectives(createBaseVNode("input", {
                "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => points.value = $event),
                type: "number",
                min: "1",
                max: "999"
              }, null, 512), [
                [
                  vModelText,
                  points.value,
                  void 0,
                  { number: true }
                ]
              ])
            ]),
            createBaseVNode("div", _hoisted_10$1, [
              _cache[18] || (_cache[18] = createBaseVNode("label", { class: "label" }, "重复频率", -1)),
              createBaseVNode("div", _hoisted_11$1, [
                createBaseVNode("button", {
                  type: "button",
                  class: normalizeClass(["freq-btn", { active: freq.value === "daily" }]),
                  onClick: _cache[3] || (_cache[3] = ($event) => freq.value = "daily")
                }, "每天", 2),
                createBaseVNode("button", {
                  type: "button",
                  class: normalizeClass(["freq-btn", { active: freq.value === "weekly" }]),
                  onClick: _cache[4] || (_cache[4] = ($event) => freq.value = "weekly")
                }, "每周", 2),
                createBaseVNode("button", {
                  type: "button",
                  class: normalizeClass(["freq-btn", { active: freq.value === "monthly" }]),
                  onClick: _cache[5] || (_cache[5] = ($event) => freq.value = "monthly")
                }, "每月", 2)
              ]),
              freq.value === "weekly" ? (openBlock(), createElementBlock("div", _hoisted_12$1, [
                (openBlock(), createElementBlock(Fragment, null, renderList(WEEK_LABELS, (lbl, i) => {
                  return createBaseVNode("button", {
                    key: i,
                    type: "button",
                    class: normalizeClass(["pick-chip", { active: weekdays.value.includes(i + 1) }]),
                    onClick: ($event) => toggleWeekday(i + 1)
                  }, "周" + toDisplayString(lbl), 11, _hoisted_13$1);
                }), 64))
              ])) : createCommentVNode("", true),
              freq.value === "monthly" ? (openBlock(), createElementBlock("div", _hoisted_14$1, [
                (openBlock(), createElementBlock(Fragment, null, renderList(31, (d) => {
                  return createBaseVNode("button", {
                    key: d,
                    type: "button",
                    class: normalizeClass(["pick-chip", "mini", { active: monthdays.value.includes(d) }]),
                    onClick: ($event) => toggleMonthday(d)
                  }, toDisplayString(d), 11, _hoisted_15$1);
                }), 64))
              ])) : createCommentVNode("", true)
            ]),
            createBaseVNode("div", _hoisted_16$1, [
              _cache[19] || (_cache[19] = createBaseVNode("label", { class: "label" }, "发布时间", -1)),
              createBaseVNode("div", _hoisted_17$1, [
                createBaseVNode("button", {
                  type: "button",
                  class: normalizeClass(["freq-btn", { active: timeMode.value === "anytime" }]),
                  onClick: _cache[6] || (_cache[6] = ($event) => timeMode.value = "anytime")
                }, "当天即发", 2),
                createBaseVNode("button", {
                  type: "button",
                  class: normalizeClass(["freq-btn", { active: timeMode.value === "exact" }]),
                  onClick: _cache[7] || (_cache[7] = ($event) => timeMode.value = "exact")
                }, "指定时间点", 2)
              ]),
              timeMode.value === "exact" ? (openBlock(), createElementBlock("div", _hoisted_18$1, [
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => timeOfDay.value = $event),
                  type: "time",
                  class: "time-input"
                }, null, 512), [
                  [vModelText, timeOfDay.value]
                ]),
                createBaseVNode("span", _hoisted_19$1, "到 " + toDisplayString(timeOfDay.value) + " 自动发布（服务器时间）", 1)
              ])) : createCommentVNode("", true),
              createBaseVNode("p", _hoisted_20$1, toDisplayString(timeMode.value === "exact" ? "到点后由调度器发布（每分钟检查一次，最多晚 1 分钟）；停机期间错过的，重启后会当天补发。" : "当天首次调度检查时发布（不限具体时刻）。"), 1),
              _cache[20] || (_cache[20] = createBaseVNode("p", { class: "hint" }, "到了日子会自动发布一期任务，完成后孩子正常提交、你正常审核。", -1))
            ]),
            createBaseVNode("div", _hoisted_21$1, [
              _cache[22] || (_cache[22] = createBaseVNode("label", { class: "label" }, "截止时间", -1)),
              createBaseVNode("div", _hoisted_22$1, [
                createBaseVNode("button", {
                  type: "button",
                  class: normalizeClass(["freq-btn", { active: dueMode.value === "off" }]),
                  onClick: _cache[9] || (_cache[9] = ($event) => dueMode.value = "off")
                }, "不设截止", 2),
                createBaseVNode("button", {
                  type: "button",
                  class: normalizeClass(["freq-btn", { active: dueMode.value === "hours" }]),
                  onClick: _cache[10] || (_cache[10] = ($event) => dueMode.value = "hours")
                }, "发布后限时", 2)
              ]),
              dueMode.value === "hours" ? (openBlock(), createElementBlock("div", _hoisted_23$1, [
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => dueHours.value = $event),
                  type: "number",
                  min: "1",
                  max: "720",
                  class: "time-input"
                }, null, 512), [
                  [
                    vModelText,
                    dueHours.value,
                    void 0,
                    { number: true }
                  ]
                ]),
                _cache[21] || (_cache[21] = createBaseVNode("span", { class: "time-hint" }, "小时内完成（1~720）", -1))
              ])) : createCommentVNode("", true),
              createBaseVNode("p", _hoisted_24$1, toDisplayString(dueMode.value === "hours" ? `每期发布后 ${dueHours.value} 小时内完成，逾期后任务会自动结束并从孩子的任务列表中移除。` : "不设截止，任务一直有效直到完成。"), 1),
              dueMode.value === "hours" ? (openBlock(), createElementBlock("p", _hoisted_25$1, "允许跨期：若截止晚于下一期发布，两期任务会短暂并存，各自独立完成与计分。")) : createCommentVNode("", true)
            ])
          ])
        ]),
        _: 1
      }, 8, ["model-value", "title"]);
    };
  }
});
const RecurringTaskEditor = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-76bb0dbc"]]);
const _hoisted_1 = { class: "page" };
const _hoisted_2 = { class: "page-header" };
const _hoisted_3 = { class: "header-btns" };
const _hoisted_4 = {
  key: 0,
  class: "rules-section"
};
const _hoisted_5 = { class: "rule-main" };
const _hoisted_6 = { class: "rule-avatars" };
const _hoisted_7 = { class: "rule-info" };
const _hoisted_8 = { class: "rule-name" };
const _hoisted_9 = {
  key: 0,
  class: "rule-badge off"
};
const _hoisted_10 = {
  key: 1,
  class: "rule-badge due"
};
const _hoisted_11 = { class: "rule-meta" };
const _hoisted_12 = { key: 1 };
const _hoisted_13 = { class: "rule-actions" };
const _hoisted_14 = ["onClick"];
const _hoisted_15 = ["onClick"];
const _hoisted_16 = ["onClick"];
const _hoisted_17 = ["onClick"];
const _hoisted_18 = { class: "tabs" };
const _hoisted_19 = {
  key: 2,
  class: "task-list"
};
const _hoisted_20 = { class: "task-head" };
const _hoisted_21 = { class: "user-info" };
const _hoisted_22 = { class: "user-name" };
const _hoisted_23 = { class: "points-tag" };
const _hoisted_24 = { class: "task-name" };
const _hoisted_25 = {
  key: 0,
  class: "task-desc"
};
const _hoisted_26 = { class: "task-meta" };
const _hoisted_27 = { class: "meta-item" };
const _hoisted_28 = {
  key: 1,
  class: "rejected-box"
};
const _hoisted_29 = { class: "actions" };
const _hoisted_30 = ["onClick"];
const _hoisted_31 = {
  key: 1,
  class: "done-text"
};
const _hoisted_32 = ["onClick"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Tasks",
  setup(__props) {
    const toast = useToastStore();
    function onWsEvent() {
      load();
    }
    onMounted(() => {
      window.addEventListener(WS_EVENTS.taskCompletionSubmitted, onWsEvent);
      window.addEventListener(WS_EVENTS.taskReview, onWsEvent);
      load();
    });
    onUnmounted(() => {
      window.removeEventListener(WS_EVENTS.taskCompletionSubmitted, onWsEvent);
      window.removeEventListener(WS_EVENTS.taskReview, onWsEvent);
    });
    const tasks = ref([]);
    const children = ref([]);
    const tab = ref("active");
    const loading = ref(true);
    const page = ref(1);
    const total = ref(0);
    const editorOpen = ref(false);
    const editingTask = ref(null);
    const deleteTarget = ref(null);
    const rules = ref([]);
    const recEditorOpen = ref(false);
    const editingRule = ref(null);
    const deleteRuleTarget = ref(null);
    const WEEK_LABELS = ["一", "二", "三", "四", "五", "六", "日"];
    function ruleFreqText(r) {
      const time = r.timeOfDay ? `${r.timeOfDay} 发布` : "当天即发";
      if (r.freq === "weekly") return `每周 · ${r.weekdays.map((d) => WEEK_LABELS[d - 1]).join("、")} · ${time}`;
      if (r.freq === "monthly") return `每月 ${r.monthdays.join("/")} 号 · ${time}`;
      return `每天 · ${time}`;
    }
    function ruleChildNames(r) {
      const list = r.children ?? [];
      if (list.length === 0) return r.userName ?? "";
      return list.map((c) => c.name).join("、");
    }
    async function load(p = page.value) {
      loading.value = true;
      try {
        const [taskRes, childRes, ruleRes] = await Promise.all([
          api.get(
            `/adhoc-tasks?status=${tab.value}&limit=${LIST_PAGE_SIZE}&offset=${(p - 1) * LIST_PAGE_SIZE}`
          ),
          api.get("/children"),
          api.get("/recurring-tasks")
        ]);
        if (taskRes.tasks.length === 0 && p > 1) {
          const retry = await api.get(
            `/adhoc-tasks?status=${tab.value}&limit=${LIST_PAGE_SIZE}&offset=${(p - 2) * LIST_PAGE_SIZE}`
          );
          tasks.value = retry.tasks;
          total.value = retry.total;
          page.value = p - 1;
        } else {
          tasks.value = taskRes.tasks;
          total.value = taskRes.total;
          page.value = p;
        }
        children.value = childRes.children;
        rules.value = ruleRes.rules;
      } finally {
        loading.value = false;
        window.dispatchEvent(new Event(REVIEW_UPDATED));
      }
    }
    function switchTab(next) {
      if (tab.value === next) return;
      tab.value = next;
      void load(1);
    }
    async function toggleRule(r) {
      try {
        await api.patch(`/recurring-tasks/${r.id}`, { active: !r.active });
        r.active = !r.active;
        toast.success(r.active ? "已启用，到期自动发布" : "已暂停");
      } catch (e) {
        toast.error(e.message || "操作失败");
      }
    }
    async function rerunRule(r) {
      try {
        const res = await api.post(`/recurring-tasks/${r.id}/run`);
        toast.success(res.generated > 0 ? res.generated > 1 ? `已补发今天的任务（${res.generated} 位小朋友）` : "已补发今天的任务" : "今天这一期已经发过了");
        await load();
      } catch (e) {
        toast.error(e.message || "补发失败");
      }
    }
    async function removeRule(r) {
      try {
        await api.delete(`/recurring-tasks/${r.id}`);
        toast.success("周期任务已删除（已生成的任务保留）");
        await load();
      } catch (e) {
        toast.error(e.message || "删除失败");
      }
    }
    function openEditor(task) {
      editingTask.value = task ?? null;
      editorOpen.value = true;
    }
    async function onSaved() {
      editorOpen.value = false;
      await load();
    }
    async function remove(task) {
      try {
        await api.delete(`/adhoc-tasks/${task.id}`);
        toast.success("已删除");
        await load();
      } catch (e) {
        toast.error(e.message || "删除失败");
      }
    }
    function fmtDeadline(ts) {
      if (!ts) return "无截止";
      const d = new Date(ts * 1e3);
      const now = Date.now();
      const diff = ts * 1e3 - now;
      if (diff < 0) {
        return `已超时 ${Math.abs(Math.floor(diff / 36e5))}小时`;
      }
      if (diff < 864e5) {
        return `今日 ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
      }
      return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
    }
    function fmtCompleted(t) {
      if (!t.completed_at) return "—";
      const d = new Date(t.completed_at * 1e3);
      const hh = d.getHours().toString().padStart(2, "0");
      const mm = d.getMinutes().toString().padStart(2, "0");
      const now = /* @__PURE__ */ new Date();
      const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
      const time = sameDay ? `今日 ${hh}:${mm}` : `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
      if (t.deadline && t.completed_at > t.deadline) {
        const diffSec = t.completed_at - t.deadline;
        const hours = Math.floor(diffSec / 3600);
        const overdue = hours >= 1 ? `超时 ${hours} 小时` : `超时 ${Math.floor(diffSec / 60)} 分钟`;
        return `${time}（${overdue}）`;
      }
      return time;
    }
    function statusText(t) {
      if (tab.value === "completed") return "✅ 已完成";
      if (tab.value === "expired") return "⏰ 已超时";
      if (t.completion_status === "pending") return "⏳ 待审核";
      if (t.completion_status === "rejected") return "❌ 被拒绝";
      return "🟢 进行中";
    }
    function lastStatusText(s) {
      if (s === "completed") return "已完成";
      if (s === "voided") return "已作废";
      return "进行中";
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("header", _hoisted_2, [
          _cache[12] || (_cache[12] = createBaseVNode("div", null, [
            createBaseVNode("h1", { class: "title" }, "任务发布"),
            createBaseVNode("p", { class: "subtitle" }, "发布任务给小朋友完成")
          ], -1)),
          createBaseVNode("div", _hoisted_3, [
            createBaseVNode("button", {
              class: "btn btn-ghost",
              onClick: _cache[0] || (_cache[0] = ($event) => {
                editingRule.value = null;
                recEditorOpen.value = true;
              })
            }, "🔄 周期任务"),
            createBaseVNode("button", {
              class: "btn btn-primary",
              onClick: _cache[1] || (_cache[1] = ($event) => openEditor())
            }, "＋ 发布")
          ])
        ]),
        rules.value.length > 0 ? (openBlock(), createElementBlock("div", _hoisted_4, [
          _cache[13] || (_cache[13] = createBaseVNode("div", { class: "rules-head" }, "🔄 周期任务（到点自动发布，无需重复添加）", -1)),
          (openBlock(true), createElementBlock(Fragment, null, renderList(rules.value, (r) => {
            return openBlock(), createBlock(GlassCard, {
              key: r.id,
              padding: "12px 16px",
              class: "rule-card"
            }, {
              default: withCtx(() => [
                createBaseVNode("div", _hoisted_5, [
                  createBaseVNode("span", _hoisted_6, [
                    (openBlock(true), createElementBlock(Fragment, null, renderList((r.children ?? []).slice(0, 4), (c) => {
                      return openBlock(), createBlock(ZodiacAvatar, {
                        key: c.id,
                        zodiac: c.avatar,
                        size: 32
                      }, null, 8, ["zodiac"]);
                    }), 128))
                  ]),
                  createBaseVNode("div", _hoisted_7, [
                    createBaseVNode("div", _hoisted_8, [
                      createTextVNode(toDisplayString(r.name) + " ", 1),
                      !r.active ? (openBlock(), createElementBlock("span", _hoisted_9, "已暂停")) : r.dueToday ? (openBlock(), createElementBlock("span", _hoisted_10, "今日该发")) : createCommentVNode("", true)
                    ]),
                    createBaseVNode("div", _hoisted_11, [
                      createTextVNode(toDisplayString(ruleFreqText(r)) + " · +" + toDisplayString(r.points) + " 🌟 · " + toDisplayString(ruleChildNames(r)), 1),
                      r.dueHours ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                        createTextVNode(" · ⏰发布后" + toDisplayString(r.dueHours) + "小时截止", 1)
                      ], 64)) : createCommentVNode("", true),
                      r.lastGenerated ? (openBlock(), createElementBlock("span", _hoisted_12, " · 上期 " + toDisplayString(r.lastGenerated.date) + "（" + toDisplayString(lastStatusText(r.lastGenerated.status)) + "）", 1)) : createCommentVNode("", true)
                    ])
                  ])
                ]),
                createBaseVNode("div", _hoisted_13, [
                  createBaseVNode("button", {
                    class: "btn btn-ghost small",
                    onClick: ($event) => rerunRule(r)
                  }, "补发今日", 8, _hoisted_14),
                  createBaseVNode("button", {
                    class: "btn btn-ghost small",
                    onClick: ($event) => {
                      editingRule.value = r;
                      recEditorOpen.value = true;
                    }
                  }, "编辑", 8, _hoisted_15),
                  createBaseVNode("button", {
                    class: "btn btn-ghost small",
                    onClick: ($event) => toggleRule(r)
                  }, toDisplayString(r.active ? "暂停" : "启用"), 9, _hoisted_16),
                  createBaseVNode("button", {
                    class: "btn btn-ghost small danger",
                    onClick: ($event) => deleteRuleTarget.value = r
                  }, "删除", 8, _hoisted_17)
                ])
              ]),
              _: 2
            }, 1024);
          }), 128))
        ])) : createCommentVNode("", true),
        createBaseVNode("div", _hoisted_18, [
          createBaseVNode("button", {
            class: normalizeClass({ active: tab.value === "active" }),
            onClick: _cache[2] || (_cache[2] = ($event) => switchTab("active"))
          }, "进行中", 2),
          createBaseVNode("button", {
            class: normalizeClass({ active: tab.value === "expired" }),
            onClick: _cache[3] || (_cache[3] = ($event) => switchTab("expired"))
          }, "已超时", 2),
          createBaseVNode("button", {
            class: normalizeClass({ active: tab.value === "completed" }),
            onClick: _cache[4] || (_cache[4] = ($event) => switchTab("completed"))
          }, "已完成", 2)
        ]),
        !loading.value && tasks.value.length === 0 ? (openBlock(), createBlock(EmptyState, {
          key: 1,
          emoji: tab.value === "active" ? "📝" : tab.value === "expired" ? "⏰" : "✅",
          text: tab.value === "active" ? "没有进行中的任务" : tab.value === "expired" ? "没有超时任务" : "还没有完成的任务",
          hint: tab.value === "active" ? "点击右上角发布新任务" : ""
        }, null, 8, ["emoji", "text", "hint"])) : (openBlock(), createElementBlock("div", _hoisted_19, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(tasks.value, (t) => {
            return openBlock(), createBlock(GlassCard, {
              key: t.id,
              padding: "16px 18px",
              class: "task-card"
            }, {
              default: withCtx(() => [
                createBaseVNode("div", _hoisted_20, [
                  createBaseVNode("div", _hoisted_21, [
                    createVNode(ZodiacAvatar, {
                      zodiac: t.user_avatar,
                      size: 40
                    }, null, 8, ["zodiac"]),
                    createBaseVNode("span", _hoisted_22, toDisplayString(t.user_name), 1)
                  ]),
                  createBaseVNode("span", {
                    class: normalizeClass(["status-badge", tab.value === "expired" ? "expired" : tab.value === "completed" ? "completed" : t.completion_status ?? "active"])
                  }, toDisplayString(statusText(t)), 3),
                  createBaseVNode("div", _hoisted_23, "+" + toDisplayString(t.points) + " 🌟", 1)
                ]),
                createBaseVNode("h3", _hoisted_24, toDisplayString(t.name), 1),
                t.description ? (openBlock(), createElementBlock("p", _hoisted_25, toDisplayString(t.description), 1)) : createCommentVNode("", true),
                createBaseVNode("div", _hoisted_26, [
                  createBaseVNode("span", _hoisted_27, "📅 " + toDisplayString(fmtDeadline(t.deadline)), 1)
                ]),
                t.completion_status === "rejected" ? (openBlock(), createElementBlock("div", _hoisted_28, [..._cache[14] || (_cache[14] = [
                  createBaseVNode("span", null, "📝 上次未通过，小朋友可重新提交", -1)
                ])])) : createCommentVNode("", true),
                createBaseVNode("div", _hoisted_29, [
                  tab.value !== "completed" ? (openBlock(), createElementBlock("button", {
                    key: 0,
                    class: "btn btn-ghost small",
                    onClick: ($event) => openEditor(t)
                  }, "编辑", 8, _hoisted_30)) : createCommentVNode("", true),
                  tab.value === "completed" ? (openBlock(), createElementBlock("span", _hoisted_31, "🎉 已于 " + toDisplayString(fmtCompleted(t)) + " 完成", 1)) : createCommentVNode("", true),
                  createBaseVNode("button", {
                    class: "btn btn-ghost small danger",
                    onClick: ($event) => deleteTarget.value = t
                  }, "删除", 8, _hoisted_32)
                ])
              ]),
              _: 2
            }, 1024);
          }), 128))
        ])),
        createVNode(Pager, {
          page: page.value,
          "page-size": unref(LIST_PAGE_SIZE),
          total: total.value,
          disabled: loading.value,
          "onUpdate:page": load
        }, null, 8, ["page", "page-size", "total", "disabled"]),
        editorOpen.value ? (openBlock(), createBlock(AdhocTaskEditor, {
          key: 3,
          modelValue: editorOpen.value,
          "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => editorOpen.value = $event),
          task: editingTask.value,
          children: children.value,
          onSaved
        }, null, 8, ["modelValue", "task", "children"])) : createCommentVNode("", true),
        recEditorOpen.value ? (openBlock(), createBlock(RecurringTaskEditor, {
          key: 4,
          modelValue: recEditorOpen.value,
          "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => recEditorOpen.value = $event),
          rule: editingRule.value,
          children: children.value,
          onSaved: _cache[7] || (_cache[7] = ($event) => {
            recEditorOpen.value = false;
            load();
          })
        }, null, 8, ["modelValue", "rule", "children"])) : createCommentVNode("", true),
        createVNode(ConfirmDialog, {
          "model-value": deleteTarget.value !== null,
          title: "删除任务",
          message: deleteTarget.value ? `确定删除任务「${deleteTarget.value.name}」？删除后不可恢复哦` : "",
          "confirm-text": "确定",
          "cancel-text": "取消",
          variant: "danger",
          "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => !$event && (deleteTarget.value = null)),
          onConfirm: _cache[9] || (_cache[9] = ($event) => deleteTarget.value && remove(deleteTarget.value))
        }, null, 8, ["model-value", "message"]),
        createVNode(ConfirmDialog, {
          "model-value": deleteRuleTarget.value !== null,
          title: "删除周期任务",
          message: deleteRuleTarget.value ? `确定删除周期任务「${deleteRuleTarget.value.name}」？以后不再自动发布（已发布的任务保留）` : "",
          "confirm-text": "确定",
          "cancel-text": "取消",
          variant: "danger",
          "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => !$event && (deleteRuleTarget.value = null)),
          onConfirm: _cache[11] || (_cache[11] = ($event) => deleteRuleTarget.value && removeRule(deleteRuleTarget.value))
        }, null, 8, ["model-value", "message"])
      ]);
    };
  }
});
const Tasks = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-dc1ae8ee"]]);
export {
  Tasks as default
};
