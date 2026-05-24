import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FAQ_CATEGORY_LABEL } from "@/constants/inquiry";
import type { FaqCategory } from "@/types/database";

export const metadata = { title: "FAQ | トレカ商事" };
export const dynamic = "force-dynamic";

export default async function FaqPage() {
  const supabase = createClient();
  const { data: faqs } = await supabase
    .from("faqs")
    .select("*")
    .eq("is_published", true)
    .is("deleted_at", null)
    .order("category")
    .order("sort_order");

  // カテゴリでグループ化
  const grouped = new Map<FaqCategory, typeof faqs>();
  for (const f of faqs ?? []) {
    const list = grouped.get(f.category) ?? [];
    list.push(f);
    grouped.set(f.category, list);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">よくある質問 (FAQ)</h1>
        <p className="text-sm text-slate-500 mt-1">
          解決しない場合は <Link href="/inquiries/new" className="text-brand-600 hover:underline">お問い合わせフォーム</Link> へ。
        </p>
      </div>

      {!faqs || faqs.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">FAQ はまだ登録されていません</div>
      ) : (
        Array.from(grouped.entries()).map(([category, list]) => (
          <section key={category} className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-700 border-b pb-1">{FAQ_CATEGORY_LABEL[category]}</h2>
            <div className="space-y-2">
              {list!.map((f) => (
                <details key={f.id} className="card p-4">
                  <summary className="font-medium cursor-pointer text-sm">{f.question}</summary>
                  <div className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">{f.answer}</div>
                </details>
              ))}
            </div>
          </section>
        ))
      )}

      <div className="text-center pt-4">
        <Link href="/inquiries/new" className="btn-primary">問い合わせを送る</Link>
      </div>
    </div>
  );
}
