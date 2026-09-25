/**
 * 内置默认头像预置（男生 / 女生各一个）。
 *
 * 头像选择器不再展示 12 生肖网格，改为：
 *   男生（预置） | 女生（预置） | 自定义（打开 HumationAvatarEditor）
 *
 * 预置值是完整的 humation 规格（'hum1:' + JSON），与用户自捏头像同一存储格式，
 * 服务端 avatar.ts 校验天然通过；历史用户存的生肖 key 仍由 ZodiacAvatar 兼容渲染。
 */
import { encodeSpec, type HumationSpec } from './spec';

export interface AvatarPreset {
  key: 'boy' | 'girl';
  label: string;
  /** 完整头像值：'hum1:{...}'，可直接存入 users.avatar */
  value: string;
}

const BOY_SPEC: HumationSpec = {
  sel: {
    head: 'hm1-p-000007', // messy-short 短碎发
    body: 'hm1-p-000032', // hoodie 连帽衫
    bottom: 'hm1-p-000034', // tapered-pants 长裤
    item: 'hm1-p-000045', // sprout 小芽
    glasses: 'hm1-p-000056', // none
  },
  col: {
    hair: '2F2A28',
    skin: 'FFE3C9',
    clothes: '5DA8E0',
    bottom: '3B6EA5',
    stroke: '111111',
  },
  bg: 'EAF6FF',
};

const GIRL_SPEC: HumationSpec = {
  sel: {
    head: 'hm1-p-000017', // ponytail 马尾
    body: 'hm1-p-000029', // tee T恤
    bottom: 'hm1-p-000037', // mini-skirt 短裙
    item: 'hm1-p-000051', // flower 小花
    glasses: 'hm1-p-000056', // none
  },
  col: {
    hair: '5B3A29',
    skin: 'FFE3C9',
    clothes: 'EF8FB0',
    bottom: 'B3543F',
    stroke: '111111',
  },
  bg: 'FDEFF5',
};

export const BOY_PRESET: AvatarPreset = {
  key: 'boy',
  label: '男生',
  value: encodeSpec(BOY_SPEC),
};

export const GIRL_PRESET: AvatarPreset = {
  key: 'girl',
  label: '女生',
  value: encodeSpec(GIRL_SPEC),
};

/** 两个预置头像值集合（判断当前头像是否命中预置） */
export const PRESET_VALUES = new Set([BOY_PRESET.value, GIRL_PRESET.value]);
