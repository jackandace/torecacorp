// shopId → メール送信のショートカット
//
// すべての呼び出し元で try/catch して使うこと前提だが、念のため内部でも
// 失敗を握って notifications テーブルに失敗記録を残す。本処理を止めない。
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { sendTemplateEmail } from "./email/send-template";

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
