"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RankCode } from "@/types/database";
import { RANK_LABEL } from "@/constants/ranks";

export function NewShopForm() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [rank, setRank] = useState<RankCode>("standard");
  const [sendInvite, setSendInvite] = useState(true);
  const [activateImmediately, setActivateImmediately] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!companyName || !contactName) {
      setMessage("会社名・担当者は必須です");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          contactName,
          email: email.trim() || null,
          phone: phone || null,
          address: address || null,
          deliveryAddress: deliveryAddress || null,
          currentRank: rank,
          sendInvite: !!email && sendInvite,
          activateImmediately,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "登録失敗");
      router.push(`/admin/shops/${json.shop.id}`);
    } catch (e) {
      setMessage(`失敗: ${e instanceof Error ? e.message : "不明"}`);
      setBusy(false);
    }
  };

  return (
    <div className="card p-5 space-y-4 text-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-600 mb-1">会社名 *</label>
          <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">担当者 *</label>
          <input className="input" value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">担当者メール (任意)</label>
          <input className="input" type="email" placeholder="後で追加可能" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">電話番号</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">初期ランク</label>
          <select className="input" value={rank} onChange={(e) => setRank(e.target.value as RankCode)}>
            {(Object.keys(RANK_LABEL) as RankCode[]).map((r) => (
              <option key={r} value={r}>{RANK_LABEL[r]}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-600 mb-1">住所</label>
          <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-600 mb-1">納品先住所</label>
          <textarea className="input" rows={2} value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2 pt-2 border-t">
        <label className="flex items-center gap-2" title={!email ? "メアド未入力時は無効" : ""}>
          <input
            type="checkbox"
            checked={sendInvite && !!email}
            disabled={!email}
            onChange={(e) => setSendInvite(e.target.checked)}
          />
          <span className={!email ? "text-slate-400" : ""}>招待メールを送信する (Supabase Auth)</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={activateImmediately} onChange={(e) => setActivateImmediately(e.target.checked)} />
          <span>即時 active にする (チェックなしは pending)</span>
        </label>
        {!email && (
          <p className="text-xs text-slate-500 pl-6">
            メールアドレスが空のまま登録できます。後でショップ詳細から追記すると Auth ユーザーが自動作成されます。
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button type="button" className="btn-primary" disabled={busy} onClick={handleSubmit}>
          {busy ? "登録中…" : "登録"}
        </button>
        {message && <span className="text-xs">{message}</span>}
      </div>
    </div>
  );
}
