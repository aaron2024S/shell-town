import { d as defineComponent, $ as usePetCatalogStore, o as onMounted, a7 as onPetAssetsChanged, B as onUnmounted, w as watch, k as openBlock, c as createElementBlock, G as normalizeStyle, n as normalizeClass, t as toDisplayString, i as ref, y as computed, J as resolvePetImage, a3 as getPetSpecies, a6 as MOOD_META, _ as _export_sfc } from "./index-DLtaHw3I.js";
const _hoisted_1 = ["src"];
const _hoisted_2 = {
  key: 1,
  class: "pet-fallback"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "PetAvatar",
  props: {
    species: {},
    level: {},
    mood: { default: "ok" },
    size: { default: 96 },
    ring: { type: Boolean, default: false }
  },
  setup(__props) {
    const catalog = usePetCatalogStore();
    const props = __props;
    const imgUrl = ref(null);
    const assetsRev = ref(0);
    let stopAssetsWatch = null;
    onMounted(() => {
      stopAssetsWatch = onPetAssetsChanged(() => {
        assetsRev.value++;
      });
    });
    onUnmounted(() => {
      stopAssetsWatch == null ? void 0 : stopAssetsWatch();
      stopAssetsWatch = null;
    });
    watch(
      () => [props.species, props.level, assetsRev.value],
      async ([sp, lv]) => {
        imgUrl.value = null;
        const url = await resolvePetImage(sp, lv);
        if (props.species === sp && props.level === lv) imgUrl.value = url;
      },
      { immediate: true }
    );
    const boxStyle = computed(() => ({
      width: `${props.size}px`,
      height: `${props.size}px`
    }));
    const emojiFallback = computed(
      () => {
        var _a;
        return ((_a = catalog.byKey(props.species)) == null ? void 0 : _a.emoji) ?? getPetSpecies(props.species).emoji;
      }
    );
    const moodColor = computed(() => {
      var _a;
      return ((_a = MOOD_META[props.mood]) == null ? void 0 : _a.color) ?? MOOD_META.ok.color;
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["pet-avatar", { ring: __props.ring }]),
        style: normalizeStyle(__props.ring ? { ...boxStyle.value, "--pet-ring": moodColor.value } : boxStyle.value)
      }, [
        imgUrl.value ? (openBlock(), createElementBlock("img", {
          key: 0,
          class: "pet-img",
          src: imgUrl.value,
          alt: "宠物形象",
          onError: _cache[0] || (_cache[0] = ($event) => imgUrl.value = null)
        }, null, 40, _hoisted_1)) : (openBlock(), createElementBlock("span", _hoisted_2, toDisplayString(emojiFallback.value), 1))
      ], 6);
    };
  }
});
const PetAvatar = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-edb9b0f7"]]);
export {
  PetAvatar as P
};
