<template>
  <div class="stats page">
    <van-sticky>
      <van-nav-bar title="统计" />
    </van-sticky>

    <van-tabs v-model:active="tab" sticky>
      <!-- 日历 -->
      <van-tab title="日历">
        <!-- 月份筛选导航：快速跳转到指定月份查找日期 -->
        <div class="stats__monthbar">
          <van-icon
            name="arrow-left"
            class="stats__monthbtn"
            :class="{ 'is-disabled': !canPrevMonth }"
            @click="prevMonth"
          />
          <button class="stats__monthtext" @click="openPicker">
            {{ monthLabel }}
          </button>
          <van-icon
            name="arrow"
            class="stats__monthbtn"
            :class="{ 'is-disabled': !canNextMonth }"
            @click="nextMonth"
          />
        </div>

        <div class="stats__cal-card">
          <van-calendar
            ref="calendarRef"
            :key="calKey"
            :poppable="false"
            :show-confirm="false"
            :min-date="minDate"
            :max-date="maxDate"
            :formatter="formatter"
            @select="onSelect"
          />
        </div>
        <p class="stats__tip">有蓝点的日期有记录 · 日期下方数字为当天得分 · 点日期查看当日明细</p>
      </van-tab>

      <!-- 周统计 -->
      <van-tab title="周统计">
        <div class="stats__week">
          <!-- 累计排行 -->
          <div class="card">
            <div class="home__section-title">
              累计排行 <span class="home__hint">全部事项</span>
            </div>
            <van-empty v-if="!todo.cumulative.length" description="暂无数据" />
            <div v-for="(item, idx) in todo.cumulative" :key="item.itemId" class="rank-row">
              <span class="rank-no" :class="{ 'rank-no--top': idx < 3 }">{{ idx + 1 }}</span>
              <span class="rank-dot" :style="{ background: item.color }" />
              <span class="rank-name">{{ item.title }}</span>
              <span class="rank-count">{{ item.score }} 分</span>
            </div>
          </div>

          <!-- 每周明细 -->
          <div class="stats__weeks">
            <div v-for="w in todo.weekly" :key="w.key" class="week-card card">
              <div class="week-card__head">
                <span class="week-card__range">{{ w.range }}</span>
                <span class="week-card__total">{{ w.score }} 分</span>
              </div>
              <div v-for="it in w.items" :key="it.itemId" class="week-row">
                <span class="week-row__name">{{ it.title }}</span>
                <span class="week-row__count">{{ it.count }} 次</span>
              </div>
            </div>
          </div>
        </div>
      </van-tab>
    </van-tabs>

    <!-- 当日记录弹窗（底部抽屉） -->
    <van-popup
      v-model:show="showDay"
      position="bottom"
      round
      :style="{ maxHeight: '72%' }"
      class="day-popup"
    >
      <div class="day-popup__head">
        <div class="day-popup__title">{{ selectedLabel }} 的记录</div>
        <div class="day-popup__sub">{{ dayRecords.length }} 次 · {{ dayScore }} 分</div>
        <van-icon name="cross" class="day-popup__close" @click="showDay = false" />
      </div>
      <div class="day-popup__body">
        <van-empty v-if="!dayRecords.length" :description="`${selectedLabel} 还没有记录`" />
        <van-cell-group v-else :border="false">
          <van-swipe-cell v-for="rec in dayRecords" :key="rec.id">
            <van-cell :title="rec.title" :label="rec.time">
              <template #icon>
                <span class="rec-dot" :style="{ background: colorOf(rec.itemId) }" />
              </template>
            </van-cell>
            <template #right>
              <van-button
                square
                type="danger"
                text="删除"
                class="del-btn"
                @click="onDeleteRec(rec)"
              />
            </template>
          </van-swipe-cell>
        </van-cell-group>
      </div>
    </van-popup>

    <!-- 日期筛选弹层：选月份 → 选当天某日，一键锁定视图（手写面板，避免引入额外组件） -->
    <van-popup v-model:show="showMonthPicker" position="bottom" round class="month-popup">
      <div class="month-popup__head">
        <van-icon
          v-if="pickerStep === 'day'"
          name="arrow-left"
          class="month-popup__back"
          @click="backToMonth"
        />
        <div class="month-popup__title">
          {{ pickerStep === 'day' ? `${pickerYear}年${pickerMonth}月 · 选择日期` : '选择月份' }}
        </div>
        <van-icon name="cross" class="month-popup__close" @click="showMonthPicker = false" />
      </div>

      <!-- 步骤一：选月份 -->
      <template v-if="pickerStep === 'month'">
        <div class="month-popup__yearbar">
          <van-icon name="arrow-left" class="month-popup__yearbtn" @click="stepYear(-1)" />
          <span class="month-popup__year">{{ pickerYear }} 年</span>
          <van-icon name="arrow" class="month-popup__yearbtn" @click="stepYear(1)" />
        </div>
        <div class="month-popup__grid">
          <button
            v-for="m in 12"
            :key="m"
            class="month-cell"
            :class="{ 'month-cell--current': isCurrentMonth(pickerYear, m) }"
            :disabled="!isMonthSelectable(pickerYear, m)"
            @click="pickMonth(m)"
          >
            {{ m }} 月
          </button>
        </div>
      </template>

      <!-- 步骤二：选日期 -->
      <template v-else>
        <div class="month-popup__daybar">
          <van-icon
            name="arrow-left"
            class="month-popup__yearbtn"
            :class="{ 'is-disabled': !canPickerPrevMonth }"
            @click="stepPickerMonth(-1)"
          />
          <span class="month-popup__year" @click="backToMonth">{{ pickerYear }}年{{ pickerMonth }}月 ▾</span>
          <van-icon
            name="arrow"
            class="month-popup__yearbtn"
            :class="{ 'is-disabled': !canPickerNextMonth }"
            @click="stepPickerMonth(1)"
          />
        </div>
        <div class="month-popup__weekrow">
          <span v-for="w in ['一', '二', '三', '四', '五', '六', '日']" :key="w">{{ w }}</span>
        </div>
        <div class="month-popup__days">
          <span
            v-for="(c, i) in pickerDays"
            :key="i"
            class="day-cell"
            :class="{
              'day-cell--empty': !c,
              'day-cell--recorded': c && c.recorded,
              'day-cell--current': c && c.ds === todayStr(),
              'is-disabled': c && c.disabled
            }"
            @click="c && !c.disabled && pickDay(c)"
          >
            {{ c ? c.day : '' }}
          </span>
        </div>
        <p class="month-popup__hint">蓝点=有记录 · 点日期直接查看当日明细</p>
      </template>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useTodoStore, type TodoRecord } from '@/stores/todo';
