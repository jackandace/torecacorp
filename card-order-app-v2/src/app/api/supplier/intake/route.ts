// 問屋の入荷登録 (フォーム1件) API — フェーズ4
//
// 問屋が新商品を「下書き」として登録する。作成される商品は
//   is_approved=false / is_visible=false / status=受付停止 / actual_rate=0
// で、ショップには一切表示されない。管理者が掛け率等を設定して承認
// (POST /api/products/[id]/approve) すると公開される。
// テスト問屋 (suppliers.is_test) の登録は承認できないため本番に混入しない。
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupplierContext } from "@/lib/supplier";
import { inferIntakeCategory } from "@/lib/intake-parsers";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const Schema = z.object({
  series: z.string().trim().max(100).optional(),
  title: z.string().trim().min(1).max(200),
  modelNumber: z.string().trim().max(60).optional(),
  janCode: z.string().trim().max(20).optional(),
  price: z.number().int().min(0).nullable().optional(),          // 定価(税抜)
  ctToBox: z.number().int().min(1).max(200).optional(),          // カートンBOX数
  minOrderBox: z.number().int().min(1).max(500).optional(),      // 最低発注数
  plannedQty: z.number().int().min(0).nullable().optional(),     // 発注可能数(BOX)
  releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), // 発売日→発注締切の参考
  orderDeadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  flowType: z.enum(["haibun", "cut"]).optional(),
  note: z.string().trim().max(500).optional(),                   // 承認者向けメモ
});

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const ctx = await getSupplierContext(supabase);
  if (!ctx) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "invalid" }, { status: 400 });
  }

  const adminSb = createAdminClient();
  const releaseInfo = body.releaseDate ? `発売日: ${body.releaseDate}` : null;

  const { data: created, error } = await adminSb
    .from("products")
    .insert({
      series: body.series || null,
      title: body.title,
      full_name: body.title,
      model_number: body.modelNumber || null,
      jan_code: body.janCode || null,
      category: inferIntakeCategory(`${body.series ?? ""} ${body.title}`),
      actual_rate: 0,            // 掛け率は管理者が承認時に設定 (公開前チェックでガード)
      price: body.price ?? null,
      planned_qty: body.plannedQty ?? null,
      ct_to_box: body.ctToBox ?? 12,
      min_order_box: body.minOrderBox ?? body.ctToBox ?? 12,
      flow_type: body.flowType ?? "haibun",
      order_deadline: body.orderDeadline ?? null,
      ...(releaseInfo ? { release_info: releaseInfo } : {}),
      intake_note: body.note || null,
      supplier_id: ctx.supplierId,
      is_visible: false,
      is_approved: false,
      status: "受付停止",
    })
    .select("id, title")
    .single();

  if (error || !created) {
    return NextResponse.json({ error: error?.message ?? "登録に失敗しました" }, { status: 500 });
  }

  await writeAudit(supabase, {
    action: "supplier_intake_create",
    targetTable: "products",
    targetId: created.id,
    after: { title: created.title, supplier_id: ctx.supplierId },
  });

  return NextResponse.json({ ok: true, id: created.id });
}
