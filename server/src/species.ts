// 宠物物种目录 —— DB 版注册表（家长端可管理后的权威源）
//
// 内置 12 只在首次启动时播种进 pet_species 表（见 db/index.ts），
// 之后一切读取都走 DB：家长在页面上改名字/emoji/阈值、新建物种立即生效（下次请求即生效），
// 无需改代码或重建镜像。本模块带进程内缓存，写操作后需 invalidateSpeciesCache()。

import { getDb } from './db/index.js';

export interface SpeciesDef {
  key: string;
  name: string;
  series: 'boy' | 'girl';
  gender: '♂' | '♀';
  emoji: string;
  /** 5 阶段累计经验阈值（Lv0~Lv4），如 [0,20,70,150,280] */
  stageExp: number[];
  isCustom: boolean;
  sortOrder: number;
}

const DEFAULT_STAGE_EXP = [0, 20, 70, 150, 280];

function parseStageExp(raw: unknown): number[] {
  try {
    const arr = JSON.parse(String(raw ?? ''));
    if (Array.isArray(arr) && arr.length === 5 && arr.every((n) => Number.isFinite(n) && n >= 0)) {
      return arr.map((n) => Math.round(n));
    }
  } catch { /* 用默认 */ }
  return [...DEFAULT_STAGE_EXP];
}

function rowToDef(row: any): SpeciesDef {
  return {
    key: row.key,
    name: row.name,
    series: row.series === 'girl' ? 'girl' : 'boy',
    gender: row.gender === '♀' ? '♀' : '♂',
    emoji: row.emoji || '🐣',
    stageExp: parseStageExp(row.stage_exp),
    isCustom: !!row.is_custom,
    sortOrder: row.sort_order ?? 0,
  };
}

let cache: SpeciesDef[] | null = null;

/** 家长端增改删后调用，清掉进程内缓存 */
export function invalidateSpeciesCache(): void {
  cache = null;
}

export function listSpecies(): SpeciesDef[] {
  if (cache) return cache;
  const db = getDb();
  const rows = db.prepare('SELECT * FROM pet_species ORDER BY sort_order, key').all() as any[];
  cache = rows.map(rowToDef);
  return cache;
}

export function getSpecies(key: string): SpeciesDef | null {
  if (!key) return null;
  return listSpecies().find((s) => s.key === key) ?? null;
}

/** 物种满级（究极体）所需累计经验，即其阈值数组的最后一位 */
export function speciesMaxExp(sp: SpeciesDef): number {
  return sp.stageExp[sp.stageExp.length - 1] ?? DEFAULT_STAGE_EXP[DEFAULT_STAGE_EXP.length - 1];
}
