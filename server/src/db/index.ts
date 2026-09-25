import Database from 'better-sqlite3';
import { readFileSync, existsSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { hashPin, pinLookup, isPlaintextPin } from '../auth.js';
import { PET_SPECIES } from '../pets.js';
import { QUIZ_SEED, QUIZ_SEED_VERSION } from '../quizSeed.js';

let db: Database.Database;

function findSchemaPath(): string {
  // 定位顺序（越靠前越"应该"命中）：
  //   1. SCHEMA_PATH 显式覆盖 —— 非标准部署（自定义镜像、只发 dist 的发行包）用
  //   2. 编译产物同目录 —— 构建脚本会把 schema.sql 拷到 dist/db/，
  //      生产镜像从此不依赖 server/src/（此前必须 COPY src/db/schema.sql 才能启动）
  //   3. 源码目录 —— dev（tsx）与"带源码的镜像"两条路径
  //   4. 相对 cwd 的兜底 —— 从仓库根或 server/ 目录启动都能命中
  const candidates = [
    process.env.SCHEMA_PATH,
    join(__dirname, 'schema.sql'),                                   // dist/db/schema.sql
    join(__dirname, '..', 'src', 'db', 'schema.sql'),                // dist/db → server/src/db
    join(__dirname, '..', '..', 'server', 'src', 'db', 'schema.sql'),// dist/db → <root>/server/src/db
    join(process.cwd(), 'server', 'src', 'db', 'schema.sql'),        // 从仓库根启动
    join(process.cwd(), 'src', 'db', 'schema.sql'),                  // 从 server/ 启动
  ].filter((p): p is string => typeof p === 'string' && p.length > 0);

  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    `schema.sql not found. Tried:\n${candidates.map((c) => `  - ${c}`).join('\n')}\n` +
    '提示：可用 SCHEMA_PATH 环境变量显式指定。'
  );
}

