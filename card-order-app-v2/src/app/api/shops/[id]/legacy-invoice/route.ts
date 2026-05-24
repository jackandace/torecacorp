// 過去 (本システム外で発行された) 請求書の取り込み API (admin)
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file");
  const invoiceNumber = String(form.get("invoiceNumber") ?? "").trim();
  const issuedAt = String(form.get("issuedAt") ?? "").trim();
  const totalAmountRaw = String(form.get("totalAmount") ?? "0").trim();
  const status = String(form.get("status") ?? "入金済み") as "未入金" | "一部入金" | "入金済み";

  if (!(file instanceof File)) return NextResponse.json({ error: "PDF が必要" }, { status: 400 });
  if (!invoiceNumber || !issuedAt || !totalAmountRaw) {
    return NextResponse.json({ error: "請求書番号・発行日・金額が必要" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "PDF は 20MB 以下にしてください" }, { status: 413 });
  }

  const totalAmount = parseInt(totalAmountRaw, 10);
  if (!Number.isFinite(totalAmount) || totalAmount < 0) {
    return NextResponse.json({ error: "金額が不正" }, { status: 400 });
  }

  // ショップ確認
  const { data: shop } = await supabase
    .from("shops")
    .select("id, current_rank")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!shop) return NextResponse.json({ error: "shop not found" }, { status: 404 });

  // PDF アップロード
  const path = `${params.id}/${Date.now()}-${invoiceNumber.replace(/[^\w-]/g, "_")}.pdf`;
  const buf = Buffer.from(await file.arrayBuffer());
  const adminSb = createAdminClient();
  const { error: upErr } = await adminSb.storage
    .from("legacy-invoices")
    .upload(path, buf, { contentType: "application/pdf", upsert: false });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // 署名付き URL (長期 1 年) を pdf_url として保存
  const { data: signed } = await adminSb.storage
    .from("legacy-invoices")
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  const paidAmount = status === "入金済み" ? totalAmount : status === "一部入金" ? 0 : 0;

  const { data: inserted, error: insertErr } = await supabase
    .from("invoices")
    .insert({
      shop_id: params.id,
      invoice_number: invoiceNumber,
      rank_at_issue: shop.current_rank,
      subtotal: totalAmount,
      rebate_rate: 0,
      rebate_amount: 0,
      taxable_amount: totalAmount,
      tax_amount: 0,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      status,
      issued_at: new Date(issuedAt).toISOString(),
      pdf_url: signed?.signedUrl ?? path,
      is_legacy: true,
    })
    .select("*")
    .single();
  if (insertErr || !inserted) {
    return NextResponse.json({ error: insertErr?.message ?? "insert failed" }, { status: 500 });
  }

  await writeAudit(supabase, {
    adminId: user.id,
    shopId: params.id,
    action: "import_legacy_invoice",
    targetTable: "invoices",
    targetId: inserted.id,
    after: { invoice_number: invoiceNumber, total: totalAmount, status },
  });

  return NextResponse.json({ ok: true, invoice: inserted });
}
