import { describe, expect, it } from "vitest";
import { calcDeposit, calcSettlement, inferDepositRate, DEPOSIT_RATE, DEPOSIT_RATE_OPTIONS } from "./deposit";

describe("calcDeposit", () => {
  it("保証金 = 定価 × BOX × 掛け率 × 既定30%", () => {
    // 5000 × 300 × 0.84 × 0.3 = 378000
    expect(calcDeposit({ unitPrice: 5000, qtyBox: 300, listedRate: 0.84 })).toBe(378000);
  });
  it("率を指定できる (50%)", () => {
    // 5000 × 300 × 0.84 × 0.5 = 630000
    expect(calcDeposit({ unitPrice: 5000, qtyBox: 300, listedRate: 0.84, rate: 0.5 })).toBe(630000);
  });
  it("小数点は切り捨て", () => {
    // 3333 × 12 × 0.77 × 0.3 = 9239.076 → 9239
    expect(calcDeposit({ unitPrice: 3333, qtyBox: 12, listedRate: 0.77 })).toBe(9239);
  });
  it("DEPOSIT_RATE は 0.3 (2026-07-28 に 50% → 30% へ変更)", () => {
    expect(DEPOSIT_RATE).toBe(0.3);
  });
  it("選択肢は 30/40/50% で既定が先頭", () => {
    expect(DEPOSIT_RATE_OPTIONS[0]).toBe(DEPOSIT_RATE);
    expect([...DEPOSIT_RATE_OPTIONS]).toEqual([0.3, 0.4, 0.5]);
  });
});

describe("inferDepositRate", () => {
  it("保証金額 ÷ 満額 から率を推定 (1%単位)", () => {
    expect(inferDepositRate(1_153_440, 3_844_800)).toBe(0.3);
    expect(inferDepositRate(630_000, 1_260_000)).toBe(0.5);
  });
  it("端数があっても丸めて推定", () => {
    expect(inferDepositRate(9239, 30799)).toBe(0.3);
  });
  it("満額0や保証金0は null", () => {
    expect(inferDepositRate(0, 100)).toBeNull();
    expect(inferDepositRate(100, 0)).toBeNull();
  });
  it("推定値が 0〜1 を外れたら null", () => {
    expect(inferDepositRate(200, 100)).toBeNull();
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
