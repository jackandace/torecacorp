// 領収書 PDF を生成 (入金済みの請求書のみ)
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";
import { renderPdfToBuffer } from "@/lib/pdf/render";
import { ReceiptPdf } from "@/lib/pdf/receipt";
import { writeAudit } from "@/lib/audit";
import type { Shop } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, shops(*)")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!invoice) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (invoice.status !== "入金済み") {
    return NextResponse.json({ error: "入金済みの請求書のみ領収書を発行できます" }, { status: 400 });
  }

  const shop = invoice.shops as unknown as Shop;
  const paidAt = invoice.paid_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);

  const buf = await renderPdfToBuffer(
    ReceiptPdf({
      invoice,
      shop,
      paidAt,
      receivedFor: `商品代金 (${invoice.invoice_number})`,
      issuer: {
        name: process.env.INVOICE_ISSUER_NAME ?? "PALETTE GROUP トレカ商事カンパニー",
        registrationNumber: process.env.INVOICE_REGISTRATION_NUMBER ?? "T0000000000000",
      },
    }),
  );

  const adminSb = createAdminClient();
  const path = `receipts/${new Date().getFullYear()}/${invoice.invoice_number}.pdf`;
  const { error: upErr } = await adminSb.storage
    .from("invoices")
    .upload(path, buf, { contentType: "application/pdf", upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: signed } = await adminSb.storage
    .from("invoices")
    .createSignedUrl(path, 3600);

  await writeAudit(supabase, {
    adminId: user.id,
    shopId: invoice.shop_id,
    action: "generate_receipt",
    targetTable: "invoices",
    targetId: invoice.id,
    after: { path },
  });

  return NextResponse.json({ ok: true, url: signed?.signedUrl });
}
