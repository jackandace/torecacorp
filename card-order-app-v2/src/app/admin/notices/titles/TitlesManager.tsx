"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Row { id: string; name: string; keywords: string[]; sortOrder: number; autoCreated: boolean; products: number; series: string[] }

const splitKeywords = (s: string) => s.split(/[,、，\n]/).map((k) => k.trim()).filter(Boolean);

export function TitlesManager({ titles, unclassified }: { titles: Row[]; unclassified: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [sortOrder, setSortOrder] = useState("100");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function open(row: Row | null) {
    setMsg(null);
    if (row) { setEditing(row.id); setName(row.name); setKeywords(row.keywords.join(", ")); setSortOrder(String(row.sortOrder)); }
    else { setEditing("new"); setName(""); setKeywords(""); setSortOrder("100"); }
  }

  async function save() {
    setBusy(true); setMsg(null);
    const payload = { name, keywords: splitKeywords(keywords), sortOrder: parseInt(sortOrder, 10) || 100 };
    const res = await fetch(editing === "new" ? "/api/product-titles" : `/api/product-titles/${editing}`, {
      method: editing === "new" ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg({ ok: false, text: json.error ?? "保存に失敗しました" }); return; }
    setEditing(null);
    setMsg({ ok: true, text: "保存しました。キーワードを変えた場合は「再分類」を押すと既存の商品にも反映されます" });
    router.refresh();
  }

  async function remove(row: Row) {
    if (!confirm(`タイトル「${row.name}」を削除します。よろしいですか？`)) return;
    const res = await fetch(`/api/product-titles/${row.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg({ ok: false, text: json.error ?? "削除に失敗しました" }); return; }
    router.refresh();
  }

  async function reassign() {
    if (!confirm("全商品のタイトルを、今のキーワードで分類し直します。よろしいですか？")) return;
    setBusy(true); setMsg(null);
    const res = await fetch("/api/product-titles/reassign", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: `${json.updated} 件の商品を再分類しました` } : { ok: false, text: json.error ?? "再分類に失敗しました" });
    router.refresh();
  }

  const input = "input text-sm";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">{titles.length} タイトル{unclassified > 0 && <span className="ml-2 text-amber-700">（シリーズ・商品名から分類できない商品 {unclassified} 件）</span>}</p>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary text-xs" disabled={busy} onClick={reassign}>再分類</button>
          <button type="button" className="btn-primary text-xs" onClick={() => open(null)}>+ タイトルを追加</button>
        </div>
      </div>
      {msg && <p className={`text-sm rounded p-3 border ${msg.ok ? "text-emerald-800 bg-emerald-50 border-emerald-200" : "text-rose-700 bg-rose-50 border-rose-200"}`}>{msg.text}</p>}

      {editing && (
        <section className="card p-4 space-y-2">
          <h2 className="font-semibold text-sm">{editing === "new" ? "タイトルを追加" : "タイトルを編集"}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
            <label className="sm:col-span-2 text-xs text-slate-600">タイトル名（お客様に表示）<input className={input} value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label className="sm:col-span-3 text-xs text-slate-600">キーワード（カンマ区切り・大文字小文字/全角半角/空白は区別しません）<input className={input} value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="例: ヴァイス, weiss" /></label>
            <label className="text-xs text-slate-600">並び順（小さいほど優先）<input className={input} inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(e.target.value.replace(/[^\d]/g, ""))} /></label>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-primary text-xs" disabled={busy} onClick={save}>保存</button>
            <button type="button" className="btn-secondary text-xs" onClick={() => setEditing(null)}>キャンセル</button>
          </div>
        </section>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="bg-slate-50 text-slate-600"><tr>
            <th className="text-left px-3 py-2 w-12">順</th>
            <th className="text-left px-3 py-2">タイトル</th>
            <th className="text-left px-3 py-2">キーワード</th>
            <th className="text-left px-3 py-2">含まれるシリーズ表記</th>
            <th className="text-right px-3 py-2">商品数</th>
            <th className="text-left px-3 py-2">操作</th>
          </tr></thead>
          <tbody>
            {titles.map((t) => (
              <tr key={t.id} className="border-t border-slate-100 align-top">
                <td className="px-3 py-2 text-xs text-slate-500">{t.sortOrder}</td>
                <td className="px-3 py-2 font-medium">
                  {t.name}
                  {t.autoCreated && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">自動追加</span>}
                </td>
                <td className="px-3 py-2 text-xs text-slate-600">{t.keywords.join(", ")}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{t.series.join(" / ") || "—"}</td>
                <td className="px-3 py-2 text-right">{t.products}</td>
                <td className="px-3 py-2 whitespace-nowrap text-xs">
                  <button type="button" className="text-brand-600 hover:underline mr-3" onClick={() => open(t)}>編集</button>
                  <button type="button" className="text-rose-600 hover:underline" onClick={() => remove(t)}>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
