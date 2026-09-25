// 周期任务：模板到点自动克隆为普通任务（adhoc_tasks）。
//
// 设计要点：
//  - 生成的任务就是普通 adhoc_task，孩子端 / 审核 / 通知全部复用现有链路
//  - 多孩子：模板的 user_ids 是逗号分隔的孩子 id，每个孩子各生成一条独立任务
//  - 去重：adhoc_tasks 带 (recurring_id, period_key, user_id) 唯一索引，period_key 为
//    本地日期 YYYY-MM-DD —— 每个模板每个孩子每天至多生成一条，且任务完成后依然占位
//    （不会重复补发）
//  - 发布凭证：recurring_issued (recurring_id, period_key, user_id) 记录「这期发过」，
//    与任务实例解耦。家长删除实例只作废本期（凭证拦住自动重发）；手动补发 /run
//    会先清当日凭证，是唯一的恢复出口
//  - 每期截止：模板可配 due_hours（发布后 N 小时），生成实例时换算成绝对 deadline；
//    允许跨期（截止晚于下期发布 → 两期短暂并存，各自独立完成与计分）
//  - 发布时刻：模板可配 time_of_day（'HH:MM'，本地时间）。未到点不发布；到点后由
//    分钟级调度器发布；NULL 表示当天调度器首次检查时即发布
//  - 调度：启动时先跑一遍（补上停机期间漏掉的），之后每 1 分钟兜底一次；
//    全程幂等，多跑无害
//  - 到期结束：同一个调度 tick 里还会把已过 deadline、且没有待审核申请的进行中任务
//    落库为 status='expired'（见 expireDueTasks）。此前「已超时」纯粹是查询期算出来的
//    虚拟状态（status 一直是 active），任务既不消失也一直能提交；落库之后它才真正从
//    孩子端/家长端的「进行中」列表里移出去。
//  - 保留策略：同一个 tick 里还会按保留天数清理只增不减的流水/历史表（见 retention.ts）。
//    它自带 24 小时节流，所以 60 秒 tick 并不会变成 60 秒一次 DELETE。
//  - 时区：始终用服务器本地时间（容器内 TZ 由部署环境决定，与截止时间语义一致）
import { getDb } from './db/index.js';
import { pushToUser } from './ws.js';
import { localDateKey } from './dates.js';
import { cleanupIfDue } from './retention.js';

const CHECK_INTERVAL_MS = 60 * 1000;

export interface RecurringRule {
  id: number;
  name: string;
  description: string | null;
  category: string;
  points: number;
  user_id: number;            // 历史单孩子字段（= user_ids 的第一个）
  user_ids: string | null;    // '2,5' 多孩子；为空时回落到 user_id
  created_by: number;
  freq: 'daily' | 'weekly' | 'monthly';
  weekdays: string | null;   // '1,3,5'（周一~周日）
  monthdays: string | null;  // '1,15'
  time_of_day: string | null; // 'HH:MM' 本地发布时刻，NULL=不限时
  due_hours: number | null;   // 每期截止：发布后 N 小时（1~720）；NULL=无截止
  active: number;
}

