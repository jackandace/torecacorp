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
    .from("shops")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const csv = toCsv(
    (data ?? []).map((s) => ({
      company_name: s.company_name,
      contact_name: s.contact_name,
      email: s.email,
      phone: s.phone ?? "",
      address: s.address ?? "",
      delivery_address: s.delivery_address ?? "",
      current_rank: s.current_rank,
      status: s.status,
      rate_override: s.rate_override ?? "",
      oath_signed_at: s.oath_signed_at ?? "",
      oath_expires_at: s.oath_expires_at ?? "",
      created_at: s.created_at,
    })),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="shops_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
