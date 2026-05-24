// 商品一括更新 API (admin)
//   公開/非公開, 受付中/受付停止/終了 をまとめて切替
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import type { Product } from "@/types/database";

const Schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  changes: z.object({
    is_visible: z.boolean().optional(),
    status: z.enum(["受付中", "受付停止", "終了"]).optional(),
  }),
});

export async function PATCH(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "invalid" }, { status: 400 });
  }

  const update: Partial<Product> = {};
  if (body.changes.is_visible !== undefined) update.is_visible = body.changes.is_visible;
  if (body.changes.status !== undefined)     update.status     = body.changes.status;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "更新内容が空です" }, { status: 400 });
  }

  const { error, count } = await supabase
    .from("products")
    .update(update, { count: "exact" })
    .in("id", body.ids)
    .is("deleted_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit(supabase, {
    adminId: user.id,
    action: "bulk_update_products",
    targetTable: "products",
    after: { ids_count: body.ids.length, changes: body.changes, updated: count ?? 0 },
  });

  return NextResponse.json({ ok: true, updated: count ?? body.ids.length });
}
