"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const MIN_LEN = 8;

// token_hash リンクで受け付ける type (メールテンプレートから渡る)
const OTP_TYPES: EmailOtpType[] = ["recovery", "invite", "signup", "magiclink", "email"];

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  // null = 判定中, true = セッション確立(またはtoken_hash方式で入力可), false = リンク無効
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);
  // token_hash 方式: リンクを開いただけではトークンを消費せず、
  // 「パスワードを設定」ボタン押下時に verifyOtp で初めて有効化する。
  // メールのセキュリティスキャナがリンクを自動アクセスしても無害になる。
  const [pendingOtp, setPendingOtp] = useState<{ tokenHash: string; type: EmailOtpType } | null>(null);

  // メールリンクからのセッション確立は複数の経路がある:
  //   0. token_hash フロー: ?token_hash=xxx&type=recovery → ボタン押下時に verifyOtp (推奨)
  //   1. PKCE フロー: ?code=xxx → exchangeCodeForSession
  //   2. implicit フロー: #access_token=... → supabase-js が自動処理 (非同期)
  //   3. onAuthStateChange の PASSWORD_RECOVERY / SIGNED_IN イベント
  // 自動処理との競合 (race) を避けるため、イベント購読 + 猶予付きで判定する。
  useEffect(() => {
    const supabase = createClient();
    let settled = false;

    // token_hash 方式ならこの時点では何も検証しない (スキャナ対策)
    const url = new URL(window.location.href);
    const tokenHash = url.searchParams.get("token_hash");
    const typeParam = url.searchParams.get("type") as EmailOtpType | null;
    if (tokenHash && typeParam && OTP_TYPES.includes(typeParam)) {
      setPendingOtp({ tokenHash, type: typeParam });
      setSessionReady(true);
      return;
    }

    const settle = (ok: boolean) => {
      if (settled && ok === false) return; // 一度 OK になったら戻さない
      settled = settled || ok;
      setSessionReady((prev) => (prev === true ? true : ok));
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session || event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        settle(true);
      }
    });

    (async () => {
      // PKCE (?code=) 形式
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          settle(true);
          return;
        }
      }

      // 既にセッションがあるか
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        settle(true);
        return;
      }

      // implicit フロー (#access_token) の自動処理を最大 3 秒待つ
      setTimeout(async () => {
        if (settled) return;
        const { data: { session: s2 } } = await supabase.auth.getSession();
        settle(!!s2);
        if (!s2) setSessionReady(false);
      }, 3000);
    })();

    return () => subscription.unsubscribe();
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

      // token_hash 方式: ここで初めてトークンを消費してセッションを張る
      if (pendingOtp) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          const { error: vErr } = await supabase.auth.verifyOtp({
            type: pendingOtp.type,
            token_hash: pendingOtp.tokenHash,
          });
          if (vErr) {
            // 期限切れ・使用済みは「リンク無効」画面へ (再送導線を見せる)
            setSessionReady(false);
            return;
          }
        }
      }

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

  // 判定中はスピナー的表示 (即「無効」と出さない)
  if (sessionReady === null) {
    return (
      <div className="text-center py-8 text-sm text-slate-500">
        リンクを確認しています…
      </div>
    );
  }

  if (sessionReady === false) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-rose-700 bg-rose-50 p-4 rounded-lg leading-relaxed">
          <p className="font-semibold mb-2">リンクが無効または期限切れです</p>
          <p className="text-xs text-rose-600">
            メールのリンクは 1 回のみ有効です。迷惑メールフォルダに入っていた場合、
            メールソフトの安全確認機能によりリンクが先に使用されてしまうことがあります。
            お手数ですが、下のボタンから再設定リンクをもう一度お送りください。
          </p>
        </div>
        <Link href="/forgot-password" className="btn-primary w-full text-center block">
          再設定リンクを送り直す
        </Link>
        <p className="text-xs text-slate-500 text-center leading-relaxed">
          再送したメールが再び迷惑メールフォルダに入った場合は、<br />
          メールを開いて「迷惑メールではない」を押してから、リンクをクリックしてください。
        </p>
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
