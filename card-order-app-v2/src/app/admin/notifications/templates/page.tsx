import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatJST } from "@/lib/dates";

export const metadata = { title: "テンプレート | 通知" };
export const dynamic = "force-dynamic";

export default async function TemplatesIndex() {
  const supabase = createClient();
  const { data: templates } = await supabase
    .from("notification_templates")
    .select("*")
    .order("code");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/notifications" className="text-sm text-brand-600 hover:underline">
            ← 通知センター
          </Link>
          <h1 className="text-2xl font-bold mt-1">テンプレート一覧</h1>
        </div>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-2">コード</th>
              <th className="text-left px-3 py-2">名称</th>
              <th className="text-left px-3 py-2">件名</th>
              <th className="text-left px-3 py-2">更新</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(templates ?? []).map((t) => (
              <tr key={t.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono text-xs">{t.code}</td>
                <td className="px-3 py-2">{t.name}</td>
                <td className="px-3 py-2 text-slate-600">{t.subject}</td>
                <td className="px-3 py-2 text-xs">{formatJST(t.updated_at)}</td>
                <td className="px-3 py-2">
                  <Link href={`/admin/notifications/templates/${t.code}`} className="text-brand-600 hover:underline text-xs">
                    編集
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
