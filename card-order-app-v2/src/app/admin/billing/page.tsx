import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatJST, firstDayOfMonth, lastDayOfMonth } from "@/lib/dates";
import { formatYen } from "@/lib/rebate";
import { InvoiceStatusBadge } from "@/components/StatusBadge";
import type { InvoiceStatus } from "@/types/database";

export const metadata = { title: "請求・入金管理 | 管理" };
export const dynamic = "force-dynamic";

interface SearchParams { status?: string }

const STATUS_TABS: { v: string; label: string }[] = [
  { v: "all",      label: "すべて" },
  { v: "未入金",   label: "未入金" },
  { v: "一部入金", label: "一部入金" },
  { v: "入金済み", label: "入金済み" },
  { v: "overdue",  label: "⚠ 期限超過" },
];

export default async function BillingPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();
  const statusFilter = searchParams.status ?? "all";
  const today = new Date().toISOString().slice(0, 10);

  let unpaidCount = 0, unpaidAmount = 0;       // 未入金 + 一部入金の残額
  let overdueCount = 0, overdueAmount = 0;     // うち期限超過
  let paidThisMonth = 0;                       // 今月入金額 (入金済みベース)
  const monthStart = firstDayOfMonth(new Date()).toISOString();
  const monthEnd = lastDayOfMonth(new Date()).toISOString();

  // 全体サマリ用 (フィルタに依存しない)。
  // 全件スキャンを避け、(1)未入金・一部入金 (2)今月入金分 のみを取得して
  // 請求書が年々蓄積しても軽い状態を保つ。
  const [{ data: openInvoices }, { data: paidInvoices }, { count: totalCount }] = await Promise.all([
    supabase
      .from("invoices")
      .select("total_amount, paid_amount, due_date")
      .neq("status", "入金済み")
      .is("deleted_at", null),
    supabase
      .from("invoices")
      .select("paid_amount")
      .gte("paid_at", monthStart)
      .lte("paid_at", monthEnd)
      .is("deleted_at", null),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
  ]);

  for (const inv of openInvoices ?? []) {
    const remaining = inv.total_amount - inv.paid_amount;
    if (remaining > 0) {
      unpaidCount++;
      unpaidAmount += remaining;
      if (inv.due_date && inv.due_date < today) {
        overdueCount++;
        overdueAmount += remaining;
      }
    }
  }
  for (const inv of paidInvoices ?? []) {
    paidThisMonth += inv.paid_amount;
  }

  // 一覧 (フィルタ適用)
  let query = supabase
    .from("invoices")
    .select("*, shops(company_name)")
    .is("deleted_at", null);

  if (statusFilter === "overdue") {
    query = query.neq("status", "入金済み").lt("due_date", today);
  } else if (["未入金", "一部入金", "入金済み"].includes(statusFilter)) {
    query = query.eq("status", statusFilter as InvoiceStatus);
  }

  const { data: invoices } = await query
    .order("issued_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">請求・入金管理</h1>
        <div className="flex gap-2">
          <Link href="/admin/billing/new" className="btn-primary">請求書発行</Link>
          <a href="/api/invoices/export" className="btn-secondary">CSV出力</a>
        </div>
      </div>

      {/* サマリカード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          label="売掛残高 (未回収)"
          value={formatYen(unpaidAmount)}
          sub={`${unpaidCount} 件`}
          tone={unpaidAmount > 0 ? "warn" : "ok"}
        />
        <SummaryCard
          label="期限超過"
          value={formatYen(overdueAmount)}
          sub={`${overdueCount} 件`}
          tone={overdueCount > 0 ? "danger" : "ok"}
        />
        <SummaryCard
          label="今月の入金"
          value={formatYen(paidThisMonth)}
          sub="入金済みベース"
          tone="ok"
        />
        <SummaryCard
          label="発行済み請求書"
          value={`${totalCount ?? 0} 件`}
          sub="全期間"
          tone="neutral"
        />
      </div>

      {/* ステータスフィルタ */}
      <div className="card p-3 flex flex-wrap gap-1 text-sm">
        {STATUS_TABS.map((t) => (
          <Link
            key={t.v}
            href={t.v === "all" ? "/admin/billing" : `/admin/billing?status=${encodeURIComponent(t.v)}`}
            className={`px-3 py-1 rounded-full border ${
              statusFilter === t.v
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-2">請求書番号</th>
              <th className="text-left px-3 py-2">ショップ</th>
              <th className="text-left px-3 py-2">発行日</th>
              <th className="text-left px-3 py-2">支払期限</th>
              <th className="text-right px-3 py-2">合計</th>
              <th className="text-right px-3 py-2">入金済</th>
              <th className="text-right px-3 py-2">残額</th>
              <th className="text-left px-3 py-2">状態</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(invoices ?? []).map((inv) => {
              const shop = (inv as { shops?: { company_name?: string } }).shops;
              const remaining = inv.total_amount - inv.paid_amount;
              const overdue = inv.status !== "入金済み" && inv.due_date && inv.due_date < today;
              return (
                <tr key={inv.id} className={`border-t border-slate-100 hover:bg-slate-50 ${overdue ? "bg-rose-50/50" : ""}`}>
                  <td className="px-3 py-2 font-mono text-xs">
                    {inv.invoice_number}
                    {inv.is_legacy && (
                      <span className="ml-1 text-[10px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded">過去</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{shop?.company_name ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{formatJST(inv.issued_at)}</td>
                  <td className={`px-3 py-2 text-xs ${overdue ? "text-rose-700 font-semibold" : ""}`}>
                    {inv.due_date ?? "—"}{overdue && " ⚠"}
                  </td>
                  <td className="px-3 py-2 text-right">{formatYen(inv.total_amount)}</td>
                  <td className="px-3 py-2 text-right">{formatYen(inv.paid_amount)}</td>
                  <td className={`px-3 py-2 text-right ${remaining > 0 ? "font-semibold text-rose-700" : "text-slate-400"}`}>
                    {remaining > 0 ? formatYen(remaining) : "—"}
                  </td>
                  <td className="px-3 py-2"><InvoiceStatusBadge status={inv.status} /></td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/billing/${inv.id}`} className="text-brand-600 hover:underline text-xs">
                      詳細・消込
                    </Link>
                  </td>
                </tr>
              );
            })}
            {(!invoices || invoices.length === 0) && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-slate-500">
                  該当する請求書はありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({
  label, value, sub, tone,
}: { label: string; value: string; sub: string; tone: "ok" | "warn" | "danger" | "neutral" }) {
  const valueTone =
    tone === "danger" ? "text-rose-700" :
    tone === "warn"   ? "text-amber-700" :
                        "text-slate-900";
  return (
    <div className="card p-4 lg:p-5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-xl lg:text-2xl font-bold mt-1 ${valueTone}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
    </div>
  );
}
