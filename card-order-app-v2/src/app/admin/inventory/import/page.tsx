import { ImportForm } from "./ImportForm";

export const metadata = { title: "Excel取込 | 在庫管理" };

export default function ImportPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">商品マスター Excel 取込</h1>
      <p className="text-sm text-slate-500 mb-3">
        橋本さん「入荷案内リスト」フォーマット対応。1 行目のヘッダ行は自動でスキップ。
      </p>
      <div className="text-xs text-slate-600 mb-6 bg-slate-50 p-3 rounded space-y-1">
        <div><strong>列マッピング:</strong></div>
        <div>B = 商品タイトル / D = 商品名(フル) / E = 型番 / F = 発注可能数(BOX)</div>
        <div>G = 発注締切日 / H = 掛け率 / I = 販売価格 / J = 配分・カット / K = 備考</div>
        <div className="text-slate-500">※ A = 案内日付ラベル, C = 発売日は読み飛ばし</div>
      </div>
      <ImportForm />
    </div>
  );
}
