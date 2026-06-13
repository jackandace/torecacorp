// 宣誓書 PDF アップロード API
//
// - oath-documents バケット (非公開) にアップロード
// - shops.oath_signed_at / oath_expires_at を更新
// - 保存パス: <shopId>/<unixms>.pdf (shopId 配下に世代別保存)
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { isPdf } from "@/lib/file-validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file");
  const signedAt = String(form.get("signedAt") ?? "");
  const expiresAt = String(form.get("expiresAt") ?? "");

  if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "PDF は 20MB 以下にしてください" }, { status: 413 });
  }
  if (!signedAt || !expiresAt) {
    return NextResponse.json({ error: "提出日 / 失効日が必要です" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (!isPdf(buf)) {
    return NextResponse.json({ error: "PDF ファイルを選択してください" }, { status: 400 });
  }
  const path = `${params.id}/${Date.now()}.pdf`;

  const adminSb = createAdminClient();
  const { error: upErr } = await adminSb.storage
    .from("oath-documents")
    .upload(path, buf, { contentType: "application/pdf", upsert: false });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { error: dbErr } = await supabase
    .from("shops")
    .update({
      oath_signed_at: new Date(signedAt).toISOString(),
      oath_expires_at: expiresAt,
    })
    .eq("id", params.id);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  await writeAudit(supabase, {
    adminId: user.id,
    shopId: params.id,
    action: "upload_oath",
    targetTable: "shops",
    targetId: params.id,
    after: { path, signed_at: signedAt, expires_at: expiresAt },
  });

  return NextResponse.json({ ok: true, path });
}
