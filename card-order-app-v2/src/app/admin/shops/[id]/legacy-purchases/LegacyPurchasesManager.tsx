"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LegacyPurchase, LegacyPurchaseShipmentStatus } from "@/types/database";
import { LEGACY_UNITS, SHIPMENT_LABEL, type ParsedLegacyRow } from "@/lib/legacy-purchases";

export interface ImportBatch { id: string; count: number; amount: number; importedAt: string }
export interface LegacyInvoiceOption { id: string; number: string; issuedAt: string | null; total: number }

const PAGE_SIZE = 20;
const yen = (n: number) => `¥${n.toLocaleString()}`;
const fmtDate = (d: string) => d.replaceAll("-", "/");

interface FormState {
  purchasedOn: string;
  productName: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  amount: string;
  amountTouched: boolean;
  shipmentStatus: LegacyPurchaseShipmentStatus;
  note: string;
  internalNote: string;
}

const EMPTY_FORM: FormState = {
  purchasedOn: "", productName: "", quantity: "", unit: "BOX", unitPrice: "", amount: "",
  amountTouched: false, shipmentStatus: "shipped", note: "", internalNote: "",
};

function fromRow(p: LegacyPurchase): FormState {
  return {
    purchasedOn: p.purchased_on, productName: p.product_name, quantity: String(p.quantity), unit: p.unit,
    unitPrice: String(p.unit_price), amount: String(p.amount), amountTouched: p.amount !== p.quantity * p.unit_price,
    shipmentStatus: p.shipment_status, note: p.note ?? "", internalNote: p.internal_note ?? "",
  };
}

interface Preview {
  rows: ParsedLegacyRow[];
  summary: { total: number; errorCount: number; warningCount: number; totalAmount: number };
}

