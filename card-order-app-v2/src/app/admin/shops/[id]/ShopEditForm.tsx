"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Shop, RankCode, ShopStatus, BusinessType } from "@/types/database";
import { RANK_LABEL } from "@/constants/ranks";
import { BUSINESS_TYPE_LABEL } from "@/constants/business";

export function ShopEditForm({ shop }: { shop: Shop }) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState(shop.company_name);
  const [contactName, setContactName] = useState(shop.contact_name);
  const [email, setEmail] = useState(shop.email ?? "");
  const [phone, setPhone] = useState(shop.phone ?? "");
  const [address, setAddress] = useState(shop.address ?? "");
  const [deliveryAddress, setDeliveryAddress] = useState(shop.delivery_address ?? "");
  const [status, setStatus] = useState<ShopStatus>(shop.status);
  const [rank, setRank] = useState<RankCode>(shop.current_rank);
  const [rateOverride, setRateOverride] = useState<string>(
    shop.rate_override != null ? String(shop.rate_override) : "",
  );
  const [businessType, setBusinessType] = useState<BusinessType | "">(shop.business_type ?? "");
  const [openedAt, setOpenedAt] = useState(shop.opened_at ?? "");
  const [lifetimeAmount, setLifetimeAmount] = useState<string>(String(shop.lifetime_amount ?? 0));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const hasAuthUser = !!shop.user_id;
  const emailChanged = (email || null) !== shop.email;

  // 開業日 → 運営年数
  const operatingYears = openedAt
    ? Math.floor((new Date().getTime() - new Date(openedAt).getTime()) / (1000 * 60 * 60 * 24 * 365.25) * 10) / 10
    : null;

  const handleSubmit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const payload = {
        companyName,
        contactName,
        email: email.trim() || null,
        phone: phone || null,
        address: address || null,
        deliveryAddress: deliveryAddress || null,
        status,
        currentRank: rank,
        rateOverride: rateOverride === "" ? null : parseFloat(rateOverride),
        businessType: businessType || null,
        openedAt: openedAt || null,
        lifetimeAmount: parseInt(lifetimeAmount || "0", 10),
        lastUpdatedAt: shop.updated_at,
      };
      const res = await fetch(`/api/shops/${shop.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "更新失敗");
      setMessage("保存しました");
      router.refresh();
    } catch (e) {
      setMessage(`失敗: ${e instanceof Error ? e.message : "不明"}`);
    } finally {
      setBusy(false);
    }
  };

  const handleInvite = async () => {
    if (!email) {
      setMessage("メールアドレスを入力してから招待してください");
      return;
    }
    if (!confirm(`${email} に招待メールを送信します。よろしいですか?`)) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/shops/${shop.id}/invite`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "招待失敗");
      setMessage("招待メールを送信しました");
      router.refresh();
    } catch (e) {
      setMessage(`失敗: ${e instanceof Error ? e.message : "不明"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-5 space-y-4">
      <h2 className="font-semibold">基本情報の編集</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <label className="block text-xs text-slate-600 mb-1">会社名 *</label>
          <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">担当者 *</label>
          <input className="input" value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-600 mb-1">
            メール
            {!hasAuthUser && email && (
              <span className="ml-2 text-amber-600">※ 保存時にショップユーザーを自動作成します</span>
            )}
            {hasAuthUser && (
              <span className="ml-2 text-emerald-600">✓ ログインユーザー紐付け済み</span>
            )}
          </label>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              type="email"
              placeholder="未設定 (後から追加可能)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {hasAuthUser && email && !emailChanged && (
              <button
                type="button"
                className="btn-secondary text-xs whitespace-nowrap"
                onClick={handleInvite}
                disabled={busy}
                title="パスワード再設定リンクをメール送信"
              >
                招待メール再送
              </button>
            )}
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">電話番号</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">ステータス</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as ShopStatus)}>
            <option value="pending">pending (審査中)</option>
            <option value="active">active (稼働中)</option>
            <option value="suspended">suspended (停止)</option>
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

      {/* 運営情報・審査 */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">運営情報 (審査用)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-xs text-slate-600 mb-1">運営形態</label>
            <select className="input" value={businessType} onChange={(e) => setBusinessType(e.target.value as BusinessType | "")}>
              <option value="">— 未設定 —</option>
              {(Object.keys(BUSINESS_TYPE_LABEL) as BusinessType[]).map((b) => (
                <option key={b} value={b}>{BUSINESS_TYPE_LABEL[b]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">
              開業日
              {operatingYears != null && (
                <span className={`ml-2 ${operatingYears >= 2 ? "text-emerald-700" : "text-amber-700"}`}>
                  運営 {operatingYears} 年
                  {operatingYears < 2 && " (2 年未満)"}
                </span>
              )}
            </label>
            <input type="date" className="input" value={openedAt} onChange={(e) => setOpenedAt(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">累計発注額 (円・手動入力)</label>
            <input
              type="number"
              className="input"
              min={0}
              value={lifetimeAmount}
              onChange={(e) => setLifetimeAmount(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">移行データなど、本システム外の累計を記録</p>
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">ランク・掛け率</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-xs text-slate-600 mb-1">ランク (手動上書き)</label>
            <select className="input" value={rank} onChange={(e) => setRank(e.target.value as RankCode)}>
              {(Object.keys(RANK_LABEL) as RankCode[]).map((r) => (
                <option key={r} value={r}>{RANK_LABEL[r]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">個別掛け率 (空欄でデフォルト)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min={0}
              max={1}
              placeholder="例: 0.84"
              value={rateOverride}
              onChange={(e) => setRateOverride(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button type="button" className="btn-primary" disabled={busy} onClick={handleSubmit}>
          {busy ? "保存中…" : "保存"}
        </button>
        {message && <span className="text-xs">{message}</span>}
      </div>
    </section>
  );
}
