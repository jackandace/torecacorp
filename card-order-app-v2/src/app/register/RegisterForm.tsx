"use client";

import { useState } from "react";
import { TERMS_SECTIONS, TERMS_VERSION } from "@/constants/terms";
import type { BusinessType } from "@/types/database";
import { BUSINESS_TYPE_LABEL } from "@/constants/business";

interface Props {
  token: string;
  prefillEmail: string;
  prefillCompany: string;
}

export function RegisterForm({ token, prefillEmail, prefillCompany }: Props) {
  const [companyName, setCompanyName] = useState(prefillCompany);
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState(prefillEmail);
  const [phone, setPhone] = useState("");
  const [postal, setPostal] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType | "">("");
  const [openedAt, setOpenedAt] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // EC のみは登録ボタンを抑止 (審査前提だが、フォームでも明示)
  const ecOnly = businessType === "ec_only";

  const handleSubmit = async () => {
    setMessage(null);
    if (!companyName || !contactName || !email) {
      setMessage("会社名・担当者・メールアドレスは必須です");
      return;
    }
    if (!businessType) {
      setMessage("運営形態を選択してください");
      return;
    }
    if (ecOnly) {
      setMessage("申し訳ございません。EC のみで営業されている事業者様とはお取引できません。");
      return;
    }
    if (!agreed) {
      setMessage("利用注意事項・免責事項への同意が必要です");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          companyName,
          contactName,
          email: email.trim().toLowerCase(),
          phone: phone || null,
          address: [postal, address].filter(Boolean).join(" ") || null,
          deliveryAddress: deliveryAddress || null,
          businessType,
          openedAt: openedAt || null,
          termsVersion: TERMS_VERSION,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "登録に失敗しました");
      setDone(true);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "登録に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="card p-8 sm:p-12 text-center space-y-4">
        <div className="text-4xl">📧</div>
        <h2 className="text-xl font-bold">確認メールを送信しました</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          <strong>{email}</strong> 宛に認証メールをお送りしました。<br />
          メール内のリンクをクリックしてパスワードを設定すると、ログインできるようになります。
        </p>
        <p className="text-xs text-slate-500">
          メールが届かない場合は迷惑メールフォルダをご確認のうえ、担当者までご連絡ください。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 登録フォーム */}
      <div className="card p-6 sm:p-8 space-y-4">
        <h2 className="font-bold text-lg">事業者情報</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-600 mb-1">会社名・屋号 *</label>
            <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="株式会社〇〇 / カードショップ〇〇" />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">担当者名 *</label>
            <input className="input" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="山田 太郎" />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">メールアドレス *</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            <p className="text-xs text-slate-500 mt-1">ログイン ID 兼 認証メールの宛先になります</p>
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">電話番号</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03-1234-5678" />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">郵便番号</label>
            <input className="input" value={postal} onChange={(e) => setPostal(e.target.value)} placeholder="123-4567" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-600 mb-1">登録住所 (実店舗所在地)</label>
            <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="東京都〇〇区…" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-600 mb-1">配送先住所 (登録住所と異なる場合)</label>
            <textarea className="input" rows={2} value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="空欄の場合は登録住所にお届けします" />
          </div>
        </div>

        <h2 className="font-bold text-lg pt-2 border-t border-slate-100">運営情報</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-xs text-slate-600 mb-1">運営形態 *</label>
            <select className="input" value={businessType} onChange={(e) => setBusinessType(e.target.value as BusinessType | "")}>
              <option value="">— 選択してください —</option>
              {(Object.keys(BUSINESS_TYPE_LABEL) as BusinessType[]).map((b) => (
                <option key={b} value={b}>{BUSINESS_TYPE_LABEL[b]}</option>
              ))}
            </select>
            {ecOnly && (
              <p className="text-xs text-rose-600 mt-1 font-medium">
                ⚠ EC のみで営業されている事業者様とはお取引できません
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">開業日 (実店舗)</label>
            <input className="input" type="date" value={openedAt} onChange={(e) => setOpenedAt(e.target.value)} />
            <p className="text-xs text-slate-500 mt-1">開業届等の証憑をご提出いただく場合があります</p>
          </div>
        </div>
      </div>

      {/* 利用注意事項・免責事項 */}
      <div className="card p-6 sm:p-8 space-y-4">
        <h2 className="font-bold text-lg">利用注意事項・免責事項</h2>
        <p className="text-xs text-slate-500">最終改定: {TERMS_VERSION}</p>
        <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg p-4 space-y-5 bg-slate-50 text-sm">
          {TERMS_SECTIONS.map((section) => (
            <section key={section.heading}>
              <h3 className="font-semibold mb-2">{section.heading}</h3>
              <ul className="space-y-1.5 list-disc list-outside ml-5 text-slate-700">
                {section.items.map((item, i) => (
                  <li key={i} className="leading-relaxed">{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <span className="text-sm">
            上記の利用注意事項・免責事項をすべて読み、内容に<strong>同意します</strong>
          </span>
        </label>
      </div>

      {message && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">{message}</p>
      )}

      <button
        type="button"
        className="w-full inline-flex items-center justify-center rounded-md bg-brand-600 px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
        disabled={busy || !agreed || ecOnly}
        onClick={handleSubmit}
      >
        {busy ? "登録中…" : "同意して登録する"}
      </button>
      <p className="text-xs text-slate-500 text-center">
        登録後、認証メールが届きます。メール内のリンクからパスワードを設定してください。
      </p>
    </div>
  );
}
