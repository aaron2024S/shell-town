// 周期任务模板 CRUD（家长专用）。
// 生成的任务本体走 adhoc-tasks 既有路由，这里只管模板与手动补发。
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { requireParent } from '../middleware.js';
import { issueTemplate, isDueToday, ruleChildIds, type RecurringRule } from '../recurring.js';
import { localDateKey } from '../dates.js';

// 允许空数组：编辑时前端对「非该频率」的字段会传 []，此前 min(1) 直接 400（历史 bug）
// 允许 null：前端表单里「没填 / 不适用」的字段一律发 null（如 description、非该频率的
// weekdays），schema 不带 .nullable() 会直接 400（Expected string, received null），
// 且报错只回第一个 issue，容易误判成别的字段问题。
const weekdaysSchema = z.array(z.number().int().min(1).max(7)).max(7);
const monthdaysSchema = z.array(z.number().int().min(1).max(31)).max(31);
const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, '时间格式应为 HH:MM');

const childIdsSchema = z.array(z.number().int().positive()).min(1).max(20);

const createSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).nullable().optional(),
  points: z.number().int().positive(),
  userId: z.number().int().positive().nullable().optional(),   // 兼容旧客户端（单孩子）
  userIds: childIdsSchema.nullable().optional(),               // 多选孩子
  freq: z.enum(['daily', 'weekly', 'monthly']),
  weekdays: weekdaysSchema.nullable().optional(),
  monthdays: monthdaysSchema.nullable().optional(),
  timeOfDay: timeOfDaySchema.nullable().optional(),            // 'HH:MM' 到点发布；null=不限时
  dueHours: z.number().int().min(1).max(720).nullable().optional(), // 每期截止：发布后 N 小时；null=无截止
}).refine(
  (v) => (v.userIds?.length ?? 0) > 0 || v.userId != null,
  { message: '请至少选择一个小朋友' },
).refine(
  (v) => v.freq !== 'weekly' || (v.weekdays?.length ?? 0) > 0,
  { message: '每周重复需选择星期' },
).refine(
  (v) => v.freq !== 'monthly' || (v.monthdays?.length ?? 0) > 0,
  { message: '每月重复需选择日期' },
);

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).nullable().optional(),
  points: z.number().int().positive().optional(),
  userIds: childIdsSchema.optional(),
  freq: z.enum(['daily', 'weekly', 'monthly']).optional(),
  weekdays: weekdaysSchema.nullable().optional(),
  monthdays: monthdaysSchema.nullable().optional(),
  timeOfDay: timeOfDaySchema.nullable().optional(),
  dueHours: z.number().int().min(1).max(720).nullable().optional(),
  active: z.boolean().optional(),
});

/** 校验孩子 id 全部存在且是小孩，返回去重后的列表 */
function normalizeChildIds(ids: number[]): number[] | null {
  const db = getDb();
  const uniq = [...new Set(ids)];
  for (const id of uniq) {
    const kid = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'child'").get(id);
    if (!kid) return null;
  }
  return uniq;
}

function ruleView(r: any) {
  const db = getDb();
  // 最近一期发布情况（供列表展示）。
  // 数据源用发布凭证表 recurring_issued 而不是任务实例：家长删除进行中实例后
  // 凭证仍在（1.6.11 起「本期作废」），只读实例会让「上期」凭空消失。
  // 状态优先取该期任务实例的最新状态；实例被删光则标 voided（已作废）。
  const last = db.prepare(`
    SELECT i.period_key AS date,
           (SELECT t.status FROM adhoc_tasks t
             WHERE t.recurring_id = i.recurring_id AND t.period_key = i.period_key
             ORDER BY t.id DESC LIMIT 1) AS status
    FROM recurring_issued i
    WHERE i.recurring_id = ?
    ORDER BY i.period_key DESC LIMIT 1
  `).get(r.id) as any;
  // 多孩子：模板存 CSV，这里解析成数组并带上每个孩子的名字/头像
  const ids = ruleChildIds(r as any);
  const children = ids.map((id) => {
    const u = db.prepare('SELECT id, name, avatar FROM users WHERE id = ?').get(id) as any;
    return u ? { id: u.id, name: u.name, avatar: u.avatar } : null;
  }).filter(Boolean);
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    category: r.category,
    points: r.points,
    userId: r.user_id,
    userIds: ids,
    userName: r.user_name ?? (children[0] as any)?.name ?? '',
    userAvatar: r.user_avatar ?? (children[0] as any)?.avatar ?? '',
    children,
    freq: r.freq,
    weekdays: r.weekdays ? r.weekdays.split(',').map(Number) : [],
    monthdays: r.monthdays ? r.monthdays.split(',').map(Number) : [],
    timeOfDay: r.time_of_day ?? null,
    dueHours: r.due_hours ?? null,
    active: !!r.active,
    dueToday: isDueToday(r),
    lastGenerated: last ? { date: last.date, status: last.status ?? 'voided' } : null,
  };
}

