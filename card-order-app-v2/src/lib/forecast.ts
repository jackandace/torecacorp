// 売上予測(フェーズC): 発注履歴を「入荷回(ラウンド)」に束ね、周期×直近加重で次回売上を見込む。
// 純関数のみ。日付は ISO 文字列(YYYY-MM-DD... )で受ける。

const DAY = 86400000;
const days = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY);

export type OrderPoint = { date: string; revenue: number };
export type Round = { date: string; revenue: number };

/** 近接する発注を1つの入荷回にまとめる(gapDays 超で新ラウンド)。入力は昇順。 */
export function clusterRounds(points: OrderPoint[], gapDays = 21): Round[] {
  const sorted = [...points].sort((a, b) => (a.date < b.date ? -1 : 1));
  const out: Round[] = [];
  let start: string | null = null;
  let last: string | null = null;
  let rev = 0;
  for (const p of sorted) {
    if (last && days(last, p.date) > gapDays) { out.push({ date: start!, revenue: rev }); start = null; rev = 0; }
    if (!start) start = p.date;
    rev += p.revenue;
    last = p.date;
  }
  if (start) out.push({ date: start, revenue: rev });
  return out;
}

/** 直近ほど重い加重平均(古い=1, 新しい=n)。 */
function weightedAvg(nums: number[]): number {
  if (nums.length === 0) return 0;
  let s = 0, w = 0;
  nums.forEach((v, i) => { const weight = i + 1; s += v * weight; w += weight; });
  return Math.round(s / w);
}

export type TitleForecast = {
  rounds: number;
  avgIntervalDays: number | null;
  perRound: number;      // 1回あたり見込み売上(直近加重)
  lastDate: string | null;
};

export function forecastTitle(points: OrderPoint[], gapDays = 21): TitleForecast {
  const rounds = clusterRounds(points, gapDays);
  const n = rounds.length;
  if (n === 0) return { rounds: 0, avgIntervalDays: null, perRound: 0, lastDate: null };
  const perRound = weightedAvg(rounds.map((r) => r.revenue));
  let avgInterval: number | null = null;
  if (n >= 2) {
    let total = 0;
    for (let i = 1; i < n; i++) total += days(rounds[i - 1].date, rounds[i].date);
    avgInterval = Math.round(total / (n - 1));
  }
  return { rounds: n, avgIntervalDays: avgInterval, perRound, lastDate: rounds[n - 1].date };
}

/** 各タイトルの予測を、今日から horizonMonths ヶ月ぶんの月次見込みに畳み込む。
 *  todayISO はサーバ時刻(YYYY-MM-DD)を渡す(テスト容易化)。 */
export function projectMonthly(
  titles: { key: string; points: OrderPoint[] }[],
  todayISO: string,
  horizonMonths = 6,
  gapDays = 21,
): { month: string; amount: number }[] {
  const today = new Date(todayISO + "T00:00:00Z");
  const end = new Date(today); end.setUTCMonth(end.getUTCMonth() + horizonMonths);
  const monthly = new Map<string, number>();

  for (const t of titles) {
    const f = forecastTitle(t.points, gapDays);
    if (!f.avgIntervalDays || f.perRound <= 0 || !f.lastDate) continue;
    let d = new Date(f.lastDate + "T00:00:00Z");
    // 直近ラウンド + 周期 を起点に将来へ
    for (let guard = 0; guard < 60; guard++) {
      d = new Date(d.getTime() + f.avgIntervalDays * DAY);
      if (d > end) break;
      if (d >= today) {
        const m = d.toISOString().slice(0, 7);
        monthly.set(m, (monthly.get(m) ?? 0) + f.perRound);
      }
    }
  }
  const out: { month: string; amount: number }[] = [];
  const cur = new Date(today);
  for (let i = 0; i < horizonMonths; i++) {
    const m = cur.toISOString().slice(0, 7);
    out.push({ month: m, amount: Math.round(monthly.get(m) ?? 0) });
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  return out;
}
