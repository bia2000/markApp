import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

// summary store 的语音链路依赖 IndexedDB；happy-dom 未实现，mock 掉 idb 层
vi.mock('@/utils/idb', () => ({
  putAudio: vi.fn(async () => undefined),
  deleteAudio: vi.fn(async () => undefined),
  getAudio: vi.fn(async () => undefined)
}));

import { useSummaryStore } from '@/stores/summary';
import { putAudio, deleteAudio } from '@/utils/idb';
import { todayStr } from '@/utils/date';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  setActivePinia(createPinia());
});

describe('summary store：文字复盘', () => {
  it('setNote：空白内容删除条目，非空写入并持久化', () => {
    const s = useSummaryStore();
    s.setNote('2026-08-15', '今天状态不错');
    expect(s.getNote('2026-08-15')).toBe('今天状态不错');
    expect(JSON.parse(localStorage.getItem('notepad:summary')!)).toEqual({ '2026-08-15': '今天状态不错' });

    s.setNote('2026-08-15', '   ');
    expect(s.getNote('2026-08-15')).toBe('');
    expect(JSON.parse(localStorage.getItem('notepad:summary')!)).toEqual({});
  });

  it('getNote：无记录返回空串', () => {
    expect(useSummaryStore().getNote('1999-01-01')).toBe('');
  });

  it('removeNote / hasToday', () => {
    const s = useSummaryStore();
    expect(s.hasToday()).toBe(false);
    s.setNote(todayStr(), '复盘');
    expect(s.hasToday()).toBe(true);
    s.removeNote(todayStr());
    expect(s.hasToday()).toBe(false);
  });
});

describe('summary store：语音复盘（索引与 IDB 分离）', () => {
  it('addAudio：IDB 写全量、索引只存 meta（不含 base64）', async () => {
    const s = useSummaryStore();
    await s.addAudio(todayStr(), { id: 'aud_1', duration: 8, mime: 'audio/mp4', base64: 'QUJD' });

    expect(putAudio).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'aud_1', date: todayStr(), data: 'QUJD' })
    );
    const metas = s.getAudios(todayStr());
    expect(metas).toHaveLength(1);
    expect(metas[0]).toMatchObject({ id: 'aud_1', duration: 8, mime: 'audio/mp4' });
    expect('base64' in metas[0]).toBe(false); // 索引不含 base64，避免撑爆 localStorage
    expect(JSON.parse(localStorage.getItem('notepad:summary:audios')!)[todayStr()]).toHaveLength(1);
  });

  it('removeAudio：同时删 IDB 与索引；删空后清理日期键', async () => {
    const s = useSummaryStore();
    await s.addAudio(todayStr(), { id: 'aud_1', duration: 8, mime: 'audio/mp4', base64: 'QUJD' });
    await s.removeAudio(todayStr(), 'aud_1');

    expect(deleteAudio).toHaveBeenCalledWith('aud_1');
    expect(s.getAudios(todayStr())).toEqual([]);
    expect(JSON.parse(localStorage.getItem('notepad:summary:audios')!)).toEqual({});
  });

  it('hasToday：仅当天有语音也算已总结', async () => {
    const s = useSummaryStore();
    await s.addAudio(todayStr(), { id: 'aud_1', duration: 8, mime: 'audio/mp4', base64: 'QUJD' });
    expect(s.hasToday()).toBe(true);
  });

  it('rehydrate：重读 localStorage 索引', async () => {
    const s = useSummaryStore();
    await s.addAudio(todayStr(), { id: 'aud_1', duration: 8, mime: 'audio/mp4', base64: 'QUJD' });
    s.rehydrate();
    expect(s.getAudios(todayStr())).toHaveLength(1);
  });
});
