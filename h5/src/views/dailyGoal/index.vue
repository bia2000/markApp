<template>
  <div class="goal-page">
    <!-- 顶部：当日进度 -->
    <section class="hero">
      <van-circle
        :rate="progress"
        :current-rate="progress"
        :text="`${todayDone}/${todayTotal}`"
        color="#1989fa"
        layer-color="#ebedf0"
        :stroke-width="8"
        size="96"
      />
      <div class="hero-meta">
        <div class="hero-date">{{ todayLabel }}</div>
        <div class="hero-sub">
          今日目标完成度 <b>{{ progress }}%</b>
          <span v-if="todayTotal === 0" class="muted"> · 还没有目标，加一个吧</span>
          <span v-else-if="todayDone === todayTotal" class="done"> · 全部完成 🎉</span>
        </div>
      </div>
    </section>

    <!-- 添加目标 -->
    <section class="adder">
      <van-field
        v-model="draft"
        placeholder="今天想完成什么？"
        maxlength="40"
        border
        @keyup.enter="onAdd"
      >
        <template #button>
          <van-button size="small" type="primary" :disabled="!draft.trim()" @click="onAdd">
            添加
          </van-button>
        </template>
      </van-field>
    </section>

    <!-- 今日目标列表 -->
    <section class="list">
      <van-empty v-if="todayTotal === 0" description="今日暂无目标" />

      <van-cell-group v-else inset>
        <van-cell
          v-for="g in todayGoals"
          :key="g.id"
          :title="g.title"
          :class="{ 'is-done': g.done }"
          clickable
          @click="goalStore.toggleGoal(g.id)"
        >
          <template #icon>
            <van-icon
              :name="g.done ? 'checked' : 'circle'"
              :color="g.done ? '#1989fa' : '#c8c9cc'"
              class="cell-icon"
            />
          </template>
          <template #right-icon>
            <van-icon name="delete-o" color="#ee0a24" class="cell-del" @click.stop="onDelete(g)" />
          </template>
        </van-cell>
      </van-cell-group>
    </section>

    <!-- 历史目标入口（点击进入独立页面） -->
    <section class="history-entry" @click="goHistory">
      <div class="he-left">
        <van-icon name="clock-o" class="he-icon" />
        <span>历史目标</span>
      </div>
      <div class="he-right">
        <span v-if="historyTotal > 0" class="muted">{{ historyTotal }} 条</span>
        <van-icon name="arrow" class="he-arrow" />
      </div>
    </section>

    <!-- 备忘录：不限时间，逐条记录 -->
    <section class="memo">
      <div class="memo-head">
        <span class="memo-title">📝 备忘录</span>
        <span class="memo-hint">不限时间 · 长期保存</span>
      </div>
      <!-- 添加一条 -->
      <div class="memo-adder">
        <van-field
          v-model="memoDraft"
          placeholder="记一笔，回车或点添加"
          maxlength="200"
          border
          @keyup.enter="onAddMemo"
        >
          <template #button>
            <van-button size="small" type="primary" :disabled="!memoDraft.trim()" @click="onAddMemo">
              添加
            </van-button>
          </template>
        </van-field>
      </div>
      <!-- 逐条列表 -->
      <van-empty v-if="memoSorted.length === 0" description="暂无备忘" />
      <van-cell-group v-else inset>
        <van-cell
          v-for="m in memoSorted"
          :key="m.id"
          :title="m.text"
          :class="{ 'is-done': m.done }"
          clickable
          @click="memoStore.toggleMemo(m.id)"
        >
          <template #icon>
            <van-icon
              :name="m.done ? 'checked' : 'circle'"
              :color="m.done ? '#1989fa' : '#c8c9cc'"
              class="cell-icon"
            />
          </template>
          <template #right-icon>
            <van-icon name="delete-o" color="#ee0a24" class="cell-del" @click.stop="onDeleteMemo(m)" />
          </template>
        </van-cell>
      </van-cell-group>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useGoalStore, type Goal } from '@/stores/goal';
import { useMemoStore, type MemoItem } from '@/stores/memo';
import { todayStr, formatCN } from '@/utils/date';
import { confirmRemove } from '@/utils/dialog';

const router = useRouter();
const goalStore = useGoalStore();
const memoStore = useMemoStore();
// state + getters 用 storeToRefs 解构（保持响应性与模板类型正确），actions 留在实例上
const { todayGoals, todayTotal, todayDone, progress, history } = storeToRefs(goalStore);
const { items: memoItems } = storeToRefs(memoStore);

// 备忘录排序：未完成在前、已完成沉底（各自保持插入顺序，不改存储顺序）
const memoSorted = computed(() => {
  const arr = memoItems.value;
  return [...arr.filter((m) => !m.done), ...arr.filter((m) => m.done)];
});

