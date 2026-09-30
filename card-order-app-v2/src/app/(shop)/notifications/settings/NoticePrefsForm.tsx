"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  email: string;
  initial: { emailEnabled: boolean; titleMode: "all" | "selected"; titleIds: string[] };
  titles: { id: string; name: string }[];
}

export function NoticePrefsForm({ email, initial, titles }: Props) {
  const router = useRouter();
  const [emailEnabled, setEmailEnabled] = useState(initial.emailEnabled);
  const [titleMode, setTitleMode] = useState(initial.titleMode);
  const [selected, setSelected] = useState<Set<string>>(new Set(initial.titleIds));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  async function save() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/profile/notice-prefs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailEnabled, titleMode, titleIds: [...selected] }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg({ ok: false, text: json.error ?? "保存に失敗しました" }); return; }
    setMsg({ ok: true, text: "保存しました" });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">新商品のお知らせメール</h2>
        <p className="text-xs text-slate-500">その日に公開された新商品を、<b>1日1回まとめて</b>お送りします（新商品がない日は届きません）。送信先: {email || "(未登録)"}</p>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="radio" name="email" checked={emailEnabled} onChange={() => setEmailEnabled(true)} />
          受け取る
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="radio" name="email" checked={!emailEnabled} onChange={() => setEmailEnabled(false)} />
          受け取らない（アプリ内のお知らせのみ）
        </label>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">お知らせを受け取るタイトル</h2>
        <p className="text-xs text-slate-500">メールとアプリ内の「全体へのお知らせ」の新商品に適用されます。</p>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="radio" name="mode" checked={titleMode === "all"} onChange={() => setTitleMode("all")} />
          すべてのタイトル（今後追加されるタイトルも含む）
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="radio" name="mode" checked={titleMode === "selected"} onChange={() => setTitleMode("selected")} />
          選んだタイトルだけ
        </label>
        {titleMode === "selected" && (
          <div className="border border-slate-200 rounded-lg p-3 space-y-2">
            <div className="flex gap-3 text-xs">
              <button type="button" className="text-brand-600 hover:underline" onClick={() => setSelected(new Set(titles.map((t) => t.id)))}>すべて選択</button>
              <button type="button" className="text-slate-500 hover:underline" onClick={() => setSelected(new Set())}>選択を解除</button>
              <span className="text-slate-400">{selected.size} 件選択中</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 max-h-80 overflow-y-auto">
              {titles.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} />
                  {t.name}
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-500">※ 新しいタイトルが追加されても自動では選ばれません。</p>
          </div>
        )}
      </section>

      {msg && <p className={`text-sm rounded p-3 border ${msg.ok ? "text-emerald-800 bg-emerald-50 border-emerald-200" : "text-rose-700 bg-rose-50 border-rose-200"}`}>{msg.text}</p>}
      <button type="button" className="btn-primary" disabled={busy} onClick={save}>{busy ? "保存中…" : "保存する"}</button>
    </div>
  );
}
