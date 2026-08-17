import { describe, it, expect } from 'vitest';
import { uid } from '@/utils/uid';

describe('uid', () => {
  it('无前缀：返回非空字符串', () => {
    const id = uid();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('带前缀：`prefix_core` 形式', () => {
    const id = uid('aud');
    expect(id.startsWith('aud_')).toBe(true);
    expect(id.length).toBeGreaterThan('aud_'.length);
  });

  it('同毫秒内多次调用不重复', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => uid()));
    expect(ids.size).toBe(1000);
  });
});
