// タイトルの編集・削除 (admin)
import { NextResponse, type NextRequest } from "next/server";
import { requireAdminUser } from "@/lib/admin-guard";
import { TitleBody } from "@/lib/product-title-schema";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { supabase, user } = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = TitleBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid" }, { status: 400 });
  const { error } = await supabase.from("product_titles").update({
    name: parsed.data.name, keywords: parsed.data.keywords, sort_order: parsed.data.sortOrder, auto_created: false,
    updated_at: new Date().toISOString(),
  }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.code === "23505" ? "同じ名前のタイトルがあります" : error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const { supabase, user } = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { count } = await supabase.from("products").select("id", { count: "exact", head: true })
    .eq("title_group_id", params.id).is("deleted_at", null);
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: `このタイトルの商品が ${count} 件あります。別のタイトルのキーワードに統合して「再分類」してから削除してください` }, { status: 409 });
  }
  const { error } = await supabase.from("product_titles").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
