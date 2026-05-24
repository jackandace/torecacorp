import { createClient } from "@/lib/supabase/server";
import { RANK_LABEL } from "@/constants/ranks";
import { formatRate, formatYen } from "@/lib/rebate";
import { formatJST } from "@/lib/dates";
import { RankSettingsEditor } from "./RankSettingsEditor";

export const metadata = { title: "リベート管理 | 管理" };
export const dynamic = "force-dynamic";

export default async function RebatePage() {
  const supabase = createClient();
  const [{ data: settings }, { data: pending }, { data: history }, { data: changeLog }] = await Promise.all([
    supabase.from("rank_settings").select("*"),
    supabase
      .from("rank_settings_changes")
      .select("*")
      .eq("status", "pending")
      .order("effective_from"),
    supabase
      .from("shop_rank_history")
      .select("*, shops(company_name)")
      .order("changed_at", { ascending: false })
      .limit(30),
    supabase
      .from("rank_settings_changes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  return (
    <div className="space-y-8 max-w-5xl">
      <h1 className="text-2xl font-bold">リベート・ランク管理</h1>

      {pending && pending.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          <div className="font-semibold text-amber-900 mb-2">
            ⏳ 予約済みの変更 ({pending.length} 件) — 当月の集計に影響しないよう翌月初に自動適用されます
          </div>
          <ul className="space-y-1 text-xs">
            {pending.map((p) => (
              <li key={p.id} className="text-amber-900">
                {p.effective_from} から: <strong>{RANK_LABEL[p.rank]}</strong> 閾値 {formatYen(p.old_threshold)} → {formatYen(p.new_threshold)} / リベート {formatRate(p.old_rebate_rate)} → {formatRate(p.new_rebate_rate)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">ランク閾値・リベート率 (現在の有効値)</h2>
          <form action="/api/cron/rank-update" method="post">
            <button className="btn-secondary text-xs">月次ランク更新を手動実行</button>
          </form>
        </div>
        <RankSettingsEditor settings={settings ?? []} />
        <p className="text-xs text-slate-500 mt-2">
          ※ 変更内容は次月 1 日に自動反映されます (当月内は予約状態のまま)。
        </p>
      </section>

      <section>
        <h2 className="font-semibold mb-3">変更ログ (直近 30 件)</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">作成日時</th>
                <th className="text-left px-3 py-2">ランク</th>
                <th className="text-left px-3 py-2">変更内容</th>
                <th className="text-left px-3 py-2">適用日</th>
                <th className="text-left px-3 py-2">状態</th>
                <th className="text-left px-3 py-2">適用日時</th>
              </tr>
            </thead>
            <tbody>
              {(changeLog ?? []).map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-xs">{formatJST(c.created_at)}</td>
                  <td className="px-3 py-2">{RANK_LABEL[c.rank]}</td>
                  <td className="px-3 py-2 text-xs">
                    閾値 {formatYen(c.old_threshold)} → {formatYen(c.new_threshold)}<br />
                    リベート {formatRate(c.old_rebate_rate)} → {formatRate(c.new_rebate_rate)}
                  </td>
                  <td className="px-3 py-2 text-xs">{c.effective_from}</td>
                  <td className="px-3 py-2">
                    <ChangeStatusBadge status={c.status} />
                    {c.error_detail && (
                      <div className="text-xs text-rose-700 mt-1">{c.error_detail}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">{c.applied_at ? formatJST(c.applied_at) : "—"}</td>
                </tr>
              ))}
              {(!changeLog || changeLog.length === 0) && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">変更ログはまだありません</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-3">最近のショップランク変動</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">変更日</th>
                <th className="text-left px-3 py-2">ショップ</th>
                <th className="text-left px-3 py-2">評価月</th>
                <th className="text-left px-3 py-2">変動</th>
                <th className="text-right px-3 py-2">発注額</th>
                <th className="text-right px-3 py-2">適用リベート</th>
              </tr>
            </thead>
            <tbody>
              {(history ?? []).map((h) => {
                const shop = (h as { shops?: { company_name?: string } }).shops;
                return (
                  <tr key={h.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-xs">{h.changed_at.slice(0, 10)}</td>
                    <td className="px-3 py-2">{shop?.company_name ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{h.month}</td>
                    <td className="px-3 py-2">
                      {RANK_LABEL[h.prev_rank]} → {RANK_LABEL[h.new_rank]}
                    </td>
                    <td className="px-3 py-2 text-right">{formatYen(h.monthly_amount)}</td>
                    <td className="px-3 py-2 text-right">{formatRate(h.rebate_rate)}</td>
                  </tr>
                );
              })}
              {(!history || history.length === 0) && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">ランク変動はまだありません</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ChangeStatusBadge({ status }: { status: string }) {
  const tone =
    status === "applied"   ? "bg-emerald-100 text-emerald-800" :
    status === "pending"   ? "bg-amber-100 text-amber-800" :
    status === "failed"    ? "bg-rose-100 text-rose-700" :
                             "bg-slate-100 text-slate-600";
  const label =
    status === "applied"   ? "✓ 適用済" :
    status === "pending"   ? "⏳ 予約中" :
    status === "failed"    ? "✕ 失敗" :
                             "キャンセル";
  return <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded font-medium ${tone}`}>{label}</span>;
}
