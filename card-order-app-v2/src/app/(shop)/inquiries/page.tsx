import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatJST } from "@/lib/dates";
import { INQUIRY_CATEGORY_LABEL, INQUIRY_STATUS_LABEL, INQUIRY_STATUS_TONE } from "@/constants/inquiry";

export const metadata = { title: "お問い合わせ | トレカ商事" };
export const dynamic = "force-dynamic";

export default async function InquiriesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!shop) return <div className="card p-6 text-sm text-slate-600">ショップ情報が見つかりません。</div>;

  const { data: inquiries } = await supabase
    .from("inquiries")
    .select("*")
    .eq("shop_id", shop.id)
    .is("deleted_at", null)
    .order("last_reply_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  // 各問い合わせの最新メッセージをまとめて取得し、一覧にプレビュー表示
  const ids = (inquiries ?? []).map((i) => i.id);
  const latestByInquiry = new Map<string, { body: string; from_kind: string }>();
  if (ids.length > 0) {
    const { data: msgs } = await supabase
      .from("inquiry_messages")
      .select("inquiry_id, body, from_kind, created_at")
      .in("inquiry_id", ids)
      .order("created_at", { ascending: false });
    for (const m of msgs ?? []) {
      if (!latestByInquiry.has(m.inquiry_id)) {
        latestByInquiry.set(m.inquiry_id, { body: m.body, from_kind: m.from_kind });
      }
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">お問い合わせ / チャット ({inquiries?.length ?? 0})</h1>
          <p className="text-sm text-slate-500 mt-1">
            ご質問・ご相談はこちらから。担当者とそのままチャットでやり取りできます。
            <Link href="/faq" className="text-brand-600 hover:underline ml-1">FAQ</Link> もご覧ください
          </p>
        </div>
        <Link href="/inquiries/new" className="btn-primary">+ 新規チャットを開始</Link>
      </div>

      <div className="space-y-2">
        {(inquiries ?? []).map((i) => {
          const latest = latestByInquiry.get(i.id);
          const preview = latest?.body ?? i.body;
          const hasNewReply = i.last_reply_by === "admin";
          return (
            <Link
              key={i.id}
              href={`/inquiries/${i.id}`}
              className="card p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate">{i.subject}</span>
                  {hasNewReply && (
                    <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-bold">
                      新着返信
                    </span>
                  )}
                  <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded font-medium ${INQUIRY_STATUS_TONE[i.status]}`}>
                    {INQUIRY_STATUS_LABEL[i.status]}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 truncate">
                  <span className="text-slate-400">{latest ? (latest.from_kind === "admin" ? "担当者: " : "あなた: ") : ""}</span>
                  {preview}
                </p>
                <div className="text-[11px] text-slate-400 mt-1">
                  {INQUIRY_CATEGORY_LABEL[i.category]} ・ {formatJST(i.last_reply_at ?? i.created_at)}
                </div>
              </div>
              <span className="text-brand-600 text-sm shrink-0 self-center">チャットを開く →</span>
            </Link>
          );
        })}
        {(!inquiries || inquiries.length === 0) && (
          <div className="card p-8 text-center text-slate-500 text-sm">
            まだチャットはありません。「+ 新規チャットを開始」からお問い合わせください。
          </div>
        )}
      </div>
    </div>
  );
}
