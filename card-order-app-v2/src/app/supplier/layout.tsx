import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupplier } from "@/lib/auth";
import { getCurrentSupplier } from "@/lib/supplier";
import { LogoutButton } from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function SupplierLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isSupplier(user)) redirect("/mypage");

  const ctx = await getCurrentSupplier(supabase);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-sm sm:text-base whitespace-nowrap">トレカ商事 ｜ 問屋ポータル</span>
            {ctx && <span className="text-xs bg-white/15 rounded px-2 py-0.5 truncate">{ctx.supplier.name}</span>}
          </div>
          <LogoutButton />
        </div>
        <nav className="max-w-5xl mx-auto px-4 flex gap-5 text-sm overflow-x-auto">
          <Link href="/supplier" className="py-2 border-b-2 border-transparent hover:border-white/70 whitespace-nowrap">ダッシュボード</Link>
          <Link href="/supplier/shipments" className="py-2 border-b-2 border-transparent hover:border-white/70 whitespace-nowrap">出荷更新</Link>
          {/* フェーズ3-4で追加: 納品完了 / 入荷登録 */}
        </nav>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        {ctx ? (
          children
        ) : (
          <div className="card p-6 text-sm">
            <h1 className="text-lg font-bold mb-2">問屋アカウントの設定が未完了です</h1>
            <p className="text-slate-600">
              このアカウントはまだ問屋に紐付いていません。トレカ商事の担当者にお問い合わせください。
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
