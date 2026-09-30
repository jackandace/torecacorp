// 過去請求書 (invoices.is_legacy) の PDF 保存パス解決
//
// 過去請求書の PDF は legacy-invoices バケット (`{shop_id}/{timestamp}-{請求書番号}.pdf`) にある。
// pdf_url には過去の実装で「1年の署名付き URL」を入れていたほか、PDF ダウンロード API の不具合で
// システム請求書のパス (`{invoice_id}.pdf`) に上書きされた行もあるため、
// 1) pdf_url から legacy-invoices のパスを取り出す → 2) 無ければバケット内を請求書番号で探す、の順で解決する。
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const LEGACY_INVOICE_BUCKET = "legacy-invoices";

/** アップロード時のファイル名に使う請求書番号の正規化 (legacy-invoice API と同じ規則) */
export function legacyInvoiceFileToken(invoiceNumber: string): string {
  return invoiceNumber.replace(/[^\w-]/g, "_");
}

/** pdf_url (署名付き URL or 保存パス) から legacy-invoices バケット内のパスを取り出す */
export function legacyPathFromPdfUrl(pdfUrl: string | null, shopId: string): string | null {
  if (!pdfUrl) return null;
  const marker = `/${LEGACY_INVOICE_BUCKET}/`;
  const i = pdfUrl.indexOf(marker);
  if (i >= 0) {
    const rest = pdfUrl.slice(i + marker.length).split("?")[0] ?? "";
    const path = decodeURIComponent(rest);
    return path.startsWith(`${shopId}/`) && path.endsWith(".pdf") ? path : null;
  }
  // 保存パスをそのまま入れている場合 (2026-09-30 以降のアップロード)
  if (!pdfUrl.includes("://") && pdfUrl.startsWith(`${shopId}/`) && pdfUrl.endsWith(".pdf")) return pdfUrl;
  return null;
}

/** 過去請求書の PDF 保存パスを解決する。見つからなければ null (その場合も PDF を生成し直してはいけない) */
export async function resolveLegacyInvoicePdfPath(
  adminSb: SupabaseClient<Database>,
  invoice: { shop_id: string; invoice_number: string; pdf_url: string | null },
): Promise<string | null> {
  const fromUrl = legacyPathFromPdfUrl(invoice.pdf_url, invoice.shop_id);
  if (fromUrl) return fromUrl;

  const suffix = `-${legacyInvoiceFileToken(invoice.invoice_number)}.pdf`;
  const { data: files } = await adminSb.storage
    .from(LEGACY_INVOICE_BUCKET)
    .list(invoice.shop_id, { limit: 1000, search: legacyInvoiceFileToken(invoice.invoice_number) });
  const hit = (files ?? [])
    .map((f) => f.name)
    .filter((n) => n.endsWith(suffix))
    .sort()
    .pop();
  return hit ? `${invoice.shop_id}/${hit}` : null;
}
