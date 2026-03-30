/**
 * 共通スコア集計：月末23:59に投げ銭・有料ライブ・個別セッションの REVENUE を集計しランクを確定するための雛形。
 * バッチ処理（cron 等）から runMonthlyRevenueAggregation を呼び出す想定。
 */
import { db } from "./db";
import { transactions, wallets, users } from "./schema";
import { eq, sql, and, gte, lte } from "drizzle-orm";

export interface MonthlyRevenueRow {
  userId: number;
  displayName: string;
  totalRevenue: number;
  rank: number;
}

/**
 * 指定月の type='REVENUE' 取引を集計し、ウォレット（ユーザー）ごとの合計とランクを返す。
 * 月末バッチでランク確定時に使用するクエリの雛形。
 *
 * @param yearMonth "YYYY-MM" 形式（例: "2025-03"）
 * @returns 収益合計の降順でランク付きの一覧
 */
export async function getMonthlyRevenueRank(yearMonth: string): Promise<MonthlyRevenueRow[]> {
  const [year, month] = yearMonth.split("-").map(Number);
  if (!year || !month) return [];

  const start = new Date(year, month - 1, 1, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59);

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
        gte(transactions.createdAt, start),
        lte(transactions.createdAt, end)
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

/**
 * 月末ランク確定バッチの雛形。
 * 実際のランク保存（creators の rank 更新など）はここに追加する。
 */
export async function runMonthlyRevenueAggregation(yearMonth: string): Promise<{
  yearMonth: string;
  rankings: MonthlyRevenueRow[];
}> {
  const rankings = await getMonthlyRevenueRank(yearMonth);
  // TODO: ランクを creators テーブルや別のランキングテーブルに保存する処理を追加
  return { yearMonth, rankings };
}
