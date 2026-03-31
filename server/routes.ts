import type { Express, Request, Response } from "express";
import { db } from "./db";
import {
  communities,
  communityModerators,
  communityMembers,
  videos,
  videoComments,
  liveStreams,
  creators,
  creatorLevelThresholds,
  creatorMonthlyScores,
  videoEditors,
  videoEditRequests,
  bookingSessions,
  dmMessages,
  notifications,
  jukeboxState,
  jukeboxQueue,
  jukeboxChat,
  liveStreamChat,
  dmConversationMessages,
  twoshotBookings,
  earnings,
  withdrawals,
  users,
  wallets,
  transactions,
  liverReviews,
  liverAvailability,
  announcements,
  phoneVerifications,
  streams,
  communityAds,
  communityThreads,
  communityThreadPosts,
  communityPolls,
  communityVotes,
  communityPollOptions,
  communityPollVotes,
  reports,
  savedVideos,
  genreAds,
  genreOwners,
  concerts,
  concertStaff,
  coinBalances,
  coinTransactions,
  jukeboxRequestCounts,
  ticketBalances,
  ticketTransactions,
  TICKET_PACKS,
  editingRequests,
  bannerAds,
  dailyLogins,
  aiEditJobs,
} from "./schema";
import { eq, asc, desc, count, sql, and, or, gte, lte, isNull, inArray } from "drizzle-orm";
import { getUncachableStripeClient, getStripePublishableKey, createConnectExpressAccount, createConnectAccountLink, getConnectAccount, createBannerPaymentIntent, getPaymentIntentStatus } from "./stripeClient";
import { getCreatorMonthlyRankings, getMonthlyRevenueRank, runMonthlyCreatorAggregation } from "./aggregateRevenue";
import { judgeReportContent } from "./claudeReport";
import { generateEditPlan, type EditJobInput } from "./aiEditAssistant";
import { createSignedUploadUrl } from "./r2";
import { moderateContent } from "./moderation";
import { publishJukeboxEvent, redis, jukeboxChannel, subscribeJukeboxEvents } from "./redis";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.SESSION_SECRET ?? "livestage-dev-secret";
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
const CLOUDFLARE_STREAM_TOKEN = process.env.CLOUDFLARE_STREAM_TOKEN ?? "";

function makeToken(userId: number) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "90d" });
}

/** req.params / req.query を string に正規化（Express は string | string[]） */
function paramStr(req: Request, key: string): string {
  const v = req.params[key];
  return Array.isArray(v) ? v[0] ?? "" : (v ?? "");
}
function paramNum(req: Request, key: string): number {
  return parseInt(paramStr(req, key), 10) || 0;
}

