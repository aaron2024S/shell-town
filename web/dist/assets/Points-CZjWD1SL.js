import { d as defineComponent, a as useToastStore, w as watch, c as createElementBlock, F as Fragment, m as createVNode, p as withCtx, y as computed, i as ref, k as openBlock, b as createBaseVNode, n as normalizeClass, h as withDirectives, v as vModelText, t as toDisplayString, f as createCommentVNode, z as api, _ as _export_sfc, o as onMounted, r as renderList, q as createBlock, x as createTextVNode } from "./index-DLtaHw3I.js";
import { G as GlassCard } from "./GlassCard-DXR0hosh.js";
import { Z as ZodiacAvatar } from "./ZodiacAvatar-BgUFKiIx.js";
import { E as EmptyState } from "./EmptyState-3g4kc4Z_.js";
import { M as Modal } from "./Modal-DiJeCwYw.js";
import { C as ConfirmDialog } from "./ConfirmDialog-BWQPEwj0.js";
const _hoisted_1$1 = { class: "form" };
const _hoisted_2$1 = { class: "field" };
const _hoisted_3$1 = { class: "type-tabs" };
const _hoisted_4$1 = { class: "field" };
const _hoisted_5$1 = { class: "row" };
const _hoisted_6$1 = { class: "field" };
const _hoisted_7$1 = { class: "label" };
const _hoisted_8$1 = { class: "field" };
const _hoisted_9$1 = ["disabled"];
const _hoisted_10$1 = ["disabled"];
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "PointItemEditor",
  props: {
    modelValue: { type: Boolean },
    item: {},
    defaultType: {},
    ownerId: {}
  },
  emits: ["update:modelValue", "saved"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const toast = useToastStore();
    const isEdit = computed(() => !!props.item);
    const name = ref("");
    const type = ref("gain");
    const points = ref(10);
    const dailyLimit = ref(1);
    const saving = ref(false);
    const deleteOpen = ref(false);
    watch(() => props.modelValue, (open) => {
      if (open) {
        if (props.item) {
          name.value = props.item.name;
          type.value = props.item.type;
          points.value = Math.abs(props.item.points);
          dailyLimit.value = props.item.daily_limit;
        } else {
          name.value = "";
          type.value = props.defaultType ?? "gain";
          points.value = 10;
          dailyLimit.value = 1;
        }
      }
    }, { immediate: true });
    async function save() {
      if (!name.value.trim()) return toast.warning("请输入项目名称");
      if (points.value <= 0) return toast.warning("分值必须大于0");
      saving.value = true;
      try {
        const body = {
          name: name.value.trim(),
          type: type.value,
          points: points.value,
          daily_limit: dailyLimit.value
        };
        if (!isEdit.value && props.ownerId !== void 0) {
          body.ownerId = props.ownerId;
        }
        if (isEdit.value) {
          await api.patch(`/point-items/${props.item.id}`, body);
          toast.success("已更新");
        } else {
          await api.post("/point-items", body);
          toast.success("新增成功");
        }
        emit("update:modelValue", false);
        emit("saved");
      } catch (e) {
        toast.error(e.message || "保存失败");
      } finally {
        saving.value = false;
      }
    }
    async function remove() {
      var _a;
      if (!props.item) return;
      try {
        await api.delete(`/point-items/${props.item.id}`);
        toast.success("已删除");
        emit("update:modelValue", false);
        emit("saved");
      } catch (e) {
        if (((_a = e.payload) == null ? void 0 : _a.error) === "cannot_delete_default") {
          toast.error("默认项目不可删除，但可编辑或禁用");
        } else {
          toast.error(e.message || "删除失败");
        }
      }
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock(Fragment, null, [
        createVNode(Modal, {
          "model-value": __props.modelValue,
          title: isEdit.value ? "编辑项目" : "新增项目",
          "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => emit("update:modelValue", $event))
        }, {
          footer: withCtx(() => [
            isEdit.value ? (openBlock(), createElementBlock("button", {
              key: 0,
              class: "btn btn-danger",
              onClick: _cache[5] || (_cache[5] = ($event) => deleteOpen.value = true),
              disabled: saving.value
            }, "删除", 8, _hoisted_9$1)) : createCommentVNode("", true),
            _cache[13] || (_cache[13] = createBaseVNode("span", { style: { "flex": "1" } }, null, -1)),
            createBaseVNode("button", {
              class: "btn btn-ghost",
              onClick: _cache[6] || (_cache[6] = ($event) => emit("update:modelValue", false))
            }, "取消"),
            createBaseVNode("button", {
              class: "btn btn-primary",
              onClick: save,
              disabled: saving.value
            }, toDisplayString(saving.value ? "保存中..." : "保存"), 9, _hoisted_10$1)
          ]),
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_1$1, [
              createBaseVNode("div", _hoisted_2$1, [
                _cache[9] || (_cache[9] = createBaseVNode("label", { class: "label" }, "类型", -1)),
                createBaseVNode("div", _hoisted_3$1, [
                  createBaseVNode("button", {
                    type: "button",
                    class: normalizeClass({ active: type.value === "gain" }),
                    onClick: _cache[0] || (_cache[0] = ($event) => type.value = "gain")
                  }, "🌟 加分", 2),
                  createBaseVNode("button", {
                    type: "button",
                    class: normalizeClass({ active: type.value === "loss" }),
                    onClick: _cache[1] || (_cache[1] = ($event) => type.value = "loss")
                  }, "📉 扣分", 2)
                ])
              ]),
              createBaseVNode("div", _hoisted_4$1, [
                _cache[10] || (_cache[10] = createBaseVNode("label", { class: "label" }, "项目名称", -1)),
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => name.value = $event),
                  type: "text",
                  maxlength: "30",
                  placeholder: "如：阅读30分钟"
                }, null, 512), [
                  [vModelText, name.value]
                ])
              ]),
              createBaseVNode("div", _hoisted_5$1, [
                createBaseVNode("div", _hoisted_6$1, [
                  createBaseVNode("label", _hoisted_7$1, toDisplayString(type.value === "gain" ? "奖励" : "扣除") + "分值", 1),
                  withDirectives(createBaseVNode("input", {
                    "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => points.value = $event),
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
                createBaseVNode("div", _hoisted_8$1, [
                  _cache[11] || (_cache[11] = createBaseVNode("label", { class: "label" }, "每日上限", -1)),
                  withDirectives(createBaseVNode("input", {
                    "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => dailyLimit.value = $event),
                    type: "number",
                    min: "0",
                    max: "999"
                  }, null, 512), [
                    [
                      vModelText,
                      dailyLimit.value,
                      void 0,
                      { number: true }
                    ]
                  ]),
                  _cache[12] || (_cache[12] = createBaseVNode("p", { class: "hint" }, "0 = 不限", -1))
                ])
              ])
            ])
          ]),
          _: 1
        }, 8, ["model-value", "title"]),
        createVNode(ConfirmDialog, {
          modelValue: deleteOpen.value,
          "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => deleteOpen.value = $event),
          title: "删除项目",
          message: __props.item ? `确定删除项目「${__props.item.name}」？` : "",
          "confirm-text": "确定",
          "cancel-text": "取消",
          variant: "danger",
          onConfirm: remove
        }, null, 8, ["modelValue", "message"])
      ], 64);
    };
  }
});
const PointItemEditor = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-9628ff59"]]);
const _hoisted_1 = { class: "page" };
const _hoisted_2 = {
  key: 0,
  class: "child-bar"
};
const _hoisted_3 = ["onClick"];
const _hoisted_4 = { class: "chip-info" };
const _hoisted_5 = { class: "chip-name" };
const _hoisted_6 = { class: "chip-pts" };
const _hoisted_7 = { class: "tabs" };
const _hoisted_8 = {
  key: 1,
  class: "item-list"
};
const _hoisted_9 = ["onClick"];
const _hoisted_10 = { class: "item-name" };
const _hoisted_11 = { class: "item-limit" };
const _hoisted_12 = ["onClick"];
const _hoisted_13 = ["onClick"];
const _hoisted_14 = { class: "form" };
const _hoisted_15 = { class: "field" };
const _hoisted_16 = { class: "selected-child" };
const _hoisted_17 = { class: "field" };
const _hoisted_18 = { class: "type-tabs" };
const _hoisted_19 = { class: "field" };
const _hoisted_20 = { class: "field" };
const _hoisted_21 = ["disabled"];
const CHILDREN_TTL_MS = 1e4;
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Points",
  setup(__props) {
    const toast = useToastStore();
    const children = ref([]);
    const items = ref([]);
    const loading = ref(true);
    const selectedChildId = ref(null);
    const tab = ref("gain");
    const editorOpen = ref(false);
    const editingItem = ref(null);
    const adjustOpen = ref(false);
    const adjustNote = ref("");
    const adjustDelta = ref(5);
    const adjustType = ref("gain");
    const adjustSaving = ref(false);
    const selectedChild = computed(
      () => children.value.find((c) => c.id === selectedChildId.value) ?? null
    );
    const visibleItems = computed(() => {
      if (!selectedChildId.value) return [];
      return items.value.filter(
        (i) => i.type === tab.value && i.enabled && (i.owner_id === null || i.owner_id === selectedChildId.value)
      );
    });
    async function load() {
      loading.value = true;
      try {
        await refreshChildren(true);
        if (selectedChildId.value === null && children.value.length > 0) {
          selectedChildId.value = children.value[0].id;
        }
        await loadItems();
      } finally {
        loading.value = false;
      }
    }
    async function loadItems() {
      const itemRes = await api.get("/point-items");
      items.value = itemRes.items;
    }
    let childrenFetchedAt = 0;
    async function refreshChildren(force = false) {
      if (!force && Date.now() - childrenFetchedAt < CHILDREN_TTL_MS) return;
      try {
        const childRes = await api.get("/children");
        children.value = childRes.children;
        childrenFetchedAt = Date.now();
      } catch (e) {
        toast.warning((e == null ? void 0 : e.message) || "小孩积分刷新失败，显示的可能不是最新数据");
      }
    }
    watch(selectedChildId, () => {
      refreshChildren();
    });
    async function apply(item) {
      var _a;
      const c = selectedChild.value;
      if (!c) return;
      try {
        const res = await api.post(
          "/point-items/apply",
          { userId: c.id, itemId: item.id }
        );
        c.total_points = res.newBalance;
        toast.success(`${c.name} ${item.name} ${item.points > 0 ? "+" : ""}${item.points} 分`);
      } catch (e) {
        if (((_a = e.payload) == null ? void 0 : _a.error) === "daily_limit_reached") {
          toast.warning(`${c.name} 今日「${item.name}」已达上限`);
        } else {
          toast.error(e.message || "操作失败");
        }
      }
    }
    function openEditor(item) {
      editingItem.value = item ?? null;
      editorOpen.value = true;
    }
    function openAdjust() {
      adjustNote.value = "";
      adjustDelta.value = 5;
      adjustType.value = "gain";
      adjustOpen.value = true;
    }
    async function submitAdjust() {
      const c = selectedChild.value;
      if (!c) return;
      if (!adjustNote.value.trim()) {
        toast.warning("请输入事项");
        return;
      }
      const delta = adjustType.value === "gain" ? Math.abs(adjustDelta.value) : -Math.abs(adjustDelta.value);
      if (delta === 0) {
        toast.warning("分值不能为0");
        return;
      }
      adjustSaving.value = true;
      try {
        const res = await api.post(
          "/point-items/adjust",
          { userId: c.id, delta, note: adjustNote.value.trim() }
        );
        c.total_points = res.newBalance;
        toast.success(`${c.name} ${delta > 0 ? "+" : ""}${delta} 分`);
        adjustOpen.value = false;
      } catch (e) {
        toast.error(e.message || "操作失败");
      } finally {
        adjustSaving.value = false;
      }
    }
    onMounted(load);
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        _cache[18] || (_cache[18] = createBaseVNode("header", { class: "page-header" }, [
          createBaseVNode("div", null, [
            createBaseVNode("h1", { class: "title" }, "积分管理"),
            createBaseVNode("p", { class: "subtitle" }, "选择小朋友后管理专属加减分项")
          ])
        ], -1)),
        children.value.length > 0 ? (openBlock(), createElementBlock("div", _hoisted_2, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(children.value, (c) => {
            return openBlock(), createElementBlock("button", {
              key: c.id,
              class: normalizeClass(["child-chip", { active: c.id === selectedChildId.value }]),
              onClick: ($event) => selectedChildId.value = c.id
            }, [
              createVNode(ZodiacAvatar, {
                zodiac: c.avatar,
                size: 40
              }, null, 8, ["zodiac"]),
              createBaseVNode("div", _hoisted_4, [
                createBaseVNode("span", _hoisted_5, toDisplayString(c.name), 1),
                createBaseVNode("span", _hoisted_6, toDisplayString(c.total_points) + " 分 🌟", 1)
              ])
            ], 10, _hoisted_3);
          }), 128))
        ])) : createCommentVNode("", true),
        !loading.value && children.value.length === 0 ? (openBlock(), createBlock(EmptyState, {
          key: 1,
          emoji: "🐣",
          text: "还没有小朋友",
          hint: "去总览页新增一个吧~"
        })) : selectedChild.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
          createBaseVNode("div", _hoisted_7, [
            createBaseVNode("button", {
              class: normalizeClass({ active: tab.value === "gain" }),
              onClick: _cache[0] || (_cache[0] = ($event) => tab.value = "gain")
            }, [..._cache[10] || (_cache[10] = [
              createBaseVNode("span", { class: "emoji" }, "🌟", -1),
              createTextVNode(" 加分项目 ", -1)
            ])], 2),
            createBaseVNode("button", {
              class: normalizeClass({ active: tab.value === "loss" }),
              onClick: _cache[1] || (_cache[1] = ($event) => tab.value = "loss")
            }, [..._cache[11] || (_cache[11] = [
              createBaseVNode("span", { class: "emoji" }, "📉", -1),
              createTextVNode(" 扣分项目 ", -1)
            ])], 2),
            createBaseVNode("button", {
              class: "add-btn",
              onClick: _cache[2] || (_cache[2] = ($event) => openEditor())
            }, "＋ 自定义项目")
          ]),
          visibleItems.value.length === 0 ? (openBlock(), createBlock(EmptyState, {
            key: 0,
            emoji: "📭",
            text: tab.value === "gain" ? "还没有加分项" : "还没有扣分项",
            hint: "点击上方「自定义项目」新增"
          }, null, 8, ["text"])) : (openBlock(), createElementBlock("div", _hoisted_8, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(visibleItems.value, (item) => {
              return openBlock(), createBlock(GlassCard, {
                key: item.id,
                hover: "",
                padding: "10px 14px",
                class: normalizeClass(["item-card", item.type])
              }, {
                default: withCtx(() => [
                  createBaseVNode("div", {
                    class: "item-info",
                    onClick: ($event) => openEditor(item)
                  }, [
                    createBaseVNode("span", _hoisted_10, toDisplayString(item.name), 1),
                    createBaseVNode("span", _hoisted_11, "每日 " + toDisplayString(item.daily_limit === 0 ? "不限" : item.daily_limit + " 次"), 1)
                  ], 8, _hoisted_9),
                  createBaseVNode("span", {
                    class: "item-edit",
                    onClick: ($event) => openEditor(item)
                  }, "✏️", 8, _hoisted_12),
                  createBaseVNode("button", {
                    class: normalizeClass(["apply-btn", item.type]),
                    onClick: ($event) => apply(item)
                  }, toDisplayString(item.points > 0 ? "+" : "") + toDisplayString(item.points), 11, _hoisted_13)
                ]),
                _: 2
              }, 1032, ["class"]);
            }), 128))
          ])),
          createVNode(GlassCard, {
            hover: "",
            padding: "16px",
            class: "adjust-card",
            onClick: openAdjust
          }, {
            default: withCtx(() => [..._cache[12] || (_cache[12] = [
              createBaseVNode("div", { class: "adjust-inner" }, [
                createBaseVNode("span", { class: "adjust-icon" }, "✏️"),
                createBaseVNode("div", { class: "adjust-text" }, [
                  createBaseVNode("div", { class: "adjust-title" }, "临时加减分"),
                  createBaseVNode("div", { class: "adjust-hint" }, "今天临时表现好/不好？记一笔")
                ]),
                createBaseVNode("span", { class: "adjust-arrow" }, "›")
              ], -1)
            ])]),
            _: 1
          })
        ], 64)) : createCommentVNode("", true),
        editorOpen.value ? (openBlock(), createBlock(PointItemEditor, {
          key: 3,
          modelValue: editorOpen.value,
          "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => editorOpen.value = $event),
          item: editingItem.value,
          "default-type": tab.value,
          "owner-id": selectedChildId.value,
          onSaved: loadItems
        }, null, 8, ["modelValue", "item", "default-type", "owner-id"])) : createCommentVNode("", true),
        adjustOpen.value ? (openBlock(), createBlock(Modal, {
          key: 4,
          "model-value": adjustOpen.value,
          title: "临时加减分",
          "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => adjustOpen.value = $event)
        }, {
          footer: withCtx(() => [
            _cache[17] || (_cache[17] = createBaseVNode("span", { style: { "flex": "1" } }, null, -1)),
            createBaseVNode("button", {
              class: "btn btn-ghost",
              onClick: _cache[8] || (_cache[8] = ($event) => adjustOpen.value = false)
            }, "取消"),
            createBaseVNode("button", {
              class: "btn btn-primary",
              disabled: adjustSaving.value,
              onClick: submitAdjust
            }, toDisplayString(adjustSaving.value ? "提交中..." : "确认"), 9, _hoisted_21)
          ]),
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_14, [
              createBaseVNode("div", _hoisted_15, [
                _cache[13] || (_cache[13] = createBaseVNode("label", { class: "label" }, "小朋友", -1)),
                createBaseVNode("div", _hoisted_16, [
                  createVNode(ZodiacAvatar, {
                    zodiac: selectedChild.value.avatar,
                    size: 36
                  }, null, 8, ["zodiac"]),
                  createBaseVNode("span", null, toDisplayString(selectedChild.value.name), 1)
                ])
              ]),
              createBaseVNode("div", _hoisted_17, [
                _cache[14] || (_cache[14] = createBaseVNode("label", { class: "label" }, "类型", -1)),
                createBaseVNode("div", _hoisted_18, [
                  createBaseVNode("button", {
                    type: "button",
                    class: normalizeClass({ active: adjustType.value === "gain" }),
                    onClick: _cache[4] || (_cache[4] = ($event) => adjustType.value = "gain")
                  }, "🌟 加分", 2),
                  createBaseVNode("button", {
                    type: "button",
                    class: normalizeClass({ active: adjustType.value === "loss" }),
                    onClick: _cache[5] || (_cache[5] = ($event) => adjustType.value = "loss")
                  }, "📉 扣分", 2)
                ])
              ]),
              createBaseVNode("div", _hoisted_19, [
                _cache[15] || (_cache[15] = createBaseVNode("label", { class: "label" }, "分值", -1)),
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => adjustDelta.value = $event),
                  type: "number",
                  min: "1",
                  max: "999"
                }, null, 512), [
                  [
                    vModelText,
                    adjustDelta.value,
                    void 0,
                    { number: true }
                  ]
                ])
              ]),
              createBaseVNode("div", _hoisted_20, [
                _cache[16] || (_cache[16] = createBaseVNode("label", { class: "label" }, "事项", -1)),
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => adjustNote.value = $event),
                  type: "text",
                  maxlength: "100",
                  placeholder: "如：今天主动洗碗"
                }, null, 512), [
                  [vModelText, adjustNote.value]
                ])
              ])
            ])
          ]),
          _: 1
        }, 8, ["model-value"])) : createCommentVNode("", true)
      ]);
    };
  }
});
const Points = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-011f2424"]]);
export {
  Points as default
};
