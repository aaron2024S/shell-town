// 英语单词答题游戏（quiz）。
//
// 防刷设计：
//   1. 出题时答案只存服务端（quiz_rounds.questions），下发给前端的题目不带正确项标记；
//   2. 判题逐题进行，每题只能判一次（answered 标记），整轮判完自动关闭；
//   3. 计分入账在事务内完成，每日上限（settings: quiz_daily_cap）内 clamp；
//   4. 发音文件名用 sha1(word) 哈希而非单词本身——"听音选词"题的网络请求不泄露答案。
//
// 计分规则（整数积分体系）：
//   一级：答对 2 题记 1 分（当日累计凑整，答对奇数题的"半分"保留到当日凑满，隔日清零）
//   二级：答对 1 题记 1 分
//   每日上限默认 20 分，家长端可调（PUT /quiz/settings）。
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createReadStream, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { getDb } from '../db/index.js';
import { requireChild, requireParent } from '../middleware.js';
import { localDateKey } from '../dates.js';
import { config } from '../config.js';

const ROUND_SIZE = 10;
const LEVEL1_ANSWERS_PER_POINT = 2;
/**
 * 每局「听音选词」题数上限：一组 10 题里最多 2 道（即 2/10 的比例）。
 *
 * 此前出题是 `i % 2 === 0 ? 'en2cn' : 'listen'` 奇偶交替 → 10 题里 5 道听音，
 * 家长反馈「听音频选词出现的比例太高」。
 * 注意 listen 题不下发 word（防泄题），所以题量少了之后仍有 2 道可用于辨音练习。
 */
const MAX_LISTEN_PER_ROUND = 2;

interface QuizWordRow {
  id: number;
  word: string;
  display: string;
  level: 1 | 2;
  phonetic: string | null;
  translation: string;
}

interface StoredQuestion {
  wordId: number;
  options: string[];
  correctIndex: number;
  type: 'en2cn' | 'listen';
  answered: 0 | 1 | null;
}

function audioName(word: string): string {
  return createHash('sha1').update(word.toLowerCase()).digest('hex').slice(0, 16) + '.mp3';
}

