import { createClient } from "@/lib/supabase/server";
import { RANK_LABEL } from "@/constants/ranks";
import { formatJST } from "@/lib/dates";

export const metadata = { title: "顧客管理 | 管理" };
export const dynamic = "force-dynamic";

export default async function ShopsAdminPage() {
  const supabase = createClient();
  const { data: shops } = await supabase
    .from("shops")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">顧客管理</h1>
        <div className="flex gap-2 flex-wrap">
          <a href="/admin/shops/invites" className="btn-primary">招待リンク発行</a>
          <a href="/admin/shops/import" className="btn-secondary">CSV取込</a>
          <a href="/admin/shops/lifetime-import" className="btn-secondary">累計額取込</a>
          <a href="/api/shops/export" className="btn-secondary">CSV出力</a>
          <a href="/admin/shops/new" className="btn-secondary">手動登録</a>
        </div>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-2">会社名</th>
              <th className="text-left px-3 py-2">担当</th>
              <th className="text-left px-3 py-2">メール</th>
              <th className="text-left px-3 py-2">ランク</th>
              <th className="text-left px-3 py-2">ステータス</th>
              <th className="text-left px-3 py-2">宣誓書</th>
              <th className="text-left px-3 py-2">登録日</th>
              <th className="text-left px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {(shops ?? []).map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium">{s.company_name}</td>
                <td className="px-3 py-2">{s.contact_name}</td>
                <td className="px-3 py-2 text-slate-500">{s.email}</td>
                <td className="px-3 py-2">{RANK_LABEL[s.current_rank]}</td>
                <td className="px-3 py-2">{s.status}</td>
                <td className="px-3 py-2 text-xs">
                  {s.oath_expires_at ? `失効: ${s.oath_expires_at}` : "未提出"}
                </td>
                <td className="px-3 py-2 text-xs">{formatJST(s.created_at)}</td>
                <td className="px-3 py-2">
                  <a href={`/admin/shops/${s.id}`} className="text-brand-600 hover:underline">詳細</a>
                </td>
              </tr>
            ))}
            {(!shops || shops.length === 0) && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                  ショップはまだ登録されていません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        TODO: 詳細ページ (ランク変動履歴・宣誓書PDF アップ/署名付きURL ダウンロード・調査履歴)
      </p>
    </div>
  );
}
