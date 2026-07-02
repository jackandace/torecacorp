// ランクの昇降格判定ロジック
import type { RankCode, RankSetting } from "@/types/database";
import {
  RANK_ORDER,
  DEMOTION_THRESHOLD_RATIO,
  DEFAULT_RANK_SETTINGS,
} from "@/constants/ranks";

export type RankSettingsMap = Record<RankCode, { threshold: number; rebate: number; lifetime: number }>;

export function buildRankSettingsMap(rows: RankSetting[]): RankSettingsMap {
  const map = { ...DEFAULT_RANK_SETTINGS };
  for (const row of rows) {
    map[row.rank] = {
      threshold: row.threshold_amount,
      rebate: row.rebate_rate,
      lifetime: row.lifetime_threshold ?? 0,
    };
  }
  return map;
}

/**
 * 累計取引額から「最低保証ランク(フロア)」を求める。
 * lifetime_threshold > 0 かつ lifetimeAmount がそれ以上の最上位ランクを返す。
 * どれも満たさなければ standard。
 */
export function lifetimeFloorRank(lifetimeAmount: number, settings: RankSettingsMap): RankCode {
  // 高いランクから走査
  for (let i = RANK_ORDER.length - 1; i >= 0; i--) {
    const rank = RANK_ORDER[i]!;
    const floor = settings[rank].lifetime;
    if (floor > 0 && lifetimeAmount >= floor) return rank;
  }
  return "standard";
}

/** 2つのランクのうち上位を返す */
export function higherRank(a: RankCode, b: RankCode): RankCode {
  return RANK_ORDER.indexOf(a) >= RANK_ORDER.indexOf(b) ? a : b;
}

export function getNextRank(current: RankCode): RankCode | null {
  const idx = RANK_ORDER.indexOf(current);
  if (idx < 0 || idx === RANK_ORDER.length - 1) return null;
  return RANK_ORDER[idx + 1];
}

export function getPreviousRank(current: RankCode): RankCode | null {
  const idx = RANK_ORDER.indexOf(current);
  if (idx <= 0) return null;
  return RANK_ORDER[idx - 1];
}

export interface RankEvaluation {
  newRank: RankCode;
  reason: "promote" | "demote" | "hold" | "grace";
  appliedSettings: RankSettingsMap;
}

/**
 * 月次ランク評価。
 *  - 昇格: 翌月初に即時昇格 (猶予なし)
 *  - 降格: 当月発注額 < 昇格基準 × 50% で 1 ヶ月猶予 → 翌月降格
 */
export function evaluateRank(args: {
  currentRank: RankCode;
  monthlyAmount: number;
  rankLockedUntil: string | null; // ISO date
  today: Date;
  settings: RankSettingsMap;
}): RankEvaluation {
  const { currentRank, monthlyAmount, rankLockedUntil, today, settings } = args;

  // 1. 昇格チェック (上のランクの閾値を満たすか)
  const next = getNextRank(currentRank);
  if (next && monthlyAmount >= settings[next].threshold) {
    // さらに上も連鎖チェック
    let promoted: RankCode = next;
    let candidate = getNextRank(promoted);
    while (candidate && monthlyAmount >= settings[candidate].threshold) {
      promoted = candidate;
      candidate = getNextRank(promoted);
    }
    return { newRank: promoted, reason: "promote", appliedSettings: settings };
  }

  // 2. 降格チェック (現ランク閾値 × 0.5 を下回るか)
  const currentThreshold = settings[currentRank].threshold;
  const demotionTarget = Math.floor(currentThreshold * DEMOTION_THRESHOLD_RATIO);

  if (currentThreshold > 0 && monthlyAmount < demotionTarget) {
    // 猶予期限がまだ来ていない → 維持
    if (rankLockedUntil) {
      const lockDate = new Date(rankLockedUntil);
      if (lockDate >= today) {
        return { newRank: currentRank, reason: "grace", appliedSettings: settings };
      }
    }
    const prev = getPreviousRank(currentRank);
    if (prev) {
      return { newRank: prev, reason: "demote", appliedSettings: settings };
    }
  }

  return { newRank: currentRank, reason: "hold", appliedSettings: settings };
}

/**
 * 降格に伴う猶予期限の計算 (翌月末まで猶予)
 *
 * toISOString() は UTC で出るため、JST との時差で 1 日ずれる。
 * Date のローカル値から直接 YYYY-MM-DD を組み立てる。
 */
export function computeGraceUntil(today: Date): string {
  const d = new Date(today.getFullYear(), today.getMonth() + 2, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 次ランクまでの不足額 (マイページ表示用)
 */
export function amountToNextRank(args: {
  currentRank: RankCode;
  monthlyAmount: number;
  settings: RankSettingsMap;
}): { next: RankCode | null; shortage: number } {
  const next = getNextRank(args.currentRank);
  if (!next) return { next: null, shortage: 0 };
  const shortage = Math.max(0, args.settings[next].threshold - args.monthlyAmount);
  return { next, shortage };
}
