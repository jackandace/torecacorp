// 通知の手動一斉送信 API
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { notifyShop } from "@/lib/notify";
import { writeAudit } from "@/lib/audit";

const Schema = z.object({
  templateCode: z.string().min(1),
  shopIds: z.array(z.string().uuid()).min(1).max(500),
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

  // 送信先のメタ情報を取得 (会社名差し込み用)
  const { data: shops } = await supabase
    .from("shops")
    .select("id, company_name")
    .in("id", body.shopIds)
    .is("deleted_at", null);

  let sent = 0;
  let failed = 0;

  for (const shop of shops ?? []) {
    try {
      await notifyShop({
        supabase,
        shopId: shop.id,
        templateCode: body.templateCode,
        vars: { company_name: shop.company_name },
      });
      sent++;
    } catch {
      failed++;
    }
  }

  await writeAudit(supabase, {
    adminId: user.id,
    action: "bulk_notify",
    targetTable: "notifications",
    after: { template_code: body.templateCode, sent, failed, count: shops?.length ?? 0 },
  });

  return NextResponse.json({ ok: true, sent, failed });
}
