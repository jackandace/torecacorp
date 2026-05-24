"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const MIN_LEN = 8;

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);

  // Supabase はリンククリックで自動でセッション設定する
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionReady(!!session);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (password.length < MIN_LEN) {
      setMessage({ kind: "err", text: `パスワードは ${MIN_LEN} 文字以上で入力してください` });
      return;
    }
    if (password !== confirm) {
      setMessage({ kind: "err", text: "確認用パスワードが一致しません" });
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      setMessage({ kind: "ok", text: "パスワードを設定しました。ログインへ移動します…" });
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1500);
    } catch (err) {
      setMessage({ kind: "err", text: `失敗: ${err instanceof Error ? err.message : "不明"}` });
    } finally {
      setBusy(false);
    }
  };

  if (sessionReady === false) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-rose-700 bg-rose-50 p-3 rounded">
          リンクが無効または期限切れです。再度パスワード再設定をリクエストしてください。
        </div>
        <Link href="/forgot-password" className="btn-primary w-full">
          再設定リンクを送り直す
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
          新しいパスワード ({MIN_LEN} 文字以上)
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="new-password"
          className="input-lg"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-slate-700 mb-2">
          確認用
        </label>
        <input
          id="confirm"
          type="password"
          required
          autoComplete="new-password"
          className="input-lg"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
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
        disabled={busy || !password || !confirm}
      >
        {busy ? "設定中…" : "パスワードを設定"}
      </button>
    </form>
  );
}
