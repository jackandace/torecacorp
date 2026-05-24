"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Shop } from "@/types/database";

export function ProfileForm({ shop }: { shop: Shop }) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState(shop.company_name);
  const [contactName, setContactName] = useState(shop.contact_name);
  const [phone, setPhone] = useState(shop.phone ?? "");
  const [address, setAddress] = useState(shop.address ?? "");
  const [deliveryAddress, setDeliveryAddress] = useState(shop.delivery_address ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const handleSubmit = async () => {
    if (!companyName || !contactName) {
      setMessage({ kind: "err", text: "会社名・担当者は必須です" });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          contactName,
          phone: phone || null,
          address: address || null,
          deliveryAddress: deliveryAddress || null,
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
      <h2 className="font-semibold">基本情報の編集</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-600 mb-1">会社名・屋号 *</label>
          <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">担当者 *</label>
          <input className="input" value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">電話番号</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-600 mb-1">登録住所</label>
          <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="〒123-4567 東京都..." />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-600 mb-1">配送先住所 (登録住所と異なる場合)</label>
          <textarea
            className="input"
            rows={2}
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            placeholder="登録住所と同じ場合は空欄でOK"
          />
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
