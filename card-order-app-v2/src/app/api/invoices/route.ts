// 請求書発行 API (admin)
//
// 入力: shop_id + order_ids (発注 ID リスト)
// 処理:
//   1. 各発注の確定数量と発注時の listed_rate/rebate_rate を使って明細計算
//   2. 合算してリベート・税を計算
//   3. INV-YYYYMM-NNNN を採番
//   4. invoices / invoice_items を作成
//   5. PDF 生成は別ジョブで実施 (この API では URL を返さない)
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { calcRebate, aggregateRebate } from "@/lib/rebate";
import { nextInvoiceNumber } from "@/lib/invoice-number";
import { writeAudit } from "@/lib/audit";
import { notifyShop } from "@/lib/notify";

const Schema = z.object({
  shopId: z.string().uuid(),
  orderIds: z.array(z.string().uuid()).min(1),
  dueDate: z.string().date().optional(),
});

export async function POST(request: NextRequest) {
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

  const { data: shop } = await supabase
    .from("shops")
    .select("*")
    .eq("id", body.shopId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!shop) return NextResponse.json({ error: "shop not found" }, { status: 404 });

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .in("id", body.orderIds)
    .eq("shop_id", body.shopId)
    .eq("status", "確定")
    .is("deleted_at", null);

  if (!orders || orders.length === 0) {
    return NextResponse.json({ error: "no confirmed orders" }, { status: 400 });
  }

  const lines = orders.map((o) =>
    calcRebate({
      unitPrice: o.unit_price ?? 0,
      confirmedQty: o.confirmed_qty ?? 0,
      listedRate: o.listed_rate,
      rebateRate: o.rebate_rate,
    }),
  );
  const totals = aggregateRebate(lines);

  const invoiceNumber = await nextInvoiceNumber(supabase, new Date());

  const { data: inserted, error: insertErr } = await supabase
    .from("invoices")
    .insert({
      shop_id: shop.id,
      invoice_number: invoiceNumber,
      rank_at_issue: shop.current_rank,
      subtotal: totals.subtotal,
      rebate_rate: orders[0]!.rebate_rate, // ショップ単位なので全 line 共通の想定
      rebate_amount: totals.rebateAmount,
      taxable_amount: totals.taxableAmount,
      tax_amount: totals.taxAmount,
      total_amount: totals.totalAmount,
      status: "未入金",
      due_date: body.dueDate ?? null,
    })
    .select("*")
    .single();

  if (insertErr || !inserted) {
    return NextResponse.json({ error: insertErr?.message ?? "insert failed" }, { status: 500 });
  }

  // invoice_items を作成
  const items = orders.map((o, idx) => ({
    invoice_id: inserted.id,
    order_id: o.id,
    line_total: lines[idx]!.totalAmount,
  }));
  await supabase.from("invoice_items").insert(items);

  // 各発注の total_price も最終確定値に更新 (整合性のため)
  for (let i = 0; i < orders.length; i++) {
    const o = orders[i]!;
    const l = lines[i]!;
    await supabase
      .from("orders")
      .update({
        subtotal: l.subtotal,
        rebate_amount: l.rebateAmount,
        total_price: l.totalAmount,
      })
      .eq("id", o.id);
  }

  await writeAudit(supabase, {
    adminId: user.id,
    shopId: shop.id,
    action: "issue_invoice",
    targetTable: "invoices",
    targetId: inserted.id,
    after: { invoice_number: invoiceNumber, total: totals.totalAmount },
  });

  // 発行通知
  await notifyShop({
    supabase,
    shopId: shop.id,
    templateCode: "invoice_issued",
    vars: {
      company_name: shop.company_name,
      invoice_number: invoiceNumber,
      total_amount: totals.totalAmount.toLocaleString(),
      due_date: body.dueDate ?? "(別途ご案内)",
    },
  });

  return NextResponse.json({
    ok: true,
    invoice: inserted,
    breakdown: totals,
  });
}
