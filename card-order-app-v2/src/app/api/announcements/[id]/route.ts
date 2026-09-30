// 全体へのお知らせの削除 (admin・論理削除)
import { NextResponse, type NextRequest } from "next/server";
import { requireAdminUser } from "@/lib/admin-guard";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const { supabase, user } = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { error } = await supabase.from("announcements").update({ deleted_at: new Date().toISOString() }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAudit(supabase, { adminId: user.id, action: "delete_announcement", targetTable: "announcements", targetId: params.id });
  return NextResponse.json({ ok: true });
}
