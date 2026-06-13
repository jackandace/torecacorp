// 請求書 PDF ダウンロード (GET)
//
// 開く瞬間に署名付き URL を都度発行してリダイレクトするため、リンクが失効しない。
// PDF がまだ生成されていなければその場で生成する (遅延生成)。
// アクセス可能: 管理者、または当該請求書のショップ本人。
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";
import { generateInvoicePdf, invoicePdfPath } from "@/lib/pdf/generate-invoice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    // 請求書の存在 + 所有ショップを確認 (RLS 下の読込)
    const { data: invoice } = await supabase
      .from("invoices")
      .select("id, shop_id")
      .eq("id", params.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!invoice) return NextResponse.json({ error: "not found" }, { status: 404 });

    // 管理者以外は当該ショップ本人のみ許可
    if (!isAdmin(user)) {
      const { data: shop } = await supabase
        .from("shops")
        .select("id")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .maybeSingle();
      if (!shop || shop.id !== invoice.shop_id) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
    }

    const adminSb = createAdminClient();
    let path = invoicePdfPath(params.id);

    // 署名 (短命: 即リダイレクトで開くため 120 秒で十分)
    let signed = await adminSb.storage.from("invoices").createSignedUrl(path, 120);
    if (signed.error || !signed.data) {
      // 未生成 → その場で生成してから署名
      const gen = await generateInvoicePdf(adminSb, params.id);
      path = gen.path;
      signed = await adminSb.storage.from("invoices").createSignedUrl(path, 120);
      if (signed.error || !signed.data) {
        throw signed.error ?? new Error("failed to sign");
      }
      // pdf_url を保存パスで更新 (生成済みフラグ兼用)
      await adminSb.from("invoices").update({ pdf_url: path }).eq("id", params.id);
    }

    return NextResponse.redirect(signed.data.signedUrl, 302);
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: "PDF を開けませんでした", detail: message }, { status: 500 });
  }
}
