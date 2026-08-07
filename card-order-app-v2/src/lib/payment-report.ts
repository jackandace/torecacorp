// ショップの「振込完了報告」まわりの導出ロジック
//
// 「支払い確認中」は invoices.status を拡張せず、payment_reported_at からの
// 導出で表現する (status の CHECK 制約・集計・精算ロジックに影響させない)。
import type { Invoice } from "@/types/database";

type ReportView = Pick<Invoice, "status" | "payment_reported_at" | "invoice_kind" | "is_legacy">;

/** 「支払い確認中」か (振込報告済み かつ 未消込) */
export function isAwaitingPaymentConfirm(inv: ReportView): boolean {
  return inv.payment_reported_at != null && inv.status !== "入金済み";
}

/**
 * ショップが振込報告できる請求書か。
 *   ・返金(refund)はショップが支払う側ではないので不可
 *   ・過去請求書(legacy)はシステム外運用なので不可
 *   ・入金済みは報告する意味がないので不可
 */
export function canReportPayment(inv: ReportView): boolean {
  return inv.invoice_kind !== "refund" && !inv.is_legacy && inv.status !== "入金済み";
}
