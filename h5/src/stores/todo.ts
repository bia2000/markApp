/**
 * 记事本核心状态：事项（可点击的「待办项」）与记录（每次点击产生一条）
 *
 * 数据模型：
 * - TodoItem：用户创建的事项，首页点击它即记一次
 * - TodoRecord：每次点击生成的记录，含日期 + 时间，可重复、可删除
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { storage } from '@/utils/storage';
import { call } from '@/bridge';
import { todayStr, dateToStr, timeStr, mondayOf, formatMD } from '@/utils/date';
import { uid } from '@/utils/uid';
import { aggregateByItem } from '@/utils/dayStats';

export interface TodoItem {
  id: string;
  title: string;
  color: string;
  /** 每次记录所得分数（默认 1） */
  score: number;
  createdAt: number;
}

export interface TodoRecord {
  id: string;
  itemId: string;
  title: string; // 记录时的事项名称快照（事项删除后仍可展示历史）
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  /** 记录时该事项的分值快照（事项改分不影响历史统计） */
  score: number;
  createdAt: number;
}

/** 备份文件结构（导出/导入共用） */
export interface BackupData {
  version: number;
  exportedAt: string; // ISO 时间
  items: TodoItem[];
  records: TodoRecord[];
}

const ITEMS_KEY = 'notepad:items';
const RECORDS_KEY = 'notepad:records';

const PALETTE = ['#1989fa', '#07c160', '#ff976a', '#7232dd', '#ee0a24', '#00b8d9', '#ff8f1f'];

