import { describe, expect, it } from "vitest";
import { formatReleaseDate, retailPriceTaxIncluded } from "./price-display";

describe("retailPriceTaxIncluded", () => {
  it("adds 10% tax", () => {
    expect(retailPriceTaxIncluded(4800)).toBe(5280);
    expect(retailPriceTaxIncluded(5460)).toBe(6006);
  });
  it("returns null for missing prices", () => {
    expect(retailPriceTaxIncluded(null)).toBeNull();
    expect(retailPriceTaxIncluded(0)).toBeNull();
  });
});

describe("formatReleaseDate", () => {
  it("formats with weekday", () => {
    expect(formatReleaseDate("2026-10-24")).toBe("2026年10月24日(土)");
  });
  it("returns null when unset or malformed", () => {
    expect(formatReleaseDate(null)).toBeNull();
    expect(formatReleaseDate("未定")).toBeNull();
  });
});
