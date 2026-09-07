// 問屋の入荷登録 (Excel一括) API — フェーズ4
//
// 問屋向けのシンプルな列構成 (1行目はヘッダとして読み飛ばし):
//   A=シリーズ, B=商品名, C=型番, D=JANコード, E=定価(税抜),
//   F=カートンBOX数, G=最低発注数, H=発注可能数(BOX), I=発売日,
//   J=配分/カット, K=備考(承認者向けメモ)
// すべて「下書き (承認待ち)」として登録される。詳細は intake/route.ts 参照。
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

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const ctx = await getSupplierContext(supabase);
  if (!ctx) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file");
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
    return NextResponse.json({ error: `一度に取込できるのは${MAX_ROWS}行までです` }, { status: 400 });
  }

  const inserted: string[] = [];
  const skipped: { row: number; reason: string }[] = [];
  const insertRows: Partial<import("@/types/database").Product>[] = [];

  rows.forEach((row, i) => {
    const rowNo = i + 1;
    const series = row["A"] ? String(row["A"]).trim() : "";
    const title = row["B"] ? String(row["B"]).trim().replace(/\s+/g, " ") : "";
    // 1行目のヘッダらしき行はスキップ
    if (rowNo === 1 && (series.includes("シリーズ") || title.includes("商品名"))) return;
    if (!title) {
      if (series || row["C"] || row["E"]) skipped.push({ row: rowNo, reason: "商品名(B列)が空" });
      return;
    }
    const ctToBox = parseIntakeInteger(row["F"]);
    const minOrder = parseIntakeInteger(row["G"]);
    const releaseDate = parseIntakeDate(row["I"]);
    const flowLabel = row["J"] ? String(row["J"]).trim() : "";

    insertRows.push({
      series: series || null,
      title,
      full_name: title,
      model_number: row["C"] ? String(row["C"]).trim() : null,
      jan_code: row["D"] ? String(row["D"]).trim() : null,
      category: inferIntakeCategory(`${series} ${title}`),
      actual_rate: 0,
      price: parseIntakePrice(row["E"]),
      planned_qty: parseIntakeInteger(row["H"]),
      ct_to_box: ctToBox ?? 12,
      min_order_box: minOrder ?? ctToBox ?? 12,
      flow_type: flowLabel.includes("カット") ? "cut" : "haibun",
      ...(releaseDate ? { release_info: `発売日: ${releaseDate}` } : {}),
      intake_note: row["K"] ? String(row["K"]).trim() : null,
      supplier_id: ctx.supplierId,
      is_visible: false,
      is_approved: false,
      status: "受付停止",
    });
    inserted.push(title.slice(0, 40));
  });

  if (insertRows.length === 0) {
    return NextResponse.json({ error: "取込できる行がありませんでした", skipped }, { status: 400 });
  }

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

  return NextResponse.json({ ok: true, inserted: inserted.length, titles: inserted, skipped });
}
