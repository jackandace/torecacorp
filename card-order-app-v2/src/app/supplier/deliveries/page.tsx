import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupplierContext } from "@/lib/supplier";
import { DeliverList, type DeliverRow } from "./DeliverList";

export const dynamic = "force-dynamic";
export const metadata = { title: "納品完了 | 問屋ポータル" };

export default async function DeliveriesPage() {
  const supabase = createClient();
  const ctx = await getSupplierContext(supabase);
  if (!ctx) return null;

  const admin = createAdminClient();
  const { data: prods } = await admin.from("products").select("id").eq("supplier_id", ctx.supplierId).is("deleted_at", null);
  const prodIds = (prods ?? []).map((p) => p.id);

  const { data: orders } = prodIds.length
    ? await admin
        .from("orders")
        .select("id, shipping_status, tracking_number, carrier, confirmed_qty, order_unit, shipped_at, shops(company_name), products(title)")
        .in("product_id", prodIds)
        .in("shipping_status", ["出荷済", "配送中"])
        .is("deleted_at", null)
        .order("shipped_at", { ascending: true })
    : { data: [] };

  const rows: DeliverRow[] = (orders ?? []).map((o) => {
    const shop = o.shops as unknown as { company_name?: string } | null;
    const product = o.products as unknown as { title?: string } | null;
    return {
      id: o.id,
      title: product?.title ?? "—",
      shopName: shop?.company_name ?? "—",
      qty: o.confirmed_qty ?? 0,
      unit: o.order_unit,
      carrier: o.carrier ?? "",
      trackingNumber: o.tracking_number ?? "",
    };
  });

  return (
    <div className="space-y-4">
      <div>
        <Link href="/supplier" className="text-sm text-brand-600 hover:underline">← ダッシュボード</Link>
        <h1 className="text-2xl font-bold mt-1">納品完了</h1>
        <p className="text-sm text-slate-500 mt-1">
          お届けが完了した発注を「納品完了」にすると、その日が収益認識日になり、ショップへ受領のご確認メールが自動送信されます。
        </p>
      </div>
      <DeliverList rows={rows} />
    </div>
  );
}
