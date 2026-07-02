import type { RankCode } from "@/types/database";

// ランクの昇順 (低 → 高)
export const RANK_ORDER: RankCode[] = [
  "standard",
  "bronze",
  "silver",
  "gold",
  "platinum",
];

/** ランクの序列インデックス (低=0 → 高) */
export function rankIndex(rank: RankCode): number {
  const i = RANK_ORDER.indexOf(rank);
  return i < 0 ? 0 : i;
}

/** shopRank が minRank 以上か (商品の最低表示ランク判定に使用) */
export function rankAtLeast(shopRank: RankCode, minRank: RankCode): boolean {
  return rankIndex(shopRank) >= rankIndex(minRank);
}

export const RANK_LABEL: Record<RankCode, string> = {
  platinum: "プラチナ",
  gold:     "ゴールド",
  silver:   "シルバー",
  bronze:   "ブロンズ",
  standard: "スタンダード",
};

// rank_settings 未取得時のフォールバック (DB を真実とする)
// lifetime = 累計下限しきい値 (0=無効。DB 側でも既定0)
export const DEFAULT_RANK_SETTINGS: Record<RankCode, { threshold: number; rebate: number; lifetime: number }> = {
  platinum: { threshold: 1_000_000, rebate: 0.10, lifetime: 0 },
  gold:     { threshold:   500_000, rebate: 0.07, lifetime: 0 },
  silver:   { threshold:   200_000, rebate: 0.05, lifetime: 0 },
  bronze:   { threshold:   100_000, rebate: 0.03, lifetime: 0 },
  standard: { threshold:         0, rebate: 0.00, lifetime: 0 },
};

// 降格猶予判定の閾値倍率 (基準の 50% を下回ると降格対象)
export const DEMOTION_THRESHOLD_RATIO = 0.5;

// 消費税率
export const TAX_RATE = 0.10;
