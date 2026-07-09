import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatJST } from "@/lib/dates";
import { formatRate, formatYen } from "@/lib/rebate";
import { RANK_LABEL } from "@/constants/ranks";
import { PaymentForm } from "./PaymentForm";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, shops(company_name, address, current_rank)")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!invoice) notFound();

  const shop = invoice.shops as { company_name?: string; address?: string | null; current_rank?: string } | null;

  const { data: items } = await supabase
    .from("invoice_items")
    .select("*, orders(*, products(title, model_number))")
    .eq("invoice_id", invoice.id);

  const remaining = invoice.total_amount - invoice.paid_amount;
  const kind = invoice.invoice_kind;
  const KIND_LABEL: Record<string, string> = {
    normal: "通常請求", deposit: "保証金(前受金)", final: "最終精算(差額)", refund: "返金",
  };
  const KIND_TONE: Record<string, string> = {
    normal: "bg-slate-100 text-slate-700",
    deposit: "bg-amber-100 text-amber-800",
    final: "bg-indigo-100 text-indigo-800",
    refund: "bg-rose-100 text-rose-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/billing" className="text-sm text-brand-600 hover:underline">
            ← 請求一覧
          </Link>
          <h1 className="text-2xl font-bold mt-1 flex items-center gap-2">
            {invoice.invoice_number}
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${KIND_TONE[kind]}`}>{KIND_LABEL[kind]}</span>
          </h1>
        </div>
        <div className="flex gap-2">
          {kind === "refund" ? (
            // 返金は支払通知書 (都度署名・未生成なら自動生成)
            <a className="btn-secondary" href={`/api/invoices/${invoice.id}/payment-notice/download`} target="_blank" rel="noreferrer">
              支払通知書を開く
            </a>
          ) : (
            <>
              {/* 都度署名し直す download ルート経由なのでリンクは失効しない。未生成なら自動生成 */}
              <a className="btn-secondary" href={`/api/invoices/${invoice.id}/pdf/download`} target="_blank" rel="noreferrer">
                PDF を開く
              </a>
              <form action={`/api/invoices/${invoice.id}/pdf`} method="post">
                <button className="btn-primary">PDF を再生成</button>
              </form>
            </>
          )}
          {kind === "deposit" && (
            <form action={`/api/invoices/${invoice.id}/settle`} method="post">
              <button className="btn-primary">最終精算する</button>
            </form>
          )}
          {kind !== "refund" && invoice.status === "入金済み" && (
            <form action={`/api/invoices/${invoice.id}/receipt`} method="post">
              <button className="btn-secondary">領収書を発行</button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <section className="card p-5">
            <h2 className="font-semibold mb-3">請求情報</h2>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-slate-500">請求先</dt>
              <dd>
                {shop?.company_name}{" "}
                {shop?.current_rank && `(${RANK_LABEL[shop.current_rank as keyof typeof RANK_LABEL]})`}
              </dd>
              <dt className="text-slate-500">住所</dt>
              <dd>{shop?.address ?? "—"}</dd>
              <dt className="text-slate-500">発行日</dt>
              <dd>{formatJST(invoice.issued_at)}</dd>
              <dt className="text-slate-500">支払期限</dt>
              <dd>{invoice.due_date ?? "—"}</dd>
              <dt className="text-slate-500">発行時ランク</dt>
              <dd>{RANK_LABEL[invoice.rank_at_issue]}</dd>
              <dt className="text-slate-500">適用リベート率</dt>
              <dd>{formatRate(invoice.rebate_rate)}</dd>
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="font-semibold mb-3">明細</h2>
            <table className="w-full text-sm">
              <thead className="text-slate-600">
                <tr>
                  <th className="text-left px-2 py-2">商品</th>
                  <th className="text-right px-2 py-2">数量</th>
                  <th className="text-right px-2 py-2">単価</th>
                  <th className="text-right px-2 py-2">掛け率</th>
                  <th className="text-right px-2 py-2">小計</th>
                </tr>
              </thead>
              <tbody>
                {(items ?? []).map((it) => {
                  const o = it.orders as {
                    confirmed_qty: number | null;
                    unit_price: number | null;
                    listed_rate: number;
                    products?: { title?: string; model_number?: string | null };
                  } | null;
                  const product = o?.products;
                  return (
                    <tr key={it.id} className="border-t border-slate-100">
                      <td className="px-2 py-2">
                        {product?.title}
                        {product?.model_number && (
                          <span className="text-xs text-slate-500 ml-1">({product.model_number})</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">{o?.confirmed_qty ?? 0}</td>
                      <td className="px-2 py-2 text-right">{formatYen(o?.unit_price ?? 0)}</td>
                      <td className="px-2 py-2 text-right">{formatRate(o?.listed_rate ?? 0)}</td>
                      <td className="px-2 py-2 text-right">{formatYen(it.line_total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="card p-5 space-y-2 text-sm">
            <h2 className="font-semibold mb-2">金額</h2>
            {kind === "deposit" ? (
              <div className="flex justify-between font-bold"><span>保証金額 (前受金・税抜)</span><span>{formatYen(invoice.total_amount)}</span></div>
            ) : (
              <>
                <div className="flex justify-between"><span>小計</span><span>{formatYen(invoice.subtotal)}</span></div>
                {invoice.rebate_amount > 0 && (
                  <div className="flex justify-between text-emerald-600"><span>リベート</span><span>-{formatYen(invoice.rebate_amount)}</span></div>
                )}
                {invoice.fee_amount > 0 && (
                  <div className="flex justify-between"><span>手数料(2%)</span><span>{formatYen(invoice.fee_amount)}</span></div>
                )}
                <div className="flex justify-between"><span>課税対象額</span><span>{formatYen(invoice.taxable_amount)}</span></div>
                <div className="flex justify-between"><span>消費税</span><span>{formatYen(invoice.tax_amount)}</span></div>
                {(kind === "final" || kind === "refund") && (
                  <>
                    <div className="flex justify-between"><span>確定金額 (税込)</span><span>{formatYen(invoice.taxable_amount + invoice.tax_amount)}</span></div>
                    <div className="flex justify-between text-amber-700"><span>前受金充当</span><span>-{formatYen(invoice.deposit_applied)}</span></div>
                  </>
                )}
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>{kind === "final" ? "今回ご請求額" : kind === "refund" ? "返金額" : "合計 (税込)"}</span>
                  <span>{formatYen(invoice.total_amount)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-slate-700"><span>{kind === "refund" ? "返金済" : "入金済"}</span><span>{formatYen(invoice.paid_amount)}</span></div>
            <div className="flex justify-between font-bold text-rose-600"><span>残額</span><span>{formatYen(remaining)}</span></div>
            <div className="text-xs text-slate-500 pt-2">
              状態: {kind === "refund" ? (invoice.status === "入金済み" ? "返金済み" : "返金待ち") : invoice.status}
            </div>
          </section>

          <PaymentForm
            invoiceId={invoice.id}
            totalAmount={invoice.total_amount}
            paidAmount={invoice.paid_amount}
            lastUpdatedAt={invoice.updated_at}
            kind={kind}
          />
        </aside>
      </div>
    </div>
  );
}
