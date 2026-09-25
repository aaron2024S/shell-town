import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { requireParent } from '../middleware.js';
import { pushToParents, pushToUser } from '../ws.js';
import { fireNotify } from '../notify.js';
import { parsePage, DEFAULT_PAGE_SIZE } from '../pagination.js';

/**
 * 孩子端「我的任务」只展示最近这段时间内发布的任务。
 *
 * 为什么需要：任务一旦没有截止时间（发布时勾了「不需要」），`expireDueTasks` 就永远
 * 碰不到它，"进行中"列表会一直累积。它是**待办清单**不是历史记录，翻页体验很别扭，
 * 所以这里不接分页，改为按发布时间开一个窗口 —— 超过窗口的待办本来就该重新发一次。
 *
 * 与保留策略（retention.ts）是两回事，故意不复用同一个配置：
 * 前者管"数据留多久"，这里管"待办列多长"，语义不同，绑在一起会互相牵制。
 */
const MINE_WINDOW_DAYS = 90;

// 新版任务系统：一个任务对应一个小孩，多选生成多条独立任务
// description / deadline 允许 null：前端「没填 / 不需要」时就是发 null（不带 .nullable()
// 会 400 Unexpected/Expected ... received null），store 时统一落 NULL
const createTaskSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).nullable().optional(),
  points: z.number().int().positive(),
  deadline: z.number().int().positive().nullable().optional(),
  assigneeIds: z.array(z.number().int().positive()).min(1),
});

const updateTaskSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).nullable().optional(),
  points: z.number().int().positive().optional(),
  deadline: z.number().int().positive().nullable().optional(),
  // 改派：一条任务只属于一个孩子。此前编辑接口不支持改派，前端编辑弹窗干脆
  // 不渲染「选择小朋友」，用户以为能改、实际改了也没提交。
  userId: z.number().int().positive().optional(),
});

