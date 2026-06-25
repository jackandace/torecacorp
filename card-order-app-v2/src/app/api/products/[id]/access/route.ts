// 商品の個別指名公開 (product_shop_access) 管理 API (admin)
//
// GET    : この商品の指名ショップ一覧
// POST   : 指名ショップを追加 { shopId, notify?: boolean } (notify=true で個別案内メール)
// DELETE : 指名ショップを解除 { shopId }
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { notifyShop } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("product_shop_access")
    .select("id, shop_id, created_at, shops(company_name)")
    .eq("product_id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []).map((r) => ({
    id: r.id,
    shopId: r.shop_id,
    companyName: (r.shops as unknown as { company_name?: string } | null)?.company_name ?? "—",
    createdAt: r.created_at,
  }));
  return NextResponse.json({ access: rows });
}

const PostSchema = z.object({ shopId: z.string().uuid(), notify: z.boolean().optional() });

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: z.infer<typeof PostSchema>;
  try {
    body = PostSchema.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "invalid" }, { status: 400 });
  }

  const { error } = await supabase
    .from("product_shop_access")
    .upsert({ product_id: params.id, shop_id: body.shopId }, { onConflict: "product_id,shop_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit(supabase, {
    adminId: user.id,
    shopId: body.shopId,
    action: "grant_product_access",
    targetTable: "product_shop_access",
    targetId: params.id,
    after: { product_id: params.id, shop_id: body.shopId },
  });

  // 個別案内 (任意・best-effort)
  if (body.notify) {
    const [{ data: product }, { data: shop }] = await Promise.all([
      supabase.from("products").select("title").eq("id", params.id).maybeSingle(),
      supabase.from("shops").select("company_name").eq("id", body.shopId).maybeSingle(),
    ]);
    await notifyShop({
      supabase,
      shopId: body.shopId,
      templateCode: "product_offer",
      vars: {
        company_name: shop?.company_name ?? "",
        product_title: product?.title ?? "",
      },
    });
  }

  return NextResponse.json({ ok: true });
}

const DeleteSchema = z.object({ shopId: z.string().uuid() });

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: z.infer<typeof DeleteSchema>;
  try {
    body = DeleteSchema.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "invalid" }, { status: 400 });
  }

  const { error } = await supabase
    .from("product_shop_access")
    .delete()
    .eq("product_id", params.id)
    .eq("shop_id", body.shopId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit(supabase, {
    adminId: user.id,
    shopId: body.shopId,
    action: "revoke_product_access",
    targetTable: "product_shop_access",
    targetId: params.id,
    after: { product_id: params.id, shop_id: body.shopId },
  });

  return NextResponse.json({ ok: true });
}
