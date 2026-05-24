// テンプレート更新 API (admin)
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import type { NotificationTemplate } from "@/types/database";

const Schema = z.object({
  subject: z.string().min(1),
  bodyHtml: z.string().min(1),
  bodyText: z.string().nullable(),
  lastUpdatedAt: z.string(),
});

export async function PATCH(request: NextRequest, { params }: { params: { code: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "invalid" }, { status: 400 });
  }

  const { data: before } = await supabase
    .from("notification_templates")
    .select("*")
    .eq("code", params.code)
    .maybeSingle();
  if (!before) return NextResponse.json({ error: "not found" }, { status: 404 });

  const update: Partial<NotificationTemplate> = {
    subject: body.subject,
    body_html: body.bodyHtml,
    body_text: body.bodyText,
  };

  const { data: updated, error } = await supabase
    .from("notification_templates")
    .update(update)
    .eq("code", params.code)
    .eq("updated_at", body.lastUpdatedAt)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated) {
    return NextResponse.json(
      { error: "データが他のユーザーにより更新されています。再読み込みしてください" },
      { status: 409 },
    );
  }

  await writeAudit(supabase, {
    adminId: user.id,
    action: "update_notification_template",
    targetTable: "notification_templates",
    targetId: updated.id,
    before: { subject: before.subject },
    after: { subject: updated.subject },
  });

  return NextResponse.json({ ok: true, template: updated });
}