import { dateToStr, mondayOf, todayStr } from '@/utils/date';
import confirm from '@/utils/dialog';
import toast from '@/utils/toast';

defineOptions({ name: 'stats' });

const todo = useTodoStore();
const tab = ref(0);

// 日历范围：最近约半年 ~ 今天
const maxDate = new Date();
const minDate = (() => {
  const d = mondayOf(new Date());
  d.setDate(d.getDate() - 7 * 26);
  return d;
})();

// ===== 月份筛选导航 =====
// 默认当前状态不变：日历渲染范围(min~max)与原行为一致，这里仅叠加月份跳转。
// viewMonth 仅供导航条显示，默认指向「当前月」；日历初始渲染位置保持不变。
const calendarRef = ref<any>(null);
const viewMonth = ref(new Date(maxDate.getFullYear(), maxDate.getMonth(), 1));
const showMonthPicker = ref(false);
const pickerYear = ref(maxDate.getFullYear());
const pickerMinYear = minDate.getFullYear();
const pickerMaxYear = maxDate.getFullYear();

const monthLabel = computed(() => {
  const d = viewMonth.value;
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
});
const minMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1).getTime();
const maxMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1).getTime();
const canPrevMonth = computed(() => viewMonth.value.getTime() > minMonth);
const canNextMonth = computed(() => viewMonth.value.getTime() < maxMonth);

