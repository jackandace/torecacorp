// ショップの「発注中」BOX数の集計 (server-side)
//
// 配分品はショップごとに発注可能数まで注文できる。ここでの「発注中」は
// リクエスト / 発注調整中 / 仮確定 の未確定注文 (確定分は products.ordered_qty に
// 加算済みなので含めない。キャンセルも含めない)。
// 仮確定は provisional_qty が入っていればそちらを優先する。
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const PENDING_STATUSES = ["リクエスト", "発注調整中", "仮確定"] as const;

/** shopId の productIds ごとの発注中BOX数を返す (該当なしの商品はキー無し=0扱い) */
export async function fetchShopPendingBox(
  supabase: SupabaseClient<Database>,
  shopId: string,
  productIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (productIds.length === 0) return map;

  const { data } = await supabase
    .from("orders")
    .select("product_id, status, requested_qty, requested_qty_box, provisional_qty")
    .eq("shop_id", shopId)
    .in("product_id", productIds)
    .in("status", [...PENDING_STATUSES])
    .is("deleted_at", null);

  for (const o of data ?? []) {
    const box =
      o.status === "仮確定"
        ? o.provisional_qty ?? o.requested_qty_box ?? o.requested_qty
        : o.requested_qty_box ?? o.requested_qty;
    map.set(o.product_id, (map.get(o.product_id) ?? 0) + (box ?? 0));
  }
  return map;
}
