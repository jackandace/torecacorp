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
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">お問い合わせ ({inquiries?.length ?? 0})</h1>
          <p className="text-sm text-slate-500 mt-1">
            <Link href="/faq" className="text-brand-600 hover:underline">FAQ</Link> もご覧ください
          </p>
        </div>
        <Link href="/inquiries/new" className="btn-primary">+ 新規問い合わせ</Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-2">件名</th>
              <th className="text-left px-3 py-2">カテゴリ</th>
              <th className="text-left px-3 py-2">状態</th>
              <th className="text-left px-3 py-2">最終更新</th>
            </tr>
          </thead>
          <tbody>
            {(inquiries ?? []).map((i) => (
              <tr key={i.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2">
                  <Link href={`/inquiries/${i.id}`} className="text-brand-700 hover:underline font-medium">
                    {i.subject}
                  </Link>
                </td>
                <td className="px-3 py-2 text-xs">{INQUIRY_CATEGORY_LABEL[i.category]}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded font-medium ${INQUIRY_STATUS_TONE[i.status]}`}>
                    {INQUIRY_STATUS_LABEL[i.status]}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs">{formatJST(i.last_reply_at ?? i.created_at)}</td>
              </tr>
            ))}
            {(!inquiries || inquiries.length === 0) && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">問い合わせはまだありません</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
