import { describe, expect, it } from "vitest";
import { canReportPayment, isAwaitingPaymentConfirm } from "./payment-report";
import type { Invoice } from "@/types/database";

function inv(over: Partial<Invoice>): Pick<Invoice, "status" | "payment_reported_at" | "invoice_kind" | "is_legacy"> {
  return {
    status: "未入金",
    payment_reported_at: null,
    invoice_kind: "normal",
    is_legacy: false,
    ...over,
  };
}

describe("isAwaitingPaymentConfirm", () => {
  it("報告済み + 未入金 → 確認中", () => {
    expect(isAwaitingPaymentConfirm(inv({ payment_reported_at: "2026-08-07T00:00:00Z" }))).toBe(true);
  });
  it("報告済み + 一部入金 → 確認中のまま", () => {
    expect(isAwaitingPaymentConfirm(inv({ payment_reported_at: "2026-08-07T00:00:00Z", status: "一部入金" }))).toBe(true);
  });
  it("報告済みでも入金済みなら確認中ではない (消込で自然に消える)", () => {
    expect(isAwaitingPaymentConfirm(inv({ payment_reported_at: "2026-08-07T00:00:00Z", status: "入金済み" }))).toBe(false);
  });
  it("未報告は確認中ではない", () => {
    expect(isAwaitingPaymentConfirm(inv({}))).toBe(false);
  });
});

describe("canReportPayment", () => {
  it("通常/保証金/精算の未入金は報告できる", () => {
    expect(canReportPayment(inv({}))).toBe(true);
    expect(canReportPayment(inv({ invoice_kind: "deposit" }))).toBe(true);
    expect(canReportPayment(inv({ invoice_kind: "final", status: "一部入金" }))).toBe(true);
  });
  it("返金・legacy・入金済みは報告できない", () => {
    expect(canReportPayment(inv({ invoice_kind: "refund" }))).toBe(false);
    expect(canReportPayment(inv({ is_legacy: true }))).toBe(false);
    expect(canReportPayment(inv({ status: "入金済み" }))).toBe(false);
  });
});
