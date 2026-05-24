import { describe, expect, it } from "vitest";
import { calcRebate, aggregateRebate, getListedRate, formatRate, formatYen } from "./rebate";

describe("getListedRate", () => {
  it("実掛け率 + 上乗せ率を返す", () => {
    expect(getListedRate({ actual_rate: 0.74, rate_markup: 0.1 })).toBeCloseTo(0.84, 6);
  });
  it("ショップに rate_override があれば優先", () => {
    expect(
      getListedRate({ actual_rate: 0.74, rate_markup: 0.1 }, { rate_override: 0.9 }),
    ).toBe(0.9);
  });
  it("rate_override が null なら通常計算", () => {
    expect(
      getListedRate({ actual_rate: 0.77, rate_markup: 0.1 }, { rate_override: null }),
    ).toBeCloseTo(0.87, 6);
  });
});

describe("calcRebate", () => {
  it("仕様例: 定価 5000 × 12 BOX × 案内 0.84 - リベート 7% + 税 10%", () => {
    const r = calcRebate({
      unitPrice: 5000,
      confirmedQty: 12,
      listedRate: 0.84,
      rebateRate: 0.07,
    });
    expect(r.subtotal).toBe(50400);          // 5000*12*0.84
    expect(r.rebateAmount).toBe(3528);       // 50400*0.07
    expect(r.taxableAmount).toBe(50400 - 3528);
    expect(r.taxAmount).toBe(Math.floor((50400 - 3528) * 0.1));
    expect(r.totalAmount).toBe(r.taxableAmount + r.taxAmount);
  });

  it("リベート 0% (standard ランク) でも壊れない", () => {
    const r = calcRebate({ unitPrice: 1000, confirmedQty: 12, listedRate: 0.87, rebateRate: 0 });
    expect(r.rebateAmount).toBe(0);
    expect(r.taxableAmount).toBe(r.subtotal);
    expect(r.totalAmount).toBe(r.subtotal + r.taxAmount);
  });

  it("確定数量 0 ならすべて 0", () => {
    const r = calcRebate({ unitPrice: 1000, confirmedQty: 0, listedRate: 0.84, rebateRate: 0.1 });
    expect(r).toEqual({ subtotal: 0, rebateAmount: 0, taxableAmount: 0, taxAmount: 0, totalAmount: 0 });
  });

  it("小数点は切り捨て (Math.floor)", () => {
    // 999 * 1 * 0.84 = 839.16 → floor 839
    const r = calcRebate({ unitPrice: 999, confirmedQty: 1, listedRate: 0.84, rebateRate: 0.07 });
    expect(r.subtotal).toBe(839);
    // 839 * 0.07 = 58.73 → floor 58
    expect(r.rebateAmount).toBe(58);
    expect(r.taxableAmount).toBe(781);
    expect(r.taxAmount).toBe(78);  // floor(781 * 0.1) = 78.1 → 78
    expect(r.totalAmount).toBe(859);
  });
});

describe("aggregateRebate", () => {
  it("複数明細を合算", () => {
    const a = calcRebate({ unitPrice: 5000, confirmedQty: 12, listedRate: 0.84, rebateRate: 0.07 });
    const b = calcRebate({ unitPrice: 3000, confirmedQty: 24, listedRate: 0.84, rebateRate: 0.07 });
    const sum = aggregateRebate([a, b]);
    expect(sum.subtotal).toBe(a.subtotal + b.subtotal);
    expect(sum.rebateAmount).toBe(a.rebateAmount + b.rebateAmount);
    expect(sum.totalAmount).toBe(a.totalAmount + b.totalAmount);
  });
  it("空配列はすべて 0", () => {
    expect(aggregateRebate([])).toEqual({
      subtotal: 0, rebateAmount: 0, taxableAmount: 0, taxAmount: 0, totalAmount: 0,
    });
  });
});

describe("formatters", () => {
  it("formatRate: 0.84 → 84%", () => {
    expect(formatRate(0.84)).toBe("84%");
  });
  it("formatYen: 1234567 → ¥1,234,567", () => {
    expect(formatYen(1234567)).toBe("¥1,234,567");
  });
  it("formatYen: 0 → ¥0", () => {
    expect(formatYen(0)).toBe("¥0");
  });
});
