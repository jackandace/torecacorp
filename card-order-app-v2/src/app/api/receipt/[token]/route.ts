// 受領確認 API (ログイン不要・トークン制) — ショップが「受領する」を押すと received_at を記録
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token;
  if (!token || token.length < 16) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, received_at, delivered_at")
    .eq("receipt_token", token)
    .is("deleted_at", null)
    .maybeSingle();
  if (!order || !order.delivered_at) {
    return NextResponse.json({ error: "リンクが無効です" }, { status: 404 });
  }
  if (order.received_at) {
    return NextResponse.json({ ok: true, already: true });
  }
  const { error } = await admin
    .from("orders")
    .update({ received_at: new Date().toISOString() })
    .eq("id", order.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
