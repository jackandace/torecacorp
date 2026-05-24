import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data: shop } = await supabase
    .from("shops")
    .select("business_doc_url")
    .eq("id", params.id)
    .maybeSingle();
  if (!shop?.business_doc_url) return NextResponse.json({ error: "未提出" }, { status: 404 });

  const adminSb = createAdminClient();
  const { data, error } = await adminSb.storage
    .from("business-docs")
    .createSignedUrl(shop.business_doc_url, 3600);
  if (error || !data) return NextResponse.json({ error: error?.message ?? "失敗" }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl });
}
