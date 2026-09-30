import { describe, expect, it } from "vitest";
import { legacyInvoiceFileToken, legacyPathFromPdfUrl } from "./legacy-invoice-pdf";

const SHOP = "3b93aaff-ca96-4541-ab83-6221857f273a";

describe("legacyPathFromPdfUrl", () => {
  it("extracts the path from a long-lived signed URL", () => {
    const url = `https://x.supabase.co/storage/v1/object/sign/legacy-invoices/${SHOP}/1755000000000-INV-2024_001.pdf?token=abc`;
    expect(legacyPathFromPdfUrl(url, SHOP)).toBe(`${SHOP}/1755000000000-INV-2024_001.pdf`);
  });
  it("accepts a stored path", () => {
    expect(legacyPathFromPdfUrl(`${SHOP}/1-A.pdf`, SHOP)).toBe(`${SHOP}/1-A.pdf`);
  });
  it("rejects a system invoice path overwritten by the old download bug", () => {
    expect(legacyPathFromPdfUrl("9f1c2d3e-0000-0000-0000-000000000000.pdf", SHOP)).toBeNull();
  });
  it("rejects a path that belongs to another shop", () => {
    const url = "https://x.supabase.co/storage/v1/object/sign/legacy-invoices/other-shop/1-A.pdf?token=abc";
    expect(legacyPathFromPdfUrl(url, SHOP)).toBeNull();
  });
});

describe("legacyInvoiceFileToken", () => {
  it("matches the upload naming rule", () => {
    expect(legacyInvoiceFileToken("INV/2024 001")).toBe("INV_2024_001");
  });
});
