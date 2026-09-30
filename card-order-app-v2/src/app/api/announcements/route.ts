// 全体へのお知らせの投稿 (admin)
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/admin-guard";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const Schema = z.object({
  title: z.string().trim().min(1, "タイトルは必須です").max(120),
  body: z.string().trim().max(3000).optional(),
  linkUrl: z.string().trim().max(500).regex(/^(https?:\/\/|\/)/, "リンクは https:// または / で始めてください").optional().or(z.literal("")),
});

export async function POST(request: NextRequest) {
  const { supabase, user } = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof z.ZodError ? e.issues[0]?.message : "入力内容が不正です" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("announcements")
    .insert({ title: body.title, body: body.body || null, link_url: body.linkUrl || null, created_by: user.id })
    .select("id")
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "投稿に失敗しました" }, { status: 500 });
  await writeAudit(supabase, { adminId: user.id, action: "create_announcement", targetTable: "announcements", targetId: data.id, after: { title: body.title } });
  return NextResponse.json({ ok: true, id: data.id });
}
