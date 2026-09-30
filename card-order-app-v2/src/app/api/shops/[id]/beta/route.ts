// ショップのテストユーザー (先行公開機能の表示対象) の切り替え (admin)
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/admin-guard";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { supabase, user } = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = z.object({ isBetaTester: z.boolean() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { error } = await supabase.from("shops").update({ is_beta_tester: parsed.data.isBetaTester }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAudit(supabase, { adminId: user.id, shopId: params.id, action: "set_beta_tester", targetTable: "shops", targetId: params.id, after: parsed.data });
  return NextResponse.json({ ok: true });
}
