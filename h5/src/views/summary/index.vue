<template>
  <div class="summary page">
    <van-sticky>
      <van-nav-bar title="每日总结" />
    </van-sticky>

    <!-- 日期导航 -->
    <div class="summary__datebar">
      <van-icon name="arrow-left" class="summary__datebtn" @click="goPrev" />
      <button class="summary__datetext" @click="showCalendar = true">
        {{ dateLabel }}
        <van-icon name="calendar-o" class="summary__datecal" />
      </button>
      <van-icon
        name="arrow"
        class="summary__datebtn"
        :class="{ 'summary__datebtn--disabled': !canNext }"
        @click="goNext"
      />
    </div>

    <!-- 当日数据卡 -->
    <div class="summary__card card">
      <!-- 概览：总次数 / 较昨日 / 连续打卡 / 当天得分 -->
      <div class="summary__overview">
        <div class="ov-item">
          <div class="ov-num">{{ currentCount }}</div>
          <div class="ov-label">当天次数</div>
        </div>
        <div class="ov-item">
          <div class="ov-num" :class="diffClass">{{ diffText }}</div>
          <div class="ov-label">较昨日</div>
        </div>
        <div class="ov-item">
          <div class="ov-num ov-num--streak">{{ streak }}</div>
          <div class="ov-label">连续打卡(天)</div>
        </div>
        <div class="ov-item">
          <div class="ov-num ov-num--score">{{ currentScore }}</div>
          <div class="ov-label">当天得分</div>
        </div>
      </div>

      <!-- 各事项次数 -->
      <div v-if="dateStats.length" class="summary__block">
        <div class="summary__block-title">事项分布</div>
        <div v-for="s in dateStats" :key="s.id" class="stat-row">
          <span class="stat-dot" :style="{ background: s.color }" />
          <span class="stat-name">{{ s.title }}</span>
          <span class="stat-count">{{ s.count }} 次 · {{ s.score }} 分</span>
        </div>
      </div>

      <!-- 时段分布 -->
      <div v-if="dateStats.length" class="summary__block">
        <div class="summary__block-title">时段分布</div>
        <div v-for="b in hourDist" :key="b.key" class="hour-row">
          <span class="hour-label">{{ b.label }}</span>
          <div class="hour-bar">
            <div class="hour-bar__fill" :style="{ width: b.pct + '%' }" />
          </div>
          <span class="hour-count">{{ b.count }}</span>
        </div>
      </div>

      <!-- 空态 -->
      <van-empty
        v-if="!currentCount && !noteText.trim()"
        image="search"
        description="这一天还没有记录，写下点什么吧"
      />
    </div>

    <!-- 文字复盘 -->
    <div class="summary__card card">
      <div class="summary__block-title">
        文字复盘
        <span class="summary__savehint">{{ saveHint || (noteText.trim() ? '已保存' : '') }}</span>
      </div>
      <van-field
        v-model="noteText"
        type="textarea"
        rows="4"
        autosize
        :border="false"
        placeholder="写点什么记录今天：状态、心得、想记住的瞬间……"
        @input="onInput"
      />
      <div class="summary__counter">{{ noteText.length }} 字</div>
    </div>

    <!-- 历史日期选择 -->
    <van-calendar
      v-model:show="showCalendar"
      :min-date="calMin"
      :max-date="calMax"
      :default-date="calDefault"
      :show-confirm="false"
      :formatter="sumFormatter"
      @select="onPickDate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onActivated, onDeactivated } from 'vue';
import { useTodoStore } from '@/stores/todo';
import { useSummaryStore } from '@/stores/summary';
import { addDays, compareDate, dateToStr, formatCN, timeStr, todayStr } from '@/utils/date';

defineOptions({ name: 'summary' });

const todo = useTodoStore();
const summary = useSummaryStore();

// ===== 日期导航 =====
const currentDate = ref<string>(todayStr());
const showCalendar = ref(false);

