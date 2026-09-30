// ショップごとの商品表示判定 (ランク別 + 個別指名)
//
// 発注ページ・新着商品のお知らせ・未読件数・新商品メールで同じ判定を使うための共通処理。
// 個別指名 (product_shop_access) は他ショップ分も見ないと「指名モードか」が判定できず、
// RLS では参照できないため Service Role で取得する。
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, RankCode } from "@/types/database";
import { rankAtLeast } from "@/constants/ranks";

type Visible = { id: string; min_rank: RankCode | null };
export type AccessIndex = Map<string, Set<string>>; // product_id → 指名されたショップID

export async function loadAccessIndex(admin: SupabaseClient<Database>, productIds: string[]): Promise<AccessIndex> {
  const index: AccessIndex = new Map();
  if (productIds.length === 0) return index;
  const { data } = await admin.from("product_shop_access").select("product_id, shop_id").in("product_id", productIds);
  for (const a of data ?? []) {
    if (!index.has(a.product_id)) index.set(a.product_id, new Set());
    index.get(a.product_id)!.add(a.shop_id);
  }
  return index;
}

/** 1商品をこのショップに見せてよいか */
export function isVisibleForShop(
  product: Visible,
  shop: { id: string; current_rank: RankCode } | null,
  access: AccessIndex,
): boolean {
  const nominated = access.get(product.id);
  // 個別指名がある商品 → 指名されたショップのみ (ランク無視)
  if (nominated && nominated.size > 0) return !!shop && nominated.has(shop.id);
  // 指名なし → 最低表示ランク判定
  if (product.min_rank) return !!shop && rankAtLeast(shop.current_rank, product.min_rank);
  return true;
}

export async function filterProductsForShop<T extends Visible>(
  admin: SupabaseClient<Database>,
  products: T[],
  shop: { id: string; current_rank: RankCode } | null,
): Promise<T[]> {
  if (products.length === 0) return [];
  const access = await loadAccessIndex(admin, products.map((p) => p.id));
  return products.filter((p) => isVisibleForShop(p, shop, access));
}
