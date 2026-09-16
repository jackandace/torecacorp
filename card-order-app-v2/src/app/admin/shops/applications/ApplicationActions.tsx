"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** 審査待ち申請の操作: 承認 (招待リンク自動送付) / 却下 */
export function ApplicationActions({
  applicationId,
  companyName,
  email,
}: {
  applicationId: string;
  companyName: string;
  email: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [notify, setNotify] = useState(false);

  async function approve() {
    if (!confirm(`「${companyName}」を承認します。\n${email} 宛に登録リンク付きの審査通過メールが自動送信されます。よろしいですか？`)) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/shop-applications/${applicationId}/approve`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "承認に失敗しました");
      if (!json.mailSent) {
        alert(`承認しました (メール送信は失敗)。以下の登録リンクを手動で案内してください:\n${json.registerUrl}`);
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "承認に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/shop-applications/${applicationId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewNote: reviewNote || undefined, notify }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "却下に失敗しました");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "却下に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  if (rejecting) {
    return (
      <div className="flex flex-col gap-2 shrink-0 w-full lg:w-72">
        <textarea
          className="input text-xs"
          rows={2}
          placeholder="審査メモ (却下理由・社内向け)"
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
        />
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
          <span>申請者にお断りメールを送る</span>
        </label>
        <div className="flex gap-2">
          <button type="button" className="text-xs rounded-md bg-rose-600 text-white px-3 py-2 font-semibold hover:bg-rose-700 disabled:bg-slate-300" disabled={busy} onClick={reject}>
            {busy ? "処理中…" : "却下を確定"}
          </button>
          <button type="button" className="btn-secondary text-xs" disabled={busy} onClick={() => setRejecting(false)}>
            キャンセル
          </button>
        </div>
        {err && <p className="text-xs text-rose-600">{err}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-stretch lg:items-end gap-1.5 shrink-0">
      <div className="flex gap-2">
        <button type="button" className="btn-primary text-xs" disabled={busy} onClick={approve}>
          {busy ? "処理中…" : "承認して招待メールを送る"}
        </button>
        <button type="button" className="text-xs text-rose-600 underline" disabled={busy} onClick={() => setRejecting(true)}>
          却下…
        </button>
      </div>
      {err && <p className="text-xs text-rose-600 max-w-[280px] lg:text-right">{err}</p>}
    </div>
  );
}
