"use client";

import { useState } from "react";
import Link from "next/link";
import type { OrderUnit, Product } from "@/types/database";
import { formatYen } from "@/lib/rebate";
import { validateOrderQty } from "@/lib/orders";
import { upsertCartLine } from "@/lib/cart-storage";

type PanelProduct = Pick<Product, "id" | "title" | "min_order_box" | "ct_to_box" | "planned_qty" | "ordered_qty" | "status" | "flow_type">;

/** 商品詳細ページの発注パネル: 発注ページと共通のカートに追加する */
export function ProductOrderPanel({
  product,
  shopId,
  shopPendingBox,
  unitPrice,
  listedRate,
  orderable,
  disabledReason,
}: {
  product: PanelProduct;
  shopId: string | null;
  shopPendingBox: number;
  unitPrice: number;
  listedRate: number;
  orderable: boolean;
  disabledReason: string | null;
}) {
  const defaultBox = Math.max(product.min_order_box, product.ct_to_box);
  const [unit, setUnit] = useState<OrderUnit>("BOX");
  const [qty, setQty] = useState<number>(defaultBox);
  const [message, setMessage] = useState<string | null>(null);
  const [added, setAdded] = useState<number | null>(null); // 追加後のカート件数

  const changeUnit = (u: OrderUnit) => {
    setUnit(u);
    setQty(u === "CT" ? 1 : defaultBox);
    setAdded(null);
  };

  const qtyInBox = unit === "CT" ? qty * product.ct_to_box : qty;
  const subtotal = Math.floor(unitPrice * qtyInBox * listedRate);

  const addToCart = () => {
    setMessage(null);
    if (!shopId) { setMessage("ショップ情報が見つかりません"); return; }
    const result = validateOrderQty({ product, orderUnit: unit, qty, shopPendingBox });
    if (!result.ok) { setMessage(result.error ?? "数量を確認してください"); return; }
    setAdded(upsertCartLine(shopId, { productId: product.id, unit, qty, title: product.title }));
  };

  if (!orderable) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        {disabledReason ?? "現在発注できません"}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex rounded border border-slate-300 overflow-hidden text-sm">
          {(["BOX", "CT"] as OrderUnit[]).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => changeUnit(u)}
              className={`px-3 py-1.5 ${unit === u ? "bg-brand-600 text-white" : "bg-white text-slate-700"} ${u === "CT" ? "border-l border-slate-300" : ""}`}
            >
              {u}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={1}
          className="input w-24 text-right"
          value={qty}
          onChange={(e) => { setQty(parseInt(e.target.value || "0", 10)); setAdded(null); }}
        />
        <span className="text-sm text-slate-500">= {qtyInBox} BOX</span>
      </div>

      <div className="text-sm text-slate-600">
        概算小計（税抜・リベート前） <span className="font-semibold text-slate-900">{formatYen(subtotal)}</span>
      </div>

      <button type="button" className="btn-primary w-full" onClick={addToCart}>
        カートに追加
      </button>
      {message && <p className="text-xs text-rose-600">{message}</p>}
      {added !== null && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 space-y-2">
          <p className="font-semibold">カートに追加しました（カート {added} 件）</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/cart" className="btn-primary text-xs">カートを見て発注する</Link>
            <Link href="/order" className="btn-secondary text-xs">ほかの商品を見る</Link>
          </div>
          <p className="text-xs text-emerald-700">発注の確定（同意・送信）はカートから行います。</p>
        </div>
      )}
    </div>
  );
}
