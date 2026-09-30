// お知らせの未読件数 (ナビの🔔用)。ページ移動のたびにナビから取り直す
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getNoticeAccess } from "@/lib/feature-flags";
import { getUnreadCounts } from "@/lib/shop-notifications";
import { getCurrentShop } from "@/lib/shop-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const shop = await getCurrentShop();
  if (!shop) return NextResponse.json({ enabled: false, general: 0, personal: 0 });
  const access = await getNoticeAccess(shop.id);
  if (!access.enabled || !access.startAt) return NextResponse.json({ enabled: false, general: 0, personal: 0 });
  const c = await getUnreadCounts(createAdminClient(), shop, access.startAt);
  return NextResponse.json({ enabled: true, ...c }, { headers: { "Cache-Control": "no-store" } });
}
