import { ShopImportForm } from "./ShopImportForm";

export const metadata = { title: "顧客取込 | 管理" };

export default function ShopImportPage() {
  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold">顧客取込 (CSV / Excel)</h1>
      <p className="text-sm text-slate-500">
        既存ショップは <code>email</code> でマッチして更新されます。新規行は Supabase Auth ユーザーも同時に作成 (招待メール送信なし)。
      </p>

      <div className="card p-5 space-y-4 text-xs text-slate-600">
        <details open className="space-y-2">
          <summary className="font-semibold text-slate-800 cursor-pointer text-sm">
            📋 標準 CSV フォーマット
          </summary>
          <div className="space-y-2 mt-2 pl-2">
            <p>1 行目をヘッダとして以下の列を期待します:</p>
            <code className="block bg-slate-50 p-2 rounded text-xs">
              company_name,contact_name,email,phone,address,delivery_address,current_rank,status
            </code>
            <p>
              <code>current_rank</code> は <code>platinum / gold / silver / bronze / standard</code> のいずれか (省略時 standard)。
              <code>status</code> は <code>pending / active / suspended</code> (省略時 pending)。
            </p>
          </div>
        </details>

        <details className="space-y-2">
          <summary className="font-semibold text-slate-800 cursor-pointer text-sm">
            📊 Google フォーム Excel フォーマット (顧客マスター / 卸_ショップ登録フォーム)
          </summary>
          <div className="space-y-2 mt-2 pl-2">
            <p>事業進捗管理表の以下のシートを自動検出します:</p>
            <ul className="list-disc list-inside ml-2 space-y-0.5">
              <li><strong>顧客マスター</strong> (推奨) — 承認済 (D列) を <code>active</code>、配信停止 (Q列) を <code>suspended</code> に反映</li>
              <li><strong>卸_ショップ登録フォーム</strong> — フォーム生回答、すべて <code>pending</code> として取り込み</li>
            </ul>
            <p className="text-slate-500">
              郵便番号は数値・ハイフン無しでも自動で <code>XXX-XXXX</code> 形式に整形されます。
              シート内に同じメールアドレスが複数ある場合は最初の 1 件のみ取込みます。
            </p>
          </div>
        </details>
      </div>

      <ShopImportForm />
    </div>
  );
}
