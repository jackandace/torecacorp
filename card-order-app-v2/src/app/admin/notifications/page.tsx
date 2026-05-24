import { createClient } from "@/lib/supabase/server";
import { formatJST } from "@/lib/dates";

export const metadata = { title: "通知センター | 管理" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = createClient();
  const [{ data: templates }, { data: logs }] = await Promise.all([
    supabase.from("notification_templates").select("*").order("code"),
    supabase
      .from("notifications")
      .select("*, shops(company_name)")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">通知センター</h1>
        <div className="flex gap-2">
          <a href="/admin/notifications/templates" className="btn-secondary">テンプレート編集</a>
          <a href="/admin/notifications/send" className="btn-primary">手動送信</a>
        </div>
      </div>

      <section>
        <h2 className="font-semibold mb-3">テンプレート</h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">コード</th>
                <th className="text-left px-3 py-2">名称</th>
                <th className="text-left px-3 py-2">件名</th>
                <th className="text-left px-3 py-2">最終更新</th>
              </tr>
            </thead>
            <tbody>
              {(templates ?? []).map((t) => (
                <tr key={t.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-mono text-xs">{t.code}</td>
                  <td className="px-3 py-2">{t.name}</td>
                  <td className="px-3 py-2 text-slate-600">{t.subject}</td>
                  <td className="px-3 py-2 text-xs">{formatJST(t.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-3">送信ログ (直近 50 件)</h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">日時</th>
                <th className="text-left px-3 py-2">ショップ</th>
                <th className="text-left px-3 py-2">件名</th>
                <th className="text-left px-3 py-2">チャネル</th>
                <th className="text-left px-3 py-2">状態</th>
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).map((n) => {
                const shop = (n as { shops?: { company_name?: string } }).shops;
                return (
                  <tr key={n.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-xs">{formatJST(n.created_at)}</td>
                    <td className="px-3 py-2">{shop?.company_name ?? "—"}</td>
                    <td className="px-3 py-2">{n.subject}</td>
                    <td className="px-3 py-2">{n.channel}</td>
                    <td className="px-3 py-2">{n.status}</td>
                  </tr>
                );
              })}
              {(!logs || logs.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                    送信ログはまだありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-slate-500">
        TODO: テンプレート編集 UI / 送信プレビュー / 変数のドキュメント化
      </p>
    </div>
  );
}
