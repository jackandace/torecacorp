// 購入履歴 (アプリ運用以前) と過去請求書の紐付け / 解除 (admin)
//
// 請求書1枚に複数の購入履歴行を紐付ける。紐付けた請求書はお客様のマイページの
// 購入履歴の行からもダウンロードできるようになるため、次をサーバ側で必ず検証する:
//   - 請求書が「このショップの」「過去請求書 (is_legacy)」で削除されていないこと
//   - 対象の購入履歴行がすべて「このショップの」未削除の行であること
// (別のお客様の請求書を誤って紐付けて見せてしまう事故を構造的に防ぐ)
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const Schema = z.object({
  purchaseIds: z.array(z.string().uuid()).min(1).max(1000),
  invoiceId: z.string().uuid().nullable(), // null = 紐付け解除
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "対象の行を選択してください" }, { status: 400 });
  }

  if (body.invoiceId) {
    const { data: inv } = await supabase
      .from("invoices")
      .select("id, shop_id, is_legacy")
      .eq("id", body.invoiceId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!inv || inv.shop_id !== params.id || !inv.is_legacy) {
      return NextResponse.json({ error: "このお客様の過去請求書ではないため紐付けできません" }, { status: 400 });
    }
  }

  const ids = [...new Set(body.purchaseIds)];
  const { data: rows } = await supabase
    .from("legacy_purchases")
    .select("id, legacy_invoice_id")
    .in("id", ids)
    .eq("shop_id", params.id)
    .is("deleted_at", null);
  if ((rows ?? []).length !== ids.length) {
    return NextResponse.json({ error: "このお客様の購入履歴ではない行が含まれています" }, { status: 400 });
  }

  const { error } = await supabase
    .from("legacy_purchases")
    .update({ legacy_invoice_id: body.invoiceId, updated_by: user.id })
    .in("id", ids)
    .eq("shop_id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit(supabase, {
    adminId: user.id,
    shopId: params.id,
    action: body.invoiceId ? "link_legacy_purchases_invoice" : "unlink_legacy_purchases_invoice",
    targetTable: "legacy_purchases",
    targetId: body.invoiceId ?? params.id,
    before: { rows: (rows ?? []).map((r) => ({ id: r.id, legacy_invoice_id: r.legacy_invoice_id })) },
    after: { legacy_invoice_id: body.invoiceId, count: ids.length },
  });
  return NextResponse.json({ ok: true, updated: ids.length });
}
