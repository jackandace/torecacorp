// 新規会員登録 (招待トークン制)
//
// 審査 (メールでの簡易ヒアリング) を通過した事業者にのみ、
// admin がトークン付き URL を発行して案内する。
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { RegisterForm } from "./RegisterForm";

export const metadata = { title: "新規会員登録 | トレカ商事" };
export const dynamic = "force-dynamic";

interface SearchParams { token?: string }

export default async function RegisterPage({ searchParams }: { searchParams: SearchParams }) {
  const token = searchParams.token?.trim();

  // トークン検証 (service role で照合。anon には invites テーブルを公開しない)
  let invite: { email: string | null; company_name: string | null } | null = null;
  let application: {
    contact_name: string;
    phone: string;
    address: string;
    delivery_address: string;
    business_type: string;
    opened_at: string | null;
  } | null = null;
  let error: string | null = null;

  if (!token) {
    error = "招待リンクが正しくありません。お送りしたメールに記載の URL からアクセスしてください。";
  } else {
    const adminSb = createAdminClient();
    const { data } = await adminSb
      .from("registration_invites")
      .select("id, email, company_name, expires_at, used_at")
      .eq("token", token)
      .maybeSingle();

    if (!data) {
      error = "招待リンクが無効です。お手数ですが担当者までご連絡ください。";
    } else if (data.used_at) {
      error = "この招待リンクは既に使用されています。ログインするか、担当者までご連絡ください。";
    } else if (new Date(data.expires_at) < new Date()) {
      error = "招待リンクの有効期限が切れています。担当者まで再発行をご依頼ください。";
    } else {
      invite = { email: data.email, company_name: data.company_name };
      // 審査申込み (/apply) 経由の招待なら、申請内容を登録フォームにプレフィルして二重入力を防ぐ
      const { data: app } = await adminSb
        .from("shop_applications")
        .select("contact_name, phone, address, delivery_address, business_type, opened_at")
        .eq("invite_id", data.id)
        .maybeSingle();
      application = app ?? null;
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">トレカ商事カンパニー</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-2">卸取引 新規会員登録</p>
        </div>

        {error ? (
          <div className="card p-8 text-center space-y-4">
            <p className="text-rose-700">{error}</p>
            <Link href="/login" className="text-sm text-brand-600 hover:underline">
              ログインページへ
            </Link>
          </div>
        ) : (
          <RegisterForm
            token={token!}
            prefillEmail={invite?.email ?? ""}
            prefillCompany={invite?.company_name ?? ""}
            prefillContact={application?.contact_name ?? ""}
            prefillPhone={application?.phone ?? ""}
            prefillAddress={application?.address ?? ""}
            prefillDelivery={
              application && application.delivery_address !== application.address
                ? application.delivery_address
                : ""
            }
            prefillBusinessType={application?.business_type ?? ""}
            prefillOpenedAt={application?.opened_at ?? ""}
          />
        )}
      </div>
    </main>
  );
}
