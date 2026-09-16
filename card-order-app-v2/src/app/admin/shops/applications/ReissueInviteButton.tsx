"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** 承認済み申請の登録リンクを再発行して再送する (期限切れ時の復旧用) */
export function ReissueInviteButton({
  applicationId,
  companyName,
  email,
  expired,
}: {
  applicationId: string;
  companyName: string;
  email: string;
  expired: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function reissue() {
    const note = expired
      ? "登録リンクが期限切れのため、新しいリンクを発行します。"
      : "現在のリンクは無効になり、新しいリンクが発行されます。";
    if (!confirm(`「${companyName}」の登録リンクを再発行します。\n${note}\n${email} 宛に再発行メールが自動送信されます。よろしいですか？`)) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/shop-applications/${applicationId}/reissue-invite`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "再発行に失敗しました");
      if (!json.mailSent) {
        alert(`再発行しました (メール送信は失敗)。以下の登録リンクを手動で案内してください:\n${json.registerUrl}`);
      }
      setDone(true);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "再発行に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch lg:items-end gap-1.5 shrink-0">
      <button
        type="button"
        className={expired ? "btn-primary text-xs" : "btn-secondary text-xs"}
        disabled={busy || done}
        onClick={reissue}
      >
        {busy ? "処理中…" : done ? "再送しました" : expired ? "登録リンクを再発行して再送" : "登録リンクを再送…"}
      </button>
      {err && <p className="text-xs text-rose-600 max-w-[280px] lg:text-right">{err}</p>}
    </div>
  );
}
