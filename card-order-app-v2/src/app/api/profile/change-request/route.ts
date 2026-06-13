// ショップからの登録情報変更申請 API (承認制フィールド用)
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { notifyShop } from "@/lib/notify";
import { writeAudit } from "@/lib/audit";

const FIELD_LABEL: Record<string, string> = {
  delivery_address: "配送先住所",
  company_name: "会社名・屋号",
  address: "登録住所",
};

const Schema = z.object({
  field: z.enum(["delivery_address"]), // 現状ショップから申請できるのは配送先のみ
  newValue: z.string().min(1).max(500),
  reason: z.string().max(500).nullable(),
});

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "invalid" }, { status: 400 });
  }

  const { data: shop } = await supabase
    .from("shops")
    .select("id, company_name, delivery_address")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!shop) return NextResponse.json({ error: "shop not found" }, { status: 404 });

  // 同一フィールドの pending 申請があれば重複防止
  const { data: existing } = await supabase
    .from("shop_change_requests")
    .select("id")
    .eq("shop_id", shop.id)
    .eq("field", body.field)
    .eq("status", "pending")
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "確認中の申請があります。完了までお待ちください。" },
      { status: 409 },
    );
  }

  const { data: created, error } = await supabase
    .from("shop_change_requests")
    .insert({
      shop_id: shop.id,
      field: body.field,
      current_value: shop.delivery_address,
      new_value: body.newValue,
      reason: body.reason,
    })
    .select("*")
    .single();
  if (error || !created) {
    return NextResponse.json({ error: error?.message ?? "申請の作成に失敗しました" }, { status: 500 });
  }

  // 受付通知 (ショップ宛て)
  await notifyShop({
    supabase,
    shopId: shop.id,
    templateCode: "change_requested",
    vars: {
      company_name: shop.company_name,
      field_label: FIELD_LABEL[body.field] ?? body.field,
      new_value: body.newValue,
    },
  });

  await writeAudit(supabase, {
    shopId: shop.id,
    action: "shop_change_request_created",
    targetTable: "shop_change_requests",
    targetId: created.id,
    after: { field: body.field, new_value: body.newValue },
  });

  return NextResponse.json({ ok: true, request: created });
}
