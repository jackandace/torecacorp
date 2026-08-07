// ショップの「振込完了報告」API
//
// POST   : ショップ本人が自分の請求書に振込完了を報告する (冪等・再報告は上書き)
//          → payment_reported_at をセットし、初回のみ社内スタッフへメール通知。
//          「支払い確認中」は表示側で reported_at != null && status != 入金済み から導出。
// DELETE : 管理者が誤報告などをクリアする。
//
// invoices.status は一切変更しない (集計・精算ロジックへの影響を避ける設計)。
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";
import { canReportPayment } from "@/lib/payment-report";
import { writeAudit } from "@/lib/audit";
import { notifyPaymentReportToStaff } from "@/lib/notify";

export const dynamic = "force-dynamic";

const PostSchema = z.object({
  note: z.string().trim().max(300).optional(),
});

const KIND_LABEL: Record<string, string> = {
  normal: "通常請求",
  deposit: "保証金(前受金)",
  final: "最終精算(差額)",
  refund: "返金",
};

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: z.infer<typeof PostSchema>;
  try {
    body = PostSchema.parse(await request.json().catch(() => ({})));
  } catch {
    return NextResponse.json({ error: "メモは300文字以内で入力してください" }, { status: 400 });
  }

  // ショップ本人か + 自分の請求書か
  const { data: shop } = await supabase
    .from("shops")
    .select("id, company_name")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!shop) return NextResponse.json({ error: "shop not found" }, { status: 404 });

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, shop_id, invoice_number, invoice_kind, is_legacy, status, total_amount, paid_amount, payment_reported_at")
    .eq("id", params.id)
    .eq("shop_id", shop.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!invoice) return NextResponse.json({ error: "請求書が見つかりません" }, { status: 404 });

  if (!canReportPayment(invoice)) {
    return NextResponse.json({ error: "この請求書には振込報告できません" }, { status: 400 });
  }

  const firstReport = invoice.payment_reported_at == null;
  const note = body.note || null;

  // RLS でショップからの invoices UPDATE は許可していないため Service Role で更新
  const adminSb = createAdminClient();
  const { error: updErr } = await adminSb
    .from("invoices")
    .update({ payment_reported_at: new Date().toISOString(), payment_report_note: note })
    .eq("id", invoice.id);
  if (updErr) {
    return NextResponse.json({ error: `報告の保存に失敗しました: ${updErr.message}` }, { status: 500 });
  }

  await writeAudit(supabase, {
    shopId: shop.id,
    action: "report_payment",
    targetTable: "invoices",
    targetId: invoice.id,
    after: { invoice_number: invoice.invoice_number, note, first_report: firstReport },
  });

  // 社内スタッフへメール通知 (初回のみ。再報告の連打でメールが濫発しないように)
  if (firstReport) {
    await notifyPaymentReportToStaff({
      supabase: adminSb,
      shopName: shop.company_name,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      kindLabel: KIND_LABEL[invoice.invoice_kind] ?? invoice.invoice_kind,
      totalAmount: invoice.total_amount,
      remainingAmount: invoice.total_amount - invoice.paid_amount,
      note,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, shop_id, invoice_number, payment_reported_at")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!invoice) return NextResponse.json({ error: "請求書が見つかりません" }, { status: 404 });

  const { error: updErr } = await supabase
    .from("invoices")
    .update({ payment_reported_at: null, payment_report_note: null })
    .eq("id", invoice.id);
  if (updErr) {
    return NextResponse.json({ error: `クリアに失敗しました: ${updErr.message}` }, { status: 500 });
  }

  await writeAudit(supabase, {
    adminId: user.id,
    shopId: invoice.shop_id,
    action: "clear_payment_report",
    targetTable: "invoices",
    targetId: invoice.id,
    after: { invoice_number: invoice.invoice_number, cleared_reported_at: invoice.payment_reported_at },
  });

  return NextResponse.json({ ok: true });
}
