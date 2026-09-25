import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { requireParent } from '../middleware.js';
import { isUnlimitedLimit, isUnlimitedStock } from '../sentinels.js';
import { pushToUser, pushToParents } from '../ws.js';
import { serializeProduct } from './products.js';
import { parsePage } from '../pagination.js';
import {
  SERIES_LABELS, STAGE_NAMES, STAGE_EXP,
  MAX_LEVEL, MAX_EXP, INITIAL_STATS, DECAY_PER_DAY, DECAY_CAP_DAYS,
  DECAY_TICK_SEC, DECAY_TICK_STATS,
  STAT_META, MOOD_META, levelProgress, moodOf, expMultOf,
  decayStats, clampStats, parseEffect, effectLabel,
  type PetStats,
} from '../pets.js';
import { listSpecies, getSpecies, speciesMaxExp } from '../species.js';
import { localDateKey } from '../dates.js';

const adoptSchema = z.object({
  species: z.string().min(1).max(32),
  nickname: z.string().trim().max(12).optional(),
});

const renameSchema = z.object({
  nickname: z.string().trim().max(12),
});

const useItemSchema = z.object({
  productId: z.number().int().positive(),
});

const limitsSchema = z.object({
  feedLimit: z.number().int().min(0).max(99),      // 0 = 不限次数
  pointsLimit: z.number().int().min(0).max(9999),  // 0 = 不限积分
});

const nowSec = () => Math.floor(Date.now() / 1000);

/** 在售宠物道具最低价（家长设积分预算时提示用：预算低于它孩子将买不起任何道具） */
function minPetItemCost(): number | null {
  const row = getDb().prepare(
    "SELECT MIN(cost) as m FROM products WHERE kind = 'pet' AND status = 'active'"
  ).get() as { m: number | null };
  return row?.m ?? null;
}

// ── 每日喂养限制（A：次数上限 + B：积分预算，按孩子配置，0=不限）────────

/** 孩子今日宠物玩法用量：喂养次数 + 消耗积分。
 *  记在独立账本 pet_usage_daily（与 pet_logs 展示记录解耦——
 *  家长清空喂养记录不会重置当天限额） */
function todayUsage(userId: number): { count: number; points: number } {
  const row = getDb().prepare(
    'SELECT count, points FROM pet_usage_daily WHERE user_id = ? AND date = ?'
  ).get(userId, localDateKey()) as { count: number; points: number } | undefined;
  return { count: row?.count ?? 0, points: row?.points ?? 0 };
}

/** 喂养成功后累加当日用量账本（须在喂养事务内调用） */
function recordUsage(userId: number, points: number): void {
  getDb().prepare(`
    INSERT INTO pet_usage_daily (user_id, date, count, points) VALUES (?, ?, 1, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET count = count + 1, points = points + ?
  `).run(userId, localDateKey(), points, points);
}

interface PetLimits { feedLimit: number; pointsLimit: number }

/** 从 users 行取限制值（老库列缺失/NULL 时按不限处理） */
function limitsOf(row: { pet_daily_feed_limit?: number | null; pet_daily_points_limit?: number | null } | undefined): PetLimits {
  return {
    feedLimit: row?.pet_daily_feed_limit ?? 0,
    pointsLimit: row?.pet_daily_points_limit ?? 0,
  };
}

/** 额度视图：剩余额度为 null 表示该项不限制 */
function quotaView(userId: number, lim: PetLimits) {
  const u = todayUsage(userId);
  return {
    todayFed: u.count,
    todayPoints: u.points,
    feedLimit: lim.feedLimit,
    pointsLimit: lim.pointsLimit,
    feedsLeft: isUnlimitedLimit(lim.feedLimit) ? null : Math.max(0, lim.feedLimit - u.count),
    pointsLeft: isUnlimitedLimit(lim.pointsLimit) ? null : Math.max(0, lim.pointsLimit - u.points),
  };
}

/** 查孩子限额（不存在返回 0/0 不限，家长行不会走到这里） */
function limitsOfUser(userId: number): PetLimits {
  const row = getDb().prepare(
    'SELECT pet_daily_feed_limit, pet_daily_points_limit FROM users WHERE id = ?'
  ).get(userId) as { pet_daily_feed_limit?: number; pet_daily_points_limit?: number } | undefined;
  return limitsOf(row);
}

