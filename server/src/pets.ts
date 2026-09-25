// 宠物养成系统 —— 服务端权威定义
// 物种目录 / 12 阶段成长曲线 / 状态值衰减 / 心情判定 / 道具效果

export type PetSeries = 'boy' | 'girl';

export interface PetSpecies {
  key: string;
  name: string;
  series: PetSeries;
  gender: '♂' | '♀';
  emoji: string;
}

// 12 只原创虚构生物：男生款 6 + 女生款 6（形象见 web/public/pets/<key>/1~4.webp）
// 注意：这份表只是「内置物种的出厂快照」，仅用于首次启动时播种进 pet_species 表。
// 运行时一律用 species.ts 的 listSpecies()/getSpecies()（数据源是 DB，含家长自建物种）——
// 不要再拿这张静态表去校验/查找物种，否则家长自建的宠物会被判为非法或查不到。
export const PET_SPECIES: PetSpecies[] = [
  // ── 男生款 ♂
  { key: 'pyro', name: '焰灵', series: 'boy', gender: '♂', emoji: '🔥' },
  { key: 'volt', name: '雷角', series: 'boy', gender: '♂', emoji: '⚡' },
  { key: 'rocko', name: '岩铁', series: 'boy', gender: '♂', emoji: '🪨' },
  { key: 'gale', name: '疾风', series: 'boy', gender: '♂', emoji: '🌪️' },
  { key: 'drake', name: '幼龙', series: 'boy', gender: '♂', emoji: '🐉' },
  { key: 'nox', name: '暗影', series: 'boy', gender: '♂', emoji: '🌙' },
  // ── 女生款 ♀
  { key: 'aqua', name: '泡灵', series: 'girl', gender: '♀', emoji: '💧' },
  { key: 'sprout', name: '芽芽', series: 'girl', gender: '♀', emoji: '🌸' },
  { key: 'frost', name: '霜晶', series: 'girl', gender: '♀', emoji: '❄️' },
  { key: 'moth', name: '月蛾', series: 'girl', gender: '♀', emoji: '🦋' },
  { key: 'mush', name: '菌菇', series: 'girl', gender: '♀', emoji: '🍄' },
  { key: 'stella', name: '星辉', series: 'girl', gender: '♀', emoji: '✨' },
];

export const SERIES_LABELS: Record<PetSeries, string> = {
  boy: '男生款',
  girl: '女生款',
};

// ── 成长：5 个阶段（阶段 0 = 神奇蛋，1~4 为宠物形态，每阶段独立形象）────

export const STAGE_NAMES = ['神奇蛋', '幼生体', '成长期', '完全体', '究极体'];

// 达到第 i 阶段所需的累计经验（索引即阶段号）
export const STAGE_EXP = [0, 20, 70, 150, 280];

export const MAX_LEVEL = STAGE_EXP.length - 1;           // 4
export const MAX_EXP = STAGE_EXP[MAX_LEVEL];             // 280
export const EGG_LEVEL = 0;

export function levelFromExp(exp: number): number {
  const e = Math.max(0, Math.floor(exp || 0));
  let lv = 0;
  for (let i = 0; i < STAGE_EXP.length; i++) {
    if (e >= STAGE_EXP[i]) lv = i;
    else break;
  }
  return lv;
}

export interface LevelProgress {
  level: number;
  stageName: string;
  isMax: boolean;
  /** 当前阶段已累积的经验 */
  expInLevel: number;
  /** 升到下一阶段还需要多少（满级为 0） */
  expToNext: number;
  /** 当前阶段内的进度 0~1（满级恒为 1） */
  ratio: number;
  totalExp: number;
  totalMaxExp: number;
}

/** 按物种阈值计算等级进度（不传阈值用全局默认表） */
export function levelProgress(exp: number, stageExp: number[] = STAGE_EXP): LevelProgress {
  const e = Math.max(0, Math.floor(exp || 0));
  const maxLv = Math.max(1, stageExp.length - 1);
  let level = 0;
  for (let i = 0; i < stageExp.length; i++) {
    if (e >= stageExp[i]) level = i;
    else break;
  }
  if (level >= maxLv) {
    return {
      level, stageName: STAGE_NAMES[level], isMax: true,
      expInLevel: e - stageExp[maxLv], expToNext: 0, ratio: 1,
      totalExp: e, totalMaxExp: stageExp[maxLv],
    };
  }
  const base = stageExp[level];
  const span = stageExp[level + 1] - base;
  const inLevel = e - base;
  return {
    level, stageName: STAGE_NAMES[level], isMax: false,
    expInLevel: inLevel, expToNext: span - inLevel,
    ratio: span > 0 ? Math.min(1, inLevel / span) : 0,
    totalExp: e, totalMaxExp: stageExp[maxLv],
  };
}

