// 販売店調査レポート登録 API (admin)
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const form = await request.formData();
  const shopId = String(form.get("shopId") ?? "");
  const surveyedAt = String(form.get("surveyedAt") ?? "");
  const surveyor = String(form.get("surveyor") ?? "") || null;
  const content = String(form.get("content") ?? "");
  const pdf = form.get("pdf");

  if (!shopId || !surveyedAt || !content) {
    return NextResponse.json({ error: "shopId / surveyedAt / content は必須" }, { status: 400 });
  }

  let pdfUrl: string | null = null;
  if (pdf instanceof File && pdf.size > 0) {
    if (pdf.size > MAX_BYTES) {
      return NextResponse.json({ error: "PDF は 20MB 以下にしてください" }, { status: 413 });
    }
    if (pdf.type !== "application/pdf") {
      return NextResponse.json({ error: "PDF ファイルを選択してください" }, { status: 400 });
    }
    const buf = Buffer.from(await pdf.arrayBuffer());
    const path = `${shopId}/${Date.now()}.pdf`;
    const adminSb = createAdminClient();
    const { error } = await adminSb.storage
      .from("survey-reports")
      .upload(path, buf, { contentType: "application/pdf", upsert: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    pdfUrl = path; // 署名付き URL は閲覧時に生成
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("surveys")
    .insert({
      shop_id: shopId,
      surveyed_at: surveyedAt,
      surveyor,
      content,
      pdf_url: pdfUrl,
    })
    .select("*")
    .single();

  if (insertErr || !inserted) {
    return NextResponse.json({ error: insertErr?.message ?? "insert failed" }, { status: 500 });
  }

  await writeAudit(supabase, {
    adminId: user.id,
    shopId,
    action: "create_survey",
    targetTable: "surveys",
    targetId: inserted.id,
    after: { surveyed_at: surveyedAt, has_pdf: !!pdfUrl },
  });

  return NextResponse.json({ ok: true, survey: inserted });
}
