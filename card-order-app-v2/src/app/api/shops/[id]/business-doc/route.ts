// 開業届 / 履歴事項全部証明書 アップロード API (admin)
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { safeExtension } from "@/lib/file-validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "20MB 以下にしてください" }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());

  // ファイル内容 (magic number) で PDF / 画像のみを許可。拡張子・MIME 偽装を弾く
  const ext = safeExtension(buf);
  if (!ext) {
    return NextResponse.json(
      { error: "PDF または画像 (JPEG/PNG/WebP) のみアップロードできます" },
      { status: 400 },
    );
  }
  const contentType =
    ext === "pdf" ? "application/pdf" :
    ext === "jpg" ? "image/jpeg" :
    ext === "png" ? "image/png" : "image/webp";
  const path = `${params.id}/${Date.now()}.${ext}`;

  const adminSb = createAdminClient();
  const { error: upErr } = await adminSb.storage
    .from("business-docs")
    .upload(path, buf, { contentType, upsert: false });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { error: dbErr } = await supabase
    .from("shops")
    .update({ business_doc_url: path })
    .eq("id", params.id);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  await writeAudit(supabase, {
    adminId: user.id,
    shopId: params.id,
    action: "upload_business_doc",
    targetTable: "shops",
    targetId: params.id,
    after: { path },
  });

  return NextResponse.json({ ok: true, path });
}
