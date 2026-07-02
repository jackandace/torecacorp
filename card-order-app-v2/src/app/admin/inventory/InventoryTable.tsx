"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Product, ProductStatus } from "@/types/database";
import { formatRate, formatYen } from "@/lib/rebate";
import { orderCutoffDate, todayISOInJST } from "@/lib/dates";

type StatusFilter = "all" | "visible" | "hidden" | ProductStatus;
type SortKey = "newest" | "deadline" | "series" | "title" | "stock" | "price";
type Tab = "all" | "live" | "expired" | "expired_ordered" | "hidden";

const TODAY = todayISOInJST();

/** 実効締切(発注期限の7日前)が過ぎているか */
function isExpired(p: Product): boolean {
  const cutoff = orderCutoffDate(p.order_deadline);
  return !!cutoff && cutoff < TODAY;
}
/** 公開中・受付中・締切前 (＝ショップに出ている) */
function isLive(p: Product): boolean {
  return p.is_visible && p.status === "受付中" && !isExpired(p);
}

export function InventoryTable({ products }: { products: Product[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [seriesFilter, setSeriesFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // シリーズ候補
  const seriesOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) if (p.series) set.add(p.series);
    return Array.from(set).sort();
  }, [products]);

  // サブカテゴリ別の件数
  const tabCounts = useMemo(() => {
    let live = 0, expired = 0, expiredOrdered = 0, hidden = 0;
    for (const p of products) {
      if (!p.is_visible) hidden++;
      if (isLive(p)) live++;
      if (isExpired(p)) {
        expired++;
        if (p.ordered_qty > 0) expiredOrdered++;
      }
    }
    return { all: products.length, live, expired, expiredOrdered, hidden };
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      // サブカテゴリタブ
      if (tab === "live" && !isLive(p)) return false;
      if (tab === "expired" && !isExpired(p)) return false;
      if (tab === "expired_ordered" && !(isExpired(p) && p.ordered_qty > 0)) return false;
      if (tab === "hidden" && p.is_visible) return false;
      if (seriesFilter !== "all" && p.series !== seriesFilter) return false;
      if (statusFilter !== "all") {
        if (statusFilter === "visible" && !p.is_visible) return false;
        if (statusFilter === "hidden" && p.is_visible) return false;
        if (["受付中", "受付停止", "終了"].includes(statusFilter) && p.status !== statusFilter) return false;
      }
      if (q) {
        const hay = `${p.series ?? ""} ${p.title} ${p.full_name ?? ""} ${p.model_number ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [products, query, statusFilter, seriesFilter, tab]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortKey) {
      case "newest":   arr.sort((a, b) => b.created_at.localeCompare(a.created_at)); break;
      case "deadline": arr.sort((a, b) => (a.order_deadline ?? "9999").localeCompare(b.order_deadline ?? "9999")); break;
      case "series":   arr.sort((a, b) => (a.series ?? "").localeCompare(b.series ?? "")); break;
      case "title":    arr.sort((a, b) => a.title.localeCompare(b.title)); break;
      case "stock":    arr.sort((a, b) => ((b.planned_qty ?? 0) - b.ordered_qty) - ((a.planned_qty ?? 0) - a.ordered_qty)); break;
      case "price":    arr.sort((a, b) => (b.price ?? 0) - (a.price ?? 0)); break;
    }
    return arr;
  }, [filtered, sortKey]);

  const allChecked = sorted.length > 0 && sorted.every((p) => selected.has(p.id));
  const someChecked = selected.size > 0 && !allChecked;

  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(sorted.map((p) => p.id)));
  };
  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkUpdate = async (changes: { is_visible?: boolean; status?: ProductStatus }) => {
    if (selected.size === 0) return;
    if (!confirm(`選択中の ${selected.size} 件を更新しますか?`)) return;
    setBusy(true); setMessage(null);
    try {
      const res = await fetch("/api/products/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), changes }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "失敗");
      setMessage(`${json.updated ?? 0} 件を更新しました`);
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      setMessage(`失敗: ${e instanceof Error ? e.message : "不明"}`);
    } finally { setBusy(false); }
  };

  const TABS: { key: Tab; label: string; count: number; tone: string }[] = [
    { key: "all", label: "すべて", count: tabCounts.all, tone: "" },
    { key: "live", label: "公開中・受付中", count: tabCounts.live, tone: "emerald" },
    { key: "expired", label: "締切超過(受付終了)", count: tabCounts.expired, tone: "rose" },
    { key: "expired_ordered", label: "発注あり期限切れ", count: tabCounts.expiredOrdered, tone: "amber" },
    { key: "hidden", label: "非公開", count: tabCounts.hidden, tone: "slate" },
  ];

  return (
    <>
      {/* サブカテゴリタブ */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              tab === t.key
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {t.label} <span className={tab === t.key ? "opacity-90" : "text-slate-400"}>({t.count})</span>
          </button>
        ))}
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="search"
              placeholder="シリーズ・商品名・型番で検索"
              className="input pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
          </div>
          <select className="border border-slate-300 rounded px-2 py-2 text-sm" value={seriesFilter} onChange={(e) => setSeriesFilter(e.target.value)}>
            <option value="all">全シリーズ ({seriesOptions.length})</option>
            {seriesOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="border border-slate-300 rounded px-2 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
            <option value="all">全状態</option>
            <option value="visible">公開中のみ</option>
            <option value="hidden">非公開のみ</option>
            <option value="受付中">受付中</option>
            <option value="受付停止">受付停止</option>
            <option value="終了">終了</option>
          </select>
          <select className="border border-slate-300 rounded px-2 py-2 text-sm" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
            <option value="newest">新着順</option>
            <option value="deadline">締切順</option>
            <option value="series">シリーズ名順</option>
            <option value="title">商品名順</option>
            <option value="stock">在庫多い順</option>
            <option value="price">価格高い順</option>
          </select>
        </div>
        <p className="text-xs text-slate-500">
          {sorted.length} 件 (全 {products.length} 件) {selected.size > 0 && <span className="font-medium text-brand-700">/ {selected.size} 件選択中</span>}
        </p>

        {/* 一括アクション */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 bg-brand-50 border border-brand-200 rounded p-3">
            <span className="text-sm font-medium text-brand-800">一括操作:</span>
            <button className="btn-secondary text-xs" disabled={busy} onClick={() => bulkUpdate({ is_visible: true })}>公開する</button>
            <button className="btn-secondary text-xs" disabled={busy} onClick={() => bulkUpdate({ is_visible: false })}>非公開にする</button>
            <button className="btn-secondary text-xs" disabled={busy} onClick={() => bulkUpdate({ status: "受付中" })}>受付中に</button>
            <button className="btn-secondary text-xs" disabled={busy} onClick={() => bulkUpdate({ status: "受付停止" })}>受付停止に</button>
            <button className="btn-secondary text-xs" disabled={busy} onClick={() => bulkUpdate({ status: "終了" })}>終了に</button>
            <button className="text-xs text-slate-500 ml-auto" onClick={() => setSelected(new Set())}>選択解除</button>
            {message && <span className="text-xs ml-2">{message}</span>}
          </div>
        )}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-2 py-2 w-8">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = someChecked; }}
                  onChange={toggleAll}
                />
              </th>
              <th className="text-left px-3 py-2">シリーズ</th>
              <th className="text-left px-3 py-2">商品名 / 型番</th>
              <th className="text-right px-3 py-2">定価</th>
              <th className="text-right px-3 py-2">案内掛け</th>
              <th className="text-right px-3 py-2">在庫</th>
              <th className="text-left px-3 py-2">締切</th>
              <th className="text-left px-3 py-2">フロー</th>
              <th className="text-left px-3 py-2">状態</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const stock = (p.planned_qty ?? 0) - p.ordered_qty;
              const total = p.planned_qty ?? 0;
              const ratio = total > 0 ? stock / total : 0;
              const stockTone = ratio === 0 ? "text-rose-700" : ratio < 0.2 ? "text-amber-700" : "text-slate-700";
              const overdue = isExpired(p);
              return (
                <tr key={p.id} className={`border-t border-slate-100 hover:bg-slate-50 ${selected.has(p.id) ? "bg-brand-50" : ""}`}>
                  <td className="px-2 py-2">
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">{p.series ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/inventory/${p.id}`} className="text-brand-700 hover:underline">{p.title}</Link>
                    {p.model_number && <div className="text-xs text-slate-500">{p.model_number}</div>}
                  </td>
                  <td className="px-3 py-2 text-right">{formatYen(p.price ?? 0)}</td>
                  <td className="px-3 py-2 text-right">{formatRate(p.actual_rate + p.rate_markup)}</td>
                  <td className={`px-3 py-2 text-right ${stockTone}`}>
                    <span className="font-medium">{stock}</span> / {total}
                  </td>
                  <td className={`px-3 py-2 text-xs ${overdue ? "text-rose-700 font-semibold" : ""}`}>
                    {p.order_deadline ?? "—"}{overdue && " ⚠"}
                  </td>
                  <td className="px-3 py-2 text-xs">{p.flow_type === "cut" ? "カット割" : "配分"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-0.5">
                      <span className={`inline-flex text-xs px-1.5 py-0.5 rounded ${p.is_visible ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                        {p.is_visible ? "公開" : "非公開"}
                      </span>
                      <span className="text-xs text-slate-500">{p.status}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500">該当商品なし</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
