// 変更申請の承認 / 却下 API (admin)
//
// 承認時: shops の該当フィールドを書き換え + ショップへ通知
// 却下時: ステータス更新 + 理由付きでショップへ通知
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { notifyShop } from "@/lib/notify";
import { writeAudit } from "@/lib/audit";

const FIELD_LABEL: Record<string, string> = {
  delivery_address: "配送先住所",
  company_name: "会社名・屋号",
  address: "登録住所",
};

const Schema = z.object({
  action: z.enum(["approve", "reject"]),
  reviewNote: z.string().max(500).nullable(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "invalid" }, { status: 400 });
  }
  if (body.action === "reject" && !body.reviewNote?.trim()) {
    return NextResponse.json({ error: "却下には理由が必要です" }, { status: 400 });
  }

  const { data: req } = await supabase
    .from("shop_change_requests")
    .select("*, shops(company_name)")
    .eq("id", params.id)
    .eq("status", "pending")
    .maybeSingle();
  if (!req) return NextResponse.json({ error: "申請が見つからないか、処理済みです" }, { status: 404 });

  const companyName = (req as { shops?: { company_name?: string } }).shops?.company_name ?? "";

  if (body.action === "approve") {
    // shops の該当フィールドを書き換え (field は CHECK 制約で 3 種に限定済み)
    const update: Partial<import("@/types/database").Shop> =
      req.field === "delivery_address" ? { delivery_address: req.new_value } :
      req.field === "company_name"     ? { company_name: req.new_value } :
                                         { address: req.new_value };
    const { error: updErr } = await supabase
      .from("shops")
      .update(update)
      .eq("id", req.shop_id);
    if (updErr) return NextResponse.json({ error: `反映失敗: ${updErr.message}` }, { status: 500 });
  }

  // 申請ステータス更新
  const { error: reqErr } = await supabase
    .from("shop_change_requests")
    .update({
      status: body.action === "approve" ? "approved" : "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: body.reviewNote,
    })
    .eq("id", params.id);
  if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 500 });

  // ショップへ通知
  await notifyShop({
    supabase,
    shopId: req.shop_id,
    templateCode: body.action === "approve" ? "change_approved" : "change_rejected",
    vars: {
      company_name: companyName,
      field_label: FIELD_LABEL[req.field] ?? req.field,
      new_value: req.new_value,
      review_note: body.reviewNote ?? "",
    },
  });

  await writeAudit(supabase, {
    adminId: user.id,
    shopId: req.shop_id,
    action: body.action === "approve" ? "approve_change_request" : "reject_change_request",
    targetTable: "shop_change_requests",
    targetId: params.id,
    before: { field: req.field, current: req.current_value },
    after: { new_value: req.new_value, note: body.reviewNote },
  });

  return NextResponse.json({ ok: true });
}
