// システム外受注の手動登録
//
// 設計方針:
//   メール・電話などシステム外で受けた発注 (特に未出荷分) を orders に
//   管理者が代理で登録する。これによりショップのマイページに発注履歴・
//   出荷状況が表示され、以降の出荷管理・請求書発行も通常フローに乗る。
//
//   - 商品は products マスタから選択 (未登録商品は先に在庫管理で登録)
//   - ステータスを「確定」で登録すると在庫 (ordered_qty) も自動補正
//   - 受注日を過去日付で指定可能 (月次集計・ランク計算に正しく反映)
//   - consent_agreed_at には受注日を記録し、admin_note に代理登録の旨を自動追記
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ManualOrderForm } from "./ManualOrderForm";

export const metadata = { title: "発注の手動登録 | 管理" };
export const dynamic = "force-dynamic";

export default async function ManualOrderPage() {
  const supabase = createClient();

  const [{ data: shops }, { data: products }] = await Promise.all([
    supabase
      .from("shops")
      .select("id, company_name, current_rank, rate_override")
      .in("status", ["active", "pending"])
      .is("deleted_at", null)
      .order("company_name"),
    supabase
      .from("products")
      .select("id, series, title, model_number, price, actual_rate, rate_markup, ct_to_box, planned_qty, ordered_qty, flow_type")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <Link href="/admin/orders" className="text-sm text-brand-600 hover:underline">← 発注一覧</Link>
        <h1 className="text-2xl font-bold mt-1">発注の手動登録</h1>
        <p className="text-sm text-slate-500 mt-1">
          メール・電話などシステム外で受けた発注を代理登録します。
          登録するとショップのマイページに発注履歴・出荷状況が表示され、出荷管理・請求書発行も通常通り行えます。
        </p>
      </div>
      <ManualOrderForm shops={shops ?? []} products={products ?? []} />
    </div>
  );
}
