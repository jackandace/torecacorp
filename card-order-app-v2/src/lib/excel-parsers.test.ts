/**
 * 商品 Excel 取込パーサのユニットテスト
 *
 * 実装は src/app/api/products/import/route.ts に内包されているため、
 * ここで同じロジックを再実装して回帰検出する (将来 lib/ 化したらインポートに変更)
 */
import { describe, expect, it } from "vitest";

function parseRate(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return value > 1 ? value / 100 : value;
  if (typeof value === "string") {
    const t = value.trim();
    if (t.endsWith("%")) return parseFloat(t.slice(0, -1)) / 100;
    const n = parseFloat(t);
    return Number.isFinite(n) ? (n > 1 ? n / 100 : n) : null;
  }
  return null;
}
function parsePrice(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Math.floor(value);
  if (typeof value !== "string") return null;
  const head = value.split(/[（(]/)[0]?.trim() ?? "";
  const cleaned = head.replace(/[.,\s円¥]/g, "");
  if (!/^\d+$/.test(cleaned)) return null;
  return parseInt(cleaned, 10);
}
function parseDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    const d = new Date((value - 25569) * 86400 * 1000);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const s = String(value).replace(/[年月]/g, "/").replace(/日/g, "").trim();
  if (!s || s === "再販" || s === "未定") return null;
  const m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (m) {
    const [, y, mo, da] = m;
    return `${y}-${mo!.padStart(2, "0")}-${da!.padStart(2, "0")}`;
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const yy = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mo}-${da}`;
}

describe("parseRate", () => {
  it("0.76 はそのまま", () => expect(parseRate(0.76)).toBeCloseTo(0.76));
  it("76 (数値) は /100", () => expect(parseRate(76)).toBeCloseTo(0.76));
  it('"79%" は 0.79', () => expect(parseRate("79%")).toBeCloseTo(0.79));
  it('"0.74" は 0.74', () => expect(parseRate("0.74")).toBeCloseTo(0.74));
  it("null は null", () => expect(parseRate(null)).toBeNull());
  it("空文字は null", () => expect(parseRate("")).toBeNull());
});

describe("parsePrice", () => {
  it('"6.000(税込み6.600）" → 6000', () => expect(parsePrice("6.000(税込み6.600）")).toBe(6000));
  it('"5,460(税込6,006)" → 5460', () => expect(parsePrice("5,460(税込6,006)")).toBe(5460));
  it('"21.000(税込み23.100）" → 21000', () => expect(parsePrice("21.000(税込み23.100）")).toBe(21000));
  it('"6600" → 6600', () => expect(parsePrice("6600")).toBe(6600));
  it('"¥5,500" → 5500', () => expect(parsePrice("¥5,500")).toBe(5500));
  it("6000 (数値) → 6000", () => expect(parsePrice(6000)).toBe(6000));
  it("null は null", () => expect(parsePrice(null)).toBeNull());
  it("空文字は null", () => expect(parsePrice("")).toBeNull());
});

describe("parseDate", () => {
  it("Excel シリアル値 46183 → 2026-06-10", () => {
    expect(parseDate(46183)).toBe("2026-06-10");
  });
  it('"2026/06/10" → 2026-06-10 (TZ ずれなし)', () => {
    expect(parseDate("2026/06/10")).toBe("2026-06-10");
  });
  it('"2026/6/10" → 2026-06-10 (ゼロ埋め)', () => {
    expect(parseDate("2026/6/10")).toBe("2026-06-10");
  });
  it('"2026年6月10日" → 2026-06-10', () => {
    expect(parseDate("2026年6月10日")).toBe("2026-06-10");
  });
  it('"再販" は null', () => expect(parseDate("再販")).toBeNull());
  it('"未定" は null', () => expect(parseDate("未定")).toBeNull());
  it("null は null", () => expect(parseDate(null)).toBeNull());
});
