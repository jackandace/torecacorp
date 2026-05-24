import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import type { Faq } from "@/types/database";

const Schema = z.object({
  category: z.enum(["account","order","invoice","shipping","product","rank","other"]).optional(),
  question: z.string().min(1).optional(),
  answer: z.string().min(1).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: z.infer<typeof Schema>;
  try { body = Schema.parse(await request.json()); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "invalid" }, { status: 400 }); }

  const update: Partial<Faq> = {};
  if (body.category !== undefined)    update.category     = body.category;
  if (body.question !== undefined)    update.question     = body.question;
  if (body.answer !== undefined)      update.answer       = body.answer;
  if (body.sortOrder !== undefined)   update.sort_order   = body.sortOrder;
  if (body.isPublished !== undefined) update.is_published = body.isPublished;

  const { error } = await supabase.from("faqs").update(update).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { error } = await supabase
    .from("faqs")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
