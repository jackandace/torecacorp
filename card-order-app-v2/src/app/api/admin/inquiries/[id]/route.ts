// 管理者による問い合わせステータス更新
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import type { Inquiry } from "@/types/database";

const Schema = z.object({
  status: z.enum(["open","in_progress","waiting_shop","resolved","closed"]).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: z.infer<typeof Schema>;
  try { body = Schema.parse(await request.json()); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "invalid" }, { status: 400 }); }

  const update: Partial<Inquiry> = {};
  if (body.status !== undefined) {
    update.status = body.status;
    if (body.status === "resolved") update.resolved_at = new Date().toISOString();
  }
  if (body.assignedTo !== undefined) update.assigned_to = body.assignedTo;

  const { error } = await supabase.from("inquiries").update(update).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit(supabase, {
    adminId: user.id,
    action: "update_inquiry",
    targetTable: "inquiries",
    targetId: params.id,
    after: update,
  });

  return NextResponse.json({ ok: true });
}
