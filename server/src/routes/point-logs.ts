import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/index.js';
import { requireParent } from '../middleware.js';
import { parsePage } from '../pagination.js';

export function registerPointLogsRoutes(app: FastifyInstance) {
  // 家长查所有记录
  app.get('/point-logs', { preHandler: requireParent }, async (req) => {
    const db = getDb();
    const userId = (req.query as any)?.userId ? Number((req.query as any).userId) : null;
    // 此前这里是 `Math.min(Number(raw ?? 50), 200)`：raw 传了非数字（如 ?limit=abc）时
    // Number 得到 NaN，Math.min(NaN, 200) 还是 NaN，直接绑进 LIMIT 会让
    // better-sqlite3 抛 TypeError。统一到 parsePage 后非法值一律回落默认页大小。
    const { limit, offset } = parsePage(req.query);

    const sql = userId
      ? `SELECT pl.*, u.name as user_name, creator.name as creator_name
         FROM point_logs pl
         JOIN users u ON pl.user_id = u.id
         LEFT JOIN users creator ON pl.created_by = creator.id
         WHERE pl.user_id = ?
         ORDER BY pl.created_at DESC, pl.id DESC
         LIMIT ? OFFSET ?`
      : `SELECT pl.*, u.name as user_name, creator.name as creator_name
         FROM point_logs pl
         JOIN users u ON pl.user_id = u.id
         LEFT JOIN users creator ON pl.created_by = creator.id
         ORDER BY pl.created_at DESC, pl.id DESC
         LIMIT ? OFFSET ?`;

    const rows = userId
      ? db.prepare(sql).all(userId, limit, offset)
      : db.prepare(sql).all(limit, offset);

    // 总条数（同样按筛选条件），供前端翻页
    const count = userId
      ? (db.prepare('SELECT COUNT(*) as c FROM point_logs WHERE user_id = ?').get(userId) as any).c
      : (db.prepare('SELECT COUNT(*) as c FROM point_logs').get() as any).c;

    return { logs: rows, total: count };
  });

  // 小孩查自己记录
  app.get('/point-logs/me', async (req) => {
    const db = getDb();
    const { limit, offset } = parsePage(req.query);

    const logs = db.prepare(`
      SELECT pl.*, creator.name as creator_name
      FROM point_logs pl
      LEFT JOIN users creator ON pl.created_by = creator.id
      WHERE pl.user_id = ?
      ORDER BY pl.created_at DESC, pl.id DESC
      LIMIT ? OFFSET ?
    `).all(req.user!.sub, limit, offset);

    const total = (db.prepare('SELECT COUNT(*) as c FROM point_logs WHERE user_id = ?').get(req.user!.sub) as any).c;

    return { logs, total };
  });
}
