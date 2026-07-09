// 支払通知書(返金案内) PDF ダウンロード (GET)
//
// 返金請求 (invoice_kind='refund') に対し、開く瞬間に都度署名してリダイレクト。
// 未生成ならその場で生成する。アクセス: 管理者 or 当該ショップ本人。
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";
import { renderPdfToBuffer } from "@/lib/pdf/render";
import { PaymentNoticePdf } from "@/lib/pdf/payment-notice";
import { ISSUER } from "@/lib/pdf/issuer";
import type { Shop } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noticePath(id: string): string {
  return `payment-notices/${id}.pdf`;
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: invoice } = await supabase
      .from("invoices")
      .select("*, shops(*)")
      .eq("id", params.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!invoice) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (invoice.invoice_kind !== "refund") {
      return NextResponse.json({ error: "返金(refund)請求のみ支払通知書を発行できます" }, { status: 400 });
    }

    // 管理者以外は当該ショップ本人のみ
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
    const path = noticePath(params.id);

    let signed = await adminSb.storage.from("invoices").createSignedUrl(path, 120);
    if (signed.error || !signed.data) {
      const shop = invoice.shops as unknown as Shop;
      // 対象商品名を取得 (摘要用)
      const { data: items } = await adminSb
        .from("invoice_items")
        .select("orders(products(title))")
        .eq("invoice_id", invoice.id);
      const productNames = [
        ...new Set(
          (items ?? [])
            .map((it) => (it.orders as unknown as { products?: { title?: string } } | null)?.products?.title)
            .filter((t): t is string => !!t),
        ),
      ].join(" / ");

      const buf = await renderPdfToBuffer(
        PaymentNoticePdf({
          invoice,
          shop,
          issuedAt: invoice.issued_at.slice(0, 10),
          productNames,
          issuer: ISSUER,
        }),
      );
      const { error: upErr } = await adminSb.storage
        .from("invoices")
        .upload(path, buf, { contentType: "application/pdf", upsert: true });
      if (upErr) throw upErr;
      signed = await adminSb.storage.from("invoices").createSignedUrl(path, 120);
      if (signed.error || !signed.data) throw signed.error ?? new Error("failed to sign");
    }

    return NextResponse.redirect(signed.data.signedUrl, 302);
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: "支払通知書を開けませんでした", detail: message }, { status: 500 });
  }
}
