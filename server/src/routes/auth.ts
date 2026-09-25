import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { hashPassword, verifyPassword, signToken, isValidPin, verifyPin, hashPin, pinLookup } from '../auth.js';
import { config } from '../config.js';
import { requireParent } from '../middleware.js';
import { isValidAvatar, HUMATION_MAX_LENGTH } from '../avatar.js';

const parentLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const childLoginSchema = z.object({
  userId: z.number().int().positive(),
  pin: z.string().min(4).max(6),
});

// 家长更新自身信息：头像 / 账号(name) / 密码（密码留空表示不修改）
// 头像：生肖 key 或 'hum1:' 自定义形象规格（结构校验见 avatar.ts）
const updateMeSchema = z.object({
  avatar: z.string().min(1).max(HUMATION_MAX_LENGTH).refine(isValidAvatar).optional(),
  name: z.string().min(1).max(30).optional(),
  password: z.string().min(6).max(64).optional(),
});

// ---- 登录防爆破（1.6.9）：家长密码登录 + 小孩PIN登录共用 ----
// 同一 IP + 同一账号连续失败 5 次锁定 15 分钟；成功登录即清零。
// 进程内计数即可：服务重启清空不会放大风险（攻击者无法重启服务）。
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

function loginGuard(key: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  // 顺带清理早已过期的锁定记录，防止 Map 无限增长（未锁定的失败计数不动）
  for (const [k, v] of loginAttempts) {
    if (v.lockedUntil !== 0 && v.lockedUntil < now - LOGIN_LOCK_MS * 4) loginAttempts.delete(k);
  }
  const rec = loginAttempts.get(key);
  if (rec && rec.lockedUntil > now) {
    return { allowed: false, retryAfter: Math.ceil((rec.lockedUntil - now) / 1000) };
  }
  return { allowed: true, retryAfter: 0 };
}

function loginFail(key: string): void {
  const rec = loginAttempts.get(key) ?? { count: 0, lockedUntil: 0 };
  rec.count += 1;
  if (rec.count >= LOGIN_MAX_ATTEMPTS) {
    rec.lockedUntil = Date.now() + LOGIN_LOCK_MS;
    rec.count = 0;
  }
  loginAttempts.set(key, rec);
}

function loginSuccess(key: string): void {
  loginAttempts.delete(key);
}

