import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "販売店調査 | 管理" };
export const dynamic = "force-dynamic";

export default async function SurveysPage() {
  const supabase = createClient();
  const { data: surveys } = await supabase
    .from("surveys")
    .select("*, shops(company_name)")
    .is("deleted_at", null)
    .order("surveyed_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">販売店調査</h1>
        <a href="/admin/surveys/new" className="btn-primary">調査レポート登録</a>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-2">調査日</th>
              <th className="text-left px-3 py-2">ショップ</th>
              <th className="text-left px-3 py-2">調査者</th>
              <th className="text-left px-3 py-2">概要</th>
              <th className="text-left px-3 py-2">PDF</th>
            </tr>
          </thead>
          <tbody>
            {(surveys ?? []).map((s) => {
              const shop = (s as { shops?: { company_name?: string } }).shops;
              return (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{s.surveyed_at}</td>
                  <td className="px-3 py-2">{shop?.company_name ?? "—"}</td>
                  <td className="px-3 py-2">{s.surveyor ?? "—"}</td>
                  <td className="px-3 py-2 truncate max-w-md">{s.content}</td>
                  <td className="px-3 py-2">
                    {s.pdf_url ? (
                      <a className="text-brand-600 hover:underline" href={s.pdf_url}>DL</a>
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
            {(!surveys || surveys.length === 0) && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  調査レポートはまだありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
