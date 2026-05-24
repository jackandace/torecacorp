// 月次ランク更新バッチ
//
// Vercel Cron で毎月 1 日 0:00 (UTC) に実行される。
// 認証は Authorization: Bearer ${CRON_SECRET} ヘッダで行う。
// 冪等性: 同月に複数回実行しても rank_history は同じ shop/month で重複しないようにする。
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildRankSettingsMap, computeGraceUntil, evaluateRank } from "@/lib/ranks";
import { firstDayOfMonth, lastDayOfMonth, lastMonth, toISODate } from "@/lib/dates";
import { notifyShop } from "@/lib/notify";
import { RANK_LABEL } from "@/constants/ranks";
import { formatRate } from "@/lib/rebate";
import type { RankCode } from "@/types/database";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const got = request.headers.get("authorization");
  return got === `Bearer ${expected}`;
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
  const today = new Date();
  const evalMonth = firstDayOfMonth(lastMonth(today));
  const evalMonthStr = toISODate(evalMonth);

  const startedAt = new Date().toISOString();
  let processed = 0;
  let errors = 0;
  const errorDetail: string[] = [];

  try {
    const { data: settingsRows, error: settingsErr } = await supabase
      .from("rank_settings")
      .select("*");
    if (settingsErr) throw settingsErr;
    const settings = buildRankSettingsMap(settingsRows ?? []);

    const { data: shops, error: shopsErr } = await supabase
      .from("shops")
      .select("*")
      .eq("status", "active")
      .is("deleted_at", null);
    if (shopsErr) throw shopsErr;

    for (const shop of shops ?? []) {
      try {
        // 評価月の発注額合計 (確定 + 仮確定)
        const { data: orderSum } = await supabase
          .from("orders")
          .select("total_price")
          .eq("shop_id", shop.id)
          .gte("created_at", evalMonth.toISOString())
          .lte("created_at", lastDayOfMonth(evalMonth).toISOString())
          .in("status", ["仮確定", "確定"])
          .is("deleted_at", null);

        const monthlyAmount =
          orderSum?.reduce((s, o) => s + (o.total_price ?? 0), 0) ?? 0;

        const result = evaluateRank({
          currentRank: shop.current_rank,
          monthlyAmount,
          rankLockedUntil: shop.rank_locked_until,
          today,
          settings,
        });

        // 履歴記録 (同 shop/month で既に履歴があれば更新)
        const { error: historyErr } = await supabase
          .from("shop_rank_history")
          .upsert(
            {
              shop_id: shop.id,
              month: evalMonthStr,
              prev_rank: shop.current_rank,
              new_rank: result.newRank,
              monthly_amount: monthlyAmount,
              rebate_rate: settings[result.newRank].rebate,
            },
            { onConflict: "shop_id,month" },
          );
        if (historyErr) {
          // unique key がないテーブル定義の場合は素直に insert
          await supabase.from("shop_rank_history").insert({
            shop_id: shop.id,
            month: evalMonthStr,
            prev_rank: shop.current_rank,
            new_rank: result.newRank,
            monthly_amount: monthlyAmount,
            rebate_rate: settings[result.newRank].rebate,
          });
        }

        // ランクが変わった場合のみ shops 更新
        if (result.newRank !== shop.current_rank) {
          const update: { current_rank: RankCode; rank_locked_until?: string | null } = {
            current_rank: result.newRank,
          };
          // 降格 (grace 経由) の場合、猶予はリセット
          if (result.reason === "demote") {
            update.rank_locked_until = null;
          }
          await supabase.from("shops").update(update).eq("id", shop.id);
          // ランク変動通知
          await notifyShop({
            supabase,
            shopId: shop.id,
            templateCode: "rank_changed",
            vars: {
              company_name: shop.company_name,
              prev_rank: RANK_LABEL[shop.current_rank],
              new_rank: RANK_LABEL[result.newRank],
              rebate_rate: formatRate(settings[result.newRank].rebate),
              monthly_amount: monthlyAmount.toLocaleString(),
            },
          });
        } else if (result.reason === "grace") {
          // 猶予開始 (初回降格条件を満たした場合)
          if (!shop.rank_locked_until) {
            await supabase
              .from("shops")
              .update({ rank_locked_until: computeGraceUntil(today) })
              .eq("id", shop.id);
          }
        }

        processed++;
      } catch (e) {
        errors++;
        errorDetail.push(`${shop.id}: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }

    await supabase.from("batch_logs").insert({
      batch_name: "rank-update",
      status: errors === 0 ? "success" : "partial",
      processed_count: processed,
      error_count: errors,
      error_detail: errorDetail.join("\n") || null,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      processed,
      errors,
      evalMonth: evalMonthStr,
    });
  } catch (e) {
    await supabase.from("batch_logs").insert({
      batch_name: "rank-update",
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
