"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RankCode, RankSetting } from "@/types/database";
import { RANK_LABEL, RANK_ORDER } from "@/constants/ranks";
import { formatYen } from "@/lib/rebate";

export function LifetimeFloorEditor({ settings }: { settings: RankSetting[] }) {
  const router = useRouter();
  const byRank = new Map(settings.map((s) => [s.rank, s]));
  const initial: Record<RankCode, number> = {} as Record<RankCode, number>;
  for (const r of RANK_ORDER) initial[r] = byRank.get(r)?.lifetime_threshold ?? 0;

  const [values, setValues] = useState<Record<RankCode, number>>(initial);
  const [applyNow, setApplyNow] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/rank-settings/lifetime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: RANK_ORDER.map((rank) => ({ rank, lifetime_threshold: values[rank] })),
          applyNow,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "保存失敗");
      setMessage(applyNow ? `保存し、${json.raised} 社をフロア適用(昇格)しました` : "保存しました");
      router.refresh();
    } catch (e) {
      setMessage(`失敗: ${e instanceof Error ? e.message : "不明"}`);
    } finally {
      setBusy(false);
    }
  };

  // 高い順に表示
  const ordered = [...RANK_ORDER].reverse();

  return (
    <section className="card p-5 space-y-4">
      <div>
        <h2 className="font-semibold">累計下限ランク (月次昇格 + 累計フロア)</h2>
        <p className="text-xs text-slate-500 mt-1">
          累計取引額 (lifetime_amount) がしきい値以上のショップに、そのランクを<strong>最低保証</strong>します。
          月次の昇降格はそのまま動作し、フロアより下には落ちません。<strong>0 = 無効</strong>。
          月次しきい値と違い<strong>即時反映</strong>です。
        </p>
      </div>

      <div className="space-y-2">
        {ordered.map((rank) => (
          <div key={rank} className="flex items-center gap-3 text-sm">
            <span className="w-28 font-medium">{RANK_LABEL[rank]}</span>
            <span className="text-slate-400 text-xs">累計 ≥</span>
            <input
              type="number"
              min={0}
              step={10000}
              className="input w-40 text-right"
              value={values[rank]}
              disabled={rank === "standard"}
              onChange={(e) => setValues((v) => ({ ...v, [rank]: parseInt(e.target.value || "0", 10) }))}
            />
            <span className="text-xs text-slate-500">円 {values[rank] > 0 ? `(${formatYen(values[rank])})` : "= 無効"}</span>
          </div>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={applyNow} onChange={(e) => setApplyNow(e.target.checked)} />
        今すぐ全ショップにフロアを適用する(active・pending 対象／昇格のみ・降格はしません)
      </label>

      <div className="flex items-center gap-3">
        <button type="button" className="btn-primary" disabled={busy} onClick={save}>
          {busy ? "保存中…" : "累計下限を保存"}
        </button>
        {message && <span className="text-xs">{message}</span>}
      </div>
    </section>
  );
}
