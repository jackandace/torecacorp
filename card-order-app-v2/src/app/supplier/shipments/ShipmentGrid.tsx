"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type ShipRow = {
  id: string;
  title: string;
  shopName: string;
  deliveryAddress: string;
  qty: number;
  unit: string;
  shippingStatus: string;
  carrier: string;
  trackingNumber: string;
  updatedAt: string;
};

const CARRIERS = ["ヤマト運輸", "佐川急便", "日本郵便", "福山通運", "西濃運輸", "その他"];

export function ShipmentGrid({ rows }: { rows: ShipRow[] }) {
  const router = useRouter();
  const [view, setView] = useState<"title" | "flat">("title");
  const [data, setData] = useState<Record<string, { carrier: string; tracking: string }>>(
    () => Object.fromEntries(rows.map((r) => [r.id, { carrier: r.carrier, tracking: r.trackingNumber }])),
  );
  const [bulkCarrier, setBulkCarrier] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // 表示順 (タイトル別 or フラット) — 貼り付けの流し込み順に使う
  const groups = useMemo(() => {
    const m = new Map<string, ShipRow[]>();
    for (const r of rows) { if (!m.has(r.title)) m.set(r.title, []); m.get(r.title)!.push(r); }
    return [...m.entries()];
  }, [rows]);
  const orderedIds = useMemo(
    () => (view === "title" ? groups.flatMap(([, rs]) => rs.map((r) => r.id)) : rows.map((r) => r.id)),
    [view, groups, rows],
  );

  const set = (id: string, patch: Partial<{ carrier: string; tracking: string }>) =>
    setData((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  // Excel風: 追跡番号欄に複数行を貼ると、その行から下へ順に流し込む
  const onPasteTracking = (visibleIndex: number) => (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (!text.includes("\n") && !text.includes("\t")) return; // 単一値は通常貼付
    e.preventDefault();
    const values = text.split(/\r?\n/).map((v) => v.trim()).filter((v) => v !== "");
    setData((d) => {
      const nd = { ...d };
      values.forEach((v, k) => {
        const id = orderedIds[visibleIndex + k];
        if (id) nd[id] = { ...nd[id], tracking: v };
      });
      return nd;
    });
  };

  const applyCarrierAll = () => {
    if (!bulkCarrier) return;
    setData((d) => {
      const nd = { ...d };
      for (const r of rows) if (r.shippingStatus !== "完了") nd[r.id] = { ...nd[r.id], carrier: bulkCarrier };
      return nd;
    });
  };

  const pending = rows.filter((r) => (data[r.id]?.tracking ?? "").trim() !== "");

  const submit = async () => {
    const payload = pending.map((r) => ({
      orderId: r.id,
      carrier: (data[r.id]?.carrier ?? "").trim() || null,
      trackingNumber: (data[r.id]?.tracking ?? "").trim(),
    }));
    if (payload.length === 0) { setMsg({ kind: "err", text: "追跡番号が入力された行がありません" }); return; }
    if (!confirm(`${payload.length} 件を出荷登録し、各ショップへ出荷通知を送ります。よろしいですか？`)) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/supplier/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "出荷登録に失敗しました");
      setMsg({ kind: "ok", text: `${json.updated ?? payload.length} 件を出荷登録しました(通知 ${json.notified ?? 0} 件)` });
      router.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "出荷登録に失敗しました" });
    } finally { setBusy(false); }
  };

  if (rows.length === 0) {
    return <div className="card p-8 text-center text-slate-500 text-sm">出荷対象の確定発注はありません。</div>;
  }

  const statusPill = (s: string) => {
    const done = s === "出荷済" || s === "配送中" || s === "完了";
    return <span className={`text-[10px] rounded px-1.5 py-0.5 ${done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{s}</span>;
  };

  const rowInputs = (r: ShipRow, visibleIndex: number) => (
    <>
      <td className="px-2 py-1.5">
        <input
          className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
          list="carriers"
          placeholder="配送会社"
          value={data[r.id]?.carrier ?? ""}
          onChange={(e) => set(r.id, { carrier: e.target.value })}
        />
      </td>
      <td className="px-2 py-1.5">
        <input
          className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-mono"
          inputMode="numeric"
          placeholder="追跡番号(複数行貼付OK)"
          value={data[r.id]?.tracking ?? ""}
          onChange={(e) => set(r.id, { tracking: e.target.value })}
          onPaste={onPasteTracking(visibleIndex)}
        />
      </td>
    </>
  );

  let vi = -1; // 表示インデックス(貼付の流し込み用)

  return (
    <div className="space-y-3">
      <datalist id="carriers">{CARRIERS.map((c) => <option key={c} value={c} />)}</datalist>

      {/* ツールバー */}
      <div className="card p-3 flex flex-wrap items-center gap-2 text-sm">
        <div className="inline-flex rounded-md border border-slate-200 overflow-hidden">
          <button type="button" onClick={() => setView("title")} className={`px-3 py-1.5 text-xs ${view === "title" ? "bg-brand-600 text-white" : "bg-white text-slate-600"}`}>タイトル別</button>
          <button type="button" onClick={() => setView("flat")} className={`px-3 py-1.5 text-xs ${view === "flat" ? "bg-brand-600 text-white" : "bg-white text-slate-600"}`}>フラット</button>
        </div>
        <div className="flex items-center gap-1">
          <input className="rounded border border-slate-300 px-2 py-1 text-xs" list="carriers" placeholder="配送会社を全行に" value={bulkCarrier} onChange={(e) => setBulkCarrier(e.target.value)} />
          <button type="button" className="btn-secondary text-xs" onClick={applyCarrierAll}>一括適用</button>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {msg && <span className={`text-xs ${msg.kind === "ok" ? "text-emerald-700" : "text-rose-600"}`}>{msg.text}</span>}
          <button type="button" className="btn-primary text-sm" disabled={busy} onClick={submit}>
            {busy ? "登録中…" : `出荷登録 (${pending.length}件)`}
          </button>
        </div>
      </div>

      {/* グリッド */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]">
          <thead className="bg-slate-50 text-slate-600 text-xs">
            <tr>
              <th className="text-left px-2 py-2">ショップ</th>
              <th className="text-left px-2 py-2">配送先</th>
              <th className="text-right px-2 py-2 w-16">数量</th>
              <th className="text-left px-2 py-2 w-12">状態</th>
              <th className="text-left px-2 py-2 w-40">配送会社</th>
              <th className="text-left px-2 py-2 w-56">追跡番号</th>
            </tr>
          </thead>
          <tbody>
            {view === "title"
              ? groups.map(([title, rs]) => (
                  <TitleGroup key={title} title={title} count={rs.length}>
                    {rs.map((r) => { vi++; return (
                      <tr key={r.id} className="border-t border-slate-100 align-middle">
                        <td className="px-2 py-1.5">{r.shopName}</td>
                        <td className="px-2 py-1.5 text-xs text-slate-500 max-w-[220px] truncate" title={r.deliveryAddress}>{r.deliveryAddress}</td>
                        <td className="px-2 py-1.5 text-right whitespace-nowrap">{r.qty} {r.unit}</td>
                        <td className="px-2 py-1.5">{statusPill(r.shippingStatus)}</td>
                        {rowInputs(r, vi)}
                      </tr>
                    ); })}
                  </TitleGroup>
                ))
              : rows.map((r) => { vi++; return (
                  <tr key={r.id} className="border-t border-slate-100 align-middle">
                    <td className="px-2 py-1.5">{r.shopName}</td>
                    <td className="px-2 py-1.5 text-xs text-slate-500">{r.title}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">{r.qty} {r.unit}</td>
                    <td className="px-2 py-1.5">{statusPill(r.shippingStatus)}</td>
                    {rowInputs(r, vi)}
                  </tr>
                ); })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">
        ヒント: 追跡番号は Excel の列をコピーして先頭セルに貼り付けると、下の行へ自動で流し込まれます。
      </p>
    </div>
  );
}

function TitleGroup({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <>
      <tr className="bg-slate-50/70">
        <td colSpan={6} className="px-2 py-1.5 text-xs font-semibold text-slate-700">
          {title} <span className="text-slate-400 font-normal">／ {count} ショップ</span>
        </td>
      </tr>
      {children}
    </>
  );
}
