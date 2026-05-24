import { createClient } from "@/lib/supabase/server";
import { formatJST } from "@/lib/dates";
import { formatYen } from "@/lib/rebate";

export const metadata = { title: "請求・入金管理 | 管理" };
export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const supabase = createClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*, shops(company_name)")
    .is("deleted_at", null)
    .order("issued_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">請求・入金管理</h1>
        <div className="flex gap-2">
          <a href="/admin/billing/new" className="btn-primary">請求書発行</a>
          <a href="/api/invoices/export" className="btn-secondary">CSV出力</a>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-2">請求書番号</th>
              <th className="text-left px-3 py-2">ショップ</th>
              <th className="text-left px-3 py-2">発行日</th>
              <th className="text-right px-3 py-2">小計</th>
              <th className="text-right px-3 py-2">リベート</th>
              <th className="text-right px-3 py-2">税</th>
              <th className="text-right px-3 py-2">合計</th>
              <th className="text-left px-3 py-2">入金</th>
              <th className="text-left px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {(invoices ?? []).map((inv) => {
              const shop = (inv as { shops?: { company_name?: string } }).shops;
              return (
                <tr key={inv.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{inv.invoice_number}</td>
                  <td className="px-3 py-2">{shop?.company_name ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{formatJST(inv.issued_at)}</td>
                  <td className="px-3 py-2 text-right">{formatYen(inv.subtotal)}</td>
                  <td className="px-3 py-2 text-right text-emerald-600">
                    -{formatYen(inv.rebate_amount)}
                  </td>
                  <td className="px-3 py-2 text-right">{formatYen(inv.tax_amount)}</td>
                  <td className="px-3 py-2 text-right font-bold">{formatYen(inv.total_amount)}</td>
                  <td className="px-3 py-2">{inv.status}</td>
                  <td className="px-3 py-2">
                    <a href={`/admin/billing/${inv.id}`} className="text-brand-600 hover:underline">
                      消込
                    </a>
                  </td>
                </tr>
              );
            })}
            {(!invoices || invoices.length === 0) && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-slate-500">
                  請求書はまだ発行されていません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        TODO: 請求書発行ウィザード、入金消込モーダル、領収書発行、売掛金集計
      </p>
    </div>
  );
}
