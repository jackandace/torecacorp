// 発注リクエスト作成 API
//
// - 認証必須 (ショップ本人 or 管理者)
// - 商品ごとに数量バリデーション
// - 免責事項同意日時を記録 (consent_agreed_at が NULL の発注は弾く)
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getListedRate } from "@/lib/rebate";
import { validateOrderQty } from "@/lib/orders";
import { writeAudit } from "@/lib/audit";
import { notifyShop, notifyOrderToStaff } from "@/lib/notify";
import type { Order } from "@/types/database";

const PayloadSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        unit: z.enum(["BOX", "CT"]),
        qty: z.number().int().positive(),
      }),
    )
    .min(1),
  consentAgreedAt: z.string().datetime(),
});

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof PayloadSchema>;
  try {
    body = PayloadSchema.parse(await request.json());
  } catch (e) {
    return NextResponse.json(
      { error: "invalid payload", detail: e instanceof Error ? e.message : "unknown" },
      { status: 400 },
    );
  }

  // ショップを取得
  const { data: shop } = await supabase
    .from("shops")
    .select("*")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!shop) {
    return NextResponse.json({ error: "shop not found" }, { status: 404 });
  }

  // ショップの現在リベート率を取得
  const { data: rankSetting } = await supabase
    .from("rank_settings")
    .select("rebate_rate")
    .eq("rank", shop.current_rank)
    .maybeSingle();
  const rebateRate = rankSetting?.rebate_rate ?? 0;

  // 対象商品をまとめて 1 回で取得 (N+1 回避)
  const productIds = [...new Set(body.items.map((i) => i.productId))];
  const { data: productList } = await supabase
    .from("products")
    .select("*")
    .in("id", productIds)
    .is("deleted_at", null);
  const productMap = new Map((productList ?? []).map((p) => [p.id, p]));

  // バリデーション → insert 行をまとめて構築
  const created: string[] = [];
  const createdItems: { series: string | null; title: string; qty: number; unit: string; qtyInBox: number }[] = [];
  const errors: { productId: string; error: string }[] = [];
  const insertRows: Partial<Order>[] = [];
  const rowMeta: { productId: string; series: string | null; title: string; qty: number; unit: string; qtyInBox: number }[] = [];

  for (const item of body.items) {
    const product = productMap.get(item.productId);
    if (!product) {
      errors.push({ productId: item.productId, error: "product not found" });
      continue;
    }
    const v = validateOrderQty({ product, orderUnit: item.unit, qty: item.qty });
    if (!v.ok) {
      errors.push({ productId: item.productId, error: v.error ?? "invalid" });
      continue;
    }
    insertRows.push({
      shop_id: shop.id,
      product_id: product.id,
      order_unit: item.unit,
      requested_qty: item.qty,
      requested_qty_box: v.qtyInBox,
      listed_rate: getListedRate(product, shop),
      rebate_rate: rebateRate,
      unit_price: product.price ?? 0,
      status: "リクエスト",
      shipping_status: "未出荷",
      consent_agreed_at: body.consentAgreedAt,
    } satisfies Partial<Order>);
    rowMeta.push({
      productId: product.id,
      series: product.series,
      title: product.title,
      qty: item.qty,
      unit: item.unit,
      qtyInBox: v.qtyInBox,
    });
  }

  // まとめて 1 回で insert
  if (insertRows.length > 0) {
    const { data: insertedRows, error: insertErr } = await supabase
      .from("orders")
      .insert(insertRows)
      .select("id");
    if (insertErr || !insertedRows) {
      return NextResponse.json({ error: insertErr?.message ?? "insert failed" }, { status: 500 });
    }
    for (let i = 0; i < insertedRows.length; i++) {
      created.push(insertedRows[i]!.id);
      const m = rowMeta[i]!;
      createdItems.push({ series: m.series, title: m.title, qty: m.qty, unit: m.unit, qtyInBox: m.qtyInBox });
      await writeAudit(supabase, {
        shopId: shop.id,
        action: "create_order",
        targetTable: "orders",
        targetId: insertedRows[i]!.id,
        after: { product_id: m.productId, qty: m.qty, unit: m.unit },
      });
    }
  }

  // 通知 (失敗してもメイン処理は続行)
  if (created.length > 0) {
    // 1. ショップへの受領通知
    await notifyShop({
      supabase,
      shopId: shop.id,
      templateCode: "order_received",
      vars: {
        company_name: shop.company_name,
        order_count: created.length,
        product_titles: createdItems.map((i) => i.title).join(", "),
      },
    });
    // 2. 社内 admin + 問屋担当へのリクエスト通知 (ORDER_NOTIFY_EMAILS 宛て)
    await notifyOrderToStaff({
      supabase,
      shopName: shop.company_name,
      items: createdItems,
    });
  }

  return NextResponse.json({
    created,
    errors,
  }, { status: errors.length > 0 && created.length === 0 ? 400 : 200 });
}
