"use client";

import { useState } from "react";
import Link from "next/link";
import type { BusinessType } from "@/types/database";
import { BUSINESS_TYPE_LABEL } from "@/constants/business";

// 申込みフォームの選択肢は Google フォーム時代と同じ 3 択 ("other" は出さない)
const BUSINESS_TYPE_CHOICES: BusinessType[] = ["physical_only", "physical_and_ec", "ec_only"];

export function ApplyForm() {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [billingName, setBillingName] = useState("");
  const [postal, setPostal] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryPostal, setDeliveryPostal] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [sameAsAddress, setSameAsAddress] = useState(true);
  const [receiverName, setReceiverName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType | "">("");
  const [openedAt, setOpenedAt] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [interestedTitles, setInterestedTitles] = useState("");
  const [note, setNote] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const ecOnly = businessType === "ec_only";

  const handleSubmit = async () => {
    setMessage(null);
    if (!companyName || !contactName || !email || !phone) {
      setMessage("会社名・担当者・メールアドレス・電話番号は必須です");
      return;
    }
    if (!postal || !address) {
      setMessage("登録住所 (郵便番号・住所) を入力してください");
      return;
    }
    if (!sameAsAddress && (!deliveryPostal || !deliveryAddress)) {
      setMessage("配送先住所 (郵便番号・住所) を入力してください");
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
      const fullAddress = [postal, address].join(" ");
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          contactName,
          email: email.trim().toLowerCase(),
          phone,
          billingName: billingName || undefined,
          address: fullAddress,
          deliveryAddress: sameAsAddress ? fullAddress : [deliveryPostal, deliveryAddress].join(" "),
          receiverName: receiverName || undefined,
          businessType,
          openedAt: openedAt || undefined,
          storeUrl: storeUrl || undefined,
          interestedTitles: interestedTitles || undefined,
          note: note || undefined,
          termsAgreed: true,
          website,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "申請の送信に失敗しました");
      setDone(true);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "申請の送信に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="card p-8 sm:p-12 text-center space-y-4">
        <div className="text-4xl">✅</div>
        <h2 className="text-xl font-bold">お申込みを受け付けました</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          <strong>{email}</strong> 宛に受付確認メールをお送りしました。<br />
          審査結果は、内容の確認ができ次第メールでご連絡いたします。
        </p>
        <p className="text-xs text-slate-500">
          確認メールが届かない場合は、迷惑メールフォルダをご確認ください。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 事業者情報 */}
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
            <p className="text-xs text-slate-500 mt-1">審査結果のご連絡先になります</p>
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">電話番号 *</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03-1234-5678" />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">請求書発行先名称</label>
            <input className="input" value={billingName} onChange={(e) => setBillingName(e.target.value)} placeholder="会社名と異なる場合のみ" />
          </div>
          {/* honeypot: 人間には見えない。ボットが埋めたら弾く */}
          <div className="hidden" aria-hidden="true">
            <label>Website</label>
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
        </div>

        <h2 className="font-bold text-lg pt-2 border-t border-slate-100">住所</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-xs text-slate-600 mb-1">郵便番号 (登録住所) *</label>
            <input className="input" value={postal} onChange={(e) => setPostal(e.target.value)} placeholder="123-4567" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-600 mb-1">登録住所 (実店舗所在地) *</label>
            <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="東京都〇〇区…" />
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={sameAsAddress} onChange={(e) => setSameAsAddress(e.target.checked)} />
              <span>配送先は登録住所と同じ</span>
            </label>
          </div>
          {!sameAsAddress && (
            <>
              <div>
                <label className="block text-xs text-slate-600 mb-1">郵便番号 (配送先) *</label>
                <input className="input" value={deliveryPostal} onChange={(e) => setDeliveryPostal(e.target.value)} placeholder="123-4567" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-600 mb-1">配送先住所 *</label>
                <input className="input" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="東京都〇〇区…" />
              </div>
            </>
          )}
          <div>
            <label className="block text-xs text-slate-600 mb-1">受取人名</label>
            <input className="input" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="担当者と異なる場合のみ" />
          </div>
        </div>

        <h2 className="font-bold text-lg pt-2 border-t border-slate-100">運営情報</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-xs text-slate-600 mb-1">運営形態 *</label>
            <select className="input" value={businessType} onChange={(e) => setBusinessType(e.target.value as BusinessType | "")}>
              <option value="">— 選択してください —</option>
              {BUSINESS_TYPE_CHOICES.map((b) => (
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
            <p className="text-xs text-slate-500 mt-1">運営歴は審査の参考にさせていただきます</p>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-600 mb-1">店舗紹介 / EC サイト URL</label>
            <input className="input" value={storeUrl} onChange={(e) => setStoreUrl(e.target.value)} placeholder="https://…（SNS アカウントでも可）" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-600 mb-1">新商品案内を希望するタイトル</label>
            <textarea className="input" rows={2} value={interestedTitles} onChange={(e) => setInterestedTitles(e.target.value)} placeholder="例: ポケモンカード、ワンピースカード、遊戯王、デュエル・マスターズ など" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-600 mb-1">備考</label>
            <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="ご質問・ご要望などあればご記入ください" />
          </div>
        </div>
      </div>

      {/* 同意 */}
      <div className="card p-6 sm:p-8 space-y-4">
        <h2 className="font-bold text-lg">利用注意事項・免責事項</h2>
        <p className="text-sm text-slate-600">
          お申込みの前に
          <Link href="/terms" target="_blank" className="text-brand-600 hover:underline mx-1">利用注意事項・免責事項</Link>
          をご確認ください。
        </p>
        <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <span className="text-sm">
            利用注意事項・免責事項をすべて読み、内容に<strong>同意します</strong>
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
        {busy ? "送信中…" : "審査を申し込む"}
      </button>
      <p className="text-xs text-slate-500 text-center">
        送信後、受付確認メールが自動で届きます。審査結果は確認でき次第ご連絡します。
      </p>
    </div>
  );
}
