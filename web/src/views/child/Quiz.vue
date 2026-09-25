<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { api } from '@/api/client';
import { useToastStore } from '@/stores/toast';
import { useAuthStore } from '@/stores/auth';
import GlassCard from '@/components/GlassCard.vue';

const toast = useToastStore();
const auth = useAuthStore();

interface Status {
  todayPoints: number;
  dailyCap: number;
  level1Correct: number;
  level2Correct: number;
  level1PendingHalf: boolean;
  wordCounts: Record<1 | 2, number>;
}
interface Question {
  index: number;
  type: 'en2cn' | 'listen';
  word?: string;       // en2cn 才下发（listen 不能泄露答案）
  phonetic?: string;
  audio: string;
  options: string[];
}
interface AnswerResult {
  correct: boolean;
  correctIndex: number;
  word: string;
  phonetic: string;
  translation: string;
  audio: string | null;
  delta: number;
  todayPoints: number;
  capReached: boolean;
}

const status = ref<Status | null>(null);
const loading = ref(true);
const starting = ref(false);

const phase = ref<'idle' | 'playing' | 'done'>('idle');
const level = ref<1 | 2>(1);
const roundId = ref<number>(0);
const questions = ref<Question[]>([]);
const cur = ref(0);
const answering = ref(false);
const answered = ref<AnswerResult | null>(null);
const chosen = ref<number | null>(null);
// 一级「答对 2 题记 1 分」的进度：本局内累计的答对题数（服务端口径为准，这里只做展示）
const correctCount = ref(0);
const roundDelta = ref(0);
// 听音题兜底：音频缺失时提示改用选项作答（不亮单词——服务端听音题本来就不下发 word，防泄题）
const listenFallback = ref(false);

let audio: HTMLAudioElement | null = null;

// 音频缓存：按 URL 复用 Audio 元素。文件名是 sha1 哈希、每条约 8KB，
// 一局 10 条全部预加载毫无压力；判分后要播的「正确词发音」与题面音频
// 是同一个 URL（en2cn 播题面词、listen 播的就是答案词），必然命中缓存。
const audioCache = new Map<string, HTMLAudioElement>();

function getAudio(url: string): HTMLAudioElement {
  let a = audioCache.get(url);
  if (!a) {
    a = new Audio(url);
    a.preload = 'auto';
    a.load(); // 提前拉取，避免播放时才发起请求
    audioCache.set(url, a);
  }
  return a;
}

function preloadRoundAudio() {
  for (const item of questions.value) getAudio(item.audio);
}

const q = computed(() => questions.value[cur.value] ?? null);
const progress = computed(() => `${cur.value + 1} / ${questions.value.length}`);

async function loadStatus() {
  loading.value = true;
  try {
    status.value = await api.get<Status>('/quiz/status');
  } catch (e: any) {
    toast.error(e.message);
  } finally { loading.value = false; }
}
loadStatus();

function playAudio(url: string, word?: string) {
  try { audio?.pause(); } catch {}
  audio = getAudio(url);
  try { audio.currentTime = 0; } catch {}
  audio.onerror = () => {
    // 内置发音缺失 → 浏览器 TTS 兜底；听音题顺带亮出单词
    if (word && 'speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(word);
      u.lang = 'en-GB';
      speechSynthesis.speak(u);
    }
    if (q.value?.type === 'listen') listenFallback.value = true;
  };
  audio.play().catch(() => {
    if (q.value?.type === 'listen') listenFallback.value = true;
  });
}
onUnmounted(() => { try { audio?.pause(); } catch {} });

