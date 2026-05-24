// 商品マスター Excel 取込 API
//
// 実フォーマット (橋本さん「入荷案内リスト」形式):
//   A = 案内日付ラベル ("5/22付" 等) — 使わない
//   B = 商品タイトル   (title)
//   C = 発売日         — 使わない (将来用)
//   D = 商品名（フル） (full_name)
//   E = 型番           (model_number)
//   F = 発注可能数BOX  (planned_qty)
//   G = 発注締切日     (order_deadline)
//   H = 掛け率         (actual_rate 0.76 or "76%")
//   I = 販売価格(定価) (price)  ※ "6.000(税込み6.600）" 形式に対応
//   J = 配分/カット    (flow_type 判定 + cut_type ラベル)
//   K = 備考           (notes)
import { NextResponse, type NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseRate(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    // 0.76 のような小数 or 76 のようなパーセント値
    return value > 1 ? value / 100 : value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.endsWith("%")) {
      const n = parseFloat(trimmed.slice(0, -1));
      return Number.isFinite(n) ? n / 100 : null;
    }
    const n = parseFloat(trimmed);
    if (!Number.isFinite(n)) return null;
    return n > 1 ? n / 100 : n;
  }
  return null;
}

/** "204box" のような数字+単位混在文字列から整数を抽出 */
function parseInteger(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Math.floor(value);
  const m = String(value).match(/(\d+)/);
  return m ? parseInt(m[1]!, 10) : null;
}

/**
 * 価格専用パーサ
 * 対応形式:
 *   "6.000(税込み6.600）"  → 6000 (税抜)
 *   "5,460(税込6,006)"     → 5460
 *   "6600"                 → 6600
 *   "¥5,500"               → 5500
 *   6000 (数値)            → 6000
 */
