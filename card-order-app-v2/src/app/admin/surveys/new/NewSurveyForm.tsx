"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ShopOption { id: string; company_name: string }

export function NewSurveyForm({ shops }: { shops: ShopOption[] }) {
  const router = useRouter();
  const [shopId, setShopId] = useState("");
  const [surveyedAt, setSurveyedAt] = useState(new Date().toISOString().slice(0, 10));
  const [surveyor, setSurveyor] = useState("");
  const [content, setContent] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!shopId || !content) {
      setMessage("ショップと内容は必須です");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("shopId", shopId);
      fd.append("surveyedAt", surveyedAt);
      fd.append("surveyor", surveyor);
      fd.append("content", content);
      if (pdf) fd.append("pdf", pdf);
      const res = await fetch("/api/surveys", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "失敗");
      router.push("/admin/surveys");
    } catch (e) {
      setMessage(`失敗: ${e instanceof Error ? e.message : "不明"}`);
      setBusy(false);
    }
  };

  return (
    <div className="card p-5 space-y-4 text-sm">
      <div>
        <label className="block text-xs text-slate-600 mb-1">ショップ *</label>
        <select className="input" value={shopId} onChange={(e) => setShopId(e.target.value)}>
          <option value="">— 選択 —</option>
          {shops.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-600 mb-1">調査日</label>
          <input type="date" className="input" value={surveyedAt} onChange={(e) => setSurveyedAt(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">調査者</label>
          <input className="input" value={surveyor} onChange={(e) => setSurveyor(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="block text-xs text-slate-600 mb-1">内容 *</label>
        <textarea className="input" rows={6} value={content} onChange={(e) => setContent(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs text-slate-600 mb-1">レポート PDF (任意)</label>
        <input type="file" accept="application/pdf" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} className="text-xs" />
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className="btn-primary" disabled={busy} onClick={handleSubmit}>
          {busy ? "登録中…" : "登録"}
        </button>
        {message && <span className="text-xs">{message}</span>}
      </div>
    </div>
  );
}
