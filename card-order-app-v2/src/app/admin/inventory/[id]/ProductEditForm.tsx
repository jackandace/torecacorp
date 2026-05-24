"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product, ProductCategory, ProductStatus, FlowType } from "@/types/database";
import { formatRate } from "@/lib/rebate";

export function ProductEditForm({ product }: { product: Product }) {
  const router = useRouter();
  const [series, setSeries] = useState(product.series ?? "");
  const [title, setTitle] = useState(product.title);
  const [fullName, setFullName] = useState(product.full_name ?? "");
  const [modelNumber, setModelNumber] = useState(product.model_number ?? "");
  const [category, setCategory] = useState<ProductCategory>(product.category);
  const [actualRate, setActualRate] = useState(product.actual_rate);
  const [rateMarkup, setRateMarkup] = useState(product.rate_markup);
  const [price, setPrice] = useState(product.price ?? 0);
  const [plannedQty, setPlannedQty] = useState(product.planned_qty ?? 0);
  const [ctToBox, setCtToBox] = useState(product.ct_to_box);
  const [minOrderBox, setMinOrderBox] = useState(product.min_order_box);
  const [flowType, setFlowType] = useState<FlowType>(product.flow_type);
  const [cutType, setCutType] = useState(product.cut_type ?? "");
  const [isVisible, setIsVisible] = useState(product.is_visible);
  const [isApproved, setIsApproved] = useState(product.is_approved);
  const [status, setStatus] = useState<ProductStatus>(product.status);
  const [orderDeadline, setOrderDeadline] = useState(product.order_deadline ?? "");
  const [notes, setNotes] = useState(product.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          series: series || null,
          title,
          fullName: fullName || null,
          modelNumber: modelNumber || null,
          category,
          actualRate,
          rateMarkup,
          price,
          plannedQty,
          ctToBox,
          minOrderBox,
          flowType,
          cutType: cutType || null,
          isVisible,
          isApproved,
          status,
          orderDeadline: orderDeadline || null,
          notes: notes || null,
          lastUpdatedAt: product.updated_at,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "更新失敗");
      setMessage("保存しました");
      router.refresh();
    } catch (e) {
      setMessage(`失敗: ${e instanceof Error ? e.message : "不明"}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("この商品を論理削除しますか？")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      router.push("/admin/inventory");
    } catch (e) {
      setMessage(`失敗: ${e instanceof Error ? e.message : "不明"}`);
      setBusy(false);
    }
  };

  const listedPreview = actualRate + rateMarkup;

  return (
    <section className="card p-5 space-y-4">
      <h2 className="font-semibold">商品情報</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <label className="block text-xs text-slate-600 mb-1">シリーズ (ゲームタイトル)</label>
          <input className="input" placeholder="ゼクス Z/X / ポケモンカード 等" value={series} onChange={(e) => setSeries(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">商品名 *</label>
          <input className="input" placeholder="強化拡張パック 等" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-600 mb-1">フル商品名 (オプション・長い正式名称)</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">型番</label>
          <input className="input" value={modelNumber} onChange={(e) => setModelNumber(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">カテゴリ</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)}>
            <option value="pokemon">ポケモン</option>
            <option value="onepiece">ワンピース</option>
            <option value="other">その他</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">実掛け率 (0〜1)</label>
          <input
            className="input"
            type="number"
            step="0.01"
            min={0}
            max={1}
            value={actualRate}
            onChange={(e) => setActualRate(parseFloat(e.target.value || "0"))}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">上乗せ率 (0〜1)</label>
          <input
            className="input"
            type="number"
            step="0.01"
            min={0}
            max={1}
            value={rateMarkup}
            onChange={(e) => setRateMarkup(parseFloat(e.target.value || "0"))}
          />
          <p className="text-xs text-slate-500 mt-1">案内掛け率 = {formatRate(listedPreview)}</p>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">定価 (円)</label>
          <input
            className="input"
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(parseInt(e.target.value || "0", 10))}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">発注可能数 (BOX)</label>
          <input
            className="input"
            type="number"
            min={0}
            value={plannedQty}
            onChange={(e) => setPlannedQty(parseInt(e.target.value || "0", 10))}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">1 CT あたり BOX 数</label>
          <input
            className="input"
            type="number"
            min={1}
            value={ctToBox}
            onChange={(e) => setCtToBox(parseInt(e.target.value || "1", 10))}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">BOX 単位最低発注数</label>
          <input
            className="input"
            type="number"
            min={1}
            value={minOrderBox}
            onChange={(e) => setMinOrderBox(parseInt(e.target.value || "1", 10))}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">フロー</label>
          <select className="input" value={flowType} onChange={(e) => setFlowType(e.target.value as FlowType)}>
            <option value="haibun">配分確定品</option>
            <option value="cut">カット割</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">カット種別 (任意ラベル)</label>
          <input className="input" value={cutType} onChange={(e) => setCutType(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">受付状態</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)}>
            <option value="受付中">受付中</option>
            <option value="受付停止">受付停止</option>
            <option value="終了">終了</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">発注締切</label>
          <input
            className="input"
            type="date"
            value={orderDeadline}
            onChange={(e) => setOrderDeadline(e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-600 mb-1">備考</label>
          <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)} />
          <span>ショップに公開する</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isApproved} onChange={(e) => setIsApproved(e.target.checked)} />
          <span>承認済み</span>
        </label>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" className="btn-primary" disabled={busy} onClick={handleSubmit}>
            {busy ? "保存中…" : "保存"}
          </button>
          {message && <span className="text-xs">{message}</span>}
        </div>
        <button type="button" className="text-xs text-red-600 hover:underline" disabled={busy} onClick={handleDelete}>
          論理削除
        </button>
      </div>
    </section>
  );
}
