// ショップ審査の承認 API (admin)
//
// 承認と同時に registration_invites を発行し、申請者へ登録リンクを自動送付する。
// (旧フロー: 審査後に admin が招待リンクを手動発行してメールで案内 → 一本化)
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { issueApplicationInvite, sendApplicationInviteMail } from "@/lib/shop-application-invite";

export const runtime = "nodejs";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const adminSb = createAdminClient();
  const { data: app } = await adminSb
    .from("shop_applications")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!app) return NextResponse.json({ error: "申請が見つかりません" }, { status: 404 });
  if (app.status !== "pending") {
    return NextResponse.json({ error: `この申請は既に審査済みです (${app.status})` }, { status: 409 });
  }

  let inviteId: string;
  let registerUrl: string;
  try {
    ({ inviteId, registerUrl } = await issueApplicationInvite(adminSb, {
      email: app.email,
      companyName: app.company_name,
      createdBy: user.id,
      note: "ショップ審査の承認により自動発行",
    }));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "招待リンクの発行に失敗しました" }, { status: 500 });
  }

  const { error: updErr } = await adminSb
    .from("shop_applications")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      invite_id: inviteId,
    })
    .eq("id", app.id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  await writeAudit(supabase, {
    adminId: user.id,
    action: "approve_shop_application",
    targetTable: "shop_applications",
    targetId: app.id,
    after: { email: app.email, invite_id: inviteId },
  });

  const mailSent = await sendApplicationInviteMail({
    to: app.email,
    companyName: app.company_name,
    registerUrl,
  });

  return NextResponse.json({ ok: true, registerUrl, mailSent });
}
