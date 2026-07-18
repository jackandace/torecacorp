// 問屋の出荷登録 API — 自社商品の確定発注に配送会社・追跡番号を入れて出荷済へ + ショップ自動通知
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupplierContext } from "@/lib/supplier";
import { notifyShop } from "@/lib/notify";
import { writeAudit } from "@/lib/audit";
import type { Order } from "@/types/database";

export const dynamic = "force-dynamic";

const Schema = z.object({
  rows: z.array(z.object({
    orderId: z.string().uuid(),
    carrier: z.string().max(60).nullable().optional(),
    trackingNumber: z.string().min(1).max(60),
  })).min(1).max(500),
});

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
  // 自社商品IDの集合
  const { data: prods } = await admin.from("products").select("id").eq("supplier_id", ctx.supplierId);
  const prodIds = new Set((prods ?? []).map((p) => p.id));

  const ids = body.rows.map((r) => r.orderId);
  const { data: orders } = await admin
    .from("orders")
    .select("id, product_id, shop_id, shipping_status, products(title), shops(company_name)")
    .in("id", ids)
    .is("deleted_at", null);
  const byId = new Map((orders ?? []).map((o) => [o.id, o]));

  let updated = 0;
  let notified = 0;
  for (const row of body.rows) {
    const o = byId.get(row.orderId);
    if (!o || !prodIds.has(o.product_id)) continue; // 自社商品でない発注は無視(安全)
    const wasShipped = o.shipping_status === "出荷済" || o.shipping_status === "配送中" || o.shipping_status === "完了";
    const upd: Partial<Order> = {
      carrier: row.carrier?.trim() || null,
      tracking_number: row.trackingNumber.trim(),
      shipping_status: "出荷済",
    };
    if (!wasShipped) upd.shipped_at = new Date().toISOString();
    const { error } = await admin.from("orders").update(upd).eq("id", o.id);
    if (error) continue;
    updated++;

    if (!wasShipped) {
      const shop = o.shops as unknown as { company_name?: string } | null;
      const product = o.products as unknown as { title?: string } | null;
      await notifyShop({
        supabase: admin,
        shopId: o.shop_id,
        templateCode: "order_shipped",
        vars: {
          company_name: shop?.company_name ?? "",
          product_title: product?.title ?? "",
          tracking_number: row.trackingNumber.trim(),
        },
      });
      notified++;
    }
  }

  await writeAudit(supabase, {
    adminId: ctx.userId,
    action: "supplier_ship",
    targetTable: "orders",
    targetId: ctx.supplierId,
    after: { supplier_id: ctx.supplierId, updated, notified },
  });

  return NextResponse.json({ ok: true, updated, notified });
}
