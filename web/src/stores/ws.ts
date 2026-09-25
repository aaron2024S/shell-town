import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/api/client';
import { useAuthStore } from './auth';
import { useToastStore } from './toast';
import { serverBaseOrigin } from '@/utils/server';
import { WS_EVENTS } from '@/utils/events';

// ── 连接参数 ─────────────────────────────────────────────────────────
/** 心跳间隔：定期发 ping 让中间设备（家用路由 NAT）不回收空闲长连接 */
const HEARTBEAT_MS = 30_000;
/** pong 看门狗：发出 ping 后多久收不到 pong 就判定链路已死 */
const PONG_TIMEOUT_MS = 10_000;
/** 重连退避：1s → 2s → 4s …最多 30s，另加随机抖动 */
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

/**
 * WebSocket 连接 store。
 *
 * 此前这里是一个「普通函数 + 模块级 socket」的伪 store：
 *   - `connected` 在函数体内 `ref(false)` 新建，于是 4 个调用点各持一份互不同步的副本，
 *     组件里读到的永远是它自己那一份，永远为 false；
 *   - 心跳只发 ping、不判活，TCP 半开（切 Wi-Fi、路由器重启）时 onclose 不会触发，
 *     页面就一直静默失联直到手动刷新；
 *   - 重连固定 3 秒、无退避，服务端重启期间会持续高频重连。
 * 现在改为真正的 Pinia store（状态单例），并补上看门狗与指数退避。
 */
