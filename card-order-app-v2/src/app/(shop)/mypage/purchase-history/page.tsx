// マイページ: 購入履歴 (卸アプリ運用以前) — 閲覧のみ
// legacy_purchases の RLS は admin のみ (社内メモを守るため) なので、
// ログイン中ショップを確定したうえで Service Role で「表示してよい列だけ」を取得する。
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SHIPMENT_LABEL } from "@/lib/legacy-purchases";
import type { LegacyPurchaseShipmentStatus } from "@/types/database";

export const metadata = { title: "購入履歴（アプリ運用以前） | トレカ商事" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const yen = (n: number) => `¥${n.toLocaleString()}`;
const fmtDate = (d: string) => d.replaceAll("-", "/");
const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

interface SearchParams { from?: string; to?: string; q?: string; page?: string }

export default async function PurchaseHistoryPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: shop } = await supabase
    .from("shops").select("id").eq("user_id", user.id).is("deleted_at", null).maybeSingle();
  if (!shop) redirect("/mypage");

  const from = isDate(searchParams.from) ? searchParams.from! : "";
  const to = isDate(searchParams.to) ? searchParams.to! : "";
  const q = (searchParams.q ?? "").trim().slice(0, 100);
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const admin = createAdminClient();
  let query = admin
    .from("legacy_purchases")
    .select("id, purchased_on, product_name, quantity, unit, unit_price, amount, shipment_status, note", { count: "exact" })
    .eq("shop_id", shop.id)
    .is("deleted_at", null);
  if (from) query = query.gte("purchased_on", from);
  if (to) query = query.lte("purchased_on", to);
  if (q) query = query.ilike("product_name", `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`);
  const { data: rows, count } = await query
    .order("purchased_on", { ascending: false })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (p: number) => {
    const sp = new URLSearchParams();
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    if (q) sp.set("q", q);
    sp.set("page", String(p));
    return `/mypage/purchase-history?${sp.toString()}`;
  };

  return (
    <div className="space-y-5">
      <div>
        <Link href="/mypage" className="text-sm text-brand-600 hover:underline">← マイページ</Link>
        <h1 className="text-xl sm:text-2xl font-bold mt-1">購入履歴 <span className="text-base font-normal text-slate-500">（アプリ運用以前の履歴）</span></h1>
        <p className="text-sm text-slate-500 mt-1">卸アプリ運用以前にご購入いただいた商品の履歴です。金額はすべて税抜です。</p>
      </div>

      <form method="get" className="card p-4 flex flex-wrap items-end gap-3 text-sm">
        <label className="block"><span className="block text-xs text-slate-600 mb-1">購入日</span>
          <span className="flex items-center gap-1">
            <input type="date" name="from" defaultValue={from} className="input text-sm" />〜
            <input type="date" name="to" defaultValue={to} className="input text-sm" />
          </span></label>
        <label className="block flex-1 min-w-[160px]"><span className="block text-xs text-slate-600 mb-1">商品名</span>
          <input name="q" defaultValue={q} placeholder="商品名で検索" className="input text-sm" /></label>
        <button type="submit" className="btn-primary text-xs">検索</button>
        {(from || to || q) && <Link href="/mypage/purchase-history" className="btn-secondary text-xs">クリア</Link>}
      </form>

      {/* スマホ: カード */}
      <div className="md:hidden space-y-2">
        {(rows ?? []).map((r) => (
          <div key={r.id} className="card p-3 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-xs text-slate-500">{fmtDate(r.purchased_on)}</span>
              <ShipBadge status={r.shipment_status} />
            </div>
            <div className="font-medium mt-1">{r.product_name}</div>
            <div className="text-xs text-slate-600 mt-1">数量: {r.quantity}{r.unit} ・ 単価 {yen(r.unit_price)} ・ 金額 <b>{yen(r.amount)}</b></div>
            {r.note && <div className="text-xs text-slate-500 mt-1">備考: {r.note}</div>}
          </div>
        ))}
      </div>

      {/* PC: テーブル */}
      <div className="card overflow-x-auto hidden md:block">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-2">購入日</th>
              <th className="text-left px-3 py-2">商品名</th>
              <th className="text-right px-3 py-2">数量</th>
              <th className="text-right px-3 py-2">単価(税抜)</th>
              <th className="text-right px-3 py-2">金額(税抜)</th>
              <th className="text-left px-3 py-2">出荷</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.id} className="border-t border-slate-100 align-top">
                <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.purchased_on)}</td>
                <td className="px-3 py-2">{r.product_name}{r.note && <div className="text-xs text-slate-500">備考: {r.note}</div>}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">{r.quantity}{r.unit}</td>
                <td className="px-3 py-2 text-right">{yen(r.unit_price)}</td>
                <td className="px-3 py-2 text-right">{yen(r.amount)}</td>
                <td className="px-3 py-2"><ShipBadge status={r.shipment_status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total === 0 && (
        <div className="card p-8 text-center text-sm text-slate-500">
          {from || to || q ? "条件に一致する履歴はありません" : "表示できる購入履歴はありません"}
        </div>
      )}

      {total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">{total} 件中 {(page - 1) * PAGE_SIZE + 1}〜{Math.min(page * PAGE_SIZE, total)} 件</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              {page > 1 ? <Link href={link(page - 1)} className="btn-secondary text-xs">← 前へ</Link> : <span className="btn-secondary text-xs opacity-40">← 前へ</span>}
              <span className="px-2">{page} / {totalPages}</span>
              {page < totalPages ? <Link href={link(page + 1)} className="btn-secondary text-xs">次へ →</Link> : <span className="btn-secondary text-xs opacity-40">次へ →</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ShipBadge({ status }: { status: LegacyPurchaseShipmentStatus }) {
  return (
    <span className={`text-[11px] px-1.5 py-0.5 rounded whitespace-nowrap ${status === "unshipped" ? "bg-amber-100 text-amber-800 font-semibold" : "bg-slate-100 text-slate-600"}`}>
      {SHIPMENT_LABEL[status]}
    </span>
  );
}
