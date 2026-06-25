import { describe, expect, it } from "vitest";
import { calcDeposit, calcSettlement, DEPOSIT_RATE } from "./deposit";

describe("calcDeposit", () => {
  it("保証金 = 定価 × BOX × 掛け率 × 50%", () => {
    // 5000 × 300 × 0.84 × 0.5 = 630000
    expect(calcDeposit({ unitPrice: 5000, qtyBox: 300, listedRate: 0.84 })).toBe(630000);
  });
  it("小数点は切り捨て", () => {
    // 3333 × 12 × 0.77 × 0.5 = 15398.46 → 15398
    expect(calcDeposit({ unitPrice: 3333, qtyBox: 12, listedRate: 0.77 })).toBe(15398);
  });
  it("DEPOSIT_RATE は 0.5", () => {
    expect(DEPOSIT_RATE).toBe(0.5);
  });
});

describe("calcSettlement", () => {
  it("確定満額 > 保証金 → 差額請求(final)", () => {
    const r = calcSettlement({ finalTotal: 100000, depositPaid: 60000 });
    expect(r.kind).toBe("final");
    expect(r.amount).toBe(40000);
  });
  it("確定満額 < 保証金 → 返金(refund)", () => {
    // 300box保証金を預かり、100boxで確定し満額が下回るケース
    const r = calcSettlement({ finalTotal: 40000, depositPaid: 60000 });
    expect(r.kind).toBe("refund");
    expect(r.amount).toBe(20000);
  });
  it("一致 → 精算済み(settled)", () => {
    const r = calcSettlement({ finalTotal: 50000, depositPaid: 50000 });
    expect(r.kind).toBe("settled");
    expect(r.amount).toBe(0);
  });
});
