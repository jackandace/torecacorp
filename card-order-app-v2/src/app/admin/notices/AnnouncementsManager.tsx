"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Item { id: string; title: string; body: string | null; linkUrl: string | null; createdAt: string }

export function AnnouncementsManager({ items }: { items: Item[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function post() {
    if (!confirm("このお知らせを「全体へのお知らせ」に投稿します。お知らせ機能が見えている全てのお客様に表示されます。よろしいですか？")) return;
    setBusy(true); setMsg(null);
    const res = await fetch("/api/announcements", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, linkUrl }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg({ ok: false, text: json.error ?? "投稿に失敗しました" }); return; }
    setTitle(""); setBody(""); setLinkUrl("");
    setMsg({ ok: true, text: "投稿しました" });
    router.refresh();
  }

  async function remove(it: Item) {
    if (!confirm(`「${it.title}」を削除します。お客様の画面からも消えます。よろしいですか？`)) return;
    const res = await fetch(`/api/announcements/${it.id}`, { method: "DELETE" });
    if (!res.ok) { setMsg({ ok: false, text: "削除に失敗しました" }); return; }
    router.refresh();
  }

  return (
    <section className="card p-5 space-y-4">
      <div>
        <h2 className="font-semibold">全体へのお知らせ</h2>
        <p className="text-xs text-slate-500 mt-0.5">お客様全員のお知らせ「全体へのお知らせ」タブに表示されます（メールは送りません）。新商品は公開時に自動で載るので、ここでの投稿は不要です。</p>
      </div>
      <div className="space-y-2">
        <input className="input text-sm" placeholder="タイトル（例: 年末年始の営業について）" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="input text-sm" rows={4} placeholder="本文" value={body} onChange={(e) => setBody(e.target.value)} />
        <input className="input text-sm" placeholder="リンク（任意・https:// または /order など）" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
        <button type="button" className="btn-primary text-xs" disabled={busy || !title.trim()} onClick={post}>{busy ? "投稿中…" : "投稿する"}</button>
        {msg && <p className={`text-xs ${msg.ok ? "text-emerald-700" : "text-rose-700"}`}>{msg.text}</p>}
      </div>
      {items.length > 0 && (
        <ul className="divide-y divide-slate-100 text-sm">
          {items.map((it) => (
            <li key={it.id} className="py-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{it.title}</p>
                {it.body && <p className="text-xs text-slate-600 whitespace-pre-line line-clamp-3">{it.body}</p>}
                <p className="text-[11px] text-slate-400">{it.createdAt}{it.linkUrl ? ` ・ リンク: ${it.linkUrl}` : ""}</p>
              </div>
              <button type="button" className="text-xs text-rose-600 hover:underline shrink-0" onClick={() => remove(it)}>削除</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
