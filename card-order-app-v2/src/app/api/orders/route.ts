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
import { notifyShop } from "@/lib/notify";

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

  // 各商品をバリデーション
  const created: string[] = [];
  const errors: { productId: string; error: string }[] = [];

  for (const item of body.items) {
    const { data: product } = await supabase
      .from("products")
      .select("*")
      .eq("id", item.productId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!product) {
      errors.push({ productId: item.productId, error: "product not found" });
      continue;
    }
    const v = validateOrderQty({ product, orderUnit: item.unit, qty: item.qty });
    if (!v.ok) {
      errors.push({ productId: item.productId, error: v.error ?? "invalid" });
      continue;
    }

    const listedRate = getListedRate(product, shop);

    const { data: inserted, error: insertErr } = await supabase
      .from("orders")
      .insert({
        shop_id: shop.id,
        product_id: product.id,
        order_unit: item.unit,
        requested_qty: item.qty,
        requested_qty_box: v.qtyInBox,
        listed_rate: listedRate,
        rebate_rate: rebateRate,
        unit_price: product.price ?? 0,
        status: "リクエスト",
        shipping_status: "未出荷",
        consent_agreed_at: body.consentAgreedAt,
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      errors.push({ productId: item.productId, error: insertErr?.message ?? "insert failed" });
      continue;
    }
    created.push(inserted.id);
    await writeAudit(supabase, {
      shopId: shop.id,
      action: "create_order",
      targetTable: "orders",
      targetId: inserted.id,
      after: { product_id: product.id, qty: item.qty, unit: item.unit },
    });
  }

  // 受領通知 (失敗してもメイン処理は続行)
  if (created.length > 0) {
    const { data: titles } = await supabase
      .from("products")
      .select("title")
      .in("id", body.items.map((i) => i.productId));
    await notifyShop({
      supabase,
      shopId: shop.id,
      templateCode: "order_received",
      vars: {
        company_name: shop.company_name,
        order_count: created.length,
        product_titles: (titles ?? []).map((t) => t.title).join(", "),
      },
    });
  }

  return NextResponse.json({
    created,
    errors,
  }, { status: errors.length > 0 && created.length === 0 ? 400 : 200 });
}
