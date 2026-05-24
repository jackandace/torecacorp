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