function getDailyCap(): number {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = 'quiz_daily_cap'").get() as { value: string } | undefined;
  const n = Number(row?.value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 20;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function registerQuizRoutes(app: FastifyInstance) {
  // ---- 孩子端 ----

  // 今日答题状态 + 词库规模
  app.get('/quiz/status', { preHandler: requireChild }, async (req) => {
    const db = getDb();
    const uid = req.user!.sub;
    const today = localDateKey();
    const row = db.prepare(
      'SELECT level1_correct, level2_correct, points FROM quiz_daily WHERE user_id = ? AND date = ?'
    ).get(uid, today) as { level1_correct: number; level2_correct: number; points: number } | undefined;
    const l1 = (db.prepare('SELECT COUNT(*) as c FROM quiz_words WHERE level = 1').get() as { c: number }).c;
    const l2 = (db.prepare('SELECT COUNT(*) as c FROM quiz_words WHERE level = 2').get() as { c: number }).c;
    const cap = getDailyCap();
    return {
      todayPoints: row?.points ?? 0,
      dailyCap: cap,
      level1Correct: row?.level1_correct ?? 0,
      level2Correct: row?.level2_correct ?? 0,
      // 一级答对奇数题时的"半分"进度（凑满 2 题记 1 分）
      level1PendingHalf: ((row?.level1_correct ?? 0) % LEVEL1_ANSWERS_PER_POINT) > 0,
      wordCounts: { 1: l1, 2: l2 },
    };
  });

  // 开一轮：10 题，以 en2cn（看词选义）为主，最多 MAX_LISTEN_PER_ROUND 道 listen（听音选词）
  app.post('/quiz/round', { preHandler: requireChild }, async (req, reply) => {
    const parsed = z.object({ level: z.union([z.literal(1), z.literal(2)]) }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const level = parsed.data.level;

    const db = getDb();
    const pool = db.prepare(
      'SELECT id, word, display, phonetic, translation FROM quiz_words WHERE level = ? ORDER BY RANDOM() LIMIT 40'
    ).all(level) as QuizWordRow[];
    if (pool.length < 4) return reply.code(409).send({ error: 'word_bank_empty' });

    const questions = pool.slice(0, Math.min(ROUND_SIZE, pool.length));
    // 听音题：位置随机（不再是固定奇偶位，避免孩子摸到规律），整组数量封顶。
    // 按比例换算，题库不足一整组时向上取整且永不超过上限：
    //   10 题 → 2 道；6~9 题 → 2 道；5 题 → 1 道；4 题 → 1 道
    const listenCount = Math.min(
      MAX_LISTEN_PER_ROUND,
      Math.ceil((questions.length * MAX_LISTEN_PER_ROUND) / ROUND_SIZE),
    );
    const listenSlots = new Set(shuffle(questions.map((_, i) => i)).slice(0, listenCount));
    const stored: StoredQuestion[] = [];
    const payload: Array<Record<string, unknown>> = [];

    questions.forEach((w, i) => {
      const type: 'en2cn' | 'listen' = listenSlots.has(i) ? 'listen' : 'en2cn';
      // 干扰项：从同档词库随机取，保证与正确项及彼此不重复
      const optionValues = new Set<string>([type === 'en2cn' ? w.translation : w.display]);
      for (const cand of shuffle(pool)) {
        if (optionValues.size >= 4) break;
        const v = type === 'en2cn' ? cand.translation : cand.display;
        if (cand.id === w.id || optionValues.has(v)) continue;
        optionValues.add(v);
      }
      const options = shuffle([...optionValues]);
      const correctIndex = options.indexOf(type === 'en2cn' ? w.translation : w.display);
      stored.push({ wordId: w.id, options, correctIndex, type, answered: null });
      payload.push(type === 'en2cn'
        ? { index: i, type, word: w.display, phonetic: w.phonetic, audio: `/quiz-audio/${audioName(w.word)}`, options }
        : { index: i, type, audio: `/quiz-audio/${audioName(w.word)}`, options });
    });

    const result = db.prepare(
      'INSERT INTO quiz_rounds (user_id, level, questions) VALUES (?, ?, ?)'
    ).run(req.user!.sub, level, JSON.stringify(stored));

    return { roundId: result.lastInsertRowid, level, questions: payload };
  });

  // 逐题判题 + 计分
  app.post('/quiz/answer', { preHandler: requireChild }, async (req, reply) => {
    const parsed = z.object({
      roundId: z.number().int().positive(),
      index: z.number().int().min(0),
      choice: z.number().int().min(0).max(3),
    }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const { roundId, index, choice } = parsed.data;

    const db = getDb();
    const uid = req.user!.sub;
    const round = db.prepare(
      'SELECT id, user_id, level, questions, finished FROM quiz_rounds WHERE id = ?'
    ).get(roundId) as { id: number; user_id: number; level: 1 | 2; questions: string; finished: number } | undefined;
    if (!round || round.user_id !== uid) return reply.code(404).send({ error: 'not_found' });
    if (round.finished) return reply.code(409).send({ error: 'round_finished' });

    const questions = JSON.parse(round.questions) as StoredQuestion[];
    const q = questions[index];
    if (!q) return reply.code(404).send({ error: 'not_found' });
    if (q.answered !== null) return reply.code(409).send({ error: 'already_answered' });

    const correct = choice === q.correctIndex;
    q.answered = correct ? 1 : 0;
    const allAnswered = questions.every((x) => x.answered !== null);
    db.prepare('UPDATE quiz_rounds SET questions = ?, finished = ? WHERE id = ?')
      .run(JSON.stringify(questions), allAnswered ? 1 : 0, roundId);

    // 正确答案的详细信息（答错也回传，方便当场记忆）
    const w = db.prepare(
      'SELECT word, display, phonetic, translation FROM quiz_words WHERE id = ?'
    ).get(q.wordId) as QuizWordRow | undefined;

    let delta = 0;
    let todayPoints = 0;
    let capReached = false;
    if (correct) {
      // 事务：更新当日账本 → 按 clamp 后的差额入账（上限内才加分）
      const today = localDateKey();
      const cap = getDailyCap();
      const row = db.prepare(
        'SELECT level1_correct, level2_correct, points FROM quiz_daily WHERE user_id = ? AND date = ?'
      ).get(uid, today) as { level1_correct: number; level2_correct: number; points: number } | undefined;

      const l1 = (row?.level1_correct ?? 0) + (round.level === 1 ? 1 : 0);
      const l2 = (row?.level2_correct ?? 0) + (round.level === 2 ? 1 : 0);
      const target = Math.floor(l1 / LEVEL1_ANSWERS_PER_POINT) + l2;
      const awarded = Math.min(target, cap);
      delta = awarded - (row?.points ?? 0);

      const awardTxn = db.transaction(() => {
        db.prepare(`
          INSERT INTO quiz_daily (user_id, date, level1_correct, level2_correct, points)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(user_id, date) DO UPDATE SET
            level1_correct = excluded.level1_correct,
            level2_correct = excluded.level2_correct,
            points = excluded.points
        `).run(uid, today, l1, l2, awarded);
        if (delta > 0) {
          db.prepare('UPDATE users SET total_points = total_points + ? WHERE id = ?').run(delta, uid);
          db.prepare(`
            INSERT INTO point_logs (user_id, delta, source, ref_id, ref_type, note)
            VALUES (?, ?, 'quiz', ?, 'quiz_round', ?)
          `).run(uid, delta, roundId, `单词答题（${round.level === 1 ? '一级' : '二级'}）：${w?.display ?? ''}`);
        }
      });
      awardTxn();
      todayPoints = awarded;
      capReached = awarded >= cap && target > awarded;
    } else {
      const row = db.prepare(
        'SELECT points FROM quiz_daily WHERE user_id = ? AND date = ?'
      ).get(uid, localDateKey()) as { points: number } | undefined;
      todayPoints = row?.points ?? 0;
    }

    return {
      correct,
      correctIndex: q.correctIndex,
      word: w?.display ?? '',
      phonetic: w?.phonetic ?? '',
      translation: w?.translation ?? '',
      audio: w ? `/quiz-audio/${audioName(w.word)}` : null,
      delta,
      todayPoints,
      capReached,
    };
  });

  // 发音文件：web/public/quiz-audio 由 vite 构建时原样拷入 dist，生产环境由
  // @fastify/static 直接服务（静态路径不走 /api 鉴权，文件名是哈希，不泄露单词）。
  // 这个端点用于兜底：文件缺失时返回 404，前端回退到浏览器 TTS。
  app.get('/quiz/audio-exists', { preHandler: requireChild }, async (req, reply) => {
    const id = Number((req.query as any)?.wordId);
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'invalid_input' });
    const w = getDb().prepare('SELECT word FROM quiz_words WHERE id = ?').get(id) as { word: string } | undefined;
    if (!w) return reply.code(404).send({ error: 'not_found' });
    const p = join(config.webDist, 'quiz-audio', audioName(w.word));
    return { exists: existsSync(p) };
  });

  // ---- 家长端 ----

  app.get('/quiz/settings', { preHandler: requireParent }, async () => {
    return { dailyCap: getDailyCap() };
  });

  app.put('/quiz/settings', { preHandler: requireParent }, async (req, reply) => {
    const parsed = z.object({ dailyCap: z.number().int().min(1).max(200) }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    getDb().prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES ('quiz_daily_cap', ?, unixepoch())
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(String(parsed.data.dailyCap));
    return { dailyCap: parsed.data.dailyCap };
  });
}

// 供启动日志/校验脚本使用
export function quizAudioPath(word: string): string {
  return join(config.webDist, 'quiz-audio', audioName(word));
}

// 保留 createReadStream 引用，未来音频改走鉴权流式下发时不用重新引入
void createReadStream;
