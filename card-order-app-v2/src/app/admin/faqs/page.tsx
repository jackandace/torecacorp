import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FAQ_CATEGORY_LABEL } from "@/constants/inquiry";
import { FaqList } from "./FaqList";

export const metadata = { title: "FAQ 管理 | 管理" };
export const dynamic = "force-dynamic";

export default async function FaqAdminPage() {
  const supabase = createClient();
  const { data: faqs } = await supabase
    .from("faqs")
    .select("*")
    .is("deleted_at", null)
    .order("category")
    .order("sort_order");

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">FAQ 管理 ({faqs?.length ?? 0})</h1>
        <Link href="/admin/inquiries" className="btn-secondary text-xs">問い合わせへ</Link>
      </div>
      <p className="text-sm text-slate-500">
        ショップ側 <code>/faq</code> でこちらの公開中 FAQ が表示されます。カテゴリは {Object.values(FAQ_CATEGORY_LABEL).join(" / ")}。
      </p>
      <FaqList faqs={faqs ?? []} />
    </div>
  );
}
