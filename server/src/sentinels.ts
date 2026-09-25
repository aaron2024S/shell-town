// 「不限」哨兵值约定 —— 全局唯一出口
//
// 历史遗留：项目里同时存在两套表示"不限"的魔数，且都是裸写的 0 / -1，
// 读代码时极易把 `if (stock > 0)`（有货吗）与 `if (limit > 0)`（限额开了吗）搞混：
//
//   1) 商品库存 `products.stock`      → -1 表示不限量（因为 0 有独立语义："已售罄"）
//   2) 次数/额度上限                  →  0 表示不限
//        · point_items.daily_limit
//        · users.pet_daily_feed_limit
//        · users.pet_daily_points_limit
//      （这三者都可能为 NULL —— NULL 同样按"不限"处理，见 pets.ts 的 limitsOf()）
//
// 为什么不统一成一个值：三者语义不同，且库存必须保留 0 = 售罄。
// 强行统一成 -1 需要一次数据迁移 + 前端多处文案/交互同步改动，
// 收益（少一个魔数）远小于回归风险。因此这里改为**把约定具名化**：
// 取值不动，但所有判断都走下面这两个谓词，写错时意图一目了然。

/** 商品库存：-1 = 不限量。>= 0 为真实库存（含 0 = 已售罄） */
export const UNLIMITED_STOCK = -1;

/** 次数 / 积分额度：0 = 不限（NULL 亦按不限处理） */
export const UNLIMITED_LIMIT = 0;

/** 库存是否不限量 */
export function isUnlimitedStock(stock: number | null | undefined): boolean {
  return stock === UNLIMITED_STOCK;
}

/** 额度是否不限（0 或 NULL 都算不限） */
export function isUnlimitedLimit(limit: number | null | undefined): boolean {
  return limit === null || limit === undefined || limit <= UNLIMITED_LIMIT;
}
