// 段階公開のフラグ
//
// お知らせ機能 (🔔・「全体へのお知らせ / あなたへのお知らせ」タブ) は、全体反映までは
// shops.is_beta_tester = true のショップにだけ表示する。全体反映するときは
// SHOP_NOTICES_FOR_ALL を true にしてデプロイする (または環境変数 SHOP_NOTICES_ROLLOUT=all)。
const SHOP_NOTICES_FOR_ALL = false;

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * テストユーザーのフラグを読む。035 未実行 (列が無い) などで読めなければ false
 * (その場合も従来の画面がそのまま動くよう、ショップ本体の取得とは分けて読む)
 */
export async function fetchBetaFlag(sb: SupabaseClient<Database>, shopId: string): Promise<boolean> {
  const { data, error } = await sb.from("shops").select("is_beta_tester").eq("id", shopId).maybeSingle();
  if (error) return false;
  return !!data?.is_beta_tester;
}

export function shopNoticesEnabled(shop: { is_beta_tester?: boolean | null } | null): boolean {
  if (SHOP_NOTICES_FOR_ALL || process.env.SHOP_NOTICES_ROLLOUT === "all") return true;
  return !!shop?.is_beta_tester;
}