// ── 状态值：饱食度 / 快乐值 / 健康值（0~100，缓慢衰减）────────────────

export interface PetStats {
  satiety: number;    // 饱食度
  happiness: number;  // 快乐值
  health: number;     // 健康值
}

export type StatKey = keyof PetStats;

export const STAT_META: Array<{ key: StatKey; label: string; emoji: string; color: string }> = [
  { key: 'satiety', label: '饱食度', emoji: '🍚', color: '#ffb454' },
  { key: 'happiness', label: '快乐值', emoji: '😊', color: '#ff9bb0' },
  { key: 'health', label: '健康值', emoji: '💚', color: '#7ed4b9' },
];

/** 每天自然衰减点数 —— 慢到不会给孩子压力，只影响表情心情 */
export const DECAY_PER_DAY: PetStats = { satiety: 8, happiness: 6, health: 4 };

/** 衰减上限天数：出远门超过这个天数不再继续掉，回家宠物永远是活的 */
export const DECAY_CAP_DAYS = 5;

/**
 * 结算刻度：**必须**能被每天的衰减量整除（12 小时 → -4/-3/-2）。
 *
 * 为什么要有刻度：状态值是整数，而「不足 1 点的部分」无法落库。
 * 早期实现是「按经过天数算小数、结果四舍五入」，同时把结算时间戳无条件推进到当前时间——
 * 于是不足 0.5 点的部分既没扣、也再也不会被算（永久丢失），而 0.5~0.99 又会进位多扣：
 * 孩子每 1 小时看一次宠物，一天下来三项状态值一点不掉；每 4 小时看一次，健康值多掉 50%。
 * 改成整刻度后，每次只扣「够一个刻度」的整数分、时间戳只推进真正扣掉的部分，
 * 余量留给下次 —— 任何访问频率下一天都恰好 -8/-6/-4（见 smoke-pet-decay.mjs）。
 */
export const DECAY_TICK_SEC = 43200;
export const DECAY_TICKS_PER_DAY = 86400 / DECAY_TICK_SEC;   // 2
export const DECAY_TICK_STATS: PetStats = {
  satiety: DECAY_PER_DAY.satiety / DECAY_TICKS_PER_DAY,
  happiness: DECAY_PER_DAY.happiness / DECAY_TICKS_PER_DAY,
  health: DECAY_PER_DAY.health / DECAY_TICKS_PER_DAY,
};
/** 一次最多结算多少个刻度（= 封顶天数折算） */
export const DECAY_MAX_TICKS = DECAY_CAP_DAYS * DECAY_TICKS_PER_DAY;

// 刻度必须整除每天衰减量，否则又会回到「小数被抹掉」的老问题 —— 改数值时这里会立刻报错
for (const k of ['satiety', 'happiness', 'health'] as StatKey[]) {
  if (!Number.isInteger(DECAY_TICK_STATS[k])) {
    throw new Error(`DECAY_TICK_SEC=${DECAY_TICK_SEC} 无法整除 DECAY_PER_DAY.${k}=${DECAY_PER_DAY[k]}`);
  }
}

export const STAT_MAX = 100;
export const INITIAL_STATS: PetStats = { satiety: 70, happiness: 70, health: 85 };

const clampStat = (n: number) => Math.max(0, Math.min(STAT_MAX, Math.round(n)));
export const clampStats = (s: PetStats): PetStats => ({
  satiety: clampStat(s.satiety),
  happiness: clampStat(s.happiness),
  health: clampStat(s.health),
});

export interface DecayResult {
  stats: PetStats;
  /** 是否有结算（true 时调用方应把 stats 与 nextDecayAt 落库） */
  applied: boolean;
  /** 状态值是否真的变了（都已经是 0 时可能 applied 但没变） */
  changed: boolean;
  /** 结算后应写入 pets.last_decay_at 的时间戳；未结算时为原值 */
  nextDecayAt: number;
}

