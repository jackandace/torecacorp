// 請求対象になる発注 (確定 + 未請求) を取得する API
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const shopId = request.nextUrl.searchParams.get("shop_id");
  if (!shopId) return NextResponse.json({ error: "shop_id required" }, { status: 400 });

  const { data: ordersRaw } = await supabase
    .from("orders")
    .select("id, confirmed_qty, unit_price, listed_rate, rebate_rate, products(title, model_number, flow_type)")
    .eq("shop_id", shopId)
    .eq("status", "確定")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // カット品は保証金(deposit)→最終精算(settle)フローで処理するため通常請求から除外
  const orders = (ordersRaw ?? []).filter((o) => {
    const p = o.products as { flow_type?: string } | null;
    return p?.flow_type !== "cut";
  });

  const orderIds = (orders ?? []).map((o) => o.id);

  // 既に請求書に紐付いている orderId
  const { data: invoicedItems } = await supabase
    .from("invoice_items")
    .select("order_id")
    .in("order_id", orderIds.length > 0 ? orderIds : ["00000000-0000-0000-0000-000000000000"]);
  const invoicedSet = new Set((invoicedItems ?? []).map((i) => i.order_id));

  const result = (orders ?? []).map((o) => {
    const p = o.products as { title?: string; model_number?: string | null } | null;
    return {
      id: o.id,
      product_title: p?.title ?? "—",
      model_number: p?.model_number ?? null,
      confirmed_qty: o.confirmed_qty ?? 0,
      unit_price: o.unit_price ?? 0,
      listed_rate: o.listed_rate,
      rebate_rate: o.rebate_rate,
      alreadyInvoiced: invoicedSet.has(o.id),
    };
  });

  return NextResponse.json({ orders: result });
}
