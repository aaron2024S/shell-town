<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { api } from '@/api/client';
import { LIST_PAGE_SIZE } from '@/utils/pagination';
import { useToastStore } from '@/stores/toast';
import { useAuthStore } from '@/stores/auth';
import GlassCard from '@/components/GlassCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import Pager from '@/components/Pager.vue';
import CategoryIcon from '@/components/CategoryIcon.vue';
import { WS_EVENTS } from '@/utils/events';
import { petEffectText, type PetEffect } from '@/utils/pets';

const toast = useToastStore();
const auth = useAuthStore();

interface Product {
  id: number;
  name: string;
  cost: number;
  stock: number;
  icon: string;
  kind?: 'physical' | 'pet';
  pet_effect?: PetEffect | null;
}
interface Request {
  id: number;
  type: 'product' | 'cash';
  product_name: string | null;
  product_icon: string | null;
  points: number;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string | null;
  created_at: number;
}

const products = ref<Product[]>([]);
const myRequests = ref<Request[]>([]);
const loading = ref(true);
const myPoints = computed(() => auth.user?.totalPoints ?? 0);
const tab = ref<'shop' | 'records'>('shop');
const kindTab = ref<'all' | 'physical' | 'pet'>('all');

// 宠物相关
const hasPet = ref(false);
const petName = ref('');
const feedingId = ref<number | null>(null);
// 每日喂养额度（家长设置后才有限制；0/null = 不限）
const quota = ref<{ todayFed: number; todayPoints: number; feedLimit: number; pointsLimit: number; feedsLeft: number | null; pointsLeft: number | null } | null>(null);

const physicalProducts = computed(() => products.value.filter((p) => p.kind !== 'pet'));
const petProducts = computed(() => products.value.filter((p) => p.kind === 'pet'));
const showPhysical = computed(() => kindTab.value !== 'pet');
const showPet = computed(() => kindTab.value !== 'physical');

// 现金兑换弹窗
const cashOpen = ref(false);
const cashPoints = ref(10);
const cashRate = ref(10);
const cashAmount = computed(() => cashPoints.value / cashRate.value);

// 确认弹窗
const confirmOpen = ref(false);
const confirmMessage = ref('');
const confirmAction = ref<(() => Promise<void>) | null>(null);

// 兑换记录分页：每页 20 条，页码翻页
const REC_PAGE = LIST_PAGE_SIZE;
const recPage = ref(1);
const recTotal = ref(0);

async function loadRecords(p = recPage.value) {
  const res = await api.get<{ requests: Request[]; total: number }>(
    `/exchange-requests/mine?limit=${REC_PAGE}&offset=${(p - 1) * REC_PAGE}`,
  );
  myRequests.value = res.requests;
  recTotal.value = res.total ?? res.requests.length;
  recPage.value = p;
}

async function load() {
  loading.value = true;
  try {
    const [p, rate, me] = await Promise.all([
      api.get<{ products: Product[] }>('/products'),
      api.get<{ rate: number }>('/products/cash-rate'),
      api.get<{ pet: any; quota?: typeof quota.value }>('/pets/me').catch(() => ({ pet: null, quota: null })),
    ]);
    products.value = p.products;
    cashRate.value = rate.rate;
    hasPet.value = !!me.pet;
    petName.value = me.pet?.displayName ?? '';
    quota.value = me.quota ?? null;
    await Promise.all([loadRecords(1), auth.refreshMe()]);
  } finally { loading.value = false; }
}

