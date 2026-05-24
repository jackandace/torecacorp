// ショップ情報の更新 API (admin)
//
// email が変更された場合の挙動:
//   - 既存 shop.user_id が無く email が新規に入力された  → Auth ユーザーを新規作成 (email_confirm=true)
//   - email がクリア (null) された                       → user_id 解除のみ。Auth ユーザーは保持
//   - email 変更時 (user_id 既存)                       → Auth の email も更新
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import type { Shop } from "@/types/database";

const Schema = z.object({
  companyName: z.string().min(1),
  contactName: z.string().min(1),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  deliveryAddress: z.string().nullable(),
  status: z.enum(["pending", "active", "suspended"]),
  currentRank: z.enum(["platinum", "gold", "silver", "bronze", "standard"]),
  rateOverride: z.number().min(0).max(1).nullable(),
  businessType: z.enum(["ec_only", "physical_only", "physical_and_ec", "other"]).nullable(),
  openedAt: z.string().nullable(),
  lifetimeAmount: z.number().int().min(0),
  lastUpdatedAt: z.string(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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

  const { data: before } = await supabase
    .from("shops")
    .select("*")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!before) return NextResponse.json({ error: "not found" }, { status: 404 });

  const adminSb = createAdminClient();
  const emailChanged = (body.email ?? null) !== (before.email ?? null);
  let newUserId: string | null = before.user_id;

  // メアド変更時の Auth 連動
  if (emailChanged && body.email) {
    if (before.user_id) {
      // 既存ユーザーのメアド更新
      const { error: updErr } = await adminSb.auth.admin.updateUserById(before.user_id, {
        email: body.email,
      });
      if (updErr) {
        return NextResponse.json({ error: `Auth メアド更新失敗: ${updErr.message}` }, { status: 500 });
      }
    } else {
      // 新規 Auth ユーザー作成 (既存メアドなら ID 流用)
      const { data: created, error: createErr } = await adminSb.auth.admin.createUser({
        email: body.email,
        email_confirm: false,
        user_metadata: { role: "shop", company_name: body.companyName },
      });
      if (createErr) {
        const msg = createErr.message.toLowerCase();
        if (msg.includes("already") || msg.includes("registered")) {
          const { data: list } = await adminSb.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const existing = list?.users.find((u) => u.email?.toLowerCase() === body.email!.toLowerCase());
          if (existing) {
            newUserId = existing.id;
          } else {
            return NextResponse.json({ error: "Auth 既存ユーザー検索失敗" }, { status: 500 });
          }
        } else {
          return NextResponse.json({ error: `Auth ユーザー作成失敗: ${createErr.message}` }, { status: 500 });
        }
      } else {
        newUserId = created.user?.id ?? null;
      }
    }
  }

  const update: Partial<Shop> = {
    company_name: body.companyName,
    contact_name: body.contactName,
    email: body.email,
    phone: body.phone,
    address: body.address,
    delivery_address: body.deliveryAddress,
    status: body.status,
    current_rank: body.currentRank,
    rate_override: body.rateOverride,
    user_id: newUserId,
    business_type: body.businessType,
    opened_at: body.openedAt,
    lifetime_amount: body.lifetimeAmount,
  };

  const { data: updated, error } = await supabase
    .from("shops")
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
    shopId: updated.id,
    action: "update_shop",
    targetTable: "shops",
    targetId: updated.id,
    before: {
      company_name: before.company_name,
      email: before.email,
      status: before.status,
      current_rank: before.current_rank,
    },
    after: {
      company_name: updated.company_name,
      email: updated.email,
      status: updated.status,
      current_rank: updated.current_rank,
    },
  });

  return NextResponse.json({ ok: true, shop: updated });
}
