import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";

const Schema = z.object({
  category: z.enum(["account","order","invoice","shipping","product","rank","other"]),
  question: z.string().min(1),
  answer: z.string().min(1),
  sortOrder: z.number().int().min(0),
  isPublished: z.boolean(),
});

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: z.infer<typeof Schema>;
  try { body = Schema.parse(await request.json()); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "invalid" }, { status: 400 }); }

  const { data, error } = await supabase.from("faqs").insert({
    category: body.category,
    question: body.question,
    answer: body.answer,
    sort_order: body.sortOrder,
    is_published: body.isPublished,
  }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, faq: data });
}
