import type { RankCode } from "@/types/database";

// ランクの昇順 (低 → 高)
export const RANK_ORDER: RankCode[] = [
  "standard",
  "bronze",
  "silver",
  "gold",
  "platinum",
];

export const RANK_LABEL: Record<RankCode, string> = {
  platinum: "プラチナ",
  gold:     "ゴールド",
  silver:   "シルバー",
  bronze:   "ブロンズ",
  standard: "スタンダード",
};

// rank_settings 未取得時のフォールバック (DB を真実とする)
export const DEFAULT_RANK_SETTINGS: Record<RankCode, { threshold: number; rebate: number }> = {
  platinum: { threshold: 1_000_000, rebate: 0.10 },
  gold:     { threshold:   500_000, rebate: 0.07 },
  silver:   { threshold:   200_000, rebate: 0.05 },
  bronze:   { threshold:   100_000, rebate: 0.03 },
  standard: { threshold:         0, rebate: 0.00 },
};

// 降格猶予判定の閾値倍率 (基準の 50% を下回ると降格対象)
export const DEMOTION_THRESHOLD_RATIO = 0.5;

// 消費税率
export const TAX_RATE = 0.10;
