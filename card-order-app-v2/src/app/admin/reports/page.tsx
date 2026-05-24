import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { firstDayOfMonth, lastDayOfMonth, toISODate } from "@/lib/dates";
import { formatYen } from "@/lib/rebate";
import { PeriodSwitcher } from "./PeriodSwitcher";

export const metadata = { title: "レポート | 管理" };
export const dynamic = "force-dynamic";

interface SearchParams {
  from?: string;
  to?: string;
  period?: string;
}

function resolvePeriod(params: SearchParams): { from: Date; to: Date; label: string } {
  const today = new Date();
  switch (params.period) {
    case "last_month": {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return { from: firstDayOfMonth(lastMonth), to: lastDayOfMonth(lastMonth), label: "先月" };
    }
    case "this_year": {
      return {
        from: new Date(today.getFullYear(), 0, 1),
        to: new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999),
        label: `${today.getFullYear()}年`,
      };
    }
    case "custom": {
      if (params.from && params.to) {
        return {
          from: new Date(params.from),
          to: new Date(`${params.to}T23:59:59.999`),
          label: `${params.from} 〜 ${params.to}`,
        };
      }
      return defaultPeriod(today);
    }
    default:
      return defaultPeriod(today);
  }
}

function defaultPeriod(today: Date) {
  return {
    from: firstDayOfMonth(today),
    to: lastDayOfMonth(today),
    label: "今月",
  };
}

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();
  const { from, to, label } = resolvePeriod(searchParams);

  const { data: orders } = await supabase
    .from("orders")
    .select(`
      total_price,
      rebate_amount,
      confirmed_qty,
      shop_id,
      product_id,
      shops(company_name),
      products(title, category)
    `)
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString())
    .in("status", ["仮確定", "確定"])
    .is("deleted_at", null);

  // 集計
  const byShop = new Map<string, { name: string; total: number; rebate: number; orders: number }>();
  const byProduct = new Map<string, { title: string; category: string; total: number; qty: number; orders: number }>();

  for (const o of orders ?? []) {
    const shop = o.shops as { company_name?: string } | null;
    const product = o.products as { title?: string; category?: string } | null;
    const shopKey = o.shop_id;
    const prodKey = o.product_id;

    const sEntry = byShop.get(shopKey) ?? { name: shop?.company_name ?? "—", total: 0, rebate: 0, orders: 0 };
    sEntry.total += o.total_price ?? 0;
    sEntry.rebate += o.rebate_amount ?? 0;
    sEntry.orders += 1;
    byShop.set(shopKey, sEntry);

    const pEntry = byProduct.get(prodKey) ?? {
      title: product?.title ?? "—",
      category: product?.category ?? "other",
      total: 0,
      qty: 0,
      orders: 0,
    };
    pEntry.total += o.total_price ?? 0;
    pEntry.qty += o.confirmed_qty ?? 0;
    pEntry.orders += 1;
    byProduct.set(prodKey, pEntry);
  }

  const shopRows = [...byShop.values()].sort((a, b) => b.total - a.total);
  const productRows = [...byProduct.values()].sort((a, b) => b.total - a.total);
  const totalAmount = shopRows.reduce((s, r) => s + r.total, 0);
  const totalRebate = shopRows.reduce((s, r) => s + r.rebate, 0);
  const totalOrders = orders?.length ?? 0;

  const exportParams = new URLSearchParams({ from: toISODate(from), to: toISODate(to) }).toString();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">レポート ({label})</h1>
        <div className="flex gap-2 items-center">
          <Link href={`/api/reports/export?${exportParams}`} className="btn-secondary text-xs">
            CSV エクスポート
          </Link>
        </div>
      </div>

      <PeriodSwitcher current={searchParams.period ?? "this_month"} from={searchParams.from} to={searchParams.to} />

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Kpi label="売上 (税込)" value={formatYen(totalAmount)} />
        <Kpi label="リベート還付" value={`-${formatYen(totalRebate)}`} />
        <Kpi label="発注件数" value={`${totalOrders} 件`} />
        <Kpi label="アクティブ顧客" value={`${shopRows.length} 社`} />
      </section>

      <section>
        <h2 className="font-semibold mb-3">ショップ別</h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">ショップ</th>
                <th className="text-right px-3 py-2">件数</th>
                <th className="text-right px-3 py-2">売上 (税込)</th>
                <th className="text-right px-3 py-2">リベート</th>
              </tr>
            </thead>
            <tbody>
              {shopRows.map((r) => (
                <tr key={r.name} className="border-t border-slate-100">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 text-right">{r.orders}</td>
                  <td className="px-3 py-2 text-right">{formatYen(r.total)}</td>
                  <td className="px-3 py-2 text-right text-emerald-600">-{formatYen(r.rebate)}</td>
                </tr>
              ))}
              {shopRows.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">期間内に確定発注はありません</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-3">商品別</h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">商品</th>
                <th className="text-left px-3 py-2">カテゴリ</th>
                <th className="text-right px-3 py-2">件数</th>
                <th className="text-right px-3 py-2">確定 BOX</th>
                <th className="text-right px-3 py-2">売上 (税込)</th>
              </tr>
            </thead>
            <tbody>
              {productRows.map((r) => (
                <tr key={r.title} className="border-t border-slate-100">
                  <td className="px-3 py-2">{r.title}</td>
                  <td className="px-3 py-2">{r.category}</td>
                  <td className="px-3 py-2 text-right">{r.orders}</td>
                  <td className="px-3 py-2 text-right">{r.qty}</td>
                  <td className="px-3 py-2 text-right">{formatYen(r.total)}</td>
                </tr>
              ))}
              {productRows.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">期間内に確定発注はありません</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
