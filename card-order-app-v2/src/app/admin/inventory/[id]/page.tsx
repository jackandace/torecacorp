import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatJST } from "@/lib/dates";
import { formatRate, formatYen } from "@/lib/rebate";
import { ProductEditForm } from "./ProductEditForm";
import { ImageUpload } from "./ImageUpload";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!product) notFound();

  const listed = product.actual_rate + product.rate_markup;
  const available = (product.planned_qty ?? 0) - product.ordered_qty;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/inventory" className="text-sm text-brand-600 hover:underline">
            ← 在庫一覧
          </Link>
          <h1 className="text-2xl font-bold mt-1">{product.title}</h1>
          {product.model_number && (
            <p className="text-sm text-slate-500">型番: {product.model_number}</p>
          )}
        </div>
        <div className="text-right text-sm">
          <div>在庫 {available} BOX / {product.planned_qty ?? 0} BOX</div>
          <div className="text-slate-500">実 {formatRate(product.actual_rate)} → 案内 {formatRate(listed)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ProductEditForm product={product} />
        </div>

        <aside className="space-y-4">
          <section className="card p-5">
            <h2 className="font-semibold mb-3">商品画像</h2>
            <ImageUpload productId={product.id} currentUrl={product.image_url} />
          </section>

          <section className="card p-5 text-sm space-y-2">
            <h2 className="font-semibold">メタ情報</h2>
            <div className="text-slate-500 text-xs">価格</div>
            <div>{formatYen(product.price ?? 0)}</div>
            <div className="text-slate-500 text-xs">締切</div>
            <div>{product.order_deadline ?? "—"}</div>
            <div className="text-slate-500 text-xs">登録</div>
            <div>{formatJST(product.created_at)}</div>
            <div className="text-slate-500 text-xs">最終更新</div>
            <div>{formatJST(product.updated_at)}</div>
          </section>
        </aside>
      </div>
    </div>
  );
}
