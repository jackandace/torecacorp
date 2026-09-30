"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NOTICES_EVENT } from "@/lib/notices-client";

/** 「すべて既読にする」ボタン (両タブ) */
export function MarkAllRead({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    await fetch("/api/profile/notices/read-all", { method: "POST" });
    window.dispatchEvent(new CustomEvent(NOTICES_EVENT));
    setBusy(false);
    router.refresh();
  }
  return (
    <button type="button" className="text-sm text-brand-600 hover:underline disabled:text-slate-400 disabled:no-underline" disabled={busy || disabled} onClick={run}>
      {busy ? "処理中…" : "すべて既読にする"}
    </button>
  );
}
