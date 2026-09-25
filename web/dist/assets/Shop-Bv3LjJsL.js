import { d as defineComponent, a as useToastStore, u as useAuthStore, o as onMounted, W as WS_EVENTS, B as onUnmounted, c as createElementBlock, b as createBaseVNode, t as toDisplayString, n as normalizeClass, F as Fragment, m as createVNode, p as withCtx, q as createBlock, r as renderList, f as createCommentVNode, x as createTextVNode, e as unref, g as withModifiers, h as withDirectives, v as vModelText, i as ref, y as computed, z as api, E as resolveComponent, k as openBlock, I as petEffectText, _ as _export_sfc } from "./index-DLtaHw3I.js";
import { L as LIST_PAGE_SIZE, P as Pager } from "./Pager-gbjjgpVA.js";
import { G as GlassCard } from "./GlassCard-DXR0hosh.js";
import { E as EmptyState } from "./EmptyState-3g4kc4Z_.js";
import { C as ConfirmDialog } from "./ConfirmDialog-BWQPEwj0.js";
import { C as CategoryIcon } from "./CategoryIcon-Cl8_OLmG.js";
const _hoisted_1 = { class: "page" };
const _hoisted_2 = { class: "page-header" };
const _hoisted_3 = { class: "points-box" };
const _hoisted_4 = { class: "num" };
const _hoisted_5 = { class: "tabs" };
const _hoisted_6 = { class: "cash-left" };
const _hoisted_7 = { class: "cash-desc" };
const _hoisted_8 = { class: "kind-tabs" };
const _hoisted_9 = {
  key: 0,
  class: "group-empty"
};
const _hoisted_10 = {
  key: 1,
  class: "product-list"
};
const _hoisted_11 = { class: "p-info" };
const _hoisted_12 = { class: "name" };
const _hoisted_13 = { class: "cost" };
const _hoisted_14 = ["disabled", "onClick"];
const _hoisted_15 = { class: "group-sub" };
const _hoisted_16 = {
  key: 0,
  class: "quota-chip"
};
const _hoisted_17 = {
  key: 1,
  class: "group-empty"
};
const _hoisted_18 = {
  key: 2,
  class: "product-list"
};
const _hoisted_19 = { class: "p-info" };
const _hoisted_20 = { class: "name" };
const _hoisted_21 = { class: "stock pet-effect" };
const _hoisted_22 = { class: "cost" };
const _hoisted_23 = ["disabled", "onClick"];
const _hoisted_24 = {
  key: 3,
  class: "adopt-hint"
};
const _hoisted_25 = {
  key: 1,
  class: "records"
};
const _hoisted_26 = { class: "r-head" };
const _hoisted_27 = { class: "r-type" };
const _hoisted_28 = {
  key: 1,
  class: "r-type-emoji"
};
const _hoisted_29 = { class: "r-detail" };
const _hoisted_30 = { key: 0 };
const _hoisted_31 = { key: 1 };
const _hoisted_32 = { class: "r-pts" };
const _hoisted_33 = {
  key: 0,
  class: "r-reason"
};
const _hoisted_34 = { class: "r-time" };
const _hoisted_35 = { class: "modal glass-strong" };
const _hoisted_36 = { class: "modal-hint" };
const _hoisted_37 = { class: "my-points" };
const _hoisted_38 = {
  key: 0,
  class: "not-enough"
};
const _hoisted_39 = { class: "input-row" };
const _hoisted_40 = ["step"];
const _hoisted_41 = { class: "amount-display" };
const _hoisted_42 = { class: "amount" };
const _hoisted_43 = { class: "modal-actions" };
const _hoisted_44 = ["disabled"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Shop",
  setup(__props) {
    const toast = useToastStore();
    const auth = useAuthStore();
    const products = ref([]);
    const myRequests = ref([]);
    const loading = ref(true);
    const myPoints = computed(() => {
      var _a;
      return ((_a = auth.user) == null ? void 0 : _a.totalPoints) ?? 0;
    });
    const tab = ref("shop");
    const kindTab = ref("all");
    const hasPet = ref(false);
    const petName = ref("");
    const feedingId = ref(null);
    const quota = ref(null);
    const physicalProducts = computed(() => products.value.filter((p) => p.kind !== "pet"));
    const petProducts = computed(() => products.value.filter((p) => p.kind === "pet"));
    const showPhysical = computed(() => kindTab.value !== "pet");
    const showPet = computed(() => kindTab.value !== "physical");
    const cashOpen = ref(false);
    const cashPoints = ref(10);
    const cashRate = ref(10);
    const cashAmount = computed(() => cashPoints.value / cashRate.value);
    const confirmOpen = ref(false);
    const confirmMessage = ref("");
    const confirmAction = ref(null);
    const REC_PAGE = LIST_PAGE_SIZE;
    const recPage = ref(1);
    const recTotal = ref(0);
    async function loadRecords(p = recPage.value) {
      const res = await api.get(
        `/exchange-requests/mine?limit=${REC_PAGE}&offset=${(p - 1) * REC_PAGE}`
      );
      myRequests.value = res.requests;
      recTotal.value = res.total ?? res.requests.length;
      recPage.value = p;
    }
    async function load() {
      var _a;
      loading.value = true;
      try {
        const [p, rate, me] = await Promise.all([
          api.get("/products"),
          api.get("/products/cash-rate"),
          api.get("/pets/me").catch(() => ({ pet: null, quota: null }))
        ]);
        products.value = p.products;
        cashRate.value = rate.rate;
        hasPet.value = !!me.pet;
        petName.value = ((_a = me.pet) == null ? void 0 : _a.displayName) ?? "";
        quota.value = me.quota ?? null;
        await Promise.all([loadRecords(1), auth.refreshMe()]);
      } finally {
        loading.value = false;
      }
    }
    async function feedPet(p) {
      var _a;
      if (feedingId.value !== null) return;
      if (!hasPet.value) {
        return toast.info("还没有宠物哦，先去「宠物」页领养一只吧~");
      }
      if (myPoints.value < p.cost) {
        return toast.warning(`积分不足，还差 ${p.cost - myPoints.value} 分`);
      }
      feedingId.value = p.id;
      try {
        const res = await api.post("/pets/use-item", { productId: p.id });
        if (res.quota) quota.value = res.quota;
        if (auth.user) auth.setUser({ ...auth.user, totalPoints: res.newBalance });
        if (res.leveledUp) {
          toast.success(`🎉 进化啦！${res.pet.displayName} 现在是 Lv${res.levelAfter} ${res.stageNameAfter}`);
        } else {
          toast.success(`${res.pet.displayName} 吃了「${res.itemName}」，${res.effectText}`);
        }
        petName.value = res.pet.displayName;
        const prodRes = await api.get("/products");
        products.value = prodRes.products;
      } catch (e) {
        const err = (_a = e.payload) == null ? void 0 : _a.error;
        if (err === "insufficient_points") toast.error("积分不足");
        else if (err === "out_of_stock") toast.error("这个道具已经卖完啦");
        else if (err === "pet_max_level") toast.info("宠物已经满级啦，不用再喂经验道具了");
        else if (err === "no_pet") toast.info("你还没有宠物哦");
        else if (err === "feed_limit_reached") toast.info("今天陪宠物玩的时间用完啦，明天再来陪它吧~");
        else if (err === "points_limit_reached") toast.info("今天的宠物积分用完啦，明天再来吧~");
        else toast.error(e.message || "喂养失败");
      } finally {
        feedingId.value = null;
      }
    }
    async function exchangeProduct(p) {
      if (myPoints.value < p.cost) {
        return toast.warning(`积分不足，还差 ${p.cost - myPoints.value} 分`);
      }
      confirmMessage.value = `确认兑换「${p.name}」？消耗 ${p.cost} 分
（等待家长审核通过后扣分）`;
      confirmAction.value = async () => {
        var _a;
        try {
          await api.post("/exchange-requests", { type: "product", productId: p.id });
          toast.success("申请已提交，等家长审核哦~");
          await load();
        } catch (e) {
          const err = (_a = e.payload) == null ? void 0 : _a.error;
          if (err === "insufficient_points") toast.error("积分不足");
          else if (err === "out_of_stock") toast.error("商品已售罄");
          else toast.error(e.message);
        }
      };
      confirmOpen.value = true;
    }
    function openCash() {
      const affordable = Math.floor(myPoints.value / cashRate.value) * cashRate.value;
      cashPoints.value = affordable > 0 ? affordable : 0;
      cashOpen.value = true;
    }
    async function exchangeCash() {
      if (cashPoints.value % cashRate.value !== 0) return toast.warning(`积分必须是 ${cashRate.value} 的倍数`);
      if (cashPoints.value > myPoints.value) return toast.warning("积分不足");
      confirmMessage.value = `确认兑换 ${cashAmount.value} 元？消耗 ${cashPoints.value} 积分`;
      confirmAction.value = async () => {
        var _a;
        try {
          await api.post("/exchange-requests", { type: "cash", points: cashPoints.value });
          toast.success(`已申请兑换 ${cashAmount.value} 元，等家长审核`);
          cashOpen.value = false;
          await load();
        } catch (e) {
          if (((_a = e.payload) == null ? void 0 : _a.error) === "insufficient_points") toast.error("积分不足");
          else toast.error(e.message);
        }
      };
      confirmOpen.value = true;
    }
    async function runConfirm() {
      if (confirmAction.value) await confirmAction.value();
      confirmAction.value = null;
    }
    function fmtTime(ts) {
      const d = new Date(ts * 1e3);
      const diff = Date.now() - ts * 1e3;
      if (diff < 6e4) return "刚刚";
      if (diff < 36e5) return `${Math.floor(diff / 6e4)}分钟前`;
      if (diff < 864e5) return `${Math.floor(diff / 36e5)}小时前`;
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }
    const statusText = {
      pending: "⏳ 审核中",
      approved: "✅ 已通过",
      rejected: "❌ 已拒绝"
    };
    const typeIcon = {
      cash: "💰 现金",
      product: "商品"
    };
    onMounted(() => {
      load();
      window.addEventListener(WS_EVENTS.exchangeReviewed, onReviewed);
    });
    function onReviewed() {
      load();
    }
    onUnmounted(() => {
      window.removeEventListener("ws:exchange_reviewed", onReviewed);
    });
    return (_ctx, _cache) => {
      const _component_RouterLink = resolveComponent("RouterLink");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("header", _hoisted_2, [
          _cache[11] || (_cache[11] = createBaseVNode("div", null, [
            createBaseVNode("h1", { class: "title" }, "积分商城"),
            createBaseVNode("p", { class: "subtitle" }, "攒积分，换好礼~")
          ], -1)),
          createBaseVNode("div", _hoisted_3, [
            createBaseVNode("span", _hoisted_4, toDisplayString(myPoints.value), 1),
            _cache[9] || (_cache[9] = createBaseVNode("span", { class: "unit" }, "分", -1)),
            _cache[10] || (_cache[10] = createBaseVNode("span", { class: "emoji" }, "🌟", -1))
          ])
        ]),
        createBaseVNode("div", _hoisted_5, [
          createBaseVNode("button", {
            class: normalizeClass({ active: tab.value === "shop" }),
            onClick: _cache[0] || (_cache[0] = ($event) => tab.value = "shop")
          }, "🎁 商城", 2),
          createBaseVNode("button", {
            class: normalizeClass({ active: tab.value === "records" }),
            onClick: _cache[1] || (_cache[1] = ($event) => tab.value = "records")
          }, "📋 我的兑换", 2)
        ]),
        tab.value === "shop" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
          createVNode(GlassCard, {
            padding: "16px 18px",
            class: "cash-entry",
            onClick: openCash
          }, {
            default: withCtx(() => [
              createBaseVNode("div", _hoisted_6, [
                _cache[13] || (_cache[13] = createBaseVNode("span", { class: "emoji" }, "💵", -1)),
                createBaseVNode("div", null, [
                  _cache[12] || (_cache[12] = createBaseVNode("div", { class: "cash-title" }, "现金兑换", -1)),
                  createBaseVNode("div", _hoisted_7, toDisplayString(cashRate.value) + " 🌟 = 1 元", 1)
                ])
              ]),
              _cache[14] || (_cache[14] = createBaseVNode("span", { class: "arrow" }, "›", -1))
            ]),
            _: 1
          }),
          !loading.value && products.value.length === 0 ? (openBlock(), createBlock(EmptyState, {
            key: 0,
            emoji: "🎁",
            text: "商城还没有商品",
            hint: "让爸爸妈妈添加商品吧~"
          })) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
            createBaseVNode("div", _hoisted_8, [
              createBaseVNode("button", {
                class: normalizeClass({ active: kindTab.value === "all" }),
                onClick: _cache[2] || (_cache[2] = ($event) => kindTab.value = "all")
              }, "全部", 2),
              createBaseVNode("button", {
                class: normalizeClass({ active: kindTab.value === "physical" }),
                onClick: _cache[3] || (_cache[3] = ($event) => kindTab.value = "physical")
              }, "🎁 实物好礼", 2),
              createBaseVNode("button", {
                class: normalizeClass({ active: kindTab.value === "pet" }),
                onClick: _cache[4] || (_cache[4] = ($event) => kindTab.value = "pet")
              }, "🐾 宠物道具", 2)
            ]),
            showPhysical.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
              _cache[15] || (_cache[15] = createBaseVNode("h3", { class: "group-title" }, "🎁 实物好礼", -1)),
              _cache[16] || (_cache[16] = createBaseVNode("p", { class: "group-sub" }, "兑换后等爸爸妈妈审核发给你", -1)),
              physicalProducts.value.length === 0 ? (openBlock(), createElementBlock("p", _hoisted_9, "还没有实物商品")) : (openBlock(), createElementBlock("div", _hoisted_10, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(physicalProducts.value, (p) => {
                  return openBlock(), createBlock(GlassCard, {
                    key: p.id,
                    padding: "10px 14px",
                    class: "product-row"
                  }, {
                    default: withCtx(() => [
                      createVNode(CategoryIcon, {
                        icon: p.icon,
                        size: 40
                      }, null, 8, ["icon"]),
                      createBaseVNode("div", _hoisted_11, [
                        createBaseVNode("span", _hoisted_12, toDisplayString(p.name), 1),
                        createBaseVNode("span", {
                          class: normalizeClass(["stock", { soldout: p.stock === 0 }])
                        }, toDisplayString(p.stock === -1 ? "库存不限" : p.stock === 0 ? "已售罄" : `剩 ${p.stock} 件`), 3)
                      ]),
                      createBaseVNode("span", _hoisted_13, toDisplayString(p.cost) + " 🌟", 1),
                      createBaseVNode("button", {
                        class: "btn btn-primary exchange-btn",
                        disabled: myPoints.value < p.cost || p.stock === 0,
                        onClick: ($event) => exchangeProduct(p)
                      }, toDisplayString(p.stock === 0 ? "售罄" : myPoints.value < p.cost ? "🌟不足" : "兑换"), 9, _hoisted_14)
                    ]),
                    _: 2
                  }, 1024);
                }), 128))
              ]))
            ], 64)) : createCommentVNode("", true),
            showPet.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
              _cache[20] || (_cache[20] = createBaseVNode("h3", { class: "group-title" }, "🐾 宠物道具", -1)),
              createBaseVNode("p", _hoisted_15, toDisplayString(hasPet.value ? `买给「${petName.value}」立刻就能用，不用等审核` : "还没有宠物，先去领养一只吧"), 1),
              hasPet.value && quota.value && (quota.value.feedLimit > 0 || quota.value.pointsLimit > 0) ? (openBlock(), createElementBlock("p", _hoisted_16, [
                quota.value.feedLimit > 0 ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createTextVNode(" 今天已喂 " + toDisplayString(quota.value.todayFed) + "/" + toDisplayString(quota.value.feedLimit) + " 次", 1),
                  quota.value.feedsLeft ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                    createTextVNode("，还能喂 " + toDisplayString(quota.value.feedsLeft) + " 次", 1)
                  ], 64)) : createCommentVNode("", true)
                ], 64)) : createCommentVNode("", true),
                quota.value.pointsLimit > 0 ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                  createTextVNode(toDisplayString(quota.value.feedLimit > 0 ? " · " : "") + "宠物积分还剩 " + toDisplayString(quota.value.pointsLeft) + " 🌟 ", 1)
                ], 64)) : createCommentVNode("", true)
              ])) : createCommentVNode("", true),
              petProducts.value.length === 0 ? (openBlock(), createElementBlock("p", _hoisted_17, "还没有宠物道具")) : (openBlock(), createElementBlock("div", _hoisted_18, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(petProducts.value, (p) => {
                  return openBlock(), createBlock(GlassCard, {
                    key: p.id,
                    padding: "10px 14px",
                    class: "product-row pet-row"
                  }, {
                    default: withCtx(() => [
                      createVNode(CategoryIcon, {
                        icon: p.icon,
                        size: 40
                      }, null, 8, ["icon"]),
                      createBaseVNode("div", _hoisted_19, [
                        createBaseVNode("span", _hoisted_20, toDisplayString(p.name), 1),
                        createBaseVNode("span", _hoisted_21, toDisplayString(unref(petEffectText)(p.pet_effect)), 1)
                      ]),
                      createBaseVNode("span", _hoisted_22, toDisplayString(p.cost) + " 🌟", 1),
                      createBaseVNode("button", {
                        class: "btn btn-primary exchange-btn",
                        disabled: myPoints.value < p.cost || p.stock === 0 || feedingId.value === p.id || !hasPet.value,
                        onClick: ($event) => feedPet(p)
                      }, toDisplayString(!hasPet.value ? "先领养" : p.stock === 0 ? "售罄" : myPoints.value < p.cost ? "🌟不足" : feedingId.value === p.id ? "喂…" : "喂给它"), 9, _hoisted_23)
                    ]),
                    _: 2
                  }, 1024);
                }), 128))
              ])),
              !hasPet.value ? (openBlock(), createElementBlock("div", _hoisted_24, [
                _cache[18] || (_cache[18] = createBaseVNode("span", { class: "ah-emoji" }, "🥚", -1)),
                _cache[19] || (_cache[19] = createBaseVNode("span", null, "去宠物页领养一只，就能用这些道具啦~", -1)),
                createVNode(_component_RouterLink, {
                  class: "btn btn-primary ah-btn",
                  to: "/child/pet"
                }, {
                  default: withCtx(() => [..._cache[17] || (_cache[17] = [
                    createTextVNode("去领养", -1)
                  ])]),
                  _: 1
                })
              ])) : createCommentVNode("", true)
            ], 64)) : createCommentVNode("", true)
          ], 64))
        ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
          !loading.value && myRequests.value.length === 0 ? (openBlock(), createBlock(EmptyState, {
            key: 0,
            emoji: "📋",
            text: "还没有兑换记录"
          })) : (openBlock(), createElementBlock("div", _hoisted_25, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(myRequests.value, (r) => {
              return openBlock(), createBlock(GlassCard, {
                key: r.id,
                padding: "12px 16px",
                class: "record"
              }, {
                default: withCtx(() => [
                  createBaseVNode("div", _hoisted_26, [
                    createBaseVNode("span", _hoisted_27, [
                      r.type === "product" ? (openBlock(), createBlock(CategoryIcon, {
                        key: 0,
                        icon: r.product_icon,
                        size: 24
                      }, null, 8, ["icon"])) : (openBlock(), createElementBlock("span", _hoisted_28, "💰")),
                      createBaseVNode("span", null, toDisplayString(typeIcon[r.type]), 1)
                    ]),
                    createBaseVNode("span", {
                      class: normalizeClass(["r-status", r.status])
                    }, toDisplayString(statusText[r.status]), 3)
                  ]),
                  createBaseVNode("div", _hoisted_29, [
                    r.type === "product" ? (openBlock(), createElementBlock("span", _hoisted_30, toDisplayString(r.product_name || "已删除商品"), 1)) : (openBlock(), createElementBlock("span", _hoisted_31, toDisplayString(r.amount) + " 元", 1)),
                    createBaseVNode("span", _hoisted_32, "🌟 -" + toDisplayString(r.points) + " 分", 1)
                  ]),
                  r.status === "rejected" && r.reason ? (openBlock(), createElementBlock("div", _hoisted_33, " 📝 " + toDisplayString(r.reason), 1)) : createCommentVNode("", true),
                  createBaseVNode("div", _hoisted_34, toDisplayString(fmtTime(r.created_at)), 1)
                ]),
                _: 2
              }, 1024);
            }), 128))
          ])),
          createVNode(Pager, {
            page: recPage.value,
            "page-size": unref(REC_PAGE),
            total: recTotal.value,
            "onUpdate:page": loadRecords
          }, null, 8, ["page", "page-size", "total"])
        ], 64)),
        cashOpen.value ? (openBlock(), createElementBlock("div", {
          key: 2,
          class: "modal-overlay",
          onClick: _cache[7] || (_cache[7] = withModifiers(($event) => cashOpen.value = false, ["self"]))
        }, [
          createBaseVNode("div", _hoisted_35, [
            _cache[24] || (_cache[24] = createBaseVNode("h3", { class: "modal-title" }, "💵 现金兑换", -1)),
            createBaseVNode("p", _hoisted_36, toDisplayString(cashRate.value) + " 🌟 = 1 元（必须是 " + toDisplayString(cashRate.value) + " 的倍数）", 1),
            createBaseVNode("div", _hoisted_37, "🌟 当前积分：" + toDisplayString(myPoints.value) + " 分", 1),
            myPoints.value < cashRate.value ? (openBlock(), createElementBlock("p", _hoisted_38, " 现在有 " + toDisplayString(myPoints.value) + " 🌟，攒够 " + toDisplayString(cashRate.value) + " 🌟 就能换 1 元啦~ ", 1)) : createCommentVNode("", true),
            createBaseVNode("div", _hoisted_39, [
              withDirectives(createBaseVNode("input", {
                "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => cashPoints.value = $event),
                type: "number",
                min: "0",
                step: cashRate.value
              }, null, 8, _hoisted_40), [
                [
                  vModelText,
                  cashPoints.value,
                  void 0,
                  { number: true }
                ]
              ]),
              _cache[21] || (_cache[21] = createBaseVNode("span", { class: "suffix" }, "分", -1))
            ]),
            createBaseVNode("div", _hoisted_41, [
              _cache[22] || (_cache[22] = createTextVNode(" 可兑换 ", -1)),
              createBaseVNode("span", _hoisted_42, toDisplayString(cashAmount.value), 1),
              _cache[23] || (_cache[23] = createTextVNode(" 元 ", -1))
            ]),
            createBaseVNode("div", _hoisted_43, [
              createBaseVNode("button", {
                class: "btn btn-ghost",
                onClick: _cache[6] || (_cache[6] = ($event) => cashOpen.value = false)
              }, "取消"),
              createBaseVNode("button", {
                class: "btn btn-primary",
                onClick: exchangeCash,
                disabled: cashPoints.value <= 0 || cashPoints.value % cashRate.value !== 0 || cashPoints.value > myPoints.value
              }, " 确认申请 ", 8, _hoisted_44)
            ])
          ])
        ])) : createCommentVNode("", true),
        createVNode(ConfirmDialog, {
          modelValue: confirmOpen.value,
          "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => confirmOpen.value = $event),
          title: "确认操作",
          message: confirmMessage.value,
          confirmText: "确认",
          onConfirm: runConfirm
        }, null, 8, ["modelValue", "message"])
      ]);
    };
  }
});
const Shop = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-2708bea6"]]);
export {
  Shop as default
};
