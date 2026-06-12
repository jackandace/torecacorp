import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { InvitesManager } from "./InvitesManager";

export const metadata = { title: "登録招待リンク | 管理" };
export const dynamic = "force-dynamic";

export default async function InvitesPage() {
  const supabase = createClient();
  const { data: invites } = await supabase
    .from("registration_invites")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href="/admin/shops" className="text-sm text-brand-600 hover:underline">← 顧客管理</Link>
        <h1 className="text-2xl font-bold mt-1">新規登録 招待リンク</h1>
        <p className="text-sm text-slate-500 mt-1">
          メールでの簡易ヒアリング (実店舗あり・運営歴) を通過した事業者に発行してください。
          リンクを受け取った方は登録フォーム + 規約同意 + メール認証を経てログイン可能になります。
        </p>
      </div>
      <InvitesManager invites={invites ?? []} />
    </div>
  );
}
