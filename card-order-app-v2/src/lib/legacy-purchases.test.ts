import { describe, expect, it } from "vitest";
import {
  LEGACY_TEMPLATE_COLUMNS,
  checkTemplateHeader,
  parseLegacyDate,
  parseLegacyInt,
  parseLegacyRow,
  parseLegacySheet,
  parseShipmentStatus,
} from "./legacy-purchases";

const TODAY = "2026-09-30";
const HEADER = LEGACY_TEMPLATE_COLUMNS.map((c) => c.header);

describe("parseLegacyDate", () => {
  it("accepts slash / dash / Excel serial", () => {
    expect(parseLegacyDate("2025/3/5")).toBe("2025-03-05");
    expect(parseLegacyDate("2025-03-05")).toBe("2025-03-05");
    expect(parseLegacyDate(45721)).toBe("2025-03-05");
  });
  it("rejects impossible or free-form dates", () => {
    expect(parseLegacyDate("2025/02/30")).toBeNull();
    expect(parseLegacyDate("3月5日")).toBeNull();
    expect(parseLegacyDate("")).toBeNull();
  });
});

describe("parseLegacyInt", () => {
  it("accepts numbers with comma / yen", () => {
    expect(parseLegacyInt("1,234")).toBe(1234);
    expect(parseLegacyInt("¥4,800")).toBe(4800);
    expect(parseLegacyInt("4800円")).toBe(4800);
    expect(parseLegacyInt(12)).toBe(12);
  });
  it("rejects mixed units and decimals", () => {
    expect(parseLegacyInt("12box")).toBeNull();
    expect(parseLegacyInt(1.5)).toBeNull();
  });
});

describe("parseShipmentStatus", () => {
  it("maps japanese labels", () => {
    expect(parseShipmentStatus("出荷済")).toBe("shipped");
    expect(parseShipmentStatus("出荷済み")).toBe("shipped");
    expect(parseShipmentStatus("未出荷")).toBe("unshipped");
    expect(parseShipmentStatus("発送済")).toBeNull();
  });
});

describe("checkTemplateHeader", () => {
  it("passes the exact template header (asterisks ignored)", () => {
    expect(checkTemplateHeader(HEADER)).toEqual([]);
    expect(checkTemplateHeader(["購入日*", ...HEADER.slice(1)])).toEqual([]);
  });
  it("reports shifted columns", () => {
    const shifted = ["", ...HEADER];
    expect(checkTemplateHeader(shifted).length).toBeGreaterThan(0);
  });
});

describe("parseLegacyRow", () => {
  it("auto-computes amount when blank and defaults unit to BOX", () => {
    const r = parseLegacyRow(["2025/03/15", "拡張パック", 10, "", 4800, "", "出荷済"], 2, TODAY);
    expect(r.errors).toEqual([]);
    expect(r.data).toMatchObject({ unit: "BOX", amount: 48000, shipmentStatus: "shipped" });
  });
  it("warns (not errors) when amount differs from qty x price", () => {
    const r = parseLegacyRow(["2025/03/15", "拡張パック", 10, "BOX", 4800, 45000, "未出荷"], 2, TODAY);
    expect(r.errors).toEqual([]);
    expect(r.warnings.length).toBe(1);
    expect(r.data?.amount).toBe(45000);
  });
  it("errors on future date, bad unit and missing fields", () => {
    const r = parseLegacyRow(["2027/01/01", "", "0", "ケース", "abc", "", "?"], 3, TODAY);
    expect(r.data).toBeNull();
    expect(r.errors.length).toBeGreaterThanOrEqual(5);
  });
});

describe("parseLegacySheet", () => {
  it("rejects a sheet whose header does not match the template", () => {
    const out = parseLegacySheet([["日付", "商品"], ["2025/01/01", "x"]], TODAY);
    expect(out.headerProblems.length).toBeGreaterThan(0);
    expect(out.rows).toEqual([]);
  });
  it("skips blank rows and flags in-file duplicates", () => {
    const row = ["2025/03/15", "拡張パック", 10, "BOX", 4800, "", "出荷済"];
    const out = parseLegacySheet([HEADER, row, [], ["", "", ""], row], TODAY);
    expect(out.rows.length).toBe(2);
    expect(out.rows[1]!.row).toBe(5);
    expect(out.rows[1]!.warnings[0]).toContain("2行目");
  });
});
