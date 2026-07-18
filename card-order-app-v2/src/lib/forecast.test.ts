import { describe, it, expect } from "vitest";
import { clusterRounds, forecastTitle, projectMonthly } from "./forecast";

describe("clusterRounds", () => {
  it("近接する発注を1ラウンドに束ね、離れたら分割する", () => {
    const pts = [
      { date: "2026-01-01", revenue: 100 },
      { date: "2026-01-05", revenue: 200 }, // 同ラウンド
      { date: "2026-03-01", revenue: 300 }, // 別ラウンド(>21日)
    ];
    const r = clusterRounds(pts, 21);
    expect(r.length).toBe(2);
    expect(r[0].revenue).toBe(300);
    expect(r[1].revenue).toBe(300);
  });
});

describe("forecastTitle", () => {
  it("周期(平均間隔)と直近加重の1回売上を返す", () => {
    const pts = [
      { date: "2026-01-01", revenue: 100 },
      { date: "2026-03-01", revenue: 200 },
      { date: "2026-05-01", revenue: 300 },
    ];
    const f = forecastTitle(pts, 21);
    expect(f.rounds).toBe(3);
    expect(f.avgIntervalDays).toBeGreaterThan(55); // 約59〜60日
    expect(f.avgIntervalDays).toBeLessThan(65);
    // 直近加重: (100*1 + 200*2 + 300*3)/6 = 233
    expect(f.perRound).toBe(233);
    expect(f.lastDate).toBe("2026-05-01");
  });
  it("1回のみなら周期は不明", () => {
    expect(forecastTitle([{ date: "2026-01-01", revenue: 100 }]).avgIntervalDays).toBeNull();
  });
});

describe("projectMonthly", () => {
  it("周期に沿って将来の月へ見込みを畳み込む", () => {
    const titles = [{
      key: "t1",
      points: [
        { date: "2026-01-01", revenue: 100 },
        { date: "2026-03-01", revenue: 100 },
        { date: "2026-05-01", revenue: 100 }, // 約60日周期
      ],
    }];
    const out = projectMonthly(titles, "2026-06-01", 6, 21);
    expect(out.length).toBe(6);
    // 次は 2026-07 頃に計上されるはず
    const total = out.reduce((s, m) => s + m.amount, 0);
    expect(total).toBeGreaterThan(0);
  });
});
