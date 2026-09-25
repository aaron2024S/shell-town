import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

function requiredEnv(key: string, fallback?: string): string {
  const v = process.env[key];
  if (v !== undefined && v !== '') return v;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required env: ${key}`);
}

// 项目根目录定位：用 __dirname（模块自身位置，编译期确定且始终是绝对路径）
// 而不是 process.argv[1]。
//
//   dev（tsx 直接跑源码）：server/src/config.ts   → __dirname = <root>/server/src
//   prod（tsc 编译产物）  ：server/dist/config.js → __dirname = <root>/server/dist
//
// 两种情况都在 server/ 下一级，所以向上一级到 server/、再上一级就是项目根。
// process.argv[1] 的坑：`node dist/index.js`（相对路径）时 dirname 只得到 "."，
// 再拼 ../.. 会变成相对路径；pm2 / systemd / node -e 等非标准启动方式下更是直接错位。
const projectRoot = join(__dirname, '..', '..');

export const config = {
  port: parseInt(requiredEnv('PORT', '3000'), 10),
  dataDir: requiredEnv('DATA_DIR', join(projectRoot, 'data')),
  adminUsername: requiredEnv('ADMIN_USERNAME', 'admin'),
  adminPassword: requiredEnv('ADMIN_PASSWORD', 'admin123'),
  jwtSecret: requiredEnv('JWT_SECRET', 'please-change-this-secret'),
  jwtExpiresIn: '10y',
  webDist: join(projectRoot, 'web', 'dist'),
  // 宠物立绘目录：家长端上传图片的落盘位置。
  // 位于 web/dist/pets（静态服务根内），Docker 部署时该路径挂载到宿主机 ./pets，上传即持久化
  petAssetsDir: join(projectRoot, 'web', 'dist', 'pets'),
};

export function ensureDataDir(): void {
  mkdirSync(config.dataDir, { recursive: true });
}