export const useTodoStore = defineStore('todo', () => {
  const items = ref<TodoItem[]>(storage.getJSON<TodoItem[]>(ITEMS_KEY, []));
  const records = ref<TodoRecord[]>(storage.getJSON<TodoRecord[]>(RECORDS_KEY, []));

  function persistItems(): void {
    storage.setJSON(ITEMS_KEY, items.value);
  }
  function persistRecords(): void {
    storage.setJSON(RECORDS_KEY, records.value);
  }

  /** 新建事项（分数默认 1 分） */
  function addItem(titleRaw: string): void {
    const title = titleRaw.trim();
    if (!title) return;
    const color = PALETTE[items.value.length % PALETTE.length];
    items.value.push({ id: uid(), title, color, score: 1, createdAt: Date.now() });
    persistItems();
  }

  /** 删除事项（同时清理其全部记录，保持数据整洁） */
  function removeItem(id: string): void {
    items.value = items.value.filter((i) => i.id !== id);
    persistItems();
    records.value = records.value.filter((r) => r.itemId !== id);
    persistRecords();
    // 同步清除原生桌面组件共享账本里的同名记录：否则已删事项的旧分数，
    // 会在桌面点别的事项「重算今日得分」时被算进去（今日得分虚高）。
    // 失败（无原生 / 桥未就绪）静默忽略。
    void call('widget.removeRecords', { itemId: id }).catch(() => {});
  }

  /** 编辑事项：修改标题与/或分数（分数 ≥1 的整数） */
  function updateItem(id: string, patch: Partial<Pick<TodoItem, 'title' | 'score'>>): void {
    const item = items.value.find((i) => i.id === id);
    if (!item) return;
    if (typeof patch.title === 'string') {
      const t = patch.title.trim();
      if (t) item.title = t;
    }
    if (typeof patch.score === 'number' && Number.isFinite(patch.score)) {
      item.score = Math.max(1, Math.floor(patch.score));
    }
    persistItems();
  }

  /** 点击事项：记一次（可重复），记录带分值快照 */
  function tapItem(id: string): void {
    const item = items.value.find((i) => i.id === id);
    if (!item) return;
    const now = new Date();
    const rec: TodoRecord = {
      id: uid(),
      itemId: id,
      title: item.title,
      date: dateToStr(now),
      time: timeStr(now),
      score: item.score ?? 1,
      createdAt: now.getTime()
    };
    records.value.push(rec);
    persistRecords();
    // 同步进原生组件账本（统一账本）：H5 内点击的记录也写入原生 widget:records，
    // 使 WidgetRecordReceiver 重算今日得分/次数时包含 H5 内记录，不再被覆盖丢失。
    // 失败（无原生 / 桥未就绪）静默忽略。
    void call('widget.addRecord', { record: rec }).catch(() => {});
  }

  /** 删除单条记录 */
  function removeRecord(id: string): void {
    records.value = records.value.filter((r) => r.id !== id);
    persistRecords();
    // 同步清除原生桌面组件共享账本里的该条记录：否则删除后桌面点别的事项，
    // 重算今日得分时会把这条「已删记录」算进去（等于删除无效、得分回到删除前）。
    void call('widget.removeRecord', { id }).catch(() => {});
  }

  /**
   * 合并桌面组件（原生）写入的共享记录，按 id 去重。
   * 桌面组件点击不打开 App，记录先落在原生共享存储，App 打开/回到前台时
   * 通过此方法与本地 store 对齐，保证统计一致。
   */
  function mergeRecords(incoming: TodoRecord[]): void {
    const ids = new Set(records.value.map((r) => r.id));
    let changed = false;
    for (const r of incoming) {
      if (!ids.has(r.id)) {
        records.value.push(r);
        ids.add(r.id);
        changed = true;
      }
    }
    if (changed) persistRecords();
  }

  /** 重新从持久化读取（跨 WebView 同步：原生切到本 Tab 时调用，保证看到最新数据） */
  function rehydrate(): void {
    items.value = storage.getJSON<TodoItem[]>(ITEMS_KEY, []);
    records.value = storage.getJSON<TodoRecord[]>(RECORDS_KEY, []);
  }

  /** 导出当前全部数据为备份对象 */
  function exportData(): BackupData {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      items: items.value,
      records: records.value
    };
  }

  /**
   * 从备份对象恢复数据（覆盖式）。
   * 仅做基础结构校验，防止坏数据直接污染内存/持久层。
   */
  function importData(raw: unknown): { items: number; records: number } {
    const data = raw as Partial<BackupData> | null;
    if (!data || !Array.isArray(data.items) || !Array.isArray(data.records)) {
      throw new Error('备份格式不正确');
    }
    items.value = data.items as TodoItem[];
    records.value = data.records as TodoRecord[];
    persistItems();
    persistRecords();
    return { items: items.value.length, records: records.value.length };
  }

  // ===== 派生数据 =====

  /** 今日记录（时间倒序） */
  const todayRecords = computed(() =>
    records.value
      .filter((r) => r.date === todayStr())
      .sort((a, b) => b.createdAt - a.createdAt)
  );

  /** 今日各事项完成次数与得分 */
  const todayStats = computed(() => aggregateByItem(todayRecords.value, items.value));

  /** 今日得分（今日所有记录分值之和） */
  const todayScore = computed(() =>
    todayRecords.value.reduce((s, r) => s + (r.score ?? 1), 0)
  );

  /** 指定日期的记录（时间倒序） */
  function recordsByDate(date: string): TodoRecord[] {
    return records.value
      .filter((r) => r.date === date)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /** 有记录的日期集合（用于日历打点） */
  const recordedDates = computed(() => {
    const set = new Set<string>();
    for (const r of records.value) set.add(r.date);
    return set;
  });

  /** 连续打卡天数：今天没打不急于断签，从昨天起算 */
  const streak = computed(() => {
    let count = 0;
    const d = new Date();
    if (!recordedDates.value.has(dateToStr(d))) d.setDate(d.getDate() - 1);
    while (recordedDates.value.has(dateToStr(d))) {
      count += 1;
      d.setDate(d.getDate() - 1);
    }
    return count;
  });

  /** 周统计：按周一归组，最近周在前 */
  interface WeekItem {
    itemId: string;
    title: string;
    count: number;
    score: number;
  }
  interface WeekGroup {
    key: string;
    range: string;
    total: number;
    score: number;
    items: WeekItem[];
  }
  const weekly = computed<WeekGroup[]>(() => {
    const byWeek = new Map<string, WeekGroup>();
    for (const r of records.value) {
      const mon = mondayOf(new Date(`${r.date}T00:00:00`));
      const key = dateToStr(mon);
      let g = byWeek.get(key);
      if (!g) {
        const sun = new Date(mon);
        sun.setDate(sun.getDate() + 6);
        g = { key, range: `${formatMD(mon)}-${formatMD(sun)}`, total: 0, score: 0, items: [] };
        byWeek.set(key, g);
      }
      let it = g.items.find((x) => x.itemId === r.itemId);
      if (!it) {
        it = { itemId: r.itemId, title: r.title, count: 0, score: 0 };
        g.items.push(it);
      }
      it.count += 1;
      it.score += r.score ?? 1;
      g.total += 1;
      g.score += r.score ?? 1;
    }
    return [...byWeek.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
  });

  /** 累计排行：按事项统计全部记录数与得分（得分降序） */
  const cumulative = computed(() =>
    aggregateByItem(records.value, items.value).sort((a, b) => b.score - a.score)
  );

  return {
    items,
    records,
    addItem,
    removeItem,
    updateItem,
    tapItem,
    removeRecord,
    mergeRecords,
    todayRecords,
    todayStats,
    todayScore,
    recordsByDate,
    recordedDates,
    streak,
    weekly,
    cumulative,
    rehydrate,
    exportData,
    importData,
    persistItems,
    persistRecords
  };
});
