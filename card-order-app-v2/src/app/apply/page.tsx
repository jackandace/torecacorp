// 卸取引の審査申込み (公開フォーム)
//
// 旧来の Google フォームに代わる、アプリ内の審査申込み窓口。
// 申請は管理画面「ショップ審査」(/admin/shops/applications) に上がり、
// 承認すると招待リンク (/register?token=) が自動送付される。
import { ApplyForm } from "./ApplyForm";

export const metadata = { title: "卸取引のお申込み | トレカ商事" };

export default function ApplyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">トレカ商事カンパニー</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-2">卸取引 審査申込みフォーム</p>
        </div>

        <div className="card p-5 sm:p-6 mb-6 text-sm text-slate-700 space-y-2">
          <p>
            弊社の卸サービスをご利用いただくには、事前審査が必要です。
            以下のフォームに必要事項をご入力のうえ、お申込みください。
          </p>
          <ul className="list-disc list-outside ml-5 space-y-1 text-slate-600">
            <li>審査結果は通常 <strong>2〜3営業日以内</strong> にメールでご連絡します。</li>
            <li>実店舗を運営されている事業者様が対象です（<strong>EC のみの店舗様とはお取引できません</strong>）。</li>
            <li>審査通過後、ショップアカウントの登録リンクをお送りします。</li>
          </ul>
        </div>

        <ApplyForm />
      </div>
    </main>
  );
}
