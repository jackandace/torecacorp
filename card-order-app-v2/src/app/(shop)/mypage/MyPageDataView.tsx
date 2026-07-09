"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import type { Order, Invoice, RankCode } from "@/types/database";
import { formatJST } from "@/lib/dates";
import { formatRate, formatYen, calcRebate } from "@/lib/rebate";
import { OrderStatusBadge, ShippingStatusBadge, InvoiceStatusBadge } from "@/components/StatusBadge";
import { Modal } from "@/components/Modal";
import { RANK_LABEL } from "@/constants/ranks";

type OrderWithProduct = Order & {
  products?: { title?: string | null; model_number?: string | null; image_url?: string | null } | null;
};

interface Props {
  orders: OrderWithProduct[];
  ordCount: number;
  ordPage: number;
  ordTotalPages: number;
  ordStatus: string;
  invoices: Invoice[];
  invCount: number;
  invPage: number;
  invTotalPages: number;
  shopRank: RankCode;
}

const ORDER_STATUSES = ["all", "リクエスト", "発注調整中", "仮確定", "確定", "キャンセル"] as const;

export function MyPageDataView(props: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [openOrder, setOpenOrder] = useState<OrderWithProduct | null>(null);
  const [openInvoice, setOpenInvoice] = useState<Invoice | null>(null);

  const setStatusFilter = (s: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (s === "all") p.delete("ord_status");
    else p.set("ord_status", s);
    p.delete("ord_page");
    router.push(`/mypage?${p.toString()}`);
  };

  const setPage = (key: "ord_page" | "inv_page", page: number) => {
    const p = new URLSearchParams(searchParams.toString());
    if (page <= 1) p.delete(key);
    else p.set(key, String(page));
    router.push(`/mypage?${p.toString()}`);
  };

  return (
    <>
      {/* 発注 */}
      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-lg font-semibold">発注履歴 ({props.ordCount} 件)</h2>
        </div>
        <div className="card p-3 mb-3 flex flex-wrap gap-1 text-xs">
          {ORDER_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full border ${
                props.ordStatus === s
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {s === "all" ? "すべて" : s}
            </button>
          ))}
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">日時</th>
                <th className="text-left px-3 py-2">商品</th>
                <th className="text-right px-3 py-2">数量</th>
                <th className="text-right px-3 py-2">金額</th>
                <th className="text-left px-3 py-2">ステータス</th>
                <th className="text-left px-3 py-2">発送</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {props.orders.map((o) => (
                <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setOpenOrder(o)}>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">{formatJST(o.created_at)}</td>
                  <td className="px-3 py-2">
                    <div>{o.products?.title ?? "—"}</div>
                    {o.products?.model_number && (
                      <div className="text-xs text-slate-500">{o.products.model_number}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{o.requested_qty}{o.order_unit}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {o.total_price ? formatYen(o.total_price) : "—"}
                  </td>
                  <td className="px-3 py-2"><OrderStatusBadge status={o.status} /></td>
                  <td className="px-3 py-2"><ShippingStatusBadge status={o.shipping_status} /></td>
                  <td className="px-3 py-2 text-xs text-brand-600">詳細</td>
                </tr>
              ))}
              {props.orders.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                  {props.ordStatus === "all" ? "まだ発注はありません" : "該当する発注がありません"}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {props.ordTotalPages > 1 && (
          <Pagination
            page={props.ordPage}
            totalPages={props.ordTotalPages}
            onChange={(p) => setPage("ord_page", p)}
          />
        )}
      </section>

      {/* 請求書 */}
      <section>
        <h2 className="text-lg font-semibold mb-3">請求書 ({props.invCount} 件)</h2>

        {/* 請求金額の計算方法 (お客様向け注意書き) */}
        <details className="card p-4 mb-3 text-sm">
          <summary className="cursor-pointer font-medium text-brand-700">請求金額の計算方法について</summary>
          <div className="mt-3 space-y-2 text-slate-600 text-[13px] leading-relaxed">
            <p>ご請求額は以下の考え方で算出しています（消費税は外税表示）。</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><b>案内単価</b> ＝ 定価 × 案内掛け率（お客様ごとの掛け率）</li>
              <li><b>小計</b> ＝ 案内単価 × 数量（BOX）</li>
              <li><b>リベート</b> ＝ 小計 × ランク割引率（現在のランクに応じた値引き）</li>
              <li><b>決済手数料</b> ＝ 小計 × 2%（消費税を含めると実質 税込2.2%）</li>
              <li><b>消費税</b> ＝（小計 − リベート ＋ 手数料）× 10%</li>
              <li><b>ご請求合計</b> ＝ 小計 − リベート ＋ 手数料 ＋ 消費税</li>
            </ul>
            <p className="pt-1">
              <b>カット対象商品</b>（メーカー提供数量が変動する商品）は、ご発注時に
              <b>保証金として50%（前受金）</b>を先にご請求し、
              <b>数量が確定した後に差額を精算</b>いたします。お預かりが確定金額を上回った場合は
              <b>差額を返金</b>（支払通知書をお送りします）。
            </p>
            <p className="text-slate-400 text-xs">※ 端数は一般的な商取引の丸め（小計・リベート・消費税は切り捨て、手数料は四捨五入）で処理しています。</p>
          </div>
        </details>

        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">請求書番号</th>
                <th className="text-left px-3 py-2">発行日</th>
                <th className="text-right px-3 py-2">合計</th>
                <th className="text-right px-3 py-2">入金済</th>
                <th className="text-left px-3 py-2">ステータス</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {props.invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setOpenInvoice(inv)}>
                  <td className="px-3 py-2 font-mono text-xs">{inv.invoice_number}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">{formatJST(inv.issued_at)}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{formatYen(inv.total_amount)}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{formatYen(inv.paid_amount)}</td>
                  <td className="px-3 py-2"><InvoiceStatusBadge status={inv.status} /></td>
                  <td className="px-3 py-2 text-xs text-brand-600">詳細</td>
                </tr>
              ))}
              {props.invoices.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                  請求書はまだ発行されていません
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {props.invTotalPages > 1 && (
          <Pagination
            page={props.invPage}
            totalPages={props.invTotalPages}
            onChange={(p) => setPage("inv_page", p)}
          />
        )}
      </section>

      {/* 発注詳細モーダル */}
      <Modal
        open={!!openOrder}
        onClose={() => setOpenOrder(null)}
        title="発注詳細"
        maxWidth="max-w-lg"
      >
        {openOrder && <OrderDetail order={openOrder} />}
      </Modal>

      {/* 請求書詳細モーダル */}
      <Modal
        open={!!openInvoice}
        onClose={() => setOpenInvoice(null)}
        title="請求書詳細"
        maxWidth="max-w-lg"
      >
        {openInvoice && <InvoiceDetail invoice={openInvoice} shopRank={props.shopRank} />}
      </Modal>
    </>
  );
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  return (
    <div className="flex justify-center items-center gap-3 mt-3 text-sm">
      {page > 1 ? (
        <button type="button" onClick={() => onChange(page - 1)} className="btn-secondary text-xs">← 前</button>
      ) : <span className="w-12" />}
      <span className="text-slate-500">{page} / {totalPages}</span>
      {page < totalPages ? (
        <button type="button" onClick={() => onChange(page + 1)} className="btn-secondary text-xs">次 →</button>
      ) : <span className="w-12" />}
    </div>
  );
}

