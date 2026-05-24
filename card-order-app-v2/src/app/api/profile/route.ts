// ショップ自身のプロフィール更新 API
//
// shop ロールユーザーが自分の company_name / contact_name / phone / address /
// delivery_address のみ変更可能。email / status / current_rank / rate_override
// 等は変更不可 (admin のみ)。
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import type { Shop } from "@/types/database";

const Schema = z.object({
  companyName: z.string().min(1),
  contactName: z.string().min(1),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  deliveryAddress: z.string().nullable(),
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

  // 自分のショップを特定
  const { data: shop } = await supabase
    .from("shops")
    .select("*")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!shop) return NextResponse.json({ error: "shop not found" }, { status: 404 });

  const update: Partial<Shop> = {
    company_name: body.companyName,
    contact_name: body.contactName,
    phone: body.phone,
    address: body.address,
    delivery_address: body.deliveryAddress,
  };

  const { data: updated, error } = await supabase
    .from("shops")
    .update(update)
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
    action: "shop_self_update_profile",
    targetTable: "shops",
    targetId: shop.id,
    before: {
      company_name: shop.company_name,
      contact_name: shop.contact_name,
      phone: shop.phone,
    },
    after: {
      company_name: updated.company_name,
      contact_name: updated.contact_name,
      phone: updated.phone,
    },
  });

  return NextResponse.json({ ok: true });
}
