// お知らせの受け取り設定 (新商品メール・希望タイトル) — server-side 専用
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ShopNoticePrefs } from "@/types/database";

type Sb = SupabaseClient<Database>;

export const DEFAULT_PREFS: Omit<ShopNoticePrefs, "shop_id" | "updated_at"> = {
  email_enabled: true,
  title_mode: "all",
  title_ids: [],
  last_digest_at: null,
  confirmed_at: null,
};

export async function getNoticePrefs(admin: Sb, shopId: string): Promise<ShopNoticePrefs> {
  const { data } = await admin.from("shop_notice_prefs").select("*").eq("shop_id", shopId).maybeSingle();
  return data ?? { shop_id: shopId, updated_at: new Date(0).toISOString(), ...DEFAULT_PREFS };
}

/** 希望タイトルの条件に合う商品か。「すべて」なら常に true、「選択」なら選んだタイトルのみ */
export function matchesTitlePref(prefs: Pick<ShopNoticePrefs, "title_mode" | "title_ids">, titleGroupId: string | null): boolean {
  if (prefs.title_mode === "all") return true;
  return !!titleGroupId && prefs.title_ids.includes(titleGroupId);
}
