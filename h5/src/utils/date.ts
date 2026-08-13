/**
 * 日期工具：本地时区，格式 YYYY-MM-DD / HH:mm:ss
 */
export function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Date -> YYYY-MM-DD（本地时区） */
export function dateToStr(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayStr(): string {
  return dateToStr(new Date());
}

/** Date -> HH:mm:ss */
export function timeStr(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

/** Date -> MM.DD */
export function formatMD(d: Date): string {
  return `${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`;
}

/** 取某日期所在周的周一（ISO 周，周一为起点） */
export function mondayOf(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0=周日 .. 6=周六
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

/** 日期串 YYYY-MM-DD ± n 天，返回新日期串（本地时区） */
export function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return dateToStr(d);
}

/** 比较两日期串：-1 a 较早，0 同一天，1 a 较晚 */
export function compareDate(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/** YYYY-MM-DD -> MM月DD日 周X（中文展示） */
export function formatCN(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return `${d.getMonth() + 1}月${d.getDate()}日 周${WEEKDAYS[d.getDay()]}`;
}

/** 某日期是周几（中文单字） */
export function weekdayCN(dateStr: string): string {
  return WEEKDAYS[new Date(`${dateStr}T00:00:00`).getDay()];
}
