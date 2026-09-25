-- Shell Town（拾贝小镇）数据库 Schema v1.0
-- 单家庭模式，无 family_id 租户隔离
--
-- 【「不限」哨兵值约定】—— 全库存在两套写法，含义不同，勿混淆（详见 src/sentinels.ts）：
--   · products.stock              → -1 = 不限量（0 有独立语义：已售罄）
--   · 各类「次数/额度上限」        →  0 = 不限，NULL 亦按不限处理
--       point_items.daily_limit
--       users.pet_daily_feed_limit
--       users.pet_daily_points_limit
--   服务端一律通过 isUnlimitedStock() / isUnlimitedLimit() 判定，不要再裸写 -1 / > 0。

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- 用户表（家长 + 小孩）
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('parent', 'child')),
  pin TEXT,                          -- 小孩登录PIN的bcrypt哈希（历史明文启动时自动迁移），家长账号为NULL
  pin_lookup TEXT,                    -- PIN 的 HMAC-SHA256 指纹（仅用于唯一性检查，不可反推），家长账号为NULL
  password_hash TEXT,                 -- 家长密码哈希，小孩为NULL
  avatar TEXT,                        -- 生肖key（如 "rat"）或 hum1: 自定义形象规格
  gender TEXT CHECK (gender IN ('male', 'female')),
                                      -- 小孩性别，决定孩子端主题配色（male=晴空蓝 / female=粉）。
                                      -- 家长账号为 NULL（该字段对家长无意义）；读取端一律用
                                      -- `gender ?? 'female'` 兜底，老库由迁移回填 'female'，
                                      -- 因此升级后女孩端视觉与升级前逐像素一致。
  total_points INTEGER NOT NULL DEFAULT 0,
  pet_daily_feed_limit INTEGER NOT NULL DEFAULT 5,   -- 每日喂养次数上限（0=不限），家长可按孩子调整
  pet_daily_points_limit INTEGER NOT NULL DEFAULT 30, -- 每日宠物玩法积分预算（0=不限）
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  CHECK (
    (role = 'parent' AND password_hash IS NOT NULL) OR
    (role = 'child' AND pin IS NOT NULL)
  )
);

-- 日常任务（家长一键加减分项，可配置每日上限）
CREATE TABLE IF NOT EXISTS point_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('gain', 'loss')),
  points INTEGER NOT NULL,            -- 加分项为正数，扣分项为负数
  daily_limit INTEGER NOT NULL DEFAULT 1,  -- 每日上限次数，0表示无限
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  is_default INTEGER NOT NULL DEFAULT 0,
  owner_id INTEGER,                   -- NULL=通用项，否则为指定小孩专属项
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 日常任务完成记录（频次控制）
CREATE TABLE IF NOT EXISTS daily_completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES point_items(id) ON DELETE CASCADE,
  date TEXT NOT NULL,                 -- 格式 YYYY-MM-DD
  count INTEGER NOT NULL DEFAULT 0,
  UNIQUE (user_id, item_id, date)
);

-- 临时任务（新版：一个任务对应一个小孩）
CREATE TABLE IF NOT EXISTS adhoc_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,                      -- 学习/生活/运动/其他
  points INTEGER NOT NULL,            -- 完成奖励积分
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
  deadline INTEGER,                   -- unix时间戳秒，NULL表示无截止
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- 指定小孩
  created_by INTEGER NOT NULL REFERENCES users(id),
  completed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 任务列表索引。此前 adhoc_tasks 一个索引都没有，而它同时是「会随周期任务
