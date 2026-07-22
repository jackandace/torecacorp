import { describe, expect, it } from "vitest";
import { addDaysISO, orderCutoffDate, isOrderableByDeadline, ORDER_CUTOFF_DAYS } from "./dates";

describe("addDaysISO", () => {
  it("日数を加算", () => {
    expect(addDaysISO("2026-06-30", 7)).toBe("2026-07-07");
  });
  it("日数を減算(月跨ぎ)", () => {
    expect(addDaysISO("2026-07-03", -7)).toBe("2026-06-26");
  });
  it("年跨ぎ", () => {
    expect(addDaysISO("2027-01-03", -7)).toBe("2026-12-27");
  });
});

describe("orderCutoffDate (発注期限の3日前)", () => {
  it("ORDER_CUTOFF_DAYS は 3", () => {
    expect(ORDER_CUTOFF_DAYS).toBe(3);
  });
  it("発注期限の3日前を返す", () => {
    expect(orderCutoffDate("2026-07-10")).toBe("2026-07-07");
  });
  it("null は null", () => {
    expect(orderCutoffDate(null)).toBeNull();
  });
});

describe("isOrderableByDeadline", () => {
  it("締切(3日前)より前なら発注可", () => {
    // 発注期限 7/10 → 実効締切 7/7。今日 7/1 なら可
    expect(isOrderableByDeadline("2026-07-10", "2026-07-01")).toBe(true);
  });
  it("実効締切ちょうどは可", () => {
    // 実効締切 7/7 ちょうど
    expect(isOrderableByDeadline("2026-07-10", "2026-07-07")).toBe(true);
  });
  it("実効締切を過ぎたら不可", () => {
    // 実効締切 7/7。今日 7/8 は不可
    expect(isOrderableByDeadline("2026-07-10", "2026-07-08")).toBe(false);
  });
  it("発注期限まで3日未満なら既に締切", () => {
    // 発注期限 7/3、今日 7/1 → 実効締切 6/30 < 7/1 で不可
    expect(isOrderableByDeadline("2026-07-03", "2026-07-01")).toBe(false);
  });
  it("締切なし(null)は常に可", () => {
    expect(isOrderableByDeadline(null, "2026-07-01")).toBe(true);
  });
});
