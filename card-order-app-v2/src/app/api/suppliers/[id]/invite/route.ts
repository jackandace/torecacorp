// 問屋ユーザー招待 API (admin) — role=supplier で招待し supplier_users に紐付け
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const Schema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "invalid" }, { status: 400 });
  }

  const adminSb = createAdminClient();

  // 問屋の存在確認
  const { data: supplier } = await adminSb.from("suppliers").select("id, name").eq("id", params.id).maybeSingle();
  if (!supplier) return NextResponse.json({ error: "問屋が見つかりません" }, { status: 404 });

  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password`;
  const { data: invited, error: inviteErr } = await adminSb.auth.admin.inviteUserByEmail(body.email, {
    data: { role: "supplier", display_name: body.displayName },
    redirectTo,
  });

  let userId: string | null = null;
  let emailSent = false;
  if (inviteErr) {
    const msg = inviteErr.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exist")) {
      const { data: list } = await adminSb.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = list?.users.find((u) => u.email?.toLowerCase() === body.email.toLowerCase());
      if (existing) {
        userId = existing.id;
        await adminSb.auth.admin.updateUserById(existing.id, {
          user_metadata: { ...existing.user_metadata, role: "supplier", display_name: body.displayName },
        });
        // 既存ユーザーには招待メールが飛ばないため、設定リンクを別途送る
        const { error: resetErr } = await adminSb.auth.resetPasswordForEmail(body.email, { redirectTo });
        emailSent = !resetErr;
      } else {
        return NextResponse.json({ error: "既存ユーザー検索失敗" }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: `招待失敗: ${inviteErr.message}` }, { status: 500 });
    }
  } else {
    userId = invited.user?.id ?? null;
    emailSent = true;
  }
  if (!userId) return NextResponse.json({ error: "user ID 取得失敗" }, { status: 500 });

  // supplier_users に紐付け (1ユーザー=1問屋。user_id で upsert)
  const { error: linkErr } = await adminSb
    .from("supplier_users")
    .upsert({ supplier_id: params.id, user_id: userId, display_name: body.displayName }, { onConflict: "user_id" });
  if (linkErr) return NextResponse.json({ error: `紐付け失敗: ${linkErr.message}` }, { status: 500 });

  await writeAudit(supabase, {
    adminId: user.id,
    action: "invite_supplier_user",
    targetTable: "supplier_users",
    targetId: userId,
    after: { email: body.email, supplier_id: params.id, display_name: body.displayName, email_sent: emailSent },
  });

  return NextResponse.json({ ok: true, emailSent });
}
