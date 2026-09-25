// 构建后置步骤：把非 TS 资产拷到编译产物旁边。
//
// 背景：`tsc` 只处理 .ts/.js，不会复制 schema.sql。此前 Dockerfile 只能额外
// `COPY server/src/db/schema.sql`，等于生产镜像必须携带源码目录才能启动。
// 现在 schema.sql 会出现在 dist/db/ 下，db/index.ts 的第一优先级候选路径能命中，
// 发行包只发 dist 也能跑。
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const assets = [
  { from: join(serverRoot, 'src', 'db', 'schema.sql'), to: join(serverRoot, 'dist', 'db', 'schema.sql') },
];

for (const { from, to } of assets) {
  if (!existsSync(from)) {
    console.error(`[build] 缺少源文件，构建产物将不完整: ${from}`);
    process.exit(1);
  }
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  console.log(`[build] copied ${from.replace(serverRoot, '.')} -> ${to.replace(serverRoot, '.')}`);
}
