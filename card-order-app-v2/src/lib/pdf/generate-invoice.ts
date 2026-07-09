// 請求書 PDF の生成 + Storage 保存 (共有ロジック)
//
// POST /api/invoices/[id]/pdf (再生成) と GET .../pdf/download (都度署名・無ければ生成)
// の両方から呼ぶ。保存パスは invoice id から決まる固定パスにして、後から
// 署名 URL を何度でも作り直せるようにする (署名 URL を DB に永続化しない)。
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Shop } from "@/types/database";
import { renderPdfToBuffer } from "./render";
import { InvoicePdf } from "./invoice";

/** 請求書 PDF の Storage 保存パス (invoices バケット内・固定) */
export function invoicePdfPath(invoiceId: string): string {
  return `${invoiceId}.pdf`;
}

/**
 * 請求書 PDF を生成して invoices バケットへ保存し、保存パスを返す。
 * adminSb は Service Role クライアント (Storage 操作 + RLS バイパス読込)。
 */
export async function generateInvoicePdf(
  adminSb: SupabaseClient<Database>,
  invoiceId: string,
): Promise<{ path: string; invoiceNumber: string; shopId: string }> {
  const { data: invoice } = await adminSb
    .from("invoices")
    .select("*, shops(*)")
    .eq("id", invoiceId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!invoice) throw new Error("invoice not found");

  const shop = invoice.shops as unknown as Shop;

  const { data: items } = await adminSb
    .from("invoice_items")
    .select("*, orders(*, products(title, model_number))")
    .eq("invoice_id", invoice.id);

  const isDeposit = invoice.invoice_kind === "deposit";
  const pdfItems = (items ?? []).map((it) => {
    const o = it.orders as {
      confirmed_qty: number | null;
      requested_qty_box: number | null;
      unit_price: number | null;
      listed_rate: number | null;
      products?: { title?: string; model_number?: string | null };
    } | null;
    const qty = o?.confirmed_qty ?? o?.requested_qty_box ?? 0;
    const rate = o?.listed_rate ?? 0;
    const unitPrice = o?.unit_price ?? 0;
    // 案内単価(税抜) = 定価 × 掛け率
    const unitListed = Math.round(unitPrice * rate);
    // 明細金額(税抜)。保証金は保存済みの line_total(保証金額)をそのまま表示
    const lineAmount = isDeposit ? it.line_total : Math.floor(unitPrice * qty * rate);
    return {
      title: o?.products?.title ?? "—",
      modelNumber: o?.products?.model_number ?? null,
      qty,
      rate,
      unitPrice: unitListed,
      lineAmount,
    };
  });

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

  const path = invoicePdfPath(invoiceId);
  const { error } = await adminSb.storage
    .from("invoices")
    .upload(path, buf, { contentType: "application/pdf", upsert: true });
  if (error) throw error;

  return { path, invoiceNumber: invoice.invoice_number, shopId: invoice.shop_id };
}
