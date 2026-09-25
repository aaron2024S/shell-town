import { d as defineComponent, Y as MAX_LEVEL, k as openBlock, c as createElementBlock, m as createVNode, b as createBaseVNode, t as toDisplayString, e as unref, Z as STAGE_NAMES, y as computed, _ as _export_sfc, $ as usePetCatalogStore, o as onMounted, a as useToastStore, w as watch, q as createBlock, p as withCtx, T as Transition, F as Fragment, r as renderList, n as normalizeClass, a0 as SERIES_LABELS, a1 as SERIES_ORDER, a2 as SERIES_HINTS, f as createCommentVNode, h as withDirectives, v as vModelText, x as createTextVNode, g as withModifiers, i as ref, z as api, a3 as getPetSpecies, u as useAuthStore, W as WS_EVENTS, B as onUnmounted, G as normalizeStyle, a4 as withKeys, S as STAT_META, I as petEffectText, a5 as stageLabel, a6 as MOOD_META } from "./index-DLtaHw3I.js";
import { L as LIST_PAGE_SIZE, P as Pager } from "./Pager-gbjjgpVA.js";
import { G as GlassCard } from "./GlassCard-DXR0hosh.js";
import { E as EmptyState } from "./EmptyState-3g4kc4Z_.js";
import { C as CategoryIcon } from "./CategoryIcon-Cl8_OLmG.js";
import { P as PetAvatar } from "./PetAvatar-DES9TyqT.js";
const _hoisted_1$2 = { class: "evo-preview" };
const _hoisted_2$2 = { class: "meta" };
const _hoisted_3$2 = { class: "stage" };
const _hoisted_4$2 = ["min", "max", "value"];
const _hoisted_5$2 = { class: "scale" };
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "PetEvolutionPreview",
  props: {
    species: {},
    level: {},
    min: { default: 1 },
    max: { default: MAX_LEVEL }
  },
  emits: ["update:level"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const lv = computed(() => Math.max(props.min, Math.min(props.max, Math.floor(props.level || props.min))));
    const stageName = computed(() => STAGE_NAMES[lv.value] ?? "");
    function onInput(e) {
      emit("update:level", Number(e.target.value));
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$2, [
        createVNode(PetAvatar, {
          species: __props.species,
          level: lv.value,
          size: 128,
          mood: "happy"
        }, null, 8, ["species", "level"]),
        createBaseVNode("div", _hoisted_2$2, [
          createBaseVNode("div", _hoisted_3$2, "Lv" + toDisplayString(lv.value) + " " + toDisplayString(stageName.value), 1),
          _cache[0] || (_cache[0] = createBaseVNode("div", { class: "hint" }, "拖一拖，看看它长大的样子", -1))
        ]),
        createBaseVNode("input", {
          class: "range",
          type: "range",
          min: __props.min,
          max: __props.max,
          step: "1",
          value: lv.value,
          onInput
        }, null, 40, _hoisted_4$2),
        createBaseVNode("div", _hoisted_5$2, [
          createBaseVNode("span", null, "Lv" + toDisplayString(__props.min) + " " + toDisplayString(unref(STAGE_NAMES)[__props.min]), 1),
          createBaseVNode("span", null, "Lv" + toDisplayString(__props.max) + " " + toDisplayString(unref(STAGE_NAMES)[__props.max]), 1)
        ])
      ]);
    };
  }
});
const PetEvolutionPreview = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__scopeId", "data-v-44b68f31"]]);
const _hoisted_1$1 = { class: "sheet glass-strong" };
const _hoisted_2$1 = { class: "head" };
const _hoisted_3$1 = { class: "head-sub" };
const _hoisted_4$1 = { class: "body" };
const _hoisted_5$1 = { class: "tabs" };
const _hoisted_6$1 = ["onClick"];
const _hoisted_7$1 = { class: "series-hint" };
const _hoisted_8$1 = { class: "grid" };
const _hoisted_9$1 = ["onClick"];
const _hoisted_10$1 = { class: "cell-name" };
const _hoisted_11$1 = {
  key: 0,
  class: "mine-tag"
};
const _hoisted_12$1 = { class: "name-row" };
const _hoisted_13$1 = ["placeholder"];
const _hoisted_14$1 = {
  key: 0,
  class: "warn"
};
const _hoisted_15$1 = {
  key: 1,
  class: "info"
};
const _hoisted_16$1 = {
  key: 2,
  class: "err"
};
const _hoisted_17$1 = { class: "foot" };
const _hoisted_18$1 = ["disabled"];
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "PetAdoptModal",
  props: {
    modelValue: { type: Boolean },
    current: {},
    preset: {}
  },
  emits: ["update:modelValue", "adopted"],
  setup(__props, { emit: __emit }) {
    const catalog = usePetCatalogStore();
    onMounted(() => catalog.load());
    const props = __props;
    const emit = __emit;
    const toast = useToastStore();
    const fallbackKey = computed(() => {
      var _a;
      return ((_a = catalog.species[0]) == null ? void 0 : _a.key) ?? "drake";
    });
    const series = ref("boy");
    const selected = ref("");
    const nickname = ref("");
    const previewLevel = ref(3);
    const saving = ref(false);
    const errorText = ref("");
    const list = computed(() => catalog.species.filter((s) => s.series === series.value));
    const selectedSpecies = computed(() => catalog.byKey(selected.value) ?? getPetSpecies(selected.value));
    const currentSpecies = computed(() => {
      var _a;
      return ((_a = props.current) == null ? void 0 : _a.species) ?? null;
    });
    const willReset = computed(() => !!currentSpecies.value && selected.value !== currentSpecies.value);
    const isSameSpecies = computed(() => !!currentSpecies.value && selected.value === currentSpecies.value);
    watch(
      () => props.modelValue,
      async (open) => {
        var _a, _b;
        if (!open) return;
        errorText.value = "";
        const start = props.preset || currentSpecies.value || fallbackKey.value;
        selected.value = start;
        series.value = (catalog.byKey(start) ?? getPetSpecies(start)).series;
        previewLevel.value = Math.max(1, Math.min(MAX_LEVEL, ((_a = props.current) == null ? void 0 : _a.level) || 3));
        nickname.value = ((_b = props.current) == null ? void 0 : _b.nickname) ?? "";
        await catalog.load(true);
        if (!props.modelValue || selected.value !== start) return;
        const sp = catalog.byKey(start);
        if (sp) series.value = sp.series;
      },
      { immediate: true }
    );
    function pick(key) {
      selected.value = key;
      errorText.value = "";
    }
    async function confirm() {
      var _a;
      if (saving.value) return;
      saving.value = true;
      errorText.value = "";
      try {
        const res = await api.post("/pets/adopt", {
          species: selected.value,
          nickname: nickname.value.trim() || void 0
        });
        if (res.created) {
          toast.success(`🎉 领养成功！这是你的${res.pet.displayName}啦`);
        } else if (res.reset) {
          toast.success(`换成${res.pet.speciesName}啦，要重新开始养哦~`);
        } else {
          toast.success("名字改好啦");
        }
        emit("adopted", res.pet);
        emit("update:modelValue", false);
      } catch (e) {
        const err = (_a = e.payload) == null ? void 0 : _a.error;
        if (err === "invalid_species") errorText.value = "这个形象暂时没有哦";
        else if (err === "child_only") errorText.value = "只有小朋友账号可以领养宠物";
        else errorText.value = e.message || "操作失败，再试一次";
      } finally {
        saving.value = false;
      }
    }
    const confirmText = computed(() => {
      if (!currentSpecies.value) return "就选它了";
      if (isSameSpecies.value) return "保存改名";
      return "换成它，重新养成";
    });
    return (_ctx, _cache) => {
      return openBlock(), createBlock(Transition, { name: "modal" }, {
        default: withCtx(() => [
          __props.modelValue ? (openBlock(), createElementBlock("div", {
            key: 0,
            class: "mask",
            onClick: _cache[4] || (_cache[4] = withModifiers(($event) => emit("update:modelValue", false), ["self"]))
          }, [
            createBaseVNode("div", _hoisted_1$1, [
              createBaseVNode("header", _hoisted_2$1, [
                _cache[5] || (_cache[5] = createBaseVNode("h2", { class: "head-title" }, "🐾 选择你的宠物", -1)),
                createBaseVNode("p", _hoisted_3$1, "一共 " + toDisplayString(unref(catalog).species.length) + " 只，都能从蛋养到究极体", 1),
                createBaseVNode("button", {
                  class: "close",
                  onClick: _cache[0] || (_cache[0] = ($event) => emit("update:modelValue", false))
                }, "✕")
              ]),
              createBaseVNode("div", _hoisted_4$1, [
                createBaseVNode("div", _hoisted_5$1, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(unref(SERIES_ORDER), (s) => {
                    return openBlock(), createElementBlock("button", {
                      key: s,
                      class: normalizeClass({ active: series.value === s }),
                      onClick: ($event) => series.value = s
                    }, toDisplayString(unref(SERIES_LABELS)[s]), 11, _hoisted_6$1);
                  }), 128))
                ]),
                createBaseVNode("p", _hoisted_7$1, toDisplayString(unref(SERIES_HINTS)[series.value]), 1),
                createBaseVNode("div", _hoisted_8$1, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(list.value, (sp) => {
                    return openBlock(), createElementBlock("button", {
                      key: sp.key,
                      class: normalizeClass(["cell", { active: selected.value === sp.key, mine: currentSpecies.value === sp.key }]),
                      onClick: ($event) => pick(sp.key)
                    }, [
                      createVNode(PetAvatar, {
                        species: sp.key,
                        level: 3,
                        size: 56
                      }, null, 8, ["species"]),
                      createBaseVNode("span", _hoisted_10$1, toDisplayString(sp.name), 1),
                      currentSpecies.value === sp.key ? (openBlock(), createElementBlock("span", _hoisted_11$1, "我的")) : createCommentVNode("", true)
                    ], 10, _hoisted_9$1);
                  }), 128))
                ]),
                createVNode(PetEvolutionPreview, {
                  class: "preview",
                  species: selected.value,
                  level: previewLevel.value,
                  "onUpdate:level": _cache[1] || (_cache[1] = ($event) => previewLevel.value = $event)
                }, null, 8, ["species", "level"]),
                createBaseVNode("label", _hoisted_12$1, [
                  _cache[6] || (_cache[6] = createBaseVNode("span", { class: "name-label" }, "给它起个名字", -1)),
                  withDirectives(createBaseVNode("input", {
                    "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => nickname.value = $event),
                    class: "name-input",
                    type: "text",
                    maxlength: "12",
                    placeholder: selectedSpecies.value.name
                  }, null, 8, _hoisted_13$1), [
                    [vModelText, nickname.value]
                  ])
                ]),
                willReset.value ? (openBlock(), createElementBlock("div", _hoisted_14$1, [
                  _cache[7] || (_cache[7] = createTextVNode(" ⚠️ 换成 ", -1)),
                  createBaseVNode("b", null, toDisplayString(selectedSpecies.value.name), 1),
                  _cache[8] || (_cache[8] = createTextVNode(" 会从 Lv1 重新开始养，现在的等级和状态会清空（花掉的积分不退） ", -1))
                ])) : isSameSpecies.value ? (openBlock(), createElementBlock("div", _hoisted_15$1, " ✏️ 还是同一只宠物，只会更新名字，等级和状态都保留 ")) : createCommentVNode("", true),
                errorText.value ? (openBlock(), createElementBlock("p", _hoisted_16$1, toDisplayString(errorText.value), 1)) : createCommentVNode("", true)
              ]),
              createBaseVNode("footer", _hoisted_17$1, [
                createBaseVNode("button", {
                  class: "btn btn-ghost",
                  onClick: _cache[3] || (_cache[3] = ($event) => emit("update:modelValue", false))
                }, "再想想"),
                createBaseVNode("button", {
                  class: "btn btn-primary",
                  disabled: saving.value,
                  onClick: confirm
                }, toDisplayString(saving.value ? "处理中…" : confirmText.value), 9, _hoisted_18$1)
              ])
            ])
          ])) : createCommentVNode("", true)
        ]),
        _: 1
      });
    };
  }
});
const PetAdoptModal = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-2eeea82d"]]);
const _hoisted_1 = { class: "page" };
const _hoisted_2 = { class: "page-header" };
const _hoisted_3 = { class: "points-box" };
const _hoisted_4 = { class: "num" };
const _hoisted_5 = { class: "intro-chips" };
const _hoisted_6 = { class: "name-row" };
const _hoisted_7 = ["placeholder"];
const _hoisted_8 = ["disabled"];
const _hoisted_9 = { class: "pet-name" };
const _hoisted_10 = { class: "badges" };
const _hoisted_11 = { class: "badge lv" };
const _hoisted_12 = { class: "badge stage" };
const _hoisted_13 = { class: "badge series" };
const _hoisted_14 = { class: "exp-block" };
const _hoisted_15 = { class: "exp-head" };
const _hoisted_16 = {
  key: 0,
  class: "max-text"
};
const _hoisted_17 = { key: 1 };
const _hoisted_18 = { class: "exp-num" };
const _hoisted_19 = { class: "bar" };
const _hoisted_20 = { class: "stats" };
const _hoisted_21 = { class: "stat-head" };
const _hoisted_22 = { class: "stat-label" };
const _hoisted_23 = { class: "stat-num" };
const _hoisted_24 = { class: "bar" };
const _hoisted_25 = { class: "mood-text" };
const _hoisted_26 = { class: "room-foot" };
const _hoisted_27 = { class: "adopt-time" };
const _hoisted_28 = {
  key: 0,
  class: "quota-chip"
};
const _hoisted_29 = {
  key: 2,
  class: "items"
};
const _hoisted_30 = { class: "item-info" };
const _hoisted_31 = { class: "item-name" };
const _hoisted_32 = { class: "item-effect" };
const _hoisted_33 = { class: "item-cost" };
const _hoisted_34 = { class: "section-head" };
const _hoisted_35 = {
  key: 0,
  class: "spent"
};
const _hoisted_36 = {
  key: 4,
  class: "logs"
};
const _hoisted_37 = { class: "log-info" };
const _hoisted_38 = { class: "log-name" };
const _hoisted_39 = { class: "log-effect" };
const _hoisted_40 = { class: "log-right" };
const _hoisted_41 = { class: "log-cost" };
const _hoisted_42 = { class: "log-time" };
const _hoisted_43 = { class: "toggle-arrow" };
const _hoisted_44 = {
  key: 5,
  class: "gallery"
};
const _hoisted_45 = { class: "group-title" };
const _hoisted_46 = { class: "gallery-grid" };
const _hoisted_47 = ["onClick"];
const _hoisted_48 = { class: "g-name" };
const _hoisted_49 = {
  key: 0,
  class: "g-mine"
};
const _hoisted_50 = {
  key: 2,
  class: "loading"
};
const _hoisted_51 = { class: "celebrate glass-strong" };
const _hoisted_52 = { class: "c-stage" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Pet",
  setup(__props) {
    const catalog = usePetCatalogStore();
    const auth = useAuthStore();
    const toast = useToastStore();
    const pet = ref(null);
    const logs = ref([]);
    const logPage = ref(1);
    const logTotal = ref(0);
    const LOG_PAGE_SIZE = LIST_PAGE_SIZE;
    const products = ref([]);
    const totalSpent = ref(0);
    const quota = ref(null);
    const loading = ref(true);
    const adoptOpen = ref(false);
    const presetSpecies = ref(null);
    const showGallery = ref(false);
    const feedingId = ref(null);
    const levelUp = ref(null);
    const editingName = ref(false);
    const nameDraft = ref("");
    const savingName = ref(false);
    const myPoints = computed(() => {
      var _a;
      return ((_a = auth.user) == null ? void 0 : _a.totalPoints) ?? 0;
    });
    const petItems = computed(() => products.value.filter((p) => p.kind === "pet"));
    const moodColor = computed(() => {
      var _a;
      return MOOD_META[((_a = pet.value) == null ? void 0 : _a.mood) ?? "ok"].color;
    });
    const expPercent = computed(() => {
      if (!pet.value) return 0;
      if (pet.value.isMax) return 100;
      return Math.round(pet.value.ratio * 100);
    });
    const nextStageName = computed(() => {
      if (!pet.value || pet.value.isMax) return "";
      return STAGE_NAMES[pet.value.level + 1] ?? "";
    });
    const galleryBySeries = computed(
      () => SERIES_ORDER.map((s) => ({
        key: s,
        label: SERIES_LABELS[s],
        list: catalog.species.filter((sp) => sp.series === s)
      }))
    );
    const heroSpecies = computed(() => {
      var _a;
      return ((_a = catalog.species[0]) == null ? void 0 : _a.key) ?? "drake";
    });
    async function loadLogs(p = logPage.value) {
      const logRes = await api.get(
        `/pets/logs/me?limit=${LOG_PAGE_SIZE}&offset=${(p - 1) * LOG_PAGE_SIZE}`
      );
      logs.value = logRes.logs;
      totalSpent.value = logRes.totalPointsSpent;
      logTotal.value = logRes.total ?? logRes.logs.length;
      logPage.value = p;
    }
    async function load(forceCatalog = false) {
      loading.value = true;
      try {
        catalog.load(forceCatalog);
        const [me, prodRes] = await Promise.all([
          api.get("/pets/me"),
          api.get("/products")
        ]);
        pet.value = me.pet;
        quota.value = me.quota ?? null;
        products.value = prodRes.products;
        await loadLogs(1);
      } catch (e) {
        toast.error((e == null ? void 0 : e.message) || "宠物数据加载失败");
      } finally {
        loading.value = false;
      }
    }
    function openAdopt(preset = null) {
      presetSpecies.value = preset;
      adoptOpen.value = true;
    }
    function onAdopted(p) {
      pet.value = p;
      load();
    }
    async function feed(p) {
      var _a;
      if (feedingId.value !== null) return;
      if (!pet.value) {
        toast.info("先领养一只宠物再来喂它吧~");
        return;
      }
      if (myPoints.value < p.cost) {
        toast.warning(`积分不足，还差 ${p.cost - myPoints.value} 分`);
        return;
      }
      feedingId.value = p.id;
      selfFeedUntil = Date.now() + 5e3;
      try {
        const res = await api.post("/pets/use-item", { productId: p.id });
        pet.value = res.pet;
        if (res.quota) quota.value = res.quota;
        if (auth.user) auth.setUser({ ...auth.user, totalPoints: res.newBalance });
        toast.success(`${res.pet.displayName} 吃了「${res.itemName}」，${res.effectText}`);
        if (res.leveledUp) {
          levelUp.value = { level: res.levelAfter, stageName: res.stageNameAfter };
        }
        await Promise.all([loadLogs(1), (async () => {
          const prodRes = await api.get("/products");
          products.value = prodRes.products;
        })()]);
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
    function startEditName() {
      var _a;
      nameDraft.value = ((_a = pet.value) == null ? void 0 : _a.nickname) ?? "";
      editingName.value = true;
    }
    async function saveName() {
      var _a;
      if (!pet.value || savingName.value) return;
      savingName.value = true;
      try {
        const res = await api.patch("/pets/me", { nickname: nameDraft.value.trim() });
        pet.value = res.pet;
        editingName.value = false;
        toast.success("名字改好啦");
      } catch (e) {
        toast.error(((_a = e.payload) == null ? void 0 : _a.error) === "no_pet" ? "你还没有宠物" : e.message || "改名失败");
      } finally {
        savingName.value = false;
      }
    }
    function fmtTime(ts) {
      const d = new Date(ts * 1e3);
      const diff = Date.now() - ts * 1e3;
      if (diff < 6e4) return "刚刚";
      if (diff < 36e5) return `${Math.floor(diff / 6e4)}分钟前`;
      if (d.toDateString() === (/* @__PURE__ */ new Date()).toDateString()) {
        return `今天 ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
      }
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }
    function statValue(key) {
      return pet.value ? pet.value[key] : 0;
    }
    let selfFeedUntil = 0;
    function onFedEvent() {
      if (Date.now() < selfFeedUntil) return;
      load();
    }
    onMounted(() => {
      load(true);
      window.addEventListener(WS_EVENTS.petFed, onFedEvent);
    });
    onUnmounted(() => {
      window.removeEventListener(WS_EVENTS.petFed, onFedEvent);
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("header", _hoisted_2, [
          _cache[9] || (_cache[9] = createBaseVNode("div", null, [
            createBaseVNode("h1", { class: "title" }, "我的宠物"),
            createBaseVNode("p", { class: "subtitle" }, "每天来看看它，陪它一起长大~")
          ], -1)),
          createBaseVNode("div", _hoisted_3, [
            createBaseVNode("span", _hoisted_4, toDisplayString(myPoints.value), 1),
            _cache[7] || (_cache[7] = createBaseVNode("span", { class: "unit" }, "分", -1)),
            _cache[8] || (_cache[8] = createBaseVNode("span", { class: "emoji" }, "🌟", -1))
          ])
        ]),
        !loading.value && !pet.value ? (openBlock(), createBlock(GlassCard, {
          key: 0,
          class: "intro"
        }, {
          default: withCtx(() => [
            createVNode(PetAvatar, {
              species: heroSpecies.value,
              level: 0,
              size: 132
            }, null, 8, ["species"]),
            _cache[10] || (_cache[10] = createBaseVNode("h2", { class: "intro-title" }, "你还没有宠物哦", -1)),
            _cache[11] || (_cache[11] = createBaseVNode("p", { class: "intro-desc" }, " 去领养一只吧！它会陪着你，一起从蛋慢慢长大，攒积分喂它就能升级进化~ ", -1)),
            createBaseVNode("div", _hoisted_5, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(galleryBySeries.value, (g) => {
                return openBlock(), createElementBlock("span", {
                  key: g.key,
                  class: "chip"
                }, toDisplayString(g.label) + " " + toDisplayString(g.list.length) + " 只 ", 1);
              }), 128))
            ]),
            createBaseVNode("button", {
              class: "btn btn-primary intro-btn",
              onClick: _cache[0] || (_cache[0] = ($event) => openAdopt())
            }, "🎉 去领养一只")
          ]),
          _: 1
        })) : pet.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
          createVNode(GlassCard, {
            class: "room",
            padding: "22px 20px"
          }, {
            default: withCtx(() => [
              createBaseVNode("div", {
                class: "stage-wrap",
                style: normalizeStyle({ "--mood": moodColor.value })
              }, [
                createVNode(PetAvatar, {
                  species: pet.value.species,
                  level: pet.value.level,
                  mood: pet.value.mood,
                  size: 150,
                  ring: ""
                }, null, 8, ["species", "level", "mood"])
              ], 4),
              createBaseVNode("div", _hoisted_6, [
                editingName.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  withDirectives(createBaseVNode("input", {
                    "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => nameDraft.value = $event),
                    class: "name-input",
                    type: "text",
                    maxlength: "12",
                    placeholder: pet.value.speciesName,
                    onKeyup: withKeys(saveName, ["enter"])
                  }, null, 40, _hoisted_7), [
                    [vModelText, nameDraft.value]
                  ]),
                  createBaseVNode("button", {
                    class: "mini-btn",
                    disabled: savingName.value,
                    onClick: saveName
                  }, "✓", 8, _hoisted_8),
                  createBaseVNode("button", {
                    class: "mini-btn",
                    onClick: _cache[2] || (_cache[2] = ($event) => editingName.value = false)
                  }, "✕")
                ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                  createBaseVNode("h2", _hoisted_9, toDisplayString(pet.value.displayName), 1),
                  createBaseVNode("button", {
                    class: "edit-btn",
                    title: "改名",
                    onClick: startEditName
                  }, "✏️")
                ], 64))
              ]),
              createBaseVNode("div", _hoisted_10, [
                createBaseVNode("span", _hoisted_11, "Lv" + toDisplayString(pet.value.level), 1),
                createBaseVNode("span", _hoisted_12, toDisplayString(pet.value.stageName), 1),
                createBaseVNode("span", _hoisted_13, toDisplayString(pet.value.seriesLabel) + "系", 1)
              ]),
              createBaseVNode("div", _hoisted_14, [
                createBaseVNode("div", _hoisted_15, [
                  pet.value.isMax ? (openBlock(), createElementBlock("span", _hoisted_16, "🎉 已经满级啦，它是究极体！")) : (openBlock(), createElementBlock("span", _hoisted_17, [
                    _cache[12] || (_cache[12] = createTextVNode(" 再攒 ", -1)),
                    createBaseVNode("b", null, toDisplayString(pet.value.expToNext), 1),
                    createTextVNode(" 经验进化为「" + toDisplayString(nextStageName.value) + "」 ", 1)
                  ])),
                  createBaseVNode("span", _hoisted_18, toDisplayString(pet.value.exp) + " / " + toDisplayString(pet.value.totalMaxExp), 1)
                ]),
                createBaseVNode("div", _hoisted_19, [
                  createBaseVNode("div", {
                    class: "bar-fill exp",
                    style: normalizeStyle({ width: expPercent.value + "%" })
                  }, null, 4)
                ])
              ]),
              createBaseVNode("div", _hoisted_20, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(unref(STAT_META), (m) => {
                  return openBlock(), createElementBlock("div", {
                    key: m.key,
                    class: "stat"
                  }, [
                    createBaseVNode("div", _hoisted_21, [
                      createBaseVNode("span", _hoisted_22, toDisplayString(m.emoji) + " " + toDisplayString(m.label), 1),
                      createBaseVNode("span", _hoisted_23, toDisplayString(statValue(m.key)), 1)
                    ]),
                    createBaseVNode("div", _hoisted_24, [
                      createBaseVNode("div", {
                        class: "bar-fill",
                        style: normalizeStyle({ width: statValue(m.key) + "%", background: m.color })
                      }, null, 4)
                    ])
                  ]);
                }), 128))
              ]),
              createBaseVNode("div", {
                class: "mood-tip",
                style: normalizeStyle({ borderColor: moodColor.value + "55" })
              }, [
                createBaseVNode("span", {
                  class: "mood-label",
                  style: normalizeStyle({ color: moodColor.value })
                }, toDisplayString(pet.value.moodLabel), 5),
                createBaseVNode("span", _hoisted_25, toDisplayString(pet.value.moodTip), 1)
              ], 4),
              _cache[13] || (_cache[13] = createBaseVNode("p", { class: "growth-hint" }, "💡 状态越好，用道具获得的经验越多：超级开心 ×1.5 · 有点委屈 ×0.6 · 肚子饿 ×0.5", -1)),
              createBaseVNode("div", _hoisted_26, [
                createBaseVNode("span", _hoisted_27, "领养于 " + toDisplayString(fmtTime(pet.value.adoptedAt)), 1),
                createBaseVNode("button", {
                  class: "link-btn",
                  onClick: _cache[3] || (_cache[3] = ($event) => openAdopt())
                }, "换宠物 / 改名 ›")
              ])
            ]),
            _: 1
          }),
          _cache[17] || (_cache[17] = createBaseVNode("h2", { class: "section-title" }, "喂它吃点东西", -1)),
          _cache[18] || (_cache[18] = createBaseVNode("p", { class: "section-sub" }, "用积分换道具，喂给它就能升级（不用等家长审核，立即生效）", -1)),
          quota.value && (quota.value.feedLimit > 0 || quota.value.pointsLimit > 0) ? (openBlock(), createElementBlock("p", _hoisted_28, [
            quota.value.feedLimit > 0 ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
              createTextVNode(" 今天已陪它 " + toDisplayString(quota.value.todayFed) + "/" + toDisplayString(quota.value.feedLimit) + " 次", 1),
              quota.value.feedsLeft ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                createTextVNode("，还能喂 " + toDisplayString(quota.value.feedsLeft) + " 次", 1)
              ], 64)) : createCommentVNode("", true)
            ], 64)) : createCommentVNode("", true),
            quota.value.pointsLimit > 0 ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
              createTextVNode(toDisplayString(quota.value.feedLimit > 0 ? " · " : "") + "宠物积分还剩 " + toDisplayString(quota.value.pointsLeft) + " 🌟 ", 1)
            ], 64)) : createCommentVNode("", true)
          ])) : createCommentVNode("", true),
          petItems.value.length === 0 ? (openBlock(), createBlock(EmptyState, {
            key: 1,
            emoji: "🍚",
            text: "还没有宠物道具",
            hint: "让爸爸妈妈在商城里添加宠物道具吧~"
          })) : (openBlock(), createElementBlock("div", _hoisted_29, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(petItems.value, (p) => {
              return openBlock(), createBlock(GlassCard, {
                key: p.id,
                padding: "12px 14px",
                hover: "",
                class: normalizeClass(["item", { disabled: myPoints.value < p.cost || p.stock === 0 }]),
                onClick: ($event) => feed(p)
              }, {
                default: withCtx(() => [
                  createVNode(CategoryIcon, {
                    icon: p.icon,
                    size: 40
                  }, null, 8, ["icon"]),
                  createBaseVNode("div", _hoisted_30, [
                    createBaseVNode("span", _hoisted_31, toDisplayString(p.name), 1),
                    createBaseVNode("span", _hoisted_32, toDisplayString(unref(petEffectText)(p.pet_effect)), 1)
                  ]),
                  createBaseVNode("span", _hoisted_33, toDisplayString(p.cost) + " 🌟", 1)
                ]),
                _: 2
              }, 1032, ["class", "onClick"]);
            }), 128))
          ])),
          createBaseVNode("div", _hoisted_34, [
            _cache[14] || (_cache[14] = createBaseVNode("h2", { class: "section-title" }, "喂养记录", -1)),
            totalSpent.value > 0 ? (openBlock(), createElementBlock("span", _hoisted_35, "共花 " + toDisplayString(totalSpent.value) + " 🌟", 1)) : createCommentVNode("", true)
          ]),
          logs.value.length === 0 ? (openBlock(), createBlock(EmptyState, {
            key: 3,
            emoji: "📜",
            text: "还没有喂过它",
            hint: "喂一次就会记录在这里~"
          })) : (openBlock(), createElementBlock("div", _hoisted_36, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(logs.value, (l) => {
              return openBlock(), createBlock(GlassCard, {
                key: l.id,
                padding: "10px 14px",
                class: "log"
              }, {
                default: withCtx(() => [
                  _cache[15] || (_cache[15] = createBaseVNode("span", { class: "log-ico" }, "🍽️", -1)),
                  createBaseVNode("div", _hoisted_37, [
                    createBaseVNode("span", _hoisted_38, toDisplayString(l.item_name), 1),
                    createBaseVNode("span", _hoisted_39, toDisplayString(l.effectText), 1)
                  ]),
                  createBaseVNode("div", _hoisted_40, [
                    createBaseVNode("span", _hoisted_41, "-" + toDisplayString(l.points) + " 🌟", 1),
                    createBaseVNode("span", _hoisted_42, toDisplayString(fmtTime(l.created_at)), 1)
                  ])
                ]),
                _: 2
              }, 1024);
            }), 128))
          ])),
          createVNode(Pager, {
            page: logPage.value,
            "page-size": unref(LOG_PAGE_SIZE),
            total: logTotal.value,
            "onUpdate:page": loadLogs
          }, null, 8, ["page", "page-size", "total"]),
          createBaseVNode("button", {
            class: "gallery-toggle",
            onClick: _cache[4] || (_cache[4] = ($event) => showGallery.value = !showGallery.value)
          }, [
            createTextVNode(" 📖 宠物图鉴（" + toDisplayString(unref(catalog).species.length) + " 只）", 1),
            createBaseVNode("span", _hoisted_43, toDisplayString(showGallery.value ? "收起 ▲" : "展开 ▼"), 1)
          ]),
          showGallery.value ? (openBlock(), createElementBlock("div", _hoisted_44, [
            _cache[16] || (_cache[16] = createBaseVNode("p", { class: "gallery-hint" }, "点一下可以看它的进化预览，也可以直接换成它", -1)),
            (openBlock(true), createElementBlock(Fragment, null, renderList(galleryBySeries.value, (g) => {
              return openBlock(), createElementBlock("div", {
                key: g.key,
                class: "gallery-group"
              }, [
                createBaseVNode("h3", _hoisted_45, toDisplayString(g.label) + "系列", 1),
                createBaseVNode("div", _hoisted_46, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(g.list, (sp) => {
                    return openBlock(), createElementBlock("button", {
                      key: sp.key,
                      class: normalizeClass(["g-cell", { mine: pet.value.species === sp.key }]),
                      onClick: ($event) => openAdopt(sp.key)
                    }, [
                      createVNode(PetAvatar, {
                        species: sp.key,
                        level: unref(MAX_LEVEL),
                        size: 52
                      }, null, 8, ["species", "level"]),
                      createBaseVNode("span", _hoisted_48, toDisplayString(sp.name), 1),
                      pet.value.species === sp.key ? (openBlock(), createElementBlock("span", _hoisted_49, "我的")) : createCommentVNode("", true)
                    ], 10, _hoisted_47);
                  }), 128))
                ])
              ]);
            }), 128))
          ])) : createCommentVNode("", true)
        ], 64)) : (openBlock(), createElementBlock("div", _hoisted_50, "加载中…")),
        createVNode(Transition, { name: "pop" }, {
          default: withCtx(() => [
            levelUp.value && pet.value ? (openBlock(), createElementBlock("div", {
              key: 0,
              class: "celebrate-mask",
              onClick: _cache[5] || (_cache[5] = ($event) => levelUp.value = null)
            }, [
              createBaseVNode("div", _hoisted_51, [
                createVNode(PetAvatar, {
                  species: pet.value.species,
                  level: levelUp.value.level,
                  size: 150,
                  mood: "happy"
                }, null, 8, ["species", "level"]),
                _cache[19] || (_cache[19] = createBaseVNode("div", { class: "c-title" }, "🎉 进化啦！", -1)),
                createBaseVNode("div", _hoisted_52, toDisplayString(unref(stageLabel)(levelUp.value.level)), 1),
                _cache[20] || (_cache[20] = createBaseVNode("div", { class: "c-hint" }, "点一下继续", -1))
              ])
            ])) : createCommentVNode("", true)
          ]),
          _: 1
        }),
        createVNode(PetAdoptModal, {
          modelValue: adoptOpen.value,
          "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => adoptOpen.value = $event),
          current: pet.value ? { species: pet.value.species, level: pet.value.level, nickname: pet.value.nickname } : null,
          preset: presetSpecies.value,
          onAdopted
        }, null, 8, ["modelValue", "current", "preset"])
      ]);
    };
  }
});
const Pet = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-fc9e3e32"]]);
export {
  Pet as default
};
