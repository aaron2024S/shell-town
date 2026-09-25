/**
 * humation 头像规格的存储格式与工具函数。
 *
 * users.avatar 为 TEXT 字段，兼容两种取值：
 *  - 生肖 key（历史数据）：'dragon' 等，渲染 emoji 圆形头像
 *  - humation 规格：'hum1:' + JSON.stringify(HumationSpec)，渲染手绘卡通风头像
 *
 * HumationSpec 字段与 @humation/core 的 CreateAvatarOptions 子集对应，
 * 全部可选，缺省项回落到资产包默认值：
 *  - seed: 确定性随机种子（服务端/客户端渲染结果一致）
 *  - sel:  部位选择 { head, body, bottom, item, glasses } → 部件 id 或槽位内名称
 *  - col:  配色 { hair, skin, clothes, bottom, stroke } → 十六进制色值（不带 #）
 *  - bg:   背景色（不带 #）或 'transparent'
 */
import type { HumationManifest, PartOption } from './types';

export const HUMATION_PREFIX = 'hum1:';
export const HUMATION_MAX_LENGTH = 600;

export interface HumationSpec {
  seed?: string;
  sel?: Record<string, string>;
  col?: Record<string, string>;
  bg?: string;
}

export function isHumationAvatar(value?: string | null): boolean {
  return (
    !!value &&
    value.startsWith(HUMATION_PREFIX) &&
    value.length <= HUMATION_MAX_LENGTH
  );
}

export function parseSpec(value?: string | null): HumationSpec | null {
  if (!isHumationAvatar(value)) return null;
  try {
    const raw = JSON.parse(value!.slice(HUMATION_PREFIX.length)) as unknown;
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      return null;
    }
    return raw as HumationSpec;
  } catch {
    return null;
  }
}

export function encodeSpec(spec: HumationSpec): string {
  return HUMATION_PREFIX + JSON.stringify(spec);
}

/** 编辑器内的草稿状态（部件 id + 配色 + 背景） */
export interface AvatarDraft {
  sel: Record<string, string>;
  col: Record<string, string>;
  bg: string;
}

export function draftFromSpec(value?: string | null): AvatarDraft | null {
  const spec = parseSpec(value);
  if (!spec) return null;
  return {
    sel: { ...(spec.sel ?? {}) },
    col: { ...(spec.col ?? {}) },
    bg: spec.bg ?? 'F6F5F4',
  };
}

export function draftToSpec(draft: AvatarDraft): HumationSpec {
  return { sel: { ...draft.sel }, col: { ...draft.col }, bg: draft.bg };
}

const HAIR_COLORS = ['2F2A28', '5B3A29', '8C5A2E', 'C98A3D', 'E0C388', '7A5230'];
const SKIN_COLORS = ['FFE3C9', 'FFD9B3', 'F2C19B', 'E0A97D', 'C98D63'];
const CLOTHES_COLORS = ['E05D5D', '5DA8E0', '7BC47F', 'F2B134', '9B7BDC', 'EF8FB0', '5CC8C2'];
const BOTTOM_COLORS = ['3B6EA5', '5D5D6E', '7A4A3A', '2F6E5A', '835C9E', 'B3543F'];
const BG_COLORS = ['F6F5F4', 'FFF7E6', 'EAF6FF', 'F0FFF4', 'FDEFF5'];

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/** 从资产包随机生成一套完整形象（部位 + 配色 + 背景） */
export function randomDraft(manifest: HumationManifest): AvatarDraft {
  const slots = manifest.selectionSlots.map((s) => s.id);
  const sel: Record<string, string> = {};
  for (const slot of slots) {
    const parts: PartOption[] = manifest.parts.filter(
      (p) => p.selectionSlot === slot && !p.deprecated
    );
    if (parts.length > 0) sel[slot] = pick(parts).id;
  }
  return {
    sel,
    col: {
      hair: pick(HAIR_COLORS),
      skin: pick(SKIN_COLORS),
      clothes: pick(CLOTHES_COLORS),
      bottom: pick(BOTTOM_COLORS),
      stroke: '111111',
    },
    bg: pick(BG_COLORS),
  };
}
