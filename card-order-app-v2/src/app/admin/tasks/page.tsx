import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TaskList } from "./TaskList";
import type { TaskCategory, TaskStatus, TaskPriority } from "@/types/database";

export const metadata = { title: "タスク | 管理" };
export const dynamic = "force-dynamic";

interface SearchParams {
  status?: string;
  category?: string;
  assigned?: string;
  page?: string;
}
const PAGE_SIZE = 30;

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string | null;
  related_shop_id: string | null;
  related_invoice_id: string | null;
  related_order_id: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  shop_name?: string | null;
  assignee_name?: string | null;
}

export default async function TasksPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();
  const adminSb = createAdminClient();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));

  let q = supabase
    .from("staff_tasks")
    .select("*, shops(company_name)", { count: "exact" })
    .is("deleted_at", null);

  if (searchParams.status && searchParams.status !== "all") {
    q = q.eq("status", searchParams.status as TaskStatus);
  }
  if (searchParams.category && searchParams.category !== "all") {
    q = q.eq("category", searchParams.category as TaskCategory);
  }
  if (searchParams.assigned) {
    q = q.eq("assigned_to", searchParams.assigned);
  }

  const { data: tasks, count } = await q
    .order("status", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("priority", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  // 担当者の表示名を取得
  const { data: list } = await adminSb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const userMap = new Map(
    (list?.users ?? []).map((u) => [u.id, (u.user_metadata?.display_name as string | undefined) ?? u.email ?? "—"]),
  );

  const rows: TaskRow[] = (tasks ?? []).map((t) => ({
    ...t,
    shop_name: (t as { shops?: { company_name?: string } | null }).shops?.company_name ?? null,
    assignee_name: t.assigned_to ? userMap.get(t.assigned_to) ?? null : null,
  }));

  const allUsers = (list?.users ?? [])
    .filter((u) => {
      const role = u.user_metadata?.role;
      return role === "admin" || role === "super_admin";
    })
    .map((u) => ({
      id: u.id,
      name: (u.user_metadata?.display_name as string | undefined) ?? u.email ?? "—",
    }));

  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">タスク ({count ?? 0})</h1>
        <Link href="/admin/tasks/new" className="btn-primary">+ 新規タスク</Link>
      </div>

      <TaskList
        rows={rows}
        users={allUsers}
        filters={{
          status: searchParams.status ?? "all",
          category: searchParams.category ?? "all",
          assigned: searchParams.assigned,
        }}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
