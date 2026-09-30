// お知らせ (アプリ内通知)
//   テストユーザー (または全体反映後): 「全体へのお知らせ」「あなたへのお知らせ」のタブ表示
//   それ以外: 従来の通知履歴
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatJST } from "@/lib/dates";
import { sanitizeHtml } from "@/lib/sanitize";
import { getNoticeAccess, laterOf } from "@/lib/feature-flags";
import { formatReleaseDate } from "@/lib/price-display";
import {
  getGeneralFeed, getSeenAt, getUnreadCounts, markSeen, NEW_PRODUCT_WINDOW_DAYS, type NoticeTab,
} from "@/lib/shop-notifications";
import { NotificationHistory } from "./NotificationHistory";

export const metadata = { title: "お知らせ | トレカ商事" };
export const dynamic = "force-dynamic";

interface SearchParams { tab?: string; page?: string }
const PAGE_SIZE = 20;

export default async function NotificationsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: shop } = await supabase
    .from("shops")
    .select("id, current_rank, created_at")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!shop) {
    return (
      <div className="card p-6">
        <h1 className="text-xl font-bold mb-2">お知らせ</h1>
        <p className="text-sm text-slate-600">ショップ情報が見つかりません。</p>
      </div>
    );
  }
  const access = await getNoticeAccess(shop.id);
  if (!access.enabled || !access.startAt) return <NotificationHistory shopId={shop.id} searchParams={searchParams} />;
  const startAt = access.startAt;

  const admin = createAdminClient();
  const [counts, seen] = await Promise.all([getUnreadCounts(admin, shop, startAt), getSeenAt(admin, shop)]);
  const tab: NoticeTab =
    searchParams.tab === "personal" || searchParams.tab === "general"
      ? searchParams.tab
      : counts.general === 0 && counts.personal > 0 ? "personal" : "general";

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const general = tab === "general" ? await getGeneralFeed(admin, shop, startAt) : [];
  const personalRes = tab === "personal"
    ? await supabase
        .from("notifications")
        .select("id, subject, body, created_at", { count: "exact" })
        .eq("shop_id", shop.id)
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
    : null;
  const personal = personalRes?.data ?? [];
  const personalTotal = personalRes?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(personalTotal / PAGE_SIZE));

  // 開いたタブを既読にする (「NEW」表示は開く前の既読位置で判定)
  await markSeen(admin, shop.id, tab);
  const seenBefore = laterOf(seen[tab], startAt);

  const tabLink = (t: NoticeTab, label: string, n: number) => (
    <Link
      href={`/notifications?tab=${t}`}
      className={`flex-1 text-center px-3 py-2.5 text-sm font-semibold rounded-md transition ${
        tab === t ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
      {n > 0 && tab !== t && (
        <span className="ml-1.5 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-xs">{n}</span>
      )}
    </Link>
  );

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <Link href="/mypage" className="text-sm text-brand-600 hover:underline">← マイページ</Link>
        <div className="flex items-end justify-between gap-2 mt-1">
          <h1 className="text-2xl font-bold">お知らせ</h1>
          <Link href="/notifications/settings" className="text-sm text-brand-600 hover:underline">⚙ 受け取り設定</Link>
        </div>
      </div>

      <div className="card p-1 flex gap-1">
        {tabLink("general", "全体へのお知らせ", counts.general)}
        {tabLink("personal", "あなたへのお知らせ", counts.personal)}
      </div>

      {tab === "general" ? (
        <>
          <p className="text-xs text-slate-500">新しく公開された商品（直近{NEW_PRODUCT_WINDOW_DAYS}日）と、トレカ商事からのお知らせです。</p>
          {general.length === 0 ? (
            <div className="card p-8 text-center text-slate-500 text-sm">新しいお知らせはありません</div>
          ) : (
            <ul className="space-y-2">
              {general.map((g) => {
                const isNew = g.at > seenBefore;
                return (
                  <li key={`${g.kind}-${g.id}`} className={`card p-4 ${isNew ? "border-brand-300 bg-brand-50/40" : ""}`}>
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {g.kind === "new_product"
                        ? <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">新商品</span>
                        : <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold">お知らせ</span>}
                      {isNew && <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white font-bold">NEW</span>}
                      <span className="text-slate-500">{formatJST(g.at)}</span>
                    </div>
                    {g.kind === "new_product" ? (
                      <div className="mt-1.5">
                        <p className="font-medium text-sm">新しい商品が公開されました：{g.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          発売日 {formatReleaseDate(g.releaseDate) ?? "未定"}
                          {!g.orderable && <span className="ml-2 text-slate-400">（現在は受付していません）</span>}
                        </p>
                        {g.orderable && g.href && <Link href={g.href} className="inline-block text-sm text-brand-600 hover:underline mt-1">商品を見る →</Link>}
                      </div>
                    ) : (
                      <div className="mt-1.5">
                        <p className="font-medium text-sm">{g.title}</p>
                        {g.body && <p className="text-sm text-slate-700 mt-1 whitespace-pre-line">{g.body}</p>}
                        {g.href && <a href={g.href} className="inline-block text-sm text-brand-600 hover:underline mt-1">詳しく見る →</a>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : (
        <>
          <p className="text-xs text-slate-500">発注の確定・発送・請求書の発行・ランクの変更など、あなた宛てのお知らせです（メールでお送りした内容と同じです）。</p>
          {personal.length === 0 ? (
            <div className="card p-8 text-center text-slate-500 text-sm">お知らせはまだありません</div>
          ) : (
            <ul className="space-y-2">
              {personal.map((n) => {
                const isNew = n.created_at > seenBefore;
                return (
                  <li key={n.id} className={`card p-4 space-y-1.5 ${isNew ? "border-brand-300 bg-brand-50/40" : ""}`}>
                    <div className="flex items-center gap-2 text-xs">
                      {isNew && <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white font-bold">NEW</span>}
                      <span className="text-slate-500">{formatJST(n.created_at)}</span>
                    </div>
                    <p className="font-medium text-sm">{n.subject}</p>
                    <details className="text-xs">
                      <summary className="text-brand-600 cursor-pointer">内容を表示</summary>
                      <div
                        className="mt-2 p-3 bg-slate-50 rounded text-slate-700 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(n.body) }}
                      />
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 text-sm">
              {page > 1 && <Link href={`/notifications?tab=personal&page=${page - 1}`} className="btn-secondary text-xs">← 前</Link>}
              <span className="text-slate-500">{page} / {totalPages}</span>
              {page < totalPages && <Link href={`/notifications?tab=personal&page=${page + 1}`} className="btn-secondary text-xs">次 →</Link>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
