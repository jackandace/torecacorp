// 予約された rank_settings 変更を適用する Cron
//   毎月 1 日 00:01 (UTC) に走らせる
//   effective_from <= today の pending を rank_settings に反映
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  return !!expected && req.headers.get("authorization") === `Bearer ${expected}`;
}

export async function GET(req: NextRequest)  { return run(req); }
export async function POST(req: NextRequest) { return run(req); }

async function run(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const startedAt = new Date().toISOString();

  const { data: pending } = await supabase
    .from("rank_settings_changes")
    .select("*")
    .eq("status", "pending")
    .lte("effective_from", today);

  let applied = 0, errors = 0;
  const detail: string[] = [];
  for (const change of pending ?? []) {
    const { error: upErr } = await supabase
      .from("rank_settings")
      .update({
        threshold_amount: change.new_threshold,
        rebate_rate: change.new_rebate_rate,
      })
      .eq("rank", change.rank);
    if (upErr) {
      await supabase
        .from("rank_settings_changes")
        .update({ status: "failed", error_detail: upErr.message, applied_at: new Date().toISOString() })
        .eq("id", change.id);
      errors++;
      detail.push(`${change.rank}: ${upErr.message}`);
    } else {
      await supabase
        .from("rank_settings_changes")
        .update({ status: "applied", applied_at: new Date().toISOString(), error_detail: null })
        .eq("id", change.id);
      applied++;
    }
  }

  await supabase.from("batch_logs").insert({
    batch_name: "apply-rank-settings",
    status: errors === 0 ? "success" : "partial",
    processed_count: applied,
    error_count: errors,
    error_detail: detail.join("\n") || null,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, applied, errors });
}
