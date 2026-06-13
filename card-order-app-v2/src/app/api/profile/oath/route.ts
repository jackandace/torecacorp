// ショップ自身による宣誓書 PDF アップロード API
//
// - oath-documents バケットに保存
// - shops.oath_signed_at は今日の日付に
// - oath_expires_at は admin 確認後に設定 (ここでは null のまま)
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/audit";
import { isPdf } from "@/lib/file-validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 自分のショップ
  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!shop) return NextResponse.json({ error: "shop not found" }, { status: 404 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "PDF は 20MB 以下にしてください" }, { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (!isPdf(buf)) {
    return NextResponse.json({ error: "PDF ファイルを選択してください" }, { status: 400 });
  }
  const path = `${shop.id}/${Date.now()}.pdf`;

  // 非公開バケットへの書き込みは service_role 経由
  const adminSb = createAdminClient();
  const { error: upErr } = await adminSb.storage
    .from("oath-documents")
    .upload(path, buf, { contentType: "application/pdf", upsert: false });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // shops の oath_signed_at を更新 (失効日は admin が後で設定)
  const { error: dbErr } = await supabase
    .from("shops")
    .update({ oath_signed_at: new Date().toISOString() })
    .eq("id", shop.id);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  await writeAudit(supabase, {
    shopId: shop.id,
    action: "shop_self_upload_oath",
    targetTable: "shops",
    targetId: shop.id,
    after: { path },
  });

  return NextResponse.json({ ok: true, path });
}
