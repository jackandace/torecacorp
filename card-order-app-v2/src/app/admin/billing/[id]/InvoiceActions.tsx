"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  invoiceId: string;
  kind: "normal" | "deposit" | "final" | "refund";
  status: string;
}

export function InvoiceActions({ invoiceId, kind, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function post(path: string): Promise<{ ok: boolean; data: Record<string, unknown> }> {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" } });
    let data: Record<string, unknown> = {};
    try { data = await res.json(); } catch { /* redirect等でJSONでない場合 */ }
    return { ok: res.ok, data };
  }

  async function regenPdf() {
    setBusy("pdf"); setMsg(null);
    try {
      const { ok, data } = await post(`/api/invoices/${invoiceId}/pdf`);
      if (!ok) throw new Error((data.error as string) ?? "再生成に失敗しました");
      setMsg({ kind: "ok", text: "PDFを再生成しました。「PDFを開く」で最新版を確認できます。" });
      router.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "再生成に失敗しました" });
    } finally { setBusy(null); }
  }

  async function settle() {
    if (!confirm("確定した数量をもとに最終精算し、差額請求または返金を発行します。よろしいですか？")) return;
    setBusy("settle"); setMsg(null);
    try {
      const { ok, data } = await post(`/api/invoices/${invoiceId}/settle`);
      if (!ok) throw new Error((data.error as string) ?? "精算に失敗しました");
      const k = data.kind as string;
      const amount = Number(data.amount ?? 0).toLocaleString();
      const text =
        k === "settled" ? "保証金と一致したため、追加請求・返金はありません。"
        : k === "final" ? `最終精算：差額請求 ¥${amount} を発行しました。`
        : k === "refund" ? `最終精算：返金 ¥${amount} を発行しました(支払通知書を発行できます)。`
        : "精算が完了しました。";
      setMsg({ kind: "ok", text });
      router.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "精算に失敗しました" });
    } finally { setBusy(null); }
  }

  async function issueReceipt() {
    setBusy("receipt"); setMsg(null);
    try {
      const { ok, data } = await post(`/api/invoices/${invoiceId}/receipt`);
      if (!ok) throw new Error((data.error as string) ?? "領収書の発行に失敗しました");
      if (typeof data.url === "string") window.open(data.url, "_blank", "noopener");
      setMsg({ kind: "ok", text: "領収書を発行しました。" });
      router.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "領収書の発行に失敗しました" });
    } finally { setBusy(null); }
  }

  const linkCls = "btn-secondary whitespace-nowrap";
  const busyAny = busy !== null;

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {kind === "refund" ? (
          <a className={linkCls} href={`/api/invoices/${invoiceId}/payment-notice/download`} target="_blank" rel="noreferrer">
            支払通知書を開く
          </a>
        ) : (
          <>
            <a className={linkCls} href={`/api/invoices/${invoiceId}/pdf/download`} target="_blank" rel="noreferrer">
              PDFを開く
            </a>
            <button className="btn-secondary whitespace-nowrap" disabled={busyAny} onClick={regenPdf}>
              {busy === "pdf" ? "再生成中…" : "PDFを再生成"}
            </button>
          </>
        )}
        {kind === "deposit" && (
          <button className="btn-primary whitespace-nowrap" disabled={busyAny} onClick={settle}>
            {busy === "settle" ? "精算中…" : "最終精算する"}
          </button>
        )}
        {kind !== "refund" && status === "入金済み" && (
          <button className="btn-secondary whitespace-nowrap" disabled={busyAny} onClick={issueReceipt}>
            {busy === "receipt" ? "発行中…" : "領収書を発行"}
          </button>
        )}
      </div>
      {msg && (
        <p className={`text-xs sm:text-right ${msg.kind === "ok" ? "text-emerald-700" : "text-rose-600"}`}>{msg.text}</p>
      )}
    </div>
  );
}
