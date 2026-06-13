// テンプレートコード指定で通知メールを送る (server-side)
//
// 1. notification_templates から code で取得
// 2. {{key}} を置換
// 3. Resend で送信
// 4. notifications テーブルに送信ログを記録
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { sendEmail } from "./resend";
import { renderTemplate } from "./templates";

export async function sendTemplateEmail(args: {
  supabase: SupabaseClient<Database>;
  templateCode: string;
  to: string;
  shopId?: string | null;
  vars?: Record<string, string | number>;
}) {
  const { supabase, templateCode, to, shopId, vars = {} } = args;

  const { data: tpl, error } = await supabase
    .from("notification_templates")
    .select("*")
    .eq("code", templateCode)
    .maybeSingle();
  if (error || !tpl) {
    throw new Error(`template "${templateCode}" not found`);
  }

  // 件名・テキスト本文は素のまま、HTML 本文は差し込み値を HTML エスケープ
  const subject = renderTemplate(tpl.subject, vars);
  const bodyHtml = renderTemplate(tpl.body_html, vars, true);
  const bodyText = tpl.body_text ? renderTemplate(tpl.body_text, vars) : undefined;

  const { data: logRow } = await supabase
    .from("notifications")
    .insert({
      shop_id: shopId ?? null,
      template_code: templateCode,
      channel: "email",
      subject,
      body: bodyHtml,
      status: "queued",
    })
    .select("id")
    .single();

  try {
    await sendEmail({ to, subject, html: bodyHtml, text: bodyText });
    if (logRow) {
      await supabase
        .from("notifications")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", logRow.id);
    }
  } catch (e) {
    if (logRow) {
      await supabase
        .from("notifications")
        .update({
          status: "failed",
          error_detail: e instanceof Error ? e.message : "unknown",
        })
        .eq("id", logRow.id);
    }
    throw e;
  }
}
