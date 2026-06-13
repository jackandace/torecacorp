"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus, ShippingStatus, OrderUnit, RankCode } from "@/types/database";
import { RANK_LABEL } from "@/constants/ranks";
import { formatRate, formatYen, calcRebate } from "@/lib/rebate";

interface ShopOption {
  id: string;
  company_name: string;
  current_rank: RankCode;
  rate_override: number | null;
}
interface ProductOption {
  id: string;
  series: string | null;
  title: string;
  model_number: string | null;
  price: number | null;
  actual_rate: number;
  rate_markup: number;
  ct_to_box: number;
  planned_qty: number | null;
  ordered_qty: number;
  flow_type: string;
}

// rank → デフォルトリベート率 (画面表示用の目安。確定値は API がランク設定から取得)
const DEFAULT_REBATE: Record<RankCode, number> = {
  platinum: 0.10, gold: 0.07, silver: 0.05, bronze: 0.03, standard: 0,
};

export function ManualOrderForm({ shops, products }: { shops: ShopOption[]; products: ProductOption[] }) {
  const router = useRouter();
  const [shopId, setShopId] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [productId, setProductId] = useState("");
  const [unit, setUnit] = useState<OrderUnit>("BOX");
  const [qty, setQty] = useState(12);
  const [confirmedQty, setConfirmedQty] = useState<string>("");
  const [status, setStatus] = useState<OrderStatus>("確定");
  const [shippingStatus, setShippingStatus] = useState<ShippingStatus>("未出荷");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [orderedAt, setOrderedAt] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const shop = shops.find((s) => s.id === shopId) ?? null;
  const product = products.find((p) => p.id === productId) ?? null;

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products.slice(0, 50);
    return products
      .filter((p) => `${p.series ?? ""} ${p.title} ${p.model_number ?? ""}`.toLowerCase().includes(q))
      .slice(0, 50);
  }, [products, productQuery]);

  const qtyInBox = product ? (unit === "CT" ? qty * product.ct_to_box : qty) : 0;
  const effConfirmed = confirmedQty === "" ? qtyInBox : parseInt(confirmedQty || "0", 10);
  const listedRate = product
    ? (shop?.rate_override ?? product.actual_rate + product.rate_markup)
    : 0;
  const rebateRate = shop ? DEFAULT_REBATE[shop.current_rank] : 0;

  const preview = product && effConfirmed > 0
    ? calcRebate({
        unitPrice: product.price ?? 0,
        confirmedQty: effConfirmed,
        listedRate,
        rebateRate,
      })
    : null;

  const handleSubmit = async () => {
    setMessage(null);
    if (!shopId || !productId) {
      setMessage({ kind: "err", text: "ショップと商品を選択してください" });
      return;
    }
    if (qty <= 0) {
      setMessage({ kind: "err", text: "数量を入力してください" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/orders/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId,
          productId,
          unit,
          qty,
          confirmedQty: status === "確定" || status === "仮確定" ? effConfirmed : null,
          status,
          shippingStatus,
          trackingNumber: trackingNumber || null,
          orderedAt,
          note: note || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "登録失敗");
      router.push(`/admin/orders/${json.order.id}`);
    } catch (e) {
      setMessage({ kind: "err", text: `失敗: ${e instanceof Error ? e.message : "不明"}` });
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* ショップ */}
      <section className="card p-5 space-y-3">
        <h2 className="font-semibold text-sm">1. ショップ</h2>
        <select className="input" value={shopId} onChange={(e) => setShopId(e.target.value)}>
          <option value="">— ショップを選択 —</option>
          {shops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.company_name} ({RANK_LABEL[s.current_rank]})
            </option>
          ))}
        </select>
      </section>

      {/* 商品 */}
      <section className="card p-5 space-y-3">
        <h2 className="font-semibold text-sm">2. 商品</h2>
        <input
          type="search"
          className="input"
          placeholder="シリーズ・商品名・型番で絞り込み"
          value={productQuery}
          onChange={(e) => setProductQuery(e.target.value)}
        />
        <select className="input" value={productId} onChange={(e) => setProductId(e.target.value)} size={6}>
          {filteredProducts.map((p) => {
            const stock = (p.planned_qty ?? 0) - p.ordered_qty;
            return (
              <option key={p.id} value={p.id}>
                [{p.series ?? "—"}] {p.title} {p.model_number ? `(${p.model_number})` : ""} / 残{stock}BOX
              </option>
            );
          })}
        </select>
        <p className="text-xs text-slate-500">
          商品がリストにない場合は先に <a href="/admin/inventory/new" className="text-brand-600 underline">在庫管理 → 新規登録</a> してください。
        </p>
      </section>

      {/* 数量・ステータス */}
      <section className="card p-5 space-y-4">
        <h2 className="font-semibold text-sm">3. 数量・状態</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div>
            <label className="block text-xs text-slate-600 mb-1">単位</label>
            <select className="input" value={unit} onChange={(e) => setUnit(e.target.value as OrderUnit)}>
              <option value="BOX">BOX</option>
              <option value="CT">CT</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">受注数量</label>
            <input type="number" min={1} className="input" value={qty} onChange={(e) => setQty(parseInt(e.target.value || "0", 10))} />
            {product && unit === "CT" && (
              <p className="text-xs text-slate-500 mt-1">= {qtyInBox} BOX</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">確定数量 (BOX・空欄=受注数量)</label>
            <input type="number" min={0} className="input" placeholder={String(qtyInBox)} value={confirmedQty} onChange={(e) => setConfirmedQty(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">発注ステータス</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
              <option value="確定">確定 (在庫を引き当てる)</option>
              <option value="仮確定">仮確定</option>
              <option value="リクエスト">リクエスト</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">発送ステータス</label>
            <select className="input" value={shippingStatus} onChange={(e) => setShippingStatus(e.target.value as ShippingStatus)}>
              {(["未出荷", "準備中", "出荷済", "配送中", "完了"] as ShippingStatus[]).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">受注日</label>
            <input type="date" className="input" value={orderedAt} onChange={(e) => setOrderedAt(e.target.value)} />
            <p className="text-xs text-slate-500 mt-1">月次集計・ランク計算に反映されます</p>
          </div>
          <div className="col-span-2 md:col-span-3">
            <label className="block text-xs text-slate-600 mb-1">追跡番号 (出荷済の場合)</label>
            <input className="input" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
          </div>
          <div className="col-span-2 md:col-span-3">
            <label className="block text-xs text-slate-600 mb-1">メモ (受注経緯など)</label>
            <input className="input" placeholder="例: 5/20 メールにて受注" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
      </section>

      {/* 金額プレビュー */}
      {preview && shop && product && (
        <section className="card p-5">
          <h2 className="font-semibold text-sm mb-3">金額プレビュー</h2>
          <div className="grid grid-cols-2 gap-y-1 text-sm max-w-md">
            <div className="text-slate-500">適用掛け率</div>
            <div className="text-right">{formatRate(listedRate)}{shop.rate_override != null && " (個別設定)"}</div>
            <div className="text-slate-500">リベート率 ({RANK_LABEL[shop.current_rank]})</div>
            <div className="text-right">{formatRate(rebateRate)}</div>
            <div className="text-slate-500">小計</div>
            <div className="text-right">{formatYen(preview.subtotal)}</div>
            <div className="text-slate-500">リベート</div>
            <div className="text-right text-emerald-600">-{formatYen(preview.rebateAmount)}</div>
            <div className="text-slate-500">消費税</div>
            <div className="text-right">{formatYen(preview.taxAmount)}</div>
            <div className="font-bold border-t pt-1">合計 (税込)</div>
            <div className="text-right font-bold border-t pt-1">{formatYen(preview.totalAmount)}</div>
          </div>
        </section>
      )}

      {message && (
        <p className={`text-sm ${message.kind === "ok" ? "text-emerald-700" : "text-rose-700"}`}>{message.text}</p>
      )}

      <button type="button" className="btn-primary" disabled={busy} onClick={handleSubmit}>
        {busy ? "登録中…" : "発注を登録する"}
      </button>
      <p className="text-xs text-slate-500">
        ※ 登録後、ショップのマイページに発注履歴として表示されます (代理登録の旨はメモに自動記録)。
      </p>
    </div>
  );
}
