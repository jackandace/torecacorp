"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw new Error(error.message);
      setMessage({
        kind: "ok",
        text: "再設定リンクをメール送信しました。受信箱を確認してください (届かない場合は迷惑メールも)。",
      });
    } catch (err) {
      // セキュリティ上、メアド存在の有無は伝えない (常に成功風レスポンス)
      setMessage({
        kind: "ok",
        text: "再設定リンクをメール送信しました (該当アカウントがある場合)。受信箱を確認してください。",
      });
      console.error("[forgot-password]", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
          登録メールアドレス
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          className="input-lg"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {message && (
        <p className={`text-sm ${message.kind === "ok" ? "text-emerald-700" : "text-rose-700"}`}>
          {message.text}
        </p>
      )}
      <button
        type="submit"
        className="w-full inline-flex items-center justify-center rounded-md bg-brand-600 px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-brand-700 disabled:bg-slate-300 transition"
        disabled={busy || !email}
      >
        {busy ? "送信中…" : "再設定リンクを送る"}
      </button>
      <div className="text-center">
        <Link href="/login" className="text-sm text-brand-600 hover:underline">
          ← ログインに戻る
        </Link>
      </div>
    </form>
  );
}
