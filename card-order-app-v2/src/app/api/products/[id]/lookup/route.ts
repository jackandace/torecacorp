// 商品の発売情報/JANコードを外部URLから取得する補助 API (admin)
//
// 管理者が貼り付けたメーカー/商品ページURLをサーバ側で取得し、
// タイトル・発売日・JANコード候補を抽出して返す(あくまで候補・保存は人手で確認)。
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({ url: z.string().url() });

/** 内部/プライベート宛の SSRF を基本ブロック */
function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".local")) return true;
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (h === "[::1]" || h === "::1") return true;
  return false;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").trim();
}

function metaContent(html: string, prop: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, "i");
  const m = re.exec(html) ?? re2.exec(html);
  return m ? decodeEntities(m[1]!) : null;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "URLが不正です" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(body.url);
  } catch {
    return NextResponse.json({ error: "URLが不正です" }, { status: 400 });
  }
  if (!["http:", "https:"].includes(target.protocol) || isBlockedHost(target.hostname)) {
    return NextResponse.json({ error: "このURLは取得できません" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(target.toString(), {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; torecacorp-bot/1.0)" },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return NextResponse.json({ error: `取得失敗 (HTTP ${res.status})` }, { status: 502 });

    // 先頭 512KB のみ読む
    const raw = await res.text();
    const html = raw.slice(0, 512 * 1024);

    const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    const title = metaContent(html, "og:title") ?? (titleTag ? decodeEntities(titleTag[1]!) : null);
    const description = metaContent(html, "og:description") ?? metaContent(html, "description");

    // JAN: 13桁。日本のJANは 45/49 始まりが多い
    const jans = Array.from(html.matchAll(/\b(\d{13})\b/g)).map((m) => m[1]!);
    const jan = jans.find((j) => j.startsWith("45") || j.startsWith("49")) ?? jans[0] ?? null;

    // 発売日: 「発売日: 2026/07/10」「2026年7月10日発売」等
    const text = html.replace(/<[^>]+>/g, " ");
    const relPatterns = [
      /発売日[^\d]{0,6}(\d{4})[年/.\-](\d{1,2})[月/.\-](\d{1,2})/,
      /(\d{4})[年/.\-](\d{1,2})[月/.\-](\d{1,2})日?\s*発売/,
    ];
    let releaseDate: string | null = null;
    for (const p of relPatterns) {
      const m = p.exec(text);
      if (m) {
        releaseDate = `${m[1]}-${String(m[2]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`;
        break;
      }
    }

    return NextResponse.json({
      ok: true,
      title: title?.slice(0, 300) ?? null,
      description: description?.slice(0, 500) ?? null,
      jan,
      releaseDate,
      source: target.toString(),
    });
  } catch (e) {
    const msg = e instanceof Error && e.name === "AbortError" ? "タイムアウト" : e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: `取得に失敗しました: ${msg}` }, { status: 502 });
  }
}
