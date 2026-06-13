"use client";

import { useState } from "react";

export function ManualTabs({
  adminManual,
  shopManual,
}: {
  adminManual: React.ReactNode;
  shopManual: React.ReactNode;
}) {
  const [tab, setTab] = useState<"admin" | "shop">("admin");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("admin")}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
            tab === "admin" ? "bg-brand-600 text-white" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
          }`}
        >
          管理者向け
        </button>
        <button
          type="button"
          onClick={() => setTab("shop")}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
            tab === "shop" ? "bg-brand-600 text-white" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
          }`}
        >
          ショップ向け (参考)
        </button>
      </div>
      <div className={tab === "admin" ? "" : "hidden"}>{adminManual}</div>
      <div className={tab === "shop" ? "" : "hidden"}>{shopManual}</div>
    </div>
  );
}
