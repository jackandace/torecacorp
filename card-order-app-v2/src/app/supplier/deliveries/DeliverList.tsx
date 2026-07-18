"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type DeliverRow = {
  id: string;
  title: string;
  shopName: string;
  qty: number;
  unit: string;
  carrier: string;
  trackingNumber: string;
};

export function DeliverList({ rows }: { rows: DeliverRow[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allChecked = rows.length > 0 && sel.size === rows.length;
  const toggleAll = () => setSel(allChecked ? new Set() : new Set(rows.map((r) => r.id)));

  async function deliver() {
    const orderIds = [...sel];
    if (orderIds.length === 0) { setMsg({ kind: "err", text: "納品完了にする行を選択してください" }); return; }
    if (!confirm(`${orderIds.length} 件を納品完了にし、各ショップへ受領のご確認メールを送ります。よろしいですか？`)) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/supplier/deliver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "納品完了に失敗しました");
      setMsg({ kind: "ok", text: `${json.delivered ?? orderIds.length} 件を納品完了にしました(受領依頼 ${json.notified ?? 0} 件)` });
      setSel(new Set());
      router.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "納品完了に失敗しました" });
    } finally { setBusy(false); }
  }

  if (rows.length === 0) {
    return <div className="card p-8 text-center text-slate-500 text-sm">納品完了にできる出荷済みの発注はありません。</div>;
  }

  return (
    <div className="space-y-3">
      <div className="card p-3 flex items-center gap-3 text-sm">
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={allChecked} onChange={toggleAll} /> 全選択</label>
        <div className="ml-auto flex items-center gap-3">
          {msg && <span className={`text-xs ${msg.kind === "ok" ? "text-emerald-700" : "text-rose-600"}`}>{msg.text}</span>}
          <button type="button" className="btn-primary text-sm" disabled={busy} onClick={deliver}>
            {busy ? "処理中…" : `納品完了にする (${sel.size}件)`}
          </button>
        </div>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-slate-50 text-slate-600 text-xs">
            <tr>
              <th className="px-2 py-2 w-8"></th>
              <th className="text-left px-2 py-2">商品</th>
              <th className="text-left px-2 py-2">ショップ</th>
              <th className="text-right px-2 py-2 w-16">数量</th>
              <th className="text-left px-2 py-2">配送 / 追跡番号</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-2 py-2 text-center"><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} /></td>
                <td className="px-2 py-2">{r.title}</td>
                <td className="px-2 py-2">{r.shopName}</td>
                <td className="px-2 py-2 text-right whitespace-nowrap">{r.qty} {r.unit}</td>
                <td className="px-2 py-2 text-xs text-slate-500">{r.carrier || "—"} / <span className="font-mono">{r.trackingNumber || "—"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
