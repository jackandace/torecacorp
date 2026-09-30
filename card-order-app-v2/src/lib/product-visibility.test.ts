import { describe, expect, it } from "vitest";
import { isVisibleForShop, type AccessIndex } from "./product-visibility";

const gold = { id: "shopA", current_rank: "gold" as const };
const bronze = { id: "shopB", current_rank: "bronze" as const };

describe("isVisibleForShop", () => {
  it("shows unrestricted products to everyone", () => {
    expect(isVisibleForShop({ id: "p", min_rank: null }, bronze, new Map())).toBe(true);
  });
  it("applies minimum rank", () => {
    const p = { id: "p", min_rank: "gold" as const };
    expect(isVisibleForShop(p, gold, new Map())).toBe(true);
    expect(isVisibleForShop(p, bronze, new Map())).toBe(false);
  });
  it("nomination overrides rank", () => {
    const access: AccessIndex = new Map([["p", new Set(["shopB"])]]);
    const p = { id: "p", min_rank: "gold" as const };
    expect(isVisibleForShop(p, bronze, access)).toBe(true);
    expect(isVisibleForShop(p, gold, access)).toBe(false);
  });
});
