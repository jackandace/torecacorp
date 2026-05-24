import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewInquiryForm } from "./NewInquiryForm";

export const metadata = { title: "新規問い合わせ | トレカ商事" };
export const dynamic = "force-dynamic";

export default async function NewInquiryPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 商品リスト (型番選択用) - 自分が見られる公開商品のみ
  const { data: products } = await supabase
    .from("products")
    .select("id, series, title, model_number")
    .eq("is_visible", true)
    .is("deleted_at", null)
    .order("series")
    .order("title");

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">新規問い合わせ</h1>
      <p className="text-sm text-slate-500">
        担当者が確認次第ご返信いたします。発送・請求の急ぎの内容は電話もご利用ください。
      </p>
      <NewInquiryForm products={products ?? []} />
    </div>
  );
}
