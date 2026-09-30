// ショップ向けの価格・発売日の表示ヘルパ
//
// products.price は「定価 (メーカー希望小売価格・税抜)」。お客様向けには税込で表示する。
export const CONSUMPTION_TAX_RATE = 0.1;

/** メーカー希望小売価格 (税込)。税抜定価 × 1.1 を四捨五入 (例: 4,800 → 5,280) */
export function retailPriceTaxIncluded(priceExTax: number | null | undefined): number | null {
  if (priceExTax == null || priceExTax <= 0) return null;
  return Math.round(priceExTax * (1 + CONSUMPTION_TAX_RATE));
}

const WEEKDAY = ["日", "月", "火", "水", "木", "金", "土"];

/** "2026-10-24" → "2026年10月24日(金)"。未設定は null */
export function formatReleaseDate(date: string | null | undefined): string | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const wd = WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${y}年${m}月${d}日(${wd})`;
}
