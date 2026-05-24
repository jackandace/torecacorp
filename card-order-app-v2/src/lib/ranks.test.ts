import { describe, expect, it } from "vitest";
import {
  buildRankSettingsMap,
  evaluateRank,
  getNextRank,
  getPreviousRank,
  computeGraceUntil,
  amountToNextRank,
} from "./ranks";
import { DEFAULT_RANK_SETTINGS } from "@/constants/ranks";

const settings = DEFAULT_RANK_SETTINGS;

describe("getNextRank / getPreviousRank", () => {
  it("standard → bronze", () => expect(getNextRank("standard")).toBe("bronze"));
  it("bronze → silver",   () => expect(getNextRank("bronze")).toBe("silver"));
  it("platinum → null",   () => expect(getNextRank("platinum")).toBeNull());
  it("bronze ← standard", () => expect(getPreviousRank("bronze")).toBe("standard"));
  it("standard ← null",   () => expect(getPreviousRank("standard")).toBeNull());
});

describe("evaluateRank — 昇格", () => {
  it("bronze ショップが gold 閾値を超えたら gold へ", () => {
    const r = evaluateRank({
      currentRank: "bronze",
      monthlyAmount: 600_000,
      rankLockedUntil: null,
      today: new Date("2026-02-01"),
      settings,
    });
    expect(r.newRank).toBe("gold");
    expect(r.reason).toBe("promote");
  });

  it("standard ショップが一気に platinum 閾値を超えたら platinum へ (連鎖昇格)", () => {
    const r = evaluateRank({
      currentRank: "standard",
      monthlyAmount: 2_000_000,
      rankLockedUntil: null,
      today: new Date(),
      settings,
    });
    expect(r.newRank).toBe("platinum");
    expect(r.reason).toBe("promote");
  });

  it("昇格基準ちょうど (>=) で昇格する", () => {
    const r = evaluateRank({
      currentRank: "silver",
      monthlyAmount: 500_000,
      rankLockedUntil: null,
      today: new Date(),
      settings,
    });
    expect(r.newRank).toBe("gold");
  });
});

describe("evaluateRank — 降格", () => {
  it("gold ショップで月次額が gold 閾値 × 0.5 未満 → silver へ降格", () => {
    const r = evaluateRank({
      currentRank: "gold",
      monthlyAmount: 200_000, // gold は 500k、その半分は 250k 未満
      rankLockedUntil: null,
      today: new Date("2026-02-01"),
      settings,
    });
    expect(r.newRank).toBe("silver");
    expect(r.reason).toBe("demote");
  });

  it("猶予期限 (rank_locked_until) が未来なら降格しない", () => {
    const r = evaluateRank({
      currentRank: "gold",
      monthlyAmount: 100_000,
      rankLockedUntil: "2026-12-31",
      today: new Date("2026-02-01"),
      settings,
    });
    expect(r.newRank).toBe("gold");
    expect(r.reason).toBe("grace");
  });

  it("standard は降格できない", () => {
    const r = evaluateRank({
      currentRank: "standard",
      monthlyAmount: 0,
      rankLockedUntil: null,
      today: new Date(),
      settings,
    });
    expect(r.newRank).toBe("standard");
    expect(r.reason).toBe("hold");
  });
});

describe("evaluateRank — 維持", () => {
  it("閾値以上、しかし上に行けない場合は維持", () => {
    const r = evaluateRank({
      currentRank: "silver",
      monthlyAmount: 300_000, // silver 維持基準 100k 以上, gold 閾値 500k 未満
      rankLockedUntil: null,
      today: new Date(),
      settings,
    });
    expect(r.newRank).toBe("silver");
    expect(r.reason).toBe("hold");
  });
});

describe("buildRankSettingsMap", () => {
  it("DB の row が無ければデフォルトを返す", () => {
    const m = buildRankSettingsMap([]);
    expect(m.platinum.threshold).toBe(1_000_000);
    expect(m.gold.rebate).toBeCloseTo(0.07);
  });
  it("DB の row があれば上書き", () => {
    const m = buildRankSettingsMap([
      { rank: "gold", threshold_amount: 999_999, rebate_rate: 0.08, updated_at: "" },
    ]);
    expect(m.gold.threshold).toBe(999_999);
    expect(m.gold.rebate).toBe(0.08);
    expect(m.silver.threshold).toBe(200_000); // 他は変わらず
  });
});

describe("computeGraceUntil", () => {
  it("翌月末 (2026-02-01 → 2026-03-31)", () => {
    expect(computeGraceUntil(new Date("2026-02-01"))).toBe("2026-03-31");
  });
  it("12月 → 翌年 1月末", () => {
    expect(computeGraceUntil(new Date("2026-12-15"))).toBe("2027-01-31");
  });
});

describe("amountToNextRank", () => {
  it("次ランクまでの不足額", () => {
    expect(
      amountToNextRank({ currentRank: "bronze", monthlyAmount: 80_000, settings }),
    ).toEqual({ next: "silver", shortage: 120_000 });
  });
  it("既に次ランク到達なら 0", () => {
    expect(
      amountToNextRank({ currentRank: "bronze", monthlyAmount: 500_000, settings }),
    ).toEqual({ next: "silver", shortage: 0 });
  });
  it("最上位はnext=null", () => {
    expect(
      amountToNextRank({ currentRank: "platinum", monthlyAmount: 9_999_999, settings }),
    ).toEqual({ next: null, shortage: 0 });
  });
});
