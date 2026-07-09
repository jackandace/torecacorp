"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewStaffForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState<"admin" | "super_admin">("admin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const handleSubmit = async () => {
    if (!email || !displayName) {
      setMessage({ kind: "err", text: "メール・表示名は必須です" });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, displayName, department: department || null, role }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "失敗");
      if (json.emailSent === false) {
        // 登録は成功したがメール送信に失敗 (送信レート制限など)。気づけるよう自動遷移しない。
        setMessage({
          kind: "err",
          text: "登録は完了しましたが設定メールを送信できませんでした(送信制限の可能性)。時間をおいて再招待するか、パスワード再設定リンクを送ってください。",
        });
        setBusy(false);
        return;
      }
      setMessage({ kind: "ok", text: "招待メール(パスワード設定リンク)を送信しました。一覧へ移動します…" });
      setTimeout(() => router.push("/admin/staff"), 1400);
    } catch (e) {
      setMessage({ kind: "err", text: `失敗: ${e instanceof Error ? e.message : "不明"}` });
      setBusy(false);
    }
  };

  return (
    <div className="card p-5 space-y-4 text-sm">
      <div>
        <label className="block text-xs text-slate-600 mb-1">メール *</label>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs text-slate-600 mb-1">表示名 *</label>
        <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="山田 太郎" />
      </div>
      <div>
        <label className="block text-xs text-slate-600 mb-1">部署</label>
        <input className="input" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="営業 / 経理 等" />
      </div>
      <div>
        <label className="block text-xs text-slate-600 mb-1">ロール</label>
        <select className="input" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
          <option value="admin">admin (通常の管理者)</option>
          <option value="super_admin">super_admin (ランク設定・監査ログ閲覧可)</option>
        </select>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button type="button" className="btn-primary" disabled={busy} onClick={handleSubmit}>
          {busy ? "招待中…" : "招待メールを送信"}
        </button>
        {message && <span className={`text-xs ${message.kind === "ok" ? "text-emerald-700" : "text-rose-700"}`}>{message.text}</span>}
      </div>
    </div>
  );
}
