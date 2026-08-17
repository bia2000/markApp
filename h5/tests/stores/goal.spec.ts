import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useGoalStore, type Goal } from '@/stores/goal';
import { todayStr, addDays } from '@/utils/date';

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
});

function makeGoal(id: string, title: string, date: string, done = false): Goal {
  return { id, title, done, date, createdAt: new Date(`${date}T09:00:00`).getTime() };
}

describe('goal store', () => {
  it('addGoal：空标题不创建，正常创建归属今天且未完成', () => {
    const goal = useGoalStore();
    goal.addGoal('  读书 ');
    goal.addGoal('   ');
    expect(goal.goals).toHaveLength(1);
    expect(goal.goals[0]).toMatchObject({ title: '读书', date: todayStr(), done: false });
    expect(JSON.parse(localStorage.getItem('notepad:goals')!)).toHaveLength(1);
  });

  it('toggleGoal / removeGoal：状态切换与删除', () => {
    const goal = useGoalStore();
    goal.addGoal('跑步');
    const id = goal.goals[0].id;
    goal.toggleGoal(id);
    expect(goal.todayDone).toBe(1);
    goal.toggleGoal(id);
    expect(goal.todayDone).toBe(0);

    goal.removeGoal(id);
    expect(goal.goals).toHaveLength(0);
  });

  it('progress：完成百分比，无目标时为 0', () => {
    const goal = useGoalStore();
    expect(goal.progress).toBe(0);
    goal.addGoal('A');
    goal.addGoal('B');
    goal.toggleGoal(goal.todayGoals[0].id);
    expect(goal.progress).toBe(50); // 1/2
  });

  it('history：历史按日期分组（排除今天）、倒序', () => {
    const store = useGoalStore();
    const yesterday = addDays(todayStr(), -1);
    const twoDaysAgo = addDays(todayStr(), -2);
    store.$patch({
      goals: [
        makeGoal('g1', '昨天A', yesterday, true),
        makeGoal('g2', '昨天B', yesterday),
        makeGoal('g3', '前天A', twoDaysAgo),
        makeGoal('g4', '今天A', todayStr())
      ]
    });
    expect(store.history).toHaveLength(2);
    expect(store.history[0]).toMatchObject({ date: yesterday, total: 2, done: 1 });
    expect(store.history[1]).toMatchObject({ date: twoDaysAgo, total: 1, done: 0 });
  });

  it('rehydrate：外部改写后重读', () => {
    const goal = useGoalStore();
    goal.addGoal('读书');
    localStorage.setItem('notepad:goals', JSON.stringify([makeGoal('x', '外部', todayStr())]));
    goal.rehydrate();
    expect(goal.goals[0].title).toBe('外部');
  });
});
