import { d as defineComponent, u as useAuthStore, a as useToastStore, w as watch, c as createElementBlock, F as Fragment, m as createVNode, p as withCtx, q as createBlock, f as createCommentVNode, i as ref, k as openBlock, b as createBaseVNode, e as unref, n as normalizeClass, h as withDirectives, v as vModelText, t as toDisplayString, x as createTextVNode, r as renderList, y as computed, z as api, _ as _export_sfc, A as useWsStore, o as onMounted, W as WS_EVENTS, R as REVIEW_UPDATED, B as onUnmounted, T as Transition, C as RouterView, j as useRouter, D as nextTick, E as resolveComponent } from "./index-DLtaHw3I.js";
import { _ as _imports_0 } from "./shell-town-Dz19wnHl.js";
import { Z as ZodiacAvatar, i as isHumationAvatar } from "./ZodiacAvatar-BgUFKiIx.js";
import { M as Modal } from "./Modal-DiJeCwYw.js";
import { C as ConfirmDialog } from "./ConfirmDialog-BWQPEwj0.js";
import { H as HumationAvatarEditor, B as BOY_PRESET, G as GIRL_PRESET, P as PRESET_VALUES } from "./presets-Dei_6Y9A.js";
const _hoisted_1$1 = { class: "form" };
const _hoisted_2$1 = { class: "field" };
const _hoisted_3$1 = { class: "avatar-row" };
const _hoisted_4$1 = {
  key: 1,
  class: "custom-ico"
};
const _hoisted_5$1 = { class: "field" };
const _hoisted_6$1 = { class: "field" };
const _hoisted_7$1 = { class: "field" };
const _hoisted_8$1 = { class: "section-head" };
const _hoisted_9$1 = { class: "head-side" };
const _hoisted_10$1 = ["disabled"];
const _hoisted_11$1 = { class: "field" };
const _hoisted_12 = { class: "field" };
const _hoisted_13 = { class: "section-head" };
const _hoisted_14 = { class: "retention-row" };
const _hoisted_15 = ["disabled"];
const _hoisted_16 = { class: "chip-row" };
const _hoisted_17 = ["onClick"];
const _hoisted_18 = { class: "chip-row" };
const _hoisted_19 = ["onClick"];
const _hoisted_20 = { class: "clear-summary" };
const _hoisted_21 = ["disabled"];
const _hoisted_22 = {
  key: 0,
  class: "app-ver"
};
const _hoisted_23 = ["disabled"];
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "SettingsModal",
  props: {
    modelValue: { type: Boolean }
  },
  emits: ["update:modelValue"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const auth = useAuthStore();
    const toast = useToastStore();
    const name = ref("");
    const password = ref("");
    const avatar = ref(BOY_PRESET.value);
    const saving = ref(false);
    const showHumEditor = ref(false);
    const appVersion = ref("");
    const ntfyUrl = ref("");
    const ntfyToken = ref("");
    const gotifyUrl = ref("");
    const gotifyToken = ref("");
    const wecomWebhook = ref("");
    const notifyLoaded = ref(false);
    const testing = ref(false);
    const notifyOpen = ref(false);
    const notifyChannelCount = computed(
      () => [ntfyUrl, gotifyUrl, wecomWebhook].filter((r) => r.value.trim()).length
    );
    const quizCap = ref(20);
    async function loadQuizCap() {
      try {
        const s = await api.get("/quiz/settings");
        quizCap.value = s.dailyCap;
      } catch {
      }
    }
    async function saveQuizCap() {
      try {
        await api.put("/quiz/settings", { dailyCap: quizCap.value });
        return true;
      } catch {
        toast.error("单词游戏上限保存失败");
        return false;
      }
    }
    async function loadNotify() {
      try {
        const cfg = await api.get("/settings/notify");
        ntfyUrl.value = cfg.ntfyUrl ?? "";
        ntfyToken.value = cfg.ntfyToken ?? "";
        gotifyUrl.value = cfg.gotifyUrl ?? "";
        gotifyToken.value = cfg.gotifyToken ?? "";
        wecomWebhook.value = cfg.wecomWebhook ?? "";
        notifyLoaded.value = true;
      } catch {
        notifyLoaded.value = false;
      }
    }
    function notifyPayload() {
      return {
        ntfyUrl: ntfyUrl.value.trim(),
        ntfyToken: ntfyToken.value.trim(),
        gotifyUrl: gotifyUrl.value.trim(),
        gotifyToken: gotifyToken.value.trim(),
        wecomWebhook: wecomWebhook.value.trim()
      };
    }
    async function saveNotify() {
      var _a, _b;
      try {
        const cfg = await api.put("/settings/notify", notifyPayload());
        ntfyUrl.value = cfg.ntfyUrl ?? "";
        ntfyToken.value = cfg.ntfyToken ?? "";
        gotifyUrl.value = cfg.gotifyUrl ?? "";
        gotifyToken.value = cfg.gotifyToken ?? "";
        wecomWebhook.value = cfg.wecomWebhook ?? "";
        return true;
      } catch (e) {
        const err = (_a = e.payload) == null ? void 0 : _a.error;
        toast.error(err === "invalid_input" ? `通知地址无效：${((_b = e.payload) == null ? void 0 : _b.detail) ?? ""}` : "通知设置保存失败");
        return false;
      }
    }
    async function testNotify() {
      testing.value = true;
      try {
        if (!await saveNotify()) return;
        const { results } = await api.post("/settings/notify/test", {});
        const okCount = results.filter((r) => r.ok).length;
        if (results.length === 0) {
          toast.warning("还没有配置任何通知渠道");
        } else if (okCount === results.length) {
          toast.success(`测试通知已发送（${okCount} 个渠道），去手机上看看吧 📲`);
        } else {
          const bad = results.filter((r) => !r.ok).map((r) => `${r.channel}: ${r.detail}`).join("；");
          toast.error(`部分渠道失败 → ${bad}`);
        }
      } catch (e) {
        toast.error(e.message || "测试发送失败");
      } finally {
        testing.value = false;
      }
    }
    function onHumSave(value) {
      avatar.value = value;
      showHumEditor.value = false;
    }
    const RECORD_TYPES = [
      { key: "point_logs", label: "积分流水" },
      { key: "pet_logs", label: "喂养记录" },
      { key: "exchange_requests", label: "兑换历史" },
      { key: "task_completions", label: "任务完成历史" }
    ];
    const recordsOpen = ref(false);
    const recordStats = ref(null);
    const recordChildren = ref([]);
    const clearType = ref("point_logs");
    const clearUserId = ref(0);
    const clearConfirmOpen = ref(false);
    const clearing = ref(false);
    const retentionDays = ref(90);
    const retentionDefault = ref(90);
    const retentionLoaded = ref(false);
    const cleaning = ref(false);
    async function toggleRecords() {
      recordsOpen.value = !recordsOpen.value;
      if (recordsOpen.value) await loadRecordStats();
    }
    async function loadRecordStats() {
      try {
        const res = await api.get("/records/stats");
        recordStats.value = res.types;
        recordChildren.value = res.children;
        retentionDays.value = res.retentionDays ?? 90;
        retentionDefault.value = res.defaultRetentionDays ?? 90;
        retentionLoaded.value = true;
      } catch {
        recordStats.value = null;
      }
    }
    async function saveRetention() {
      if (!retentionLoaded.value) return true;
      const days = Number(retentionDays.value);
      if (!Number.isFinite(days) || days < 0) {
        toast.error("保留天数不能为负数");
        return false;
      }
      try {
        const r = await api.put("/records/retention", { days: Math.floor(days) });
        retentionDays.value = r.retentionDays;
        return true;
      } catch {
        toast.error("自动清理设置保存失败");
        return false;
      }
    }
    async function cleanupNow() {
      if (cleaning.value) return;
      if (!await saveRetention()) return;
      cleaning.value = true;
      try {
        const r = await api.post("/records/cleanup", {});
        if (r.disabled) toast.warning("自动清理已关闭（保留天数填的是 0），没有清理任何记录");
        else if (r.deleted === 0) toast.success(`没有超过 ${r.retentionDays} 天的记录需要清理`);
        else toast.success(`已清理 ${r.deleted} 条超过 ${r.retentionDays} 天的记录`);
        await loadRecordStats();
      } catch (e) {
        toast.error((e == null ? void 0 : e.message) || "清理失败");
      } finally {
        cleaning.value = false;
      }
    }
    const selectedCount = computed(() => {
      if (!recordStats.value) return 0;
      const t = recordStats.value[clearType.value];
      return clearUserId.value === 0 ? t.total : t.byUser[String(clearUserId.value)] ?? 0;
    });
    const selectedTypeName = computed(() => {
      var _a;
      return ((_a = RECORD_TYPES.find((t) => t.key === clearType.value)) == null ? void 0 : _a.label) ?? "";
    });
    const clearConfirmMessage = computed(() => {
      var _a;
      const scope = clearUserId.value === 0 ? "全部孩子" : ((_a = recordChildren.value.find((c) => c.id === clearUserId.value)) == null ? void 0 : _a.name) ?? "该孩子";
      return `确认清空 ${scope} 的 ${selectedTypeName.value}（共 ${selectedCount.value} 条）？此操作不可恢复，且不影响积分余额与宠物等级。`;
    });
    async function doClearRecords() {
      if (clearing.value) return;
      clearing.value = true;
      try {
        const payload = { type: clearType.value };
        if (clearUserId.value !== 0) payload.userId = clearUserId.value;
        const res = await api.post("/records/clear", payload);
        toast.success(`已清空 ${res.deleted} 条记录`);
        await loadRecordStats();
      } catch (e) {
        toast.error((e == null ? void 0 : e.message) || "清空失败");
      } finally {
        clearing.value = false;
      }
    }
    watch(() => props.modelValue, (open) => {
      var _a, _b;
      if (open) {
        name.value = ((_a = auth.user) == null ? void 0 : _a.name) ?? "";
        password.value = "";
        avatar.value = ((_b = auth.user) == null ? void 0 : _b.avatar) ?? "dragon";
        void loadNotify();
        void loadQuizCap();
        api.get("/version").then((r) => {
          appVersion.value = r.version ?? "";
        }).catch(() => {
        });
      }
    }, { immediate: true });
    async function save() {
      var _a;
      if (!name.value.trim()) return toast.warning("请输入账号名称");
      if (password.value && password.value.length < 6) {
        return toast.warning("密码至少 6 位");
      }
      saving.value = true;
      try {
        const payload = {
          name: name.value.trim(),
          avatar: avatar.value
        };
        if (password.value) payload.password = password.value;
        await auth.updateMe(payload);
        const notifyOk = await saveNotify();
        const quizOk = await saveQuizCap();
        const retentionOk = await saveRetention();
        if (notifyOk && quizOk && retentionOk) toast.success("设置已保存 🎉");
        emit("update:modelValue", false);
      } catch (e) {
        const err = (_a = e.payload) == null ? void 0 : _a.error;
        if (err === "name_taken") toast.error("该账号已被占用，换一个吧");
        else if (err === "invalid_avatar") toast.error("头像无效");
        else toast.error(e.message || "保存失败");
      } finally {
        saving.value = false;
      }
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock(Fragment, null, [
        createVNode(Modal, {
          "model-value": __props.modelValue,
          title: "设置",
          width: "460px",
          "onUpdate:modelValue": _cache[19] || (_cache[19] = ($event) => emit("update:modelValue", $event))
        }, {
          footer: withCtx(() => [
            _cache[57] || (_cache[57] = createBaseVNode("span", { style: { "flex": "1" } }, null, -1)),
            createBaseVNode("button", {
              class: "btn btn-ghost",
              onClick: _cache[18] || (_cache[18] = ($event) => emit("update:modelValue", false))
            }, "取消"),
            createBaseVNode("button", {
              class: "btn btn-primary",
              onClick: save,
              disabled: saving.value
            }, toDisplayString(saving.value ? "保存中..." : "保存"), 9, _hoisted_23)
          ]),
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_1$1, [
              createBaseVNode("div", _hoisted_2$1, [
                _cache[24] || (_cache[24] = createBaseVNode("label", { class: "label" }, "头像", -1)),
                createBaseVNode("div", _hoisted_3$1, [
                  createBaseVNode("button", {
                    type: "button",
                    class: normalizeClass(["zodiac", { active: avatar.value === unref(BOY_PRESET).value }]),
                    onClick: _cache[0] || (_cache[0] = ($event) => avatar.value = unref(BOY_PRESET).value)
                  }, [
                    createVNode(ZodiacAvatar, {
                      zodiac: unref(BOY_PRESET).value,
                      size: 56
                    }, null, 8, ["zodiac"]),
                    _cache[21] || (_cache[21] = createBaseVNode("span", { class: "zname" }, "男生", -1))
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
                    _cache[22] || (_cache[22] = createBaseVNode("span", { class: "zname" }, "女生", -1))
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
                    }, null, 8, ["zodiac"])) : (openBlock(), createElementBlock("span", _hoisted_4$1, "🎨")),
                    _cache[23] || (_cache[23] = createBaseVNode("span", { class: "zname" }, "自定义", -1))
                  ], 2)
                ])
              ]),
              createBaseVNode("div", _hoisted_5$1, [
                _cache[25] || (_cache[25] = createBaseVNode("label", { class: "label" }, "账号", -1)),
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => name.value = $event),
                  type: "text",
                  maxlength: "30",
                  placeholder: "家长登录账号",
                  autocomplete: "username"
                }, null, 512), [
                  [vModelText, name.value]
                ]),
                _cache[26] || (_cache[26] = createBaseVNode("p", { class: "hint" }, "登录时使用的账号名称", -1))
              ]),
              createBaseVNode("div", _hoisted_6$1, [
                _cache[27] || (_cache[27] = createBaseVNode("label", { class: "label" }, "新密码（留空则不修改）", -1)),
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => password.value = $event),
                  type: "password",
                  maxlength: "64",
                  placeholder: "至少 6 位",
                  autocomplete: "new-password"
                }, null, 512), [
                  [vModelText, password.value]
                ]),
                _cache[28] || (_cache[28] = createBaseVNode("p", { class: "hint" }, "修改后下次登录请使用新密码", -1))
              ]),
              _cache[54] || (_cache[54] = createBaseVNode("div", { class: "divider" }, null, -1)),
              createBaseVNode("div", _hoisted_7$1, [
                createBaseVNode("div", _hoisted_8$1, [
                  _cache[29] || (_cache[29] = createBaseVNode("span", { class: "label" }, "🔔 审核通知推送", -1)),
                  createBaseVNode("span", _hoisted_9$1, [
                    !notifyOpen.value ? (openBlock(), createElementBlock("span", {
                      key: 0,
                      class: normalizeClass(["head-badge", { on: notifyChannelCount.value > 0 }])
                    }, toDisplayString(notifyChannelCount.value > 0 ? `已配置 ${notifyChannelCount.value} 个渠道` : "未配置"), 3)) : createCommentVNode("", true),
                    createBaseVNode("button", {
                      type: "button",
                      class: "btn-toggle",
                      onClick: _cache[5] || (_cache[5] = ($event) => notifyOpen.value = !notifyOpen.value)
                    }, toDisplayString(notifyOpen.value ? "收起" : "展开"), 1)
                  ])
                ]),
                notifyOpen.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  _cache[30] || (_cache[30] = createBaseVNode("p", { class: "hint" }, "配置后，孩子提交兑换申请或任务完成申请时会即时推送到对应渠道。留空表示停用。", -1)),
                  _cache[31] || (_cache[31] = createBaseVNode("label", { class: "label ch-label" }, "ntfy 主题地址", -1)),
                  withDirectives(createBaseVNode("input", {
                    "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => ntfyUrl.value = $event),
                    type: "url",
                    maxlength: "500",
                    placeholder: "如 https://ntfy.sh/my-family-topic"
                  }, null, 512), [
                    [vModelText, ntfyUrl.value]
                  ]),
                  _cache[32] || (_cache[32] = createBaseVNode("label", { class: "label ch-label" }, "ntfy 访问令牌（可选）", -1)),
                  withDirectives(createBaseVNode("input", {
                    "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => ntfyToken.value = $event),
                    type: "password",
                    maxlength: "200",
                    placeholder: "访问令牌 tk_xxx 或 用户:密码，主题无需认证则留空"
                  }, null, 512), [
                    [vModelText, ntfyToken.value]
                  ]),
                  _cache[33] || (_cache[33] = createBaseVNode("p", { class: "hint" }, "自部署 ntfy 开了访问控制时填写：填 tk_ 开头的访问令牌走 Bearer 认证，填 用户:密码 走 Basic 认证。", -1)),
                  _cache[34] || (_cache[34] = createBaseVNode("label", { class: "label ch-label" }, "Gotify 消息地址", -1)),
                  withDirectives(createBaseVNode("input", {
                    "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => gotifyUrl.value = $event),
                    type: "url",
                    maxlength: "500",
                    placeholder: "如 https://push.example.com/message?token=xxxx"
                  }, null, 512), [
                    [vModelText, gotifyUrl.value]
                  ]),
                  _cache[35] || (_cache[35] = createBaseVNode("label", { class: "label ch-label" }, "Gotify 应用令牌（可选）", -1)),
                  withDirectives(createBaseVNode("input", {
                    "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => gotifyToken.value = $event),
                    type: "password",
                    maxlength: "200",
                    placeholder: "URL 里已带 ?token= 则留空；否则填应用令牌"
                  }, null, 512), [
                    [vModelText, gotifyToken.value]
                  ]),
                  _cache[36] || (_cache[36] = createBaseVNode("p", { class: "hint" }, "令牌两种填法任选其一：拼在地址的 ?token= 参数里，或单独填在这里（走 X-Gotify-Key 请求头）。", -1)),
                  _cache[37] || (_cache[37] = createBaseVNode("label", { class: "label ch-label" }, "企业微信群机器人 Webhook", -1)),
                  withDirectives(createBaseVNode("input", {
                    "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => wecomWebhook.value = $event),
                    type: "url",
                    maxlength: "500",
                    placeholder: "如 https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxx"
                  }, null, 512), [
                    [vModelText, wecomWebhook.value]
                  ]),
                  _cache[38] || (_cache[38] = createBaseVNode("p", { class: "hint" }, "「保存并发送测试」会先保存配置，再向每个已填写的渠道各发一条测试消息。", -1)),
                  createBaseVNode("button", {
                    type: "button",
                    class: "btn-send-test",
                    disabled: testing.value,
                    onClick: testNotify
                  }, toDisplayString(testing.value ? "发送中..." : "保存并发送测试"), 9, _hoisted_10$1)
                ], 64)) : createCommentVNode("", true)
              ]),
              _cache[55] || (_cache[55] = createBaseVNode("div", { class: "divider" }, null, -1)),
              createBaseVNode("div", _hoisted_11$1, [
                _cache[39] || (_cache[39] = createBaseVNode("label", { class: "label" }, "📚 单词游戏每日积分上限", -1)),
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => quizCap.value = $event),
                  type: "number",
                  min: "1",
                  max: "200"
                }, null, 512), [
                  [
                    vModelText,
                    quizCap.value,
                    void 0,
                    { number: true }
                  ]
                ]),
                _cache[40] || (_cache[40] = createBaseVNode("p", { class: "hint" }, "孩子端「单词闯关」每天最多能获得的积分（1~200，默认 20）", -1))
              ]),
              _cache[56] || (_cache[56] = createBaseVNode("div", { class: "divider" }, null, -1)),
              createBaseVNode("div", _hoisted_12, [
                createBaseVNode("div", _hoisted_13, [
                  _cache[41] || (_cache[41] = createBaseVNode("span", { class: "label danger-label" }, "🗑️ 记录管理", -1)),
                  createBaseVNode("button", {
                    type: "button",
                    class: "btn-toggle",
                    onClick: toggleRecords
                  }, toDisplayString(recordsOpen.value ? "收起" : "展开"), 1)
                ]),
                recordsOpen.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  _cache[46] || (_cache[46] = createBaseVNode("label", { class: "label ch-label" }, "自动清理", -1)),
                  _cache[47] || (_cache[47] = createBaseVNode("p", { class: "hint" }, [
                    createTextVNode(" 超过保留期的流水与历史会每天自动清理一次。只删记录明细，"),
                    createBaseVNode("b", null, "不影响积分余额和宠物等级"),
                    createTextVNode("； 待审核申请、进行中的任务、正在答的题目永不删除。 ")
                  ], -1)),
                  createBaseVNode("div", _hoisted_14, [
                    _cache[42] || (_cache[42] = createBaseVNode("span", { class: "retention-text" }, "保留最近", -1)),
                    withDirectives(createBaseVNode("input", {
                      "onUpdate:modelValue": _cache[12] || (_cache[12] = ($event) => retentionDays.value = $event),
                      class: "retention-input",
                      type: "number",
                      min: "0",
                      max: "3650",
                      step: "30",
                      inputmode: "numeric"
                    }, null, 512), [
                      [
                        vModelText,
                        retentionDays.value,
                        void 0,
                        { number: true }
                      ]
                    ]),
                    _cache[43] || (_cache[43] = createBaseVNode("span", { class: "retention-text" }, "天", -1)),
                    createBaseVNode("button", {
                      type: "button",
                      class: "btn-toggle",
                      onClick: _cache[13] || (_cache[13] = ($event) => retentionDays.value = 0)
                    }, "关闭"),
                    createBaseVNode("button", {
                      type: "button",
                      class: "btn-toggle",
                      onClick: _cache[14] || (_cache[14] = ($event) => retentionDays.value = retentionDefault.value)
                    }, " 恢复默认（" + toDisplayString(retentionDefault.value) + "） ", 1)
                  ]),
                  _cache[48] || (_cache[48] = createBaseVNode("p", { class: "hint" }, "填 0 表示关闭自动清理，记录会一直保留。", -1)),
                  createBaseVNode("button", {
                    type: "button",
                    class: "btn-toggle retention-now",
                    disabled: cleaning.value || retentionDays.value <= 0,
                    onClick: cleanupNow
                  }, toDisplayString(cleaning.value ? "清理中..." : "立即清理一次"), 9, _hoisted_15),
                  _cache[49] || (_cache[49] = createBaseVNode("div", { class: "divider" }, null, -1)),
                  _cache[50] || (_cache[50] = createBaseVNode("label", { class: "label ch-label" }, "手动清空", -1)),
                  _cache[51] || (_cache[51] = createBaseVNode("p", { class: "hint" }, [
                    createTextVNode(" 清空后记录不可恢复。只删除记录明细，"),
                    createBaseVNode("b", null, "不影响积分余额和宠物等级"),
                    createTextVNode("；兑换/任务的待审核申请不会被清掉。 ")
                  ], -1)),
                  _cache[52] || (_cache[52] = createBaseVNode("label", { class: "label ch-label" }, "记录类型", -1)),
                  createBaseVNode("div", _hoisted_16, [
                    (openBlock(), createElementBlock(Fragment, null, renderList(RECORD_TYPES, (t) => {
                      return createBaseVNode("button", {
                        key: t.key,
                        type: "button",
                        class: normalizeClass(["chip", { active: clearType.value === t.key }]),
                        onClick: ($event) => clearType.value = t.key
                      }, toDisplayString(t.label), 11, _hoisted_17);
                    }), 64))
                  ]),
                  _cache[53] || (_cache[53] = createBaseVNode("label", { class: "label ch-label" }, "范围", -1)),
                  createBaseVNode("div", _hoisted_18, [
                    createBaseVNode("button", {
                      type: "button",
                      class: normalizeClass(["chip", { active: clearUserId.value === 0 }]),
                      onClick: _cache[15] || (_cache[15] = ($event) => clearUserId.value = 0)
                    }, " 全部孩子 ", 2),
                    (openBlock(true), createElementBlock(Fragment, null, renderList(recordChildren.value, (c) => {
                      return openBlock(), createElementBlock("button", {
                        key: c.id,
                        type: "button",
                        class: normalizeClass(["chip", { active: clearUserId.value === c.id }]),
                        onClick: ($event) => clearUserId.value = c.id
                      }, toDisplayString(c.name), 11, _hoisted_19);
                    }), 128))
                  ]),
                  createBaseVNode("div", _hoisted_20, [
                    _cache[44] || (_cache[44] = createTextVNode(" 将清空 ", -1)),
                    createBaseVNode("b", null, toDisplayString(selectedCount.value), 1),
                    _cache[45] || (_cache[45] = createTextVNode(" 条记录 ", -1))
                  ]),
                  createBaseVNode("button", {
                    type: "button",
                    class: "btn-danger-zone",
                    disabled: clearing.value || selectedCount.value === 0,
                    onClick: _cache[16] || (_cache[16] = ($event) => clearConfirmOpen.value = true)
                  }, toDisplayString(clearing.value ? "清空中..." : "清空所选记录"), 9, _hoisted_21)
                ], 64)) : createCommentVNode("", true)
              ]),
              appVersion.value ? (openBlock(), createElementBlock("p", _hoisted_22, "拾贝小镇 v" + toDisplayString(appVersion.value), 1)) : createCommentVNode("", true)
            ]),
            createVNode(ConfirmDialog, {
              modelValue: clearConfirmOpen.value,
              "onUpdate:modelValue": _cache[17] || (_cache[17] = ($event) => clearConfirmOpen.value = $event),
              title: "⚠️ 确认清空记录",
              message: clearConfirmMessage.value,
              confirmText: "确认清空",
              variant: "danger",
              onConfirm: doClearRecords
            }, null, 8, ["modelValue", "message"])
          ]),
          _: 1
        }, 8, ["model-value"]),
        showHumEditor.value ? (openBlock(), createBlock(HumationAvatarEditor, {
          key: 0,
          current: avatar.value,
          onSave: onHumSave,
          onClose: _cache[20] || (_cache[20] = ($event) => showHumEditor.value = false)
        }, null, 8, ["current"])) : createCommentVNode("", true)
      ], 64);
    };
  }
});
const SettingsModal = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-f5c433ed"]]);
const _hoisted_1 = { class: "parent-layout" };
const _hoisted_2 = { class: "topbar glass" };
const _hoisted_3 = {
  key: 0,
  class: "dropdown"
};
const _hoisted_4 = { class: "menu-header" };
const _hoisted_5 = { class: "info" };
const _hoisted_6 = { class: "m-name" };
const _hoisted_7 = { class: "main scroll-area" };
const _hoisted_8 = { class: "tabbar glass-strong" };
const _hoisted_9 = { class: "icon" };
const _hoisted_10 = {
  key: 0,
  class: "dot"
};
const _hoisted_11 = { class: "label" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Layout",
  setup(__props) {
    const auth = useAuthStore();
    const toast = useToastStore();
    const router = useRouter();
    const ws = useWsStore();
    const navItems = [
      { to: "/parent", label: "总览", icon: "🏠" },
      { to: "/parent/tasks", label: "任务", icon: "📝" },
      { to: "/parent/points", label: "积分", icon: "⭐" },
      { to: "/parent/shop", label: "商城", icon: "🎁" },
      { to: "/parent/pets", label: "宠物", icon: "🐾" },
      { to: "/parent/review", label: "审核", icon: "✅" }
    ];
    const menuOpen = ref(false);
    const settingsOpen = ref(false);
    const pendingReviewCount = computed(() => ws.pendingCount);
    const avatarRef = ref(null);
    function toggleMenu() {
      menuOpen.value = !menuOpen.value;
      if (menuOpen.value) {
        nextTick(() => {
          document.addEventListener("click", onDocClick, { capture: true });
        });
      }
    }
    function closeMenu() {
      menuOpen.value = false;
      document.removeEventListener("click", onDocClick);
    }
    function onDocClick(e) {
      var _a;
      const target = e.target;
      if ((_a = avatarRef.value) == null ? void 0 : _a.contains(target)) return;
      closeMenu();
    }
    function openSettings() {
      closeMenu();
      settingsOpen.value = true;
    }
    function logout() {
      closeMenu();
      ws.disconnect();
      auth.logout();
      toast.success("已退出登录");
      router.replace("/login");
    }
    const onReviewChanged = () => ws.refreshPendingCount();
    onMounted(async () => {
      try {
        await auth.refreshMe();
      } catch (e) {
        if ((e == null ? void 0 : e.status) === 401) {
          auth.logout();
          router.replace("/login");
          return;
        }
        toast.error((e == null ? void 0 : e.message) || "数据加载失败");
      }
      try {
        ws.connect();
        await ws.refreshPendingCount();
      } catch {
      }
      window.addEventListener(WS_EVENTS.newExchangeRequest, onReviewChanged);
      window.addEventListener(WS_EVENTS.exchangeReviewed, onReviewChanged);
      window.addEventListener(WS_EVENTS.taskCompletionSubmitted, onReviewChanged);
      window.addEventListener(WS_EVENTS.taskReview, onReviewChanged);
      window.addEventListener(REVIEW_UPDATED, onReviewChanged);
    });
    onUnmounted(() => {
      document.removeEventListener("click", onDocClick);
      ws.disconnect();
      window.removeEventListener(WS_EVENTS.newExchangeRequest, onReviewChanged);
      window.removeEventListener(WS_EVENTS.exchangeReviewed, onReviewChanged);
      window.removeEventListener(WS_EVENTS.taskCompletionSubmitted, onReviewChanged);
      window.removeEventListener(WS_EVENTS.taskReview, onReviewChanged);
      window.removeEventListener(REVIEW_UPDATED, onReviewChanged);
    });
    return (_ctx, _cache) => {
      var _a;
      const _component_RouterLink = resolveComponent("RouterLink");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("header", _hoisted_2, [
          _cache[5] || (_cache[5] = createBaseVNode("div", { class: "brand" }, [
            createBaseVNode("img", {
              class: "logo",
              src: _imports_0,
              alt: ""
            }),
            createBaseVNode("span", { class: "name" }, "拾贝小镇")
          ], -1)),
          _cache[6] || (_cache[6] = createBaseVNode("div", { class: "spacer" }, null, -1)),
          createBaseVNode("div", {
            class: "avatar-wrap",
            ref_key: "avatarRef",
            ref: avatarRef
          }, [
            createBaseVNode("button", {
              class: normalizeClass(["avatar-btn", { open: menuOpen.value }]),
              onClick: toggleMenu,
              title: "账号菜单"
            }, [
              createVNode(ZodiacAvatar, {
                zodiac: (_a = unref(auth).user) == null ? void 0 : _a.avatar,
                size: 42
              }, null, 8, ["zodiac"])
            ], 2),
            createVNode(Transition, { name: "menu-pop" }, {
              default: withCtx(() => {
                var _a2, _b;
                return [
                  menuOpen.value ? (openBlock(), createElementBlock("div", _hoisted_3, [
                    createBaseVNode("div", _hoisted_4, [
                      createVNode(ZodiacAvatar, {
                        zodiac: (_a2 = unref(auth).user) == null ? void 0 : _a2.avatar,
                        size: 48,
                        "show-ring": ""
                      }, null, 8, ["zodiac"]),
                      createBaseVNode("div", _hoisted_5, [
                        createBaseVNode("div", _hoisted_6, toDisplayString((_b = unref(auth).user) == null ? void 0 : _b.name), 1),
                        _cache[1] || (_cache[1] = createBaseVNode("div", { class: "m-role" }, "家长账号", -1))
                      ])
                    ]),
                    createBaseVNode("button", {
                      class: "menu-item",
                      onClick: openSettings
                    }, [..._cache[2] || (_cache[2] = [
                      createBaseVNode("span", { class: "mi-icon" }, "⚙️", -1),
                      createBaseVNode("span", null, "设置", -1)
                    ])]),
                    _cache[4] || (_cache[4] = createBaseVNode("div", { class: "menu-divider" }, null, -1)),
                    createBaseVNode("button", {
                      class: "menu-item danger",
                      onClick: logout
                    }, [..._cache[3] || (_cache[3] = [
                      createBaseVNode("span", { class: "mi-icon" }, "👋", -1),
                      createBaseVNode("span", null, "退出登录", -1)
                    ])])
                  ])) : createCommentVNode("", true)
                ];
              }),
              _: 1
            })
          ], 512)
        ]),
        createBaseVNode("main", _hoisted_7, [
          createVNode(unref(RouterView))
        ]),
        createBaseVNode("nav", _hoisted_8, [
          (openBlock(), createElementBlock(Fragment, null, renderList(navItems, (item) => {
            return createVNode(_component_RouterLink, {
              key: item.to,
              to: item.to,
              class: normalizeClass(["tab", { active: _ctx.$route.path === item.to }])
            }, {
              default: withCtx(() => [
                createBaseVNode("span", _hoisted_9, [
                  createTextVNode(toDisplayString(item.icon) + " ", 1),
                  item.to === "/parent/review" && pendingReviewCount.value > 0 ? (openBlock(), createElementBlock("span", _hoisted_10)) : createCommentVNode("", true)
                ]),
                createBaseVNode("span", _hoisted_11, toDisplayString(item.label), 1)
              ]),
              _: 2
            }, 1032, ["to", "class"]);
          }), 64))
        ]),
        createVNode(SettingsModal, {
          modelValue: settingsOpen.value,
          "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => settingsOpen.value = $event)
        }, null, 8, ["modelValue"])
      ]);
    };
  }
});
const Layout = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-fe8c3269"]]);
export {
  Layout as default
};