/** 宠物道具：直接喂给宠物，立即生效（不走走审核，也不产生兑换申请） */
async function feedPet(p: Product) {
  if (feedingId.value !== null) return;
  if (!hasPet.value) {
    return toast.info('还没有宠物哦，先去「宠物」页领养一只吧~');
  }
  if (myPoints.value < p.cost) {
    return toast.warning(`积分不足，还差 ${p.cost - myPoints.value} 分`);
  }
  feedingId.value = p.id;
  try {
    const res = await api.post<{
      pet: any;
      effectText: string;
      itemName: string;
      leveledUp: boolean;
      levelAfter: number;
      stageNameAfter: string;
      newBalance: number;
      quota?: NonNullable<typeof quota.value>;
    }>('/pets/use-item', { productId: p.id });

    if (res.quota) quota.value = res.quota;
    if (auth.user) auth.setUser({ ...auth.user, totalPoints: res.newBalance });
    if (res.leveledUp) {
      toast.success(`🎉 进化啦！${res.pet.displayName} 现在是 Lv${res.levelAfter} ${res.stageNameAfter}`);
    } else {
      toast.success(`${res.pet.displayName} 吃了「${res.itemName}」，${res.effectText}`);
    }
    petName.value = res.pet.displayName;
    // 刷新库存
    const prodRes = await api.get<{ products: Product[] }>('/products');
    products.value = prodRes.products;
  } catch (e: any) {
    const err = e.payload?.error;
    if (err === 'insufficient_points') toast.error('积分不足');
    else if (err === 'out_of_stock') toast.error('这个道具已经卖完啦');
    else if (err === 'pet_max_level') toast.info('宠物已经满级啦，不用再喂经验道具了');
    else if (err === 'no_pet') toast.info('你还没有宠物哦');
    else if (err === 'feed_limit_reached') toast.info('今天陪宠物玩的时间用完啦，明天再来陪它吧~');
    else if (err === 'points_limit_reached') toast.info('今天的宠物积分用完啦，明天再来吧~');
    else toast.error(e.message || '喂养失败');
  } finally {
    feedingId.value = null;
  }
}

async function exchangeProduct(p: Product) {
  if (myPoints.value < p.cost) {
    return toast.warning(`积分不足，还差 ${p.cost - myPoints.value} 分`);
  }
  confirmMessage.value = `确认兑换「${p.name}」？消耗 ${p.cost} 分\n（等待家长审核通过后扣分）`;
  confirmAction.value = async () => {
    try {
      await api.post('/exchange-requests', { type: 'product', productId: p.id });
      toast.success('申请已提交，等家长审核哦~');
      await load();
    } catch (e: any) {
      const err = e.payload?.error;
      if (err === 'insufficient_points') toast.error('积分不足');
      else if (err === 'out_of_stock') toast.error('商品已售罄');
      else toast.error(e.message);
    }
  };
  confirmOpen.value = true;
}

function openCash() {
  // 初值必须是「余额内最大的合法倍数」。此前写成
  //   Math.min(rate, floor(points/rate)*rate || rate)
  // 积分不足一个费率（余额 3、费率 10）时兜底值会取到 10 —— 比余额还大，
  // 用户必须先手动改小才能提交；一点都没有时也给出一个不可能的值。
  const affordable = Math.floor(myPoints.value / cashRate.value) * cashRate.value;
  cashPoints.value = affordable > 0 ? affordable : 0;
  cashOpen.value = true;
}

async function exchangeCash() {
  if (cashPoints.value % cashRate.value !== 0) return toast.warning(`积分必须是 ${cashRate.value} 的倍数`);
  if (cashPoints.value > myPoints.value) return toast.warning('积分不足');
  confirmMessage.value = `确认兑换 ${cashAmount.value} 元？消耗 ${cashPoints.value} 积分`;
  confirmAction.value = async () => {
    try {
      await api.post('/exchange-requests', { type: 'cash', points: cashPoints.value });
      toast.success(`已申请兑换 ${cashAmount.value} 元，等家长审核`);
      cashOpen.value = false;
      await load();
    } catch (e: any) {
      if (e.payload?.error === 'insufficient_points') toast.error('积分不足');
      else toast.error(e.message);
    }
  };
  confirmOpen.value = true;
}

async function runConfirm() {
  if (confirmAction.value) await confirmAction.value();
  confirmAction.value = null;
}

