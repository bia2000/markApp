/**
 * Vant Calendar「有记录日期打点 + 得分标注」formatter 工厂。
 *
 * stats 与 summary 两个页面此前各自维护一份同构的 formatter(day: any)，
 * 此处统一实现并给出结构化类型，消除重复与 any。
 */
import type { CalendarDayItem } from 'vant';
import { dateToStr } from '@/utils/date';

export interface CalendarMarkOptions {
  /** 该日期（YYYY-MM-DD）是否有记录 */
  hasRecord(dateStr: string): boolean;
  /** 该日期的得分（展示在日期下方 bottomInfo） */
  scoreOf(dateStr: string): number;
  /** 有记录日期附加的 className（如 stats 页的 'cal-has-record' 蓝点样式钩子） */
  recordClassName?: string;
}

/** 生成 van-calendar 的 formatter：有记录的日期标注「N分」，可选附加打点 className */
export function makeCalendarFormatter(opts: CalendarMarkOptions) {
  return function formatter(day: CalendarDayItem): CalendarDayItem {
    if (!day.date) return day; // 月份占位等无具体日期的单元格
    const ds = dateToStr(day.date);
    if (opts.hasRecord(ds)) {
      if (opts.recordClassName) day.className = opts.recordClassName;
      day.bottomInfo = `${opts.scoreOf(ds)}分`;
    }
    return day;
  };
}
