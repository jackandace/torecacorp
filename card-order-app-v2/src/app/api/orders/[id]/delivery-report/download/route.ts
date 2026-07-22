// 納品報告書 PDF ダウンロード (GET) — 納品完了(delivered_at)済みの発注に対し発行。
// アクセス: 管理者 or 当該ショップ本人。都度署名・未生成なら遅延生成。
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";
import { renderPdfToBuffer } from "@/lib/pdf/render";
import { DeliveryReportPdf } from "@/lib/pdf/delivery-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: order } = await supabase
      .from("orders")
      .select("id, shop_id, delivered_at, confirmed_qty, requested_qty_box, order_unit, carrier, tracking_number, shops(company_name), products(title)")
      .eq("id", params.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (!order.delivered_at) return NextResponse.json({ error: "納品完了の発注のみ発行できます" }, { status: 400 });

    if (!isAdmin(user)) {
      const { data: shop } = await supabase.from("shops").select("id").eq("user_id", user.id).is("deleted_at", null).maybeSingle();
      if (!shop || shop.id !== order.shop_id) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const shop = order.shops as unknown as { company_name?: string } | null;
    const product = order.products as unknown as { title?: string } | null;
    const reportNo = `DR-${order.delivered_at.slice(0, 10).replace(/-/g, "")}-${order.id.slice(0, 6)}`;

    const adminSb = createAdminClient();
    const path = `delivery-reports/${order.id}.pdf`;
    let signed = await adminSb.storage.from("invoices").createSignedUrl(path, 120);
    if (signed.error || !signed.data) {
      const buf = await renderPdfToBuffer(
        DeliveryReportPdf({
          reportNo,
          deliveredAt: order.delivered_at.slice(0, 10),
          shopName: shop?.company_name ?? "",
          productTitle: product?.title ?? "",
          qty: order.confirmed_qty ?? order.requested_qty_box ?? 0,
          unit: order.order_unit,
          carrier: order.carrier,
          trackingNumber: order.tracking_number,
        }),
      );
      const { error: upErr } = await adminSb.storage.from("invoices").upload(path, buf, { contentType: "application/pdf", upsert: true });
      if (upErr) throw upErr;
      signed = await adminSb.storage.from("invoices").createSignedUrl(path, 120);
      if (signed.error || !signed.data) throw signed.error ?? new Error("failed to sign");
    }
    return NextResponse.redirect(signed.data.signedUrl, 302);
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: "納品報告書を開けませんでした", detail: message }, { status: 500 });
  }
}
