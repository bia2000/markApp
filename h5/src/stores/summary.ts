/**
 * 每日总结：文字复盘 + 语音复盘数据层
 *
 * 文字：按日期存 localStorage（notepad:summary），复用既有机制、纯本地。
 * 语音：base64 文件大，存 IndexedDB（见 utils/idb.ts）；本 store 只保存
 *       按日期的小索引（notepad:summary:audios → SummaryAudioMeta[]），
 *       meta 不含 base64，播放时按 id 从 IDB 取全量。
 * 历史可翻看，切换日期即读取对应日期的文字与语音索引。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { storage } from '@/utils/storage';
import { todayStr } from '@/utils/date';
import { putAudio, deleteAudio, type StoredAudio } from '@/utils/idb';

const SUMMARY_KEY = 'notepad:summary';
const SUMMARY_AUDIO_INDEX = 'notepad:summary:audios';

/** 语音索引项（不含 base64，播放时按 id 从 IDB 取） */
export interface SummaryAudioMeta {
  id: string;
  duration: number;
  /** 完整 mime，如 audio/webm、audio/mp4 */
  mime: string;
  createdAt: number;
}

export const useSummaryStore = defineStore('summary', () => {
  // { 'YYYY-MM-DD': '复盘文字' }
  const notes = ref<Record<string, string>>(storage.getJSON<Record<string, string>>(SUMMARY_KEY, {}));
  // { 'YYYY-MM-DD': SummaryAudioMeta[] }
  const audioIndex = ref<Record<string, SummaryAudioMeta[]>>(
    storage.getJSON<Record<string, SummaryAudioMeta[]>>(SUMMARY_AUDIO_INDEX, {})
  );

  function persistNotes(): void {
    storage.setJSON(SUMMARY_KEY, notes.value);
  }
  function persistIndex(): void {
    storage.setJSON(SUMMARY_AUDIO_INDEX, audioIndex.value);
  }

  // ===== 文字 =====
  function getNote(date: string): string {
    return notes.value[date] ?? '';
  }
  function setNote(date: string, text: string): void {
    const trimmed = text.trim();
    if (trimmed) {
      notes.value[date] = text;
    } else {
      delete notes.value[date];
    }
    persistNotes();
  }
  function removeNote(date: string): void {
    delete notes.value[date];
    persistNotes();
  }

  // ===== 语音 =====
  function getAudios(date: string): SummaryAudioMeta[] {
    return audioIndex.value[date] ?? [];
  }

  /**
   * 新增一段语音：写 IndexedDB（base64 全量）+ 本 store 索引（meta）。
   * 索引与音频分开存，避免 localStorage 被大 base64 撑爆。
   */
  async function addAudio(
    date: string,
    clip: { id: string; duration: number; mime: string; base64: string }
  ): Promise<void> {
    const meta: SummaryAudioMeta = {
      id: clip.id,
      duration: clip.duration,
      mime: clip.mime,
      createdAt: Date.now()
    };
    const stored: StoredAudio = { ...meta, date, data: clip.base64 };
    await putAudio(stored);
    const list = audioIndex.value[date] ? [...audioIndex.value[date]] : [];
    list.push(meta);
    audioIndex.value[date] = list;
    persistIndex();
  }

  /** 删除一段语音：同时删 IDB 全量与索引 */
  async function removeAudio(date: string, id: string): Promise<void> {
    await deleteAudio(id);
    const list = (audioIndex.value[date] ?? []).filter((m) => m.id !== id);
    if (list.length) audioIndex.value[date] = list;
    else delete audioIndex.value[date];
    persistIndex();
  }

  function rehydrate(): void {
    notes.value = storage.getJSON<Record<string, string>>(SUMMARY_KEY, {});
    audioIndex.value = storage.getJSON<Record<string, SummaryAudioMeta[]>>(SUMMARY_AUDIO_INDEX, {});
  }

  const hasToday = (): boolean =>
    !!notes.value[todayStr()] || (audioIndex.value[todayStr()]?.length ?? 0) > 0;

  return {
    notes,
    audioIndex,
    getNote,
    setNote,
    removeNote,
    getAudios,
    addAudio,
    removeAudio,
    rehydrate,
    hasToday
  };
});
