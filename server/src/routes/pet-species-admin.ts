// 家长端：宠物物种管理（增改删 + 分阶段图片上传）
//
// 设计要点：
// - 物种数据存 DB（pet_species 表），改名/emoji/阈值即时生效，无需重建镜像
// - 图片直接写入 web/dist/pets/<key>/<阶段>.<png|webp|jpg>，
//   @fastify/static 每请求实时读盘 → 上传后刷新页面即可看到；
//   Docker 部署时该目录挂载到宿主机 ./pets，上传即持久化
// - 上传走 PUT + application/octet-stream 裸文件流，避免引入 multipart 依赖
// - key 创建后不可改（改名/换形象都不影响历史数据与图片目录）

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { mkdirSync, writeFileSync, unlinkSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { getDb } from '../db/index.js';
import { requireParent } from '../middleware.js';
import { config } from '../config.js';
import { listSpecies, getSpecies, invalidateSpeciesCache } from '../species.js';
import { DEFAULT_STAGE_EXP_SNAPSHOT } from '../species-defaults.js';
import { pushToAll } from '../ws.js';

const KEY_RE = /^[a-z][a-z0-9_]{1,15}$/;

/**
 * 物种目录有任何变化时广播给所有在线客户端：
 * 孩子端收到后立即重拉 /pets/catalog 并清掉立绘探测缓存，
 * 无需刷新页面、更不需要重启容器。
 */
function notifySpeciesChanged(action: 'created' | 'updated' | 'deleted' | 'images', key: string): void {
  pushToAll({ type: 'species_changed', action, key });
}

const createSchema = z.object({
  key: z.string().regex(KEY_RE, 'key 需为 2~16 位小写字母/数字/下划线，且以字母开头'),
  name: z.string().trim().min(1).max(12),
  series: z.enum(['boy', 'girl']),
  gender: z.enum(['♂', '♀']),
  emoji: z.string().trim().min(1).max(8),
  stageExp: z.array(z.number().int().min(0)).length(5).optional(),
});

const updateSchema = z.object({
  name: z.string().trim().min(1).max(12).optional(),
  series: z.enum(['boy', 'girl']).optional(),
  gender: z.enum(['♂', '♀']).optional(),
  emoji: z.string().trim().min(1).max(8).optional(),
  stageExp: z.array(z.number().int().min(0)).length(5).optional(),
});

/** 校验 5 阶段阈值：首项必须为 0，严格递增 */
function validStageExp(arr: number[]): boolean {
  return arr[0] === 0 && arr.every((v, i) => i === 0 || v > arr[i - 1]);
}

const IMAGE_EXTS = ['png', 'webp', 'jpg'] as const;

/** 魔数识别图片类型（不信任客户端给的扩展名） */
function extFromMagic(buf: Buffer): (typeof IMAGE_EXTS)[number] | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xdb) return 'jpg';
  return null;
}

function speciesDir(key: string): string {
  return join(config.petAssetsDir, key);
}

/** 删掉某阶段的其他扩展名文件（换图后避免旧格式被命中） */
function removeSiblings(dir: string, stage: number, keepExt?: string): void {
  if (!existsSync(dir)) return;
  for (const ext of IMAGE_EXTS) {
    if (ext === keepExt) continue;
    const p = join(dir, `${stage}.${ext}`);
    if (existsSync(p)) {
      try { unlinkSync(p); } catch { /* ignore */ }
    }
  }
}

/** 统计某物种已有哪些阶段的图片（0=专属蛋，1~4=形态） */
function imageInfo(key: string): { stages: Record<string, boolean> } {
  const dir = speciesDir(key);
  const stages: Record<string, boolean> = { '0': false, '1': false, '2': false, '3': false, '4': false };
  if (!existsSync(dir)) return { stages };
  try {
    for (const f of readdirSync(dir)) {
      const m = /^([0-4])\.(png|webp|jpg)$/.exec(f);
      if (m) stages[m[1]] = true;
    }
  } catch { /* ignore */ }
  return { stages };
}

function serializeSpecies(sp: ReturnType<typeof getSpecies> & object) {
  return { ...sp, images: imageInfo(sp.key).stages };
}

