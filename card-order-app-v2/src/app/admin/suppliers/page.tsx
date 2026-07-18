import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SupplierAdmin } from "./SupplierAdmin";

export const dynamic = "force-dynamic";
export const metadata = { title: "問屋管理 | トレカ商事" };

export default async function SuppliersPage() {
  const supabase = createClient();
  const [{ data: suppliers }, { data: users }, { data: products }] = await Promise.all([
    supabase.from("suppliers").select("*").is("deleted_at", null).order("created_at", { ascending: true }),
    supabase.from("supplier_users").select("supplier_id"),
    supabase.from("products").select("supplier_id").not("supplier_id", "is", null).is("deleted_at", null),
  ]);

  const userCount: Record<string, number> = {};
  const prodCount: Record<string, number> = {};
  (users ?? []).forEach((u) => { userCount[u.supplier_id] = (userCount[u.supplier_id] ?? 0) + 1; });
  (products ?? []).forEach((p) => { if (p.supplier_id) prodCount[p.supplier_id] = (prodCount[p.supplier_id] ?? 0) + 1; });

  const rows = (suppliers ?? []).map((s) => ({
    ...s,
    userCount: userCount[s.id] ?? 0,
    productCount: prodCount[s.id] ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-brand-600 hover:underline">← 管理トップ</Link>
        <h1 className="text-2xl font-bold mt-1">問屋管理</h1>
        <p className="text-sm text-slate-500 mt-1">
          問屋(仕入先)を登録し、担当者を招待します。招待された担当者は「問屋ポータル(/supplier)」にログインできます。
        </p>
      </div>
      <SupplierAdmin suppliers={rows} />
    </div>
  );
}
