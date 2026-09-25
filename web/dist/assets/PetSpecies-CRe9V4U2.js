import { d as defineComponent, a as useToastStore, o as onMounted, c as createElementBlock, b as createBaseVNode, F as Fragment, r as renderList, m as createVNode, p as withCtx, T as Transition, i as ref, z as api, J as resolvePetImage, K as reactive, k as openBlock, t as toDisplayString, n as normalizeClass, f as createCommentVNode, g as withModifiers, h as withDirectives, v as vModelText, L as vModelSelect, x as createTextVNode, M as DEFAULT_STAGE_EXP, N as clearPetAssetCache, _ as _export_sfc } from "./index-DLtaHw3I.js";
const _hoisted_1 = { class: "species-page" };
const _hoisted_2 = {
  key: 0,
  class: "empty-hint"
};
const _hoisted_3 = {
  key: 1,
  class: "grid"
};
const _hoisted_4 = { class: "stage-row" };
const _hoisted_5 = ["title", "onClick"];
const _hoisted_6 = ["src"];
const _hoisted_7 = {
  key: 1,
  class: "fallback"
};
const _hoisted_8 = { class: "stage-tag" };
const _hoisted_9 = { class: "card-body" };
const _hoisted_10 = { class: "name-line" };
const _hoisted_11 = { class: "pet-name" };
const _hoisted_12 = {
  key: 0,
  class: "badge custom"
};
const _hoisted_13 = { class: "meta-line" };
const _hoisted_14 = { class: "mono" };
const _hoisted_15 = { class: "actions" };
const _hoisted_16 = ["onClick"];
const _hoisted_17 = ["onClick"];
const _hoisted_18 = { class: "sheet glass-strong" };
const _hoisted_19 = { class: "sheet-head" };
const _hoisted_20 = { class: "sheet-body" };
const _hoisted_21 = { class: "field" };
const _hoisted_22 = { class: "field-row" };
const _hoisted_23 = { class: "field" };
const _hoisted_24 = { class: "field" };
const _hoisted_25 = { class: "field" };
const _hoisted_26 = { class: "field" };
const _hoisted_27 = { class: "exp-row" };
const _hoisted_28 = ["onUpdate:modelValue"];
const _hoisted_29 = {
  key: 0,
  class: "err"
};
const _hoisted_30 = { class: "sheet-foot" };
const _hoisted_31 = ["disabled"];
const _hoisted_32 = { class: "sheet glass-strong" };
const _hoisted_33 = { class: "sheet-head" };
const _hoisted_34 = { class: "sheet-body" };
const _hoisted_35 = { class: "field" };
const _hoisted_36 = {
  key: 0,
  class: "err"
};
const _hoisted_37 = { class: "field" };
const _hoisted_38 = { class: "field-row" };
const _hoisted_39 = { class: "field" };
const _hoisted_40 = { class: "field" };
const _hoisted_41 = { class: "field" };
const _hoisted_42 = { class: "sheet-foot" };
const _hoisted_43 = ["disabled"];
const _hoisted_44 = { class: "sheet glass-strong small" };
const _hoisted_45 = { class: "sheet-head" };
const _hoisted_46 = { class: "sheet-body" };
const _hoisted_47 = { class: "warn-text" };
const _hoisted_48 = { class: "sheet-foot" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "PetSpecies",
  setup(__props) {
    const toast = useToastStore();
    const list = ref([]);
    const loading = ref(true);
    const previews = reactive({});
    async function refreshPreview(key) {
      const out = {};
      for (let stage = 0; stage <= 4; stage++) {
        out[stage] = await resolvePetImage(key, stage);
      }
      previews[key] = out;
    }
    async function load() {
      loading.value = true;
      try {
        const res = await api.get("/admin/pets/species");
        list.value = res.species;
        list.value.forEach((s) => refreshPreview(s.key));
      } catch (e) {
        toast.error((e == null ? void 0 : e.message) || "物种清单加载失败");
      } finally {
        loading.value = false;
      }
    }
    const editOpen = ref(false);
    const editSaving = ref(false);
    const editing = ref(null);
    const form = reactive({
      name: "",
      emoji: "",
      series: "boy",
      gender: "♂",
      stageExp: [...DEFAULT_STAGE_EXP]
    });
    const stageExpErr = ref("");
    function openEdit(s) {
      editing.value = s;
      form.name = s.name;
      form.emoji = s.emoji;
      form.series = s.series;
      form.gender = s.gender;
      form.stageExp = [...s.stageExp];
      stageExpErr.value = "";
      editOpen.value = true;
    }
    function validateStageExp() {
      const a = form.stageExp;
      if (a.some((n) => !Number.isInteger(n) || n < 0)) {
        stageExpErr.value = "阈值需为非负整数";
        return false;
      }
      if (a[0] !== 0 || a[1] <= a[0] || a[2] <= a[1] || a[3] <= a[2] || a[4] <= a[3]) {
        stageExpErr.value = "需从 0 开始且逐级严格递增";
        return false;
      }
      stageExpErr.value = "";
      return true;
    }
    async function saveEdit() {
      var _a;
      if (!editing.value || editSaving.value) return;
      if (!form.name.trim()) {
        toast.error("名字不能为空");
        return;
      }
      if (!validateStageExp()) return;
      editSaving.value = true;
      try {
        const res = await api.patch(`/admin/pets/species/${editing.value.key}`, {
          name: form.name.trim(),
          emoji: form.emoji.trim() || editing.value.emoji,
          series: form.series,
          gender: form.gender,
          stageExp: [...form.stageExp]
        });
        const idx = list.value.findIndex((s) => s.key === editing.value.key);
        if (idx >= 0) list.value[idx] = res.species;
        toast.success("已保存，卡片已立即更新");
        editOpen.value = false;
      } catch (e) {
        toast.error(((_a = e == null ? void 0 : e.payload) == null ? void 0 : _a.detail) || (e == null ? void 0 : e.message) || "保存失败");
      } finally {
        editSaving.value = false;
      }
    }
    const createOpen = ref(false);
    const createSaving = ref(false);
    const createForm = reactive({
      key: "",
      name: "",
      emoji: "🐣",
      series: "boy",
      gender: "♂"
    });
    const keyErr = ref("");
    function openCreate() {
      createForm.key = "";
      createForm.name = "";
      createForm.emoji = "🐣";
      createForm.series = "boy";
      createForm.gender = "♂";
      keyErr.value = "";
      createOpen.value = true;
    }
    async function saveCreate() {
      var _a, _b;
      if (createSaving.value) return;
      const key = createForm.key.trim();
      if (!/^[a-z][a-z0-9_]{1,15}$/.test(key)) {
        keyErr.value = "图片目录名需为 2~16 位小写字母/数字/下划线，字母开头";
        return;
      }
      if (!createForm.name.trim()) {
        toast.error("名字不能为空");
        return;
      }
      keyErr.value = "";
      createSaving.value = true;
      try {
        const res = await api.post("/admin/pets/species", {
          key,
          name: createForm.name.trim(),
          emoji: createForm.emoji.trim() || "🐣",
          series: createForm.series,
          gender: createForm.gender
        });
        list.value.push(res.species);
        refreshPreview(key);
        toast.success("创建成功！接下来给它上传各阶段图片吧");
        createOpen.value = false;
      } catch (e) {
        const err = (_a = e == null ? void 0 : e.payload) == null ? void 0 : _a.error;
        if (err === "key_exists") keyErr.value = "这个图片目录名已被占用";
        else toast.error(((_b = e == null ? void 0 : e.payload) == null ? void 0 : _b.detail) || (e == null ? void 0 : e.message) || "创建失败");
      } finally {
        createSaving.value = false;
      }
    }
    const uploadingStage = ref("");
    function pickImage(key, stage) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/png,image/webp,image/jpeg";
      input.onchange = async () => {
        var _a, _b;
        const file = (_a = input.files) == null ? void 0 : _a[0];
        if (!file) return;
        uploadingStage.value = `${key}:${stage}`;
        try {
          const res = await api.upload(
            `/admin/pets/species/${key}/images/${stage}`,
            file
          );
          const s = list.value.find((x) => x.key === key);
          if (s) s.images = { ...s.images, ...res.images };
          clearPetAssetCache();
          await refreshPreview(key);
          toast.success(`第 ${stage || "蛋"} 阶段图片已上传，预览已更新`);
        } catch (e) {
          const err = (_b = e == null ? void 0 : e.payload) == null ? void 0 : _b.error;
          if (err === "unsupported_type") toast.error("仅支持 PNG / WebP / JPEG");
          else if (err === "file_too_large") toast.error("图片不能超过 10MB");
          else toast.error((e == null ? void 0 : e.message) || "上传失败");
        } finally {
          uploadingStage.value = "";
        }
      };
      input.click();
    }
    const deleting = ref(null);
    async function confirmDelete() {
      var _a;
      const s = deleting.value;
      if (!s) return;
      try {
        await api.delete(`/admin/pets/species/${s.key}`);
        list.value = list.value.filter((x) => x.key !== s.key);
        toast.success(`已删除 ${s.name}`);
      } catch (e) {
        const err = (_a = e == null ? void 0 : e.payload) == null ? void 0 : _a.error;
        if (err === "species_in_use") toast.error("有小孩正在养这只宠物，先把他的宠物重置后再删");
        else if (err === "builtin_protected") toast.error("内置物种不能删除，只能改名/换图");
        else toast.error((e == null ? void 0 : e.message) || "删除失败");
      } finally {
        deleting.value = null;
      }
    }
    const STAGE_LABELS = ["蛋", "Lv1", "Lv2", "Lv3", "Lv4"];
    onMounted(load);
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("header", { class: "page-head" }, [
          _cache[18] || (_cache[18] = createBaseVNode("div", null, [
            createBaseVNode("h1", { class: "title" }, "🐾 宠物管理"),
            createBaseVNode("p", { class: "sub" }, "新建宠物、改名字、传立绘、调成长阈值 —— 保存后立即生效")
          ], -1)),
          createBaseVNode("button", {
            class: "btn btn-primary create-btn",
            onClick: openCreate
          }, "＋ 新建宠物")
        ]),
        loading.value ? (openBlock(), createElementBlock("div", _hoisted_2, "加载中…")) : (openBlock(), createElementBlock("div", _hoisted_3, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(list.value, (s) => {
            return openBlock(), createElementBlock("div", {
              key: s.key,
              class: "card glass"
            }, [
              createBaseVNode("div", _hoisted_4, [
                (openBlock(), createElementBlock(Fragment, null, renderList([0, 1, 2, 3, 4], (stage) => {
                  var _a;
                  return createBaseVNode("div", {
                    key: stage,
                    class: "stage-cell",
                    title: `第${stage}阶段`,
                    onClick: ($event) => pickImage(s.key, stage)
                  }, [
                    ((_a = previews[s.key]) == null ? void 0 : _a[stage]) ? (openBlock(), createElementBlock("img", {
                      key: 0,
                      src: previews[s.key][stage],
                      alt: ""
                    }, null, 8, _hoisted_6)) : (openBlock(), createElementBlock("span", _hoisted_7, toDisplayString(s.emoji), 1)),
                    createBaseVNode("span", _hoisted_8, toDisplayString(STAGE_LABELS[stage]), 1),
                    createBaseVNode("span", {
                      class: normalizeClass(["upload-mask", { busy: uploadingStage.value === `${s.key}:${stage}` }])
                    }, toDisplayString(uploadingStage.value === `${s.key}:${stage}` ? "…" : "⬆"), 3)
                  ], 8, _hoisted_5);
                }), 64))
              ]),
              createBaseVNode("div", _hoisted_9, [
                createBaseVNode("div", _hoisted_10, [
                  createBaseVNode("span", _hoisted_11, toDisplayString(s.name), 1),
                  createBaseVNode("span", {
                    class: normalizeClass(["badge", s.series])
                  }, toDisplayString(s.series === "boy" ? "男生款" : "女生款") + " " + toDisplayString(s.gender), 3),
                  s.isCustom ? (openBlock(), createElementBlock("span", _hoisted_12, "自定义")) : createCommentVNode("", true)
                ]),
                createBaseVNode("div", _hoisted_13, [
                  createBaseVNode("span", _hoisted_14, toDisplayString(s.key), 1),
                  createBaseVNode("span", null, "满级 " + toDisplayString(s.stageExp[4]) + " exp", 1),
                  createBaseVNode("span", null, "升阶 " + toDisplayString(s.stageExp.slice(1).join(" / ")), 1)
                ]),
                createBaseVNode("div", _hoisted_15, [
                  createBaseVNode("button", {
                    class: "btn btn-ghost sm",
                    onClick: ($event) => openEdit(s)
                  }, "✏️ 编辑", 8, _hoisted_16),
                  s.isCustom ? (openBlock(), createElementBlock("button", {
                    key: 0,
                    class: "btn btn-ghost sm danger",
                    onClick: ($event) => deleting.value = s
                  }, "🗑 删除", 8, _hoisted_17)) : createCommentVNode("", true)
                ])
              ])
            ]);
          }), 128))
        ])),
        createVNode(Transition, { name: "modal" }, {
          default: withCtx(() => {
            var _a;
            return [
              editOpen.value ? (openBlock(), createElementBlock("div", {
                key: 0,
                class: "mask",
                onClick: _cache[6] || (_cache[6] = withModifiers(($event) => editOpen.value = false, ["self"]))
              }, [
                createBaseVNode("div", _hoisted_18, [
                  createBaseVNode("header", _hoisted_19, [
                    createBaseVNode("h2", null, "编辑 · " + toDisplayString((_a = editing.value) == null ? void 0 : _a.name), 1),
                    createBaseVNode("button", {
                      class: "close",
                      onClick: _cache[0] || (_cache[0] = ($event) => editOpen.value = false)
                    }, "✕")
                  ]),
                  createBaseVNode("div", _hoisted_20, [
                    createBaseVNode("label", _hoisted_21, [
                      _cache[19] || (_cache[19] = createBaseVNode("span", null, "名字", -1)),
                      withDirectives(createBaseVNode("input", {
                        "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => form.name = $event),
                        maxlength: "12",
                        type: "text"
                      }, null, 512), [
                        [vModelText, form.name]
                      ])
                    ]),
                    createBaseVNode("div", _hoisted_22, [
                      createBaseVNode("label", _hoisted_23, [
                        _cache[21] || (_cache[21] = createBaseVNode("span", null, "系列", -1)),
                        withDirectives(createBaseVNode("select", {
                          "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => form.series = $event)
                        }, [..._cache[20] || (_cache[20] = [
                          createBaseVNode("option", { value: "boy" }, "男生款", -1),
                          createBaseVNode("option", { value: "girl" }, "女生款", -1)
                        ])], 512), [
                          [vModelSelect, form.series]
                        ])
                      ]),
                      createBaseVNode("label", _hoisted_24, [
                        _cache[23] || (_cache[23] = createBaseVNode("span", null, "性别", -1)),
                        withDirectives(createBaseVNode("select", {
                          "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => form.gender = $event)
                        }, [..._cache[22] || (_cache[22] = [
                          createBaseVNode("option", { value: "♂" }, "♂", -1),
                          createBaseVNode("option", { value: "♀" }, "♀", -1)
                        ])], 512), [
                          [vModelSelect, form.gender]
                        ])
                      ]),
                      createBaseVNode("label", _hoisted_25, [
                        _cache[24] || (_cache[24] = createBaseVNode("span", null, "兜底 emoji", -1)),
                        withDirectives(createBaseVNode("input", {
                          "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => form.emoji = $event),
                          maxlength: "8",
                          type: "text"
                        }, null, 512), [
                          [vModelText, form.emoji]
                        ])
                      ])
                    ]),
                    createBaseVNode("div", _hoisted_26, [
                      _cache[25] || (_cache[25] = createBaseVNode("span", null, "成长阈值（各阶段累计经验）", -1)),
                      createBaseVNode("div", _hoisted_27, [
                        (openBlock(true), createElementBlock(Fragment, null, renderList(form.stageExp, (v, i) => {
                          return openBlock(), createElementBlock("label", {
                            key: i,
                            class: "exp-cell"
                          }, [
                            createBaseVNode("em", null, toDisplayString(["蛋", "Lv1", "Lv2", "Lv3", "Lv4"][i]), 1),
                            withDirectives(createBaseVNode("input", {
                              "onUpdate:modelValue": ($event) => form.stageExp[i] = $event,
                              type: "number",
                              min: "0"
                            }, null, 8, _hoisted_28), [
                              [
                                vModelText,
                                form.stageExp[i],
                                void 0,
                                { number: true }
                              ]
                            ])
                          ]);
                        }), 128))
                      ]),
                      stageExpErr.value ? (openBlock(), createElementBlock("p", _hoisted_29, toDisplayString(stageExpErr.value), 1)) : createCommentVNode("", true)
                    ]),
                    _cache[26] || (_cache[26] = createBaseVNode("p", { class: "hint" }, "图片请直接点列表卡片上对应阶段的小图上传", -1))
                  ]),
                  createBaseVNode("footer", _hoisted_30, [
                    createBaseVNode("button", {
                      class: "btn btn-ghost",
                      onClick: _cache[5] || (_cache[5] = ($event) => editOpen.value = false)
                    }, "取消"),
                    createBaseVNode("button", {
                      class: "btn btn-primary",
                      disabled: editSaving.value,
                      onClick: saveEdit
                    }, toDisplayString(editSaving.value ? "保存中…" : "保存"), 9, _hoisted_31)
                  ])
                ])
              ])) : createCommentVNode("", true)
            ];
          }),
          _: 1
        }),
        createVNode(Transition, { name: "modal" }, {
          default: withCtx(() => [
            createOpen.value ? (openBlock(), createElementBlock("div", {
              key: 0,
              class: "mask",
              onClick: _cache[14] || (_cache[14] = withModifiers(($event) => createOpen.value = false, ["self"]))
            }, [
              createBaseVNode("div", _hoisted_32, [
                createBaseVNode("header", _hoisted_33, [
                  _cache[27] || (_cache[27] = createBaseVNode("h2", null, "🐾 新建宠物", -1)),
                  createBaseVNode("button", {
                    class: "close",
                    onClick: _cache[7] || (_cache[7] = ($event) => createOpen.value = false)
                  }, "✕")
                ]),
                createBaseVNode("div", _hoisted_34, [
                  createBaseVNode("label", _hoisted_35, [
                    _cache[28] || (_cache[28] = createBaseVNode("span", null, "图片目录名（key，创建后不可改）", -1)),
                    withDirectives(createBaseVNode("input", {
                      "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => createForm.key = $event),
                      type: "text",
                      placeholder: "如 ember",
                      class: "mono"
                    }, null, 512), [
                      [vModelText, createForm.key]
                    ]),
                    keyErr.value ? (openBlock(), createElementBlock("p", _hoisted_36, toDisplayString(keyErr.value), 1)) : createCommentVNode("", true)
                  ]),
                  createBaseVNode("label", _hoisted_37, [
                    _cache[29] || (_cache[29] = createBaseVNode("span", null, "名字", -1)),
                    withDirectives(createBaseVNode("input", {
                      "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => createForm.name = $event),
                      maxlength: "12",
                      type: "text",
                      placeholder: "如 小火狐"
                    }, null, 512), [
                      [vModelText, createForm.name]
                    ])
                  ]),
                  createBaseVNode("div", _hoisted_38, [
                    createBaseVNode("label", _hoisted_39, [
                      _cache[31] || (_cache[31] = createBaseVNode("span", null, "系列", -1)),
                      withDirectives(createBaseVNode("select", {
                        "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => createForm.series = $event)
                      }, [..._cache[30] || (_cache[30] = [
                        createBaseVNode("option", { value: "boy" }, "男生款", -1),
                        createBaseVNode("option", { value: "girl" }, "女生款", -1)
                      ])], 512), [
                        [vModelSelect, createForm.series]
                      ])
                    ]),
                    createBaseVNode("label", _hoisted_40, [
                      _cache[33] || (_cache[33] = createBaseVNode("span", null, "性别", -1)),
                      withDirectives(createBaseVNode("select", {
                        "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => createForm.gender = $event)
                      }, [..._cache[32] || (_cache[32] = [
                        createBaseVNode("option", { value: "♂" }, "♂", -1),
                        createBaseVNode("option", { value: "♀" }, "♀", -1)
                      ])], 512), [
                        [vModelSelect, createForm.gender]
                      ])
                    ]),
                    createBaseVNode("label", _hoisted_41, [
                      _cache[34] || (_cache[34] = createBaseVNode("span", null, "兜底 emoji", -1)),
                      withDirectives(createBaseVNode("input", {
                        "onUpdate:modelValue": _cache[12] || (_cache[12] = ($event) => createForm.emoji = $event),
                        maxlength: "8",
                        type: "text"
                      }, null, 512), [
                        [vModelText, createForm.emoji]
                      ])
                    ])
                  ]),
                  _cache[35] || (_cache[35] = createBaseVNode("p", { class: "hint" }, '创建后先上传"蛋/Lv1"图片就能领养，其余阶段可以慢慢补', -1))
                ]),
                createBaseVNode("footer", _hoisted_42, [
                  createBaseVNode("button", {
                    class: "btn btn-ghost",
                    onClick: _cache[13] || (_cache[13] = ($event) => createOpen.value = false)
                  }, "取消"),
                  createBaseVNode("button", {
                    class: "btn btn-primary",
                    disabled: createSaving.value,
                    onClick: saveCreate
                  }, toDisplayString(createSaving.value ? "创建中…" : "创建"), 9, _hoisted_43)
                ])
              ])
            ])) : createCommentVNode("", true)
          ]),
          _: 1
        }),
        createVNode(Transition, { name: "modal" }, {
          default: withCtx(() => [
            deleting.value ? (openBlock(), createElementBlock("div", {
              key: 0,
              class: "mask",
              onClick: _cache[17] || (_cache[17] = withModifiers(($event) => deleting.value = null, ["self"]))
            }, [
              createBaseVNode("div", _hoisted_44, [
                createBaseVNode("header", _hoisted_45, [
                  createBaseVNode("h2", null, "删除 " + toDisplayString(deleting.value.name) + "？", 1),
                  createBaseVNode("button", {
                    class: "close",
                    onClick: _cache[15] || (_cache[15] = ($event) => deleting.value = null)
                  }, "✕")
                ]),
                createBaseVNode("div", _hoisted_46, [
                  createBaseVNode("p", _hoisted_47, [
                    _cache[36] || (_cache[36] = createTextVNode(" 将删除物种 ", -1)),
                    createBaseVNode("b", null, toDisplayString(deleting.value.name), 1),
                    createTextVNode("（" + toDisplayString(deleting.value.key) + "）及其上传过的所有图片，且不可恢复。 有小孩正在养时会被拒绝。 ", 1)
                  ])
                ]),
                createBaseVNode("footer", _hoisted_48, [
                  createBaseVNode("button", {
                    class: "btn btn-ghost",
                    onClick: _cache[16] || (_cache[16] = ($event) => deleting.value = null)
                  }, "再想想"),
                  createBaseVNode("button", {
                    class: "btn btn-danger",
                    onClick: confirmDelete
                  }, "确认删除")
                ])
              ])
            ])) : createCommentVNode("", true)
          ]),
          _: 1
        })
      ]);
    };
  }
});
const PetSpecies = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-673a1831"]]);
export {
  PetSpecies as default
};
