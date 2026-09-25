// 家长端「设置」相关的实例级配置。
// 通知渠道（ntfy / Gotify / 企业微信机器人）存 settings 表，全实例共享一份。
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireParent } from '../middleware.js';
import { getNotifyConfig, saveNotifyConfig, notifyChannels } from '../notify.js';

const urlSchema = z.string().trim().max(500).refine(
  (v) => v === '' || /^https?:\/\//.test(v),
  { message: '必须是 http(s) 地址或留空' },
);

const tokenSchema = z.string().trim().max(200);

const saveSchema = z.object({
  ntfyUrl: urlSchema.optional().default(''),
  ntfyToken: tokenSchema.optional().default(''),
  gotifyUrl: urlSchema.optional().default(''),
  gotifyToken: tokenSchema.optional().default(''),
  wecomWebhook: urlSchema.optional().default(''),
});

export function registerSettingsRoutes(app: FastifyInstance) {
  // 读取通知渠道配置
  app.get('/settings/notify', { preHandler: requireParent }, async () => {
    return getNotifyConfig();
  });

  // 保存通知渠道配置（留空 = 停用该渠道）
  app.put('/settings/notify', { preHandler: requireParent }, async (req, reply) => {
    const parsed = saveSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_input', detail: parsed.error.issues[0]?.message });
    }
    saveNotifyConfig(parsed.data);
    return getNotifyConfig();
  });

  // 发送测试通知：按当前配置逐渠道真实发一条，返回每渠道结果
  app.post('/settings/notify/test', { preHandler: requireParent }, async () => {
    const results = await notifyChannels(
      '🔔 拾贝小镇 · 测试通知',
      '这是一条测试消息。收到即表示该通知渠道配置成功，之后有新的审核提交都会推送到这里。',
    );
    return { results };
  });
}
