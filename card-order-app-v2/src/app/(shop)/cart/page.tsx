// カート: 発注ページ・商品詳細で追加した商品の確認と発注リクエストの送信
// (カートの保存・復元・在庫の再チェック・送信は発注ページと同じ OrderForm の処理を使う)
import { BackLink } from "@/components/BackLink";
import { OrderForm } from "../order/OrderForm";
import { loadOrderData } from "../order/load-order-data";

export const metadata = { title: "カート | トレカ商事" };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const { visibleProducts, shop, pendingByProduct } = await loadOrderData();
  return (
    <div className="space-y-4">
      <div>
        <BackLink href="/order" label="発注ページ" />
        <h1 className="text-2xl font-bold mt-1">カート</h1>
        <p className="text-sm text-slate-500 mt-1">内容を確認し、免責事項に同意のうえ「リクエスト送信」してください。数量を変えるときは商品名から商品ページを開いて、もう一度カートに追加してください。</p>
      </div>
      <OrderForm products={visibleProducts} shop={shop} pendingByProduct={pendingByProduct} mode="cart" />
    </div>
  );
}
