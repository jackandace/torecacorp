import Link from "next/link";
import { ShopImportForm } from "../import/ShopImportForm";

export const metadata = { title: "累計取引額 取込 | 管理" };

export default function LifetimeImportPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/admin/shops" className="text-sm text-brand-600 hover:underline">← ショップ一覧</Link>
        <h1 className="text-2xl font-bold mt-1">卸取引 累計額の取込</h1>
        <p className="text-sm text-slate-500 mt-1">
          email をキーに既存ショップの<strong>累計取引額 (lifetime_amount)</strong> を一括更新します。
          CSV / Excel いずれも可。ヘッダ行に <code className="font-mono">email</code> 列と累計額の列
          (「累計」「金額」等を含む列名) を含めてください。
        </p>
      </div>

      <div className="card p-4 text-xs text-slate-600 bg-amber-50 border border-amber-200">
        <p className="font-semibold text-amber-800 mb-1">取込の挙動</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>email が既存ショップと一致した行のみ更新します。未登録の email はスキップ(結果に表示)。</li>
          <li>累計額は上書き更新です(加算ではありません)。</li>
          <li>ランクは「月次昇格 + 累計下限」で判定します。累計下限は
            <Link href="/admin/rebate" className="text-brand-600 hover:underline mx-1">ランク設定</Link>
            で調整してください。</li>
        </ul>
      </div>

      <ShopImportForm endpoint="/api/shops/lifetime-import" />
    </div>
  );
}
