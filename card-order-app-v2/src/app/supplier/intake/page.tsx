// 問屋ポータル: 入荷登録 (フォーム1件 / Excel一括) — フェーズ4
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentSupplier } from "@/lib/supplier";
import { IntakeClient } from "./IntakeClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "入荷登録 | 問屋ポータル" };

export default async function SupplierIntakePage() {
  const supabase = createClient();
  const ctx = await getCurrentSupplier(supabase);
  if (!ctx) return null;

  // 自問屋の登録商品一覧 (承認待ち/公開済みの状況確認用)
  const admin = createAdminClient();
  const { data: products } = await admin
    .from("products")
    .select("id, series, title, model_number, jan_code, price, ct_to_box, min_order_box, planned_qty, order_deadline, release_info, flow_type, intake_note, image_url, is_approved, is_visible, created_at")
    .eq("supplier_id", ctx.supplier.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <IntakeClient
      isTest={ctx.supplier.is_test}
      products={(products ?? []).map((p) => ({
        id: p.id,
        series: p.series,
        title: p.title,
        modelNumber: p.model_number,
        janCode: p.jan_code,
        price: p.price,
        ctToBox: p.ct_to_box,
        minOrderBox: p.min_order_box,
        plannedQty: p.planned_qty,
        deadline: p.order_deadline,
        releaseInfo: p.release_info,
        flowType: p.flow_type,
        note: p.intake_note,
        imageUrl: p.image_url,
        approved: p.is_approved,
        visible: p.is_visible,
      }))}
    />
  );
}
