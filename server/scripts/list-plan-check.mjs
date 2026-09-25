// 用真 schema 建一个临时库，对每个"记录列表"的实际 SQL 跑 EXPLAIN QUERY PLAN。
// 目的：把「哪些列表走了索引、哪些在扫全表 + 临时排序」一次性摊开，作为统一方案的依据。
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 走 dist 产物（和运行时同一份实现）。用 `import.meta.url` 定位，
// **不要用 cwd 相对路径** —— npm 脚本的 cwd 是 `server/`，写成 `../server/dist/...`
// 会解析成 `server/server/dist/...` 而 ModuleNotFound。
const distEntry = new URL('../dist/db/index.js', import.meta.url);
if (!existsSync(distEntry)) {
  console.error(`找不到 ${distEntry.pathname}，先跑：npm run build --workspace server`);
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), 'plan-'));
process.env.DATA_DIR = dir;

const { initDb, getDb } = await import(distEntry.href);
initDb(dir);
const db = getDb();

// child user 用于外键成立
db.prepare("INSERT INTO users (id, name, role, pin, pin_lookup, avatar, total_points) VALUES (9001,'娃','child','x','y','',0)").run();
db.prepare("INSERT INTO users (id, name, role, password_hash, avatar, total_points) VALUES (9002,'家长','parent','x','',0)").run();

const NOW = 1700000000;

// 每条都必须与 routes/*.ts 里的真实 SQL 逐字一致（尤其排序结尾的 `, id DESC`）——
// 少写一个排序项会让问题"看起来不存在"，实测吃过这个亏。
const CASES = [
  ['家长 任务·进行中', "SELECT * FROM adhoc_tasks t WHERE t.status = 'active' AND (t.deadline IS NULL OR t.deadline > ?) ORDER BY t.created_at DESC, t.id DESC", [NOW]],
  ['家长 任务·已超时', "SELECT * FROM adhoc_tasks t WHERE (t.status = 'expired' OR (t.status='active' AND t.deadline IS NOT NULL AND t.deadline <= ?)) ORDER BY t.created_at DESC, t.id DESC", [NOW]],
  ['家长 任务·已完成', "SELECT * FROM adhoc_tasks t WHERE t.status = 'completed' ORDER BY t.created_at DESC, t.id DESC", []],
  ['孩子 我的任务', "SELECT * FROM adhoc_tasks t WHERE t.user_id = ? AND (t.status = 'active' OR EXISTS(SELECT 1 FROM task_completions c WHERE c.task_id=t.id AND c.status='pending')) ORDER BY t.created_at DESC, t.id DESC", [9001]],
  ['家长 审核·兑换列表', "SELECT * FROM exchange_requests WHERE status = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?", ['pending', 20, 0]],
  ['家长 审核·完成列表', "SELECT * FROM task_completions WHERE status = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?", ['pending', 20, 0]],
  ['孩子 我的兑换记录', "SELECT * FROM exchange_requests WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?", [9001, 20, 0]],
  ['家长 积分记录(全) ', "SELECT * FROM point_logs ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?", [20, 0]],
  ['家长 积分记录(单人)', "SELECT * FROM point_logs WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?", [9001, 20, 0]],
  ['孩子 我的积分记录', "SELECT * FROM point_logs WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?", [9001, 20, 0]],
  ['孩子 宠物喂养记录', "SELECT * FROM pet_logs WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?", [9001, 20, 0]],
  ['家长 宠物记录(单人)', "SELECT * FROM pet_logs WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?", [9001, 20, 0]],
  ['家长 周期任务列表', "SELECT r.*, u.name FROM recurring_tasks r JOIN users u ON u.id = r.user_id ORDER BY r.created_at DESC", [], 'B'],
  ['商品列表(家长)', "SELECT * FROM products ORDER BY kind ASC, status DESC, created_at DESC", [], 'B'],
  ['积分项列表', "SELECT * FROM point_items ORDER BY type, sort_order, id", [], 'B'],
  ['小孩列表', "SELECT * FROM users WHERE role='child' ORDER BY total_points DESC, id ASC", [], 'B'],
  // 计数：每次翻页都会跑一次
  ['COUNT 点流水(全)', "SELECT COUNT(*) FROM point_logs", []],
  ['COUNT 点流水(单人)', "SELECT COUNT(*) FROM point_logs WHERE user_id = ?", [9001]],
  ['COUNT 宠物流水(单人)', "SELECT COUNT(*) FROM pet_logs WHERE user_id = ?", [9001]],
  ['COUNT 兑换(状态)', "SELECT COUNT(*) FROM exchange_requests WHERE status = ?", ['approved']],
  ['COUNT 完成(状态)', "SELECT COUNT(*) FROM task_completions WHERE status = ?", ['approved']],
  ['COUNT 任务(状态)', "SELECT COUNT(*) FROM adhoc_tasks WHERE status='completed'", []],
];

// 判定单步是否「慢」。SQLite 的措辞差别很大，别一把梭：
//   `SCAN t USING INDEX i`    → 有序索引遍历，**正是我们要的**（顺着索引取前 N 行、不排序）
//   `SCAN t`                  → 真·全表扫
//   `SEARCH t USING INDEX i`  → 按条件定位，最好
//   `USE TEMP B-TREE FOR ...` → 需要临时排序，多半是索引列没覆盖完整 ORDER BY
const isSlowStep = (d) => {
  if (/TEMP B-TREE/.test(d)) return true;
  if (!/^SCAN /.test(d)) return false;
  if (/USING (COVERING )?INDEX/.test(d)) return false;
  return true;
};

const out = [];
const say = (s) => {
  out.push(s);
  console.log(s);
};

say('列表 / SQL  →  执行计划');
say('='.repeat(96));
say('图例：[快]=走索引且不排序   [免修]=B 类配置清单（有界，故意不分页）   [慢]=A 类流水仍未走索引/仍在排序');
say('');

let slowCount = 0;
// 用例第 4 项 'B' = B 类配置清单（商品/积分项/图鉴/周期规则/小孩）：天然有界，
// 故意不分页也不建索引，全表扫 + 临时排序对它没有实际代价。
// 这里按**用例显式标注**而不是按 SQL 里的表名猜 —— 表名会被别名（`SCAN r`）挡住。
for (const [label, sql, params, cls] of CASES) {
  let plan;
  try {
    plan = db.prepare('EXPLAIN QUERY PLAN ' + sql).all(...params);
  } catch (e) {
    say(`${label}\n    !! ${e.message}`);
    continue;
  }
  const steps = plan.map((r) => r.detail);
  const exempt = cls === 'B';
  const slow = steps.some(isSlowStep);
  if (slow && !exempt) slowCount += 1;
  const tag = exempt ? '[免修]' : (slow ? '[慢]' : '[快]');
  say(`${tag} ${label}`);
  say(`      ${steps.join('  |  ')}`);
}

say('');
say(`(done)  A 类流水里仍有 ${slowCount} 条未走索引/仍在临时排序`);

db.close();
rmSync(dir, { recursive: true, force: true });

// 自己落盘，不依赖外层 `>` 重定向（本机管道/重定向容易踩缓冲和编码的坑）。
const reportDir = new URL('../../dist/list-audit/', import.meta.url);
mkdirSync(reportDir, { recursive: true });
const reportPath = new URL('explain-query-plan.txt', reportDir);
writeFileSync(reportPath, out.join('\n') + '\n', 'utf8');
console.log(`\n报告已写入 ${fileURLToPath(reportPath)}`);

