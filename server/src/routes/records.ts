import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { requireParent } from '../middleware.js';
import {
  getRetentionDays, saveRetentionDays, cleanupOldRecords,
  DEFAULT_RETENTION_DAYS,
} from '../retention.js';

/**
 * 记录管理（家长专用）：
 * - GET  /records/stats      各类记录的条数统计（总量 + 按孩子）+ 当前保留策略
 * - POST /records/clear      清空某类记录（可选只清某个孩子）
 * - PUT  /records/retention  设置自动清理的保留天数（0 = 关闭）
 * - POST /records/cleanup    立即按保留策略清理一次（手动触发，便于验证）
 *
 * 设计原则：只删「流水明细」，绝不动汇总字段
 * （users.total_points / pets 等级经验 / 申请状态），避免破坏现有账面。
 * 兑换与任务完成记录只清「已审核」的历史，pending 申请保持不动。
 */

const CLEAR_TYPES = ['point_logs', 'pet_logs', 'exchange_requests', 'task_completions'] as const;
type ClearType = (typeof CLEAR_TYPES)[number];

const clearSchema = z.object({
  type: z.enum(CLEAR_TYPES),
  userId: z.number().int().positive().optional(),
});

const retentionSchema = z.object({
  // 上限 10 年：再大就等于「不清理」了，不如直接填 0 语义清楚
  days: z.number().int().min(0).max(3650),
});

export function registerRecordsRoutes(app: FastifyInstance) {
  // 各类记录条数统计（总量 + 按孩子），供设置页展示
  app.get('/records/stats', { preHandler: requireParent }, async () => {
    const db = getDb();
    const children = db.prepare("SELECT id, name, avatar FROM users WHERE role = 'child' ORDER BY id ASC").all() as any[];

    const countAll = (table: string, extra = '') =>
      (db.prepare(`SELECT COUNT(*) as c FROM ${table} ${extra}`).get() as any).c;
    const countByUser = (table: string, userId: number, extra = '') =>
      (db.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE user_id = ? ${extra}`).get(userId) as any).c;

    const types: Record<ClearType, { total: number; byUser: Record<string, number> }> = {
      point_logs: { total: 0, byUser: {} },
      pet_logs: { total: 0, byUser: {} },
      exchange_requests: { total: 0, byUser: {} },
      task_completions: { total: 0, byUser: {} },
    };

    types.point_logs.total = countAll('point_logs');
    types.pet_logs.total = countAll('pet_logs');
    // 兑换/任务只统计可清空的历史（不含 pending）
    types.exchange_requests.total = countAll('exchange_requests', "WHERE status != 'pending'");
    types.task_completions.total = countAll('task_completions', "WHERE status != 'pending'");

    for (const c of children) {
      types.point_logs.byUser[c.id] = countByUser('point_logs', c.id);
      types.pet_logs.byUser[c.id] = countByUser('pet_logs', c.id);
      types.exchange_requests.byUser[c.id] = countByUser('exchange_requests', c.id, "AND status != 'pending'");
      types.task_completions.byUser[c.id] = countByUser('task_completions', c.id, "AND status != 'pending'");
    }

    return {
      types,
      children: children.map((c) => ({ id: c.id, name: c.name, avatar: c.avatar })),
      retentionDays: getRetentionDays(),
      defaultRetentionDays: DEFAULT_RETENTION_DAYS,
    };
  });

  // 自动清理的保留天数（0 = 关闭）。defaultRetentionDays 一并返回，
  // 前端拿它做输入框占位与"恢复默认"，省得两边各写一份 90。
  app.put('/records/retention', { preHandler: requireParent }, async (req, reply) => {
    const parsed = retentionSchema.safeParse(req.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const days = saveRetentionDays(parsed.data.days);
    return { ok: true, retentionDays: days };
  });

  // 立即按保留策略清理一次。自动清理挂在 60 秒调度器上、24 小时才真跑一次，
  // 家长改完天数想立刻看到效果（或者想验证这功能真的在干活）时就点这个。
  app.post('/records/cleanup', { preHandler: requireParent }, async () => {
    const days = getRetentionDays();
    if (days <= 0) return { ok: true, disabled: true, retentionDays: 0, deleted: 0, tables: [] };
    const tables = cleanupOldRecords();
    return {
      ok: true,
      disabled: false,
      retentionDays: days,
      deleted: tables.reduce((s, t) => s + t.deleted, 0),
      tables,
    };
  });

  // 清空某类记录（可选限定某个孩子），返回删除条数
  app.post('/records/clear', { preHandler: requireParent }, async (req, reply) => {
    const parsed = clearSchema.safeParse(req.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const { type, userId } = parsed.data;

    const db = getDb();
    let deleted = 0;

    const txn = db.transaction(() => {
      if (userId) {
        // 确认是孩子账号
        const u = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'child'").get(userId);
        if (!u) throw new Error('user_not_found');
      }
      switch (type) {
        case 'point_logs':
          deleted = Number(userId
            ? db.prepare('DELETE FROM point_logs WHERE user_id = ?').run(userId).changes
            : db.prepare('DELETE FROM point_logs').run().changes);
          break;
        case 'pet_logs':
          deleted = Number(userId
            ? db.prepare('DELETE FROM pet_logs WHERE user_id = ?').run(userId).changes
            : db.prepare('DELETE FROM pet_logs').run().changes);
          break;
        case 'exchange_requests':
          // 只清已审核历史，保留待审核申请
          deleted = Number(userId
            ? db.prepare("DELETE FROM exchange_requests WHERE user_id = ? AND status != 'pending'").run(userId).changes
            : db.prepare("DELETE FROM exchange_requests WHERE status != 'pending'").run().changes);
          break;
        case 'task_completions':
          deleted = Number(userId
            ? db.prepare("DELETE FROM task_completions WHERE user_id = ? AND status != 'pending'").run(userId).changes
            : db.prepare("DELETE FROM task_completions WHERE status != 'pending'").run().changes);
          break;
      }
    });
    try {
      txn();
    } catch (e: any) {
      if (e.message === 'user_not_found') return reply.code(404).send({ error: 'user_not_found' });
      throw e;
    }

    return { ok: true, deleted };
  });
}
