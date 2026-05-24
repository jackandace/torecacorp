"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InquiryCategory } from "@/types/database";
import { INQUIRY_CATEGORY_LABEL } from "@/constants/inquiry";

interface ProductOption {
  id: string;
  series: string | null;
  title: string;
  model_number: string | null;
}

export function NewInquiryForm({ products }: { products: ProductOption[] }) {
  const router = useRouter();
  const [category, setCategory] = useState<InquiryCategory>("other");
  const [productId, setProductId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const handleSubmit = async () => {
    if (!subject || !body) {
      setMessage({ kind: "err", text: "件名・本文は必須です" });
      return;
    }
    setBusy(true); setMessage(null);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject, body, category,
          relatedProductId: productId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "失敗");
      router.push(`/inquiries/${json.inquiry.id}`);
    } catch (e) {
      setMessage({ kind: "err", text: `失敗: ${e instanceof Error ? e.message : "不明"}` });
      setBusy(false);
    }
  };

  return (
    <div className="card p-5 space-y-4 text-sm">
      <div>
        <label className="block text-xs text-slate-600 mb-1">問い合わせカテゴリ</label>
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value as InquiryCategory)}>
          {(Object.keys(INQUIRY_CATEGORY_LABEL) as InquiryCategory[]).map((c) => (
            <option key={c} value={c}>{INQUIRY_CATEGORY_LABEL[c]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-600 mb-1">関連商品 (任意)</label>
        <select className="input" value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">— なし —</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.series ? `[${p.series}] ` : ""}{p.title}{p.model_number ? ` (${p.model_number})` : ""}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-600 mb-1">件名 *</label>
        <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="例: PK-SV2A-J の納期について" />
      </div>
      <div>
        <label className="block text-xs text-slate-600 mb-1">本文 *</label>
        <textarea className="input" rows={8} value={body} onChange={(e) => setBody(e.target.value)} placeholder="お問い合わせ内容を詳しくご記入ください" />
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button type="button" className="btn-primary" disabled={busy} onClick={handleSubmit}>
          {busy ? "送信中…" : "送信"}
        </button>
        {message && <span className={`text-xs ${message.kind === "ok" ? "text-emerald-700" : "text-rose-700"}`}>{message.text}</span>}
      </div>
    </div>
  );
}
