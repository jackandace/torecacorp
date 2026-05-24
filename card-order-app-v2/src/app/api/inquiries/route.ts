// ショップからの問い合わせ作成 API
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";

const Schema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
  category: z.enum(["product","order","invoice","shipping","account","other"]),
  relatedProductId: z.string().uuid().nullable(),
});

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!shop) return NextResponse.json({ error: "shop not found" }, { status: 404 });

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "invalid" }, { status: 400 });
  }

  let modelNumber: string | null = null;
  if (body.relatedProductId) {
    const { data: p } = await supabase
      .from("products")
      .select("model_number")
      .eq("id", body.relatedProductId)
      .maybeSingle();
    modelNumber = p?.model_number ?? null;
  }

  const { data: inserted, error } = await supabase
    .from("inquiries")
    .insert({
      shop_id: shop.id,
      subject: body.subject,
      body: body.body,
      category: body.category,
      related_product_id: body.relatedProductId,
      related_model: modelNumber,
      status: "open",
      last_reply_by: "shop",
      last_reply_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error || !inserted) return NextResponse.json({ error: error?.message ?? "失敗" }, { status: 500 });

  await writeAudit(supabase, {
    shopId: shop.id,
    action: "create_inquiry",
    targetTable: "inquiries",
    targetId: inserted.id,
    after: { subject: body.subject, category: body.category },
  });

  return NextResponse.json({ ok: true, inquiry: inserted });
}
