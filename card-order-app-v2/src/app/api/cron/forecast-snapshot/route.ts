// 予実スナップショット cron (月初) — 当月予測を凍結保存 + 前月の実績(収益認識)を締める
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { projectMonthly, type OrderPoint } from "@/lib/forecast";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return request.headers.get("authorization") === `Bearer ${expected}`;
}

async function run() {
  const admin = createAdminClient();
  const now = new Date();
  const curMonth = now.toISOString().slice(0, 7);
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const prevMonth = prev.toISOString().slice(0, 7);
  const prevStart = new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth(), 1)).toISOString();
  const curStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  // 1) 当月予測を算出して凍結(既存があれば上書きしない)
  const { data: orders } = await admin
    .from("orders")
    .select("subtotal, created_at, product_id")
    .eq("status", "確定")
    .is("deleted_at", null)
    .limit(5000);
  const tMap = new Map<string, OrderPoint[]>();
  for (const o of orders ?? []) {
    const arr = tMap.get(o.product_id) ?? [];
    arr.push({ date: (o.created_at ?? "").slice(0, 10), revenue: o.subtotal ?? 0 });
    tMap.set(o.product_id, arr);
  }
  const projection = projectMonthly([...tMap.entries()].map(([key, points]) => ({ key, points })), now.toISOString().slice(0, 10), 1);
  const curForecast = projection[0]?.amount ?? 0;

  const { data: existing } = await admin.from("forecast_snapshots").select("id").eq("target_month", curMonth).maybeSingle();
  let inserted = false;
  if (!existing) {
    await admin.from("forecast_snapshots").insert({ target_month: curMonth, forecast_amount: curForecast });
    inserted = true;
  }

  // 2) 前月の実績(収益認識=納品済み subtotal)を締める
  const { data: delivered } = await admin
    .from("orders")
    .select("subtotal")
    .not("delivered_at", "is", null)
    .gte("delivered_at", prevStart)
    .lt("delivered_at", curStart)
    .is("deleted_at", null);
  const actual = (delivered ?? []).reduce((s, o) => s + (o.subtotal ?? 0), 0);

  const { data: prevSnap } = await admin.from("forecast_snapshots").select("id, forecast_amount, actual_amount").eq("target_month", prevMonth).maybeSingle();
  let closed = false;
  if (prevSnap && prevSnap.actual_amount == null) {
    await admin.from("forecast_snapshots").update({
      actual_amount: actual,
      variance: actual - prevSnap.forecast_amount,
      closed_at: new Date().toISOString(),
    }).eq("id", prevSnap.id);
    closed = true;
  }

  return { curMonth, curForecast, inserted, prevMonth, actual, closed };
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await run()) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown" }, { status: 500 });
  }
}
export async function POST(request: NextRequest) { return GET(request); }