/** 按经过的整刻度数计算衰减后的状态值（惰性结算，无后台任务）
 *
 *  时间戳只推进「真正扣掉的整刻度」，余下的零头留给下次；
 *  离家超过 DECAY_CAP_DAYS 时按封顶结算，多出来的时间直接丢弃（宠物不会掉成 0）。 */
export function decayStats(
  raw: PetStats,
  lastDecayAt: number,
  now = Math.floor(Date.now() / 1000)
): DecayResult {
  const anchor = lastDecayAt || now;
  const elapsedSec = Math.max(0, now - anchor);
  const base = clampStats(raw);

  const rawTicks = Math.floor(elapsedSec / DECAY_TICK_SEC);
  if (rawTicks <= 0) {
    // 不足一个刻度：不结算、不推进时间戳（零头继续累计）
    return { stats: base, applied: false, changed: false, nextDecayAt: anchor };
  }

  const overflow = rawTicks > DECAY_MAX_TICKS;
  const ticks = Math.min(rawTicks, DECAY_MAX_TICKS);
  const next = clampStats({
    satiety: base.satiety - DECAY_TICK_STATS.satiety * ticks,
    happiness: base.happiness - DECAY_TICK_STATS.happiness * ticks,
    health: base.health - DECAY_TICK_STATS.health * ticks,
  });
  const changed = next.satiety !== base.satiety || next.happiness !== base.happiness || next.health !== base.health;
  return {
    stats: next,
    applied: true,
    changed,
    nextDecayAt: overflow ? now : anchor + ticks * DECAY_TICK_SEC,
  };
}

// ── 心情：由状态值推导，仅影响表情与提示文案 ─────────────────────────

export type PetMood = 'starving' | 'sad' | 'ok' | 'happy';

export function moodOf(s: PetStats): PetMood {
  const lowest = Math.min(s.satiety, s.happiness, s.health);
  if (s.satiety <= 15) return 'starving';
  if (lowest <= 30) return 'sad';
  if (lowest >= 75) return 'happy';
  return 'ok';
}

export const MOOD_META: Record<PetMood, { label: string; tip: string }> = {
  starving: { label: '肚子好饿', tip: '宠物肚子咕咕叫了，去商城给它买点吃的吧~' },
  sad: { label: '有点委屈', tip: '宠物好像不太开心，陪它玩一会儿？' },
  ok: { label: '还不错', tip: '宠物状态平稳，记得常来看看它哦~' },
  happy: { label: '超级开心', tip: '宠物现在状态超棒，蹦蹦跳跳的！' },
};

/** 状态经验倍率：使用宠物道具时，按使用前的心情给经验打折/加成 */
export function expMultOf(mood: PetMood): number {
  switch (mood) {
    case 'happy': return 1.5;    // 状态好 → 成长快
    case 'ok': return 1.0;
    case 'sad': return 0.6;      // 状态差 → 经验打折
    case 'starving': return 0.5;
  }
}

// ── 道具效果 ────────────────────────────────────────────────────────

export interface PetEffect {
  exp?: number;
  satiety?: number;
  happiness?: number;
  health?: number;
}

const EFFECT_KEYS: StatKey[] = ['satiety', 'happiness', 'health'];

/** 效果文案用的短标签（状态条上仍用 STAT_META 的完整标签） */
export const STAT_SHORT: Record<StatKey, string> = {
  satiety: '饱食',
  happiness: '快乐',
  health: '健康',
};

export function parseEffect(raw: unknown): PetEffect | null {
  if (raw == null || raw === '') return null;
  let obj: any = raw;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch { return null; }
  }
  if (!obj || typeof obj !== 'object') return null;
  const out: PetEffect = {};
  if (Number.isFinite(obj.exp) && obj.exp > 0) out.exp = Math.floor(obj.exp);
  for (const k of EFFECT_KEYS) {
    if (Number.isFinite(obj[k]) && obj[k] > 0) out[k] = Math.round(obj[k]);
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** 效果文案，如 "经验+40"、"经验+4 · 饱食+25"（前端 web/src/utils/pets.ts 的 petEffectText 与此保持一致） */
export function effectLabel(e: PetEffect | null): string {
  if (!e) return '';
  const parts: string[] = [];
  if (e.exp) parts.push(`经验+${e.exp}`);
  for (const key of EFFECT_KEYS) {
    const v = e[key];
    if (v) parts.push(`${STAT_SHORT[key]}+${v}`);
  }
  return parts.join(' · ');
}
