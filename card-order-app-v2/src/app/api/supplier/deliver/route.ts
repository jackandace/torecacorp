// 問屋の納品完了 API — delivered_at(=収益認識日)を記録し、ショップへ受領依頼メール送付
import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupplierContext } from "@/lib/supplier";
import { notifyShop } from "@/lib/notify";
import { writeAudit } from "@/lib/audit";
import type { Order } from "@/types/database";

export const dynamic = "force-dynamic";

const Schema = z.object({ orderIds: z.array(z.string().uuid()).min(1).max(500) });

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const ctx = await getSupplierContext(supabase);
  if (!ctx) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "invalid" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: prods } = await admin.from("products").select("id").eq("supplier_id", ctx.supplierId);
  const prodIds = new Set((prods ?? []).map((p) => p.id));
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://card-order-app-v2.vercel.app";

  const { data: orders } = await admin
    .from("orders")
    .select("id, product_id, shop_id, delivered_at, receipt_token, products(title), shops(company_name)")
    .in("id", body.orderIds)
    .is("deleted_at", null);

  let delivered = 0;
  let notified = 0;
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString();

  for (const o of orders ?? []) {
    if (!prodIds.has(o.product_id)) continue;       // 自社商品でない → 無視
    if (o.delivered_at) continue;                    // 既に納品完了
    const token = o.receipt_token ?? crypto.randomBytes(24).toString("hex");
    const upd: Partial<Order> = {
      delivered_at: now.toISOString(),
      shipping_status: "完了",
      receipt_token: token,
      receipt_token_expires_at: expires,
    };
    const { error } = await admin.from("orders").update(upd).eq("id", o.id);
    if (error) continue;
    delivered++;

    const shop = o.shops as unknown as { company_name?: string } | null;
    const product = o.products as unknown as { title?: string } | null;
    await notifyShop({
      supabase: admin,
      shopId: o.shop_id,
      templateCode: "order_delivered",
      vars: {
        company_name: shop?.company_name ?? "",
        product_title: product?.title ?? "",
        receipt_url: `${appUrl}/receipt/${token}`,
      },
    });
    notified++;
  }

  await writeAudit(supabase, {
    adminId: ctx.userId,
    action: "supplier_deliver",
    targetTable: "orders",
    targetId: ctx.supplierId,
    after: { supplier_id: ctx.supplierId, delivered, notified },
  });

  return NextResponse.json({ ok: true, delivered, notified });
}
