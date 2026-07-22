import { createClient } from "@/lib/supabase/server";
import { formatJST, orderCutoffDate, todayISOInJST } from "@/lib/dates";
import { formatYen } from "@/lib/rebate";

export const metadata = { title: "発注管理 | 管理" };
export const dynamic = "force-dynamic";

const PENDING_STATUSES = ["リクエスト", "発注調整中", "仮確定"];

export default async function OrdersAdminPage() {
  const supabase = createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("*, shops(company_name), products(title, flow_type, order_deadline)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  const today = todayISOInJST();
  // 締切(発注期限の3日前)を過ぎたのに未確定 = 要確定
  const needsConfirm = (o: { status: string; products?: { order_deadline?: string | null } | null }) => {
    if (!PENDING_STATUSES.includes(o.status)) return false;
    const cutoff = orderCutoffDate(o.products?.order_deadline ?? null);
    return !!cutoff && cutoff < today;
  };
  const needCount = (orders ?? []).filter((o) => needsConfirm(o as never)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">発注管理</h1>
        <div className="flex gap-2 text-xs">
          <a href="/admin/orders/new" className="btn-primary">+ 手動登録 (システム外受注)</a>
          <a href="/api/orders/export" className="btn-secondary">CSVエクスポート</a>
        </div>
      </div>

      {needCount > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          ⚠ 締切を過ぎたのに未確定の発注が <strong>{needCount} 件</strong> あります。個数を確定するとショップへ自動で確定通知が送られます。
        </div>
      )}

      {/* モバイル: カード表示 */}
      <div className="md:hidden space-y-2">
        {(orders ?? []).map((o) => {
          const shop = (o as { shops?: { company_name?: string } }).shops;
          const prod = (o as { products?: { title?: string; flow_type?: string } }).products;
          const confirmNeeded = needsConfirm(o as never);
          return (
            <a key={o.id} href={`/admin/orders/${o.id}`} className={`card p-3 block ${confirmNeeded ? "bg-amber-50" : ""}`}>
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{shop?.company_name ?? "—"}</div>
                  <div className="text-xs text-slate-500 truncate">{prod?.title ?? "—"}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {formatJST(o.created_at)} ・ {prod?.flow_type === "cut" ? "カット割" : "配分"} ・ {o.requested_qty}{o.order_unit}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-medium whitespace-nowrap">{formatYen(o.total_price ?? 0)}</div>
                  <div className="text-xs mt-1">
                    {o.status}
                    {confirmNeeded && <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-amber-500 text-white font-bold">要確定</span>}
                  </div>
                  <div className="text-[11px] text-slate-400">{o.shipping_status}</div>
                </div>
              </div>
            </a>
          );
        })}
        {(!orders || orders.length === 0) && (
          <div className="card p-6 text-center text-slate-500 text-sm">発注はまだありません</div>
        )}
      </div>

      {/* PC: テーブル表示 */}
      <div className="card overflow-x-auto hidden md:block">
        <table className="w-full text-sm min-w-[900px]">
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
              const confirmNeeded = needsConfirm(o as never);
              return (
                <tr key={o.id} className={`border-t border-slate-100 ${confirmNeeded ? "bg-amber-50" : ""}`}>
                  <td className="px-3 py-2">{formatJST(o.created_at)}</td>
                  <td className="px-3 py-2">{shop?.company_name ?? "—"}</td>
                  <td className="px-3 py-2">{prod?.title ?? "—"}</td>
                  <td className="px-3 py-2">{prod?.flow_type === "cut" ? "カット割" : "配分"}</td>
                  <td className="px-3 py-2 text-right">{o.requested_qty}{o.order_unit}</td>
                  <td className="px-3 py-2 text-right">{formatYen(o.total_price ?? 0)}</td>
                  <td className="px-3 py-2">
                    {o.status}
                    {confirmNeeded && (
                      <span className="ml-1 inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-white font-bold">要確定</span>
                    )}
                  </td>
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
