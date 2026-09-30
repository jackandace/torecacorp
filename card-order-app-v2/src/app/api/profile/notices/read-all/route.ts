// お知らせをすべて既読にする (両タブ)
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getNoticeAccess } from "@/lib/feature-flags";
import { markSeen } from "@/lib/shop-notifications";
import { getCurrentShop } from "@/lib/shop-session";

export const dynamic = "force-dynamic";

export async function POST() {
  const shop = await getCurrentShop();
  if (!shop) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await getNoticeAccess(shop.id)).enabled) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient();
  await markSeen(admin, shop.id, "general");
  await markSeen(admin, shop.id, "personal");
  return NextResponse.json({ ok: true });
}
