// ショップ招待メール (再) 送信 API
//
// Auth 未登録なら招待メール、登録済みならパスワード設定(再設定)メールに
// 自動フォールバックする (invite は未登録ユーザー専用のため。staff/suppliers と同パターン)。
// 招待リンクを一度開いただけでパスワード未設定のまま詰むケースの救済も兼ねる。
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data: shop } = await supabase
    .from("shops")
    .select("id, email, company_name, user_id")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!shop) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!shop.email) return NextResponse.json({ error: "メールアドレスが未設定です" }, { status: 400 });

  const adminSb = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  let method: "invite" | "reset" = "invite";
  const { data: invited, error } = await adminSb.auth.admin.inviteUserByEmail(shop.email, {
    data: { role: "shop", company_name: shop.company_name },
    redirectTo: `${appUrl}/login`,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exist")) {
      // 登録済みユーザー → パスワード設定(再設定)メールを送る
      method = "reset";
      const { error: resetErr } = await adminSb.auth.resetPasswordForEmail(shop.email, {
        redirectTo: `${appUrl}/reset-password`,
      });
      if (resetErr) {
        return NextResponse.json(
          { error: `パスワード設定メールの送信に失敗しました: ${resetErr.message}` },
          { status: 500 },
        );
      }
      // shops.user_id が未紐付けなら既存 Auth ユーザーを紐付けておく
      if (!shop.user_id) {
        const { data: list } = await adminSb.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existing = list?.users.find((u) => u.email?.toLowerCase() === shop.email!.toLowerCase());
        if (existing) {
          await adminSb.from("shops").update({ user_id: existing.id }).eq("id", shop.id);
        }
      }
    } else {
      // レート制限など。原文を返して原因を追えるようにする
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else if (invited.user?.id && !shop.user_id) {
    await adminSb.from("shops").update({ user_id: invited.user.id }).eq("id", shop.id);
  }

  await writeAudit(supabase, {
    adminId: user.id,
    shopId: shop.id,
    action: "invite_shop",
    targetTable: "shops",
    targetId: shop.id,
    after: { email: shop.email, method },
  });

  return NextResponse.json({ ok: true, method });
}
