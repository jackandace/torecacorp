// 問屋の入荷登録: 商品画像アップロード (自分の承認待ち下書きのみ)
//
// 管理者用 /api/products/[id]/image と同じ変換 (800px WebP) だが、
// 認可は「自問屋の商品 かつ 未承認 (下書き)」に限定する。
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupplierContext } from "@/lib/supplier";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const ctx = await getSupplierContext(supabase);
  if (!ctx) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const adminSb = createAdminClient();
  const { data: product } = await adminSb
    .from("products")
    .select("id, supplier_id, is_approved")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!product || product.supplier_id !== ctx.supplierId) {
    return NextResponse.json({ error: "商品が見つかりません" }, { status: 404 });
  }
  if (product.is_approved) {
    return NextResponse.json({ error: "承認済み商品の画像はトレカ商事側で変更します" }, { status: 400 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "ファイルサイズは10MB以下にしてください" }, { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let resized: Buffer;
  try {
    resized = await sharp(buf)
      .rotate()
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } catch (e) {
    return NextResponse.json(
      { error: `画像変換に失敗しました: ${e instanceof Error ? e.message : "unknown"}` },
      { status: 400 },
    );
  }

  const path = `${params.id}/${Date.now()}.webp`;
  const { error: upErr } = await adminSb.storage
    .from("product-images")
    .upload(path, resized, { contentType: "image/webp", upsert: true });
  if (upErr) return NextResponse.json({ error: `アップロード失敗: ${upErr.message}` }, { status: 500 });

  const { data: pub } = adminSb.storage.from("product-images").getPublicUrl(path);
  await adminSb.from("products").update({ image_url: pub.publicUrl }).eq("id", params.id);

  return NextResponse.json({ ok: true, url: pub.publicUrl });
}
