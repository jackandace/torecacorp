"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Item { id: string; title: string; body: string | null; linkUrl: string | null; createdAt: string; scheduled: boolean }

/** よく使う文面 (全体反映時のアップデート告知など) */
const PRESETS: { label: string; title: string; body: string; linkUrl: string; publishAt?: string }[] = [
  {
    label: "2026年10月アップデートの告知",
    title: "【アップデート】カート・新商品のお知らせなどが新しくなりました",
    body: [
      "いつもご利用ありがとうございます。アプリを以下のとおり更新しました。",
      "",
      "・新商品のお知らせ（アプリ内＋1日1回のまとめメール）を開始しました。受け取るタイトル・メールの有無はマイページ「お知らせの受け取り設定」から選べます",
      "・カートがページを移動しても残るようになり、画面上部のカートから中身を確認できます",
      "・発売日とメーカー希望小売価格（税込）を表示するようになりました",
      "・お問い合わせ・よくある質問・マニュアル・プロフィールはマイページにまとめました",
      "",
      "変わったことと使い方は、下の「詳しく見る」からご確認ください。",
    ].join("\n"),
    linkUrl: "/updates",
    publishAt: "2026-10-01T12:00", // 全体反映 (NOTICES_ROLLOUT_AT) と同時刻
  },
];

export function AnnouncementsManager({ items }: { items: Item[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [publishAt, setPublishAt] = useState(""); // datetime-local (日本時間)。空欄なら今すぐ
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function post() {
    const at = publishAt ? new Date(publishAt) : null;
    const when = at && at.getTime() > Date.now() ? `${at.toLocaleString("ja-JP")} に` : "今すぐ";
    if (!confirm(`このお知らせを${when}「全体へのお知らせ」に公開します。お知らせ機能が見えている全てのお客様に表示されます。よろしいですか？`)) return;
    setBusy(true); setMsg(null);
    const res = await fetch("/api/announcements", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, linkUrl, ...(at ? { publishAt: at.toISOString() } : {}) }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg({ ok: false, text: json.error ?? "投稿に失敗しました" }); return; }
    setTitle(""); setBody(""); setLinkUrl(""); setPublishAt("");
    setMsg({ ok: true, text: when === "今すぐ" ? "投稿しました" : `${when}公開するよう予約しました` });
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
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="text-slate-500 self-center">文面テンプレート:</span>
        {PRESETS.map((p) => (
          <button key={p.label} type="button" className="btn-secondary text-xs"
            onClick={() => { setTitle(p.title); setBody(p.body); setLinkUrl(p.linkUrl); setPublishAt(p.publishAt ?? ""); setMsg(null); }}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <input className="input text-sm" placeholder="タイトル（例: 年末年始の営業について）" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="input text-sm" rows={4} placeholder="本文" value={body} onChange={(e) => setBody(e.target.value)} />
        <input className="input text-sm" placeholder="リンク（任意・https:// または /order など）" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
        <label className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          公開日時（日本時間・空欄なら今すぐ）
          <input type="datetime-local" className="input text-sm w-auto" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
        </label>
        <button type="button" className="btn-primary text-xs" disabled={busy || !title.trim()} onClick={post}>{busy ? "投稿中…" : publishAt ? "予約する" : "投稿する"}</button>
        {msg && <p className={`text-xs ${msg.ok ? "text-emerald-700" : "text-rose-700"}`}>{msg.text}</p>}
      </div>
      {items.length > 0 && (
        <ul className="divide-y divide-slate-100 text-sm">
          {items.map((it) => (
            <li key={it.id} className="py-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {it.scheduled && <span className="mr-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800">予約</span>}
                  {it.title}
                </p>
                {it.body && <p className="text-xs text-slate-600 whitespace-pre-line line-clamp-3">{it.body}</p>}
                <p className="text-[11px] text-slate-400">{it.scheduled ? `${it.createdAt} に公開` : it.createdAt}{it.linkUrl ? ` ・ リンク: ${it.linkUrl}` : ""}</p>
              </div>
              <button type="button" className="text-xs text-rose-600 hover:underline shrink-0" onClick={() => remove(it)}>削除</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
