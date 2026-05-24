// 掛け率・リベート・税の計算
//
// 計算ルール (要件定義書より):
//   小計           = 定価 × 確定BOX数 × 案内掛け率
//   リベート額     = 小計 × ランクのリベート率
//   課税対象額     = 小計 - リベート額
//   消費税         = 課税対象額 × 0.10
//   請求合計(税込) = 課税対象額 + 消費税
//
// 金額はすべて円単位 integer。小数点は Math.floor で切り捨て。
import type { Product, Shop } from "@/types/database";
import { TAX_RATE } from "@/constants/ranks";

/** 案内掛け率 = 実掛け率 + 上乗せ率 (ショップ個別上書きがあればそちらを優先) */
export function getListedRate(product: Pick<Product, "actual_rate" | "rate_markup">, shop?: Pick<Shop, "rate_override"> | null): number {
  if (shop?.rate_override != null) return shop.rate_override;
  return product.actual_rate + product.rate_markup;
}

export interface RebateInput {
  unitPrice: number;       // 定価 (円)
  confirmedQty: number;    // 確定 BOX 数
  listedRate: number;      // 案内掛け率 (0.84 等)
  rebateRate: number;      // リベート率 (0.07 等)
}

export interface RebateBreakdown {
  subtotal: number;       // 定価 × 数 × 掛け率
  rebateAmount: number;   // リベート額
  taxableAmount: number;  // 課税対象額
  taxAmount: number;      // 消費税
  totalAmount: number;    // 税込合計
}

export function calcRebate(input: RebateInput): RebateBreakdown {
  const subtotal = Math.floor(input.unitPrice * input.confirmedQty * input.listedRate);
  const rebateAmount = Math.floor(subtotal * input.rebateRate);
  const taxableAmount = subtotal - rebateAmount;
  const taxAmount = Math.floor(taxableAmount * TAX_RATE);
  const totalAmount = taxableAmount + taxAmount;
  return { subtotal, rebateAmount, taxableAmount, taxAmount, totalAmount };
}

/** 複数明細をまとめる場合の合算 (請求書発行時に使用) */
export function aggregateRebate(lines: RebateBreakdown[]): RebateBreakdown {
  return lines.reduce(
    (acc, l) => ({
      subtotal:       acc.subtotal       + l.subtotal,
      rebateAmount:   acc.rebateAmount   + l.rebateAmount,
      taxableAmount:  acc.taxableAmount  + l.taxableAmount,
      taxAmount:      acc.taxAmount      + l.taxAmount,
      totalAmount:    acc.totalAmount    + l.totalAmount,
    }),
    { subtotal: 0, rebateAmount: 0, taxableAmount: 0, taxAmount: 0, totalAmount: 0 },
  );
}

/** 表示用: 0.84 → "84%" */
export function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

/** 表示用: 1234567 → "¥1,234,567" */
export function formatYen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}
