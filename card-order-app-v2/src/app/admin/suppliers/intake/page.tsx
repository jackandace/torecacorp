// 問屋登録の承認 (admin) — フェーズ4
// 問屋が入荷登録した商品 (承認待ち) の一覧。テスト問屋分はバッジ表示され承認不可。
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatJST } from "@/lib/dates";
import { ApproveButtons } from "./ApproveButtons";

export const dynamic = "force-dynamic";
export const metadata = { title: "問屋登録の承認 | 管理" };

export default async function SupplierIntakeAdminPage() {
  const supabase = createClient();
  const { data: pending } = await supabase
    .from("products")
    .select("id, series, title, model_number, jan_code, price, ct_to_box, min_order_box, planned_qty, flow_type, order_deadline, image_url, intake_note, actual_rate, created_at, suppliers(name, is_test)")
    .eq("is_approved", false)
    .not("supplier_id", "is", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/suppliers" className="text-sm text-brand-600 hover:underline">← 問屋管理</Link>
        <h1 className="text-2xl font-bold mt-1">問屋登録の承認</h1>
        <p className="text-sm text-slate-500 mt-1">
          問屋が入荷登録した商品です。<b>掛け率を商品編集で設定してから承認</b>すると、ショップに公開されます
          (掛け率0のままでは承認できません)。テスト問屋の登録は検証用のため承認できません。
        </p>
      </div>

      <div className="space-y-3">
        {(pending ?? []).map((p) => {
          const s = p.suppliers as unknown as { name?: string; is_test?: boolean } | null;
          return (
            <div key={p.id} className="card p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="min-w-0 text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{p.series ? `[${p.series}] ` : ""}{p.title}</span>
                    {p.model_number && <span className="text-xs text-slate-500">({p.model_number})</span>}
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">{s?.name ?? "問屋不明"}</span>
                    {s?.is_test && <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-bold">🧪 TEST</span>}
                    {p.image_url && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">🖼 画像あり</span>}
                  </div>
                  <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                    <span>定価 {p.price != null ? `¥${p.price.toLocaleString()}` : "—"}</span>
                    <span>1CT={p.ct_to_box}BOX</span>
                    <span>最低{p.min_order_box}BOX</span>
                    <span>数量 {p.planned_qty ?? "—"}BOX</span>
                    <span>{p.flow_type === "cut" ? "カット割" : "配分品"}</span>
                    <span>締切 {p.order_deadline ?? "—"}</span>
                    <span className={p.actual_rate > 0 ? "text-emerald-700" : "text-rose-600 font-semibold"}>
                      掛け率 {p.actual_rate > 0 ? `${Math.round(p.actual_rate * 100)}%` : "未設定"}
                    </span>
                  </div>
                  {p.intake_note && (
                    <p className="text-xs mt-1 text-amber-800 bg-amber-50 rounded px-2 py-1">📝 問屋メモ: {p.intake_note}</p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1">登録: {formatJST(p.created_at)}</p>
                </div>
                <ApproveButtons productId={p.id} isTest={!!s?.is_test} />
              </div>
            </div>
          );
        })}
        {(!pending || pending.length === 0) && (
          <div className="card p-8 text-center text-slate-500 text-sm">承認待ちの登録はありません</div>
        )}
      </div>
    </div>
  );
}
