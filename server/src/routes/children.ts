import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { isValidPin, hashPin, pinLookup } from '../auth.js';
import { requireParent } from '../middleware.js';
import { isValidAvatar, HUMATION_MAX_LENGTH } from '../avatar.js';

// 头像：生肖 key 或 'hum1:' 自定义形象规格（结构校验见 avatar.ts）
const avatarSchema = z
  .string()
  .min(1)
  .max(HUMATION_MAX_LENGTH)
  .refine(isValidAvatar, 'invalid_avatar');

// 性别：决定孩子端的主题配色（male=晴空蓝 / female=粉），读取端一律以 `?? 'female'` 兜底
const genderSchema = z.enum(['male', 'female']);

const createChildSchema = z.object({
  name: z.string().min(1).max(20),
  pin: z.string().refine(isValidPin, 'PIN必须是4-6位数字'),
  avatar: avatarSchema,
  // 家长端新增时默认选中「男生」；缺省取同值，老客户端不传该字段也不会 400
  gender: genderSchema.default('male'),
});

const updateChildSchema = z.object({
  name: z.string().min(1).max(20).optional(),
  pin: z.string().refine(isValidPin).optional(),
  avatar: avatarSchema.optional(),
  gender: genderSchema.optional(),
});

export function registerChildrenRoutes(app: FastifyInstance) {
  // 列出所有小孩（家长）
  app.get('/children', { preHandler: requireParent }, async () => {
    const db = getDb();
    const children = db.prepare(
      `SELECT id, name, avatar, gender, total_points, created_at
       FROM users WHERE role = 'child' ORDER BY total_points DESC, id ASC`
    ).all();
    return { children };
  });

  // 创建小孩（家长）
  app.post('/children', { preHandler: requireParent }, async (req, reply) => {
    const parsed = createChildSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input', details: parsed.error.flatten() });
    const { name, pin, avatar, gender } = parsed.data;

    const db = getDb();
    // 检查 PIN 唯一性（用指纹列比较，bcrypt 哈希无法等值比较）
    const exists = db.prepare('SELECT id FROM users WHERE pin_lookup = ? AND role = ?').get(pinLookup(pin), 'child');
    if (exists) return reply.code(409).send({ error: 'pin_used' });

    const result = db.prepare(
      'INSERT INTO users (name, role, pin, pin_lookup, avatar, gender, total_points) VALUES (?, ?, ?, ?, ?, ?, 0)'
    ).run(name, 'child', hashPin(pin), pinLookup(pin), avatar, gender);

    return { id: result.lastInsertRowid, name, avatar, gender };
  });

  // 更新小孩
  app.patch('/children/:id', { preHandler: requireParent }, async (req, reply) => {
    const id = Number((req.params as any).id);
    const parsed = updateChildSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });

    const db = getDb();
    const current = db.prepare('SELECT * FROM users WHERE id = ? AND role = ?').get(id, 'child') as any;
    if (!current) return reply.code(404).send({ error: 'not_found' });

    const updates = parsed.data;
    if (updates.pin && pinLookup(updates.pin) !== current.pin_lookup) {
      const conflict = db.prepare('SELECT id FROM users WHERE pin_lookup = ? AND id != ?').get(pinLookup(updates.pin), id);
      if (conflict) return reply.code(409).send({ error: 'pin_used' });
    }

    db.prepare(`
      UPDATE users SET
        name = COALESCE(?, name),
        pin = COALESCE(?, pin),
        pin_lookup = COALESCE(?, pin_lookup),
        avatar = COALESCE(?, avatar),
        gender = COALESCE(?, gender)
      WHERE id = ?
    `).run(
      updates.name ?? null,
      updates.pin ? hashPin(updates.pin) : null,
      updates.pin ? pinLookup(updates.pin) : null,
      updates.avatar ?? null,
      updates.gender ?? null,
      id
    );

    return { ok: true };
  });

  // 删除小孩（事务级联清理所有关联数据）
  app.delete('/children/:id', { preHandler: requireParent }, async (req, reply) => {
    const id = Number((req.params as any).id);
    const db = getDb();

    const current = db.prepare('SELECT id FROM users WHERE id = ? AND role = ?').get(id, 'child');
    if (!current) return reply.code(404).send({ error: 'not_found' });

    // 显式按依赖顺序删除，兼容旧库中 ALTER 添加、无 FK 约束的字段
    const cleanup = db.transaction((childId: number) => {
      // 任务完成申请（该小孩提交的，以及属于该小孩任务的）
      db.prepare(`
        DELETE FROM task_completions
        WHERE user_id = ? OR task_id IN (SELECT id FROM adhoc_tasks WHERE user_id = ?)
      `).run(childId, childId);
      // 临时任务
      db.prepare('DELETE FROM adhoc_tasks WHERE user_id = ?').run(childId);
      // 兑换申请
      db.prepare('DELETE FROM exchange_requests WHERE user_id = ?').run(childId);
      // 积分流水
      db.prepare('DELETE FROM point_logs WHERE user_id = ?').run(childId);
      // 日常完成记录
      db.prepare('DELETE FROM daily_completions WHERE user_id = ?').run(childId);
      // 该小孩的专属积分项
      db.prepare('DELETE FROM point_items WHERE owner_id = ?').run(childId);
      // 账号本体
      db.prepare("DELETE FROM users WHERE id = ? AND role = 'child'").run(childId);
    });

    cleanup(id);
    return { ok: true };
  });
}
