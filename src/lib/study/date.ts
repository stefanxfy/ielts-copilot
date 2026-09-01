/**
 * src/lib/study/date.ts — 本地时区日期工具(P7 备考计划共用)
 *
 * 全部以「本地时区」为准(activity_date/journal_date/exam_date 都是用户视角的日子),
 * 不用 UTC ISO 串,避免时区偏移把"今天"算成昨天。
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** Date → 本地 YYYY-MM-DD */
export function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 今天(本地)YYYY-MM-DD */
export function todayStr(now = new Date()): string {
  return toLocalDateStr(now);
}

/** YYYY-MM-DD → 本地当日起点的 Date */
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** 周一为一周之首:返回该日所在周的周一 YYYY-MM-DD */
export function mondayOf(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  const day = d.getDay(); // 0=周日
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return toLocalDateStr(d);
}

/** a − b 的天数(按本地日历日差,不含时分) */
export function daysBetween(aStr: string, bStr: string): number {
  const a = parseLocalDate(aStr).getTime();
  const b = parseLocalDate(bStr).getTime();
  return Math.round((a - b) / 86400_000);
}

/** YYYY-MM-DD + n 天 */
export function addDays(dateStr: string, n: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + n);
  return toLocalDateStr(d);
}

/** "HH:MM" → 分钟数(非法返回 null) */
export function hhmmToMin(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59) return null;
  return h * 60 + min;
}

/** 分钟数 → "HH:MM" */
export function minToHHmm(min: number): string {
  return `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;
}
