import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RANK_LABEL } from "@/constants/ranks";
import { formatJST } from "@/lib/dates";
import { ProfileForm } from "./ProfileForm";
import { DeliveryChangeRequest } from "./DeliveryChangeRequest";
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

  // 進行中の変更リクエスト
  const { data: pendingRequests } = await supabase
    .from("shop_change_requests")
    .select("*")
    .eq("shop_id", shop.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  // 直近の処理済みリクエスト (履歴表示用)
  const { data: recentRequests } = await supabase
    .from("shop_change_requests")
    .select("*")
    .eq("shop_id", shop.id)
    .neq("status", "pending")
    .order("reviewed_at", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <Link href="/mypage" className="text-sm text-brand-600 hover:underline">← マイページ</Link>
        <h1 className="text-2xl font-bold mt-1">プロフィール</h1>
        <p className="text-sm text-slate-500 mt-1">
          担当者・連絡先は直接変更できます。会社名・登録住所の変更は管理者まで、配送先の変更は申請制です。
        </p>
      </div>

      {/* アカウント情報 (変更不可) */}
      <section className="card p-5 space-y-2 text-sm">
        <h2 className="font-semibold mb-3">アカウント情報 (変更不可)</h2>
        <div className="grid grid-cols-3 gap-y-2">
          <div className="text-slate-500">会社名・屋号</div>
          <div className="col-span-2 font-medium">{shop.company_name}</div>
          <div className="text-slate-500">登録住所</div>
          <div className="col-span-2">{shop.address ?? "—"}</div>
          <div className="text-slate-500">メールアドレス</div>
          <div className="col-span-2 break-all">{shop.email ?? "—"}</div>
          <div className="text-slate-500">ランク</div>
          <div className="col-span-2">{RANK_LABEL[shop.current_rank]}</div>
          <div className="text-slate-500">アカウント状態</div>
          <div className="col-span-2">{shop.status}</div>
          <div className="text-slate-500">登録日</div>
          <div className="col-span-2 text-xs">{formatJST(shop.created_at)}</div>
        </div>
        <p className="text-xs text-slate-500 pt-2 border-t border-slate-100 mt-3">
          ※ 会社名・屋号、登録住所、メールアドレスの変更が必要な場合は、
          なりすまし防止のため<strong>お問い合わせフォームから本人確認のうえ</strong>管理者が対応します。
        </p>
      </section>

      {/* 直接変更可能な項目 */}
      <ProfileForm shop={shop} />

      {/* 配送先変更 (承認制) */}
      <DeliveryChangeRequest
        shopId={shop.id}
        currentAddress={shop.delivery_address}
        pendingRequests={pendingRequests ?? []}
        recentRequests={recentRequests ?? []}
      />

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
