/**
 * 迁移回归测试：`task_completions` 去掉 UNIQUE 约束必须是无损的。
 *
 * 背景：老版本为了「同一任务同一小孩只能提交一次」，在 task_completions 上建了
 * UNIQUE(task_id, user_id)；后来改成允许被拒绝后重新提交，就需要去掉这个约束。
 * 早期实现是直接 DROP TABLE 再按新结构重建 —— 历史完成记录（含 approved 的
 * 积分凭据）会整表丢光且没有备份。现改为「建临时表 → 搬数据 → 删旧表 → 改名」，
 * 本脚本就是守住这条底线。
 *
 * 跑法：npm run test:migration --workspace server
 */
import { mkdtempSync, rmSync, existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { initDb, getDb } from '../src/db/index.js';
import { generateDueTasks, issueTemplate } from '../src/recurring.js';

let failures = 0;
function check(label: string, ok: boolean, detail = ''): void {
  if (ok) {
    console.log(`  ✅ ${label}`);
  } else {
    failures += 1;
    console.error(`  ❌ ${label} ${detail}`);
  }
}

/** 老版本的 task_completions：结构与新表一致，但多一条 UNIQUE(task_id, user_id) */
const OLD_TASK_COMPLETIONS = `
CREATE TABLE task_completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES adhoc_tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(task_id, user_id)
)`;

/** 老版本的 point_logs：source/ref_type 的 CHECK 不含 quiz（1.6.10 之前） */
const OLD_POINT_LOGS = `
CREATE TABLE point_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('daily', 'adhoc', 'exchange', 'adjust')),
  ref_id INTEGER,
  ref_type TEXT CHECK (ref_type IS NULL OR ref_type IN ('point_item', 'adhoc_task', 'exchange_request', 'product')),
  note TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
)`;

function main(): void {
  const dataDir = mkdtempSync(join(tmpdir(), 'shell-town-migration-'));
  const dbPath = join(dataDir, 'shell-town.db');
  console.log(`\n数据目录: ${dataDir}`);

  try {
    // ── 1. 先用正常流程建出一个现代库，再把它「降级」成老结构 ────────────
    let raw = initDb(dataDir);
    raw.close();

    raw = new Database(dbPath);
    raw.pragma('foreign_keys = ON');

    const parentId = (raw.prepare("SELECT id FROM users WHERE role = 'parent' ORDER BY id LIMIT 1").get() as any)?.id;
    if (!parentId) throw new Error('未找到家长账号，initDb 初始化异常');

    raw.prepare("INSERT INTO users (name, role, pin) VALUES ('测试娃A', 'child', 'x'), ('测试娃B', 'child', 'x')").run();
    const kidIds = (raw.prepare("SELECT id FROM users WHERE role = 'child' ORDER BY id").all() as any[]).map((r) => r.id);

    raw.prepare("INSERT INTO adhoc_tasks (name, points, user_id, created_by, status) VALUES ('洗碗', 5, ?, ?, 'active')").run(kidIds[0], parentId);
    raw.prepare("INSERT INTO adhoc_tasks (name, points, user_id, created_by, status) VALUES ('拖地', 3, ?, ?, 'active')").run(kidIds[0], parentId);
    const [taskA, taskB] = (raw.prepare('SELECT id FROM adhoc_tasks ORDER BY id').all() as any[]).map((r) => r.id);

    // 换成老结构（带 UNIQUE），并塞入三条不同状态的历史记录
    raw.exec('DROP TABLE IF EXISTS task_completions');
    raw.exec(OLD_TASK_COMPLETIONS);
    const insert = raw.prepare(`
      INSERT INTO task_completions (id, task_id, user_id, status, reason, reviewed_by, reviewed_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run(1, taskA, kidIds[0], 'approved', null, parentId, 1_700_000_100, 1_700_000_000);
    insert.run(2, taskA, kidIds[1], 'rejected', '照片看不清', parentId, 1_700_000_200, 1_700_000_050);
    insert.run(3, taskB, kidIds[0], 'pending', null, null, null, 1_700_000_300);

    const before = raw.prepare('SELECT * FROM task_completions ORDER BY id').all() as any[];
    const oldSql = (raw.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='task_completions'").get() as any).sql;

    // point_logs 同样降级到不含 quiz 的老 CHECK，塞两条历史流水
    raw.exec('DROP TABLE IF EXISTS point_logs');
    raw.exec(OLD_POINT_LOGS);
    raw.prepare(`
      INSERT INTO point_logs (id, user_id, delta, source, note, created_at)
      VALUES (1, ?, 5, 'daily', '完成作业', 1_700_000_000), (2, ?, -2, 'adjust', '发脾气', 1_700_000_100)
    `).run(kidIds[0], kidIds[0]);
    const plBefore = raw.prepare('SELECT * FROM point_logs ORDER BY id').all() as any[];
    raw.close();

    // 周期任务（1.6.11 场景）：模拟老库 —— recurring_issued 尚未出现，
    // 但已有一个模板和一条它生成的实例（带 recurring_id/period_key）
    raw = new Database(dbPath);
    raw.pragma('foreign_keys = ON');
    raw.exec('DROP TABLE IF EXISTS recurring_issued');
    raw.prepare(
      "INSERT INTO recurring_tasks (name, points, user_id, created_by, freq) VALUES ('每天刷牙', 1, ?, ?, 'daily')",
    ).run(kidIds[0], parentId);
    const ruleId = (raw.prepare('SELECT id FROM recurring_tasks ORDER BY id DESC LIMIT 1').get() as any).id as number;
    raw.prepare(
      "INSERT INTO adhoc_tasks (name, points, user_id, created_by, status, recurring_id, period_key) VALUES ('每天刷牙', 1, ?, ?, 'active', ?, '2026-09-15')",
    ).run(kidIds[0], parentId, ruleId);
    raw.close();

    check('前置条件：老表确实带 UNIQUE 约束', /UNIQUE/i.test(oldSql));
    check('前置条件：迁移前有 3 条历史记录', before.length === 3, `实际 ${before.length}`);
    check('前置条件：point_logs 有 2 条历史流水', plBefore.length === 2, `实际 ${plBefore.length}`);

    // ── 2. 走一次真实启动流程，触发迁移 ────────────────────────────────
    const db = initDb(dataDir);
    const after = db.prepare('SELECT * FROM task_completions ORDER BY id').all() as any[];
    const newSql = (db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='task_completions'").get() as any).sql;

    console.log('\n迁移后校验:');
    check('记录条数未丢失（3 → 3）', after.length === 3, `实际 ${after.length}`);
    check('主键 id 原样保留', JSON.stringify(after.map((r) => r.id)) === '[1,2,3]', JSON.stringify(after.map((r) => r.id)));
    check(
      '字段内容逐行一致（status/reason/reviewed_at/created_at）',
      JSON.stringify(after) === JSON.stringify(before),
    );
    check('UNIQUE 约束已移除', !/UNIQUE/i.test(newSql), newSql.slice(0, 160));
    for (const idx of ['idx_task_completions_task', 'idx_task_completions_status']) {
      check(
        `索引 ${idx} 已重建`,
        !!(db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name=?").get(idx)),
      );
    }

    // users.gender（1.6.9 新增）：老库补列后，存量孩子必须回填 'female'。
    // 这一条直接守住「升级不能让女孩端变蓝」——回填漏了的话，孩子端主题会走兜底分支，
    // 表现上看不出差异，但家长端编辑弹窗会把性别显示成空白，且任何读取 gender 的新逻辑都会踩空。
    const genders = db.prepare("SELECT name, gender FROM users WHERE role = 'child' ORDER BY id")
      .all() as Array<{ name: string; gender: string | null }>;
    check('存量孩子均已回填 gender', genders.length > 0 && genders.every((g) => g.gender !== null),
      JSON.stringify(genders));
    check("存量孩子回填为 'female'（女孩端视觉不变）", genders.every((g) => g.gender === 'female'),
      JSON.stringify(genders.map((g) => g.gender)));
    check('家长账号 gender 保持 NULL', !!(db.prepare("SELECT id FROM users WHERE role = 'parent' AND gender IS NULL").get()));

    // point_logs 重建（1.6.10）：历史流水无损 + CHECK 纳入 quiz
    const plAfter = db.prepare('SELECT * FROM point_logs ORDER BY id').all() as any[];
    check('point_logs 历史流水无损（2 → 2）', plAfter.length === 2, `实际 ${plAfter.length}`);
    check('point_logs 主键 id 原样保留', JSON.stringify(plAfter.map((r) => r.id)) === '[1,2]');
    check(
      'point_logs 行内容一致',
      JSON.stringify(plAfter) === JSON.stringify(plBefore),
    );
    check(
      'point_logs 索引 idx_point_logs_user 已重建',
      !!(db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_point_logs_user'").get()),
    );
    let quizSourceOk = false;
    try {
      db.prepare("INSERT INTO point_logs (user_id, delta, source, ref_type, note) VALUES (?, 1, 'quiz', 'quiz_round', '单词答题')")
        .run(kidIds[0]);
      quizSourceOk = true;
    } catch { /* CHECK 未放开 */ }
    check('point_logs 可写入 source=quiz / ref_type=quiz_round', quizSourceOk);

    // quiz 表 + 词库播种
    for (const t of ['quiz_words', 'quiz_rounds', 'quiz_daily']) {
      check(`quiz 表 ${t} 已创建`, !!(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(t)));
    }
    const seededWords = (db.prepare('SELECT COUNT(*) as c FROM quiz_words').get() as any).c as number;
    check('quiz_words 词库已播种', seededWords > 0, `实际 ${seededWords}`);
    const lvCounts = db.prepare('SELECT level, COUNT(*) as c FROM quiz_words GROUP BY level ORDER BY level').all() as any[];
    check('词库两档均有词', lvCounts.length === 2 && lvCounts[0].level === 1 && lvCounts[1].level === 2,
      JSON.stringify(lvCounts));
    // 释义清洗（种子 v2026091701）：不含字面 \n、词性前缀（ECDICT 原始格式污染）
    const dirty = db.prepare(
      "SELECT COUNT(*) AS c FROM quiz_words WHERE translation LIKE '%\\n%' " +
      "OR translation LIKE 'n. %' OR translation LIKE 'v. %' " +
      "OR translation LIKE 'vt. %' OR translation LIKE 'vi. %' OR translation LIKE 'adj. %' OR translation LIKE 'adv. %'",
    ).get() as { c: number };
    check('词库释义无字面\\n与词性前缀残留', dirty.c === 0, `脏释义 ${dirty.c} 条`);

    // recurring_issued（1.6.11）：发布凭证表创建 + 存量回填 + 「删除实例不重发」语义
    check('recurring_issued 已创建',
      !!(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='recurring_issued'").get()));
    const issued = db.prepare('SELECT recurring_id, period_key, user_id FROM recurring_issued').all() as any[];
    check(
      '发布凭证已从存量实例回填（恰好 1 条，三元组正确）',
      issued.length === 1 && issued[0].recurring_id === ruleId && issued[0].period_key === '2026-09-15' && issued[0].user_id === kidIds[0],
      JSON.stringify(issued),
    );

    // 行为校验：家长删除实例后，调度器按该日期扫描不得重发（= 本期作废）
    db.prepare('DELETE FROM adhoc_tasks WHERE recurring_id = ?').run(ruleId);
    const regenerated = generateDueTasks('2026-09-15');
    check('删除实例后调度器不再重发（本期作废）', regenerated === 0, `却生成了 ${regenerated} 条`);
    check('删除后实例确实不存在',
      (db.prepare('SELECT COUNT(*) as c FROM adhoc_tasks WHERE recurring_id = ?').get(ruleId) as any).c === 0);

    // 行为校验：手动补发（/run 的核心动作：清当日凭证再发）是唯一恢复出口
    db.prepare('DELETE FROM recurring_issued WHERE recurring_id = ? AND period_key = ?').run(ruleId, '2026-09-15');
    const rule = db.prepare('SELECT * FROM recurring_tasks WHERE id = ?').get(ruleId) as any;
    const restored = issueTemplate(rule, '2026-09-15', true);
    check('手动补发清凭证后可恢复本期（1 条）', restored === 1, `恢复 ${restored} 条`);
    check('恢复后凭证重新记账',
      (db.prepare('SELECT COUNT(*) as c FROM recurring_issued WHERE recurring_id = ?').get(ruleId) as any).c === 1);
    const restoredAgain = generateDueTasks('2026-09-15');
    check('恢复后再扫不重复生成（幂等）', restoredAgain === 0, `却生成了 ${restoredAgain} 条`);

    // due_hours（1.6.12）：模板设「发布后 N 小时」→ 生成实例的 deadline = 发布时刻 + N*3600；
    // 未设截止（NULL）→ 实例 deadline 仍为 NULL，行为与老版本一致
    db.prepare('UPDATE recurring_tasks SET due_hours = 2 WHERE id = ?').run(ruleId);
    db.prepare('DELETE FROM adhoc_tasks WHERE recurring_id = ?').run(ruleId);
    db.prepare('DELETE FROM recurring_issued WHERE recurring_id = ? AND period_key = ?').run(ruleId, '2026-09-15');
    const issuedWithDue = issueTemplate(
      db.prepare('SELECT * FROM recurring_tasks WHERE id = ?').get(ruleId) as any, '2026-09-15', true,
    );
    const instWithDue = db.prepare(
      'SELECT deadline, created_at FROM adhoc_tasks WHERE recurring_id = ? ORDER BY id DESC LIMIT 1',
    ).get(ruleId) as any;
    check('due_hours=2 的模板生成的实例带截止时间（发布时刻 + 2h）',
      issuedWithDue === 1 && instWithDue.deadline === instWithDue.created_at + 2 * 3600,
      JSON.stringify(instWithDue));

    db.prepare('UPDATE recurring_tasks SET due_hours = NULL WHERE id = ?').run(ruleId);
    db.prepare('DELETE FROM adhoc_tasks WHERE recurring_id = ?').run(ruleId);
    db.prepare('DELETE FROM recurring_issued WHERE recurring_id = ? AND period_key = ?').run(ruleId, '2026-09-15');
    const issuedNoDue = issueTemplate(
      db.prepare('SELECT * FROM recurring_tasks WHERE id = ?').get(ruleId) as any, '2026-09-15', true,
    );
    const instNoDue = db.prepare(
      'SELECT deadline FROM adhoc_tasks WHERE recurring_id = ? ORDER BY id DESC LIMIT 1',
    ).get(ruleId) as any;
    check('不设截止（NULL）的模板生成的实例 deadline 仍为 NULL',
      issuedNoDue === 1 && instNoDue.deadline === null,
      JSON.stringify(instNoDue));

    // 约束真的没了：同一 (task_id, user_id) 现在可以再提交一次
    let canResubmit = false;
    try {
      db.prepare("INSERT INTO task_completions (task_id, user_id, status) VALUES (?, ?, 'pending')").run(taskB, kidIds[0]);
      canResubmit = true;
    } catch { /* 仍被约束挡住 */ }
    check('可以重复提交（拒绝后可再次申请）', canResubmit);

    db.close();

    // ── 3. 幂等：再启动一次不应出错、也不应重复搬运 ─────────────────────
    const db2 = initDb(dataDir);
    const onceMore = db2.prepare('SELECT COUNT(*) as c FROM task_completions').get() as any;
    check('二次启动幂等（迁移不再触发，条数不变）', onceMore.c === 4, `实际 ${onceMore.c}`);
    db2.close();
  } finally {
    for (const suffix of ['', '-wal', '-shm']) {
      const f = dbPath + suffix;
      if (existsSync(f)) { try { unlinkSync(f); } catch { /* 交给 rmSync */ } }
    }
    rmSync(dataDir, { recursive: true, force: true });
  }

  console.log(failures === 0 ? '\n✅ 迁移回归测试全部通过\n' : `\n❌ 有 ${failures} 项断言失败\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
