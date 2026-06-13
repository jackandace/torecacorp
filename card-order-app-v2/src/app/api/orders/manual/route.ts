// システム外受注の手動登録 API (admin)
//
// - 受注日 (orderedAt) を created_at / consent_agreed_at に設定し、
//   月次集計・ランク計算に正しく乗せる
// - status=確定 の場合は products.ordered_qty を加算 (在庫引き当て)
// - 金額 (掛け率・リベート率) はショップの現在ランク・個別設定から確定
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { getListedRate, calcRebate } from "@/lib/rebate";
import { buildRankSettingsMap } from "@/lib/ranks";
import { writeAudit } from "@/lib/audit";

const Schema = z.object({
  shopId: z.string().uuid(),
  productId: z.string().uuid(),
  unit: z.enum(["BOX", "CT"]),
  qty: z.number().int().positive().max(1_000_000),
  confirmedQty: z.number().int().min(0).max(1_000_000).nullable(),
  status: z.enum(["リクエスト", "仮確定", "確定"]),
  shippingStatus: z.enum(["未出荷", "準備中", "出荷済", "配送中", "完了"]),
  trackingNumber: z.string().max(100).nullable(),
  orderedAt: z.string(), // YYYY-MM-DD
  note: z.string().max(500).nullable(),
});

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "invalid" }, { status: 400 });
  }

  const [{ data: shop }, { data: product }, { data: rankRows }] = await Promise.all([
    supabase.from("shops").select("*").eq("id", body.shopId).is("deleted_at", null).maybeSingle(),
    supabase.from("products").select("*").eq("id", body.productId).is("deleted_at", null).maybeSingle(),
    supabase.from("rank_settings").select("*"),
  ]);
  if (!shop) return NextResponse.json({ error: "ショップが見つかりません" }, { status: 404 });
  if (!product) return NextResponse.json({ error: "商品が見つかりません" }, { status: 404 });

  const settings = buildRankSettingsMap(rankRows ?? []);
  const rebateRate = settings[shop.current_rank].rebate;
  const listedRate = getListedRate(product, shop);
  const qtyInBox = body.unit === "CT" ? body.qty * product.ct_to_box : body.qty;
  const confirmedQty = body.confirmedQty ?? qtyInBox;

  // 金額 (確定/仮確定のみ計算。リクエストは未確定なので null)
  let amounts: { subtotal: number | null; rebate_amount: number | null; total_price: number | null } = {
    subtotal: null, rebate_amount: null, total_price: null,
  };
  if (body.status !== "リクエスト" && confirmedQty > 0) {
    const calc = calcRebate({
      unitPrice: product.price ?? 0,
      confirmedQty,
      listedRate,
      rebateRate,
    });
    amounts = {
      subtotal: calc.subtotal,
      rebate_amount: calc.rebateAmount,
      total_price: calc.totalAmount,
    };
  }

  const orderedAtIso = new Date(`${body.orderedAt}T09:00:00+09:00`).toISOString();
  const adminNote = [
    `【管理者代理登録】システム外受注分 (登録者: ${user.email ?? user.id})`,
    body.note,
  ].filter(Boolean).join(" / ");

  const { data: inserted, error } = await supabase
    .from("orders")
    .insert({
      shop_id: shop.id,
      product_id: product.id,
      order_unit: body.unit,
      requested_qty: body.qty,
      requested_qty_box: qtyInBox,
      provisional_qty: body.status !== "リクエスト" ? confirmedQty : null,
      confirmed_qty: body.status === "確定" ? confirmedQty : null,
      listed_rate: listedRate,
      rebate_rate: rebateRate,
      unit_price: product.price ?? 0,
      subtotal: amounts.subtotal,
      rebate_amount: amounts.rebate_amount,
      total_price: amounts.total_price,
      status: body.status,
      shipping_status: body.shippingStatus,
      tracking_number: body.trackingNumber,
      consent_agreed_at: orderedAtIso,   // 代理登録: 受注日を同意日時として記録
      admin_note: adminNote,
      confirmed_at: body.status === "確定" ? orderedAtIso : null,
      shipped_at: ["出荷済", "配送中", "完了"].includes(body.shippingStatus) ? orderedAtIso : null,
      created_at: orderedAtIso,          // 受注日で記録 (月次集計に正しく反映)
    })
    .select("*")
    .single();

  if (error || !inserted) {
    return NextResponse.json({ error: error?.message ?? "登録失敗" }, { status: 500 });
  }

  // 確定の場合は在庫を引き当て
  if (body.status === "確定" && confirmedQty > 0) {
    await supabase.rpc("increment_product_ordered_qty", {
      p_product_id: product.id,
      p_delta: confirmedQty,
    });
  }

  await writeAudit(supabase, {
    adminId: user.id,
    shopId: shop.id,
    action: "manual_order_entry",
    targetTable: "orders",
    targetId: inserted.id,
    after: {
      product: product.title,
      qty: body.qty,
      unit: body.unit,
      status: body.status,
      shipping: body.shippingStatus,
      ordered_at: body.orderedAt,
    },
  });

  return NextResponse.json({ ok: true, order: inserted });
}
