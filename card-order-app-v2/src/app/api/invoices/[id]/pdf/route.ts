// 請求書 PDF 生成 → Supabase Storage アップロード → invoices.pdf_url に保存パスを記録
//
// 署名付き URL は短命なので DB には永続化しない。pdf_url には Storage 保存パスを入れ、
// 実際に開く時は GET .../pdf/download で都度署名し直す。
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";
import { generateInvoicePdf } from "@/lib/pdf/generate-invoice";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    return await handlePost(request, params);
  } catch (e) {
    // 生成失敗時に原因不明の 500 で終わらせず、実エラーを返す (Storage バケット欠落等の切り分け用)
    const message = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: "PDF 生成に失敗しました", detail: message }, { status: 500 });
  }
}

async function handlePost(request: NextRequest, params: { id: string }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 過去請求書はアップロードされた PDF が正本。再生成すると別物になり pdf_url も上書きされるため拒否
  const { data: target } = await supabase.from("invoices").select("is_legacy").eq("id", params.id).maybeSingle();
  if (target?.is_legacy) {
    return NextResponse.json({ error: "過去請求書 (アップロードしたPDF) は再生成できません" }, { status: 400 });
  }

  // 生成 + Storage 保存 (Service Role)
  const adminSb = createAdminClient();
  const { path, shopId } = await generateInvoicePdf(adminSb, params.id);

  // pdf_url には保存パスを記録 (生成済みフラグ兼用。署名 URL は保存しない)
  await supabase.from("invoices").update({ pdf_url: path }).eq("id", params.id);

  await writeAudit(supabase, {
    adminId: user.id,
    shopId,
    action: "generate_invoice_pdf",
    targetTable: "invoices",
    targetId: params.id,
    after: { path },
  });

  return NextResponse.redirect(new URL(`/admin/billing/${params.id}`, request.url), 303);
}
