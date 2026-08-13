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

    <!-- 历史 -->
    <section v-if="history.length" class="history">
      <van-collapse v-model="activeHistory">
        <van-collapse-item title="历史目标" name="history">
          <div v-for="grp in history" :key="grp.date" class="hist-day">
            <div class="hist-head">
              <span>{{ grp.label }}</span>
              <span class="muted">{{ grp.done }}/{{ grp.total }} 完成</span>
            </div>
            <div
              v-for="item in grp.items"
              :key="item.id"
              class="hist-item"
              :class="{ 'is-done': item.done }"
            >
              <van-icon :name="item.done ? 'checked' : 'circle'" :color="item.done ? '#1989fa' : '#c8c9cc'" />
              <span>{{ item.title }}</span>
            </div>
          </div>
        </van-collapse-item>
      </van-collapse>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated } from 'vue';
import { storeToRefs } from 'pinia';
import { useGoalStore, type Goal } from '@/stores/goal';
import { todayStr, formatCN } from '@/utils/date';
import { confirm } from '@/utils/dialog';
import toast from '@/utils/toast';

const goalStore = useGoalStore();
// state + getters 用 storeToRefs 解构（保持响应性与模板类型正确），actions 留在实例上
const { todayGoals, todayTotal, todayDone, progress, history } = storeToRefs(goalStore);

const draft = ref('');
const activeHistory = ref<string[]>([]);

const todayLabel = computed(() => formatCN(todayStr()));

function onAdd(): void {
  const t = draft.value.trim();
  if (!t) return;
  goalStore.addGoal(t);
  draft.value = '';
}

async function onDelete(g: Goal): Promise<void> {
  try {
    await confirm({ title: '删除目标', message: '确定删除该目标？', danger: true });
    goalStore.removeGoal(g.id);
    toast.success('已删除');
  } catch {
    /* 取消 */
  }
}

// 切回本 Tab / 挂载时重新读取，保证跨 WebView 数据最新
onMounted(() => goalStore.rehydrate());
onActivated(() => goalStore.rehydrate());
</script>

<style lang="scss">
.goal-page {
  padding: 12px 0 24px;
  min-height: 100%;
  background: #f7f8fa;

  .hero {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px 16px;
    background: #fff;
    margin: 0 12px 12px;
    border-radius: 12px;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.04);
  }
  .hero-meta {
    flex: 1;
    min-width: 0;
  }
  .hero-date {
    font-size: 16px;
    font-weight: 600;
    color: #323233;
  }
  .hero-sub {
    margin-top: 6px;
    font-size: 13px;
    color: #646566;
    b {
      color: #1989fa;
    }
    .done {
      color: #07c160;
    }
    .muted {
      color: #c8c9cc;
    }
  }

  .adder {
    margin: 0 12px 12px;
  }

  .list {
    margin: 0 12px 12px;
    .van-cell-group--inset {
      margin: 0;
      border-radius: 12px;
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
    .van-cell.is-done .van-cell__title {
      color: #c8c9cc;
      text-decoration: line-through;
    }
  }

  .history {
    margin: 0 12px;
    .hist-day {
      padding: 4px 0;
    }
    .hist-head {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      font-weight: 600;
      color: #323233;
      margin-bottom: 4px;
    }
    .hist-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #646566;
      padding: 3px 0;
      &.is-done {
        color: #c8c9cc;
        text-decoration: line-through;
      }
    }
    .muted {
      color: #c8c9cc;
      font-weight: 400;
    }
  }
}
</style>
