import { d as defineComponent, u as useAuthStore, o as onMounted, c as createElementBlock, q as createBlock, p as withCtx, f as createCommentVNode, m as createVNode, T as Transition, b as createBaseVNode, F as Fragment, r as renderList, e as unref, i as ref, z as api, k as openBlock, t as toDisplayString, n as normalizeClass, g as withModifiers, y as computed, j as useRouter, _ as _export_sfc } from "./index-DLtaHw3I.js";
import { L as LIST_PAGE_SIZE, P as Pager } from "./Pager-gbjjgpVA.js";
import { G as GlassCard } from "./GlassCard-DXR0hosh.js";
import { Z as ZodiacAvatar } from "./ZodiacAvatar-BgUFKiIx.js";
import { P as PetAvatar } from "./PetAvatar-DES9TyqT.js";
import { E as EmptyState } from "./EmptyState-3g4kc4Z_.js";
const _hoisted_1 = { class: "page" };
const _hoisted_2 = { class: "hello" };
const _hoisted_3 = { class: "balance" };
const _hoisted_4 = { class: "balance-row" };
const _hoisted_5 = { class: "balance-num" };
const _hoisted_6 = { class: "today-bar" };
const _hoisted_7 = {
  key: 0,
  class: "today-detail"
};
const _hoisted_8 = { class: "pe-info" };
const _hoisted_9 = { class: "pe-name" };
const _hoisted_10 = { class: "pe-meta" };
const _hoisted_11 = { class: "modal-box glass" };
const _hoisted_12 = { class: "detail-section" };
const _hoisted_13 = { class: "detail-rows" };
const _hoisted_14 = { class: "detail-row" };
const _hoisted_15 = { class: "dr-value gain" };
const _hoisted_16 = { class: "detail-row" };
const _hoisted_17 = { class: "dr-value loss" };
const _hoisted_18 = { class: "detail-row" };
const _hoisted_19 = { class: "dr-value exchange" };
const _hoisted_20 = { class: "detail-section" };
const _hoisted_21 = { class: "detail-rows" };
const _hoisted_22 = { class: "detail-row" };
const _hoisted_23 = { class: "dr-value gain" };
const _hoisted_24 = { class: "detail-row" };
const _hoisted_25 = { class: "dr-value loss" };
const _hoisted_26 = { class: "detail-row" };
const _hoisted_27 = { class: "dr-value exchange" };
const _hoisted_28 = {
  key: 2,
  class: "logs"
};
const _hoisted_29 = { class: "content" };
const _hoisted_30 = { class: "note" };
const _hoisted_31 = { class: "meta" };
const _hoisted_32 = { class: "tag" };
const _hoisted_33 = { class: "time" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Home",
  setup(__props) {
    useAuthStore();
    const router = useRouter();
    const me = ref(null);
    const logs = ref([]);
    const logPage = ref(1);
    const logTotal = ref(0);
    const LOG_PAGE_SIZE = LIST_PAGE_SIZE;
    const pet = ref(null);
    const loading = ref(true);
    const showDetail = ref(false);
    const petLoadFailed = ref(false);
    const sourceLabels = {
      daily: "⭐ 日常",
      adhoc: "📋 任务",
      exchange: "🎁 兑换",
      adjust: "✏️ 临时"
    };
    const rating = computed(() => {
      if (!me.value) return { text: "加油哦", class: "r-D" };
      const net = me.value.todayGain + me.value.todayLoss;
      if (net >= 120) return { text: "满分通关", class: "r-SSS" };
      if (net >= 100) return { text: "超神了", class: "r-SS" };
      if (net >= 80) return { text: "太棒了", class: "r-S" };
      if (net >= 60) return { text: "不错哦", class: "r-A" };
      if (net >= 40) return { text: "还可以", class: "r-B" };
      if (net >= 20) return { text: "一般般", class: "r-C" };
      return { text: "加油哦", class: "r-D" };
    });
    const todayNet = computed(() => {
      if (!me.value) return 0;
      return me.value.todayGain + me.value.todayLoss;
    });
    async function loadLogs(p = logPage.value) {
      const res = await api.get(`/point-logs/me?limit=${LOG_PAGE_SIZE}&offset=${(p - 1) * LOG_PAGE_SIZE}`);
      logs.value = res.logs;
      logTotal.value = res.total ?? res.logs.length;
      logPage.value = p;
    }
    async function load() {
      loading.value = true;
      petLoadFailed.value = false;
      try {
        const [d, p] = await Promise.all([
          api.get("/dashboard/me"),
          // 失败时不能回落成 `{ pet: null }`：那会让宠物卡片显示"还没有宠物"，
          // 孩子点进去却发现自己明明有宠物。记下失败标记，卡片上给"重试"。
          api.get("/pets/me").catch(() => {
            petLoadFailed.value = true;
            return { pet: null };
          })
        ]);
        me.value = d;
        pet.value = p.pet;
        await loadLogs(1);
      } finally {
        loading.value = false;
      }
    }
    function onPetEntryClick() {
      if (petLoadFailed.value) {
        load();
        return;
      }
      router.push("/child/pet");
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
      return openBlock(), createElementBlock("div", _hoisted_1, [
        me.value ? (openBlock(), createBlock(GlassCard, {
          key: 0,
          class: "hero",
          padding: "28px 24px",
          hover: "",
          onClick: _cache[0] || (_cache[0] = ($event) => showDetail.value = true)
        }, {
          default: withCtx(() => [
            createVNode(ZodiacAvatar, {
              zodiac: me.value.avatar,
              size: 96,
              "show-ring": ""
            }, null, 8, ["zodiac"]),
            createBaseVNode("h1", _hoisted_2, "你好呀，" + toDisplayString(me.value.name) + "！", 1),
            createBaseVNode("div", _hoisted_3, [
              createBaseVNode("div", _hoisted_4, [
                createBaseVNode("div", _hoisted_5, toDisplayString(me.value.totalPoints), 1),
                _cache[3] || (_cache[3] = createBaseVNode("span", { class: "balance-emoji" }, "🌟", -1))
              ]),
              _cache[4] || (_cache[4] = createBaseVNode("div", { class: "balance-label" }, "当前积分", -1))
            ]),
            createBaseVNode("div", _hoisted_6, [
              _cache[5] || (_cache[5] = createBaseVNode("span", { class: "today-label" }, "今日", -1)),
              createBaseVNode("span", {
                class: normalizeClass(["today-net", todayNet.value >= 0 ? "gain" : "loss"])
              }, toDisplayString(todayNet.value >= 0 ? "+" : "") + toDisplayString(todayNet.value) + " 🌟 ", 3),
              createBaseVNode("span", {
                class: normalizeClass(["rating-tag", rating.value.class])
              }, toDisplayString(rating.value.text), 3),
              me.value.todayLoss < 0 ? (openBlock(), createElementBlock("span", _hoisted_7, " (+" + toDisplayString(me.value.todayGain) + " / " + toDisplayString(me.value.todayLoss) + ") ", 1)) : createCommentVNode("", true)
            ])
          ]),
          _: 1
        })) : createCommentVNode("", true),
        createVNode(GlassCard, {
          class: "pet-entry",
          padding: "14px 16px",
          hover: "",
          onClick: onPetEntryClick
        }, {
          default: withCtx(() => [
            pet.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
              createVNode(PetAvatar, {
                species: pet.value.species,
                level: pet.value.level,
                mood: pet.value.mood,
                size: 56
              }, null, 8, ["species", "level", "mood"]),
              createBaseVNode("div", _hoisted_8, [
                createBaseVNode("span", _hoisted_9, toDisplayString(pet.value.displayName), 1),
                createBaseVNode("span", _hoisted_10, "Lv" + toDisplayString(pet.value.level) + " " + toDisplayString(pet.value.stageName), 1)
              ]),
              _cache[6] || (_cache[6] = createBaseVNode("span", { class: "pe-go" }, "去看看 ›", -1))
            ], 64)) : petLoadFailed.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
              _cache[7] || (_cache[7] = createBaseVNode("span", { class: "pe-egg" }, "⚠️", -1)),
              _cache[8] || (_cache[8] = createBaseVNode("div", { class: "pe-info" }, [
                createBaseVNode("span", { class: "pe-name" }, "宠物信息没加载出来"),
                createBaseVNode("span", { class: "pe-meta" }, "网络好像不太顺，点一下重试")
              ], -1)),
              _cache[9] || (_cache[9] = createBaseVNode("span", { class: "pe-go" }, "重试 ›", -1))
            ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 2 }, [
              _cache[10] || (_cache[10] = createBaseVNode("span", { class: "pe-egg" }, "🥚", -1)),
              _cache[11] || (_cache[11] = createBaseVNode("div", { class: "pe-info" }, [
                createBaseVNode("span", { class: "pe-name" }, "还没有宠物"),
                createBaseVNode("span", { class: "pe-meta" }, "去领养一只，陪它一起长大~")
              ], -1)),
              _cache[12] || (_cache[12] = createBaseVNode("span", { class: "pe-go" }, "去领养 ›", -1))
            ], 64))
          ]),
          _: 1
        }),
        createVNode(Transition, { name: "modal" }, {
          default: withCtx(() => [
            showDetail.value && me.value ? (openBlock(), createElementBlock("div", {
              key: 0,
              class: "modal-mask",
              onClick: _cache[2] || (_cache[2] = withModifiers(($event) => showDetail.value = false, ["self"]))
            }, [
              createBaseVNode("div", _hoisted_11, [
                _cache[21] || (_cache[21] = createBaseVNode("div", { class: "modal-title" }, "积分明细", -1)),
                createBaseVNode("div", _hoisted_12, [
                  _cache[16] || (_cache[16] = createBaseVNode("div", { class: "section-header" }, "今日数据", -1)),
                  createBaseVNode("div", _hoisted_13, [
                    createBaseVNode("div", _hoisted_14, [
                      _cache[13] || (_cache[13] = createBaseVNode("span", { class: "dr-label" }, "加分", -1)),
                      createBaseVNode("span", _hoisted_15, "+" + toDisplayString(me.value.todayGain) + " 🌟", 1)
                    ]),
                    createBaseVNode("div", _hoisted_16, [
                      _cache[14] || (_cache[14] = createBaseVNode("span", { class: "dr-label" }, "扣分", -1)),
                      createBaseVNode("span", _hoisted_17, toDisplayString(me.value.todayLoss) + " 🌟", 1)
                    ]),
                    createBaseVNode("div", _hoisted_18, [
                      _cache[15] || (_cache[15] = createBaseVNode("span", { class: "dr-label" }, "兑换", -1)),
                      createBaseVNode("span", _hoisted_19, toDisplayString(me.value.todayExchange) + " 🌟", 1)
                    ])
                  ])
                ]),
                _cache[22] || (_cache[22] = createBaseVNode("div", { class: "detail-divider" }, null, -1)),
                createBaseVNode("div", _hoisted_20, [
                  _cache[20] || (_cache[20] = createBaseVNode("div", { class: "section-header" }, "历史累计", -1)),
                  createBaseVNode("div", _hoisted_21, [
                    createBaseVNode("div", _hoisted_22, [
                      _cache[17] || (_cache[17] = createBaseVNode("span", { class: "dr-label" }, "累计加分", -1)),
                      createBaseVNode("span", _hoisted_23, "+" + toDisplayString(me.value.totalGain) + " 🌟", 1)
                    ]),
                    createBaseVNode("div", _hoisted_24, [
                      _cache[18] || (_cache[18] = createBaseVNode("span", { class: "dr-label" }, "累计扣分", -1)),
                      createBaseVNode("span", _hoisted_25, toDisplayString(me.value.totalLoss) + " 🌟", 1)
                    ]),
                    createBaseVNode("div", _hoisted_26, [
                      _cache[19] || (_cache[19] = createBaseVNode("span", { class: "dr-label" }, "已兑换", -1)),
                      createBaseVNode("span", _hoisted_27, toDisplayString(me.value.totalExchange) + " 🌟", 1)
                    ])
                  ])
                ]),
                createBaseVNode("button", {
                  class: "btn btn-primary modal-close",
                  onClick: _cache[1] || (_cache[1] = ($event) => showDetail.value = false)
                }, "关闭")
              ])
            ])) : createCommentVNode("", true)
          ]),
          _: 1
        }),
        createVNode(GlassCard, {
          class: "hint-card",
          padding: "16px 18px"
        }, {
          default: withCtx(() => [..._cache[23] || (_cache[23] = [
            createBaseVNode("span", { class: "emoji" }, "💡", -1),
            createBaseVNode("span", null, "找爸爸妈妈给你加分吧！攒够了积分可以去兑换礼物哦~", -1)
          ])]),
          _: 1
        }),
        _cache[24] || (_cache[24] = createBaseVNode("h2", { class: "section-title" }, "最近记录", -1)),
        !loading.value && logs.value.length === 0 ? (openBlock(), createBlock(EmptyState, {
          key: 1,
          emoji: "📜",
          text: "还没有积分记录",
          hint: "让爸爸妈妈给你加分吧~"
        })) : (openBlock(), createElementBlock("div", _hoisted_28, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(logs.value, (log) => {
            return openBlock(), createBlock(GlassCard, {
              key: log.id,
              padding: "12px 14px",
              class: "log-item"
            }, {
              default: withCtx(() => [
                createBaseVNode("div", {
                  class: normalizeClass(["delta", log.delta > 0 ? "gain" : "loss"])
                }, toDisplayString(log.delta > 0 ? "+" : "") + toDisplayString(log.delta) + " 🌟 ", 3),
                createBaseVNode("div", _hoisted_29, [
                  createBaseVNode("div", _hoisted_30, toDisplayString(log.note), 1),
                  createBaseVNode("div", _hoisted_31, [
                    createBaseVNode("span", _hoisted_32, toDisplayString(sourceLabels[log.source] ?? log.source), 1),
                    createBaseVNode("span", _hoisted_33, toDisplayString(fmtTime(log.created_at)), 1)
                  ])
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
        }, null, 8, ["page", "page-size", "total"])
      ]);
    };
  }
});
const Home = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-bc599155"]]);
export {
  Home as default
};