function fmtTime(ts: number) {
  const d = new Date(ts * 1000);
  const diff = Date.now() - ts * 1000;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const statusText: Record<string, string> = {
  pending: '⏳ 审核中',
  approved: '✅ 已通过',
  rejected: '❌ 已拒绝',
};

// 兑换记录类型图标
const typeIcon: Record<string, string> = {
  cash: '💰 现金',
  product: '商品',
};

onMounted(() => {
  load();
  window.addEventListener(WS_EVENTS.exchangeReviewed, onReviewed);
});

function onReviewed() {
  // 收到审核结果后刷新兑换记录
  load();
}

onUnmounted(() => {
  window.removeEventListener('ws:exchange_reviewed', onReviewed);
});
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1 class="title">积分商城</h1>
        <p class="subtitle">攒积分，换好礼~</p>
      </div>
      <div class="points-box">
        <span class="num">{{ myPoints }}</span>
        <span class="unit">分</span>
        <span class="emoji">🌟</span>
      </div>
    </header>

    <div class="tabs">
      <button :class="{ active: tab === 'shop' }" @click="tab = 'shop'">🎁 商城</button>
      <button :class="{ active: tab === 'records' }" @click="tab = 'records'">📋 我的兑换</button>
    </div>

    <template v-if="tab === 'shop'">
      <!-- 现金兑换入口 -->
      <GlassCard padding="16px 18px" class="cash-entry" @click="openCash">
        <div class="cash-left">
          <span class="emoji">💵</span>
          <div>
            <div class="cash-title">现金兑换</div>
          <div class="cash-desc">{{ cashRate }} 🌟 = 1 元</div>
          </div>
        </div>
        <span class="arrow">›</span>
      </GlassCard>

      <EmptyState v-if="!loading && products.length === 0" emoji="🎁" text="商城还没有商品" hint="让爸爸妈妈添加商品吧~" />

      <template v-else>
        <div class="kind-tabs">
          <button :class="{ active: kindTab === 'all' }" @click="kindTab = 'all'">全部</button>
          <button :class="{ active: kindTab === 'physical' }" @click="kindTab = 'physical'">🎁 实物好礼</button>
          <button :class="{ active: kindTab === 'pet' }" @click="kindTab = 'pet'">🐾 宠物道具</button>
        </div>

        <!-- 实物好礼 -->
        <template v-if="showPhysical">
          <h3 class="group-title">🎁 实物好礼</h3>
          <p class="group-sub">兑换后等爸爸妈妈审核发给你</p>
          <p v-if="physicalProducts.length === 0" class="group-empty">还没有实物商品</p>
          <div v-else class="product-list">
            <GlassCard v-for="p in physicalProducts" :key="p.id" padding="10px 14px" class="product-row">
              <CategoryIcon :icon="p.icon" :size="40" />
              <div class="p-info">
                <span class="name">{{ p.name }}</span>
                <span class="stock" :class="{ soldout: p.stock === 0 }">
                  {{ p.stock === -1 ? '库存不限' : (p.stock === 0 ? '已售罄' : `剩 ${p.stock} 件`) }}
                </span>
              </div>
              <span class="cost">{{ p.cost }} 🌟</span>
              <button
                class="btn btn-primary exchange-btn"
                :disabled="myPoints < p.cost || p.stock === 0"
                @click="exchangeProduct(p)"
              >
                {{ p.stock === 0 ? '售罄' : (myPoints < p.cost ? '🌟不足' : '兑换') }}
              </button>
            </GlassCard>
          </div>
        </template>

        <!-- 宠物道具 -->
        <template v-if="showPet">
          <h3 class="group-title">🐾 宠物道具</h3>
          <p class="group-sub">
            {{ hasPet ? `买给「${petName}」立刻就能用，不用等审核` : '还没有宠物，先去领养一只吧' }}
          </p>
          <!-- 每日额度（家长设置后才显示）：温和提醒，不出现"限制/禁止"字眼 -->
          <p v-if="hasPet && quota && (quota.feedLimit > 0 || quota.pointsLimit > 0)" class="quota-chip">
            <template v-if="quota.feedLimit > 0">
              今天已喂 {{ quota.todayFed }}/{{ quota.feedLimit }} 次<template v-if="quota.feedsLeft">，还能喂 {{ quota.feedsLeft }} 次</template>
            </template>
            <template v-if="quota.pointsLimit > 0">
              {{ quota.feedLimit > 0 ? ' · ' : '' }}宠物积分还剩 {{ quota.pointsLeft }} 🌟
            </template>
          </p>
          <p v-if="petProducts.length === 0" class="group-empty">还没有宠物道具</p>
          <div v-else class="product-list">
            <GlassCard
              v-for="p in petProducts"
              :key="p.id"
              padding="10px 14px"
              class="product-row pet-row"
            >
              <!-- 与家长端商城同一套 CategoryIcon，保证两端图标一致 -->
              <CategoryIcon :icon="p.icon" :size="40" />
              <div class="p-info">
                <span class="name">{{ p.name }}</span>
                <span class="stock pet-effect">{{ petEffectText(p.pet_effect) }}</span>
              </div>
              <span class="cost">{{ p.cost }} 🌟</span>
              <button
                class="btn btn-primary exchange-btn"
                :disabled="myPoints < p.cost || p.stock === 0 || feedingId === p.id || !hasPet"
                @click="feedPet(p)"
              >
                {{ !hasPet ? '先领养' : (p.stock === 0 ? '售罄' : (myPoints < p.cost ? '🌟不足' : (feedingId === p.id ? '喂…' : '喂给它'))) }}
              </button>
            </GlassCard>
          </div>
          <div v-if="!hasPet" class="adopt-hint">
            <span class="ah-emoji">🥚</span>
            <span>去宠物页领养一只，就能用这些道具啦~</span>
            <RouterLink class="btn btn-primary ah-btn" to="/child/pet">去领养</RouterLink>
          </div>
        </template>
      </template>
    </template>

    <template v-else>
      <EmptyState v-if="!loading && myRequests.length === 0" emoji="📋" text="还没有兑换记录" />
      <div v-else class="records">
        <GlassCard v-for="r in myRequests" :key="r.id" padding="12px 16px" class="record">
          <div class="r-head">
            <span class="r-type">
              <CategoryIcon v-if="r.type === 'product'" :icon="r.product_icon" :size="24" />
              <span v-else class="r-type-emoji">💰</span>
              <span>{{ typeIcon[r.type] }}</span>
            </span>
            <span class="r-status" :class="r.status">{{ statusText[r.status] }}</span>
          </div>
          <div class="r-detail">
            <span v-if="r.type === 'product'">{{ r.product_name || '已删除商品' }}</span>
            <span v-else>{{ r.amount }} 元</span>
            <span class="r-pts">🌟 -{{ r.points }} 分</span>
          </div>
          <div v-if="r.status === 'rejected' && r.reason" class="r-reason">
            📝 {{ r.reason }}
          </div>
          <div class="r-time">{{ fmtTime(r.created_at) }}</div>
        </GlassCard>
      </div>
      <Pager :page="recPage" :page-size="REC_PAGE" :total="recTotal" @update:page="loadRecords" />
    </template>

    <!-- 现金兑换弹窗 -->
    <div v-if="cashOpen" class="modal-overlay" @click.self="cashOpen = false">
      <div class="modal glass-strong">
        <h3 class="modal-title">💵 现金兑换</h3>
        <p class="modal-hint">{{ cashRate }} 🌟 = 1 元（必须是 {{ cashRate }} 的倍数）</p>
        <div class="my-points">🌟 当前积分：{{ myPoints }} 分</div>
        <p v-if="myPoints < cashRate" class="not-enough">
          现在有 {{ myPoints }} 🌟，攒够 {{ cashRate }} 🌟 就能换 1 元啦~
        </p>
        <div class="input-row">
          <input v-model.number="cashPoints" type="number" min="0" :step="cashRate" />
          <span class="suffix">分</span>
        </div>
        <div class="amount-display">
          可兑换 <span class="amount">{{ cashAmount }}</span> 元
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="cashOpen = false">取消</button>
          <button
            class="btn btn-primary"
            @click="exchangeCash"
            :disabled="cashPoints <= 0 || cashPoints % cashRate !== 0 || cashPoints > myPoints"
          >
            确认申请
          </button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      v-model="confirmOpen"
      title="确认操作"
      :message="confirmMessage"
      confirmText="确认"
      @confirm="runConfirm"
    />
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.title { font-size: 24px; margin-bottom: 2px; }
.subtitle { color: var(--text-secondary); font-size: 13px; }
.points-box {
  background: linear-gradient(135deg, var(--accent-yellow), var(--accent-orange));
  padding: 8px 16px;
  border-radius: var(--r-md);
  box-shadow: 0 4px 12px rgba(255, 180, 84, 0.3);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.points-box .emoji { font-size: 16px; }
.points-box .num {
  font-family: var(--font-cute);
  font-size: 24px;
  color: #4a2e00;
}
.points-box .unit { font-size: 12px; color: #4a2e00; }

.tabs {
  display: flex;
  background: var(--glass-bg);
  border-radius: var(--r-md);
  padding: 4px;
  gap: 4px;
  margin-bottom: 16px;
}
.tabs button {
  flex: 1;
  padding: 10px;
  border-radius: var(--r-sm);
  color: var(--text-secondary);
  font-weight: 600;
  transition: all 0.2s;
}
.tabs button.active {
  background: var(--glass-bg-strong);
  color: var(--text-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.cash-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  cursor: pointer;
  background: linear-gradient(135deg, rgba(255, 209, 102, 0.15), rgba(255, 180, 84, 0.08));
}
.cash-left { display: flex; align-items: center; gap: 12px; }
.cash-entry .emoji { font-size: 32px; }
.cash-title { font-family: var(--font-cute); font-size: 17px; }
.cash-desc { font-size: 12px; color: var(--text-secondary); }
.arrow { font-size: 24px; color: var(--text-muted); }

.product-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 商品类型筛选 */
.kind-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
}
.kind-tabs button {
  flex: 1;
  padding: 8px 4px;
  border-radius: var(--r-md);
  background: var(--glass-bg);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  transition: all 0.18s;
}
.kind-tabs button.active {
  background: rgba(255, 209, 102, 0.22);
  color: #7a5a1e;
}
.group-title { font-family: var(--font-cute); font-size: 16px; margin-bottom: 2px; }
.group-sub { font-size: 11px; color: var(--text-muted); margin-bottom: 10px; }
.quota-chip {
  font-size: 12px;
  color: var(--accent-orange);
  background: rgba(255, 180, 84, 0.12);
  border-radius: 10px;
  padding: 6px 12px;
  display: inline-block;
  margin: -4px 0 10px;
}
.group-empty {
  font-size: 12px;
  color: var(--text-muted);
  padding: 14px;
  border-radius: var(--r-md);
  background: var(--glass-bg);
  text-align: center;
  margin-bottom: 16px;
}
.pet-effect { color: var(--accent-orange); }
.pet-row { margin-bottom: 0; }
.adopt-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: var(--r-md);
  background: rgba(255, 209, 102, 0.14);
  font-size: 12px;
  color: var(--text-secondary);
}
.ah-emoji { font-size: 22px; }
.ah-btn {
  margin-left: auto;
  padding: 6px 12px;
  font-size: 12px;
  text-decoration: none;
  flex-shrink: 0;
}
.product-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.p-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.p-info .name {
  font-family: var(--font-cute);
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.p-info .stock {
  font-size: 11px;
  color: var(--text-muted);
}
.p-info .stock.soldout { color: var(--danger); }
.product-row .cost {
  flex-shrink: 0;
  font-family: var(--font-cute);
  color: var(--accent-yellow);
  font-size: 20px;
}
.exchange-btn {
  flex-shrink: 0;
  min-width: 72px;
  padding: 7px 14px;
  font-size: 14px;
}
.exchange-btn:disabled { opacity: 0.45; }

.records { display: flex; flex-direction: column; gap: 10px; }
.r-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.r-type { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-family: var(--font-cute); }
.r-type-emoji { font-size: 20px; line-height: 1; }
.r-status { font-size: 11px; padding: 2px 8px; border-radius: 6px; font-weight: 600; }
.r-status.pending { background: rgba(255, 209, 102, 0.2); color: var(--accent-yellow); }
.r-status.approved { background: rgba(126, 212, 185, 0.2); color: var(--success); }
.r-status.rejected { background: rgba(255, 122, 122, 0.2); color: var(--danger); }
.r-detail {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  margin-bottom: 4px;
}
.r-pts { color: var(--danger); font-family: var(--font-cute); }
.r-reason { font-size: 11px; color: var(--danger); margin-bottom: 4px; }
.r-time { font-size: 11px; color: var(--text-muted); }

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.modal {
  width: 100%;
  max-width: 360px;
  padding: 24px;
  border-radius: var(--r-lg);
  border: 1px solid var(--glass-border);
}
.modal-title { font-family: var(--font-cute); font-size: 22px; margin-bottom: 8px; }
.modal-hint { font-size: 12px; color: var(--text-secondary); margin-bottom: 16px; }
.my-points { font-size: 13px; margin-bottom: 12px; color: var(--text-secondary); }
.not-enough {
  font-size: 12px;
  color: var(--accent-orange);
  background: rgba(255, 180, 84, 0.12);
  border-radius: var(--r-sm);
  padding: 8px 10px;
  margin-bottom: 12px;
  line-height: 1.5;
}
.input-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 12px;
}
.input-row input { flex: 1; }
.suffix { font-size: 13px; color: var(--text-muted); }
.amount-display {
  font-size: 16px;
  margin-bottom: 20px;
  text-align: center;
}
.amount-display .amount {
  font-family: var(--font-cute);
  color: var(--accent-yellow);
  font-size: 28px;
}
.modal-actions { display: flex; gap: 10px; }
.modal-actions .btn { flex: 1; }
</style>
