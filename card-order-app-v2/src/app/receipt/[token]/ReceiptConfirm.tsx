"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReceiptConfirm({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function confirm() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/receipt/${token}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "受領の確定に失敗しました");
      router.refresh(); // 受領済み表示へ
    } catch (e) {
      setErr(e instanceof Error ? e.message : "受領の確定に失敗しました");
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={confirm}
        disabled={busy}
        className="w-full inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-3 text-base font-bold text-white shadow-sm hover:bg-emerald-700 disabled:bg-slate-300 transition"
      >
        {busy ? "確定中…" : "受領する（受け取りました）"}
      </button>
      {err && <p className="text-sm text-rose-600 mt-2 text-center">{err}</p>}
    </div>
  );
}
