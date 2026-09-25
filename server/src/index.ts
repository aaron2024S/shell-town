import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import cors from '@fastify/cors';
import { Server } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { config, ensureDataDir } from './config.js';
import { initDb } from './db/index.js';
import { registerAuthHook } from './middleware.js';
import { initWs } from './ws.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerChildrenRoutes } from './routes/children.js';
import { registerPointItemsRoutes } from './routes/point-items.js';
import { registerPointLogsRoutes } from './routes/point-logs.js';
import { registerDashboardRoutes } from './routes/dashboard.js';
import { registerAdhocTasksRoutes } from './routes/adhoc-tasks.js';
import { registerProductsRoutes } from './routes/products.js';
import { registerExchangeRequestsRoutes } from './routes/exchange-requests.js';
import { registerPetsRoutes } from './routes/pets.js';
import { registerPetSpeciesAdminRoutes } from './routes/pet-species-admin.js';
import { registerSettingsRoutes } from './routes/settings.js';
import { registerRecurringTasksRoutes } from './routes/recurring-tasks.js';
import { registerRecordsRoutes } from './routes/records.js';
import { registerQuizRoutes } from './routes/quiz.js';
import { startRecurringScheduler } from './recurring.js';

/** 应用版本号：读 server/package.json（编译后在 ../package.json，镜像内同样存在），读不到回退 dev */
function appVersion(): string {
  try {
    const pkgPath = join(dirname(__dirname), 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    return typeof pkg.version === 'string' ? pkg.version : 'dev';
  } catch {
    return 'dev';
  }
}

async function main() {
  ensureDataDir();
  initDb(config.dataDir);

  const app = Fastify({ logger: process.env.NODE_ENV !== 'production' });
  const httpServer = app.server as unknown as Server;

  // 二进制上传解析（宠物立绘上传用裸文件流，避免引入 multipart 依赖）
  app.addContentTypeParser('application/octet-stream', { parseAs: 'buffer' }, (_req, body, done) => {
    done(null, body);
  });

  registerAuthHook(app);

  await app.register(cors, {
    // 允许移动端 App（WebView 来源）访问 API；家庭内网工具，反射任意来源以兼容不同 WebView scheme
    origin: true,
  });

  await app.register(async (api) => {
    // 版本号（家长端设置页展示）
    api.get('/version', async () => ({ version: appVersion() }));
    registerAuthRoutes(api);
    registerChildrenRoutes(api);
    registerPointItemsRoutes(api);
    registerPointLogsRoutes(api);
    registerDashboardRoutes(api);
    registerAdhocTasksRoutes(api);
    registerProductsRoutes(api);
    registerExchangeRequestsRoutes(api);
    registerPetsRoutes(api);
    registerPetSpeciesAdminRoutes(api);
    registerSettingsRoutes(api);
    registerRecurringTasksRoutes(api);
    registerRecordsRoutes(api);
    registerQuizRoutes(api);
  }, { prefix: '/api' });

  if (existsSync(config.webDist)) {
    // 必须保持 wildcard 默认为 true：通配路由在请求时实时从磁盘读取文件，
    // vite 重新构建后的新 hash 文件无需重启即可服务。
    // 不能用 wildcard:false——该模式仅在启动时 glob 一次文件并注册路由，
    // 构建后的新文件会 404 并回退到 index.html，导致 JS 以 text/html 返回、浏览器白屏。
    await app.register(fastifyStatic, {
      root: config.webDist,
      prefix: '/',
    });

    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api/') || req.url === '/ws') {
        return reply.code(404).send({ error: 'not_found' });
      }
      return reply.sendFile('index.html');
    });
  } else {
    app.get('/', async () => ({
      message: 'Shell Town API（拾贝小镇）',
      hint: '前端未构建，请先运行 npm run build --workspace web',
    }));
  }

  initWs(httpServer);

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`🪙 Shell Town (拾贝小镇) running on http://0.0.0.0:${config.port}`);
    // 周期任务调度：启动时补发一次 + 之后每 60 秒兜底扫描一次（幂等，见 recurring.ts 的 CHECK_INTERVAL_MS）
    startRecurringScheduler();
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

main();
