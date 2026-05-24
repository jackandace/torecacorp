"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props { shopId: string }

export function LegacyInvoiceUpload({ shopId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issuedAt, setIssuedAt] = useState(new Date().toISOString().slice(0, 10));
  const [totalAmount, setTotalAmount] = useState("");
  const [status, setStatus] = useState<"未入金" | "一部入金" | "入金済み">("入金済み");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const handleUpload = async () => {
    if (!file || !invoiceNumber || !totalAmount) {
      setMessage({ kind: "err", text: "請求書番号・金額・PDF は必須" });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("invoiceNumber", invoiceNumber);
      fd.append("issuedAt", issuedAt);
      fd.append("totalAmount", totalAmount);
      fd.append("status", status);
      const res = await fetch(`/api/shops/${shopId}/legacy-invoice`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "失敗");
      setMessage({ kind: "ok", text: "取り込みました" });
      setFile(null); setInvoiceNumber(""); setTotalAmount("");
      router.refresh();
    } catch (e) {
      setMessage({ kind: "err", text: `失敗: ${e instanceof Error ? e.message : "不明"}` });
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="btn-secondary text-xs" onClick={() => setOpen(true)}>
        + 過去の請求書を追加
      </button>
    );
  }

  return (
    <div className="border border-slate-200 rounded p-4 space-y-3 text-sm bg-slate-50">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-sm">過去請求書の取り込み (legacy)</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-500">✕ 閉じる</button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-600 mb-1">請求書番号 *</label>
          <input className="input text-sm" placeholder="LEGACY-001" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">発行日 *</label>
          <input type="date" className="input text-sm" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">合計 (税込・円) *</label>
          <input type="number" min={0} className="input text-sm" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">入金状況</label>
          <select className="input text-sm" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="未入金">未入金</option>
            <option value="一部入金">一部入金</option>
            <option value="入金済み">入金済み</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-slate-600 mb-1">PDF *</label>
        <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-xs" />
      </div>
      <button type="button" className="btn-primary text-sm" disabled={busy} onClick={handleUpload}>
        {busy ? "取込中…" : "取り込む"}
      </button>
      {message && (
        <p className={`text-xs ${message.kind === "ok" ? "text-emerald-700" : "text-rose-700"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
