/**
 * 日期口径工具 —— 全项目统一的「本地日期」定义。
 *
 * 为什么单独抽出来：每日积分上限（daily_completions.date）、宠物每日额度
 * （pet_usage_daily.date）、周期任务去重键（adhoc_tasks.period_key）三处
 * 各写了一遍同样的实现，且历史上还有过 `toISOString()`（UTC）与
 * `getHours()`（本地）混用的 bug —— 东八区凌晨 0~8 点会算成前一天。
 * 统一走这里，新代码不要再手写日期拼接。
 */

/** 服务器本地时区的日期串 YYYY-MM-DD */
export function localDateKey(d: Date = new Date()): string {
  return (
    `${d.getFullYear()}-` +
    `${String(d.getMonth() + 1).padStart(2, '0')}-` +
    `${String(d.getDate()).padStart(2, '0')}`
  );
}
