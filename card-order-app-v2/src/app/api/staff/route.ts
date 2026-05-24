// スタッフ招待 API (super_admin のみ)
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const Schema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1),
  department: z.string().nullable(),
  role: z.enum(["admin", "super_admin"]),
});

export async function POST(request: NextRequest) {
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
  // 招待メール送信 (パスワード設定リンク)
  const { data: invited, error: inviteErr } = await adminSb.auth.admin.inviteUserByEmail(body.email, {
    data: { role: body.role, display_name: body.displayName },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password`,
  });

  let userId: string | null = null;
  if (inviteErr) {
    const msg = inviteErr.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered")) {
      const { data: list } = await adminSb.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = list?.users.find((u) => u.email?.toLowerCase() === body.email.toLowerCase());
      if (existing) {
        userId = existing.id;
        // ロール上書き
        await adminSb.auth.admin.updateUserById(existing.id, {
          user_metadata: { ...existing.user_metadata, role: body.role, display_name: body.displayName },
        });
      } else {
        return NextResponse.json({ error: "既存ユーザー検索失敗" }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: `招待失敗: ${inviteErr.message}` }, { status: 500 });
    }
  } else {
    userId = invited.user?.id ?? null;
  }
  if (!userId) return NextResponse.json({ error: "user ID 取得失敗" }, { status: 500 });

  // staff_profiles upsert
  await supabase.from("staff_profiles").upsert({
    user_id: userId,
    display_name: body.displayName,
    department: body.department,
    active: true,
  });

  await writeAudit(supabase, {
    adminId: user.id,
    action: "invite_staff",
    targetTable: "staff_profiles",
    targetId: userId,
    after: { email: body.email, role: body.role, display_name: body.displayName },
  });

  return NextResponse.json({ ok: true });
}
