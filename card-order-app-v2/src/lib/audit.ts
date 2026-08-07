// 操作ログ記録ヘルパ (server-side 専用)
//
// audit_logs の RLS は admin のみ書き込み可のため、ショップ・問屋・公開
// コンテキストから渡されたセッションクライアントでは insert が 42501 で
// 弾かれる (writeAudit は失敗を握るので本処理は成功し、ログだけ静かに欠落)。
// 監査ログは呼び出し元の権限に依存させず、常に Service Role で書き込む。
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AuditInput {
  adminId?: string | null;
  shopId?: string | null;
  action: string;             // 'approve_order' 'issue_invoice' 'update_rank' 等
  targetTable: string;
  targetId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

export async function writeAudit(
  supabase: SupabaseClient<Database>,
  input: AuditInput,
): Promise<void> {
  // Service Role が使えない環境 (テスト等) のみ渡されたクライアントにフォールバック
  let db = supabase;
  try {
    db = createAdminClient();
  } catch {
    // fallthrough
  }
  const { error } = await db.from("audit_logs").insert({
    admin_id:     input.adminId ?? null,
    shop_id:      input.shopId ?? null,
    action:       input.action,
    target_table: input.targetTable,
    target_id:    input.targetId ?? null,
    before_data:  input.before ?? null,
    after_data:   input.after ?? null,
  });
  if (error) {
    // 監査ログの失敗は通常処理を止めない。Sentry に送る。
    console.error("[audit] failed to write:", error);
  }
}
