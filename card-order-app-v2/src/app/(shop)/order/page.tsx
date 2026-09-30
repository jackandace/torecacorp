import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDaysISO, ORDER_CUTOFF_DAYS, todayISOInJST } from "@/lib/dates";
import { fetchShopPendingBox } from "@/lib/pending-orders";
import { OrderForm } from "./OrderForm";
import { filterProductsForShop } from "@/lib/product-visibility";

export const metadata = { title: "発注 | トレカ商事" };
export const dynamic = "force-dynamic";

export default async function OrderPage() {
  const supabase = createClient();
  const today = todayISOInJST();
  // ショップ締切 = 問屋発注期限の3日前。よって受付中なのは deadline >= today+3 のもの
  const minDeadline = addDaysISO(today, ORDER_CUTOFF_DAYS);

  const [{ data: products }, { data: shop }] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("is_visible", true)
      .eq("status", "受付中")
      // 実効締切(発注期限の3日前)が過ぎた商品は出さない (締切なしは表示)
      .or(`order_deadline.is.null,order_deadline.gte.${minDeadline}`)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("shops")
      .select("*")
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle(),
  ]);

  // 再配分品など限定公開の表示判定 (ランク別 + 個別指名)
  const visibleProducts = await filterProductsForShop(createAdminClient(), products ?? [], shop ?? null);

  // 配分品のショップ別上限表示用: 発注中(未確定)のBOX数
  const pendingMap = shop
    ? await fetchShopPendingBox(supabase, shop.id, visibleProducts.map((p) => p.id))
    : new Map<string, number>();
  const pendingByProduct = Object.fromEntries(pendingMap);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">発注フォーム</h1>
      <p className="text-sm text-slate-500 mb-6">
        最低発注数は商品ごとに異なります (各商品の表示をご確認ください)。CT 単位は 1 CT 以上で発注できます。
      </p>
      <OrderForm products={visibleProducts} shop={shop ?? null} pendingByProduct={pendingByProduct} />
    </div>
  );
}
