// タイトル (ポケモン / ワンピース …) の追加 (admin)
import { NextResponse, type NextRequest } from "next/server";
import { requireAdminUser } from "@/lib/admin-guard";
import { TitleBody } from "@/lib/product-title-schema";

export const dynamic = "force-dynamic";


export async function POST(request: NextRequest) {
  const { supabase, user } = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = TitleBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid" }, { status: 400 });
  const { error } = await supabase.from("product_titles").insert({
    name: parsed.data.name, keywords: parsed.data.keywords, sort_order: parsed.data.sortOrder, auto_created: false,
  });
  if (error) return NextResponse.json({ error: error.code === "23505" ? "同じ名前のタイトルがあります" : error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
