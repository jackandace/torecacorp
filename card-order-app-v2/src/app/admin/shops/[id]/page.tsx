import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatJST } from "@/lib/dates";
import { formatRate, formatYen } from "@/lib/rebate";
import { RANK_LABEL } from "@/constants/ranks";
import { ShopEditForm } from "./ShopEditForm";
import { OathUpload } from "./OathUpload";
import { BusinessDocUpload } from "./BusinessDocUpload";
import { LegacyInvoiceUpload } from "./LegacyInvoiceUpload";
import { BUSINESS_TYPE_LABEL } from "@/constants/business";
import { shopRefundAccount } from "@/lib/refund-account";

export const dynamic = "force-dynamic";

export default async function ShopDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: shop } = await supabase
    .from("shops")
    .select("*")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!shop) notFound();

  const [{ data: rankHistory }, { data: invoices }, { data: surveys }, { count: orderCount }] = await Promise.all([
    supabase
      .from("shop_rank_history")
      .select("*")
      .eq("shop_id", shop.id)
      .order("month", { ascending: false })
      .limit(24),
    supabase
      .from("invoices")
      .select("invoice_number, total_amount, paid_amount, status, issued_at")
      .eq("shop_id", shop.id)
      .is("deleted_at", null)
      .order("issued_at", { ascending: false })
      .limit(10),
    supabase
      .from("surveys")
      .select("*")
      .eq("shop_id", shop.id)
      .is("deleted_at", null)
      .order("surveyed_at", { ascending: false }),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("shop_id", shop.id)
      .is("deleted_at", null),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/shops" className="text-sm text-brand-600 hover:underline">← 顧客一覧</Link>
          <h1 className="text-2xl font-bold mt-1">{shop.company_name}</h1>
        </div>
        <div className="text-right text-sm text-slate-500">
          <div>ランク: <span className="font-medium text-slate-800">{RANK_LABEL[shop.current_rank]}</span></div>
          <div>累計発注: {orderCount ?? 0} 件</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ShopEditForm shop={shop} />

          <section className="card p-5">
            <h2 className="font-semibold mb-3">ランク変動履歴</h2>
            <table className="w-full text-sm">
              <thead className="text-slate-600">
                <tr>
                  <th className="text-left px-2 py-1">月</th>
                  <th className="text-right px-2 py-1">発注額</th>
                  <th className="text-left px-2 py-1">変動</th>
                  <th className="text-right px-2 py-1">リベート</th>
                  <th className="text-left px-2 py-1">記録日時</th>
                </tr>
              </thead>
              <tbody>
                {(rankHistory ?? []).map((h) => (
                  <tr key={h.id} className="border-t border-slate-100">
                    <td className="px-2 py-1">{h.month}</td>
                    <td className="px-2 py-1 text-right">{formatYen(h.monthly_amount)}</td>
                    <td className="px-2 py-1">
                      {RANK_LABEL[h.prev_rank]} → {RANK_LABEL[h.new_rank]}
                    </td>
                    <td className="px-2 py-1 text-right">{formatRate(h.rebate_rate)}</td>
                    <td className="px-2 py-1 text-xs text-slate-500">{formatJST(h.changed_at)}</td>
                  </tr>
                ))}
                {(!rankHistory || rankHistory.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-2 py-4 text-center text-slate-500">
                      ランク変動履歴はありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="card p-5">
            <h2 className="font-semibold mb-3">直近の請求書</h2>
            <table className="w-full text-sm">
              <thead className="text-slate-600">
                <tr>
                  <th className="text-left px-2 py-1">請求書番号</th>
                  <th className="text-right px-2 py-1">合計</th>
                  <th className="text-right px-2 py-1">入金</th>
                  <th className="text-left px-2 py-1">状態</th>
                  <th className="text-left px-2 py-1">発行日</th>
                </tr>
              </thead>
              <tbody>
                {(invoices ?? []).map((inv) => (
                  <tr key={inv.invoice_number} className="border-t border-slate-100">
                    <td className="px-2 py-1">{inv.invoice_number}</td>
                    <td className="px-2 py-1 text-right">{formatYen(inv.total_amount)}</td>
                    <td className="px-2 py-1 text-right">{formatYen(inv.paid_amount)}</td>
                    <td className="px-2 py-1">{inv.status}</td>
                    <td className="px-2 py-1 text-xs">{formatJST(inv.issued_at)}</td>
                  </tr>
                ))}
                {(!invoices || invoices.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-2 py-4 text-center text-slate-500">
                      請求書はまだありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="card p-5">
            <h2 className="font-semibold mb-3">販売店調査履歴</h2>
            {(!surveys || surveys.length === 0) ? (
              <p className="text-sm text-slate-500">調査履歴はまだありません</p>
            ) : (
              <ul className="space-y-2">
                {surveys.map((s) => (
                  <li key={s.id} className="border-b border-slate-100 pb-2">
                    <div className="text-xs text-slate-500">
                      {s.surveyed_at} / {s.surveyor ?? "—"}
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{s.content}</div>
                    {s.pdf_url && (
                      <a className="text-xs text-brand-600 hover:underline" href={s.pdf_url}>
                        PDF を開く
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="card p-5 space-y-2 text-sm">
            <h2 className="font-semibold">基本情報</h2>
            <div className="text-slate-500 text-xs">登録</div>
            <div>{formatJST(shop.created_at)}</div>
            <div className="text-slate-500 text-xs">最終更新</div>
            <div>{formatJST(shop.updated_at)}</div>
            <div className="text-slate-500 text-xs">担当者</div>
            <div>{shop.contact_name}</div>
            <div className="text-slate-500 text-xs">メール</div>
            <div className="break-all">{shop.email}</div>
            <div className="text-slate-500 text-xs">電話</div>
            <div>{shop.phone ?? "—"}</div>
            <div className="text-slate-500 text-xs">納品先</div>
            <div className="whitespace-pre-wrap text-xs">{shop.delivery_address ?? "—"}</div>
          </section>

          <section className="card p-5 space-y-2 text-sm">
            <h2 className="font-semibold">返金先口座</h2>
            {(() => {
              const acc = shopRefundAccount(shop);
              return acc ? (
                <div className="space-y-0.5">
                  <div>{acc.refund_bank_name} {acc.refund_bank_branch}</div>
                  <div>{acc.refund_account_type} {acc.refund_account_number}</div>
                  <div className="text-slate-600">名義: {acc.refund_account_holder}</div>
                  {shop.refund_account_updated_at && (
                    <div className="text-xs text-slate-400 pt-1">更新: {formatJST(shop.refund_account_updated_at)}</div>
                  )}
                </div>
              ) : (
                <p className="text-slate-500">未登録(返金時は支払通知書に手書き欄)</p>
              );
            })()}
          </section>

          <section className="card p-5 space-y-2">
            <h2 className="font-semibold text-sm">宣誓書</h2>
            <OathUpload
              shopId={shop.id}
              oathSignedAt={shop.oath_signed_at}
              oathExpiresAt={shop.oath_expires_at}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}
