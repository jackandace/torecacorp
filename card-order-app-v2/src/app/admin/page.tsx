import { createClient } from "@/lib/supabase/server";
import { formatYen } from "@/lib/rebate";
import { firstDayOfMonth, lastDayOfMonth } from "@/lib/dates";

export const metadata = { title: "ダッシュボード | 管理" };
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = createClient();

  const monthStart = firstDayOfMonth(new Date()).toISOString();
  const monthEnd = lastDayOfMonth(new Date()).toISOString();

  const [
    { count: pendingOrders },
    { count: unpaidInvoices },
    { data: monthlyOrders },
    { count: activeShops },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "リクエスト")
      .is("deleted_at", null),
    supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .in("status", ["未入金", "一部入金"])
      .is("deleted_at", null),
    supabase
      .from("orders")
      .select("total_price")
      .gte("created_at", monthStart)
      .lte("created_at", monthEnd)
      .in("status", ["仮確定", "確定"])
      .is("deleted_at", null),
    supabase
      .from("shops")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .is("deleted_at", null),
  ]);

  const monthlyTotal =
    monthlyOrders?.reduce((s, o) => s + (o.total_price ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6 lg:space-y-8 max-w-7xl">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">ダッシュボード</h1>
        <p className="text-sm text-slate-500 mt-1">
          {new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long" })}の概況
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
        <Kpi
          label="今月の受注額"
          value={formatYen(monthlyTotal)}
          icon={<IconYen />}
          tone="brand"
        />
        <Kpi
          label="要承認件数"
          value={`${pendingOrders ?? 0} 件`}
          icon={<IconAlert />}
          tone={(pendingOrders ?? 0) > 0 ? "warn" : "default"}
          href="/admin/orders"
        />
        <Kpi
          label="入金待ち"
          value={`${unpaidInvoices ?? 0} 件`}
          icon={<IconClock />}
          tone={(unpaidInvoices ?? 0) > 0 ? "warn" : "default"}
          href="/admin/billing"
        />
        <Kpi
          label="稼働ショップ"
          value={`${activeShops ?? 0} 社`}
          icon={<IconShop />}
          tone="default"
          href="/admin/shops"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="card p-6 lg:p-8">
          <h2 className="text-lg font-semibold mb-4">クイックアクション</h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickLink href="/admin/orders"          label="発注を承認する"      sub="リクエストを処理"/>
            <QuickLink href="/admin/billing/new"     label="請求書を発行"        sub="ショップ別に発行"/>
            <QuickLink href="/admin/inventory/new"   label="商品を登録"          sub="新規・Excel 取込"/>
            <QuickLink href="/admin/shops/new"       label="ショップを招待"      sub="新規アカウント"/>
          </div>
        </section>
        <section className="card p-6 lg:p-8">
          <h2 className="text-lg font-semibold mb-4">ヒント</h2>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex gap-2"><span className="text-brand-600">●</span><span>毎月 1 日 0:00 (UTC) にランク自動更新が走ります。</span></li>
            <li className="flex gap-2"><span className="text-brand-600">●</span><span>請求書 PDF は <code className="text-xs bg-slate-100 px-1 rounded">/admin/billing/[id]</code> から再生成可能。</span></li>
            <li className="flex gap-2"><span className="text-brand-600">●</span><span>通知メールは Resend API キー設定後に自動送信されます。</span></li>
          </ul>
        </section>
      </div>

      <p className="text-xs text-slate-500">
        ※ 詳細な集計は <a href="/admin/reports" className="text-brand-600 hover:underline">レポート</a> から。
      </p>
    </div>
  );
}

type KpiTone = "default" | "warn" | "brand";

function Kpi({
  label, value, icon, tone = "default", href,
}: { label: string; value: string; icon?: React.ReactNode; tone?: KpiTone; href?: string }) {
  const toneClass =
    tone === "warn"  ? "text-amber-700 bg-amber-50 ring-amber-200" :
    tone === "brand" ? "text-brand-700 bg-brand-50 ring-brand-100" :
                       "text-slate-700 bg-slate-50 ring-slate-200";
  const Wrapper: React.ElementType = href ? "a" : "div";
  return (
    <Wrapper
      href={href}
      className={`card p-4 lg:p-6 transition ${href ? "hover:shadow-md cursor-pointer" : ""}`}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs lg:text-sm text-slate-500 font-medium">{label}</p>
        {icon && <div className={`p-2 rounded-lg ring-1 ${toneClass}`}>{icon}</div>}
      </div>
      <p className={`mt-2 text-2xl lg:text-3xl font-bold tracking-tight ${tone === "warn" ? "text-amber-700" : ""}`}>
        {value}
      </p>
    </Wrapper>
  );
}

function QuickLink({ href, label, sub }: { href: string; label: string; sub: string }) {
  return (
    <a href={href} className="block rounded-lg border border-slate-200 p-4 hover:border-brand-500 hover:bg-brand-50 transition">
      <div className="text-sm font-semibold text-slate-800">{label}</div>
      <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
    </a>
  );
}

function IconYen() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4l6 8 6-8"/><path d="M6 12h12"/><path d="M6 16h12"/><path d="M12 12v8"/></svg>);
}
function IconAlert() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>);
}
function IconClock() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>);
}
function IconShop() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l1-5h16l1 5"/><path d="M5 9v11h14V9"/><path d="M9 22V12h6v10"/></svg>);
}
