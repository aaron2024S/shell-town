// 宠物养成系统 —— 前端展示用目录与成长表
// 数值口径与服务端 server/src/pets.ts 一致（服务端为权威源，前端仅用于展示）

export type PetSeries = 'boy' | 'girl';

export interface PetSpecies {
  key: string;
  name: string;
  series: PetSeries;
  gender: '♂' | '♀';
  emoji: string;
}

/** 服务端物种定义（家长端可管理，/pets/catalog 返回；比 PetSpecies 多阈值等字段） */
export interface SpeciesDef extends PetSpecies {
  /** 5 阶段累计经验阈值（Lv0~Lv4），如 [0,20,70,150,280] */
  stageExp: number[];
  isCustom: boolean;
}

/** 12 只原创虚构生物：男生款 6 + 女生款 6（与服务端 server/src/pets.ts 一致） */
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

export const PET_SPECIES_MAP: Record<string, PetSpecies> = Object.fromEntries(
  PET_SPECIES.map((s) => [s.key, s])
);

export const SERIES_ORDER: PetSeries[] = ['boy', 'girl'];

export const SERIES_LABELS: Record<PetSeries, string> = {
  boy: '男生款',
  girl: '女生款',
};

export const SERIES_HINTS: Record<PetSeries, string> = {
  boy: '帅气系的原创小伙伴',
  girl: '温柔系的原创小伙伴',
};

export function getPetSpecies(key?: string | null): PetSpecies {
  return (key && PET_SPECIES_MAP[key]) || PET_SPECIES_MAP.pyro;
}

// ── 成长：5 个阶段（阶段 0 = 神奇蛋，1~4 为宠物形态，每阶段独立形象）────

export const STAGE_NAMES = ['神奇蛋', '幼生体', '成长期', '完全体', '究极体'];

/** 达到第 i 阶段所需的累计经验（索引即阶段号） */
export const STAGE_EXP = [0, 20, 70, 150, 280];

/** 默认成长阈值（物种未自定义时使用） */
export const DEFAULT_STAGE_EXP = STAGE_EXP;

export const MAX_LEVEL = STAGE_EXP.length - 1; // 4

// 说明：这里曾有一份前端成长算法副本（levelFromExp / levelProgress / MAX_EXP / EGG_LEVEL），
// 全项目零调用 —— 服务端 server/src/pets.ts 才是权威实现（且支持按物种自定义阈值），
// 前端页面一律直接用接口返回的 level / ratio / expToNext 字段。为避免"双份真值"被误用，
// 已删除。新增展示逻辑请用接口字段，不要在前端重新推导成长曲线。

// ── 状态值：饱食度 / 快乐值 / 健康值（0~100）────────────────────────

export type StatKey = 'satiety' | 'happiness' | 'health';

export interface PetStats {
  satiety: number;
  happiness: number;
  health: number;
}

export const STAT_META: Array<{ key: StatKey; label: string; emoji: string; color: string }> = [
  { key: 'satiety', label: '饱食度', emoji: '🍚', color: '#ffb454' },
  { key: 'happiness', label: '快乐值', emoji: '😊', color: '#ff9bb0' },
  { key: 'health', label: '健康值', emoji: '💚', color: '#7ed4b9' },
];

/** 效果文案用的短标签（状态条上仍用 STAT_META 的完整标签） */
export const STAT_SHORT: Record<StatKey, string> = {
  satiety: '饱食',
  happiness: '快乐',
  health: '健康',
};

/** 宠物道具效果（与服务端 products.pet_effect 对应） */
export interface PetEffect {
  exp?: number;
  satiety?: number;
  happiness?: number;
  health?: number;
}

/**
 * 道具效果文案：`经验+4 · 饱食+25`。
 * 与服务端 server/src/pets.ts 的 effectLabel 保持一致 —— 商品卡片、喂养记录用同一套措辞。
 * 无任何有效效果时返回 empty（家长端传 '未设置效果'）。
 */
export function petEffectText(e: PetEffect | null | undefined, empty = ''): string {
  if (!e) return empty;
  const parts: string[] = [];
  if (e.exp) parts.push(`经验+${e.exp}`);
  for (const key of ['satiety', 'happiness', 'health'] as StatKey[]) {
    const v = e[key];
    if (v) parts.push(`${STAT_SHORT[key]}+${v}`);
  }
  return parts.join(' · ') || empty;
}

// 心情类型与服务端 server/src/pets.ts 的 moodOf 对齐
export type PetMood = 'starving' | 'sad' | 'ok' | 'happy';

export const MOOD_META: Record<PetMood, { label: string; emoji: string; color: string }> = {
  starving: { label: '肚子好饿', emoji: '🍽️', color: '#e57373' },
  sad: { label: '有点委屈', emoji: '💧', color: '#ffb454' },
  ok: { label: '还不错', emoji: '🙂', color: '#7ed4b9' },
  happy: { label: '超级开心', emoji: '✨', color: '#ff9bb0' },
};

/** 等级形态名的短标签，如 "Lv3 小可爱" */
export function stageLabel(level: number): string {
  const lv = Math.max(0, Math.min(MAX_LEVEL, Math.floor(level || 0)));
  return `Lv${lv} ${STAGE_NAMES[lv]}`;
}
