/**
 * 记录保留策略：按时间清理只增不减的流水与历史表。
 *
 * 为什么需要：全项目此前没有任何保留策略 —— 9 张表只增不减，唯一的出口是家长在
 * 设置页手动「清空」（而且是整类全清，没有"清旧的"）。按 2 个孩子日常使用估算，
 * 库一年约涨 2.7 万行（其中 quiz_rounds 占 7 千行且每行带完整题目 JSON）。
 * SQLite 撑得住，但「永远无法收缩」本身是个问题。
 *
 * 设计原则（与 routes/records.ts 完全一致，不得越过）：
 *  - **只删流水明细，绝不碰汇总字段**：users.total_points / 宠物经验 / 申请状态
 *    一个都不动，所以清理不会让任何人的余额或等级发生变化。
 *  - **待办永不删**：`*_completions` / `exchange_requests` 的 pending 申请是待办，
 *    `adhoc_tasks` 的 active 是待办，`quiz_rounds` 未结束的是孩子正在答的那一局。
 *    这三类都带显式条件排除，不管配的保留期多短都不会被清掉。
 *  - **保留天数 = 0 表示关闭**，此时本模块什么都不做。
 *
 * 清理粒度：挂在 recurring.ts 已有那个 60 秒调度器上，但**每天最多真清一次**
 * （CLEANUP_MIN_INTERVAL_MS）—— 60 秒跑一次 DELETE 纯属浪费，冻结在启动时补跑即可。
 */
import { getDb } from './db/index.js';
import { localDateKey } from './dates.js';

export const RETENTION_KEY = 'records_retention_days';

/** 默认保留 90 天；0 = 关闭自动清理（保持历史行为） */
export const DEFAULT_RETENTION_DAYS = 90;

/** 两次实际清理之间的最小间隔。调度器 60 秒 tick，但一天清一次足够。 */
export const CLEANUP_MIN_INTERVAL_MS = 24 * 3600 * 1000;

/** 上次真正执行清理的时刻（进程内）。首次为 0，所以启动后第一轮 tick 就会清一次。 */
let lastCleanupAt = 0;

export interface CleanupResult {
  table: string;
  deleted: number;
}

/**
 * 读取保留天数。读不到、非法值一律回落默认值；
 * 只有显式的 0 才表示「关闭自动清理」。
 */
export function getRetentionDays(): number {
  const row = getDb()
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get(RETENTION_KEY) as { value: string } | undefined;
  if (row === undefined) return DEFAULT_RETENTION_DAYS;
  const n = Number(row.value);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_RETENTION_DAYS;
  return Math.floor(n);
}

export function saveRetentionDays(days: number): number {
  const n = Number.isFinite(days) ? Math.floor(days) : DEFAULT_RETENTION_DAYS;
  const safe = Math.min(Math.max(n, 0), 3650);
  getDb().prepare(
    "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, unixepoch()) " +
    'ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
  ).run(RETENTION_KEY, String(safe));
  return safe;
}

/**
 * 执行一次清理。
 *
 * @param retentionDays 覆盖配置中的保留天数（测试用）；不传则读设置
 * @param now           基准时刻（测试用），默认此刻
 * @returns 每张表的删除条数（保留天数 = 0 时返回空数组，表示什么都没做）
 */
export function cleanupOldRecords(
  opts: { retentionDays?: number; now?: Date } = {},
): CleanupResult[] {
  const days = opts.retentionDays ?? getRetentionDays();
  if (days <= 0) return [];

  const nowSec = Math.floor((opts.now ?? new Date()).getTime() / 1000);
  const cutoffSec = nowSec - days * 86400;
  // TEXT 日期列（daily_completions.date 等）是 'YYYY-MM-DD'，ISO 格式下字符串比较等价于日期比较
  const cutoffDate = localDateKey(new Date(cutoffSec * 1000));

  const db = getDb();
  const results: CleanupResult[] = [];
  const push = (table: string, changes: number | bigint) =>
    results.push({ table, deleted: Number(changes) });

  const txn = db.transaction(() => {
    // ── 用户可见的流水/历史（5 张）────────────────────────────
    push('point_logs',
      db.prepare('DELETE FROM point_logs WHERE created_at < ?').run(cutoffSec).changes);

    push('pet_logs',
      db.prepare('DELETE FROM pet_logs WHERE created_at < ?').run(cutoffSec).changes);

    // 待审核申请是待办，永不删 —— 哪怕它已经躺了很久（家长一直没处理）
    push('exchange_requests',
      db.prepare("DELETE FROM exchange_requests WHERE status != 'pending' AND created_at < ?")
        .run(cutoffSec).changes);

    // 先清子表（完成申请），再清父表（任务本体），外键方向更直观
    push('task_completions',
      db.prepare("DELETE FROM task_completions WHERE status != 'pending' AND created_at < ?")
        .run(cutoffSec).changes);

    // 任务的"年龄"要按**结束时间**算，不是发布时间：
    // 「100 天前发布、昨天才完成」的任务不该因为发布得早就被清掉。
    // 另外带 NOT EXISTS 兜住待审核申请 —— 那条申请虽然不参与上面的清理，
    // 但删任务会把它级联带走，会导致家长的待审列表凭空少一条。
    push('adhoc_tasks',
      db.prepare(`
        DELETE FROM adhoc_tasks
        WHERE (
                (status = 'completed' AND COALESCE(completed_at, created_at) < ?)
             OR (status = 'expired'   AND COALESCE(deadline, created_at) < ?)
              )
          AND NOT EXISTS (
                SELECT 1 FROM task_completions
                WHERE task_id = adhoc_tasks.id AND status = 'pending'
              )
      `).run(cutoffSec, cutoffSec).changes);

    // ── 按天计数的内部表（4 张）───────────────────────────────
    // 它们只被「今天」的查询读（每日上限、当日积分、当前这一局），
    // 历史行没有任何读取方，纯粹是累积的死数据。
    push('daily_completions',
      db.prepare('DELETE FROM daily_completions WHERE date < ?').run(cutoffDate).changes);

    push('quiz_daily',
      db.prepare('DELETE FROM quiz_daily WHERE date < ?').run(cutoffDate).changes);

    push('pet_usage_daily',
      db.prepare('DELETE FROM pet_usage_daily WHERE date < ?').run(cutoffDate).changes);

    // finished = 1 才删：未结束的那一局是孩子正在答的，删了直接报错
    push('quiz_rounds',
      db.prepare('DELETE FROM quiz_rounds WHERE finished = 1 AND created_at < ?')
        .run(cutoffSec).changes);
  });

  txn();
  return results;
}

/**
 * 按 24 小时节流地清理一次：调度器每 60 秒调它，但只有距上次清理满 24 小时才真做。
 * 进程刚起来时 lastCleanupAt = 0，所以启动后的第一轮 tick 会补跑一次
 * （覆盖容器停机期间跨过的清理点）。
 *
 * @returns 真执行了则返回各表删除条数，被节流跳过则为 null
 */
export function cleanupIfDue(now: Date = new Date()): CleanupResult[] | null {
  if (Date.now() - lastCleanupAt < CLEANUP_MIN_INTERVAL_MS) return null;
  const results = cleanupOldRecords({ now });
  lastCleanupAt = Date.now();
  return results;
}

/** 供测试重置节流状态 */
export function resetCleanupThrottle(): void {
  lastCleanupAt = 0;
}