async function startRound(lv: 1 | 2) {
  starting.value = true;
  try {
    const res = await api.post<{ roundId: number; questions: Question[] }>('/quiz/round', { level: lv });
    level.value = lv;
    roundId.value = res.roundId;
    questions.value = res.questions;
    cur.value = 0;
    correctCount.value = 0;
    roundDelta.value = 0;
    answered.value = null;
    chosen.value = null;
    phase.value = 'playing';
    // 整局音频预加载：判分反馈播发音时直接命中缓存，消除点击后的加载延时
    preloadRoundAudio();
    // 听音题进场自动播放
    const first = res.questions[0];
    if (first?.type === 'listen') playAudio(first.audio);
  } catch (e: any) {
    const err = e.payload?.error;
    if (err === 'word_bank_empty') toast.warning('词库还没准备好，稍后再来~');
    else toast.error(e.message);
  } finally { starting.value = false; }
}

async function choose(i: number) {
  if (answering.value || answered.value) return;
  answering.value = true;
  chosen.value = i;
  try {
    const res = await api.post<AnswerResult>('/quiz/answer', {
      roundId: roundId.value,
      index: q.value!.index,
      choice: i,
    });
    answered.value = res;
    if (res.correct) correctCount.value++;
    if (res.delta > 0) {
      roundDelta.value += res.delta;
      if (auth.user) auth.user.totalPoints = (auth.user.totalPoints ?? 0) + res.delta;
    }
    if (status.value) status.value.todayPoints = res.todayPoints;
    // 播一遍正确单词的发音加深记忆
    if (res.audio) playAudio(res.audio, res.word);
  } catch (e: any) {
    const err = e.payload?.error;
    if (err === 'already_answered') toast.warning('这题已经答过啦');
    else if (err === 'round_finished') toast.warning('这一轮已经结束了');
    else toast.error(e.message);
    answered.value = null;
    chosen.value = null;
  } finally { answering.value = false; }
}

function next() {
  if (cur.value + 1 >= questions.value.length) {
    phase.value = 'done';
    return;
  }
  cur.value++;
  answered.value = null;
  chosen.value = null;
  listenFallback.value = false;
  const nq = questions.value[cur.value];
  if (nq.type === 'listen') playAudio(nq.audio);
}

function backHome() {
  phase.value = 'idle';
  answered.value = null;
  chosen.value = null;
  loadStatus();
}

function levelLabel(lv: 1 | 2) { return lv === 1 ? '一级' : '二级'; }
</script>

