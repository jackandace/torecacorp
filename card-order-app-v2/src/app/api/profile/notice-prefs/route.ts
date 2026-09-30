// お知らせの受け取り設定の保存 (ショップ本人)
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchBetaFlag, shopNoticesEnabled } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

const Schema = z.object({
  emailEnabled: z.boolean(),
  titleMode: z.enum(["all", "selected"]),
  titleIds: z.array(z.string().uuid()).max(500),
});

export async function PUT(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: shop } = await supabase
    .from("shops").select("id").eq("user_id", user.id).is("deleted_at", null).maybeSingle();
  if (!shop || !shopNoticesEnabled({ is_beta_tester: await fetchBetaFlag(supabase, shop.id) })) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "入力内容が不正です" }, { status: 400 });
  }
  if (body.titleMode === "selected" && body.titleIds.length === 0) {
    return NextResponse.json({ error: "受け取りたいタイトルを1つ以上選ぶか、「すべてのタイトル」を選んでください" }, { status: 400 });
  }

  const admin = createAdminClient();
  // 存在するタイトルだけ保存
  const { data: titles } = await admin.from("product_titles").select("id").in("id", body.titleIds.length ? body.titleIds : ["00000000-0000-0000-0000-000000000000"]);
  const validIds = (titles ?? []).map((t) => t.id);

  const { error } = await admin.from("shop_notice_prefs").upsert({
    shop_id: shop.id,
    email_enabled: body.emailEnabled,
    title_mode: body.titleMode,
    title_ids: body.titleMode === "selected" ? validIds : [],
    updated_at: new Date().toISOString(),
  }, { onConflict: "shop_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
