import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TaskForm } from "../TaskForm";

export const dynamic = "force-dynamic";

export default async function TaskEditPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: task } = await supabase
    .from("staff_tasks")
    .select("*")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!task) notFound();

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
      <Link href="/admin/tasks" className="text-sm text-brand-600 hover:underline">← タスク一覧</Link>
      <h1 className="text-2xl font-bold">タスク編集</h1>
      <TaskForm mode="edit" task={task} shops={shops ?? []} users={users} />
    </div>
  );
}
