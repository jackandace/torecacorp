// 発注データ CSV エクスポート (admin のみ)
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data } = await supabase
    .from("orders")
    .select("*, shops(company_name), products(title, model_number)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(5000);

  const csv = toCsv(
    (data ?? []).map((o) => {
      const s = (o as { shops?: { company_name?: string } }).shops;
      const p = (o as { products?: { title?: string; model_number?: string } }).products;
      return {
        created_at: o.created_at,
        shop: s?.company_name ?? "",
        product: p?.title ?? "",
        model_number: p?.model_number ?? "",
        unit: o.order_unit,
        requested_qty: o.requested_qty,
        confirmed_qty: o.confirmed_qty ?? "",
        listed_rate: o.listed_rate,
        rebate_rate: o.rebate_rate,
        subtotal: o.subtotal ?? "",
        rebate_amount: o.rebate_amount ?? "",
        total_price: o.total_price ?? "",
        status: o.status,
        shipping_status: o.shipping_status,
      };
    }),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
