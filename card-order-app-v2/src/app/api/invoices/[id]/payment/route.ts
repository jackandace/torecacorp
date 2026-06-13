// 入金消込 API
//
// - 部分入金対応: amount を paid_amount に加算
// - ステータス自動遷移: paid_amount > 0 && < total → 一部入金 / >= total → 入金済み
// - 楽観的ロック
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import type { Invoice } from "@/types/database";

const Schema = z.object({
  amount: z.number().int().positive().max(1_000_000_000), // 上限 10 億円 (異常値ガード)
  paidAt: z.string().date(),
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

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!invoice) return NextResponse.json({ error: "not found" }, { status: 404 });

  const newPaid = invoice.paid_amount + body.amount;
  if (newPaid > invoice.total_amount) {
    return NextResponse.json(
      { error: `合計 ${invoice.total_amount} 円を超える入金は記録できません` },
      { status: 400 },
    );
  }

  const update: Partial<Invoice> = {
    paid_amount: newPaid,
    status: newPaid >= invoice.total_amount ? "入金済み" : "一部入金",
  };
  if (newPaid >= invoice.total_amount) {
    update.paid_at = body.paidAt;
  }

  const { data: updated, error } = await supabase
    .from("invoices")
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
    shopId: invoice.shop_id,
    action: "record_payment",
    targetTable: "invoices",
    targetId: invoice.id,
    before: { paid_amount: invoice.paid_amount, status: invoice.status },
    after: { paid_amount: updated.paid_amount, status: updated.status, payment: body.amount, paid_at: body.paidAt },
  });

  return NextResponse.json({ ok: true, invoice: updated });
}
