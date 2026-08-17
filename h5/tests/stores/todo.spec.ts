import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useTodoStore, type TodoRecord } from '@/stores/todo';
import { todayStr, addDays, dateToStr } from '@/utils/date';

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
});

function makeRec(id: string, itemId: string, date: string, score = 1): TodoRecord {
  return { id, itemId, title: '喝水', date, time: '10:00:00', score, createdAt: new Date(`${date}T10:00:00`).getTime() };
}

function importRecords(records: TodoRecord[]): void {
  const todo = useTodoStore();
  todo.importData({
    version: 1,
    exportedAt: '',
    items: [{ id: 'a', title: '喝水', color: '#1989fa', score: 1, createdAt: 1 }],
    records
  });
}

describe('todo store：增删与持久化', () => {
  it('addItem：创建事项并持久化，空标题（含纯空白）不创建', () => {
    const todo = useTodoStore();
    todo.addItem('  喝水 ');
    expect(todo.items).toHaveLength(1);
    expect(todo.items[0].title).toBe('喝水');
    expect(JSON.parse(localStorage.getItem('notepad:items')!)).toHaveLength(1);

    todo.addItem('   ');
    expect(todo.items).toHaveLength(1);
  });

  it('tapItem：记录带分值快照并持久化；todayStats 聚合正确', () => {
    const todo = useTodoStore();
    todo.addItem('背单词');
    todo.items[0].score = 3;
    todo.tapItem(todo.items[0].id);
    todo.tapItem(todo.items[0].id);

    expect(todo.todayRecords).toHaveLength(2);
    expect(todo.todayScore).toBe(6);
    expect(todo.todayStats[0]).toMatchObject({ count: 2, score: 6 });
    expect(JSON.parse(localStorage.getItem('notepad:records')!)).toHaveLength(2);
  });

  it('removeItem：级联删除该事项全部记录', () => {
    const todo = useTodoStore();
    todo.addItem('喝水');
    const id = todo.items[0].id;
    todo.tapItem(id);
    todo.tapItem(id);
    expect(todo.records).toHaveLength(2);

    todo.removeItem(id);
    expect(todo.items).toHaveLength(0);
    expect(todo.records).toHaveLength(0);
  });

  it('removeRecord：只删目标一条', () => {
    const todo = useTodoStore();
    todo.addItem('喝水');
    const id = todo.items[0].id;
    todo.tapItem(id);
    todo.tapItem(id);
    todo.removeRecord(todo.records[0].id);
    expect(todo.records).toHaveLength(1);
  });

  it('updateItem：改标题与分数，非法分数不生效', () => {
    const todo = useTodoStore();
    todo.addItem('喝水');
    const id = todo.items[0].id;
    todo.updateItem(id, { title: '多喝水', score: 5 });
    expect(todo.items[0]).toMatchObject({ title: '多喝水', score: 5 });

    todo.updateItem(id, { score: Number.NaN });
    expect(todo.items[0].score).toBe(5);
    todo.updateItem(id, { score: -3 });
    expect(todo.items[0].score).toBe(1); // 下限 1
  });

  it('rehydrate：外部改写 localStorage 后重读可见（跨 WebView 同步语义）', () => {
    const todo = useTodoStore();
    todo.addItem('喝水');
    localStorage.setItem(
      'notepad:items',
      JSON.stringify([{ id: 'x', title: '外部', color: '#07c160', score: 1, createdAt: 1 }])
    );
    todo.rehydrate();
    expect(todo.items[0].title).toBe('外部');
  });

  it('mergeRecords：按 id 去重合并桌面组件写入的记录', () => {
    const todo = useTodoStore();
    const rec = makeRec('w1', 'a', todayStr());
    todo.mergeRecords([rec]);
    todo.mergeRecords([rec]); // 重复投递
    expect(todo.records).toHaveLength(1);
  });
});

