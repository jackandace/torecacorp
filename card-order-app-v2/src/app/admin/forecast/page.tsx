import { createClient } from "@/lib/supabase/server";
import { formatYen } from "@/lib/rebate";
import { forecastTitle, projectMonthly, type OrderPoint } from "@/lib/forecast";

export const dynamic = "force-dynamic";
export const metadata = { title: "売上予測ポータル | トレカ商事" };

export default async function ForecastPage() {
  const supabase = createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, subtotal, created_at, shop_id, product_id, shops(company_name), products(title, series)")
    .eq("status", "確定")
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(5000);
  const rows = orders ?? [];

  // 実績: 月次確定売上(発注月)
  const monthly = new Map<string, { rev: number; cnt: number }>();
  for (const o of rows) {
    const m = (o.created_at ?? "").slice(0, 7);
    const c = monthly.get(m) ?? { rev: 0, cnt: 0 };
    c.rev += o.subtotal ?? 0; c.cnt += 1; monthly.set(m, c);
  }

  // タイトル別ポイント → 予測
  const tMap = new Map<string, { title: string; series: string | null; points: OrderPoint[] }>();
  for (const o of rows) {
    const p = o.products as unknown as { title?: string; series?: string | null } | null;
    const key = p?.title ?? o.product_id;
    const t = tMap.get(key) ?? { title: p?.title ?? "—", series: p?.series ?? null, points: [] };
    t.points.push({ date: (o.created_at ?? "").slice(0, 10), revenue: o.subtotal ?? 0 });
    tMap.set(key, t);
  }
  const titles = [...tMap.entries()].map(([key, t]) => ({ key, ...t, f: forecastTitle(t.points) }))
    .sort((a, b) => b.f.perRound * (b.f.rounds) - a.f.perRound * (a.f.rounds));

  const today = new Date().toISOString().slice(0, 10);
  const projection = projectMonthly(titles.map((t) => ({ key: t.key, points: t.points })), today, 6);
  const projTotal = projection.reduce((s, m) => s + m.amount, 0);
  const maxProj = Math.max(1, ...projection.map((m) => m.amount));

  // ショップ別
  const shopMap = new Map<string, { name: string; rev: number; cnt: number }>();
  for (const o of rows) {
    const s = o.shops as unknown as { company_name?: string } | null;
    const c = shopMap.get(o.shop_id) ?? { name: s?.company_name ?? "—", rev: 0, cnt: 0 };
    c.rev += o.subtotal ?? 0; c.cnt += 1; shopMap.set(o.shop_id, c);
  }
  const shops = [...shopMap.values()].sort((a, b) => b.rev - a.rev);
  const totalRev = rows.reduce((s, o) => s + (o.subtotal ?? 0), 0);

  // 予実タイムライン: 直近4ヶ月(実績) + 予測6ヶ月
  const curMonth = today.slice(0, 7);
  const pastMonths: string[] = [];
  { const d = new Date(today + "T00:00:00Z"); for (let i = 4; i >= 1; i--) { const c = new Date(d); c.setUTCMonth(c.getUTCMonth() - i); pastMonths.push(c.toISOString().slice(0, 7)); } }
  const timeline = [
    ...pastMonths.map((m) => ({ month: m, actual: monthly.get(m)?.rev ?? 0, forecast: null as number | null })),
    { month: curMonth, actual: monthly.get(curMonth)?.rev ?? 0, forecast: projection[0]?.amount ?? 0 },
    ...projection.slice(1).map((p) => ({ month: p.month, actual: null as number | null, forecast: p.amount })),
  ];

  const addDays = (iso: string, d: number) => new Date(new Date(iso + "T00:00:00Z").getTime() + d * 86400000).toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">売上予測ポータル</h1>
        <p className="text-sm text-slate-500 mt-1">
          確定発注の実績から入荷周期を推定し、次6ヶ月の売上を見込みます。金額は税抜。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5"><div className="text-xs text-slate-500">累計 確定売上(税抜)</div><div className="text-2xl font-bold mt-1">{formatYen(totalRev)}</div></div>
        <div className="card p-5"><div className="text-xs text-slate-500">今後6ヶ月の予測売上</div><div className="text-2xl font-bold mt-1 text-brand-700">{formatYen(projTotal)}</div></div>
        <div className="card p-5"><div className="text-xs text-slate-500">タイトル / ショップ</div><div className="text-2xl font-bold mt-1">{titles.length} / {shops.length}</div></div>
      </div>

      {/* 予実タイムライン */}
      <section className="card p-5">
        <h2 className="font-semibold mb-1">予実タイムライン(実績→予測)</h2>
        <p className="text-xs text-slate-500 mb-3">直近は確定売上の実績、今月以降は入荷周期からの予測です。</p>
        <div className="space-y-1.5">
          {timeline.map((t) => {
            const val = t.actual ?? t.forecast ?? 0;
            const isFore = t.actual == null;
            const max = Math.max(maxProj, ...timeline.map((x) => x.actual ?? 0), 1);
            return (
              <div key={t.month} className="flex items-center gap-3 text-sm">
                <span className="w-16 text-xs text-slate-500">{t.month}</span>
                <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
                  <div className={`h-full ${isFore ? "bg-brand-300" : "bg-brand-600"}`} style={{ width: `${(val / max) * 100}%` }} />
                </div>
                <span className="w-24 text-right tabular-nums">{formatYen(val)}</span>
                <span className="w-10 text-right text-[10px]">{isFore ? <span className="text-brand-500">予測</span> : <span className="text-slate-400">実績</span>}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* タイトル別 予測 */}
      <section className="card p-5">
        <h2 className="font-semibold mb-1">タイトル別 予測</h2>
        <p className="text-xs text-slate-500 mb-3">「平均間隔」=入荷回の平均日数。「1回見込み」=直近を重めにした1回あたり予測売上。「次回予測」=直近＋周期。</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="text-slate-600 text-xs"><tr>
              <th className="text-left px-2 py-1">タイトル</th><th className="text-right px-2 py-1">入荷回</th>
              <th className="text-right px-2 py-1">平均間隔</th><th className="text-right px-2 py-1">1回見込み</th><th className="text-left px-2 py-1">次回予測</th>
            </tr></thead>
            <tbody>
              {titles.slice(0, 40).map((t) => (
                <tr key={t.key} className="border-t border-slate-100">
                  <td className="px-2 py-1.5">{t.series && <span className="text-slate-400 text-xs">{t.series} / </span>}{t.title}</td>
                  <td className="px-2 py-1.5 text-right">{t.f.rounds}</td>
                  <td className="px-2 py-1.5 text-right">{t.f.avgIntervalDays != null ? `約${t.f.avgIntervalDays}日` : "—"}</td>
                  <td className="px-2 py-1.5 text-right font-semibold">{formatYen(t.f.perRound)}</td>
                  <td className="px-2 py-1.5 text-xs text-slate-500">{t.f.avgIntervalDays != null && t.f.lastDate ? `${addDays(t.f.lastDate, t.f.avgIntervalDays)} 頃` : "—"}</td>
                </tr>
              ))}
              {titles.length === 0 && <tr><td colSpan={5} className="px-2 py-6 text-center text-slate-500">確定発注がまだありません</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* ショップ別 */}
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
                  <td className="px-2 py-1.5">{s.name}</td><td className="px-2 py-1.5 text-right">{s.cnt}</td><td className="px-2 py-1.5 text-right font-semibold">{formatYen(s.rev)}</td>
                </tr>
              ))}
              {shops.length === 0 && <tr><td colSpan={3} className="px-2 py-6 text-center text-slate-500">データなし</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <div className="card p-5 bg-slate-50 text-sm">
        <div className="font-semibold mb-1">精度を上げる次のステップ(フェーズD)</div>
        <p className="text-slate-600 text-xs">
          月初に予測をスナップショット保存し、月末に実績(納品=収益認識)と突合して差異を記録。差異の傾向から周期・見込みの係数を自動補正していきます。入荷案内ログ(フェーズB)を溜めると、発注前でも入荷予定から先行して予測できます。
        </p>
      </div>
    </div>
  );
}
