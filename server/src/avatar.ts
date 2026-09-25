/**
 * 头像取值校验（供 auth / children 等路由共用）。
 *
 * users.avatar 为 TEXT 字段，允许两类取值：
 *  1. 生肖 key（历史格式）：'rat' | 'ox' | ... | 'pig'
 *  2. humation 自定义形象规格：'hum1:' + JSON.stringify(HumationSpec)
 *     字段：seed（随机种子）、sel（部位选择）、col（配色）、bg（背景）
 *
 * 服务端只做结构与字符集白名单校验（不内嵌资产清单）；
 * 未知的部件 id 由前端渲染层 try/catch 回落处理。
 */

export const ZODIAC_KEYS = new Set([
  'rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake',
  'horse', 'goat', 'monkey', 'rooster', 'dog', 'pig',
]);

export const HUMATION_PREFIX = 'hum1:';
export const HUMATION_MAX_LENGTH = 600;

const SEL_KEYS = new Set(['head', 'body', 'bottom', 'item', 'glasses']);
const COL_KEYS = new Set(['hair', 'skin', 'clothes', 'bottom', 'stroke']);
const PART_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;
const HEX_RE = /^#?[0-9a-fA-F]{3,8}$/;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function checkMap(
  map: unknown,
  allowedKeys: Set<string>,
  valueRe: RegExp
): boolean {
  if (map === undefined) return true;
  if (!isPlainObject(map)) return false;
  return Object.entries(map).every(
    ([key, value]) =>
      allowedKeys.has(key) &&
      typeof value === 'string' &&
      value.length <= 64 &&
      valueRe.test(value)
  );
}

export function isValidAvatar(value: string): boolean {
  // 生肖 key
  if (ZODIAC_KEYS.has(value)) return true;

  // humation 自定义规格
  if (!value.startsWith(HUMATION_PREFIX)) return false;
  if (value.length > HUMATION_MAX_LENGTH) return false;

  let raw: unknown;
  try {
    raw = JSON.parse(value.slice(HUMATION_PREFIX.length));
  } catch {
    return false;
  }
  if (!isPlainObject(raw)) return false;

  const allowed = new Set(['seed', 'sel', 'col', 'bg']);
  if (!Object.keys(raw).every((k) => allowed.has(k))) return false;

  const { seed, sel, col, bg } = raw;
  if (seed !== undefined) {
    if (typeof seed !== 'string' || seed.length > 64) return false;
  }
  if (!checkMap(sel, SEL_KEYS, PART_ID_RE)) return false;
  if (!checkMap(col, COL_KEYS, HEX_RE)) return false;
  if (
    bg !== undefined &&
    !(typeof bg === 'string' && (bg === 'transparent' || HEX_RE.test(bg)))
  ) {
    return false;
  }
  return true;
}