/** 将任意日期钳制到允许月范围内，返回该月 1 号 */
function clampMonth(d: Date): Date {
  const first = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const clamped = first < minMonth ? minMonth : first > maxMonth ? maxMonth : first;
  return new Date(clamped);
}

/** 跳转到指定月份：更新导航显示并滚动日历 */
function gotoMonth(d: Date): void {
  const m = clampMonth(d);
  viewMonth.value = m;
  // Vant Calendar 内联模式同样支持 scrollToDate 平滑滚动到目标月
  calendarRef.value?.scrollToDate?.(new Date(m.getFullYear(), m.getMonth(), 1));
}
function prevMonth(): void {
  if (!canPrevMonth.value) return;
  gotoMonth(new Date(viewMonth.value.getFullYear(), viewMonth.value.getMonth() - 1, 1));
}
function nextMonth(): void {
  if (!canNextMonth.value) return;
  gotoMonth(new Date(viewMonth.value.getFullYear(), viewMonth.value.getMonth() + 1, 1));
}
/** 年份切换（受允许范围约束） */
function stepYear(delta: number): void {
  const y = pickerYear.value + delta;
  if (y < pickerMinYear || y > pickerMaxYear) return;
  pickerYear.value = y;
}

/** 该月是否可选（落在允许月范围内） */
function isMonthSelectable(year: number, month: number): boolean {
  const t = new Date(year, month - 1, 1).getTime();
  return t >= minMonth && t <= maxMonth;
}

/** 是否为「当前月」（高亮提示） */
function isCurrentMonth(year: number, month: number): boolean {
  return year === maxDate.getFullYear() && month - 1 === maxDate.getMonth();
}

// ===== 日期筛选：选月份 → 选当天某日（两步）=====
const pickerStep = ref<'month' | 'day'>('month');
const pickerMonth = ref(maxDate.getMonth() + 1);

/** 打开筛选器，重置到月份步骤并定位到当前年月 */
function openPicker(): void {
  pickerStep.value = 'month';
  pickerYear.value = maxDate.getFullYear();
  pickerMonth.value = maxDate.getMonth() + 1;
  showMonthPicker.value = true;
}

/** 选月份：进入日期步骤 */
function pickMonth(month: number): void {
  pickerMonth.value = month;
  pickerStep.value = 'day';
}

/** 返回月份步骤 */
function backToMonth(): void {
  pickerStep.value = 'month';
}

const pickerMonthFirst = computed(() =>
  new Date(pickerYear.value, pickerMonth.value - 1, 1).getTime()
);
const canPickerPrevMonth = computed(() => pickerMonthFirst.value > minMonth);
const canPickerNextMonth = computed(() => pickerMonthFirst.value < maxMonth);

/** 在日期步骤里左右翻月（受范围约束） */
function stepPickerMonth(delta: number): void {
  if (delta < 0 && !canPickerPrevMonth.value) return;
  if (delta > 0 && !canPickerNextMonth.value) return;
  let y = pickerYear.value;
  let m = pickerMonth.value - 1 + delta;
  while (m < 0) { m += 12; y--; }
  while (m > 11) { m -= 12; y++; }
  pickerYear.value = y;
  pickerMonth.value = m + 1;
}

/** 当前选择月份下的日期网格（含范围与记录标记） */
interface DayCell {
  day: number;
  ds: string;
  disabled: boolean;
  recorded: boolean;
}
const pickerDays = computed<(DayCell | null)[]>(() => {
  const y = pickerYear.value;
  const m = pickerMonth.value - 1;
  const startWeekday = (new Date(y, m, 1).getDay() + 6) % 7; // 周一为起点
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: (DayCell | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(y, m, d);
    const ds = dateToStr(dt);
    cells.push({
      day: d,
      ds,
      disabled: dt < minDate || dt > maxDate,
      recorded: todo.recordedDates.has(ds)
    });
  }
  return cells;
});

