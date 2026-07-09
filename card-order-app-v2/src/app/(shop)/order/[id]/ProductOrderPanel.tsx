"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderUnit } from "@/types/database";
import { formatYen } from "@/lib/rebate";

export function ProductOrderPanel({
  productId,
  unitPrice,
  listedRate,
  minOrderBox,
  ctToBox,
  orderable,
  disabledReason,
}: {
  productId: string;
  unitPrice: number;
  listedRate: number;
  minOrderBox: number;
  ctToBox: number;
  orderable: boolean;
  disabledReason: string | null;
}) {
  const router = useRouter();
  const defaultBox = Math.max(minOrderBox, ctToBox);
  const [unit, setUnit] = useState<OrderUnit>("BOX");
  const [qty, setQty] = useState<number>(defaultBox);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const changeUnit = (u: OrderUnit) => {
    setUnit(u);
    setQty(u === "CT" ? 1 : defaultBox);
  };

  const qtyInBox = unit === "CT" ? qty * ctToBox : qty;
  const subtotal = Math.floor(unitPrice * qtyInBox * listedRate);

  const submit = async () => {
    if (!agree) { setMessage("免責事項・キャンセル不可への同意が必要です"); return; }
    setBusy(true); setMessage(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId, unit, qty }],
          consentAgreedAt: new Date().toISOString(),
        }),
      });
      const json = await res.json();
      if (!res.ok || (json.created?.length ?? 0) === 0) {
        throw new Error(json.errors?.[0]?.error ?? json.error ?? "発注に失敗しました");
      }
      setDone(true);
      router.refresh();
    } catch (e) {
      setMessage(`失敗: ${e instanceof Error ? e.message : "不明"}`);
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <p className="font-semibold">発注リクエストを受け付けました。</p>
        <p className="mt-1">担当より追ってご連絡いたします。</p>
        <a href="/mypage" className="btn-secondary text-xs mt-3 inline-flex">マイページで確認</a>
      </div>
    );
  }

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
          onChange={(e) => setQty(parseInt(e.target.value || "0", 10))}
        />
        <span className="text-sm text-slate-500">= {qtyInBox} BOX</span>
      </div>

      <div className="text-sm text-slate-600">
        概算小計（税抜・リベート前） <span className="font-semibold text-slate-900">{formatYen(subtotal)}</span>
      </div>

      <label className="flex items-start gap-2 text-xs text-slate-600">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
        <span>発注内容・免責事項に同意します（発注後のキャンセルはできません）</span>
      </label>

      <button type="button" className="btn-primary w-full" disabled={busy || !agree} onClick={submit}>
        {busy ? "送信中…" : "この商品を発注する"}
      </button>
      {message && <p className="text-xs text-rose-600">{message}</p>}
    </div>
  );
}
