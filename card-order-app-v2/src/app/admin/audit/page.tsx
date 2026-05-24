import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatJST } from "@/lib/dates";

export const metadata = { title: "監査ログ | 管理" };
export const dynamic = "force-dynamic";

interface SearchParams {
  action?: string;
  table?: string;
  from?: string;
  to?: string;
  page?: string;
}

const PAGE_SIZE = 50;

export default async function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  let q = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (searchParams.action) q = q.eq("action", searchParams.action);
  if (searchParams.table) q = q.eq("target_table", searchParams.table);
  if (searchParams.from) q = q.gte("created_at", `${searchParams.from}T00:00:00`);
  if (searchParams.to) q = q.lte("created_at", `${searchParams.to}T23:59:59`);

  const { data: logs, count } = await q.range(offset, offset + PAGE_SIZE - 1);

  // フィルタ候補
  const { data: distinctActions } = await supabase
    .from("audit_logs")
    .select("action")
    .order("action")
    .limit(200);
  const actions = Array.from(new Set((distinctActions ?? []).map((r) => r.action))).sort();
  const tables = ["shops", "products", "orders", "invoices", "rank_settings", "notification_templates", "notifications", "surveys"];

  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;
  const buildHref = (overrides: Partial<SearchParams>) => {
    const p = new URLSearchParams();
    const merged = { ...searchParams, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, String(v));
    }
    return `/admin/audit?${p.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">監査ログ</h1>
        <p className="text-xs text-slate-500 mt-1">全 {count ?? 0} 件 / ページ {page} / {totalPages}</p>
      </div>

      <form className="card p-4 grid grid-cols-1 md:grid-cols-5 gap-3 text-xs" action="/admin/audit" method="get">
        <div>
          <label className="block text-slate-600 mb-1">アクション</label>
          <select className="input" name="action" defaultValue={searchParams.action ?? ""}>
            <option value="">— すべて —</option>
            {actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-slate-600 mb-1">対象テーブル</label>
          <select className="input" name="table" defaultValue={searchParams.table ?? ""}>
            <option value="">— すべて —</option>
            {tables.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-slate-600 mb-1">期間 from</label>
          <input type="date" className="input" name="from" defaultValue={searchParams.from ?? ""} />
        </div>
        <div>
          <label className="block text-slate-600 mb-1">期間 to</label>
          <input type="date" className="input" name="to" defaultValue={searchParams.to ?? ""} />
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className="btn-primary text-xs">適用</button>
          <Link href="/admin/audit" className="btn-secondary text-xs">クリア</Link>
        </div>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-2">日時</th>
              <th className="text-left px-3 py-2">アクション</th>
              <th className="text-left px-3 py-2">対象</th>
              <th className="text-left px-3 py-2">対象 ID</th>
              <th className="text-left px-3 py-2">変更</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((log) => (
              <tr key={log.id} className="border-t border-slate-100 align-top">
                <td className="px-3 py-2 text-xs whitespace-nowrap">{formatJST(log.created_at)}</td>
                <td className="px-3 py-2 font-mono text-xs">{log.action}</td>
                <td className="px-3 py-2">{log.target_table}</td>
                <td className="px-3 py-2 text-xs text-slate-500 font-mono">
                  {log.target_id ? log.target_id.slice(0, 8) : "—"}
                </td>
                <td className="px-3 py-2">
                  {(log.before_data || log.after_data) && (
                    <details>
                      <summary className="text-xs text-brand-600 cursor-pointer">展開</summary>
                      <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="text-slate-500">before</div>
                          <pre className="bg-slate-50 p-2 rounded overflow-x-auto">
                            {log.before_data ? JSON.stringify(log.before_data, null, 2) : "—"}
                          </pre>
                        </div>
                        <div>
                          <div className="text-slate-500">after</div>
                          <pre className="bg-slate-50 p-2 rounded overflow-x-auto">
                            {log.after_data ? JSON.stringify(log.after_data, null, 2) : "—"}
                          </pre>
                        </div>
                      </div>
                    </details>
                  )}
                </td>
              </tr>
            ))}
            {(!logs || logs.length === 0) && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">該当する監査ログはありません</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-center text-sm">
          {page > 1 && <Link href={buildHref({ page: String(page - 1) })} className="btn-secondary text-xs">← 前</Link>}
          <span className="text-slate-500">ページ {page} / {totalPages}</span>
          {page < totalPages && <Link href={buildHref({ page: String(page + 1) })} className="btn-secondary text-xs">次 →</Link>}
        </div>
      )}
    </div>
  );
}
