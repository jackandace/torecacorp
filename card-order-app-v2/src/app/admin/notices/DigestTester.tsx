"use client";

import { useState } from "react";

/** 新商品のまとめメールを、テストユーザー1社に対して内容確認・即時送信する */
export function DigestTester({ testers }: { testers: { id: string; name: string }[] }) {
  const [shop, setShop] = useState(testers[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<string | null>(null);

  async function run(dry: boolean) {
    if (!shop) return;
    if (!dry && !confirm("選んだお客様に、前回以降に公開された新商品のまとめメールを今すぐ送信します。よろしいですか？")) return;
    setBusy(true); setOut(null);
    const res = await fetch(`/api/cron/new-product-digest?shop=${shop}${dry ? "&dry=1" : ""}`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setOut(`失敗: ${json.error ?? res.status}`); return; }
    if (dry) {
      const p = (json.preview?.[0]?.products ?? []) as string[];
      setOut(p.length ? `送信される商品 (${p.length}件):\n・${p.join("\n・")}` : "前回以降に公開された対象商品はありません（メールは送信されません）");
    } else {
      setOut(json.sent > 0 ? "送信しました" : "対象の新商品が無いため送信しませんでした");
    }
  }

  return (
    <section className="card p-5 space-y-3">
      <div>
        <h2 className="font-semibold">新商品のまとめメール（毎日 10:00 自動送信）</h2>
        <p className="text-xs text-slate-500 mt-0.5">前回の送信以降に公開された受付中の新商品を、お客様ごとに「見られる商品」かつ「受け取り設定のタイトル」に絞って1通にまとめて送ります。動作確認はテストユーザーで行えます。</p>
      </div>
      {testers.length === 0 ? (
        <p className="text-xs text-slate-500">テストユーザーがいません。</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <select className="input text-sm w-auto" value={shop} onChange={(e) => setShop(e.target.value)}>
            {testers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button type="button" className="btn-secondary text-xs" disabled={busy} onClick={() => run(true)}>内容を確認（送信しない）</button>
          <button type="button" className="btn-primary text-xs" disabled={busy} onClick={() => run(false)}>今すぐ送信</button>
        </div>
      )}
      {out && <pre className="text-xs bg-slate-50 border border-slate-200 rounded p-3 whitespace-pre-wrap">{out}</pre>}
    </section>
  );
}
