// 問屋の入荷登録 (Excel一括) API — フェーズ4
//
// 列構成 (1行目はヘッダとして読み飛ばし):
//   A=シリーズ, B=商品名, C=型番, D=JANコード, E=定価(税抜),
//   F=カートンBOX数, G=最低発注数, H=発注可能数(BOX), I=発売日,
//   J=配分/カット, K=備考(承認者向けメモ), L=締め日(発注締切日)
//
// 2段階取込: mode=preview で解釈結果と警告を返し (DB書き込みなし)、
// 問屋が内容を確認してから mode=commit で登録する。列ズレ・日付書式壊れに
// その場で気付けるようにするため。登録は「下書き(承認待ち)」(intake/route.ts 参照)。
import { NextResponse, type NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupplierContext } from "@/lib/supplier";
import {
  inferIntakeCategory,
  parseIntakeDate,
  parseIntakeInteger,
  parseIntakePrice,
} from "@/lib/intake-parsers";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ROWS = 200;

interface ParsedRow {
  row: number;                 // Excel上の行番号
  series: string | null;
  title: string;
  modelNumber: string | null;
  janCode: string | null;
  price: number | null;
  ctToBox: number;             // 既定12
  minOrderBox: number;
  plannedQty: number | null;
  releaseDate: string | null;
  deadline: string | null;
  flowType: "haibun" | "cut";
  note: string | null;
  warnings: string[];
}

/** ヘッダらしき行か (1行目以外に紛れた見出し行も検出) */
function looksLikeHeader(series: string, title: string): boolean {
  return (
    series.includes("シリーズ") ||
    title.includes("商品名") ||
    title.includes("商品タイトル") ||
    title === "title"
  );
}

function parseRows(rows: Record<string, unknown>[]): { parsed: ParsedRow[]; skipped: { row: number; reason: string }[] } {
  const parsed: ParsedRow[] = [];
  const skipped: { row: number; reason: string }[] = [];

  rows.forEach((row, i) => {
    const rowNo = i + 1;
    const series = row["A"] ? String(row["A"]).trim() : "";
    const title = row["B"] ? String(row["B"]).trim().replace(/\s+/g, " ") : "";

    if (looksLikeHeader(series, title)) {
      skipped.push({ row: rowNo, reason: "見出し行のためスキップ" });
      return;
    }
    if (!title) {
      if (series || row["C"] || row["E"]) skipped.push({ row: rowNo, reason: "商品名(B列)が空" });
      return;
    }

    const warnings: string[] = [];
    const price = parseIntakePrice(row["E"]);
    if (row["E"] != null && row["E"] !== "" && price == null) warnings.push("定価(E列)を読み取れませんでした");
    const ctToBox = parseIntakeInteger(row["F"]);
    if (ctToBox == null) warnings.push("カートンBOX数(F列)が空のため既定の12になります");
    const minOrder = parseIntakeInteger(row["G"]);
    const plannedQty = parseIntakeInteger(row["H"]);
    const releaseDate = parseIntakeDate(row["I"]);
    if (row["I"] != null && row["I"] !== "" && releaseDate == null) warnings.push("発売日(I列)を日付として読み取れませんでした");
    const deadline = parseIntakeDate(row["L"]);
    if (row["L"] != null && row["L"] !== "" && deadline == null) warnings.push("締め日(L列)を日付として読み取れませんでした");
    if (deadline == null) warnings.push("締め日が未設定です");
    const flowLabel = row["J"] ? String(row["J"]).trim() : "";

    parsed.push({
      row: rowNo,
      series: series || null,
      title,
      modelNumber: row["C"] ? String(row["C"]).trim() : null,
      janCode: row["D"] ? String(row["D"]).trim() : null,
      price,
      ctToBox: ctToBox ?? 12,
      minOrderBox: minOrder ?? ctToBox ?? 12,
      plannedQty,
      releaseDate,
      deadline,
      flowType: flowLabel.includes("カット") ? "cut" : "haibun",
      note: row["K"] ? String(row["K"]).trim() : null,
      warnings,
    });
  });

  return { parsed, skipped };
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const ctx = await getSupplierContext(supabase);
  if (!ctx) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file");
  const mode = form.get("mode") === "commit" ? "commit" : "preview";
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let rows: Record<string, unknown>[];
  try {
    const wb = XLSX.read(buf, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]!];
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: "A", raw: true, defval: null });
  } catch {
    return NextResponse.json({ error: "Excelファイルを読み込めませんでした" }, { status: 400 });
  }
  if (rows.length > MAX_ROWS + 1) {
    return NextResponse.json({ error: `一度に取込できるのは${MAX_ROWS}行までです (${rows.length}行あります)` }, { status: 400 });
  }

  const { parsed, skipped } = parseRows(rows);
  if (parsed.length === 0) {
    return NextResponse.json({ error: "取込できる行がありませんでした", skipped }, { status: 400 });
  }

  if (mode === "preview") {
    return NextResponse.json({ ok: true, mode, rows: parsed, skipped });
  }

  // commit
  const insertRows: Partial<import("@/types/database").Product>[] = parsed.map((r) => ({
    series: r.series,
    title: r.title,
    full_name: r.title,
    model_number: r.modelNumber,
    jan_code: r.janCode,
    category: inferIntakeCategory(`${r.series ?? ""} ${r.title}`),
    actual_rate: 0,
    price: r.price,
    planned_qty: r.plannedQty,
    ct_to_box: r.ctToBox,
    min_order_box: r.minOrderBox,
    flow_type: r.flowType,
    order_deadline: r.deadline,
    ...(r.releaseDate ? { release_info: `発売日: ${r.releaseDate}` } : {}),
    intake_note: r.note,
    supplier_id: ctx.supplierId,
    is_visible: false,
    is_approved: false,
    status: "受付停止",
  }));

  const adminSb = createAdminClient();
  const { error } = await adminSb.from("products").insert(insertRows);
  if (error) {
    return NextResponse.json({ error: `登録に失敗しました: ${error.message}` }, { status: 500 });
  }

  await writeAudit(supabase, {
    action: "supplier_intake_import",
    targetTable: "products",
    after: { supplier_id: ctx.supplierId, count: insertRows.length },
  });

  return NextResponse.json({ ok: true, mode, inserted: insertRows.length, skipped });
}
