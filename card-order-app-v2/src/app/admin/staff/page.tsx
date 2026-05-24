import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { StaffList } from "./StaffList";

export const metadata = { title: "スタッフ管理 | 管理" };
export const dynamic = "force-dynamic";

export interface StaffRow {
  user_id: string;
  email: string;
  role: "shop" | "admin" | "super_admin";
  display_name: string | null;
  department: string | null;
  active: boolean;
  last_sign_in: string | null;
  created_at: string;
}

export default async function StaffPage() {
  const supabase = createClient();
  const adminSb = createAdminClient();

  // 全 Auth ユーザーを取得 (1000 件まで)
  const { data: list } = await adminSb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = list?.users ?? [];

  // admin / super_admin だけ抽出
  const staffUsers = users.filter((u) => {
    const role = u.user_metadata?.role;
    return role === "admin" || role === "super_admin";
  });

  // staff_profiles をまとめて取得
  const { data: profiles } = await supabase
    .from("staff_profiles")
    .select("*")
    .in("user_id", staffUsers.map((u) => u.id));
  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  const rows: StaffRow[] = staffUsers.map((u) => {
    const p = profileMap.get(u.id);
    return {
      user_id: u.id,
      email: u.email ?? "—",
      role: (u.user_metadata?.role ?? "shop") as StaffRow["role"],
      display_name: p?.display_name ?? null,
      department: p?.department ?? null,
      active: p?.active ?? true,
      last_sign_in: u.last_sign_in_at ?? null,
      created_at: u.created_at,
    };
  }).sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">スタッフ管理 ({rows.length})</h1>
        <Link href="/admin/staff/new" className="btn-primary">+ 新規スタッフ招待</Link>
      </div>
      <p className="text-sm text-slate-500">
        admin / super_admin ロールの社内ユーザー一覧。表示名 / 部署はこの画面で編集できます。
      </p>
      <StaffList rows={rows} />
    </div>
  );
}
