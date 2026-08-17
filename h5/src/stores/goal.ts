/**
 * 每日目标状态：当天可添加若干目标、勾选完成、查看当日进度；
 * 跨天自动以新日期创建清单（历史按日期保留可回看）。
 *
 * 注意：本 store 不调用 widget 桥（widget.addRecord），目标数据不会进入原生桌面组件，
 * 满足「不展示在桌面组件上」的产品要求。
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { storage } from '@/utils/storage';
import { todayStr, formatCN } from '@/utils/date';
import { uid } from '@/utils/uid';

export interface Goal {
  id: string;
  title: string;
  done: boolean;
  date: string; // YYYY-MM-DD
  createdAt: number;
}

const GOALS_KEY = 'notepad:goals';

export const useGoalStore = defineStore('goal', () => {
  const goals = ref<Goal[]>(storage.getJSON<Goal[]>(GOALS_KEY, []));

  function persist(): void {
    storage.setJSON(GOALS_KEY, goals.value);
  }

  /** 新建目标（归属今天，默认未完成） */
  function addGoal(titleRaw: string): void {
    const title = titleRaw.trim();
    if (!title) return;
    goals.value.push({ id: uid(), title, done: false, date: todayStr(), createdAt: Date.now() });
    persist();
  }

  /** 切换完成状态 */
  function toggleGoal(id: string): void {
    const g = goals.value.find((x) => x.id === id);
    if (!g) return;
    g.done = !g.done;
    persist();
  }

  /** 删除目标（二次确认在视图层处理） */
  function removeGoal(id: string): void {
    goals.value = goals.value.filter((g) => g.id !== id);
    persist();
  }

  /** 重新从持久化读取（跨 WebView 同步：原生切到本 Tab 时调用） */
  function rehydrate(): void {
    goals.value = storage.getJSON<Goal[]>(GOALS_KEY, []);
  }

  // ===== 派生数据 =====

  /** 今日目标（按创建时间倒序） */
  const todayGoals = computed(() =>
    goals.value
      .filter((g) => g.date === todayStr())
      .sort((a, b) => b.createdAt - a.createdAt)
  );

  const todayTotal = computed(() => todayGoals.value.length);
  const todayDone = computed(() => todayGoals.value.filter((g) => g.done).length);

  /** 当日完成百分比（0~100） */
  const progress = computed(() =>
    todayTotal.value === 0 ? 0 : Math.round((todayDone.value / todayTotal.value) * 100)
  );

  /** 历史：按日期分组（排除今天），倒序展示，可回看过往清单 */
  interface DayGroup {
    date: string;
    label: string;
    total: number;
    done: number;
    items: Goal[];
  }
  const history = computed<DayGroup[]>(() => {
    const map = new Map<string, DayGroup>();
    for (const g of goals.value) {
      if (g.date === todayStr()) continue;
      let grp = map.get(g.date);
      if (!grp) {
        grp = { date: g.date, label: formatCN(g.date), total: 0, done: 0, items: [] };
        map.set(g.date, grp);
      }
      grp.items.push(g);
      grp.total += 1;
      if (g.done) grp.done += 1;
    }
    return [...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
  });

  return {
    goals,
    addGoal,
    toggleGoal,
    removeGoal,
    rehydrate,
    todayGoals,
    todayTotal,
    todayDone,
    progress,
    history
  };
});
