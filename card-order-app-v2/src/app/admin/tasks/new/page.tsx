import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TaskForm } from "../TaskForm";

export const metadata = { title: "新規タスク | 管理" };
export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  const supabase = createClient();
  const adminSb = createAdminClient();

  const [{ data: shops }, listResult] = await Promise.all([
    supabase.from("shops").select("id, company_name").is("deleted_at", null).order("company_name"),
    adminSb.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const users = (listResult.data?.users ?? [])
    .filter((u) => ["admin", "super_admin"].includes((u.user_metadata?.role as string) ?? ""))
    .map((u) => ({ id: u.id, name: (u.user_metadata?.display_name as string | undefined) ?? u.email ?? "—" }));

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">新規タスク</h1>
      <TaskForm mode="create" shops={shops ?? []} users={users} />
    </div>
  );
}
