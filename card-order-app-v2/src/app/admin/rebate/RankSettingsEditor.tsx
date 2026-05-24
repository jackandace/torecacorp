"use client";

import { useState } from "react";
import type { RankSetting } from "@/types/database";
import { RANK_LABEL } from "@/constants/ranks";

interface Props {
  settings: RankSetting[];
}

export function RankSettingsEditor({ settings }: Props) {
  const [rows, setRows] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const update = (rank: string, key: "threshold_amount" | "rebate_rate", value: number) => {
    setRows((prev) =>
      prev.map((r) => (r.rank === rank ? { ...r, [key]: value } : r)),
    );
  };

  const save = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/rank-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: rows }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMessage("保存しました");
    } catch (e) {
      setMessage(`保存失敗: ${e instanceof Error ? e.message : "不明"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-5 space-y-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-600">
            <th className="text-left">ランク</th>
            <th className="text-right">昇格基準 (円)</th>
            <th className="text-right">リベート率 (0〜1)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.rank} className="border-t border-slate-100">
              <td className="py-2">{RANK_LABEL[r.rank]}</td>
              <td className="py-2 text-right">
                <input
                  type="number"
                  min={0}
                  className="input w-32 text-right"
                  value={r.threshold_amount}
                  onChange={(e) => update(r.rank, "threshold_amount", parseInt(e.target.value || "0", 10))}
                />
              </td>
              <td className="py-2 text-right">
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={1}
                  className="input w-24 text-right"
                  value={r.rebate_rate}
                  onChange={(e) => update(r.rank, "rebate_rate", parseFloat(e.target.value || "0"))}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-3">
        <button type="button" className="btn-primary" disabled={busy} onClick={save}>
          {busy ? "保存中…" : "保存"}
        </button>
        {message && <span className="text-xs text-slate-600">{message}</span>}
      </div>
    </div>
  );
}
