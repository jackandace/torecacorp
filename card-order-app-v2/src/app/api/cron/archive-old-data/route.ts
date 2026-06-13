// 長期安定運用: 古いデータのアーカイブ Cron
//
// 毎月 1 日 03:00 JST に実行。
// 12 ヶ月より古い監査ログ・送信済み通知をアーカイブテーブルへ移動し、
// 論理削除済みで請求書に紐づかない orders/products を物理削除して
// 本番テーブルを軽い状態に保つ (DB 関数 archive_old_data に委譲)。
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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

  try {
    const { data, error } = await supabase.rpc("archive_old_data", { months_old: 12 });
    if (error) throw error;

    const result = (data ?? {}) as Record<string, unknown>;
    const processed =
      Number(result.archived_audit_logs ?? 0) +
      Number(result.archived_notifications ?? 0) +
      Number(result.purged_orders ?? 0) +
      Number(result.purged_products ?? 0);

    await supabase.from("batch_logs").insert({
      batch_name: "archive-old-data",
      status: "success",
      processed_count: processed,
      error_count: 0,
      error_detail: JSON.stringify(result),
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, result });
  } catch (e) {
    await supabase.from("batch_logs").insert({
      batch_name: "archive-old-data",
      status: "failure",
      processed_count: 0,
      error_count: 1,
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