<template>
  <div class="page">
    <header class="page-header">
      <h1 class="title">单词闯关</h1>
      <p class="subtitle">答单词赚积分，还能听发音哦~</p>
    </header>

    <!-- 选关 -->
    <template v-if="phase === 'idle'">
      <GlassCard v-if="status" padding="14px 18px" class="today-card">
        <div class="today-row">
          <span class="today-label">今日答题积分</span>
          <span class="today-value">{{ status.todayPoints }} / {{ status.dailyCap }} ⭐</span>
        </div>
        <div class="today-bar">
          <div class="today-bar-fill" :style="{ width: Math.min(100, (status.todayPoints / status.dailyCap) * 100) + '%' }"></div>
        </div>
        <p v-if="status.todayPoints >= status.dailyCap" class="today-hint done">今天的积分已经拿满啦，明天继续！</p>
        <p v-else class="today-hint">一级答对 2 题 +1 分，二级答对 1 题 +1 分</p>
      </GlassCard>

      <div class="level-cards">
        <GlassCard padding="20px" class="level-card" hover @click="startRound(1)">
          <div class="level-emoji">🌱</div>
          <h2 class="level-name">一级</h2>
          <p class="level-desc">课本基础词</p>
          <p class="level-meta">答对 2 题 = 1 分</p>
          <button class="btn btn-success big" :disabled="starting">开始挑战</button>
        </GlassCard>
        <GlassCard padding="20px" class="level-card" hover @click="startRound(2)">
          <div class="level-emoji">🚀</div>
          <h2 class="level-name">二级</h2>
          <p class="level-desc">进阶挑战词</p>
          <p class="level-meta">答对 1 题 = 1 分</p>
          <button class="btn btn-success big" :disabled="starting">开始挑战</button>
        </GlassCard>
      </div>
      <p v-if="status" class="bank-info">词库：一级 {{ status.wordCounts[1] }} 词 · 二级 {{ status.wordCounts[2] }} 词</p>
    </template>

    <!-- 答题 -->
    <template v-else-if="phase === 'playing' && q">
      <GlassCard padding="14px 18px" class="prog-card">
        <div class="prog-row">
          <span>{{ levelLabel(level) }} · 第 {{ progress }} 题</span>
          <span class="prog-score">本局 +{{ roundDelta }} ⭐</span>
        </div>
        <div class="today-bar">
          <div class="today-bar-fill" :style="{ width: ((cur + (answered ? 1 : 0)) / questions.length) * 100 + '%' }"></div>
        </div>
      </GlassCard>

      <GlassCard padding="24px 20px" class="q-card">
        <!-- 看词选义 -->
        <template v-if="q.type === 'en2cn'">
          <p class="q-hint">选出正确的意思</p>
          <div class="word-line">
            <span class="word">{{ q.word }}</span>
            <button class="speak-btn" @click="playAudio(q.audio, q.word)">🔊</button>
          </div>
          <p v-if="q.phonetic" class="phonetic">{{ q.phonetic }}</p>
        </template>

        <!-- 听音选词 -->
        <template v-else>
          <p class="q-hint">听发音，选出对应的单词</p>
          <button class="big-speak" @click="playAudio(q.audio)">🔊</button>
          <p class="tap-hint">点喇叭再听一次</p>
          <p v-if="listenFallback" class="fallback-word">（发音加载失败，从选项里猜一猜吧）</p>
        </template>

        <div class="options">
          <button
            v-for="(opt, i) in q.options"
            :key="i"
            class="option"
            :class="{
              right: answered && i === answered.correctIndex,
              wrong: answered && chosen === i && !answered.correct,
              dim: answered && i !== answered.correctIndex && chosen !== i,
            }"
            :disabled="!!answered || answering"
            @click="choose(i)"
          >
            {{ opt }}
          </button>
        </div>

        <!-- 判题反馈 -->
        <div v-if="answered" class="feedback" :class="{ ok: answered.correct, bad: !answered.correct }">
          <div class="fb-head">
            <span>{{ answered.correct ? '🎉 答对了！' : '💪 再记一遍~' }}</span>
            <span v-if="answered.delta > 0" class="fb-delta">+{{ answered.delta }} 分</span>
            <span v-else-if="answered.capReached" class="fb-capped">今日积分已拿满</span>
          </div>
          <p class="fb-detail">
            <b>{{ answered.word }}</b>
            <span v-if="answered.phonetic" class="fb-phonetic"> {{ answered.phonetic }}</span>
            —— {{ answered.translation }}
          </p>
          <button class="btn btn-success big next-btn" @click="next">
            {{ cur + 1 >= questions.length ? '看结算 🎊' : '下一题 →' }}
          </button>
        </div>
      </GlassCard>
    </template>

    <!-- 结算 -->
    <template v-else-if="phase === 'done'">
      <GlassCard padding="28px 20px" class="done-card">
        <div class="done-emoji">{{ correctCount >= questions.length ? '🏆' : correctCount >= questions.length / 2 ? '🎉' : '🌱' }}</div>
        <h2 class="done-title">本局答对 {{ correctCount }} / {{ questions.length }} 题</h2>
        <p class="done-points">获得 <b>+{{ roundDelta }}</b> 积分</p>
        <p v-if="status" class="done-today">今日答题积分 {{ status.todayPoints }} / {{ status.dailyCap }}</p>
        <div class="done-actions">
          <button class="btn btn-success big" @click="startRound(level)">再来一轮</button>
          <button class="btn big" @click="backHome">返回选关</button>
        </div>
      </GlassCard>
    </template>
  </div>
</template>

<style scoped>
.page-header { margin-bottom: 14px; }
.title { font-size: 26px; margin-bottom: 2px; }
.subtitle { color: var(--text-secondary); font-size: 13px; }

