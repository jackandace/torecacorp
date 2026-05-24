// 発送ステータス更新 API
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { notifyShop } from "@/lib/notify";
import type { Order } from "@/types/database";

const Schema = z.object({
  shippingStatus: z.enum(["未出荷", "準備中", "出荷済", "配送中", "完了"]),
  trackingNumber: z.string().nullable().optional(),
  lastUpdatedAt: z.string(),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "invalid" }, { status: 400 });
  }

  const { data: before } = await supabase
    .from("orders")
    .select("shipping_status, tracking_number, shop_id")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!before) return NextResponse.json({ error: "not found" }, { status: 404 });

  const update: Partial<Order> = {
    shipping_status: body.shippingStatus,
    tracking_number: body.trackingNumber ?? null,
  };
  if (body.shippingStatus === "出荷済" || body.shippingStatus === "配送中") {
    update.shipped_at = new Date().toISOString();
  }

  const { data: updated, error } = await supabase
    .from("orders")
    .update(update)
    .eq("id", params.id)
    .eq("updated_at", body.lastUpdatedAt)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated) {
    return NextResponse.json(
      { error: "データが他のユーザーにより更新されています。再読み込みしてください" },
      { status: 409 },
    );
  }

  await writeAudit(supabase, {
    adminId: user.id,
    shopId: before.shop_id,
    action: "update_shipping",
    targetTable: "orders",
    targetId: params.id,
    before: { shipping_status: before.shipping_status, tracking_number: before.tracking_number },
    after: { shipping_status: updated.shipping_status, tracking_number: updated.tracking_number },
  });

  // 出荷済への遷移時に発送通知
  if (
    before.shipping_status !== "出荷済" &&
    (updated.shipping_status === "出荷済" || updated.shipping_status === "配送中")
  ) {
    const { data: shop } = await supabase
      .from("shops")
      .select("company_name")
      .eq("id", updated.shop_id)
      .maybeSingle();
    const { data: product } = await supabase
      .from("products")
      .select("title")
      .eq("id", updated.product_id)
      .maybeSingle();
    await notifyShop({
      supabase,
      shopId: updated.shop_id,
      templateCode: "order_shipped",
      vars: {
        company_name: shop?.company_name ?? "",
        product_title: product?.title ?? "",
        tracking_number: updated.tracking_number ?? "(未設定)",
      },
    });
  }

  return NextResponse.json({ ok: true });
}
