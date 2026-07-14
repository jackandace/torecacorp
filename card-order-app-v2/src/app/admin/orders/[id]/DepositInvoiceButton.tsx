"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** カット品の保証金(前受金)請求書を、率(50/40/30%)を選んで発行する。 */
export function DepositInvoiceButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [rate, setRate] = useState(0.5);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string; href?: string } | null>(null);

  async function issue() {
    if (!confirm(`保証金 ${Math.round(rate * 100)}% の請求書を発行します。よろしいですか？`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/deposit-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rate }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // 既に発行済み等: 既存の請求詳細へのリンク付きで案内
        setMsg({
          kind: "err",
          text: (data.error as string) ?? "発行に失敗しました",
          href: data.invoiceId ? `/admin/billing/${data.invoiceId}` : undefined,
        });
        return;
      }
      router.push(`/admin/billing/${data.invoiceId}`);
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "発行に失敗しました" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <select
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          disabled={busy}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
          aria-label="保証金率"
        >
          <option value={0.5}>保証金 50%</option>
          <option value={0.4}>保証金 40%</option>
          <option value={0.3}>保証金 30%</option>
        </select>
        <button type="button" className="btn-primary text-xs whitespace-nowrap" disabled={busy} onClick={issue}>
          {busy ? "発行中…" : "保証金請求書を発行"}
        </button>
      </div>
      {msg && (
        <p className={`text-xs text-right ${msg.kind === "err" ? "text-rose-600" : "text-emerald-700"}`}>
          {msg.text}
          {msg.href && (
            <>
              {" "}
              <a className="underline" href={msg.href}>請求詳細を開く</a>
            </>
          )}
        </p>
      )}
    </div>
  );
}
