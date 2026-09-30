// お客様向けアプリ内お知らせ (server-side 専用)
//
// タブは2つ:
//   general  (全体へのお知らせ): 新しく公開された商品 + 管理者が投稿したお知らせ
//   personal (あなたへのお知らせ): 発注確定・発送・請求書・ランク変更など、そのお客様宛ての通知
//                                  (notifications テーブル = 送信したメールの記録をそのまま表示)
// 新着商品は「そのお客様が見られる商品だけ」(ランク制限・個別指名) かつ「希望タイトル」に絞って出す。
// 未読は shop_notification_reads のタブ別既読日時より新しいものの件数。
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, RankCode } from "@/types/database";
import { filterProductsForShop } from "@/lib/product-visibility";
import { getNoticePrefs, matchesTitlePref } from "@/lib/notice-prefs";
import { laterOf } from "@/lib/feature-flags";

export type NoticeTab = "general" | "personal";
export const NEW_PRODUCT_WINDOW_DAYS = 30;

type Sb = SupabaseClient<Database>;
type ShopLite = { id: string; current_rank: RankCode; created_at: string };

export interface GeneralItem {
  kind: "new_product" | "announcement";
  id: string;
  at: string;
  title: string;
  body: string | null;
  href: string | null;
  releaseDate?: string | null;
  orderable?: boolean;
}

/** タブ別の既読日時。未作成 (035 以降に登録したショップ) は登録日時を起点にする */
export async function getSeenAt(admin: Sb, shop: ShopLite): Promise<Record<NoticeTab, string>> {
  const { data } = await admin
    .from("shop_notification_reads")
    .select("general_seen_at, personal_seen_at")
    .eq("shop_id", shop.id)
    .maybeSingle();
  return {
    general: data?.general_seen_at ?? shop.created_at,
    personal: data?.personal_seen_at ?? shop.created_at,
  };
}

export async function markSeen(admin: Sb, shopId: string, tab: NoticeTab): Promise<void> {
  const now = new Date().toISOString();
  const { data } = await admin.from("shop_notification_reads").select("shop_id").eq("shop_id", shopId).maybeSingle();
  if (data) {
    await admin.from("shop_notification_reads")
      .update(tab === "general" ? { general_seen_at: now, updated_at: now } : { personal_seen_at: now, updated_at: now })
      .eq("shop_id", shopId);
  } else {
    // 初回: 見ていない方のタブは登録日時を起点のまま残す (未読が消えないように)
    await admin.from("shop_notification_reads").insert({
      shop_id: shopId,
      general_seen_at: tab === "general" ? now : "1970-01-01T00:00:00Z",
      personal_seen_at: tab === "personal" ? now : "1970-01-01T00:00:00Z",
      updated_at: now,
    });
  }
}

function windowStart(): string {
  return new Date(Date.now() - NEW_PRODUCT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

/** このお客様が見られる・希望タイトルに合う、直近に公開された商品 */
async function visibleNewProducts(admin: Sb, shop: ShopLite, since: string) {
  const [{ data }, prefs] = await Promise.all([admin
    .from("products")
    .select("id, title, min_rank, published_at, release_date, status, order_deadline, title_group_id")
    .eq("is_visible", true)
    .is("deleted_at", null)
    .not("published_at", "is", null)
    .gt("published_at", since)
    .order("published_at", { ascending: false })
    .limit(300), getNoticePrefs(admin, shop.id)]);
  const visible = await filterProductsForShop(admin, data ?? [], shop);
  return visible.filter((p) => matchesTitlePref(prefs, p.title_group_id));
}

/**
 * 全体へのお知らせ一覧 (新着商品 + 管理者のお知らせ、新しい順)。
 * startAt (お知らせ開始時刻) より前に公開された商品・投稿されたお知らせは一切出さない。
 */
export async function getGeneralFeed(admin: Sb, shop: ShopLite, startAt: string): Promise<GeneralItem[]> {
  const since = laterOf(windowStart(), startAt);
  const [products, { data: anns }] = await Promise.all([
    visibleNewProducts(admin, shop, since),
    admin.from("announcements")
      .select("id, title, body, link_url, created_at")
      .is("deleted_at", null)
      .gte("created_at", startAt)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const items: GeneralItem[] = [
    ...products.map((p) => ({
      kind: "new_product" as const,
      id: p.id,
      at: p.published_at as string,
      title: p.title,
      body: null,
      href: `/order/${p.id}`,
      releaseDate: p.release_date,
      orderable: p.status === "受付中",
    })),
    ...(anns ?? []).map((a) => ({
      kind: "announcement" as const,
      id: a.id,
      at: a.created_at,
      title: a.title,
      body: a.body,
      href: a.link_url,
    })),
  ];
  return items.sort((a, b) => b.at.localeCompare(a.at));
}

/** タブ別の未読件数 (開始時刻より前のものは数えない) */
export async function getUnreadCounts(admin: Sb, shop: ShopLite, startAt: string): Promise<Record<NoticeTab, number>> {
  const raw = await getSeenAt(admin, shop);
  const seen = { general: laterOf(raw.general, startAt), personal: laterOf(raw.personal, startAt) };
  const generalSince = laterOf(windowStart(), seen.general);
  const [products, { count: annCount }, { count: personalCount }] = await Promise.all([
    visibleNewProducts(admin, shop, generalSince),
    admin.from("announcements").select("id", { count: "exact", head: true })
      .is("deleted_at", null).gt("created_at", seen.general),
    admin.from("notifications").select("id", { count: "exact", head: true })
      .eq("shop_id", shop.id).gt("created_at", seen.personal),
  ]);
  return { general: products.length + (annCount ?? 0), personal: personalCount ?? 0 };
}
