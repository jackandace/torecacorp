import { describe, expect, it } from "vitest";
import { buildDigestEmail, groupByTitle, type DigestProduct } from "./new-product-digest";

const p = (over: Partial<DigestProduct>): DigestProduct => ({
  id: "id", title: "商品", titleName: null, releaseDate: null, price: null, orderDeadline: null, ...over,
});

describe("groupByTitle", () => {
  it("groups by title and puts unclassified last", () => {
    const g = groupByTitle([
      p({ id: "1", title: "B", titleName: "遊戯王" }),
      p({ id: "2", title: "X", titleName: null }),
      p({ id: "3", title: "A", titleName: "ポケモンカード" }),
    ]);
    expect(g.map((x) => x.title)).toEqual(["ポケモンカード", "遊戯王", "その他"]);
  });
});

describe("buildDigestEmail", () => {
  it("builds subject by count and escapes product names", () => {
    const one = buildDigestEmail({ companyName: "テスト<店>", products: [p({ title: "拡張<パック>" })], appUrl: "https://x" });
    expect(one.subject).toContain("拡張<パック>");
    expect(one.html).toContain("拡張&lt;パック&gt;");
    expect(one.html).toContain("テスト&lt;店&gt;");
    const many = buildDigestEmail({ companyName: "A", products: [p({ id: "1" }), p({ id: "2" })], appUrl: "https://x" });
    expect(many.subject).toBe("【トレカ商事】新商品が 2 件公開されました");
  });
  it("shows tax-included MSRP and release date", () => {
    const { html } = buildDigestEmail({ companyName: "A", products: [p({ price: 4800, releaseDate: "2026-10-24" })], appUrl: "https://x" });
    expect(html).toContain("¥5,280(税込)");
    expect(html).toContain("2026年10月24日(土)");
  });
});
