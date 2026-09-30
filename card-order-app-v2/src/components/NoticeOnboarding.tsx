"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NOTICES_EVENT } from "@/lib/notices-client";

const LATER_KEY = "trecacorp_notice_onboarding_later";

/**
 * お知らせの受け取り設定の確認ポップアップ。
 * 受け取り設定をまだ確認していないお客様に、ログイン後の最初の画面で1回出す。
 * 「あとで」はこのログイン中 (ブラウザのタブを閉じるまで) は出さず、次回ログイン時に再表示する。
 * テストユーザーは URL に ?notice_preview=1 を付けると、設定済みでも表示を確認できる (選ぶと実際に保存される)。
 */
export function NoticeOnboarding({ show, canPreview = false }: { show: boolean; canPreview?: boolean }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"email" | "no_email" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const preview = canPreview && new URLSearchParams(window.location.search).get("notice_preview") === "1";
    if (preview) { setOpen(true); return; }
    if (!show) { setOpen(false); return; }
    let later = false;
    try { later = window.sessionStorage.getItem(LATER_KEY) === "1"; } catch { /* noop */ }
    // 受け取り設定・アップデート情報を見ている間は出さない
    setOpen(!later && !pathname.startsWith("/notifications/settings") && !pathname.startsWith("/updates"));
  }, [show, canPreview, pathname]);

  if (!open) return null;

  async function choose(choice: "email" | "no_email") {
    setBusy(choice); setErr(null);
    const res = await fetch("/api/profile/notice-prefs/confirm", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ choice }),
    });
    setBusy(null);
    if (!res.ok) { setErr("保存できませんでした。時間をおいて再度お試しください"); return; }
    setOpen(false);
    window.dispatchEvent(new CustomEvent(NOTICES_EVENT));
    router.refresh();
  }

  function later() {
    try { window.sessionStorage.setItem(LATER_KEY, "1"); } catch { /* noop */ }
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50" role="dialog" aria-modal="true" aria-labelledby="notice-onboarding-title">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold tracking-wider text-brand-600">お知らせ設定のご案内</p>
          <h2 id="notice-onboarding-title" className="text-lg font-bold">新商品のお知らせが届くようになりました</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            新しく公開された商品を、アプリの「お知らせ」と<b>1日1回のまとめメール</b>でお知らせします。
            メールの受け取りと、受け取るタイトル（ポケモン・ワンピース・ヴァイス など）を選べます。
          </p>
        </div>

        <div className="space-y-2">
          <button type="button" className="btn-primary w-full" disabled={!!busy} onClick={() => choose("email")}>
            {busy === "email" ? "保存中…" : "メールも受け取る（全てのタイトル）"}
          </button>
          <Link href="/notifications/settings" className="btn-secondary w-full block text-center" onClick={later}>
            受け取るタイトルを選んで設定する
          </Link>
          <button type="button" className="w-full text-sm text-slate-600 hover:text-slate-900 py-2" disabled={!!busy} onClick={() => choose("no_email")}>
            {busy === "no_email" ? "保存中…" : "メールは受け取らない（アプリ内のお知らせのみ）"}
          </button>
        </div>
        {err && <p className="text-xs text-rose-600 text-center">{err}</p>}

        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
          <Link href="/updates" className="text-brand-600 hover:underline pt-3" onClick={later}>今回のアップデート内容を見る →</Link>
          <button type="button" className="text-slate-400 hover:text-slate-600 pt-3" onClick={later}>あとで</button>
        </div>
        <p className="text-[11px] text-slate-400 text-center">設定はマイページの「お知らせの受け取り設定」からいつでも変更できます。</p>
      </div>
    </div>
  );
}