export const useWsStore = defineStore('ws', () => {
  /** 连接状态（单例，所有组件读到同一份） */
  const connected = ref(false);
  /** 家长端待审核角标（兑换 + 任务，来自 /dashboard 的权威口径） */
  const pendingCount = ref(0);

  let socket: WebSocket | null = null;
  let reconnectTimer: number | null = null;
  let heartbeatTimer: number | null = null;
  let pongTimer: number | null = null;
  let attempts = 0;
  let manualClose = false;

  function connect() {
    const auth = useAuthStore();
    if (!auth.user) return;
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

    // 配置了服务器地址时按配置走（App 内网），否则使用当前页面同源（Web 部署）
    const origin = serverBaseOrigin();
    const proto = origin?.startsWith('https') ? 'wss' : 'ws';
    const host = origin ? new URL(origin).host : location.host;
    const url = `${proto}://${host}/ws?userId=${auth.user.id}&role=${auth.user.role}`;

    manualClose = false;
    const ws = new WebSocket(url);
    socket = ws;

    ws.onopen = () => {
      if (socket !== ws) return; // 已被更晚建立的连接取代
      connected.value = true;
      attempts = 0;
      startHeartbeat();
      if (auth.user!.role === 'parent') refreshPendingCount();
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg?.type === 'pong') {
          clearPongWatchdog();
          return;
        }
        handleMessage(msg);
      } catch { /* 非 JSON 消息忽略 */ }
    };

    ws.onclose = () => {
      if (socket !== ws) return;
      connected.value = false;
      stopHeartbeat();
      if (!manualClose) scheduleReconnect();
    };

    ws.onerror = () => {
      if (socket === ws) connected.value = false;
    };
  }

  function disconnect() {
    manualClose = true;
    attempts = 0;
    stopHeartbeat();
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    const ws = socket;
    socket = null;
    if (ws) ws.close();
    connected.value = false;
    pendingCount.value = 0;
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    // 指数退避 + 抖动：固定 3 秒在服务端重启期间只是无脑高频重连
    const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** attempts) + Math.random() * 300;
    attempts++;
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  }

  function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer = window.setInterval(() => {
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      socket.send(JSON.stringify({ type: 'ping' }));
      // 看门狗：ping 发出后超时收不到 pong → 链路已死（TCP 半开时 onclose 可能永不触发），
      // 主动 close 以走正常重连流程。
      clearPongWatchdog();
      pongTimer = window.setTimeout(() => {
        pongTimer = null;
        if (socket && socket.readyState === WebSocket.OPEN) socket.close();
      }, PONG_TIMEOUT_MS);
    }, HEARTBEAT_MS);
  }

  function clearPongWatchdog() {
    if (pongTimer) { clearTimeout(pongTimer); pongTimer = null; }
  }

  function stopHeartbeat() {
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
    clearPongWatchdog();
  }

  function handleMessage(msg: any) {
    const toast = useToastStore();
    const auth = useAuthStore();

    // 家长端：新兑换申请
    if (msg.type === 'new_exchange_request' && auth.user?.role === 'parent') {
      pendingCount.value++;
      const itemText = msg.exchangeType === 'cash'
        ? `现金 ${msg.amount}元`
        : `商品「${msg.productName}」`;
      toast.info(`🔔 ${msg.userName} 申请兑换${itemText}（-${msg.points}分）`);
      window.dispatchEvent(new CustomEvent(WS_EVENTS.newExchangeRequest, { detail: msg }));
    }

    // 小孩端：审核结果
    if (msg.type === 'exchange_reviewed' && auth.user?.role === 'child') {
      const itemText = msg.exchangeType === 'cash'
        ? `${msg.amount}元现金`
        : `「${msg.productName}」`;
      if (msg.status === 'approved') {
        toast.success(`✅ 你的${itemText}兑换已通过！剩余 ${msg.newBalance} 分`);
      } else {
        toast.warning(`❌ 你的${itemText}兑换被拒绝${msg.reason ? '：' + msg.reason : ''}`);
      }
      window.dispatchEvent(new CustomEvent(WS_EVENTS.exchangeReviewed, { detail: msg }));
    }

    // 家长端：小孩接受全员任务
    if (msg.type === 'task_accepted' && auth.user?.role === 'parent') {
      toast.info(`🤝 ${msg.userName} 接受了任务`);
      window.dispatchEvent(new CustomEvent(WS_EVENTS.taskAccepted, { detail: msg }));
    }

    // 家长端：小孩提交任务完成申请
    if (msg.type === 'task_completion_submitted' && auth.user?.role === 'parent') {
      toast.info(`📤 ${msg.userName} 提交了「${msg.taskName}」完成申请，待审核`);
      window.dispatchEvent(new CustomEvent(WS_EVENTS.taskCompletionSubmitted, { detail: msg }));
    }

    // 小孩端：任务审核结果
    if (msg.type === 'task_review' && auth.user?.role === 'child') {
      if (msg.status === 'approved') {
        toast.success(`✅ 任务审核通过！+${msg.points} 分`);
      } else {
        toast.warning(`❌ 任务被拒绝${msg.reason ? '：' + msg.reason : ''}，可重新提交`);
      }
      window.dispatchEvent(new CustomEvent(WS_EVENTS.taskReview, { detail: msg }));
    }

    // 全端：宠物物种目录变更（家长端新建/改名/换图/删除）
    if (msg.type === 'species_changed') {
      window.dispatchEvent(new CustomEvent(WS_EVENTS.speciesChanged, { detail: msg }));
    }

    // 小孩端：周期任务自动生成（页面据此刷新任务列表；此前没有监听者，事件白发）
    if (msg.type === 'task_generated' && auth.user?.role === 'child') {
      window.dispatchEvent(new CustomEvent(WS_EVENTS.taskGenerated, { detail: msg }));
    }

    // 家长端：小孩的宠物升级（此前没有监听者，事件白发；这里补上轻提示）
    if (msg.type === 'pet_levelup' && auth.user?.role === 'parent') {
      toast.info(`🐾 ${msg.userName} 的${msg.speciesName}进化成「${msg.stageName}」了（Lv${msg.level}）`);
      window.dispatchEvent(new CustomEvent(WS_EVENTS.petLevelup, { detail: msg }));
    }

    // 小孩端：宠物喂养 / 升级
    if (msg.type === 'pet_fed' && auth.user?.role === 'child') {
      if (msg.leveledUp) {
        toast.success(`🎉 宠物进化啦！现在是 Lv${msg.level} ${msg.stageName}`);
      } else {
        toast.info(`🍽️ 宠物吃了「${msg.itemName}」，${msg.effectText}`);
      }
      window.dispatchEvent(new CustomEvent(WS_EVENTS.petFed, { detail: msg }));
    }
  }

  /** 拉取待审核总数（兑换 + 任务，/dashboard 是两者的统一口径） */
  async function refreshPendingCount() {
    if (useAuthStore().user?.role !== 'parent') return;
    try {
      // 静态 import 即可：ws.ts → client.ts → auth.ts 这条链上没有回到 ws.ts 的环，
      // 之前写成 await import() 反而让打包器提示「该模块同时被静态/动态引用，动态导入无法拆 chunk」。
      const r = await api.get<{ pendingReview?: { total: number } }>('/dashboard');
      pendingCount.value = r.pendingReview?.total ?? 0;
    } catch { /* 网络抖动忽略，下次事件再刷 */ }
  }

  return {
    connected,
    pendingCount,
    connect,
    disconnect,
    refreshPendingCount,
  };
});
