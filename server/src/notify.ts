// 审核事件的外部通知派发：ntfy / Gotify / 企业微信群机器人 webhook。
//
// 设计原则：
//  - 通知失败绝不影响主业务：fire-and-forget，超时 6 秒，错误只记日志
//  - 渠道配置存 settings 表（key: notify_ntfy_url / notify_gotify_url / notify_wecom_webhook），
//    值为空串表示该渠道未启用；家长端「设置」弹窗维护，PUT 后即时生效（每次发送现读）
//  - 三家协议：
//      ntfy   → JSON publish：向「去掉最后一段路径」的根地址 POST {topic,title,message}
//               （中文标题走 JSON 才不会被 HTTP 头编码坑掉）
//               认证：可配访问令牌 tk_xxx（Bearer）或 用户:密码（Basic）
//      Gotify → POST {title, message, priority}；token 通常已拼在 URL 里，
//               也可配独立令牌走 X-Gotify-Key 头
//      企业微信 → POST {msgtype:'text', text:{content}}，content = 标题\n正文
import { getDb } from './db/index.js';

export interface NotifyResult {
  channel: 'ntfy' | 'gotify' | 'wecom';
  ok: boolean;
  detail: string;
}

const TIMEOUT_MS = 6000;

function getSetting(key: string): string {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value?.trim() ?? '';
}

export interface NotifyConfig {
  ntfyUrl: string;
  ntfyToken: string;
  gotifyUrl: string;
  gotifyToken: string;
  wecomWebhook: string;
}

export function getNotifyConfig(): NotifyConfig {
  return {
    ntfyUrl: getSetting('notify_ntfy_url'),
    ntfyToken: getSetting('notify_ntfy_token'),
    gotifyUrl: getSetting('notify_gotify_url'),
    gotifyToken: getSetting('notify_gotify_token'),
    wecomWebhook: getSetting('notify_wecom_webhook'),
  };
}

export function saveNotifyConfig(cfg: NotifyConfig): void {
  const db = getDb();
  const rows: Array<[string, string]> = [
    ['notify_ntfy_url', cfg.ntfyUrl],
    ['notify_ntfy_token', cfg.ntfyToken],
    ['notify_gotify_url', cfg.gotifyUrl],
    ['notify_gotify_token', cfg.gotifyToken],
    ['notify_wecom_webhook', cfg.wecomWebhook],
  ];
  const txn = db.transaction(() => {
    for (const [key, value] of rows) {
      db.prepare(
        "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, unixepoch()) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
      ).run(key, value);
    }
  });
  txn();
}

async function postJson(url: string, payload: unknown, headers: Record<string, string> = {}): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = (await res.text().catch(() => '')).slice(0, 120);
    throw new Error(`HTTP ${res.status}${text ? `: ${text}` : ''}`);
  }
}

/** ntfy 认证头：含冒号视为 用户:密码（Basic），否则视为访问令牌（Bearer，如 tk_xxx） */
function ntfyAuthHeaders(token: string): Record<string, string> {
  if (!token) return {};
  if (token.includes(':')) {
    return { Authorization: `Basic ${Buffer.from(token).toString('base64')}` };
  }
  return { Authorization: `Bearer ${token}` };
}

/**
 * ntfy 发送：把配置的 https://host/<可选前缀>/<topic> 拆成根地址 + topic，
 * 走 JSON publish（标题支持中文）。URL 解析不出 topic 时退化为纯文本 POST 到原地址。
 */
async function sendNtfy(url: string, token: string, title: string, message: string): Promise<void> {
  const auth = ntfyAuthHeaders(token);
  try {
    const u = new URL(url);
    const segs = u.pathname.split('/').filter(Boolean);
    if (segs.length === 0) throw new Error('url 中没有 topic');
    const topic = segs.pop()!;
    const root = u.origin + (segs.length ? '/' + segs.join('/') : '');
    await postJson(root, { topic, title, message }, auth);
  } catch (e: any) {
    if (e instanceof TypeError) throw e; // URL 本身非法，直接抛
    // JSON publish 失败（自部署路径特殊等）→ 退化为纯文本 POST 到配置的原地址
    const res = await fetch(url, {
      method: 'POST',
      headers: auth,
      body: `${title}\n${message}`,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }
}

async function sendGotify(url: string, token: string, title: string, message: string): Promise<void> {
  // 令牌优先级：URL 已带 token 参数则不重复发；否则用 X-Gotify-Key 头
  const headers: Record<string, string> = {};
  if (token && !new URL(url).searchParams.has('token')) {
    headers['X-Gotify-Key'] = token;
  }
  await postJson(url, { title, message, priority: 5 }, headers);
}

async function sendWecom(url: string, title: string, message: string): Promise<void> {
  // 企业微信要求 JSON 且 Content-Type 不带 charset，text.content ≤ 2048 字节
  const content = `${title}\n${message}`.slice(0, 800);
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ msgtype: 'text', text: { content } }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).then(async (res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json().catch(() => ({}))) as { errcode?: number; errmsg?: string };
    if (body.errcode !== 0) throw new Error(`errcode ${body.errcode}: ${body.errmsg ?? ''}`);
  });
}

/** 向所有已配置渠道发送，逐渠道返回结果（供测试接口用） */
export async function notifyChannels(title: string, message: string): Promise<NotifyResult[]> {
  const cfg = getNotifyConfig();
  const results: NotifyResult[] = [];

  if (cfg.ntfyUrl) {
    try { await sendNtfy(cfg.ntfyUrl, cfg.ntfyToken, title, message); results.push({ channel: 'ntfy', ok: true, detail: '已发送' }); }
    catch (e: any) { results.push({ channel: 'ntfy', ok: false, detail: String(e.message ?? e) }); }
  }
  if (cfg.gotifyUrl) {
    try { await sendGotify(cfg.gotifyUrl, cfg.gotifyToken, title, message); results.push({ channel: 'gotify', ok: true, detail: '已发送' }); }
    catch (e: any) { results.push({ channel: 'gotify', ok: false, detail: String(e.message ?? e) }); }
  }
  if (cfg.wecomWebhook) {
    try { await sendWecom(cfg.wecomWebhook, title, message); results.push({ channel: 'wecom', ok: true, detail: '已发送' }); }
    catch (e: any) { results.push({ channel: 'wecom', ok: false, detail: String(e.message ?? e) }); }
  }
  return results;
}

/** 业务侧火忘调用：任何失败只记日志，绝不抛出 */
export function fireNotify(title: string, message: string): void {
  notifyChannels(title, message).then((results) => {
    for (const r of results) {
      if (!r.ok) console.error(`[notify] ${r.channel} 发送失败: ${r.detail}`);
    }
  }).catch((e) => console.error(`[notify] 发送异常:`, e));
}