export function registerPetSpeciesAdminRoutes(app: FastifyInstance) {
  // ── 清单（含每个阶段的图片有无）────────────────────────────────────
  app.get('/admin/pets/species', { preHandler: requireParent }, async () => {
    return { species: listSpecies().map(serializeSpecies) };
  });

  // ── 新建物种 ───────────────────────────────────────────────────────
  app.post('/admin/pets/species', { preHandler: requireParent }, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input', detail: parsed.error.issues[0]?.message });
    const d = parsed.data;
    if (d.stageExp && !validStageExp(d.stageExp)) {
      return reply.code(400).send({ error: 'invalid_stage_exp', detail: '阈值需从 0 开始且逐级递增' });
    }
    const db = getDb();
    if (getSpecies(d.key)) return reply.code(409).send({ error: 'key_exists' });

    const nextSort = db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM pet_species').get() as any;
    db.prepare(`
      INSERT INTO pet_species (key, name, series, gender, emoji, stage_exp, is_custom, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `).run(d.key, d.name, d.series, d.gender, d.emoji, JSON.stringify(d.stageExp ?? DEFAULT_STAGE_EXP_SNAPSHOT), nextSort.n);
    invalidateSpeciesCache();
    notifySpeciesChanged('created', d.key);
    return { species: serializeSpecies(getSpecies(d.key)!) };
  });

  // ── 编辑（名称 / emoji / 系列 / 阶段阈值；key 不可改）───────────────
  app.patch('/admin/pets/species/:key', { preHandler: requireParent }, async (req, reply) => {
    const key = String((req.params as any).key || '');
    const sp = getSpecies(key);
    if (!sp) return reply.code(404).send({ error: 'species_not_found' });

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input', detail: parsed.error.issues[0]?.message });
    const d = parsed.data;
    if (d.stageExp && !validStageExp(d.stageExp)) {
      return reply.code(400).send({ error: 'invalid_stage_exp', detail: '阈值需从 0 开始且逐级递增' });
    }

    const name = d.name ?? sp.name;
    const series = d.series ?? sp.series;
    const gender = d.gender ?? sp.gender;
    const emoji = d.emoji ?? sp.emoji;
    const stageExp = JSON.stringify(d.stageExp ?? sp.stageExp);
    getDb().prepare(`
      UPDATE pet_species SET name = ?, series = ?, gender = ?, emoji = ?, stage_exp = ?, updated_at = unixepoch()
      WHERE key = ?
    `).run(name, series, gender, emoji, stageExp, key);
    invalidateSpeciesCache();
    notifySpeciesChanged('updated', key);
    return { species: serializeSpecies(getSpecies(key)!) };
  });

  // ── 删除（仅家长自建物种；且有小孩养着时禁止删）────────────────────
  app.delete('/admin/pets/species/:key', { preHandler: requireParent }, async (req, reply) => {
    const key = String((req.params as any).key || '');
    const sp = getSpecies(key);
    if (!sp) return reply.code(404).send({ error: 'species_not_found' });
    if (!sp.isCustom) return reply.code(403).send({ error: 'builtin_protected' });

    const db = getDb();
    const used = db.prepare('SELECT COUNT(*) AS c FROM pets WHERE species = ?').get(key) as any;
    if (used.c > 0) return reply.code(409).send({ error: 'species_in_use' });

    db.prepare('DELETE FROM pet_species WHERE key = ?').run(key);
    invalidateSpeciesCache();
    notifySpeciesChanged('deleted', key);
    // 顺手清理该物种的图片目录（自定义物种才有）
    try {
      rmSync(speciesDir(key), { recursive: true, force: true });
    } catch (err) {
      // 清理失败不影响删除结果（DB 记录已删），但要留下线索便于运维排查残留目录
      app.log.warn({ key, err }, '清理物种图片目录失败，可能残留目录');
    }
    return { ok: true };
  });

  // ── 上传某阶段图片（stage: 0=专属蛋 1~4=形态；octet-stream 裸文件）──
  app.put('/admin/pets/species/:key/images/:stage', { preHandler: requireParent, bodyLimit: 12 * 1024 * 1024 }, async (req, reply) => {
    const key = String((req.params as any).key || '');
    const sp = getSpecies(key);
    if (!sp) return reply.code(404).send({ error: 'species_not_found' });

    const stage = Number((req.params as any).stage);
    if (!Number.isInteger(stage) || stage < 0 || stage > 4) {
      return reply.code(400).send({ error: 'invalid_stage' });
    }

    const body = req.body as Buffer | undefined;
    if (!body || !Buffer.isBuffer(body) || body.length === 0) {
      return reply.code(400).send({ error: 'empty_file' });
    }
    if (body.length > 10 * 1024 * 1024) {
      return reply.code(413).send({ error: 'file_too_large' });
    }
    const ext = extFromMagic(body);
    if (!ext) return reply.code(400).send({ error: 'unsupported_type', detail: '仅支持 PNG / WebP / JPEG' });

    const dir = speciesDir(key);
    mkdirSync(dir, { recursive: true });
    removeSiblings(dir, stage);           // 先清掉同阶段旧格式
    const filename = `${stage}.${ext}`;
    writeFileSync(join(dir, filename), body);
    notifySpeciesChanged('images', key);

    return { ok: true, stage, url: `/pets/${key}/${filename}`, images: imageInfo(key).stages };
  });
}
