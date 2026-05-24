"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InquiryMessage } from "@/types/database";
import { formatJST } from "@/lib/dates";

interface Props {
  inquiryId: string;
  initialBody: string;
  messages: InquiryMessage[];
  fromKind: "shop" | "admin";
  closed: boolean;
}

export function InquiryThread({ inquiryId, initialBody, messages, fromKind, closed }: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const reply = async () => {
    if (!body.trim()) return;
    setBusy(true); setMessage(null);
    try {
      const endpoint = fromKind === "shop" ? `/api/inquiries/${inquiryId}/reply` : `/api/admin/inquiries/${inquiryId}/reply`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error(await res.text());
      setBody("");
      router.refresh();
    } catch (e) {
      setMessage(`失敗: ${e instanceof Error ? e.message : "不明"}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      {/* 元の問い合わせ本文 */}
      <Bubble who={fromKind === "shop" ? "shop" : "admin"} body={initialBody} time={null} label="最初の問い合わせ" highlight />
      {messages.map((m) => (
        <Bubble key={m.id} who={m.from_kind} body={m.body} time={m.created_at} />
      ))}

      {closed ? (
        <div className="card p-4 text-sm text-slate-500 text-center">この問い合わせはクローズされています</div>
      ) : (
        <div className="card p-4 space-y-2">
          <label className="block text-xs text-slate-600">返信</label>
          <textarea className="input" rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="返信内容を入力" />
          <div className="flex items-center gap-3">
            <button type="button" className="btn-primary text-sm" disabled={busy || !body.trim()} onClick={reply}>
              {busy ? "送信中…" : "返信を送信"}
            </button>
            {message && <span className="text-xs text-rose-600">{message}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function Bubble({ who, body, time, label, highlight }: { who: "shop" | "admin"; body: string; time: string | null; label?: string; highlight?: boolean }) {
  const isShop = who === "shop";
  return (
    <div className={`flex ${isShop ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-lg p-3 text-sm ${isShop ? "bg-brand-50 border border-brand-200" : "bg-white border border-slate-200"} ${highlight ? "ring-2 ring-amber-200" : ""}`}>
        <div className="text-xs text-slate-500 mb-1">
          {label ?? (isShop ? "ショップ" : "トレカ商事 (管理)")}
          {time && ` · ${formatJST(time)}`}
        </div>
        <div className="whitespace-pre-wrap">{body}</div>
      </div>
    </div>
  );
}
