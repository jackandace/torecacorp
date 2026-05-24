import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata = { title: "パスワードを忘れた | トレカ商事" };

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-lg card p-8 sm:p-12">
        <div className="mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">パスワード再設定</h1>
          <p className="text-sm text-slate-500 mt-2">
            登録メールアドレスに再設定リンクをお送りします
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
