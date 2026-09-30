// 購入履歴 (アプリ運用以前) の編集・削除 (admin)
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { LegacyPurchaseBody, firstIssue, toRow } from "@/lib/legacy-purchase-schema";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user: user && isAdmin(user) ? user : null };
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { supabase, user } = await requireAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body;
  try {
    body = LegacyPurchaseBody.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: firstIssue(e) }, { status: 400 });
  }

  const { data: before } = await supabase
    .from("legacy_purchases").select("*").eq("id", params.id).is("deleted_at", null).maybeSingle();
  if (!before) return NextResponse.json({ error: "履歴が見つかりません" }, { status: 404 });

  const { error } = await supabase
    .from("legacy_purchases")
    .update({ ...toRow(body), updated_by: user.id })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit(supabase, {
    adminId: user.id,
    shopId: before.shop_id,
    action: "update_legacy_purchase",
    targetTable: "legacy_purchases",
    targetId: params.id,
    before: before as unknown as Record<string, unknown>,
    after: toRow(body),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const { supabase, user } = await requireAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data: before } = await supabase
    .from("legacy_purchases").select("*").eq("id", params.id).is("deleted_at", null).maybeSingle();
  if (!before) return NextResponse.json({ error: "履歴が見つかりません" }, { status: 404 });

  const { error } = await supabase
    .from("legacy_purchases")
    .update({ deleted_at: new Date().toISOString(), updated_by: user.id })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit(supabase, {
    adminId: user.id,
    shopId: before.shop_id,
    action: "delete_legacy_purchase",
    targetTable: "legacy_purchases",
    targetId: params.id,
    before: before as unknown as Record<string, unknown>,
  });
  return NextResponse.json({ ok: true });
}
