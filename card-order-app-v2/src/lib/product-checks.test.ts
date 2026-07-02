import { describe, expect, it } from "vitest";
import { checkProductPublishable } from "./product-checks";

const base = {
  title: "強化拡張パック",
  price: 5000,
  actual_rate: 0.76,
  ct_to_box: 12,
  min_order_box: 12,
  planned_qty: 100,
  flow_type: "haibun" as const,
  order_deadline: "2026-07-10",
  jan_code: "4901234567890",
  carton_delivery: false,
  master_carton_box: null,
};

describe("checkProductPublishable", () => {
  it("全て揃っていれば ok", () => {
    const r = checkProductPublishable(base);
    expect(r.ok).toBe(true);
    expect(r.errors).toHaveLength(0);
  });
  it("価格0はエラー", () => {
    const r = checkProductPublishable({ ...base, price: 0 });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("定価"))).toBe(true);
  });
  it("掛け率0はエラー", () => {
    expect(checkProductPublishable({ ...base, actual_rate: 0 }).ok).toBe(false);
  });
  it("掛け率が1超はエラー", () => {
    expect(checkProductPublishable({ ...base, actual_rate: 1.2 }).ok).toBe(false);
  });
  it("配分品で在庫0はエラー", () => {
    expect(checkProductPublishable({ ...base, flow_type: "haibun", planned_qty: 0 }).ok).toBe(false);
  });
  it("カット品は在庫0でもOK", () => {
    expect(checkProductPublishable({ ...base, flow_type: "cut", planned_qty: 0 }).ok).toBe(true);
  });
  it("締切なし・JANなしは警告(公開は可)", () => {
    const r = checkProductPublishable({ ...base, order_deadline: null, jan_code: null });
    expect(r.ok).toBe(true);
    expect(r.warnings.length).toBeGreaterThanOrEqual(2);
  });
  it("カートン配送でマスターカートン未設定は警告", () => {
    const r = checkProductPublishable({ ...base, carton_delivery: true, master_carton_box: null });
    expect(r.warnings.some((w) => w.includes("マスターカートン"))).toBe(true);
  });
});
