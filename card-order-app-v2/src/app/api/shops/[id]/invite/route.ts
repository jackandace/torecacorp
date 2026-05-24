// ショップ招待メール (再) 送信 API
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data: shop } = await supabase
    .from("shops")
    .select("id, email, company_name")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!shop) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!shop.email) return NextResponse.json({ error: "メールアドレスが未設定です" }, { status: 400 });

  const adminSb = createAdminClient();
  const { error } = await adminSb.auth.admin.inviteUserByEmail(shop.email, {
    data: { role: "shop", company_name: shop.company_name },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAudit(supabase, {
    adminId: user.id,
    shopId: shop.id,
    action: "invite_shop",
    targetTable: "shops",
    targetId: shop.id,
    after: { email: shop.email },
  });

  return NextResponse.json({ ok: true });
}
