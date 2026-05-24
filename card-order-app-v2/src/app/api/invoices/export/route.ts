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
    .from("invoices")
    .select("*, shops(company_name)")
    .is("deleted_at", null)
    .order("issued_at", { ascending: false })
    .limit(5000);

  const csv = toCsv(
    (data ?? []).map((inv) => {
      const s = (inv as { shops?: { company_name?: string } }).shops;
      return {
        invoice_number: inv.invoice_number,
        shop: s?.company_name ?? "",
        rank_at_issue: inv.rank_at_issue,
        subtotal: inv.subtotal,
        rebate_amount: inv.rebate_amount,
        tax_amount: inv.tax_amount,
        total_amount: inv.total_amount,
        paid_amount: inv.paid_amount,
        status: inv.status,
        due_date: inv.due_date ?? "",
        issued_at: inv.issued_at,
      };
    }),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="invoices_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
