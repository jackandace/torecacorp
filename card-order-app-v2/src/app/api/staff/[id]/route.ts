// スタッフ情報更新 API (super_admin のみ)
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const Schema = z.object({
  displayName: z.string().min(1),
  department: z.string().nullable(),
  role: z.enum(["admin", "super_admin", "shop"]),
  active: z.boolean(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdmin(user)) {
    return NextResponse.json({ error: "super_admin 権限が必要です" }, { status: 403 });
  }

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "invalid" }, { status: 400 });
  }

  const adminSb = createAdminClient();
  const { data: target } = await adminSb.auth.admin.getUserById(params.id);
  if (!target?.user) return NextResponse.json({ error: "not found" }, { status: 404 });

  // ロール変更
  await adminSb.auth.admin.updateUserById(params.id, {
    user_metadata: { ...target.user.user_metadata, role: body.role, display_name: body.displayName },
  });

  // staff_profiles upsert
  await supabase.from("staff_profiles").upsert({
    user_id: params.id,
    display_name: body.displayName,
    department: body.department,
    active: body.active,
  });

  await writeAudit(supabase, {
    adminId: user.id,
    action: "update_staff",
    targetTable: "staff_profiles",
    targetId: params.id,
    before: { role: target.user.user_metadata?.role },
    after: { role: body.role, display_name: body.displayName, active: body.active },
  });

  return NextResponse.json({ ok: true });
}
