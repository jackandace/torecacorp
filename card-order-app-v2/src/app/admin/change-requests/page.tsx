import { createClient } from "@/lib/supabase/server";
import { ChangeRequestList } from "./ChangeRequestList";

export const metadata = { title: "変更申請 | 管理" };
export const dynamic = "force-dynamic";

export default async function ChangeRequestsPage() {
  const supabase = createClient();

  const [{ data: pending }, { data: history }] = await Promise.all([
    supabase
      .from("shop_change_requests")
      .select("*, shops(company_name, contact_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase
      .from("shop_change_requests")
      .select("*, shops(company_name)")
      .neq("status", "pending")
      .order("reviewed_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">変更申請 ({pending?.length ?? 0} 件待ち)</h1>
        <p className="text-sm text-slate-500 mt-1">
          ショップからの配送先変更などの申請を確認し、承認 / 却下してください。
          承認すると登録情報が書き換わり、ショップへ通知メールが送信されます。
        </p>
      </div>
      <ChangeRequestList pending={pending ?? []} history={history ?? []} />
    </div>
  );
}
