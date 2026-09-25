// 记录列表统一方案（分页契约 + 索引 + 保留策略）的回归验证。
//
// 为什么是「真服务 + 真库」而不是纯单测：这次正确性的一半在 SQL 条件上，另一半在
// **删除边界**上 —— 保留策略必须只删流水明细，而待审核申请、进行中的任务、
// 正在答的那一局、以及所有人的积分余额都必须原封不动。这些只有把接口真的打一遍、
// 再回读数据库才照得出来。
//
// 用法：node scripts/list-regression.mjs   （或 npm run test:list --workspace server）
// 前置：先 npm run build --workspace server（本脚本跑的是 dist 产物，与线上一致）
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

const require = createRequire(import.meta.url);
const serverRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const projectRoot = join(serverRoot, '..');

const SERVER = join(serverRoot, 'dist', 'index.js');
const SECRET = 'list-regression-secret';
const PORT = 3098;
const DAY = 86400;

const tmpDir = mkdtempSync(join(tmpdir(), 'st-list-'));
const dataDir = join(tmpDir, 'data');

const out = [];
let failed = 0;
function check(name, cond, extra) {
  const ok = !!cond;
  if (!ok) failed++;
  out.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra !== undefined ? '   :: ' + extra : ''}`);
}

async function waitReady(timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      // /api/version 需要鉴权，不带 token 会 401；「能拿到任何状态码」就说明在监听了
      const r = await fetch(`http://127.0.0.1:${PORT}/api/version`);
      if (r.status > 0) return true;
    } catch { /* 还没起来 */ }
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}

const env = { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, JWT_SECRET: SECRET, NODE_ENV: 'production' };
const srv = spawn(process.execPath, [SERVER], { env, stdio: ['ignore', 'pipe', 'pipe'] });
let serverLog = '';
srv.stdout.on('data', (d) => { serverLog += d.toString(); });
srv.stderr.on('data', (d) => { serverLog += d.toString(); });

let db = null;

