// お知らせの受け取り設定の確認 (ログイン後のポップアップから)
//   choice = "email"    : 新商品メールを受け取る (タイトルは現在の設定のまま。未設定なら全タイトル)
//   choice = "no_email" : メールは受け取らない (アプリ内のお知らせのみ)
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getNoticeAccess } from "@/lib/feature-flags";
import { getNoticePrefs } from "@/lib/notice-prefs";
import { getCurrentShop } from "@/lib/shop-session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const shop = await getCurrentShop();
  if (!shop) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await getNoticeAccess(shop.id)).enabled) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = z.object({ choice: z.enum(["email", "no_email"]) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const admin = createAdminClient();
  const current = await getNoticePrefs(admin, shop.id);
  const now = new Date().toISOString();
  const { error } = await admin.from("shop_notice_prefs").upsert({
    shop_id: shop.id,
    email_enabled: parsed.data.choice === "email",
    title_mode: current.title_mode,
    title_ids: current.title_ids,
    last_digest_at: current.last_digest_at,
    confirmed_at: now,
    updated_at: now,
  }, { onConflict: "shop_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
