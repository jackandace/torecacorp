import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatYen } from "@/lib/rebate";
import { CutoffTools } from "./CutoffTools";

export const dynamic = "force-dynamic";
export const metadata = { title: "決算整理(請求済み・未納品) | トレカ商事" };

export default async function CutoffReport({ searchParams }: { searchParams: { date?: string } }) {
  const cutoffDate = searchParams.date || "2026-11-30";
  const cutoffISO = `${cutoffDate}T23:59:59+09:00`;
  const supabase = createClient();

  const { data: items } = await supabase
    .from("invoice_items")
    .select("line_total, invoices!inner(invoice_number, invoice_kind, issued_at), orders!inner(subtotal, delivered_at, shops(company_name), products(title))")
    .lte("invoices.issued_at", cutoffISO);

  type Row = { invoiceNumber: string; kind: string; issuedAt: string; shop: string; title: string; net: number; gross: number };
  const rows: Row[] = [];
  for (const it of items ?? []) {
    const inv = it.invoices as unknown as { invoice_number?: string; invoice_kind?: string; issued_at?: string } | null;
    const o = it.orders as unknown as { subtotal?: number; delivered_at?: string | null; shops?: { company_name?: string }; products?: { title?: string } } | null;
    if (!inv || !o) continue;
    if (!["normal", "final"].includes(inv.invoice_kind ?? "")) continue; // 物流を伴う売上のみ(前受金/返金は除外)
    const delivered = o.delivered_at && new Date(o.delivered_at) <= new Date(cutoffISO);
    if (delivered) continue; // 納品済みは対象外
    rows.push({
      invoiceNumber: inv.invoice_number ?? "—",
      kind: inv.invoice_kind ?? "",
      issuedAt: (inv.issued_at ?? "").slice(0, 10),
      shop: o.shops?.company_name ?? "—",
      title: o.products?.title ?? "—",
      net: o.subtotal ?? 0,
      gross: it.line_total ?? 0,
    });
  }
  const totalNet = rows.reduce((s, r) => s + r.net, 0);
  const totalGross = rows.reduce((s, r) => s + r.gross, 0);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/reports" className="text-sm text-brand-600 hover:underline">← レポート</Link>
        <h1 className="text-2xl font-bold mt-1">決算整理：請求済み・未納品</h1>
        <p className="text-sm text-slate-500 mt-1">
          締め日時点で<strong>請求書は発行済み(通常/最終)だが、まだ納品していない</strong>取引を集計します。
          請求基準→納品基準への移行で、<strong>この額を期末に売上からマイナス(戻し)</strong>する決算整理の根拠になります。
        </p>
      </div>

      <CutoffTools cutoffDate={cutoffDate} rows={rows} />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5"><div className="text-xs text-slate-500">対象件数(明細)</div><div className="text-2xl font-bold mt-1">{rows.length}</div></div>
        <div className="card p-5"><div className="text-xs text-slate-500">戻し額(税抜・純売上)</div><div className="text-2xl font-bold mt-1 text-rose-700">-{formatYen(totalNet)}</div></div>
        <div className="card p-5"><div className="text-xs text-slate-500">戻し額(税込・請求額)</div><div className="text-2xl font-bold mt-1 text-rose-700">-{formatYen(totalGross)}</div></div>
      </div>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">明細({cutoffDate} 時点)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="text-slate-600 text-xs"><tr>
              <th className="text-left px-2 py-1">請求書番号</th><th className="text-left px-2 py-1">発行日</th>
              <th className="text-left px-2 py-1">ショップ</th><th className="text-left px-2 py-1">商品</th>
              <th className="text-right px-2 py-1">税抜</th><th className="text-right px-2 py-1">税込</th>
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-2 py-1.5">{r.invoiceNumber}{r.kind === "final" && <span className="ml-1 text-[10px] bg-indigo-100 text-indigo-700 rounded px-1">最終</span>}</td>
                  <td className="px-2 py-1.5 text-xs">{r.issuedAt}</td>
                  <td className="px-2 py-1.5">{r.shop}</td>
                  <td className="px-2 py-1.5">{r.title}</td>
                  <td className="px-2 py-1.5 text-right">{formatYen(r.net)}</td>
                  <td className="px-2 py-1.5 text-right">{formatYen(r.gross)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="px-2 py-6 text-center text-slate-500">該当なし(締め日時点で請求済み・未納品の取引はありません)</td></tr>}
              {rows.length > 0 && (
                <tr className="border-t-2 border-slate-300 font-bold">
                  <td className="px-2 py-2" colSpan={4}>合計(戻し額)</td>
                  <td className="px-2 py-2 text-right text-rose-700">-{formatYen(totalNet)}</td>
                  <td className="px-2 py-2 text-right text-rose-700">-{formatYen(totalGross)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-slate-400">
        ※ 対象=通常/最終請求(前受金・返金は除外)。納品日(delivered_at)が締め日以前のものは納品済みとして除外。会計方針に合わせ対象・端数処理は調整します。
      </p>
    </div>
  );
}
