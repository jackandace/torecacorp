// 開業届 / 履歴事項全部証明書 アップロード API (admin)
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

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

  const ext = file.name.split(".").pop() ?? "pdf";
  const path = `${params.id}/${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const adminSb = createAdminClient();
  const { error: upErr } = await adminSb.storage
    .from("business-docs")
    .upload(path, buf, { contentType: file.type || "application/octet-stream", upsert: false });
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
