// ショップ側からの返信
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Schema = z.object({ body: z.string().min(1).max(10000) });

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "invalid" }, { status: 400 });
  }

  // 自分のショップの問い合わせか確認
  const { data: inquiry } = await supabase
    .from("inquiries")
    .select("id, shop_id, status, shops!inner(user_id)")
    .eq("id", params.id)
    .maybeSingle();
  if (!inquiry || (inquiry.shops as unknown as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (inquiry.status === "closed") {
    return NextResponse.json({ error: "クローズされた問い合わせには返信できません" }, { status: 400 });
  }

  const now = new Date().toISOString();
  await supabase.from("inquiry_messages").insert({
    inquiry_id: params.id,
    from_user_id: user.id,
    from_kind: "shop",
    body: body.body,
  });
  await supabase
    .from("inquiries")
    .update({
      last_reply_by: "shop",
      last_reply_at: now,
      status: inquiry.status === "waiting_shop" ? "in_progress" : inquiry.status,
    })
    .eq("id", params.id);

  return NextResponse.json({ ok: true });
}
