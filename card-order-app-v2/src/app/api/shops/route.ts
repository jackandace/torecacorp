// ショップ新規作成 API (admin)
//
// email が指定された場合のみ Supabase Auth ユーザーも同時に作成する。
// email 未指定なら shops 行のみ作成 (後から /admin/shops/[id] でメアド追加可)。
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const Schema = z.object({
  companyName: z.string().min(1),
  contactName: z.string().min(1),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  deliveryAddress: z.string().nullable(),
  currentRank: z.enum(["platinum", "gold", "silver", "bronze", "standard"]),
  sendInvite: z.boolean().default(true),
  activateImmediately: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "invalid" }, { status: 400 });
  }

  // 既存メール重複チェック (email 指定時のみ)
  if (body.email) {
    const { data: existing } = await supabase
      .from("shops")
      .select("id")
      .eq("email", body.email)
      .is("deleted_at", null)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "このメールアドレスは既に登録されています" }, { status: 409 });
    }
  }

  const adminSb = createAdminClient();
  let authUserId: string | null = null;

  // email がある場合のみ Auth user を作成 (既存ユーザーは再利用)
  if (body.email) {
    if (body.sendInvite) {
      const { data, error } = await adminSb.auth.admin.inviteUserByEmail(body.email, {
        data: { role: "shop", company_name: body.companyName },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`,
      });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("already") || msg.includes("registered")) {
          const { data: list } = await adminSb.auth.admin.listUsers({ page: 1, perPage: 1000 });
          authUserId = list?.users.find((u) => u.email?.toLowerCase() === body.email!.toLowerCase())?.id ?? null;
          if (!authUserId) {
            return NextResponse.json({ error: "Auth 既存ユーザー検索失敗" }, { status: 500 });
          }
        } else {
          return NextResponse.json({ error: `Auth user 作成失敗: ${error.message}` }, { status: 500 });
        }
      } else {
        authUserId = data.user?.id ?? null;
      }
    } else {
      const { data, error } = await adminSb.auth.admin.createUser({
        email: body.email,
        email_confirm: true,
        user_metadata: { role: "shop", company_name: body.companyName },
      });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("already") || msg.includes("registered")) {
          const { data: list } = await adminSb.auth.admin.listUsers({ page: 1, perPage: 1000 });
          authUserId = list?.users.find((u) => u.email?.toLowerCase() === body.email!.toLowerCase())?.id ?? null;
          if (!authUserId) {
            return NextResponse.json({ error: "Auth 既存ユーザー検索失敗" }, { status: 500 });
          }
        } else {
          return NextResponse.json({ error: `Auth user 作成失敗: ${error.message}` }, { status: 500 });
        }
      } else {
        authUserId = data.user?.id ?? null;
      }
    }
    if (!authUserId) {
      return NextResponse.json({ error: "Auth user の ID が取得できませんでした" }, { status: 500 });
    }
  }

  // shops 行を作成
  const { data: shop, error: shopErr } = await supabase
    .from("shops")
    .insert({
      company_name: body.companyName,
      contact_name: body.contactName,
      email: body.email,
      phone: body.phone,
      address: body.address,
      delivery_address: body.deliveryAddress,
      current_rank: body.currentRank,
      status: body.activateImmediately ? "active" : "pending",
      user_id: authUserId,
    })
    .select("*")
    .single();

  if (shopErr || !shop) {
    // 新規 Auth を作った場合のみロールバック
    if (authUserId) await adminSb.auth.admin.deleteUser(authUserId);
    return NextResponse.json({ error: shopErr?.message ?? "shop 作成失敗" }, { status: 500 });
  }

  await writeAudit(supabase, {
    adminId: user.id,
    shopId: shop.id,
    action: "create_shop",
    targetTable: "shops",
    targetId: shop.id,
    after: { email: body.email, status: shop.status, invited: body.sendInvite && !!body.email },
  });

  return NextResponse.json({ ok: true, shop });
}
