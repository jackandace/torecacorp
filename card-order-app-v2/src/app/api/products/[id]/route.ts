// 商品の更新・論理削除 API (admin)
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import type { Product } from "@/types/database";

const PatchSchema = z.object({
  series: z.string().nullable().optional(),
  title: z.string().min(1),
  fullName: z.string().nullable(),
  modelNumber: z.string().nullable(),
  category: z.enum(["pokemon", "onepiece", "other"]),
  actualRate: z.number().min(0).max(1),
  rateMarkup: z.number().min(0).max(1),
  price: z.number().int().min(0),
  plannedQty: z.number().int().min(0),
  ctToBox: z.number().int().positive(),
  minOrderBox: z.number().int().positive(),
  flowType: z.enum(["haibun", "cut"]),
  cutType: z.string().nullable(),
  isVisible: z.boolean(),
  isApproved: z.boolean(),
  status: z.enum(["受付中", "受付停止", "終了"]),
  orderDeadline: z.string().nullable(),
  notes: z.string().nullable(),
  minRank: z.enum(["standard", "bronze", "silver", "gold", "platinum"]).nullable().optional(),
  janCode: z.string().max(50).nullable().optional(),
  releaseInfo: z.string().max(2000).nullable().optional(),
  cartonDelivery: z.boolean().optional(),
  masterCartonBox: z.number().int().positive().max(100000).nullable().optional(),
  lastUpdatedAt: z.string(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: z.infer<typeof PatchSchema>;
  try {
    body = PatchSchema.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "invalid" }, { status: 400 });
  }

  const { data: before } = await supabase
    .from("products")
    .select("*")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!before) return NextResponse.json({ error: "not found" }, { status: 404 });

  const update: Partial<Product> = {
    series: body.series ?? null,
    title: body.title,
    full_name: body.fullName,
    model_number: body.modelNumber,
    category: body.category,
    actual_rate: body.actualRate,
    rate_markup: body.rateMarkup,
    price: body.price,
    planned_qty: body.plannedQty,
    ct_to_box: body.ctToBox,
    min_order_box: body.minOrderBox,
    flow_type: body.flowType,
    cut_type: body.cutType,
    is_visible: body.isVisible,
    is_approved: body.isApproved,
    status: body.status,
    order_deadline: body.orderDeadline,
    notes: body.notes,
    min_rank: body.minRank ?? null,
    ...(body.janCode !== undefined ? { jan_code: body.janCode } : {}),
    ...(body.releaseInfo !== undefined ? { release_info: body.releaseInfo } : {}),
    ...(body.cartonDelivery !== undefined ? { carton_delivery: body.cartonDelivery } : {}),
    ...(body.masterCartonBox !== undefined ? { master_carton_box: body.masterCartonBox } : {}),
  };

  const { data: updated, error } = await supabase
    .from("products")
    .update(update)
    .eq("id", params.id)
    .eq("updated_at", body.lastUpdatedAt)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated) {
    return NextResponse.json(
      { error: "データが他のユーザーにより更新されています。再読み込みしてください" },
      { status: 409 },
    );
  }

  await writeAudit(supabase, {
    adminId: user.id,
    action: "update_product",
    targetTable: "products",
    targetId: updated.id,
    before: {
      actual_rate: before.actual_rate,
      planned_qty: before.planned_qty,
      is_visible: before.is_visible,
      status: before.status,
    },
    after: {
      actual_rate: updated.actual_rate,
      planned_qty: updated.planned_qty,
      is_visible: updated.is_visible,
      status: updated.status,
    },
  });

  return NextResponse.json({ ok: true, product: updated });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString(), is_visible: false })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit(supabase, {
    adminId: user.id,
    action: "soft_delete_product",
    targetTable: "products",
    targetId: params.id,
  });

  return NextResponse.json({ ok: true });
}