export function registerAdhocTasksRoutes(app: FastifyInstance) {
  // 家长：发布任务（多选小孩 → 生成多条独立任务）
  app.post('/adhoc-tasks', { preHandler: requireParent }, async (req, reply) => {
    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input', details: parsed.error.flatten() });
    const { name, description, points, deadline, assigneeIds } = parsed.data;

    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    const insertStmt = db.prepare(`
      INSERT INTO adhoc_tasks (name, description, category, points, deadline, user_id, created_by, created_at)
      VALUES (?, ?, '其他', ?, ?, ?, ?, ?)
    `);

    const txn = db.transaction(() => {
      for (const uid of assigneeIds) {
        insertStmt.run(name, description ?? null, points, deadline ?? null, uid, req.user!.sub, now);
      }
    });
    txn();

    return { ok: true, count: assigneeIds.length };
  });

  // 家长：任务列表（按状态分类，分页）
  app.get('/adhoc-tasks', { preHandler: requireParent }, async (req) => {
    const db = getDb();
    const status = (req.query as any)?.status ?? 'active';
    const { limit, offset } = parsePage(req.query);
    const now = Math.floor(Date.now() / 1000);

    let where = '';
    const params: any[] = [];
    if (status === 'active') {
      // 进行中：未过截止的 active 任务。
      // 已到截止的两个例外都不算「进行中」：还没轮到调度器清扫的（最长 60 秒窗口）、
      // 以及到了截止但有待审核完成申请的（expireDueTasks 会特意跳过它们）
      where = `WHERE t.status = 'active' AND (t.deadline IS NULL OR t.deadline > ?)`;
      params.push(now);
    } else if (status === 'expired') {
      // 已超时，三种都要能看到，否则任务会在「进行中」和「已超时」两个 tab 里同时消失：
      //   a) 已被调度器清扫落库的（status 已是 expired）
      //   b) 到了截止但还没轮到清扫的（≤60 秒窗口，status 仍是 active）
      //   c) 到了截止但有待审核申请的 —— 清扫刻意跳过，等家长审完再收敛
      where = `WHERE (t.status = 'expired'
          OR (t.status = 'active' AND t.deadline IS NOT NULL AND t.deadline <= ?))`;
      params.push(now);
    } else {
      // completed：已通过审核
      where = `WHERE t.status = 'completed'`;
    }

    const tasks = db.prepare(`
      SELECT t.id, t.name, t.description, t.points, t.deadline, t.status, t.created_at, t.completed_at,
        t.user_id, u.name as user_name, u.avatar as user_avatar,
        (SELECT status FROM task_completions WHERE task_id = t.id ORDER BY created_at DESC LIMIT 1) as completion_status
      FROM adhoc_tasks t
      JOIN users u ON u.id = t.user_id
      ${where}
      ORDER BY t.created_at DESC, t.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as any[];

    // 补充完成申请信息
    for (const t of tasks) {
      t.pending_completion = db.prepare(`
        SELECT id, created_at FROM task_completions WHERE task_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1
      `).get(t.id) as any;
    }

    // 总数与上面 where/params 用同一套条件 —— 两处条件写岔了会出现
    // 「翻到第 2 页却显示共 1 页」这类分页条与内容对不上的毛病。
    const total = (db.prepare(`
      SELECT COUNT(*) as c FROM adhoc_tasks t ${where}
    `).get(...params) as any).c;

    return { tasks, total };
  });

  // 家长：编辑任务
  app.patch('/adhoc-tasks/:id', { preHandler: requireParent }, async (req, reply) => {
    const id = Number((req.params as any).id);
    const parsed = updateTaskSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const { name, description, points, deadline, userId } = parsed.data;

    const db = getDb();
    const task = db.prepare('SELECT * FROM adhoc_tasks WHERE id = ?').get(id) as any;
    if (!task) return reply.code(404).send({ error: 'not_found' });
    if (task.status === 'completed') return reply.code(409).send({ error: 'already_completed' });

    // 改派：校验目标是小孩，且已有待审核/已通过的完成申请时不允许改派
    // （否则那条申请会挂到别的孩子名下）
    let nextUserId: number | null = null;
    if (userId !== undefined && userId !== task.user_id) {
      const kid = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'child'").get(userId);
      if (!kid) return reply.code(400).send({ error: 'invalid_input', detail: '孩子不存在' });
      const used = db.prepare(
        "SELECT 1 FROM task_completions WHERE task_id = ? AND status IN ('pending', 'approved') LIMIT 1",
      ).get(id);
      if (used) return reply.code(409).send({ error: 'has_completion', detail: '该任务已有完成申请，不能改派' });
      nextUserId = userId;
    }

    // description / deadline 用「显式语义」而非 COALESCE：
    //   不传（undefined）= 保留原值；传 null = 清空
    // 前端编辑时「描述留空 / 取消截止时间」发的就是 null，用 COALESCE 会静默保留旧值（清不掉）
    db.prepare(`
      UPDATE adhoc_tasks SET
        name = COALESCE(?, name),
        description = ?,
        points = COALESCE(?, points),
        deadline = ?,
        user_id = COALESCE(?, user_id)
      WHERE id = ?
    `).run(
      name ?? null,
      description === undefined ? task.description : description,
      points ?? null,
      deadline === undefined ? task.deadline : deadline,
      nextUserId,
      id,
    );

    return { ok: true };
  });

  // 家长：删除任务
  app.delete('/adhoc-tasks/:id', { preHandler: requireParent }, async (req) => {
    const id = Number((req.params as any).id);
    const db = getDb();
    db.prepare('DELETE FROM adhoc_tasks WHERE id = ?').run(id);
    return { ok: true };
  });

  // 小孩端：我的任务列表
  // 只返回「还该出现在孩子列表里」的任务：未过截止的，加上到期但已提交待审核的。
  // 到期且没有待审核申请的任务会被 expireDueTasks 落库为 expired，这里自然就不再返回
  // —— 即「到期后自动从任务列表移除」。所以过滤条件必须与清扫的排除规则保持一致，
  // 否则会出现「清扫不动它、列表也不显示它」的消失盲区。
  //
  // created_at 窗口（MINE_WINDOW_DAYS）：兜住「没有截止时间」的任务 —— 它们永远不会
  // 到期，是唯一能在这个列表里无限累积的类型。窗口只作用于孩子端展示，
  // 家长端「进行中」tab 仍能看到全部未结束任务（那里有分页，也有删除按钮）。
  app.get('/adhoc-tasks/mine', async (req) => {
    const db = getDb();
    const uid = req.user!.sub;
    const now = Math.floor(Date.now() / 1000);
    const since = now - MINE_WINDOW_DAYS * 86400;

    const tasks = db.prepare(`
      SELECT t.id, t.name, t.description, t.points, t.deadline, t.status, t.created_at,
        (SELECT status FROM task_completions WHERE task_id = t.id ORDER BY created_at DESC LIMIT 1) as completion_status,
        (SELECT reason FROM task_completions WHERE task_id = t.id AND status = 'rejected' ORDER BY created_at DESC LIMIT 1) as completion_reason
      FROM adhoc_tasks t
      WHERE t.user_id = ?
        AND t.status = 'active'
        AND t.created_at >= ?
        AND (t.deadline IS NULL OR t.deadline > ?
             OR EXISTS (SELECT 1 FROM task_completions
                        WHERE task_id = t.id AND status = 'pending'))
      ORDER BY t.created_at DESC, t.id DESC
    `).all(uid, since, now) as any[];

    // 计算显示状态
    for (const t of tasks) {
      if (t.completion_status === 'approved') {
        t.display_status = 'completed';
      } else if (t.completion_status === 'pending') {
        // 待审核判定要放在「已超时」之前：能留在列表里的过期任务必定带着待审核申请，
        // 先判 expired 会让孩子看到「已超时」而实际是「等你家长审」，语义是错的。
        t.display_status = 'pending';
      } else if (t.deadline && now > t.deadline) {
        // 只剩 ≤60 秒的清扫窗口：任务刚过截止、调度器还没来得及落库
        t.display_status = 'expired';
      } else {
        t.display_status = 'active';
      }
    }

    return { tasks };
  });

  // 小孩端：提交完成申请（直接提交，无需接受）
  app.post('/adhoc-tasks/:id/submit-completion', async (req, reply) => {
    const id = Number((req.params as any).id);
    const db = getDb();
    const uid = req.user!.sub;

    const task = db.prepare('SELECT * FROM adhoc_tasks WHERE id = ? AND user_id = ?').get(id, uid) as any;
    if (!task) return reply.code(404).send({ error: 'not_found' });
    if (task.status !== 'active') return reply.code(409).send({ error: 'not_active' });

    // 检查是否已有完成申请
    const existing = db.prepare('SELECT status FROM task_completions WHERE task_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1').get(id, uid) as any;
    if (existing) {
      if (existing.status === 'pending') return reply.code(409).send({ error: 'already_pending' });
      if (existing.status === 'approved') return reply.code(409).send({ error: 'already_approved' });
      // rejected 可以重新提交
      db.prepare('DELETE FROM task_completions WHERE task_id = ? AND user_id = ? AND status = ?').run(id, uid, 'rejected');
    }

    db.prepare('INSERT INTO task_completions (task_id, user_id) VALUES (?, ?)').run(id, uid);

    // 推送给家长
    const child = db.prepare('SELECT name FROM users WHERE id = ?').get(uid) as any;
    pushToParents({ type: 'task_completion_submitted', taskId: id, userId: uid, userName: child?.name, taskName: task.name });
    // 外部通知渠道（ntfy/Gotify/企业微信）：失败不影响主流程
    fireNotify('📋 任务完成待审核', `${child?.name ?? '孩子'} 提交了任务「${task.name}」的完成申请，请到审核页处理。`);

    return { ok: true };
  });

  // 家长端：审核任务完成申请列表（分页）
  app.get('/adhoc-tasks/completions', { preHandler: requireParent }, async (req) => {
    const db = getDb();
    const status = (req.query as any)?.status ?? 'pending';
    // 默认页大小走统一契约（此前这里默认 200 —— 前端虽然每次都传 20，
    // 但任何忘了传的调用方都会一次性拿到 200 条）
    const { limit, offset } = parsePage(req.query, DEFAULT_PAGE_SIZE);

    const rows = db.prepare(`
      SELECT tc.id, tc.task_id, tc.user_id, tc.status, tc.reason, tc.created_at, tc.reviewed_at,
        t.name as task_name, t.points as task_points,
        u.name as user_name, u.avatar as user_avatar
      FROM task_completions tc
      JOIN adhoc_tasks t ON t.id = tc.task_id
      JOIN users u ON u.id = tc.user_id
      WHERE tc.status = ?
      ORDER BY tc.created_at DESC, tc.id DESC
      LIMIT ? OFFSET ?
    `).all(status, limit, offset) as any[];

    const total = (db.prepare('SELECT COUNT(*) as c FROM task_completions WHERE status = ?').get(status) as any).c;

    return { completions: rows, total };
  });

  // 家长端：通过任务完成申请（加积分）
  app.post('/adhoc-tasks/completions/:id/approve', { preHandler: requireParent }, async (req, reply) => {
    const id = Number((req.params as any).id);
    const db = getDb();

    const tc = db.prepare(`
      SELECT tc.*, t.name as task_name, t.points as task_points
      FROM task_completions tc
      JOIN adhoc_tasks t ON t.id = tc.task_id
      WHERE tc.id = ?
    `).get(id) as any;
    if (!tc) return reply.code(404).send({ error: 'not_found' });

    const now = Math.floor(Date.now() / 1000);
    let alreadyReviewed = false;
    // 状态检查放进事务：写在事务外时靠 better-sqlite3 的同步驱动"碰巧"安全，
    // 换成异步驱动/多实例后，两个家长同时点通过会各读到 pending，导致积分加两次。
    const txn = db.transaction(() => {
      const upd = db.prepare(`
        UPDATE task_completions SET status = 'approved', reviewed_by = ?, reviewed_at = ?
        WHERE id = ? AND status = 'pending'
      `).run(req.user!.sub, now, id);
      if (upd.changes === 0) { alreadyReviewed = true; return; }

      db.prepare('UPDATE users SET total_points = total_points + ? WHERE id = ?').run(tc.task_points, tc.user_id);
      db.prepare(`
        INSERT INTO point_logs (user_id, delta, source, ref_id, ref_type, note, created_by)
        VALUES (?, ?, 'adhoc', ?, 'adhoc_task', ?, ?)
      `).run(tc.user_id, tc.task_points, tc.task_id, `任务：${tc.task_name}`, req.user!.sub);
      // 标记任务为已完成
      db.prepare('UPDATE adhoc_tasks SET status = ?, completed_at = ? WHERE id = ?').run('completed', now, tc.task_id);
    });
    txn();

    if (alreadyReviewed) return reply.code(409).send({ error: 'already_reviewed' });

    const newBalance = (db.prepare('SELECT total_points FROM users WHERE id = ?').get(tc.user_id) as any).total_points;
    pushToUser(tc.user_id, { type: 'task_review', taskId: tc.task_id, status: 'approved', points: tc.task_points });

    return { ok: true, newBalance, delta: tc.task_points };
  });

  // 家长端：拒绝任务完成申请
  app.post('/adhoc-tasks/completions/:id/reject', { preHandler: requireParent }, async (req, reply) => {
    const id = Number((req.params as any).id);
    const reason = (req.body as any)?.reason ?? '';
    const db = getDb();

    const tc = db.prepare('SELECT * FROM task_completions WHERE id = ?').get(id) as any;
    if (!tc) return reply.code(404).send({ error: 'not_found' });

    // 用带 status 条件的 UPDATE 把"检查 + 修改"合成一步原子操作，
    // 影响行数为 0 即说明已被别人处理过（等价于原先事务外的 status 预检，但没有竞态窗口）。
    const r = db.prepare(`
      UPDATE task_completions SET status = 'rejected', reason = ?, reviewed_by = ?, reviewed_at = ?
      WHERE id = ? AND status = 'pending'
    `).run(reason || null, req.user!.sub, Math.floor(Date.now() / 1000), id);
    if (r.changes === 0) return reply.code(409).send({ error: 'already_reviewed' });

    pushToUser(tc.user_id, { type: 'task_review', taskId: tc.task_id, status: 'rejected', reason });

    return { ok: true };
  });
}