const dateLabel = computed(() => formatCN(currentDate.value));
const isToday = computed(() => currentDate.value === todayStr());
const canNext = computed(() => compareDate(currentDate.value, todayStr()) < 0);

const calMax = new Date();
const calMin = (() => {
  const d = new Date(`${todayStr()}T00:00:00`);
  d.setDate(d.getDate() - 180);
  return d;
})();
const calDefault = computed(() => new Date(`${currentDate.value}T00:00:00`));

function goPrev(): void {
  goDate(addDays(currentDate.value, -1));
}
function goNext(): void {
  if (!canNext.value) return;
  goDate(addDays(currentDate.value, 1));
}
function onPickDate(d: Date): void {
  goDate(dateToStr(d));
  showCalendar.value = false;
}

// 切换日期：先保存当前未存内容，再加载目标日期
function goDate(target: string): void {
  saveNow();
  currentDate.value = target;
  noteText.value = summary.getNote(target);
  saveHint.value = noteText.value.trim() ? '已保存' : '';
}

// ===== 文字复盘（防抖自动保存） =====
const noteText = ref<string>(summary.getNote(currentDate.value));
const saveHint = ref<string>(noteText.value.trim() ? '已保存' : '');
let saveTimer: number | undefined;

function onInput(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    summary.setNote(currentDate.value, noteText.value);
    saveHint.value = `已保存 ${timeStr(new Date())}`;
  }, 500);
}

/** 立即保存（切走/切日期前调用，避免防抖丢字） */
function saveNow(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = undefined;
  }
  summary.setNote(currentDate.value, noteText.value);
}

// keep-alive：切回时同步最新（跨 WebView 已由 __todoResync 重读，这里兜底当前日期文本）
onActivated(() => {
  noteText.value = summary.getNote(currentDate.value);
});
onDeactivated(() => {
  saveNow();
});

// ===== 当日数据 =====
const currentCount = computed(() => todo.recordsByDate(currentDate.value).length);
/** 当日得分（当日所有记录分值之和） */
const currentScore = computed(() =>
  todo.recordsByDate(currentDate.value).reduce((s, r) => s + (r.score ?? 1), 0)
);
const yesterdayCount = computed(() => todo.recordsByDate(addDays(currentDate.value, -1)).length);
const diff = computed(() => currentCount.value - yesterdayCount.value);
const diffText = computed(() => (diff.value === 0 ? '—' : diff.value > 0 ? `+${diff.value}` : `${diff.value}`));
const diffClass = computed(() => ({
  'ov-num--up': diff.value > 0,
  'ov-num--down': diff.value < 0
}));

/** 连续打卡天数：今天没打不急于断签，从昨天起算 */
const streak = computed(() => {
  const dates = new Set(todo.records.map((r) => r.date));
  let count = 0;
  const d = new Date();
  if (!dates.has(dateToStr(d))) d.setDate(d.getDate() - 1);
  while (dates.has(dateToStr(d))) {
    count += 1;
    d.setDate(d.getDate() - 1);
  }
  return count;
});

