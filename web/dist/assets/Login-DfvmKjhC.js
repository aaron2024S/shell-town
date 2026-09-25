import { d as defineComponent, u as useAuthStore, a as useToastStore, o as onMounted, l as loadServerConfig, w as watch, c as createElementBlock, b as createBaseVNode, e as unref, f as createCommentVNode, n as normalizeClass, g as withModifiers, h as withDirectives, v as vModelText, t as toDisplayString, F as Fragment, r as renderList, i as ref, s as saveServerConfig, j as useRouter, k as openBlock, m as createVNode, _ as _export_sfc } from "./index-DLtaHw3I.js";
import { _ as _imports_0 } from "./shell-town-Dz19wnHl.js";
import { Z as ZodiacAvatar } from "./ZodiacAvatar-BgUFKiIx.js";
/*! Capacitor: https://capacitorjs.com/ - MIT License */
const createCapacitorPlatforms = (win) => {
  const defaultPlatformMap = /* @__PURE__ */ new Map();
  defaultPlatformMap.set("web", { name: "web" });
  const capPlatforms = win.CapacitorPlatforms || {
    currentPlatform: { name: "web" },
    platforms: defaultPlatformMap
  };
  const addPlatform = (name, platform) => {
    capPlatforms.platforms.set(name, platform);
  };
  const setPlatform = (name) => {
    if (capPlatforms.platforms.has(name)) {
      capPlatforms.currentPlatform = capPlatforms.platforms.get(name);
    }
  };
  capPlatforms.addPlatform = addPlatform;
  capPlatforms.setPlatform = setPlatform;
  return capPlatforms;
};
const initPlatforms = (win) => win.CapacitorPlatforms = createCapacitorPlatforms(win);
const CapacitorPlatforms = /* @__PURE__ */ initPlatforms(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {});
CapacitorPlatforms.addPlatform;
CapacitorPlatforms.setPlatform;
var ExceptionCode;
(function(ExceptionCode2) {
  ExceptionCode2["Unimplemented"] = "UNIMPLEMENTED";
  ExceptionCode2["Unavailable"] = "UNAVAILABLE";
})(ExceptionCode || (ExceptionCode = {}));
class CapacitorException extends Error {
  constructor(message, code, data) {
    super(message);
    this.message = message;
    this.code = code;
    this.data = data;
  }
}
const getPlatformId = (win) => {
  var _a, _b;
  if (win === null || win === void 0 ? void 0 : win.androidBridge) {
    return "android";
  } else if ((_b = (_a = win === null || win === void 0 ? void 0 : win.webkit) === null || _a === void 0 ? void 0 : _a.messageHandlers) === null || _b === void 0 ? void 0 : _b.bridge) {
    return "ios";
  } else {
    return "web";
  }
};
const createCapacitor = (win) => {
  var _a, _b, _c, _d, _e;
  const capCustomPlatform = win.CapacitorCustomPlatform || null;
  const cap = win.Capacitor || {};
  const Plugins = cap.Plugins = cap.Plugins || {};
  const capPlatforms = win.CapacitorPlatforms;
  const defaultGetPlatform = () => {
    return capCustomPlatform !== null ? capCustomPlatform.name : getPlatformId(win);
  };
  const getPlatform = ((_a = capPlatforms === null || capPlatforms === void 0 ? void 0 : capPlatforms.currentPlatform) === null || _a === void 0 ? void 0 : _a.getPlatform) || defaultGetPlatform;
  const defaultIsNativePlatform = () => getPlatform() !== "web";
  const isNativePlatform = ((_b = capPlatforms === null || capPlatforms === void 0 ? void 0 : capPlatforms.currentPlatform) === null || _b === void 0 ? void 0 : _b.isNativePlatform) || defaultIsNativePlatform;
  const defaultIsPluginAvailable = (pluginName) => {
    const plugin = registeredPlugins.get(pluginName);
    if (plugin === null || plugin === void 0 ? void 0 : plugin.platforms.has(getPlatform())) {
      return true;
    }
    if (getPluginHeader(pluginName)) {
      return true;
    }
    return false;
  };
  const isPluginAvailable = ((_c = capPlatforms === null || capPlatforms === void 0 ? void 0 : capPlatforms.currentPlatform) === null || _c === void 0 ? void 0 : _c.isPluginAvailable) || defaultIsPluginAvailable;
  const defaultGetPluginHeader = (pluginName) => {
    var _a2;
    return (_a2 = cap.PluginHeaders) === null || _a2 === void 0 ? void 0 : _a2.find((h) => h.name === pluginName);
  };
  const getPluginHeader = ((_d = capPlatforms === null || capPlatforms === void 0 ? void 0 : capPlatforms.currentPlatform) === null || _d === void 0 ? void 0 : _d.getPluginHeader) || defaultGetPluginHeader;
  const handleError = (err) => win.console.error(err);
  const pluginMethodNoop = (_target, prop, pluginName) => {
    return Promise.reject(`${pluginName} does not have an implementation of "${prop}".`);
  };
  const registeredPlugins = /* @__PURE__ */ new Map();
  const defaultRegisterPlugin = (pluginName, jsImplementations = {}) => {
    const registeredPlugin = registeredPlugins.get(pluginName);
    if (registeredPlugin) {
      console.warn(`Capacitor plugin "${pluginName}" already registered. Cannot register plugins twice.`);
      return registeredPlugin.proxy;
    }
    const platform = getPlatform();
    const pluginHeader = getPluginHeader(pluginName);
    let jsImplementation;
    const loadPluginImplementation = async () => {
      if (!jsImplementation && platform in jsImplementations) {
        jsImplementation = typeof jsImplementations[platform] === "function" ? jsImplementation = await jsImplementations[platform]() : jsImplementation = jsImplementations[platform];
      } else if (capCustomPlatform !== null && !jsImplementation && "web" in jsImplementations) {
        jsImplementation = typeof jsImplementations["web"] === "function" ? jsImplementation = await jsImplementations["web"]() : jsImplementation = jsImplementations["web"];
      }
      return jsImplementation;
    };
    const createPluginMethod = (impl, prop) => {
      var _a2, _b2;
      if (pluginHeader) {
        const methodHeader = pluginHeader === null || pluginHeader === void 0 ? void 0 : pluginHeader.methods.find((m) => prop === m.name);
        if (methodHeader) {
          if (methodHeader.rtype === "promise") {
            return (options) => cap.nativePromise(pluginName, prop.toString(), options);
          } else {
            return (options, callback) => cap.nativeCallback(pluginName, prop.toString(), options, callback);
          }
        } else if (impl) {
          return (_a2 = impl[prop]) === null || _a2 === void 0 ? void 0 : _a2.bind(impl);
        }
      } else if (impl) {
        return (_b2 = impl[prop]) === null || _b2 === void 0 ? void 0 : _b2.bind(impl);
      } else {
        throw new CapacitorException(`"${pluginName}" plugin is not implemented on ${platform}`, ExceptionCode.Unimplemented);
      }
    };
    const createPluginMethodWrapper = (prop) => {
      let remove;
      const wrapper = (...args) => {
        const p = loadPluginImplementation().then((impl) => {
          const fn = createPluginMethod(impl, prop);
          if (fn) {
            const p2 = fn(...args);
            remove = p2 === null || p2 === void 0 ? void 0 : p2.remove;
            return p2;
          } else {
            throw new CapacitorException(`"${pluginName}.${prop}()" is not implemented on ${platform}`, ExceptionCode.Unimplemented);
          }
        });
        if (prop === "addListener") {
          p.remove = async () => remove();
        }
        return p;
      };
      wrapper.toString = () => `${prop.toString()}() { [capacitor code] }`;
      Object.defineProperty(wrapper, "name", {
        value: prop,
        writable: false,
        configurable: false
      });
      return wrapper;
    };
    const addListener = createPluginMethodWrapper("addListener");
    const removeListener = createPluginMethodWrapper("removeListener");
    const addListenerNative = (eventName, callback) => {
      const call = addListener({ eventName }, callback);
      const remove = async () => {
        const callbackId = await call;
        removeListener({
          eventName,
          callbackId
        }, callback);
      };
      const p = new Promise((resolve) => call.then(() => resolve({ remove })));
      p.remove = async () => {
        console.warn(`Using addListener() without 'await' is deprecated.`);
        await remove();
      };
      return p;
    };
    const proxy = new Proxy({}, {
      get(_, prop) {
        switch (prop) {
          case "$$typeof":
            return void 0;
          case "toJSON":
            return () => ({});
          case "addListener":
            return pluginHeader ? addListenerNative : addListener;
          case "removeListener":
            return removeListener;
          default:
            return createPluginMethodWrapper(prop);
        }
      }
    });
    Plugins[pluginName] = proxy;
    registeredPlugins.set(pluginName, {
      name: pluginName,
      proxy,
      platforms: /* @__PURE__ */ new Set([
        ...Object.keys(jsImplementations),
        ...pluginHeader ? [platform] : []
      ])
    });
    return proxy;
  };
  const registerPlugin2 = ((_e = capPlatforms === null || capPlatforms === void 0 ? void 0 : capPlatforms.currentPlatform) === null || _e === void 0 ? void 0 : _e.registerPlugin) || defaultRegisterPlugin;
  if (!cap.convertFileSrc) {
    cap.convertFileSrc = (filePath) => filePath;
  }
  cap.getPlatform = getPlatform;
  cap.handleError = handleError;
  cap.isNativePlatform = isNativePlatform;
  cap.isPluginAvailable = isPluginAvailable;
  cap.pluginMethodNoop = pluginMethodNoop;
  cap.registerPlugin = registerPlugin2;
  cap.Exception = CapacitorException;
  cap.DEBUG = !!cap.DEBUG;
  cap.isLoggingEnabled = !!cap.isLoggingEnabled;
  cap.platform = cap.getPlatform();
  cap.isNative = cap.isNativePlatform();
  return cap;
};
const initCapacitorGlobal = (win) => win.Capacitor = createCapacitor(win);
const Capacitor = /* @__PURE__ */ initCapacitorGlobal(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {});
const registerPlugin = Capacitor.registerPlugin;
Capacitor.Plugins;
class WebPlugin {
  constructor(config) {
    this.listeners = {};
    this.retainedEventArguments = {};
    this.windowListeners = {};
    if (config) {
      console.warn(`Capacitor WebPlugin "${config.name}" config object was deprecated in v3 and will be removed in v4.`);
      this.config = config;
    }
  }
  addListener(eventName, listenerFunc) {
    let firstListener = false;
    const listeners = this.listeners[eventName];
    if (!listeners) {
      this.listeners[eventName] = [];
      firstListener = true;
    }
    this.listeners[eventName].push(listenerFunc);
    const windowListener = this.windowListeners[eventName];
    if (windowListener && !windowListener.registered) {
      this.addWindowListener(windowListener);
    }
    if (firstListener) {
      this.sendRetainedArgumentsForEvent(eventName);
    }
    const remove = async () => this.removeListener(eventName, listenerFunc);
    const p = Promise.resolve({ remove });
    return p;
  }
  async removeAllListeners() {
    this.listeners = {};
    for (const listener in this.windowListeners) {
      this.removeWindowListener(this.windowListeners[listener]);
    }
    this.windowListeners = {};
  }
  notifyListeners(eventName, data, retainUntilConsumed) {
    const listeners = this.listeners[eventName];
    if (!listeners) {
      if (retainUntilConsumed) {
        let args = this.retainedEventArguments[eventName];
        if (!args) {
          args = [];
        }
        args.push(data);
        this.retainedEventArguments[eventName] = args;
      }
      return;
    }
    listeners.forEach((listener) => listener(data));
  }
  hasListeners(eventName) {
    return !!this.listeners[eventName].length;
  }
  registerWindowListener(windowEventName, pluginEventName) {
    this.windowListeners[pluginEventName] = {
      registered: false,
      windowEventName,
      pluginEventName,
      handler: (event) => {
        this.notifyListeners(pluginEventName, event);
      }
    };
  }
  unimplemented(msg = "not implemented") {
    return new Capacitor.Exception(msg, ExceptionCode.Unimplemented);
  }
  unavailable(msg = "not available") {
    return new Capacitor.Exception(msg, ExceptionCode.Unavailable);
  }
  async removeListener(eventName, listenerFunc) {
    const listeners = this.listeners[eventName];
    if (!listeners) {
      return;
    }
    const index = listeners.indexOf(listenerFunc);
    this.listeners[eventName].splice(index, 1);
    if (!this.listeners[eventName].length) {
      this.removeWindowListener(this.windowListeners[eventName]);
    }
  }
  addWindowListener(handle) {
    window.addEventListener(handle.windowEventName, handle.handler);
    handle.registered = true;
  }
  removeWindowListener(handle) {
    if (!handle) {
      return;
    }
    window.removeEventListener(handle.windowEventName, handle.handler);
    handle.registered = false;
  }
  sendRetainedArgumentsForEvent(eventName) {
    const args = this.retainedEventArguments[eventName];
    if (!args) {
      return;
    }
    delete this.retainedEventArguments[eventName];
    args.forEach((arg) => {
      this.notifyListeners(eventName, arg);
    });
  }
}
const encode = (str) => encodeURIComponent(str).replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent).replace(/[()]/g, escape);
const decode = (str) => str.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
class CapacitorCookiesPluginWeb extends WebPlugin {
  async getCookies() {
    const cookies = document.cookie;
    const cookieMap = {};
    cookies.split(";").forEach((cookie) => {
      if (cookie.length <= 0)
        return;
      let [key, value] = cookie.replace(/=/, "CAP_COOKIE").split("CAP_COOKIE");
      key = decode(key).trim();
      value = decode(value).trim();
      cookieMap[key] = value;
    });
    return cookieMap;
  }
  async setCookie(options) {
    try {
      const encodedKey = encode(options.key);
      const encodedValue = encode(options.value);
      const expires = `; expires=${(options.expires || "").replace("expires=", "")}`;
      const path = (options.path || "/").replace("path=", "");
      const domain = options.url != null && options.url.length > 0 ? `domain=${options.url}` : "";
      document.cookie = `${encodedKey}=${encodedValue || ""}${expires}; path=${path}; ${domain};`;
    } catch (error) {
      return Promise.reject(error);
    }
  }
  async deleteCookie(options) {
    try {
      document.cookie = `${options.key}=; Max-Age=0`;
    } catch (error) {
      return Promise.reject(error);
    }
  }
  async clearCookies() {
    try {
      const cookies = document.cookie.split(";") || [];
      for (const cookie of cookies) {
        document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, `=;expires=${(/* @__PURE__ */ new Date()).toUTCString()};path=/`);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  }
  async clearAllCookies() {
    try {
      await this.clearCookies();
    } catch (error) {
      return Promise.reject(error);
    }
  }
}
registerPlugin("CapacitorCookies", {
  web: () => new CapacitorCookiesPluginWeb()
});
const readBlobAsBase64 = async (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const base64String = reader.result;
    resolve(base64String.indexOf(",") >= 0 ? base64String.split(",")[1] : base64String);
  };
  reader.onerror = (error) => reject(error);
  reader.readAsDataURL(blob);
});
const normalizeHttpHeaders = (headers = {}) => {
  const originalKeys = Object.keys(headers);
  const loweredKeys = Object.keys(headers).map((k) => k.toLocaleLowerCase());
  const normalized = loweredKeys.reduce((acc, key, index) => {
    acc[key] = headers[originalKeys[index]];
    return acc;
  }, {});
  return normalized;
};
const buildUrlParams = (params, shouldEncode = true) => {
  if (!params)
    return null;
  const output = Object.entries(params).reduce((accumulator, entry) => {
    const [key, value] = entry;
    let encodedValue;
    let item;
    if (Array.isArray(value)) {
      item = "";
      value.forEach((str) => {
        encodedValue = shouldEncode ? encodeURIComponent(str) : str;
        item += `${key}=${encodedValue}&`;
      });
      item.slice(0, -1);
    } else {
      encodedValue = shouldEncode ? encodeURIComponent(value) : value;
      item = `${key}=${encodedValue}`;
    }
    return `${accumulator}&${item}`;
  }, "");
  return output.substr(1);
};
const buildRequestInit = (options, extra = {}) => {
  const output = Object.assign({ method: options.method || "GET", headers: options.headers }, extra);
  const headers = normalizeHttpHeaders(options.headers);
  const type = headers["content-type"] || "";
  if (typeof options.data === "string") {
    output.body = options.data;
  } else if (type.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(options.data || {})) {
      params.set(key, value);
    }
    output.body = params.toString();
  } else if (type.includes("multipart/form-data") || options.data instanceof FormData) {
    const form = new FormData();
    if (options.data instanceof FormData) {
      options.data.forEach((value, key) => {
        form.append(key, value);
      });
    } else {
      for (const key of Object.keys(options.data)) {
        form.append(key, options.data[key]);
      }
    }
    output.body = form;
    const headers2 = new Headers(output.headers);
    headers2.delete("content-type");
    output.headers = headers2;
  } else if (type.includes("application/json") || typeof options.data === "object") {
    output.body = JSON.stringify(options.data);
  }
  return output;
};
class CapacitorHttpPluginWeb extends WebPlugin {
  /**
   * Perform an Http request given a set of options
   * @param options Options to build the HTTP request
   */
  async request(options) {
    const requestInit = buildRequestInit(options, options.webFetchExtra);
    const urlParams = buildUrlParams(options.params, options.shouldEncodeUrlParams);
    const url = urlParams ? `${options.url}?${urlParams}` : options.url;
    const response = await fetch(url, requestInit);
    const contentType = response.headers.get("content-type") || "";
    let { responseType = "text" } = response.ok ? options : {};
    if (contentType.includes("application/json")) {
      responseType = "json";
    }
    let data;
    let blob;
    switch (responseType) {
      case "arraybuffer":
      case "blob":
        blob = await response.blob();
        data = await readBlobAsBase64(blob);
        break;
      case "json":
        data = await response.json();
        break;
      case "document":
      case "text":
      default:
        data = await response.text();
    }
    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return {
      data,
      headers,
      status: response.status,
      url: response.url
    };
  }
  /**
   * Perform an Http GET request given a set of options
   * @param options Options to build the HTTP request
   */
  async get(options) {
    return this.request(Object.assign(Object.assign({}, options), { method: "GET" }));
  }
  /**
   * Perform an Http POST request given a set of options
   * @param options Options to build the HTTP request
   */
  async post(options) {
    return this.request(Object.assign(Object.assign({}, options), { method: "POST" }));
  }
  /**
   * Perform an Http PUT request given a set of options
   * @param options Options to build the HTTP request
   */
  async put(options) {
    return this.request(Object.assign(Object.assign({}, options), { method: "PUT" }));
  }
  /**
   * Perform an Http PATCH request given a set of options
   * @param options Options to build the HTTP request
   */
  async patch(options) {
    return this.request(Object.assign(Object.assign({}, options), { method: "PATCH" }));
  }
  /**
   * Perform an Http DELETE request given a set of options
   * @param options Options to build the HTTP request
   */
  async delete(options) {
    return this.request(Object.assign(Object.assign({}, options), { method: "DELETE" }));
  }
}
registerPlugin("CapacitorHttp", {
  web: () => new CapacitorHttpPluginWeb()
});
const _hoisted_1 = { class: "login-page" };
const _hoisted_2 = { class: "login-card glass-strong" };
const _hoisted_3 = { class: "tabs" };
const _hoisted_4 = { class: "field row-field" };
const _hoisted_5 = { class: "field row-field" };
const _hoisted_6 = ["disabled"];
const _hoisted_7 = { class: "field" };
const _hoisted_8 = {
  key: 0,
  class: "no-children"
};
const _hoisted_9 = {
  key: 1,
  class: "child-grid"
};
const _hoisted_10 = ["onClick"];
const _hoisted_11 = { class: "field row-field" };
const _hoisted_12 = ["disabled"];
const _hoisted_13 = { class: "modal-box" };
const _hoisted_14 = { class: "server-row" };
const _hoisted_15 = { class: "field addr" };
const _hoisted_16 = { class: "field port" };
const _hoisted_17 = ["aria-pressed"];
const _hoisted_18 = { class: "modal-actions" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Login",
  setup(__props) {
    const auth = useAuthStore();
    const toast = useToastStore();
    const router = useRouter();
    const tab = ref("parent");
    const isApp = Capacitor.isNativePlatform();
    const serverHost = ref("");
    const serverPort = ref("");
    const serverHttps = ref(false);
    const username = ref("");
    const password = ref("");
    const loadingParent = ref(false);
    const children = ref([]);
    const selectedChildId = ref(null);
    const pin = ref("");
    const loadingChild = ref(false);
    function persistServer() {
      saveServerConfig({
        useHttps: serverHttps.value,
        host: serverHost.value.trim(),
        port: serverPort.value.trim()
      });
    }
    async function loadChildren() {
      try {
        const data = await auth.fetchChildren();
        children.value = data.children;
        if (children.value.length > 0) selectedChildId.value = children.value[0].id;
      } catch {
        children.value = [];
      }
    }
    onMounted(() => {
      if (!isApp) {
        loadChildren();
        return;
      }
      const cfg = loadServerConfig();
      serverHost.value = cfg.host;
      serverPort.value = cfg.port;
      serverHttps.value = cfg.useHttps;
      if (serverHost.value.trim()) loadChildren();
    });
    watch(tab, () => {
      if (tab.value === "child") {
        if (!isApp || serverHost.value.trim()) loadChildren();
      }
    });
    const showServerModal = ref(false);
    function saveServer() {
      persistServer();
      showServerModal.value = false;
      if (serverHost.value.trim()) loadChildren();
    }
    async function loginParent() {
      var _a, _b;
      if (!username.value || !password.value) {
        toast.warning("请输入账号和密码");
        return;
      }
      if (isApp) persistServer();
      loadingParent.value = true;
      try {
        await auth.parentLogin(username.value.trim(), password.value);
        toast.success(`欢迎回来，${(_a = auth.user) == null ? void 0 : _a.name}！`);
        router.replace({ name: "parent-dashboard" });
      } catch (e) {
        if (((_b = e.payload) == null ? void 0 : _b.error) === "too_many_attempts") {
          toast.error(`尝试次数过多，请 ${Math.ceil((e.payload.retryAfter || 900) / 60)} 分钟后再试`);
        } else {
          toast.error(e.message || "登录失败");
        }
      } finally {
        loadingParent.value = false;
      }
    }
    async function loginChild() {
      var _a, _b;
      if (!selectedChildId.value) {
        toast.warning("请选择身份");
        return;
      }
      if (!pin.value) {
        toast.warning("请输入PIN码");
        return;
      }
      if (isApp) persistServer();
      loadingChild.value = true;
      try {
        await auth.childLogin(selectedChildId.value, pin.value);
        toast.success(`欢迎，${(_a = auth.user) == null ? void 0 : _a.name}！`);
        router.replace({ name: "child-home" });
      } catch (e) {
        if (((_b = e.payload) == null ? void 0 : _b.error) === "too_many_attempts") {
          toast.error(`错误次数过多已锁定，请 ${Math.ceil((e.payload.retryAfter || 900) / 60)} 分钟后再试`);
        } else {
          toast.error(e.message || "PIN码不正确");
        }
      } finally {
        loadingChild.value = false;
      }
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        _cache[19] || (_cache[19] = createBaseVNode("div", { class: "bg-blob blob-1" }, null, -1)),
        _cache[20] || (_cache[20] = createBaseVNode("div", { class: "bg-blob blob-2" }, null, -1)),
        createBaseVNode("div", _hoisted_2, [
          _cache[18] || (_cache[18] = createBaseVNode("div", { class: "brand" }, [
            createBaseVNode("img", {
              class: "logo",
              src: _imports_0,
              alt: "拾贝小镇"
            }),
            createBaseVNode("h1", { class: "title" }, "拾贝小镇"),
            createBaseVNode("p", { class: "subtitle" }, "Shell Town · 家庭积分与宠物养成")
          ], -1)),
          unref(isApp) ? (openBlock(), createElementBlock("button", {
            key: 0,
            type: "button",
            class: "server-settings-btn",
            onClick: _cache[0] || (_cache[0] = ($event) => showServerModal.value = true)
          }, "⚙️ 服务器设置")) : createCommentVNode("", true),
          createBaseVNode("div", _hoisted_3, [
            createBaseVNode("button", {
              class: normalizeClass({ active: tab.value === "parent" }),
              onClick: _cache[1] || (_cache[1] = ($event) => tab.value = "parent")
            }, "家长", 2),
            createBaseVNode("button", {
              class: normalizeClass({ active: tab.value === "child" }),
              onClick: _cache[2] || (_cache[2] = ($event) => tab.value = "child")
            }, "小朋友", 2)
          ]),
          tab.value === "parent" ? (openBlock(), createElementBlock("form", {
            key: 1,
            class: "form",
            onSubmit: withModifiers(loginParent, ["prevent"])
          }, [
            createBaseVNode("label", _hoisted_4, [
              _cache[11] || (_cache[11] = createBaseVNode("span", { class: "label" }, "账号", -1)),
              withDirectives(createBaseVNode("input", {
                "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => username.value = $event),
                type: "text",
                placeholder: "家长账号",
                autocomplete: "username"
              }, null, 512), [
                [vModelText, username.value]
              ])
            ]),
            createBaseVNode("label", _hoisted_5, [
              _cache[12] || (_cache[12] = createBaseVNode("span", { class: "label" }, "密码", -1)),
              withDirectives(createBaseVNode("input", {
                "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => password.value = $event),
                type: "password",
                placeholder: "请输入密码",
                autocomplete: "current-password"
              }, null, 512), [
                [vModelText, password.value]
              ])
            ]),
            createBaseVNode("button", {
              class: "btn btn-primary submit",
              disabled: loadingParent.value,
              type: "submit"
            }, toDisplayString(loadingParent.value ? "登录中..." : "登录"), 9, _hoisted_6)
          ], 32)) : (openBlock(), createElementBlock("form", {
            key: 2,
            class: "form",
            onSubmit: withModifiers(loginChild, ["prevent"])
          }, [
            createBaseVNode("div", _hoisted_7, [
              _cache[13] || (_cache[13] = createBaseVNode("span", { class: "label" }, "选择身份", -1)),
              children.value.length === 0 ? (openBlock(), createElementBlock("div", _hoisted_8, " 家长还没有创建小朋友账号哦~ ")) : (openBlock(), createElementBlock("div", _hoisted_9, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(children.value, (c) => {
                  return openBlock(), createElementBlock("button", {
                    key: c.id,
                    type: "button",
                    class: normalizeClass(["child-chip", { active: selectedChildId.value === c.id }]),
                    onClick: ($event) => selectedChildId.value = c.id
                  }, [
                    createVNode(ZodiacAvatar, {
                      zodiac: c.avatar,
                      size: 60
                    }, null, 8, ["zodiac"]),
                    createBaseVNode("span", null, toDisplayString(c.name), 1)
                  ], 10, _hoisted_10);
                }), 128))
              ]))
            ]),
            createBaseVNode("label", _hoisted_11, [
              _cache[14] || (_cache[14] = createBaseVNode("span", { class: "label" }, "PIN码", -1)),
              withDirectives(createBaseVNode("input", {
                "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => pin.value = $event),
                type: "password",
                inputmode: "numeric",
                maxlength: "6",
                placeholder: "请输入4-6位数字PIN",
                autocomplete: "off"
              }, null, 512), [
                [vModelText, pin.value]
              ])
            ]),
            createBaseVNode("button", {
              class: "btn btn-primary submit",
              disabled: loadingChild.value,
              type: "submit"
            }, toDisplayString(loadingChild.value ? "登录中..." : "冲鸭！"), 9, _hoisted_12)
          ], 32)),
          showServerModal.value ? (openBlock(), createElementBlock("div", {
            key: 3,
            class: "modal-mask",
            onClick: _cache[10] || (_cache[10] = withModifiers(($event) => showServerModal.value = false, ["self"]))
          }, [
            createBaseVNode("div", _hoisted_13, [
              _cache[17] || (_cache[17] = createBaseVNode("div", { class: "modal-title" }, "服务器设置", -1)),
              createBaseVNode("div", _hoisted_14, [
                createBaseVNode("label", _hoisted_15, [
                  _cache[15] || (_cache[15] = createBaseVNode("span", { class: "label" }, "地址", -1)),
                  withDirectives(createBaseVNode("input", {
                    "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => serverHost.value = $event),
                    type: "text",
                    placeholder: "192.168.31.26",
                    autocapitalize: "off",
                    spellcheck: "false"
                  }, null, 512), [
                    [vModelText, serverHost.value]
                  ])
                ]),
                createBaseVNode("label", _hoisted_16, [
                  _cache[16] || (_cache[16] = createBaseVNode("span", { class: "label" }, "端口", -1)),
                  withDirectives(createBaseVNode("input", {
                    "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => serverPort.value = $event),
                    type: "tel",
                    inputmode: "numeric",
                    placeholder: "3000"
                  }, null, 512), [
                    [vModelText, serverPort.value]
                  ])
                ])
              ]),
              createBaseVNode("button", {
                type: "button",
                class: "scheme-toggle",
                "aria-pressed": serverHttps.value,
                onClick: _cache[8] || (_cache[8] = ($event) => serverHttps.value = !serverHttps.value)
              }, [
                createBaseVNode("span", {
                  class: normalizeClass({ active: !serverHttps.value })
                }, "HTTP", 2),
                createBaseVNode("span", {
                  class: normalizeClass({ active: serverHttps.value })
                }, "HTTPS", 2)
              ], 8, _hoisted_17),
              createBaseVNode("div", _hoisted_18, [
                createBaseVNode("button", {
                  type: "button",
                  class: "btn btn-ghost",
                  onClick: _cache[9] || (_cache[9] = ($event) => showServerModal.value = false)
                }, "取消"),
                createBaseVNode("button", {
                  type: "button",
                  class: "btn btn-primary",
                  onClick: saveServer
                }, "保存")
              ])
            ])
          ])) : createCommentVNode("", true)
        ])
      ]);
    };
  }
});
const Login = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-f80611cc"]]);
export {
  Login as default
};
