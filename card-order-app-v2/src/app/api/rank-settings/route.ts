// ランク閾値・リベート率の更新 (super_admin のみ)
//
// 重要: 月途中の変更は即座に rank_settings を書き換えず、
//        rank_settings_changes に effective_from=翌月1日 で予約する。
//        当月の集計・入金処理に影響を与えないため。
//        cron (/api/cron/apply-rank-settings) が effective_from に到達した
//        予約を rank_settings へ反映する。
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const Schema = z.object({
  settings: z
    .array(
      z.object({
        rank: z.enum(["platinum", "gold", "silver", "bronze", "standard"]),
        threshold_amount: z.number().int().min(0),
        rebate_rate: z.number().min(0).max(1),
      }),
    )
    .min(1),
});

function firstDayOfNextMonth(d: Date): string {
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdmin(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "invalid" }, { status: 400 });
  }

  const effectiveFrom = firstDayOfNextMonth(new Date());

  // 現在の値を取得して差分のみ予約
  const { data: current } = await supabase.from("rank_settings").select("*");
  const currentMap = new Map((current ?? []).map((r) => [r.rank, r]));

  const inserted: string[] = [];
  const noChange: string[] = [];
  for (const row of body.settings) {
    const cur = currentMap.get(row.rank);
    if (!cur) continue;
    if (cur.threshold_amount === row.threshold_amount && cur.rebate_rate === row.rebate_rate) {
      noChange.push(row.rank);
      continue;
    }
    const { error } = await supabase.from("rank_settings_changes").insert({
      rank: row.rank,
      old_threshold: cur.threshold_amount,
      old_rebate_rate: cur.rebate_rate,
      new_threshold: row.threshold_amount,
      new_rebate_rate: row.rebate_rate,
      effective_from: effectiveFrom,
      status: "pending",
      created_by: user.id,
    });
    if (error) {
      return NextResponse.json({ error: `${row.rank}: ${error.message}` }, { status: 500 });
    }
    inserted.push(row.rank);
  }

  await writeAudit(supabase, {
    adminId: user.id,
    action: "schedule_rank_settings_change",
    targetTable: "rank_settings_changes",
    after: { effective_from: effectiveFrom, scheduled: inserted, no_change: noChange },
  });

  return NextResponse.json({
    ok: true,
    scheduled: inserted.length,
    no_change: noChange.length,
    effective_from: effectiveFrom,
  });
}
