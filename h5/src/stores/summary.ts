/**
 * 每日总结：文字复盘数据层
 *
 * 结构：{ "YYYY-MM-DD": "复盘文字" }，每天一条，按日期键。
 * 复用既有 storage 工具，与 todo store 同套持久化机制，纯本地、无服务端。
 * 历史可翻看——切换日期即读取对应 key 的文本。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { storage } from '@/utils/storage';
import { todayStr } from '@/utils/date';

const SUMMARY_KEY = 'notepad:summary';

export const useSummaryStore = defineStore('summary', () => {
  // { 'YYYY-MM-DD': '复盘文字' }
  const notes = ref<Record<string, string>>(storage.getJSON<Record<string, string>>(SUMMARY_KEY, {}));

  function persist(): void {
    storage.setJSON(SUMMARY_KEY, notes.value);
  }

  /** 读取某日的复盘文字（无则返回空串） */
  function getNote(date: string): string {
    return notes.value[date] ?? '';
  }

  /**
   * 写入/清空某日复盘。
   * 保留用户输入的原始文本；trim 后为空视为清空该日记录（不存空串）。
   */
  function setNote(date: string, text: string): void {
    const trimmed = text.trim();
    if (trimmed) {
      notes.value[date] = text;
    } else {
      delete notes.value[date];
    }
    persist();
  }

  /** 删除某日复盘 */
  function removeNote(date: string): void {
    delete notes.value[date];
    persist();
  }

  /** 重新从持久化读取（跨 WebView 同步：原生切到本 Tab 时调用） */
  function rehydrate(): void {
    notes.value = storage.getJSON<Record<string, string>>(SUMMARY_KEY, {});
  }

  /** 今日是否有复盘 */
  const hasToday = (): boolean => !!notes.value[todayStr()];

  return {
    notes,
    getNote,
    setNote,
    removeNote,
    rehydrate,
    hasToday
  };
});