/** 选定某天：滚动大日历 + 直接弹出当日明细，锁定视图 */
function pickDay(cell: DayCell): void {
  const dt = new Date(pickerYear.value, pickerMonth.value - 1, cell.day);
  gotoMonth(dt);
  onSelect(dt);
  pickerStep.value = 'month';
  showMonthPicker.value = false;
}

// 选中日期 & 弹窗
const selected = ref<string>(todayStr());
const showDay = ref(false);
// 删除记录后用于强制日历重渲染，刷新打点
const calKey = ref(0);

const selectedLabel = computed(() => (selected.value === todayStr() ? '今天' : selected.value));
const dayRecords = computed<TodoRecord[]>(() => todo.recordsByDate(selected.value));
const dayScore = computed(() => dayRecords.value.reduce((s, r) => s + (r.score ?? 1), 0));

function onSelect(date: Date): void {
  selected.value = dateToStr(date);
  showDay.value = true;
}

async function onDeleteRec(rec: TodoRecord): Promise<void> {
  try {
    await confirm({ title: '删除记录', message: '确定删除这条记录吗？', danger: true });
    todo.removeRecord(rec.id);
    calKey.value += 1;
    toast.success('已删除');
  } catch {
    /* 取消 */
  }
}

// 有记录的日期打点，下方标注当天得分
function formatter(day: any): any {
  const ds = dateToStr(day.date);
  if (todo.recordedDates.has(ds)) {
    day.className = 'cal-has-record';
    const score = todo.recordsByDate(ds).reduce((s, r) => s + (r.score ?? 1), 0);
    day.bottomInfo = `${score}分`;
  }
  return day;
}

function colorOf(id: string): string {
  return todo.items.find((i) => i.id === id)?.color ?? '#1989fa';
}
</script>

<style lang="scss" scoped>
.stats {
  &__cal-card {
    margin: $spacing-md $spacing-lg;
    border-radius: $radius-lg;
    overflow: hidden;
    background: $color-background-light;

    :deep(.cal-has-record) {
      position: relative;
    }
    :deep(.cal-has-record::after) {
      content: '';
      position: absolute;
      bottom: 5px;
      left: 50%;
      transform: translateX(-50%);
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: $color-primary;
    }
  }

  &__monthbar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-lg;
    padding: $spacing-md $spacing-lg 0;
  }
  &__monthbtn {
    font-size: 20px;
    color: $color-primary;
    padding: $spacing-xs;
    cursor: pointer;
    &.is-disabled {
      color: $color-text-disabled;
      pointer-events: none;
    }
  }
  &__monthtext {
    min-width: 120px;
    border: none;
    background: transparent;
    font-size: $font-lg;
    font-weight: 600;
    color: $color-text;
    cursor: pointer;
  }

  &__tip {
    margin: 0 $spacing-lg $spacing-xl;
    font-size: $font-xs;
    color: $color-text-secondary;
    text-align: center;
  }

  &__week {
    padding: $spacing-md 0 $spacing-xl;
  }
  &__weeks {
    margin-top: $spacing-md;
  }
}

.home__section-title {
  display: flex;
  align-items: baseline;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-lg;
  font-size: $font-lg;
  font-weight: 600;
  color: $color-text;
}
.home__hint {
  font-size: $font-xs;
  font-weight: 400;
  color: $color-text-secondary;
}

.rec-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: $spacing-sm;
  align-self: center;
}

// 当日记录弹窗
.day-popup {
  display: flex;
  flex-direction: column;
  max-height: 72%;

  &__head {
    position: relative;
    display: flex;
    align-items: baseline;
    gap: $spacing-sm;
    padding: $spacing-lg $spacing-lg $spacing-md;
    border-bottom: 1px solid $color-border;
  }
  &__title {
    font-size: $font-lg;
    font-weight: 600;
    color: $color-text;
  }
  &__sub {
    font-size: $font-sm;
    color: $color-primary;
    font-weight: 600;
  }
  &__close {
    position: absolute;
    top: $spacing-lg;
    right: $spacing-lg;
    font-size: 20px;
    color: $color-text-secondary;
  }
  &__body {
    overflow-y: auto;
    padding: $spacing-sm 0 $spacing-lg;
    -webkit-overflow-scrolling: touch;
  }
}

