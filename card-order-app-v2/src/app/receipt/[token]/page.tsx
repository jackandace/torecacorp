import { createAdminClient } from "@/lib/supabase/admin";
import { formatJST } from "@/lib/dates";
import { ReceiptConfirm } from "./ReceiptConfirm";

export const dynamic = "force-dynamic";
export const metadata = { title: "受領確認 | トレカ商事" };

export default async function ReceiptPage({ params }: { params: { token: string } }) {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, received_at, delivered_at, tracking_number, carrier, confirmed_qty, order_unit, shops(company_name), products(title)")
    .eq("receipt_token", params.token)
    .is("deleted_at", null)
    .maybeSingle();

  const shop = order?.shops as unknown as { company_name?: string } | null;
  const product = order?.products as unknown as { title?: string } | null;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-7 sm:p-9">
        <div className="text-center mb-5">
          <div className="text-xs tracking-widest text-brand-600 font-bold">トレカ商事</div>
          <h1 className="text-xl font-bold mt-1">商品受領のご確認</h1>
        </div>

        {!order || !order.delivered_at ? (
          <p className="text-sm text-slate-600 text-center">
            リンクが無効か、有効期限が切れています。お手数ですが担当者までご連絡ください。
          </p>
        ) : order.received_at ? (
          <div className="text-center space-y-2">
            <div className="text-4xl">✅</div>
            <p className="font-semibold">受領済みです</p>
            <p className="text-xs text-slate-500">受領日時：{formatJST(order.received_at)}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-1">
              <div><span className="text-slate-500">宛先：</span>{shop?.company_name ?? "—"} 様</div>
              <div><span className="text-slate-500">商品：</span>{product?.title ?? "—"}</div>
              <div><span className="text-slate-500">数量：</span>{order.confirmed_qty ?? "—"} {order.order_unit}</div>
              <div><span className="text-slate-500">配送：</span>{order.carrier ?? "—"} / {order.tracking_number ?? "—"}</div>
              <div><span className="text-slate-500">納品日：</span>{formatJST(order.delivered_at)}</div>
            </div>
            <p className="text-xs text-slate-500">
              商品が届きましたら、下のボタンを押して受領を確定してください。（ログイン不要）
            </p>
            <ReceiptConfirm token={params.token} />
          </div>
        )}
      </div>
    </main>
  );
}
