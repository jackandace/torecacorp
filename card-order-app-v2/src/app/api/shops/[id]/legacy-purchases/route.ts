// 購入履歴 (アプリ運用以前) の1件登録 (admin)
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { LegacyPurchaseBody, firstIssue, toRow } from "@/lib/legacy-purchase-schema";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body;
  try {
    body = LegacyPurchaseBody.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: firstIssue(e) }, { status: 400 });
  }

  const { data: shop } = await supabase.from("shops").select("id").eq("id", params.id).is("deleted_at", null).maybeSingle();
  if (!shop) return NextResponse.json({ error: "ショップが見つかりません" }, { status: 404 });

  const { data, error } = await supabase
    .from("legacy_purchases")
    .insert({ ...toRow(body), shop_id: shop.id, created_by: user.id, updated_by: user.id })
    .select("id")
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "登録に失敗しました" }, { status: 500 });

  await writeAudit(supabase, {
    adminId: user.id,
    shopId: shop.id,
    action: "create_legacy_purchase",
    targetTable: "legacy_purchases",
    targetId: data.id,
    after: toRow(body),
  });
  return NextResponse.json({ ok: true, id: data.id });
}
