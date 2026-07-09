import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { ShopNav } from "@/components/ShopNav";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (isAdmin(user)) redirect("/admin");

  return (
    <div className="min-h-screen">
      <ShopNav />
      {/* 下部固定タブ(モバイル)に隠れないよう余白 */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-8">{children}</main>
    </div>
  );
}
