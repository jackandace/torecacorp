import { OrderForm } from "./OrderForm";
import { loadOrderData } from "./load-order-data";

export const metadata = { title: "発注 | トレカ商事" };
export const dynamic = "force-dynamic";

export default async function OrderPage() {
  const { visibleProducts, shop, pendingByProduct } = await loadOrderData();

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
