import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, isSuperAdmin } from "@/lib/auth";
import { AdminSidebar } from "@/components/AdminSidebar";

const NAV = [
  { href: "/admin",                  label: "ダッシュボード" },
  { href: "/admin/inventory",        label: "在庫管理" },
  { href: "/admin/orders",           label: "発注管理" },
  { href: "/admin/shops",            label: "顧客管理" },
  { href: "/admin/suppliers",        label: "問屋管理" },
  { href: "/admin/billing",          label: "請求・入金" },
  { href: "/admin/rebate",           label: "リベート管理", superOnly: true },
  { href: "/admin/notifications",    label: "通知センター" },
  { href: "/admin/surveys",          label: "販売店調査" },
  { href: "/admin/reports",          label: "レポート" },
  { href: "/admin/tasks",            label: "タスク" },
  { href: "/admin/change-requests",  label: "変更申請" },
  { href: "/admin/inquiries",        label: "問い合わせ" },
  { href: "/admin/faqs",             label: "FAQ" },
  { href: "/admin/staff",            label: "スタッフ", superOnly: true },
  { href: "/admin/audit",            label: "監査ログ", superOnly: true },
  { href: "/admin/manual",           label: "操作マニュアル" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (!isAdmin(user)) redirect("/mypage");

  return (
    <div className="min-h-screen lg:flex">
      <AdminSidebar nav={NAV} email={user.email ?? ""} superAdmin={isSuperAdmin(user)} />
      <main className="flex-1 bg-slate-50 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 overflow-x-auto">
        {children}
      </main>
    </div>
  );
}
