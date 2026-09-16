// ショップ審査の却下 API (admin)
//
// notify=true のときのみ申請者へお断りメールを送る (既定は記録のみ)。
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email/resend";

export const runtime = "nodejs";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const Schema = z.object({
  reviewNote: z.string().max(1000).optional(),
  notify: z.boolean().default(false),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json().catch(() => ({})));
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const adminSb = createAdminClient();
  const { data: app } = await adminSb
    .from("shop_applications")
    .select("id, company_name, email, status")
    .eq("id", params.id)
    .maybeSingle();
  if (!app) return NextResponse.json({ error: "申請が見つかりません" }, { status: 404 });
  if (app.status !== "pending") {
    return NextResponse.json({ error: `この申請は既に審査済みです (${app.status})` }, { status: 409 });
  }

  const { error: updErr } = await adminSb
    .from("shop_applications")
    .update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: body.reviewNote ?? null,
    })
    .eq("id", app.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await writeAudit(supabase, {
    adminId: user.id,
    action: "reject_shop_application",
    targetTable: "shop_applications",
    targetId: app.id,
    after: { email: app.email, review_note: body.reviewNote ?? null },
  });

  let mailSent = false;
  const canSend = process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith("re_placeholder");
  if (body.notify && canSend) {
    try {
      await sendEmail({
        to: app.email,
        replyTo: "m.kawazu@torecacorp.jp", // 送信元は noreply のため返信は担当 (河津) へ
        subject: "【トレカ商事カンパニー】審査結果のご連絡",
        html: `
<div style="max-width:560px;margin:0 auto;font-family:-apple-system,'Hiragino Sans','Noto Sans JP',Meiryo,sans-serif;color:#1f2937;line-height:1.8;">
  <div style="padding:16px 0;border-bottom:2px solid #1d4ed8;"><strong>【審査結果】トレカ商事カンパニー</strong></div>
  <div style="padding:16px 0;">
    <p>${escapeHtml(app.company_name)} 様</p>
    <p>この度は弊社卸サービスへお申込みいただき、誠にありがとうございました。</p>
    <p>社内にて慎重に検討いたしました結果、誠に恐縮ながら
    今回はお取引を見送らせていただくこととなりました。</p>
    <p>ご期待に沿えず申し訳ございませんが、何卒ご了承くださいますようお願い申し上げます。<br>
    今後、運営状況が変わられた際には、改めてのお申込みをお待ちしております。</p>
  </div>
  <div style="padding:12px 0;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
    株式会社パレットグループ トレカ商事カンパニー<br>
    担当: 河津 (m.kawazu@torecacorp.jp)
  </div>
</div>`,
      });
      mailSent = true;
    } catch (e) {
      console.error("[shop-applications/reject] お断りメールの送信失敗:", e instanceof Error ? e.message : e);
    }
  }

  return NextResponse.json({ ok: true, mailSent });
}