// 累计排行
.rank-row {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-sm $spacing-lg;
}
.rank-no {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: $color-border;
  color: $color-text-secondary;
  font-size: $font-xs;
  line-height: 22px;
  text-align: center;
  &--top {
    background: $color-primary;
    color: #fff;
  }
}
.rank-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.rank-name {
  flex: 1;
  font-size: $font-md;
  color: $color-text;
}
.rank-count {
  font-size: $font-md;
  font-weight: 600;
  color: $color-primary;
}

// 每周明细
.week-card {
  margin-top: $spacing-md;
  &__head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: $spacing-sm;
    border-bottom: 1px solid $color-border;
    margin-bottom: $spacing-sm;
  }
  &__range {
    font-size: $font-md;
    font-weight: 600;
    color: $color-text;
  }
  &__total {
    font-size: $font-sm;
    color: $color-primary;
    font-weight: 600;
  }
}
.week-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-xs 0;
  font-size: $font-sm;
  color: $color-text-secondary;
  &__name {
    color: $color-text;
  }
  &__count {
    color: $color-primary;
  }
}

.del-btn {
  height: 100%;
}

// 月份选择弹层
.month-popup {
  display: flex;
  flex-direction: column;

  &__head {
    position: relative;
    display: flex;
    align-items: center;
    padding: $spacing-lg $spacing-lg $spacing-md;
    border-bottom: 1px solid $color-border;
  }
  &__title {
    font-size: $font-lg;
    font-weight: 600;
    color: $color-text;
  }
  &__close {
    position: absolute;
    top: $spacing-lg;
    right: $spacing-lg;
    font-size: 20px;
    color: $color-text-secondary;
  }
  &__yearbar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-lg;
    padding: $spacing-md 0;
  }
  &__year {
    font-size: $font-lg;
    font-weight: 600;
    color: $color-text;
  }
  &__yearbtn {
    font-size: 20px;
    color: $color-primary;
    padding: $spacing-xs;
    cursor: pointer;
  }
  &__grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: $spacing-sm;
    padding: 0 $spacing-lg $spacing-xl;
  }

  &__back {
    position: absolute;
    left: $spacing-lg;
    font-size: 20px;
    color: $color-text-secondary;
    padding: $spacing-xs;
    cursor: pointer;
  }
  &__daybar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-lg;
    padding: $spacing-md 0;
  }
  &__weekrow {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    padding: 0 $spacing-lg;
    font-size: $font-xs;
    color: $color-text-secondary;
    text-align: center;
  }
  &__days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: $spacing-xs;
    padding: 0 $spacing-lg $spacing-md;
  }
  &__hint {
    margin: 0 $spacing-lg $spacing-lg;
    font-size: $font-xs;
    color: $color-text-secondary;
    text-align: center;
  }
}
.month-cell {
  height: 48px;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  background: $color-background-light;
  font-size: $font-md;
  color: $color-text;
  cursor: pointer;
  transition: all 0.18s ease;

  &:active:not(:disabled) {
    transform: scale(0.96);
  }
  &--current {
    border-color: $color-primary;
    color: $color-primary;
    font-weight: 600;
    background: $color-background-light;
  }
  &:disabled {
    color: $color-text-disabled;
    background: $color-background;
    cursor: not-allowed;
  }
}

.day-cell {
  position: relative;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-md;
  font-size: $font-md;
  color: $color-text;
  cursor: pointer;
  transition: transform 0.15s ease;

  &--empty {
    cursor: default;
  }
  &--recorded {
    color: $color-primary;
    font-weight: 600;
  }
  &--recorded::after {
    content: '';
    position: absolute;
    bottom: 4px;
    left: 50%;
    transform: translateX(-50%);
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: $color-primary;
  }
  &--current {
    border: 1px solid $color-primary;
  }
  &.is-disabled {
    color: $color-text-disabled;
    cursor: not-allowed;
  }
  &:active:not(.is-disabled):not(.day-cell--empty) {
    transform: scale(0.94);
  }
}
</style>