-- 无界增长」的那张表 —— 三条家长端列表 + 孩子端「我的任务」全部是全表扫描 +
-- 临时排序（EXPLAIN QUERY PLAN 实测 SCAN + USE TEMP B-TREE FOR ORDER BY）。
--   · (status, created_at DESC, id DESC)            家长端三个 tab 按状态筛 + 按时间倒序
--   · (user_id, status, created_at DESC, id DESC)   孩子端「我的任务」按人 + 状态筛
-- 末位带 id DESC：查询按 `created_at DESC, id DESC` 排，只到 created_at 的话
-- SQLite 会对最后一项再排一次（实测 "USE TEMP B-TREE FOR LAST TERM OF ORDER BY"）。
CREATE INDEX IF NOT EXISTS idx_adhoc_tasks_status ON adhoc_tasks(status, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_adhoc_tasks_user ON adhoc_tasks(user_id, status, created_at DESC, id DESC);

-- 任务完成申请（小孩提交，家长审核）
CREATE TABLE IF NOT EXISTS task_completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES adhoc_tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_task_completions_task ON task_completions(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_completions_status ON task_completions(status, created_at DESC, id DESC);

-- 积分流水（统一记录所有积分变动）
CREATE TABLE IF NOT EXISTS point_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,             -- 正负
  source TEXT NOT NULL CHECK (source IN ('daily', 'adhoc', 'exchange', 'adjust', 'quiz')),
  ref_id INTEGER,                     -- 多态外键：含义由 ref_type 决定
  ref_type TEXT CHECK (ref_type IS NULL OR ref_type IN ('point_item', 'adhoc_task', 'exchange_request', 'product', 'quiz_round')),
                                      -- ref_id 指向的表名。历史行可能为 NULL（老库无法可靠回填 exchange 类）
  note TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 列表查询一律 `ORDER BY created_at DESC, id DESC`，索引末端必须把 id 也带上：
-- 只到 created_at 时 SQLite 会对最后一项再排一次（TEMP B-TREE FOR LAST TERM OF ORDER BY）。
CREATE INDEX IF NOT EXISTS idx_point_logs_user ON point_logs(user_id, created_at DESC, id DESC);
-- 家长端「全部记录」（不带 userId）没有可用前缀，单给一条按时间的索引，
-- 否则要全表扫描 + 临时排序才能取出第 1 页。
CREATE INDEX IF NOT EXISTS idx_point_logs_created ON point_logs(created_at DESC, id DESC);

-- 商品
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  cost INTEGER NOT NULL,              -- 所需积分
  stock INTEGER NOT NULL DEFAULT -1, -- -1表示不限库存（0 = 已售罄，两者语义不同）
  icon TEXT NOT NULL DEFAULT 'gift', -- 分类图标: snack/toy/activity/game/study/privilege/food/gift/petfood/pettoy/petcare/petexp
  kind TEXT NOT NULL DEFAULT 'physical' CHECK (kind IN ('physical', 'pet')),  -- physical=实物（走审核）, pet=宠物道具（即时生效）
  pet_effect TEXT,                    -- kind='pet' 时的效果 JSON，如 {"exp":40} 或 {"satiety":25,"happiness":10}
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 兑换申请（商品兑换 + 现金兑换共用表）
CREATE TABLE IF NOT EXISTS exchange_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('product', 'cash')),
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,            -- 消耗积分（cash类型存兑换积分数）
  amount REAL NOT NULL DEFAULT 0,     -- 现金兑换时 = points / 10
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT,                         -- 拒绝原因
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_exchange_requests_status ON exchange_requests(status, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_exchange_requests_user ON exchange_requests(user_id, created_at DESC, id DESC);

-- 全局设置（键值对）
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 宠物物种目录（家长端可管理：改名/换emoji/调阶段阈值/新建/删除）
-- 内置 12 只启动时播种一次；家长新建的物种 is_custom=1 可删除，内置不可删
CREATE TABLE IF NOT EXISTS pet_species (
  key TEXT PRIMARY KEY,               -- 物种 key，= 图片目录名 pets/<key>/
  name TEXT NOT NULL,                 -- 显示名（中文名）
  series TEXT NOT NULL CHECK (series IN ('boy', 'girl')),
  gender TEXT NOT NULL CHECK (gender IN ('♂', '♀')),
  emoji TEXT NOT NULL DEFAULT '🐣',   -- 图片缺失时的兜底图标
  stage_exp TEXT NOT NULL DEFAULT '[0,20,70,150,280]',  -- 5 阶段累计经验 JSON（Lv0~Lv4）
  is_custom INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 宠物（每个小孩一只）
CREATE TABLE IF NOT EXISTS pets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  species TEXT NOT NULL,              -- pets.ts 中的物种 key
  nickname TEXT,                      -- 孩子给宠物起的名字，NULL 时用物种名
  exp INTEGER NOT NULL DEFAULT 0,     -- 累计经验（由积分商城道具提供）
  satiety INTEGER NOT NULL DEFAULT 70,   -- 饱食度 0~100
  happiness INTEGER NOT NULL DEFAULT 70, -- 快乐值 0~100
  health INTEGER NOT NULL DEFAULT 85,    -- 健康值 0~100
  adopted_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_decay_at INTEGER NOT NULL DEFAULT (unixepoch()),  -- 上次状态衰减结算时间（惰性结算）
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 宠物喂养记录（每次使用宠物道具写一条）
CREATE TABLE IF NOT EXISTS pet_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  species TEXT NOT NULL,              -- 当时的宠物物种（换宠后记录仍可读）
  item_name TEXT NOT NULL,
  points INTEGER NOT NULL,            -- 消耗积分
  effect TEXT,                        -- 效果 JSON 快照
  note TEXT,                          -- 展示文案，如 "经验 +40"
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 末位带 id DESC：查询按 `ORDER BY created_at DESC, id DESC` 排，
-- 只到 created_at 的话 SQLite 会对最后一项再排一次
-- （实测 "USE TEMP B-TREE FOR LAST TERM OF ORDER BY"）。
CREATE INDEX IF NOT EXISTS idx_pet_logs_user ON pet_logs(user_id, created_at DESC, id DESC);

-- 宠物每日用量账本（每日限额记账用，与 pet_logs 展示记录解耦：
-- 家长清空喂养记录不会重置当天限额；date 为服务器本地日期 YYYY-MM-DD）
CREATE TABLE IF NOT EXISTS pet_usage_daily (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,   -- 当日喂养次数
  points INTEGER NOT NULL DEFAULT 0,  -- 当日消耗积分
  PRIMARY KEY (user_id, date)
);

-- 周期任务模板（方案一：到点自动克隆一条普通任务到 adhoc_tasks）
CREATE TABLE IF NOT EXISTS recurring_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT '其他',
  points INTEGER NOT NULL,            -- 每期完成奖励积分
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- 指定小孩（历史字段，= user_ids 的第一个）
  user_ids TEXT,                      -- 逗号分隔的孩子 id，多选；老数据为空时回落到 user_id
  created_by INTEGER NOT NULL REFERENCES users(id),
  freq TEXT NOT NULL CHECK (freq IN ('daily', 'weekly', 'monthly')),
  weekdays TEXT,                      -- freq=weekly 生效：逗号分隔 1~7（周一~周日）
  monthdays TEXT,                     -- freq=monthly 生效：逗号分隔 1~31
  time_of_day TEXT,                   -- 'HH:MM' 发布时刻（本地时间）；NULL=当天调度器首次检查时发布
  due_hours INTEGER,                  -- 每期截止：发布后 N 小时；NULL=无截止（1.6.12 新增）
  active INTEGER NOT NULL DEFAULT 1,  -- 0=暂停
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_recurring_tasks_user ON recurring_tasks(user_id, active);

-- 周期任务发布凭证：记录「某模板某天给某孩子发过一期」。
-- 与任务实例（adhoc_tasks）解耦：家长删除实例后凭证仍在 → 当天自动调度/编辑保存
-- 都不会重发（= 本期作废）；家长手动补发会清当日凭证后重发（唯一恢复出口）。
CREATE TABLE IF NOT EXISTS recurring_issued (
  recurring_id INTEGER NOT NULL REFERENCES recurring_tasks(id) ON DELETE CASCADE,
  period_key TEXT NOT NULL,           -- 本地日期 YYYY-MM-DD
  user_id INTEGER NOT NULL,
  issued_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (recurring_id, period_key, user_id)
);

-- ==================== 英语单词答题游戏（quiz） ====================
-- 词库启动时从内置 quizSeed.ts 播种（INSERT OR IGNORE，只补不删，家长数据无涉）。
-- 词表来源：译林版教材（一级=小学段、二级=初中段）∪ 剑桥 Power Up 对标词表
-- （L1-3 Starters/Movers/Flyers → 一级；L4-6 KET/PET → 二级）；
-- 音标为英式、释义取最常用一条（ECDICT，MIT）。
CREATE TABLE IF NOT EXISTS quiz_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL UNIQUE,          -- 规范化小写，唯一键（the apple / The Apple 视为同一个词）
  display TEXT NOT NULL,              -- 展示用原样大小写
  level INTEGER NOT NULL CHECK (level IN (1, 2)),
  phonetic TEXT,                      -- 英式音标，如 /ˈæp.əl/
  translation TEXT NOT NULL,          -- 中文释义（最常用一条）
  sources TEXT                        -- 来源标记 json 数组，如 ["yilin-p5a","pu-flyers"]
);

CREATE INDEX IF NOT EXISTS idx_quiz_words_level ON quiz_words(level, id);

-- 每轮题单：答案只存服务端，下发给前端的题目不带正确项标记（防抓包作弊）
CREATE TABLE IF NOT EXISTS quiz_rounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level IN (1, 2)),
  questions TEXT NOT NULL,            -- json: [{wordId, options:[...x4], correctIndex, type:'en2cn'|'listen', answered: 0|1|null}]
  finished INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_quiz_rounds_user ON quiz_rounds(user_id, created_at DESC);

-- 每日答题账本：一级答对 2 题记 1 分（当日累计凑整，隔日清零），二级答对 1 题记 1 分；
-- points 为当日已入账积分（受 quiz_daily_cap 上限约束，与 point_logs 流水一一对应）
CREATE TABLE IF NOT EXISTS quiz_daily (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,                 -- 本地日期 YYYY-MM-DD（同 daily_completions 口径）
  level1_correct INTEGER NOT NULL DEFAULT 0,
  level2_correct INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);
