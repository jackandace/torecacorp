// 新商品のまとめメール (1日1回) の本文生成 — 純粋関数 (テスト可能)
import { formatReleaseDate, retailPriceTaxIncluded } from "@/lib/price-display";

export interface DigestProduct {
  id: string;
  title: string;
  titleName: string | null;       // タイトル (ポケモン / ワンピース …)
  releaseDate: string | null;
  price: number | null;
  orderDeadline: string | null;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** タイトルごとにまとめる (タイトル未分類は「その他」)。タイトル名・商品名順 */
export function groupByTitle(products: DigestProduct[]): { title: string; items: DigestProduct[] }[] {
  const map = new Map<string, DigestProduct[]>();
  for (const p of products) {
    const key = p.titleName ?? "その他";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a === "その他" ? 1 : b === "その他" ? -1 : a.localeCompare(b, "ja")))
    .map(([title, items]) => ({ title, items: items.sort((x, y) => x.title.localeCompare(y.title, "ja")) }));
}

export function buildDigestEmail(args: { companyName: string; products: DigestProduct[]; appUrl: string }): { subject: string; html: string } {
  const groups = groupByTitle(args.products);
  const n = args.products.length;
  const first = args.products[0]?.title ?? "";
  const subject = n === 1
    ? `【トレカ商事】新商品が公開されました：${first}`
    : `【トレカ商事】新商品が ${n} 件公開されました`;

  const rows = groups.map((g) => `
    <tr><td style="padding:14px 0 6px;font-weight:bold;font-size:15px;color:#1d4ed8;border-bottom:2px solid #dbeafe;">${esc(g.title)}</td></tr>
    ${g.items.map((p) => {
      const msrp = retailPriceTaxIncluded(p.price);
      const meta = [
        `発売日 ${formatReleaseDate(p.releaseDate) ?? "未定"}`,
        msrp != null ? `メーカー希望小売価格 ¥${msrp.toLocaleString()}(税込)` : null,
        p.orderDeadline ? `発注締切 ${p.orderDeadline.replaceAll("-", "/")}` : null,
      ].filter(Boolean).join("　/　");
      return `<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
        <a href="${args.appUrl}/order/${p.id}" style="color:#0f172a;font-weight:bold;text-decoration:none;">${esc(p.title)}</a>
        <div style="font-size:12px;color:#64748b;margin-top:3px;">${esc(meta)}</div>
      </td></tr>`;
    }).join("")}`).join("");

  const html = `
<div style="max-width:600px;margin:0 auto;font-family:-apple-system,'Hiragino Sans','Noto Sans JP',Meiryo,sans-serif;color:#1f2937;line-height:1.7;">
  <div style="padding:16px 0;border-bottom:2px solid #1d4ed8;"><strong>【新商品のお知らせ】トレカ商事カンパニー</strong></div>
  <p style="margin:16px 0 4px;">${esc(args.companyName)} 様</p>
  <p style="margin:0 0 8px;">新しい商品が ${n} 件公開されました。</p>
  <table style="width:100%;border-collapse:collapse;">${rows}</table>
  <p style="margin:20px 0;text-align:center;">
    <a href="${args.appUrl}/order" style="display:inline-block;background:#1d4ed8;color:#fff;padding:11px 26px;border-radius:8px;text-decoration:none;font-weight:bold;">発注ページを開く</a>
  </p>
  <div style="padding:12px 0;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
    受け取るタイトルの変更やメールの停止は、アプリの「お知らせ」→「受け取り設定」から行えます。<br>
    <a href="${args.appUrl}/notifications/settings" style="color:#1d4ed8;">受け取り設定を開く</a><br><br>
    株式会社パレットグループ トレカ商事カンパニー (自動送信)
  </div>
</div>`;
  return { subject, html };
}
