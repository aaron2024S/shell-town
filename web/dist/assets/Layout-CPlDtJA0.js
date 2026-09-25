import { d as defineComponent, u as useAuthStore, a as useToastStore, i as ref, w as watch, c as createElementBlock, F as Fragment, m as createVNode, p as withCtx, q as createBlock, f as createCommentVNode, k as openBlock, b as createBaseVNode, e as unref, n as normalizeClass, h as withDirectives, v as vModelText, t as toDisplayString, z as api, y as computed, _ as _export_sfc, A as useWsStore, o as onMounted, W as WS_EVENTS, B as onUnmounted, T as Transition, C as RouterView, r as renderList, j as useRouter, D as nextTick, O as useRoute, x as createTextVNode, P as RouterLink } from "./index-DLtaHw3I.js";
import { _ as _imports_0 } from "./shell-town-Dz19wnHl.js";
import { Z as ZodiacAvatar, i as isHumationAvatar } from "./ZodiacAvatar-BgUFKiIx.js";
import { M as Modal } from "./Modal-DiJeCwYw.js";
import { H as HumationAvatarEditor, B as BOY_PRESET, G as GIRL_PRESET, P as PRESET_VALUES } from "./presets-Dei_6Y9A.js";
const _hoisted_1$1 = { class: "form" };
const _hoisted_2$1 = { class: "field" };
const _hoisted_3$1 = { class: "avatar-row" };
const _hoisted_4$1 = {
  key: 1,
  class: "custom-ico"
};
const _hoisted_5$1 = { class: "field" };
const _hoisted_6$1 = { class: "actions" };
const _hoisted_7$1 = ["disabled"];
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "ChildSettingsModal",
  props: {
    modelValue: { type: Boolean }
  },
  emits: ["update:modelValue"],
  setup(__props, { emit: __emit }) {
    var _a;
    const props = __props;
    const emit = __emit;
    const auth = useAuthStore();
    const toast = useToastStore();
    const avatar = ref(((_a = auth.user) == null ? void 0 : _a.avatar) ?? "");
    const pin = ref("");
    const saving = ref(false);
    const showHumEditor = ref(false);
    function onHumSave(value) {
      avatar.value = value;
      showHumEditor.value = false;
    }
    watch(() => props.modelValue, (open) => {
      var _a2;
      if (open) {
        avatar.value = ((_a2 = auth.user) == null ? void 0 : _a2.avatar) ?? "";
        pin.value = "";
      }
    }, { immediate: true });
    const pinValid = computed(() => pin.value === "" || /^\d{4,6}$/.test(pin.value));
    async function save() {
      var _a2;
      if (!pinValid.value) {
        toast.error("PIN 必须是 4-6 位数字");
        return;
      }
      if (!avatar.value) {
        toast.error("请选择头像");
        return;
      }
      const body = { avatar: avatar.value };
      if (pin.value) body.pin = pin.value;
      saving.value = true;
      try {
        const res = await api.patch("/auth/child/me", body);
        auth.setUser(res.user);
        toast.success("设置已保存");
        emit("update:modelValue", false);
      } catch (e) {
        const err = (_a2 = e.payload) == null ? void 0 : _a2.error;
        if (err === "invalid_pin") toast.error("PIN 必须是 4-6 位数字");
        else if (err === "invalid_avatar") toast.error("头像无效");
        else toast.error(e.message);
      } finally {
        saving.value = false;
      }
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock(Fragment, null, [
        createVNode(Modal, {
          "model-value": __props.modelValue,
          "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => _ctx.$emit("update:modelValue", $event)),
          title: "我的设置",
          width: "420px"
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_1$1, [
              createBaseVNode("div", _hoisted_2$1, [
                _cache[9] || (_cache[9] = createBaseVNode("label", { class: "field-label" }, "我的头像", -1)),
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
                    _cache[6] || (_cache[6] = createBaseVNode("span", { class: "zname" }, "男生", -1))
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
                    _cache[7] || (_cache[7] = createBaseVNode("span", { class: "zname" }, "女生", -1))
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
                    _cache[8] || (_cache[8] = createBaseVNode("span", { class: "zname" }, "自定义", -1))
                  ], 2)
                ])
              ]),
              createBaseVNode("div", _hoisted_5$1, [
                _cache[10] || (_cache[10] = createBaseVNode("label", { class: "field-label" }, "登录 PIN 码", -1)),
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => pin.value = $event),
                  type: "password",
                  inputmode: "numeric",
                  maxlength: "6",
                  class: "input",
                  placeholder: "留空表示不修改"
                }, null, 512), [
                  [vModelText, pin.value]
                ]),
                _cache[11] || (_cache[11] = createBaseVNode("p", { class: "hint" }, "4-6 位数字", -1))
              ]),
              createBaseVNode("div", _hoisted_6$1, [
                createBaseVNode("button", {
                  class: "btn btn-primary",
                  disabled: saving.value,
                  onClick: save
                }, toDisplayString(saving.value ? "保存中..." : "保存"), 9, _hoisted_7$1)
              ])
            ])
          ]),
          _: 1
        }, 8, ["model-value"]),
        showHumEditor.value ? (openBlock(), createBlock(HumationAvatarEditor, {
          key: 0,
          current: avatar.value,
          onSave: onHumSave,
          onClose: _cache[5] || (_cache[5] = ($event) => showHumEditor.value = false)
        }, null, 8, ["current"])) : createCommentVNode("", true)
      ], 64);
    };
  }
});
const ChildSettingsModal = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-55b531ee"]]);
const _hoisted_1 = { class: "child-layout" };
const _hoisted_2 = { class: "topbar glass" };
const _hoisted_3 = {
  key: 0,
  class: "dropdown"
};
const _hoisted_4 = { class: "menu-header" };
const _hoisted_5 = { class: "info" };
const _hoisted_6 = { class: "m-name" };
const _hoisted_7 = { class: "m-role" };
const _hoisted_8 = { class: "main scroll-area" };
const _hoisted_9 = { class: "tabbar glass-strong" };
const _hoisted_10 = { class: "icon" };
const _hoisted_11 = {
  key: 0,
  class: "dot"
};
const _hoisted_12 = { class: "label" };
const CHECK_TTL_MS = 3e4;
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Layout",
  setup(__props) {
    const auth = useAuthStore();
    const toast = useToastStore();
    const router = useRouter();
    const route = useRoute();
    const ws = useWsStore();
    const navItems = [
      { to: "/child", label: "主页", icon: "🏠" },
      { to: "/child/pet", label: "宠物", icon: "🐾" },
      { to: "/child/tasks", label: "任务", icon: "📝" },
      { to: "/child/quiz", label: "单词", icon: "📚" },
      { to: "/child/shop", label: "商城", icon: "🎁" }
    ];
    const THEME_CLASSES = ["theme-boy", "theme-girl"];
    function applyTheme() {
      var _a;
      const cls = ((_a = auth.user) == null ? void 0 : _a.gender) === "male" ? "theme-boy" : "theme-girl";
      const el = document.documentElement;
      el.classList.remove(...THEME_CLASSES);
      el.classList.add(cls);
    }
    watch(() => {
      var _a;
      return (_a = auth.user) == null ? void 0 : _a.gender;
    }, applyTheme, { immediate: true });
    const menuOpen = ref(false);
    const settingsOpen = ref(false);
    const hasNewTask = ref(false);
    let lastCheckedAt = 0;
    async function checkNewTasks(force = false) {
      if (!force && Date.now() - lastCheckedAt < CHECK_TTL_MS) return;
      lastCheckedAt = Date.now();
      try {
        const res = await api.get("/adhoc-tasks/mine");
        hasNewTask.value = res.tasks.some((t) => t.display_status === "active" && !t.completion_status);
      } catch {
      }
    }
    watch(() => route.path, (path) => {
      if (path === "/child/tasks") {
        hasNewTask.value = false;
      } else {
        checkNewTasks();
      }
    });
    function onWsEvent() {
      if (route.path !== "/child/tasks") checkNewTasks(true);
    }
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
      toast.success("拜拜~");
      router.replace("/login");
    }
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
        await checkNewTasks(true);
      } catch {
      }
      window.addEventListener(WS_EVENTS.taskReview, onWsEvent);
      window.addEventListener(WS_EVENTS.taskGenerated, onWsEvent);
    });
    onUnmounted(() => {
      document.removeEventListener("click", onDocClick);
      ws.disconnect();
      window.removeEventListener(WS_EVENTS.taskReview, onWsEvent);
      window.removeEventListener(WS_EVENTS.taskGenerated, onWsEvent);
      THEME_CLASSES.forEach((c) => document.documentElement.classList.remove(c));
    });
    return (_ctx, _cache) => {
      var _a;
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("header", _hoisted_2, [
          _cache[3] || (_cache[3] = createBaseVNode("div", { style: { "width": "42px" } }, null, -1)),
          _cache[4] || (_cache[4] = createBaseVNode("div", { class: "brand" }, [
            createBaseVNode("img", {
              class: "logo",
              src: _imports_0,
              alt: ""
            }),
            createBaseVNode("span", { class: "name" }, "拾贝小镇")
          ], -1)),
          createBaseVNode("div", {
            class: "avatar-wrap",
            ref_key: "avatarRef",
            ref: avatarRef
          }, [
            createBaseVNode("button", {
              class: normalizeClass(["avatar-btn", { open: menuOpen.value }]),
              onClick: toggleMenu,
              title: "退出登录"
            }, [
              createVNode(ZodiacAvatar, {
                zodiac: (_a = unref(auth).user) == null ? void 0 : _a.avatar,
                size: 42
              }, null, 8, ["zodiac"])
            ], 2),
            createVNode(Transition, { name: "menu-pop" }, {
              default: withCtx(() => {
                var _a2, _b, _c;
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
                        createBaseVNode("div", _hoisted_7, toDisplayString(((_c = unref(auth).user) == null ? void 0 : _c.totalPoints) ?? 0) + " 分", 1)
                      ])
                    ]),
                    createBaseVNode("button", {
                      class: "menu-item",
                      onClick: openSettings
                    }, [..._cache[1] || (_cache[1] = [
                      createBaseVNode("span", { class: "mi-icon" }, "⚙️", -1),
                      createBaseVNode("span", null, "设置", -1)
                    ])]),
                    createBaseVNode("button", {
                      class: "menu-item danger",
                      onClick: logout
                    }, [..._cache[2] || (_cache[2] = [
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
        createBaseVNode("main", _hoisted_8, [
          createVNode(unref(RouterView))
        ]),
        createBaseVNode("nav", _hoisted_9, [
          (openBlock(), createElementBlock(Fragment, null, renderList(navItems, (item) => {
            return createVNode(unref(RouterLink), {
              key: item.to,
              to: item.to,
              class: normalizeClass(["tab", { active: _ctx.$route.path === item.to }])
            }, {
              default: withCtx(() => [
                createBaseVNode("span", _hoisted_10, [
                  createTextVNode(toDisplayString(item.icon) + " ", 1),
                  item.to === "/child/tasks" && hasNewTask.value ? (openBlock(), createElementBlock("span", _hoisted_11)) : createCommentVNode("", true)
                ]),
                createBaseVNode("span", _hoisted_12, toDisplayString(item.label), 1)
              ]),
              _: 2
            }, 1032, ["to", "class"]);
          }), 64))
        ]),
        createVNode(ChildSettingsModal, {
          modelValue: settingsOpen.value,
          "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => settingsOpen.value = $event)
        }, null, 8, ["modelValue"])
      ]);
    };
  }
});
const Layout = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-7100a448"]]);
export {
  Layout as default
};
