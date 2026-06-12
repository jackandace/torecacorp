"use client";

import { useState } from "react";

export function ExistingShopForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch("/api/register/existing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
    } catch {
      // メアド存在の有無を秘匿するため、エラーでも成功と同じ画面を出す
    } finally {
      setDone(true);
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="text-center space-y-3 py-4">
        <div className="text-4xl">📧</div>
        <p className="text-sm text-slate-700 leading-relaxed">
          ご登録が確認できた場合、<strong>{email}</strong> 宛に<br />
          パスワード設定用のリンクをお送りしました。
        </p>
        <p className="text-xs text-slate-500">
          メールが届かない場合: 迷惑メールフォルダをご確認ください。<br />
          それでも届かない場合、ご登録のメールアドレスと異なる可能性があります。担当者までご連絡ください。
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
          ご登録のメールアドレス
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
      <button
        type="submit"
        className="w-full inline-flex items-center justify-center rounded-md bg-brand-600 px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-brand-700 disabled:bg-slate-300 transition"
        disabled={busy || !email}
      >
        {busy ? "送信中…" : "パスワード設定リンクを送る"}
      </button>
    </form>
  );
}
