// 請求書番号 (INV-YYYYMM-NNNN) の採番
//
// 重複防止のためトランザクション内で最新番号 + 1 を採番する想定。
// PostgREST では直接トランザクションを張れないため、Supabase RPC か
// SELECT FOR UPDATE が使える server-side で呼ぶこと。
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export function buildInvoiceNumber(yearMonth: Date, sequence: number): string {
  const y = yearMonth.getFullYear();
  const m = String(yearMonth.getMonth() + 1).padStart(2, "0");
  return `INV-${y}${m}-${String(sequence).padStart(4, "0")}`;
}

/**
 * 当月の最新請求書番号から次の番号を採番。
 * 競合防止のため、呼び出し側は Service Role + 直列実行を推奨。
 * 将来的には Supabase RPC (Postgres function) に置き換えることを検討。
 */
export async function nextInvoiceNumber(
  supabase: SupabaseClient<Database>,
  yearMonth: Date,
): Promise<string> {
  const y = yearMonth.getFullYear();
  const m = String(yearMonth.getMonth() + 1).padStart(2, "0");
  const prefix = `INV-${y}${m}-`;

  const { data, error } = await supabase
    .from("invoices")
    .select("invoice_number")
    .like("invoice_number", `${prefix}%`)
    .order("invoice_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  const lastSeq = data?.invoice_number
    ? parseInt(data.invoice_number.split("-")[2] ?? "0", 10)
    : 0;
  return buildInvoiceNumber(yearMonth, lastSeq + 1);
}
