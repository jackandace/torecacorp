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
  let error: string | null = null;

  if (!token) {
    error = "招待リンクが正しくありません。お送りしたメールに記載の URL からアクセスしてください。";
  } else {
    const adminSb = createAdminClient();
    const { data } = await adminSb
      .from("registration_invites")
      .select("email, company_name, expires_at, used_at")
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
          />
        )}
      </div>
    </main>
  );
}
