// 日付ユーティリティ (JST 前提)

const JST_OFFSET_HOURS = 9;

/** 月初 (1日 00:00) を返す */
export function firstDayOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** 月末 (23:59:59) を返す */
export function lastDayOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

/** ISO date 文字列 (YYYY-MM-DD) で返す */
export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 「先月」の月初 Date を返す */
export function lastMonth(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth() - 1, 1);
}

/** JST 表示用 */
export function formatJST(iso: string): string {
  const d = new Date(iso);
  const jst = new Date(d.getTime() + JST_OFFSET_HOURS * 60 * 60 * 1000);
  return jst.toISOString().replace("T", " ").slice(0, 16);
}

/** YYYY-MM-DD に日数を加減して YYYY-MM-DD で返す (TZ に依存しない純日付演算) */
export function addDaysISO(dateStr: string, days: number): string {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(dateStr);
  if (!m) return dateStr;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

/** 発注締切のリードタイム: 問屋発注期限の何日前でショップ受付を締めるか */
export const ORDER_CUTOFF_DAYS = 7;

/**
 * ショップ受付の実効締切 = 問屋発注期限(order_deadline)の ORDER_CUTOFF_DAYS 日前。
 * deadline が null なら null (締切なし)。
 */
export function orderCutoffDate(deadline: string | null | undefined): string | null {
  if (!deadline) return null;
  return addDaysISO(deadline, -ORDER_CUTOFF_DAYS);
}

/** 今日(JST)の YYYY-MM-DD */
export function todayISOInJST(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + JST_OFFSET_HOURS * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

/**
 * ショップがまだ発注できるか (実効締切 >= 今日)。deadline=null は常に true。
 */
export function isOrderableByDeadline(deadline: string | null | undefined, todayStr?: string): boolean {
  const cutoff = orderCutoffDate(deadline);
  if (!cutoff) return true;
  return cutoff >= (todayStr ?? todayISOInJST());
}
