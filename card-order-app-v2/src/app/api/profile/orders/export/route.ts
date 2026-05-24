// ショップ自身の発注履歴 CSV エクスポート
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: shop } = await supabase
    .from("shops")
    .select("id, company_name")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!shop) return NextResponse.json({ error: "shop not found" }, { status: 404 });

  const { data: orders } = await supabase
    .from("orders")
    .select("*, products(title, model_number)")
    .eq("shop_id", shop.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const rows = (orders ?? []).map((o) => {
    const p = (o as { products?: { title?: string | null; model_number?: string | null } | null }).products;
    return {
      created_at: o.created_at,
      product_title: p?.title ?? "",
      model_number: p?.model_number ?? "",
      order_unit: o.order_unit,
      requested_qty: o.requested_qty,
      requested_qty_box: o.requested_qty_box ?? "",
      provisional_qty: o.provisional_qty ?? "",
      confirmed_qty: o.confirmed_qty ?? "",
      unit_price: o.unit_price ?? "",
      listed_rate: o.listed_rate,
      rebate_rate: o.rebate_rate,
      subtotal: o.subtotal ?? "",
      rebate_amount: o.rebate_amount ?? "",
      total_price: o.total_price ?? "",
      status: o.status,
      shipping_status: o.shipping_status,
      tracking_number: o.tracking_number ?? "",
      confirmed_at: o.confirmed_at ?? "",
      shipped_at: o.shipped_at ?? "",
    };
  });

  const filename = `${shop.company_name.replace(/[^\w぀-ヿ一-鿿]/g, "_")}_orders_${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
