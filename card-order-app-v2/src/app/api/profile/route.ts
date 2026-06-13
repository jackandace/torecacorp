// ショップ自身のプロフィール更新 API
//
// なりすまし対策のため、直接変更できるのは担当者名・電話番号のみ。
//   - 会社名・登録住所・メール: 変更不可 (admin のみ)
//   - 配送先住所: /api/profile/change-request の承認フロー経由
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";

const Schema = z.object({
  contactName: z.string().min(1).max(100),
  phone: z.string().max(30).nullable(),
  lastUpdatedAt: z.string(),
});

export async function PATCH(request: NextRequest) {
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
    .select("*")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!shop) return NextResponse.json({ error: "shop not found" }, { status: 404 });

  const { data: updated, error } = await supabase
    .from("shops")
    .update({
      contact_name: body.contactName,
      phone: body.phone,
    })
    .eq("id", shop.id)
    .eq("updated_at", body.lastUpdatedAt)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated) {
    return NextResponse.json(
      { error: "データが他のセッションで更新されています。再読み込みしてください" },
      { status: 409 },
    );
  }

  await writeAudit(supabase, {
    shopId: shop.id,
    action: "shop_self_update_contact",
    targetTable: "shops",
    targetId: shop.id,
    before: { contact_name: shop.contact_name, phone: shop.phone },
    after: { contact_name: updated.contact_name, phone: updated.phone },
  });

  return NextResponse.json({ ok: true });
}