/** 当日各事项次数与得分（降序） */
const dateStats = computed(() => {
  const recs = todo.recordsByDate(currentDate.value);
  const map = new Map<string, { id: string; title: string; count: number; color: string; score: number }>();
  for (const r of recs) {
    let e = map.get(r.itemId);
    if (!e) {
      const item = todo.items.find((i) => i.id === r.itemId);
      e = { id: r.itemId, title: r.title, count: 0, color: item?.color || '#1989fa', score: 0 };
      map.set(r.itemId, e);
    }
    e.count += 1;
    e.score += r.score ?? 1;
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
});

/** 时段分布（按小时分桶） */
const HOUR_BUCKETS = [
  { key: 'night', label: '深夜', from: 0, to: 5 },
  { key: 'morning', label: '早晨', from: 6, to: 11 },
  { key: 'noon', label: '午间', from: 12, to: 13 },
  { key: 'afternoon', label: '下午', from: 14, to: 17 },
  { key: 'evening', label: '晚间', from: 18, to: 23 }
];
const hourDist = computed(() => {
  const recs = todo.recordsByDate(currentDate.value);
  const arr = HOUR_BUCKETS.map((b) => ({ ...b, count: 0 }));
  for (const r of recs) {
    const h = parseInt(r.time.slice(0, 2), 10);
    const b = arr.find((x) => h >= x.from && h <= x.to);
    if (b) b.count += 1;
  }
  const max = Math.max(1, ...arr.map((x) => x.count));
  return arr.map((x) => ({ ...x, pct: Math.round((x.count / max) * 100) }));
});

// 消除未使用变量告警（isToday 供将来扩展，保留引用）
void isToday;

/** 总结页日期选择日历：已记录日期下方标注当天得分 */
function sumFormatter(day: any): any {
  const ds = dateToStr(day.date);
  if (todo.recordedDates.has(ds)) {
    const score = todo.recordsByDate(ds).reduce((s, r) => s + (r.score ?? 1), 0);
    day.bottomInfo = `${score}分`;
  }
  return day;
}
</script>

<style lang="scss" scoped>
.summary {
  &__datebar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-lg;
    padding: $spacing-md $spacing-lg;
  }
  &__datebtn {
    font-size: 20px;
    color: $color-primary;
    padding: $spacing-xs;
    cursor: pointer;
    &--disabled {
      color: $color-text-disabled;
      pointer-events: none;
    }
  }
  &__datetext {
    display: inline-flex;
    align-items: center;
    gap: $spacing-sm;
    border: none;
    background: transparent;
    font-size: $font-lg;
    font-weight: 600;
    color: $color-text;
    cursor: pointer;
  }
  &__datecal {
    font-size: $font-md;
    color: $color-text-secondary;
  }

  &__card {
    margin-top: 0;
  }
  &__block {
    margin-top: $spacing-lg;
    &-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: $font-md;
      font-weight: 600;
      color: $color-text;
      margin-bottom: $spacing-sm;
    }
  }
  &__savehint {
    font-size: $font-xs;
    font-weight: 400;
    color: $color-text-secondary;
  }
  &__counter {
    margin-top: $spacing-sm;
    text-align: right;
    font-size: $font-xs;
    color: $color-text-secondary;
  }

  // 概览
  &__overview {
    display: flex;
    gap: $spacing-md;
  }
}
.ov-item {
  flex: 1;
  text-align: center;
  padding: $spacing-sm 0;
  background: $color-background;
  border-radius: $radius-md;
}
.ov-num {
  font-size: 22px;
  font-weight: 700;
  color: $color-text;
  line-height: 1.2;
  &--streak {
    color: $color-primary;
  }
  &--score {
    color: $color-primary;
  }
  &--up {
    color: $color-success;
  }
  &--down {
    color: $color-danger;
  }
}
.ov-label {
  margin-top: 2px;
  font-size: $font-xs;
  color: $color-text-secondary;
}

// 事项分布
.stat-row {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-xs 0;
  font-size: $font-sm;
}
.stat-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.stat-name {
  flex: 1;
  color: $color-text;
}
.stat-count {
  color: $color-primary;
  font-weight: 600;
}

// 时段分布
.hour-row {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-xs 0;
  font-size: $font-sm;
}
.hour-label {
  width: 36px;
  color: $color-text-secondary;
}
.hour-bar {
  flex: 1;
  height: 8px;
  background: $color-background;
  border-radius: 999px;
  overflow: hidden;
  &__fill {
    height: 100%;
    background: $color-primary;
    border-radius: 999px;
    transition: width 0.3s ease;
  }
}
.hour-count {
  width: 20px;
  text-align: right;
  color: $color-text-secondary;
}
</style>
