// 保証金(前受金・50%)請求書を手動発行する API (admin)
//
// メーカー提供カット品を管理画面で手入力した場合など、ショップ発注経由の
// 自動発行が走らないケース用。発注1件に対し保証金請求書を1通作成する。
// 発行後は請求詳細の「最終精算する」で差額/返金を作成できる。
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { calcDeposit } from "@/lib/deposit";
import { nextInvoiceNumber } from "@/lib/invoice-number";
import { writeAudit } from "@/lib/audit";
import { notifyShop } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const { data: order } = await supabase
      .from("orders")
      .select("*, shops(company_name), products(title)")
      .eq("id", params.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!order) return NextResponse.json({ error: "発注が見つかりません" }, { status: 404 });

    // 既存の保証金請求書があれば重複発行しない
    const { data: refItems } = await supabase
      .from("invoice_items")
      .select("invoice_id, invoices(invoice_kind, invoice_number, deleted_at)")
      .eq("order_id", order.id);
    const dup = (refItems ?? []).find((r) => {
      const inv = r.invoices as unknown as { invoice_kind?: string; deleted_at?: string | null } | null;
      return inv?.invoice_kind === "deposit" && !inv?.deleted_at;
    });
    if (dup) {
      const inv = dup.invoices as unknown as { invoice_number?: string };
      return NextResponse.json({ error: `既に保証金請求書があります (${inv?.invoice_number ?? ""})` }, { status: 409 });
    }

    const qtyBox = order.requested_qty_box ?? order.requested_qty;
    const deposit = calcDeposit({
      unitPrice: order.unit_price ?? 0,
      qtyBox,
      listedRate: order.listed_rate,
    });
    if (deposit <= 0) {
      return NextResponse.json({ error: "保証金額が0です(単価・数量・掛け率をご確認ください)" }, { status: 400 });
    }

    // ショップの発行時ランク
    const { data: shop } = await supabase
      .from("shops")
      .select("current_rank, company_name")
      .eq("id", order.shop_id)
      .maybeSingle();

    const invoiceNumber = await nextInvoiceNumber(supabase, new Date());
    const { data: inv, error: invErr } = await supabase
      .from("invoices")
      .insert({
        shop_id: order.shop_id,
        invoice_number: invoiceNumber,
        rank_at_issue: shop?.current_rank ?? "standard",
        invoice_kind: "deposit",
        subtotal: deposit,
        rebate_rate: 0,
        rebate_amount: 0,
        fee_amount: 0,
        taxable_amount: deposit,
        tax_amount: 0,
        total_amount: deposit,
        status: "未入金",
      } satisfies Partial<import("@/types/database").Invoice>)
      .select("*")
      .single();
    if (invErr || !inv) {
      return NextResponse.json({ error: invErr?.message ?? "発行失敗" }, { status: 500 });
    }

    await supabase.from("invoice_items").insert({ invoice_id: inv.id, order_id: order.id, line_total: deposit });

    await writeAudit(supabase, {
      adminId: user.id,
      shopId: order.shop_id,
      action: "issue_deposit_invoice",
      targetTable: "invoices",
      targetId: inv.id,
      after: { invoice_number: invoiceNumber, deposit, order_id: order.id },
    });

    await notifyShop({
      supabase,
      shopId: order.shop_id,
      templateCode: "deposit_invoice_issued",
      vars: {
        company_name: shop?.company_name ?? "",
        invoice_number: invoiceNumber,
        total_amount: deposit.toLocaleString(),
      },
    });

    // フォーム遷移: 発行した保証金請求書の詳細へ
    return NextResponse.redirect(new URL(`/admin/billing/${inv.id}`, request.url), 303);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown" }, { status: 500 });
  }
}
