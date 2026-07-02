// 累計下限しきい値 (lifetime_threshold) の設定 + 即時フロア適用 (super_admin)
//
// 月次のしきい値/リベート変更は翌月予約だが、累計下限は別軸(最低保証フロア)のため
// 即時反映する。applyNow=true で全アクティブショップにフロアを即適用(昇格のみ・降格なし)。
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/auth";
import { buildRankSettingsMap, lifetimeFloorRank, higherRank } from "@/lib/ranks";
import { writeAudit } from "@/lib/audit";
import type { RankCode } from "@/types/database";

const Schema = z.object({
  settings: z
    .array(
      z.object({
        rank: z.enum(["platinum", "gold", "silver", "bronze", "standard"]),
        lifetime_threshold: z.number().int().min(0),
      }),
    )
    .min(1),
  applyNow: z.boolean().optional(),
});

function thisMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
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

  const admin = createAdminClient();

  // 1. 累計下限しきい値を即時更新
  for (const s of body.settings) {
    const { error } = await admin
      .from("rank_settings")
      .update({ lifetime_threshold: s.lifetime_threshold })
      .eq("rank", s.rank);
    if (error) return NextResponse.json({ error: `${s.rank}: ${error.message}` }, { status: 500 });
  }

  let raised = 0;
  const raisedDetail: string[] = [];

  // 2. 即時フロア適用 (昇格のみ)
  if (body.applyNow) {
    const { data: settingsRows } = await admin.from("rank_settings").select("*");
    const settings = buildRankSettingsMap(settingsRows ?? []);
    // 累計フロアは過去実績ベースのため pending も対象 (suspended/削除は除外)。
    // 月次cronは受注ベースのため active のみ (別軸)。
    const { data: shops } = await admin
      .from("shops")
      .select("id, company_name, current_rank, lifetime_amount")
      .in("status", ["active", "pending"])
      .is("deleted_at", null);

    const month = thisMonthStr();
    for (const shop of shops ?? []) {
      const floor = lifetimeFloorRank(shop.lifetime_amount ?? 0, settings);
      const combined = higherRank(shop.current_rank, floor);
      if (combined === shop.current_rank) continue; // 昇格なし(降格はしない)
      const newRank = combined as RankCode;
      const { error: upErr } = await admin.from("shops").update({ current_rank: newRank }).eq("id", shop.id);
      if (upErr) continue;
      await admin.from("shop_rank_history").insert({
        shop_id: shop.id,
        month,
        prev_rank: shop.current_rank,
        new_rank: newRank,
        monthly_amount: 0,
        rebate_rate: settings[newRank].rebate,
      });
      raised++;
      raisedDetail.push(`${shop.company_name}: ${shop.current_rank} → ${newRank}`);
    }
  }

  await writeAudit(supabase, {
    adminId: user.id,
    action: "update_lifetime_floor",
    targetTable: "rank_settings",
    after: { settings: body.settings, applyNow: !!body.applyNow, raised },
  });

  return NextResponse.json({ ok: true, raised, raisedDetail });
}
