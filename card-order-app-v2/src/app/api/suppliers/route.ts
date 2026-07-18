// 問屋(サプライヤー)マスタ 作成 API (admin)
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const Schema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().max(20).nullable().optional(),
  contactName: z.string().max(100).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().max(40).nullable().optional(),
});

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "invalid" }, { status: 400 });
  }

  const adminSb = createAdminClient();
  const { data, error } = await adminSb
    .from("suppliers")
    .insert({
      name: body.name.trim(),
      code: body.code?.trim() || null,
      contact_name: body.contactName?.trim() || null,
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
    })
    .select("*")
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "作成に失敗しました" }, { status: 500 });
  }

  await writeAudit(supabase, {
    adminId: user.id,
    action: "create_supplier",
    targetTable: "suppliers",
    targetId: data.id,
    after: { name: data.name, code: data.code },
  });

  return NextResponse.json({ ok: true, supplier: data });
}
