import { d as defineComponent, a as useToastStore, u as useAuthStore, B as onUnmounted, c as createElementBlock, b as createBaseVNode, F as Fragment, q as createBlock, p as withCtx, f as createCommentVNode, m as createVNode, t as toDisplayString, i as ref, y as computed, z as api, k as openBlock, G as normalizeStyle, r as renderList, n as normalizeClass, x as createTextVNode, _ as _export_sfc } from "./index-DLtaHw3I.js";
import { G as GlassCard } from "./GlassCard-DXR0hosh.js";
const _hoisted_1 = { class: "page" };
const _hoisted_2 = { class: "today-row" };
const _hoisted_3 = { class: "today-value" };
const _hoisted_4 = { class: "today-bar" };
const _hoisted_5 = {
  key: 0,
  class: "today-hint done"
};
const _hoisted_6 = {
  key: 1,
  class: "today-hint"
};
const _hoisted_7 = { class: "level-cards" };
const _hoisted_8 = ["disabled"];
const _hoisted_9 = ["disabled"];
const _hoisted_10 = {
  key: 1,
  class: "bank-info"
};
const _hoisted_11 = { class: "prog-row" };
const _hoisted_12 = { class: "prog-score" };
const _hoisted_13 = { class: "today-bar" };
const _hoisted_14 = { class: "word-line" };
const _hoisted_15 = { class: "word" };
const _hoisted_16 = {
  key: 0,
  class: "phonetic"
};
const _hoisted_17 = {
  key: 0,
  class: "fallback-word"
};
const _hoisted_18 = { class: "options" };
const _hoisted_19 = ["disabled", "onClick"];
const _hoisted_20 = { class: "fb-head" };
const _hoisted_21 = {
  key: 0,
  class: "fb-delta"
};
const _hoisted_22 = {
  key: 1,
  class: "fb-capped"
};
const _hoisted_23 = { class: "fb-detail" };
const _hoisted_24 = {
  key: 0,
  class: "fb-phonetic"
};
const _hoisted_25 = { class: "done-emoji" };
const _hoisted_26 = { class: "done-title" };
const _hoisted_27 = { class: "done-points" };
const _hoisted_28 = {
  key: 0,
  class: "done-today"
};
const _hoisted_29 = { class: "done-actions" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Quiz",
  setup(__props) {
    const toast = useToastStore();
    const auth = useAuthStore();
    const status = ref(null);
    const loading = ref(true);
    const starting = ref(false);
    const phase = ref("idle");
    const level = ref(1);
    const roundId = ref(0);
    const questions = ref([]);
    const cur = ref(0);
    const answering = ref(false);
    const answered = ref(null);
    const chosen = ref(null);
    const correctCount = ref(0);
    const roundDelta = ref(0);
    const listenFallback = ref(false);
    let audio = null;
    const audioCache = /* @__PURE__ */ new Map();
    function getAudio(url) {
      let a = audioCache.get(url);
      if (!a) {
        a = new Audio(url);
        a.preload = "auto";
        a.load();
        audioCache.set(url, a);
      }
      return a;
    }
    function preloadRoundAudio() {
      for (const item of questions.value) getAudio(item.audio);
    }
    const q = computed(() => questions.value[cur.value] ?? null);
    const progress = computed(() => `${cur.value + 1} / ${questions.value.length}`);
    async function loadStatus() {
      loading.value = true;
      try {
        status.value = await api.get("/quiz/status");
      } catch (e) {
        toast.error(e.message);
      } finally {
        loading.value = false;
      }
    }
    loadStatus();
    function playAudio(url, word) {
      try {
        audio == null ? void 0 : audio.pause();
      } catch {
      }
      audio = getAudio(url);
      try {
        audio.currentTime = 0;
      } catch {
      }
      audio.onerror = () => {
        var _a;
        if (word && "speechSynthesis" in window) {
          const u = new SpeechSynthesisUtterance(word);
          u.lang = "en-GB";
          speechSynthesis.speak(u);
        }
        if (((_a = q.value) == null ? void 0 : _a.type) === "listen") listenFallback.value = true;
      };
      audio.play().catch(() => {
        var _a;
        if (((_a = q.value) == null ? void 0 : _a.type) === "listen") listenFallback.value = true;
      });
    }
    onUnmounted(() => {
      try {
        audio == null ? void 0 : audio.pause();
      } catch {
      }
    });
    async function startRound(lv) {
      var _a;
      starting.value = true;
      try {
        const res = await api.post("/quiz/round", { level: lv });
        level.value = lv;
        roundId.value = res.roundId;
        questions.value = res.questions;
        cur.value = 0;
        correctCount.value = 0;
        roundDelta.value = 0;
        answered.value = null;
        chosen.value = null;
        phase.value = "playing";
        preloadRoundAudio();
        const first = res.questions[0];
        if ((first == null ? void 0 : first.type) === "listen") playAudio(first.audio);
      } catch (e) {
        const err = (_a = e.payload) == null ? void 0 : _a.error;
        if (err === "word_bank_empty") toast.warning("词库还没准备好，稍后再来~");
        else toast.error(e.message);
      } finally {
        starting.value = false;
      }
    }
    async function choose(i) {
      var _a;
      if (answering.value || answered.value) return;
      answering.value = true;
      chosen.value = i;
      try {
        const res = await api.post("/quiz/answer", {
          roundId: roundId.value,
          index: q.value.index,
          choice: i
        });
        answered.value = res;
        if (res.correct) correctCount.value++;
        if (res.delta > 0) {
          roundDelta.value += res.delta;
          if (auth.user) auth.user.totalPoints = (auth.user.totalPoints ?? 0) + res.delta;
        }
        if (status.value) status.value.todayPoints = res.todayPoints;
        if (res.audio) playAudio(res.audio, res.word);
      } catch (e) {
        const err = (_a = e.payload) == null ? void 0 : _a.error;
        if (err === "already_answered") toast.warning("这题已经答过啦");
        else if (err === "round_finished") toast.warning("这一轮已经结束了");
        else toast.error(e.message);
        answered.value = null;
        chosen.value = null;
      } finally {
        answering.value = false;
      }
    }
    function next() {
      if (cur.value + 1 >= questions.value.length) {
        phase.value = "done";
        return;
      }
      cur.value++;
      answered.value = null;
      chosen.value = null;
      listenFallback.value = false;
      const nq = questions.value[cur.value];
      if (nq.type === "listen") playAudio(nq.audio);
    }
    function backHome() {
      phase.value = "idle";
      answered.value = null;
      chosen.value = null;
      loadStatus();
    }
    function levelLabel(lv) {
      return lv === 1 ? "一级" : "二级";
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        _cache[19] || (_cache[19] = createBaseVNode("header", { class: "page-header" }, [
          createBaseVNode("h1", { class: "title" }, "单词闯关"),
          createBaseVNode("p", { class: "subtitle" }, "答单词赚积分，还能听发音哦~")
        ], -1)),
        phase.value === "idle" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
          status.value ? (openBlock(), createBlock(GlassCard, {
            key: 0,
            padding: "14px 18px",
            class: "today-card"
          }, {
            default: withCtx(() => [
              createBaseVNode("div", _hoisted_2, [
                _cache[5] || (_cache[5] = createBaseVNode("span", { class: "today-label" }, "今日答题积分", -1)),
                createBaseVNode("span", _hoisted_3, toDisplayString(status.value.todayPoints) + " / " + toDisplayString(status.value.dailyCap) + " ⭐", 1)
              ]),
              createBaseVNode("div", _hoisted_4, [
                createBaseVNode("div", {
                  class: "today-bar-fill",
                  style: normalizeStyle({ width: Math.min(100, status.value.todayPoints / status.value.dailyCap * 100) + "%" })
                }, null, 4)
              ]),
              status.value.todayPoints >= status.value.dailyCap ? (openBlock(), createElementBlock("p", _hoisted_5, "今天的积分已经拿满啦，明天继续！")) : (openBlock(), createElementBlock("p", _hoisted_6, "一级答对 2 题 +1 分，二级答对 1 题 +1 分"))
            ]),
            _: 1
          })) : createCommentVNode("", true),
          createBaseVNode("div", _hoisted_7, [
            createVNode(GlassCard, {
              padding: "20px",
              class: "level-card",
              hover: "",
              onClick: _cache[0] || (_cache[0] = ($event) => startRound(1))
            }, {
              default: withCtx(() => [
                _cache[6] || (_cache[6] = createBaseVNode("div", { class: "level-emoji" }, "🌱", -1)),
                _cache[7] || (_cache[7] = createBaseVNode("h2", { class: "level-name" }, "一级", -1)),
                _cache[8] || (_cache[8] = createBaseVNode("p", { class: "level-desc" }, "课本基础词", -1)),
                _cache[9] || (_cache[9] = createBaseVNode("p", { class: "level-meta" }, "答对 2 题 = 1 分", -1)),
                createBaseVNode("button", {
                  class: "btn btn-success big",
                  disabled: starting.value
                }, "开始挑战", 8, _hoisted_8)
              ]),
              _: 1
            }),
            createVNode(GlassCard, {
              padding: "20px",
              class: "level-card",
              hover: "",
              onClick: _cache[1] || (_cache[1] = ($event) => startRound(2))
            }, {
              default: withCtx(() => [
                _cache[10] || (_cache[10] = createBaseVNode("div", { class: "level-emoji" }, "🚀", -1)),
                _cache[11] || (_cache[11] = createBaseVNode("h2", { class: "level-name" }, "二级", -1)),
                _cache[12] || (_cache[12] = createBaseVNode("p", { class: "level-desc" }, "进阶挑战词", -1)),
                _cache[13] || (_cache[13] = createBaseVNode("p", { class: "level-meta" }, "答对 1 题 = 1 分", -1)),
                createBaseVNode("button", {
                  class: "btn btn-success big",
                  disabled: starting.value
                }, "开始挑战", 8, _hoisted_9)
              ]),
              _: 1
            })
          ]),
          status.value ? (openBlock(), createElementBlock("p", _hoisted_10, "词库：一级 " + toDisplayString(status.value.wordCounts[1]) + " 词 · 二级 " + toDisplayString(status.value.wordCounts[2]) + " 词", 1)) : createCommentVNode("", true)
        ], 64)) : phase.value === "playing" && q.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
          createVNode(GlassCard, {
            padding: "14px 18px",
            class: "prog-card"
          }, {
            default: withCtx(() => [
              createBaseVNode("div", _hoisted_11, [
                createBaseVNode("span", null, toDisplayString(levelLabel(level.value)) + " · 第 " + toDisplayString(progress.value) + " 题", 1),
                createBaseVNode("span", _hoisted_12, "本局 +" + toDisplayString(roundDelta.value) + " ⭐", 1)
              ]),
              createBaseVNode("div", _hoisted_13, [
                createBaseVNode("div", {
                  class: "today-bar-fill",
                  style: normalizeStyle({ width: (cur.value + (answered.value ? 1 : 0)) / questions.value.length * 100 + "%" })
                }, null, 4)
              ])
            ]),
            _: 1
          }),
          createVNode(GlassCard, {
            padding: "24px 20px",
            class: "q-card"
          }, {
            default: withCtx(() => [
              q.value.type === "en2cn" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                _cache[14] || (_cache[14] = createBaseVNode("p", { class: "q-hint" }, "选出正确的意思", -1)),
                createBaseVNode("div", _hoisted_14, [
                  createBaseVNode("span", _hoisted_15, toDisplayString(q.value.word), 1),
                  createBaseVNode("button", {
                    class: "speak-btn",
                    onClick: _cache[2] || (_cache[2] = ($event) => playAudio(q.value.audio, q.value.word))
                  }, "🔊")
                ]),
                q.value.phonetic ? (openBlock(), createElementBlock("p", _hoisted_16, toDisplayString(q.value.phonetic), 1)) : createCommentVNode("", true)
              ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                _cache[15] || (_cache[15] = createBaseVNode("p", { class: "q-hint" }, "听发音，选出对应的单词", -1)),
                createBaseVNode("button", {
                  class: "big-speak",
                  onClick: _cache[3] || (_cache[3] = ($event) => playAudio(q.value.audio))
                }, "🔊"),
                _cache[16] || (_cache[16] = createBaseVNode("p", { class: "tap-hint" }, "点喇叭再听一次", -1)),
                listenFallback.value ? (openBlock(), createElementBlock("p", _hoisted_17, "（发音加载失败，从选项里猜一猜吧）")) : createCommentVNode("", true)
              ], 64)),
              createBaseVNode("div", _hoisted_18, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(q.value.options, (opt, i) => {
                  return openBlock(), createElementBlock("button", {
                    key: i,
                    class: normalizeClass(["option", {
                      right: answered.value && i === answered.value.correctIndex,
                      wrong: answered.value && chosen.value === i && !answered.value.correct,
                      dim: answered.value && i !== answered.value.correctIndex && chosen.value !== i
                    }]),
                    disabled: !!answered.value || answering.value,
                    onClick: ($event) => choose(i)
                  }, toDisplayString(opt), 11, _hoisted_19);
                }), 128))
              ]),
              answered.value ? (openBlock(), createElementBlock("div", {
                key: 2,
                class: normalizeClass(["feedback", { ok: answered.value.correct, bad: !answered.value.correct }])
              }, [
                createBaseVNode("div", _hoisted_20, [
                  createBaseVNode("span", null, toDisplayString(answered.value.correct ? "🎉 答对了！" : "💪 再记一遍~"), 1),
                  answered.value.delta > 0 ? (openBlock(), createElementBlock("span", _hoisted_21, "+" + toDisplayString(answered.value.delta) + " 分", 1)) : answered.value.capReached ? (openBlock(), createElementBlock("span", _hoisted_22, "今日积分已拿满")) : createCommentVNode("", true)
                ]),
                createBaseVNode("p", _hoisted_23, [
                  createBaseVNode("b", null, toDisplayString(answered.value.word), 1),
                  answered.value.phonetic ? (openBlock(), createElementBlock("span", _hoisted_24, toDisplayString(answered.value.phonetic), 1)) : createCommentVNode("", true),
                  createTextVNode(" —— " + toDisplayString(answered.value.translation), 1)
                ]),
                createBaseVNode("button", {
                  class: "btn btn-success big next-btn",
                  onClick: next
                }, toDisplayString(cur.value + 1 >= questions.value.length ? "看结算 🎊" : "下一题 →"), 1)
              ], 2)) : createCommentVNode("", true)
            ]),
            _: 1
          })
        ], 64)) : phase.value === "done" ? (openBlock(), createBlock(GlassCard, {
          key: 2,
          padding: "28px 20px",
          class: "done-card"
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_25, toDisplayString(correctCount.value >= questions.value.length ? "🏆" : correctCount.value >= questions.value.length / 2 ? "🎉" : "🌱"), 1),
            createBaseVNode("h2", _hoisted_26, "本局答对 " + toDisplayString(correctCount.value) + " / " + toDisplayString(questions.value.length) + " 题", 1),
            createBaseVNode("p", _hoisted_27, [
              _cache[17] || (_cache[17] = createTextVNode("获得 ", -1)),
              createBaseVNode("b", null, "+" + toDisplayString(roundDelta.value), 1),
              _cache[18] || (_cache[18] = createTextVNode(" 积分", -1))
            ]),
            status.value ? (openBlock(), createElementBlock("p", _hoisted_28, "今日答题积分 " + toDisplayString(status.value.todayPoints) + " / " + toDisplayString(status.value.dailyCap), 1)) : createCommentVNode("", true),
            createBaseVNode("div", _hoisted_29, [
              createBaseVNode("button", {
                class: "btn btn-success big",
                onClick: _cache[4] || (_cache[4] = ($event) => startRound(level.value))
              }, "再来一轮"),
              createBaseVNode("button", {
                class: "btn big",
                onClick: backHome
              }, "返回选关")
            ])
          ]),
          _: 1
        })) : createCommentVNode("", true)
      ]);
    };
  }
});
const Quiz = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-fbea4ec3"]]);
export {
  Quiz as default
};
