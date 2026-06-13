import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatJST } from "@/lib/dates";
import { sanitizeHtml } from "@/lib/sanitize";

export const metadata = { title: "通知履歴 | トレカ商事" };
export const dynamic = "force-dynamic";

interface SearchParams { page?: string }
const PAGE_SIZE = 20;

export default async function NotificationsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!shop) {
    return (
      <div className="card p-6">
        <h1 className="text-xl font-bold mb-2">通知履歴</h1>
        <p className="text-sm text-slate-600">ショップ情報が見つかりません。</p>
      </div>
    );
  }

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const { data: notifications, count } = await supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("shop_id", shop.id)
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/mypage" className="text-sm text-brand-600 hover:underline">← マイページ</Link>
        <h1 className="text-2xl font-bold mt-1">通知履歴 ({count ?? 0} 件)</h1>
        <p className="text-sm text-slate-500 mt-1">
          発注確認・請求書発行・ランク変動などのお知らせ履歴です。
        </p>
      </div>

      {(notifications ?? []).length === 0 ? (
        <div className="card p-8 text-center text-slate-500 text-sm">
          通知履歴はまだありません
        </div>
      ) : (
        <ul className="space-y-3">
          {(notifications ?? []).map((n) => (
            <li key={n.id} className="card p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{n.subject}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {formatJST(n.created_at)}
                    {n.template_code && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 bg-slate-100 rounded font-mono text-[10px]">
                        {n.template_code}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                  n.status === "sent"   ? "bg-emerald-100 text-emerald-800" :
                  n.status === "failed" ? "bg-rose-100 text-rose-700" :
                                          "bg-slate-100 text-slate-700"
                }`}>
                  {n.status === "sent" ? "送信済" : n.status === "failed" ? "失敗" : "送信待ち"}
                </span>
              </div>
              <details className="text-xs">
                <summary className="text-brand-600 cursor-pointer">本文を表示</summary>
                <div
                  className="mt-2 p-3 bg-slate-50 rounded text-slate-700 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(n.body) }}
                />
              </details>
              {n.error_detail && (
                <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded">
                  エラー: {n.error_detail}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 text-sm">
          {page > 1 && (
            <Link href={`/notifications?page=${page - 1}`} className="btn-secondary text-xs">← 前</Link>
          )}
          <span className="text-slate-500">{page} / {totalPages}</span>
          {page < totalPages && (
            <Link href={`/notifications?page=${page + 1}`} className="btn-secondary text-xs">次 →</Link>
          )}
        </div>
      )}
    </div>
  );
}
