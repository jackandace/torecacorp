import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rankAtLeast } from "@/constants/ranks";
import { getListedRate, formatRate, formatYen } from "@/lib/rebate";
import { orderCutoffDate, todayISOInJST } from "@/lib/dates";
import type { Shop } from "@/types/database";
import { ProductOrderPanel } from "./ProductOrderPanel";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: product }, { data: shop }] = await Promise.all([
    supabase.from("products").select("*").eq("id", params.id).is("deleted_at", null).maybeSingle(),
    supabase.from("shops").select("*").is("deleted_at", null).limit(1).maybeSingle(),
  ]);

  if (!product || !product.is_visible) notFound();

  // 表示制御 (再配分品のランク別 / 個別指名) — 発注一覧と同じ判定
  const admin = createAdminClient();
  const { data: access } = await admin
    .from("product_shop_access")
    .select("shop_id")
    .eq("product_id", product.id);
  const restricted = (access ?? []).length > 0;
  if (restricted) {
    const allowed = (access ?? []).some((a) => shop && a.shop_id === shop.id);
    if (!allowed) notFound();
  } else if (product.min_rank) {
    if (!shop || !rankAtLeast(shop.current_rank, product.min_rank)) notFound();
  }

  const listedRate = getListedRate(product, (shop as Shop) ?? null);
  const isCut = product.flow_type === "cut";
  const available = (product.planned_qty ?? 0) - product.ordered_qty;
  const soldOut = !isCut && available <= 0;
  const cutoff = orderCutoffDate(product.order_deadline);
  const expired = !!cutoff && cutoff < todayISOInJST();
  const orderable = !soldOut && !expired && product.status === "受付中";

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/order" className="text-sm text-brand-600 hover:underline">← 発注ページに戻る</Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 画像 */}
        <div className="relative w-full aspect-square bg-slate-100 rounded-lg overflow-hidden">
          {product.image_url ? (
            <Image src={product.image_url} alt={product.title} fill sizes="(max-width:768px) 100vw, 400px" className="object-contain" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">画像なし</div>
          )}
        </div>

        {/* 情報 */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge bg-slate-100 text-slate-700">{isCut ? "カット割" : "配分品"}</span>
            {product.series && <span className="text-xs text-slate-500">{product.series}</span>}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold leading-snug">{product.title}</h1>
          {product.full_name && product.full_name !== product.title && (
            <p className="text-sm text-slate-500">{product.full_name}</p>
          )}

          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm pt-1">
            <span>定価 <span className="font-semibold">{formatYen(product.price ?? 0)}</span></span>
            <span className="text-brand-700">案内掛け率 <span className="font-bold">{formatRate(listedRate)}</span></span>
          </div>

          {isCut ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              希望BOX数で受付（カット後に配分確定）。ご発注時に保証金50%（前受金）、配分確定後に差額を精算します。
            </p>
          ) : (
            <p className={`text-sm ${soldOut ? "text-rose-600 font-semibold" : "text-slate-600"}`}>
              {soldOut ? "在庫切れ" : `在庫 残 ${available} BOX / ${product.planned_qty ?? 0} BOX`}
            </p>
          )}

          <ProductOrderPanel
            productId={product.id}
            unitPrice={product.price ?? 0}
            listedRate={listedRate}
            minOrderBox={product.min_order_box}
            ctToBox={product.ct_to_box}
            orderable={orderable}
            disabledReason={
              expired ? "受付を終了しました" : soldOut ? "在庫切れです" : product.status !== "受付中" ? "現在受付を停止しています" : null
            }
          />
        </div>
      </div>

      {/* 商品詳細 */}
      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">商品詳細</h2>
        <dl className="grid grid-cols-3 gap-y-2 text-sm">
          {product.model_number && (<><dt className="text-slate-500">型番</dt><dd className="col-span-2">{product.model_number}</dd></>)}
          {product.jan_code && (<><dt className="text-slate-500">JANコード</dt><dd className="col-span-2 font-mono">{product.jan_code}</dd></>)}
          <dt className="text-slate-500">カートン</dt>
          <dd className="col-span-2">
            1カートン = {product.ct_to_box} BOX
            {product.carton_delivery && "（カートン単位でお届け）"}
            {product.master_carton_box ? ` / マスターカートン ${product.master_carton_box} BOX` : ""}
          </dd>
          {product.order_deadline && (<><dt className="text-slate-500">受付締切</dt><dd className="col-span-2">{cutoff ?? product.order_deadline} まで</dd></>)}
        </dl>
        {product.release_info && (
          <div>
            <div className="text-slate-500 text-sm mb-1">メーカー発売情報</div>
            <p className="text-sm whitespace-pre-line text-slate-700">{product.release_info}</p>
          </div>
        )}
        {product.notes && (
          <div>
            <div className="text-slate-500 text-sm mb-1">備考</div>
            <p className="text-sm whitespace-pre-line text-slate-700">{product.notes}</p>
          </div>
        )}
      </section>
    </div>
  );
}
