// カット品の保証金(前受金)計算
//
// 保証金 = 定価 × 希望BOX数 × 案内掛け率 × 保証金率(50%)
//   ・前受金として消費税・リベートは課さない (最終精算で確定数量に対して計算)
//   ・金額は円単位 integer。小数点は Math.floor で切り捨て (rebate.ts と整合)

/** 保証金率 (一律50%固定) */
export const DEPOSIT_RATE = 0.5;

/** 1明細の保証金額 (税抜・リベート前) */
export function calcDeposit(args: {
  unitPrice: number;
  qtyBox: number;
  listedRate: number;
}): number {
  return Math.floor(args.unitPrice * args.qtyBox * args.listedRate * DEPOSIT_RATE);
}

/**
 * 最終精算の差額を計算する。
 *   net = 確定満額(税込) - 充当する保証金(預り額)
 *   net > 0 → 差額請求 (kind=final, 今回請求額=net)
 *   net < 0 → 返金       (kind=refund, 返金額=-net)
 *   net = 0 → 精算済み (追加請求なし)
 */
export function calcSettlement(args: {
  finalTotal: number;   // 確定数量に対する満額(リベート+税込)
  depositPaid: number;  // 既に預かっている保証金(入金額)
}): { net: number; kind: "final" | "refund" | "settled"; amount: number } {
  const net = args.finalTotal - args.depositPaid;
  if (net > 0) return { net, kind: "final", amount: net };
  if (net < 0) return { net, kind: "refund", amount: -net };
  return { net: 0, kind: "settled", amount: 0 };
}