describe('todo store：importData 校验', () => {
  it('结构不合法抛错且不污染现有数据', () => {
    const todo = useTodoStore();
    todo.addItem('喝水');
    expect(() => todo.importData({ items: '不是数组' })).toThrow();
    expect(todo.items).toHaveLength(1);
  });

  it('合法备份覆盖式恢复', () => {
    const todo = useTodoStore();
    const res = todo.importData({
      version: 1,
      exportedAt: '2026-08-15T00:00:00.000Z',
      items: [{ id: 'i1', title: '跑步', color: '#ee0a24', score: 2, createdAt: 1 }],
      records: [makeRec('r1', 'i1', '2026-08-14')]
    });
    expect(res).toEqual({ items: 1, records: 1 });
    expect(todo.items[0].title).toBe('跑步');
  });
});

describe('todo store：派生统计', () => {
  it('weekly：按周一归组、最近周在前', () => {
    // 2026-08-10 周一 与 2026-08-12 周三 同周；2026-08-17 下周一
    importRecords([makeRec('r1', 'a', '2026-08-10'), makeRec('r2', 'a', '2026-08-12'), makeRec('r3', 'a', '2026-08-17')]);
    const todo = useTodoStore();
    expect(todo.weekly).toHaveLength(2);
    expect(todo.weekly[0].key).toBe('2026-08-17');
    expect(todo.weekly[1]).toMatchObject({ key: '2026-08-10', total: 2, score: 2 });
  });

  it('cumulative：按得分降序，字段 id/title/count/score/color', () => {
    const todo = useTodoStore();
    todo.importData({
      version: 1,
      exportedAt: '',
      items: [
        { id: 'a', title: '低分', color: '#111111', score: 1, createdAt: 1 },
        { id: 'b', title: '高分', color: '#222222', score: 5, createdAt: 2 }
      ],
      records: [
        makeRec('ra', 'a', todayStr(), 1),
        makeRec('rb', 'b', todayStr(), 5)
      ]
    });
    expect(todo.cumulative[0]).toMatchObject({ id: 'b', count: 1, score: 5 });
    expect(todo.cumulative[1]).toMatchObject({ id: 'a', count: 1, score: 1 });
  });

  it('streak：今天有记录从今天起算；今天没有则从昨天起算（不急于断签）', () => {
    importRecords([makeRec('r1', 'a', addDays(todayStr(), -2)), makeRec('r2', 'a', addDays(todayStr(), -1))]);
    expect(useTodoStore().streak).toBe(2); // 昨天起算

    importRecords([makeRec('r3', 'a', addDays(todayStr(), -1)), makeRec('r4', 'a', todayStr())]);
    expect(useTodoStore().streak).toBe(2); // 今天起算
  });

  it('streak：中间断档只累计最近连续段', () => {
    importRecords([
      makeRec('r1', 'a', todayStr()),
      makeRec('r2', 'a', addDays(todayStr(), -1)),
      makeRec('r3', 'a', addDays(todayStr(), -4)),
      makeRec('r4', 'a', addDays(todayStr(), -8))
    ]);
    expect(useTodoStore().streak).toBe(2);
  });

  it('recordedDates：有记录的日期集合（去重）', () => {
    importRecords([
      makeRec('r1', 'a', dateToStr(new Date(2026, 7, 10))),
      makeRec('r2', 'a', dateToStr(new Date(2026, 7, 10))),
      makeRec('r3', 'a', dateToStr(new Date(2026, 7, 11)))
    ]);
    const todo = useTodoStore();
    expect(todo.recordedDates.size).toBe(2);
  });
});

describe('todo store：widget 桥同步', () => {
  it('tapItem/removeRecord 触发桥调用但不影响本地流程（浏览器 mock 环境不抛错）', () => {
    const todo = useTodoStore();
    todo.addItem('喝水');
    const id = todo.items[0].id;
    expect(() => todo.tapItem(id)).not.toThrow();
    expect(() => todo.removeRecord(todo.records[0].id)).not.toThrow();
    expect(todo.records).toHaveLength(0);
  });
});
