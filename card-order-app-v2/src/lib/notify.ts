// shopId → メール送信のショートカット
//
// すべての呼び出し元で try/catch して使うこと前提だが、念のため内部でも
// 失敗を握って notifications テーブルに失敗記録を残す。本処理を止めない。
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { sendTemplateEmail } from "./email/send-template";
import { sendEmail } from "./email/resend";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * 発注リクエスト発生を社内 (admin) + 問屋担当者へメール通知する。
 * 宛先は環境変数 ORDER_NOTIFY_EMAILS (カンマ区切り) で指定。
 * 例: ORDER_NOTIFY_EMAILS=info@369labo.jp,hashimoto@example.com
 */
export async function notifyOrderToStaff(args: {
  supabase: SupabaseClient<Database>;
  shopName: string;
  items: { series: string | null; title: string; qty: number; unit: string; qtyInBox: number }[];
}): Promise<void> {
  const { supabase, shopName, items } = args;

  const recipients = (process.env.ORDER_NOTIFY_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (recipients.length === 0) {
    console.log("[notify] ORDER_NOTIFY_EMAILS 未設定のため発注スタッフ通知をスキップ");
    return;
  }
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith("re_placeholder")) {
    console.log("[notify] RESEND_API_KEY 未設定のため発注スタッフ通知をスキップ");
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const rows = items
    .map(
      (i) => `<tr>
        <td style="border:1px solid #e2e8f0;padding:8px 12px;">${escapeHtml([i.series, i.title].filter(Boolean).join(" / "))}</td>
        <td style="border:1px solid #e2e8f0;padding:8px 12px;text-align:right;white-space:nowrap;">${i.qty} ${i.unit} (${i.qtyInBox} BOX)</td>
      </tr>`,
    )
    .join("");

  const html = `
<div style="max-width:560px;margin:0 auto;font-family:-apple-system,'Hiragino Sans','Noto Sans JP',Meiryo,sans-serif;color:#1f2937;line-height:1.8;">
  <div style="padding:16px 0;border-bottom:2px solid #1d4ed8;">
    <strong>【発注リクエスト】${escapeHtml(shopName)} 様</strong>
  </div>
  <div style="padding:16px 0;">
    <p>新しい発注リクエストが届きました。</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr>
        <th style="border:1px solid #e2e8f0;padding:8px 12px;background:#f1f5f9;text-align:left;">発注タイトル</th>
        <th style="border:1px solid #e2e8f0;padding:8px 12px;background:#f1f5f9;text-align:right;">発注希望数</th>
      </tr>
      ${rows}
    </table>
    ${appUrl ? `<p style="margin-top:16px;"><a href="${appUrl}/admin/orders" style="color:#1d4ed8;">→ 管理画面で確認・承認する</a></p>` : ""}
  </div>
  <div style="padding:12px 0;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
    トレカ商事カンパニー 受発注システム (自動送信)
  </div>
</div>`;

  try {
    await sendEmail({
      to: recipients,
      subject: `【発注リクエスト】${shopName} 様より ${items.length} 件`,
      html,
    });
    await supabase.from("notifications").insert({
      shop_id: null,
      template_code: "order_staff_notify",
      channel: "email",
      subject: `【発注リクエスト】${shopName} 様より ${items.length} 件`,
      body: `宛先: ${recipients.join(", ")}`,
      status: "sent",
      sent_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[notify] 発注スタッフ通知の送信失敗:", e instanceof Error ? e.message : e);
    await supabase.from("notifications").insert({
      shop_id: null,
      template_code: "order_staff_notify",
      channel: "email",
      subject: `【発注リクエスト】${shopName} 様 (送信失敗)`,
      body: `宛先: ${recipients.join(", ")}`,
      status: "failed",
      error_detail: e instanceof Error ? e.message : "unknown",
    });
  }
}

export async function notifyShop(args: {
  supabase: SupabaseClient<Database>;
  shopId: string;
  templateCode: string;
  vars?: Record<string, string | number>;
}): Promise<void> {
  const { supabase, shopId, templateCode, vars } = args;

  // 開発環境などで RESEND_API_KEY 未設定ならコンソールログのみ。
  // notifications テーブルには書き込まない (ショップ側の通知履歴を汚さないため)。
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith("re_placeholder")) {
    console.log(`[notify] skipped (RESEND_API_KEY not configured): shop=${shopId} template=${templateCode}`);
    return;
  }

  // shop のメールアドレスを取得
  const { data: shop } = await supabase
    .from("shops")
    .select("email, status")
    .eq("id", shopId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!shop?.email) {
    console.error(`[notify] shop ${shopId} not found or no email`);
    return;
  }
  if (shop.status === "suspended") {
    // 停止中のショップへは送らない
    return;
  }

  try {
    await sendTemplateEmail({
      supabase,
      templateCode,
      to: shop.email,
      shopId,
      vars,
    });
  } catch (e) {
    console.error(`[notify] failed to send "${templateCode}" to ${shop.email}:`, e);
    // ログは sendTemplateEmail 内部で notifications テーブルに残す
  }
}
