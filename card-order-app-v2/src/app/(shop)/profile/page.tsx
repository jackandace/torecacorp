import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RANK_LABEL } from "@/constants/ranks";
import { formatJST } from "@/lib/dates";
import { ProfileForm } from "./ProfileForm";
import { PasswordChangeForm } from "./PasswordChangeForm";
import { OathUploadShop } from "./OathUploadShop";

export const metadata = { title: "プロフィール | トレカ商事" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: shop } = await supabase
    .from("shops")
    .select("*")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!shop) {
    return (
      <div className="card p-6">
        <h1 className="text-xl font-bold mb-2">プロフィール</h1>
        <p className="text-sm text-slate-600">
          ショップ情報が見つかりません。管理者にお問い合わせください。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <Link href="/mypage" className="text-sm text-brand-600 hover:underline">← マイページ</Link>
        <h1 className="text-2xl font-bold mt-1">プロフィール</h1>
        <p className="text-sm text-slate-500 mt-1">
          会社名・連絡先・住所・パスワード・宣誓書の管理ができます。
        </p>
      </div>

      {/* 読み取り専用情報 */}
      <section className="card p-5 space-y-2 text-sm">
        <h2 className="font-semibold mb-3">アカウント情報 (変更不可)</h2>
        <div className="grid grid-cols-3 gap-y-2">
          <div className="text-slate-500">メールアドレス</div>
          <div className="col-span-2 break-all">{shop.email ?? "—"}</div>
          <div className="text-slate-500">ランク</div>
          <div className="col-span-2">{RANK_LABEL[shop.current_rank]}</div>
          <div className="text-slate-500">アカウント状態</div>
          <div className="col-span-2">{shop.status}</div>
          <div className="text-slate-500">登録日</div>
          <div className="col-span-2 text-xs">{formatJST(shop.created_at)}</div>
        </div>
        <p className="text-xs text-slate-500 pt-2">
          メールアドレス・ランク・状態の変更は管理者にご連絡ください。
        </p>
      </section>

      {/* 編集可能情報 */}
      <ProfileForm shop={shop} />

      {/* パスワード変更 */}
      <PasswordChangeForm />

      {/* 宣誓書 */}
      <OathUploadShop
        shopId={shop.id}
        oathSignedAt={shop.oath_signed_at}
        oathExpiresAt={shop.oath_expires_at}
      />
    </div>
  );
}