export function registerRecurringTasksRoutes(app: FastifyInstance) {
  // 家长：周期任务列表
  app.get('/recurring-tasks', { preHandler: requireParent }, async () => {
    const rows = getDb().prepare(`
      SELECT r.*, u.name as user_name, u.avatar as user_avatar
      FROM recurring_tasks r JOIN users u ON u.id = r.user_id
      ORDER BY r.created_at DESC
    `).all() as any[];
    return { rules: rows.map(ruleView) };
  });

  // 家长：创建周期任务（若今天该发且已到点，立即生成一期）
  app.post('/recurring-tasks', { preHandler: requireParent }, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input', detail: parsed.error.issues[0]?.message });
    const { name, description, points, freq, weekdays, monthdays, timeOfDay, dueHours } = parsed.data;

    const rawIds = parsed.data.userIds ?? (parsed.data.userId != null ? [parsed.data.userId] : []);
    const childIds = normalizeChildIds(rawIds);
    if (!childIds) return reply.code(400).send({ error: 'invalid_input', detail: '孩子不存在' });

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO recurring_tasks (name, description, category, points, user_id, user_ids, created_by, freq, weekdays, monthdays, time_of_day, due_hours)
      VALUES (?, ?, '其他', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, description ?? null, points, childIds[0], childIds.join(','), req.user!.sub, freq,
      freq === 'weekly' ? (weekdays ?? []).join(',') : null,
      freq === 'monthly' ? (monthdays ?? []).join(',') : null,
      timeOfDay ?? null,
      dueHours ?? null,
    );
    const id = Number(result.lastInsertRowid);

    const row = db.prepare(`
      SELECT r.*, u.name as user_name, u.avatar as user_avatar
      FROM recurring_tasks r JOIN users u ON u.id = r.user_id WHERE r.id = ?
    `).get(id) as any;

    // 今天正好该发（且已到点）→ 马上生成一期，孩子立刻可见。
    // 用 issueTemplate 只统计「本模板新生成了几条」——旧实现返回的是 generateDueTasks()
    // 的全局新增数，会把同一时刻其它到点模板生成的任务也算进来，语义含混。
    const generated = issueTemplate(row as RecurringRule, localDateKey(), false);

    return { ok: true, generated, rule: ruleView(row) };
  });

  // 家长：编辑 / 启停
  app.patch('/recurring-tasks/:id', { preHandler: requireParent }, async (req, reply) => {
    const id = Number((req.params as any).id);
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input', detail: parsed.error.issues[0]?.message });
    const { name, description, points, userIds, freq, weekdays, monthdays, timeOfDay, dueHours, active } = parsed.data;

    const db = getDb();
    const rule = db.prepare('SELECT * FROM recurring_tasks WHERE id = ?').get(id) as any;
    if (!rule) return reply.code(404).send({ error: 'not_found' });

    let nextChildIds: number[] | null = null;
    if (userIds !== undefined) {
      nextChildIds = normalizeChildIds(userIds);
      if (!nextChildIds) return reply.code(400).send({ error: 'invalid_input', detail: '孩子不存在' });
    }

    const nextFreq = freq ?? rule.freq;
    // 频率切换时清掉不适用的字段；空数组等同未设置（历史 400 的根因）
    const nextWeekdays = nextFreq === 'weekly'
      ? (weekdays !== undefined && weekdays !== null ? weekdays : (rule.freq === 'weekly' ? (rule.weekdays ?? '').split(',').map(Number).filter(Boolean) : []))
      : [];
    const nextMonthdays = nextFreq === 'monthly'
      ? (monthdays !== undefined && monthdays !== null ? monthdays : (rule.freq === 'monthly' ? (rule.monthdays ?? '').split(',').map(Number).filter(Boolean) : []))
      : [];

    if (nextFreq === 'weekly' && nextWeekdays.length === 0) {
      return reply.code(400).send({ error: 'invalid_input', detail: '每周重复需选择星期' });
    }
    if (nextFreq === 'monthly' && nextMonthdays.length === 0) {
      return reply.code(400).send({ error: 'invalid_input', detail: '每月重复需选择日期' });
    }

    db.prepare(`
      UPDATE recurring_tasks SET
        name = COALESCE(?, name),
        description = ?,
        points = COALESCE(?, points),
        user_id = COALESCE(?, user_id),
        user_ids = COALESCE(?, user_ids),
        freq = ?,
        weekdays = ?,
        monthdays = ?,
        time_of_day = ?,
        due_hours = ?,
        active = ?
      WHERE id = ?
    `).run(
      name ?? null,
      description === undefined ? rule.description : description, // 允许清空描述
      points ?? null,
      nextChildIds ? nextChildIds[0] : null,
      nextChildIds ? nextChildIds.join(',') : null,
      nextFreq,
      nextWeekdays.length > 0 ? nextWeekdays.join(',') : null,
      nextMonthdays.length > 0 ? nextMonthdays.join(',') : null,
      timeOfDay === undefined ? rule.time_of_day : timeOfDay, // 允许清空为「不限时」
      dueHours === undefined ? rule.due_hours : dueHours,      // 允许清空为「无截止」；只影响之后的新一期
      active === undefined ? rule.active : (active ? 1 : 0),
      id,
    );

    // 编辑后立即按新配置检查一次（例如刚把时间改成已过的时刻 → 立刻补发今天这期）。
    // 同样只统计本模板的新增数。
    const row = db.prepare(`
      SELECT r.*, u.name as user_name, u.avatar as user_avatar
      FROM recurring_tasks r JOIN users u ON u.id = r.user_id WHERE r.id = ?
    `).get(id) as any;
    const generated = issueTemplate(row as RecurringRule, localDateKey(), false);

    return { ok: true, generated, rule: ruleView(row) };
  });

  // 家长：删除模板（已生成的任务保留，随 recurring_id 置空变普通任务）
  app.delete('/recurring-tasks/:id', { preHandler: requireParent }, async (req) => {
    const id = Number((req.params as any).id);
    const db = getDb();
    db.prepare('DELETE FROM recurring_issued WHERE recurring_id = ?').run(id);
    db.prepare('DELETE FROM recurring_tasks WHERE id = ?').run(id);
    return { ok: true };
  });

  // 家长：手动补发（自动调度漏掉时点一下；忽略发布时刻与星期判定，幂等，
  // 同一天同孩子不会重复生成。暂停中的模板不补发。）
  app.post('/recurring-tasks/:id/run', { preHandler: requireParent }, async (req, reply) => {
    const id = Number((req.params as any).id);
    const db = getDb();
    const rule = db.prepare('SELECT * FROM recurring_tasks WHERE id = ?').get(id) as any;
    if (!rule) return reply.code(404).send({ error: 'not_found' });

    // 手动补发是「本期作废」（家长删了实例）后唯一的恢复出口：先清当日凭证再发。
    // 若实例仍在，insertTaskForChild 的实例查重依旧拦住，幂等不变。
    const today = localDateKey();
    db.prepare('DELETE FROM recurring_issued WHERE recurring_id = ? AND period_key = ?').run(id, today);
    const generated = issueTemplate(rule as RecurringRule, today, true);
    return { ok: true, generated, already: generated === 0 };
  });
}
