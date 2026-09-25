import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { requireChild, requireParent } from '../middleware.js';
import { isUnlimitedStock } from '../sentinels.js';
import { getCashRate } from './products.js';
import { pushToUser, pushToParents } from '../ws.js';
import { fireNotify } from '../notify.js';
import { clampLimit, clampOffset } from '../pagination.js';

// 分页兜底统一在 pagination.ts（此前这里有一份私有实现，pets.ts / point-logs.ts /
// adhoc-tasks.ts 各写了另一份，行为并不一致）

const createProductExchangeSchema = z.object({
  type: z.literal('product'),
  productId: z.number().int().positive(),
});

const createCashExchangeSchema = z.object({
  type: z.literal('cash'),
  points: z.number().int().positive(),
});

const rejectSchema = z.object({
  reason: z.string().min(1).max(100),
});

/** 该孩子已被 pending 申请占用的积分（兑换审核通过才真正扣分，
 *  提交新申请时必须把未审核的占用算进去，否则余额 10 分能同时提两份 10 分申请） */
function pendingCommitted(db: any, uid: number): number {
  const row = db.prepare(
    "SELECT COALESCE(SUM(points), 0) as s FROM exchange_requests WHERE user_id = ? AND status = 'pending'"
  ).get(uid) as { s: number };
  return row.s ?? 0;
}

/** 该商品已被 pending 申请占用的库存份数。
 *
 *  商品库存只在「审核通过」时才真正扣减，而提交申请时不占位 —— 于是库存 1 的商品
 *  可以同时收到 N 份 pending 申请，家长依次点通过时每一份都能通过（扣减语句带
 *  `stock > 0`，第二份起其实是静默失败），结果是超卖、并且每个孩子都被扣了分。
 *  提交时把 pending 占位算进可售库存即可消除该窗口。 */
function pendingReservedStock(db: any, productId: number): number {
  const row = db.prepare(
    "SELECT COUNT(*) as c FROM exchange_requests WHERE product_id = ? AND type = 'product' AND status = 'pending'"
  ).get(productId) as { c: number };
  return row.c ?? 0;
}

