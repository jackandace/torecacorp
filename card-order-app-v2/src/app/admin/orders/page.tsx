import { createClient } from "@/lib/supabase/server";
import { formatJST } from "@/lib/dates";
import { formatYen } from "@/lib/rebate";

export const metadata = { title: "発注管理 | 管理" };
export const dynamic = "force-dynamic";

export default async function OrdersAdminPage() {
  const supabase = createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("*, shops(company_name), products(title, flow_type)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">発注管理</h1>
        <div className="flex gap-2 text-xs">
          <a href="/api/orders/export" className="btn-secondary">CSVエクスポート</a>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-2">日時</th>
              <th className="text-left px-3 py-2">ショップ</th>
              <th className="text-left px-3 py-2">商品</th>
              <th className="text-left px-3 py-2">フロー</th>
              <th className="text-right px-3 py-2">数量</th>
              <th className="text-right px-3 py-2">金額</th>
              <th className="text-left px-3 py-2">ステータス</th>
              <th className="text-left px-3 py-2">発送</th>
              <th className="text-left px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((o) => {
              const shop = (o as { shops?: { company_name?: string } }).shops;
              const prod = (o as { products?: { title?: string; flow_type?: string } }).products;
              return (
                <tr key={o.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{formatJST(o.created_at)}</td>
                  <td className="px-3 py-2">{shop?.company_name ?? "—"}</td>
                  <td className="px-3 py-2">{prod?.title ?? "—"}</td>
                  <td className="px-3 py-2">{prod?.flow_type === "cut" ? "カット割" : "配分"}</td>
                  <td className="px-3 py-2 text-right">{o.requested_qty}{o.order_unit}</td>
                  <td className="px-3 py-2 text-right">{formatYen(o.total_price ?? 0)}</td>
                  <td className="px-3 py-2">{o.status}</td>
                  <td className="px-3 py-2">{o.shipping_status}</td>
                  <td className="px-3 py-2">
                    <a href={`/admin/orders/${o.id}`} className="text-brand-600 hover:underline">詳細</a>
                  </td>
                </tr>
              );
            })}
            {(!orders || orders.length === 0) && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-slate-500">
                  発注はまだありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        TODO: 絞り込み (ステータス/ショップ/期間)、一括承認、配分数量入力モーダル、楽観的ロックの実装
      </p>
    </div>
  );
}
