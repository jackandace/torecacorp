import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata = { title: "新しいパスワードを設定 | トレカ商事" };

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-lg card p-8 sm:p-12">
        <div className="mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">新しいパスワード</h1>
          <p className="text-sm text-slate-500 mt-2">
            メールリンクから来た方向け
          </p>
        </div>
        <ResetPasswordForm />
      </div>
    </main>
  );
}
