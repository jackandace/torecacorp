// 段階公開のフラグと、お知らせ (アプリ内通知・新商品メール) の対象・開始時刻
//
// テストユーザー = 次のどちらかのショップ (DB 関数 tester_shop_ids で判定):
//   - 管理画面で「🧪 テストユーザー」をオンにしたショップ (shops.is_beta_tester)
//   - スタッフ (管理画面ユーザー) のメールアドレス、またはその「+」付き別名で作ったショップ
// 全体反映前は、お知らせ機能をテストユーザーにだけ表示・送信する。
//
// 【過去分は絶対に通知しない】お知らせの対象は「開始時刻以降に公開された商品・投稿されたお知らせ」だけ。
//   テストユーザー: NOTICES_TESTER_START (機能リリース時) 以降
//   それ以外     : NOTICES_ROLLOUT_AT (全体反映した時刻) 以降
// 全体反映の手順: NOTICES_ROLLOUT_AT に反映する時刻 (ISO) を入れてデプロイする。
//   未設定 (null) の間は全体には一切表示・送信しない。
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";

/** テストユーザー向けにお知らせを開始した時刻 (2026-09-30 16:40 JST・機能リリース時) */
export const NOTICES_TESTER_START = "2026-09-30T07:40:00Z";
/** 全体反映した時刻。null の間は全体未公開 */
export const NOTICES_ROLLOUT_AT: string | null = null;

export interface NoticeAccess {
  enabled: boolean;       // お知らせ機能を見せるか
  isTester: boolean;
  startAt: string | null; // これより前の商品・お知らせは一切通知しない
}

/** お知らせ機能の表示可否と開始時刻。判定に失敗したら「表示しない」(安全側) */
export async function getNoticeAccess(shopId: string): Promise<NoticeAccess> {
  let isTester = false;
  try {
    const { data, error } = await createAdminClient().rpc("shop_is_tester", { p_shop_id: shopId });
    isTester = !error && data === true;
  } catch {
    isTester = false;
  }
  return accessFor(isTester);
}

export function accessFor(isTester: boolean): NoticeAccess {
  if (isTester) return { enabled: true, isTester, startAt: NOTICES_TESTER_START };
  if (NOTICES_ROLLOUT_AT) return { enabled: true, isTester, startAt: NOTICES_ROLLOUT_AT };
  return { enabled: false, isTester, startAt: null };
}

/** テストユーザーのショップ ID 一覧 (理由つき) — cron・管理画面用 */
export async function listTesterShops(admin: SupabaseClient<Database>): Promise<Map<string, "manual" | "staff">> {
  const { data, error } = await admin.rpc("tester_shop_ids");
  const map = new Map<string, "manual" | "staff">();
  if (error) return map;
  for (const r of (data ?? []) as { shop_id: string; reason: string }[]) {
    map.set(r.shop_id, r.reason === "manual" ? "manual" : "staff");
  }
  return map;
}

/** 2つの ISO 時刻の遅い方 */
export function laterOf(a: string, b: string | null | undefined): string {
  return b && b > a ? b : a;
}
