/**
 * 全局 window 自定义事件名常量表。
 *
 * 此前 'ws:new_exchange_request'、'review:updated' 这类字符串字面量散落在 8 个文件里
 * （stores/ws.ts 负责派发，各 Layout / 页面负责监听）—— 改一个名字或打错一个字，
 * TypeScript 完全帮不上忙，只会静默失联、功能莫名失效。统一从这里引用。
 *
 * 约定：ws:* 事件名 = `ws:` 前缀 + 服务端推送消息的 type，一一对应。
 */

export const WS_EVENTS = {
  /** 家长端：新的兑换申请（商品/现金） */
  newExchangeRequest: 'ws:new_exchange_request',
  /** 小孩端：兑换审核结果 */
  exchangeReviewed: 'ws:exchange_reviewed',
  /** 家长端：小孩受理了任务 */
  taskAccepted: 'ws:task_accepted',
  /** 家长端：小孩提交了任务完成申请 */
  taskCompletionSubmitted: 'ws:task_completion_submitted',
  /** 小孩端：任务审核结果 */
  taskReview: 'ws:task_review',
  /** 全端：宠物物种目录变更 */
  speciesChanged: 'ws:species_changed',
  /** 小孩端：宠物喂养结果 */
  petFed: 'ws:pet_fed',
  /** 家长端：小孩宠物升级 */
  petLevelup: 'ws:pet_levelup',
  /** 小孩端：周期任务自动生成 */
  taskGenerated: 'ws:task_generated',
} as const;

export type WsEventName = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];

/** 审核页处理完一条申请后派发，供侧边栏刷新待审核角标 */
export const REVIEW_UPDATED = 'review:updated';

/** 宠物素材目录变更（定义在 lib/pet/asset.ts，此处登记以免遗漏） */
export const PET_ASSETS_CHANGED = 'pet-assets:changed';