export function LegacyPurchasesManager({ shopId, purchases, batches, invoices, invoiceUpload }: {
  shopId: string; purchases: LegacyPurchase[]; batches: ImportBatch[];
  invoices: LegacyInvoiceOption[]; invoiceUpload: React.ReactNode;
}) {
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [ship, setShip] = useState<"all" | LegacyPurchaseShipmentStatus>("all");
  const [page, setPage] = useState(1);

  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [linkTo, setLinkTo] = useState("");
  const invoiceById = useMemo(() => new Map(invoices.map((i) => [i.id, i])), [invoices]);

  const [importOpen, setImportOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [headerProblems, setHeaderProblems] = useState<string[]>([]);

  const filtered = useMemo(() => purchases.filter((p) =>
    (!from || p.purchased_on >= from) &&
    (!to || p.purchased_on <= to) &&
    (!q || p.product_name.toLowerCase().includes(q.toLowerCase())) &&
    (ship === "all" || p.shipment_status === ship)), [purchases, from, to, q, ship]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);
  const sumAmount = purchases.reduce((s, p) => s + p.amount, 0);
  const unshippedCount = purchases.filter((p) => p.shipment_status === "unshipped").length;

  const autoAmount = (f: FormState) => {
    const qn = parseInt(f.quantity, 10), up = parseInt(f.unitPrice, 10);
    return Number.isFinite(qn) && Number.isFinite(up) ? String(qn * up) : "";
  };
  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if ((k === "quantity" || k === "unitPrice") && !next.amountTouched) next.amount = autoAmount(next);
      return next;
    });
  };

  function openNew() { setForm(EMPTY_FORM); setEditingId("new"); setMsg(null); }
  function openEdit(p: LegacyPurchase) { setForm(fromRow(p)); setEditingId(p.id); setMsg(null); }

  async function save() {
    setBusy(true); setMsg(null);
    try {
      const payload = {
        purchasedOn: form.purchasedOn,
        productName: form.productName,
        quantity: parseInt(form.quantity, 10),
        unit: form.unit,
        unitPrice: parseInt(form.unitPrice, 10),
        amount: parseInt(form.amount, 10),
        shipmentStatus: form.shipmentStatus,
        note: form.note || null,
        internalNote: form.internalNote || null,
      };
      if (!payload.purchasedOn || !payload.productName) throw new Error("購入日と商品名は必須です");
      if (![payload.quantity, payload.unitPrice, payload.amount].every(Number.isFinite)) throw new Error("数量・単価・金額は数字で入力してください");
      const res = await fetch(editingId === "new" ? `/api/shops/${shopId}/legacy-purchases` : `/api/legacy-purchases/${editingId}`, {
        method: editingId === "new" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "保存に失敗しました");
      setMsg({ kind: "ok", text: editingId === "new" ? "登録しました" : "更新しました" });
      setEditingId(null);
      router.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "保存に失敗しました" });
    } finally { setBusy(false); }
  }

  async function remove(p: LegacyPurchase) {
    if (!confirm(`「${p.product_name}」(${fmtDate(p.purchased_on)}) を削除します。お客様のマイページからも消えます。よろしいですか？`)) return;
    setBusy(true); setMsg(null);
    const res = await fetch(`/api/legacy-purchases/${p.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg({ kind: "err", text: json.error ?? "削除に失敗しました" }); return; }
    setMsg({ kind: "ok", text: "削除しました" });
    router.refresh();
  }

  async function runImport(mode: "preview" | "commit") {
    if (!file) return;
    setBusy(true); setMsg(null); setHeaderProblems([]);
    if (mode === "preview") setPreview(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("mode", mode);
      const res = await fetch(`/api/shops/${shopId}/legacy-purchases/import`, { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (Array.isArray(json.headerProblems)) setHeaderProblems(json.headerProblems);
        throw new Error(json.error ?? "取込に失敗しました");
      }
      if (mode === "preview") {
        setPreview({ rows: json.rows, summary: json.summary });
      } else {
        setMsg({ kind: "ok", text: `${json.inserted} 件を登録しました` });
        setImportOpen(false); setFile(null); setPreview(null);
        router.refresh();
      }
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "取込に失敗しました" });
    } finally { setBusy(false); }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function link(invoiceId: string | null) {
    const ids = [...selected];
    if (ids.length === 0) return;
    const inv = invoiceId ? invoiceById.get(invoiceId) : null;
    const text = inv
      ? `選択した ${ids.length} 件を 請求書 ${inv.number} に紐付けます。お客様のマイページの購入履歴からもこの請求書を開けるようになります。よろしいですか？`
      : `選択した ${ids.length} 件の請求書の紐付けを解除します。よろしいですか？`;
    if (!confirm(text)) return;
    setBusy(true); setMsg(null);
    const res = await fetch(`/api/shops/${shopId}/legacy-purchases/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchaseIds: ids, invoiceId }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg({ kind: "err", text: json.error ?? "紐付けに失敗しました" }); return; }
    setMsg({ kind: "ok", text: invoiceId ? `${json.updated} 件を請求書に紐付けました` : `${json.updated} 件の紐付けを解除しました` });
    setSelected(new Set()); setLinkTo("");
    router.refresh();
  }

  async function undoBatch(b: ImportBatch) {
    if (!confirm(`${new Date(b.importedAt).toLocaleString("ja-JP")} の取込 ${b.count} 件をまとめて取り消します。お客様のマイページからも消えます。よろしいですか？`)) return;
    setBusy(true); setMsg(null);
    const res = await fetch(`/api/shops/${shopId}/legacy-purchases/import?batch=${b.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg({ kind: "err", text: json.error ?? "取り消しに失敗しました" }); return; }
    setMsg({ kind: "ok", text: `${json.removed} 件を取り消しました` });
    router.refresh();
  }

  const input = "input text-sm";
  return (
    <div className="space-y-5">
      {/* 集計 + 操作 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="card px-4 py-2"><div className="text-xs text-slate-500">登録件数</div><div className="font-bold">{purchases.length} 件</div></div>
          <div className="card px-4 py-2"><div className="text-xs text-slate-500">合計金額(税抜)</div><div className="font-bold">{yen(sumAmount)}</div></div>
          <div className={`card px-4 py-2 ${unshippedCount > 0 ? "border-amber-300 bg-amber-50" : ""}`}><div className="text-xs text-slate-500">未出荷</div><div className="font-bold">{unshippedCount} 件</div></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/legacy-purchases/template" className="btn-secondary text-xs">テンプレートをダウンロード</a>
          <button type="button" className="btn-secondary text-xs" onClick={() => { setImportOpen((v) => !v); setPreview(null); setHeaderProblems([]); setMsg(null); }}>一括取込</button>
          <button type="button" className="btn-primary text-xs" onClick={openNew}>+ 購入履歴を追加</button>
        </div>
      </div>

      {msg && (
        <p className={`text-sm rounded-lg p-3 border ${msg.kind === "ok" ? "text-emerald-800 bg-emerald-50 border-emerald-200" : "text-rose-700 bg-rose-50 border-rose-200"}`}>{msg.text}</p>
      )}

      {/* 一括取込 */}
      {importOpen && (
        <section className="card p-5 space-y-3">
          <h2 className="font-semibold">一括取込（テンプレート形式のみ）</h2>
          <ol className="text-xs text-slate-600 list-decimal pl-5 space-y-0.5">
            <li>「テンプレートをダウンロード」で取得した Excel の「購入履歴」シートに2行目から入力（見出し行は変更しない）</li>
            <li>ファイルを選んで「内容を確認」→ エラー・警告をチェック</li>
            <li>エラーが0件なら「この内容で登録」。<b>1行でもエラーがあると登録されません</b></li>
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            <input type="file" accept=".xlsx,.xls,.csv" className="text-sm" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); setHeaderProblems([]); }} />
            <button type="button" className="btn-secondary text-xs" disabled={!file || busy} onClick={() => runImport("preview")}>{busy ? "処理中…" : "内容を確認"}</button>
          </div>
          {headerProblems.length > 0 && (
            <ul className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-3 list-disc pl-5">
              {headerProblems.map((h) => <li key={h}>{h}</li>)}
            </ul>
          )}
          {preview && (
            <div className="space-y-2">
              <p className="text-sm">
                {preview.summary.total} 行 / 合計 {yen(preview.summary.totalAmount)}（税抜）
                {preview.summary.errorCount > 0 && <span className="ml-2 text-rose-700 font-semibold">エラー {preview.summary.errorCount} 行</span>}
                {preview.summary.warningCount > 0 && <span className="ml-2 text-amber-700 font-semibold">警告 {preview.summary.warningCount} 行</span>}
              </p>
              <div className="overflow-x-auto max-h-96 overflow-y-auto border border-slate-200 rounded">
                <table className="w-full text-xs min-w-[760px]">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>{["行", "購入日", "商品名", "数量", "単価", "金額", "出荷", "確認結果"].map((h) => <th key={h} className="text-left px-2 py-1.5">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((r) => (
                      <tr key={r.row} className={`border-t border-slate-100 ${r.errors.length ? "bg-rose-50" : r.warnings.length ? "bg-amber-50" : ""}`}>
                        <td className="px-2 py-1">{r.row}</td>
                        <td className="px-2 py-1">{r.data ? fmtDate(r.data.purchasedOn) : "—"}</td>
                        <td className="px-2 py-1">{r.data?.productName ?? "—"}</td>
                        <td className="px-2 py-1">{r.data ? `${r.data.quantity}${r.data.unit}` : "—"}</td>
                        <td className="px-2 py-1">{r.data ? yen(r.data.unitPrice) : "—"}</td>
                        <td className="px-2 py-1">{r.data ? yen(r.data.amount) : "—"}</td>
                        <td className="px-2 py-1">{r.data ? SHIPMENT_LABEL[r.data.shipmentStatus] : "—"}</td>
                        <td className="px-2 py-1">
                          {r.errors.map((e) => <div key={e} className="text-rose-700">✕ {e}</div>)}
                          {r.warnings.map((w) => <div key={w} className="text-amber-700">⚠ {w}</div>)}
                          {!r.errors.length && !r.warnings.length && <span className="text-emerald-700">OK</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="btn-primary text-xs" disabled={busy || preview.summary.errorCount > 0} onClick={() => runImport("commit")}>
                {preview.summary.errorCount > 0 ? "エラーを直してから再取込してください" : `この内容で登録（${preview.summary.total} 件）`}
              </button>
            </div>
          )}
        </section>
      )}

      {/* 追加・編集フォーム */}
      {editingId && (
        <section className="card p-5 space-y-3">
          <h2 className="font-semibold">{editingId === "new" ? "購入履歴を追加" : "購入履歴を編集"}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
            <label className="block"><span className="block text-xs text-slate-600 mb-1">購入日 *</span>
              <input type="date" className={input} value={form.purchasedOn} onChange={(e) => setField("purchasedOn", e.target.value)} /></label>
            <label className="block sm:col-span-3"><span className="block text-xs text-slate-600 mb-1">商品名 *</span>
              <input className={input} value={form.productName} onChange={(e) => setField("productName", e.target.value)} placeholder="ポケモンカードゲーム 拡張パック 〇〇" /></label>
            <label className="block"><span className="block text-xs text-slate-600 mb-1">数量 *</span>
              <input inputMode="numeric" className={input} value={form.quantity} onChange={(e) => setField("quantity", e.target.value.replace(/[^\d]/g, ""))} /></label>
            <label className="block"><span className="block text-xs text-slate-600 mb-1">単位</span>
              <select className={input} value={form.unit} onChange={(e) => setField("unit", e.target.value)}>
                {LEGACY_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select></label>
            <label className="block"><span className="block text-xs text-slate-600 mb-1">単価(税抜) *</span>
              <input inputMode="numeric" className={input} value={form.unitPrice} onChange={(e) => setField("unitPrice", e.target.value.replace(/[^\d]/g, ""))} /></label>
            <label className="block"><span className="block text-xs text-slate-600 mb-1">金額(税抜) * <span className="text-slate-400">{form.amountTouched ? "手入力" : "自動計算"}</span></span>
              <input inputMode="numeric" className={input} value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value.replace(/[^\d]/g, ""), amountTouched: true }))} /></label>
            <label className="block"><span className="block text-xs text-slate-600 mb-1">出荷状況 *</span>
              <select className={input} value={form.shipmentStatus} onChange={(e) => setField("shipmentStatus", e.target.value as LegacyPurchaseShipmentStatus)}>
                <option value="shipped">出荷済</option>
                <option value="unshipped">未出荷</option>
              </select></label>
            <label className="block sm:col-span-3"><span className="block text-xs text-slate-600 mb-1">備考（お客様にも表示）</span>
              <input className={input} value={form.note} onChange={(e) => setField("note", e.target.value)} /></label>
            <label className="block sm:col-span-4"><span className="block text-xs text-slate-600 mb-1">社内メモ（お客様には非表示）</span>
              <input className={input} value={form.internalNote} onChange={(e) => setField("internalNote", e.target.value)} /></label>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-primary text-xs" disabled={busy} onClick={save}>{busy ? "保存中…" : "保存"}</button>
            <button type="button" className="btn-secondary text-xs" disabled={busy} onClick={() => setEditingId(null)}>キャンセル</button>
          </div>
        </section>
      )}

      {/* 過去請求書 (PDF) と紐付け状況 */}
      <section className="card p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-sm">過去請求書（PDF）</h2>
          <span className="text-xs text-slate-500">請求書1枚に複数の購入履歴を紐付けられます。紐付けた請求書はお客様の購入履歴からも開けます</span>
        </div>
        {invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[620px]">
              <thead className="bg-slate-50 text-slate-600"><tr>
                <th className="text-left px-3 py-2">請求書番号</th><th className="text-left px-3 py-2">発行日</th>
                <th className="text-right px-3 py-2">請求書の金額</th><th className="text-right px-3 py-2">紐付け中の購入履歴</th>
                <th className="text-left px-3 py-2">PDF</th>
              </tr></thead>
              <tbody>
                {invoices.map((inv) => {
                  const linked = purchases.filter((p) => p.legacy_invoice_id === inv.id);
                  return (
                    <tr key={inv.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-mono">{inv.number}</td>
                      <td className="px-3 py-2">{inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString("ja-JP") : "—"}</td>
                      <td className="px-3 py-2 text-right">{yen(inv.total)}</td>
                      <td className="px-3 py-2 text-right">{linked.length} 件 / {yen(linked.reduce((sum, p) => sum + p.amount, 0))}（税抜）</td>
                      <td className="px-3 py-2"><a href={`/api/invoices/${inv.id}/pdf/download`} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">開く</a></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-500">まだ過去請求書はありません。下の「過去請求書を取込」からPDFをアップロードしてください。</p>
        )}
        {invoiceUpload}
      </section>

      {selected.size > 0 && (
        <div className="sticky top-2 z-10 card p-3 flex flex-wrap items-center gap-2 text-sm border-brand-300 bg-brand-50">
          <span className="font-semibold">{selected.size} 件を選択中</span>
          <select className="input text-sm w-auto" value={linkTo} onChange={(e) => setLinkTo(e.target.value)}>
            <option value="">紐付ける請求書を選択…</option>
            {invoices.map((i) => <option key={i.id} value={i.id}>{i.number}（{yen(i.total)}）</option>)}
          </select>
          <button type="button" className="btn-primary text-xs" disabled={busy || !linkTo} onClick={() => link(linkTo)}>請求書に紐付け</button>
          <button type="button" className="btn-secondary text-xs" disabled={busy} onClick={() => link(null)}>紐付けを解除</button>
          <button type="button" className="text-xs text-slate-500 underline" onClick={() => setSelected(new Set())}>選択をクリア</button>
          {invoices.length === 0 && <span className="text-xs text-slate-500">先に過去請求書をアップロードしてください</span>}
        </div>
      )}

      {/* 絞り込み */}
      <div className="card p-4 flex flex-wrap items-end gap-3 text-sm">
        <label className="block"><span className="block text-xs text-slate-600 mb-1">購入日</span>
          <span className="flex items-center gap-1">
            <input type="date" className={input} value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />〜
            <input type="date" className={input} value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          </span></label>
        <label className="block flex-1 min-w-[180px]"><span className="block text-xs text-slate-600 mb-1">商品名</span>
          <input className={input} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="商品名で検索" /></label>
        <label className="block"><span className="block text-xs text-slate-600 mb-1">出荷状況</span>
          <select className={input} value={ship} onChange={(e) => { setShip(e.target.value as typeof ship); setPage(1); }}>
            <option value="all">すべて</option><option value="unshipped">未出荷</option><option value="shipped">出荷済</option>
          </select></label>
        <button type="button" className="btn-secondary text-xs" onClick={() => { setFrom(""); setTo(""); setQ(""); setShip("all"); setPage(1); }}>クリア</button>
      </div>

      {/* 一覧 */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 w-8">
                <input
                  type="checkbox"
                  aria-label="このページの行をすべて選択"
                  checked={pageRows.length > 0 && pageRows.every((p) => selected.has(p.id))}
                  onChange={(e) => setSelected((prev) => {
                    const next = new Set(prev);
                    pageRows.forEach((p) => (e.target.checked ? next.add(p.id) : next.delete(p.id)));
                    return next;
                  })}
                />
              </th>
              <th className="text-left px-3 py-2">購入日</th>
              <th className="text-left px-3 py-2">商品名</th>
              <th className="text-right px-3 py-2">数量</th>
              <th className="text-right px-3 py-2">単価(税抜)</th>
              <th className="text-right px-3 py-2">金額(税抜)</th>
              <th className="text-left px-3 py-2">出荷</th>
              <th className="text-left px-3 py-2">登録</th>
              <th className="text-left px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((p) => (
              <tr key={p.id} className={`border-t border-slate-100 align-top ${p.shipment_status === "unshipped" ? "bg-amber-50" : ""}`}>
                <td className="px-3 py-2"><input type="checkbox" aria-label="選択" checked={selected.has(p.id)} onChange={() => toggle(p.id)} /></td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtDate(p.purchased_on)}</td>
                <td className="px-3 py-2">
                  {p.product_name}
                  {p.legacy_invoice_id && invoiceById.get(p.legacy_invoice_id) && (
                    <div className="text-xs"><span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">📄 請求書 {invoiceById.get(p.legacy_invoice_id)!.number}</span></div>
                  )}
                  {p.note && <div className="text-xs text-slate-500">備考: {p.note}</div>}
                  {p.internal_note && <div className="text-xs text-violet-700">社内: {p.internal_note}</div>}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">{p.quantity}{p.unit}</td>
                <td className="px-3 py-2 text-right">{yen(p.unit_price)}</td>
                <td className="px-3 py-2 text-right">{yen(p.amount)}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={`text-[11px] px-1.5 py-0.5 rounded ${p.shipment_status === "unshipped" ? "bg-amber-500 text-white font-bold" : "bg-slate-100 text-slate-600"}`}>
                    {SHIPMENT_LABEL[p.shipment_status]}
                  </span>
                </td>
                <td className="px-3 py-2 text-[11px] text-slate-500 whitespace-nowrap">{p.import_batch_id ? "一括取込" : "手動登録"}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <button type="button" className="text-brand-600 hover:underline text-xs mr-3" disabled={busy} onClick={() => openEdit(p)}>編集</button>
                  <button type="button" className="text-rose-600 hover:underline text-xs" disabled={busy} onClick={() => remove(p)}>削除</button>
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                {purchases.length === 0 ? "まだ登録がありません。「+ 購入履歴を追加」または「一括取込」から登録してください" : "条件に一致する履歴はありません"}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">
            {filtered.length} 件中 {(curPage - 1) * PAGE_SIZE + 1}〜{Math.min(curPage * PAGE_SIZE, filtered.length)} 件
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button type="button" className="btn-secondary text-xs" disabled={curPage <= 1} onClick={() => setPage(curPage - 1)}>← 前へ</button>
              <span className="px-2">{curPage} / {totalPages}</span>
              <button type="button" className="btn-secondary text-xs" disabled={curPage >= totalPages} onClick={() => setPage(curPage + 1)}>次へ →</button>
            </div>
          )}
        </div>
      )}

      {/* 取込履歴 (取込単位の取り消し) */}
      {batches.length > 0 && (
        <section className="card p-5 space-y-2">
          <h2 className="font-semibold text-sm">取込履歴</h2>
          <p className="text-xs text-slate-500">間違ったファイルを取り込んだ場合は、その取込で登録した行をまとめて取り消せます。</p>
          <ul className="divide-y divide-slate-100 text-sm">
            {batches.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-2 gap-3">
                <span>{new Date(b.importedAt).toLocaleString("ja-JP")} ・ {b.count} 件 ・ {yen(b.amount)}</span>
                <button type="button" className="text-rose-600 hover:underline text-xs" disabled={busy} onClick={() => undoBatch(b)}>この取込を取り消す</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
