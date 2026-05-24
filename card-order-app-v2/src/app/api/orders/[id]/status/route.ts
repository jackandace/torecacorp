// 発注ステータス更新 API (admin)
//
// - 楽観的ロック: payload に lastUpdatedAt を必須化
// - ステータス遷移時に products.ordered_qty を補正
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { notifyShop } from "@/lib/notify";
import type { Order } from "@/types/database";

const Schema = z.object({
  status: z.enum(["リクエスト", "発注調整中", "仮確定", "確定", "キャンセル"]),
  provisionalQty: z.number().int().min(0).optional(),
  confirmedQty: z.number().int().min(0).optional(),
  adminNote: z.string().optional(),
  lastUpdatedAt: z.string(), // 楽観的ロック
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "invalid" }, { status: 400 });
  }

  const { data: before } = await supabase
    .from("orders")
    .select("*")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!before) return NextResponse.json({ error: "not found" }, { status: 404 });

  const update: Partial<Order> = {
    status: body.status,
    admin_note: body.adminNote,
  };
  if (body.provisionalQty != null) update.provisional_qty = body.provisionalQty;
  if (body.confirmedQty != null) update.confirmed_qty = body.confirmedQty;
  if (body.status === "確定") update.confirmed_at = new Date().toISOString();

  // 楽観的ロック
  const { data: updated, error: upErr } = await supabase
    .from("orders")
    .update(update)
    .eq("id", params.id)
    .eq("updated_at", body.lastUpdatedAt)
    .select("*")
    .maybeSingle();

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  if (!updated) {
    return NextResponse.json(
      { error: "データが他のユーザーにより更新されています。再読み込みしてください" },
      { status: 409 },
    );
  }

  // 在庫補正: 確定 → ordered_qty を加算, キャンセル → 戻す
  // ※ 実運用ではトランザクションが必要。Postgres RPC 化を推奨。
  if (before.status !== "確定" && updated.status === "確定") {
    const delta = updated.confirmed_qty ?? 0;
    await supabase.rpc("increment_product_ordered_qty", { p_product_id: updated.product_id, p_delta: delta });
  } else if (before.status === "確定" && updated.status === "キャンセル") {
    const delta = -(before.confirmed_qty ?? 0);
    await supabase.rpc("increment_product_ordered_qty", { p_product_id: updated.product_id, p_delta: delta });
  }

  await writeAudit(supabase, {
    adminId: user.id,
    shopId: updated.shop_id,
    action: "update_order_status",
    targetTable: "orders",
    targetId: updated.id,
    before: { status: before.status, confirmed_qty: before.confirmed_qty },
    after: { status: updated.status, confirmed_qty: updated.confirmed_qty },
  });

  // ステータス変化に応じた通知
  if (before.status !== updated.status) {
    const { data: shop } = await supabase
      .from("shops")
      .select("company_name")
      .eq("id", updated.shop_id)
      .maybeSingle();
    const { data: product } = await supabase
      .from("products")
      .select("title")
      .eq("id", updated.product_id)
      .maybeSingle();
    const baseVars = {
      company_name: shop?.company_name ?? "",
      product_title: product?.title ?? "",
    };
    if (updated.status === "仮確定") {
      await notifyShop({
        supabase,
        shopId: updated.shop_id,
        templateCode: "order_provisional",
        vars: { ...baseVars, provisional_qty: updated.provisional_qty ?? 0 },
      });
    } else if (updated.status === "確定") {
      await notifyShop({
        supabase,
        shopId: updated.shop_id,
        templateCode: "order_confirmed",
        vars: { ...baseVars, confirmed_qty: updated.confirmed_qty ?? 0 },
      });
    }
  }

  return NextResponse.json({ ok: true, order: updated });
}
