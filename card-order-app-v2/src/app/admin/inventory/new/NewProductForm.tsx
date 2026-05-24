"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductCategory, FlowType } from "@/types/database";

export function NewProductForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ProductCategory>("pokemon");
  const [actualRate, setActualRate] = useState(0.74);
  const [price, setPrice] = useState(0);
  const [plannedQty, setPlannedQty] = useState(0);
  const [flowType, setFlowType] = useState<FlowType>("haibun");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title) {
      setMessage("商品名は必須です");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          actualRate,
          price,
          plannedQty,
          flowType,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "登録失敗");
      router.push(`/admin/inventory/${json.product.id}`);
    } catch (e) {
      setMessage(`失敗: ${e instanceof Error ? e.message : "不明"}`);
      setBusy(false);
    }
  };

  return (
    <div className="card p-5 space-y-3 text-sm">
      <div>
        <label className="block text-xs text-slate-600 mb-1">商品名 *</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-600 mb-1">カテゴリ</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)}>
            <option value="pokemon">ポケモン</option>
            <option value="onepiece">ワンピース</option>
            <option value="other">その他</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">フロー</label>
          <select className="input" value={flowType} onChange={(e) => setFlowType(e.target.value as FlowType)}>
            <option value="haibun">配分確定品</option>
            <option value="cut">カット割</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">実掛け率</label>
          <input className="input" type="number" step="0.01" min={0} max={1} value={actualRate} onChange={(e) => setActualRate(parseFloat(e.target.value || "0"))} />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">定価 (円)</label>
          <input className="input" type="number" min={0} value={price} onChange={(e) => setPrice(parseInt(e.target.value || "0", 10))} />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">発注可能数 (BOX)</label>
          <input className="input" type="number" min={0} value={plannedQty} onChange={(e) => setPlannedQty(parseInt(e.target.value || "0", 10))} />
        </div>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button type="button" className="btn-primary" disabled={busy} onClick={handleSubmit}>
          {busy ? "登録中…" : "登録"}
        </button>
        {message && <span className="text-xs">{message}</span>}
      </div>
    </div>
  );
}
