"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Pending = { token: string; title: string };

/** 納品済みで未受領の発注がある間、閉じられないモーダルで受領を促す(漏れゼロ)。 */
export function ReceiptEnforcer({ pending }: { pending: Pending[] }) {
  const router = useRouter();
  const [items, setItems] = useState<Pending[]>(pending);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (items.length === 0) return null;

  async function receive(token: string) {
    setBusy(token); setErr(null);
    try {
      const res = await fetch(`/api/receipt/${token}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "受領の確定に失敗しました");
      const next = items.filter((i) => i.token !== token);
      setItems(next);
      if (next.length === 0) router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "受領の確定に失敗しました");
    } finally { setBusy(null); }
  }

  async function receiveAll() {
    setBusy("all"); setErr(null);
    try {
      for (const it of items) {
        await fetch(`/api/receipt/${it.token}`, { method: "POST" });
      }
      setItems([]);
      router.refresh();
    } catch {
      setErr("一部の受領に失敗しました。個別にお試しください。");
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 max-h-[85vh] flex flex-col">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold">📦 商品受領のご確認をお願いします</h2>
          <p className="text-sm text-slate-500 mt-1">
            納品済みの商品があります。お手数ですが、受け取った商品の<strong>「受領する」</strong>を押してください。
            （すべて確認するまでこの画面は表示されます）
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {items.map((it) => (
            <div key={it.token} className="flex items-center gap-3 border border-slate-200 rounded-lg p-3">
              <span className="flex-1 text-sm font-medium">{it.title}</span>
              <button
                type="button"
                className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-300"
                disabled={busy !== null}
                onClick={() => receive(it.token)}
              >
                {busy === it.token ? "…" : "受領する"}
              </button>
            </div>
          ))}
          {err && <p className="text-sm text-rose-600">{err}</p>}
        </div>
        <div className="p-4 border-t border-slate-100">
          <button
            type="button"
            className="w-full inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700 disabled:bg-slate-300"
            disabled={busy !== null}
            onClick={receiveAll}
          >
            {busy === "all" ? "確定中…" : `すべて受領する（${items.length}件）`}
          </button>
          <p className="text-[11px] text-slate-400 text-center mt-2">※ 未着の商品がある場合はお問い合わせフォームからご連絡ください。</p>
        </div>
      </div>
    </div>
  );
}
