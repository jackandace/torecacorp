// 招待リンクの失効 (admin)
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // 失効 = expires_at を過去に倒す (履歴として残す)
  const { error } = await supabase
    .from("registration_invites")
    .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
    .eq("id", params.id)
    .is("used_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit(supabase, {
    adminId: user.id,
    action: "revoke_registration_invite",
    targetTable: "registration_invites",
    targetId: params.id,
  });

  return NextResponse.json({ ok: true });
}
