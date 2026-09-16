// ショップ登録の審査申込み API (公開・認証不要)
//
// 公開フォーム /apply からの申請を受け付ける。
//   1. バリデーション (honeypot によるボット対策 + 同一メールの重複申請ガード)
//   2. shop_applications へ登録 (Service Role — RLS は admin のみのため)
//   3. 申請者へ受付の自動返信メール
//   4. 社内 (ORDER_NOTIFY_EMAILS = 河津さんら) へ新規申請の通知メール
// 審査・承認は管理画面「ショップ審査」(/admin/shops/applications) で行う。
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const Schema = z.object({
  companyName: z.string().trim().min(1).max(200),
  contactName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(1).max(30),
  billingName: z.string().trim().max(200).optional(),
  address: z.string().trim().min(1).max(500),
  deliveryAddress: z.string().trim().min(1).max(500),
  receiverName: z.string().trim().max(100).optional(),
  businessType: z.enum(["physical_only", "physical_and_ec", "ec_only"]),
  openedAt: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/).optional(),
  storeUrl: z.string().trim().max(300).optional(),
  interestedTitles: z.string().trim().max(500).optional(),
  note: z.string().trim().max(1000).optional(),
  termsAgreed: z.literal(true),
  website: z.string().max(0).optional(), // honeypot (人間は空のまま送信する)
});

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(request: NextRequest) {
  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "入力内容に不備があります。必須項目をご確認ください" }, { status: 400 });
  }

  const adminSb = createAdminClient();
  const email = body.email.toLowerCase();

  // 直近30日の同一メール申請は重複扱い (連打・再送対策。案内は成功と同じにして存在を秘匿しない程度に)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: dup } = await adminSb
    .from("shop_applications")
    .select("id")
    .eq("email", email)
    .eq("status", "pending")
    .gte("created_at", since)
    .maybeSingle();
  if (dup) {
    return NextResponse.json({
      ok: true,
      message: "すでに申請を受け付けています。審査完了までしばらくお待ちください",
    });
  }

  const openedAtDate = body.openedAt
    ? (body.openedAt.length === 7 ? `${body.openedAt}-01` : body.openedAt)
    : null;

  const { data: application, error } = await adminSb
    .from("shop_applications")
    .insert({
      company_name: body.companyName,
      contact_name: body.contactName,
      email,
      phone: body.phone,
      billing_name: body.billingName || null,
      address: body.address,
      delivery_address: body.deliveryAddress,
      receiver_name: body.receiverName || null,
      business_type: body.businessType,
      opened_at: openedAtDate,
      store_url: body.storeUrl || null,
      interested_titles: body.interestedTitles || null,
      note: body.note || null,
      terms_agreed_at: new Date().toISOString(),
    })
    .select("id, company_name")
    .single();
  if (error || !application) {
    return NextResponse.json({ error: "申請の送信に失敗しました。時間をおいて再度お試しください" }, { status: 500 });
  }

  await writeAudit(adminSb, {
    action: "shop_application_submitted",
    targetTable: "shop_applications",
    targetId: application.id,
    after: { company_name: body.companyName, email },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const canSend = process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith("re_placeholder");

  if (canSend) {
    // 申請者への受付自動返信
    try {
      await sendEmail({
        to: email,
        subject: "【トレカ商事カンパニー】卸取引のお申込みを受け付けました",
        html: `
<div style="max-width:560px;margin:0 auto;font-family:-apple-system,'Hiragino Sans','Noto Sans JP',Meiryo,sans-serif;color:#1f2937;line-height:1.8;">
  <div style="padding:16px 0;border-bottom:2px solid #1d4ed8;"><strong>【お申込み受付】トレカ商事カンパニー</strong></div>
  <div style="padding:16px 0;">
    <p>${escapeHtml(body.companyName)} 様</p>
    <p>この度は弊社卸サービスへお申込みいただき、誠にありがとうございます。<br>
    以下の内容で申請を受け付けました。</p>
    <p>担当者にて内容を確認のうえ、<b>審査結果を通常2〜3営業日以内</b>にメールでご連絡いたします。<br>
    審査を通過された場合は、ショップアカウントの登録リンクをお送りします。</p>
    <p style="font-size:12px;color:#64748b;">※ 弊社の卸サービスは実店舗を運営されている事業者様向けです。<br>
    ※ お心当たりがない場合は本メールを破棄してください。</p>
  </div>
  <div style="padding:12px 0;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
    株式会社パレットグループ トレカ商事カンパニー (自動送信)
  </div>
</div>`,
      });
    } catch (e) {
      console.error("[apply] 受付自動返信の送信失敗:", e instanceof Error ? e.message : e);
    }

    // 社内スタッフへの通知 (ORDER_NOTIFY_EMAILS)
    const recipients = (process.env.ORDER_NOTIFY_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (recipients.length > 0) {
      try {
        await sendEmail({
          to: recipients,
          subject: `【ショップ審査】新規申込み: ${body.companyName} 様`,
          html: `
<div style="max-width:560px;margin:0 auto;font-family:-apple-system,'Hiragino Sans','Noto Sans JP',Meiryo,sans-serif;color:#1f2937;line-height:1.8;">
  <div style="padding:16px 0;border-bottom:2px solid #1d4ed8;"><strong>【ショップ審査】新規申込み</strong></div>
  <div style="padding:16px 0;">
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><th style="border:1px solid #e2e8f0;padding:6px 10px;background:#f1f5f9;text-align:left;width:130px;">会社名・屋号</th><td style="border:1px solid #e2e8f0;padding:6px 10px;">${escapeHtml(body.companyName)}</td></tr>
      <tr><th style="border:1px solid #e2e8f0;padding:6px 10px;background:#f1f5f9;text-align:left;">担当者</th><td style="border:1px solid #e2e8f0;padding:6px 10px;">${escapeHtml(body.contactName)}</td></tr>
      <tr><th style="border:1px solid #e2e8f0;padding:6px 10px;background:#f1f5f9;text-align:left;">メール</th><td style="border:1px solid #e2e8f0;padding:6px 10px;">${escapeHtml(email)}</td></tr>
      <tr><th style="border:1px solid #e2e8f0;padding:6px 10px;background:#f1f5f9;text-align:left;">運営形態</th><td style="border:1px solid #e2e8f0;padding:6px 10px;">${body.businessType === "physical_only" ? "実店舗のみ" : body.businessType === "physical_and_ec" ? "実店舗 + EC" : "ECのみ"}</td></tr>
      <tr><th style="border:1px solid #e2e8f0;padding:6px 10px;background:#f1f5f9;text-align:left;">開業日</th><td style="border:1px solid #e2e8f0;padding:6px 10px;">${openedAtDate ?? "—"}</td></tr>
    </table>
    <p style="margin-top:16px;"><a href="${appUrl}/admin/shops/applications" style="color:#1d4ed8;">→ 管理画面で内容を確認・審査する</a></p>
  </div>
  <div style="padding:12px 0;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">トレカ商事カンパニー 受発注システム (自動送信)</div>
</div>`,
        });
      } catch (e) {
        console.error("[apply] スタッフ通知の送信失敗:", e instanceof Error ? e.message : e);
      }
    }
  }

  return NextResponse.json({ ok: true, message: "申請を受け付けました" });
}
