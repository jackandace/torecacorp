// ショップ審査の承認 API (admin)
//
// 承認と同時に registration_invites を発行し、申請者へ登録リンクを自動送付する。
// (旧フロー: 審査後に admin が招待リンクを手動発行してメールで案内 → 一本化)
import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email/resend";

export const runtime = "nodejs";

const INVITE_EXPIRES_DAYS = 14;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

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

  // 招待リンク発行 (registration-invites API と同じトークン仕様)
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
  const { data: invite, error: inviteErr } = await adminSb
    .from("registration_invites")
    .insert({
      token,
      email: app.email,
      company_name: app.company_name,
      note: "ショップ審査の承認により自動発行",
      expires_at: expiresAt.toISOString(),
      created_by: user.id,
    })
    .select("id")
    .single();
  if (inviteErr || !invite) {
    return NextResponse.json({ error: inviteErr?.message ?? "招待リンクの発行に失敗しました" }, { status: 500 });
  }

  const { error: updErr } = await adminSb
    .from("shop_applications")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      invite_id: invite.id,
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
    after: { email: app.email, invite_id: invite.id },
  });

  // 審査通過メール (登録リンク付き)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const registerUrl = `${appUrl}/register?token=${token}`;
  const canSend = process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith("re_placeholder");
  let mailSent = false;
  if (canSend) {
    try {
      await sendEmail({
        to: app.email,
        subject: "【トレカ商事カンパニー】審査結果のご連絡 (ご登録のご案内)",
        html: `
<div style="max-width:560px;margin:0 auto;font-family:-apple-system,'Hiragino Sans','Noto Sans JP',Meiryo,sans-serif;color:#1f2937;line-height:1.8;">
  <div style="padding:16px 0;border-bottom:2px solid #1d4ed8;"><strong>【審査結果】トレカ商事カンパニー</strong></div>
  <div style="padding:16px 0;">
    <p>${escapeHtml(app.company_name)} 様</p>
    <p>この度は弊社卸サービスへお申込みいただき、誠にありがとうございました。<br>
    審査の結果、<b>お取引を開始させていただくことになりました</b>。</p>
    <p>以下のリンクよりショップアカウントの登録をお願いいたします。</p>
    <p style="margin:20px 0;text-align:center;">
      <a href="${registerUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">ショップアカウントを登録する</a>
    </p>
    <p style="font-size:12px;color:#64748b;">※ 登録フォームには申込み時の内容があらかじめ反映されています。変更がある場合は修正のうえご登録ください。<br>
    ※ ご登録完了後、マイページより返金先口座のご登録をお願いいたします。<br>
    ※ リンクの有効期限は <b>${INVITE_EXPIRES_DAYS}日間</b> です。期限が切れた場合は担当者までご連絡ください。<br>
    ※ ボタンが開けない場合は次の URL をブラウザに貼り付けてください。<br>
    <span style="word-break:break-all;">${registerUrl}</span></p>
  </div>
  <div style="padding:12px 0;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
    株式会社パレットグループ トレカ商事カンパニー<br>
    担当: 河津 (m.kawazu@torecacorp.jp)
  </div>
</div>`,
      });
      mailSent = true;
    } catch (e) {
      console.error("[shop-applications/approve] 審査通過メールの送信失敗:", e instanceof Error ? e.message : e);
    }
  }

  return NextResponse.json({ ok: true, registerUrl, mailSent });
}
