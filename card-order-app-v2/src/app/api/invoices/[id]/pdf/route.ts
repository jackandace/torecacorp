// 請求書 PDF 生成 → Supabase Storage アップロード → invoices.pdf_url 更新
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";
import { renderPdfToBuffer } from "@/lib/pdf/render";
import { InvoicePdf } from "@/lib/pdf/invoice";
import { uploadInvoicePdf, signedInvoiceUrl } from "@/lib/storage";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, shops(*)")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!invoice) return NextResponse.json({ error: "not found" }, { status: 404 });

  // shops(*) の join 結果。Shop 型のフィールド追加に追従するため unknown 経由でキャスト
  const shop = invoice.shops as unknown as import("@/types/database").Shop;

  const { data: items } = await supabase
    .from("invoice_items")
    .select("*, orders(*, products(title, model_number))")
    .eq("invoice_id", invoice.id);

  const pdfItems = (items ?? []).map((it) => {
    const o = it.orders as {
      confirmed_qty: number | null;
      unit_price: number | null;
      products?: { title?: string; model_number?: string | null };
    } | null;
    return {
      title: o?.products?.title ?? "—",
      modelNumber: o?.products?.model_number ?? null,
      qty: o?.confirmed_qty ?? 0,
      unitPrice: o?.unit_price ?? 0,
      lineTotal: it.line_total,
    };
  });

  // 請求書 PDF 生成
  const buf = await renderPdfToBuffer(
    InvoicePdf({
      invoice,
      shop,
      items: pdfItems,
      issuer: {
        name: process.env.INVOICE_ISSUER_NAME ?? "PALETTE GROUP トレカ商事カンパニー",
        registrationNumber: process.env.INVOICE_REGISTRATION_NUMBER ?? "T0000000000000",
      },
    }),
  );

  // Storage は Service Role を使う (RLS バイパス)
  const adminSb = createAdminClient();
  const path = await uploadInvoicePdf({ supabase: adminSb, invoiceNumber: invoice.invoice_number, buffer: buf });
  const url = await signedInvoiceUrl({ supabase: adminSb, path });

  await supabase
    .from("invoices")
    .update({ pdf_url: url })
    .eq("id", invoice.id);

  await writeAudit(supabase, {
    adminId: user.id,
    shopId: invoice.shop_id,
    action: "generate_invoice_pdf",
    targetTable: "invoices",
    targetId: invoice.id,
    after: { path },
  });

  return NextResponse.redirect(new URL(`/admin/billing/${invoice.id}`, _request.url), 303);
}
