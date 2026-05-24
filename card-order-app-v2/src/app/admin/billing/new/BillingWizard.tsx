"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { RANK_LABEL } from "@/constants/ranks";
import { formatRate, formatYen, calcRebate, aggregateRebate } from "@/lib/rebate";
import type { RankCode } from "@/types/database";

interface ShopOption {
  id: string;
  company_name: string;
  current_rank: RankCode;
  rate_override: number | null;
  status?: string;
}

interface OrderLine {
  id: string;
  product_title: string;
  model_number: string | null;
  confirmed_qty: number;
  unit_price: number;
  listed_rate: number;
  rebate_rate: number;
  alreadyInvoiced: boolean;
}

export function BillingWizard({ shops }: { shops: ShopOption[] }) {
  const router = useRouter();
  const [shopId, setShopId] = useState<string>("");
  const [orders, setOrders] = useState<OrderLine[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dueDate, setDueDate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // ショップ変更 → 発注ロード
  useEffect(() => {
    if (!shopId) {
      setOrders([]);
      setSelected(new Set());
      return;
    }
    setLoading(true);
    fetch(`/api/billing/billable-orders?shop_id=${shopId}`)
      .then((r) => r.json())
      .then((data: { orders: OrderLine[] }) => {
        setOrders(data.orders ?? []);
        setSelected(new Set(data.orders?.filter((o) => !o.alreadyInvoiced).map((o) => o.id) ?? []));
      })
      .catch(() => setMessage("発注の取得に失敗しました"))
      .finally(() => setLoading(false));
  }, [shopId]);

  const totals = useMemo(() => {
    const lines = orders
      .filter((o) => selected.has(o.id))
      .map((o) =>
        calcRebate({
          unitPrice: o.unit_price,
          confirmedQty: o.confirmed_qty,
          listedRate: o.listed_rate,
          rebateRate: o.rebate_rate,
        }),
      );
    return aggregateRebate(lines);
  }, [orders, selected]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!shopId || selected.size === 0) {
      setMessage("ショップと発注を選択してください");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId,
          orderIds: Array.from(selected),
          dueDate: dueDate || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "発行失敗");
      setMessage(`発行しました: ${json.invoice.invoice_number}`);
      router.push(`/admin/billing/${json.invoice.id}`);
    } catch (e) {
      setMessage(`失敗: ${e instanceof Error ? e.message : "不明"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">ステップ 1: ショップ選択</h2>
        {shops.length === 0 ? (
          <p className="text-sm text-rose-600">
            選択可能なショップがありません。<a href="/admin/shops" className="underline">顧客管理</a>でショップを登録してください。
          </p>
        ) : (
          <>
            <select className="input max-w-md" value={shopId} onChange={(e) => setShopId(e.target.value)}>
              <option value="">— ショップを選択 ({shops.length} 件) —</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.company_name} ({RANK_LABEL[s.current_rank]}{s.status === "pending" ? " · 審査中" : ""})
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">
              ランクに応じたリベート率が適用されます。pending (審査中) のショップでも請求書発行は可能です。
            </p>
          </>
        )}
      </section>

      {shopId && (
        <section className="card p-5 space-y-4">
          <h2 className="font-semibold">ステップ 2: 発注を選択</h2>
          {loading && <p className="text-sm text-slate-500">読込中…</p>}
          {!loading && orders.length === 0 && (
            <p className="text-sm text-slate-500">このショップに確定済みの発注はありません</p>
          )}
          {!loading && orders.length > 0 && (
            <table className="w-full text-sm">
              <thead className="text-slate-600">
                <tr>
                  <th></th>
                  <th className="text-left px-2 py-2">商品</th>
                  <th className="text-right px-2 py-2">確定 (BOX)</th>
                  <th className="text-right px-2 py-2">単価</th>
                  <th className="text-right px-2 py-2">案内</th>
                  <th className="text-right px-2 py-2">リベート</th>
                  <th className="text-right px-2 py-2">小計</th>
                  <th className="text-right px-2 py-2">合計</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const line = calcRebate({
                    unitPrice: o.unit_price,
                    confirmedQty: o.confirmed_qty,
                    listedRate: o.listed_rate,
                    rebateRate: o.rebate_rate,
                  });
                  return (
                    <tr key={o.id} className={`border-t border-slate-100 ${o.alreadyInvoiced ? "text-slate-400" : ""}`}>
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(o.id)}
                          disabled={o.alreadyInvoiced}
                          onChange={() => toggle(o.id)}
                        />
                      </td>
                      <td className="px-2 py-2">
                        {o.product_title}
                        {o.alreadyInvoiced && <span className="ml-2 text-xs text-amber-600">(請求済)</span>}
                      </td>
                      <td className="px-2 py-2 text-right">{o.confirmed_qty}</td>
                      <td className="px-2 py-2 text-right">{formatYen(o.unit_price)}</td>
                      <td className="px-2 py-2 text-right">{formatRate(o.listed_rate)}</td>
                      <td className="px-2 py-2 text-right">{formatRate(o.rebate_rate)}</td>
                      <td className="px-2 py-2 text-right">{formatYen(line.subtotal)}</td>
                      <td className="px-2 py-2 text-right font-medium">{formatYen(line.totalAmount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      )}

      {selected.size > 0 && (
        <section className="card p-5 space-y-4">
          <h2 className="font-semibold">ステップ 3: 請求内容の確認</h2>
          <div className="grid grid-cols-2 gap-y-1 text-sm max-w-md">
            <div className="text-slate-500">小計</div>
            <div className="text-right">{formatYen(totals.subtotal)}</div>
            <div className="text-slate-500">リベート割引</div>
            <div className="text-right text-emerald-600">-{formatYen(totals.rebateAmount)}</div>
            <div className="text-slate-500">課税対象額</div>
            <div className="text-right">{formatYen(totals.taxableAmount)}</div>
            <div className="text-slate-500">消費税</div>
            <div className="text-right">{formatYen(totals.taxAmount)}</div>
            <div className="text-slate-700 font-bold border-t pt-1">請求合計 (税込)</div>
            <div className="text-right font-bold border-t pt-1">{formatYen(totals.totalAmount)}</div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-700">支払期限:</label>
            <input
              type="date"
              className="input w-44"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn-primary"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? "発行中…" : "請求書を発行"}
          </button>
          {message && <p className="text-sm">{message}</p>}
        </section>
      )}
    </div>
  );
}
