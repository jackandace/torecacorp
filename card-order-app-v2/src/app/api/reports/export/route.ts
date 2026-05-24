// レポート用 CSV エクスポート (ショップ別 + 商品別を 2 ファイル相当でまとめる)
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "from / to が必要です" }, { status: 400 });
  }

  const { data: orders } = await supabase
    .from("orders")
    .select(`
      created_at,
      confirmed_qty,
      unit_price,
      listed_rate,
      rebate_rate,
      subtotal,
      rebate_amount,
      total_price,
      status,
      shops(company_name),
      products(title, model_number, category)
    `)
    .gte("created_at", `${from}T00:00:00`)
    .lte("created_at", `${to}T23:59:59`)
    .in("status", ["仮確定", "確定"])
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  const rows = (orders ?? []).map((o) => {
    const s = o.shops as { company_name?: string } | null;
    const p = o.products as { title?: string; model_number?: string | null; category?: string } | null;
    return {
      created_at: o.created_at,
      shop: s?.company_name ?? "",
      product: p?.title ?? "",
      model_number: p?.model_number ?? "",
      category: p?.category ?? "",
      confirmed_qty: o.confirmed_qty ?? "",
      unit_price: o.unit_price ?? "",
      listed_rate: o.listed_rate,
      rebate_rate: o.rebate_rate,
      subtotal: o.subtotal ?? "",
      rebate_amount: o.rebate_amount ?? "",
      total_price: o.total_price ?? "",
      status: o.status,
    };
  });

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="report_${from}_${to}.csv"`,
    },
  });
}
