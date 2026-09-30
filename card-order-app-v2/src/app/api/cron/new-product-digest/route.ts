// 新商品のまとめメール (1日1回・毎日 10:00 JST)
//
// 前回の対象時刻 (shop_notice_prefs.last_digest_at、初回は24時間前) 以降に公開された
// 受付中の商品を、ショップごとに「見られる商品 (ランク・個別指名)」かつ「希望タイトル」で絞り、
// 1通にまとめて送る。新商品が無いショップには送らない。
// お知らせ機能の先行公開中は、テストユーザー (is_beta_tester) にだけ送る。
//
// 認証: Vercel Cron (Authorization: Bearer CRON_SECRET) または管理者ログイン。
// 管理者は ?shop=<id> で1社だけ、?dry=1 で送信せず内容だけ確認できる (動作確認用)。
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { sendEmail } from "@/lib/email/resend";
import { shopNoticesEnabled } from "@/lib/feature-flags";
import { DEFAULT_PREFS, matchesTitlePref } from "@/lib/notice-prefs";
import { isVisibleForShop, loadAccessIndex } from "@/lib/product-visibility";
import { buildDigestEmail, type DigestProduct } from "@/lib/new-product-digest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function authorize(request: NextRequest): Promise<"cron" | "admin" | null> {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") === `Bearer ${secret}`) return "cron";
  const { data: { user } } = await createClient().auth.getUser();
  return user && isAdmin(user) ? "admin" : null;
}

export async function GET(request: NextRequest) { return run(request); }
export async function POST(request: NextRequest) { return run(request); }

async function run(request: NextRequest) {
  const who = await authorize(request);
  if (!who) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const onlyShop = who === "admin" ? request.nextUrl.searchParams.get("shop") : null;
  const dryRun = who === "admin" && request.nextUrl.searchParams.get("dry") === "1";
  const admin = createAdminClient();
  const startedAt = new Date().toISOString();
  const now = startedAt;
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://card-order-app-v2.vercel.app";
  const canSend = !!process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith("re_placeholder");

  let processed = 0;
  let sent = 0;
  let errors = 0;
  const detail: string[] = [];
  const preview: { shop: string; products: string[] }[] = [];

  try {
    let shopQuery = admin
      .from("shops")
      .select("id, company_name, email, current_rank, created_at, is_beta_tester, status")
      .is("deleted_at", null)
      .eq("status", "active")
      .not("email", "is", null);
    if (onlyShop) shopQuery = shopQuery.eq("id", onlyShop);
    const { data: shopRows } = await shopQuery;
    const shops = (shopRows ?? []).filter((s) => shopNoticesEnabled(s));

    const { data: prefRows } = shops.length
      ? await admin.from("shop_notice_prefs").select("*").in("shop_id", shops.map((s) => s.id))
      : { data: [] };
    const prefsBy = new Map((prefRows ?? []).map((p) => [p.shop_id, p]));

    // 全ショップ中で最も古い起点以降の公開商品をまとめて取得
    const sinceOf = (shopId: string) => prefsBy.get(shopId)?.last_digest_at ?? dayAgo;
    const earliest = shops.reduce((min, s) => (sinceOf(s.id) < min ? sinceOf(s.id) : min), dayAgo);
    const { data: productRows } = shops.length
      ? await admin
          .from("products")
          .select("id, title, min_rank, published_at, release_date, price, order_deadline, title_group_id, product_titles(name)")
          .eq("is_visible", true)
          .eq("status", "受付中")
          .is("deleted_at", null)
          .gt("published_at", earliest)
          .lte("published_at", now)
      : { data: [] };
    const products = productRows ?? [];
    const access = await loadAccessIndex(admin, products.map((p) => p.id));

    for (const shop of shops) {
      processed++;
      const prefs = prefsBy.get(shop.id) ?? { ...DEFAULT_PREFS, shop_id: shop.id };
      const since = sinceOf(shop.id);
      const list: DigestProduct[] = products
        .filter((p) => (p.published_at as string) > since)
        .filter((p) => isVisibleForShop(p, shop, access))
        .filter((p) => matchesTitlePref(prefs, p.title_group_id))
        .map((p) => ({
          id: p.id,
          title: p.title,
          titleName: (p.product_titles as unknown as { name?: string } | null)?.name ?? null,
          releaseDate: p.release_date,
          price: p.price,
          orderDeadline: p.order_deadline,
        }));

      let ok = true;
      if (list.length > 0 && prefs.email_enabled) {
        if (dryRun) {
          preview.push({ shop: shop.company_name, products: list.map((p) => p.title) });
        } else if (canSend && shop.email) {
          try {
            const { subject, html } = buildDigestEmail({ companyName: shop.company_name, products: list, appUrl });
            await sendEmail({ to: shop.email, subject, html, replyTo: "m.kawazu@torecacorp.jp" });
            sent++;
          } catch (e) {
            ok = false;
            errors++;
            detail.push(`${shop.company_name}: ${e instanceof Error ? e.message : "送信失敗"}`);
          }
        }
      }
      // 送れた (または送る物が無い・受け取らない設定) ショップは起点を進める。失敗時は翌日に再送
      if (ok && !dryRun) {
        await admin.from("shop_notice_prefs").upsert(
          { shop_id: shop.id, email_enabled: prefs.email_enabled, title_mode: prefs.title_mode, title_ids: prefs.title_ids, last_digest_at: now, updated_at: now },
          { onConflict: "shop_id" },
        );
      }
    }

    if (!dryRun) {
      await admin.from("batch_logs").insert({
        batch_name: "new-product-digest",
        status: errors === 0 ? "success" : "partial",
        processed_count: processed,
        error_count: errors,
        error_detail: detail.join("\n") || null,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
      });
    }
    return NextResponse.json({ ok: true, dryRun, processed, sent, errors, products: products.length, preview });
  } catch (e) {
    await admin.from("batch_logs").insert({
      batch_name: "new-product-digest",
      status: "failure",
      processed_count: processed,
      error_count: errors + 1,
      error_detail: e instanceof Error ? e.message : "unknown",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown" }, { status: 500 });
  }
}
