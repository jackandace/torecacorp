// 操作ログ記録ヘルパ (server-side 専用)
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

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
  const { error } = await supabase.from("audit_logs").insert({
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
