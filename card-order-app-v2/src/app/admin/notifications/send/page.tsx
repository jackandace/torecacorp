import { createClient } from "@/lib/supabase/server";
import { SendNotificationForm } from "./SendNotificationForm";

export const metadata = { title: "通知送信 | 管理" };
export const dynamic = "force-dynamic";

export default async function SendNotificationPage() {
  const supabase = createClient();
  const [{ data: shops }, { data: templates }] = await Promise.all([
    supabase
      .from("shops")
      .select("id, company_name, email, status")
      .is("deleted_at", null)
      .order("company_name"),
    supabase
      .from("notification_templates")
      .select("code, name, subject"),
  ]);

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">通知を送信</h1>
      <p className="text-sm text-slate-500">
        テンプレートを選び、一斉送信または個別送信できます。停止中 (suspended) のショップにはスキップされます。
      </p>
      <SendNotificationForm shops={shops ?? []} templates={templates ?? []} />
    </div>
  );
}
