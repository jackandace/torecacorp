// 既存登録済みショップ向けパスワード設定リンク送付 API (認証不要パス)
//
// セキュリティ: メアドの存在有無をレスポンスで漏らさない (常に ok を返す)。
// レートリミットは Vercel / Supabase 側の標準制限に依存。
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const Schema = z.object({ email: z.string().email() });

export async function POST(request: NextRequest) {
  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: true }); // 形式不正でも秘匿
  }

  const email = body.email.toLowerCase();
  const adminSb = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // shops に登録されているメアドのみ対応
  const { data: shop } = await adminSb
    .from("shops")
    .select("id, user_id, company_name, status")
    .eq("email", email)
    .is("deleted_at", null)
    .maybeSingle();

  if (!shop || shop.status === "suspended") {
    return NextResponse.json({ ok: true }); // 存在を秘匿
  }

  try {
    if (shop.user_id) {
      // Auth ユーザー紐付け済み → パスワードリセットリンク
      await adminSb.auth.resetPasswordForEmail(email, {
        redirectTo: `${appUrl}/reset-password`,
      });
    } else {
      // Auth 未作成 (移行データ等) → invite でユーザー作成 + パスワード設定リンク
      const { data: invited, error } = await adminSb.auth.admin.inviteUserByEmail(email, {
        data: { role: "shop", company_name: shop.company_name },
        redirectTo: `${appUrl}/reset-password`,
      });
      if (!error && invited.user?.id) {
        await adminSb.from("shops").update({ user_id: invited.user.id }).eq("id", shop.id);
      }
    }

    await adminSb.from("audit_logs").insert({
      shop_id: shop.id,
      action: "existing_shop_password_setup_requested",
      target_table: "shops",
      target_id: shop.id,
    });
  } catch (e) {
    console.error("[register/existing] failed:", e instanceof Error ? e.message : e);
  }

  return NextResponse.json({ ok: true });
}