try {
  const t0 = Date.now();
  check('服务启动并响应 GET /api/version', await waitReady(60000), `耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (failed) throw new Error('服务未就绪:\n' + serverLog);

  Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: SECRET, PORT: String(PORT) });
  db = require(join(serverRoot, 'dist', 'db', 'index.js')).initDb(dataDir);
  const retention = require(join(serverRoot, 'dist', 'retention.js'));
  const auth = require(join(serverRoot, 'dist', 'auth.js'));

  const parent = db.prepare("SELECT id FROM users WHERE role = 'parent' ORDER BY id LIMIT 1").get();
  if (!parent) throw new Error('没有家长账号');
  const now = Math.floor(Date.now() / 1000);
  const kid = Number(db.prepare(
    "INSERT INTO users (name, role, pin, pin_lookup, avatar, gender, total_points) VALUES (?, 'child', ?, ?, ?, ?, ?)",
  ).run('测试娃', 'x', 'lookup-' + Date.now(), 'rat', 'male', 500).lastInsertRowid);

  const pTok = await auth.signToken({ sub: parent.id, role: 'parent', name: 'admin' });
  const cTok = await auth.signToken({ sub: kid, role: 'child', name: '测试娃' });
  const api = async (p, tok, init) => {
    const r = await fetch(`http://127.0.0.1:${PORT}${p}`, {
      ...init,
      headers: { authorization: 'Bearer ' + tok, 'content-type': 'application/json', ...(init?.headers || {}) },
    });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };

  // ═══ A. 分页契约 ══════════════════════════════════════════════════
  const insTask = db.prepare(`
    INSERT INTO adhoc_tasks (name, description, category, points, status, deadline, user_id, created_by, created_at, completed_at)
    VALUES (?, NULL, '其他', 10, ?, ?, ?, ?, ?, ?)
  `);
  const bulk = db.transaction(() => {
    for (let i = 0; i < 205; i++) {
      insTask.run(`批量完成 ${i}`, 'completed', now - 3600, kid, parent.id, now - 100000 + i, now - 100000 + i);
    }
  });
  bulk();

  const p1 = await api('/api/adhoc-tasks?status=completed', pTok);
  check('任务列表默认分页：只回 20 条（此前是全量 205）', p1.body.tasks?.length === 20, `实际 ${p1.body.tasks?.length}`);
  check('任务列表返回 total（分页条要靠它算页数）', p1.body.total >= 205, `total=${p1.body.total}`);

  const p2 = await api('/api/adhoc-tasks?status=completed&limit=5&offset=0', pTok);
  check('任务列表 limit=5 生效', p2.body.tasks?.length === 5, `实际 ${p2.body.tasks?.length}`);
  const p2ids = (p2.body.tasks || []).map((t) => t.id);

  const p3 = await api('/api/adhoc-tasks?status=completed&limit=5&offset=10', pTok);
  const p3ids = (p3.body.tasks || []).map((t) => t.id);
  check('offset 生效且与第一页不重叠', p3.body.tasks?.length === 5 && !p3ids.some((i) => p2ids.includes(i)));

  const p4 = await api('/api/adhoc-tasks?status=completed&limit=9999', pTok);
  check('limit 超上限被钳到 200（不是全量给出）', p4.body.tasks?.length === 200, `实际 ${p4.body.tasks?.length}`);

  // 这里正是旧实现的崩溃点：Math.min(Number('abc'), 200) === NaN，绑进 LIMIT 会抛 TypeError
  const p5 = await api('/api/adhoc-tasks?status=completed&limit=abc', pTok);
  check('limit 传非法值不报错（旧实现在这里会 NaN 崩掉）', p5.status === 200 && p5.body.tasks?.length === 20,
    `status=${p5.status} len=${p5.body.tasks?.length}`);

  const p6 = await api('/api/adhoc-tasks?status=completed&limit=0', pTok);
  check('limit=0 回落默认页大小', p6.body.tasks?.length === 20, `实际 ${p6.body.tasks?.length}`);

  const pl = await api('/api/point-logs?limit=abc', pTok);
  check('积分记录 limit 传非法值不报错', pl.status === 200, `status=${pl.status} body=${JSON.stringify(pl.body).slice(0, 120)}`);

  // 完成申请列表此前默认 200，前端虽然每次都传 20，但漏传的调用方会一次拿 200 条
  const p7 = await api('/api/adhoc-tasks/completions?status=approved', pTok);
  check('审核·完成列表默认页大小已从 200 收敛到 20',
    (p7.body.completions || []).length <= 20 && p7.body.total !== undefined,
    `len=${(p7.body.completions || []).length} total=${p7.body.total}`);

  // ═══ B. 孩子端「我的任务」的 90 天窗口 ═════════════════════════════
  const OLD = Number(insTask.run('老待办-100天前', 'active', null, kid, parent.id, now - 100 * DAY, null).lastInsertRowid);
  const RECENT = Number(insTask.run('新待办-10天前', 'active', null, kid, parent.id, now - 10 * DAY, null).lastInsertRowid);

  const mine = (await api('/api/adhoc-tasks/mine', cTok)).body.tasks || [];
  const mineIds = mine.map((t) => t.id);
  check('孩子列表剔除了 100 天前的无截止任务', !mineIds.includes(OLD), JSON.stringify(mineIds.slice(0, 12)));
  check('孩子列表保留 10 天前的任务', mineIds.includes(RECENT));

  const parentActive = (await api('/api/adhoc-tasks?status=active&limit=200', pTok)).body.tasks || [];
  const parentActiveIds = parentActive.map((t) => t.id);
  check('家长「进行中」仍然看得到老任务（窗口只作用于孩子端展示）', parentActiveIds.includes(OLD));

  // ═══ C. 保留策略 ══════════════════════════════════════════════════
  const st0 = await api('/api/records/stats', pTok);
  check('记录管理返回保留天数（默认 90）', st0.body.retentionDays === 90, `retentionDays=${st0.body.retentionDays}`);
  check('记录管理返回默认值供前端「恢复默认」用', st0.body.defaultRetentionDays === 90,
    `defaultRetentionDays=${st0.body.defaultRetentionDays}`);

  const putR = await api('/api/records/retention', pTok, { method: 'PUT', body: JSON.stringify({ days: 30 }) });
  check('可设置保留天数', putR.status === 200 && putR.body.retentionDays === 30, JSON.stringify(putR.body));

  const putBad = await api('/api/records/retention', pTok, { method: 'PUT', body: JSON.stringify({ days: -1 }) });
  check('保留天数拒绝负数', putBad.status === 400, `status=${putBad.status}`);

  const days = (n) => new Date((now - n * DAY) * 1000).toISOString().slice(0, 10);

  // 造「该被清」与「绝不能清」两组数据
  const oldLog = Number(db.prepare('INSERT INTO point_logs (user_id, delta, source, note, created_at) VALUES (?, 1, ?, ?, ?)')
    .run(kid, 'daily', '老流水', now - 100 * DAY).lastInsertRowid);
  const newLog = Number(db.prepare('INSERT INTO point_logs (user_id, delta, source, note, created_at) VALUES (?, 1, ?, ?, ?)')
    .run(kid, 'daily', '新流水', now - 1 * DAY).lastInsertRowid);
  const oldPetLog = Number(db.prepare('INSERT INTO pet_logs (user_id, species, item_name, points, note, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(kid, 'rat', '老道具', 5, '', now - 100 * DAY).lastInsertRowid);

  const oldApprovedEx = Number(db.prepare("INSERT INTO exchange_requests (user_id, type, points, amount, status, created_at) VALUES (?, 'cash', 10, 1, 'approved', ?)")
    .run(kid, now - 100 * DAY).lastInsertRowid);
  const oldPendingEx = Number(db.prepare("INSERT INTO exchange_requests (user_id, type, points, amount, status, created_at) VALUES (?, 'cash', 10, 1, 'pending', ?)")
    .run(kid, now - 200 * DAY).lastInsertRowid);

  const oldTask = Number(insTask.run('老任务-已完成', 'completed', null, kid, parent.id, now - 200 * DAY, now - 100 * DAY).lastInsertRowid);
  const oldApprovedTc = Number(db.prepare('INSERT INTO task_completions (task_id, user_id, status, created_at) VALUES (?, ?, ?, ?)')
    .run(oldTask, kid, 'approved', now - 100 * DAY).lastInsertRowid);
  // 一条「200 天前的待审核申请」，挂在一条 active 任务上 —— 它是待办，绝不能因为"老"就被清
  const pendTask = Number(insTask.run('老任务-待审核', 'active', null, kid, parent.id, now - 200 * DAY, null).lastInsertRowid);
  const oldPendingTc = Number(db.prepare('INSERT INTO task_completions (task_id, user_id, status, created_at) VALUES (?, ?, ?, ?)')
    .run(pendTask, kid, 'pending', now - 200 * DAY).lastInsertRowid);
  // 一条没有任何申请的 active 老任务（无截止）：也是待办，不能被清
  const oldActiveTask = Number(insTask.run('老任务-进行中', 'active', null, kid, parent.id, now - 200 * DAY, null).lastInsertRowid);

  // 按天计数的内部表
  db.prepare('INSERT INTO daily_completions (user_id, item_id, date, count) VALUES (?, 1, ?, 1)').run(kid, days(100));
  db.prepare('INSERT INTO quiz_daily (user_id, date, level1_correct, level2_correct, points) VALUES (?, ?, 1, 0, 1)').run(kid, days(100));
  db.prepare('INSERT INTO pet_usage_daily (user_id, date, count, points) VALUES (?, ?, 1, 5)').run(kid, days(100));
  const oldRoundDone = Number(db.prepare('INSERT INTO quiz_rounds (user_id, level, questions, finished, created_at) VALUES (?, 1, ?, 1, ?)')
    .run(kid, '[]', now - 100 * DAY).lastInsertRowid);
  // finished = 0：孩子正在答的那一局，哪怕创建于 100 天前也不能删
  const oldRoundLive = Number(db.prepare('INSERT INTO quiz_rounds (user_id, level, questions, finished, created_at) VALUES (?, 1, ?, 0, ?)')
    .run(kid, '[]', now - 100 * DAY).lastInsertRowid);

  const pointsBefore = db.prepare('SELECT total_points FROM users WHERE id = ?').get(kid).total_points;

  const cl = await api('/api/records/cleanup', pTok, { method: 'POST', body: '{}' });
  check('手动清理返回执行结果', cl.status === 200 && cl.body.deleted > 0,
    `deleted=${cl.body.deleted} ${JSON.stringify((cl.body.tables || []).filter((t) => t.deleted))}`);

  const gone = (table, id) =>
    db.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE id = ?`).get(id).c === 0;
  const alive = (table, id) =>
    db.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE id = ?`).get(id).c === 1;

  check('100 天前的积分流水已清', gone('point_logs', oldLog));
  check('1 天前的积分流水仍在', alive('point_logs', newLog));
  check('100 天前的喂养流水已清', gone('pet_logs', oldPetLog));
  check('100 天前「已审核」的兑换申请已清', gone('exchange_requests', oldApprovedEx));
  check('★ 200 天前的「待审核」兑换申请仍在（待办永不删）', alive('exchange_requests', oldPendingEx));
  check('100 天前「已审核」的完成申请已清', gone('task_completions', oldApprovedTc));
  check('★ 200 天前的「待审核」完成申请仍在（待办永不删）', alive('task_completions', oldPendingTc));
  check('★ 挂着待审核申请的任务仍在（不能被级联删掉）', alive('adhoc_tasks', pendTask));
  check('★ 无截止的「进行中」老任务仍在（待办永不删）', alive('adhoc_tasks', oldActiveTask));
  check('100 天前已完成的旧任务已清', gone('adhoc_tasks', oldTask));
  check('100 天前的 daily_completions 已清',
    db.prepare('SELECT COUNT(*) as c FROM daily_completions WHERE date = ?').get(days(100)).c === 0);
  check('100 天前的 quiz_daily 已清',
    db.prepare('SELECT COUNT(*) as c FROM quiz_daily WHERE date = ?').get(days(100)).c === 0);
  check('100 天前的 pet_usage_daily 已清',
    db.prepare('SELECT COUNT(*) as c FROM pet_usage_daily WHERE date = ?').get(days(100)).c === 0);
  check('100 天前已结束的答题局已清', gone('quiz_rounds', oldRoundDone));
  check('★ finished=0 的答题局仍在（孩子正在答的那一局）', alive('quiz_rounds', oldRoundLive));

  const pointsAfter = db.prepare('SELECT total_points FROM users WHERE id = ?').get(kid).total_points;
  check('★★ 清理不动 users.total_points（只删流水，不碰汇总）',
    pointsAfter === pointsBefore, `${pointsBefore} -> ${pointsAfter}`);

  const cl2 = await api('/api/records/cleanup', pTok, { method: 'POST', body: '{}' });
  check('重复清理幂等（第二次 0 条）', cl2.body.deleted === 0, `deleted=${cl2.body.deleted}`);

  // 关闭自动清理
  await api('/api/records/retention', pTok, { method: 'PUT', body: JSON.stringify({ days: 0 }) });
  const keep = Number(db.prepare('INSERT INTO point_logs (user_id, delta, source, note, created_at) VALUES (?, 1, ?, ?, ?)')
    .run(kid, 'daily', '关闭后应保留', now - 100 * DAY).lastInsertRowid);
  const cl3 = await api('/api/records/cleanup', pTok, { method: 'POST', body: '{}' });
  check('保留天数填 0 = 关闭自动清理，接口明确回报 disabled', cl3.body.disabled === true, JSON.stringify(cl3.body));
  check('关闭状态下确实一条都没删', alive('point_logs', keep));

  // ═══ D. 索引是否真的生效 ══════════════════════════════════════════
  const plan = (sql, ...params) =>
    db.prepare('EXPLAIN QUERY PLAN ' + sql).all(...params).map((r) => r.detail).join('  |  ');

  const planCompleted = plan("SELECT * FROM adhoc_tasks t WHERE t.status = 'completed' ORDER BY t.created_at DESC, t.id DESC LIMIT 20 OFFSET 0");
  check('家长任务列表走索引（不再是 SCAN adhoc_tasks）',
    !/SCAN adhoc_tasks/.test(planCompleted) && /idx_adhoc_tasks_status/.test(planCompleted), planCompleted);
  check('家长任务列表无临时排序（索引末位补了 id DESC）',
    !/TEMP B-TREE/.test(planCompleted), planCompleted);

  const planMine = plan("SELECT * FROM adhoc_tasks t WHERE t.user_id = ? AND t.status = 'active' ORDER BY t.created_at DESC, t.id DESC LIMIT 20", kid);
  check('孩子任务列表走索引', /idx_adhoc_tasks_user/.test(planMine), planMine);
  check('孩子任务列表无临时排序', !/TEMP B-TREE/.test(planMine), planMine);

  const planPet = plan('SELECT * FROM pet_logs WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET 0', kid);
  check('喂养记录不再有临时排序（索引已补 id DESC）',
    !/TEMP B-TREE/.test(planPet), planPet);

  const idxSql = (n) => db.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND name=?").get(n)?.sql || '';
  check('pet_logs 索引定义确实含 id DESC', /created_at DESC, id DESC/.test(idxSql('idx_pet_logs_user')), idxSql('idx_pet_logs_user'));
  check('adhoc_tasks 两个索引定义都含 id DESC',
    /created_at DESC, id DESC/.test(idxSql('idx_adhoc_tasks_status')) &&
    /created_at DESC, id DESC/.test(idxSql('idx_adhoc_tasks_user')),
    idxSql('idx_adhoc_tasks_status'));

  // 同一类缺口在另外三张流水表上也存在（用 scripts/list-plan-check.mjs 对账时发现）：
  // 列表 SQL 统一排 `created_at DESC, id DESC`，索引只到 created_at 时末项仍要临时排序；
  // point_logs 还缺一条不带 user_id 的索引 —— 家长端「全部记录」因此是全表扫 + 临时排序。
  const planLogAll = plan('SELECT * FROM point_logs ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET 0');
  // 注意 SQLite 的措辞：`SCAN t USING INDEX i` 是**有序索引遍历**（正是我们要的，
  // 顺着索引取前 20 行、不排序）；只有不带 USING 的 `SCAN t` 才是全表扫。
  check('家长积分记录(全部)走 idx_point_logs_created 有序遍历（不再全表扫）',
    /SCAN point_logs USING INDEX idx_point_logs_created/.test(planLogAll), planLogAll);
  check('家长积分记录(全部)无临时排序', !/TEMP B-TREE/.test(planLogAll), planLogAll);

  const planLogOne = plan('SELECT * FROM point_logs WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET 0', kid);
  check('积分记录(单人)走索引且无临时排序',
    /idx_point_logs_user/.test(planLogOne) && !/TEMP B-TREE/.test(planLogOne), planLogOne);

  const planExch = plan("SELECT * FROM exchange_requests WHERE status = ? ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET 0", 'approved');
  check('兑换列表走索引且无临时排序',
    /idx_exchange_requests_status/.test(planExch) && !/TEMP B-TREE/.test(planExch), planExch);

  const planComp = plan("SELECT * FROM task_completions WHERE status = ? ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET 0", 'approved');
  check('审核·完成列表走索引且无临时排序',
    /idx_task_completions_status/.test(planComp) && !/TEMP B-TREE/.test(planComp), planComp);

  for (const n of ['idx_point_logs_user', 'idx_point_logs_created',
                   'idx_exchange_requests_status', 'idx_exchange_requests_user',
                   'idx_task_completions_status']) {
    check(`${n} 定义含 id DESC`, /created_at DESC, id DESC/.test(idxSql(n)), idxSql(n));
  }

  // 索引定义变更后必须能重建：ensureIndex 是拿 sqlite_master 里的定义和期望值比对，
  // 不一致就 DROP 重建。裸 CREATE INDEX IF NOT EXISTS 在这里是空操作 ——
  // 老库会永远停在旧定义上、"改了没生效"还不报错。
  {
    const dir2 = join(tmpDir, 'reindex');
    // initDb 假定目录已存在（真实部署里由 index.ts 启动时创建），这里要自己建
    mkdirSync(dir2, { recursive: true });
    const init = require(join(serverRoot, 'dist', 'db', 'index.js'));
    init.initDb(dir2);
    const raw = new (require('better-sqlite3'))(join(dir2, 'shell-town.db'));
    raw.exec('DROP INDEX IF EXISTS idx_adhoc_tasks_status');
    raw.exec('CREATE INDEX idx_adhoc_tasks_status ON adhoc_tasks(status, created_at DESC)');
    const before = raw.prepare("SELECT sql FROM sqlite_master WHERE name='idx_adhoc_tasks_status'").get().sql;
    raw.close();
    init.initDb(dir2); // 重跑迁移
    const after = init.getDb().prepare("SELECT sql FROM sqlite_master WHERE name='idx_adhoc_tasks_status'").get().sql;
    check('索引定义变了会被重建（不是被 IF NOT EXISTS 静默放过）',
      !/id DESC/.test(before) && /id DESC/.test(after), `before="${before}" after="${after}"`);
    // 切回主测试库：上面的 initDb(dir2) 把进程内的单例换掉了，
    // 后面 E 段的节流验证要在主库上跑
    db = init.initDb(dataDir);
  }

  // ═══ E. 清理节流 ══════════════════════════════════════════════════
  await api('/api/records/retention', pTok, { method: 'PUT', body: JSON.stringify({ days: 90 }) });
  retention.resetCleanupThrottle();
  const first = retention.cleanupIfDue();
  const second = retention.cleanupIfDue();
  check('cleanupIfDue 首次执行返回结果', Array.isArray(first), String(first && first.length));
  check('cleanupIfDue 24 小时内再次调用被节流跳过（60 秒 tick 不会变成 60 秒一次 DELETE）',
    second === null, String(second));

  out.push(`      [fixture] parent=${parent.id} kid=${kid} 批量任务=205 老待办=${OLD} 新待办=${RECENT}`);
} catch (e) {
  failed++;
  out.push('FAIL  *** 异常中断: ' + (e && e.message));
  if (serverLog.trim()) out.push('      --- 服务日志 ---\n' + serverLog.trim().split('\n').slice(-15).join('\n'));
} finally {
  try { if (db) db.close(); } catch { /* 忽略 */ }
  try { srv.kill(); } catch { /* 忽略 */ }
  try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* 忽略 */ }
}

const passed = out.filter((l) => l.startsWith('PASS')).length;
const report = out.join('\n') + `\n\n合计 ${passed} 通过 / ${failed} 失败\n`;
console.log(report);
try {
  writeFileSync(join(projectRoot, 'dist', 'list-audit', 'list-result.txt'), report);
} catch { /* 目录不存在时不阻塞 */ }
process.exit(failed === 0 ? 0 : 1);
