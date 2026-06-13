"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Shop } from "@/types/database";

// ショップ自身が直接変更できるのは担当者名と電話番号のみ。
// 会社名・登録住所は変更不可 (なりすまし対策)。配送先は承認制 (別コンポーネント)。
export function ProfileForm({ shop }: { shop: Shop }) {
  const router = useRouter();
  const [contactName, setContactName] = useState(shop.contact_name);
  const [phone, setPhone] = useState(shop.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const handleSubmit = async () => {
    if (!contactName) {
      setMessage({ kind: "err", text: "担当者名は必須です" });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName,
          phone: phone || null,
          lastUpdatedAt: shop.updated_at,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "保存失敗");
      setMessage({ kind: "ok", text: "保存しました" });
      router.refresh();
    } catch (e) {
      setMessage({ kind: "err", text: `失敗: ${e instanceof Error ? e.message : "不明"}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-5 space-y-4">
      <h2 className="font-semibold">連絡先の編集</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <label className="block text-xs text-slate-600 mb-1">担当者名 *</label>
          <input className="input" value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">電話番号</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className="btn-primary" disabled={busy} onClick={handleSubmit}>
          {busy ? "保存中…" : "保存"}
        </button>
        {message && (
          <span className={`text-xs ${message.kind === "ok" ? "text-emerald-700" : "text-rose-700"}`}>
            {message.text}
          </span>
        )}
      </div>
    </section>
  );
}
