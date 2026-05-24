import { createClient } from "@/lib/supabase/server";
import { InventoryTable } from "./InventoryTable";
import type { Product } from "@/types/database";

export const metadata = { title: "在庫管理 | 管理" };
export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const supabase = createClient();
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1000);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">在庫管理 ({products?.length ?? 0})</h1>
        <div className="flex gap-2">
          <a href="/admin/inventory/import" className="btn-secondary">Excel取込</a>
          <a href="/admin/inventory/new" className="btn-primary">新規登録</a>
        </div>
      </div>
      <InventoryTable products={(products ?? []) as Product[]} />
    </div>
  );
}
