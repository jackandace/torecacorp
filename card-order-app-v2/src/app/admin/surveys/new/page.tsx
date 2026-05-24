import { createClient } from "@/lib/supabase/server";
import { NewSurveyForm } from "./NewSurveyForm";

export const metadata = { title: "調査レポート登録 | 管理" };
export const dynamic = "force-dynamic";

export default async function NewSurveyPage() {
  const supabase = createClient();
  const { data: shops } = await supabase
    .from("shops")
    .select("id, company_name")
    .is("deleted_at", null)
    .order("company_name");

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">調査レポート登録</h1>
      <NewSurveyForm shops={shops ?? []} />
    </div>
  );
}
