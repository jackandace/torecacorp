import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RANK_LABEL } from "@/constants/ranks";
import { formatJST } from "@/lib/dates";

export const metadata = { title: "顧客管理 | 管理" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

interface SearchParams { page?: string; q?: string }

export default async function ShopsAdminPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const q = (searchParams.q ?? "").trim();
  const offset = (page - 1) * PAGE_SIZE;

  // 必要な列だけを取得 + 件数 + ページング (顧客数が増えても軽い)
  let query = supabase
    .from("shops")
    .select("id, company_name, contact_name, email, current_rank, status, oath_expires_at, created_at", { count: "exact" })
    .is("deleted_at", null);

  if (q) {
    const esc = q.replace(/[%,]/g, " ");
    query = query.or(`company_name.ilike.%${esc}%,email.ilike.%${esc}%,contact_name.ilike.%${esc}%`);
  }

  const { data: shops, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qParam = q ? `&q=${encodeURIComponent(q)}` : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">顧客管理 ({total})</h1>
        <div className="flex gap-2 flex-wrap">
          <a href="/admin/shops/invites" className="btn-primary">招待リンク発行</a>
          <a href="/admin/shops/import" className="btn-secondary">CSV取込</a>
          <a href="/admin/shops/lifetime-import" className="btn-secondary">累計額取込</a>
          <a href="/api/shops/export" className="btn-secondary">CSV出力</a>
          <a href="/admin/shops/new" className="btn-secondary">手動登録</a>
        </div>
      </div>

      {/* 検索 (会社名・メール・担当) */}
      <form method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="会社名・メール・担当で検索"
          className="input max-w-sm"
        />
        <button className="btn-secondary" type="submit">検索</button>
        {q && <Link href="/admin/shops" className="btn-secondary">クリア</Link>}
      </form>

      {/* モバイル: カード表示 */}
      <div className="md:hidden space-y-2">
        {(shops ?? []).map((s) => (
          <a key={s.id} href={`/admin/shops/${s.id}`} className="card p-3 block">
            <div className="flex justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{s.company_name}</div>
                <div className="text-xs text-slate-500 truncate">{s.contact_name} ・ {s.email}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{s.oath_expires_at ? `宣誓書 失効: ${s.oath_expires_at}` : "宣誓書 未提出"}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs">{RANK_LABEL[s.current_rank]}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{s.status}</div>
              </div>
            </div>
          </a>
        ))}
        {(!shops || shops.length === 0) && (
          <div className="card p-6 text-center text-slate-500 text-sm">{q ? "該当するショップがありません" : "ショップはまだ登録されていません"}</div>
        )}
      </div>

      {/* PC: テーブル表示 */}
      <div className="card overflow-x-auto hidden md:block">
        <table className="w-full text-sm min-w-[720px]">
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
                  {q ? "該当するショップがありません" : "ショップはまだ登録されていません"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 text-sm">
          {page > 1 && (
            <Link href={`/admin/shops?page=${page - 1}${qParam}`} className="btn-secondary text-xs">← 前</Link>
          )}
          <span className="text-slate-500">{page} / {totalPages}</span>
          {page < totalPages && (
            <Link href={`/admin/shops?page=${page + 1}${qParam}`} className="btn-secondary text-xs">次 →</Link>
          )}
        </div>
      )}
    </div>
  );
}
