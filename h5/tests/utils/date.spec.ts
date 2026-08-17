import { describe, it, expect } from 'vitest';
import { dateToStr, addDays, compareDate, mondayOf, formatCN } from '@/utils/date';

describe('date utils', () => {
  it('dateToStr：本地时区 YYYY-MM-DD 补零', () => {
    expect(dateToStr(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(dateToStr(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('addDays：跨月/跨年进位', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29'); // 闰年
  });

  it('compareDate：字符串即字典序比较', () => {
    expect(compareDate('2026-01-01', '2026-01-02')).toBe(-1);
    expect(compareDate('2026-01-02', '2026-01-01')).toBe(1);
    expect(compareDate('2026-01-01', '2026-01-01')).toBe(0);
  });

  it('mondayOf：周日回退到上周一，周一原样', () => {
    expect(dateToStr(mondayOf(new Date(2026, 7, 16)))).toBe('2026-08-10'); // 周日 → 上周一
    expect(dateToStr(mondayOf(new Date(2026, 7, 10)))).toBe('2026-08-10'); // 周一 → 当天
    expect(dateToStr(mondayOf(new Date(2026, 7, 14)))).toBe('2026-08-10'); // 周五 → 本周一
  });

  it('formatCN：中文展示格式', () => {
    expect(formatCN('2026-08-16')).toBe('8月16日 周日');
    expect(formatCN('2026-08-10')).toBe('8月10日 周一');
  });
});
