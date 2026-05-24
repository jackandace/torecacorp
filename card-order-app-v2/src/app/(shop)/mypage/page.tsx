import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buildRankSettingsMap, amountToNextRank } from "@/lib/ranks";
import { firstDayOfMonth, lastDayOfMonth } from "@/lib/dates";
import { formatRate, formatYen } from "@/lib/rebate";
import { RANK_LABEL } from "@/constants/ranks";
import { MyPageDataView } from "./MyPageDataView";
import type { OrderStatus } from "@/types/database";

const ORDER_STATUSES: OrderStatus[] = ["リクエスト", "発注調整中", "仮確定", "確定", "キャンセル"];

export const metadata = { title: "マイページ | トレカ商事" };
export const dynamic = "force-dynamic";

interface SearchParams {
  ord_status?: string;
  ord_page?: string;
  inv_page?: string;
}

const PAGE_SIZE = 10;

export default async function MyPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: shop } = await supabase
    .from("shops")
    .select("*")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!shop) {
    return (
      <div className="card p-6">
        <h1 className="text-xl font-bold mb-2">マイページ</h1>
        <p className="text-sm text-slate-600">
          ショップ情報が見つかりません。管理者にお問い合わせください。
        </p>
      </div>
    );
  }

  // 今月の発注金額を集計
  const monthStart = firstDayOfMonth(new Date()).toISOString();
  const monthEnd = lastDayOfMonth(new Date()).toISOString();
  const { data: monthlyOrders } = await supabase
    .from("orders")
    .select("total_price")
    .eq("shop_id", shop.id)
    .gte("created_at", monthStart)
    .lte("created_at", monthEnd)
    .in("status", ["仮確定", "確定"])
    .is("deleted_at", null);

  const monthlyAmount = monthlyOrders?.reduce((s, o) => s + (o.total_price ?? 0), 0) ?? 0;

  const { data: rankRows } = await supabase.from("rank_settings").select("*");
  const settings = buildRankSettingsMap(rankRows ?? []);
  const { next, shortage } = amountToNextRank({
    currentRank: shop.current_rank,
    monthlyAmount,
    settings,
  });
  const currentRebate = settings[shop.current_rank].rebate;
  const nextThreshold = next ? settings[next].threshold : null;
  // 次ランクまでの進捗率 (0〜1)
  const progress = nextThreshold && nextThreshold > 0
    ? Math.min(1, monthlyAmount / nextThreshold)
    : 1;

  // 発注一覧 (フィルタ + ページネーション)
  const ordPage = Math.max(1, parseInt(searchParams.ord_page ?? "1", 10));
  const ordStatus = searchParams.ord_status ?? "all";
  let ordersQuery = supabase
    .from("orders")
    .select("*, products(title, model_number, image_url)", { count: "exact" })
    .eq("shop_id", shop.id)
    .is("deleted_at", null);
  if (ordStatus !== "all" && (ORDER_STATUSES as string[]).includes(ordStatus)) {
    ordersQuery = ordersQuery.eq("status", ordStatus as OrderStatus);
  }
  const { data: orders, count: ordCount } = await ordersQuery
    .order("created_at", { ascending: false })
    .range((ordPage - 1) * PAGE_SIZE, ordPage * PAGE_SIZE - 1);

  // 請求書一覧
  const invPage = Math.max(1, parseInt(searchParams.inv_page ?? "1", 10));
  const { data: invoices, count: invCount } = await supabase
    .from("invoices")
    .select("*", { count: "exact" })
    .eq("shop_id", shop.id)
    .is("deleted_at", null)
    .order("issued_at", { ascending: false })
    .range((invPage - 1) * PAGE_SIZE, invPage * PAGE_SIZE - 1);

  const ordTotalPages = ordCount ? Math.ceil(ordCount / PAGE_SIZE) : 1;
  const invTotalPages = invCount ? Math.ceil(invCount / PAGE_SIZE) : 1;

  return (
    <div className="space-y-8">
      {/* ヘッダ + KPI */}
      <section>
        <h1 className="text-2xl font-bold mb-4">マイページ</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-5">
            <p className="text-xs text-slate-500">現在のランク</p>
            <p className="text-2xl font-bold mt-1">{RANK_LABEL[shop.current_rank]}</p>
            <p className="text-xs text-slate-500 mt-1">
              リベート率 <span className="font-medium text-emerald-700">{formatRate(currentRebate)}</span>
            </p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-slate-500">今月の発注額</p>
            <p className="text-2xl font-bold mt-1">{formatYen(monthlyAmount)}</p>
            <p className="text-xs text-slate-500 mt-1">仮確定 + 確定の合計</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-slate-500">次ランクまで</p>
            {next ? (
              <>
                <p className="text-2xl font-bold mt-1">{formatYen(shortage)}</p>
                <p className="text-xs text-slate-500 mt-1">{RANK_LABEL[next]} まで</p>
              </>
            ) : (
              <p className="text-sm text-slate-500 mt-1">最上位ランクです</p>
            )}
          </div>
        </div>

        {/* ランク進捗バー */}
        {next && (
          <div className="card p-5 mt-4">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm font-medium">
                {RANK_LABEL[shop.current_rank]} → {RANK_LABEL[next]} 進捗
              </span>
              <span className="text-xs text-slate-500">
                {formatYen(monthlyAmount)} / {formatYen(nextThreshold!)} ({Math.round(progress * 100)}%)
              </span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-brand-700 transition-all"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        )}
      </section>

      <MyPageDataView
        orders={orders ?? []}
        ordCount={ordCount ?? 0}
        ordPage={ordPage}
        ordTotalPages={ordTotalPages}
        ordStatus={ordStatus}
        invoices={invoices ?? []}
        invCount={invCount ?? 0}
        invPage={invPage}
        invTotalPages={invTotalPages}
        shopRank={shop.current_rank}
      />

      <div className="flex items-center justify-center gap-3 flex-wrap">
        <Link href="/order" className="btn-primary">発注ページへ</Link>
        <Link href="/notifications" className="btn-secondary">通知履歴</Link>
        <a href="/api/profile/orders/export" className="btn-secondary text-xs">発注履歴 CSV</a>
      </div>
    </div>
  );
}
