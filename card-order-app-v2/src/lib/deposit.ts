// カット品の保証金(前受金)計算
//
// 保証金 = 定価 × 希望BOX数 × 案内掛け率 × 保証金率(既定30%)
//   ・前受金として消費税・リベートは課さない (最終精算で確定数量に対して計算)
//   ・金額は円単位 integer。小数点は Math.floor で切り捨て (rebate.ts と整合)
//   ・適用率は invoices.deposit_rate に保存し、請求詳細・PDF の内訳表示に使う

/** 保証金率のデフォルト (2026-07-28 に 50% → 30% へ変更) */
export const DEPOSIT_RATE = 0.3;

/** 発行時に選べる保証金率 (数量が多い発注は率を下げて返金リスクを抑える) */
export const DEPOSIT_RATE_OPTIONS = [0.3, 0.4, 0.5] as const;

/** 率が妥当か (0 < rate <= 1) */
export function isValidDepositRate(rate: number): boolean {
  return Number.isFinite(rate) && rate > 0 && rate <= 1;
}

/**
 * 保証金額と満額から適用率を推定する (1% 単位に丸め)。
 * deposit_rate 未保存の過去請求書の表示フォールバック用。
 */
export function inferDepositRate(depositTotal: number, baseTotal: number): number | null {
  if (!(depositTotal > 0) || !(baseTotal > 0)) return null;
  const rate = Math.round((depositTotal / baseTotal) * 100) / 100;
  return isValidDepositRate(rate) ? rate : null;
}

/** 1明細の保証金額 (税抜・リベート前)。rate 未指定は 50%。 */
export function calcDeposit(args: {
  unitPrice: number;
  qtyBox: number;
  listedRate: number;
  rate?: number;
}): number {
  const rate = args.rate ?? DEPOSIT_RATE;
  return Math.floor(args.unitPrice * args.qtyBox * args.listedRate * rate);
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
