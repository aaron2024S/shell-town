// 到期自动结束（expireDueTasks）回归验证。
//
// 为什么是「真服务 + 真库」而不是纯单测：这次的正确性一半在 SQL，另一半在
// **查询侧与清扫规则的对称性** —— 清扫跳过的任务必须仍能被某个列表查到，
// 否则会出现「清扫不动它、列表也不显示它」的消失盲区。那种 bug 只有把
// 三个接口真的打一遍才照得出来。
//
// 用法：node scripts/expiry-regression.mjs   （或 npm run test:expiry --workspace server）
// 前置：先 npm run build --workspace server（本脚本跑的是 dist 产物，与线上一致）
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const require = createRequire(import.meta.url);
const serverRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const projectRoot = join(serverRoot, '..');

const SERVER = join(serverRoot, 'dist', 'index.js');
const SECRET = 'expiry-regression-secret';
const PORT = 3099;

const tmpDir = mkdtempSync(join(tmpdir(), 'st-expiry-'));
const dataDir = join(tmpDir, 'data');

const out = [];
let failed = 0;
function check(name, cond, extra) {
  const ok = !!cond;
  if (!ok) failed++;
  out.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra !== undefined ? '   :: ' + extra : ''}`);
}
const ids = (arr) => (arr || []).map((t) => t.id);
const has = (arr, id) => ids(arr).includes(id);
const find = (arr, id) => (arr || []).find((t) => t.id === id);

async function waitReady(timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      // /api/version 不在 PUBLIC_PATHS 里，不带 token 会 401；
      // 「能拿到任何状态码」就说明已经在监听了，所以不判 r.ok。
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

  // 测试进程直连同一个库（与线上同样的 dist 产物）
  Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: SECRET, PORT: String(PORT) });
  db = require(join(serverRoot, 'dist', 'db', 'index.js')).initDb(dataDir);
  const rec = require(join(serverRoot, 'dist', 'recurring.js'));
  const auth = require(join(serverRoot, 'dist', 'auth.js'));

  const parent = db.prepare("SELECT id FROM users WHERE role = 'parent' ORDER BY id LIMIT 1").get();
  check('首启已自动创建家长账号', !!parent, parent && `id=${parent.id}`);
  if (!parent) throw new Error('没有家长账号');

  const now = Math.floor(Date.now() / 1000);
  const kid = Number(db.prepare(
    "INSERT INTO users (name, role, pin, pin_lookup, avatar, gender, total_points) VALUES (?, 'child', ?, ?, ?, ?, 0)",
  ).run('测试娃', 'x', 'lookup-' + Date.now(), 'rat', 'male').lastInsertRowid);

  const insTask = db.prepare(`
    INSERT INTO adhoc_tasks (name, description, category, points, status, deadline, user_id, created_by, created_at)
    VALUES (?, NULL, '其他', 10, ?, ?, ?, ?, ?)
  `);
  const mk = (name, status, deadline) =>
    Number(insTask.run(name, status, deadline, kid, parent.id, now).lastInsertRowid);

  const T1 = mk('T1 过期无申请', 'active', now - 3600);
  const T2 = mk('T2 过期有待审核', 'active', now - 3600);
  const T3 = mk('T3 未到期', 'active', now + 3600);
  const T4 = mk('T4 无截止', 'active', null);
  const T5 = mk('T5 已通过审核', 'completed', now - 3600);
  db.prepare('INSERT INTO task_completions (task_id, user_id, status, created_at) VALUES (?, ?, ?, ?)')
    .run(T2, kid, 'pending', now - 7200);

  // ---- 清扫本身 ----
  const n1 = rec.expireDueTasks();
  check('首次清扫只结束 T1 一条', n1 === 1, `changes=${n1}`);
  check('重复清扫幂等（第二次 0 条）', rec.expireDueTasks() === 0);

  const st = (id) => db.prepare('SELECT status FROM adhoc_tasks WHERE id = ?').get(id).status;
  check('T1 已落库为 expired', st(T1) === 'expired', st(T1));
  check('T2 保持 active —— 有待审核申请，不得判过期', st(T2) === 'active', st(T2));
  check('T3 保持 active —— 未到期', st(T3) === 'active', st(T3));
  check('T4 保持 active —— 无截止时间', st(T4) === 'active', st(T4));
  check('T5 保持 completed —— 已审核通过', st(T5) === 'completed', st(T5));

  // ---- 三个接口的列表归属 ----
  const pTok = await auth.signToken({ sub: parent.id, role: 'parent', name: 'admin' });
  const cTok = await auth.signToken({ sub: kid, role: 'child', name: '测试娃' });
  const get = async (p, tok) => {
    const r = await fetch(`http://127.0.0.1:${PORT}${p}`, { headers: { authorization: 'Bearer ' + tok } });
    const body = await r.json().catch(() => ({}));
    if (r.status !== 200) out.push(`      (GET ${p} -> ${r.status} ${JSON.stringify(body)})`);
    return body.tasks || [];
  };

  const active = await get('/api/adhoc-tasks?status=active', pTok);
  check('家长「进行中」含 T3 / T4', has(active, T3) && has(active, T4), JSON.stringify(ids(active)));
  check('家长「进行中」不含 T1（已结束）', !has(active, T1));
  check('家长「进行中」不含 T2（已过截止）', !has(active, T2));
  check('家长「进行中」不含 T5（已完成）', !has(active, T5));

  const expired = await get('/api/adhoc-tasks?status=expired', pTok);
  check('家长「已超时」含 T1', has(expired, T1), JSON.stringify(ids(expired)));
  check('家长「已超时」含 T2（到点待审核仍可追溯）', has(expired, T2));
  check('家长「已超时」不含 T3 / T4 / T5', !has(expired, T3) && !has(expired, T4) && !has(expired, T5));

  const done = await get('/api/adhoc-tasks?status=completed', pTok);
  check('家长「已完成」仍含 T5', has(done, T5), JSON.stringify(ids(done)));

  const mine = await get('/api/adhoc-tasks/mine', cTok);
  check('孩子列表已移除 T1（到期自动结束）', !has(mine, T1), JSON.stringify(ids(mine)));
  check('孩子列表含 T3 / T4', has(mine, T3) && has(mine, T4));
  check('孩子列表含 T2 且显示为「待审核」而不是「已超时」',
    (find(mine, T2) || {}).display_status === 'pending', (find(mine, T2) || {}).display_status);

  // ---- 60 秒清扫窗口：刚过截止还没轮到清扫的，不能两个 tab 都看不到 ----
  const T7 = mk('T7 刚过截止未清扫', 'active', now - 5);
  const active2 = await get('/api/adhoc-tasks?status=active', pTok);
  const expired2 = await get('/api/adhoc-tasks?status=expired', pTok);
  const mine2 = await get('/api/adhoc-tasks/mine', cTok);
  check('清扫窗口内 T7 不在「进行中」', !has(active2, T7), JSON.stringify(ids(active2)));
  check('清扫窗口内 T7 出现在「已超时」（不留消失盲区）', has(expired2, T7), JSON.stringify(ids(expired2)));
  check('清扫窗口内 T7 不在孩子列表', !has(mine2, T7), JSON.stringify(ids(mine2)));

  out.push(`      [fixture] parent=${parent.id} kid=${kid} T1=${T1} T2=${T2} T3=${T3} T4=${T4} T5=${T5} T7=${T7}`);
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
  writeFileSync(join(projectRoot, 'dist', 'expiry-check', 'expiry-result.txt'), report);
} catch { /* 目录不存在时不阻塞 */ }
process.exit(failed === 0 ? 0 : 1);