function parsePrice(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Math.floor(value);
  if (typeof value !== "string") return null;
  // 括弧 (税込) 表記を切り落とす
  const head = value.split(/[（(]/)[0]?.trim() ?? "";
  // 区切り (. , 空白 ¥ 円) を除去
  const cleaned = head.replace(/[.,\s円¥]/g, "");
  if (!/^\d+$/.test(cleaned)) return null;
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : null;
}

function parseDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    // Excel シリアル値 (1900-01-01 起点・UTC)
    const utc = (value - 25569) * 86400 * 1000;
    const d = new Date(utc);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  const s = String(value).replace(/[年月]/g, "/").replace(/日/g, "").trim();
  if (!s || s === "再販" || s === "未定") return null;
  // YYYY/MM/DD or YYYY-MM-DD は文字列処理で TZ ずれを回避
  const m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (m) {
    const [, y, mo, da] = m;
    return `${y}-${mo!.padStart(2, "0")}-${da!.padStart(2, "0")}`;
  }
  // フォールバック (Date 経由・ローカル TZ で組み立て)
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const yy = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mo}-${da}`;
}

/** 商品タイトルからカテゴリを推定 */
function inferCategory(title: string): "pokemon" | "onepiece" | "other" {
  const t = title.toLowerCase();
  if (t.includes("ポケモン") || t.includes("pokemon")) return "pokemon";
  if (t.includes("ワンピース") || t.includes("one piece") || t.includes("onepiece")) return "onepiece";
  return "other";
}

/** ヘッダ行 (1 行目に "商品タイトル" などのラベル) かどうかを判定 */
function isHeaderRow(b: unknown): boolean {
  if (typeof b !== "string") return false;
  const v = b.trim();
  return v === "商品タイトル" || v === "タイトル" || v === "title";
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]!];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    header: "A",
    raw: true,
    defval: null,
  });

  const inserted: string[] = [];
  const updated: { title: string; changes: string[] }[] = [];
  const skipped: { title: string; reason: string }[] = [];
  const errors: string[] = [];

  // 新規 series 候補を記録 (モーダル確認用)
  const newSeriesSet = new Set<string>();
  const { data: existingSeriesRows } = await supabase
    .from("products")
    .select("series")
    .is("deleted_at", null)
    .not("series", "is", null);
  const existingSeries = new Set((existingSeriesRows ?? []).map((r) => r.series).filter(Boolean));

  for (const row of rows) {
    if (isHeaderRow(row["B"])) {
      skipped.push({ title: "(ヘッダ行)", reason: "1 行目のラベル行" });
      continue;
    }
    // B = series (ゲームシリーズ名), D = title (実際の商品名)
    const series      = String(row["B"] ?? "").trim();
    if (!series) {
      skipped.push({ title: "(空行)", reason: "シリーズ(B列)が空" });
      continue;
    }
    const productTitle = row["D"] ? String(row["D"]).trim().replace(/\s+/g, " ") : series;
    const title        = productTitle || series;
    const modelNumber  = row["E"] ? String(row["E"]).trim() : null;
    const plannedQty   = parseInteger(row["F"]);
    const deadline     = parseDate(row["G"]);
    const actualRate   = parseRate(row["H"]);
    const price        = parsePrice(row["I"]);
    const flowLabel    = row["J"] ? String(row["J"]).trim() : null;
    const notes        = row["K"] ? String(row["K"]).trim() : null;

    const displayName = `[${series}] ${title.slice(0, 40)}`;

    if (actualRate == null) {
      errors.push(`${displayName}: 掛け率(H列)の解析失敗 [${row["H"]}]`);
      continue;
    }
    if (price == null) {
      errors.push(`${displayName}: 販売価格(I列)の解析失敗 [${row["I"]}]`);
      continue;
    }

    // 新規 series 検出
    if (!existingSeries.has(series)) {
      newSeriesSet.add(series);
    }

    // 重複チェック (series + title + model_number)
    let dupQuery = supabase.from("products").select("*").eq("series", series).eq("title", title);
    dupQuery = modelNumber ? dupQuery.eq("model_number", modelNumber) : dupQuery.is("model_number", null);
    const { data: exists } = await dupQuery.maybeSingle();

    const isCut = flowLabel ? flowLabel.includes("カット") : false;

    const payload = {
      series,
      title,
      full_name: productTitle,
      model_number: modelNumber,
      category: inferCategory(series),
      actual_rate: actualRate,
      planned_qty: plannedQty ?? 0,
      price,
      cut_type: flowLabel,
      flow_type: (isCut ? "cut" : "haibun") as "cut" | "haibun",
      order_deadline: deadline,
      notes,
    };

    if (exists) {
      // 既存との差分を計算
      const changes: string[] = [];
      if (exists.actual_rate !== actualRate) changes.push(`掛け率: ${exists.actual_rate} → ${actualRate}`);
      if (exists.price !== price) changes.push(`定価: ¥${(exists.price ?? 0).toLocaleString()} → ¥${price.toLocaleString()}`);
      if ((exists.planned_qty ?? 0) !== (plannedQty ?? 0)) changes.push(`在庫: ${exists.planned_qty ?? 0} → ${plannedQty ?? 0}`);
      if (exists.order_deadline !== deadline) changes.push(`締切: ${exists.order_deadline ?? "—"} → ${deadline ?? "—"}`);
      if (exists.flow_type !== payload.flow_type) changes.push(`フロー: ${exists.flow_type} → ${payload.flow_type}`);

      const { error } = await supabase.from("products").update(payload).eq("id", exists.id);
      if (error) errors.push(`${displayName}: ${error.message}`);
      else updated.push({ title: displayName, changes });
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) errors.push(`${displayName}: ${error.message}`);
      else inserted.push(displayName);
    }
  }

  return NextResponse.json({
    summary: {
      inserted: inserted.length,
      updated: updated.length,
      skipped: skipped.length,
      errors: errors.length,
    },
    inserted,
    updated,
    skipped,
    errors,
    newSeries: Array.from(newSeriesSet),
  });
}
