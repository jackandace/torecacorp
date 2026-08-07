"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatJST } from "@/lib/dates";

/** ショップの振込完了報告の表示 + 誤報告のクリア (admin) */
export function PaymentReportPanel({
  invoiceId,
  reportedAt,
  note,
}: {
  invoiceId: string;
  reportedAt: string;
  note: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const clearReport = async () => {
    if (!confirm("振込報告をクリアします (誤報告時のみ)。よろしいですか？")) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/payment-report`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "クリアに失敗しました");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "クリアに失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-5 space-y-2 text-sm border-sky-200 bg-sky-50/50">
      <h2 className="font-semibold text-sky-900">🔔 振込完了の報告あり</h2>
      <p className="text-xs text-slate-600">報告日時: {formatJST(reportedAt)}</p>
      {note && <p className="text-xs text-slate-600">メモ: {note}</p>}
      <p className="text-xs text-slate-500">
        入金を確認して下の「入金を記録」で消込してください。消込が完了すると表示は自動で消えます。
      </p>
      <button type="button" className="text-xs text-rose-600 underline" disabled={busy} onClick={clearReport}>
        {busy ? "処理中…" : "誤報告のためクリアする"}
      </button>
      {err && <p className="text-xs text-rose-600">{err}</p>}
    </section>
  );
}
