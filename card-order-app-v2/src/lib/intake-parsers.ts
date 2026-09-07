// 問屋の入荷登録 (Excel/フォーム) 用の値パーサ
// products/import (入荷案内リスト取込) のパーサと同系だが、問屋向けの
// シンプルな列構成専用として独立させる。

/** "204box" のような数字+単位混在文字列から整数を抽出 */
export function parseIntakeInteger(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Math.floor(value);
  const m = String(value).match(/(\d+)/);
  return m ? parseInt(m[1]!, 10) : null;
}

/** 価格: "6.000(税込み6.600)" / "5,460" / 6000 → 税抜整数 */
export function parseIntakePrice(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Math.floor(value);
  if (typeof value !== "string") return null;
  const head = value.split(/[（(]/)[0]?.trim() ?? "";
  const cleaned = head.replace(/[.,\s円¥]/g, "");
  if (!/^\d+$/.test(cleaned)) return null;
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : null;
}

/** 日付: Excelシリアル値 / "2026/10/01" / "2026年10月1日" → "YYYY-MM-DD" */
export function parseIntakeDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    const utc = (value - 25569) * 86400 * 1000;
    const d = new Date(utc);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
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

/** 商品タイトルからカテゴリを推定 */
export function inferIntakeCategory(title: string): "pokemon" | "onepiece" | "other" {
  const t = title.toLowerCase();
  if (t.includes("ポケモン") || t.includes("pokemon")) return "pokemon";
  if (t.includes("ワンピース") || t.includes("one piece") || t.includes("onepiece")) return "onepiece";
  return "other";
}
