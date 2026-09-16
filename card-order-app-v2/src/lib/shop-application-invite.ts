// ショップ審査の承認・招待リンク再発行で共有する処理 (server-side 専用)
//
// 承認 API と再発行 API の両方から使い、招待トークンの仕様・メール文面を
// 一箇所に揃える。
import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { sendEmail } from "@/lib/email/resend";

export const INVITE_EXPIRES_DAYS = 14;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** 申請者向けの招待レコードを発行し、登録 URL を返す */
export async function issueApplicationInvite(
  adminSb: SupabaseClient<Database>,
  input: { email: string; companyName: string; createdBy: string; note: string },
): Promise<{ inviteId: string; registerUrl: string; expiresAt: Date }> {
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
  const { data: invite, error } = await adminSb
    .from("registration_invites")
    .insert({
      token,
      email: input.email,
      company_name: input.companyName,
      note: input.note,
      expires_at: expiresAt.toISOString(),
      created_by: input.createdBy,
    })
    .select("id")
    .single();
  if (error || !invite) {
    throw new Error(error?.message ?? "招待リンクの発行に失敗しました");
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return { inviteId: invite.id, registerUrl: `${appUrl}/register?token=${token}`, expiresAt };
}

/**
 * 審査通過メール (登録リンク付き) を送る。
 * reissue=true のときは「リンク再発行」向けの文面になる。
 * 送信できない環境 (Resend 未設定) では false を返す。
 */
export async function sendApplicationInviteMail(input: {
  to: string;
  companyName: string;
  registerUrl: string;
  reissue?: boolean;
}): Promise<boolean> {
  const canSend = process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith("re_placeholder");
  if (!canSend) return false;

  const lead = input.reissue
    ? `<p>ショップアカウント登録用リンクを<b>再発行</b>いたしました。<br>
    以前お送りしたリンクは無効になっておりますので、以下の新しいリンクよりご登録をお願いいたします。</p>`
    : `<p>この度は弊社卸サービスへお申込みいただき、誠にありがとうございました。<br>
    審査の結果、<b>お取引を開始させていただくことになりました</b>。</p>
    <p>以下のリンクよりショップアカウントの登録をお願いいたします。</p>`;

  try {
    await sendEmail({
      to: input.to,
      replyTo: "m.kawazu@torecacorp.jp", // 送信元は noreply のため返信は担当 (河津) へ
      subject: input.reissue
        ? "【トレカ商事カンパニー】ご登録リンクの再発行のご案内"
        : "【トレカ商事カンパニー】審査結果のご連絡 (ご登録のご案内)",
      html: `
<div style="max-width:560px;margin:0 auto;font-family:-apple-system,'Hiragino Sans','Noto Sans JP',Meiryo,sans-serif;color:#1f2937;line-height:1.8;">
  <div style="padding:16px 0;border-bottom:2px solid #1d4ed8;"><strong>${input.reissue ? "【ご登録リンク再発行】" : "【審査結果】"}トレカ商事カンパニー</strong></div>
  <div style="padding:16px 0;">
    <p>${escapeHtml(input.companyName)} 様</p>
    ${lead}
    <p style="margin:20px 0;text-align:center;">
      <a href="${input.registerUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">ショップアカウントを登録する</a>
    </p>
    <p style="font-size:12px;color:#64748b;">※ 登録フォームには申込み時の内容があらかじめ反映されています。変更がある場合は修正のうえご登録ください。<br>
    ※ ご登録完了後、マイページより返金先口座のご登録をお願いいたします。<br>
    ※ リンクの有効期限は <b>${INVITE_EXPIRES_DAYS}日間</b> です。期限が切れた場合は担当者までご連絡ください。<br>
    ※ ボタンが開けない場合は次の URL をブラウザに貼り付けてください。<br>
    <span style="word-break:break-all;">${input.registerUrl}</span></p>
  </div>
  <div style="padding:12px 0;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
    株式会社パレットグループ トレカ商事カンパニー<br>
    担当: 河津 (m.kawazu@torecacorp.jp)
  </div>
</div>`,
    });
    return true;
  } catch (e) {
    console.error("[shop-application-invite] メール送信失敗:", e instanceof Error ? e.message : e);
    return false;
  }
}
