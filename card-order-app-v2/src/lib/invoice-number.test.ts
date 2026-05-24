import { describe, expect, it } from "vitest";
import { buildInvoiceNumber } from "./invoice-number";

describe("buildInvoiceNumber", () => {
  it("INV-YYYYMM-0001 形式", () => {
    expect(buildInvoiceNumber(new Date("2026-05-23"), 1)).toBe("INV-202605-0001");
  });
  it("4 桁ゼロ埋め", () => {
    expect(buildInvoiceNumber(new Date("2026-12-01"), 42)).toBe("INV-202612-0042");
  });
  it("9999 もそのまま", () => {
    expect(buildInvoiceNumber(new Date("2026-01-01"), 9999)).toBe("INV-202601-9999");
  });
});
