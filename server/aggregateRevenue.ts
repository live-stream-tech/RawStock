import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "./db";
import { creatorMonthlyScores, creators, liverReviews, transactions, users, wallets } from "./schema";

export interface MonthlyRevenueRow {
  userId: number;
  displayName: string;
  totalRevenue: number;
  rank: number;
}

export interface CreatorMonthlyRankingRow {
  creatorId: number;
  name: string;
  community: string;
  avatar: string;
  month: string;
  tipGross: number;
  paidLiveGross: number;
  streamCountMonthly: number;
  avgSatisfaction: number;
  compositeScore: number;
  startRank: number | null;
  rank: number;
}

type RankingKind = "overall" | "paid_live";

function parseMonthRange(yearMonth: string): { start: Date; end: Date } | null {
  const [year, month] = yearMonth.split("-").map(Number);
  if (!year || !month) return null;
  const start = new Date(year, month - 1, 1, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59);
  return { start, end };
}

function getPrevMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const d = new Date(year, month - 2, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function round1(value: number): number {
  return Number(value.toFixed(1));
}

function normalize(value: number, max: number): number {
  if (max <= 0) return 0;
  return value / max;
}

export async function getMonthlyRevenueRank(yearMonth: string): Promise<MonthlyRevenueRow[]> {
  const range = parseMonthRange(yearMonth);
  if (!range) return [];

  const rows = await db
    .select({
      userId: wallets.userId,
      totalRevenue: sql<number>`COALESCE(SUM(${transactions.amount}), 0)::int`,
    })
    .from(transactions)
    .innerJoin(wallets, eq(transactions.walletId, wallets.id))
    .where(
      and(
        eq(transactions.type, "REVENUE"),
        gte(transactions.createdAt, range.start),
        lte(transactions.createdAt, range.end),
      )
    )
    .groupBy(wallets.userId);

  // システムウォレット（userId null）を除外し、ユーザー情報を付与。収益降順でランク付け
  const withUser = await Promise.all(
    rows
      .filter((r) => r.userId != null)
      .map(async (r) => {
        const [u] = await db.select({ displayName: users.displayName }).from(users).where(eq(users.id, r.userId!));
        return {
          userId: r.userId!,
          displayName: u?.displayName ?? "不明",
          totalRevenue: Number(r.totalRevenue),
        };
      })
  );
  withUser.sort((a, b) => b.totalRevenue - a.totalRevenue);
  return withUser.map((row, index) => ({ ...row, rank: index + 1 }));
}

export async function runMonthlyRevenueAggregation(yearMonth: string): Promise<{
  yearMonth: string;
  rankings: MonthlyRevenueRow[];
}> {
  const rankings = await getMonthlyRevenueRank(yearMonth);
  return { yearMonth, rankings };
}

export async function runMonthlyCreatorAggregation(yearMonth: string): Promise<{
  yearMonth: string;
  overall: CreatorMonthlyRankingRow[];
  paidLive: CreatorMonthlyRankingRow[];
}> {
  const range = parseMonthRange(yearMonth);
  if (!range) return { yearMonth, overall: [], paidLive: [] };

  const allCreators = await db.select().from(creators).orderBy(asc(creators.id));
  if (allCreators.length === 0) return { yearMonth, overall: [], paidLive: [] };

  const monthScores = await db
    .select()
    .from(creatorMonthlyScores)
    .where(eq(creatorMonthlyScores.yearMonth, yearMonth));
  const scoreMap = new Map<number, (typeof monthScores)[number]>();
  monthScores.forEach((s) => scoreMap.set(s.creatorId, s));

  const prevScores = await db
    .select()
    .from(creatorMonthlyScores)
    .where(eq(creatorMonthlyScores.yearMonth, getPrevMonth(yearMonth)));
  const prevRankMap = new Map<number, number>();
  prevScores.forEach((s) => {
    if (s.rankOverall) prevRankMap.set(s.creatorId, s.rankOverall);
  });

  const reviews = await db
    .select()
    .from(liverReviews)
    .where(and(gte(liverReviews.createdAt, range.start), lte(liverReviews.createdAt, range.end)));
  const satMap = new Map<number, { sum: number; count: number }>();
  for (const r of reviews) {
    const row = satMap.get(r.liverId) ?? { sum: 0, count: 0 };
    row.sum += r.satisfactionScore;
    row.count += 1;
    satMap.set(r.liverId, row);
  }

  const baseRows = allCreators.map((c) => {
    const monthly = scoreMap.get(c.id);
    const sat = satMap.get(c.id);
    const avgSatisfaction = sat && sat.count > 0 ? sat.sum / sat.count : c.satisfactionScore;
    return {
      creatorId: c.id,
      name: c.name,
      community: c.community,
      avatar: c.avatar,
      month: yearMonth,
      tipGross: monthly?.tipGross ?? 0,
      paidLiveGross: monthly?.paidLiveGross ?? 0,
      streamCountMonthly: monthly?.streamCountMonthly ?? 0,
      avgSatisfaction: round1(avgSatisfaction),
      compositeScore: 0,
      startRank: prevRankMap.has(c.id)
        ? Math.min((prevRankMap.get(c.id) ?? allCreators.length) + 2, allCreators.length)
        : Math.min(c.rank, allCreators.length),
      rank: 999,
    };
  });

  const maxTip = Math.max(...baseRows.map((r) => r.tipGross), 0);
  const maxStreams = Math.max(...baseRows.map((r) => r.streamCountMonthly), 0);
  const maxSat = Math.max(...baseRows.map((r) => r.avgSatisfaction), 0);
  for (const row of baseRows) {
    const score =
      100 *
      (0.4 * normalize(row.avgSatisfaction, maxSat) +
        0.3 * normalize(row.streamCountMonthly, maxStreams) +
        0.3 * normalize(row.tipGross, maxTip));
    row.compositeScore = round1(score);
  }

  const n = baseRows.length;
  const overallSorted = [...baseRows].sort((a, b) => {
    const aCarry = ((n - (a.startRank ?? n) + 1) / n) * 0.01;
    const bCarry = ((n - (b.startRank ?? n) + 1) / n) * 0.01;
    if (b.compositeScore + bCarry !== a.compositeScore + aCarry) {
      return (b.compositeScore + bCarry) - (a.compositeScore + aCarry);
    }
    return a.creatorId - b.creatorId;
  });
  overallSorted.forEach((r, i) => {
    r.rank = i + 1;
  });

  const paidSorted = [...baseRows].sort((a, b) => {
    if (b.paidLiveGross !== a.paidLiveGross) return b.paidLiveGross - a.paidLiveGross;
    return a.creatorId - b.creatorId;
  });
  const paidRankMap = new Map<number, number>();
  paidSorted.forEach((r, i) => paidRankMap.set(r.creatorId, i + 1));

  for (const row of baseRows) {
    const nextStartRank = Math.min((overallSorted.find((r) => r.creatorId === row.creatorId)?.rank ?? n) + 2, n);
    const existing = scoreMap.get(row.creatorId);
    const payload: Partial<typeof creatorMonthlyScores.$inferInsert> = {
      avgSatisfaction: row.avgSatisfaction,
      compositeScore: row.compositeScore,
      startRank: row.startRank,
      rankOverall: overallSorted.find((r) => r.creatorId === row.creatorId)?.rank ?? null,
      rankPaidLive: paidRankMap.get(row.creatorId) ?? null,
      nextStartRank,
      updatedAt: new Date(),
    };
    if (existing) {
      await db.update(creatorMonthlyScores).set(payload).where(eq(creatorMonthlyScores.id, existing.id));
    } else {
      await db.insert(creatorMonthlyScores).values({
        creatorId: row.creatorId,
        yearMonth,
        tipGross: row.tipGross,
        paidLiveGross: row.paidLiveGross,
        streamCountMonthly: row.streamCountMonthly,
        avgSatisfaction: row.avgSatisfaction,
        compositeScore: row.compositeScore,
        startRank: row.startRank,
        rankOverall: overallSorted.find((r) => r.creatorId === row.creatorId)?.rank ?? null,
        rankPaidLive: paidRankMap.get(row.creatorId) ?? null,
        nextStartRank,
      } as typeof creatorMonthlyScores.$inferInsert);
    }

    await db
      .update(creators)
      .set({
        rank: overallSorted.find((r) => r.creatorId === row.creatorId)?.rank ?? row.startRank ?? 999,
        heatScore: row.compositeScore,
        satisfactionScore: row.avgSatisfaction,
      } as Partial<typeof creators.$inferInsert>)
      .where(eq(creators.id, row.creatorId));
  }

  return {
    yearMonth,
    overall: overallSorted,
    paidLive: paidSorted.map((r) => ({ ...r, rank: paidRankMap.get(r.creatorId) ?? 999 })),
  };
}

export async function getCreatorMonthlyRankings(
  yearMonth: string,
  kind: RankingKind,
): Promise<CreatorMonthlyRankingRow[]> {
  const creatorRows = await db.select().from(creators);
  const scoreRows = await db
    .select()
    .from(creatorMonthlyScores)
    .where(eq(creatorMonthlyScores.yearMonth, yearMonth));
  const scoreMap = new Map<number, (typeof scoreRows)[number]>();
  scoreRows.forEach((s) => scoreMap.set(s.creatorId, s));
  const rows = creatorRows.map((c) => {
    const score = scoreMap.get(c.id);
    return {
      creatorId: c.id,
      name: c.name,
      community: c.community,
      avatar: c.avatar,
      month: yearMonth,
      tipGross: score?.tipGross ?? 0,
      paidLiveGross: score?.paidLiveGross ?? 0,
      streamCountMonthly: score?.streamCountMonthly ?? 0,
      avgSatisfaction: score?.avgSatisfaction ?? c.satisfactionScore,
      compositeScore: score?.compositeScore ?? 0,
      startRank: score?.startRank ?? c.rank,
      rank: kind === "paid_live" ? (score?.rankPaidLive ?? 999) : (score?.rankOverall ?? c.rank),
    };
  });
  return rows.sort((a, b) => a.rank - b.rank);
}