/** 模板作用的孩子 id 列表（user_ids 优先，空则回落到历史 user_id） */
export function ruleChildIds(rule: RecurringRule): number[] {
  const ids = (rule.user_ids ?? '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  if (ids.length > 0) return [...new Set(ids)];
  return rule.user_id ? [Number(rule.user_id)] : [];
}

/** 'HH:MM' → 分钟数；非法/未设置返回 null */
function timeOfDayMinutes(rule: RecurringRule): number | null {
  const raw = (rule.time_of_day ?? '').trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(raw);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

/**
 * 指定日期该模板是否该生成（只看日期，不看时刻）。
 *
 * 此前 isDueToday(rule, Date) 与 isDueOn(rule, 'YYYY-MM-DD') 是两份几乎相同的实现，
 * 改一处忘另一处会让「定时调度」和「测试/补发」的判定悄悄不一致。现在只保留这一份。
 *
 * @param date Date 对象或本地日期串 'YYYY-MM-DD'
 */
export function isDueOn(rule: RecurringRule, date: Date | string): boolean {
  if (!rule.active) return false;
  if (rule.freq === 'daily') return true;

  let d: Date;
  if (typeof date === 'string') {
    const [y, m, day] = date.split('-').map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = date;
  }

  if (rule.freq === 'weekly') {
    // 规则用 1~7 表示周一~周日；JS getDay() 0=周日
    const dow = d.getDay() === 0 ? 7 : d.getDay();
    const days = (rule.weekdays ?? '').split(',').map((s) => Number(s.trim())).filter(Boolean);
    return days.includes(dow);
  }
  // monthly
  const dom = d.getDate();
  const days = (rule.monthdays ?? '').split(',').map((s) => Number(s.trim())).filter(Boolean);
  return days.includes(dom);
}

/** 今天是否该生成（按日期判定，不看时刻） */
export function isDueToday(rule: RecurringRule, now: Date = new Date()): boolean {
  return isDueOn(rule, now);
}

/**
 * 今天该发且已到发布时刻。
 * 未设置 time_of_day 视为「不限时」，随时可发；
 * 设置了则本地时间 >= 该时刻才算到点（当天补发场景下同样成立）。
 */
export function isTimeReached(rule: RecurringRule, now = new Date()): boolean {
  const target = timeOfDayMinutes(rule);
  if (target === null) return true;
  return now.getHours() * 60 + now.getMinutes() >= target;
}

/** 为某个模板的某个孩子补发一条任务；已存在（或唯一键冲突）时返回 false */
function insertTaskForChild(rule: RecurringRule, childId: number, dateKey: string, nowSec: number): boolean {
  const db = getDb();
  // 去重（唯一索引之外再查一次，兼容老库没建索引的情况）
  const exists = db.prepare(
    'SELECT 1 FROM adhoc_tasks WHERE recurring_id = ? AND period_key = ? AND user_id = ?',
  ).get(rule.id, dateKey, childId);
  if (exists) return false;

  // 发布凭证查重：这期发过就算「已处理」——即使任务实例已被家长删除（= 本期作废），
  // 自动调度/编辑保存也不得重发。手动补发会先清当日凭证，是唯一的恢复出口。
  const issued = db.prepare(
    'SELECT 1 FROM recurring_issued WHERE recurring_id = ? AND period_key = ? AND user_id = ?',
  ).get(rule.id, dateKey, childId);
  if (issued) return false;

  // 任务实例与发布凭证同一事务落库：两者永远一致，不存在「发了任务没记凭证」的窗口
  const txn = db.transaction((): number => {
    // 每期截止 = 本期发布时刻 + 模板设定的 N 小时；模板不设截止则沿用 NULL。
    // 用「发布后 N 小时」的相对偏移而不是绝对时间戳：周期任务每期都会重生，
    // 只有相对偏移能随期复制。允许跨期（截止晚于下期发布时两期短暂并存，各自独立）。
    const deadline = rule.due_hours != null ? nowSec + Number(rule.due_hours) * 3600 : null;
    const result = db.prepare(`
      INSERT INTO adhoc_tasks (name, description, category, points, deadline, user_id, created_by, created_at, recurring_id, period_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      rule.name, rule.description, rule.category, rule.points,
      deadline, childId, rule.created_by, nowSec, rule.id, dateKey,
    );
    db.prepare(
      'INSERT OR IGNORE INTO recurring_issued (recurring_id, period_key, user_id) VALUES (?, ?, ?)',
    ).run(rule.id, dateKey, childId);
    return Number(result.lastInsertRowid);
  });

  try {
    const taskId = txn();
    // 孩子在线时给个轻提示（孩子端现有逻辑收到未知事件只是忽略，安全）
    pushToUser(childId, {
      type: 'task_generated',
      taskId,
      taskName: rule.name,
      points: rule.points,
    });
    return true;
  } catch (e: any) {
    // 唯一索引冲突（并发/重复调度）→ 视为已生成
    if (!String(e?.message ?? '').includes('UNIQUE')) throw e;
    return false;
  }
}

/**
 * 给某个模板在指定日期补发任务。
 *
 * 调度器、家长端「手动补发」、以及创建/编辑模板后的立即生成，全部走这一份实现 ——
 * 此前同一段「查重 + 插入 + 推送」的逻辑在三处各写了一遍，行为很容易漂移
 * （比如手动补发那份漏掉了 active 判定，暂停的模板也能被点出来补发）。
 *
 * @param dateKey        本地日期串 'YYYY-MM-DD'
 * @param ignoreSchedule true = 忽略「今天该不该发 / 是否已到发布时刻」，直接补发（家长手动触发）
 * @returns 实际新增的任务条数（多孩子模板按孩子数计）
 */
export function issueTemplate(
  rule: RecurringRule,
  dateKey: string = localDateKey(),
  ignoreSchedule = false,
  now: Date = new Date(),
): number {
  // 暂停的模板永不生成（含手动补发）
  if (!rule.active) return 0;
  if (!ignoreSchedule) {
    if (!isDueOn(rule, dateKey)) return 0;
    if (!isTimeReached(rule, now)) return 0;
  }

  const db = getDb();
  const nowSec = Math.floor(now.getTime() / 1000);
  const childIds = ruleChildIds(rule).filter((cid) => {
    const kid = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'child'").get(cid);
    return !!kid;
  });

  let created = 0;
  for (const childId of childIds) {
    if (insertTaskForChild(rule, childId, dateKey, nowSec)) created++;
  }
  return created;
}

/**
 * 扫描所有启用模板，为「今天该做、已到点且还没生成」的每个孩子生成任务。
 * @param today 传入则按指定日期判定与去重（测试用，同时忽略发布时刻限制），默认本地今天
 * @returns 生成的任务数（多孩子模板按孩子数计）
 */
export function generateDueTasks(today?: string): number {
  const rules = getDb()
    .prepare('SELECT * FROM recurring_tasks WHERE active = 1')
    .all() as unknown as RecurringRule[];
  const now = new Date();
  const dateKey = today ?? localDateKey(now);

  let created = 0;
  for (const rule of rules) {
    // 指定日期（测试）模式不做时刻限制；正常调度必须到点才发
    created += issueTemplate(rule, dateKey, !!today, now);
  }
  return created;
}

/**
 * 把已过截止时间、且没有待审核申请的「进行中」任务落库为 expired（到期自动结束）。
 *
 * 三个刻意的设计点：
 *  1. **只改 status，绝不删行**。周期任务实例靠 (recurring_id, period_key, user_id) 唯一索引
 *     与 recurring_issued 发布凭证去重，家长删实例的语义是「本期作废」——这里若改成 DELETE，
 *     家长端「上一期」的展示会从真实状态变成 voided（像那期压根没发过），
 *     而且 task_completions 带 ON DELETE CASCADE，历史审核记录会被连带清掉。
 *  2. **有待审核申请的跳过**。孩子赶在截止前交了、家长还没来得及审，直接判过期等于白做；
 *     更麻烦的是家长审核通过时那句 `SET status='completed'` 会把 expired 又改回 completed，
 *     两套语义打架。留到审核完再自然收敛。
 *  3. 条件里带 `status = 'active'`，纯 UPDATE 且天然幂等 —— 多跑、多实例部署都无害。
 *
 * @returns 本次实际结束的任务条数
 */
export function expireDueTasks(now: Date = new Date()): number {
  const nowSec = Math.floor(now.getTime() / 1000);
  const r = getDb().prepare(`
    UPDATE adhoc_tasks SET status = 'expired'
    WHERE status = 'active'
      AND deadline IS NOT NULL
      AND deadline <= ?
      AND NOT EXISTS (
        SELECT 1 FROM task_completions
        WHERE task_id = adhoc_tasks.id AND status = 'pending'
      )
  `).run(nowSec);
  return Number(r.changes);
}

let timer: ReturnType<typeof setInterval> | null = null;

/**
 * 启动调度：立即跑一遍，之后每 1 分钟兜底。
 * 1 分钟粒度是为了让「指定发布时间点」尽量准时（10 分钟粒度最坏会晚 10 分钟）。幂等，可安全重复调用。
 *
 * 每个 tick 做三件事：生成到期的周期任务、结束已过截止的进行中任务、按保留天数清理历史。
 * 三者各自 try/catch —— 一边抛异常不该把另外两边一起跳过。
 */
export function startRecurringScheduler(): void {
  try {
    const n = generateDueTasks();
    if (n > 0) console.log(`[recurring] 启动补发：为本期生成了 ${n} 条周期任务`);
  } catch (e) {
    console.error('[recurring] 启动生成失败:', e);
  }
  // 启动时也要清扫：容器停机期间到期的任务，重启后立刻就该结束掉
  try {
    const expired = expireDueTasks();
    if (expired > 0) console.log(`[recurring] 启动清扫：结束了 ${expired} 条到期任务`);
  } catch (e) {
    console.error('[recurring] 启动清扫失败:', e);
  }
  // 保留策略：startup 时 lastCleanupAt 还是 0，所以这里必定真跑一次
  // （覆盖容器停机期间跨过的清理点），之后 24 小时内不再重复。
  runCleanup();

  if (timer === null) {
    timer = setInterval(() => {
      try { generateDueTasks(); } catch (e) { console.error('[recurring] 定时生成失败:', e); }
      try { expireDueTasks(); } catch (e) { console.error('[recurring] 定时清扫失败:', e); }
      runCleanup();
    }, CHECK_INTERVAL_MS);
    timer.unref?.();
  }
}

/** 清理一轮历史记录；被 24 小时节流跳过时完全静默（否则日志会被每 60 秒刷一条） */
function runCleanup(): void {
  try {
    const results = cleanupIfDue();
    if (!results) return;
    const total = results.reduce((s, r) => s + r.deleted, 0);
    if (total > 0) {
      const detail = results.filter((r) => r.deleted > 0)
        .map((r) => `${r.table} ${r.deleted}`)
        .join('、');
      console.log(`[retention] 按保留期清理了 ${total} 行：${detail}`);
    }
  } catch (e) {
    console.error('[retention] 清理失败:', e);
  }
}
