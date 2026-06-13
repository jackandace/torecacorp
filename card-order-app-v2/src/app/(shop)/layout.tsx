import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";

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
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/order" className="font-bold text-sm sm:text-base">
            <span className="hidden sm:inline">トレカ商事 | ショップ</span>
            <span className="sm:hidden">トレカ商事</span>
          </Link>
          <nav className="flex items-center gap-3 sm:gap-5 text-sm">
            <Link href="/order" className="hover:text-brand-600">発注</Link>
            <Link href="/mypage" className="hover:text-brand-600">マイページ</Link>
            <Link href="/inquiries" className="hover:text-brand-600 hidden sm:inline">お問い合わせ</Link>
            <Link href="/faq" className="hover:text-brand-600 hidden md:inline">FAQ</Link>
            <Link href="/notifications" className="hover:text-brand-600 hidden lg:inline">通知</Link>
            <Link href="/manual" className="hover:text-brand-600 hidden lg:inline">マニュアル</Link>
            <Link href="/profile" className="hover:text-brand-600">プロフィール</Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">{children}</main>
    </div>
  );
}