export function initDb(dataDir: string): Database.Database {
  // 更名（piggy-bank -> shell-town）后兼容旧库：优先用新文件名，
  // 若数据目录里只有旧版 money-jar.db，自动重命名继承，避免升级部署时"丢"数据
  let dbPath = join(dataDir, 'shell-town.db');
  if (!existsSync(dbPath)) {
    const legacy = join(dataDir, 'money-jar.db');
    if (existsSync(legacy)) {
      renameSync(legacy, dbPath);
      for (const suffix of ['-wal', '-shm']) {
        const oldSide = legacy + suffix;
        if (existsSync(oldSide)) renameSync(oldSide, dbPath + suffix);
      }
    }
  }
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // 加载 schema
  const schemaPath = findSchemaPath();
  const schema = readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  // 迁移：为旧版 adhoc_task_assignees 添加 accepted_at 字段
  runMigrations(db);

  // 初始化家长账号 + 默认加分项 + 默认设置
  initParentAccount();
  initDefaultPointItems();
  initDefaultSpecies();
  initDefaultSettings();
  initDefaultPetProducts();
  refreshDefaultPetProducts();
  initQuizWords();

  return db;
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

/**
 * 迁移步骤执行器：单步失败只记日志、不中断后续步骤。
 *
 * 此前每个块都是空 catch（注释里只写一个 skip 就完事）—— 失败被完全静默吞掉，
 * 运行期只会表现为「字段莫名不存在 / 数据莫名丢了」，线上极难定位。
 * 现在失败会带步骤名打进日志，并明确提示库可能处于不一致状态。
 */
function migrationStep(label: string, fn: () => void): void {
  try {
    fn();
  } catch (e) {
    console.error(`[migration] step "${label}" FAILED（数据库可能处于不一致状态，请检查）:`, e);
  }
}

// 迁移：为旧版数据库补字段
function runMigrations(db: Database.Database): void {
  /** 表是否存在某列（表名均为内部常量，无注入面） */
  const tableHasColumn = (table: string, column: string): boolean => {
    const rows = db.prepare(`SELECT name FROM pragma_table_info('${table}')`).all() as Array<{ name: string }>;
    return rows.some((r) => r.name === column);
  };

  // adhoc_tasks 加 user_id 字段（新版任务系统）
  migrationStep('adhoc_tasks.user_id', () => {
    if (tableHasColumn('adhoc_tasks', 'user_id')) return;
    db.exec('ALTER TABLE adhoc_tasks ADD COLUMN user_id INTEGER');
    console.log('[migration] Added column: adhoc_tasks.user_id');
    // 将旧 scope='assignee' 的任务迁移：从 assignees 表取 user_id
    try {
      db.exec(`
        UPDATE adhoc_tasks SET user_id = (
          SELECT user_id FROM adhoc_task_assignees
          WHERE adhoc_task_assignees.task_id = adhoc_tasks.id
          ORDER BY accepted_at DESC LIMIT 1
        )
      `);
      console.log('[migration] Migrated user_id from adhoc_task_assignees');
    } catch (e) {
      // 全新库没有这张旧表，属预期情况，只记 warning
      console.warn('[migration] skip backfill from adhoc_task_assignees:', (e as Error).message);
    }
  });

  // 删除旧表（已无用）
  migrationStep('drop adhoc_task_assignees', () => {
    db.exec('DROP TABLE IF EXISTS adhoc_task_assignees');
  });

  // task_completions 去掉 UNIQUE 约束（允许被拒绝后重新提交）
  //
  // 关键：不能 DROP 后重建 —— 那会把历史完成记录整表丢光且没有备份。
  // 改为「建临时新表 → 搬数据 → 删旧表 → 改名」的无损迁移，整体包在一个事务里：
  // 中途失败自动回滚，旧表原样保留，下次启动重试。
  migrationStep('task_completions.drop-unique', () => {
    const info = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='task_completions'").get() as any;
    if (!info?.sql?.includes('UNIQUE')) return;

    const migrate = db.transaction(() => {
      // 上次迁移中途崩溃可能残留临时表，先清掉保证可重复执行
      db.exec('DROP TABLE IF EXISTS task_completions_migrating');
      db.exec(`
        CREATE TABLE task_completions_migrating (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER NOT NULL REFERENCES adhoc_tasks(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
          reason TEXT,
          reviewed_by INTEGER REFERENCES users(id),
          reviewed_at INTEGER,
          created_at INTEGER NOT NULL DEFAULT (unixepoch())
        )
      `);
      // 旧表带 UNIQUE(task_id, user_id)，同一组合至多一行，原样搬运不会触发新表约束；
      // 显式带上 id，保持与 point_logs 等历史引用的对应关系
      const copied = db.prepare(`
        INSERT INTO task_completions_migrating
          (id, task_id, user_id, status, reason, reviewed_by, reviewed_at, created_at)
        SELECT id, task_id, user_id, status, reason, reviewed_by, reviewed_at, created_at
        FROM task_completions
      `).run().changes;
      db.exec('DROP TABLE task_completions');
      db.exec('ALTER TABLE task_completions_migrating RENAME TO task_completions');
      // DROP TABLE 会连带删掉旧表上的索引，这里必须把 schema.sql 里定义的索引**全部**重建，
      // 否则升级过来的库会永久缺索引（只补 task 那个的话，按 status 过滤的审核列表就走全表扫描）。
      db.exec('CREATE INDEX IF NOT EXISTS idx_task_completions_task ON task_completions(task_id, created_at DESC)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_task_completions_status ON task_completions(status, created_at DESC)');
      console.log(`[migration] Rebuilt task_completions without UNIQUE (preserved ${copied} row(s))`);
    });
    migrate();
  });

  // point_logs.source / ref_id / ref_type 字段
  migrationStep('point_logs.source/ref_id/ref_type', () => {
    if (!tableHasColumn('point_logs', 'source')) {
      db.exec("ALTER TABLE point_logs ADD COLUMN source TEXT NOT NULL DEFAULT 'adjust' CHECK (source IN ('daily', 'adhoc', 'exchange', 'adjust'))");
      console.log('[migration] Added column: point_logs.source');
    }
    if (!tableHasColumn('point_logs', 'ref_id')) {
      db.exec('ALTER TABLE point_logs ADD COLUMN ref_id INTEGER');
      console.log('[migration] Added column: point_logs.ref_id');
    }
    // ref_id 是「多态外键」，此前没有任何地方记录它指向哪张表：
    //   daily → point_items.id ／ adhoc → adhoc_tasks.id
    //   exchange → exchange_requests.id（兑换申请）或 products.id（宠物道具）
    // 新增 ref_type 显式记录目标表名。只回填能唯一推断的两类；
    // exchange 无法区分（两类 id 都是自增整数），保持 NULL 而不是瞎猜。
    if (!tableHasColumn('point_logs', 'ref_type')) {
      db.exec('ALTER TABLE point_logs ADD COLUMN ref_type TEXT');
      db.exec("UPDATE point_logs SET ref_type = 'point_item' WHERE ref_type IS NULL AND source = 'daily' AND ref_id IS NOT NULL");
      db.exec("UPDATE point_logs SET ref_type = 'adhoc_task' WHERE ref_type IS NULL AND source = 'adhoc' AND ref_id IS NOT NULL");
      console.log('[migration] Added column: point_logs.ref_type (backfilled daily/adhoc)');
    }
  });

  // point_items.owner_id 字段
  migrationStep('point_items.owner_id', () => {
    if (tableHasColumn('point_items', 'owner_id')) return;
    db.exec('ALTER TABLE point_items ADD COLUMN owner_id INTEGER');
    console.log('[migration] Added column: point_items.owner_id');
  });

  // products.icon 字段（商品分类图标）
  migrationStep('products.icon', () => {
    if (tableHasColumn('products', 'icon')) return;
    db.exec("ALTER TABLE products ADD COLUMN icon TEXT NOT NULL DEFAULT 'gift'");
    console.log('[migration] Added column: products.icon');
  });

  // products.kind / pet_effect 字段（宠物道具）
  migrationStep('products.kind/pet_effect', () => {
    if (!tableHasColumn('products', 'kind')) {
      db.exec("ALTER TABLE products ADD COLUMN kind TEXT NOT NULL DEFAULT 'physical'");
      console.log('[migration] Added column: products.kind');
    }
    if (!tableHasColumn('products', 'pet_effect')) {
      db.exec('ALTER TABLE products ADD COLUMN pet_effect TEXT');
      console.log('[migration] Added column: products.pet_effect');
    }
  });

  // pets 表（宠物养成系统）
  migrationStep('pets/pet_logs tables + species remap', () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS pets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        species TEXT NOT NULL,
        nickname TEXT,
        exp INTEGER NOT NULL DEFAULT 0,
        satiety INTEGER NOT NULL DEFAULT 70,
        happiness INTEGER NOT NULL DEFAULT 70,
        health INTEGER NOT NULL DEFAULT 85,
        adopted_at INTEGER NOT NULL DEFAULT (unixepoch()),
        last_decay_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS pet_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        species TEXT NOT NULL,
        item_name TEXT NOT NULL,
        points INTEGER NOT NULL,
        effect TEXT,
        note TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    db.exec('CREATE INDEX IF NOT EXISTS idx_pet_logs_user ON pet_logs(user_id, created_at DESC)');

    // 物种目录换版迁移：旧 key（生肖/神兽 24 只时代）统一映射到新 12 只里的对应款
    // 注意：只映射下方 remap 里明确列出的旧 key；其余未知 key 可能是家长自建物种，不能动
    const remap: Record<string, string> = {
      dragon: 'drake', azuredragon: 'drake', phoenix: 'pyro', fox: 'nox',
      tiger: 'pyro', tigerw: 'pyro', qilin: 'drake', xuanwu: 'rocko',
      cat: 'nox', rat: 'pyro', ox: 'rocko', rabbit: 'sprout', snake: 'drake',
      horse: 'volt', goat: 'sprout', monkey: 'pyro', rooster: 'gale',
      dog: 'pyro', pig: 'mush', hamster: 'mush', penguin: 'aqua',
      redpanda: 'sprout', deer: 'frost', koala: 'mush',
    };
    const known = new Set(
      (db.prepare(`SELECT DISTINCT species FROM pets`).all() as Array<{ species: string }>).map((r) => r.species)
    );
    const legacy = [...known].filter((k) => remap[k]);
    for (const old of legacy) {
      const next = remap[old] ?? 'drake';
      db.prepare(`UPDATE pets SET species = ? WHERE species = ?`).run(next, old);
    }
  });

  // 每日喂养限制（users 表两列）：老库补列，存量孩子按默认 5 次 / 30 分生效；0=不限
  migrationStep('users.pet_daily_feed_limit / pet_daily_points_limit', () => {
    if (tableHasColumn('users', 'pet_daily_feed_limit')) return;
    db.exec('ALTER TABLE users ADD COLUMN pet_daily_feed_limit INTEGER NOT NULL DEFAULT 5');
    db.exec('ALTER TABLE users ADD COLUMN pet_daily_points_limit INTEGER NOT NULL DEFAULT 30');
    console.log('[migration] Added columns: users.pet_daily_feed_limit / pet_daily_points_limit');
  });

  // 周期任务模板（recurring_tasks）+ adhoc_tasks 追溯字段
  migrationStep('recurring_tasks + adhoc_tasks.recurring_id/period_key', () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS recurring_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL DEFAULT '其他',
        points INTEGER NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_ids TEXT,
        created_by INTEGER NOT NULL REFERENCES users(id),
        freq TEXT NOT NULL CHECK (freq IN ('daily', 'weekly', 'monthly')),
        weekdays TEXT,
        monthdays TEXT,
        time_of_day TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS idx_recurring_tasks_user ON recurring_tasks(user_id, active);
    `);
    // 1.6.8 迁移：多孩子（user_ids）+ 发布时刻（time_of_day）
    if (!tableHasColumn('recurring_tasks', 'user_ids')) {
      db.exec('ALTER TABLE recurring_tasks ADD COLUMN user_ids TEXT');
      console.log('[migration] Added column: recurring_tasks.user_ids');
    }
    if (!tableHasColumn('recurring_tasks', 'time_of_day')) {
      db.exec('ALTER TABLE recurring_tasks ADD COLUMN time_of_day TEXT');
      console.log('[migration] Added column: recurring_tasks.time_of_day');
    }
    // 老数据回填：单孩子 → user_ids
    db.exec("UPDATE recurring_tasks SET user_ids = CAST(user_id AS TEXT) WHERE user_ids IS NULL OR user_ids = ''");
    if (!tableHasColumn('adhoc_tasks', 'recurring_id')) {
      db.exec('ALTER TABLE adhoc_tasks ADD COLUMN recurring_id INTEGER REFERENCES recurring_tasks(id) ON DELETE SET NULL');
      console.log('[migration] Added column: adhoc_tasks.recurring_id');
    }
    if (!tableHasColumn('adhoc_tasks', 'period_key')) {
      db.exec('ALTER TABLE adhoc_tasks ADD COLUMN period_key TEXT');
      console.log('[migration] Added column: adhoc_tasks.period_key');
    }
    // 去重索引：多孩子后每个孩子各发一条 → 唯一键必须含 user_id。
    // 旧索引 (recurring_id, period_key) 会让第二个孩子插不进去，必须换成三元组。
    // 老库里若已存在重复的 (recurring_id, period_key, user_id)，建唯一索引会失败：
    // 属于需要人工清理的数据问题，只告警，不让整段迁移中断。
    try {
      db.exec('DROP INDEX IF EXISTS idx_recurring_period');
      db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_recurring_period_user ON adhoc_tasks(recurring_id, period_key, user_id)');
    } catch (e) {
      console.warn('[migration] 建 idx_recurring_period_user 失败（可能已有重复周期任务，需人工清理）:', (e as Error).message);
    }
  });

  // 1.6.9 迁移：宠物每日用量独立账本（pet_usage_daily）。
  // 此前每日限额按 pet_logs 统计，家长「清空宠物记录」会把当天限额一并清零；
  // 解耦后清记录只影响展示，限额账本不受影响。
  migrationStep('pet_usage_daily', () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS pet_usage_daily (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        points INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, date)
      );
    `);
    // 一次性回填：把 pet_logs 的历史用量聚合进账本（幂等：仅当账本为空时执行）
    const { c: usageEmpty } = db.prepare('SELECT COUNT(*) as c FROM pet_usage_daily').get() as { c: number };
    if (usageEmpty === 0) {
      const rows = db.prepare('SELECT user_id, created_at, points FROM pet_logs').all() as Array<{ user_id: number; created_at: number; points: number }>;
      const agg = new Map<string, { count: number; points: number }>();
      for (const r of rows) {
        const d = new Date(r.created_at * 1000);
        const key = `${r.user_id}|${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const cur = agg.get(key) ?? { count: 0, points: 0 };
        cur.count += 1;
        cur.points += r.points ?? 0;
        agg.set(key, cur);
      }
      const ins = db.prepare('INSERT OR REPLACE INTO pet_usage_daily (user_id, date, count, points) VALUES (?, ?, ?, ?)');
      const fillTxn = db.transaction(() => {
        for (const [k, v] of agg) {
          const [uid, date] = k.split('|');
          ins.run(Number(uid), date, v.count, v.points);
        }
      });
      fillTxn();
      if (rows.length > 0) console.log(`[migration] Backfilled pet_usage_daily from pet_logs (${agg.size} user-days)`);
    }
  });

  // 1.6.9 安全迁移：小孩 PIN 由明文改存 bcrypt 哈希 + pin_lookup 指纹（用于唯一性检查）
  migrationStep('users.pin -> bcrypt + pin_lookup', () => {
    if (!tableHasColumn('users', 'pin_lookup')) {
      db.exec('ALTER TABLE users ADD COLUMN pin_lookup TEXT');
      console.log('[migration] Added column: users.pin_lookup');
    }
    const pinRows = db.prepare("SELECT id, pin FROM users WHERE role='child' AND pin IS NOT NULL").all() as Array<{ id: number; pin: string }>;
    const updPin = db.prepare('UPDATE users SET pin = ?, pin_lookup = ? WHERE id = ?');
    let migratedPins = 0;
    for (const r of pinRows) {
      if (isPlaintextPin(r.pin)) {
        updPin.run(hashPin(r.pin), pinLookup(r.pin), r.id);
        migratedPins++;
      } else if (!r.pin.startsWith('$2')) {
        // 未知格式：写入一段不可被任何 4-6 位数字命中的哈希，禁用登录避免残留风险
        updPin.run(hashPin(`disabled:${r.id}:${Date.now()}`), null, r.id);
        migratedPins++;
      }
    }
    if (migratedPins > 0) console.log(`[migration] Hashed ${migratedPins} plaintext child PIN(s)`);
  });

  // 1.6.9 迁移：小孩性别 users.gender（决定孩子端主题配色）。
  //
  // 存量孩子一律回填 'female'：升级前孩子端就是粉色女生主题，回填后视觉零变化。
  // 这里刻意**不**给列设 DEFAULT —— 家长账号应保持 NULL，而不是被默认值染上一个性别；
  // 新增孩子的默认值（家长端默认选"男生"）由 API 层显式提交，读取端用 `?? 'female'` 兜底。
  migrationStep('users.gender', () => {
    if (!tableHasColumn('users', 'gender')) {
      db.exec("ALTER TABLE users ADD COLUMN gender TEXT CHECK (gender IN ('male', 'female'))");
      console.log('[migration] Added column: users.gender');
    }
    // 幂等：只补 NULL 的孩子行，重复执行无副作用（家长不受影响，保持 NULL）
    const filled = db.prepare(
      "UPDATE users SET gender = 'female' WHERE role = 'child' AND gender IS NULL"
    ).run().changes;
    if (filled > 0) console.log(`[migration] Backfilled gender='female' for ${filled} existing child(ren)`);
  });

  // 1.6.10 迁移：point_logs 的 source/ref_type CHECK 纳入单词游戏（quiz / quiz_round）。
  // SQLite 无法 ALTER CHECK，只能整表重建——沿用 task_completions 的无损模式：
  // 建临时新表 → 搬数据（保留 id）→ 删旧表 → 改名 → 重建索引，整体一个事务。
  migrationStep('point_logs.check-quiz', () => {
    const info = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='point_logs'").get() as any;
    if (!info?.sql) return;
    if (info.sql.includes("'quiz'") && info.sql.includes("'quiz_round'")) return;

    const migrate = db.transaction(() => {
      db.exec('DROP TABLE IF EXISTS point_logs_migrating');
      db.exec(`
        CREATE TABLE point_logs_migrating (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          delta INTEGER NOT NULL,
          source TEXT NOT NULL CHECK (source IN ('daily', 'adhoc', 'exchange', 'adjust', 'quiz')),
          ref_id INTEGER,
          ref_type TEXT CHECK (ref_type IS NULL OR ref_type IN ('point_item', 'adhoc_task', 'exchange_request', 'product', 'quiz_round')),
          note TEXT,
          created_by INTEGER REFERENCES users(id),
          created_at INTEGER NOT NULL DEFAULT (unixepoch())
        )
      `);
      const copied = db.prepare(`
        INSERT INTO point_logs_migrating
          (id, user_id, delta, source, ref_id, ref_type, note, created_by, created_at)
        SELECT id, user_id, delta, source, ref_id, ref_type, note, created_by, created_at
        FROM point_logs
      `).run().changes;
      db.exec('DROP TABLE point_logs');
      db.exec('ALTER TABLE point_logs_migrating RENAME TO point_logs');
      db.exec('CREATE INDEX IF NOT EXISTS idx_point_logs_user ON point_logs(user_id, created_at DESC)');
      console.log(`[migration] Rebuilt point_logs with quiz CHECKs (preserved ${copied} row(s))`);
    });
    migrate();
  });

  // 1.6.10 迁移：单词答题游戏的表（词库由 initQuizWords 从内置数据播种）
  migrationStep('quiz tables', () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS quiz_words (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL UNIQUE,
        display TEXT NOT NULL,
        level INTEGER NOT NULL CHECK (level IN (1, 2)),
        phonetic TEXT,
        translation TEXT NOT NULL,
        sources TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_quiz_words_level ON quiz_words(level, id);
      CREATE TABLE IF NOT EXISTS quiz_rounds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        level INTEGER NOT NULL CHECK (level IN (1, 2)),
        questions TEXT NOT NULL,
        finished INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS idx_quiz_rounds_user ON quiz_rounds(user_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS quiz_daily (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        level1_correct INTEGER NOT NULL DEFAULT 0,
        level2_correct INTEGER NOT NULL DEFAULT 0,
        points INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, date)
      );
    `);
  });

  // 1.6.11 迁移：周期任务发布凭证表。
  // 此前「发过没」完全由 adhoc_tasks 行本身兜着，家长删除实例 = 删凭证 = 调度器
  // 下个 tick 就把刚删的任务重新发出来。引入 recurring_issued 后两者解耦：
  // 删实例只作废本期，凭证不动；手动补发清凭证恢复。
  migrationStep('recurring_issued table', () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS recurring_issued (
        recurring_id INTEGER NOT NULL REFERENCES recurring_tasks(id) ON DELETE CASCADE,
        period_key TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        issued_at INTEGER NOT NULL DEFAULT (unixepoch()),
        PRIMARY KEY (recurring_id, period_key, user_id)
      );
    `);
    // 从存量任务实例回填凭证：老库里所有已生成的周期任务立即获得「删除后不重发」语义。
    db.exec(`
      INSERT OR IGNORE INTO recurring_issued (recurring_id, period_key, user_id, issued_at)
      SELECT recurring_id, period_key, user_id, unixepoch() FROM adhoc_tasks
      WHERE recurring_id IS NOT NULL AND period_key IS NOT NULL
    `);
    console.log('[migration] recurring_issued 已创建并回填存量发布记录');
  });

  // 1.6.12 迁移：周期任务每期截止时间。模板存「发布后 N 小时」（due_hours），
  // 每期生成时 deadline = 发布时刻 + N*3600 —— 周期任务每期重生，
  // 相对偏移才能随期复制；NULL = 不设截止（存量模板默认，行为不变）。
  migrationStep('recurring_tasks.due_hours', () => {
    if (!tableHasColumn('recurring_tasks', 'due_hours')) {
      db.exec('ALTER TABLE recurring_tasks ADD COLUMN due_hours INTEGER');
      console.log('[migration] Added column: recurring_tasks.due_hours');
    }
  });

  // 列表查询索引：adhoc_tasks 此前没有任何索引，而它是随周期任务无界增长的那张表，
  // 四个任务列表查询全是 SCAN + TEMP B-TREE（见 scripts/list-plan-check.mjs 的实测输出）。
  // schema.sql 里也有同样两条 —— 新库走 schema，老库走这里，缺一边老库升级后照样慢。
  //
  // 用 ensureIndex 而不是裸 CREATE INDEX IF NOT EXISTS：后者对**已存在但定义不同**的
  // 索引是空操作。索引定义随后续优化调整时（比如这次补 id DESC 消掉末项临时排序），
  // 老库会永远停在旧定义上，"改了没生效"且不报错。
  const normalizeSql = (s: string) => s.replace(/\s+/g, ' ').replace(/;\s*$/, '').trim();
  const ensureIndex = (name: string, ddl: string) => {
    const row = db.prepare(
      "SELECT sql FROM sqlite_master WHERE type = 'index' AND name = ?",
    ).get(name) as { sql: string | null } | undefined;
    if (row?.sql && normalizeSql(row.sql) === normalizeSql(ddl)) return;
    if (row) db.exec(`DROP INDEX IF EXISTS ${name}`);
    db.exec(ddl);
  };

  migrationStep('list indexes: adhoc_tasks', () => {
    ensureIndex('idx_adhoc_tasks_status',
      'CREATE INDEX IF NOT EXISTS idx_adhoc_tasks_status ON adhoc_tasks(status, created_at DESC, id DESC)');
    ensureIndex('idx_adhoc_tasks_user',
      'CREATE INDEX IF NOT EXISTS idx_adhoc_tasks_user ON adhoc_tasks(user_id, status, created_at DESC, id DESC)');
    console.log('[migration] adhoc_tasks 列表索引就绪');
  });

  // pet_logs 索引补 id 列：查询按 `created_at DESC, id DESC` 排，只到 created_at
  // 会让 SQLite 对最后一项再排一次（TEMP B-TREE FOR LAST TERM OF ORDER BY）。
  migrationStep('list indexes: pet_logs', () => {
    ensureIndex('idx_pet_logs_user',
      'CREATE INDEX IF NOT EXISTS idx_pet_logs_user ON pet_logs(user_id, created_at DESC, id DESC)');
  });

  // 同一类缺口在其余三张流水表上也存在（2026-09-24 用 scripts/list-plan-check.mjs 对账发现）：
  // 列表 SQL 统一排 `created_at DESC, id DESC`，但这些索引只到 created_at，末项仍要临时排序；
  // point_logs 更缺一条「不带 user_id」的索引 —— 家长端「全部记录」因此是 SCAN + TEMP B-TREE。
  migrationStep('list indexes: point_logs / exchange_requests / task_completions', () => {
    ensureIndex('idx_point_logs_user',
      'CREATE INDEX IF NOT EXISTS idx_point_logs_user ON point_logs(user_id, created_at DESC, id DESC)');
    ensureIndex('idx_point_logs_created',
      'CREATE INDEX IF NOT EXISTS idx_point_logs_created ON point_logs(created_at DESC, id DESC)');
    ensureIndex('idx_exchange_requests_status',
      'CREATE INDEX IF NOT EXISTS idx_exchange_requests_status ON exchange_requests(status, created_at DESC, id DESC)');
    ensureIndex('idx_exchange_requests_user',
      'CREATE INDEX IF NOT EXISTS idx_exchange_requests_user ON exchange_requests(user_id, created_at DESC, id DESC)');
    ensureIndex('idx_task_completions_status',
      'CREATE INDEX IF NOT EXISTS idx_task_completions_status ON task_completions(status, created_at DESC, id DESC)');
    console.log('[migration] point_logs / exchange_requests / task_completions 列表索引就绪');
  });
}

// 单词题库播种：quizSeed.ts 是构建期生成的内置词库，随版本更新。
// INSERT OR IGNORE 只补新词不删旧词；版本号变更时重跑一遍（幂等）。
function initQuizWords(): void {
  if (QUIZ_SEED.length === 0) return;
  const version = String(QUIZ_SEED_VERSION);
  const seeded = db.prepare("SELECT value FROM settings WHERE key = 'quiz_words_seeded'").get() as { value: string } | undefined;
  if (seeded && seeded.value === version) return;

  // upsert：词库种子版本升级时（如释义清洗修正），刷新存量词条而不是被
  // 唯一键挡掉——INSERT OR IGNORE 会让老库永远留着脏数据
  const stmt = db.prepare(
    'INSERT INTO quiz_words (word, display, level, phonetic, translation, sources) VALUES (?, ?, ?, ?, ?, ?) ' +
    'ON CONFLICT(word) DO UPDATE SET display = excluded.display, level = excluded.level, ' +
    'phonetic = excluded.phonetic, translation = excluded.translation, sources = excluded.sources',
  );
  const txn = db.transaction(() => {
    for (const w of QUIZ_SEED) stmt.run(w.word, w.display, w.level, w.phonetic, w.translation, JSON.stringify(w.sources));
  });
  txn();
  db.prepare(
    "INSERT INTO settings (key, value) VALUES ('quiz_words_seeded', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(version);
  const total = (db.prepare('SELECT COUNT(*) as c FROM quiz_words').get() as { c: number }).c;
  console.log(`[init] Seeded quiz words v${version} (bank now has ${total} words)`);
}

function initParentAccount(): void {
  const existing = db.prepare('SELECT id FROM users WHERE role = ?').get('parent');
  if (existing) return;

  const hash = bcrypt.hashSync(config.adminPassword, 10);
  db.prepare(
    'INSERT INTO users (name, role, password_hash, avatar, total_points) VALUES (?, ?, ?, ?, ?)'
  ).run(config.adminUsername, 'parent', hash, 'dragon', 0);
}

function initDefaultPointItems(): void {
  const count = db.prepare('SELECT COUNT(*) as c FROM point_items WHERE is_default = 1').get() as { c: number };
  if (count.c > 0) return;

  const defaults: Array<{ name: string; type: 'gain' | 'loss'; points: number; daily_limit: number }> = [
    { name: '完成作业', type: 'gain', points: 10, daily_limit: 1 },
    { name: '早睡早起', type: 'gain', points: 10, daily_limit: 1 },
    { name: '帮忙做家务', type: 'gain', points: 5, daily_limit: 3 },
    { name: '未完成作业', type: 'loss', points: -10, daily_limit: 1 },
    { name: '未早睡早起', type: 'loss', points: -10, daily_limit: 1 },
    { name: '发脾气', type: 'loss', points: -5, daily_limit: 2 },
  ];

  const stmt = db.prepare(
    `INSERT INTO point_items (name, type, points, daily_limit, sort_order, enabled, is_default)
     VALUES (?, ?, ?, ?, ?, 1, 1)`
  );
  defaults.forEach((d, i) => stmt.run(d.name, d.type, d.points, d.daily_limit, i));
}

// 宠物物种目录播种：首次启动（表为空）写入内置 12 只，之后以 DB 为准（家长端可增改）
function initDefaultSpecies(): void {
  const { c } = db.prepare('SELECT COUNT(*) as c FROM pet_species').get() as { c: number };
  if (c > 0) return;
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO pet_species (key, name, series, gender, emoji, stage_exp, is_custom, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
  );
  const txn = db.transaction(() => {
    PET_SPECIES.forEach((s, i) =>
      stmt.run(s.key, s.name, s.series, s.gender, s.emoji, JSON.stringify([0, 20, 70, 150, 280]), i)
    );
  });
  txn();
  console.log(`[init] Seeded ${PET_SPECIES.length} built-in pet species`);
}

function initDefaultSettings(): void {
  const existing = db.prepare("SELECT value FROM settings WHERE key = 'cash_rate'").get() as { value: string } | undefined;
  if (!existing) {
    db.prepare("INSERT INTO settings (key, value) VALUES ('cash_rate', '10')").run();
  }
  // 记录保留天数（0 = 关闭自动清理）。只在缺失时写入，否则会把家长自己调过的值覆盖掉。
  // 语义与读写实现都在 retention.ts 的 getRetentionDays/saveRetentionDays。
  const retention = db.prepare("SELECT value FROM settings WHERE key = 'records_retention_days'").get();
  if (!retention) {
    db.prepare("INSERT INTO settings (key, value) VALUES ('records_retention_days', '90')").run();
  }
}

// 默认宠物道具（首次启动播种一次；家长全删后不再重复播种，用 settings 标记）
function initDefaultPetProducts(): void {
  const seeded = db.prepare("SELECT value FROM settings WHERE key = 'pet_shop_seeded'").get() as { value: string } | undefined;
  if (seeded) return;

  const defaults: Array<{ name: string; cost: number; icon: string; effect: string }> = [
    // 喂食/玩耍/护理道具自带少量基础经验：日常照顾也能攒成长，
    // 实际获得的经验再乘以状态倍率（开心 ×1.5 / 一般 ×1.0 / 委屈 ×0.6 / 饥饿 ×0.5）
    { name: '宠物口粮', cost: 5, icon: 'petfood', effect: JSON.stringify({ satiety: 25, exp: 4 }) },
    { name: '新玩具球', cost: 5, icon: 'pettoy', effect: JSON.stringify({ happiness: 25, exp: 4 }) },
    { name: '营养小药丸', cost: 5, icon: 'petcare', effect: JSON.stringify({ health: 25, exp: 2 }) },
    { name: '豪华大餐', cost: 12, icon: 'petfood', effect: JSON.stringify({ satiety: 60, happiness: 10, exp: 8 }) },
    { name: '经验糖果', cost: 8, icon: 'petexp', effect: JSON.stringify({ exp: 40 }) },
    { name: '成长礼包', cost: 25, icon: 'petexp', effect: JSON.stringify({ exp: 150 }) },
  ];

  const stmt = db.prepare(
    "INSERT INTO products (name, cost, stock, icon, kind, pet_effect, status) VALUES (?, ?, -1, ?, 'pet', ?, 'active')"
  );
  const txn = db.transaction(() => {
    for (const d of defaults) stmt.run(d.name, d.cost, d.icon, d.effect);
    db.prepare("INSERT INTO settings (key, value) VALUES ('pet_shop_seeded', '1')").run();
  });
  txn();
  console.log(`[init] Seeded ${defaults.length} default pet items`);
}

// v5 迁移：老库里已播种过的默认道具刷成带基础互动经验的新效果（一次性，按名字匹配、不碰家长自建道具）
function refreshDefaultPetProducts(): void {
  const seeded = db.prepare("SELECT value FROM settings WHERE key = 'pet_items_v5'").get();
  if (seeded) return;
  const updates: Array<{ name: string; effect: string }> = [
    { name: '宠物口粮', effect: JSON.stringify({ satiety: 25, exp: 4 }) },
    { name: '新玩具球', effect: JSON.stringify({ happiness: 25, exp: 4 }) },
    { name: '营养小药丸', effect: JSON.stringify({ health: 25, exp: 2 }) },
    { name: '豪华大餐', effect: JSON.stringify({ satiety: 60, happiness: 10, exp: 8 }) },
  ];
  const stmt = db.prepare("UPDATE products SET pet_effect = ? WHERE name = ? AND kind = 'pet'");
  const txn = db.transaction(() => {
    for (const u of updates) stmt.run(u.effect, u.name);
    db.prepare("INSERT INTO settings (key, value) VALUES ('pet_items_v5', '1')").run();
  });
  txn();
}
