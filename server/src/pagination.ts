/**
 * 列表分页的统一入口。
 *
 * 背景：所有「记录列表」接口此前各写一份 limit/offset 兜底，行为并不一致 ——
 *   · exchange-requests.ts 自己有 clampLimit/clampOffset（唯一一份正确实现）
 *   · pets.ts 内联 `Number.isFinite(raw) ? … : def`
 *   · point-logs.ts 写成 `Math.min(Number(raw ?? 50), 200)`
 *   · adhoc-tasks.ts 又是第三种写法，且默认值给到 200
 * 更麻烦的是 point-logs 那份：`Number('abc')` 得到 NaN，`Math.min(NaN, 200)` 还是 NaN，
 * 直接把 NaN 绑进 `LIMIT ?` —— better-sqlite3 会抛 TypeError。
 * 现在收口到这里，调用方只管传原始 query 值。
 *
 * 注意：`limit <= 0` 会回落成默认值而不是 1。前端不传（undefined）、传空串、
 * 传非法值都属于「没指定」，一律给默认页大小。
 */

/** 未指定 limit 时的每页条数。与前端 `LIST_PAGE_SIZE` 保持一致。 */
export const DEFAULT_PAGE_SIZE = 20;

/** limit 硬上限。给大了等于没分页，同时是防止被一次性拉爆的兜底。 */
export const MAX_PAGE_SIZE = 200;

export function clampLimit(raw: unknown, def: number = DEFAULT_PAGE_SIZE): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return def;
  return Math.min(Math.floor(n), MAX_PAGE_SIZE);
}

export function clampOffset(raw: unknown): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * 分页请求的解析结果。`limit`/`offset` 一定合法，可直接绑进 SQL。
 */
export interface Page {
  limit: number;
  offset: number;
}

export function parsePage(query: unknown, def: number = DEFAULT_PAGE_SIZE): Page {
  const q = (query ?? {}) as Record<string, unknown>;
  return { limit: clampLimit(q.limit, def), offset: clampOffset(q.offset) };
}