const draft = ref('');
const memoDraft = ref('');
const todayLabel = computed(() => formatCN(todayStr()));

// 历史目标总数（用于入口的「N 条」角标）
const historyTotal = computed(() => history.value.reduce((sum, g) => sum + g.total, 0));

// 跳转历史目标独立页面（子页面，留在每日计划 WebView 内）
function goHistory(): void {
  router.push('/goal-history');
}

// ===== 备忘录（不限时间，逐条）=====
function onAddMemo(): void {
  const t = memoDraft.value.trim();
  if (!t) return;
  memoStore.addMemo(t);
  memoDraft.value = '';
}

function onDeleteMemo(m: MemoItem): void {
  void confirmRemove({
    title: '删除备忘',
    message: '确定删除这条备忘？',
    action: () => memoStore.removeMemo(m.id)
  });
}

function onAdd(): void {
  const t = draft.value.trim();
  if (!t) return;
  goalStore.addGoal(t);
  draft.value = '';
}

function onDelete(g: Goal): void {
  void confirmRemove({
    title: '删除目标',
    message: '确定删除该目标？',
    action: () => goalStore.removeGoal(g.id)
  });
}

// 切回本 Tab / 挂载时重新读取，保证跨 WebView 数据最新
onMounted(() => {
  goalStore.rehydrate();
  memoStore.rehydrate();
});
onActivated(() => {
  goalStore.rehydrate();
  memoStore.rehydrate();
});
</script>

<style lang="scss" scoped>
.goal-page {
  padding: $spacing-md 0 $spacing-xl;
  min-height: 100%;
  background: #f7f8fa; // Vant 页面底色，无同名令牌

  .hero {
    display: flex;
    align-items: center;
    gap: $spacing-lg;
    padding: 20px $spacing-lg; // 20px 无对应令牌，保持字面量
    background: $color-background-light;
    margin: 0 $spacing-md $spacing-md;
    border-radius: $radius-lg;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.04);
  }
  .hero-meta {
    flex: 1;
    min-width: 0;
  }
  .hero-date {
    font-size: 16px;
    font-weight: 600;
    color: $color-text;
  }
  .hero-sub {
    margin-top: 6px;
    font-size: $font-sm;
    color: $color-text-secondary;
    b {
      color: $color-primary;
    }
    .done {
      color: $color-success;
    }
    .muted {
      color: $color-text-disabled;
    }
  }

  .adder {
    margin: 0 $spacing-md $spacing-md;
  }

  .list {
    margin: 0 $spacing-md $spacing-md;
    :deep(.van-cell-group--inset) {
      margin: 0;
      border-radius: $radius-lg;
      overflow: hidden;
    }
    .cell-icon {
      margin-right: 10px;
      font-size: 18px;
      align-self: center;
    }
    .cell-del {
      font-size: 18px;
      align-self: center;
      padding: 0 4px 0 10px;
    }
    :deep(.van-cell.is-done .van-cell__title) {
      color: $color-text-disabled;
      text-decoration: line-through;
    }
  }

  .history-entry {
    margin: 0 $spacing-md $spacing-md;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: $color-background-light;
    border-radius: $radius-lg;
    padding: $spacing-md $spacing-lg;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.04);
    cursor: pointer;
    .he-left {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
      font-size: $font-md;
      font-weight: 600;
      color: $color-text;
    }
    .he-icon {
      font-size: 18px;
      color: $color-primary;
    }
    .he-right {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
    }
    .he-arrow {
      font-size: 16px;
      color: $color-text-disabled;
    }
    .muted {
      font-size: $font-sm;
      color: $color-text-disabled;
      font-weight: 400;
    }
  }

  .memo {
    margin: 0 $spacing-md;
    background: $color-background-light;
    border-radius: $radius-lg;
    padding: $spacing-md $spacing-lg;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.04);
    .memo-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: $spacing-sm;
    }
    .memo-title {
      font-size: $font-md;
      font-weight: 600;
      color: $color-text;
    }
    .memo-hint {
      font-size: $font-xs;
      color: $color-text-disabled;
    }
    .memo-adder {
      // 添加框与列表留出间距
      margin-bottom: $spacing-sm;
    }
    :deep(.van-cell-group--inset) {
      margin: 0;
      border-radius: $radius-lg;
      overflow: hidden;
    }
    .cell-icon {
      margin-right: 10px;
      font-size: 18px;
      align-self: center;
    }
    .cell-del {
      font-size: 18px;
      align-self: center;
      padding: 0 4px 0 10px;
    }
    // 已完成的备忘：文字置灰 + 删除线，与每日目标视觉一致
    :deep(.van-cell.is-done .van-cell__title) {
      color: $color-text-disabled;
      text-decoration: line-through;
    }
  }
}
</style>
