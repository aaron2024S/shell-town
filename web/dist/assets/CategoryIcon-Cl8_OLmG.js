import { d as defineComponent, k as openBlock, c as createElementBlock, G as normalizeStyle, b as createBaseVNode, a8 as createStaticVNode, y as computed, _ as _export_sfc } from "./index-DLtaHw3I.js";
const PRODUCT_CATEGORIES = [
  { key: "snack", label: "零食", color: "#ff9bb0" },
  { key: "toy", label: "玩具", color: "#84c5ff" },
  { key: "activity", label: "活动", color: "#ffb454" },
  { key: "game", label: "游戏", color: "#7ed4b9" },
  { key: "study", label: "学习", color: "#b39ddb" },
  { key: "privilege", label: "特权", color: "#ffd166" },
  { key: "food", label: "美食", color: "#ffab91" },
  { key: "gift", label: "其他", color: "#e8b4c8" }
];
function getCategory(key) {
  return ALL_CATEGORIES.find((c) => c.key === key) ?? PRODUCT_CATEGORIES[PRODUCT_CATEGORIES.length - 1];
}
const PET_ITEM_CATEGORIES = [
  { key: "petfood", label: "口粮", color: "#ffb454" },
  { key: "pettoy", label: "玩具", color: "#84c5ff" },
  { key: "petcare", label: "护理", color: "#7ed4b9" },
  { key: "petexp", label: "经验", color: "#ffd166" }
];
const ALL_CATEGORIES = [
  ...PRODUCT_CATEGORIES,
  ...PET_ITEM_CATEGORIES
];
const PET_ICON_KEYS = PET_ITEM_CATEGORIES.map((c) => c.key);
const _hoisted_1 = ["title"];
const _hoisted_2 = ["width", "height"];
const _hoisted_3 = { key: 0 };
const _hoisted_4 = { key: 1 };
const _hoisted_5 = { key: 2 };
const _hoisted_6 = { key: 3 };
const _hoisted_7 = { key: 4 };
const _hoisted_8 = { key: 5 };
const _hoisted_9 = { key: 6 };
const _hoisted_10 = { key: 7 };
const _hoisted_11 = { key: 8 };
const _hoisted_12 = { key: 9 };
const _hoisted_13 = { key: 10 };
const _hoisted_14 = { key: 11 };
const LINE = "#5a4a42";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "CategoryIcon",
  props: {
    icon: {},
    size: { default: 44 }
  },
  setup(__props) {
    const props = __props;
    const cat = computed(() => getCategory(props.icon));
    const style = computed(() => {
      const s = props.size;
      return {
        width: `${s}px`,
        height: `${s}px`,
        background: `radial-gradient(circle at 32% 26%, #ffffff 0%, ${cat.value.color}33 55%, ${cat.value.color}66 100%)`,
        boxShadow: `0 4px 12px ${cat.value.color}44, inset 0 1px 2px rgba(255,255,255,0.6)`
      };
    });
    const svgSize = computed(() => Math.round(props.size * 0.82));
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: "cat-icon",
        style: normalizeStyle(style.value),
        title: cat.value.label
      }, [
        (openBlock(), createElementBlock("svg", {
          width: svgSize.value,
          height: svgSize.value,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "#5a4a42",
          "stroke-width": "1.5",
          "stroke-linecap": "round",
          "stroke-linejoin": "round"
        }, [
          cat.value.key === "snack" ? (openBlock(), createElementBlock("g", _hoisted_3, [
            _cache[0] || (_cache[0] = createBaseVNode("rect", {
              x: "8",
              y: "3.5",
              width: "8",
              height: "11.5",
              rx: "3.5",
              fill: "#ff9bb0"
            }, null, -1)),
            _cache[1] || (_cache[1] = createBaseVNode("path", {
              d: "M12 15v4.2",
              stroke: "#b07b52",
              "stroke-width": "1.8"
            }, null, -1)),
            createBaseVNode("circle", {
              cx: "10.6",
              cy: "8.4",
              r: "0.65",
              fill: LINE,
              stroke: "none"
            }),
            createBaseVNode("circle", {
              cx: "13.4",
              cy: "8.4",
              r: "0.65",
              fill: LINE,
              stroke: "none"
            }),
            _cache[2] || (_cache[2] = createBaseVNode("path", {
              d: "M11 10.3c0.6 0.5 1.4 0.5 2 0",
              "stroke-width": "1.1"
            }, null, -1)),
            _cache[3] || (_cache[3] = createBaseVNode("path", {
              d: "M9.3 6.2c0.8-0.7 1.6-0.9 2.4-0.9",
              stroke: "#ffd9e2",
              "stroke-width": "1.1"
            }, null, -1))
          ])) : cat.value.key === "toy" ? (openBlock(), createElementBlock("g", _hoisted_4, [..._cache[4] || (_cache[4] = [
            createStaticVNode('<rect x="5" y="7.5" width="2.2" height="3.5" rx="0.6" fill="#ff9bb0" data-v-6cb2b967></rect><rect x="3" y="11" width="9.5" height="6" rx="1.5" fill="#84c5ff" data-v-6cb2b967></rect><rect x="12.5" y="6.5" width="7" height="10.5" rx="1.5" fill="#aed8f8" data-v-6cb2b967></rect><rect x="14.4" y="8.8" width="3.2" height="3" rx="0.8" fill="#ffffff" stroke="none" data-v-6cb2b967></rect><circle cx="6.5" cy="18.6" r="1.7" fill="#ffffff" data-v-6cb2b967></circle><circle cx="11.5" cy="18.6" r="1.7" fill="#ffffff" data-v-6cb2b967></circle><circle cx="16.5" cy="18.6" r="1.7" fill="#ffffff" data-v-6cb2b967></circle><path d="M5 14.2h5" stroke-width="1.1" data-v-6cb2b967></path>', 8)
          ])])) : cat.value.key === "activity" ? (openBlock(), createElementBlock("g", _hoisted_5, [..._cache[5] || (_cache[5] = [
            createBaseVNode("path", {
              d: "M12 4.5 21 19H3Z",
              fill: "#ffb454"
            }, null, -1),
            createBaseVNode("path", {
              d: "M12 10.5 16.6 19H7.4Z",
              fill: "#e08f3c",
              stroke: "none"
            }, null, -1),
            createBaseVNode("path", {
              d: "M12 10.5V19",
              "stroke-width": "1.3"
            }, null, -1),
            createBaseVNode("path", {
              d: "M4.5 19h15",
              "stroke-width": "1.2"
            }, null, -1)
          ])])) : cat.value.key === "game" ? (openBlock(), createElementBlock("g", _hoisted_6, [
            _cache[6] || (_cache[6] = createBaseVNode("path", {
              d: "M8 8h8c2.8 0 5.5 2 5.5 5.2 0 2.4-1.3 4.8-3.2 4.8-1.3 0-2-1-2.8-2.2H8.5C7.7 17 7 18 5.7 18 3.8 18 2.5 15.6 2.5 13.2 2.5 10 5.2 8 8 8Z",
              fill: "#7ed4b9"
            }, null, -1)),
            _cache[7] || (_cache[7] = createBaseVNode("path", {
              d: "M8 11v4M6 13h4",
              "stroke-width": "1.4"
            }, null, -1)),
            createBaseVNode("circle", {
              cx: "15",
              cy: "11.8",
              r: "0.9",
              fill: LINE,
              stroke: "none"
            }),
            createBaseVNode("circle", {
              cx: "17.2",
              cy: "14",
              r: "0.9",
              fill: LINE,
              stroke: "none"
            })
          ])) : cat.value.key === "study" ? (openBlock(), createElementBlock("g", _hoisted_7, [..._cache[8] || (_cache[8] = [
            createBaseVNode("rect", {
              x: "4.5",
              y: "13.6",
              width: "13",
              height: "3.4",
              rx: "1.2",
              fill: "#b39ddb"
            }, null, -1),
            createBaseVNode("rect", {
              x: "6.5",
              y: "10.1",
              width: "13",
              height: "3.4",
              rx: "1.2",
              fill: "#84c5ff"
            }, null, -1),
            createBaseVNode("rect", {
              x: "4.5",
              y: "6.6",
              width: "13",
              height: "3.4",
              rx: "1.2",
              fill: "#ffd166"
            }, null, -1),
            createBaseVNode("path", {
              d: "M6.8 8.3h2.4M8.8 15.3h2.4",
              "stroke-width": "1.1"
            }, null, -1)
          ])])) : cat.value.key === "privilege" ? (openBlock(), createElementBlock("g", _hoisted_8, [
            _cache[9] || (_cache[9] = createBaseVNode("path", {
              d: "M4.5 17.5V9l4 3 3.5-5 3.5 5 4-3v8.5Z",
              fill: "#ffd166"
            }, null, -1)),
            createBaseVNode("circle", {
              cx: "12",
              cy: "7",
              r: "0.8",
              fill: LINE,
              stroke: "none"
            }),
            createBaseVNode("circle", {
              cx: "4.5",
              cy: "9",
              r: "0.8",
              fill: LINE,
              stroke: "none"
            }),
            createBaseVNode("circle", {
              cx: "19.5",
              cy: "9",
              r: "0.8",
              fill: LINE,
              stroke: "none"
            }),
            _cache[10] || (_cache[10] = createBaseVNode("circle", {
              cx: "12",
              cy: "14.8",
              r: "1",
              fill: "#ff9bb0",
              "stroke-width": "1"
            }, null, -1))
          ])) : cat.value.key === "food" ? (openBlock(), createElementBlock("g", _hoisted_9, [..._cache[11] || (_cache[11] = [
            createStaticVNode('<path d="M4.5 10c0-3.2 3.4-5.3 7.5-5.3S19.5 6.8 19.5 10Z" fill="#ffcf8e" data-v-6cb2b967></path><path d="M8.5 7.2h0.01M12 6.4h0.01M15.5 7.2h0.01" stroke-width="1.5" data-v-6cb2b967></path><path d="M4.5 12.6c1.2 1 2.4 1 3.7 0 1.2 1 2.4 1 3.7 0 1.2 1 2.4 1 3.7 0 1.2 1 2.4 1 3.7 0" stroke="#7ed4b9" stroke-width="1.5" data-v-6cb2b967></path><rect x="4.5" y="15" width="15" height="2.3" rx="1.15" fill="#b07b52" data-v-6cb2b967></rect><path d="M4.5 19.8h15c0-1.3-1-2.1-2.4-2.1H6.9c-1.4 0-2.4 0.8-2.4 2.1Z" fill="#ffcf8e" data-v-6cb2b967></path>', 5)
          ])])) : cat.value.key === "petfood" ? (openBlock(), createElementBlock("g", _hoisted_10, [
            _cache[12] || (_cache[12] = createBaseVNode("path", {
              d: "M6.6 12.4c0-1.8 2.4-3.2 5.4-3.2s5.4 1.4 5.4 3.2Z",
              fill: "#ffd9a0"
            }, null, -1)),
            _cache[13] || (_cache[13] = createBaseVNode("path", {
              d: "M3.8 12.4h16.4c0 4.2-3.4 7-8.2 7s-8.2-2.8-8.2-7Z",
              fill: "#ffb454"
            }, null, -1)),
            _cache[14] || (_cache[14] = createBaseVNode("path", {
              d: "M6.6 15.4h10.8",
              "stroke-width": "1.2"
            }, null, -1)),
            createBaseVNode("circle", {
              cx: "10",
              cy: "11",
              r: "0.6",
              fill: LINE,
              stroke: "none"
            }),
            createBaseVNode("circle", {
              cx: "13.4",
              cy: "10.4",
              r: "0.6",
              fill: LINE,
              stroke: "none"
            })
          ])) : cat.value.key === "pettoy" ? (openBlock(), createElementBlock("g", _hoisted_11, [..._cache[15] || (_cache[15] = [
            createBaseVNode("circle", {
              cx: "12",
              cy: "12.6",
              r: "8",
              fill: "#84c5ff"
            }, null, -1),
            createBaseVNode("path", {
              d: "M4.2 10.6c4.9 1.7 10.7 1.7 15.6 0",
              stroke: "#3f8fce",
              "stroke-width": "1.4"
            }, null, -1),
            createBaseVNode("path", {
              d: "M7.4 19.4c1.8-3.6 5.3-5.9 9.4-6.6",
              stroke: "#3f8fce",
              "stroke-width": "1.2"
            }, null, -1),
            createBaseVNode("circle", {
              cx: "9.4",
              cy: "8.6",
              r: "1.5",
              fill: "#ffffff",
              stroke: "none",
              opacity: "0.85"
            }, null, -1)
          ])])) : cat.value.key === "petcare" ? (openBlock(), createElementBlock("g", _hoisted_12, [..._cache[16] || (_cache[16] = [
            createStaticVNode('<g transform="rotate(-28 12 12.6)" data-v-6cb2b967><rect x="4.2" y="9.6" width="15.6" height="6.2" rx="3.1" fill="#7ed4b9" data-v-6cb2b967></rect><path d="M12 9.6h4.7a3.1 3.1 0 0 1 0 6.2H12Z" fill="#ffffff" data-v-6cb2b967></path><path d="M12 9.6v6.2" stroke-width="1.2" data-v-6cb2b967></path></g><path d="M18.4 6.4v2.2M17.3 7.5h2.2" stroke-width="1.1" data-v-6cb2b967></path>', 2)
          ])])) : cat.value.key === "petexp" ? (openBlock(), createElementBlock("g", _hoisted_13, [
            _cache[17] || (_cache[17] = createBaseVNode("path", {
              d: "M12 3.6 14.3 9.9 20.8 10.2 15.7 14.3 17.4 20.5 12 16.9 6.6 20.5 8.3 14.3 3.2 10.2 9.7 9.9Z",
              fill: "#ffd166"
            }, null, -1)),
            createBaseVNode("circle", {
              cx: "10.4",
              cy: "12.6",
              r: "0.65",
              fill: LINE,
              stroke: "none"
            }),
            createBaseVNode("circle", {
              cx: "13.6",
              cy: "12.6",
              r: "0.65",
              fill: LINE,
              stroke: "none"
            }),
            _cache[18] || (_cache[18] = createBaseVNode("path", {
              d: "M10.9 14.4c0.7 0.5 1.5 0.5 2.2 0",
              "stroke-width": "1.1"
            }, null, -1))
          ])) : (openBlock(), createElementBlock("g", _hoisted_14, [..._cache[19] || (_cache[19] = [
            createStaticVNode('<rect x="4.5" y="10" width="15" height="9.5" rx="1.5" fill="#e8b4c8" data-v-6cb2b967></rect><rect x="3.5" y="7.4" width="17" height="3" rx="1.2" fill="#f6cadd" data-v-6cb2b967></rect><circle cx="10.2" cy="6" r="1.6" fill="#ffd166" data-v-6cb2b967></circle><circle cx="13.8" cy="6" r="1.6" fill="#ffd166" data-v-6cb2b967></circle><path d="M10.7 13.6c0-2 3-2 3 0 0 1.4-1.5 1.3-1.5 2.6" stroke="#ffffff" stroke-width="1.4" data-v-6cb2b967></path><circle cx="12.2" cy="17.8" r="0.8" fill="#ffffff" stroke="none" data-v-6cb2b967></circle>', 6)
          ])]))
        ], 8, _hoisted_2))
      ], 12, _hoisted_1);
    };
  }
});
const CategoryIcon = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-6cb2b967"]]);
export {
  CategoryIcon as C,
  PET_ITEM_CATEGORIES as P,
  PET_ICON_KEYS as a,
  PRODUCT_CATEGORIES as b
};
