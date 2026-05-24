"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MIN_LEN = 8;

export function PasswordChangeForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const handleSubmit = async () => {
    setMessage(null);
    if (newPassword.length < MIN_LEN) {
      setMessage({ kind: "err", text: `パスワードは ${MIN_LEN} 文字以上で入力してください` });
      return;
    }
    if (newPassword !== confirm) {
      setMessage({ kind: "err", text: "確認用パスワードが一致しません" });
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
      setMessage({ kind: "ok", text: "パスワードを変更しました" });
      setNewPassword("");
      setConfirm("");
    } catch (e) {
      setMessage({ kind: "err", text: `失敗: ${e instanceof Error ? e.message : "不明"}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-5 space-y-4">
      <h2 className="font-semibold">パスワード変更</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <label className="block text-xs text-slate-600 mb-1">新しいパスワード ({MIN_LEN} 文字以上)</label>
          <input
            type="password"
            className="input"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">確認用 (もう一度)</label>
          <input
            type="password"
            className="input"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className="btn-primary" disabled={busy || !newPassword || !confirm} onClick={handleSubmit}>
          {busy ? "変更中…" : "パスワードを変更"}
        </button>
        {message && (
          <span className={`text-xs ${message.kind === "ok" ? "text-emerald-700" : "text-rose-700"}`}>
            {message.text}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500">
        ※ 現在のセッションでログイン中の場合のみ変更可能です。ログアウト・別ブラウザでは反映されません。
      </p>
    </section>
  );
}
