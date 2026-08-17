/**
 * 记录按事项聚合的通用逻辑。
 *
 * 此前 todo.todayStats / todo.cumulative / summary.dateStats 三处各自维护
 * 一份同构的 Map 聚合代码，此处统一为一个函数，排序等差异留给调用点。
 */
import type { TodoItem, TodoRecord } from '@/stores/todo';

export interface ItemStat {
  id: string;
  title: string;
  count: number;
  /** 该事项在统计范围内的得分合计 */
  score: number;
  color: string;
}

/** 默认兜底色（与 PALETTE 首色一致，事项已删除时使用） */
const FALLBACK_COLOR = '#1989fa';

/** 将一组记录按 itemId 聚合为「次数 + 得分」，颜色从事项表回查 */
export function aggregateByItem(records: TodoRecord[], items: TodoItem[]): ItemStat[] {
  const map = new Map<string, ItemStat>();
  for (const r of records) {
    let e = map.get(r.itemId);
    if (!e) {
      const item = items.find((i) => i.id === r.itemId);
      e = { id: r.itemId, title: r.title, count: 0, color: item?.color || FALLBACK_COLOR, score: 0 };
      map.set(r.itemId, e);
    }
    e.count += 1;
    e.score += r.score ?? 1;
  }
  return [...map.values()];
}
