import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, isSupplier } from "@/lib/auth";
import { ShopNav } from "@/components/ShopNav";
import { ReceiptEnforcer } from "@/components/ReceiptEnforcer";
import { getNoticeAccess } from "@/lib/feature-flags";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (isAdmin(user)) redirect("/admin");
  // 問屋ユーザーはショップ画面に入れない (middleware が素通りした場合の防衛線)
  if (isSupplier(user)) redirect("/supplier");

  // 納品済み・未受領の発注 → 受領強制モーダル用
  const { data: shop } = await supabase
    .from("shops")
    .select("id, current_rank, created_at")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  // お知らせ (テストユーザーのみ先行公開): 未読件数。失敗しても画面は出す
  // お知らせ機能の表示可否だけをここで決める。未読件数はナビがページ移動のたびに API から取り直す
  // (レイアウトはページ移動で再描画されないため、ここで数えると既読後も古い件数が残る)
  const noticesOn = shop ? (await getNoticeAccess(shop.id)).enabled : false;
  let pending: { token: string; title: string }[] = [];
  if (shop) {
    const { data } = await supabase
      .from("orders")
      .select("receipt_token, product_title, products(title)")
      .eq("shop_id", shop.id)
      .not("delivered_at", "is", null)
      .is("received_at", null)
      .is("deleted_at", null);
    pending = (data ?? [])
      .filter((o) => o.receipt_token)
      .map((o) => ({ token: o.receipt_token as string, title: o.product_title ?? (o.products as unknown as { title?: string } | null)?.title ?? "商品" }));
  }

  return (
    <div className="min-h-screen">
      <ShopNav shopId={shop?.id ?? null} noticesEnabled={noticesOn} />
      {/* 下部固定タブ(モバイル)に隠れないよう余白 */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-8">{children}</main>
      <ReceiptEnforcer pending={pending} />
    </div>
  );
}