export function registerAuthRoutes(app: FastifyInstance) {
  // 家长登录
  app.post('/auth/parent-login', async (req, reply) => {
    const parsed = parentLoginSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });

    const { username, password } = parsed.data;
    // 防爆破：同一 IP + 账号 连续失败 5 次锁 15 分钟
    const guardKey = `parent:${req.ip}:${username}`;
    const guard = loginGuard(guardKey);
    if (!guard.allowed) {
      return reply.code(429).send({ error: 'too_many_attempts', retryAfter: guard.retryAfter });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE role = ? AND name = ?')
      .get('parent', username) as any;

    if (!user) { loginFail(guardKey); return reply.code(401).send({ error: 'invalid_credentials' }); }
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) { loginFail(guardKey); return reply.code(401).send({ error: 'invalid_credentials' }); }

    loginSuccess(guardKey);
    const token = await signToken({ sub: user.id, role: 'parent', name: user.name });
    return { token, user: { id: user.id, name: user.name, role: 'parent', avatar: user.avatar } };
  });

  // 小孩PIN登录
  app.post('/auth/child-login', async (req, reply) => {
    const parsed = childLoginSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });

    const { userId, pin } = parsed.data;
    // 防爆破：同一 IP + 用户 连续失败 5 次锁 15 分钟（PIN 只有 4-6 位，必须限速）
    const guardKey = `child:${req.ip}:${userId}`;
    const guard = loginGuard(guardKey);
    if (!guard.allowed) {
      return reply.code(429).send({ error: 'too_many_attempts', retryAfter: guard.retryAfter });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND role = ?')
      .get(userId, 'child') as any;

    const pinOk = user ? await verifyPin(pin, user.pin) : false;
    if (!user || !pinOk) {
      loginFail(guardKey);
      return reply.code(401).send({ error: 'invalid_credentials' });
    }

    loginSuccess(guardKey);
    const token = await signToken({ sub: user.id, role: 'child', name: user.name });
    return { token, user: { id: user.id, name: user.name, role: 'child', avatar: user.avatar, gender: user.gender, totalPoints: user.total_points } };
  });

  // 小孩列表（用于登录页选择身份）
  app.get('/auth/children', async () => {
    const db = getDb();
    const children = db.prepare(
      'SELECT id, name, avatar FROM users WHERE role = ? ORDER BY id'
    ).all('child');
    return { children };
  });

  // 当前用户信息（camelCase 字段名）
  app.get('/auth/me', async (req) => {
    const db = getDb();
    // 必须带上 gender：孩子端据此选择主题配色，漏掉会让刷新后主题回落到粉色
    const user = db.prepare(
      'SELECT id, name, role, avatar, gender, total_points as totalPoints FROM users WHERE id = ?'
    ).get(req.user!.sub) as any;
    return { user };
  });

  // 家长更新自身资料（头像/账号/密码）
  app.patch('/auth/me', { preHandler: requireParent }, async (req, reply) => {
    const parsed = updateMeSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const { avatar, name, password } = parsed.data;
    const db = getDb();

    // 头像合法性已由 updateMeSchema（isValidAvatar）校验

    // 校验账号唯一性（家长之间不重名）
    if (name) {
      const exists = db.prepare(
        'SELECT id FROM users WHERE role = ? AND name = ? AND id != ?'
      ).get('parent', name, req.user!.sub);
      if (exists) return reply.code(409).send({ error: 'name_taken' });
    }

    // 执行更新
    const fields: string[] = [];
    const values: any[] = [];
    if (avatar) { fields.push('avatar = ?'); values.push(avatar); }
    if (name)   { fields.push('name = ?');   values.push(name); }
    if (password) {
      const hash = await hashPassword(password);
      fields.push('password_hash = ?');
      values.push(hash);
    }
    if (fields.length === 0) {
      return reply.code(400).send({ error: 'no_fields' });
    }
    values.push(req.user!.sub);
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    // 返回更新后的用户
    const updated = db.prepare(
      'SELECT id, name, role, avatar, gender, total_points as totalPoints FROM users WHERE id = ?'
    ).get(req.user!.sub) as any;
    return { user: updated };
  });

  // 小孩更新自身信息：头像 / PIN码
  app.patch('/auth/child/me', async (req, reply) => {
    if (req.user?.role !== 'child') return reply.code(403).send({ error: 'forbidden' });
    const body = req.body as { avatar?: string; pin?: string };
    const db = getDb();

    // 校验头像（生肖 key 或 hum1: 自定义规格）
    if (body.avatar !== undefined && !isValidAvatar(body.avatar)) {
      return reply.code(400).send({ error: 'invalid_avatar' });
    }

    // 校验PIN：4-6位数字
    if (body.pin !== undefined && body.pin !== '' && !isValidPin(body.pin)) {
      return reply.code(400).send({ error: 'invalid_pin' });
    }

    const fields: string[] = [];
    const values: any[] = [];
    if (body.avatar) { fields.push('avatar = ?'); values.push(body.avatar); }
    if (body.pin && body.pin !== '') {
      // PIN 哈希存储 + 指纹列（用于全局唯一性检查）
      fields.push('pin = ?'); values.push(hashPin(body.pin));
      fields.push('pin_lookup = ?'); values.push(pinLookup(body.pin));
    }

    if (fields.length === 0) {
      return reply.code(400).send({ error: 'no_fields' });
    }
    values.push(req.user!.sub);
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    // gender 必须回传：前端拿到响应后会整体覆盖本地 user，缺字段会让主题回落成粉色
    const updated = db.prepare(
      'SELECT id, name, role, avatar, gender, total_points as totalPoints FROM users WHERE id = ?'
    ).get(req.user!.sub);
    return { user: updated };
  });
}
