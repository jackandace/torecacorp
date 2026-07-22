"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Row = { invoiceNumber: string; kind: string; issuedAt: string; shop: string; title: string; net: number; gross: number };

export function CutoffTools({ cutoffDate, rows }: { cutoffDate: string; rows: Row[] }) {
  const router = useRouter();
  const [date, setDate] = useState(cutoffDate);

  function downloadCsv() {
    const header = ["請求書番号", "種別", "発行日", "ショップ", "商品", "税抜", "税込"];
    const lines = rows.map((r) => [r.invoiceNumber, r.kind, r.issuedAt, r.shop, r.title, r.net, r.gross]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = "﻿" + [header.join(","), ...lines].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `決算整理_請求済み未納品_${cutoffDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card p-4 flex flex-wrap items-end gap-3 text-sm">
      <div>
        <label className="block text-xs text-slate-600 mb-1">締め日</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
      </div>
      <button type="button" className="btn-primary text-sm" onClick={() => router.push(`/admin/reports/cutoff?date=${date}`)}>この日で集計</button>
      <button type="button" className="btn-secondary text-sm" onClick={downloadCsv} disabled={rows.length === 0}>CSVダウンロード</button>
      <button type="button" className="btn-secondary text-sm no-print" onClick={() => window.print()}>印刷 / PDF</button>
    </div>
  );
}
