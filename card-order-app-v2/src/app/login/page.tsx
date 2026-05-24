import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "ログイン | トレカ商事" };

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-lg card p-8 sm:p-12">
        <div className="mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">トレカ商事カンパニー</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-2">受発注・請求管理システム</p>
        </div>
        <Suspense fallback={<div className="text-sm text-slate-500">読込中…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
