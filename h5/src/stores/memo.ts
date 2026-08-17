/**
 * 不限时间的全局备忘录（逐条记录）
 * --------------------------------------------------
 * 与「每日目标」不同：备忘录不绑定日期、不随跨天清空，
 * 作为长期随手记载体常驻于每日计划页底部，全局持久化。
 * 采用与目标一致的「逐条」结构：每条独立增删，互不影响。
 * 注意：本 store 同样不调用 widget 桥（与 goal store 一致），不进入桌面组件。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { storage } from '@/utils/storage';
import { uid } from '@/utils/uid';

export interface MemoItem {
  id: string;
  text: string;
  createdAt: number;
  /** 是否已标记完成（备忘不限时间，仅作勾选状态，不随时间变化） */
  done: boolean;
}

const MEMO_KEY = 'notepad:memo:list';

export const useMemoStore = defineStore('memo', () => {
  const items = ref<MemoItem[]>(storage.getJSON<MemoItem[]>(MEMO_KEY, []));

  function persist(): void {
    storage.setJSON(MEMO_KEY, items.value);
  }

  /** 新增一条备忘（自动去空格、忽略空值，默认未完成） */
  function addMemo(textRaw: string): void {
    const text = textRaw.trim();
    if (!text) return;
    items.value.push({ id: uid(), text, createdAt: Date.now(), done: false });
    persist();
  }

  /** 删除一条备忘（二次确认在视图层处理） */
  function removeMemo(id: string): void {
    items.value = items.value.filter((m) => m.id !== id);
    persist();
  }

  /** 切换某条备忘的完成状态 */
  function toggleMemo(id: string): void {
    const target = items.value.find((m) => m.id === id);
    if (!target) return;
    target.done = !target.done;
    persist();
  }

  /** 跨 WebView 同步：从持久化重新读取，保证切回本 Tab 时看到最新内容 */
  function rehydrate(): void {
    const raw = storage.getJSON<Partial<MemoItem>[]>(MEMO_KEY, []);
    // 兼容旧数据（升级前没有 done 字段）默认未完成
    items.value = raw.map((m) => ({ done: false, ...m })) as MemoItem[];
  }

  return { items, addMemo, removeMemo, toggleMemo, rehydrate };
});
