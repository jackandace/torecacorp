import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatYen } from "@/lib/rebate";

export const dynamic = "force-dynamic";
export const metadata = { title: "売上予測ポータル | トレカ商事" };

const DAY = 86400000;
function daysBetween(a: string, b: string) { return Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY); }

export default async function ForecastPage() {
  const supabase = createClient();
  // 確定発注(実績)を集計対象に
  const { data: orders } = await supabase
    .from("orders")
    .select("id, subtotal, created_at, shop_id, product_id, shops(company_name), products(title, series)")
    .eq("status", "確定")
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(5000);
  const rows = orders ?? [];

  // 月次売上(発注月)
  const monthly = new Map<string, { rev: number; cnt: number }>();
  for (const o of rows) {
    const m = (o.created_at ?? "").slice(0, 7);
    const c = monthly.get(m) ?? { rev: 0, cnt: 0 };
    c.rev += o.subtotal ?? 0; c.cnt += 1; monthly.set(m, c);
  }
  const months = [...monthly.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-12);
  const maxMonthRev = Math.max(1, ...months.map(([, v]) => v.rev));

  // タイトル別(周期=平均間隔の代理)
  type T = { title: string; series: string | null; dates: string[]; rev: number };
  const titleMap = new Map<string, T>();
  for (const o of rows) {
    const p = o.products as unknown as { title?: string; series?: string | null } | null;
    const key = p?.title ?? o.product_id;
    const t = titleMap.get(key) ?? { title: p?.title ?? "—", series: p?.series ?? null, dates: [], rev: 0 };
    t.dates.push(o.created_at); t.rev += o.subtotal ?? 0; titleMap.set(key, t);
  }
  const titles = [...titleMap.values()].map((t) => {
    const n = t.dates.length;
    const first = t.dates[0], last = t.dates[n - 1];
    const intervalDays = n >= 2 ? Math.round(daysBetween(first, last) / (n - 1)) : null;
    return { ...t, n, avg: Math.round(t.rev / n), intervalDays, last };
  }).sort((a, b) => b.rev - a.rev);

  // ショップ別
  const shopMap = new Map<string, { name: string; rev: number; cnt: number }>();
  for (const o of rows) {
    const s = o.shops as unknown as { company_name?: string } | null;
    const c = shopMap.get(o.shop_id) ?? { name: s?.company_name ?? "—", rev: 0, cnt: 0 };
    c.rev += o.subtotal ?? 0; c.cnt += 1; shopMap.set(o.shop_id, c);
  }
  const shops = [...shopMap.values()].sort((a, b) => b.rev - a.rev);

  const totalRev = rows.reduce((s, o) => s + (o.subtotal ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">売上予測ポータル</h1>
        <p className="text-sm text-slate-500 mt-1">
          確定発注の実績から、月次トレンド・タイトル別の周期・ショップ別実績を可視化します(予測エンジンの土台=フェーズA)。金額は税抜。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5"><div className="text-xs text-slate-500">累計 確定売上(税抜)</div><div className="text-2xl font-bold mt-1">{formatYen(totalRev)}</div></div>
        <div className="card p-5"><div className="text-xs text-slate-500">タイトル数</div><div className="text-2xl font-bold mt-1">{titles.length}</div></div>
        <div className="card p-5"><div className="text-xs text-slate-500">取引ショップ数</div><div className="text-2xl font-bold mt-1">{shops.length}</div></div>
      </div>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">月次 売上トレンド(直近12ヶ月・発注月)</h2>
        {months.length === 0 ? <p className="text-sm text-slate-500">確定発注がまだありません。</p> : (
          <div className="space-y-1.5">
            {months.map(([m, v]) => (
              <div key={m} className="flex items-center gap-3 text-sm">
                <span className="w-16 text-xs text-slate-500">{m}</span>
                <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden"><div className="h-full bg-brand-500" style={{ width: `${(v.rev / maxMonthRev) * 100}%` }} /></div>
                <span className="w-24 text-right tabular-nums">{formatYen(v.rev)}</span>
                <span className="w-10 text-right text-xs text-slate-400">{v.cnt}件</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-1">タイトル別 実績と入荷周期</h2>
        <p className="text-xs text-slate-500 mb-3">「平均間隔」= 過去の発注発生の平均日数(=次にいつ頃また来そうかの目安)。「1回平均」= その都度の平均売上。</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead className="text-slate-600 text-xs"><tr>
              <th className="text-left px-2 py-1">タイトル</th><th className="text-right px-2 py-1">回数</th>
              <th className="text-right px-2 py-1">累計(税抜)</th><th className="text-right px-2 py-1">1回平均</th>
              <th className="text-right px-2 py-1">平均間隔</th><th className="text-left px-2 py-1">直近</th>
            </tr></thead>
            <tbody>
              {titles.slice(0, 40).map((t, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-2 py-1.5">{t.series && <span className="text-slate-400 text-xs">{t.series} / </span>}{t.title}</td>
                  <td className="px-2 py-1.5 text-right">{t.n}</td>
                  <td className="px-2 py-1.5 text-right font-semibold">{formatYen(t.rev)}</td>
                  <td className="px-2 py-1.5 text-right">{formatYen(t.avg)}</td>
                  <td className="px-2 py-1.5 text-right">{t.intervalDays != null ? `約${t.intervalDays}日` : "—"}</td>
                  <td className="px-2 py-1.5 text-xs text-slate-500">{(t.last ?? "").slice(0, 10)}</td>
                </tr>
              ))}
              {titles.length === 0 && <tr><td colSpan={6} className="px-2 py-6 text-center text-slate-500">データなし</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">ショップ別 発注実績</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[420px]">
            <thead className="text-slate-600 text-xs"><tr>
              <th className="text-left px-2 py-1">ショップ</th><th className="text-right px-2 py-1">確定回数</th><th className="text-right px-2 py-1">累計(税抜)</th>
            </tr></thead>
            <tbody>
              {shops.slice(0, 40).map((s, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-2 py-1.5">{s.name}</td>
                  <td className="px-2 py-1.5 text-right">{s.cnt}</td>
                  <td className="px-2 py-1.5 text-right font-semibold">{formatYen(s.rev)}</td>
                </tr>
              ))}
              {shops.length === 0 && <tr><td colSpan={3} className="px-2 py-6 text-center text-slate-500">データなし</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <div className="card p-5 bg-slate-50 text-sm">
        <div className="font-semibold mb-1">次のフェーズ(予測エンジン)</div>
        <ul className="text-slate-600 text-xs space-y-1 list-disc pl-5">
          <li>B: 入荷案内ログを溜め、タイトル別の入荷周期を自動検出</li>
          <li>C: 次回入荷予測 × ショップ別見込み → 月次の予測売上を算出</li>
          <li>D: 予実(予測 vs 実績=納品)を締めて差異を記録し、精度を自動補正</li>
        </ul>
      </div>
    </div>
  );
}
