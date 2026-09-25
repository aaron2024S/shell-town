import { d as defineComponent, a as useToastStore, w as watch, q as createBlock, p as withCtx, y as computed, k as openBlock, b as createBaseVNode, n as normalizeClass, x as createTextVNode, c as createElementBlock, r as renderList, m as createVNode, t as toDisplayString, F as Fragment, h as withDirectives, v as vModelText, f as createCommentVNode, H as vModelCheckbox, i as ref, z as api, I as petEffectText, _ as _export_sfc, o as onMounted, B as onUnmounted, g as withModifiers, e as unref } from "./index-DLtaHw3I.js";
import { G as GlassCard } from "./GlassCard-DXR0hosh.js";
import { E as EmptyState } from "./EmptyState-3g4kc4Z_.js";
import { M as Modal } from "./Modal-DiJeCwYw.js";
import { C as CategoryIcon, P as PET_ITEM_CATEGORIES, a as PET_ICON_KEYS, b as PRODUCT_CATEGORIES } from "./CategoryIcon-Cl8_OLmG.js";
import { C as ConfirmDialog } from "./ConfirmDialog-BWQPEwj0.js";
const _hoisted_1$1 = { class: "form" };
const _hoisted_2$1 = { class: "field" };
const _hoisted_3$1 = { class: "kind-switch" };
const _hoisted_4$1 = { class: "field" };
const _hoisted_5$1 = { class: "icon-grid" };
const _hoisted_6$1 = ["onClick"];
const _hoisted_7$1 = { class: "icon-label" };
const _hoisted_8$1 = { class: "field" };
const _hoisted_9$1 = { class: "label" };
const _hoisted_10$1 = ["placeholder"];
const _hoisted_11$1 = { class: "field" };
const _hoisted_12$1 = {
  key: 0,
  class: "field"
};
const _hoisted_13$1 = { class: "effect-grid" };
const _hoisted_14$1 = { class: "eff" };
const _hoisted_15$1 = { class: "eff" };
const _hoisted_16$1 = { class: "eff" };
const _hoisted_17$1 = { class: "eff" };
const _hoisted_18$1 = {
  key: 0,
  class: "eff-preview"
};
const _hoisted_19$1 = { class: "field" };
const _hoisted_20$1 = { class: "label" };
const _hoisted_21$1 = ["disabled"];
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "ProductEditor",
  props: {
    modelValue: { type: Boolean },
    product: {}
  },
  emits: ["update:modelValue", "saved"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const toast = useToastStore();
    const isEdit = computed(() => !!props.product);
    const name = ref("");
    const cost = ref(20);
    const stock = ref(-1);
    const unlimited = ref(true);
    const icon = ref("gift");
    const kind = ref("physical");
    const saving = ref(false);
    const exp = ref(null);
    const satiety = ref(null);
    const happiness = ref(null);
    const health = ref(null);
    const icons = computed(
      () => kind.value === "pet" ? PET_ITEM_CATEGORIES : PRODUCT_CATEGORIES
    );
    function iconFamily(key) {
      return PET_ICON_KEYS.includes(key) ? "pet" : "physical";
    }
    const effectSummary = computed(
      () => petEffectText({
        exp: exp.value ?? void 0,
        satiety: satiety.value ?? void 0,
        happiness: happiness.value ?? void 0,
        health: health.value ?? void 0
      })
    );
    function resetForm() {
      name.value = "";
      cost.value = 20;
      stock.value = -1;
      unlimited.value = true;
      icon.value = "gift";
      kind.value = "physical";
      exp.value = null;
      satiety.value = null;
      happiness.value = null;
      health.value = null;
    }
    watch(() => props.modelValue, (open) => {
      if (!open) return;
      if (props.product) {
        const p = props.product;
        name.value = p.name;
        cost.value = p.cost;
        stock.value = p.stock;
        unlimited.value = p.stock === -1;
        icon.value = p.icon || "gift";
        kind.value = p.kind === "pet" ? "pet" : "physical";
        const e = p.pet_effect || {};
        exp.value = e.exp ?? null;
        satiety.value = e.satiety ?? null;
        happiness.value = e.happiness ?? null;
        health.value = e.health ?? null;
      } else {
        resetForm();
      }
    }, { immediate: true });
    function pickIcon(key) {
      icon.value = key;
    }
    function pickKind(k) {
      if (kind.value === k) return;
      kind.value = k;
      if (iconFamily(icon.value) !== k) {
        icon.value = k === "pet" ? PET_ITEM_CATEGORIES[0].key : "gift";
      }
    }
    async function save() {
      var _a;
      if (!name.value.trim()) return toast.warning("请输入商品名称");
      if (cost.value <= 0) return toast.warning("积分必须大于0");
      if (!unlimited.value && stock.value < 0) return toast.warning("库存不能小于0");
      const petEffect = kind.value === "pet" ? {
        ...exp.value ? { exp: exp.value } : {},
        ...satiety.value ? { satiety: satiety.value } : {},
        ...happiness.value ? { happiness: happiness.value } : {},
        ...health.value ? { health: health.value } : {}
      } : null;
      if (kind.value === "pet" && (!petEffect || Object.keys(petEffect).length === 0)) {
        return toast.warning("宠物道具至少要设置一项效果");
      }
      saving.value = true;
      try {
        const body = {
          name: name.value.trim(),
          cost: cost.value,
          stock: unlimited.value ? -1 : stock.value,
          icon: icon.value,
          kind: kind.value
        };
        if (kind.value === "pet") body.petEffect = petEffect;
        if (isEdit.value) {
          await api.patch(`/products/${props.product.id}`, body);
          toast.success("已更新");
        } else {
          await api.post("/products", body);
          toast.success(kind.value === "pet" ? "宠物道具已添加 🐾" : "商品已添加 🎁");
        }
        emit("saved");
      } catch (e) {
        const err = (_a = e.payload) == null ? void 0 : _a.error;
        if (err === "missing_pet_effect") toast.error("宠物道具必须设置效果");
        else toast.error(e.message);
      } finally {
        saving.value = false;
      }
    }
    return (_ctx, _cache) => {
      return openBlock(), createBlock(Modal, {
        "model-value": __props.modelValue,
        title: isEdit.value ? "编辑商品" : "新增商品",
        "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => emit("update:modelValue", $event))
      }, {
        footer: withCtx(() => [
          _cache[24] || (_cache[24] = createBaseVNode("span", { style: { "flex": "1" } }, null, -1)),
          createBaseVNode("button", {
            class: "btn btn-ghost",
            onClick: _cache[10] || (_cache[10] = ($event) => emit("update:modelValue", false))
          }, "取消"),
          createBaseVNode("button", {
            class: "btn btn-primary",
            onClick: save,
            disabled: saving.value
          }, toDisplayString(saving.value ? "保存中..." : "保存"), 9, _hoisted_21$1)
        ]),
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1$1, [
            createBaseVNode("div", _hoisted_2$1, [
              _cache[14] || (_cache[14] = createBaseVNode("label", { class: "label" }, "商品类型", -1)),
              createBaseVNode("div", _hoisted_3$1, [
                createBaseVNode("button", {
                  type: "button",
                  class: normalizeClass(["kind-btn", { active: kind.value === "physical" }]),
                  onClick: _cache[0] || (_cache[0] = ($event) => pickKind("physical"))
                }, [..._cache[12] || (_cache[12] = [
                  createBaseVNode("span", { class: "k-emoji" }, "🎁", -1),
                  createBaseVNode("span", { class: "k-text" }, [
                    createBaseVNode("b", null, "实物好礼"),
                    createBaseVNode("i", null, "兑换后需家长审核发放")
                  ], -1)
                ])], 2),
                createBaseVNode("button", {
                  type: "button",
                  class: normalizeClass(["kind-btn", { active: kind.value === "pet" }]),
                  onClick: _cache[1] || (_cache[1] = ($event) => pickKind("pet"))
                }, [..._cache[13] || (_cache[13] = [
                  createBaseVNode("span", { class: "k-emoji" }, "🐾", -1),
                  createBaseVNode("span", { class: "k-text" }, [
                    createBaseVNode("b", null, "宠物道具"),
                    createBaseVNode("i", null, "孩子购买后立即喂给宠物")
                  ], -1)
                ])], 2)
              ])
            ]),
            createBaseVNode("div", _hoisted_4$1, [
              _cache[15] || (_cache[15] = createBaseVNode("label", { class: "label" }, [
                createTextVNode(" 图标 "),
                createBaseVNode("span", { class: "label-hint" }, "跟随上方商品类型，切换类型即换一组")
              ], -1)),
              createBaseVNode("div", _hoisted_5$1, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(icons.value, (c) => {
                  return openBlock(), createElementBlock("button", {
                    key: c.key,
                    type: "button",
                    class: normalizeClass(["icon-chip", { active: icon.value === c.key }]),
                    onClick: ($event) => pickIcon(c.key)
                  }, [
                    createVNode(CategoryIcon, {
                      icon: c.key,
                      size: 40
                    }, null, 8, ["icon"]),
                    createBaseVNode("span", _hoisted_7$1, toDisplayString(c.label), 1)
                  ], 10, _hoisted_6$1);
                }), 128))
              ])
            ]),
            createBaseVNode("div", _hoisted_8$1, [
              createBaseVNode("label", _hoisted_9$1, toDisplayString(kind.value === "pet" ? "道具名称" : "商品名称"), 1),
              withDirectives(createBaseVNode("input", {
                "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => name.value = $event),
                type: "text",
                maxlength: "50",
                placeholder: kind.value === "pet" ? "如：宠物口粮" : "如：冰淇淋一次"
              }, null, 8, _hoisted_10$1), [
                [vModelText, name.value]
              ])
            ]),
            createBaseVNode("div", _hoisted_11$1, [
              _cache[16] || (_cache[16] = createBaseVNode("label", { class: "label" }, "所需积分", -1)),
              withDirectives(createBaseVNode("input", {
                "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => cost.value = $event),
                type: "number",
                min: "1",
                max: "99999"
              }, null, 512), [
                [
                  vModelText,
                  cost.value,
                  void 0,
                  { number: true }
                ]
              ])
            ]),
            kind.value === "pet" ? (openBlock(), createElementBlock("div", _hoisted_12$1, [
              _cache[21] || (_cache[21] = createBaseVNode("label", { class: "label" }, "喂养效果（至少填一项）", -1)),
              createBaseVNode("div", _hoisted_13$1, [
                createBaseVNode("label", _hoisted_14$1, [
                  _cache[17] || (_cache[17] = createBaseVNode("span", { class: "eff-label" }, "⭐ 经验", -1)),
                  withDirectives(createBaseVNode("input", {
                    "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => exp.value = $event),
                    type: "number",
                    min: "1",
                    max: "9999",
                    placeholder: "0"
                  }, null, 512), [
                    [
                      vModelText,
                      exp.value,
                      void 0,
                      { number: true }
                    ]
                  ])
                ]),
                createBaseVNode("label", _hoisted_15$1, [
                  _cache[18] || (_cache[18] = createBaseVNode("span", { class: "eff-label" }, "🍚 饱食度", -1)),
                  withDirectives(createBaseVNode("input", {
                    "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => satiety.value = $event),
                    type: "number",
                    min: "1",
                    max: "100",
                    placeholder: "0"
                  }, null, 512), [
                    [
                      vModelText,
                      satiety.value,
                      void 0,
                      { number: true }
                    ]
                  ])
                ]),
                createBaseVNode("label", _hoisted_16$1, [
                  _cache[19] || (_cache[19] = createBaseVNode("span", { class: "eff-label" }, "😊 快乐值", -1)),
                  withDirectives(createBaseVNode("input", {
                    "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => happiness.value = $event),
                    type: "number",
                    min: "1",
                    max: "100",
                    placeholder: "0"
                  }, null, 512), [
                    [
                      vModelText,
                      happiness.value,
                      void 0,
                      { number: true }
                    ]
                  ])
                ]),
                createBaseVNode("label", _hoisted_17$1, [
                  _cache[20] || (_cache[20] = createBaseVNode("span", { class: "eff-label" }, "💚 健康值", -1)),
                  withDirectives(createBaseVNode("input", {
                    "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => health.value = $event),
                    type: "number",
                    min: "1",
                    max: "100",
                    placeholder: "0"
                  }, null, 512), [
                    [
                      vModelText,
                      health.value,
                      void 0,
                      { number: true }
                    ]
                  ])
                ])
              ]),
              _cache[22] || (_cache[22] = createBaseVNode("p", { class: "eff-tip" }, " 经验决定升级进化（满级所需经验按物种设定，默认 280）；状态值本身不升级也不掉级， 但会影响宠物心情，进而影响用道具获得的经验倍率（超级开心 ×1.5 ～ 肚子饿 ×0.5）。 ", -1)),
              effectSummary.value ? (openBlock(), createElementBlock("div", _hoisted_18$1, "效果：" + toDisplayString(effectSummary.value), 1)) : createCommentVNode("", true)
            ])) : createCommentVNode("", true),
            createBaseVNode("div", _hoisted_19$1, [
              createBaseVNode("label", _hoisted_20$1, [
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => unlimited.value = $event),
                  type: "checkbox",
                  class: "checkbox"
                }, null, 512), [
                  [vModelCheckbox, unlimited.value]
                ]),
                _cache[23] || (_cache[23] = createTextVNode(" 不限库存 ", -1))
              ]),
              !unlimited.value ? withDirectives((openBlock(), createElementBlock("input", {
                key: 0,
                "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => stock.value = $event),
                type: "number",
                min: "0",
                placeholder: "库存数量"
              }, null, 512)), [
                [
                  vModelText,
                  stock.value,
                  void 0,
                  { number: true }
                ]
              ]) : createCommentVNode("", true)
            ])
          ])
        ]),
        _: 1
      }, 8, ["model-value", "title"]);
    };
  }
});
const ProductEditor = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-e74b9d18"]]);
const _hoisted_1 = { class: "page" };
const _hoisted_2 = { class: "page-header" };
const _hoisted_3 = { class: "cash-info" };
const _hoisted_4 = { class: "cash-desc" };
const _hoisted_5 = { class: "group" };
const _hoisted_6 = { class: "group-head" };
const _hoisted_7 = { class: "group-sub" };
const _hoisted_8 = {
  key: 0,
  class: "group-empty"
};
const _hoisted_9 = {
  key: 1,
  class: "product-list"
};
const _hoisted_10 = { class: "row-name" };
const _hoisted_11 = { class: "name-text" };
const _hoisted_12 = {
  key: 0,
  class: "tag off"
};
const _hoisted_13 = { class: "row-cost" };
const _hoisted_14 = { class: "cost-num" };
const _hoisted_15 = { class: "row-stock" };
const _hoisted_16 = { key: 0 };
const _hoisted_17 = { key: 1 };
const _hoisted_18 = { class: "row-menu" };
const _hoisted_19 = ["onClick"];
const _hoisted_20 = ["onClick"];
const _hoisted_21 = ["onClick"];
const _hoisted_22 = { class: "mi-icon" };
const _hoisted_23 = ["onClick"];
const _hoisted_24 = { class: "group" };
const _hoisted_25 = { class: "group-head" };
const _hoisted_26 = { class: "group-sub" };
const _hoisted_27 = {
  key: 0,
  class: "group-empty"
};
const _hoisted_28 = {
  key: 1,
  class: "product-list"
};
const _hoisted_29 = { class: "row-name" };
const _hoisted_30 = { class: "name-text" };
const _hoisted_31 = {
  key: 0,
  class: "tag off"
};
const _hoisted_32 = { class: "row-effect" };
const _hoisted_33 = { class: "row-cost" };
const _hoisted_34 = { class: "cost-num" };
const _hoisted_35 = { class: "row-stock" };
const _hoisted_36 = { key: 0 };
const _hoisted_37 = { key: 1 };
const _hoisted_38 = { class: "row-menu" };
const _hoisted_39 = ["onClick"];
const _hoisted_40 = ["onClick"];
const _hoisted_41 = ["onClick"];
const _hoisted_42 = { class: "mi-icon" };
const _hoisted_43 = ["onClick"];
const _hoisted_44 = { class: "modal glass-strong" };
const _hoisted_45 = { class: "rate-input-row" };
const _hoisted_46 = { class: "rate-preview" };
const _hoisted_47 = { class: "modal-actions" };
const _hoisted_48 = ["disabled"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Shop",
  setup(__props) {
    const toast = useToastStore();
    const products = ref([]);
    const loading = ref(true);
    const editorOpen = ref(false);
    const editing = ref(null);
    const physicalProducts = computed(() => products.value.filter((p) => p.kind !== "pet"));
    const petProducts = computed(() => products.value.filter((p) => p.kind === "pet"));
    const cashRate = ref(10);
    const rateOpen = ref(false);
    const rateInput = ref(10);
    const rateSaving = ref(false);
    const confirmOpen = ref(false);
    const pendingDelete = ref(null);
    const openMenuId = ref(null);
    function toggleMenu(id) {
      openMenuId.value = openMenuId.value === id ? null : id;
    }
    function closeMenu() {
      openMenuId.value = null;
    }
    function onDocClick() {
      closeMenu();
    }
    onMounted(() => document.addEventListener("click", onDocClick));
    onUnmounted(() => document.removeEventListener("click", onDocClick));
    async function load() {
      loading.value = true;
      try {
        const [res, rate] = await Promise.all([
          api.get("/products"),
          api.get("/products/cash-rate")
        ]);
        products.value = res.products;
        cashRate.value = rate.rate;
      } finally {
        loading.value = false;
      }
    }
    function openRateEditor() {
      rateInput.value = cashRate.value;
      rateOpen.value = true;
    }
    async function saveRate() {
      if (!Number.isInteger(rateInput.value) || rateInput.value <= 0) {
        toast.warning("汇率必须是正整数");
        return;
      }
      rateSaving.value = true;
      try {
        await api.put("/products/cash-rate", { rate: rateInput.value });
        cashRate.value = rateInput.value;
        rateOpen.value = false;
        toast.success(`已设置 ${rateInput.value} 积分 = 1 元`);
      } catch (e) {
        toast.error(e.message);
      } finally {
        rateSaving.value = false;
      }
    }
    function openEditor(p) {
      closeMenu();
      editing.value = p ?? null;
      editorOpen.value = true;
    }
    async function onSaved() {
      editorOpen.value = false;
      await load();
    }
    async function toggleStatus(p) {
      closeMenu();
      try {
        const next = p.status === "active" ? "inactive" : "active";
        await api.patch(`/products/${p.id}`, { status: next });
        toast.success(next === "active" ? "已上架" : "已下架");
        await load();
      } catch (e) {
        toast.error(e.message);
      }
    }
    function remove(p) {
      closeMenu();
      pendingDelete.value = p;
      confirmOpen.value = true;
    }
    async function doDelete() {
      if (!pendingDelete.value) return;
      try {
        await api.delete(`/products/${pendingDelete.value.id}`);
        toast.success("已删除");
        await load();
      } catch (e) {
        toast.error(e.message);
      }
      pendingDelete.value = null;
    }
    onMounted(load);
    return (_ctx, _cache) => {
      var _a;
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("header", _hoisted_2, [
          _cache[8] || (_cache[8] = createBaseVNode("h1", { class: "title" }, "积分商城", -1)),
          createBaseVNode("button", {
            class: "btn btn-primary add-btn",
            onClick: _cache[0] || (_cache[0] = ($event) => openEditor())
          }, "＋ 新增")
        ]),
        createVNode(GlassCard, {
          padding: "14px 18px",
          class: "cash-card clickable",
          onClick: openRateEditor
        }, {
          default: withCtx(() => [
            _cache[10] || (_cache[10] = createBaseVNode("span", { class: "emoji" }, "💵", -1)),
            createBaseVNode("div", _hoisted_3, [
              _cache[9] || (_cache[9] = createBaseVNode("div", { class: "cash-title" }, "现金兑换", -1)),
              createBaseVNode("div", _hoisted_4, toDisplayString(cashRate.value) + " 积分 = 1 元，点击设置兑换比例", 1)
            ]),
            _cache[11] || (_cache[11] = createBaseVNode("span", { class: "edit-arrow" }, "⚙️", -1))
          ]),
          _: 1
        }),
        !loading.value && products.value.length === 0 ? (openBlock(), createBlock(EmptyState, {
          key: 0,
          emoji: "🎁",
          text: "还没有商品",
          hint: "点击右上角「新增」添加商品"
        })) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
          createBaseVNode("div", _hoisted_5, [
            createBaseVNode("div", _hoisted_6, [
              _cache[12] || (_cache[12] = createBaseVNode("h2", { class: "group-title" }, "🎁 实物好礼", -1)),
              createBaseVNode("span", _hoisted_7, toDisplayString(physicalProducts.value.length) + " 件 · 兑换需审核发放", 1)
            ]),
            physicalProducts.value.length === 0 ? (openBlock(), createElementBlock("p", _hoisted_8, "还没有实物商品")) : (openBlock(), createElementBlock("div", _hoisted_9, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(physicalProducts.value, (p) => {
                return openBlock(), createElementBlock("div", {
                  key: p.id,
                  class: normalizeClass(["product-row glass", { inactive: p.status === "inactive", "menu-open": openMenuId.value === p.id }])
                }, [
                  createVNode(CategoryIcon, {
                    icon: p.icon,
                    size: 42
                  }, null, 8, ["icon"]),
                  createBaseVNode("div", _hoisted_10, [
                    createBaseVNode("span", _hoisted_11, toDisplayString(p.name), 1),
                    p.status === "inactive" ? (openBlock(), createElementBlock("span", _hoisted_12, "已下架")) : createCommentVNode("", true)
                  ]),
                  createBaseVNode("div", _hoisted_13, [
                    createBaseVNode("span", _hoisted_14, toDisplayString(p.cost), 1),
                    _cache[13] || (_cache[13] = createBaseVNode("span", { class: "unit" }, "分", -1))
                  ]),
                  createBaseVNode("div", _hoisted_15, [
                    p.stock === -1 ? (openBlock(), createElementBlock("span", _hoisted_16, "库存 不限")) : (openBlock(), createElementBlock("span", _hoisted_17, [
                      _cache[14] || (_cache[14] = createTextVNode("库存 ", -1)),
                      createBaseVNode("span", {
                        class: normalizeClass({ low: p.stock <= 3 })
                      }, toDisplayString(p.stock), 3)
                    ]))
                  ]),
                  createBaseVNode("div", _hoisted_18, [
                    createBaseVNode("button", {
                      class: normalizeClass(["dots-btn", { active: openMenuId.value === p.id }]),
                      title: "更多操作",
                      onClick: withModifiers(($event) => toggleMenu(p.id), ["stop"])
                    }, "⋮", 10, _hoisted_19),
                    openMenuId.value === p.id ? (openBlock(), createElementBlock("div", {
                      key: 0,
                      class: "popup-menu glass-strong",
                      onClick: _cache[1] || (_cache[1] = withModifiers(() => {
                      }, ["stop"]))
                    }, [
                      createBaseVNode("button", {
                        class: "menu-item",
                        onClick: ($event) => openEditor(p)
                      }, [..._cache[15] || (_cache[15] = [
                        createBaseVNode("span", { class: "mi-icon" }, "✏️", -1),
                        createTextVNode(" 编辑 ", -1)
                      ])], 8, _hoisted_20),
                      createBaseVNode("button", {
                        class: "menu-item",
                        onClick: ($event) => toggleStatus(p)
                      }, [
                        createBaseVNode("span", _hoisted_22, toDisplayString(p.status === "active" ? "📥" : "📤"), 1),
                        createTextVNode(" " + toDisplayString(p.status === "active" ? "下架" : "上架"), 1)
                      ], 8, _hoisted_21),
                      createBaseVNode("button", {
                        class: "menu-item danger",
                        onClick: ($event) => remove(p)
                      }, [..._cache[16] || (_cache[16] = [
                        createBaseVNode("span", { class: "mi-icon" }, "🗑️", -1),
                        createTextVNode(" 删除 ", -1)
                      ])], 8, _hoisted_23)
                    ])) : createCommentVNode("", true)
                  ])
                ], 2);
              }), 128))
            ]))
          ]),
          createBaseVNode("div", _hoisted_24, [
            createBaseVNode("div", _hoisted_25, [
              _cache[17] || (_cache[17] = createBaseVNode("h2", { class: "group-title" }, "🐾 宠物道具", -1)),
              createBaseVNode("span", _hoisted_26, toDisplayString(petProducts.value.length) + " 件 · 孩子购买后即时喂养", 1)
            ]),
            petProducts.value.length === 0 ? (openBlock(), createElementBlock("p", _hoisted_27, " 还没有宠物道具，新增时选择「宠物道具」即可 ")) : (openBlock(), createElementBlock("div", _hoisted_28, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(petProducts.value, (p) => {
                return openBlock(), createElementBlock("div", {
                  key: p.id,
                  class: normalizeClass(["product-row glass pet-row", { inactive: p.status === "inactive", "menu-open": openMenuId.value === p.id }])
                }, [
                  createVNode(CategoryIcon, {
                    icon: p.icon,
                    size: 42
                  }, null, 8, ["icon"]),
                  createBaseVNode("div", _hoisted_29, [
                    createBaseVNode("span", _hoisted_30, toDisplayString(p.name), 1),
                    p.status === "inactive" ? (openBlock(), createElementBlock("span", _hoisted_31, "已下架")) : createCommentVNode("", true),
                    createBaseVNode("span", _hoisted_32, toDisplayString(unref(petEffectText)(p.pet_effect, "未设置效果")), 1)
                  ]),
                  createBaseVNode("div", _hoisted_33, [
                    createBaseVNode("span", _hoisted_34, toDisplayString(p.cost), 1),
                    _cache[18] || (_cache[18] = createBaseVNode("span", { class: "unit" }, "分", -1))
                  ]),
                  createBaseVNode("div", _hoisted_35, [
                    p.stock === -1 ? (openBlock(), createElementBlock("span", _hoisted_36, "库存 不限")) : (openBlock(), createElementBlock("span", _hoisted_37, [
                      _cache[19] || (_cache[19] = createTextVNode("库存 ", -1)),
                      createBaseVNode("span", {
                        class: normalizeClass({ low: p.stock <= 3 })
                      }, toDisplayString(p.stock), 3)
                    ]))
                  ]),
                  createBaseVNode("div", _hoisted_38, [
                    createBaseVNode("button", {
                      class: normalizeClass(["dots-btn", { active: openMenuId.value === p.id }]),
                      title: "更多操作",
                      onClick: withModifiers(($event) => toggleMenu(p.id), ["stop"])
                    }, "⋮", 10, _hoisted_39),
                    openMenuId.value === p.id ? (openBlock(), createElementBlock("div", {
                      key: 0,
                      class: "popup-menu glass-strong",
                      onClick: _cache[2] || (_cache[2] = withModifiers(() => {
                      }, ["stop"]))
                    }, [
                      createBaseVNode("button", {
                        class: "menu-item",
                        onClick: ($event) => openEditor(p)
                      }, [..._cache[20] || (_cache[20] = [
                        createBaseVNode("span", { class: "mi-icon" }, "✏️", -1),
                        createTextVNode(" 编辑 ", -1)
                      ])], 8, _hoisted_40),
                      createBaseVNode("button", {
                        class: "menu-item",
                        onClick: ($event) => toggleStatus(p)
                      }, [
                        createBaseVNode("span", _hoisted_42, toDisplayString(p.status === "active" ? "📥" : "📤"), 1),
                        createTextVNode(" " + toDisplayString(p.status === "active" ? "下架" : "上架"), 1)
                      ], 8, _hoisted_41),
                      createBaseVNode("button", {
                        class: "menu-item danger",
                        onClick: ($event) => remove(p)
                      }, [..._cache[21] || (_cache[21] = [
                        createBaseVNode("span", { class: "mi-icon" }, "🗑️", -1),
                        createTextVNode(" 删除 ", -1)
                      ])], 8, _hoisted_43)
                    ])) : createCommentVNode("", true)
                  ])
                ], 2);
              }), 128))
            ]))
          ])
        ], 64)),
        editorOpen.value ? (openBlock(), createBlock(ProductEditor, {
          key: 2,
          modelValue: editorOpen.value,
          "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => editorOpen.value = $event),
          product: editing.value,
          onSaved
        }, null, 8, ["modelValue", "product"])) : createCommentVNode("", true),
        rateOpen.value ? (openBlock(), createElementBlock("div", {
          key: 3,
          class: "modal-overlay",
          onClick: _cache[6] || (_cache[6] = withModifiers(($event) => rateOpen.value = false, ["self"]))
        }, [
          createBaseVNode("div", _hoisted_44, [
            _cache[23] || (_cache[23] = createBaseVNode("h3", { class: "modal-title" }, "💵 兑换比例设置", -1)),
            _cache[24] || (_cache[24] = createBaseVNode("p", { class: "modal-hint" }, "设置多少积分兑换 1 元", -1)),
            createBaseVNode("div", _hoisted_45, [
              withDirectives(createBaseVNode("input", {
                "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => rateInput.value = $event),
                type: "number",
                min: "1",
                step: "1",
                class: "rate-input"
              }, null, 512), [
                [
                  vModelText,
                  rateInput.value,
                  void 0,
                  { number: true }
                ]
              ]),
              _cache[22] || (_cache[22] = createBaseVNode("span", { class: "rate-suffix" }, "积分 = 1 元", -1))
            ]),
            createBaseVNode("div", _hoisted_46, " 预览：" + toDisplayString(rateInput.value) + " 积分可兑 " + toDisplayString((1 / rateInput.value).toFixed(2)) + " 元 ", 1),
            createBaseVNode("div", _hoisted_47, [
              createBaseVNode("button", {
                class: "btn btn-ghost",
                onClick: _cache[5] || (_cache[5] = ($event) => rateOpen.value = false)
              }, "取消"),
              createBaseVNode("button", {
                class: "btn btn-primary",
                disabled: rateSaving.value || !Number.isInteger(rateInput.value) || rateInput.value <= 0,
                onClick: saveRate
              }, toDisplayString(rateSaving.value ? "保存中..." : "保存"), 9, _hoisted_48)
            ])
          ])
        ])) : createCommentVNode("", true),
        createVNode(ConfirmDialog, {
          modelValue: confirmOpen.value,
          "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => confirmOpen.value = $event),
          title: "删除商品",
          message: `确认删除「${(_a = pendingDelete.value) == null ? void 0 : _a.name}」？删除后不可恢复`,
          confirmText: "删除",
          variant: "danger",
          onConfirm: doDelete
        }, null, 8, ["modelValue", "message"])
      ]);
    };
  }
});
const Shop = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-ecdfd66f"]]);
export {
  Shop as default
};
