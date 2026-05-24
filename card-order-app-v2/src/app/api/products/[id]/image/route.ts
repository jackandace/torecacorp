// 商品画像アップロード API
//
// - Sharp で幅 800px に自動リサイズ・WebP 変換
// - Supabase Storage `product-images` バケットへ保存 (公開)
// - product.image_url に公開 URL を保存
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "ファイルサイズは10MB以下にしてください" }, { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let resized: Buffer;
  try {
    resized = await sharp(buf)
      .rotate() // EXIF 反映
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
  const adminSb = createAdminClient();
  const { error: upErr } = await adminSb.storage
    .from("product-images")
    .upload(path, resized, { contentType: "image/webp", upsert: true });
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { data: pub } = adminSb.storage.from("product-images").getPublicUrl(path);
  const url = pub.publicUrl;

  const { error: dbErr } = await supabase
    .from("products")
    .update({ image_url: url })
    .eq("id", params.id);
  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  await writeAudit(supabase, {
    adminId: user.id,
    action: "upload_product_image",
    targetTable: "products",
    targetId: params.id,
    after: { path, bytes: resized.length },
  });

  return NextResponse.json({ ok: true, url });
}
