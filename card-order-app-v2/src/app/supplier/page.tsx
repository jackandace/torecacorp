import { createClient } from "@/lib/supabase/server";
import { getCurrentSupplier } from "@/lib/supplier";

export const dynamic = "force-dynamic";
export const metadata = { title: "問屋ポータル | トレカ商事" };

export default async function SupplierDashboard() {
  const supabase = createClient();
  const ctx = await getCurrentSupplier(supabase);
  if (!ctx) return null; // レイアウト側で未設定案内を表示

  // 自社商品数 (RLSで自社分のみ)
  const { count: productCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null);

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
        <div className="card p-5 opacity-60">
          <div className="text-xs text-slate-500">要出荷オーダー</div>
          <div className="text-2xl font-bold mt-1">— <span className="text-xs font-normal">(フェーズ2)</span></div>
        </div>
        <div className="card p-5 opacity-60">
          <div className="text-xs text-slate-500">納品待ち</div>
          <div className="text-2xl font-bold mt-1">— <span className="text-xs font-normal">(フェーズ3)</span></div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3">このポータルでできること</h2>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2"><span className="text-emerald-600">✔</span><span><b>ログイン・自社商品の確認</b>(このフェーズで公開)</span></li>
          <li className="flex items-start gap-2 text-slate-500"><span>◻</span><span><b>入荷登録</b> — 新商品を登録し、トレカ商事の承認後に公開(フェーズ4)</span></li>
          <li className="flex items-start gap-2 text-slate-500"><span>◻</span><span><b>出荷更新</b> — 確定発注に出荷日・配送会社・追跡番号を入力。出荷でショップへ自動通知(フェーズ2)</span></li>
          <li className="flex items-start gap-2 text-slate-500"><span>◻</span><span><b>納品完了・納品報告書</b> — 納品完了を登録すると収益認識の基点になり、納品報告書を発行(フェーズ3)</span></li>
        </ul>
        <p className="text-xs text-slate-400 mt-4">
          ※ 現在はフェーズ1(基盤)公開中です。各機能は順次このポータルに追加されます。
        </p>
      </div>
    </div>
  );
}
