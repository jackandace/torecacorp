import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentSupplier } from "@/lib/supplier";

export const dynamic = "force-dynamic";
export const metadata = { title: "問屋ポータル | トレカ商事" };

export default async function SupplierDashboard() {
  const supabase = createClient();
  const ctx = await getCurrentSupplier(supabase);
  if (!ctx) return null; // レイアウト側で未設定案内を表示

  // 自社商品数 (supplier_id で明示スコープ)
  const { count: productCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("supplier_id", ctx.supplier.id)
    .is("deleted_at", null);

  // 要出荷(確定・未出荷)件数 — 自社商品にスコープ
  const admin = createAdminClient();
  const { data: prods } = await admin.from("products").select("id").eq("supplier_id", ctx.supplier.id).is("deleted_at", null);
  const prodIds = (prods ?? []).map((p) => p.id);
  let toShip = 0;
  if (prodIds.length) {
    const { count } = await admin
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("product_id", prodIds)
      .eq("status", "確定")
      .in("shipping_status", ["未出荷", "準備中"])
      .is("deleted_at", null);
    toShip = count ?? 0;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">こんにちは、{ctx.supplier.name} 様</h1>
        <p className="text-sm text-slate-500 mt-1">入荷・出荷・納品を管理する問屋ポータルです。</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="text-xs text-slate-500">担当商品</div>
          <div className="text-2xl font-bold mt-1">{productCount ?? 0}</div>
        </div>
        <Link href="/supplier/shipments" className="card p-5 hover:border-brand-300 transition">
          <div className="text-xs text-slate-500">要出荷オーダー</div>
          <div className="text-2xl font-bold mt-1">{toShip} <span className="text-xs font-normal text-brand-600">出荷更新へ →</span></div>
        </Link>
        <div className="card p-5 opacity-60">
          <div className="text-xs text-slate-500">納品待ち</div>
          <div className="text-2xl font-bold mt-1">— <span className="text-xs font-normal">(フェーズ3)</span></div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3">このポータルでできること</h2>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2"><span className="text-emerald-600">✔</span><span><b>ログイン・自社商品の確認</b></span></li>
          <li className="flex items-start gap-2"><span className="text-emerald-600">✔</span><span><b>出荷更新</b> — 確定発注に配送会社・追跡番号を入力(Excel風・貼付可)。出荷でショップへ自動通知<span className="text-xs text-emerald-700">(稼働中)</span></span></li>
          <li className="flex items-start gap-2 text-slate-500"><span>◻</span><span><b>入荷登録</b> — 新商品を登録し、トレカ商事の承認後に公開(フェーズ4)</span></li>
          <li className="flex items-start gap-2 text-slate-500"><span>◻</span><span><b>納品完了・納品報告書</b> — 納品完了を登録すると収益認識の基点になり、納品報告書を発行(フェーズ3)</span></li>
        </ul>
        <p className="text-xs text-slate-400 mt-4">
          ※ 現在はフェーズ1(基盤)公開中です。各機能は順次このポータルに追加されます。
        </p>
      </div>
    </div>
  );
}
