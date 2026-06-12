import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "ログイン | トレカ商事" };

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-lg">
        <div className="card p-8 sm:p-12">
          <div className="mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">トレカ商事カンパニー</h1>
            <p className="text-sm sm:text-base text-slate-500 mt-2">受発注・請求管理システム</p>
          </div>
          <Suspense fallback={<div className="text-sm text-slate-500">読込中…</div>}>
            <LoginForm />
          </Suspense>
        </div>

        {/* 初めての方 / 既存ショップ向け導線 */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/register/existing"
            className="card p-4 text-center hover:shadow-md transition group"
          >
            <div className="text-sm font-semibold text-slate-800 group-hover:text-brand-700">
              すでにショップ登録済みの方
            </div>
            <div className="text-xs text-slate-500 mt-1">
              メールアドレスからパスワード設定へ
            </div>
          </Link>
          <div className="card p-4 text-center bg-slate-50">
            <div className="text-sm font-semibold text-slate-800">新規お取引をご希望の方</div>
            <div className="text-xs text-slate-500 mt-1 leading-relaxed">
              まずはメールでお問い合わせください。<br />
              審査後に登録のご案内をお送りします。
            </div>
          </div>
        </div>

        <p className="mt-4 text-center">
          <Link href="/terms" className="text-xs text-slate-500 hover:text-brand-600 hover:underline">
            利用注意事項・免責事項
          </Link>
        </p>
      </div>
    </main>
  );
}
