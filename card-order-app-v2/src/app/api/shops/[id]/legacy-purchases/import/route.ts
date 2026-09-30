// 購入履歴 (アプリ運用以前) の一括取込 (admin)
//
// テンプレート (api/legacy-purchases/template) 形式の Excel / CSV のみ受け付ける。
//   POST mode=preview : 解釈結果・エラー・警告を返す (DB 書き込みなし)
//   POST mode=commit  : エラー 0 件のときだけ全行を登録 (1行でもエラーなら何も登録しない)
//   DELETE ?batch=... : その取込で登録した行をまとめて取り消す (論理削除)
// 取込ごとに import_batch_id を振るので、誤った取込を丸ごと戻せる。
import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { todayISOInJST } from "@/lib/dates";
import {
  LEGACY_DATA_SHEET,
  LEGACY_MAX_ROWS,
  legacyDupKey,
  parseLegacySheet,
} from "@/lib/legacy-purchases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user: user && isAdmin(user) ? user : null };
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { supabase, user } = await requireAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data: shop } = await supabase.from("shops").select("id, company_name").eq("id", params.id).is("deleted_at", null).maybeSingle();
  if (!shop) return NextResponse.json({ error: "ショップが見つかりません" }, { status: 404 });

  const form = await request.formData();
  const file = form.get("file");
  const mode = form.get("mode") === "commit" ? "commit" : "preview";
  if (!(file instanceof File)) return NextResponse.json({ error: "ファイルを選択してください" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "ファイルは 5MB 以下にしてください" }, { status: 413 });

  let matrix: unknown[][];
  try {
    const wb = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer" });
    const sheetName = wb.SheetNames.includes(LEGACY_DATA_SHEET) ? LEGACY_DATA_SHEET : wb.SheetNames[0];
    if (!sheetName) throw new Error("シートがありません");
    matrix = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName]!, { header: 1, raw: true, defval: "" });
  } catch {
    return NextResponse.json({ error: "ファイルを読み込めません。テンプレート (Excel / CSV) で作成してください" }, { status: 400 });
  }

  const { headerProblems, rows, tooMany } = parseLegacySheet(matrix, todayISOInJST());
  if (headerProblems.length > 0) {
    return NextResponse.json({
      error: "テンプレートと列の見出しが一致しません。最新のテンプレートを使い、見出し行は変更しないでください",
      headerProblems,
    }, { status: 400 });
  }
  if (rows.length === 0) return NextResponse.json({ error: "取り込むデータ行がありません (2行目から入力)" }, { status: 400 });
  if (tooMany) return NextResponse.json({ error: `1回に取り込めるのは ${LEGACY_MAX_ROWS} 行までです (${rows.length} 行)` }, { status: 400 });

  // 既に登録済みの内容と同じ行は警告 (取り込みの二重実行防止)
  const { data: existing } = await supabase
    .from("legacy_purchases")
    .select("purchased_on, product_name, quantity, amount")
    .eq("shop_id", shop.id)
    .is("deleted_at", null);
  const existingKeys = new Set((existing ?? []).map((e) =>
    legacyDupKey({ purchasedOn: e.purchased_on, productName: e.product_name, quantity: e.quantity, amount: e.amount })));
  for (const r of rows) {
    if (r.data && existingKeys.has(legacyDupKey(r.data))) r.warnings.push("同じ内容の履歴が既に登録されています (二重取込の可能性)");
  }

  const errorCount = rows.filter((r) => r.errors.length > 0).length;
  const warningCount = rows.filter((r) => r.warnings.length > 0).length;
  const valid = rows.filter((r) => r.data).map((r) => r.data!);
  const totalAmount = valid.reduce((s, d) => s + d.amount, 0);

  if (mode === "preview") {
    return NextResponse.json({ ok: true, mode, rows, summary: { total: rows.length, errorCount, warningCount, totalAmount } });
  }

  if (errorCount > 0) {
    return NextResponse.json({ error: `エラーが ${errorCount} 行あるため登録できません。修正して再度取り込んでください` }, { status: 400 });
  }

  const batchId = randomUUID();
  const { error } = await supabase.from("legacy_purchases").insert(valid.map((d) => ({
    shop_id: shop.id,
    purchased_on: d.purchasedOn,
    product_name: d.productName,
    quantity: d.quantity,
    unit: d.unit,
    unit_price: d.unitPrice,
    amount: d.amount,
    shipment_status: d.shipmentStatus,
    note: d.note,
    internal_note: d.internalNote,
    import_batch_id: batchId,
    created_by: user.id,
    updated_by: user.id,
  })));
  if (error) return NextResponse.json({ error: `登録に失敗しました: ${error.message}` }, { status: 500 });

  await writeAudit(supabase, {
    adminId: user.id,
    shopId: shop.id,
    action: "import_legacy_purchases",
    targetTable: "legacy_purchases",
    targetId: batchId,
    after: { file: file.name, rows: valid.length, total_amount: totalAmount },
  });
  return NextResponse.json({ ok: true, mode, inserted: valid.length, batchId });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { supabase, user } = await requireAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const batchId = request.nextUrl.searchParams.get("batch");
  if (!batchId || !/^[0-9a-f-]{36}$/i.test(batchId)) return NextResponse.json({ error: "batch が不正です" }, { status: 400 });

  const { data, error } = await supabase
    .from("legacy_purchases")
    .update({ deleted_at: new Date().toISOString(), updated_by: user.id })
    .eq("shop_id", params.id)
    .eq("import_batch_id", batchId)
    .is("deleted_at", null)
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit(supabase, {
    adminId: user.id,
    shopId: params.id,
    action: "undo_legacy_purchase_import",
    targetTable: "legacy_purchases",
    targetId: batchId,
    after: { removed: data?.length ?? 0 },
  });
  return NextResponse.json({ ok: true, removed: data?.length ?? 0 });
}
