/**
 * 「记录列表」的统一分页口径。
 *
 * 此前每页条数在 6 个视图里各写了一份 20（child/Home、child/Pet、child/Shop、
 * parent/Dashboard 两份、parent/Logs、parent/Review），改一处漏一处就会出现
 * 同一个应用里不同列表每页条数不一样的怪现象。统一收口到这里。
 *
 * 必须与后端 `server/src/pagination.ts` 的 DEFAULT_PAGE_SIZE 一致 ——
 * 不一致时"不传 limit"的调用方会拿到跟传 limit 时不同的页大小。
 */
export const LIST_PAGE_SIZE = 20;
