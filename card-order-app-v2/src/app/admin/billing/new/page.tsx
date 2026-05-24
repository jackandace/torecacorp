import { createClient } from "@/lib/supabase/server";
import { BillingWizard } from "./BillingWizard";

export const metadata = { title: "請求書発行 | 管理" };
export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const supabase = createClient();
  // suspended (停止中) 以外のショップを全部出す。
  // active だけだと取込直後の pending ショップが見えず、請求が進められなかった。
  const { data: shops } = await supabase
    .from("shops")
    .select("id, company_name, current_rank, rate_override, status")
    .in("status", ["active", "pending"])
    .is("deleted_at", null)
    .order("company_name");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">請求書を発行</h1>
      <p className="text-sm text-slate-500">
        active / pending のショップが選択できます。確定済みの発注がある場合のみ請求書を発行できます。
      </p>
      <BillingWizard shops={shops ?? []} />
    </div>
  );
}
