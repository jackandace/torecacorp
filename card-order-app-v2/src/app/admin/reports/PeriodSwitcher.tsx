"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface Props {
  current: string;
  from?: string;
  to?: string;
}

const TABS: { value: string; label: string }[] = [
  { value: "this_month", label: "今月" },
  { value: "last_month", label: "先月" },
  { value: "this_year", label: "今年" },
  { value: "custom", label: "カスタム" },
];

export function PeriodSwitcher({ current, from, to }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fromDate, setFromDate] = useState(from ?? "");
  const [toDate, setToDate] = useState(to ?? "");

  const setPeriod = (period: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    if (period !== "custom") {
      params.delete("from");
      params.delete("to");
    }
    router.push(`/admin/reports?${params.toString()}`);
  };

  const applyCustom = () => {
    if (!fromDate || !toDate) return;
    const params = new URLSearchParams();
    params.set("period", "custom");
    params.set("from", fromDate);
    params.set("to", toDate);
    router.push(`/admin/reports?${params.toString()}`);
  };

  return (
    <div className="card p-3 space-y-3">
      <div className="flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setPeriod(t.value)}
            className={`px-3 py-1 rounded text-xs ${
              current === t.value
                ? "bg-brand-600 text-white"
                : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {current === "custom" && (
        <div className="flex items-center gap-2 text-xs">
          <input type="date" className="input w-40" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <span>〜</span>
          <input type="date" className="input w-40" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <button type="button" className="btn-secondary text-xs" onClick={applyCustom}>適用</button>
        </div>
      )}
    </div>
  );
}
