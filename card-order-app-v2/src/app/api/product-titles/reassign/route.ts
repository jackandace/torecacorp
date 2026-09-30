// 全商品のタイトルを現在のキーワードで再分類 (admin)
import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export async function POST() {
  const { supabase, user } = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { data, error } = await supabase.rpc("reassign_product_titles");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, updated: data });
}
