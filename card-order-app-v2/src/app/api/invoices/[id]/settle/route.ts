// 最終精算 API (admin)
//
// 保証金(deposit)請求書に紐づくカット発注の確定数量から満額を再計算し、
// 預かった保証金(paid_amount)を充当して差額請求(final)または返金(refund)を作成する。
//   net = 確定満額(税込) - 保証金入金額
//   net > 0 → final 請求書 (今回ご請求額 = net)
//   net < 0 → refund 請求書 (返金額 = -net) + 支払通知書で対応
//   net = 0 → 精算済み (追加請求なし)
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { calcRebate, aggregateRebate } from "@/lib/rebate";
import { calcSettlement } from "@/lib/deposit";
import { nextInvoiceNumber } from "@/lib/invoice-number";
import { writeAudit } from "@/lib/audit";
import { notifyShop } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    // 保証金請求書 + ショップ
    const { data: deposit } = await supabase
      .from("invoices")
      .select("*, shops(company_name)")
      .eq("id", params.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!deposit) return NextResponse.json({ error: "請求書が見つかりません" }, { status: 404 });
    if (deposit.invoice_kind !== "deposit") {
      return NextResponse.json({ error: "保証金請求書のみ精算できます" }, { status: 400 });
    }

    // 二重精算の防止
    const { data: existingChild } = await supabase
      .from("invoices")
      .select("id, invoice_number, invoice_kind")
      .eq("parent_invoice_id", deposit.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (existingChild) {
      return NextResponse.json(
        { error: `既に精算済みです (${existingChild.invoice_number})` },
        { status: 409 },
      );
    }

    // 紐づく発注を取得
    const { data: depItems } = await supabase
      .from("invoice_items")
      .select("order_id")
      .eq("invoice_id", deposit.id);
    const orderIds = (depItems ?? []).map((i) => i.order_id);
    if (orderIds.length === 0) {
      return NextResponse.json({ error: "対象発注がありません" }, { status: 400 });
    }

    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .in("id", orderIds)
      .is("deleted_at", null);
    if (!orders || orders.length === 0) {
      return NextResponse.json({ error: "対象発注が見つかりません" }, { status: 400 });
    }
    const notConfirmed = orders.filter((o) => o.status !== "確定" || o.confirmed_qty == null);
    if (notConfirmed.length > 0) {
      return NextResponse.json(
        { error: "未確定の発注があります。全ての対象発注を「確定」にしてください" },
        { status: 400 },
      );
    }

    // 確定満額(リベート+税込)を計算
    const lines = orders.map((o) =>
      calcRebate({
        unitPrice: o.unit_price ?? 0,
        confirmedQty: o.confirmed_qty ?? 0,
        listedRate: o.listed_rate,
        rebateRate: o.rebate_rate,
      }),
    );
    const totals = aggregateRebate(lines);
    const depositPaid = deposit.paid_amount;
    const { kind, amount } = calcSettlement({ finalTotal: totals.totalAmount, depositPaid });

    if (kind === "settled") {
      await writeAudit(supabase, {
        adminId: user.id,
        shopId: deposit.shop_id,
        action: "settle_deposit_even",
        targetTable: "invoices",
        targetId: deposit.id,
        after: { final_total: totals.totalAmount, deposit_paid: depositPaid },
      });
      return NextResponse.json({ ok: true, kind, amount: 0, message: "保証金と一致したため追加請求はありません" });
    }

    const invoiceNumber = await nextInvoiceNumber(supabase, new Date());
    const { data: child, error: childErr } = await supabase
      .from("invoices")
      .insert({
        shop_id: deposit.shop_id,
        invoice_number: invoiceNumber,
        rank_at_issue: deposit.rank_at_issue,
        invoice_kind: kind, // 'final' | 'refund'
        parent_invoice_id: deposit.id,
        deposit_applied: depositPaid,
        subtotal: totals.subtotal,
        rebate_rate: orders[0]!.rebate_rate,
        rebate_amount: totals.rebateAmount,
        taxable_amount: totals.taxableAmount,
        tax_amount: totals.taxAmount,
        total_amount: amount, // final=差額 / refund=返金額 (いずれも正の額)
        status: "未入金",
      } satisfies Partial<import("@/types/database").Invoice>)
      .select("*")
      .single();
    if (childErr || !child) {
      return NextResponse.json({ error: childErr?.message ?? "精算請求の作成に失敗" }, { status: 500 });
    }

    // 明細 (確定発注を満額で紐付け)
    await supabase.from("invoice_items").insert(
      orders.map((o, idx) => ({ invoice_id: child.id, order_id: o.id, line_total: lines[idx]!.totalAmount })),
    );

    // 各発注の最終金額を確定値で更新 (整合性)
    for (let i = 0; i < orders.length; i++) {
      await supabase
        .from("orders")
        .update({
          subtotal: lines[i]!.subtotal,
          rebate_amount: lines[i]!.rebateAmount,
          total_price: lines[i]!.totalAmount,
        })
        .eq("id", orders[i]!.id);
    }

    await writeAudit(supabase, {
      adminId: user.id,
      shopId: deposit.shop_id,
      action: kind === "final" ? "issue_final_invoice" : "issue_refund",
      targetTable: "invoices",
      targetId: child.id,
      after: { invoice_number: invoiceNumber, kind, amount, deposit_applied: depositPaid },
    });

    await notifyShop({
      supabase,
      shopId: deposit.shop_id,
      templateCode: kind === "final" ? "final_invoice_issued" : "refund_notice_issued",
      vars: {
        company_name: (deposit.shops as unknown as { company_name?: string } | null)?.company_name ?? "",
        invoice_number: invoiceNumber,
        total_amount: amount.toLocaleString(),
      },
    });

    return NextResponse.json({ ok: true, kind, amount, invoice: child });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: "精算に失敗しました", detail: message }, { status: 500 });
  }
}
