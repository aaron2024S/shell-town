import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from './auth.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: { sub: number; role: 'parent' | 'child'; name: string };
  }
}

const PUBLIC_PATHS = new Set([
  '/api/auth/parent-login',
  '/api/auth/child-login',
  '/api/auth/children',
]);

export function registerAuthHook(app: FastifyInstance) {
  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    const url = req.url;

    // 只有 /api/ 下的接口需要 JWT。
    // 静态资源（/assets/、/pets/、/shell-town.png）与 SPA 路由交给 @fastify/static
    // 和 notFoundHandler；/ws 走 HTTP upgrade，由 ws 库在 Fastify 钩子之外自行处理，
    // 写在这里放行其实没有任何作用（曾是 `/`、`/ws`、`/assets/`、`/zodiac/` 四个前缀，
    // 其中 /zodiac/ 更是早已改为 /pets/ 的历史遗留）。
    if (!url.startsWith('/api/')) return;

    // CORS 预检请求不带 Authorization，必须放行交给 @fastify/cors 处理，
    // 否则跨端(App WebView)所有需登录接口的预检都会被 401，表现为"登录成功但没数据"
    if (req.method === 'OPTIONS') return;

    const path = url.split('?')[0];
    if (PUBLIC_PATHS.has(path)) return;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'unauthorized' });
    }
    const token = authHeader.slice(7);
    const payload = await verifyToken(token);
    if (!payload) {
      return reply.code(401).send({ error: 'invalid_token' });
    }
    req.user = payload;
  });
}

export async function requireParent(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!req.user || req.user.role !== 'parent') {
    // 必须显式 return：此前只 reply.send 后靠 Fastify "hook 内 send 即中止" 的隐式行为，
    // 一旦 Fastify 行为变化（或在 hook 内被 await 包装）就会继续执行到业务处理函数。
    await reply.code(403).send({ error: 'forbidden' });
    return;
  }
}

/** 仅小孩可访问。用于"孩子自己发起"的动作（提交兑换申请、提交完成申请等），
 *  避免家长账号也能对自己提交、把审核链路绕成自审自批。 */
export async function requireChild(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!req.user || req.user.role !== 'child') {
    await reply.code(403).send({ error: 'forbidden' });
    return;
  }
}