function formatTimeAgo(d: Date | string | null | undefined): string {
  if (!d) return "たった今";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "たった今";
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffSec < 60) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHour < 24) return `${diffHour}時間前`;
  if (diffDay < 7) return `${diffDay}日前`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}週間前`;
  if (diffDay < 365) return `${Math.floor(diffDay / 30)}ヶ月前`;
  return `${Math.floor(diffDay / 365)}年前`;
}

/** req.query の値を string に正規化（Express の ParsedQs を string に統一） */
function queryStr(req: Request, key: string): string {
  const v = req.query[key];
  if (Array.isArray(v)) return typeof v[0] === "string" ? v[0] : "";
  return typeof v === "string" ? v : "";
}

async function getAuthUser(req: Request): Promise<{
  id: number;
  displayName: string;
  profileImageUrl: string | null;
  avatar: string | null;
  role: string;
  bio: string;
  stripeConnectId: string | null;
} | null> {
  const auth = (req as any).headers?.authorization ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    if (typeof payload === "string" || !payload || typeof (payload as unknown as { sub?: number }).sub !== "number") return null;
    const sub = (payload as unknown as { sub: number }).sub;
    const [user] = await db.select().from(users).where(eq(users.id, sub));
    if (!user) return null;
    return {
      ...user,
      avatar: user.profileImageUrl,
    };
  } catch {
    return null;
  }
}

const SYSTEM_WALLET_KINDS = ["MODERATOR", "ADMIN", "EVENT_RESERVE", "PLATFORM"] as const;

/** システムウォレットを取得。なければ作成する */
async function getOrCreateSystemWallets(): Promise<Record<(typeof SYSTEM_WALLET_KINDS)[number], number>> {
  const result = {} as Record<(typeof SYSTEM_WALLET_KINDS)[number], number>;
  for (const kind of SYSTEM_WALLET_KINDS) {
    const [w] = await db.select().from(wallets).where(eq(wallets.kind, kind));
    if (w) {
      result[kind] = w.id;
    } else {
      const [created] = await db.insert(wallets).values({ kind, userId: null } as typeof wallets.$inferInsert).returning();
      result[kind] = created.id;
    }
  }
  return result;
}

/** ユーザー用ウォレットを取得。なければ作成する */
async function getOrCreateUserWallet(userId: number): Promise<number> {
  const [w] = await db.select().from(wallets).where(and(eq(wallets.userId, userId), isNull(wallets.kind)));
  if (w) return w.id;
  const [created] = await db.insert(wallets).values({ userId, kind: null } as typeof wallets.$inferInsert).returning();
  return created.id;
}

type RevenueSource = "tip" | "paid_live" | "twoshot";

const DEFAULT_LEVEL_THRESHOLDS = [
  { level: 1, requiredTipGross: 0, requiredStreamCount: 0, tipBackRate: 0.5 },
  { level: 2, requiredTipGross: 50_000, requiredStreamCount: 4, tipBackRate: 0.55 },
  { level: 3, requiredTipGross: 100_000, requiredStreamCount: 8, tipBackRate: 0.6 },
  { level: 4, requiredTipGross: 160_000, requiredStreamCount: 12, tipBackRate: 0.65 },
  { level: 5, requiredTipGross: 240_000, requiredStreamCount: 16, tipBackRate: 0.7 },
  { level: 6, requiredTipGross: 340_000, requiredStreamCount: 20, tipBackRate: 0.75 },
  { level: 7, requiredTipGross: 460_000, requiredStreamCount: 24, tipBackRate: 0.8 },
] as const;

function getYearMonth(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function getPrevYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const d = new Date(year, month - 2, 1);
  return getYearMonth(d);
}

async function ensureDefaultLevelThresholds() {
  const rows = await db.select().from(creatorLevelThresholds).orderBy(asc(creatorLevelThresholds.level));
  if (rows.length > 0) return rows;
  await db.insert(creatorLevelThresholds).values(
    DEFAULT_LEVEL_THRESHOLDS.map((t) => ({
      level: t.level,
      requiredTipGross: t.requiredTipGross,
      requiredStreamCount: t.requiredStreamCount,
      tipBackRate: t.tipBackRate,
    })) as unknown as typeof creatorLevelThresholds.$inferInsert[],
  );
  return db.select().from(creatorLevelThresholds).orderBy(asc(creatorLevelThresholds.level));
}

async function syncCreatorLevelFromMonthlyProgress(creatorId: number, yearMonth: string): Promise<number> {
  const thresholds = await ensureDefaultLevelThresholds();
  const [score] = await db
    .select()
    .from(creatorMonthlyScores)
    .where(and(eq(creatorMonthlyScores.creatorId, creatorId), eq(creatorMonthlyScores.yearMonth, yearMonth)));
  const tipGross = score?.tipGross ?? 0;
  const streamCountMonthly = score?.streamCountMonthly ?? 0;
  const achieved = thresholds.reduce((acc, t) => {
    if (tipGross >= t.requiredTipGross && streamCountMonthly >= t.requiredStreamCount) return Math.max(acc, t.level);
    return acc;
  }, 1);
  await db.update(creators).set({ currentLevel: achieved } as Partial<typeof creators.$inferInsert>).where(eq(creators.id, creatorId));
  return achieved;
}

async function upsertCreatorMonthlyRevenue(
  creatorId: number,
  yearMonth: string,
  source: RevenueSource,
  grossAmount: number,
): Promise<void> {
  const [existing] = await db
    .select()
    .from(creatorMonthlyScores)
    .where(and(eq(creatorMonthlyScores.creatorId, creatorId), eq(creatorMonthlyScores.yearMonth, yearMonth)));
  if (!existing) {
    await db.insert(creatorMonthlyScores).values({
      creatorId,
      yearMonth,
      tipGross: source === "tip" ? grossAmount : 0,
      paidLiveGross: source === "tip" ? 0 : grossAmount,
    } as typeof creatorMonthlyScores.$inferInsert);
    return;
  }
  await db
    .update(creatorMonthlyScores)
    .set({
      tipGross: source === "tip" ? existing.tipGross + grossAmount : existing.tipGross,
      paidLiveGross: source === "tip" ? existing.paidLiveGross : existing.paidLiveGross + grossAmount,
      updatedAt: new Date(),
    } as Partial<typeof creatorMonthlyScores.$inferInsert>)
    .where(eq(creatorMonthlyScores.id, existing.id));
}

/** 収益を transactions に type: 'REVENUE' で記録（月末ランク集計用） */
async function recordRevenue(
  walletId: number,
  userId: number,
  creatorId: number | null,
  amount: number,
  source: RevenueSource,
  referenceId: string | null,
) {
  const yearMonth = getYearMonth();
  let backRate = 0.9; // paid_live/twoshot は常に 90%
  if (source === "tip") {
    const thresholds = await ensureDefaultLevelThresholds();
    const [creator] = creatorId ? await db.select().from(creators).where(eq(creators.id, creatorId)) : [];
    const level = creator?.currentLevel ?? 1;
    const rate = thresholds.find((t) => t.level === level)?.tipBackRate;
    backRate = typeof rate === "number" ? rate : 0.5;
  }
  const netAmount = Math.floor(amount * backRate);
  await db.insert(transactions).values({
    walletId,
    amount,
    source,
    grossAmount: amount,
    backRate,
    netAmount,
    creatorId,
    yearMonth,
    type: "REVENUE",
    status: "PENDING",
    referenceId,
  } as typeof transactions.$inferInsert);

  await db.insert(earnings).values({
    userId: `user-${userId}`,
    type: source,
    title: source === "tip" ? "投げ銭収益" : "有料配信収益",
    amount,
    revenueShare: Math.round(backRate * 100),
    netAmount,
  } as typeof earnings.$inferInsert);

  if (creatorId) {
    const [creator] = await db.select().from(creators).where(eq(creators.id, creatorId));
    if (creator) {
      await db
        .update(creators)
        .set({
          revenue: creator.revenue + amount,
          revenueShare: Math.round(backRate * 100),
        } as Partial<typeof creators.$inferInsert>)
        .where(eq(creators.id, creatorId));
    }
    await upsertCreatorMonthlyRevenue(creatorId, yearMonth, source, amount);
    await syncCreatorLevelFromMonthlyProgress(creatorId, yearMonth);
  }
}

export async function registerRoutes(app: Express): Promise<void> {
  // ── Email/Password Auth ──────────────────────────────────────────────
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { password, name } = req.body ?? {};
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    const [existing] = await db.select().from(users).where(eq(users.email, email));
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const hash = await bcrypt.hash(password, 10);
    const displayName = name || email.split("@")[0];
    const lineId = `email:${email}`;
    const [user] = await db.insert(users).values({
      lineId,
      displayName,
      email,
      passwordHash: hash,
      role: "USER",
      bio: "",
    } as typeof users.$inferInsert).returning();
    const token = makeToken(user.id);
    res.json({ token, user: { id: user.id, name: user.displayName, email: user.email } });
  });

  app.post("/api/auth/demo", async (_req: Request, res: Response) => {
    try {
      const DEMO_LINE_ID = "demo_account";
      const DEMO_NAME = "Demo User";
      const [demoUser] = await db
        .insert(users)
        .values({
          lineId: DEMO_LINE_ID,
          displayName: DEMO_NAME,
          profileImageUrl: null,
          role: "USER",
        } as typeof users.$inferInsert)
        .onConflictDoUpdate({
          target: users.lineId,
          set: {
            displayName: DEMO_NAME,
            role: "USER",
            updatedAt: new Date(),
          } as Partial<typeof users.$inferInsert>,
        })
        .returning();
      const token = makeToken(demoUser.id);
      res.json({ token });
    } catch (err) {
      console.error("Demo login error:", err);
      const message = err instanceof Error ? err.message : String(err);
      const isProd = process.env.NODE_ENV === "production";
      res.status(500).json({
        error: "Demo login failed",
        code: "DEMO_LOGIN_FAILED",
        ...(isProd ? {} : { message }),
      });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const password = req.body?.password;
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = makeToken(user.id);
    res.json({ token, user: { id: user.id, name: user.displayName, email: user.email } });
  });

  // ── Auth ──────────────────────────────────────────────
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });
    const [u] = await db.select({
      enneagramScores: users.enneagramScores,
      pinnedCommunityIds: users.pinnedCommunityIds,
    }).from(users).where(eq(users.id, user.id));
    let enneagramScores: number[] | null = null;
    let pinnedCommunityIds: number[] = [];
    if (u) {
      if ((u as any).enneagramScores) {
        try {
          const p = JSON.parse((u as any).enneagramScores) as number[];
          if (Array.isArray(p) && p.length === 9) enneagramScores = p;
        } catch {}
      }
      if ((u as any).pinnedCommunityIds) {
        try {
          const p = JSON.parse((u as any).pinnedCommunityIds) as number[];
          if (Array.isArray(p)) pinnedCommunityIds = p;
        } catch {}
      }
    }
    res.json({
      id: user.id,
      name: user.displayName,
      displayName: user.displayName,
      profileImageUrl: user.profileImageUrl,
      avatar: user.profileImageUrl,
      role: user.role,
      bio: user.bio,
      stripeConnectId: user.stripeConnectId ?? null,
      spotifyUrl: (user as any).spotifyUrl ?? null,
      appleMusicUrl: (user as any).appleMusicUrl ?? null,
      bandcampUrl: (user as any).bandcampUrl ?? null,
      instagramUrl: (user as any).instagramUrl ?? null,
      youtubeUrl: (user as any).youtubeUrl ?? null,
      xUrl: (user as any).xUrl ?? null,
      phoneNumber: (user as any).phoneNumber ?? null,
      enneagramScores,
      pinnedCommunityIds,
    });
  });

  // ── Stripe Connect（出金先連携）────────────────────────────────────────
  app.post("/api/connect/onboard", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });

    try {
      const baseUrl = process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
        : process.env.APP_URL ?? "http://localhost:8081";
      const returnUrl = `${baseUrl}/payout-settings?connect=return`;
      const refreshUrl = `${baseUrl}/payout-settings?connect=refresh`;

      let accountId = user
      .stripeConnectId;
      if (!accountId) {
        accountId = await createConnectExpressAccount({ country: "JP" });
        await db.update(users).set({ stripeConnectId: accountId, updatedAt: new Date() } as Partial<typeof users.$inferInsert>).where(eq(users.id, user.id));
      }

      const url = await createConnectAccountLink({ accountId, returnUrl, refreshUrl });
      res.json({ url, accountId });
    } catch (e: any) {
      console.error("Connect onboard error:", e);
      res.status(500).json({ error: e.message ?? "Stripe Connect の準備に失敗しました" });
    }
  });

  app.get("/api/connect/status", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });

    if (!user.stripeConnectId) {
      return res.json({ connected: false, stripeConnectId: null, chargesEnabled: false });
    }
    const account = await getConnectAccount(user.stripeConnectId);
    const chargesEnabled = account?.charges_enabled ?? false;
    res.json({
      connected: !!account,
      stripeConnectId: user.stripeConnectId,
      chargesEnabled,
      detailsSubmitted: account?.details_submitted ?? false,
    });
  });

  // ── バナー広告：決済・分配（人数×5円×日数、最低15,000円）────────────────────
  const BANNER_MIN_AMOUNT = 15_000;
  const BANNER_RATE_MODERATOR = 0.2;
  const BANNER_RATE_ADMIN = 0.2;
  const BANNER_RATE_EVENT = 0.1;
  const BANNER_RATE_PLATFORM = 0.5;

  app.post("/api/banner/checkout", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });

    const { people, days } = req.body as { people?: number; days?: number };
    const p = Math.max(1, Number(people) || 1);
    const d = Math.max(1, Number(days) || 1);
    const amountYen = Math.max(BANNER_MIN_AMOUNT, p * 5 * d);

    try {
      const { clientSecret, paymentIntentId } = await createBannerPaymentIntent({
        amountYen,
        metadata: { userId: String(user.id), people: String(p), days: String(d), type: "banner_ad" },
      });
      res.json({ clientSecret, paymentIntentId, amountYen });
    } catch (e: any) {
      console.error("Banner checkout error:", e);
      res.status(500).json({ error: e.message ?? "決済の準備に失敗しました" });
    }
  });

  app.post("/api/banner/confirm", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });

    const { paymentIntentId } = req.body as { paymentIntentId?: string };
    if (!paymentIntentId) return res.status(400).json({ error: "paymentIntentId が必要です" });

    const status = await getPaymentIntentStatus(paymentIntentId);
    if (status !== "succeeded") {
      return res.status(400).json({ error: "決済が完了していません" });
    }

    const stripe = await getUncachableStripeClient();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    const amountYen = pi.amount;

    const sys = await getOrCreateSystemWallets();
    const amountMod = Math.floor(amountYen * BANNER_RATE_MODERATOR);
    const amountAdmin = Math.floor(amountYen * BANNER_RATE_ADMIN);
    const amountEvent = Math.floor(amountYen * BANNER_RATE_EVENT);
    const amountPlatform = amountYen - amountMod - amountAdmin - amountEvent;

    await db.insert(transactions).values(([
      { walletId: sys.MODERATOR, amount: amountMod, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId },
      { walletId: sys.ADMIN, amount: amountAdmin, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId },
      { walletId: sys.EVENT_RESERVE, amount: amountEvent, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId },
      { walletId: sys.PLATFORM, amount: amountPlatform, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId },
    ] as unknown) as typeof transactions.$inferInsert[]);

    res.json({ ok: true, amountYen, split: { moderator: amountMod, admin: amountAdmin, eventReserve: amountEvent, platform: amountPlatform } });
  });

  // コミュニティ広告バナー用 Stripe Checkout（3日間 15,000円）
  const BANNER_CHECKOUT_DAYS = 3;
  const BANNER_CHECKOUT_AMOUNT_YEN = 15_000;

  app.post("/api/banner/checkout-session", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });

    try {
      const stripe = await getUncachableStripeClient();
      const baseUrl = process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
        : process.env.APP_URL ?? "http://localhost:8081";

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "jpy",
              unit_amount: BANNER_CHECKOUT_AMOUNT_YEN,
              product_data: {
                name: "コミュニティ広告バナー（3日間）",
                description: `コミュニティページの広告バナー枠 3日間出稿（¥${BANNER_CHECKOUT_AMOUNT_YEN.toLocaleString()}）`,
              },
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/community`,
        metadata: {
          type: "banner_ad",
          days: String(BANNER_CHECKOUT_DAYS),
          userId: String(user.id),
        },
      });

      res.json({ checkoutUrl: session.url });
    } catch (e: any) {
      console.error("Banner checkout session error:", e);
      res.status(500).json({ error: e.message ?? "決済の準備に失敗しました" });
    }
  });

  app.post("/api/banner/confirm-session", async (req: Request, res: Response) => {
    const { sessionId } = req.body as { sessionId?: string };
    if (!sessionId) return res.status(400).json({ error: "sessionId が必要です" });

    try {
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== "paid") {
        return res.status(400).json({ error: "決済が完了していません" });
      }

      const amountYen = session.amount_total ?? BANNER_CHECKOUT_AMOUNT_YEN;
      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? session.id;

      const sys = await getOrCreateSystemWallets();
      const amountMod = Math.floor(amountYen * BANNER_RATE_MODERATOR);
      const amountAdmin = Math.floor(amountYen * BANNER_RATE_ADMIN);
      const amountEvent = Math.floor(amountYen * BANNER_RATE_EVENT);
      const amountPlatform = amountYen - amountMod - amountAdmin - amountEvent;

      await db.insert(transactions).values(([
        { walletId: sys.MODERATOR, amount: amountMod, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId },
        { walletId: sys.ADMIN, amount: amountAdmin, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId },
        { walletId: sys.EVENT_RESERVE, amount: amountEvent, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId },
        { walletId: sys.PLATFORM, amount: amountPlatform, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId },
      ] as unknown) as typeof transactions.$inferInsert[]);

      res.json({
        ok: true,
        amountYen,
        split: { moderator: amountMod, admin: amountAdmin, eventReserve: amountEvent, platform: amountPlatform },
      });
    } catch (e: any) {
      console.error("Banner confirm-session error:", e);
      res.status(500).json({ error: e.message ?? "決済の確認に失敗しました" });
    }
  });

  app.put("/api/auth/profile", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });
    const { name, displayName, bio, avatar, profileImageUrl, spotifyUrl, appleMusicUrl, bandcampUrl, instagramUrl, youtubeUrl, xUrl, phoneNumber, enneagramScores, pinnedCommunityIds } = req.body as {
      name?: string;
      displayName?: string;
      bio?: string;
      avatar?: string | null;
      profileImageUrl?: string | null;
      spotifyUrl?: string | null;
      appleMusicUrl?: string | null;
      bandcampUrl?: string | null;
      instagramUrl?: string | null;
      youtubeUrl?: string | null;
      xUrl?: string | null;
      phoneNumber?: string | null;
      enneagramScores?: number[] | null;
      pinnedCommunityIds?: number[] | null;
    };
    const newName = name ?? displayName ?? user.displayName;
    const newBio = bio ?? user.bio;
    const newAvatar = avatar ?? profileImageUrl ?? user.profileImageUrl;
    const newPhone = phoneNumber !== undefined ? (phoneNumber?.trim() || null) : undefined;
    const enneagramJson =
      enneagramScores !== undefined
        ? Array.isArray(enneagramScores) && enneagramScores.length === 9
          ? JSON.stringify(enneagramScores)
          : null
        : undefined;
    const pinnedJson =
      pinnedCommunityIds !== undefined
        ? Array.isArray(pinnedCommunityIds)
          ? JSON.stringify(pinnedCommunityIds.slice(0, 4))
          : null
        : undefined;
    const [updated] = await db
      .update(users)
      .set({
        displayName: newName,
        bio: newBio,
        profileImageUrl: newAvatar !== undefined ? newAvatar : undefined,
        spotifyUrl: spotifyUrl !== undefined ? spotifyUrl : (user as any).spotifyUrl ?? null,
        appleMusicUrl: appleMusicUrl !== undefined ? appleMusicUrl : (user as any).appleMusicUrl ?? null,
        bandcampUrl: bandcampUrl !== undefined ? bandcampUrl : (user as any).bandcampUrl ?? null,
        ...(instagramUrl !== undefined ? { instagramUrl: instagramUrl?.trim() || null } : {}),
        ...(youtubeUrl !== undefined ? { youtubeUrl: youtubeUrl?.trim() || null } : {}),
        ...(xUrl !== undefined ? { xUrl: xUrl?.trim() || null } : {}),
        ...(newPhone !== undefined && { phoneNumber: newPhone }),
        ...(enneagramJson !== undefined && { enneagramScores: enneagramJson }),
        ...(pinnedJson !== undefined && { pinnedCommunityIds: pinnedJson }),
        updatedAt: new Date(),
      } as Partial<typeof users.$inferInsert>)
      .where(eq(users.id, user.id))
      .returning();
    let outEnneagram: number[] | null = null;
    let outPinned: number[] = [];
    if ((updated as any).enneagramScores) {
      try {
        const p = JSON.parse((updated as any).enneagramScores) as number[];
        if (Array.isArray(p) && p.length === 9) outEnneagram = p;
      } catch {}
    }
    if ((updated as any).pinnedCommunityIds) {
      try {
        const p = JSON.parse((updated as any).pinnedCommunityIds) as number[];
        if (Array.isArray(p)) outPinned = p;
      } catch {}
    }
    res.json({
      id: updated.id,
      name: updated.displayName,
      displayName: updated.displayName,
      profileImageUrl: updated.profileImageUrl,
      avatar: updated.profileImageUrl,
      role: updated.role,
      bio: updated.bio,
      spotifyUrl: updated.spotifyUrl ?? null,
      appleMusicUrl: updated.appleMusicUrl ?? null,
      bandcampUrl: updated.bandcampUrl ?? null,
      instagramUrl: (updated as any).instagramUrl ?? null,
      youtubeUrl: (updated as any).youtubeUrl ?? null,
      enneagramScores: outEnneagram,
      pinnedCommunityIds: outPinned,
      xUrl: (updated as any).xUrl ?? null,
    });
  });

  /** アカウント削除（コミュニティを管理している場合は不可） */
  app.delete("/api/auth/account", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });

    const [owned] = await db.select().from(communities).where(eq(communities.ownerId, user.id)).limit(1);
    if (owned) {
      return res.status(400).json({ error: "管理しているコミュニティがあるため削除できません。先にコミュニティを削除してください。" });
    }

    try {
      await db.delete(communityMembers).where(eq(communityMembers.userId, user.id));
      await db.delete(communityModerators).where(eq(communityModerators.userId, user.id));
      await db.delete(communityPollVotes).where(eq(communityPollVotes.userId, user.id));
      await db.delete(communityVotes).where(eq(communityVotes.userId, user.id));
      await db.update(videos).set({ userId: null } as Partial<typeof videos.$inferInsert>).where(eq(videos.userId, user.id));
      await db.delete(videoComments).where(eq(videoComments.userId, user.id));
      await db.delete(users).where(eq(users.id, user.id));
      res.json({ ok: true });
    } catch (e) {
      console.error("Account deletion error:", e);
      res.status(500).json({ error: "アカウントの削除に失敗しました" });
    }
  });

  /** 投稿者名からユーザー or ライバーのプロフィールIDを取得（認証不要） */
  app.get("/api/profile/by-name/:name", async (req: Request, res: Response) => {
    const name = decodeURIComponent((req.params as { name: string }).name || "");
    if (!name.trim()) return res.status(400).json({ error: "名前を指定してください" });
    const [u] = await db.select({ id: users.id }).from(users).where(eq(users.displayName, name));
    if (u) return res.json({ type: "user", id: u.id });
    const [c] = await db.select({ id: creators.id }).from(creators).where(eq(creators.name, name));
    if (c) return res.json({ type: "liver", id: c.id });
    return res.status(404).json({ error: "Not found" });
  });

  /** 他ユーザーの公開プロフィール取得（認証不要） */
  app.get("/api/users/:id", async (req: Request, res: Response) => {
    const id = paramNum(req, "id");
    const [u] = await db.select({
      id: users.id,
      displayName: users.displayName,
      profileImageUrl: users.profileImageUrl,
      bio: users.bio,
      instagramUrl: users.instagramUrl,
      youtubeUrl: users.youtubeUrl,
      xUrl: users.xUrl,
      spotifyUrl: users.spotifyUrl,
      appleMusicUrl: users.appleMusicUrl,
      bandcampUrl: users.bandcampUrl,
      enneagramScores: users.enneagramScores,
      pinnedCommunityIds: users.pinnedCommunityIds,
    }).from(users).where(eq(users.id, id));
    if (!u) return res.status(404).json({ error: "Not found" });

    let pinnedCommunities: { id: number; name: string; thumbnail: string; category: string }[] = [];
    const pinnedRaw = (u as any).pinnedCommunityIds;
    if (pinnedRaw && typeof pinnedRaw === "string") {
      try {
        const ids = JSON.parse(pinnedRaw) as number[];
        if (Array.isArray(ids) && ids.length > 0) {
          const rows = await db
            .select({ id: communities.id, name: communities.name, thumbnail: communities.thumbnail, category: communities.category })
            .from(communities)
            .where(inArray(communities.id, ids.slice(0, 4)));
          pinnedCommunities = rows.map((r) => ({
            id: r.id,
            name: r.name,
            thumbnail: r.thumbnail,
            category: r.category,
          }));
        }
      } catch {}
    }

    let enneagramScores: number[] | null = null;
    const scoresRaw = (u as any).enneagramScores;
    if (scoresRaw && typeof scoresRaw === "string") {
      try {
        const parsed = JSON.parse(scoresRaw) as number[];
        if (Array.isArray(parsed) && parsed.length === 9) enneagramScores = parsed;
      } catch {}
    }

    res.json({
      id: u.id,
      name: u.displayName,
      displayName: u.displayName,
      avatar: u.profileImageUrl,
      profileImageUrl: u.profileImageUrl,
      bio: u.bio ?? "",
      instagramUrl: (u as any).instagramUrl ?? null,
      youtubeUrl: (u as any).youtubeUrl ?? null,
      xUrl: (u as any).xUrl ?? null,
      spotifyUrl: (u as any).spotifyUrl ?? null,
      appleMusicUrl: (u as any).appleMusicUrl ?? null,
      bandcampUrl: (u as any).bandcampUrl ?? null,
      enneagramScores,
      pinnedCommunities,
    });
  });

  // ── Dynamic Base URL (Replit-native) ─────────────────────────────
  const REPLIT_BASE_URL = process.env.REPLIT_DOMAINS
    ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
    : process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : "http://localhost:5000";

  // ── LINE OAuth ────────────────────────────────────────────────────
  const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID ?? "";
  const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET ?? "";
  const LINE_CALLBACK_URL = process.env.LINE_CALLBACK_URL ?? `${REPLIT_BASE_URL}/api/auth/line-callback`;
  const FRONTEND_URL = (process.env.FRONTEND_URL || REPLIT_BASE_URL).replace(/\/$/, "");
  const lineRedirect = (path: string) => (FRONTEND_URL ? `${FRONTEND_URL}${path}` : path);
  const LINE_STATE = "livestage-line-state";

  // ── Google OAuth ──────────────────────────────────────────────────
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
  const GOOGLE_CALLBACK_URL =
    process.env.NODE_ENV === "production"
      ? `${REPLIT_BASE_URL}/api/auth/google-callback`
      : (process.env.GOOGLE_CALLBACK_URL ?? `${REPLIT_BASE_URL}/api/auth/google-callback`);
  const GOOGLE_STATE = "livestage-google-state";
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY ?? "";

  app.get("/api/auth/status", (_req: Request, res: Response) => {
    res.json({
      line: {
        configured: !!(LINE_CHANNEL_ID && LINE_CHANNEL_SECRET && LINE_CALLBACK_URL),
        callbackUrl: LINE_CALLBACK_URL || null,
      },
      google: {
        configured: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_CALLBACK_URL),
      },
    });
  });

  app.get("/api/auth/line", (_req: Request, res: Response) => {
    if (!LINE_CHANNEL_ID || !LINE_CHANNEL_SECRET || !LINE_CALLBACK_URL) {
      return res.status(500).json({ error: "LINE OAuth is not configured (LINE_CHANNEL_ID, LINE_CHANNEL_SECRET, LINE_CALLBACK_URL)" });
    }
    const params = new URLSearchParams({
      response_type: "code",
      client_id: LINE_CHANNEL_ID,
      redirect_uri: LINE_CALLBACK_URL,
      state: LINE_STATE,
      scope: "profile",
    });
    res.redirect(`https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`);
  });

  app.get("/api/auth/google", (_req: Request, res: Response) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CALLBACK_URL) {
      return res.status(500).json({ error: "Google OAuth is not configured" });
    }
    const params = new URLSearchParams({
      response_type: "code",
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_CALLBACK_URL,
      scope: "openid email profile https://www.googleapis.com/auth/youtube.readonly",
      state: GOOGLE_STATE,
      access_type: "offline",
      prompt: "consent",
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  });

  app.get("/api/auth/google-callback", async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const state = req.query.state as string;
    if (!code || state !== GOOGLE_STATE) {
      return res.redirect(lineRedirect("/auth/login?line_error=invalid_state"));
    }
    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: GOOGLE_CALLBACK_URL,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
        }).toString(),
      });
      const tokenData = (await tokenRes.json()) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        id_token?: string;
        error?: string;
      };
      if (!tokenData.access_token) {
        return res.redirect(lineRedirect("/auth/login?line_error=token_failed"));
      }

      const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const profile = (await profileRes.json()) as {
        sub?: string;
        name?: string;
        picture?: string;
        email?: string;
      };
      if (!profile.sub) {
        return res.redirect(lineRedirect("/auth/login?line_error=profile_failed"));
      }

      const googleKey = `google:${profile.sub}`;
      const displayName = profile.name ?? profile.email ?? "Google User";
      const avatar = profile.picture ?? null;

      const expiresAt = tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : null;
      const tokenUpdate = {
        googleAccessToken: tokenData.access_token,
        ...(tokenData.refresh_token ? { googleRefreshToken: tokenData.refresh_token } : {}),
        ...(expiresAt ? { googleTokenExpiresAt: expiresAt } : {}),
      };

      let [existing] = await db.select().from(users).where(eq(users.lineId, googleKey));
      if (!existing) {
        [existing] = await db
          .insert(users)
          .values({
            lineId: googleKey,
            displayName,
            profileImageUrl: avatar,
            role: "USER",
            ...tokenUpdate,
          } as typeof users.$inferInsert)
          .returning();
      } else {
        [existing] = await db
          .update(users)
          .set({
            displayName,
            profileImageUrl: avatar,
            updatedAt: new Date(),
            ...tokenUpdate,
          } as Partial<typeof users.$inferInsert>)
          .where(eq(users.id, existing.id))
          .returning();
      }

      const jwtToken = makeToken(existing.id);
      // iOS Safari PWA対応: PWAのstartUrl(/)にリダイレクトしてPWA内でトークン処理
      res.redirect(lineRedirect(`/?token=${encodeURIComponent(jwtToken)}`));
    } catch (err) {
      console.error("Google callback error:", err);
      res.redirect(lineRedirect("/auth/login?line_error=server_error"));
    }
  });

  // ── YouTube Search for Jukebox ─────────────────────────────────────
  app.get("/api/youtube/search", async (req: Request, res: Response) => {
    const q = queryStr(req, "q").trim();
    if (!q) {
      return res.status(400).json({ error: "検索キーワードを入力してください" });
    }
    if (!YOUTUBE_API_KEY) {
      return res.status(500).json({ error: "YouTube API キーが設定されていません" });
    }
    try {
      const params = new URLSearchParams({
        key: YOUTUBE_API_KEY,
        part: "snippet",
        type: "video",
        q,
        maxResults: "8",
      });
      const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
      if (!ytRes.ok) {
        const text = await ytRes.text();
        console.error("YouTube search error:", ytRes.status, text);
        return res.status(502).json({ error: "YouTube 検索に失敗しました" });
      }
      const json = (await ytRes.json()) as {
        items?: { id?: { videoId?: string }; snippet?: { title?: string; thumbnails?: { default?: { url?: string }; medium?: { url?: string }; high?: { url?: string } } } }[];
      };
      const items = json.items ?? [];
      const baseResults = items
        .map((item) => {
          const videoId = item.id?.videoId;
          const title = item.snippet?.title ?? "";
          const thumbs = item.snippet?.thumbnails;
          const thumbUrl =
            thumbs?.high?.url ?? thumbs?.medium?.url ?? thumbs?.default?.url ?? "";
          if (!videoId || !thumbUrl) return null;
          return { videoId, title, thumbnail: thumbUrl };
        })
        .filter(Boolean) as { videoId: string; title: string; thumbnail: string }[];

      // videos.list で実際の動画時間（ISO 8601 duration）を取得
      const videoIds = baseResults.map((r) => r.videoId).join(",");
      let durationMap: Record<string, number> = {};
      if (videoIds) {
        try {
          const vParams = new URLSearchParams({
            key: YOUTUBE_API_KEY,
            part: "contentDetails",
            id: videoIds,
          });
          const vRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?${vParams.toString()}`);
          if (vRes.ok) {
            const vJson = (await vRes.json()) as {
              items?: { id?: string; contentDetails?: { duration?: string } }[];
            };
            for (const v of vJson.items ?? []) {
              if (v.id && v.contentDetails?.duration) {
                // ISO 8601 duration (PT#H#M#S) → seconds
                const m = v.contentDetails.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                if (m) {
                  const secs = (parseInt(m[1] ?? "0") * 3600) + (parseInt(m[2] ?? "0") * 60) + parseInt(m[3] ?? "0");
                  durationMap[v.id] = secs;
                }
              }
            }
          }
        } catch { /* duration 取得失敗は無視 */ }
      }

      const results = baseResults.map((r) => ({
        ...r,
        durationSecs: durationMap[r.videoId] ?? 0,
      }));
      res.json(results);
    } catch (e: any) {
      console.error("YouTube search exception:", e);
      res.status(500).json({ error: "YouTube 検索でエラーが発生しました" });
    }
  });

  /** ユーザーの Google アクセストークンを取得（必要ならリフレッシュ） */
  async function getGoogleAccessToken(userId: number): Promise<string | null> {
    const [u] = await db.select().from(users).where(eq(users.id, userId));
    if (!u || !(u as any).googleRefreshToken) return null;
    const row = u as any;
    const expiresAt = row.googleTokenExpiresAt ? new Date(row.googleTokenExpiresAt).getTime() : 0;
    const now = Date.now();
    if (row.googleAccessToken && expiresAt > now + 60_000) {
      return row.googleAccessToken;
    }
    const refreshToken = row.googleRefreshToken;
    if (!refreshToken || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null;
    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
        }).toString(),
      });
      const data = (await tokenRes.json()) as { access_token?: string; expires_in?: number };
      if (!data.access_token) return null;
      const newExpiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : null;
      await db
        .update(users)
        .set({
          googleAccessToken: data.access_token,
          ...(newExpiresAt ? { googleTokenExpiresAt: newExpiresAt } : {}),
          updatedAt: new Date(),
        } as Partial<typeof users.$inferInsert>)
        .where(eq(users.id, userId));
      return data.access_token;
    } catch {
      return null;
    }
  }

  // ── YouTube プレイリスト（Google ログインユーザー向け）────────────────────────
  app.get("/api/youtube/playlists", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });
    const accessToken = await getGoogleAccessToken(user.id);
    if (!accessToken) {
      return res.status(403).json({
        error: "YouTube プレイリストを利用するには Google でログインしてください",
        needsGoogleLogin: true,
      });
    }
    try {
      const params = new URLSearchParams({
        part: "snippet",
        mine: "true",
        maxResults: "25",
      });
      const ytRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlists?${params.toString()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!ytRes.ok) {
        const text = await ytRes.text();
        console.error("YouTube playlists error:", ytRes.status, text);
        return res.status(502).json({ error: "プレイリストの取得に失敗しました" });
      }
      const json = (await ytRes.json()) as {
        items?: { id?: string; snippet?: { title?: string; thumbnails?: { default?: { url?: string }; medium?: { url?: string } } } }[];
      };
      const items = (json.items ?? []).map((item) => {
        const thumbs = item.snippet?.thumbnails;
        const thumbUrl = thumbs?.medium?.url ?? thumbs?.default?.url ?? "";
        return {
          id: item.id,
          title: item.snippet?.title ?? "",
          thumbnail: thumbUrl,
        };
      });
      res.json(items);
    } catch (e: any) {
      console.error("YouTube playlists exception:", e);
      res.status(500).json({ error: "プレイリストの取得でエラーが発生しました" });
    }
  });

  app.get("/api/youtube/playlists/:playlistId/items", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });
    const accessToken = await getGoogleAccessToken(user.id);
    if (!accessToken) {
      return res.status(403).json({
        error: "YouTube プレイリストを利用するには Google でログインしてください",
        needsGoogleLogin: true,
      });
    }
    const playlistId = paramStr(req, "playlistId");
    if (!playlistId) return res.status(400).json({ error: "プレイリストIDが必要です" });
    try {
      const params = new URLSearchParams({
        part: "snippet,contentDetails",
        playlistId,
        maxResults: "50",
      });
      const ytRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!ytRes.ok) {
        const text = await ytRes.text();
        console.error("YouTube playlistItems error:", ytRes.status, text);
        return res.status(502).json({ error: "プレイリストの取得に失敗しました" });
      }
      const json = (await ytRes.json()) as {
        items?: {
          id?: string;
          snippet?: {
            title?: string;
            thumbnails?: { default?: { url?: string }; medium?: { url?: string }; high?: { url?: string } };
            resourceId?: { videoId?: string };
          };
          contentDetails?: { videoId?: string };
        }[];
      };
      const baseItems = (json.items ?? [])
        .map((item) => {
          const videoId = item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId;
          const thumbs = item.snippet?.thumbnails;
          const thumbUrl = thumbs?.high?.url ?? thumbs?.medium?.url ?? thumbs?.default?.url ?? "";
          if (!videoId) return null;
          return {
            videoId,
            title: item.snippet?.title ?? "",
            thumbnail: thumbUrl,
          };
        })
        .filter(Boolean) as { videoId: string; title: string; thumbnail: string }[];

      // videos.list で実際の動画時間を取得
      let durationMap: Record<string, number> = {};
      const videoIds = baseItems.map((i) => i.videoId).join(",");
      if (videoIds && YOUTUBE_API_KEY) {
        try {
          const vParams = new URLSearchParams({ key: YOUTUBE_API_KEY, part: "contentDetails", id: videoIds });
          const vRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?${vParams.toString()}`);
          if (vRes.ok) {
            const vJson = (await vRes.json()) as { items?: { id?: string; contentDetails?: { duration?: string } }[] };
            for (const v of vJson.items ?? []) {
              if (v.id && v.contentDetails?.duration) {
                const m = v.contentDetails.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                if (m) durationMap[v.id] = (parseInt(m[1] ?? "0") * 3600) + (parseInt(m[2] ?? "0") * 60) + parseInt(m[3] ?? "0");
              }
            }
          }
        } catch { /* 無視 */ }
      }
      const items = baseItems.map((i) => ({ ...i, durationSecs: durationMap[i.videoId] ?? 0 }));
      res.json(items);
    } catch (e: any) {
      console.error("YouTube playlistItems exception:", e);
      res.status(500).json({ error: "プレイリストの取得でエラーが発生しました" });
    }
  });

  app.get("/api/auth/callback/line", async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const state = req.query.state as string;
    console.log("[LINE callback/line] received", { hasCode: !!code, stateMatch: state === LINE_STATE });
    if (!code || state !== LINE_STATE) {
      return res.redirect(lineRedirect("/auth/login?line_error=invalid_state"));
    }
    try {
      const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: LINE_CALLBACK_URL,
          client_id: LINE_CHANNEL_ID,
          client_secret: LINE_CHANNEL_SECRET,
        }).toString(),
      });
      const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string; error_description?: string };
      if (!tokenData.access_token) {
        console.error("[LINE callback] token failed", tokenData);
        const err = tokenData.error_description ?? tokenData.error ?? "token_failed";
        return res.redirect(lineRedirect(`/auth/login?line_error=${encodeURIComponent(err)}`));
      }

      const profileRes = await fetch("https://api.line.me/v2/profile", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const profile = await profileRes.json() as { userId?: string; displayName?: string; pictureUrl?: string };
      if (!profile.userId) {
        console.error("[LINE callback] profile failed", profile);
        return res.redirect(lineRedirect("/auth/login?line_error=profile_failed"));
      }

      const lineId = profile.userId;
      console.log("[LINE callback] profile ok", { lineId, displayName: profile.displayName });
      const lineName = profile.displayName ?? "LINE User";
      const lineAvatar = profile.pictureUrl ?? null;

      let [existing] = await db.select().from(users).where(eq(users.lineId, lineId));
      if (!existing) {
        [existing] = await db
          .insert(users)
          .values({
            lineId,
            displayName: lineName,
            profileImageUrl: lineAvatar,
            role: "USER",
          } as typeof users.$inferInsert)
          .returning();
      } else {
        [existing] = await db
          .update(users)
          .set({ displayName: lineName, profileImageUrl: lineAvatar, updatedAt: new Date() } as Partial<typeof users.$inferInsert>)
          .where(eq(users.id, existing.id))
          .returning();
      }

      const jwtToken = makeToken(existing.id);
      // iOS Safari PWA対応: PWAのstartUrl(/)にリダイレクトしてPWA内でトークン処理
      res.redirect(lineRedirect(`/?token=${encodeURIComponent(jwtToken)}`));
    } catch (err) {
      console.error("LINE callback error:", err);
      res.redirect(lineRedirect("/auth/login?line_error=server_error"));
    }
  });

  // LINE OAuth コールバック（line-callback パス。LINE Developers のコールバックURLをこちらにしている場合）
  app.get("/api/auth/line-callback", async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const state = req.query.state as string;
    console.log("[LINE callback] received", { hasCode: !!code, stateMatch: state === LINE_STATE });
    if (!code || state !== LINE_STATE) {
      return res.redirect(lineRedirect("/auth/login?line_error=invalid_state"));
    }
    try {
      const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: LINE_CALLBACK_URL,
          client_id: LINE_CHANNEL_ID,
          client_secret: LINE_CHANNEL_SECRET,
        }).toString(),
      });
      const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string; error_description?: string };
      if (!tokenData.access_token) {
        console.error("[LINE callback] token failed", tokenData);
        const err = tokenData.error_description ?? tokenData.error ?? "token_failed";
        return res.redirect(lineRedirect(`/auth/login?line_error=${encodeURIComponent(err)}`));
      }

      const profileRes = await fetch("https://api.line.me/v2/profile", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const profile = await profileRes.json() as { userId?: string; displayName?: string; pictureUrl?: string };
      if (!profile.userId) {
        console.error("[LINE callback] profile failed", profile);
        return res.redirect(lineRedirect("/auth/login?line_error=profile_failed"));
      }

      const lineId = profile.userId;
      console.log("[LINE callback] profile ok", { lineId, displayName: profile.displayName });
      const lineName = profile.displayName ?? "LINE User";
      const lineAvatar = profile.pictureUrl ?? null;

      let [existing] = await db.select().from(users).where(eq(users.lineId, lineId));
      if (!existing) {
        [existing] = await db
          .insert(users)
          .values({
            lineId,
            displayName: lineName,
            profileImageUrl: lineAvatar,
            role: "USER",
          } as typeof users.$inferInsert)
          .returning();
      } else {
        [existing] = await db
          .update(users)
          .set({ displayName: lineName, profileImageUrl: lineAvatar, updatedAt: new Date() } as Partial<typeof users.$inferInsert>)
          .where(eq(users.id, existing.id))
          .returning();
      }

      const jwtToken = makeToken(existing.id);
      console.log("[LINE callback] success", { userId: existing.id });
      // iOS Safari PWA対応: PWAのstartUrl(/)にリダイレクトしてPWA内でトークン処理
      res.redirect(lineRedirect(`/?token=${encodeURIComponent(jwtToken)}`));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[LINE callback] server_error", err);
      res.redirect(lineRedirect(`/auth/login?line_error=${encodeURIComponent("server_error:" + msg.slice(0, 80))}`));
    }
  });

  // ── Communities ───────────────────────────────────────────────────
  /** genreId で絞り込み: pop, rock, hiphop, edm, ai → category に含まれるかでフィルタ */
  const GENRE_TO_CATEGORY: Record<string, string[]> = {
    pop: ["Pop", "ポップ", "J-Pop", "K-Pop", "音楽"],
    rock: ["Rock", "ロック", "バンド"],
    hiphop: ["Hip-Hop", "HipHop", "ヒップホップ", "Rap", "ラップ"],
    edm: ["EDM", "Electronic", "エレクトロ", "DJ"],
    ai: ["AI", "AI音楽", "Generative"],
  };
  app.get("/api/communities", async (req: Request, res: Response) => {
    const genreId = queryStr(req, "genre");
    let rows = await db.select().from(communities).orderBy(desc(communities.members));
    if (genreId && GENRE_TO_CATEGORY[genreId]) {
      const terms = GENRE_TO_CATEGORY[genreId];
      rows = rows.filter((r) =>
        terms.some((t) => (r.category ?? "").includes(t))
      );
    }
    res.json(rows);
  });

  /** 現在ログイン中ユーザーが参加しているコミュニティ一覧 */
  app.get("/api/communities/me", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });

    const memberships = await db
      .select({ communityId: communityMembers.communityId })
      .from(communityMembers)
      .where(eq(communityMembers.userId, user.id));

    if (memberships.length === 0) {
      return res.json([]);
    }

    const ids = memberships.map((m) => m.communityId);
    const rows = await db
      .select()
      .from(communities)
      .where(inArray(communities.id, ids))
      .orderBy(desc(communities.members));

    res.json(rows);
  });

  app.get("/api/communities/:id", async (req: Request, res: Response) => {
    const id = paramNum(req, "id");
    const [row] = await db.select().from(communities).where(eq(communities.id, id));
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });

  // ── Video Editors ───────────────────────────────────────────────────
  app.get("/api/communities/:id/editors", async (req: Request, res: Response) => {
    const communityId = paramNum(req, "id");
    const rows = await db
      .select()
      .from(videoEditors)
      .where(eq(videoEditors.communityId, communityId))
      .orderBy(desc(videoEditors.isAvailable), desc(videoEditors.rating));
    res.json(rows);
  });

  /** コミュニティに登録しているクリエイター一覧（動画編集者 + ライバー/クリエイター） */
  app.get("/api/communities/:id/creators", async (req: Request, res: Response) => {
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });

    const editors = await db
      .select()
      .from(videoEditors)
      .where(eq(videoEditors.communityId, communityId))
      .orderBy(desc(videoEditors.rating));
    const livers = await db
      .select()
      .from(creators)
      .where(eq(creators.community, community.name))
      .orderBy(asc(creators.rank));

    res.json({
      editors: editors.map((e) => ({ ...e, kind: "editor" as const })),
      livers: livers.map((l) => ({ ...l, kind: "liver" as const })),
    });
  });

  /** コミュニティの管理人・モデレーター取得 */
  app.get("/api/communities/:id/staff", async (req: Request, res: Response) => {
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });

    const admin = community.adminId
      ? (await db.select().from(users).where(eq(users.id, community.adminId)))[0] ?? null
      : null;
    const modRows = await db
      .select({ userId: communityModerators.userId })
      .from(communityModerators)
      .where(eq(communityModerators.communityId, communityId));
    const moderatorUsers =
      modRows.length > 0
        ? await db.select().from(users).where(inArray(users.id, modRows.map((r) => r.userId)))
        : [];

    res.json({
      adminId: community.adminId,
      ownerId: community.ownerId,
      admin: admin ? { id: admin.id, displayName: admin.displayName, profileImageUrl: admin.profileImageUrl } : null,
      moderatorIds: modRows.map((r) => r.userId),
      moderators: moderatorUsers.map((u) => ({ id: u.id, displayName: u.displayName, profileImageUrl: u.profileImageUrl })),
    });
  });

  /** コミュニティの管理人・モデレーター設定（管理人または本人のみ） */
  app.patch("/api/communities/:id/staff", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });

    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });

    const isAdmin = community.adminId === user.id;
    if (!isAdmin) return res.status(403).json({ error: "管理人のみ設定できます" });

    const { adminId, moderatorIds } = req.body as { adminId?: number | null; moderatorIds?: number[] };
    if (adminId !== undefined) {
      await db
        .update(communities)
        .set({ adminId: adminId ?? null } as Partial<typeof communities.$inferInsert>)
        .where(eq(communities.id, communityId));
    }
    if (moderatorIds !== undefined && Array.isArray(moderatorIds)) {
      await db.delete(communityModerators).where(eq(communityModerators.communityId, communityId));
      for (const uid of moderatorIds) {
        if (Number.isInteger(uid)) {
          await db.insert(communityModerators).values({ communityId, userId: uid } as typeof communityModerators.$inferInsert);
        }
      }
    }
    const [updated] = await db.select().from(communities).where(eq(communities.id, communityId));
    res.json(updated);
  });

  /** コミュニティメンバー一覧（管理人・モデレーター選択用） */
  app.get("/api/communities/:id/members", async (req: Request, res: Response) => {
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });

    const rows = await db
      .select({ userId: communityMembers.userId })
      .from(communityMembers)
      .where(eq(communityMembers.communityId, communityId));
    const memberUsers =
      rows.length > 0
        ? await db.select({
            id: users.id,
            displayName: users.displayName,
            profileImageUrl: users.profileImageUrl,
          }).from(users).where(inArray(users.id, rows.map((r) => r.userId)))
        : [];

    res.json(memberUsers);
  });

  /** 現在のユーザーがこのコミュニティのメンバーか */
  app.get("/api/communities/:id/members/me", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.json({ isMember: false });

    const communityId = paramNum(req, "id");
    const rows = await db
      .select()
      .from(communityMembers)
      .where(
        and(
          eq(communityMembers.communityId, communityId),
          eq(communityMembers.userId, user.id),
        )
      );
    res.json({ isMember: rows.length > 0 });
  });

  /** コミュニティに参加（フォロー時などに呼ぶ） */
  app.post("/api/communities/:id/join", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });

    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });

    const existing = await db
      .select()
      .from(communityMembers)
      .where(
        and(
          eq(communityMembers.communityId, communityId),
          eq(communityMembers.userId, user.id),
        )
      );
    if (existing.length > 0) {
      return res.json({ ok: true, alreadyMember: true });
    }

    await db.insert(communityMembers).values({
      communityId,
      userId: user.id,
    } as typeof communityMembers.$inferInsert);
    const [c] = await db.select({ m: communities.members }).from(communities).where(eq(communities.id, communityId));
    if (c) {
      await db
        .update(communities)
        .set({ members: c.m + 1 } as Partial<typeof communities.$inferInsert>)
        .where(eq(communities.id, communityId));
    }
    res.status(201).json({ ok: true });
  });

  // ── コミュニティ掲示板（スレッド形式） ─────────────────────────────────
  app.get("/api/communities/:id/threads", async (req: Request, res: Response) => {
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const rows = await db
      .select({
        id: communityThreads.id,
        communityId: communityThreads.communityId,
        authorUserId: communityThreads.authorUserId,
        title: communityThreads.title,
        body: communityThreads.body,
        createdAt: communityThreads.createdAt,
        pinned: communityThreads.pinned,
      })
      .from(communityThreads)
      .where(eq(communityThreads.communityId, communityId))
      .orderBy(desc(communityThreads.pinned), desc(communityThreads.createdAt));
    const postCounts = await Promise.all(
      rows.map(async (t) => {
        const [c] = await db.select({ n: count() }).from(communityThreadPosts).where(eq(communityThreadPosts.threadId, t.id));
        return c?.n ?? 0;
      })
    );
    const authorIds = [...new Set(rows.map((r) => r.authorUserId))];
    const authorRows = authorIds.length > 0
      ? await db.select({ id: users.id, displayName: users.displayName, profileImageUrl: users.profileImageUrl }).from(users).where(inArray(users.id, authorIds))
      : [];
    const authorMap = new Map(authorRows.map((a) => [a.id, a]));
    res.json(
      rows.map((r, i) => ({
        ...r,
        postCount: postCounts[i],
        author: authorMap.get(r.authorUserId) ?? { displayName: "不明", profileImageUrl: null },
      }))
    );
  });

  app.post("/api/communities/:id/threads", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const memberRows = await db
      .select()
      .from(communityMembers)
      .where(and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, user.id)));
    if (memberRows.length === 0) return res.status(403).json({ error: "コミュニティに参加してください" });
    const { title, body } = req.body as { title?: string; body?: string };
    if (!title || !title.trim()) return res.status(400).json({ error: "タイトルを入力してください" });
    // コンテンツモデレーション（タイトル＋本文を結合してチェック）
    const combinedText = [title, body].filter(Boolean).join(" ");
    const modResult = await moderateContent(combinedText);
    if (!modResult.allowed) {
      return res.status(400).json({ error: modResult.reason ?? "不適切なコンテンツが含まれています" });
    }
    const [row] = await db
      .insert(communityThreads)
      .values({
        communityId,
        authorUserId: user.id,
        title: title.trim(),
        body: (body ?? "").trim(),
      } as typeof communityThreads.$inferInsert)
      .returning();
    res.status(201).json(row);
  });

  app.get("/api/communities/:id/threads/:threadId", async (req: Request, res: Response) => {
    const communityId = paramNum(req, "id");
    const threadId = paramNum(req, "threadId");
    const [thread] = await db
      .select()
      .from(communityThreads)
      .where(and(eq(communityThreads.communityId, communityId), eq(communityThreads.id, threadId)));
    if (!thread) return res.status(404).json({ message: "Not found" });
    const posts = await db
      .select()
      .from(communityThreadPosts)
      .where(eq(communityThreadPosts.threadId, threadId))
      .orderBy(asc(communityThreadPosts.createdAt));
    const authorIds = [thread.authorUserId, ...posts.map((p) => p.authorUserId)];
    const authorRows = await db.select({ id: users.id, displayName: users.displayName, profileImageUrl: users.profileImageUrl }).from(users).where(inArray(users.id, authorIds));
    const authorMap = new Map(authorRows.map((a) => [a.id, a]));
    res.json({
      ...thread,
      author: authorMap.get(thread.authorUserId) ?? { displayName: "不明", profileImageUrl: null },
      posts: posts.map((p) => ({
        ...p,
        author: authorMap.get(p.authorUserId) ?? { displayName: "不明", profileImageUrl: null },
      })),
    });
  });

  /** スレッド削除（管理人・モデレーター） */
  app.delete("/api/communities/:id/threads/:threadId", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });
    const communityId = paramNum(req, "id");
    const threadId = paramNum(req, "threadId");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and(eq(communityModerators.communityId, communityId), eq(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "管理人またはモデレーターのみ削除できます" });
    const [thread] = await db.select().from(communityThreads).where(and(eq(communityThreads.communityId, communityId), eq(communityThreads.id, threadId)));
    if (!thread) return res.status(404).json({ message: "Not found" });
    await db.delete(communityThreadPosts).where(eq(communityThreadPosts.threadId, threadId));
    await db.delete(communityThreads).where(eq(communityThreads.id, threadId));
    res.json({ ok: true });
  });

  /** スレッド返信削除（管理人・モデレーター） */
  app.delete("/api/communities/:id/threads/:threadId/posts/:postId", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });
    const communityId = paramNum(req, "id");
    const threadId = paramNum(req, "threadId");
    const postId = paramNum(req, "postId");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and(eq(communityModerators.communityId, communityId), eq(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "管理人またはモデレーターのみ削除できます" });
    const [thread] = await db.select().from(communityThreads).where(and(eq(communityThreads.communityId, communityId), eq(communityThreads.id, threadId)));
    if (!thread) return res.status(404).json({ message: "Not found" });
    await db.delete(communityThreadPosts).where(and(eq(communityThreadPosts.threadId, threadId), eq(communityThreadPosts.id, postId)));
    res.json({ ok: true });
  });

  app.post("/api/communities/:id/threads/:threadId/posts", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });
    const communityId = paramNum(req, "id");
    const threadId = paramNum(req, "threadId");
    const [thread] = await db
      .select()
      .from(communityThreads)
      .where(and(eq(communityThreads.communityId, communityId), eq(communityThreads.id, threadId)));
    if (!thread) return res.status(404).json({ message: "Not found" });
    const memberRows = await db
      .select()
      .from(communityMembers)
      .where(and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, user.id)));
    if (memberRows.length === 0) return res.status(403).json({ error: "コミュニティに参加してください" });
    const { body } = req.body as { body?: string };
    if (!body || !body.trim()) return res.status(400).json({ error: "本文を入力してください" });
    // コンテンツモデレーション
    const modResult = await moderateContent(body);
    if (!modResult.allowed) {
      return res.status(400).json({ error: modResult.reason ?? "不適切なコンテンツが含まれています" });
    }
    const [row] = await db
      .insert(communityThreadPosts)
      .values({
        threadId,
        authorUserId: user.id,
        body: body.trim(),
      } as typeof communityThreadPosts.$inferInsert)
      .returning();
    res.status(201).json(row);
  });

  /** コミュニティ管理者: ジュークボックスキュー一覧・削除 */
  app.get("/api/communities/:id/admin/jukebox-queue", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and(eq(communityModerators.communityId, communityId), eq(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "管理人またはモデレーターのみアクセス可能です" });
    const rows = await db.select().from(jukeboxQueue).where(eq(jukeboxQueue.communityId, communityId)).orderBy(asc(jukeboxQueue.position));
    res.json(rows);
  });

  app.delete("/api/communities/:id/admin/jukebox-queue/:itemId", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });
    const communityId = paramNum(req, "id");
    const itemId = paramNum(req, "itemId");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and(eq(communityModerators.communityId, communityId), eq(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "管理人またはモデレーターのみ操作可能です" });
    const [item] = await db.select().from(jukeboxQueue).where(and(eq(jukeboxQueue.communityId, communityId), eq(jukeboxQueue.id, itemId)));
    if (!item) return res.status(404).json({ message: "Not found" });
    await db.delete(jukeboxQueue).where(eq(jukeboxQueue.id, itemId));
    res.json({ ok: true });
  });

  /** コミュニティ管理者: 承認済み広告一覧（スケジュール用） */
  app.get("/api/communities/:id/admin/ads", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and(eq(communityModerators.communityId, communityId), eq(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "管理人またはモデレーターのみアクセス可能です" });

    const rows = await db
      .select()
      .from(communityAds)
      .where(and(eq(communityAds.communityId, communityId), eq(communityAds.status, "approved")))
      .orderBy(asc(communityAds.startDate));
    res.json(rows);
  });

  /** コミュニティ管理者: 該当コミュニティの通報一覧 */
  app.get("/api/communities/:id/admin/reports", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and(eq(communityModerators.communityId, communityId), eq(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "管理人またはモデレーターのみアクセス可能です" });

    const videoIdsInCommunity = await db.select({ id: videos.id }).from(videos).where(eq(videos.communityId, communityId));
    const vidSet = new Set(videoIdsInCommunity.map((v) => v.id));
    const byName = await db.select({ id: videos.id }).from(videos).where(eq(videos.community, community.name));
    byName.forEach((v) => vidSet.add(v.id));

    const allReports = await db.select().from(reports).orderBy(desc(reports.createdAt));
    const filtered: typeof allReports = [];
    for (const r of allReports) {
      if (r.contentType === "video") {
        if (vidSet.has(r.contentId)) filtered.push(r);
      } else if (r.contentType === "comment") {
        const [cm] = await db.select({ videoId: videoComments.videoId }).from(videoComments).where(eq(videoComments.id, r.contentId));
        if (cm) {
          const [v] = await db.select({ id: videos.id, communityId: videos.communityId, community: videos.community }).from(videos).where(eq(videos.id, cm.videoId));
          if (v && (v.communityId === communityId || v.community === community.name)) filtered.push(r);
        }
      }
    }
    res.json(filtered);
  });

  /** コミュニティ管理者: 通報を非表示にする */
  app.patch("/api/communities/:id/admin/reports/:reportId/hide", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });
    const communityId = paramNum(req, "id");
    const reportId = paramNum(req, "reportId");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and(eq(communityModerators.communityId, communityId), eq(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "管理人またはモデレーターのみ操作可能です" });

    const [report] = await db.select().from(reports).where(eq(reports.id, reportId));
    if (!report) return res.status(404).json({ error: "通報が見つかりません" });
    const vidSet = new Set((await db.select({ id: videos.id }).from(videos).where(eq(videos.communityId, communityId))).map((v) => v.id));
    const byName = await db.select({ id: videos.id }).from(videos).where(eq(videos.community, community.name));
    byName.forEach((v) => vidSet.add(v.id));
    let allowed = false;
    if (report.contentType === "video") allowed = vidSet.has(report.contentId);
    else if (report.contentType === "comment") {
      const [cm] = await db.select({ videoId: videoComments.videoId }).from(videoComments).where(eq(videoComments.id, report.contentId));
      if (cm) {
        const [v] = await db.select({ communityId: videos.communityId, community: videos.community }).from(videos).where(eq(videos.id, cm.videoId));
        allowed = !!v && (v.communityId === communityId || v.community === community.name);
      }
    }
    if (!allowed) return res.status(403).json({ error: "この通報はこのコミュニティに属していません" });

    if (report.contentType === "video") {
      await db.update(videos).set({ hidden: true } as Partial<typeof videos.$inferInsert>).where(eq(videos.id, report.contentId));
    } else if (report.contentType === "comment") {
      await db.update(videoComments).set({ hidden: true } as Partial<typeof videoComments.$inferInsert>).where(eq(videoComments.id, report.contentId));
    }
    await db.update(reports).set({ status: "hidden" } as Partial<typeof reports.$inferInsert>).where(eq(reports.id, reportId));
    res.json({ ok: true });
  });

  /** コミュニティ管理者: 通報を問題なしとしてクローズ */
  app.patch("/api/communities/:id/admin/reports/:reportId/dismiss", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });
    const communityId = paramNum(req, "id");
    const reportId = paramNum(req, "reportId");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and(eq(communityModerators.communityId, communityId), eq(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "管理人またはモデレーターのみ操作可能です" });

    const [report] = await db.select().from(reports).where(eq(reports.id, reportId));
    if (!report) return res.status(404).json({ error: "通報が見つかりません" });
    const vidSet = new Set((await db.select({ id: videos.id }).from(videos).where(eq(videos.communityId, communityId))).map((v) => v.id));
    const byName = await db.select({ id: videos.id }).from(videos).where(eq(videos.community, community.name));
    byName.forEach((v) => vidSet.add(v.id));
    let allowed = false;
    if (report.contentType === "video") allowed = vidSet.has(report.contentId);
    else if (report.contentType === "comment") {
      const [cm] = await db.select({ videoId: videoComments.videoId }).from(videoComments).where(eq(videoComments.id, report.contentId));
      if (cm) {
        const [v] = await db.select({ communityId: videos.communityId, community: videos.community }).from(videos).where(eq(videos.id, cm.videoId));
        allowed = !!v && (v.communityId === communityId || v.community === community.name);
      }
    }
    if (!allowed) return res.status(403).json({ error: "この通報はこのコミュニティに属していません" });

    await db.update(reports).set({ status: "reviewed" } as Partial<typeof reports.$inferInsert>).where(eq(reports.id, reportId));
    res.json({ ok: true });
  });

  // ── コミュニティアンケート ─────────────────────────────────────────────
  app.get("/api/communities/:id/polls", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const polls = await db
      .select()
      .from(communityPolls)
      .where(eq(communityPolls.communityId, communityId))
      .orderBy(desc(communityPolls.createdAt));
    const result = await Promise.all(
      polls.map(async (p) => {
        const opts = await db.select().from(communityPollOptions).where(eq(communityPollOptions.pollId, p.id)).orderBy(asc(communityPollOptions.order));
        const votes = await db.select().from(communityPollVotes).where(eq(communityPollVotes.pollId, p.id));
        const voteCounts = opts.map((o) => ({ optionId: o.id, text: o.text, count: votes.filter((v) => v.optionId === o.id).length }));
        let myVoteOptionId: number | null = null;
        if (user) {
          const myVote = votes.find((v) => v.userId === user.id);
          if (myVote) myVoteOptionId = myVote.optionId;
        }
        return { ...p, options: voteCounts, myVoteOptionId };
      })
    );
    res.json(result);
  });

  app.post("/api/communities/:id/polls", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const memberRows = await db
      .select()
      .from(communityMembers)
      .where(and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, user.id)));
    if (memberRows.length === 0) return res.status(403).json({ error: "コミュニティに参加してください" });
    const { question, options } = req.body as { question?: string; options?: string[] };
    if (!question || !question.trim()) return res.status(400).json({ error: "質問を入力してください" });
    if (!options || !Array.isArray(options) || options.length < 2) return res.status(400).json({ error: "選択肢を2つ以上入力してください" });
    const validOpts = options.filter((o: string) => o && String(o).trim()).slice(0, 10);
    if (validOpts.length < 2) return res.status(400).json({ error: "選択肢を2つ以上入力してください" });
    const [poll] = await db
      .insert(communityPolls)
      .values({
        communityId,
        authorUserId: user.id,
        question: question.trim(),
      } as typeof communityPolls.$inferInsert)
      .returning();
    for (let i = 0; i < validOpts.length; i++) {
      await db.insert(communityPollOptions).values({
        pollId: poll.id,
        text: validOpts[i].trim(),
        order: i,
      } as typeof communityPollOptions.$inferInsert);
    }
    res.status(201).json(poll);
  });

  app.post("/api/communities/:id/polls/:pollId/vote", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });
    const communityId = paramNum(req, "id");
    const pollId = paramNum(req, "pollId");
    const { optionId } = req.body as { optionId?: number };
    if (!optionId) return res.status(400).json({ error: "optionId を指定してください" });
    const [poll] = await db.select().from(communityPolls).where(and(eq(communityPolls.communityId, communityId), eq(communityPolls.id, pollId)));
    if (!poll) return res.status(404).json({ message: "Not found" });
    const [opt] = await db.select().from(communityPollOptions).where(and(eq(communityPollOptions.pollId, pollId), eq(communityPollOptions.id, optionId)));
    if (!opt) return res.status(404).json({ message: "選択肢が見つかりません" });
    const memberRows = await db
      .select()
      .from(communityMembers)
      .where(and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, user.id)));
    if (memberRows.length === 0) return res.status(403).json({ error: "コミュニティに参加してください" });
    const existing = await db.select().from(communityPollVotes).where(and(eq(communityPollVotes.pollId, pollId), eq(communityPollVotes.userId, user.id)));
    if (existing.length > 0) return res.status(400).json({ error: "すでに投票済みです" });
    await db.insert(communityPollVotes).values({
      pollId,
      optionId,
      userId: user.id,
    } as typeof communityPollVotes.$inferInsert);
    res.json({ ok: true });
  });

  app.get("/api/editors/:id", async (req: Request, res: Response) => {
    const id = paramNum(req, "id");
    const [editor] = await db.select().from(videoEditors).where(eq(videoEditors.id, id));
    if (!editor) return res.status(404).json({ error: "Not found" });
    res.json(editor);
  });

  app.post("/api/editors/:id/request", async (req: Request, res: Response) => {
    const editorId = paramNum(req, "id");
    const { requesterName, title, description, priceType, budget, deadline } = req.body as {
      requesterName?: string;
      title?: string;
      description?: string;
      priceType?: string;
      budget?: number;
      deadline?: string;
    };

    if (!title || !description || !priceType) {
      return res.status(400).json({ error: "必須項目を入力してください" });
    }
    if (priceType !== "per_minute" && priceType !== "revenue_share") {
      return res.status(400).json({ error: "不正な料金形式です" });
    }

    const [editor] = await db.select().from(videoEditors).where(eq(videoEditors.id, editorId));
    if (!editor) {
      return res.status(404).json({ error: "Editor not found" });
    }

    const user = await getAuthUser(req);
    const requestUserId = user ? `user-${user.id}` : "guest";
    const requestUserName = requesterName ?? user?.displayName ?? "Guest User";

    const [requestRow] = await db
      .insert(videoEditRequests)
      .values({
        editorId,
        requesterId: requestUserId,
        requesterName: requestUserName,
        title,
        description,
        priceType,
        budget: budget ?? null,
        deadline: deadline ?? null,
      } as typeof videoEditRequests.$inferInsert)
      .returning();

    // 通知テーブルに編集者向けの通知を追加（エディタIDはタイトル/本文に含める）
    await db.insert(notifications).values({
      type: "editor_request",
      title: `${requestUserName} から編集依頼`,
      body: `${title}（編集者ID: ${editorId}）`,
      amount: budget ?? null,
      avatar: editor.avatar ?? null,
      thumbnail: null,
      timeAgo: "たった今",
    } as typeof notifications.$inferInsert);

    res.status(201).json(requestRow);
  });

  app.post("/api/communities", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });

    const { name, description, bannerUrl, iconUrl, categories } = req.body as {
      name?: string;
      description?: string;
      bannerUrl?: string;
      iconUrl?: string;
      categories?: string[] | string;
    };

    const trimmedName = (name ?? "").trim();
    const trimmedDescription = (description ?? "").trim();
    const banner = (bannerUrl ?? "").trim() || "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=450&fit=crop";
    const icon = (iconUrl ?? "").trim() || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&h=160&fit=crop";

    const categoryList =
      Array.isArray(categories)
        ? categories.map((c) => String(c).trim()).filter(Boolean)
        : typeof categories === "string"
        ? categories
            .split(/[,\s]+/)
            .map((c) => c.trim())
            .filter(Boolean)
        : [];

    if (!trimmedName || !trimmedDescription || categoryList.length === 0) {
      return res.status(400).json({ error: "名前・説明・カテゴリを入力してください" });
    }

    if (trimmedDescription.length < 10) {
      return res.status(400).json({ error: "説明文は10文字以上で入力してください" });
    }

    try {
      const primaryCategory = categoryList[0];
      const [row] = await db
        .insert(communities)
        .values({
          name: trimmedName,
          members: 1,
          thumbnail: banner,
          online: false,
          category: primaryCategory,
          adminId: user.id,
          ownerId: user.id,
        } as typeof communities.$inferInsert)
        .returning();

      // 作成者を自動でメンバーに追加
      await db.insert(communityMembers).values({
        communityId: row.id,
        userId: user.id,
      } as typeof communityMembers.$inferInsert);

      res.status(201).json({
        ...row,
        description: trimmedDescription,
        bannerUrl: banner,
        iconUrl: icon,
        categories: categoryList,
      });
    } catch (e) {
      console.error("Create community error:", e);
      res.status(500).json({ error: "コミュニティの作成に失敗しました" });
    }
  });

  /** コミュニティ削除（作成者のみ） */
  app.delete("/api/communities/:id", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });

    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    if (community.ownerId !== user.id) {
      return res.status(403).json({ error: "コミュニティの削除は作成者のみ可能です" });
    }

    try {
      const threadRows = await db.select({ id: communityThreads.id }).from(communityThreads).where(eq(communityThreads.communityId, communityId));
      const threadIds = threadRows.map((t) => t.id);
      if (threadIds.length > 0) {
        await db.delete(communityThreadPosts).where(inArray(communityThreadPosts.threadId, threadIds));
      }
      await db.delete(communityThreads).where(eq(communityThreads.communityId, communityId));
      const pollRows = await db.select({ id: communityPolls.id }).from(communityPolls).where(eq(communityPolls.communityId, communityId));
      const pollIds = pollRows.map((p) => p.id);
      if (pollIds.length > 0) {
        await db.delete(communityPollVotes).where(inArray(communityPollVotes.pollId, pollIds));
        await db.delete(communityPollOptions).where(inArray(communityPollOptions.pollId, pollIds));
      }
      await db.delete(communityPolls).where(eq(communityPolls.communityId, communityId));
      await db.delete(communityVotes).where(eq(communityVotes.communityId, communityId));
      await db.delete(communityAds).where(eq(communityAds.communityId, communityId));
      await db.delete(communityModerators).where(eq(communityModerators.communityId, communityId));
      await db.delete(communityMembers).where(eq(communityMembers.communityId, communityId));
      await db.delete(jukeboxRequestCounts).where(eq(jukeboxRequestCounts.communityId, communityId));
      await db.delete(jukeboxChat).where(eq(jukeboxChat.communityId, communityId));
      await db.delete(jukeboxQueue).where(eq(jukeboxQueue.communityId, communityId));
      await db.delete(jukeboxState).where(eq(jukeboxState.communityId, communityId));
      await db.delete(videoEditors).where(eq(videoEditors.communityId, communityId));
      await db.update(videos).set({ communityId: null } as Partial<typeof videos.$inferInsert>).where(eq(videos.communityId, communityId));
      await db.delete(communities).where(eq(communities.id, communityId));
      res.json({ ok: true });
    } catch (e) {
      console.error("Community deletion error:", e);
      res.status(500).json({ error: "コミュニティの削除に失敗しました" });
    }
  });

  // ── Community Ads（広告申し込み・審査）────────────────────────────────
  const MIN_AD_AMOUNT = 10000;
  const DAILY_RATE_PER_MEMBER = 7; // コミュニティ内広告: 7円/日
  const GENRE_DAILY_RATE_PER_MEMBER = 5; // ジャンル別広告: 5円/日
  const MAX_MONTHS_AHEAD = 3;

  // 広告料金・最短日数計算API
  app.get("/api/community-ads/pricing", async (req: Request, res: Response) => {
    const cid = Number(queryStr(req, "communityId")) || 0;
    if (!cid) return res.status(400).json({ error: "communityIdが必要です" });
    const [community] = await db.select().from(communities).where(eq(communities.id, cid));
    if (!community) return res.status(404).json({ error: "コミュニティが見つかりません" });
    const memberCount = community.members;
    const dailyRate = memberCount * DAILY_RATE_PER_MEMBER;
    const minDays = dailyRate > 0 ? Math.ceil(MIN_AD_AMOUNT / dailyRate) : 0;
    res.json({
      memberCount,
      dailyRate,
      minDays,
      minAmount: MIN_AD_AMOUNT,
      ratePerMember: DAILY_RATE_PER_MEMBER,
    });
  });

  // 広告空き枠確認API
  app.get("/api/community-ads/availability", async (req: Request, res: Response) => {
    const cid = Number(queryStr(req, "communityId")) || 0;
    const start = queryStr(req, "start");
    const end = queryStr(req, "end");
    if (!cid || !start || !end) return res.status(400).json({ error: "communityId, start, endが必要です" });
    // 指定期間と重複する承認済み広告を検索
    const conflicts = await db
      .select({ id: communityAds.id, startDate: communityAds.startDate, endDate: communityAds.endDate })
      .from(communityAds)
      .where(
        and(
          eq(communityAds.communityId, cid),
          inArray(communityAds.status, ["pending", "moderator_approved", "approved"]),
          and(
            lte(communityAds.startDate, end),
            gte(communityAds.endDate, start)
          )
        )
      );
    res.json({ available: conflicts.length === 0, conflicts });
  });

  app.post("/api/community-ads", async (req: Request, res: Response) => {
    const { communityId: bodyCommunityId, companyName, contactName, email, bannerUrl, linkUrl, startDate, endDate, agreedToTerms } = req.body as {
      communityId?: number;
      companyName?: string;
      contactName?: string;
      email?: string;
      bannerUrl?: string;
      linkUrl?: string;
      startDate?: string;
      endDate?: string;
      agreedToTerms?: boolean;
    };
    const cid = Number(bodyCommunityId) || 0;
    const [community] = await db.select().from(communities).where(eq(communities.id, cid));
    if (!community) return res.status(404).json({ error: "コミュニティが見つかりません" });

    const company = (companyName ?? "").trim();
    const contact = (contactName ?? "").trim();
    const em = (email ?? "").trim();
    const banner = (bannerUrl ?? "").trim();
    const link = (linkUrl ?? "").trim();
    const start = (startDate ?? "").trim();
    const end = (endDate ?? "").trim();
    if (!company || !contact || !em || !banner || !start || !end) {
      return res.status(400).json({ error: "会社名・担当者名・メール・バナーURL・掲載期間を入力してください" });
    }
    if (!agreedToTerms) {
      return res.status(400).json({ error: "料金規約への同意が必要です" });
    }

    // 予約時点のメンバー数で料金を固定
    const memberCount = community.members;
    const dailyRate = memberCount * DAILY_RATE_PER_MEMBER;
    const startD = new Date(start);
    const endD = new Date(end);
    if (isNaN(startD.getTime()) || isNaN(endD.getTime()) || endD < startD) {
      return res.status(400).json({ error: "掲載期間の日付が不正です" });
    }
    const days = Math.ceil((endD.getTime() - startD.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    const totalAmount = days * dailyRate;
    if (totalAmount < MIN_AD_AMOUNT) {
      return res.status(400).json({ error: `最低出稿金額は${MIN_AD_AMOUNT.toLocaleString()}円以上です。日数またはメンバー数をご確認ください。` });
    }
    const maxEnd = new Date();
    maxEnd.setMonth(maxEnd.getMonth() + MAX_MONTHS_AHEAD);
    if (endD > maxEnd) {
      return res.status(400).json({ error: `掲載終了日は${MAX_MONTHS_AHEAD}ヶ月以内で指定してください` });
    }
    // 重複チェック
    const conflicts = await db
      .select({ id: communityAds.id })
      .from(communityAds)
      .where(
        and(
          eq(communityAds.communityId, cid),
          inArray(communityAds.status, ["pending", "moderator_approved", "approved"]),
          and(lte(communityAds.startDate, end), gte(communityAds.endDate, start))
        )
      );
    if (conflicts.length > 0) {
      return res.status(409).json({ error: "指定期間は既に予約済みです。別の日程を選んでください。" });
    }

    const [row] = await db
      .insert(communityAds)
      .values({
        communityId: cid,
        companyName: company,
        contactName: contact,
        email: em,
        bannerUrl: banner,
        linkUrl: link || null,
        startDate: start,
        endDate: end,
        dailyRate,
        totalAmount,
        memberCountAtBooking: memberCount,
        agreedToTerms: true,
        status: "pending",
      } as typeof communityAds.$inferInsert)
      .returning();
    res.status(201).json(row);
  });

  // 収益分配設定取得API
  app.get("/api/community-ads/revenue-settings/:communityId", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });
    const cid = paramNum(req, "communityId");
    const [community] = await db.select().from(communities).where(eq(communities.id, cid));
    if (!community) return res.status(404).json({ error: "コミュニティが見つかりません" });
    if (community.adminId !== user.id) return res.status(403).json({ error: "管理人のみ設定できます" });
    // モデレーター一覧と分配比率を返す
    const mods = await db
      .select({ userId: communityModerators.userId, displayName: users.displayName, profileImageUrl: users.profileImageUrl })
      .from(communityModerators)
      .leftJoin(users, eq(communityModerators.userId, users.id))
      .where(eq(communityModerators.communityId, cid));
    let distribution: Record<string, number> = {};
    const rawDist = (community as any).revenueDistribution;
    if (rawDist) {
      try { distribution = JSON.parse(rawDist); } catch {}
    }
    // デフォルト: 全モデレーターに均等分配
    if (Object.keys(distribution).length === 0 && mods.length > 0) {
      const share = Math.floor(100 / mods.length);
      mods.forEach((m, i) => {
        distribution[String(m.userId)] = i === mods.length - 1 ? 100 - share * (mods.length - 1) : share;
      });
    }
    res.json({
      moderators: mods,
      distribution,
      // 収益分配内訳: イベント基金10% / 管理人+モデレーター70% / プラットフォーム20%
      revenueStructure: { eventFund: 10, adminAndMods: 70, platform: 20 },
    });
  });

  // 収益分配設定更新API
  app.patch("/api/community-ads/revenue-settings/:communityId", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });
    const cid = paramNum(req, "communityId");
    const [community] = await db.select().from(communities).where(eq(communities.id, cid));
    if (!community) return res.status(404).json({ error: "コミュニティが見つかりません" });
    if (community.adminId !== user.id) return res.status(403).json({ error: "管理人のみ設定できます" });
    const { distribution } = req.body as { distribution?: Record<string, number> };
    if (!distribution || typeof distribution !== "object") {
      return res.status(400).json({ error: "distributionオブジェクトが必要です" });
    }
    // 合計100%検証
    const total = Object.values(distribution).reduce((s, v) => s + Number(v), 0);
    if (Math.abs(total - 100) > 1) {
      return res.status(400).json({ error: `分配比率の合計は100%にしてください（現在: ${total}%）` });
    }
    await db.update(communities)
      .set({ revenueDistribution: JSON.stringify(distribution) } as Partial<typeof communities.$inferInsert>)
      .where(eq(communities.id, cid));
    res.json({ ok: true });
  });

  // ジャンル管理人自動就任バッチAPI（毎月実行想定・手動トリガーも可）
  app.post("/api/genre-owners/assign", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "管理者のみ実行できます" });
    // 全ジャンルを取得し、各ジャンル内最大メンバー数コミュニティの管理人を就任させる
    const allCommunities = await db
      .select({ id: communities.id, category: communities.category, members: communities.members, adminId: communities.adminId })
      .from(communities)
      .where(sql`${communities.adminId} IS NOT NULL`);
    // ジャンル別にグループ化
    const byGenre = new Map<string, typeof allCommunities[0]>();
    for (const c of allCommunities) {
      const existing = byGenre.get(c.category);
      if (!existing || c.members > existing.members) {
        byGenre.set(c.category, c);
      }
    }
    const results: { genreId: string; ownerUserId: number; communityId: number }[] = [];
    for (const [genreId, topCommunity] of byGenre.entries()) {
      if (!topCommunity.adminId) continue;
      const existing = await db.select().from(genreOwners).where(eq(genreOwners.genreId, genreId));
      if (existing.length > 0) {
        await db.update(genreOwners)
          .set({ ownerUserId: topCommunity.adminId, assignedCommunityId: topCommunity.id, updatedAt: new Date() } as Partial<typeof genreOwners.$inferInsert>)
          .where(eq(genreOwners.genreId, genreId));
      } else {
        await db.insert(genreOwners).values({
          genreId,
          ownerUserId: topCommunity.adminId,
          assignedCommunityId: topCommunity.id,
        } as typeof genreOwners.$inferInsert);
      }
      results.push({ genreId, ownerUserId: topCommunity.adminId, communityId: topCommunity.id });
    }
    res.json({ ok: true, assigned: results });
  });

    app.get("/api/community-ads/review", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });

    const ownedRows = await db.select({ id: communities.id }).from(communities).where(eq(communities.adminId, user.id));
    const modRows = await db
      .select({ communityId: communityModerators.communityId })
      .from(communityModerators)
      .where(eq(communityModerators.userId, user.id));
    const communityIds = new Set<number>();
    ownedRows.forEach((r) => communityIds.add(r.id));
    modRows.forEach((r) => communityIds.add(r.communityId));

    if (communityIds.size === 0) {
      return res.json([]);
    }
    const ids = Array.from(communityIds);
    const ads = await db
      .select()
      .from(communityAds)
      .where(and(inArray(communityAds.communityId, ids), inArray(communityAds.status, ["pending", "moderator_approved"])))
      .orderBy(desc(communityAds.createdAt));
    const commList = await db.select({ id: communities.id, name: communities.name, adminId: communities.adminId }).from(communities).where(inArray(communities.id, ids));
    const commMap = new Map(commList.map((c) => [c.id, c]));
    const result = ads.map((ad) => ({
      ...ad,
      communityName: commMap.get(ad.communityId)?.name ?? "",
      isOwner: commMap.get(ad.communityId)?.adminId === user.id,
    }));
    res.json(result);
  });

  app.patch("/api/community-ads/:id/moderator-approve", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });
    const id = paramNum(req, "id");
    const [ad] = await db.select().from(communityAds).where(eq(communityAds.id, id));
    if (!ad) return res.status(404).json({ error: "申し込みが見つかりません" });
    if (ad.status !== "pending") return res.status(400).json({ error: "この申し込みは既に処理済みです" });
    const [mod] = await db
      .select()
      .from(communityModerators)
      .where(and(eq(communityModerators.communityId, ad.communityId), eq(communityModerators.userId, user.id)));
    if (!mod) return res.status(403).json({ error: "このコミュニティのモデレーターのみ承認できます" });
    await db.update(communityAds).set({ status: "moderator_approved", approvedByModerator: user.id } as Partial<typeof communityAds.$inferInsert>).where(eq(communityAds.id, id));
    res.json({ ok: true });
  });

  app.patch("/api/community-ads/:id/approve", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });
    const id = paramNum(req, "id");
    const [ad] = await db.select().from(communityAds).where(eq(communityAds.id, id));
    if (!ad) return res.status(404).json({ error: "申し込みが見つかりません" });
    if (ad.status !== "moderator_approved") return res.status(400).json({ error: "モデレーター承認後に管理人が承認できます" });
    const [community] = await db.select().from(communities).where(eq(communities.id, ad.communityId));
    if (!community || community.adminId !== user.id) return res.status(403).json({ error: "管理人のみ最終承認できます" });
    await db.update(communityAds).set({ status: "approved", approvedByOwner: user.id } as Partial<typeof communityAds.$inferInsert>).where(eq(communityAds.id, id));
    res.json({ ok: true });
  });

  app.patch("/api/community-ads/:id/reject", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });
    const id = paramNum(req, "id");
    const [ad] = await db.select().from(communityAds).where(eq(communityAds.id, id));
    if (!ad) return res.status(404).json({ error: "申し込みが見つかりません" });
    if (ad.status === "approved" || ad.status === "rejected") return res.status(400).json({ error: "既に処理済みです" });
    const [community] = await db.select().from(communities).where(eq(communities.id, ad.communityId));
    const [mod] = await db
      .select()
      .from(communityModerators)
      .where(and(eq(communityModerators.communityId, ad.communityId), eq(communityModerators.userId, user.id)));
    const isOwner = community?.adminId === user.id;
    const isMod = !!mod;
    if (!isOwner && !isMod) return res.status(403).json({ error: "管理人またはモデレーターのみ却下できます" });
    await db.update(communityAds).set({ status: "rejected" } as Partial<typeof communityAds.$inferInsert>).where(eq(communityAds.id, id));
    res.json({ ok: true });
  });

  // ── Reports（通報・Claude API判定）────────────────────────────────────
  const REPORT_REASONS = ["spam", "harassment", "inappropriate", "other"] as const;

  app.post("/api/reports", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });

    const { contentType, contentId, reason } = req.body as {
      contentType?: string;
      contentId?: number;
      reason?: string;
    };
    const cid = Number(contentId) || 0;
    const type = contentType === "comment" ? "comment" : contentType === "video" ? "video" : null;
    if (!type || !cid || !reason || !REPORT_REASONS.includes(reason as any)) {
      return res.status(400).json({ error: "contentType(video/comment), contentId, reason(spam/harassment/inappropriate/other)を指定してください" });
    }

    let contentText: string;
    if (type === "video") {
      const [video] = await db.select().from(videos).where(eq(videos.id, cid));
      if (!video) return res.status(404).json({ error: "対象が見つかりません" });
      contentText = video.title ?? "";
    } else {
      const [comment] = await db.select().from(videoComments).where(eq(videoComments.id, cid));
      if (!comment) return res.status(404).json({ error: "対象が見つかりません" });
      contentText = comment.text ?? "";
    }

    const { verdict, reason: aiReason } = await judgeReportContent(contentText, reason);

    const [report] = await db
      .insert(reports)
      .values({
        reporterId: user.id,
        contentType: type,
        contentId: cid,
        reason,
        aiVerdict: verdict,
        aiReason: aiReason ?? "",
        status: verdict === "clear_violation" ? "hidden" : verdict === "gray_zone" ? "pending" : "reviewed",
      } as typeof reports.$inferInsert)
      .returning();

    if (verdict === "clear_violation") {
      if (type === "video") {
        await db.update(videos).set({ hidden: true } as Partial<typeof videos.$inferInsert>).where(eq(videos.id, cid));
      } else {
        await db.update(videoComments).set({ hidden: true } as Partial<typeof videoComments.$inferInsert>).where(eq(videoComments.id, cid));
      }
    }

    res.status(201).json(report);
  });

  // ── Concerts（公演）──────────────────────────────────────────────────

  app.post("/api/concerts", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });

    const {
      title,
      venueName,
      venueAddress,
      concertDate,
      ticketUrl,
      shootingAllowed,
      shootingNotes,
      artistShare,
      photographerShare,
      editorShare,
      venueShare,
      status,
    } = req.body as {
      title?: string;
      venueName?: string;
      venueAddress?: string;
      concertDate?: string;
      ticketUrl?: string;
      shootingAllowed?: boolean;
      shootingNotes?: string;
      artistShare?: number;
      photographerShare?: number;
      editorShare?: number;
      venueShare?: number;
      status?: "draft" | "published";
    };

    if (!title || !venueName || !venueAddress || !concertDate) {
      return res.status(400).json({ error: "必須項目が不足しています" });
    }

    const shares = [
      Number(artistShare ?? 0),
      Number(photographerShare ?? 0),
      Number(editorShare ?? 0),
      Number(venueShare ?? 0),
    ];
    if (shares.some((s) => s < 0)) {
      return res.status(400).json({ error: "分配比率は0以上で指定してください" });
    }
    const sum = shares.reduce((a, b) => a + b, 0);
    if (sum !== 100) {
      return res.status(400).json({ error: "分配比率の合計は100%にしてください" });
    }

    const [row] = await db
      .insert(concerts)
      .values({
        artistUserId: user.id,
        title,
        venueName,
        venueAddress,
        concertDate,
        ticketUrl: ticketUrl ?? null,
        shootingAllowed: shootingAllowed ?? false,
        shootingNotes: shootingNotes ?? null,
        artistShare: shares[0],
        photographerShare: shares[1],
        editorShare: shares[2],
        venueShare: shares[3],
        status: status ?? "draft",
      } as typeof concerts.$inferInsert)
      .returning();

    res.status(201).json(row);
  });

  app.get("/api/concerts", async (_req: Request, res: Response) => {
    const rows = await db
      .select()
      .from(concerts)
      .where(eq(concerts.status, "published"))
      .orderBy(desc(concerts.concertDate), desc(concerts.createdAt));
    res.json(rows);
  });

  app.get("/api/concerts/:id", async (req: Request, res: Response) => {
    const id = paramNum(req, "id");
    const [row] = await db.select().from(concerts).where(eq(concerts.id, id));
    if (!row) return res.status(404).json({ error: "公演が見つかりません" });
    res.json(row);
  });

  app.post("/api/concerts/:id/staff-request", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });

    const concertId = paramNum(req, "id");
    const [concert] = await db.select().from(concerts).where(eq(concerts.id, concertId));
    if (!concert) return res.status(404).json({ error: "公演が見つかりません" });

    // 既に申請済みかチェック
    const existing = await db
      .select()
      .from(concertStaff)
      .where(and(eq(concertStaff.concertId, concertId), eq(concertStaff.staffUserId, user.id)));
    if (existing.length > 0) {
      return res.status(400).json({ error: "すでに申請済みです" });
    }

    const [row] = await db
      .insert(concertStaff)
      .values({
        concertId,
        artistUserId: concert.artistUserId,
        staffUserId: user.id,
        status: "pending",
      } as typeof concertStaff.$inferInsert)
      .returning();

    res.status(201).json(row);
  });

  app.get("/api/concerts/:id/staff-requests", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });

    const concertId = paramNum(req, "id");
    const [concert] = await db.select().from(concerts).where(eq(concerts.id, concertId));
    if (!concert) return res.status(404).json({ error: "公演が見つかりません" });
    if (concert.artistUserId !== user.id) {
      return res.status(403).json({ error: "アーティストのみ申請一覧を閲覧できます" });
    }

    const rows = await db
      .select()
      .from(concertStaff)
      .where(eq(concertStaff.concertId, concertId))
      .orderBy(desc(concertStaff.createdAt));
    res.json(rows);
  });

  // 互換用: /staff-req パスでも同じ一覧を返す
  app.get("/api/concerts/:id/staff-req", async (req: Request, res: Response) => {
    return app._router.handle(
      { ...req, url: `/api/concerts/${paramNum(req, "id")}/staff-requests`, params: req.params } as any,
      res,
      () => {},
    );
  });

  app.patch("/api/concerts/:id/staff/:staffId/approve", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });

    const concertId = paramNum(req, "id");
    const staffId = paramNum(req, "staffId");

    const [concert] = await db.select().from(concerts).where(eq(concerts.id, concertId));
    if (!concert) return res.status(404).json({ error: "公演が見つかりません" });
    if (concert.artistUserId !== user.id) {
      return res.status(403).json({ error: "アーティストのみ承認できます" });
    }

    const [staff] = await db
      .select()
      .from(concertStaff)
      .where(and(eq(concertStaff.id, staffId), eq(concertStaff.concertId, concertId)));
    if (!staff) return res.status(404).json({ error: "申請が見つかりません" });

    const [updated] = await db
      .update(concertStaff)
      .set({ status: "approved" } as Partial<typeof concertStaff.$inferInsert>)
      .where(eq(concertStaff.id, staffId))
      .returning();

    res.json(updated);
  });

  app.patch("/api/concerts/:id/staff/:staffId/reject", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });

    const concertId = paramNum(req, "id");
    const staffId = paramNum(req, "staffId");

    const [concert] = await db.select().from(concerts).where(eq(concerts.id, concertId));
    if (!concert) return res.status(404).json({ error: "公演が見つかりません" });
    if (concert.artistUserId !== user.id) {
      return res.status(403).json({ error: "アーティストのみ却下できます" });
    }

    const [staff] = await db
      .select()
      .from(concertStaff)
      .where(and(eq(concertStaff.id, staffId), eq(concertStaff.concertId, concertId)));
    if (!staff) return res.status(404).json({ error: "申請が見つかりません" });

    const [updated] = await db
      .update(concertStaff)
      .set({ status: "rejected" } as Partial<typeof concertStaff.$inferInsert>)
      .where(eq(concertStaff.id, staffId))
      .returning();

    res.json(updated);
  });

  // ── Genre Ads（ジャンルページ広告）───────────────────────────────────────
  const GENRE_MIN_AMOUNT = 10_000;
  const GENRE_MAX_MONTHS_AHEAD = 3;

  app.post("/api/genre-ads", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });

    const { genreId, companyName, contactName, email, bannerUrl, startDate, endDate } = req.body as {
      genreId?: string;
      companyName?: string;
      contactName?: string;
      email?: string;
      bannerUrl?: string;
      startDate?: string;
      endDate?: string;
    };

    const gid = (genreId ?? "").trim();
    if (!gid || !GENRE_TO_CATEGORY[gid]) {
      return res.status(400).json({ error: "genreId が不正です" });
    }
    if (!companyName || !contactName || !email || !bannerUrl || !startDate || !endDate) {
      return res.status(400).json({ error: "必須項目が不足しています" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ error: "日付の形式が不正です（YYYY-MM-DD）" });
    }
    if (end < start) {
      return res.status(400).json({ error: "終了日は開始日以降にしてください" });
    }
    const now = new Date();
    const maxEnd = new Date(now);
    maxEnd.setMonth(maxEnd.getMonth() + GENRE_MAX_MONTHS_AHEAD);
    if (end > maxEnd) {
      return res.status(400).json({ error: `掲載終了日は${GENRE_MAX_MONTHS_AHEAD}ヶ月以内で指定してください` });
    }

    const cats = GENRE_TO_CATEGORY[gid];
    const communityRows = await db
      .select({ members: communities.members })
      .from(communities)
      .where(
        or(
          ...cats.map((c) =>
            sql`${communities.category} ILIKE ${"%" + c + "%"}`
          )
        )
      );
    const totalMembers = communityRows.reduce((sum, r) => sum + (r.members ?? 0), 0);
    const dailyRate = totalMembers * GENRE_DAILY_RATE_PER_MEMBER;

    const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    const totalAmount = dailyRate * days;

    if (totalAmount < GENRE_MIN_AMOUNT) {
      return res.status(400).json({ error: `最低出稿金額は${GENRE_MIN_AMOUNT.toLocaleString()}円以上です` });
    }

    const [row] = await db
      .insert(genreAds)
      .values({
        genreId: gid,
        companyName,
        contactName,
        email,
        bannerUrl,
        startDate,
        endDate,
        dailyRate,
        totalAmount,
      } as typeof genreAds.$inferInsert)
      .returning();

    res.status(201).json(row);
  });

  /** ジャンル管理人向け: 自分が担当するジャンルの審査待ち一覧 */
  app.get("/api/genre-ads/review", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });

    const ownerRows = await db.select().from(genreOwners).where(eq(genreOwners.ownerUserId, user.id));
    if (ownerRows.length === 0) return res.json([]);

    const genreIds = ownerRows.map((o) => o.genreId);
    const rows = await db
      .select()
      .from(genreAds)
      .where(and(inArray(genreAds.genreId, genreIds), eq(genreAds.status, "pending")))
      .orderBy(desc(genreAds.createdAt));

    res.json(rows);
  });

  app.patch("/api/genre-ads/:id/approve", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });
    const id = paramNum(req, "id");

    const [ad] = await db.select().from(genreAds).where(eq(genreAds.id, id));
    if (!ad) return res.status(404).json({ error: "申し込みが見つかりません" });

    const [owner] = await db.select().from(genreOwners).where(and(eq(genreOwners.genreId, ad.genreId), eq(genreOwners.ownerUserId, user.id)));
    if (!owner) return res.status(403).json({ error: "このジャンルの管理人ではありません" });

    await db.update(genreAds).set({ status: "approved" } as Partial<typeof genreAds.$inferInsert>).where(eq(genreAds.id, id));
    res.json({ ok: true });
  });

  app.patch("/api/genre-ads/:id/reject", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });
    const id = paramNum(req, "id");

    const [ad] = await db.select().from(genreAds).where(eq(genreAds.id, id));
    if (!ad) return res.status(404).json({ error: "申し込みが見つかりません" });

    const [owner] = await db.select().from(genreOwners).where(and(eq(genreOwners.genreId, ad.genreId), eq(genreOwners.ownerUserId, user.id)));
    if (!owner) return res.status(403).json({ error: "このジャンルの管理人ではありません" });

    await db.update(genreAds).set({ status: "rejected" } as Partial<typeof genreAds.$inferInsert>).where(eq(genreAds.id, id));
    res.json({ ok: true });
  });

  /** 月次バッチ: 各ジャンルの最大メンバー数コミュニティ管理人を genre_owners に反映 */
  app.post("/api/cron/update-genre-owners", async (_req: Request, res: Response) => {
    for (const [gid, cats] of Object.entries(GENRE_TO_CATEGORY)) {
      const rows = await db
        .select({ id: communities.id, members: communities.members, adminId: communities.adminId })
        .from(communities)
        .where(
          or(
            ...cats.map((c) =>
              sql`${communities.category} ILIKE ${"%" + c + "%"}`
            )
          )
        )
        .orderBy(desc(communities.members))
        .limit(1);

      const top = rows[0];
      if (!top || !top.adminId) continue;

      const existing = await db.select().from(genreOwners).where(eq(genreOwners.genreId, gid)).limit(1);
      if (existing.length > 0) {
        await db.update(genreOwners).set({ ownerUserId: top.adminId, updatedAt: sql`now()` } as any).where(eq(genreOwners.genreId, gid));
      } else {
        await db.insert(genreOwners).values({ genreId: gid, ownerUserId: top.adminId } as typeof genreOwners.$inferInsert);
      }
    }

    res.json({ ok: true });
  });

  /** Admin: report queue — pending (gray_zone) items only. Pass ?all=1 to see everything. */
  app.get("/api/admin/reports", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

    const showAll = req.query.all === "1";
    const rows = await db
      .select()
      .from(reports)
      .where(showAll ? undefined : eq(reports.status as any, "pending"))
      .orderBy(desc(reports.createdAt));

    res.json(rows);
  });

  /** 管理者向け: 通報されたコンテンツを非表示にする（動画 or コメント） */
  app.patch("/api/admin/reports/:id/hide", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });
    if (user.role !== "ADMIN") return res.status(403).json({ error: "管理者のみ操作可能です" });

    const id = paramNum(req, "id");
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    if (!report) return res.status(404).json({ error: "通報が見つかりません" });

    if (report.contentType === "video") {
      await db.update(videos).set({ hidden: true } as Partial<typeof videos.$inferInsert>).where(eq(videos.id, report.contentId));
    } else if (report.contentType === "comment") {
      await db.update(videoComments).set({ hidden: true } as Partial<typeof videoComments.$inferInsert>).where(eq(videoComments.id, report.contentId));
    }

    await db.update(reports).set({ status: "hidden" } as Partial<typeof reports.$inferInsert>).where(eq(reports.id, id));
    res.json({ ok: true });
  });

  /** 管理者向け: 問題なしとしてクローズ（ステータスを reviewed に） */
  app.patch("/api/admin/reports/:id/dismiss", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });
    if (user.role !== "ADMIN") return res.status(403).json({ error: "管理者のみ操作可能です" });

    const id = paramNum(req, "id");
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    if (!report) return res.status(404).json({ error: "通報が見つかりません" });

    await db.update(reports).set({ status: "reviewed" } as Partial<typeof reports.$inferInsert>).where(eq(reports.id, id));
    res.json({ ok: true });
  });

  // ── Upload signed URL (Cloudflare R2) ────────────────────────────
  app.post("/api/upload-url", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });

    const { fileName, contentType } = req.body as {
      fileName?: string;
      contentType?: string;
    };

    if (!fileName || !contentType) {
      return res.status(400).json({ error: "fileName と contentType は必須です" });
    }

    const safeName = String(fileName).replace(/[^a-zA-Z0-9_.-]/g, "_");
    const key = `rawstock_${Date.now()}_${safeName}`;

    try {
      const { uploadUrl, publicUrl } = await createSignedUploadUrl(key, contentType);
      res.json({ uploadUrl, key, url: publicUrl });
    } catch (e) {
      console.error("Create signed upload URL error:", e);
      res.status(500).json({ error: "署名付きURLの発行に失敗しました" });
    }
  });

  // ── Videos ───────────────────────────────────────────────────────
  app.get("/api/videos", async (req: Request, res: Response) => {
    const genreId = (req as any).query?.genre;
    const communityIdParam = (req as any).query?.communityId;
    let rows = await db
      .select()
      .from(videos)
      .where(and(eq(videos.isRanked, false), eq(videos.hidden, false)))
      .orderBy(desc(videos.createdAt));
    // visibility=community の投稿のみ一覧に表示（既存データは visibility 未設定時も表示）
    rows = rows.filter((r) => (r as any).visibility !== "draft" && (r as any).visibility !== "my_page_only");
    const names = Array.from(new Set(rows.map((r) => r.creator)));
    const userMap = new Map<string, number>();
    const creatorMap = new Map<string, number>();
    if (names.length > 0) {
      const userRows = await db.select({ id: users.id, displayName: users.displayName }).from(users).where(inArray(users.displayName, names));
      userRows.forEach((u) => userMap.set(u.displayName, u.id));
      const notFoundUsers = names.filter((n) => !userMap.has(n));
      if (notFoundUsers.length > 0) {
        const creatorRows = await db.select({ id: creators.id, name: creators.name }).from(creators).where(inArray(creators.name, notFoundUsers));
        creatorRows.forEach((c) => creatorMap.set(c.name, c.id));
      }
    }
    const withCreator = rows.map((r) => {
      const uid = userMap.get(r.creator);
      const cid = creatorMap.get(r.creator);
      return { ...r, creatorType: uid ? "user" : cid ? "liver" : null, creatorId: uid ?? cid ?? null };
    });
    res.json(withCreator);
  });

  app.get("/api/videos/my", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });
    const rows = await db
      .select()
      .from(videos)
      .where(or(eq(videos.creator, user.displayName), eq(videos.userId, user.id)))
      .orderBy(desc(videos.createdAt));
    const filtered = rows.filter((r) => !r.hidden);
    res.json(filtered);
  });

  app.get("/api/videos/ranked", async (_req: Request, res: Response) => {
    const rows = await db
      .select()
      .from(videos)
      .where(and(eq(videos.postType, "work"), eq(videos.hidden, false)))
      .orderBy(asc(videos.rank));
    res.json(rows);
  });

  /** マイリスト: 保存済み動画一覧（:id より前に定義すること） */
  app.get("/api/videos/saved", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });

    const rows = await db
      .select({
        id: videos.id,
        title: videos.title,
        thumbnail: videos.thumbnail,
        creator: videos.creator,
        community: videos.community,
        views: videos.views,
        createdAt: videos.createdAt,
      })
      .from(savedVideos)
      .innerJoin(videos, eq(videos.id, savedVideos.videoId))
      .where(and(eq(savedVideos.userId, user.id), eq(videos.hidden, false)))
      .orderBy(desc(savedVideos.createdAt));
    const timeAgoList = rows.map((r) => ({
      ...r,
      timeAgo: r.createdAt ? formatTimeAgo(r.createdAt) : "たった今",
    }));
    res.json(timeAgoList);
  });

  app.get("/api/videos/:id", async (req: Request, res: Response) => {
    const id = paramNum(req, "id");
    const authUser = await getAuthUser(req);
    const [row] = await db.select().from(videos).where(eq(videos.id, id));
    if (!row || row.hidden) return res.status(404).json({ message: "Not found" });
    const vis = (row as any).visibility;
    const isOwner = authUser && ((row as any).userId === authUser.id || row.creator === authUser.displayName);
    if (vis === "draft" && !isOwner) return res.status(404).json({ message: "Not found" });
    if (vis === "my_page_only" && !isOwner) return res.status(404).json({ message: "Not found" });
    const timeAgo = row.createdAt ? formatTimeAgo(row.createdAt) : row.timeAgo;
    const [creatorUser] = await db.select({ id: users.id }).from(users).where(eq(users.displayName, row.creator));
    const [creatorLiver] = !creatorUser ? await db.select({ id: creators.id }).from(creators).where(eq(creators.name, row.creator)) : [];
    const creatorType = creatorUser ? "user" : creatorLiver ? "liver" : null;
    const creatorId = (row as any).userId ?? creatorUser?.id ?? creatorLiver?.id ?? null;
    res.json({ ...row, timeAgo, creatorType, creatorId });
  });

  /** 動画コメント一覧（非表示コメントは除外） */
  app.get("/api/videos/:id/comments", async (req: Request, res: Response) => {
    const videoId = paramNum(req, "id");
    const rows = await db
      .select({
        id: videoComments.id,
        videoId: videoComments.videoId,
        userId: videoComments.userId,
        text: videoComments.text,
        createdAt: videoComments.createdAt,
        displayName: users.displayName,
        profileImageUrl: users.profileImageUrl,
      })
      .from(videoComments)
      .leftJoin(users, eq(users.id, videoComments.userId))
      .where(and(eq(videoComments.videoId, videoId), eq(videoComments.hidden, false)))
      .orderBy(asc(videoComments.createdAt));
    res.json(rows);
  });

  /** コメント投稿（ログイン必須） */
  app.post("/api/videos/:id/comments", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });

    const videoId = paramNum(req, "id");
    const text = (req.body as { text?: string }).text?.trim();
    if (!text) return res.status(400).json({ error: "コメント本文は必須です" });

    const [row] = await db
      .insert(videoComments)
      .values({ videoId, userId: user.id, text } as typeof videoComments.$inferInsert)
      .returning();
    res.status(201).json(row);
  });

  app.post("/api/videos", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });

    const { title, community, communityId, duration, price, thumbnail, description, concertId, visibility, videoUrl, youtubeId, postType } = req.body as {
      title?: string;
      community?: string;
      communityId?: number | null;
      duration?: string;
      price?: number | null;
      thumbnail?: string;
      description?: string | null;
      concertId?: number | null;
      visibility?: "draft" | "my_page_only" | "community";
      videoUrl?: string | null;
      youtubeId?: string | null;
      postType?: "daily" | "work";
    };

    if (!title || !duration || !thumbnail) {
      return res.status(400).json({ message: "必須フィールドが不足しています" });
    }

    const vis = visibility === "draft" ? "draft" : visibility === "my_page_only" ? "my_page_only" : "community";
    if (vis === "community" && (!community || !community.trim())) {
      return res.status(400).json({ message: "コミュニティ公開時は community を指定してください" });
    }

    const [row] = await db
      .insert(videos)
      .values({
        title,
        creator: user.displayName,
        community: community?.trim() ?? "",
        views: 0,
        timeAgo: "たった今",
        duration,
        price: price ?? null,
        thumbnail,
        description: description?.trim() || null,
        avatar:
          user.profileImageUrl ??
          user.avatar ??
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop",
        concertId: concertId ?? null,
        userId: user.id,
        visibility: vis,
        communityId: vis === "community" ? (communityId ?? null) : null,
        videoUrl: videoUrl?.trim() || null,
        youtubeId: youtubeId?.trim() || null,
        postType: postType === "work" ? "work" : "daily",
        isRanked: postType === "work",
      } as typeof videos.$inferInsert)
      .returning();
    res.status(201).json(row);
  });

  /** 自分の投稿の編集（タイトル・公開範囲） */
  app.patch("/api/videos/:id", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });

    const id = paramNum(req, "id");
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    if (!video) return res.status(404).json({ message: "Not found" });
    const isOwner = (video as any).userId === user.id || video.creator === user.displayName;
    if (!isOwner) return res.status(403).json({ error: "編集権限がありません" });

    const { title, visibility, communityId, community } = req.body as {
      title?: string;
      visibility?: "draft" | "my_page_only" | "community";
      communityId?: number | null;
      community?: string;
    };

    const updates: Record<string, unknown> = {};
    if (title !== undefined) {
      const newTitle = title?.trim();
      if (!newTitle) return res.status(400).json({ error: "タイトルは必須です" });
      updates.title = newTitle;
    }
    if (visibility !== undefined) {
      const vis = ["draft", "my_page_only", "community"].includes(visibility) ? visibility : (video as any).visibility;
      updates.visibility = vis;
      if (vis === "community" && communityId != null) updates.communityId = communityId;
      if (vis === "community" && community?.trim()) updates.community = community.trim();
      if (vis !== "community") updates.communityId = null;
    }

    if (Object.keys(updates).length === 0) return res.json(video);

    const [updated] = await db
      .update(videos)
      .set(updates as Partial<typeof videos.$inferInsert>)
      .where(eq(videos.id, id))
      .returning();
    res.json(updated);
  });

  /** 自分の投稿の削除（コメントも合わせて削除） */
  app.delete("/api/videos/:id", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });

    const id = paramNum(req, "id");
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    if (!video) return res.status(404).json({ message: "Not found" });
    const isOwner = (video as any).userId === user.id || video.creator === user.displayName;
    if (!isOwner) return res.status(403).json({ error: "削除権限がありません" });

    await db.delete(videoComments).where(eq(videoComments.videoId, id));
    await db.delete(videos).where(eq(videos.id, id));
    res.json({ ok: true });
  });

  /** マイリスト: 動画を保存 */
  app.post("/api/videos/:id/save", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });

    const videoId = paramNum(req, "id");
    const [video] = await db.select().from(videos).where(eq(videos.id, videoId));
    if (!video || video.hidden) return res.status(404).json({ message: "Not found" });

    const vis = (video as any).visibility;
    const isOwner = (video as any).userId === user.id || video.creator === user.displayName;
    if (vis === "draft" && !isOwner) return res.status(404).json({ message: "Not found" });
    if (vis === "my_page_only" && !isOwner) return res.status(404).json({ message: "Not found" });

    try {
      await db
        .insert(savedVideos)
        .values({ userId: user.id, videoId } as typeof savedVideos.$inferInsert);
    } catch {
      // 既に保存済み（UNIQUE制約）の場合は無視
    }
    res.json({ ok: true });
  });

  /** マイリスト: 動画の保存を解除 */
  app.delete("/api/videos/:id/save", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });

    const videoId = paramNum(req, "id");
    await db
      .delete(savedVideos)
      .where(and(eq(savedVideos.userId, user.id), eq(savedVideos.videoId, videoId)));
    res.json({ ok: true });
  });

  /** 動画がマイリストに含まれるか */
  app.get("/api/videos/:id/saved", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.json({ saved: false });

    const videoId = paramNum(req, "id");
    const [row] = await db
      .select()
      .from(savedVideos)
      .where(and(eq(savedVideos.userId, user.id), eq(savedVideos.videoId, videoId)));
    res.json({ saved: !!row });
  });

  /** 公開プロフィール用: ユーザーの公開投稿一覧（my_page_only 以上） */
  app.get("/api/users/:id/posts", async (req: Request, res: Response) => {
    const userId = paramNum(req, "id");
    const [targetUser] = await db.select({ id: users.id, displayName: users.displayName }).from(users).where(eq(users.id, userId));
    if (!targetUser) return res.status(404).json({ message: "Not found" });
    const rows = await db
      .select()
      .from(videos)
      .where(
        and(
          or(eq(videos.userId, userId), eq(videos.creator, targetUser.displayName)),
          eq(videos.hidden, false)
        )
      )
      .orderBy(desc(videos.createdAt));
    const filtered = rows.filter((r) => {
      const v = (r as any).visibility;
      return v !== "draft";
    });
    res.json(filtered);
  });

  // ── Live Streams ──────────────────────────────────────────────────
  app.get("/api/live-streams", async (_req: Request, res: Response) => {
    const rows = await db
      .select()
      .from(liveStreams)
      .where(eq(liveStreams.isLive, true))
      .orderBy(desc(liveStreams.viewers));
    res.json(rows);
  });

  // ── Creators ──────────────────────────────────────────────────────
  app.get("/api/creators", async (_req: Request, res: Response) => {
    const rows = await db.select().from(creators).orderBy(asc(creators.rank));
    res.json(rows);
  });

  // ── Booking Sessions ──────────────────────────────────────────────
  app.get("/api/booking-sessions", async (req: Request, res: Response) => {
    const category = queryStr(req, "category");
    const rows = category && category !== "all"
      ? await db.select().from(bookingSessions).where(eq(bookingSessions.category, category))
      : await db.select().from(bookingSessions);
    res.json(rows);
  });

  app.post("/api/booking-sessions/:id/book", async (req: Request, res: Response) => {
    const id = paramNum(req, "id");
    const [session] = await db.select().from(bookingSessions).where(eq(bookingSessions.id, id));
    if (!session) return res.status(404).json({ message: "Not found" });
    if (session.spotsLeft <= 0) return res.status(400).json({ message: "満席です" });
    const [updated] = await db
      .update(bookingSessions)
      .set({ spotsLeft: session.spotsLeft - 1 } as Partial<typeof bookingSessions.$inferInsert>)
      .where(eq(bookingSessions.id, id))
      .returning();
    res.json(updated);
  });

  // ── DM Messages ───────────────────────────────────────────────────
  app.get("/api/dm-messages", async (_req: Request, res: Response) => {
    const rows = await db.select().from(dmMessages).orderBy(asc(dmMessages.sortOrder));
    res.json(rows);
  });

  app.post("/api/dm-messages/:id/read", async (req: Request, res: Response) => {
    const id = paramNum(req, "id");
    const [updated] = await db
      .update(dmMessages)
      .set({ unread: 0 } as Partial<typeof dmMessages.$inferInsert>)
      .where(eq(dmMessages.id, id))
      .returning();
    res.json(updated);
  });

  // ── Notifications ─────────────────────────────────────────────────
  app.get("/api/notifications/unread-count", async (_req: Request, res: Response) => {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(eq(notifications.isRead, false));
    res.json({ count: count ?? 0 });
  });

  app.get("/api/notifications", async (req: Request, res: Response) => {
    const type = queryStr(req, "type");
    const rows = type && type !== "all"
      ? await db.select().from(notifications).where(eq(notifications.type, type)).orderBy(desc(notifications.createdAt))
      : await db.select().from(notifications).orderBy(desc(notifications.createdAt));
    res.json(rows);
  });

  app.post("/api/notifications/read-all", async (_req: Request, res: Response) => {
    await db.update(notifications).set({ isRead: true } as Partial<typeof notifications.$inferInsert>);
    res.json({ ok: true });
  });

  app.post("/api/notifications/:id/read", async (req: Request, res: Response) => {
    const id = paramNum(req, "id");
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true } as Partial<typeof notifications.$inferInsert>)
      .where(eq(notifications.id, id))
      .returning();
    res.json(updated);
  });

  // ── Live Stream single + chat ─────────────────────────────────────
  app.get("/api/live-streams/:id", async (req: Request, res: Response) => {
    const id = paramNum(req, "id");
    const [stream] = await db.select().from(liveStreams).where(eq(liveStreams.id, id));
    if (!stream) return res.status(404).json({ error: "Not found" });
    res.json(stream);
  });

  app.get("/api/live-streams/:id/chat", async (req: Request, res: Response) => {
    const id = paramNum(req, "id");
    const msgs = await db.select().from(liveStreamChat)
      .where(eq(liveStreamChat.streamId, id))
      .orderBy(asc(liveStreamChat.createdAt));
    res.json(msgs);
  });

  app.post("/api/live-streams/:id/chat", async (req: Request, res: Response) => {
    const id = paramNum(req, "id");
    const { username, avatar, message, isGift, giftAmount } = req.body;
    // ギフトメッセージはモデレーション対象外（金額のみ）、通常メッセージはモデレーション実施
    if (!isGift && message) {
      const modResult = await moderateContent(message);
      if (!modResult.allowed) {
        return res.status(400).json({ error: modResult.reason ?? "不適切なコンテンツが含まれています" });
      }
    }
    const [msg] = await db.insert(liveStreamChat).values({
      streamId: id, username: username ?? "あなた", avatar, message,
      isGift: isGift ?? false, giftAmount: giftAmount ?? null,
    } as typeof liveStreamChat.$inferInsert).returning();
    res.json(msg);
  });

  // ── DM Conversations ──────────────────────────────────────────────
  app.get("/api/dm-messages/:id/conversation", async (req: Request, res: Response) => {
    const id = paramNum(req, "id");
    const msgs = await db.select().from(dmConversationMessages)
      .where(eq(dmConversationMessages.dmId, id))
      .orderBy(asc(dmConversationMessages.createdAt));
    res.json(msgs);
  });

  app.post("/api/dm-messages/:id/conversation", async (req: Request, res: Response) => {
    const id = paramNum(req, "id");
    const { text } = req.body;
    const [msg] = await db.insert(dmConversationMessages).values({
      dmId: id, sender: "me", text, isRead: true,
    } as typeof dmConversationMessages.$inferInsert).returning();
    // Update last message in dm_messages
    await db.update(dmMessages).set({ lastMessage: text, unread: 0 } as Partial<typeof dmMessages.$inferInsert>).where(eq(dmMessages.id, id));
    res.json(msg);
  });

  // ── Jukebox ───────────────────────────────────────────────────────
  app.get("/api/jukebox/:communityId", async (req: Request, res: Response) => {
    const communityId = paramNum(req, "communityId");
    const now = new Date();

    const [stateRaw] = await db
      .select()
      .from(jukeboxState)
      .where(eq(jukeboxState.communityId, communityId));

    const queue = await db
      .select()
      .from(jukeboxQueue)
      .where(and(eq(jukeboxQueue.communityId, communityId), eq(jukeboxQueue.isPlayed, false)))
      .orderBy(asc(jukeboxQueue.position));

    let state = stateRaw ?? null;
    let queueModified = false;

    // 放送室ロジック: 再生時間を過ぎていたらサーバー側で自動的に次の曲へ繰り上げる
    if (
      state &&
      state.currentVideoDurationSecs &&
      state.currentVideoDurationSecs > 0 &&
      state.startedAt
    ) {
      const elapsedSecs =
        (now.getTime() - new Date(state.startedAt as any).getTime()) / 1000;
      if (elapsedSecs >= state.currentVideoDurationSecs) {
        // 再生中の曲を isPlayed にマークしてから次を探す
        const currentItem = queue.find(
          (q) =>
            (state.currentVideoYoutubeId && (q as any).youtubeId === state.currentVideoYoutubeId) ||
            (state.currentVideoId != null && q.videoId === state.currentVideoId)
        );
        if (currentItem) {
          await db.update(jukeboxQueue).set({ isPlayed: true } as Partial<typeof jukeboxQueue.$inferInsert>).where(eq(jukeboxQueue.id, currentItem.id));
          queueModified = true;
        }
        const next = queue.find((q) => !q.isPlayed && q.id !== currentItem?.id);
        if (next) {
          // 次に再生する曲は isPlayed にしない（キュー表示で消えないようにする）
          queueModified = true;

          const watchers = Math.floor(Math.random() * 80) + 20;
          const [updated] = await db
            .insert(jukeboxState)
            .values({
              communityId,
              currentVideoId: next.videoId,
              currentVideoTitle: next.videoTitle,
              currentVideoThumbnail: next.videoThumbnail,
              currentVideoDurationSecs: next.videoDurationSecs ?? 0,
              currentVideoYoutubeId: (next as any).youtubeId ?? null,
              startedAt: now,
              isPlaying: true,
              watchersCount: watchers,
            } as typeof jukeboxState.$inferInsert)
            .onConflictDoUpdate({
              target: jukeboxState.communityId,
              set: {
                currentVideoId: next.videoId,
                currentVideoTitle: next.videoTitle,
                currentVideoThumbnail: next.videoThumbnail,
                currentVideoDurationSecs: next.videoDurationSecs ?? 0,
                currentVideoYoutubeId: (next as any).youtubeId ?? null,
                startedAt: now,
                isPlaying: true,
                watchersCount: watchers,
              } as Partial<typeof jukeboxState.$inferInsert>,
            })
            .returning();
          state = updated;
        } else {
          // キューが空なら停止
          const [updated] = await db
            .update(jukeboxState)
            .set({
              currentVideoId: null,
              currentVideoTitle: null,
              currentVideoThumbnail: null,
              currentVideoDurationSecs: 0,
              currentVideoYoutubeId: null,
              isPlaying: false,
            } as Partial<typeof jukeboxState.$inferInsert>)
            .where(eq(jukeboxState.communityId, communityId))
            .returning();
          state = updated;
        }
      }
    }

    const queueToReturn = queueModified
      ? await db
          .select()
          .from(jukeboxQueue)
          .where(and(eq(jukeboxQueue.communityId, communityId), eq(jukeboxQueue.isPlayed, false)))
          .orderBy(asc(jukeboxQueue.position))
      : queue;

    const chat = await db
      .select()
      .from(jukeboxChat)
      .where(eq(jukeboxChat.communityId, communityId))
      .orderBy(desc(jukeboxChat.createdAt))
      .limit(30)
      .then((rows) => rows.reverse());

    // ラジオ的に「今何秒目か」を返す
    let elapsedSecs = 0;
    if (state?.startedAt && (state.currentVideoDurationSecs ?? 0) > 0) {
      elapsedSecs = Math.max(
        0,
        Math.min(
          state.currentVideoDurationSecs ?? 0,
          (now.getTime() - new Date(state.startedAt as any).getTime()) / 1000
        )
      );
    }

    // youtubeId がなくても UI 用に state を返す（サムネ・タイトル表示のため）
    const effectiveState =
      state && state.isPlaying && (state.currentVideoTitle || state.currentVideoYoutubeId)
        ? state
        : null;

    res.json({
      state: effectiveState
        ? {
            ...effectiveState,
            elapsedSecs,
          }
        : null,
      queue: queueToReturn,
      chat,
    });
  });

  // ── Jukebox SSE ストリーム ────────────────────────────────────────────
  // In-memory event bus for real-time SSE with initial snapshot from PostgreSQL
  app.get("/api/jukebox/:communityId/stream", async (req: Request, res: Response) => {
    const communityId = paramNum(req, "communityId");

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    res.write("event: ping\ndata: {}\n\n");

    try {
      const [currentState] = await db.select().from(jukeboxState).where(eq(jukeboxState.communityId, communityId));
      if (currentState) {
        const elapsed = currentState.isPlaying && currentState.startedAt
          ? (Date.now() - new Date(currentState.startedAt).getTime()) / 1000
          : 0;
        const stateData = { ...currentState, elapsedSecs: Math.max(0, elapsed) };
        res.write(`event: state_update\ndata: ${JSON.stringify({ type: "state_update", data: stateData, ts: Date.now() })}\n\n`);
      }

      const currentQueue = await db.select().from(jukeboxQueue)
        .where(and(eq(jukeboxQueue.communityId, communityId), eq(jukeboxQueue.isPlayed, false)))
        .orderBy(asc(jukeboxQueue.position));
      res.write(`event: queue_update\ndata: ${JSON.stringify({ type: "queue_update", data: currentQueue, ts: Date.now() })}\n\n`);
    } catch (e) {
      console.error("[SSE] initial snapshot error:", e);
    }

    const unsubscribe = subscribeJukeboxEvents(communityId, (event) => {
      try {
        const eventType = event.type ?? "message";
        const data = JSON.stringify(event);
        res.write(`event: ${eventType}\ndata: ${data}\n\n`);
      } catch {}
    });

    const pingInterval = setInterval(() => {
      try {
        res.write("event: ping\ndata: {}\n\n");
      } catch {}
    }, 15000);

    req.on("close", () => {
      unsubscribe();
      clearInterval(pingInterval);
    });
  });

  // ── Cloudflare Stream Live Input 作成 ───────────────────────────────
  app.post("/api/stream/create", async (req: Request, res: Response) => {
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_STREAM_TOKEN) {
      return res.status(500).json({ error: "Cloudflare Stream is not configured" });
    }

    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });

    const { name } = req.body ?? {};

    try {
      const cfRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${CLOUDFLARE_STREAM_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            meta: {
              name: name || `RawStock Stream by ${user.displayName}`,
            },
          }),
        }
      );

      const json = (await cfRes.json()) as {
        success?: boolean;
        result?: {
          uid?: string;
          rtmps?: { url?: string; streamKey?: string };
          webRTC?: { url?: string };
          webRTCPlayback?: { url?: string };
        };
        errors?: unknown;
      };

      if (!cfRes.ok || !json.success || !json.result) {
        console.error("Cloudflare Stream create error:", json.errors);
        return res.status(502).json({ error: "Cloudflare Stream live input 作成に失敗しました" });
      }

      const result = json.result;
      const cfId = result.uid ?? "";
      const rtmpsUrl = result.rtmps?.url ?? "";
      const rtmpsStreamKey = result.rtmps?.streamKey ?? "";
      const webRtcPlaybackUrl =
        result.webRTCPlayback?.url ?? result.webRTC?.url ?? "";

      if (!cfId || !rtmpsUrl || !rtmpsStreamKey || !webRtcPlaybackUrl) {
        return res.status(502).json({ error: "Cloudflare Stream レスポンスが不完全です" });
      }

      const [row] = await db
        .insert(streams)
        .values({
          cfLiveInputId: cfId,
          webRtcUrl: webRtcPlaybackUrl,
          rtmpsUrl,
          rtmpsStreamKey,
          currentViewers: 0,
        } as typeof streams.$inferInsert)
        .returning();

      res.json({
        id: row.id,
        webRtc: { url: webRtcPlaybackUrl },
        rtmps: { url: rtmpsUrl, streamKey: rtmpsStreamKey },
      });
    } catch (e: any) {
      console.error("Cloudflare Stream create exception:", e);
      res.status(500).json({ error: "Cloudflare Stream API 通信でエラーが発生しました" });
    }
  });

  app.post("/api/jukebox/:communityId/add", async (req: Request, res: Response) => {
    const communityId = paramNum(req, "communityId");
    const { videoId, videoTitle, videoThumbnail, videoDurationSecs, addedBy, addedByAvatar, youtubeId } = req.body;
    const existing = await db.select().from(jukeboxQueue)
      .where(eq(jukeboxQueue.communityId, communityId))
      .orderBy(desc(jukeboxQueue.position));
    const nextPos = existing.length > 0 ? existing[0].position + 1 : 1;
    const [item] = await db.insert(jukeboxQueue).values({
      communityId,
      videoId,
      videoTitle,
      videoThumbnail,
      videoDurationSecs: videoDurationSecs ?? 0,
      youtubeId: youtubeId ?? null,
      addedBy: addedBy ?? "あなた", addedByAvatar, position: nextPos, isPlayed: false,
    } as typeof jukeboxQueue.$inferInsert).returning();

    // 未再生の曲が1つもない場合（新しいセッション）は自動で再生を開始する
    // ただし、既に再生中の曲がある場合は割り込み再生しない（キュー末尾に追加するだけ）
    const [stateRow] = await db.select().from(jukeboxState).where(eq(jukeboxState.communityId, communityId));
    const isCurrentlyPlaying = !!(stateRow?.isPlaying && (stateRow.currentVideoId != null || stateRow.currentVideoYoutubeId));
    const hasUnplayed = existing.some((q) => !q.isPlayed);
    if (!hasUnplayed && !isCurrentlyPlaying) {
      const watchers = Math.floor(Math.random() * 80) + 20;
      await db
        .insert(jukeboxState)
        .values({
          communityId,
          currentVideoId: item.videoId,
          currentVideoTitle: item.videoTitle,
          currentVideoThumbnail: item.videoThumbnail,
          currentVideoDurationSecs: item.videoDurationSecs ?? 0,
          currentVideoYoutubeId: (item as any).youtubeId ?? null,
          startedAt: new Date(),
          isPlaying: true,
          watchersCount: watchers,
        } as typeof jukeboxState.$inferInsert)
        .onConflictDoUpdate({
          target: jukeboxState.communityId,
          set: {
            currentVideoId: item.videoId,
            currentVideoTitle: item.videoTitle,
            currentVideoThumbnail: item.videoThumbnail,
            currentVideoDurationSecs: item.videoDurationSecs ?? 0,
            currentVideoYoutubeId: (item as any).youtubeId ?? null,
            startedAt: new Date(),
            isPlaying: true,
            watchersCount: watchers,
          } as Partial<typeof jukeboxState.$inferInsert>,
        });
    }

    // Redis にキュー更新イベントを publish
    const updatedQueue = await db.select().from(jukeboxQueue)
      .where(and(eq(jukeboxQueue.communityId, communityId), eq(jukeboxQueue.isPlayed, false)))
      .orderBy(asc(jukeboxQueue.position));
    await publishJukeboxEvent(communityId, {
      type: "queue_update",
      data: updatedQueue as unknown as Record<string, unknown>[],
    });
    // 自動再生が始まった場合は state_update も publish
    if (!hasUnplayed && !isCurrentlyPlaying) {
      const [newState] = await db.select().from(jukeboxState).where(eq(jukeboxState.communityId, communityId));
      if (newState) {
        await publishJukeboxEvent(communityId, {
          type: "state_update",
          data: newState as unknown as Record<string, unknown>,
        });
      }
    }

    res.json(item);
  });

  app.post("/api/jukebox/:communityId/next", async (req: Request, res: Response) => {
    const communityId = paramNum(req, "communityId");
    const [stateRaw] = await db.select().from(jukeboxState).where(eq(jukeboxState.communityId, communityId));
    const queue = await db.select().from(jukeboxQueue)
      .where(and(eq(jukeboxQueue.communityId, communityId), eq(jukeboxQueue.isPlayed, false)))
      .orderBy(asc(jukeboxQueue.position));

    // 再生中の曲を特定し isPlayed にマーク（同じ曲が「次」として選ばれるのを防ぐ）
    let currentItemId: number | null = null;
    if (stateRaw?.currentVideoId != null || stateRaw?.currentVideoYoutubeId) {
      const currentItem = queue.find(
        (q) =>
          (stateRaw.currentVideoYoutubeId && (q as any).youtubeId === stateRaw.currentVideoYoutubeId) ||
          (stateRaw.currentVideoId != null && q.videoId === stateRaw.currentVideoId)
      );
      if (currentItem) {
        currentItemId = currentItem.id;
        await db.update(jukeboxQueue).set({ isPlayed: true } as Partial<typeof jukeboxQueue.$inferInsert>).where(eq(jukeboxQueue.id, currentItem.id));
      }
    }

    const next = queue.find((q) => !q.isPlayed && q.id !== currentItemId);
    if (next) {
      // 次に再生する曲は isPlayed にしない（再生完了時にマークする）。キュー表示で消えないようにする
      const watchers = Math.floor(Math.random() * 80) + 20;
      await db
        .insert(jukeboxState)
        .values({
          communityId,
          currentVideoId: next.videoId,
          currentVideoTitle: next.videoTitle,
          currentVideoThumbnail: next.videoThumbnail,
          currentVideoDurationSecs: next.videoDurationSecs ?? 0,
          currentVideoYoutubeId: (next as any).youtubeId ?? null,
          startedAt: new Date(),
          isPlaying: true,
          watchersCount: watchers,
        } as typeof jukeboxState.$inferInsert)
        .onConflictDoUpdate({
          target: jukeboxState.communityId,
          set: {
            currentVideoId: next.videoId,
            currentVideoTitle: next.videoTitle,
            currentVideoThumbnail: next.videoThumbnail,
            currentVideoDurationSecs: next.videoDurationSecs ?? 0,
            currentVideoYoutubeId: (next as any).youtubeId ?? null,
            startedAt: new Date(),
            isPlaying: true,
            watchersCount: watchers,
          } as Partial<typeof jukeboxState.$inferInsert>,
        });
    } else {
      // 再生キューが空になった場合は再生状態をリセット
      await db
        .update(jukeboxState)
        .set({
          currentVideoId: null,
          currentVideoTitle: null,
          currentVideoThumbnail: null,
          currentVideoDurationSecs: 0,
          currentVideoYoutubeId: null,
          isPlaying: false,
        } as Partial<typeof jukeboxState.$inferInsert>)
        .where(eq(jukeboxState.communityId, communityId));
    }
    // Redis に state_update + queue_update イベントを publish
    const [latestState] = await db.select().from(jukeboxState).where(eq(jukeboxState.communityId, communityId));
    if (latestState) {
      await publishJukeboxEvent(communityId, {
        type: "state_update",
        data: latestState as unknown as Record<string, unknown>,
      });
    }
    const latestQueue = await db.select().from(jukeboxQueue)
      .where(and(eq(jukeboxQueue.communityId, communityId), eq(jukeboxQueue.isPlayed, false)))
      .orderBy(asc(jukeboxQueue.position));
    await publishJukeboxEvent(communityId, {
      type: "queue_update",
      data: latestQueue as unknown as Record<string, unknown>[],
    });

    res.json({ ok: true });
  });

  // クライアント側で getDuration() で取得した実際の動画長で currentVideoDurationSecs を更新
  // videoDurationSecs が 0 または未設定の場合にのみ呼ばれる（全クライアントからの重複更新を防ぐ）
  app.patch("/api/jukebox/:communityId/duration", async (req: Request, res: Response) => {
    const communityId = paramNum(req, "communityId");
    const { durationSecs } = req.body;
    if (!durationSecs || typeof durationSecs !== "number" || durationSecs <= 0) {
      return res.status(400).json({ error: "durationSecs は正の数値である必要があります" });
    }
    // 現在の状態を取得し、videoDurationSecs が 0 の場合のみ更新
    const [current] = await db
      .select({ currentVideoDurationSecs: jukeboxState.currentVideoDurationSecs })
      .from(jukeboxState)
      .where(eq(jukeboxState.communityId, communityId));
    if (!current) return res.status(404).json({ error: "jukebox state not found" });
    if (current.currentVideoDurationSecs && current.currentVideoDurationSecs > 0) {
      // 既に正常な値がある場合は更新不要
      return res.json({ ok: true, updated: false });
    }
    await db
      .update(jukeboxState)
      .set({ currentVideoDurationSecs: durationSecs })
      .where(eq(jukeboxState.communityId, communityId));
    res.json({ ok: true, updated: true });
  });

  app.post("/api/jukebox/:communityId/chat", async (req: Request, res: Response) => {
    const communityId = paramNum(req, "communityId");
    const { username, avatar, message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: "メッセージを入力してください" });
    // コンテンツモデレーション
    const modResult = await moderateContent(message);
    if (!modResult.allowed) {
      return res.status(400).json({ error: modResult.reason ?? "不適切なコンテンツが含まれています" });
    }
    const [msg] = await db.insert(jukeboxChat).values({
      communityId, username: username ?? "あなた", avatar, message,
    } as typeof jukeboxChat.$inferInsert).returning();

    // Redis に chat イベントを publish
    await publishJukeboxEvent(communityId, {
      type: "chat",
      data: msg as unknown as Record<string, unknown>,
    });

    res.json(msg);
  });

  // ── Jukebox: ユーザー自身のリクエスト削除 ────────────────────────────
  app.delete("/api/jukebox/:communityId/queue/:itemId", async (req: Request, res: Response) => {
    const communityId = paramNum(req, "communityId");
    const itemId = paramNum(req, "itemId");
    const addedBy = (req.query.addedBy as string) || (req.body?.addedBy as string) || null;

    const [item] = await db
      .select()
      .from(jukeboxQueue)
      .where(and(eq(jukeboxQueue.communityId, communityId), eq(jukeboxQueue.id, itemId)));

    if (!item) return res.status(404).json({ error: "Item not found" });

    // 再生中の曲は削除不可
    const [stateRow] = await db.select().from(jukeboxState).where(eq(jukeboxState.communityId, communityId));
    const isCurrentlyPlaying =
      stateRow?.isPlaying &&
      (((item as any).youtubeId && (item as any).youtubeId === stateRow.currentVideoYoutubeId) ||
       (item.videoId != null && item.videoId === stateRow.currentVideoId));
    if (isCurrentlyPlaying) {
      return res.status(400).json({ error: "Cannot remove the currently playing track" });
    }

    // 投稿者本人チェック
    if (addedBy && item.addedBy !== addedBy) {
      return res.status(403).json({ error: "You can only remove your own requests" });
    }

    await db.delete(jukeboxQueue).where(eq(jukeboxQueue.id, itemId));
    res.json({ ok: true });
  });

  // ── Twoshot Booking ───────────────────────────────────────────────────

  app.get("/api/twoshot/publishable-key", async (_req: Request, res: Response) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/twoshot/:streamId/bookings", async (req: Request, res: Response) => {
    const streamId = paramNum(req, "streamId");
    const rows = await db
      .select()
      .from(twoshotBookings)
      .where(eq(twoshotBookings.streamId, streamId))
      .orderBy(asc(twoshotBookings.queuePosition));
    res.json(rows);
  });

  app.get("/api/twoshot/:streamId/queue-count", async (req: Request, res: Response) => {
    const streamId = paramNum(req, "streamId");
    const [{ total }] = await db
      .select({ total: count() })
      .from(twoshotBookings)
      .where(sql`stream_id = ${streamId} AND status IN ('paid','waiting','notified')`);
    res.json({ count: Number(total) });
  });

  app.post("/api/twoshot/:streamId/checkout", async (req: Request, res: Response) => {
    const streamId = paramNum(req, "streamId");
    const { userName, userAvatar, price = 3000 } = req.body;

    if (!userName) return res.status(400).json({ error: "userName required" });

    try {
      const stripe = await getUncachableStripeClient();

      const [{ total }] = await db
        .select({ total: count() })
        .from(twoshotBookings)
        .where(sql`stream_id = ${streamId} AND status IN ('paid','waiting','notified')`);
      const queuePos = Number(total) + 1;

      const [stream] = await db.select().from(liveStreams).where(eq(liveStreams.id, streamId));
      const streamTitle = stream?.title ?? "ツーショット撮影";
      const creatorName = stream?.creator ?? "クリエイター";

      const baseUrl = process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
        : "http://localhost:8081";

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "jpy",
              unit_amount: price,
              product_data: {
                name: `ツーショット撮影 with ${creatorName}`,
                description: `${streamTitle} | 整理番号${queuePos}番`,
              },
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${baseUrl}/twoshot-success?session_id={CHECKOUT_SESSION_ID}&stream=${streamId}`,
        cancel_url: `${baseUrl}/live/${streamId}`,
        metadata: {
          streamId: streamId.toString(),
          userName,
          userAvatar: userAvatar ?? "",
          queuePosition: queuePos.toString(),
          price: price.toString(),
        },
      });

      const [booking] = await db
        .insert(twoshotBookings)
        .values({
          streamId,
          userName,
          userAvatar,
          stripeSessionId: session.id,
          price,
          status: "pending",
          queuePosition: queuePos,
          agreedToTerms: true,
          agreedAt: new Date(),
          refundable: false,
        } as typeof twoshotBookings.$inferInsert)
        .returning();

      res.json({ checkoutUrl: session.url, bookingId: booking.id, queuePosition: queuePos });
    } catch (e: any) {
      console.error("Stripe checkout error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/twoshot/confirm-payment", async (req: Request, res: Response) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: "sessionId required" });

    try {
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== "paid") {
        return res.status(400).json({ error: "Payment not completed" });
      }

      const [booking] = await db
        .select()
        .from(twoshotBookings)
        .where(eq(twoshotBookings.stripeSessionId, sessionId));
      if (!booking) return res.status(404).json({ error: "Booking not found" });

      await db
        .update(twoshotBookings)
        .set({
          status: "paid",
          stripePaymentIntentId: session.payment_intent as string,
        } as Partial<typeof twoshotBookings.$inferInsert>)
        .where(eq(twoshotBookings.stripeSessionId, sessionId));

      // 共通スコア集計用：REVENUE を transactions に記録（ライバー＝配信者に紐づくウォレット）
      const [stream] = await db.select().from(liveStreams).where(eq(liveStreams.id, booking.streamId));
      if (stream) {
        const [creatorUser] = await db.select().from(users).where(eq(users.displayName, stream.creator));
        if (creatorUser) {
          const walletId = await getOrCreateUserWallet(creatorUser.id);
          const [creatorRow] = await db.select().from(creators).where(eq(creators.name, stream.creator));
          await recordRevenue(walletId, creatorUser.id, creatorRow?.id ?? null, booking.price, "twoshot", String(booking.id));
        }
      }

      res.json({ ok: true, booking });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/twoshot/:bookingId/notify", async (req: Request, res: Response) => {
    const bookingId = paramNum(req, "bookingId");
    await db
      .update(twoshotBookings)
      .set({ status: "notified", notifiedAt: new Date() } as Partial<typeof twoshotBookings.$inferInsert>)
      .where(eq(twoshotBookings.id, bookingId));
    res.json({ ok: true });
  });

  app.post("/api/twoshot/:bookingId/complete", async (req: Request, res: Response) => {
    const bookingId = paramNum(req, "bookingId");
    await db
      .update(twoshotBookings)
      .set({ status: "completed", completedAt: new Date() } as Partial<typeof twoshotBookings.$inferInsert>)
      .where(eq(twoshotBookings.id, bookingId));
    res.json({ ok: true });
  });

  app.post("/api/twoshot/:bookingId/cancel", async (req: Request, res: Response) => {
    const bookingId = paramNum(req, "bookingId");
    const { reason, isSelfCancel } = req.body;
    await db
      .update(twoshotBookings)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: reason ?? "ユーザーキャンセル",
        refundable: !isSelfCancel,
      } as Partial<typeof twoshotBookings.$inferInsert>)
      .where(eq(twoshotBookings.id, bookingId));
    res.json({ ok: true });
  });

  // ── 収益記録（投げ銭・有料ライブ・個別セッション → type: REVENUE、月末ランク集計用）
  app.post("/api/revenue/record", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインが必要です" });

    const { amount, source, referenceId } = req.body as { amount?: number; source?: string; referenceId?: string };
    if (!amount || amount <= 0) return res.status(400).json({ error: "amount は正の数で指定してください" });
    const src = (source ?? "tip") as RevenueSource; // tip | paid_live | twoshot
    if (!["tip", "paid_live", "twoshot"].includes(src)) {
      return res.status(400).json({ error: "source は tip / paid_live / twoshot のいずれかを指定してください" });
    }

    const walletId = await getOrCreateUserWallet(user.id);
    const [creatorRow] = await db.select().from(creators).where(eq(creators.name, user.displayName));
    await recordRevenue(walletId, user.id, creatorRow?.id ?? null, amount, src, referenceId ?? null);
    res.status(201).json({ ok: true, amount, source: src });
  });

  // ── Revenue（ログイン必須）──────────────────────────────────────────
  app.get("/api/revenue/summary", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインが必要です" });
    const userId = `user-${user.id}`;
    const earningRows = await db.select().from(earnings).where(eq(earnings.userId, userId));
    const withdrawalRows = await db.select().from(withdrawals).where(eq(withdrawals.userId, userId));

    const totalEarned = earningRows.reduce((s, e) => s + e.netAmount, 0);
    const totalWithdrawn = withdrawalRows
      .filter((w) => w.status === "completed")
      .reduce((s, w) => s + w.amount, 0);
    const pendingWithdrawal = withdrawalRows
      .filter((w) => w.status === "pending" || w.status === "processing")
      .reduce((s, w) => s + w.amount, 0);
    const available = totalEarned - totalWithdrawn - pendingWithdrawal;

    // monthly breakdown (last 6 months)
    const now = new Date();
    const monthly: { month: string; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${d.getMonth() + 1}月`;
      const monthTotal = earningRows
        .filter((e) => {
          const ed = new Date(e.createdAt!);
          return ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth();
        })
        .reduce((s, e) => s + e.netAmount, 0);
      monthly.push({ month: label, amount: monthTotal });
    }

    res.json({ totalEarned, totalWithdrawn, pendingWithdrawal, available, monthly });
  });

  app.get("/api/revenue/earnings", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインが必要です" });
    const userId = `user-${user.id}`;
    const rows = await db
      .select()
      .from(earnings)
      .where(eq(earnings.userId, userId))
      .orderBy(desc(earnings.createdAt));
    res.json(rows);
  });

  /** 月末ランク集計用クエリの雛形（バッチの土台）。?month=YYYY-MM で指定月の REVENUE 合計ランキングを返す */
  app.get("/api/revenue/monthly-rank", async (req: Request, res: Response) => {
    const month = (req.query.month as string) ?? "";
    const match = /^(\d{4})-(\d{2})$/.exec(month);
    if (!match) {
      return res.status(400).json({ error: "month は YYYY-MM 形式で指定してください" });
    }
    const kind = queryStr(req, "kind") || "overall";
    if (queryStr(req, "refresh") === "1") {
      await runMonthlyCreatorAggregation(month);
    }
    if (kind === "overall" || kind === "paid_live") {
      const rankings = await getCreatorMonthlyRankings(month, kind === "paid_live" ? "paid_live" : "overall");
      return res.json({ month, kind, rankings });
    }
    const rankings = await getMonthlyRevenueRank(month);
    res.json({ month, kind: "revenue", rankings });
  });

  app.get("/api/revenue/withdrawals", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインが必要です" });
    const userId = `user-${user.id}`;
    const rows = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.userId, userId))
      .orderBy(desc(withdrawals.requestedAt));
    res.json(rows);
  });

  app.post("/api/revenue/withdraw", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインが必要です" });
    const userId = `user-${user.id}`;
    const { amount, bankName, bankBranch, accountType, accountNumber, accountName } = req.body;
    if (!amount || amount < 1000) {
      return res.status(400).json({ error: "最低引き出し額は¥1,000です" });
    }
    // check available balance
    const earningRows = await db.select().from(earnings).where(eq(earnings.userId, userId));
    const withdrawalRows = await db.select().from(withdrawals).where(eq(withdrawals.userId, userId));
    const totalEarned = earningRows.reduce((s, e) => s + e.netAmount, 0);
    const totalUsed = withdrawalRows
      .filter((w) => w.status !== "failed")
      .reduce((s, w) => s + w.amount, 0);
    const available = totalEarned - totalUsed;
    if (amount > available) {
      return res.status(400).json({ error: "引き出し可能残高を超えています" });
    }
    const [row] = await db
      .insert(withdrawals)
      .values({ userId, amount, bankName, bankBranch, accountType, accountNumber, accountName, status: "pending" } as typeof withdrawals.$inferInsert)
      .returning();
    res.json(row);
  });

  // ── Announcements ───────────────────────────────────────────────────
  app.get("/api/announcements", async (_req: Request, res: Response) => {
    // 現在日時が startAt〜endAt の範囲内のもののみ取得（endAt が NULL の場合は無期限）
    const rows = await db
      .select()
      .from(announcements)
      .where(
        sql`(start_at IS NULL OR start_at <= now()) AND (end_at IS NULL OR end_at >= now())`,
      )
      .orderBy(desc(announcements.isPinned), desc(announcements.createdAt));
    res.json(rows);
  });

  // ── Livers (Creators extended) ────────────────────────────────────
  app.get("/api/livers", async (req: Request, res: Response) => {
    const name = queryStr(req, "name");
    const minScore = queryStr(req, "minScore");
    const category = queryStr(req, "category");
    const date = queryStr(req, "date");
    const rankingType = queryStr(req, "rankingType") || "overall";
    const month = queryStr(req, "month") || getYearMonth();
    let rows = await db.select().from(creators).orderBy(asc(creators.rank));
    if (rankingType === "overall" || rankingType === "paid_live") {
      const scores = await db
        .select()
        .from(creatorMonthlyScores)
        .where(eq(creatorMonthlyScores.yearMonth, month));
      const rankMap = new Map<number, number>();
      scores.forEach((s) => {
        rankMap.set(
          s.creatorId,
          rankingType === "paid_live" ? (s.rankPaidLive ?? 999) : (s.rankOverall ?? 999),
        );
      });
      rows = rows
        .map((r) => ({
          ...r,
          rank: rankMap.get(r.id) ?? r.rank,
        }))
        .sort((a, b) => a.rank - b.rank);
    }
    if (name) {
      const q = name.toLowerCase();
      rows = rows.filter((r) => r.name.toLowerCase().includes(q));
    }
    if (category && category !== "all") {
      rows = rows.filter((r) => r.category === category);
    }
    if (minScore) {
      const ms = parseFloat(minScore);
      rows = rows.filter((r) => r.satisfactionScore >= ms);
    }
    if (date) {
      const avail = await db.select().from(liverAvailability).where(eq(liverAvailability.date, date));
      const availIds = new Set(avail.map((a) => a.liverId));
      rows = rows.filter((r) => availIds.has(r.id));
    }
    res.json({ rankingType, month, rows });
  });

  app.get("/api/livers/:id", async (req: Request, res: Response) => {
    const id = paramNum(req, "id");
    const [liver] = await db.select().from(creators).where(eq(creators.id, id));
    if (!liver) return res.status(404).json({ error: "Not found" });
    res.json(liver);
  });

  app.get("/api/livers/me/level-progress", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインが必要です" });
    const [creator] = await db.select().from(creators).where(eq(creators.name, user.displayName));
    if (!creator) {
      return res.status(404).json({ error: "配信者登録が必要です" });
    }
    const month = queryStr(req, "month") || getYearMonth();
    await ensureDefaultLevelThresholds();
    const [score] = await db
      .select()
      .from(creatorMonthlyScores)
      .where(and(eq(creatorMonthlyScores.creatorId, creator.id), eq(creatorMonthlyScores.yearMonth, month)));
    const tipGrossThisMonth = score?.tipGross ?? 0;
    const streamCountThisMonth = score?.streamCountMonthly ?? 0;
    const level = await syncCreatorLevelFromMonthlyProgress(creator.id, month);
    const thresholds = await db.select().from(creatorLevelThresholds).orderBy(asc(creatorLevelThresholds.level));
    const current = thresholds.find((t) => t.level === level) ?? thresholds[0];
    const next = thresholds.find((t) => t.level === level + 1) ?? current;
    const requiredTipGross = next?.requiredTipGross ?? 0;
    const requiredStreamCount = next?.requiredStreamCount ?? 0;
    const remainingTipGross = Math.max(0, requiredTipGross - tipGrossThisMonth);
    const remainingStreamCount = Math.max(0, requiredStreamCount - streamCountThisMonth);
    res.json({
      month,
      creatorId: creator.id,
      currentLevel: level,
      nextLevel: next?.level ?? level,
      tipBackRate: current?.tipBackRate ?? 0.5,
      tipGrossThisMonth,
      streamCountThisMonth,
      requiredTipGross,
      requiredStreamCount,
      remainingTipGross,
      remainingStreamCount,
    });
  });

  app.post("/api/livers/me/streams/record", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ログインが必要です" });
    const [creator] = await db.select().from(creators).where(eq(creators.name, user.displayName));
    if (!creator) return res.status(404).json({ error: "配信者登録が必要です" });
    const month = getYearMonth();
    const [score] = await db
      .select()
      .from(creatorMonthlyScores)
      .where(and(eq(creatorMonthlyScores.creatorId, creator.id), eq(creatorMonthlyScores.yearMonth, month)));
    if (score) {
      await db
        .update(creatorMonthlyScores)
        .set({
          streamCountMonthly: score.streamCountMonthly + 1,
          updatedAt: new Date(),
        } as Partial<typeof creatorMonthlyScores.$inferInsert>)
        .where(eq(creatorMonthlyScores.id, score.id));
    } else {
      await db.insert(creatorMonthlyScores).values({
        creatorId: creator.id,
        yearMonth: month,
        streamCountMonthly: 1,
      } as typeof creatorMonthlyScores.$inferInsert);
    }
    await db
      .update(creators)
      .set({ streamCount: creator.streamCount + 1 } as Partial<typeof creators.$inferInsert>)
      .where(eq(creators.id, creator.id));
    const newLevel = await syncCreatorLevelFromMonthlyProgress(creator.id, month);
    res.status(201).json({ ok: true, month, currentLevel: newLevel });
  });

  // ── Profile Roles (Creator / Twoshot Liver) ────────────────────────
  app.get("/api/profile/roles", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });

    const rows = await db.select().from(creators).where(eq(creators.name, user.displayName));
    const isEditor = rows.some((r) => r.category === "editor");
    const isTwoshot = rows.some((r) => r.category === "twoshot");

    res.json({ isEditor, isTwoshot });
  });

  app.post("/api/profile/register-role", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });

    const { role } = req.body as { role?: "editor" | "twoshot" };
    if (role !== "editor" && role !== "twoshot") {
      return res.status(400).json({ error: "role は editor か twoshot を指定してください" });
    }

    const category = role === "editor" ? "editor" : "twoshot";
    const communityLabel = role === "editor" ? "動画編集クリエイター" : "ツーショットライバー";

    const existing = await db
      .select()
      .from(creators)
      .where(
        and(
          eq(creators.name, user.displayName),
          eq(creators.category, category),
        ),
      );
    if (existing.length > 0) {
      return res.json({ ok: true, alreadyRegistered: true });
    }

    const avatar =
      user.avatar ??
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop";

    const [created] = await db
      .insert(creators)
      .values({
        name: user.displayName,
        community: communityLabel,
        avatar,
        rank: 999,
        heatScore: 0,
        totalViews: 0,
        revenue: 0,
        streamCount: 0,
        followers: 0,
        revenueShare: 80,
        satisfactionScore: 5,
        attendanceRate: 5,
        bio: user.bio ?? "",
        category,
      } as typeof creators.$inferInsert)
      .returning();

    res.status(201).json({ ok: true, creator: created });
  });

  // ── Liver Reviews ─────────────────────────────────────────────────
  app.get("/api/livers/:id/reviews", async (req: Request, res: Response) => {
    const id = paramNum(req, "id");
    const rows = await db.select().from(liverReviews)
      .where(eq(liverReviews.liverId, id))
      .orderBy(desc(liverReviews.createdAt));
    res.json(rows);
  });

  app.post("/api/livers/:id/reviews", async (req: Request, res: Response) => {
    const id = paramNum(req, "id");
    const { userId, userName, userAvatar, satisfactionScore, streamCountScore, attendanceScore, comment, sessionDate } = req.body;
    if (!userName || !comment) return res.status(400).json({ error: "必須項目を入力してください" });
    const overall = ((satisfactionScore ?? 5) + (streamCountScore ?? 5) + (attendanceScore ?? 5)) / 3;
    const [row] = await db.insert(liverReviews).values({
      liverId: id,
      userId: userId ?? "guest",
      userName,
      userAvatar: userAvatar ?? null,
      satisfactionScore: satisfactionScore ?? 5,
      streamCountScore: streamCountScore ?? 5,
      attendanceScore: attendanceScore ?? 5,
      overallScore: parseFloat(overall.toFixed(1)),
      comment,
      sessionDate: sessionDate ?? new Date().toISOString().slice(0, 10),
    } as typeof liverReviews.$inferInsert).returning();
    const allReviews = await db.select().from(liverReviews).where(eq(liverReviews.liverId, id));
    const avgOverall = allReviews.reduce((s, r) => s + r.overallScore, 0) / allReviews.length;
    const avgSatisfaction = allReviews.reduce((s, r) => s + r.satisfactionScore, 0) / allReviews.length;
    const avgAttendance = allReviews.reduce((s, r) => s + r.attendanceScore, 0) / allReviews.length;
    await db.update(creators).set({
      heatScore: parseFloat(avgOverall.toFixed(1)),
      satisfactionScore: parseFloat(avgSatisfaction.toFixed(1)),
      attendanceRate: parseFloat(avgAttendance.toFixed(1)),
    } as Partial<typeof creators.$inferInsert>).where(eq(creators.id, id));
    res.status(201).json(row);
  });

  // ── Liver Availability ────────────────────────────────────────────
  app.get("/api/livers/:id/availability", async (req: Request, res: Response) => {
    const id = paramNum(req, "id");
    const rows = await db.select().from(liverAvailability)
      .where(eq(liverAvailability.liverId, id))
      .orderBy(asc(liverAvailability.date), asc(liverAvailability.startTime));
    res.json(rows);
  });

  app.post("/api/livers/:id/availability", async (req: Request, res: Response) => {
    const id = paramNum(req, "id");
    const { date, startTime, endTime, maxSlots, note } = req.body;
    if (!date || !startTime || !endTime) return res.status(400).json({ error: "日付と時間を入力してください" });
    const [row] = await db.insert(liverAvailability).values({
      liverId: id,
      date,
      startTime,
      endTime,
      maxSlots: maxSlots ?? 3,
      bookedSlots: 0,
      note: note ?? "",
    } as typeof liverAvailability.$inferInsert).returning();
    res.status(201).json(row);
  });

  app.delete("/api/livers/:id/availability/:slotId", async (req: Request, res: Response) => {
    const slotId = paramNum(req, "slotId");
    await db.delete(liverAvailability).where(eq(liverAvailability.id, slotId));
    res.json({ ok: true });
  });

  // ── Seed Demo Data ────────────────────────────────────────────────
  app.post("/api/seed", async (_req: Request, res: Response) => {
    // ユーザーはLINEログインでのみ作成。メール/パスワードのシードは廃止。

    // Seed dm_messages（DM一覧用）-------------------------------------------
    const existingDm = await db.select().from(dmMessages);
    if (existingDm.length === 0) {
      await db.insert(dmMessages).values([
        { name: "桜花アリス", avatar: "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=100&h=100&fit=crop", lastMessage: "ありがとうございます！次の配信もよろしくお願いします", time: "たった今", unread: 2, online: true, sortOrder: 1 },
        { name: "エミリー先生", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop", lastMessage: "次のレッスンは3/2の19:00からです。お楽しみに！", time: "5分前", unread: 1, online: true, sortOrder: 2 },
        { name: "星空りん", avatar: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&h=100&fit=crop", lastMessage: "鑑定の結果をDMでお送りしますね", time: "12分前", unread: 0, online: false, sortOrder: 3 },
        { name: "心理士 みく", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop", lastMessage: "お気持ちを聞かせていただいてありがとうございます", time: "1時間前", unread: 0, online: true, sortOrder: 4 },
        { name: "料理家 はるか", avatar: "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=100&h=100&fit=crop", lastMessage: "レシピを送りました！ぜひ作ってみてください🍳", time: "3時間前", unread: 0, online: false, sortOrder: 5 },
        { name: "ライフコーチ けんじ", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop", lastMessage: "目標設定シートを確認しました。素晴らしい進捗です！", time: "昨日", unread: 0, online: false, sortOrder: 6 },
        { name: "ヨガ講師 なな", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop", lastMessage: "明日のクラスもお待ちしています", time: "昨日", unread: 0, online: false, sortOrder: 7 },
        { name: "地下アイドル界隈", avatar: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=100&h=100&fit=crop", lastMessage: "【お知らせ】本日21:00からライブ配信があります", time: "2日前", unread: 0, online: false, sortOrder: 8 },
      ] as unknown as typeof dmMessages.$inferInsert[]);
    }

    // Seed communities（creators の community 名と一致）------------------------
    const communityData = [
      { name: "地下アイドル界隈", category: "idol" },
      { name: "お笑い芸人界隈", category: "idol" },
      { name: "キャバ嬢・ホスト界隈", category: "idol" },
      { name: "JK日常界隈", category: "idol" },
      { name: "アイドル部", category: "idol" },
      { name: "英会話クラブ", category: "english" },
      { name: "占いサロン", category: "fortune" },
      { name: "フィットネス部", category: "coaching" },
      { name: "カウンセリングルーム", category: "counselor" },
      { name: "料理教室", category: "cooking" },
    ];
    const existingComm = await db.select().from(communities);
    const existingCommNames = new Set(existingComm.map((c: { name: string }) => c.name));
    for (const { name, category } of communityData) {
      if (!existingCommNames.has(name)) {
        await db.insert(communities).values({
          name,
          members: 0,
          thumbnail: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=250&fit=crop",
          online: false,
          category,
        } as typeof communities.$inferInsert);
        existingCommNames.add(name);
      }
    }

    // Seed creators / livers -------------------------------------------------
    const existingCreators = await db.select().from(creators);
    if (existingCreators.length >= 10) {
      return res.json({ ok: true, message: "Already seeded" });
    }

    const existingNames = new Set(existingCreators.map((c: any) => c.name));

    const demoCreators = [
      {
        name: "星空みゆ",
        community: "地下アイドル界隈",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
        rank: 1,
        heatScore: 1090.1,
        totalViews: 185320,
        revenue: 173000,
        streamCount: 34,
        followers: 48000,
        revenueShare: 80,
        satisfactionScore: 4.5,
        attendanceRate: 4.3,
        bio: "地下アイドル界隈のトップランカー。歌とダンスで毎回視聴者を魅了する実力派ライバー。",
        category: "idol",
      },
      {
        name: "コンビ芸人「ダブルパンチ」",
        community: "お笑い芸人界隈",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
        rank: 2,
        heatScore: 923.5,
        totalViews: 172450,
        revenue: 119000,
        streamCount: 45,
        followers: 92000,
        revenueShare: 80,
        satisfactionScore: 4.2,
        attendanceRate: 4.1,
        bio: "お笑いコンビとして活動中。ライブ配信でも息の合ったトークで笑いを届けます。",
        category: "idol",
      },
      {
        name: "麗華 -REIKA-",
        community: "キャバ嬢・ホスト界隈",
        avatar: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&h=100&fit=crop",
        rank: 3,
        heatScore: 1414,
        totalViews: 164800,
        revenue: 165000,
        streamCount: 52,
        followers: 67000,
        revenueShare: 80,
        satisfactionScore: 4.6,
        attendanceRate: 4.8,
        bio: "キャバ嬢×ライバーとして大人気。トーク力と美貌で多くのファンを獲得。",
        category: "idol",
      },
      {
        name: "まいまい17歳",
        community: "JK日常界隈",
        avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop",
        rank: 4,
        heatScore: 865.7,
        totalViews: 148900,
        revenue: 85500,
        streamCount: 68,
        followers: 52000,
        revenueShare: 80,
        satisfactionScore: 4.3,
        attendanceRate: 4.5,
        bio: "JKのリアルな日常を発信中。素朴で親しみやすいキャラが人気の秘密。",
        category: "idol",
      },
      {
        name: "桜井 みなみ",
        community: "アイドル部",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
        rank: 1,
        heatScore: 4.8,
        totalViews: 125000,
        revenue: 980000,
        streamCount: 87,
        followers: 15200,
        revenueShare: 80,
        satisfactionScore: 4.9,
        attendanceRate: 4.7,
        bio: "毎日元気に配信中！みんなと一緒に楽しい時間を過ごしたいです♪",
        category: "idol",
      },
      {
        name: "田中 ゆうき",
        community: "英会話クラブ",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
        rank: 2,
        heatScore: 4.6,
        totalViews: 89000,
        revenue: 650000,
        streamCount: 62,
        followers: 9800,
        revenueShare: 80,
        satisfactionScore: 4.7,
        attendanceRate: 4.5,
        bio: "TOEIC 990点取得。ビジネス英語から日常会話まで丁寧に教えます！",
        category: "english",
      },
      {
        name: "神崎 リナ",
        community: "占いサロン",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
        rank: 3,
        heatScore: 4.5,
        totalViews: 73000,
        revenue: 520000,
        streamCount: 45,
        followers: 7600,
        revenueShare: 80,
        satisfactionScore: 4.6,
        attendanceRate: 4.3,
        bio: "タロット・西洋占星術・数秘術を組み合わせた独自のリーディングで、あなたの未来を照らします。",
        category: "fortune",
      },
      {
        name: "松本 こうた",
        community: "フィットネス部",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop",
        rank: 4,
        heatScore: 4.3,
        totalViews: 58000,
        revenue: 420000,
        streamCount: 38,
        followers: 5400,
        revenueShare: 80,
        satisfactionScore: 4.4,
        attendanceRate: 4.8,
        bio: "元プロサッカー選手。ダイエット・筋トレ・メンタルコーチングを専門とするパーソナルトレーナー。",
        category: "coaching",
      },
      {
        name: "伊藤 さやか",
        community: "カウンセリングルーム",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop",
        rank: 5,
        heatScore: 4.7,
        totalViews: 41000,
        revenue: 380000,
        streamCount: 29,
        followers: 4200,
        revenueShare: 80,
        satisfactionScore: 4.8,
        attendanceRate: 4.9,
        bio: "臨床心理士・公認心理師。悩みを抱えた方の話を丁寧に聴き、一緒に解決策を探します。",
        category: "counselor",
      },
      {
        name: "中村 あおい",
        community: "料理教室",
        avatar: "https://images.unsplash.com/photo-1502767089025-6572583495b9?w=150&h=150&fit=crop",
        rank: 6,
        heatScore: 4.4,
        totalViews: 33000,
        revenue: 290000,
        streamCount: 24,
        followers: 3100,
        revenueShare: 80,
        satisfactionScore: 4.5,
        attendanceRate: 4.6,
        bio: "フランス料理学校卒業。家庭で本格的なレシピを楽しく学べる料理教室を開催中。",
        category: "cooking",
      },
    ];

    const toInsert = demoCreators.filter((c) => !existingNames.has(c.name));
    if (toInsert.length === 0) {
      return res.json({ ok: true, message: "Already seeded" });
    }
    const insertedCreators = await db.insert(creators).values(toInsert).returning();

    const today = new Date();
    const availData: { liverId: number; date: string; startTime: string; endTime: string; maxSlots: number; bookedSlots: number; note: string }[] = [];
    for (const c of insertedCreators) {
      for (let d = 0; d < 7; d++) {
        const dt = new Date(today);
        dt.setDate(today.getDate() + d);
        const dateStr = dt.toISOString().slice(0, 10);
        availData.push({ liverId: c.id, date: dateStr, startTime: "19:00", endTime: "21:00", maxSlots: 3, bookedSlots: Math.floor(Math.random() * 2), note: "" });
        if (d % 2 === 0) {
          availData.push({ liverId: c.id, date: dateStr, startTime: "13:00", endTime: "15:00", maxSlots: 2, bookedSlots: 0, note: "午後の部" });
        }
      }
    }
    await db.insert(liverAvailability).values(availData);

    const reviewAuthors = [
      { name: "ゆき", avatar: "https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=80&h=80&fit=crop" },
      { name: "たかし", avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=80&h=80&fit=crop" },
      { name: "はるか", avatar: "https://images.unsplash.com/photo-1554151228-14d9def656e4?w=80&h=80&fit=crop" },
      { name: "けんじ", avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=80&h=80&fit=crop" },
    ];
    const comments = [
      "とても楽しい時間でした！また予約したいです。",
      "丁寧な対応で大満足です。スケジュール通りに進んでくれました。",
      "素晴らしい配信でした。また参加したいと思います！",
      "期待以上の内容でした。毎回来るのが楽しみです。",
      "時間を守ってくれて信頼できます。次回も予約します！",
    ];
    const reviewData: { liverId: number; userId: string; userName: string; userAvatar: string; satisfactionScore: number; streamCountScore: number; attendanceScore: number; overallScore: number; comment: string; sessionDate: string }[] = [];
    for (const c of insertedCreators) {
      for (let i = 0; i < 4; i++) {
        const author = reviewAuthors[i % reviewAuthors.length];
        const sat = 4 + Math.floor(Math.random() * 2);
        const str = 4 + Math.floor(Math.random() * 2);
        const att = 4 + Math.floor(Math.random() * 2);
        const overall = parseFloat(((sat + str + att) / 3).toFixed(1));
        const dt = new Date(today);
        dt.setDate(today.getDate() - (i + 1) * 7);
        reviewData.push({
          liverId: c.id,
          userId: `user-${i}`,
          userName: author.name,
          userAvatar: author.avatar,
          satisfactionScore: sat,
          streamCountScore: str,
          attendanceScore: att,
          overallScore: overall,
          comment: comments[i % comments.length],
          sessionDate: dt.toISOString().slice(0, 10),
        });
      }
    }
    await db.insert(liverReviews).values(reviewData);

    const existingBookings = await db.select().from(bookingSessions);
    if (existingBookings.length === 0) {
      const bookingData = insertedCreators.slice(0, 5).map((c, i) => {
        const dt = new Date(today);
        dt.setDate(today.getDate() + i + 1);
        const categories = ["idol", "english", "fortune", "coaching", "counselor"];
        const labels = ["アイドル", "英会話", "占い", "コーチング", "カウンセラー"];
        const prices = [3000, 5000, 4000, 6000, 4500];
        const cat = categories[i % categories.length];
        return {
          creator: c.name,
          category: cat,
          categoryLabel: labels[i % labels.length],
          title: `${c.name}との1対1セッション`,
          avatar: c.avatar,
          thumbnail: `https://images.unsplash.com/photo-151645036045${i}-9312f5e86fc7?w=400&h=250&fit=crop`,
          date: dt.toISOString().slice(0, 10),
          time: "19:00",
          duration: "30分",
          price: prices[i % prices.length],
          spotsTotal: 5,
          spotsLeft: 2 + i,
          rating: parseFloat((4.3 + Math.random() * 0.7).toFixed(1)),
          reviewCount: 10 + i * 5,
          tag: i === 0 ? "人気" : null,
        };
      });
      await db.insert(bookingSessions).values(bookingData);
    }

    // Seed live_streams（デモ配信）--------------------------------------------
    const existingLive = await db.select().from(liveStreams);
    if (existingLive.length === 0) {
      await db.insert(liveStreams).values([
        { title: "星空みゆ♪ 歌とダンスでお届け！", creator: "星空みゆ", community: "地下アイドル界隈", viewers: 1240, thumbnail: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&h=200&fit=crop", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop", timeAgo: "配信予定", isLive: true },
        { title: "麗華の夜トーク【本音で語るよ】", creator: "麗華 -REIKA-", community: "キャバ嬢・ホスト界隈", viewers: 890, thumbnail: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300&h=200&fit=crop", avatar: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=40&h=40&fit=crop", timeAgo: "配信予定", isLive: true },
        { title: "朝活！一緒にヨガしよう", creator: "松本 こうた", community: "フィットネス部", viewers: 420, thumbnail: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=200&fit=crop", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop", timeAgo: "配信予定", isLive: true },
        { title: "神崎リナ【深夜の占いタイム】", creator: "神崎 リナ", community: "占いサロン", viewers: 312, thumbnail: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=200&fit=crop", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop", timeAgo: "配信予定", isLive: true },
      ] as unknown as typeof liveStreams.$inferInsert[]);
    }

    res.json({ ok: true, created: insertedCreators.length });
  });

  app.post("/api/seed-editors", async (_req: Request, res: Response) => {
    const existing = await db.select().from(videoEditors);
    if (existing.length >= 5) {
      return res.json({ ok: true, message: "Already seeded" });
    }

    const [idolCommunity] = await db.select({ id: communities.id }).from(communities).where(eq(communities.name, "地下アイドル界隈"));
    const defaultCommunityId = idolCommunity?.id ?? 1;

    const demoEditors = [
      {
        name: "映像編集マン",
        avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&h=150&fit=crop",
        bio: "テロップ・カット・サムネまでワンストップで対応する動画編集クリエイター。",
        communityId: defaultCommunityId,
        genres: "YouTube,バラエティ,ゲーム",
        deliveryDays: 3,
        priceType: "per_minute",
        pricePerMinute: 1500,
        revenueSharePercent: null,
        rating: 4.9,
        reviewCount: 128,
        isAvailable: true,
      },
      {
        name: "シネマ編集スタジオ",
        avatar: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=150&h=150&fit=crop",
        bio: "映画風のシネマティックなMV制作が得意です。",
        communityId: defaultCommunityId,
        genres: "MV,アーティスト,シネマティック",
        deliveryDays: 7,
        priceType: "revenue_share",
        pricePerMinute: null,
        revenueSharePercent: 40,
        rating: 4.8,
        reviewCount: 76,
        isAvailable: false,
      },
      {
        name: "ショート動画職人",
        avatar: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=150&h=150&fit=crop",
        bio: "TikTok・YouTubeショートの伸びる構成を提案します。",
        communityId: defaultCommunityId,
        genres: "ショート動画,縦型,SNS運用",
        deliveryDays: 2,
        priceType: "per_minute",
        pricePerMinute: 2000,
        revenueSharePercent: null,
        rating: 5.0,
        reviewCount: 54,
        isAvailable: true,
      },
      {
        name: "ゲーム実況エディター",
        avatar: "https://images.unsplash.com/photo-1533236897111-3e94666b2dde?w=150&h=150&fit=crop",
        bio: "APEX/VALORANTなどFPS系実況の編集が中心です。",
        communityId: defaultCommunityId,
        genres: "ゲーム実況,FPS,切り抜き",
        deliveryDays: 4,
        priceType: "per_minute",
        pricePerMinute: 1200,
        revenueSharePercent: null,
        rating: 4.6,
        reviewCount: 90,
        isAvailable: false,
      },
      {
        name: "教育チャンネル編集室",
        avatar: "https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?w=150&h=150&fit=crop",
        bio: "ビジネス・教育系の分かりやすい図解動画を制作します。",
        communityId: defaultCommunityId,
        genres: "ビジネス,教育,セミナー",
        deliveryDays: 5,
        priceType: "revenue_share",
        pricePerMinute: null,
        revenueSharePercent: 30,
        rating: 4.7,
        reviewCount: 33,
        isAvailable: true,
      },
    ];

    await db.insert(videoEditors).values(demoEditors);
    res.json({ ok: true, count: demoEditors.length });
  });

  // ─── Coin System API ──────────────────────────────────────────────────────
  const FREE_REQUESTS_PER_DAY = 3;

  /** GET /api/coins/balance - ログインユーザーのコイン残高を返す */
  app.get("/api/coins/balance", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const userId = String(user.id);
    const rows = await db.select().from(coinBalances).where(eq(coinBalances.userId, userId)).limit(1);
    const balance = rows[0]?.balance ?? 0;
    return res.json({ balance });
  });

  /** GET /api/coins/request-count?communityId=X - 今日のリクエスト回数と残り無料回数 */
  app.get("/api/coins/request-count", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const communityId = parseInt(req.query.communityId as string);
    if (isNaN(communityId)) return res.status(400).json({ error: "communityId required" });
    const userId = String(user.id);
    const today = new Date().toISOString().slice(0, 10);
    const rows = await db.select().from(jukeboxRequestCounts)
      .where(and(
        eq(jukeboxRequestCounts.userId, userId),
        eq(jukeboxRequestCounts.communityId, communityId),
        eq(jukeboxRequestCounts.date, today)
      )).limit(1);
    const count = rows[0]?.count ?? 0;
    const freeRemaining = Math.max(0, FREE_REQUESTS_PER_DAY - count);
    return res.json({ count, freeRemaining, freeLimit: FREE_REQUESTS_PER_DAY });
  });

  /** POST /api/coins/spend-jukebox - コイン1枚を消費してジュークボックスリクエストを記録 */
  app.post("/api/coins/spend-jukebox", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { communityId, queueItemId } = req.body as { communityId: number; queueItemId?: number };
    if (!communityId) return res.status(400).json({ error: "communityId required" });
    const userId = String(user.id);
    const today = new Date().toISOString().slice(0, 10);

    // 残高確認
    const balRows = await db.select().from(coinBalances).where(eq(coinBalances.userId, userId)).limit(1);
    const currentBalance = balRows[0]?.balance ?? 0;
    if (currentBalance < 1) return res.status(402).json({ error: "Insufficient coins", balance: currentBalance });

    // 残高を1枚減らす
    if (balRows.length === 0) {
      await db.insert(coinBalances).values({ userId, balance: -1 });
    } else {
      await db.update(coinBalances).set({ balance: currentBalance - 1, updatedAt: new Date() }).where(eq(coinBalances.userId, userId));
    }

    // トランザクション記録
    await db.insert(coinTransactions).values({
      userId,
      amount: -1,
      type: "spend_jukebox",
      referenceId: queueItemId ? String(queueItemId) : null,
      description: `Jukebox request in community ${communityId}`,
    });

    // リクエスト回数を増やす
    const countRows = await db.select().from(jukeboxRequestCounts)
      .where(and(
        eq(jukeboxRequestCounts.userId, userId),
        eq(jukeboxRequestCounts.communityId, communityId),
        eq(jukeboxRequestCounts.date, today)
      )).limit(1);
    if (countRows.length === 0) {
      await db.insert(jukeboxRequestCounts).values({ userId, communityId, date: today, count: 1 });
    } else {
      await db.update(jukeboxRequestCounts).set({ count: countRows[0].count + 1, updatedAt: new Date() })
        .where(eq(jukeboxRequestCounts.id, countRows[0].id));
    }

    return res.json({ success: true, newBalance: currentBalance - 1 });
  });

  /** POST /api/coins/record-free-request - 無料リクエスト回数を記録 */
  app.post("/api/coins/record-free-request", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { communityId } = req.body as { communityId: number };
    if (!communityId) return res.status(400).json({ error: "communityId required" });
    const userId = String(user.id);
    const today = new Date().toISOString().slice(0, 10);
    const countRows = await db.select().from(jukeboxRequestCounts)
      .where(and(
        eq(jukeboxRequestCounts.userId, userId),
        eq(jukeboxRequestCounts.communityId, communityId),
        eq(jukeboxRequestCounts.date, today)
      )).limit(1);
    if (countRows.length === 0) {
      await db.insert(jukeboxRequestCounts).values({ userId, communityId, date: today, count: 1 });
    } else {
      await db.update(jukeboxRequestCounts).set({ count: countRows[0].count + 1, updatedAt: new Date() })
        .where(eq(jukeboxRequestCounts.id, countRows[0].id));
    }
    return res.json({ success: true });
  });

  /** POST /api/coins/use-revenue - 収益残高からコインに変換して消費（1コイン=¥30） */
  app.post("/api/coins/use-revenue", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { communityId, queueItemId } = req.body as { communityId: number; queueItemId?: number };
    if (!communityId) return res.status(400).json({ error: "communityId required" });
    const userId = String(user.id);
    const today = new Date().toISOString().slice(0, 10);
    const COIN_PRICE_JPY = 30;

    // 収益残高確認（wallets テーブル）
    const walletRows = await db.select().from(wallets).where(eq(wallets.userId, user.id)).limit(1);
    const walletBalance = walletRows[0]?.balanceAvailable ?? 0;
    if (walletBalance < COIN_PRICE_JPY) {
      return res.status(402).json({ error: "Insufficient revenue balance", balance: walletBalance });
    }

    // 収益残高を減らす
    await db.update(wallets).set({ balanceAvailable: walletBalance - COIN_PRICE_JPY, updatedAt: new Date() }).where(eq(wallets.userId, user.id));

    // コイントランザクション記録（収益→コイン変換）
    await db.insert(coinTransactions).values({
      userId,
      amount: -1,
      type: "revenue_convert",
      referenceId: queueItemId ? String(queueItemId) : null,
      description: `Revenue balance used for jukebox request in community ${communityId} (¥${COIN_PRICE_JPY})`,
    });

    // リクエスト回数を増やす
    const countRows = await db.select().from(jukeboxRequestCounts)
      .where(and(
        eq(jukeboxRequestCounts.userId, userId),
        eq(jukeboxRequestCounts.communityId, communityId),
        eq(jukeboxRequestCounts.date, today)
      )).limit(1);
    if (countRows.length === 0) {
      await db.insert(jukeboxRequestCounts).values({ userId, communityId, date: today, count: 1 });
    } else {
      await db.update(jukeboxRequestCounts).set({ count: countRows[0].count + 1, updatedAt: new Date() })
        .where(eq(jukeboxRequestCounts.id, countRows[0].id));
    }

    return res.json({ success: true, newWalletBalance: walletBalance - COIN_PRICE_JPY });
  });

  /** POST /api/coins/create-checkout - Stripe Checkout セッションを作成してコインを購入 */
  app.post("/api/coins/create-checkout", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { packageId, origin } = req.body as { packageId: string; origin: string };

    // コインパッケージ定義（1コイン=¥30）
    const COIN_PACKAGES: Record<string, { coins: number; priceGBP: number; priceJPY: number; label: string }> = {
      "pack-1": { coins: 1, priceGBP: 16, priceJPY: 30, label: "1 Coin" },
      "pack-5": { coins: 5, priceGBP: 75, priceJPY: 150, label: "5 Coins" },
      "pack-10": { coins: 10, priceGBP: 140, priceJPY: 280, label: "10 Coins" },
      "pack-30": { coins: 30, priceGBP: 390, priceJPY: 780, label: "30 Coins" },
    };
    const pkg = COIN_PACKAGES[packageId];
    if (!pkg) return res.status(400).json({ error: "Invalid packageId" });

    try {
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "gbp",
            product_data: {
              name: `Rawstock ${pkg.label}`,
              description: `${pkg.coins} coin${pkg.coins > 1 ? "s" : ""} for jukebox requests`,
            },
            unit_amount: pkg.priceGBP,
          },
          quantity: 1,
        }],
        mode: "payment",
        success_url: `${origin}/coins/success?session_id={CHECKOUT_SESSION_ID}&coins=${pkg.coins}`,
        cancel_url: `${origin}/coins/cancel`,
        metadata: {
          userId: String(user.id),
          coins: String(pkg.coins),
          packageId,
        },
      });
      return res.json({ url: session.url, sessionId: session.id });
    } catch (err) {
      console.error("Stripe checkout error:", err);
      return res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  /** POST /api/coins/verify-purchase - Stripe Checkout 完了後にコインを付与 */
  app.post("/api/coins/verify-purchase", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { sessionId } = req.body as { sessionId: string };
    if (!sessionId) return res.status(400).json({ error: "sessionId required" });

    try {
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== "paid") {
        return res.status(402).json({ error: "Payment not completed" });
      }
      const coins = parseInt(session.metadata?.coins ?? "0");
      const metaUserId = session.metadata?.userId;
      if (!coins || metaUserId !== String(user.id)) {
        return res.status(400).json({ error: "Invalid session" });
      }

      // 重複付与防止：既にこのセッションで付与済みか確認
      const existing = await db.select().from(coinTransactions)
        .where(and(
          eq(coinTransactions.userId, String(user.id)),
          eq(coinTransactions.referenceId, sessionId)
        )).limit(1);
      if (existing.length > 0) {
        const balRows = await db.select().from(coinBalances).where(eq(coinBalances.userId, String(user.id))).limit(1);
        return res.json({ success: true, alreadyGranted: true, balance: balRows[0]?.balance ?? 0 });
      }

      // コインを付与
      const balRows = await db.select().from(coinBalances).where(eq(coinBalances.userId, String(user.id))).limit(1);
      const currentBalance = balRows[0]?.balance ?? 0;
      if (balRows.length === 0) {
        await db.insert(coinBalances).values({ userId: String(user.id), balance: coins });
      } else {
        await db.update(coinBalances).set({ balance: currentBalance + coins, updatedAt: new Date() }).where(eq(coinBalances.userId, String(user.id)));
      }

      // トランザクション記録
      await db.insert(coinTransactions).values({
        userId: String(user.id),
        amount: coins,
        type: "purchase",
        referenceId: sessionId,
        description: `Purchased ${coins} coin${coins > 1 ? "s" : ""} via Stripe`,
      });

      return res.json({ success: true, newBalance: currentBalance + coins });
    } catch (err) {
      console.error("Verify purchase error:", err);
      return res.status(500).json({ error: "Failed to verify purchase" });
    }
  });

  // ── Ticket System ──────────────────────────────────────────────────────────
  // 1 Ticket = $0.01 USD. Purchased via Stripe (USD). Spent in-app.

  const FREE_JUKEBOX_PER_DAY = 3;
  const TICKETS_PER_JUKEBOX = 30;   // $0.30 per paid request
  const TWOSHOT_TICKET_PRICE = 500; // $5.00 per mentor session

  /** GET /api/tickets/balance */
  app.get("/api/tickets/balance", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const userId = String(user.id);
    const rows = await db.select().from(ticketBalances).where(eq(ticketBalances.userId, userId)).limit(1);
    return res.json({ balance: rows[0]?.balance ?? 0 });
  });

  /** GET /api/tickets/request-count?communityId=X */
  app.get("/api/tickets/request-count", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const communityId = parseInt(req.query.communityId as string);
    if (isNaN(communityId)) return res.status(400).json({ error: "communityId required" });
    const userId = String(user.id);
    const today = new Date().toISOString().slice(0, 10);
    const rows = await db.select().from(jukeboxRequestCounts)
      .where(and(
        eq(jukeboxRequestCounts.userId, userId),
        eq(jukeboxRequestCounts.communityId, communityId),
        eq(jukeboxRequestCounts.date, today)
      )).limit(1);
    const count = rows[0]?.count ?? 0;
    const freeRemaining = Math.max(0, FREE_JUKEBOX_PER_DAY - count);
    return res.json({ count, freeRemaining, freeLimit: FREE_JUKEBOX_PER_DAY, ticketsPerRequest: TICKETS_PER_JUKEBOX });
  });

  /** POST /api/tickets/record-free-request */
  app.post("/api/tickets/record-free-request", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { communityId } = req.body as { communityId: number };
    if (!communityId) return res.status(400).json({ error: "communityId required" });
    const userId = String(user.id);
    const today = new Date().toISOString().slice(0, 10);
    const countRows = await db.select().from(jukeboxRequestCounts)
      .where(and(
        eq(jukeboxRequestCounts.userId, userId),
        eq(jukeboxRequestCounts.communityId, communityId),
        eq(jukeboxRequestCounts.date, today)
      )).limit(1);
    if (countRows.length === 0) {
      await db.insert(jukeboxRequestCounts).values({ userId, communityId, date: today, count: 1 });
    } else {
      await db.update(jukeboxRequestCounts).set({ count: countRows[0].count + 1, updatedAt: new Date() })
        .where(eq(jukeboxRequestCounts.id, countRows[0].id));
    }
    return res.json({ success: true });
  });

  /** POST /api/tickets/spend-jukebox — deduct 30 tickets for a paid jukebox request */
  app.post("/api/tickets/spend-jukebox", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { communityId, queueItemId } = req.body as { communityId: number; queueItemId?: number };
    if (!communityId) return res.status(400).json({ error: "communityId required" });
    const userId = String(user.id);
    const today = new Date().toISOString().slice(0, 10);

    const balRows = await db.select().from(ticketBalances).where(eq(ticketBalances.userId, userId)).limit(1);
    const currentBalance = balRows[0]?.balance ?? 0;
    if (currentBalance < TICKETS_PER_JUKEBOX) {
      return res.status(402).json({ error: "Insufficient tickets", balance: currentBalance, required: TICKETS_PER_JUKEBOX });
    }

    if (balRows.length === 0) {
      await db.insert(ticketBalances).values({ userId, balance: -TICKETS_PER_JUKEBOX });
    } else {
      await db.update(ticketBalances).set({ balance: currentBalance - TICKETS_PER_JUKEBOX, updatedAt: new Date() })
        .where(eq(ticketBalances.userId, userId));
    }

    await db.insert(ticketTransactions).values({
      userId,
      amount: -TICKETS_PER_JUKEBOX,
      type: "spend_jukebox",
      referenceId: queueItemId ? String(queueItemId) : null,
      description: `Jukebox request in community ${communityId}`,
    });

    const countRows = await db.select().from(jukeboxRequestCounts)
      .where(and(
        eq(jukeboxRequestCounts.userId, userId),
        eq(jukeboxRequestCounts.communityId, communityId),
        eq(jukeboxRequestCounts.date, today)
      )).limit(1);
    if (countRows.length === 0) {
      await db.insert(jukeboxRequestCounts).values({ userId, communityId, date: today, count: 1 });
    } else {
      await db.update(jukeboxRequestCounts).set({ count: countRows[0].count + 1, updatedAt: new Date() })
        .where(eq(jukeboxRequestCounts.id, countRows[0].id));
    }

    return res.json({ success: true, newBalance: currentBalance - TICKETS_PER_JUKEBOX });
  });

  /** POST /api/tickets/spend — generic spend for sessions, gifts, etc. */
  app.post("/api/tickets/spend", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { amount, type, referenceId, description } = req.body as {
      amount: number; type: string; referenceId?: string; description?: string;
    };
    if (!amount || amount <= 0) return res.status(400).json({ error: "amount must be positive" });
    if (!type) return res.status(400).json({ error: "type required" });
    const userId = String(user.id);

    const balRows = await db.select().from(ticketBalances).where(eq(ticketBalances.userId, userId)).limit(1);
    const currentBalance = balRows[0]?.balance ?? 0;
    if (currentBalance < amount) {
      return res.status(402).json({ error: "Insufficient tickets", balance: currentBalance, required: amount });
    }

    if (balRows.length === 0) {
      await db.insert(ticketBalances).values({ userId, balance: -amount });
    } else {
      await db.update(ticketBalances).set({ balance: currentBalance - amount, updatedAt: new Date() })
        .where(eq(ticketBalances.userId, userId));
    }

    await db.insert(ticketTransactions).values({
      userId,
      amount: -amount,
      type,
      referenceId: referenceId ?? null,
      description: description ?? null,
    });

    return res.json({ success: true, newBalance: currentBalance - amount });
  });

  /** POST /api/tickets/create-checkout — create Stripe session to purchase tickets (USD) */
  app.post("/api/tickets/create-checkout", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { packId, origin } = req.body as { packId: string; origin: string };

    const pack = (TICKET_PACKS as readonly { id: string; tickets: number; priceUSD: number; label: string; bonus: string | null }[]).find(p => p.id === packId);
    if (!pack) return res.status(400).json({ error: "Invalid packId" });

    try {
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `RawStock ${pack.label}`,
              description: `${pack.tickets} Tickets${pack.bonus ? ` (${pack.bonus})` : ""} — 1 Ticket = $0.01`,
            },
            unit_amount: pack.priceUSD,
          },
          quantity: 1,
        }],
        mode: "payment",
        success_url: `${origin}/tickets?session_id={CHECKOUT_SESSION_ID}&tickets=${pack.tickets}`,
        cancel_url: `${origin}/tickets`,
        metadata: {
          userId: String(user.id),
          tickets: String(pack.tickets),
          packId,
        },
      });
      return res.json({ url: session.url, sessionId: session.id });
    } catch (err) {
      console.error("Ticket checkout error:", err);
      return res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  /** POST /api/tickets/verify-purchase — verify Stripe session and credit tickets */
  app.post("/api/tickets/verify-purchase", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { sessionId } = req.body as { sessionId: string };
    if (!sessionId) return res.status(400).json({ error: "sessionId required" });

    try {
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== "paid") {
        return res.status(402).json({ error: "Payment not completed" });
      }
      const tickets = parseInt(session.metadata?.tickets ?? "0");
      const metaUserId = session.metadata?.userId;
      if (!tickets || metaUserId !== String(user.id)) {
        return res.status(400).json({ error: "Invalid session" });
      }

      const existing = await db.select().from(ticketTransactions)
        .where(and(
          eq(ticketTransactions.userId, String(user.id)),
          eq(ticketTransactions.referenceId, sessionId)
        )).limit(1);
      if (existing.length > 0) {
        const balRows = await db.select().from(ticketBalances).where(eq(ticketBalances.userId, String(user.id))).limit(1);
        return res.json({ success: true, alreadyGranted: true, balance: balRows[0]?.balance ?? 0 });
      }

      const balRows = await db.select().from(ticketBalances).where(eq(ticketBalances.userId, String(user.id))).limit(1);
      const currentBalance = balRows[0]?.balance ?? 0;
      if (balRows.length === 0) {
        await db.insert(ticketBalances).values({ userId: String(user.id), balance: tickets });
      } else {
        await db.update(ticketBalances).set({ balance: currentBalance + tickets, updatedAt: new Date() })
          .where(eq(ticketBalances.userId, String(user.id)));
      }

      await db.insert(ticketTransactions).values({
        userId: String(user.id),
        amount: tickets,
        type: "purchase",
        referenceId: sessionId,
        description: `Purchased ${tickets} tickets via Stripe`,
      });

      return res.json({ success: true, newBalance: currentBalance + tickets });
    } catch (err) {
      console.error("Verify ticket purchase error:", err);
      return res.status(500).json({ error: "Failed to verify purchase" });
    }
  });

  /** GET /api/tickets/packs — list available ticket packs */
  app.get("/api/tickets/packs", (_req: Request, res: Response) => {
    return res.json(TICKET_PACKS);
  });

  // ── Editing Requests ──────────────────────────────────────────────────────
  // Creator submits raw footage; editors deliver; creator earns 90% revenue.

  const EDITING_FEE_TICKETS = 200; // 🎟 deducted per editing request

  /** POST /api/editing-requests — submit a request, deduct service fee in tickets */
  app.post("/api/editing-requests", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { videoUrl, performanceDate, instructions } = req.body as {
      videoUrl?: string; performanceDate?: string; instructions?: string;
    };
    if (!videoUrl) return res.status(400).json({ error: "videoUrl is required" });
    const userId = String(user.id);

    const balRows = await db.select().from(ticketBalances).where(eq(ticketBalances.userId, userId)).limit(1);
    const currentBalance = balRows[0]?.balance ?? 0;
    if (currentBalance < EDITING_FEE_TICKETS) {
      return res.status(402).json({ error: "Insufficient tickets", balance: currentBalance, required: EDITING_FEE_TICKETS });
    }

    if (balRows.length === 0) {
      await db.insert(ticketBalances).values({ userId, balance: -EDITING_FEE_TICKETS });
    } else {
      await db.update(ticketBalances)
        .set({ balance: currentBalance - EDITING_FEE_TICKETS, updatedAt: new Date() })
        .where(eq(ticketBalances.userId, userId));
    }

    const [txn] = await db.insert(ticketTransactions).values({
      userId,
      amount: -EDITING_FEE_TICKETS,
      type: "spend_editing",
      description: `Editing request service fee`,
    }).returning();

    const [request] = await db.insert(editingRequests).values({
      userId,
      videoUrl,
      performanceDate: performanceDate ?? null,
      instructions: instructions ?? null,
      ticketFee: EDITING_FEE_TICKETS,
      ticketTransactionId: String(txn.id),
      status: "pending",
    }).returning();

    return res.json({ success: true, request, newBalance: currentBalance - EDITING_FEE_TICKETS });
  });

  /** GET /api/editing-requests — list current user's editing requests */
  app.get("/api/editing-requests", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const userId = String(user.id);
    const rows = await db.select().from(editingRequests)
      .where(eq(editingRequests.userId, userId))
      .orderBy(desc(editingRequests.createdAt));
    return res.json(rows);
  });

  // ── Platform Banner Ads (operator-managed) ────────────────────────────────
  // GET /api/platform-banners - get active banners (public)
  app.get("/api/platform-banners", async (_req: Request, res: Response) => {
    try {
      const rows = await db.select().from(bannerAds)
        .where(eq(bannerAds.isActive, true))
        .orderBy(asc(bannerAds.displayOrder), desc(bannerAds.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/platform-banners - create banner (admin only)
  app.post("/api/platform-banners", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });
    if (user.role !== "ADMIN") return res.status(403).json({ error: "管理者のみ操作できます" });
    const { title, imageUrl, linkUrl, description, displayOrder } = req.body as {
      title?: string; imageUrl?: string; linkUrl?: string; description?: string; displayOrder?: number;
    };
    if (!title) return res.status(400).json({ error: "title は必須です" });
    try {
      const [row] = await db.insert(bannerAds).values({
        title,
        imageUrl: imageUrl ?? null,
        linkUrl: linkUrl ?? null,
        description: description ?? null,
        isActive: true,
        displayOrder: displayOrder ?? 0,
      } as typeof bannerAds.$inferInsert).returning();
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // PATCH /api/platform-banners/:id - update banner (admin only)
  app.patch("/api/platform-banners/:id", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });
    if (user.role !== "ADMIN") return res.status(403).json({ error: "管理者のみ操作できます" });
    const id = paramNum(req, "id");
    const { title, imageUrl, linkUrl, description, isActive, displayOrder } = req.body as {
      title?: string; imageUrl?: string; linkUrl?: string; description?: string; isActive?: boolean; displayOrder?: number;
    };
    try {
      const updates: Partial<typeof bannerAds.$inferInsert> = { updatedAt: new Date() };
      if (title !== undefined) updates.title = title;
      if (imageUrl !== undefined) updates.imageUrl = imageUrl;
      if (linkUrl !== undefined) updates.linkUrl = linkUrl;
      if (description !== undefined) updates.description = description;
      if (isActive !== undefined) updates.isActive = isActive;
      if (displayOrder !== undefined) updates.displayOrder = displayOrder;
      const [row] = await db.update(bannerAds).set(updates).where(eq(bannerAds.id, id)).returning();
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // DELETE /api/platform-banners/:id - delete banner (admin only)
  app.delete("/api/platform-banners/:id", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });
    if (user.role !== "ADMIN") return res.status(403).json({ error: "管理者のみ操作できます" });
    const id = paramNum(req, "id");
    try {
      await db.delete(bannerAds).where(eq(bannerAds.id, id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Daily Login Count ─────────────────────────────────────────────────────
  // POST /api/daily-login - record today's login (idempotent)
  app.post("/api/daily-login", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "未認証です" });
    const today = new Date().toISOString().slice(0, 10);
    try {
      await db.insert(dailyLogins).values({ userId: user.id, date: today } as typeof dailyLogins.$inferInsert)
        .onConflictDoNothing();
      const [{ cnt }] = await db.select({ cnt: count() }).from(dailyLogins).where(eq(dailyLogins.date, today));
      res.json({ date: today, count: Number(cnt) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/daily-login/count - get today's login count (public)
  app.get("/api/daily-login/count", async (_req: Request, res: Response) => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const [{ cnt }] = await db.select({ cnt: count() }).from(dailyLogins).where(eq(dailyLogins.date, today));
      res.json({ date: today, count: Number(cnt) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── AI Edit Assistant ─────────────────────────────────────────────────────

  const AI_EDIT_PLAN_TICKETS: Record<number, number> = { 15: 200, 30: 400, 45: 600, 60: 800 };
  const AI_EDIT_REVISION_TICKETS = 100;

  // POST /api/ai-edit/jobs — charge tickets, create job, start async Claude processing
  app.post("/api/ai-edit/jobs", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { planMinutes, videoUrls, logoUrl, telop, targetAudience, tone, prompt } = req.body as {
      planMinutes?: number;
      videoUrls?: string[];
      logoUrl?: string;
      telop?: string;
      targetAudience?: string;
      tone?: string;
      prompt?: string;
    };

    if (!planMinutes || !(planMinutes in AI_EDIT_PLAN_TICKETS)) {
      return res.status(400).json({ error: "planMinutes must be 15, 30, 45, or 60" });
    }
    if (!Array.isArray(videoUrls) || videoUrls.length === 0) {
      return res.status(400).json({ error: "At least one video URL is required" });
    }
    if (!prompt?.trim()) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const ticketCost = AI_EDIT_PLAN_TICKETS[planMinutes];
    const userId = String(user.id);

    // Deduct tickets upfront
    const balRows = await db.select().from(ticketBalances).where(eq(ticketBalances.userId, userId)).limit(1);
    const currentBalance = balRows[0]?.balance ?? 0;
    if (currentBalance < ticketCost) {
      return res.status(402).json({ error: "Insufficient tickets", balance: currentBalance, required: ticketCost });
    }
    if (balRows.length === 0) {
      await db.insert(ticketBalances).values({ userId, balance: -ticketCost });
    } else {
      await db.update(ticketBalances)
        .set({ balance: currentBalance - ticketCost, updatedAt: new Date() })
        .where(eq(ticketBalances.userId, userId));
    }
    await db.insert(ticketTransactions).values({
      userId,
      amount: -ticketCost,
      type: "spend_ai_edit",
      description: `AI Edit: ${planMinutes}min plan`,
    });

    const [job] = await db
      .insert(aiEditJobs)
      .values({
        userId: user.id,
        videoUrl: videoUrls[0],
        prompt: prompt.trim(),
        status: "pending",
        planMinutes,
        videoUrls: JSON.stringify(videoUrls),
        logoUrl: logoUrl ?? null,
        telop: telop ?? null,
        targetAudience: targetAudience ?? null,
        tone: tone ?? null,
        revisionCount: 0,
        ticketCost,
      } as typeof aiEditJobs.$inferInsert)
      .returning();

    // Async Claude processing — do not await
    (async () => {
      try {
        await db
          .update(aiEditJobs)
          .set({ status: "processing", updatedAt: new Date() } as Partial<typeof aiEditJobs.$inferInsert>)
          .where(eq(aiEditJobs.id, job.id));

        const editInput: EditJobInput = {
          planMinutes: planMinutes as 15 | 30 | 45 | 60,
          videoUrls,
          logoUrl,
          telop,
          targetAudience,
          tone,
          prompt: prompt.trim(),
        };
        const plan = await generateEditPlan(editInput);

        await db
          .update(aiEditJobs)
          .set({
            status: "completed",
            result: JSON.stringify(plan),
            updatedAt: new Date(),
          } as Partial<typeof aiEditJobs.$inferInsert>)
          .where(eq(aiEditJobs.id, job.id));
      } catch (e) {
        console.error("[ai-edit] Processing failed:", e);
        await db
          .update(aiEditJobs)
          .set({ status: "failed", updatedAt: new Date() } as Partial<typeof aiEditJobs.$inferInsert>)
          .where(eq(aiEditJobs.id, job.id));
      }
    })();

    res.json({ id: job.id, status: job.status });
  });

  // GET /api/ai-edit/jobs/:id — get job status and result (owner only)
  app.get("/api/ai-edit/jobs/:id", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const id = paramNum(req, "id");
    const [job] = await db.select().from(aiEditJobs).where(eq(aiEditJobs.id, id));
    if (!job) return res.status(404).json({ error: "Job not found" });

    if (job.userId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    let result = null;
    if (job.result) {
      try { result = JSON.parse(job.result); } catch { result = null; }
    }
    let parsedVideoUrls: string[] | null = null;
    if (job.videoUrls) {
      try { parsedVideoUrls = JSON.parse(job.videoUrls); } catch { parsedVideoUrls = null; }
    }

    res.json({
      id: job.id,
      userId: job.userId,
      videoUrl: job.videoUrl,
      videoUrls: parsedVideoUrls,
      prompt: job.prompt,
      status: job.status,
      result,
      planMinutes: job.planMinutes,
      logoUrl: job.logoUrl,
      telop: job.telop,
      targetAudience: job.targetAudience,
      tone: job.tone,
      revisionCount: job.revisionCount ?? 0,
      ticketCost: job.ticketCost,
      deliveredUrl: job.deliveredUrl ?? null,
      deliveredAt: job.deliveredAt ?? null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  });

  // POST /api/ai-edit/jobs/:id/approve — approve the edit plan (owner only)
  app.post("/api/ai-edit/jobs/:id/approve", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const id = paramNum(req, "id");
    const [job] = await db.select().from(aiEditJobs).where(eq(aiEditJobs.id, id));
    if (!job) return res.status(404).json({ error: "Job not found" });

    if (job.userId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (job.status !== "completed") {
      return res.status(400).json({ error: "Only completed jobs can be approved" });
    }

    await db
      .update(aiEditJobs)
      .set({ status: "approved", updatedAt: new Date() } as Partial<typeof aiEditJobs.$inferInsert>)
      .where(eq(aiEditJobs.id, id));

    res.json({ ok: true, id, status: "approved" });
  });

  // POST /api/ai-edit/jobs/:id/revise — request revision (1st free, 2nd+ costs 100 tickets)
  app.post("/api/ai-edit/jobs/:id/revise", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const id = paramNum(req, "id");
    const [job] = await db.select().from(aiEditJobs).where(eq(aiEditJobs.id, id));
    if (!job) return res.status(404).json({ error: "Job not found" });

    if (job.userId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (job.status !== "completed" && job.status !== "approved") {
      return res.status(400).json({ error: "Only completed or approved jobs can be revised" });
    }

    const revisionCount = job.revisionCount ?? 0;

    // Revision #1 is free; revision #2 and beyond costs 100 tickets
    if (revisionCount >= 1) {
      const userId = String(user.id);
      const balRows = await db.select().from(ticketBalances).where(eq(ticketBalances.userId, userId)).limit(1);
      const currentBalance = balRows[0]?.balance ?? 0;
      if (currentBalance < AI_EDIT_REVISION_TICKETS) {
        return res.status(402).json({ error: "Insufficient tickets", balance: currentBalance, required: AI_EDIT_REVISION_TICKETS });
      }
      if (balRows.length === 0) {
        await db.insert(ticketBalances).values({ userId, balance: -AI_EDIT_REVISION_TICKETS });
      } else {
        await db.update(ticketBalances)
          .set({ balance: currentBalance - AI_EDIT_REVISION_TICKETS, updatedAt: new Date() })
          .where(eq(ticketBalances.userId, userId));
      }
      await db.insert(ticketTransactions).values({
        userId,
        amount: -AI_EDIT_REVISION_TICKETS,
        type: "spend_ai_edit_revision",
        referenceId: String(job.id),
        description: `AI Edit Revision #${revisionCount + 1} (job ${job.id})`,
      });
    }

    const newRevisionCount = revisionCount + 1;
    await db
      .update(aiEditJobs)
      .set({ status: "processing", revisionCount: newRevisionCount, updatedAt: new Date() } as Partial<typeof aiEditJobs.$inferInsert>)
      .where(eq(aiEditJobs.id, id));

    // Re-generate EDL async
    let videoUrlsArr: string[];
    try {
      videoUrlsArr = job.videoUrls ? JSON.parse(job.videoUrls) : [job.videoUrl];
    } catch {
      videoUrlsArr = [job.videoUrl];
    }
    const reviseInput: EditJobInput = {
      planMinutes: (job.planMinutes ?? 15) as 15 | 30 | 45 | 60,
      videoUrls: videoUrlsArr,
      logoUrl: job.logoUrl,
      telop: job.telop,
      targetAudience: job.targetAudience,
      tone: job.tone,
      prompt: job.prompt,
    };

    (async () => {
      try {
        const plan = await generateEditPlan(reviseInput);
        await db
          .update(aiEditJobs)
          .set({ status: "completed", result: JSON.stringify(plan), updatedAt: new Date() } as Partial<typeof aiEditJobs.$inferInsert>)
          .where(eq(aiEditJobs.id, id));
      } catch (e) {
        console.error("[ai-edit] Revision failed:", e);
        await db
          .update(aiEditJobs)
          .set({ status: "failed", updatedAt: new Date() } as Partial<typeof aiEditJobs.$inferInsert>)
          .where(eq(aiEditJobs.id, id));
      }
    })();

    res.json({ ok: true, revisionCount: newRevisionCount, free: revisionCount === 0 });
  });

  // POST /api/ai-edit/jobs/:id/deliver — editor uploads the finished video and marks the job as delivered
  app.post("/api/ai-edit/jobs/:id/deliver", async (req: Request, res: Response) => {
    const editor = await getAuthUser(req);
    if (!editor) return res.status(401).json({ error: "Unauthorized" });

    const id = paramNum(req, "id");
    const { deliveredUrl } = req.body as { deliveredUrl?: string };

    if (!deliveredUrl?.trim()) {
      return res.status(400).json({ error: "deliveredUrl is required" });
    }

    const [job] = await db.select().from(aiEditJobs).where(eq(aiEditJobs.id, id));
    if (!job) return res.status(404).json({ error: "Job not found" });

    // Only the job owner or any authenticated editor may deliver
    // (expand access control here if you add an editor <-> job assignment table)
    if (job.status === "delivered") {
      return res.status(409).json({ error: "This job has already been delivered" });
    }
    if (!["approved", "completed"].includes(job.status)) {
      return res.status(400).json({ error: "Only approved or completed jobs can be delivered" });
    }

    const now = new Date();
    await db
      .update(aiEditJobs)
      .set({
        status: "delivered",
        deliveredUrl: deliveredUrl.trim(),
        deliveredAt: now,
        updatedAt: now,
      } as Partial<typeof aiEditJobs.$inferInsert>)
      .where(eq(aiEditJobs.id, id));

    // Send an in-app notification to the job owner
    try {
      const [owner] = await db.select().from(users).where(eq(users.id, job.userId));
      await db.insert(notifications).values({
        type: "ai_edit_delivered",
        title: "Your edited video is ready",
        body: `Your AI Edit job #${job.id}${job.planMinutes ? ` (${job.planMinutes}-min plan)` : ""} has been delivered. Tap to download.`,
        amount: null,
        avatar: owner?.avatar ?? null,
        thumbnail: null,
        timeAgo: "Just now",
      } as typeof notifications.$inferInsert);
    } catch (notifErr) {
      // Non-fatal — log but don't fail the delivery
      console.error("[ai-edit/deliver] Failed to send notification:", notifErr);
    }

    res.json({ ok: true, id, status: "delivered", deliveredUrl: deliveredUrl.trim() });
  });

}
