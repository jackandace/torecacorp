// 既存登録済みショップ向け: メアド入力 → パスワード設定リンク送付
import Link from "next/link";
import { ExistingShopForm } from "./ExistingShopForm";

export const metadata = { title: "登録済みの方 | トレカ商事" };

export default function ExistingShopPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-lg card p-8 sm:p-12">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">すでにショップ登録済みの方</h1>
          <p className="text-sm text-slate-500 mt-3 leading-relaxed">
            これまでメール・フォームでお取引いただいていたショップ様は、<br className="hidden sm:inline" />
            ご登録のメールアドレスを入力してください。<br />
            パスワード設定用のリンクをお送りします。
          </p>
        </div>
        <ExistingShopForm />
        <div className="mt-8 pt-6 border-t border-slate-200 text-center space-y-2 text-sm">
          <Link href="/login" className="block text-brand-600 hover:underline">
            すでにパスワード設定済みの方はログインへ
          </Link>
        </div>
      </div>
    </main>
  );
}
