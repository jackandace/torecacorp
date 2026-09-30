"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** 先行公開機能 (お知らせ) を見せるテストユーザーの切り替え */
export function BetaToggle({ shopId, initial }: { shopId: string; initial: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function change(next: boolean) {
    setBusy(true);
    const res = await fetch(`/api/shops/${shopId}/beta`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isBetaTester: next }),
    });
    setBusy(false);
    if (res.ok) { setOn(next); router.refresh(); }
  }

  return (
    <section className="card p-4 space-y-1.5">
      <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
        <input type="checkbox" checked={on} disabled={busy} onChange={(e) => change(e.target.checked)} />
        🧪 テストユーザー
      </label>
      <p className="text-xs text-slate-500">オンにすると、全体公開前の機能（アプリ内お知らせ・新商品メール）がこのお客様に表示されます。</p>
    </section>
  );
}
