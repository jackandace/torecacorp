"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Faq, FaqCategory } from "@/types/database";
import { FAQ_CATEGORY_LABEL } from "@/constants/inquiry";

export function FaqList({ faqs }: { faqs: Faq[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Faq | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-3">
      <button className="btn-primary" onClick={() => { setCreating(true); setEditing(null); }}>
        + 新規 FAQ
      </button>

      {creating && (
        <FaqForm
          initial={null}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); router.refresh(); }}
        />
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-2 w-32">カテゴリ</th>
              <th className="text-left px-3 py-2">質問</th>
              <th className="text-right px-3 py-2 w-20">順序</th>
              <th className="text-left px-3 py-2 w-20">公開</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {faqs.map((f) => (
              <tr key={f.id} className="border-t border-slate-100">
                <td className="px-3 py-2 text-xs">{FAQ_CATEGORY_LABEL[f.category]}</td>
                <td className="px-3 py-2">{f.question}</td>
                <td className="px-3 py-2 text-right text-xs">{f.sort_order}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex text-xs px-2 py-0.5 rounded ${f.is_published ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                    {f.is_published ? "公開" : "非公開"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <button className="text-xs text-brand-600 hover:underline" onClick={() => { setEditing(f); setCreating(false); }}>編集</button>
                </td>
              </tr>
            ))}
            {faqs.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">FAQ はまだありません</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <FaqForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); router.refresh(); }}
        />
      )}
    </div>
  );
}

function FaqForm({ initial, onClose, onSaved }: { initial: Faq | null; onClose: () => void; onSaved: () => void }) {
  const [category, setCategory] = useState<FaqCategory>(initial?.category ?? "other");
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [answer, setAnswer] = useState(initial?.answer ?? "");
  const [sortOrder, setSortOrder] = useState<number>(initial?.sort_order ?? 100);
  const [isPublished, setIsPublished] = useState<boolean>(initial?.is_published ?? true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    if (!question || !answer) {
      setMessage("質問・回答は必須");
      return;
    }
    setBusy(true); setMessage(null);
    try {
      const url = initial ? `/api/admin/faqs/${initial.id}` : "/api/admin/faqs";
      const res = await fetch(url, {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, question, answer, sortOrder, isPublished }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
    } catch (e) {
      setMessage(`失敗: ${e instanceof Error ? e.message : "不明"}`);
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!initial) return;
    if (!confirm("削除しますか?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/faqs/${initial.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
    } catch (e) {
      setMessage(`削除失敗: ${e instanceof Error ? e.message : "不明"}`);
      setBusy(false);
    }
  };

  return (
    <div className="card p-5 space-y-3 text-sm border-2 border-brand-200">
      <h3 className="font-semibold">{initial ? "FAQ 編集" : "新規 FAQ"}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-600 mb-1">カテゴリ</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value as FaqCategory)}>
            {(Object.keys(FAQ_CATEGORY_LABEL) as FaqCategory[]).map((c) => (
              <option key={c} value={c}>{FAQ_CATEGORY_LABEL[c]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">表示順</label>
          <input type="number" className="input" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value || "0", 10))} />
        </div>
      </div>
      <div>
        <label className="block text-xs text-slate-600 mb-1">質問 *</label>
        <input className="input" value={question} onChange={(e) => setQuestion(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs text-slate-600 mb-1">回答 *</label>
        <textarea className="input" rows={5} value={answer} onChange={(e) => setAnswer(e.target.value)} />
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
        <span className="text-sm">公開する</span>
      </label>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button className="btn-primary text-sm" disabled={busy} onClick={save}>{busy ? "…" : "保存"}</button>
          <button className="btn-secondary text-sm" onClick={onClose}>キャンセル</button>
          {message && <span className="text-xs text-rose-600">{message}</span>}
        </div>
        {initial && (
          <button className="text-xs text-rose-600 hover:underline" onClick={remove} disabled={busy}>削除</button>
        )}
      </div>
    </div>
  );
}