interface PetRow {
  id: number;
  user_id: number;
  species: string;
  nickname: string | null;
  exp: number;
  satiety: number;
  happiness: number;
  health: number;
  adopted_at: number;
  last_decay_at: number;
}

/** 读取宠物并惰性结算状态衰减（有结算时落库）
 *
 *  last_decay_at 写成结算结果里的 nextDecayAt —— 只推进真正扣掉的整刻度，
 *  零头留给下次；不能直接写成「现在」（老实现那样做会把不足 1 点的衰减吞掉）。 */
function loadPetRow(userId: number): { row: PetRow; stats: PetStats } | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM pets WHERE user_id = ?').get(userId) as PetRow | undefined;
  if (!row) return null;

  const raw: PetStats = { satiety: row.satiety, happiness: row.happiness, health: row.health };
  const { stats, applied, changed, nextDecayAt } = decayStats(raw, row.last_decay_at);
  if (applied) {
    const t = nowSec();
    db.prepare('UPDATE pets SET satiety = ?, happiness = ?, health = ?, last_decay_at = ?, updated_at = ? WHERE id = ?')
      .run(stats.satiety, stats.happiness, stats.health, nextDecayAt, t, row.id);
    row.satiety = stats.satiety;
    row.happiness = stats.happiness;
    row.health = stats.health;
    row.last_decay_at = nextDecayAt;
    if (changed) console.log(`[pet] decay applied for user ${userId}: ${JSON.stringify(stats)}`);
  }
  return { row, stats };
}

/** 组装给前端的宠物视图 */
function petView(row: PetRow, stats: PetStats) {
  const sp = getSpecies(row.species);
  const prog = levelProgress(row.exp, sp?.stageExp);
  const mood = moodOf(stats);
  return {
    id: row.id,
    species: row.species,
    speciesName: sp?.name ?? row.species,
    series: sp?.series ?? 'boy',
    seriesLabel: sp ? SERIES_LABELS[sp.series] : '',
    emoji: sp?.emoji ?? '🐣',
    nickname: row.nickname || null,
    displayName: row.nickname || sp?.name || '宠物',
    exp: row.exp,
    level: prog.level,
    stageName: prog.stageName,
    isMax: prog.isMax,
    expInLevel: prog.expInLevel,
    expToNext: prog.expToNext,
    ratio: prog.ratio,
    totalMaxExp: prog.totalMaxExp,
    satiety: stats.satiety,
    happiness: stats.happiness,
    health: stats.health,
    mood,
    moodLabel: MOOD_META[mood].label,
    moodTip: MOOD_META[mood].tip,
    adoptedAt: row.adopted_at,
  };
}

export type PetView = ReturnType<typeof petView>;

/**
 * 喂养记录序列化。
 *
 * pet_logs.effect 存的是道具效果 JSON 快照（如 {"exp":4,"satiety":25}），
 * 直接丢给前端会渲染成一串 JSON。这里解析成对象，并给出人类可读的 effectText。
 *
 * 文案按解析出的 effect **现算**，这样历史行与新行的措辞始终一致
 * （note 列是写入当时的文案，旧行可能用过别的标签写法）；
 * 「（状态加成 ×1.5）」是写入当时的即时信息、effect 里没有，只能从 note 里保留。
 * effect 解析不出来时才退回 note。
 */
function petLogView(row: any) {
  const effect = parseEffect(row.effect);
  const note = row.note ? String(row.note).trim() : '';
  const computed = effectLabel(effect);
  const mult = computed ? (/（状态加成 ×[\d.]+）/.exec(note)?.[0] ?? '') : '';
  return {
    id: row.id,
    species: row.species,
    item_name: row.item_name,
    points: row.points,
    effect,
    effectText: computed ? computed + mult : note,
    created_at: row.created_at,
  };
}

export type PetLogView = ReturnType<typeof petLogView>;

