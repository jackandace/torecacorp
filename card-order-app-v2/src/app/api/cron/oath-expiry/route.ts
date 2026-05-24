// 宣誓書失効アラート Cron
//
// 毎日 09:00 JST (= 00:00 UTC) に実行。
// 30 / 14 / 7 日前に失効するショップへ通知を送る。
// 冪等性: 同じ shop_id + days_until_expiry の通知が同日に既に送られていればスキップ
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyShop } from "@/lib/notify";

export const dynamic = "force-dynamic";

const ALERT_DAYS = [30, 14, 7];

function authorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return request.headers.get("authorization") === `Bearer ${expected}`;
}

export async function POST(request: NextRequest) {
  return run(request);
}
export async function GET(request: NextRequest) {
  return run(request);
}

async function run(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const startedAt = new Date().toISOString();
  let processed = 0;
  let errors = 0;
  const detail: string[] = [];

  try {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    for (const days of ALERT_DAYS) {
      const target = new Date(today);
      target.setDate(today.getDate() + days);
      const targetStr = target.toISOString().slice(0, 10);

      const { data: shops } = await supabase
        .from("shops")
        .select("id, email, company_name, oath_expires_at")
        .eq("status", "active")
        .eq("oath_expires_at", targetStr)
        .is("deleted_at", null);

      for (const shop of shops ?? []) {
        // 当日に同じ days で既に送ったかチェック
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("shop_id", shop.id)
          .eq("template_code", "oath_expiring")
          .gte("created_at", `${todayStr}T00:00:00Z`)
          .lte("created_at", `${todayStr}T23:59:59Z`)
          .maybeSingle();
        if (existing) continue;

        try {
          await notifyShop({
            supabase,
            shopId: shop.id,
            templateCode: "oath_expiring",
            vars: {
              company_name: shop.company_name,
              days_until_expiry: days,
              expiry_date: targetStr,
            },
          });
          processed++;
        } catch (e) {
          errors++;
          detail.push(`${shop.id}: ${e instanceof Error ? e.message : "unknown"}`);
        }
      }
    }

    await supabase.from("batch_logs").insert({
      batch_name: "oath-expiry",
      status: errors === 0 ? "success" : "partial",
      processed_count: processed,
      error_count: errors,
      error_detail: detail.join("\n") || null,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, processed, errors });
  } catch (e) {
    await supabase.from("batch_logs").insert({
      batch_name: "oath-expiry",
      status: "failure",
      processed_count: processed,
      error_count: errors + 1,
      error_detail: e instanceof Error ? e.message : "unknown",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}
