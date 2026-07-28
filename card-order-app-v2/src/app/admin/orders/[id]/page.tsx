import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatJST } from "@/lib/dates";
import { formatRate, formatYen, getListedRate, calcRebate } from "@/lib/rebate";
import { RANK_LABEL } from "@/constants/ranks";
import { OrderActionForm } from "./OrderActionForm";
import { DepositInvoiceButton } from "./DepositInvoiceButton";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*, shops(id, company_name, current_rank, rate_override), products(id, title, model_number, category, actual_rate, rate_markup, flow_type, planned_qty, ordered_qty, ct_to_box, min_order_box, price, deposit_rate)")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!order) notFound();

  const shop = (order as { shops?: { id: string; company_name: string; current_rank: keyof typeof RANK_LABEL; rate_override: number | null } }).shops;
  const product = (order as {
    products?: {
      id: string;
      title: string;
      model_number: string | null;
      category: string;
      actual_rate: number;
      rate_markup: number;
      flow_type: string;
      planned_qty: number | null;
      ordered_qty: number;
      ct_to_box: number;
      min_order_box: number;
      price: number | null;
      deposit_rate: number | null;
    };
  }).products;

  const { data: auditLogs } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("target_table", "orders")
    .eq("target_id", params.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const listedRate = product ? getListedRate(product, shop ?? null) : order.listed_rate;

  // 確定数量がある場合の試算
  const preview = order.confirmed_qty
    ? calcRebate({
        unitPrice: order.unit_price ?? 0,
        confirmedQty: order.confirmed_qty,
        listedRate: order.listed_rate,
        rebateRate: order.rebate_rate,
      })
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/orders" className="text-sm text-brand-600 hover:underline">
            ← 発注一覧
          </Link>
          <h1 className="text-2xl font-bold mt-1">発注詳細</h1>
        </div>
        <div className="flex items-center flex-wrap justify-end gap-2">
          {product?.flow_type === "cut" && <DepositInvoiceButton orderId={order.id} defaultRate={product.deposit_rate ?? undefined} />}
          <span className="badge bg-slate-100 text-slate-700">ID: {order.id.slice(0, 8)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <section className="card p-5">
            <h2 className="font-semibold mb-3">基本情報</h2>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-slate-500">ショップ</dt>
              <dd>
                {shop?.company_name ?? "—"} ({shop && RANK_LABEL[shop.current_rank]})
              </dd>
              <dt className="text-slate-500">商品</dt>
              <dd>
                {product?.title} {product?.model_number ? `(${product.model_number})` : ""}
              </dd>
              <dt className="text-slate-500">フロー</dt>
              <dd>{product?.flow_type === "cut" ? "カット割" : "配分確定品"}</dd>
              <dt className="text-slate-500">希望数量</dt>
              <dd>
                {order.requested_qty} {order.order_unit}
                {order.requested_qty_box != null && ` (${order.requested_qty_box}BOX 換算)`}
              </dd>
              <dt className="text-slate-500">仮確定 / 確定</dt>
              <dd>
                {order.provisional_qty ?? "—"} / {order.confirmed_qty ?? "—"}
              </dd>
              <dt className="text-slate-500">定価</dt>
              <dd>{formatYen(order.unit_price ?? 0)}</dd>
              <dt className="text-slate-500">案内掛け率</dt>
              <dd>
                {formatRate(order.listed_rate)}
                {Math.abs(order.listed_rate - listedRate) > 1e-6 && (
                  <span className="text-amber-600 text-xs ml-2">(現マスター: {formatRate(listedRate)})</span>
                )}
              </dd>
              <dt className="text-slate-500">リベート率</dt>
              <dd>{formatRate(order.rebate_rate)}</dd>
              <dt className="text-slate-500">免責同意</dt>
              <dd>{formatJST(order.consent_agreed_at)}</dd>
              <dt className="text-slate-500">作成日時</dt>
              <dd>{formatJST(order.created_at)}</dd>
              {order.confirmed_at && (
                <>
                  <dt className="text-slate-500">確定日時</dt>
                  <dd>{formatJST(order.confirmed_at)}</dd>
                </>
              )}
              {order.admin_note && (
                <>
                  <dt className="text-slate-500">管理メモ</dt>
                  <dd className="whitespace-pre-wrap">{order.admin_note}</dd>
                </>
              )}
            </dl>
          </section>

          {preview && (
            <section className="card p-5">
              <h2 className="font-semibold mb-3">金額試算 (確定数量ベース)</h2>
              <div className="grid grid-cols-2 gap-y-1 text-sm">
                <div className="text-slate-500">小計</div>
                <div className="text-right">{formatYen(preview.subtotal)}</div>
                <div className="text-slate-500">リベート ({formatRate(order.rebate_rate)})</div>
                <div className="text-right text-emerald-600">-{formatYen(preview.rebateAmount)}</div>
                <div className="text-slate-500">課税対象額</div>
                <div className="text-right">{formatYen(preview.taxableAmount)}</div>
                <div className="text-slate-500">消費税</div>
                <div className="text-right">{formatYen(preview.taxAmount)}</div>
                <div className="text-slate-500 font-bold border-t pt-1">合計</div>
                <div className="text-right font-bold border-t pt-1">{formatYen(preview.totalAmount)}</div>
              </div>
            </section>
          )}

          <section className="card p-5">
            <h2 className="font-semibold mb-3">操作履歴</h2>
            {!auditLogs || auditLogs.length === 0 ? (
              <p className="text-sm text-slate-500">履歴はまだありません</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {auditLogs.map((log) => (
                  <li key={log.id} className="border-b border-slate-100 pb-2">
                    <div className="text-xs text-slate-500">{formatJST(log.created_at)}</div>
                    <div className="font-mono text-xs">{log.action}</div>
                    {log.after_data ? (
                      <pre className="text-xs bg-slate-50 p-2 mt-1 rounded">
                        {JSON.stringify(log.after_data, null, 2)}
                      </pre>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <OrderActionForm
            orderId={order.id}
            currentStatus={order.status}
            currentShippingStatus={order.shipping_status}
            requestedQtyBox={order.requested_qty_box ?? order.requested_qty}
            provisionalQty={order.provisional_qty}
            confirmedQty={order.confirmed_qty}
            flowType={product?.flow_type ?? "haibun"}
            adminNote={order.admin_note ?? ""}
            trackingNumber={order.tracking_number ?? ""}
            lastUpdatedAt={order.updated_at}
          />
        </aside>
      </div>
    </div>
  );
}
