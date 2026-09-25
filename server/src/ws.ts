import type { Server } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'node:http';

type ClientInfo = {
  ws: WebSocket;
  userId: number;
  role: 'parent' | 'child';
};

const clients = new Map<number, Set<ClientInfo>>();

export let wss: WebSocketServer | null = null;

export function initWs(server: Server): void {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? '', 'http://localhost');
    const userId = Number(url.searchParams.get('userId'));
    const role = url.searchParams.get('role') as 'parent' | 'child' | null;

    if (!userId || !role) {
      ws.close(4001, 'missing auth');
      return;
    }

    const info: ClientInfo = { ws, userId, role };
    if (!clients.has(userId)) clients.set(userId, new Set());
    clients.get(userId)!.add(info);

    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch {
        /* ignore */
      }
    });

    ws.on('close', () => {
      clients.get(userId)?.delete(info);
      if (clients.get(userId)?.size === 0) clients.delete(userId);
    });
  });
}

// 推送给指定用户
export function pushToUser(userId: number, message: unknown): void {
  const set = clients.get(userId);
  if (!set) return;
  const payload = JSON.stringify(message);
  for (const c of set) {
    if (c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(payload);
    }
  }
}

// 推送给所有家长
export function pushToParents(message: unknown): void {
  // payload 只序列化一次：此前写在双层循环内部，每个连接都重复 JSON.stringify 一遍
  const payload = JSON.stringify(message);
  for (const set of clients.values()) {
    for (const c of set) {
      if (c.role === 'parent' && c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(payload);
      }
    }
  }
}

// 推送给所有在线连接（不分角色）——如宠物物种目录变更，家长端和孩子端都要立即刷新
export function pushToAll(message: unknown): void {
  const payload = JSON.stringify(message);
  for (const set of clients.values()) {
    for (const c of set) {
      if (c.ws.readyState === WebSocket.OPEN) c.ws.send(payload);
    }
  }
}
