// 購入履歴 (アプリ運用以前) の手入力フォーム用スキーマ (server-side)
import { z } from "zod";
import { LEGACY_UNITS, purchasedOnProblem } from "@/lib/legacy-purchases";
import { todayISOInJST } from "@/lib/dates";

export const LegacyPurchaseBody = z
  .object({
    purchasedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "購入日の形式が不正です"),
    productName: z.string().trim().min(1, "商品名は必須です").max(200),
    quantity: z.number().int().positive("数量は1以上"),
    unit: z.enum(LEGACY_UNITS),
    unitPrice: z.number().int().min(0),
    amount: z.number().int().min(0),
    shipmentStatus: z.enum(["shipped", "unshipped"]),
    note: z.string().trim().max(1000).nullable().optional(),
    internalNote: z.string().trim().max(1000).nullable().optional(),
  })
  .superRefine((v, ctx) => {
    const p = purchasedOnProblem(v.purchasedOn, todayISOInJST());
    if (p) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["purchasedOn"], message: p });
  });

export type LegacyPurchaseBodyT = z.infer<typeof LegacyPurchaseBody>;

export function toRow(b: LegacyPurchaseBodyT) {
  return {
    purchased_on: b.purchasedOn,
    product_name: b.productName,
    quantity: b.quantity,
    unit: b.unit,
    unit_price: b.unitPrice,
    amount: b.amount,
    shipment_status: b.shipmentStatus,
    note: b.note || null,
    internal_note: b.internalNote || null,
  };
}

export function firstIssue(e: unknown): string {
  if (e instanceof z.ZodError) return e.issues[0]?.message ?? "入力内容が不正です";
  return e instanceof Error ? e.message : "入力内容が不正です";
}
