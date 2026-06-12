"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RegistrationInvite } from "@/types/database";
import { formatJST } from "@/lib/dates";

export function InvitesManager({ invites }: { invites: RegistrationInvite[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [note, setNote] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(14);
  const [busy, setBusy] = useState(false);
  const [issuedUrl, setIssuedUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    setBusy(true);
    setMessage(null);
    setIssuedUrl(null);
    try {
      const res = await fetch("/api/registration-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim() || null,
          companyName: companyName.trim() || null,
          note: note.trim() || null,
          expiresInDays,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "発行失敗");
      setIssuedUrl(json.url);
      setEmail(""); setCompanyName(""); setNote("");
      router.refresh();
    } catch (e) {
      setMessage(`失敗: ${e instanceof Error ? e.message : "不明"}`);
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("この招待リンクを失効させますか?")) return;
    try {
      const res = await fetch(`/api/registration-invites/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e) {
      alert(`失敗: ${e instanceof Error ? e.message : "不明"}`);
    }
  };

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <>
      {/* 発行フォーム */}
      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">新しい招待リンクを発行</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-xs text-slate-600 mb-1">案内先メール (任意・フォームにプリフィル)</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="shop@example.com" />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">会社名 (任意・プリフィル)</label>
            <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="カードショップ〇〇" />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">審査メモ (社内用)</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="実店舗確認済 (Google Map) / 運営 3 年" />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">有効期限</label>
            <select className="input" value={expiresInDays} onChange={(e) => setExpiresInDays(parseInt(e.target.value, 10))}>
              <option value={7}>7 日間</option>
              <option value={14}>14 日間</option>
              <option value={30}>30 日間</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="btn-primary" disabled={busy} onClick={handleCreate}>
            {busy ? "発行中…" : "招待リンクを発行"}
          </button>
          {message && <span className="text-xs text-rose-600">{message}</span>}
        </div>

        {issuedUrl && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold text-emerald-900">✓ 発行しました。この URL をメールで案内してください:</p>
            <div className="flex gap-2 items-center">
              <code className="flex-1 text-xs bg-white border border-emerald-200 rounded px-3 py-2 break-all">{issuedUrl}</code>
              <button type="button" className="btn-secondary text-xs whitespace-nowrap" onClick={() => handleCopy(issuedUrl)}>
                {copied ? "✓ コピー済" : "コピー"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 発行済み一覧 */}
      <section className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-2">発行日</th>
              <th className="text-left px-3 py-2">案内先</th>
              <th className="text-left px-3 py-2">メモ</th>
              <th className="text-left px-3 py-2">期限</th>
              <th className="text-left px-3 py-2">状態</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invites.map((inv) => {
              const expired = new Date(inv.expires_at) < new Date();
              const status = inv.used_at ? "used" : expired ? "expired" : "active";
              return (
                <tr key={inv.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-xs">{formatJST(inv.created_at)}</td>
                  <td className="px-3 py-2">
                    <div className="text-xs">{inv.email ?? "—"}</div>
                    {inv.company_name && <div className="text-xs text-slate-500">{inv.company_name}</div>}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">{inv.note ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{inv.expires_at.slice(0, 10)}</td>
                  <td className="px-3 py-2">
                    {status === "used" && <span className="inline-flex text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">✓ 登録済</span>}
                    {status === "expired" && <span className="inline-flex text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500">期限切れ</span>}
                    {status === "active" && <span className="inline-flex text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">有効</span>}
                  </td>
                  <td className="px-3 py-2 space-x-2 whitespace-nowrap">
                    {status === "active" && (
                      <>
                        <button
                          type="button"
                          className="text-xs text-brand-600 hover:underline"
                          onClick={() => handleCopy(`${appUrl}/register?token=${inv.token}`)}
                        >
                          URL コピー
                        </button>
                        <button
                          type="button"
                          className="text-xs text-rose-600 hover:underline"
                          onClick={() => handleRevoke(inv.id)}
                        >
                          失効
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {invites.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">招待リンクはまだ発行されていません</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
