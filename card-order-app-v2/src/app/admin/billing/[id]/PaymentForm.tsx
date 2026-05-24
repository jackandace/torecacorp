"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatYen } from "@/lib/rebate";

interface Props {
  invoiceId: string;
  totalAmount: number;
  paidAmount: number;
  lastUpdatedAt: string;
}

export function PaymentForm({ invoiceId, totalAmount, paidAmount, lastUpdatedAt }: Props) {
  const router = useRouter();
  const remaining = totalAmount - paidAmount;
  const [amount, setAmount] = useState<number>(remaining);
  const [paidAt, setPaidAt] = useState<string>(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (amount <= 0) {
      setMessage("入金額は1円以上で入力してください");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, paidAt, lastUpdatedAt }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "更新失敗");
      setMessage("入金を記録しました");
      router.refresh();
    } catch (e) {
      setMessage(`失敗: ${e instanceof Error ? e.message : "不明"}`);
    } finally {
      setBusy(false);
    }
  };

  if (remaining <= 0) {
    return (
      <section className="card p-5 text-sm text-emerald-700">
        <h2 className="font-semibold mb-2">入金消込</h2>
        <p>全額入金済みです</p>
      </section>
    );
  }

  return (
    <section className="card p-5 space-y-3">
      <h2 className="font-semibold">入金記録</h2>
      <div>
        <label className="block text-xs text-slate-600 mb-1">入金額 (残: {formatYen(remaining)})</label>
        <input
          type="number"
          className="input"
          min={1}
          max={remaining}
          value={amount}
          onChange={(e) => setAmount(parseInt(e.target.value || "0", 10))}
        />
      </div>
      <div>
        <label className="block text-xs text-slate-600 mb-1">入金日</label>
        <input
          type="date"
          className="input"
          value={paidAt}
          onChange={(e) => setPaidAt(e.target.value)}
        />
      </div>
      <button type="button" className="btn-primary w-full" disabled={busy} onClick={handleSubmit}>
        {busy ? "記録中…" : "入金を記録"}
      </button>
      {message && <p className="text-xs">{message}</p>}
    </section>
  );
}
