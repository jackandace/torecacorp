import { describe, expect, it } from "vitest";
import { validateOrderQty, calcCartSubtotal } from "./orders";

const baseProduct = {
  min_order_box: 12,
  ct_to_box: 12,
  planned_qty: 100,
  ordered_qty: 0,
  status: "受付中" as const,
  flow_type: "haibun" as const,
};

describe("validateOrderQty", () => {
  it("BOX 12 はOK", () => {
    expect(validateOrderQty({ product: baseProduct, orderUnit: "BOX", qty: 12 })).toEqual({
      ok: true,
      qtyInBox: 12,
    });
  });

  it("BOX 11 は最低発注数未満で NG", () => {
    const r = validateOrderQty({ product: baseProduct, orderUnit: "BOX", qty: 11 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/最低発注数/);
  });

  it("CT 1 = 12 BOX として OK", () => {
    expect(validateOrderQty({ product: baseProduct, orderUnit: "CT", qty: 1 }).qtyInBox).toBe(12);
  });

  it("CT 0 は NG", () => {
    const r = validateOrderQty({ product: baseProduct, orderUnit: "CT", qty: 0 });
    expect(r.ok).toBe(false);
  });

  it("在庫超過は NG", () => {
    const r = validateOrderQty({
      product: { ...baseProduct, planned_qty: 50, ordered_qty: 40 },
      orderUnit: "BOX",
      qty: 12,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/発注可能数/);
  });

  it("受付停止は NG", () => {
    const r = validateOrderQty({
      product: { ...baseProduct, status: "受付停止" },
      orderUnit: "BOX",
      qty: 12,
    });
    expect(r.ok).toBe(false);
  });

  it("CT 単位の在庫チェックも BOX 換算で行う", () => {
    const r = validateOrderQty({
      product: { ...baseProduct, ct_to_box: 12, planned_qty: 20, ordered_qty: 0 },
      orderUnit: "CT",
      qty: 2, // 24 BOX 必要なのに 20 しかない
    });
    expect(r.ok).toBe(false);
  });

  it("min_order_box が違う場合に追従", () => {
    const ok = validateOrderQty({
      product: { ...baseProduct, min_order_box: 6 },
      orderUnit: "BOX",
      qty: 6,
    });
    expect(ok.ok).toBe(true);
    const ng = validateOrderQty({
      product: { ...baseProduct, min_order_box: 6 },
      orderUnit: "BOX",
      qty: 5,
    });
    expect(ng.ok).toBe(false);
  });

  it("負数や非整数は NG", () => {
    expect(validateOrderQty({ product: baseProduct, orderUnit: "BOX", qty: -1 }).ok).toBe(false);
    expect(validateOrderQty({ product: baseProduct, orderUnit: "BOX", qty: 1.5 }).ok).toBe(false);
  });

  it("カット品は在庫上限を無視して希望BOX数を受け付ける", () => {
    const cut = { ...baseProduct, flow_type: "cut" as const, planned_qty: 0, ordered_qty: 0 };
    const r = validateOrderQty({ product: cut, orderUnit: "BOX", qty: 300 });
    expect(r.ok).toBe(true);
    expect(r.qtyInBox).toBe(300);
  });

  it("カット品でも最低発注数・受付停止は適用される", () => {
    const cut = { ...baseProduct, flow_type: "cut" as const, planned_qty: 0 };
    expect(validateOrderQty({ product: cut, orderUnit: "BOX", qty: 5 }).ok).toBe(false); // 最低12未満
    expect(
      validateOrderQty({ product: { ...cut, status: "受付停止" as const }, orderUnit: "BOX", qty: 12 }).ok,
    ).toBe(false);
  });
});

describe("calcCartSubtotal", () => {
  it("複数明細を加算 (小数点切り捨て)", () => {
    const subtotal = calcCartSubtotal([
      { unitPrice: 5000, listedRate: 0.84, qtyInBox: 12 }, // 50400
      { unitPrice: 3000, listedRate: 0.87, qtyInBox: 24 }, // 62640
    ]);
    expect(subtotal).toBe(50400 + 62640);
  });
  it("空配列は 0", () => {
    expect(calcCartSubtotal([])).toBe(0);
  });
});