/** 把道具效果作用到宠物上，返回新经验与状态值（经验上限按物种阈值取满级值） */
function applyEffect(row: PetRow, stats: PetStats, effect: { exp?: number; satiety?: number; happiness?: number; health?: number }, maxExp: number = MAX_EXP) {
  const exp = Math.min(maxExp, row.exp + (effect.exp ?? 0));
  const next = clampStats({
    satiety: stats.satiety + (effect.satiety ?? 0),
    happiness: stats.happiness + (effect.happiness ?? 0),
    health: stats.health + (effect.health ?? 0),
  });
  return { exp, stats: next };
}

export function registerPetsRoutes(app: FastifyInstance) {
  // ── 图鉴：物种清单 + 成长表 + 状态/衰减参数（前端展示用）────────────
  // species 来自 DB（家长端管理后的数据），每只自带 stageExp 阈值
  app.get('/pets/catalog', async () => ({
    species: listSpecies(),
    series: Object.entries(SERIES_LABELS).map(([key, label]) => ({ key, label })),
    stageNames: STAGE_NAMES,
    stageExp: STAGE_EXP,
    maxLevel: MAX_LEVEL,
    maxExp: MAX_EXP,
    initialStats: INITIAL_STATS,
    decayPerDay: DECAY_PER_DAY,
    decayCapDays: DECAY_CAP_DAYS,
    decayTickSec: DECAY_TICK_SEC,        // 每 12 小时结算一次，一次 -4/-3/-2
    decayTickStats: DECAY_TICK_STATS,
    statMeta: STAT_META,
    moods: MOOD_META,
    minPetItemCost: minPetItemCost(),
  }));

  // ── 小孩：我的宠物 ─────────────────────────────────────────────────
  app.get('/pets/me', async (req) => {
    const loaded = loadPetRow(req.user!.sub);
    const quota = quotaView(req.user!.sub, limitsOfUser(req.user!.sub));
    if (!loaded) {
      return {
        pet: null,
        canAdopt: req.user!.role === 'child',
        initialStats: INITIAL_STATS,
        quota,
      };
    }
    return { pet: petView(loaded.row, loaded.stats), canAdopt: req.user!.role === 'child', quota };
  });

  // ── 小孩：领养 / 更换宠物 ──────────────────────────────────────────
  // 规则：换成不同物种会重置等级与状态值；换回同一物种只改名，不重置
  app.post('/pets/adopt', async (req, reply) => {
    if (req.user!.role !== 'child') return reply.code(403).send({ error: 'child_only' });
    const parsed = adoptSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const { species } = parsed.data;
    const adoptSp = getSpecies(species);
    if (!adoptSp) return reply.code(400).send({ error: 'invalid_species' });
    const nickname = parsed.data.nickname?.trim() || null;

    const uid = req.user!.sub;
    const db = getDb();
    const existing = db.prepare('SELECT * FROM pets WHERE user_id = ?').get(uid) as PetRow | undefined;
    const t = nowSec();

    if (!existing) {
      db.prepare(`
        INSERT INTO pets (user_id, species, nickname, exp, satiety, happiness, health, adopted_at, last_decay_at, updated_at)
        VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
      `).run(uid, species, nickname, INITIAL_STATS.satiety, INITIAL_STATS.happiness, INITIAL_STATS.health, t, t, t);
      const loaded = loadPetRow(uid)!;
      pushToParents({ type: 'pet_adopted', userId: uid, userName: req.user!.name, species, speciesName: adoptSp.name });
      return { pet: petView(loaded.row, loaded.stats), reset: false, created: true };
    }

    // 同物种：只更新昵称
    if (existing.species === species) {
      db.prepare('UPDATE pets SET nickname = ?, updated_at = ? WHERE id = ?').run(nickname, t, existing.id);
      const loaded = loadPetRow(uid)!;
      return { pet: petView(loaded.row, loaded.stats), reset: false, created: false };
    }

    // 换物种：等级与状态值重置（积分商城已消耗的经验不退还）
    db.prepare(`
      UPDATE pets SET species = ?, nickname = ?, exp = 0,
        satiety = ?, happiness = ?, health = ?,
        adopted_at = ?, last_decay_at = ?, updated_at = ?
      WHERE id = ?
    `).run(
      species, nickname, INITIAL_STATS.satiety, INITIAL_STATS.happiness, INITIAL_STATS.health,
      t, t, t, existing.id,
    );
    const loaded = loadPetRow(uid)!;
    pushToParents({ type: 'pet_adopted', userId: uid, userName: req.user!.name, species, speciesName: adoptSp.name });
    return { pet: petView(loaded.row, loaded.stats), reset: true, created: false };
  });

  // ── 小孩：给宠物改名 ───────────────────────────────────────────────
  app.patch('/pets/me', async (req, reply) => {
    const parsed = renameSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const uid = req.user!.sub;
    const db = getDb();
    const nickname = parsed.data.nickname || null;
    const r = db.prepare('UPDATE pets SET nickname = ?, updated_at = ? WHERE user_id = ?').run(nickname, nowSec(), uid);
    if (r.changes === 0) return reply.code(404).send({ error: 'no_pet' });
    const loaded = loadPetRow(uid)!;
    return { pet: petView(loaded.row, loaded.stats) };
  });

  // ── 小孩：用积分商城的宠物道具喂养宠物（即时生效，不走走审核）────────
  app.post('/pets/use-item', async (req, reply) => {
    if (req.user!.role !== 'child') return reply.code(403).send({ error: 'child_only' });
    const parsed = useItemSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const uid = req.user!.sub;
    const db = getDb();

    let result: any;
    try {
      const txn = db.transaction(() => {
        const product = db.prepare("SELECT * FROM products WHERE id = ? AND status = 'active' AND kind = 'pet'")
          .get(parsed.data.productId) as any;
        if (!product) throw new Error('item_not_found');
        if (!isUnlimitedStock(product.stock) && product.stock <= 0) throw new Error('out_of_stock');

        const effect = parseEffect(product.pet_effect);
        if (!effect) throw new Error('item_not_found');

        const pet = db.prepare('SELECT * FROM pets WHERE user_id = ?').get(uid) as PetRow | undefined;
        if (!pet) throw new Error('no_pet');

        // 先补上待结算的衰减再叠加道具效果：否则这笔喂养会把「还没结算的衰减」一起吞掉
        // （老实现直接用库里的旧状态值，并把 last_decay_at 重置为现在）
        const settled = decayStats(
          { satiety: pet.satiety, happiness: pet.happiness, health: pet.health },
          pet.last_decay_at
        );
        const stats: PetStats = settled.stats;
        const petSp = getSpecies(pet.species);
        const petStageExp = petSp?.stageExp;    // 物种自定义阈值（可能为 undefined → 用默认）
        const petMaxLv = (petStageExp?.length ?? STAGE_EXP.length) - 1;
        const petMaxExp = petSp ? speciesMaxExp(petSp) : MAX_EXP;
        const levelBefore = levelProgress(pet.exp, petStageExp).level;

        // 满级处理：纯经验道具直接拒绝（不白花钱）；带状态效果的混合道具可用，
        // 但经验部分置零并如实反映在效果与文案里（否则扣了分、文案还写着"经验+N"，误导孩子）
        const statKeys = ['satiety', 'happiness', 'health'] as const;
        const hasStatEffect = statKeys.some((k) => (effect[k] ?? 0) > 0);
        const atMaxLevel = levelBefore >= petMaxLv;
        if (atMaxLevel && !hasStatEffect && (effect.exp ?? 0) > 0) {
          throw new Error('pet_max_level');
        }

        const user = db.prepare('SELECT total_points, pet_daily_feed_limit, pet_daily_points_limit FROM users WHERE id = ?').get(uid) as any;
        if (user.total_points < product.cost) throw new Error('insufficient_points');

        // 每日喂养限制：次数上限 + 积分预算（0/NULL=不限）。用本次消耗前的量校验，
        // 积分预算判断「这笔花完会不会超预算」，超了整笔拒绝，不部分扣
        const lim = limitsOf(user);
        if (!isUnlimitedLimit(lim.feedLimit) || !isUnlimitedLimit(lim.pointsLimit)) {
          const usage = todayUsage(uid);
          if (!isUnlimitedLimit(lim.feedLimit) && usage.count >= lim.feedLimit) throw new Error('feed_limit_reached');
          if (!isUnlimitedLimit(lim.pointsLimit) && usage.points + product.cost > lim.pointsLimit) throw new Error('points_limit_reached');
        }

        // 状态影响成长经验：按使用前的心情计算经验倍率（满级时经验部分不生效）
        const moodBefore = moodOf(stats);
        const mult = expMultOf(moodBefore);
        const baseExp = effect.exp ?? 0;
        const expGain = baseExp > 0 && !atMaxLevel ? Math.max(1, Math.round(baseExp * mult)) : 0;
        const effApplied = expGain !== baseExp ? { ...effect, exp: expGain || undefined } : effect;

        const applied = applyEffect(pet, stats, effApplied, petMaxExp);
        const t = nowSec();

        db.prepare('UPDATE users SET total_points = total_points - ? WHERE id = ?').run(product.cost, uid);
        db.prepare(`
          INSERT INTO point_logs (user_id, delta, source, ref_id, ref_type, note, created_by)
          VALUES (?, ?, 'exchange', ?, 'product', ?, ?)
        `).run(uid, -product.cost, product.id, `宠物道具：${product.name}`, uid);

        // 喂养不重置衰减时钟：待结算的衰减上面已经补过，时间戳沿用结算后的值，
        // 这样「喂一次就把衰减清零」和「零头被吞」都不会再发生
        db.prepare(`
          UPDATE pets SET exp = ?, satiety = ?, happiness = ?, health = ?, last_decay_at = ?, updated_at = ?
          WHERE id = ?
        `).run(applied.exp, applied.stats.satiety, applied.stats.happiness, applied.stats.health, settled.nextDecayAt, t, pet.id);

        let effectText = effectLabel(effApplied);
        if (baseExp > 0 && mult !== 1) effectText += `（状态加成 ×${mult}）`;
        db.prepare(`
          INSERT INTO pet_logs (user_id, species, item_name, points, effect, note)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(uid, pet.species, product.name, product.cost, JSON.stringify(effApplied), effectText);

        // 扣库存并确认真的扣到了（不限库存时跳过）。不检查 changes 时，
        // 库存刚好耗尽会让 UPDATE 静默影响 0 行，孩子却照样被扣了分。
        if (!isUnlimitedStock(product.stock)) {
          const dec = db.prepare('UPDATE products SET stock = stock - 1 WHERE id = ? AND stock > 0').run(product.id);
          if (dec.changes === 0) throw new Error('out_of_stock');
        }

        // 记入当日用量账本（独立于 pet_logs，清空记录不影响限额）
        recordUsage(uid, product.cost);

        const after = db.prepare('SELECT * FROM pets WHERE id = ?').get(pet.id) as PetRow;
        const levelAfter = levelProgress(after.exp, petStageExp).level;

        result = {
          pet: petView(after, applied.stats),
          effect: effApplied,
          effectText,
          itemName: product.name,
          cost: product.cost,
          expGain,
          moodMult: mult,
          leveledUp: levelAfter > levelBefore,
          levelBefore,
          levelAfter,
          stageNameBefore: STAGE_NAMES[levelBefore],
          stageNameAfter: STAGE_NAMES[levelAfter],
          newBalance: (db.prepare('SELECT total_points FROM users WHERE id = ?').get(uid) as any).total_points,
          quota: quotaView(uid, lim),
        };
      });
      txn();
    } catch (e: any) {
      const msg = e.message;
      if (msg === 'item_not_found') return reply.code(404).send({ error: msg });
      if (msg === 'no_pet') return reply.code(409).send({ error: msg });
      if (msg === 'out_of_stock') return reply.code(409).send({ error: msg });
      if (msg === 'insufficient_points') return reply.code(409).send({ error: msg });
      if (msg === 'pet_max_level') return reply.code(409).send({ error: msg });
      if (msg === 'feed_limit_reached') return reply.code(409).send({ error: msg });
      if (msg === 'points_limit_reached') return reply.code(409).send({ error: msg });
      throw e;
    }

    pushToUser(uid, {
      type: 'pet_fed',
      itemName: result.itemName,
      effectText: result.effectText,
      leveledUp: result.leveledUp,
      level: result.levelAfter,
      stageName: result.stageNameAfter,
      newBalance: result.newBalance,
    });
    if (result.leveledUp) {
      pushToParents({
        type: 'pet_levelup',
        userId: uid,
        userName: req.user!.name,
        species: result.pet.species,
        speciesName: result.pet.speciesName,
        stageName: result.stageNameAfter,
        level: result.levelAfter,
      });
    }
    return result;
  });

  // ── 小孩：喂养记录 ─────────────────────────────────────────────────
  app.get('/pets/logs/me', async (req) => {
    const { limit, offset } = parsePage(req.query);
    const db = getDb();
    const logs = db.prepare(
      'SELECT * FROM pet_logs WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?'
    ).all(req.user!.sub, limit, offset).map(petLogView);
    // 累计消耗积分（宠物玩法总共花掉多少分）
    const spent = db.prepare('SELECT COALESCE(SUM(points), 0) as c FROM pet_logs WHERE user_id = ?').get(req.user!.sub) as any;
    const total = (db.prepare('SELECT COUNT(*) as c FROM pet_logs WHERE user_id = ?').get(req.user!.sub) as any).c;
    return { logs, totalPointsSpent: spent?.c ?? 0, total };
  });

  // ── 家长：全部小孩的宠物总览 ───────────────────────────────────────
  app.get('/pets', { preHandler: requireParent }, async () => {
    const db = getDb();
    const children = db.prepare(
      "SELECT id, name, avatar, total_points, pet_daily_feed_limit, pet_daily_points_limit FROM users WHERE role = 'child' ORDER BY id ASC"
    ).all() as any[];
    const list = children.map((c) => {
      const loaded = loadPetRow(c.id);
      const spent = db.prepare('SELECT COALESCE(SUM(points), 0) as c FROM pet_logs WHERE user_id = ?').get(c.id) as any;
      return {
        id: c.id,
        name: c.name,
        avatar: c.avatar,
        totalPoints: c.total_points,
        pointsSpentOnPet: spent?.c ?? 0,
        pet: loaded ? petView(loaded.row, loaded.stats) : null,
        quota: quotaView(c.id, limitsOf(c)),
      };
    });
    return { children: list, minPetItemCost: minPetItemCost() };
  });

  // ── 家长：设置某个孩子的每日喂养限制（0 = 不限）──────────────────────
  app.put('/pets/:userId/limits', { preHandler: requireParent }, async (req, reply) => {
    const userId = Number((req.params as any).userId);
    if (!Number.isInteger(userId)) return reply.code(400).send({ error: 'invalid_input' });
    const parsed = limitsSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input', detail: parsed.error.issues[0]?.message });
    const db = getDb();
    const r = db.prepare(
      "UPDATE users SET pet_daily_feed_limit = ?, pet_daily_points_limit = ? WHERE id = ? AND role = 'child'"
    ).run(parsed.data.feedLimit, parsed.data.pointsLimit, userId);
    if (r.changes === 0) return reply.code(404).send({ error: 'not_found' });
    return { ok: true, quota: quotaView(userId, limitsOfUser(userId)) };
  });

  // ── 家长：单个小孩的宠物喂养明细 ───────────────────────────────────
  app.get('/pets/:userId/logs', { preHandler: requireParent }, async (req) => {
    const userId = Number((req.params as any).userId);
    if (!Number.isInteger(userId)) return { logs: [], total: 0 };
    const db = getDb();
    const { limit, offset } = parsePage(req.query);
    const logs = db.prepare(
      'SELECT * FROM pet_logs WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?'
    ).all(userId, limit, offset).map(petLogView);
    const total = (db.prepare('SELECT COUNT(*) as c FROM pet_logs WHERE user_id = ?').get(userId) as any).c;
    return { logs, total };
  });

  // ── 家长：帮某个小孩重置宠物（用于误领养等场景）─────────────────────
  app.delete('/pets/:userId', { preHandler: requireParent }, async (req, reply) => {
    const userId = Number((req.params as any).userId);
    if (!Number.isInteger(userId)) return reply.code(400).send({ error: 'invalid_input' });
    const db = getDb();
    const r = db.prepare('DELETE FROM pets WHERE user_id = ?').run(userId);
    if (r.changes === 0) return reply.code(404).send({ error: 'no_pet' });
    return { ok: true };
  });
}
