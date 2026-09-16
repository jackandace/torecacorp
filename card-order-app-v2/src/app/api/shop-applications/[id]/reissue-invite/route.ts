// ショップ審査: 招待リンクの再発行 API (admin)
//
// 承認済み申請の登録リンクが期限切れ (14日) になった場合の復旧手段。
// 新しい招待を発行して申請に紐付け直し (→ /register のプレフィルを維持)、
// 旧リンクは失効させたうえで、再発行メールを申請者へ送る。
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
    .select("id, company_name, email, status, invite_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!app) return NextResponse.json({ error: "申請が見つかりません" }, { status: 404 });
  if (app.status !== "approved") {
    return NextResponse.json({ error: "承認済みの申請のみ再発行できます" }, { status: 409 });
  }

  // 既にショップ登録が完了している場合は再発行不要
  if (app.invite_id) {
    const { data: prev } = await adminSb
      .from("registration_invites")
      .select("used_at")
      .eq("id", app.invite_id)
      .maybeSingle();
    if (prev?.used_at) {
      return NextResponse.json({ error: "この申請者は既にショップ登録を完了しています" }, { status: 409 });
    }
  }
  const { data: existingShop } = await adminSb
    .from("shops")
    .select("id")
    .eq("email", app.email)
    .is("deleted_at", null)
    .maybeSingle();
  if (existingShop) {
    return NextResponse.json({ error: "このメールアドレスのショップは既に登録済みです" }, { status: 409 });
  }

  let inviteId: string;
  let registerUrl: string;
  try {
    ({ inviteId, registerUrl } = await issueApplicationInvite(adminSb, {
      email: app.email,
      companyName: app.company_name,
      createdBy: user.id,
      note: "ショップ審査: 招待リンクの再発行",
    }));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "招待リンクの発行に失敗しました" }, { status: 500 });
  }

  // 旧リンクを失効 (未使用のまま残っていれば期限を過去に)
  if (app.invite_id) {
    await adminSb
      .from("registration_invites")
      .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
      .eq("id", app.invite_id)
      .is("used_at", null);
  }

  const { error: updErr } = await adminSb
    .from("shop_applications")
    .update({ invite_id: inviteId })
    .eq("id", app.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await writeAudit(supabase, {
    adminId: user.id,
    action: "reissue_shop_application_invite",
    targetTable: "shop_applications",
    targetId: app.id,
    before: { invite_id: app.invite_id },
    after: { email: app.email, invite_id: inviteId },
  });

  const mailSent = await sendApplicationInviteMail({
    to: app.email,
    companyName: app.company_name,
    registerUrl,
    reissue: true,
  });

  return NextResponse.json({ ok: true, registerUrl, mailSent });
}
