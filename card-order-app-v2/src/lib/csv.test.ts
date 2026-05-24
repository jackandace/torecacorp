import { describe, expect, it } from "vitest";
import { toCsv, fromCsv } from "./csv";

describe("toCsv", () => {
  it("BOM 付きでヘッダ + 行を出力", () => {
    const csv = toCsv([{ a: 1, b: 2 }]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("a,b");
    expect(csv).toContain("1,2");
  });
  it("カンマや改行を含むセルはエスケープ", () => {
    const csv = toCsv([{ name: 'a,b', desc: 'with "quote"' }]);
    expect(csv).toContain('"a,b"');
    expect(csv).toContain('"with ""quote"""');
  });
  it("空配列は BOM のみ", () => {
    expect(toCsv([])).toBe("﻿");
  });
});

describe("fromCsv", () => {
  it("ヘッダ + 行をパース", () => {
    const rows = fromCsv("a,b\n1,2\n3,4\n");
    expect(rows).toEqual([{ a: "1", b: "2" }, { a: "3", b: "4" }]);
  });
  it("BOM を除去", () => {
    const rows = fromCsv("﻿a,b\n1,2");
    expect(rows[0]).toEqual({ a: "1", b: "2" });
  });
  it('"..." 内のカンマと改行', () => {
    const rows = fromCsv('name,desc\n"a,b","line1\nline2"\n');
    expect(rows[0]).toEqual({ name: "a,b", desc: "line1\nline2" });
  });
  it('"" は " のエスケープ', () => {
    const rows = fromCsv('a\n"with ""quote"""');
    expect(rows[0]).toEqual({ a: 'with "quote"' });
  });
  it("空行はスキップ", () => {
    const rows = fromCsv("a,b\n1,2\n\n3,4\n");
    expect(rows.length).toBe(2);
  });
  it("CRLF も処理", () => {
    const rows = fromCsv("a,b\r\n1,2\r\n3,4\r\n");
    expect(rows).toEqual([{ a: "1", b: "2" }, { a: "3", b: "4" }]);
  });
});
