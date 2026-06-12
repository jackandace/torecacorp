// 招待リンクの発行 API (admin)
import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

const Schema = z.object({
  email: z.string().email().nullable(),
  companyName: z.string().max(200).nullable(),
  note: z.string().max(500).nullable(),
  expiresInDays: z.number().int().min(1).max(90).default(14),
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

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000);

  const { data: invite, error } = await supabase
    .from("registration_invites")
    .insert({
      token,
      email: body.email,
      company_name: body.companyName,
      note: body.note,
      expires_at: expiresAt.toISOString(),
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: error?.message ?? "発行に失敗しました" }, { status: 500 });
  }

  await writeAudit(supabase, {
    adminId: user.id,
    action: "create_registration_invite",
    targetTable: "registration_invites",
    targetId: invite.id,
    after: { email: body.email, expires_at: expiresAt.toISOString() },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return NextResponse.json({
    ok: true,
    invite,
    url: `${appUrl}/register?token=${token}`,
  });
}
