import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, isSupplier } from "@/lib/auth";
import { ShopNav } from "@/components/ShopNav";
import { ReceiptEnforcer } from "@/components/ReceiptEnforcer";

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
  const { data: shop } = await supabase.from("shops").select("id").eq("user_id", user.id).is("deleted_at", null).maybeSingle();
  let pending: { token: string; title: string }[] = [];
  if (shop) {
    const { data } = await supabase
      .from("orders")
      .select("receipt_token, products(title)")
      .eq("shop_id", shop.id)
      .not("delivered_at", "is", null)
      .is("received_at", null)
      .is("deleted_at", null);
    pending = (data ?? [])
      .filter((o) => o.receipt_token)
      .map((o) => ({ token: o.receipt_token as string, title: (o.products as unknown as { title?: string } | null)?.title ?? "商品" }));
  }

  return (
    <div className="min-h-screen">
      <ShopNav />
      {/* 下部固定タブ(モバイル)に隠れないよう余白 */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-8">{children}</main>
      <ReceiptEnforcer pending={pending} />
    </div>
  );
}
