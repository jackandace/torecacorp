import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatYen } from "@/lib/rebate";
import { formatJST } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata = { title: "収益認識レポート(納品基準) | トレカ商事" };

export default async function RecognitionReport() {
  const supabase = createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, subtotal, total_price, delivered_at, received_at, shops(company_name), products(title)")
    .not("delivered_at", "is", null)
    .is("deleted_at", null)
    .order("delivered_at", { ascending: false })
    .limit(1000);

  const rows = orders ?? [];
  type M = { net: number; gross: number; count: number };
  const monthly = new Map<string, M>();
  for (const o of rows) {
    const m = (o.delivered_at ?? "").slice(0, 7);
    const cur = monthly.get(m) ?? { net: 0, gross: 0, count: 0 };
    cur.net += o.subtotal ?? 0;
    cur.gross += o.total_price ?? 0;
    cur.count += 1;
    monthly.set(m, cur);
  }
  const months = [...monthly.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const maxNet = Math.max(1, ...months.map(([, v]) => v.net));

  const totalNet = rows.reduce((s, o) => s + (o.subtotal ?? 0), 0);
  const totalGross = rows.reduce((s, o) => s + (o.total_price ?? 0), 0);
  const unreceived = rows.filter((o) => !o.received_at);
  const unrecNet = unreceived.reduce((s, o) => s + (o.subtotal ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/reports" className="text-sm text-brand-600 hover:underline">← レポート</Link>
        <h1 className="text-2xl font-bold mt-1">収益認識レポート(納品基準)</h1>
        <p className="text-sm text-slate-500 mt-1">
          物流を伴う取引を<strong>納品完了日(delivered_at)</strong>で計上します。金額は税抜(リベート適用後の純売上)を基本に表示。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5"><div className="text-xs text-slate-500">累計 収益認識額(税抜)</div><div className="text-2xl font-bold mt-1">{formatYen(totalNet)}</div><div className="text-xs text-slate-400">税込 {formatYen(totalGross)}</div></div>
        <div className="card p-5"><div className="text-xs text-slate-500">納品件数</div><div className="text-2xl font-bold mt-1">{rows.length}</div></div>
        <div className="card p-5"><div className="text-xs text-slate-500">うち受領未完了(証憑未確定)</div><div className="text-2xl font-bold mt-1 text-amber-700">{formatYen(unrecNet)}</div><div className="text-xs text-slate-400">{unreceived.length} 件</div></div>
      </div>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">月次 収益認識(納品月)</h2>
        {months.length === 0 ? (
          <p className="text-sm text-slate-500">納品完了の発注がまだありません。問屋の「納品完了」登録で計上されます。</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-slate-600 text-xs"><tr>
              <th className="text-left px-2 py-1">納品月</th><th className="text-right px-2 py-1">件数</th>
              <th className="text-right px-2 py-1">税抜(収益認識)</th><th className="text-right px-2 py-1">税込</th>
              <th className="text-left px-2 py-1 w-1/3">構成</th>
            </tr></thead>
            <tbody>
              {months.map(([m, v]) => (
                <tr key={m} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-medium">{m}</td>
                  <td className="px-2 py-1.5 text-right">{v.count}</td>
                  <td className="px-2 py-1.5 text-right font-semibold">{formatYen(v.net)}</td>
                  <td className="px-2 py-1.5 text-right text-slate-500">{formatYen(v.gross)}</td>
                  <td className="px-2 py-1.5"><div className="h-2 rounded bg-brand-500" style={{ width: `${Math.max(3, (v.net / maxNet) * 100)}%` }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">直近の納品(最新50件)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="text-slate-600 text-xs"><tr>
              <th className="text-left px-2 py-1">納品日</th><th className="text-left px-2 py-1">ショップ</th>
              <th className="text-left px-2 py-1">商品</th><th className="text-right px-2 py-1">税抜</th><th className="text-left px-2 py-1">受領</th>
            </tr></thead>
            <tbody>
              {rows.slice(0, 50).map((o) => {
                const shop = o.shops as unknown as { company_name?: string } | null;
                const product = o.products as unknown as { title?: string } | null;
                return (
                  <tr key={o.id} className="border-t border-slate-100">
                    <td className="px-2 py-1.5 whitespace-nowrap text-xs">{formatJST(o.delivered_at!)}</td>
                    <td className="px-2 py-1.5">{shop?.company_name ?? "—"}</td>
                    <td className="px-2 py-1.5">{product?.title ?? "—"}</td>
                    <td className="px-2 py-1.5 text-right">{formatYen(o.subtotal ?? 0)}</td>
                    <td className="px-2 py-1.5">{o.received_at
                      ? <span className="text-[10px] bg-emerald-100 text-emerald-700 rounded px-1.5 py-0.5">受領済</span>
                      : <span className="text-[10px] bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">未受領</span>}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={5} className="px-2 py-6 text-center text-slate-500">データなし</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-slate-400">
        ※ 収益認識額は各発注の税抜(subtotal=リベート適用後)を納品完了日で集計。会計方針の確定に合わせ、計上対象・締め処理・様式は調整します。
      </p>
    </div>
  );
}
