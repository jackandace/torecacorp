// 管理者からの返信
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { notifyShop } from "@/lib/notify";

const Schema = z.object({ body: z.string().min(1).max(10000) });

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: z.infer<typeof Schema>;
  try { body = Schema.parse(await request.json()); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "invalid" }, { status: 400 }); }

  const { data: inquiry } = await supabase
    .from("inquiries")
    .select("id, shop_id, subject, status, shops(company_name)")
    .eq("id", params.id)
    .maybeSingle();
  if (!inquiry) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (inquiry.status === "closed") {
    return NextResponse.json({ error: "クローズされた問い合わせには返信できません" }, { status: 400 });
  }

  const now = new Date().toISOString();
  await supabase.from("inquiry_messages").insert({
    inquiry_id: params.id,
    from_user_id: user.id,
    from_kind: "admin",
    body: body.body,
  });
  await supabase
    .from("inquiries")
    .update({
      last_reply_by: "admin",
      last_reply_at: now,
      status: "waiting_shop",
    })
    .eq("id", params.id);

  // ショップへ通知
  const company = (inquiry.shops as unknown as { company_name?: string } | null)?.company_name ?? "";
  await notifyShop({
    supabase,
    shopId: inquiry.shop_id,
    templateCode: "inquiry_replied",
    vars: { company_name: company, subject: inquiry.subject },
  });

  return NextResponse.json({ ok: true });
}
