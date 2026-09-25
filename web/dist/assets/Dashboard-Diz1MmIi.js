import { d as defineComponent, a as useToastStore, w as watch, k as openBlock, c as createElementBlock, m as createVNode, p as withCtx, b as createBaseVNode, e as unref, n as normalizeClass, q as createBlock, h as withDirectives, v as vModelText, t as toDisplayString, f as createCommentVNode, F as Fragment, y as computed, i as ref, z as api, _ as _export_sfc, r as renderList, x as createTextVNode, o as onMounted, j as useRouter, g as withModifiers, S as STAT_META, G as normalizeStyle } from "./index-DLtaHw3I.js";
import { P as Pager, L as LIST_PAGE_SIZE } from "./Pager-gbjjgpVA.js";
import { G as GlassCard } from "./GlassCard-DXR0hosh.js";
import { Z as ZodiacAvatar, i as isHumationAvatar } from "./ZodiacAvatar-BgUFKiIx.js";
import { P as PetAvatar } from "./PetAvatar-DES9TyqT.js";
import { E as EmptyState } from "./EmptyState-3g4kc4Z_.js";
import { M as Modal } from "./Modal-DiJeCwYw.js";
import { C as ConfirmDialog } from "./ConfirmDialog-BWQPEwj0.js";
import { B as BOY_PRESET, G as GIRL_PRESET, P as PRESET_VALUES, H as HumationAvatarEditor } from "./presets-Dei_6Y9A.js";
const _hoisted_1$2 = { class: "form" };
const _hoisted_2$2 = { class: "field" };
const _hoisted_3$2 = { class: "avatar-row" };
const _hoisted_4$2 = {
  key: 1,
  class: "custom-ico"
};
const _hoisted_5$2 = { class: "field" };
const _hoisted_6$2 = { class: "gender-row" };
const _hoisted_7$2 = { class: "field" };
const _hoisted_8$2 = { class: "field" };
const _hoisted_9$1 = { class: "label" };
const _hoisted_10$1 = ["disabled"];
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "ChildEditorModal",
  props: {
    modelValue: { type: Boolean },
    child: {}
  },
  emits: ["update:modelValue", "saved"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const toast = useToastStore();
    const isEdit = computed(() => !!props.child);
    const name = ref("");
    const pin = ref("");
    const avatar = ref(BOY_PRESET.value);
    const gender = ref("male");
    const saving = ref(false);
    const showHumEditor = ref(false);
    function onHumSave(value) {
      avatar.value = value;
      showHumEditor.value = false;
    }
    function pickGender(g) {
      gender.value = g;
      if (!PRESET_VALUES.has(avatar.value)) return;
      avatar.value = g === "male" ? BOY_PRESET.value : GIRL_PRESET.value;
    }
    watch(() => props.modelValue, (open) => {
      var _a, _b, _c;
      if (open) {
        name.value = ((_a = props.child) == null ? void 0 : _a.name) ?? "";
        pin.value = "";
        avatar.value = ((_b = props.child) == null ? void 0 : _b.avatar) ?? BOY_PRESET.value;
        gender.value = ((_c = props.child) == null ? void 0 : _c.gender) ?? "male";
      }
    }, { immediate: true });
    async function save() {
      var _a;
      if (!name.value.trim()) return toast.warning("请输入小朋友名字");
      if (!pin.value && !isEdit.value) return toast.warning("请设置PIN码");
      if (pin.value && !/^\d{4,6}$/.test(pin.value)) return toast.warning("PIN必须是4-6位数字");
      saving.value = true;
      try {
        const body = { name: name.value.trim(), avatar: avatar.value, gender: gender.value };
        if (pin.value) body.pin = pin.value;
        if (isEdit.value) {
          await api.patch(`/children/${props.child.id}`, body);
          toast.success("已更新小朋友信息");
        } else {
          await api.post("/children", body);
          toast.success("小朋友创建成功 🎉");
        }
        emit("saved");
      } catch (e) {
        if (((_a = e.payload) == null ? void 0 : _a.error) === "pin_used") toast.error("PIN已被其他账号使用");
        else toast.error(e.message || "保存失败");
      } finally {
        saving.value = false;
      }
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock(Fragment, null, [
        createVNode(Modal, {
          "model-value": __props.modelValue,
          title: isEdit.value ? "编辑小朋友" : "新增小朋友",
          "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => emit("update:modelValue", $event))
        }, {
          footer: withCtx(() => [
            createBaseVNode("button", {
              class: "btn btn-ghost",
              onClick: _cache[7] || (_cache[7] = ($event) => emit("update:modelValue", false))
            }, "取消"),
            createBaseVNode("button", {
              class: "btn btn-primary",
              onClick: save,
              disabled: saving.value
            }, toDisplayString(saving.value ? "保存中..." : "保存"), 9, _hoisted_10$1)
          ]),
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_1$2, [
              createBaseVNode("div", _hoisted_2$2, [
                _cache[13] || (_cache[13] = createBaseVNode("label", { class: "label" }, "头像", -1)),
                createBaseVNode("div", _hoisted_3$2, [
                  createBaseVNode("button", {
                    type: "button",
                    class: normalizeClass(["zodiac", { active: avatar.value === unref(BOY_PRESET).value }]),
                    onClick: _cache[0] || (_cache[0] = ($event) => avatar.value = unref(BOY_PRESET).value)
                  }, [
                    createVNode(ZodiacAvatar, {
                      zodiac: unref(BOY_PRESET).value,
                      size: 56
                    }, null, 8, ["zodiac"]),
                    _cache[10] || (_cache[10] = createBaseVNode("span", { class: "zname" }, "男生", -1))
                  ], 2),
                  createBaseVNode("button", {
                    type: "button",
                    class: normalizeClass(["zodiac", { active: avatar.value === unref(GIRL_PRESET).value }]),
                    onClick: _cache[1] || (_cache[1] = ($event) => avatar.value = unref(GIRL_PRESET).value)
                  }, [
                    createVNode(ZodiacAvatar, {
                      zodiac: unref(GIRL_PRESET).value,
                      size: 56
                    }, null, 8, ["zodiac"]),
                    _cache[11] || (_cache[11] = createBaseVNode("span", { class: "zname" }, "女生", -1))
                  ], 2),
                  createBaseVNode("button", {
                    type: "button",
                    class: normalizeClass(["zodiac", { active: unref(isHumationAvatar)(avatar.value) && !unref(PRESET_VALUES).has(avatar.value) }]),
                    onClick: _cache[2] || (_cache[2] = ($event) => showHumEditor.value = true)
                  }, [
                    unref(isHumationAvatar)(avatar.value) ? (openBlock(), createBlock(ZodiacAvatar, {
                      key: 0,
                      zodiac: avatar.value,
                      size: 56
                    }, null, 8, ["zodiac"])) : (openBlock(), createElementBlock("span", _hoisted_4$2, "🎨")),
                    _cache[12] || (_cache[12] = createBaseVNode("span", { class: "zname" }, "自定义", -1))
                  ], 2)
                ])
              ]),
              createBaseVNode("div", _hoisted_5$2, [
                _cache[16] || (_cache[16] = createBaseVNode("label", { class: "label" }, "性别", -1)),
                createBaseVNode("div", _hoisted_6$2, [
                  createBaseVNode("button", {
                    type: "button",
                    class: normalizeClass(["gender-btn", { active: gender.value === "male" }]),
                    onClick: _cache[3] || (_cache[3] = ($event) => pickGender("male"))
                  }, [..._cache[14] || (_cache[14] = [
                    createBaseVNode("span", { class: "g-ico" }, "♂", -1),
                    createBaseVNode("span", { class: "g-name" }, "男生", -1)
                  ])], 2),
                  createBaseVNode("button", {
                    type: "button",
                    class: normalizeClass(["gender-btn", { active: gender.value === "female" }]),
                    onClick: _cache[4] || (_cache[4] = ($event) => pickGender("female"))
                  }, [..._cache[15] || (_cache[15] = [
                    createBaseVNode("span", { class: "g-ico" }, "♀", -1),
                    createBaseVNode("span", { class: "g-name" }, "女生", -1)
                  ])], 2)
                ]),
                _cache[17] || (_cache[17] = createBaseVNode("p", { class: "hint" }, "决定小朋友端的页面配色：男生是蓝色，女生是粉色", -1))
              ]),
              createBaseVNode("div", _hoisted_7$2, [
                _cache[18] || (_cache[18] = createBaseVNode("label", { class: "label" }, "名字", -1)),
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => name.value = $event),
                  type: "text",
                  maxlength: "20",
                  placeholder: "给小朋友起个可爱的名字"
                }, null, 512), [
                  [vModelText, name.value]
                ])
              ]),
              createBaseVNode("div", _hoisted_8$2, [
                createBaseVNode("label", _hoisted_9$1, toDisplayString(isEdit.value ? "PIN码（留空则不修改）" : "PIN码"), 1),
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => pin.value = $event),
                  type: "tel",
                  inputmode: "numeric",
                  maxlength: "6",
                  placeholder: "4-6位数字"
                }, null, 512), [
                  [vModelText, pin.value]
                ]),
                _cache[19] || (_cache[19] = createBaseVNode("p", { class: "hint" }, "PIN码是小朋友登录用的，记得告诉Ta哦~", -1))
              ])
            ])
          ]),
          _: 1
        }, 8, ["model-value", "title"]),
        showHumEditor.value ? (openBlock(), createBlock(HumationAvatarEditor, {
          key: 0,
          current: avatar.value,
          onSave: onHumSave,
          onClose: _cache[9] || (_cache[9] = ($event) => showHumEditor.value = false)
        }, null, 8, ["current"])) : createCommentVNode("", true)
      ], 64);
    };
  }
});
const ChildEditorModal = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__scopeId", "data-v-b49ab6fa"]]);
const _hoisted_1$1 = {
  key: 0,
  class: "loading"
};
const _hoisted_2$1 = {
  key: 2,
  class: "account-list"
};
const _hoisted_3$1 = { class: "info" };
const _hoisted_4$1 = { class: "name" };
const _hoisted_5$1 = { class: "points" };
const _hoisted_6$1 = { class: "actions" };
const _hoisted_7$1 = ["onClick"];
const _hoisted_8$1 = ["onClick"];
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "AccountManagerModal",
  props: {
    modelValue: { type: Boolean }
  },
  emits: ["update:modelValue", "changed"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const toast = useToastStore();
    const children = ref([]);
    const loading = ref(false);
    const editorOpen = ref(false);
    const editingChild = ref(null);
    const confirmOpen = ref(false);
    const deletingChild = ref(null);
    const deleting = ref(false);
    watch(() => props.modelValue, (open) => {
      if (open) load();
    });
    async function load() {
      loading.value = true;
      try {
        const res = await api.get("/children");
        children.value = res.children;
      } catch (e) {
        toast.error(e.message || "加载失败");
      } finally {
        loading.value = false;
      }
    }
    function openAdd() {
      editingChild.value = null;
      editorOpen.value = true;
    }
    function openEdit(c) {
      editingChild.value = c;
      editorOpen.value = true;
    }
    async function onSaved() {
      editorOpen.value = false;
      await load();
      emit("changed");
    }
    function askDelete(c) {
      deletingChild.value = c;
      confirmOpen.value = true;
    }
    async function doDelete() {
      if (!deletingChild.value) return;
      const target = deletingChild.value;
      deleting.value = true;
      try {
        await api.delete(`/children/${target.id}`);
        toast.success(`已删除「${target.name}」`);
        deletingChild.value = null;
        await load();
        emit("changed");
      } catch (e) {
        toast.error(e.message || "删除失败");
      } finally {
        deleting.value = false;
      }
    }
    return (_ctx, _cache) => {
      return openBlock(), createBlock(Modal, {
        "model-value": __props.modelValue,
        title: "账号管理",
        width: "460px",
        "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => emit("update:modelValue", $event))
      }, {
        default: withCtx(() => {
          var _a;
          return [
            loading.value ? (openBlock(), createElementBlock("div", _hoisted_1$1, "加载中...")) : children.value.length === 0 ? (openBlock(), createBlock(EmptyState, {
              key: 1,
              emoji: "🐣",
              text: "还没有小朋友账号",
              hint: "点击下方按钮新增一个吧~"
            })) : (openBlock(), createElementBlock("div", _hoisted_2$1, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(children.value, (c) => {
                return openBlock(), createElementBlock("div", {
                  key: c.id,
                  class: "account-item"
                }, [
                  createVNode(ZodiacAvatar, {
                    zodiac: c.avatar,
                    size: 48,
                    "show-ring": ""
                  }, null, 8, ["zodiac"]),
                  createBaseVNode("div", _hoisted_3$1, [
                    createBaseVNode("div", _hoisted_4$1, [
                      createTextVNode(toDisplayString(c.name) + " ", 1),
                      createBaseVNode("span", {
                        class: normalizeClass(["gtag", c.gender === "male" ? "boy" : "girl"])
                      }, toDisplayString(c.gender === "male" ? "男生" : "女生"), 3)
                    ]),
                    createBaseVNode("div", _hoisted_5$1, toDisplayString(c.total_points) + " 分", 1)
                  ]),
                  createBaseVNode("div", _hoisted_6$1, [
                    createBaseVNode("button", {
                      class: "icon-btn edit",
                      title: "编辑账号",
                      onClick: ($event) => openEdit(c)
                    }, "✏️", 8, _hoisted_7$1),
                    createBaseVNode("button", {
                      class: "icon-btn del",
                      title: "删除账号",
                      onClick: ($event) => askDelete(c)
                    }, "🗑️", 8, _hoisted_8$1)
                  ])
                ]);
              }), 128))
            ])),
            createBaseVNode("button", {
              class: "btn btn-primary add-btn",
              onClick: openAdd
            }, [..._cache[3] || (_cache[3] = [
              createBaseVNode("span", null, "＋", -1),
              createTextVNode(" 新增账号 ", -1)
            ])]),
            editorOpen.value ? (openBlock(), createBlock(ChildEditorModal, {
              key: 3,
              modelValue: editorOpen.value,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => editorOpen.value = $event),
              child: editingChild.value,
              onSaved
            }, null, 8, ["modelValue", "child"])) : createCommentVNode("", true),
            createVNode(ConfirmDialog, {
              modelValue: confirmOpen.value,
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => confirmOpen.value = $event),
              variant: "danger",
              title: "删除账号",
              message: `确定删除「${((_a = deletingChild.value) == null ? void 0 : _a.name) ?? ""}」吗？该账号的积分、任务、兑换记录都会一并删除，且无法恢复。`,
              "confirm-text": "确认删除",
              onConfirm: doDelete
            }, null, 8, ["modelValue", "message"])
          ];
        }),
        _: 1
      }, 8, ["model-value"]);
    };
  }
});
const AccountManagerModal = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-ed8062cd"]]);
const _hoisted_1 = { class: "page" };
const _hoisted_2 = { class: "page-header" };
const _hoisted_3 = { class: "summary-grid" };
const _hoisted_4 = { class: "summary-item" };
const _hoisted_5 = { class: "value gain" };
const _hoisted_6 = { class: "summary-item" };
const _hoisted_7 = { class: "value loss" };
const _hoisted_8 = { class: "summary-item" };
const _hoisted_9 = { class: "value" };
const _hoisted_10 = {
  key: 1,
  class: "loading"
};
const _hoisted_11 = {
  key: 3,
  class: "rank-list"
};
const _hoisted_12 = { class: "info" };
const _hoisted_13 = { class: "name" };
const _hoisted_14 = { class: "meta" };
const _hoisted_15 = { class: "today-points" };
const _hoisted_16 = ["onClick"];
const _hoisted_17 = {
  key: 1,
  class: "pet-egg"
};
const _hoisted_18 = {
  key: 2,
  class: "pet-lv pet-lv-fail"
};
const _hoisted_19 = {
  key: 3,
  class: "pet-lv"
};
const _hoisted_20 = { class: "points" };
const _hoisted_21 = { class: "num" };
const _hoisted_22 = {
  key: 0,
  class: "logs-loading"
};
const _hoisted_23 = {
  key: 1,
  class: "logs-empty"
};
const _hoisted_24 = {
  key: 2,
  class: "logs-list"
};
const _hoisted_25 = { class: "log-body" };
const _hoisted_26 = { class: "log-note" };
const _hoisted_27 = { class: "log-source" };
const _hoisted_28 = { key: 0 };
const _hoisted_29 = { class: "log-time" };
const _hoisted_30 = {
  key: 0,
  class: "pet-empty"
};
const _hoisted_31 = {
  key: 1,
  class: "pet-detail"
};
const _hoisted_32 = { class: "pd-head" };
const _hoisted_33 = { class: "pd-info" };
const _hoisted_34 = { class: "pd-name" };
const _hoisted_35 = { class: "pd-tags" };
const _hoisted_36 = { class: "pd-tag lv" };
const _hoisted_37 = { class: "pd-tag" };
const _hoisted_38 = { class: "pd-tag" };
const _hoisted_39 = { class: "pd-exp" };
const _hoisted_40 = { class: "pd-stats" };
const _hoisted_41 = { class: "pds-head" };
const _hoisted_42 = { class: "pds-num" };
const _hoisted_43 = { class: "pds-bar" };
const _hoisted_44 = { class: "pd-mood" };
const _hoisted_45 = {
  key: 0,
  class: "pd-quota"
};
const _hoisted_46 = { class: "pdq-usage" };
const _hoisted_47 = { class: "pdq-edit" };
const _hoisted_48 = ["disabled"];
const _hoisted_49 = {
  key: 0,
  class: "pdq-hint pdq-warn"
};
const _hoisted_50 = { class: "pd-spent" };
const _hoisted_51 = {
  key: 1,
  class: "logs-loading"
};
const _hoisted_52 = {
  key: 2,
  class: "logs-empty"
};
const _hoisted_53 = {
  key: 3,
  class: "logs-list"
};
const _hoisted_54 = { class: "log-delta loss" };
const _hoisted_55 = { class: "log-body" };
const _hoisted_56 = { class: "log-note" };
const _hoisted_57 = { class: "log-source" };
const _hoisted_58 = { key: 0 };
const _hoisted_59 = { class: "log-time" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Dashboard",
  setup(__props) {
    const router = useRouter();
    const toast = useToastStore();
    const data = ref(null);
    const loading = ref(true);
    const accountOpen = ref(false);
    const logsOpen = ref(false);
    const logsChild = ref(null);
    const logs = ref([]);
    const logsLoading = ref(false);
    const logsPage = ref(1);
    const logsTotal = ref(0);
    const LOGS_PAGE_SIZE = LIST_PAGE_SIZE;
    const petRows = ref([]);
    const minPetCost = ref(null);
    const petLoadFailed = ref(false);
    const petMap = computed(() => {
      const m = /* @__PURE__ */ new Map();
      for (const r of petRows.value) m.set(r.id, r);
      return m;
    });
    const petOpen = ref(false);
    const petChild = ref(null);
    const petLogs = ref([]);
    const petLogsLoading = ref(false);
    const petLogsPage = ref(1);
    const petLogsTotal = ref(0);
    const PET_LOGS_PAGE_SIZE = LIST_PAGE_SIZE;
    const resetOpen = ref(false);
    const limitFeed = ref(0);
    const limitPoints = ref(0);
    const limitSaving = ref(false);
    function quotaOf(childId) {
      var _a;
      return ((_a = petMap.value.get(childId)) == null ? void 0 : _a.quota) ?? null;
    }
    function petOf(childId) {
      var _a;
      return ((_a = petMap.value.get(childId)) == null ? void 0 : _a.pet) ?? null;
    }
    function spentOf(childId) {
      var _a;
      return ((_a = petMap.value.get(childId)) == null ? void 0 : _a.pointsSpentOnPet) ?? 0;
    }
    const sortedChildren = computed(() => {
      var _a;
      const list = ((_a = data.value) == null ? void 0 : _a.children) ?? [];
      return [...list].sort((a, b) => b.total_points - a.total_points);
    });
    const sourceLabels = {
      daily: "⭐ 日常",
      adhoc: "📋 任务",
      exchange: "🎁 兑换",
      adjust: "✏️ 调整"
    };
    async function load() {
      loading.value = true;
      petLoadFailed.value = false;
      try {
        const [d, p] = await Promise.all([
          api.get("/dashboard"),
          // 失败时不再假装"没有宠物"：记下失败标记，卡片上提示加载失败而不是"未领养宠物"
          api.get("/pets").catch(() => {
            petLoadFailed.value = true;
            return { children: [] };
          })
        ]);
        data.value = d;
        petRows.value = p.children ?? [];
        minPetCost.value = p.minPetItemCost ?? null;
      } finally {
        loading.value = false;
      }
    }
    async function openPet(c) {
      petChild.value = c;
      petOpen.value = true;
      const q = quotaOf(c.id);
      limitFeed.value = (q == null ? void 0 : q.feedLimit) ?? 0;
      limitPoints.value = (q == null ? void 0 : q.pointsLimit) ?? 0;
      await loadPetLogs(c.id, 1);
    }
    async function loadPetLogs(childId, p = petLogsPage.value) {
      petLogsLoading.value = true;
      try {
        const res = await api.get(
          `/pets/${childId}/logs?limit=${PET_LOGS_PAGE_SIZE}&offset=${(p - 1) * PET_LOGS_PAGE_SIZE}`
        );
        petLogs.value = res.logs ?? [];
        petLogsTotal.value = res.total ?? petLogs.value.length;
        petLogsPage.value = p;
      } catch {
        petLogs.value = [];
        petLogsTotal.value = 0;
      } finally {
        petLogsLoading.value = false;
      }
    }
    async function saveLimits() {
      var _a;
      if (!petChild.value || limitSaving.value) return;
      limitSaving.value = true;
      try {
        await api.put(`/pets/${petChild.value.id}/limits`, {
          feedLimit: Math.max(0, Math.floor(Number(limitFeed.value) || 0)),
          pointsLimit: Math.max(0, Math.floor(Number(limitPoints.value) || 0))
        });
        await load();
      } catch (e) {
        toast.error(((_a = e == null ? void 0 : e.payload) == null ? void 0 : _a.message) || (e == null ? void 0 : e.message) || "保存失败，请重试");
      } finally {
        limitSaving.value = false;
      }
    }
    async function doResetPet() {
      var _a;
      if (!petChild.value) return;
      try {
        await api.delete(`/pets/${petChild.value.id}`);
        await load();
        petOpen.value = false;
        toast.success("已重置该孩子的宠物");
      } catch (e) {
        toast.error(((_a = e == null ? void 0 : e.payload) == null ? void 0 : _a.message) || (e == null ? void 0 : e.message) || "重置失败，请重试");
      }
    }
    function goLogs() {
      router.push("/parent/logs");
    }
    async function openLogs(c, p = logsPage.value) {
      logsChild.value = c;
      logsOpen.value = true;
      logsLoading.value = true;
      try {
        const res = await api.get(
          `/point-logs?userId=${c.id}&limit=${LOGS_PAGE_SIZE}&offset=${(p - 1) * LOGS_PAGE_SIZE}`
        );
        logs.value = res.logs;
        logsTotal.value = res.total ?? res.logs.length;
        logsPage.value = p;
      } finally {
        logsLoading.value = false;
      }
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
      return `${d.getMonth() + 1}月${d.getDate()}日`;
    }
    onMounted(load);
    return (_ctx, _cache) => {
      var _a;
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("header", _hoisted_2, [
          _cache[10] || (_cache[10] = createBaseVNode("div", null, [
            createBaseVNode("h1", { class: "title" }, "总览"),
            createBaseVNode("p", { class: "subtitle" }, "家庭积分排行")
          ], -1)),
          createBaseVNode("button", {
            class: "btn btn-primary",
            onClick: _cache[0] || (_cache[0] = ($event) => accountOpen.value = true)
          }, " 账号管理 ")
        ]),
        data.value ? (openBlock(), createBlock(GlassCard, {
          key: 0,
          class: "today-summary",
          padding: "16px 20px",
          hover: "",
          onClick: goLogs
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_3, [
              createBaseVNode("div", _hoisted_4, [
                _cache[11] || (_cache[11] = createBaseVNode("span", { class: "label" }, "今日加分", -1)),
                createBaseVNode("span", _hoisted_5, "+" + toDisplayString(data.value.todaySummary.gain), 1)
              ]),
              _cache[14] || (_cache[14] = createBaseVNode("div", { class: "divider" }, null, -1)),
              createBaseVNode("div", _hoisted_6, [
                _cache[12] || (_cache[12] = createBaseVNode("span", { class: "label" }, "今日扣分", -1)),
                createBaseVNode("span", _hoisted_7, toDisplayString(data.value.todaySummary.loss), 1)
              ]),
              _cache[15] || (_cache[15] = createBaseVNode("div", { class: "divider" }, null, -1)),
              createBaseVNode("div", _hoisted_8, [
                _cache[13] || (_cache[13] = createBaseVNode("span", { class: "label" }, "今日操作", -1)),
                createBaseVNode("span", _hoisted_9, toDisplayString(data.value.todaySummary.count) + " 次", 1)
              ])
            ])
          ]),
          _: 1
        })) : createCommentVNode("", true),
        loading.value ? (openBlock(), createElementBlock("div", _hoisted_10, [
          (openBlock(), createElementBlock(Fragment, null, renderList(3, (i) => {
            return createBaseVNode("div", {
              key: i,
              class: "skeleton-card"
            });
          }), 64))
        ])) : sortedChildren.value.length === 0 ? (openBlock(), createBlock(EmptyState, {
          key: 2,
          emoji: "🐣",
          text: "还没有小朋友呢",
          hint: "点击右上角新增一个吧~"
        })) : (openBlock(), createElementBlock("div", _hoisted_11, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(sortedChildren.value, (c) => {
            return openBlock(), createBlock(GlassCard, {
              key: c.id,
              hover: "",
              padding: "18px 20px",
              class: "rank-card",
              onClick: ($event) => openLogs(c)
            }, {
              default: withCtx(() => [
                createVNode(ZodiacAvatar, {
                  zodiac: c.avatar,
                  size: 72,
                  "show-ring": ""
                }, null, 8, ["zodiac"]),
                createBaseVNode("div", _hoisted_12, [
                  createBaseVNode("div", _hoisted_13, toDisplayString(c.name), 1),
                  createBaseVNode("div", _hoisted_14, [
                    _cache[16] || (_cache[16] = createTextVNode(" 今日得分 ", -1)),
                    createBaseVNode("strong", _hoisted_15, "+" + toDisplayString(c.today_points), 1)
                  ]),
                  createBaseVNode("button", {
                    class: normalizeClass(["pet-chip", { none: !petOf(c.id) }]),
                    onClick: withModifiers(($event) => openPet(c), ["stop"])
                  }, [
                    petOf(c.id) ? (openBlock(), createBlock(PetAvatar, {
                      key: 0,
                      species: petOf(c.id).species,
                      level: petOf(c.id).level,
                      size: 34
                    }, null, 8, ["species", "level"])) : (openBlock(), createElementBlock("span", _hoisted_17, "🥚")),
                    petLoadFailed.value ? (openBlock(), createElementBlock("span", _hoisted_18, "宠物信息加载失败，请刷新重试")) : (openBlock(), createElementBlock("span", _hoisted_19, toDisplayString(petOf(c.id) ? `Lv${petOf(c.id).level} ${petOf(c.id).stageName}` : "未领养宠物"), 1)),
                    _cache[17] || (_cache[17] = createBaseVNode("span", { class: "pet-go" }, "详情 ›", -1))
                  ], 10, _hoisted_16)
                ]),
                createBaseVNode("div", _hoisted_20, [
                  createBaseVNode("span", _hoisted_21, toDisplayString(c.total_points), 1),
                  _cache[18] || (_cache[18] = createBaseVNode("span", { class: "unit" }, "分", -1))
                ])
              ]),
              _: 2
            }, 1032, ["onClick"]);
          }), 128))
        ])),
        createVNode(AccountManagerModal, {
          modelValue: accountOpen.value,
          "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => accountOpen.value = $event),
          onChanged: load
        }, null, 8, ["modelValue"]),
        createVNode(Modal, {
          modelValue: logsOpen.value,
          "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => logsOpen.value = $event),
          title: logsChild.value ? `${logsChild.value.name} 的积分记录` : "积分记录",
          width: "480px"
        }, {
          default: withCtx(() => [
            logsLoading.value ? (openBlock(), createElementBlock("div", _hoisted_22, "加载中...")) : logs.value.length === 0 ? (openBlock(), createElementBlock("div", _hoisted_23, "暂无积分记录")) : (openBlock(), createElementBlock("div", _hoisted_24, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(logs.value, (log) => {
                return openBlock(), createElementBlock("div", {
                  key: log.id,
                  class: "log-item"
                }, [
                  createBaseVNode("div", {
                    class: normalizeClass(["log-delta", log.delta > 0 ? "gain" : "loss"])
                  }, toDisplayString(log.delta > 0 ? "+" : "") + toDisplayString(log.delta) + " 🌟 ", 3),
                  createBaseVNode("div", _hoisted_25, [
                    createBaseVNode("div", _hoisted_26, [
                      createBaseVNode("span", _hoisted_27, toDisplayString(sourceLabels[log.source] || log.source), 1),
                      log.note ? (openBlock(), createElementBlock("span", _hoisted_28, "· " + toDisplayString(log.note), 1)) : createCommentVNode("", true)
                    ]),
                    createBaseVNode("div", _hoisted_29, toDisplayString(fmtTime(log.created_at)), 1)
                  ])
                ]);
              }), 128)),
              logsChild.value ? (openBlock(), createBlock(Pager, {
                key: 0,
                page: logsPage.value,
                "page-size": unref(LOGS_PAGE_SIZE),
                total: logsTotal.value,
                disabled: logsLoading.value,
                "onUpdate:page": _cache[2] || (_cache[2] = ($event) => openLogs(logsChild.value, $event))
              }, null, 8, ["page", "page-size", "total", "disabled"])) : createCommentVNode("", true)
            ]))
          ]),
          _: 1
        }, 8, ["modelValue", "title"]),
        createVNode(Modal, {
          modelValue: petOpen.value,
          "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => petOpen.value = $event),
          title: petChild.value ? `${petChild.value.name} 的宠物` : "宠物详情",
          width: "480px"
        }, {
          default: withCtx(() => [
            petChild.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
              !petOf(petChild.value.id) ? (openBlock(), createElementBlock("div", _hoisted_30, [
                _cache[19] || (_cache[19] = createBaseVNode("span", { class: "pe-emoji" }, "🥚", -1)),
                createBaseVNode("p", null, toDisplayString(petChild.value.name) + " 还没有领养宠物", 1),
                _cache[20] || (_cache[20] = createBaseVNode("p", { class: "pe-hint" }, "孩子可以在自己的「宠物」页面领养一只", -1))
              ])) : (openBlock(), createElementBlock("div", _hoisted_31, [
                createBaseVNode("div", _hoisted_32, [
                  createVNode(PetAvatar, {
                    species: petOf(petChild.value.id).species,
                    level: petOf(petChild.value.id).level,
                    size: 96
                  }, null, 8, ["species", "level"]),
                  createBaseVNode("div", _hoisted_33, [
                    createBaseVNode("div", _hoisted_34, toDisplayString(petOf(petChild.value.id).displayName), 1),
                    createBaseVNode("div", _hoisted_35, [
                      createBaseVNode("span", _hoisted_36, "Lv" + toDisplayString(petOf(petChild.value.id).level), 1),
                      createBaseVNode("span", _hoisted_37, toDisplayString(petOf(petChild.value.id).stageName), 1),
                      createBaseVNode("span", _hoisted_38, toDisplayString(petOf(petChild.value.id).seriesLabel) + "系", 1)
                    ]),
                    createBaseVNode("div", _hoisted_39, [
                      petOf(petChild.value.id).isMax ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                        createTextVNode("🎉 已满级（究极体）")
                      ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                        createTextVNode("经验 " + toDisplayString(petOf(petChild.value.id).exp) + " / " + toDisplayString(petOf(petChild.value.id).totalMaxExp) + " · 还差 " + toDisplayString(petOf(petChild.value.id).expToNext) + " 进化", 1)
                      ], 64))
                    ])
                  ])
                ]),
                createBaseVNode("div", _hoisted_40, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(unref(STAT_META), (m) => {
                    return openBlock(), createElementBlock("div", {
                      key: m.key,
                      class: "pd-stat"
                    }, [
                      createBaseVNode("div", _hoisted_41, [
                        createBaseVNode("span", null, toDisplayString(m.emoji) + " " + toDisplayString(m.label), 1),
                        createBaseVNode("span", _hoisted_42, toDisplayString(petOf(petChild.value.id)[m.key]), 1)
                      ]),
                      createBaseVNode("div", _hoisted_43, [
                        createBaseVNode("div", {
                          class: "pds-fill",
                          style: normalizeStyle({ width: petOf(petChild.value.id)[m.key] + "%", background: m.color })
                        }, null, 4)
                      ])
                    ]);
                  }), 128))
                ]),
                createBaseVNode("div", _hoisted_44, toDisplayString(petOf(petChild.value.id).moodLabel) + " · " + toDisplayString(petOf(petChild.value.id).moodTip), 1),
                quotaOf(petChild.value.id) ? (openBlock(), createElementBlock("div", _hoisted_45, [
                  createBaseVNode("div", _hoisted_46, [
                    createBaseVNode("span", null, [
                      _cache[21] || (_cache[21] = createTextVNode("今天已喂 ", -1)),
                      createBaseVNode("b", null, toDisplayString(quotaOf(petChild.value.id).todayFed), 1),
                      _cache[22] || (_cache[22] = createTextVNode(" 次", -1)),
                      quotaOf(petChild.value.id).feedLimit > 0 ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                        createTextVNode(" / " + toDisplayString(quotaOf(petChild.value.id).feedLimit), 1)
                      ], 64)) : createCommentVNode("", true)
                    ]),
                    createBaseVNode("span", null, [
                      _cache[23] || (_cache[23] = createTextVNode("今天已用 ", -1)),
                      createBaseVNode("b", null, toDisplayString(quotaOf(petChild.value.id).todayPoints), 1),
                      _cache[24] || (_cache[24] = createTextVNode(" 🌟", -1)),
                      quotaOf(petChild.value.id).pointsLimit > 0 ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                        createTextVNode(" / " + toDisplayString(quotaOf(petChild.value.id).pointsLimit), 1)
                      ], 64)) : createCommentVNode("", true)
                    ])
                  ]),
                  createBaseVNode("div", _hoisted_47, [
                    createBaseVNode("label", null, [
                      _cache[25] || (_cache[25] = createTextVNode("每天最多喂 ", -1)),
                      withDirectives(createBaseVNode("input", {
                        "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => limitFeed.value = $event),
                        type: "number",
                        min: "0",
                        max: "99"
                      }, null, 512), [
                        [
                          vModelText,
                          limitFeed.value,
                          void 0,
                          { number: true }
                        ]
                      ]),
                      _cache[26] || (_cache[26] = createTextVNode(" 次", -1))
                    ]),
                    createBaseVNode("label", null, [
                      _cache[27] || (_cache[27] = createTextVNode("每天宠物积分上限 ", -1)),
                      withDirectives(createBaseVNode("input", {
                        "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => limitPoints.value = $event),
                        type: "number",
                        min: "0",
                        max: "9999"
                      }, null, 512), [
                        [
                          vModelText,
                          limitPoints.value,
                          void 0,
                          { number: true }
                        ]
                      ]),
                      _cache[28] || (_cache[28] = createTextVNode(" 分", -1))
                    ]),
                    createBaseVNode("button", {
                      class: "pdq-save",
                      disabled: limitSaving.value,
                      onClick: saveLimits
                    }, toDisplayString(limitSaving.value ? "保存中…" : "保存"), 9, _hoisted_48)
                  ]),
                  _cache[29] || (_cache[29] = createBaseVNode("p", { class: "pdq-hint" }, "填 0 表示不限制；孩子喂超了会看到「明天再来陪它吧」的提示", -1)),
                  limitPoints.value > 0 && minPetCost.value && limitPoints.value < minPetCost.value ? (openBlock(), createElementBlock("p", _hoisted_49, " ⚠️ 当前预算低于最便宜的宠物道具（" + toDisplayString(minPetCost.value) + " 分），孩子将无法使用任何道具 ", 1)) : createCommentVNode("", true)
                ])) : createCommentVNode("", true),
                createBaseVNode("div", _hoisted_50, "宠物玩法累计消耗 " + toDisplayString(spentOf(petChild.value.id)) + " 积分（均为孩子自愿兑换）", 1),
                _cache[30] || (_cache[30] = createBaseVNode("div", { class: "pd-logs-title" }, "喂养记录", -1)),
                petLogsLoading.value ? (openBlock(), createElementBlock("div", _hoisted_51, "加载中...")) : petLogs.value.length === 0 ? (openBlock(), createElementBlock("div", _hoisted_52, "还没有喂养记录")) : (openBlock(), createElementBlock("div", _hoisted_53, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(petLogs.value, (l) => {
                    return openBlock(), createElementBlock("div", {
                      key: l.id,
                      class: "log-item"
                    }, [
                      createBaseVNode("div", _hoisted_54, "-" + toDisplayString(l.points) + " 🌟", 1),
                      createBaseVNode("div", _hoisted_55, [
                        createBaseVNode("div", _hoisted_56, [
                          createBaseVNode("span", _hoisted_57, "🍽️ " + toDisplayString(l.item_name), 1),
                          l.effectText ? (openBlock(), createElementBlock("span", _hoisted_58, "· " + toDisplayString(l.effectText), 1)) : createCommentVNode("", true)
                        ]),
                        createBaseVNode("div", _hoisted_59, toDisplayString(fmtTime(l.created_at)), 1)
                      ])
                    ]);
                  }), 128))
                ])),
                createVNode(Pager, {
                  page: petLogsPage.value,
                  "page-size": unref(PET_LOGS_PAGE_SIZE),
                  total: petLogsTotal.value,
                  disabled: petLogsLoading.value,
                  "onUpdate:page": _cache[6] || (_cache[6] = ($event) => petChild.value && loadPetLogs(petChild.value.id, $event))
                }, null, 8, ["page", "page-size", "total", "disabled"]),
                createBaseVNode("button", {
                  class: "pd-reset",
                  onClick: _cache[7] || (_cache[7] = ($event) => resetOpen.value = true)
                }, "重置这只宠物")
              ]))
            ], 64)) : createCommentVNode("", true)
          ]),
          _: 1
        }, 8, ["modelValue", "title"]),
        createVNode(ConfirmDialog, {
          modelValue: resetOpen.value,
          "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => resetOpen.value = $event),
          title: "重置宠物",
          message: `确认删除${((_a = petChild.value) == null ? void 0 : _a.name) ?? ""}的宠物？删除后孩子需要重新领养，宠物等级会从 Lv1 开始`,
          confirmText: "重置",
          variant: "danger",
          onConfirm: doResetPet
        }, null, 8, ["modelValue", "message"])
      ]);
    };
  }
});
const Dashboard = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-fd2c4704"]]);
export {
  Dashboard as default
};