function OrderDetail({ order }: { order: OrderWithProduct }) {
  const preview = order.confirmed_qty
    ? calcRebate({
        unitPrice: order.unit_price ?? 0,
        confirmedQty: order.confirmed_qty,
        listedRate: order.listed_rate,
        rebateRate: order.rebate_rate,
      })
    : null;

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <OrderStatusBadge status={order.status} />
        <ShippingStatusBadge status={order.shipping_status} />
      </div>
      <dl className="grid grid-cols-3 gap-y-2 text-sm">
        <dt className="text-slate-500">商品</dt>
        <dd className="col-span-2">{order.products?.title ?? "—"}{order.products?.model_number ? ` (${order.products.model_number})` : ""}</dd>
        <dt className="text-slate-500">発注日時</dt>
        <dd className="col-span-2">{formatJST(order.created_at)}</dd>
        <dt className="text-slate-500">希望数量</dt>
        <dd className="col-span-2">{order.requested_qty} {order.order_unit}</dd>
        <dt className="text-slate-500">仮確定 / 確定</dt>
        <dd className="col-span-2">{order.provisional_qty ?? "—"} / {order.confirmed_qty ?? "—"} BOX</dd>
        <dt className="text-slate-500">定価</dt>
        <dd className="col-span-2">{formatYen(order.unit_price ?? 0)}</dd>
        <dt className="text-slate-500">案内掛け率</dt>
        <dd className="col-span-2">{formatRate(order.listed_rate)}</dd>
        <dt className="text-slate-500">リベート率</dt>
        <dd className="col-span-2">{formatRate(order.rebate_rate)}</dd>
        {order.tracking_number && (
          <>
            <dt className="text-slate-500">追跡番号</dt>
            <dd className="col-span-2 font-mono text-xs">{order.tracking_number}</dd>
          </>
        )}
        {order.confirmed_at && (
          <>
            <dt className="text-slate-500">確定日時</dt>
            <dd className="col-span-2">{formatJST(order.confirmed_at)}</dd>
          </>
        )}
      </dl>

      {preview && (
        <div className="border-t pt-3">
          <div className="grid grid-cols-2 gap-y-1 text-sm">
            <div className="text-slate-500">小計</div>
            <div className="text-right">{formatYen(preview.subtotal)}</div>
            <div className="text-slate-500">リベート ({formatRate(order.rebate_rate)})</div>
            <div className="text-right text-emerald-600">-{formatYen(preview.rebateAmount)}</div>
            <div className="text-slate-500">課税対象額</div>
            <div className="text-right">{formatYen(preview.taxableAmount)}</div>
            <div className="text-slate-500">消費税</div>
            <div className="text-right">{formatYen(preview.taxAmount)}</div>
            <div className="font-bold border-t pt-1">合計 (税込)</div>
            <div className="text-right font-bold border-t pt-1">{formatYen(preview.totalAmount)}</div>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500">
        免責同意日時: {formatJST(order.consent_agreed_at)}
      </p>
    </div>
  );
}

function InvoiceDetail({ invoice, shopRank }: { invoice: Invoice; shopRank: RankCode }) {
  const remaining = invoice.total_amount - invoice.paid_amount;
  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <InvoiceStatusBadge status={invoice.status} />
        <span className="text-xs text-slate-500">発行時ランク: {RANK_LABEL[invoice.rank_at_issue]}</span>
      </div>
      <dl className="grid grid-cols-3 gap-y-2 text-sm">
        <dt className="text-slate-500">請求書番号</dt>
        <dd className="col-span-2 font-mono">{invoice.invoice_number}</dd>
        <dt className="text-slate-500">発行日</dt>
        <dd className="col-span-2">{formatJST(invoice.issued_at)}</dd>
        <dt className="text-slate-500">支払期限</dt>
        <dd className="col-span-2">{invoice.due_date ?? "—"}</dd>
        {invoice.paid_at && (
          <>
            <dt className="text-slate-500">入金日</dt>
            <dd className="col-span-2">{formatJST(invoice.paid_at)}</dd>
          </>
        )}
      </dl>

      <div className="border-t pt-3">
        <div className="grid grid-cols-2 gap-y-1 text-sm">
          <div className="text-slate-500">小計</div>
          <div className="text-right">{formatYen(invoice.subtotal)}</div>
          <div className="text-slate-500">リベート ({formatRate(invoice.rebate_rate)})</div>
          <div className="text-right text-emerald-600">-{formatYen(invoice.rebate_amount)}</div>
          <div className="text-slate-500">課税対象額</div>
          <div className="text-right">{formatYen(invoice.taxable_amount)}</div>
          <div className="text-slate-500">消費税</div>
          <div className="text-right">{formatYen(invoice.tax_amount)}</div>
          <div className="font-bold border-t pt-1">合計 (税込)</div>
          <div className="text-right font-bold border-t pt-1">{formatYen(invoice.total_amount)}</div>
          <div className="text-slate-700">入金済</div>
          <div className="text-right">{formatYen(invoice.paid_amount)}</div>
          {remaining > 0 && (
            <>
              <div className="text-rose-700 font-bold">残額</div>
              <div className="text-right text-rose-700 font-bold">{formatYen(remaining)}</div>
            </>
          )}
        </div>
      </div>

      {/* download ルートが都度署名＆未生成なら自動生成するため常に表示・失効しない */}
      <a
        href={`/api/invoices/${invoice.id}/pdf/download`}
        target="_blank"
        rel="noreferrer"
        className="btn-primary w-full text-center"
      >
        PDF をダウンロード
      </a>
      <p className="text-xs text-slate-500">
        ※ 表示ランク (現在: {RANK_LABEL[shopRank]}) は最新値で、発行時ランクとは異なる場合があります。
      </p>
    </div>
  );
}
