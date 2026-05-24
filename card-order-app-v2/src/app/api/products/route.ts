// 商品の新規作成 API
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const Schema = z.object({
  title: z.string().min(1),
  category: z.enum(["pokemon", "onepiece", "other"]),
  actualRate: z.number().min(0).max(1),
  price: z.number().int().min(0),
  plannedQty: z.number().int().min(0),
  flowType: z.enum(["haibun", "cut"]),
});

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "invalid" }, { status: 400 });
  }

  const { data: inserted, error } = await supabase
    .from("products")
    .insert({
      title: body.title,
      category: body.category,
      actual_rate: body.actualRate,
      price: body.price,
      planned_qty: body.plannedQty,
      flow_type: body.flowType,
    })
    .select("*")
    .single();
  if (error || !inserted) {
    return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 });
  }

  await writeAudit(supabase, {
    adminId: user.id,
    action: "create_product",
    targetTable: "products",
    targetId: inserted.id,
    after: { title: inserted.title, category: inserted.category },
  });

  return NextResponse.json({ ok: true, product: inserted });
}