export function registerExchangeRequestsRoutes(app: FastifyInstance) {
  // 小孩：提交兑换申请（家长不可调用——否则可自提自审）
  app.post('/exchange-requests', { preHandler: requireChild }, async (req, reply) => {
    const uid = req.user!.sub;
    const body = req.body as any;

    if (body?.type === 'product') {
      const parsed = createProductExchangeSchema.safeParse(body);
      if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
      const { productId } = parsed.data;

      const db = getDb();
      // 事务：校验商品+库存+积分余额，写入申请
      let prodResult: any;
      try {
        const txn = db.transaction(() => {
          const product = db.prepare("SELECT * FROM products WHERE id = ? AND status = 'active'").get(productId) as any;
          if (!product) throw new Error('product_not_found');
          // 不限量（stock = -1）时跳过；其余情况必须扣除已被 pending 申请占位的份数后再判断，
          // 否则库存 1 的商品能同时收到 N 份 pending，家长逐个点通过时每份都"成功"→ 超卖。
          if (!isUnlimitedStock(product.stock) && product.stock - pendingReservedStock(db, productId) <= 0) {
            throw new Error('out_of_stock');
          }

          const user = db.prepare('SELECT * FROM users WHERE id = ?').get(uid) as any;
          if (user.total_points - pendingCommitted(db, uid) < product.cost) throw new Error('insufficient_points');

          const r = db.prepare(`
            INSERT INTO exchange_requests (user_id, type, product_id, points, amount, status)
            VALUES (?, 'product', ?, ?, 0, 'pending')
          `).run(uid, productId, product.cost);
          prodResult = { id: Number(r.lastInsertRowid), points: product.cost, productName: product.name, product_id: productId };
        });
        txn();
        // 推送给所有家长：商品兑换申请（与现金兑换保持一致）
        const childName = (db.prepare('SELECT name FROM users WHERE id = ?').get(uid) as any)?.name;
        pushToParents({
          type: 'new_exchange_request',
          requestId: prodResult.id,
          userId: uid,
          userName: childName,
          exchangeType: 'product',
          productId: prodResult.product_id,
          productName: prodResult.productName,
          points: prodResult.points,
        });
        // 外部通知渠道（ntfy/Gotify/企业微信）：失败不影响主流程
        fireNotify('🛒 新的兑换申请', `${childName ?? '孩子'} 申请兑换「${prodResult.productName}」，消耗 ${prodResult.points} 积分，请到审核页处理。`);
        return prodResult;
      } catch (e: any) {
        const msg = e.message;
        if (msg === 'product_not_found') return reply.code(404).send({ error: msg });
        if (msg === 'out_of_stock') return reply.code(409).send({ error: msg });
        if (msg === 'insufficient_points') return reply.code(409).send({ error: msg });
        throw e;
      }
    }

    if (body?.type === 'cash') {
      const parsed = createCashExchangeSchema.safeParse(body);
      if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
      const cashPoints: number = parsed.data.points;
      const cashRate = getCashRate();
      if (cashPoints % cashRate !== 0) return reply.code(400).send({ error: 'invalid_input', detail: `积分必须是 ${cashRate} 的倍数` });
      const amount = cashPoints / cashRate;

      const db = getDb();
      let cashResult: any;
      try {
        const txn = db.transaction(() => {
          const user = db.prepare('SELECT * FROM users WHERE id = ?').get(uid) as any;
          if (user.total_points - pendingCommitted(db, uid) < cashPoints) throw new Error('insufficient_points');
          const r = db.prepare(`
            INSERT INTO exchange_requests (user_id, type, points, amount, status)
            VALUES (?, 'cash', ?, ?, 'pending')
          `).run(uid, cashPoints, amount);
          cashResult = { id: Number(r.lastInsertRowid), points: cashPoints, amount };
        });
        txn();
        // 推送给所有家长：现金兑换申请
        const childName = (db.prepare('SELECT name FROM users WHERE id = ?').get(uid) as any)?.name;
        pushToParents({
          type: 'new_exchange_request',
          requestId: cashResult.id,
          userId: uid,
          userName: childName,
          exchangeType: 'cash',
          amount: cashResult.amount,
          points: cashResult.points,
        });
        fireNotify('💰 新的现金兑换申请', `${childName ?? '孩子'} 申请兑换现金 ¥${cashResult.amount}（${cashResult.points} 积分），请到审核页处理。`);
        return cashResult;
      } catch (e: any) {
        if (e.message === 'insufficient_points') return reply.code(409).send({ error: e.message });
        throw e;
      }
    }

    return reply.code(400).send({ error: 'invalid_type' });
  });

  // 小孩：查看自己的兑换记录（分页：默认 100 条，防止单次全量拉取越滚越长）
  app.get('/exchange-requests/mine', async (req) => {
    const db = getDb();
    const uid = req.user!.sub;
    const limit = clampLimit((req.query as any)?.limit, 100);
    const offset = clampOffset((req.query as any)?.offset);
    const list = db.prepare(`
      SELECT e.*, p.name as product_name, p.icon as product_icon
      FROM exchange_requests e
      LEFT JOIN products p ON p.id = e.product_id
      WHERE e.user_id = ?
      ORDER BY e.created_at DESC, e.id DESC
      LIMIT ? OFFSET ?
    `).all(uid, limit, offset);
    const total = (db.prepare('SELECT COUNT(*) as c FROM exchange_requests WHERE user_id = ?').get(uid) as any).c;
    return { requests: list, total };
  });

  // 家长：审核列表（按状态过滤；已通过/已拒绝会持续积累，同样分页）
  app.get('/exchange-requests', { preHandler: requireParent }, async (req) => {
    const db = getDb();
    const status = (req.query as any)?.status ?? 'pending';
    const limit = clampLimit((req.query as any)?.limit, 100);
    const offset = clampOffset((req.query as any)?.offset);
    const list = db.prepare(`
      SELECT e.*, u.name as user_name, u.avatar as user_avatar, p.name as product_name, p.icon as product_icon
      FROM exchange_requests e
      JOIN users u ON u.id = e.user_id
      LEFT JOIN products p ON p.id = e.product_id
      WHERE e.status = ?
      ORDER BY e.created_at DESC, e.id DESC
      LIMIT ? OFFSET ?
    `).all(status, limit, offset);
    const total = (db.prepare('SELECT COUNT(*) as c FROM exchange_requests WHERE status = ?').get(status) as any).c;
    return { requests: list, total };
  });

  // 家长：通过审核
  app.post('/exchange-requests/:id/approve', { preHandler: requireParent }, async (req, reply) => {
    const id = Number((req.params as any).id);
    const db = getDb();

    try {
      let newBalance: number | null = null;
      const txn = db.transaction(() => {
        const req0 = db.prepare('SELECT * FROM exchange_requests WHERE id = ?').get(id) as any;
        if (!req0) throw new Error('not_found');
        if (req0.status !== 'pending') throw new Error('already_reviewed');

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req0.user_id) as any;
        if (user.total_points < req0.points) throw new Error('insufficient_points');

        // 扣积分
        db.prepare('UPDATE users SET total_points = total_points - ? WHERE id = ?').run(req0.points, req0.user_id);
        // 写流水
        db.prepare(`
          INSERT INTO point_logs (user_id, delta, source, ref_id, ref_type, note, created_by)
          VALUES (?, ?, 'exchange', ?, 'exchange_request', ?, ?)
        `).run(
          req0.user_id, -req0.points, req0.id,
          req0.type === 'cash' ? `兑换现金 ${req0.amount}元` : `兑换商品：${(db.prepare('SELECT name FROM products WHERE id = ?').get(req0.product_id) as any)?.name ?? '已删除'}`,
          req.user!.sub,
        );
        // 更新申请状态
        db.prepare('UPDATE exchange_requests SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?')
          .run('approved', req.user!.sub, Math.floor(Date.now() / 1000), id);
        // 减库存：不限量时不动；否则必须扣减成功，
        // 扣减影响行数为 0 说明库存已被别的申请吃掉（例如家长在别处改了库存），此时整笔事务回滚。
        if (req0.type === 'product' && req0.product_id) {
          const stockRow = db.prepare('SELECT stock FROM products WHERE id = ?').get(req0.product_id) as any;
          if (stockRow && !isUnlimitedStock(stockRow.stock)) {
            const dec = db.prepare('UPDATE products SET stock = stock - 1 WHERE id = ? AND stock > 0').run(req0.product_id);
            if (dec.changes === 0) throw new Error('out_of_stock');
          }
        }

        newBalance = (db.prepare('SELECT total_points FROM users WHERE id = ?').get(req0.user_id) as any).total_points;
      });
      txn();
      // 推送给小孩：审核通过
      const req0After = db.prepare('SELECT * FROM exchange_requests WHERE id = ?').get(id) as any;
      pushToUser(req0After.user_id, {
        type: 'exchange_reviewed',
        requestId: id,
        status: 'approved',
        exchangeType: req0After.type,
        points: req0After.points,
        amount: req0After.amount,
        productName: req0After.type === 'product'
          ? (db.prepare('SELECT name FROM products WHERE id = ?').get(req0After.product_id) as any)?.name
          : null,
        newBalance,
      });
      return { ok: true, newBalance };
    } catch (e: any) {
      const msg = e.message;
      if (msg === 'not_found') return reply.code(404).send({ error: msg });
      if (msg === 'already_reviewed') return reply.code(409).send({ error: msg });
      if (msg === 'insufficient_points') return reply.code(409).send({ error: msg });
      if (msg === 'out_of_stock') return reply.code(409).send({ error: msg });
      throw e;
    }
  });

  // 家长：拒绝审核
  app.post('/exchange-requests/:id/reject', { preHandler: requireParent }, async (req, reply) => {
    const id = Number((req.params as any).id);
    const parsed = rejectSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });

    const db = getDb();
    const r = db.prepare(`
      UPDATE exchange_requests
      SET status = 'rejected', reason = ?, reviewed_by = ?, reviewed_at = ?
      WHERE id = ? AND status = 'pending'
    `).run(parsed.data.reason, req.user!.sub, Math.floor(Date.now() / 1000), id);
    if (r.changes === 0) return reply.code(409).send({ error: 'already_reviewed' });
    // 推送给小孩：审核拒绝
    const req0 = db.prepare('SELECT * FROM exchange_requests WHERE id = ?').get(id) as any;
    pushToUser(req0.user_id, {
      type: 'exchange_reviewed',
      requestId: id,
      status: 'rejected',
      exchangeType: req0.type,
      points: req0.points,
      amount: req0.amount,
      reason: parsed.data.reason,
      productName: req0.type === 'product'
        ? (db.prepare('SELECT name FROM products WHERE id = ?').get(req0.product_id) as any)?.name
        : null,
    });
    return { ok: true };
  });
}
