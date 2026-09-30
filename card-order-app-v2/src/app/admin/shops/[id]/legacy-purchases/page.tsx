// 顧客ごとの購入履歴 (卸アプリ運用以前) — 参照専用の記録
// ランク・リベート・請求・累計取引額 (lifetime_amount) の計算には使わない。
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { LegacyPurchase } from "@/types/database";
import { LegacyPurchasesManager, type ImportBatch, type LegacyInvoiceOption } from "./LegacyPurchasesManager";
import { LegacyInvoiceUpload } from "../LegacyInvoiceUpload";

export const dynamic = "force-dynamic";
export const metadata = { title: "購入履歴 (アプリ運用以前) | 管理" };

export default async function LegacyPurchasesPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: shop } = await supabase
    .from("shops")
    .select("id, company_name")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!shop) notFound();

  const { data: rows } = await supabase
    .from("legacy_purchases")
    .select("*")
    .eq("shop_id", shop.id)
    .is("deleted_at", null)
    .order("purchased_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5000);

  const purchases = (rows ?? []) as LegacyPurchase[];

  const { data: invRows } = await supabase
    .from("invoices")
    .select("id, invoice_number, issued_at, total_amount")
    .eq("shop_id", shop.id)
    .eq("is_legacy", true)
    .is("deleted_at", null)
    .order("issued_at", { ascending: false });
  const invoices: LegacyInvoiceOption[] = (invRows ?? []).map((i) => ({
    id: i.id, number: i.invoice_number, issuedAt: i.issued_at, total: i.total_amount,
  }));
  const batchMap = new Map<string, ImportBatch>();
  for (const p of purchases) {
    if (!p.import_batch_id) continue;
    const b = batchMap.get(p.import_batch_id) ?? { id: p.import_batch_id, count: 0, amount: 0, importedAt: p.created_at };
    b.count++;
    b.amount += p.amount;
    if (p.created_at < b.importedAt) b.importedAt = p.created_at;
    batchMap.set(p.import_batch_id, b);
  }
  const batches = [...batchMap.values()].sort((a, b) => b.importedAt.localeCompare(a.importedAt));

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/shops/${shop.id}`} className="text-sm text-brand-600 hover:underline">← {shop.company_name}</Link>
        <h1 className="text-2xl font-bold mt-1">購入履歴（卸アプリ運用以前）</h1>
        <p className="text-sm text-slate-500 mt-1">
          アプリ導入前の購入実績を登録します。<b>お客様のマイページにも表示</b>されます（社内メモ欄を除く）。
          金額はすべて<b>税抜</b>。ランク・リベート・請求・累計取引額の計算には使われない参照用の記録です。
        </p>
      </div>
      <LegacyPurchasesManager
        shopId={shop.id}
        purchases={purchases}
        batches={batches}
        invoices={invoices}
        invoiceUpload={<LegacyInvoiceUpload shopId={shop.id} />}
      />
    </div>
  );
}
