import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rankAtLeast } from "@/constants/ranks";
import { OrderForm } from "./OrderForm";

export const metadata = { title: "発注 | トレカ商事" };
export const dynamic = "force-dynamic";

export default async function OrderPage() {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: products }, { data: shop }] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("is_visible", true)
      .eq("status", "受付中")
      // 発注締切が過ぎた商品は出さない (締切なしは表示)
      .or(`order_deadline.is.null,order_deadline.gte.${today}`)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("shops")
      .select("*")
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle(),
  ]);

  // 再配分品など限定公開の表示判定 (ランク別 + 個別指名)。
  // 個別指名の有無は他ショップ分も見る必要があり RLS で参照できないため service_role で取得。
  const productIds = (products ?? []).map((p) => p.id);
  const restrictedSet = new Set<string>(); // 個別指名が1件でもある商品 (= 指名モード)
  const allowedSet = new Set<string>();    // このショップが指名されている商品
  if (productIds.length > 0) {
    const admin = createAdminClient();
    const { data: access } = await admin
      .from("product_shop_access")
      .select("product_id, shop_id")
      .in("product_id", productIds);
    for (const a of access ?? []) {
      restrictedSet.add(a.product_id);
      if (shop && a.shop_id === shop.id) allowedSet.add(a.product_id);
    }
  }

  const visibleProducts = (products ?? []).filter((p) => {
    // 個別指名がある商品 → 指名されたショップのみ (ランク無視)
    if (restrictedSet.has(p.id)) return allowedSet.has(p.id);
    // 指名なし → 最低表示ランク判定
    if (p.min_rank) return !!shop && rankAtLeast(shop.current_rank, p.min_rank);
    return true;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">発注フォーム</h1>
      <p className="text-sm text-slate-500 mb-6">
        BOX 単位は最低 12 BOX、CT 単位は 1 CT 以上で発注できます。
      </p>
      <OrderForm products={visibleProducts} shop={shop ?? null} />
    </div>
  );
}
