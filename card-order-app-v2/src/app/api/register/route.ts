// 新規会員登録 API (招待トークン制・認証不要パス)
//
// 1. トークンを service_role で検証 (有効期限・使用済みチェック)
// 2. shops 行を作成 (status=pending, terms_agreed_at=now)
// 3. Supabase invite メール送信 → ユーザーはリンクからパスワード設定
// 4. トークンを使用済みに
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const Schema = z.object({
  token: z.string().min(8),
  companyName: z.string().min(1).max(200),
  contactName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(30).nullable(),
  address: z.string().max(500).nullable(),
  deliveryAddress: z.string().max(500).nullable(),
  businessType: z.enum(["physical_only", "physical_and_ec", "other"]), // ec_only は受け付けない
  openedAt: z.string().nullable(),
  termsVersion: z.string(),
});

export async function POST(request: NextRequest) {
  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch (e) {
    // ec_only が送られた場合もここで弾かれる
    return NextResponse.json(
      { error: "入力内容に誤りがあります。運営形態をご確認ください (EC のみのお取引はできません)。" },
      { status: 400 },
    );
  }

  const adminSb = createAdminClient();

  // --- トークン検証 ---
  const { data: invite } = await adminSb
    .from("registration_invites")
    .select("*")
    .eq("token", body.token)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: "招待リンクが無効です" }, { status: 403 });
  }
  if (invite.used_at) {
    return NextResponse.json({ error: "この招待リンクは既に使用されています" }, { status: 403 });
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "招待リンクの有効期限が切れています" }, { status: 403 });
  }

  // --- email 重複チェック ---
  const { data: existingShop } = await adminSb
    .from("shops")
    .select("id")
    .eq("email", body.email)
    .is("deleted_at", null)
    .maybeSingle();
  if (existingShop) {
    return NextResponse.json(
      { error: "このメールアドレスは既に登録されています。「既に登録済みの方」からパスワードを設定してください。" },
      { status: 409 },
    );
  }

  // --- Auth ユーザー作成 + 認証メール (invite) 送信 ---
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  let userId: string | null = null;
  const { data: invited, error: inviteErr } = await adminSb.auth.admin.inviteUserByEmail(body.email, {
    data: { role: "shop", company_name: body.companyName },
    redirectTo: `${appUrl}/reset-password`,
  });
  if (inviteErr) {
    const msg = inviteErr.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered")) {
      // Auth にだけ既存 (前回の途中失敗など) → 流用してパスワード設定リンクを再送
      const { data: list } = await adminSb.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = list?.users.find((u) => u.email?.toLowerCase() === body.email);
      if (!existing) {
        return NextResponse.json({ error: "登録処理に失敗しました。担当者までご連絡ください。" }, { status: 500 });
      }
      userId = existing.id;
      await adminSb.auth.resetPasswordForEmail(body.email, {
        redirectTo: `${appUrl}/reset-password`,
      });
    } else {
      console.error("[register] invite failed:", inviteErr.message);
      return NextResponse.json({ error: "認証メールの送信に失敗しました。担当者までご連絡ください。" }, { status: 500 });
    }
  } else {
    userId = invited.user?.id ?? null;
  }
  if (!userId) {
    return NextResponse.json({ error: "登録処理に失敗しました" }, { status: 500 });
  }

  // --- shops 行を作成 ---
  const { data: shop, error: shopErr } = await adminSb
    .from("shops")
    .insert({
      company_name: body.companyName,
      contact_name: body.contactName,
      email: body.email,
      phone: body.phone,
      address: body.address,
      delivery_address: body.deliveryAddress,
      business_type: body.businessType,
      opened_at: body.openedAt,
      status: "pending",            // 管理者の最終承認後に active
      current_rank: "standard",
      user_id: userId,
      terms_agreed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (shopErr || !shop) {
    console.error("[register] shop insert failed:", shopErr?.message);
    return NextResponse.json({ error: "登録処理に失敗しました。担当者までご連絡ください。" }, { status: 500 });
  }

  // --- トークン消込 ---
  await adminSb
    .from("registration_invites")
    .update({ used_at: new Date().toISOString(), used_by_shop_id: shop.id })
    .eq("id", invite.id);

  // --- 監査ログ ---
  await adminSb.from("audit_logs").insert({
    shop_id: shop.id,
    action: "self_register",
    target_table: "shops",
    target_id: shop.id,
    after_data: {
      email: body.email,
      company_name: body.companyName,
      business_type: body.businessType,
      terms_version: body.termsVersion,
      invite_id: invite.id,
    },
  });

  return NextResponse.json({ ok: true });
}
