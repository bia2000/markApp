import { describe, it, expect } from 'vitest';
import { aggregateByItem } from '@/utils/dayStats';
import type { TodoItem, TodoRecord } from '@/stores/todo';

const items: TodoItem[] = [
  { id: 'a', title: '喝水', color: '#1989fa', score: 1, createdAt: 1 },
  { id: 'b', title: '背单词', color: '#07c160', score: 2, createdAt: 2 }
];

function rec(itemId: string, score: number): TodoRecord {
  return { id: `${itemId}-${score}-${Math.random()}`, itemId, title: '快照', date: '2026-08-15', time: '10:00:00', score, createdAt: Date.now() };
}

describe('aggregateByItem', () => {
  it('按事项聚合次数与得分', () => {
    const stats = aggregateByItem([rec('a', 1), rec('a', 1), rec('b', 2)], items);
    const a = stats.find((s) => s.id === 'a')!;
    const b = stats.find((s) => s.id === 'b')!;
    expect(a.count).toBe(2);
    expect(a.score).toBe(2);
    expect(b.count).toBe(1);
    expect(b.score).toBe(2);
  });

  it('颜色从事项表回查，事项已删除时用兜底色', () => {
    const stats = aggregateByItem([rec('ghost', 1)], items);
    expect(stats[0].color).toBe('#1989fa');
    expect(aggregateByItem([rec('a', 1)], items)[0].color).toBe('#1989fa');
    expect(aggregateByItem([rec('b', 1)], items)[0].color).toBe('#07c160');
  });

  it('score 缺失按 1 分计', () => {
    const r = rec('a', 1);
    delete (r as Partial<TodoRecord>).score;
    const stats = aggregateByItem([r], items);
    expect(stats[0].score).toBe(1);
  });

  it('空记录返回空数组', () => {
    expect(aggregateByItem([], items)).toEqual([]);
  });
});
