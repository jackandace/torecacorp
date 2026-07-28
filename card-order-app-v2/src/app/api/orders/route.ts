// 発注リクエスト作成 API
//
// - 認証必須 (ショップ本人 or 管理者)
// - 商品ごとに数量バリデーション
// - 免責事項同意日時を記録 (consent_agreed_at が NULL の発注は弾く)
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getListedRate } from "@/lib/rebate";
import { validateOrderQty } from "@/lib/orders";
import { calcDeposit, DEPOSIT_RATE } from "@/lib/deposit";
import { nextInvoiceNumber } from "@/lib/invoice-number";
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

  // カット品の保証金(前受金): 発注ID + 保証金額 + 適用率を集める
  const cutDeposits: { orderId: string; deposit: number; rate: number }[] = [];

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
      // カット品は保証金(希望BOX×既定率30%)を算出
      const product = productMap.get(m.productId);
      if (product?.flow_type === "cut") {
        const rate = product.deposit_rate ?? DEPOSIT_RATE; // 商品ごとの保証金率(null=既定30%)
        cutDeposits.push({
          orderId: insertedRows[i]!.id,
          deposit: calcDeposit({
            unitPrice: product.price ?? 0,
            qtyBox: m.qtyInBox,
            listedRate: getListedRate(product, shop),
            rate,
          }),
          rate,
        });
      }
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

  // カット品があれば保証金(前受金)請求書をオーダー時に自動発行 (best-effort)
  if (cutDeposits.length > 0) {
    try {
      const adminSb = createAdminClient();
      const depositTotal = cutDeposits.reduce((s, d) => s + d.deposit, 0);
      // 全明細の率が同一のときだけ invoices.deposit_rate に保存 (混在時は null → 表示側で明細から推定)
      const uniformRate = cutDeposits.every((d) => d.rate === cutDeposits[0]!.rate)
        ? cutDeposits[0]!.rate
        : null;
      const invoiceNumber = await nextInvoiceNumber(adminSb, new Date());
      const { data: dep, error: depErr } = await adminSb
        .from("invoices")
        .insert({
          shop_id: shop.id,
          invoice_number: invoiceNumber,
          rank_at_issue: shop.current_rank,
          invoice_kind: "deposit",
          deposit_rate: uniformRate,
          subtotal: depositTotal,
          rebate_rate: 0,
          rebate_amount: 0,
          taxable_amount: depositTotal,
          tax_amount: 0,
          total_amount: depositTotal,
          status: "未入金",
        } satisfies Partial<import("@/types/database").Invoice>)
        .select("id")
        .single();
      if (depErr || !dep) throw depErr ?? new Error("deposit invoice insert failed");

      await adminSb.from("invoice_items").insert(
        cutDeposits.map((d) => ({ invoice_id: dep.id, order_id: d.orderId, line_total: d.deposit })),
      );

      await notifyShop({
        supabase,
        shopId: shop.id,
        templateCode: "deposit_invoice_issued",
        vars: {
          company_name: shop.company_name,
          invoice_number: invoiceNumber,
          total_amount: depositTotal.toLocaleString(),
        },
      });
    } catch (e) {
      // 保証金請求の自動発行失敗は発注自体を止めない (管理者が後から発行可能)
      console.error("[orders] 保証金請求の自動発行に失敗:", e instanceof Error ? e.message : e);
    }
  }

  return NextResponse.json({
    created,
    errors,
  }, { status: errors.length > 0 && created.length === 0 ? 400 : 200 });
}
