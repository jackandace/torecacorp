import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupplierContext } from "@/lib/supplier";
import { ShipmentGrid, type ShipRow } from "./ShipmentGrid";

export const dynamic = "force-dynamic";
export const metadata = { title: "出荷更新 | 問屋ポータル" };

export default async function ShipmentsPage() {
  const supabase = createClient();
  const ctx = await getSupplierContext(supabase);
  if (!ctx) return null;

  // 自社商品 → その確定発注を取得 (サービスロール + supplier_id で明示スコープ)
  const admin = createAdminClient();
  const { data: products } = await admin
    .from("products")
    .select("id")
    .eq("supplier_id", ctx.supplierId)
    .is("deleted_at", null);
  const productIds = (products ?? []).map((p) => p.id);

  const { data: orders } = productIds.length
    ? await admin
        .from("orders")
        .select(
          "id, confirmed_qty, requested_qty_box, order_unit, shipping_status, carrier, tracking_number, updated_at, shops(company_name, delivery_address, address), products(title)",
        )
        .in("product_id", productIds)
        .eq("status", "確定")
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
    : { data: [] };

  const rows: ShipRow[] = (orders ?? []).map((o) => {
    const shop = o.shops as unknown as { company_name?: string; delivery_address?: string | null; address?: string | null } | null;
    const product = o.products as unknown as { title?: string } | null;
    return {
      id: o.id,
      title: product?.title ?? "(商品不明)",
      shopName: shop?.company_name ?? "—",
      deliveryAddress: shop?.delivery_address ?? shop?.address ?? "—",
      qty: o.confirmed_qty ?? o.requested_qty_box ?? 0,
      unit: o.order_unit,
      shippingStatus: o.shipping_status,
      carrier: o.carrier ?? "",
      trackingNumber: o.tracking_number ?? "",
      updatedAt: o.updated_at,
    };
  });

  return (
    <div className="space-y-4">
      <div>
        <Link href="/supplier" className="text-sm text-brand-600 hover:underline">← ダッシュボード</Link>
        <h1 className="text-2xl font-bold mt-1">出荷更新</h1>
        <p className="text-sm text-slate-500 mt-1">
          確定した発注に、配送会社と追跡番号を入力して出荷を登録します。登録するとショップへ自動で出荷通知が届きます。
        </p>
      </div>
      <ShipmentGrid rows={rows} />
    </div>
  );
}
