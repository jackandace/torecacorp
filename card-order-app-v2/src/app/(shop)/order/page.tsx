import { createClient } from "@/lib/supabase/server";
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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">発注フォーム</h1>
      <p className="text-sm text-slate-500 mb-6">
        BOX 単位は最低 12 BOX、CT 単位は 1 CT 以上で発注できます。
      </p>
      <OrderForm products={products ?? []} shop={shop ?? null} />
    </div>
  );
}