.today-card { margin-bottom: 14px; }
.today-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
.today-label { font-size: 13px; color: var(--text-secondary); }
.today-value { font-family: var(--font-cute); font-size: 20px; color: var(--accent-yellow); }
.today-bar { height: 8px; border-radius: 4px; background: rgba(0,0,0,0.06); overflow: hidden; }
.today-bar-fill { height: 100%; border-radius: 4px; background: var(--accent-yellow); transition: width 0.4s; }
.today-hint { margin-top: 8px; font-size: 12px; color: var(--text-muted); }
.today-hint.done { color: var(--accent-mint); }

.level-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.level-card { text-align: center; }
.level-emoji { font-size: 40px; margin-bottom: 6px; }
.level-name { font-family: var(--font-cute); font-size: 22px; }
.level-desc { font-size: 13px; color: var(--text-secondary); margin: 4px 0 2px; }
.level-meta { font-size: 12px; color: var(--accent-yellow); margin-bottom: 12px; }
.bank-info { text-align: center; margin-top: 12px; font-size: 12px; color: var(--text-muted); }

.prog-card { margin-bottom: 12px; }
.prog-row { display: flex; justify-content: space-between; font-size: 13px; color: var(--text-secondary); margin-bottom: 8px; }
.prog-score { font-family: var(--font-cute); color: var(--accent-yellow); }

.q-card { text-align: center; }
.q-hint { font-size: 13px; color: var(--text-secondary); margin-bottom: 10px; }
.word-line { display: flex; align-items: center; justify-content: center; gap: 10px; }
.word { font-size: 34px; font-family: var(--font-cute); letter-spacing: 1px; }
.speak-btn { font-size: 22px; background: none; border: none; cursor: pointer; }
.phonetic { color: var(--text-muted); font-size: 14px; margin-top: 4px; }

.big-speak {
  font-size: 44px; background: rgba(255, 209, 102, 0.18);
  border: 2px dashed var(--accent-yellow); border-radius: 50%;
  width: 88px; height: 88px; cursor: pointer; margin-bottom: 6px;
}
.tap-hint { font-size: 11px; color: var(--text-muted); }
.fallback-word { font-size: 14px; color: var(--accent-red); margin-top: 6px; }

.options { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 18px; }
.option {
  padding: 14px 10px; border-radius: var(--r-md);
  border: 2px solid transparent; background: rgba(255,255,255,0.75);
  font-size: 15px; cursor: pointer; transition: all 0.15s;
  font-family: var(--font-body);
}
.option:active { transform: scale(0.97); }
.option.right { border-color: var(--accent-mint); background: rgba(126, 212, 185, 0.25); font-weight: 700; }
.option.wrong { border-color: var(--accent-red); background: rgba(255, 122, 122, 0.18); }
.option.dim { opacity: 0.45; }

.feedback { margin-top: 16px; padding-top: 14px; border-top: 1px dashed rgba(0,0,0,0.08); }
.fb-head { display: flex; justify-content: center; gap: 10px; font-size: 16px; font-weight: 700; }
.fb-head.ok { color: var(--accent-mint); }
.fb-head.bad { color: var(--accent-red); }
.fb-delta { color: var(--accent-yellow); font-family: var(--font-cute); }
.fb-capped { font-size: 12px; color: var(--text-muted); font-weight: 400; align-self: center; }
.fb-detail { font-size: 14px; margin: 8px 0 12px; }
.fb-phonetic { color: var(--text-muted); font-size: 13px; }
.next-btn { width: 100%; }

.done-card { text-align: center; }
.done-emoji { font-size: 56px; margin-bottom: 8px; }
.done-title { font-family: var(--font-cute); font-size: 22px; margin-bottom: 6px; }
.done-points { font-size: 16px; }
.done-points b { color: var(--accent-yellow); font-family: var(--font-cute); font-size: 20px; }
.done-today { font-size: 12px; color: var(--text-muted); margin: 6px 0 16px; }
.done-actions { display: grid; gap: 8px; }
</style>
