import type { Express, Request, Response } from "express";
import { db, type DbOrTx } from "./db";
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
  mentorBookings,
  mentorSessions,
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
  twoShotReservations,
  streamPaidAccess,
  TICKET_PACKS,
  bannerAds,
  dailyLogins,
  aiEditJobs,
  editingRequests,
  userFollows,
  dmThreads,
  dmThreadMessages,
  lpLeads,
} from "./schema";
import {
  eq,
  asc,
  desc,
  count,
  sql,
  and,
  or,
  gte,
  lte,
  isNull,
  inArray,
  isNotNull,
  type InferSelectModel,
  type SQL,
} from "drizzle-orm";
import {
  validateEditorPricing,
  parseTagsQueryParam,
  parseGenresQueryParam,
  normalizeEditorStyleTagSlugs,
} from "./editorPricing";
import { getUncachableStripeClient, getStripePublishableKey, createConnectExpressAccount, createConnectAccountLink, getConnectAccount, createBannerPaymentIntent, getPaymentIntentStatus, createTransferToConnectedAccount } from "./stripeClient";
import { getCreatorMonthlyRankings, getMonthlyRevenueRank, runMonthlyCreatorAggregation } from "./aggregateRevenue";
import { judgeReportContent } from "./claudeReport";
import { generateEditPlan, type EditJobInput } from "./aiEditAssistant";
import type { EditPlan } from "../shared/ai-edit";
import { normalizeVideoSpecPayload, parseStoredVideoSpec } from "./lib/parseVideoSpec";
import { buildAIEditStoredResult, parseAIEditStoredResult } from "./lib/aiEditArtifacts";
import { enqueueAIEditJob } from "./lib/aiEditJobQueue";
import {
  claimAndProcessNextPendingAIEditJob,
  processAIEditJobInline,
  runAIEditPlanWorker,
  useAIEditMemoryQueue,
} from "./lib/aiEditPlanWorker";
import { creditTicketsFromTicketCheckoutSession } from "./lib/stripeTicketPurchase";
import { computeWithdrawalFeeBreakdown, getWithdrawalFeePolicy } from "./lib/withdrawalFees";
import { dslToTemplated } from "./lib/dslToTemplated";
import { createTemplatedRender } from "./lib/templatedClient";
import { createSignedUploadUrl } from "./r2";
import { moderateContent } from "./moderation";
import { detectContentLang } from "./langFromText";
import { translateText } from "./lib/translate";
import { debugIngestServer } from "./debugIngest";
import { LEGAL_PRIVACY_VERSION, LEGAL_TERMS_VERSION } from "../constants/legalVersions";
import { parseThreadBody } from "../lib/parse-thread-body";
import { diversifyAnnouncementRowsByCommunity } from "./lib/diversifyAnnouncementFeed";
import {
  fetchCommunitiesForIds,
  fetchCommunitiesListOrdered,
  fetchCommunityById,
} from "./lib/communitiesCompat";
import { getCommunityDefaultAssets } from "../lib/community-default-assets";
import { publishJukeboxEvent, redis, jukeboxChannel, subscribeJukeboxEvents } from "./redis";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type Stripe from "stripe";

const JWT_SECRET = process.env.SESSION_SECRET ?? "livestage-dev-secret";
const CLOUDFLARE_ACCOUNT_ID = (process.env.CLOUDFLARE_ACCOUNT_ID ?? "").trim();
const CLOUDFLARE_STREAM_TOKEN = (process.env.CLOUDFLARE_STREAM_TOKEN ?? "").trim();
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();

function maskSecretPrefix(value: string): string {
  if (!value) return "(empty, len=0)";
  const prefix = value.slice(0, 3);
  return `${prefix}*** (len=${value.length})`;
}

/**
 * Google OAuth 完了後のリダイレクト先オリジン（末尾スラッシュなし)。
 * FRONTEND_URL を優先。未設定時は Vercel プレビュー用に VERCEL_URL、それもなければ本番。
 * Google Cloud の「承認済みのリダイレクト URI」に
 * `${origin}/api/auth/google-callback` を登録すること。
 */
function resolvePublicAppOrigin(): string {
  const fromEnv = process.env.FRONTEND_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}`;
  }
  return "https://rawstock.live";
}

/** Cloudflare client/v4 の errors 配列を 1 行に（デバッグ・ユーザー向け detail 用) */
function formatCloudflareApiErrors(errors: unknown): string {
  if (errors == null) return "";
  if (Array.isArray(errors)) {
    const parts = errors
      .map((e: unknown) => {
        if (e && typeof e === "object" && "message" in e) {
          const m = (e as { message?: unknown }).message;
          return typeof m === "string" ? m : "";
        }
        return "";
      })
      .filter(Boolean);
    return parts.join("; ");
  }
  return "";
}

function makeToken(userId: number) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "90d" });
}

/** req.params / req.query を string に正規化（Express は string | string[]) */
function paramStr(req: Request, key: string): string {
  const v = req.params[key];
  return Array.isArray(v) ? v[0] ?? "" : (v ?? "");
}
function paramNum(req: Request, key: string): number {
  return parseInt(paramStr(req, key), 10) || 0;
}

function formatTimeAgo(d: Date | string | null | undefined): string {
  if (!d) return "Just now";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "Just now";
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
  if (diffDay < 365) return `${Math.floor(diffDay / 30)}mo ago`;
  return `${Math.floor(diffDay / 365)}y ago`;
}

/** req.query の値を string に正規化（Express の ParsedQs を string に統一) */
function queryStr(req: Request, key: string): string {
  const v = req.query[key];
  if (Array.isArray(v)) return typeof v[0] === "string" ? v[0] : "";
  return typeof v === "string" ? v : "";
}

/** ISO 639-1 として許容する翻訳宛先言語（Auth・自動翻訳の両方で利用） */
const SUPPORTED_PREFERRED_LANGUAGES = new Set([
  "en", "ja", "ko", "zh", "es", "fr", "de", "pt", "it", "vi", "th", "id", "ru", "ar",
]);

function normalizePreferredLanguage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const lower = value.trim().toLowerCase();
  if (!lower) return null;
  // ja-JP のような BCP-47 を ISO 639-1 へ縮約
  const base = lower.split(/[-_]/u)[0];
  return SUPPORTED_PREFERRED_LANGUAGES.has(base) ? base : null;
}

/** Accept-Language ヘッダから第一希望の言語を抽出（preferredLanguage 未指定時のフォールバック） */
function preferredLanguageFromHeader(req: Request): string | null {
  const raw = (req.headers["accept-language"] ?? "") as string;
  if (!raw) return null;
  const first = raw.split(",")[0]?.trim();
  return normalizePreferredLanguage(first);
}

/** 翻訳エンドポイントの簡易レート制限（ユーザーごと、1 分 30 リクエスト） */
const TRANSLATE_RATE_WINDOW_MS = 60_000;
const TRANSLATE_RATE_LIMIT = 30;
const translateRateBuckets = new Map<number, { windowStart: number; count: number }>();

function checkTranslateRateLimit(userId: number): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const bucket = translateRateBuckets.get(userId);
  if (!bucket || now - bucket.windowStart >= TRANSLATE_RATE_WINDOW_MS) {
    translateRateBuckets.set(userId, { windowStart: now, count: 1 });
    return { ok: true };
  }
  if (bucket.count >= TRANSLATE_RATE_LIMIT) {
    const retryAfterSec = Math.ceil(
      (TRANSLATE_RATE_WINDOW_MS - (now - bucket.windowStart)) / 1000,
    );
    return { ok: false, retryAfterSec };
  }
  bucket.count += 1;
  return { ok: true };
}

/** JWT 後に routes が参照するユーザー形（DB の users 行と一致） */
type SessionUser = {
  id: number;
  displayName: string;
  profileImageUrl: string | null;
  avatar: string | null;
  role: string;
  bio: string;
  stripeConnectId: string | null;
  lastContentLang: string | null;
  preferredLanguage: string | null;
  termsAcceptedVersion: string | null;
  termsAcceptedAt: Date | null;
  privacyAcceptedVersion: string | null;
  privacyAcceptedAt: Date | null;
};

function sessionUserFromRow(user: InferSelectModel<typeof users>): SessionUser {
  return {
    id: user.id,
    displayName: user.displayName,
    profileImageUrl: user.profileImageUrl,
    avatar: user.profileImageUrl,
    role: user.role,
    bio: user.bio,
    stripeConnectId: user.stripeConnectId,
    lastContentLang: user.lastContentLang ?? null,
    preferredLanguage: user.preferredLanguage ?? null,
    termsAcceptedVersion: user.termsAcceptedVersion ?? null,
    termsAcceptedAt: user.termsAcceptedAt ?? null,
    privacyAcceptedVersion: user.privacyAcceptedVersion ?? null,
    privacyAcceptedAt: user.privacyAcceptedAt ?? null,
  };
}

async function getAuthUser(req: Request): Promise<SessionUser | null> {
  const auth = (req as any).headers?.authorization ?? "";
  if (!auth.startsWith("Bearer ")) {
    debugIngestServer({
      sessionId: "88cb7d",
      runId: "initial",
      hypothesisId: "H4",
      location: "server/routes.ts:getAuthUser",
      message: "Missing bearer token",
      data: { hasAuthHeader: Boolean(auth), authPrefix: typeof auth === "string" ? auth.slice(0, 16) : "" },
      timestamp: Date.now(),
    });
    return null;
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    if (typeof payload === "string" || !payload || typeof (payload as unknown as { sub?: number }).sub !== "number") return null;
    const sub = (payload as unknown as { sub: number }).sub;
    const [user] = await db.select().from(users).where(eq(users.id, sub));
    if (!user) return null;
    debugIngestServer({
      sessionId: "88cb7d",
      runId: "initial",
      hypothesisId: "H4",
      location: "server/routes.ts:getAuthUser",
      message: "Authenticated request",
      data: { userId: user.id },
      timestamp: Date.now(),
    });
    return sessionUserFromRow(user);
  } catch {
    return null;
  }
}

/** 検知できたときだけ users.last_content_lang を更新。失敗しても例外は投げない。 */
async function syncUserLastContentLang(userId: number, rawText: string): Promise<void> {
  try {
    const lang = await detectContentLang(rawText);
    if (!lang) return;
    await db
      .update(users)
      .set({ lastContentLang: lang, updatedAt: new Date() } as Partial<InferSelectModel<typeof users>>)
      .where(eq(users.id, userId));
  } catch (e) {
    console.warn("syncUserLastContentLang skipped:", e);
  }
}

/** GET /api/auth/me 等: 条項・プライバシー同意状態（constants/legalVersions と突合) */
function policyFieldsForApi(u: {
  termsAcceptedVersion?: string | null;
  termsAcceptedAt?: Date | null;
  privacyAcceptedVersion?: string | null;
  privacyAcceptedAt?: Date | null;
}) {
  const tv = u.termsAcceptedVersion ?? null;
  const pv = u.privacyAcceptedVersion ?? null;
  return {
    currentTermsVersion: LEGAL_TERMS_VERSION,
    currentPrivacyVersion: LEGAL_PRIVACY_VERSION,
    termsAcceptedVersion: tv,
    termsAcceptedAt: u.termsAcceptedAt ? new Date(u.termsAcceptedAt).toISOString() : null,
    privacyAcceptedVersion: pv,
    privacyAcceptedAt: u.privacyAcceptedAt ? new Date(u.privacyAcceptedAt).toISOString() : null,
    needsTermsReacceptance: tv !== LEGAL_TERMS_VERSION,
    needsPrivacyReacceptance: pv !== LEGAL_PRIVACY_VERSION,
  };
}

function isAdminRole(role: string | null | undefined): boolean {
  return (role ?? "").toUpperCase() === "ADMIN";
}

async function getAdminUserOrReject(req: Request, res: Response) {
  const user = await getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  if (!isAdminRole(user.role)) {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }
  return user;
}

async function promoteAdminByEmail(target?: { id: number; email: string | null | undefined }) {
  if (!ADMIN_EMAIL) return;

  if (target) {
    const normalized = (target.email ?? "").trim().toLowerCase();
    if (normalized !== ADMIN_EMAIL) return;
    await db
      .update(users)
      .set({ role: "ADMIN", updatedAt: new Date() } as Partial<InferSelectModel<typeof users>>)
      .where(eq(users.id, target.id));
    return;
  }

  await db
    .update(users)
    .set({ role: "ADMIN", updatedAt: new Date() } as Partial<InferSelectModel<typeof users>>)
    .where(eq(users.email, ADMIN_EMAIL));
}

const OPERATIONS_DM_NAME = "Operations Team";
const OPERATIONS_DM_AVATAR = "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=100&h=100&fit=crop";
const WELCOME_DM_TEXT = [
  "Welcome to RawStock — we're the Operations Team.",
  "",
  "Here's how to get started:",
  "",
  "Everyone",
  "• Sign in with Google to comment, buy tickets, upload, and manage your profile.",
  "• Open My Page → Edit profile to add a photo, bio, and social links.",
  "• Explore communities, join the ones you like, and chat with members.",
  "",
  "Fans",
  "• Buy tickets and use them for paid videos, live gifts, jukebox requests in communities, and more.",
  "• Follow creators from their profile to stay updated.",
  "",
  "Creators",
  "• Upload videos and set a price to sell. Use the AI Edit Assistant to polish raw footage.",
  "• Go live from the web / PWA broadcaster to connect with fans in real time.",
  "• Open Revenue to see earnings and request payouts (Stripe Connect setup required).",
  "",
  "Community hosts",
  "• Run a community: member activity can generate shared revenue (e.g. ads, jukebox).",
  "",
  "Questions? Reply to this DM anytime.",
].join("\n");

/** 運営DM行が無い環境でも一覧からガイドを開けるようにする */
async function ensureOperationsDmRow() {
  const [existing] = await db.select().from(dmMessages).where(eq(dmMessages.name, OPERATIONS_DM_NAME));
  if (existing) return existing;
  try {
    const previewLine =
      WELCOME_DM_TEXT.split("\n").find((line) => line.trim().length > 0) ?? "Welcome to RawStock";
    const [created] = await db
      .insert(dmMessages)
      .values({
        name: OPERATIONS_DM_NAME,
        avatar: OPERATIONS_DM_AVATAR,
        lastMessage: previewLine.slice(0, 500),
        time: "Just now",
        unread: 0,
        online: true,
        sortOrder: 0,
      } as typeof dmMessages.$inferInsert)
      .returning();
    if (created) {
      await db.insert(dmConversationMessages).values({
        dmId: created.id,
        sender: "them",
        text: WELCOME_DM_TEXT,
        isRead: false,
      } as typeof dmConversationMessages.$inferInsert);
    }
    return created;
  } catch {
    const [again] = await db.select().from(dmMessages).where(eq(dmMessages.name, OPERATIONS_DM_NAME));
    return again;
  }
}

function formatDmThreadTime(d: Date | null | undefined): string {
  if (!d) return "";
  const t = d instanceof Date ? d.getTime() : new Date(d as string).getTime();
  if (Number.isNaN(t)) return "";
  const ms = Date.now() - t;
  const m = Math.floor(ms / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  const dt = new Date(t);
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
}

async function sendWelcomeDmIfNeeded(userId: number): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      const [claimed] = await tx
        .update(users)
        .set({ welcomeDmSentAt: new Date(), updatedAt: new Date() } as Partial<InferSelectModel<typeof users>>)
        .where(and(eq(users.id, userId), isNull(users.welcomeDmSentAt)))
        .returning({ id: users.id });

      if (!claimed) return;

      let [operationsDm] = await tx
        .select()
        .from(dmMessages)
        .where(eq(dmMessages.name, OPERATIONS_DM_NAME));

      if (!operationsDm) {
        [operationsDm] = await tx
          .insert(dmMessages)
          .values({
            name: OPERATIONS_DM_NAME,
            avatar: OPERATIONS_DM_AVATAR,
            lastMessage: WELCOME_DM_TEXT,
            time: "Just now",
            unread: 1,
            online: true,
            sortOrder: 0,
          } as typeof dmMessages.$inferInsert)
          .returning();
      } else {
        const [updatedDm] = await tx
          .update(dmMessages)
          .set({
            lastMessage: WELCOME_DM_TEXT,
            time: "Just now",
            unread: (operationsDm.unread ?? 0) + 1,
            online: true,
          } as Partial<InferSelectModel<typeof dmMessages>>)
          .where(eq(dmMessages.id, operationsDm.id))
          .returning();
        operationsDm = updatedDm ?? operationsDm;
      }

      await tx.insert(dmConversationMessages).values({
        dmId: operationsDm.id,
        sender: "them",
        text: WELCOME_DM_TEXT,
        isRead: false,
      } as typeof dmConversationMessages.$inferInsert);
    });
  } catch (error) {
    console.error("Failed to send welcome DM:", error);
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
async function getOrCreateUserWallet(userId: number, executor: DbOrTx = db): Promise<number> {
  const [w] = await executor.select().from(wallets).where(and(eq(wallets.userId, userId), isNull(wallets.kind)));
  if (w) return w.id;
  const [created] = await executor
    .insert(wallets)
    .values({ userId, kind: null } as typeof wallets.$inferInsert)
    .returning();
  return created.id;
}

type RevenueSource = "tip" | "paid_live" | "mentor";

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

async function ensureDefaultLevelThresholds(executor: DbOrTx = db) {
  const rows = await executor.select().from(creatorLevelThresholds).orderBy(asc(creatorLevelThresholds.level));
  if (rows.length > 0) return rows;
  await executor.insert(creatorLevelThresholds).values(
    DEFAULT_LEVEL_THRESHOLDS.map((t) => ({
      level: t.level,
      requiredTipGross: t.requiredTipGross,
      requiredStreamCount: t.requiredStreamCount,
      tipBackRate: t.tipBackRate,
    })) as unknown as typeof creatorLevelThresholds.$inferInsert[],
  );
  return executor.select().from(creatorLevelThresholds).orderBy(asc(creatorLevelThresholds.level));
}

async function syncCreatorLevelFromMonthlyProgress(
  creatorId: number,
  yearMonth: string,
  executor: DbOrTx = db,
): Promise<number> {
  const thresholds = await ensureDefaultLevelThresholds(executor);
  const [score] = await executor
    .select()
    .from(creatorMonthlyScores)
    .where(and(eq(creatorMonthlyScores.creatorId, creatorId), eq(creatorMonthlyScores.yearMonth, yearMonth)));
  const tipGross = score?.tipGross ?? 0;
  const streamCountMonthly = score?.streamCountMonthly ?? 0;
  const achieved = thresholds.reduce((acc, t) => {
    if (tipGross >= t.requiredTipGross && streamCountMonthly >= t.requiredStreamCount) return Math.max(acc, t.level);
    return acc;
  }, 1);
  await executor
    .update(creators)
    .set({ currentLevel: achieved } as Partial<InferSelectModel<typeof creators>>)
    .where(eq(creators.id, creatorId));
  return achieved;
}

async function upsertCreatorMonthlyRevenue(
  creatorId: number,
  yearMonth: string,
  source: RevenueSource,
  grossAmount: number,
  executor: DbOrTx = db,
): Promise<void> {
  const [existing] = await executor
    .select()
    .from(creatorMonthlyScores)
    .where(and(eq(creatorMonthlyScores.creatorId, creatorId), eq(creatorMonthlyScores.yearMonth, yearMonth)));
  if (!existing) {
    await executor.insert(creatorMonthlyScores).values({
      creatorId,
      yearMonth,
      tipGross: source === "tip" ? grossAmount : 0,
      paidLiveGross: source === "tip" ? 0 : grossAmount,
    } as typeof creatorMonthlyScores.$inferInsert);
    return;
  }
  await executor
    .update(creatorMonthlyScores)
    .set({
      tipGross: source === "tip" ? existing.tipGross + grossAmount : existing.tipGross,
      paidLiveGross: source === "tip" ? existing.paidLiveGross : existing.paidLiveGross + grossAmount,
      updatedAt: new Date(),
    } as Partial<InferSelectModel<typeof creatorMonthlyScores>>)
    .where(eq(creatorMonthlyScores.id, existing.id));
}

/** 収益を transactions に type: 'REVENUE' で記録（月末ランク集計用) */
async function recordRevenue(
  walletId: number,
  userId: number,
  creatorId: number | null,
  amount: number,
  source: RevenueSource,
  referenceId: string | null,
  executor: DbOrTx = db,
) {
  const yearMonth = getYearMonth();
  let backRate = 0.9; // paid_live/mentor は常に 90%
  if (source === "tip") {
    const thresholds = await ensureDefaultLevelThresholds(executor);
    const [creator] = creatorId ? await executor.select().from(creators).where(eq(creators.id, creatorId)) : [];
    const level = creator?.currentLevel ?? 1;
    const rate = thresholds.find((t) => t.level === level)?.tipBackRate;
    backRate = typeof rate === "number" ? rate : 0.5;
  }
  const netAmount = Math.floor(amount * backRate);
  await executor.insert(transactions).values({
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

  await executor.insert(earnings).values({
    userId: `user-${userId}`,
    type: source,
    title: source === "tip" ? "Tip revenue" : "Paid live revenue",
    amount,
    revenueShare: Math.round(backRate * 100),
    netAmount,
  } as typeof earnings.$inferInsert);

  if (creatorId) {
    const [creator] = await executor.select().from(creators).where(eq(creators.id, creatorId));
    if (creator) {
      await executor
        .update(creators)
        .set({
          revenue: creator.revenue + amount,
          revenueShare: Math.round(backRate * 100),
        } as Partial<InferSelectModel<typeof creators>>)
        .where(eq(creators.id, creatorId));
    }
    await upsertCreatorMonthlyRevenue(creatorId, yearMonth, source, amount, executor);
    await syncCreatorLevelFromMonthlyProgress(creatorId, yearMonth, executor);
  }
}

/** `mentor_sessions.creator_id` 等の users.id から creators 行を解決（creators.name ↔ users.displayName） */
async function creatorRowForUserId(executor: DbOrTx, userId: number) {
  const [u] = await executor
    .select({ displayName: users.displayName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!u) return undefined;
  const [row] = await executor.select().from(creators).where(eq(creators.name, u.displayName)).limit(1);
  return row;
}

/** 有料動画の売上分配先 users.id（videos.user_id 優先、無ければ creator 表示名で users を照会）。hidden は除外 */
async function resolveVideoSellerUserId(executor: DbOrTx, videoId: number): Promise<number | null> {
  const [row] = await executor.select().from(videos).where(eq(videos.id, videoId)).limit(1);
  if (!row || row.hidden) return null;
  if (row.userId != null && Number.isInteger(row.userId) && row.userId > 0) return row.userId;
  const [creatorUser] = await executor
    .select({ id: users.id })
    .from(users)
    .where(eq(users.displayName, row.creator))
    .limit(1);
  return creatorUser?.id ?? null;
}

export async function registerRoutes(app: Express): Promise<void> {
  await promoteAdminByEmail();

  // ── LP lead capture (email / LINE) ───────────────────────────────
  app.post("/api/lp/leads", async (req: Request, res: Response) => {
    const rawEmail = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const source = typeof req.body?.source === "string" ? req.body.source.trim().toLowerCase() : "email_form";
    const locale = typeof req.body?.locale === "string" ? req.body.locale.trim().slice(0, 16) : null;
    const campaign = typeof req.body?.campaign === "string" ? req.body.campaign.trim().slice(0, 120) : null;

    if (!rawEmail) {
      return res.status(400).json({ error: "Email is required" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    if (source !== "email_form" && source !== "line_cta") {
      return res.status(400).json({ error: "Invalid source" });
    }

    try {
      const [row] = await db
        .insert(lpLeads)
        .values({
          email: rawEmail,
          source,
          locale,
          campaign,
        })
        .onConflictDoUpdate({
          target: lpLeads.email,
          set: { source, locale, campaign, updatedAt: new Date() },
        })
        .returning({ id: lpLeads.id });
      return res.json({ ok: true, id: row?.id ?? null });
    } catch (error) {
      console.error("[lp-leads] upsert failed", error);
      return res.status(500).json({ error: "Failed to save lead" });
    }
  });

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
    const preferredLanguage =
      normalizePreferredLanguage(req.body?.preferredLanguage) ??
      preferredLanguageFromHeader(req);
    const [user] = await db.insert(users).values({
      lineId,
      displayName,
      email,
      passwordHash: hash,
      role: "USER",
      bio: "",
      preferredLanguage,
    } as typeof users.$inferInsert).returning();
    await promoteAdminByEmail({ id: user.id, email: user.email });
    await sendWelcomeDmIfNeeded(user.id);
    const token = makeToken(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.displayName,
        email: user.email,
        preferredLanguage: user.preferredLanguage ?? null,
      },
    });
  });

  /** Demo login removed for production launch; keep route so old clients get a clear error. */
  app.post("/api/auth/demo", (_req: Request, res: Response) => {
    return res.status(403).json({ error: "Demo login is disabled", code: "DEMO_DISABLED" });
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
    await promoteAdminByEmail({ id: user.id, email: user.email });
    await sendWelcomeDmIfNeeded(user.id);
    // 既存ユーザーで preferredLanguage 未設定なら、送信値 or Accept-Language で初期化
    let preferredLanguage = user.preferredLanguage ?? null;
    if (!preferredLanguage) {
      const guess =
        normalizePreferredLanguage(req.body?.preferredLanguage) ??
        preferredLanguageFromHeader(req);
      if (guess) {
        try {
          await db
            .update(users)
            .set({ preferredLanguage: guess, updatedAt: new Date() } as Partial<InferSelectModel<typeof users>>)
            .where(eq(users.id, user.id));
          preferredLanguage = guess;
        } catch (e) {
          console.warn("login preferredLanguage backfill failed", e);
        }
      }
    } else {
      // ログインボディで明示指定された場合は上書き許可
      const explicit = normalizePreferredLanguage(req.body?.preferredLanguage);
      if (explicit && explicit !== preferredLanguage) {
        try {
          await db
            .update(users)
            .set({ preferredLanguage: explicit, updatedAt: new Date() } as Partial<InferSelectModel<typeof users>>)
            .where(eq(users.id, user.id));
          preferredLanguage = explicit;
        } catch (e) {
          console.warn("login preferredLanguage update failed", e);
        }
      }
    }
    const token = makeToken(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.displayName,
        email: user.email,
        preferredLanguage,
      },
    });
  });

  // ── Auth ──────────────────────────────────────────────
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "private, no-store");
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const [u] = await db.select({
      pinnedCommunityIds: users.pinnedCommunityIds,
    }).from(users).where(eq(users.id, user.id));
    let pinnedCommunityIds: number[] = [];
    if (u) {
      if ((u as any).pinnedCommunityIds) {
        try {
          const p = JSON.parse((u as any).pinnedCommunityIds) as number[];
          if (Array.isArray(p)) pinnedCommunityIds = p;
        } catch {}
      }
    }
    const payoutTermsAt = (user as { payoutTermsAgreedAt?: Date | null }).payoutTermsAgreedAt;
    res.json({
      id: user.id,
      name: user.displayName,
      displayName: user.displayName,
      profileImageUrl: user.profileImageUrl,
      avatar: user.profileImageUrl,
      role: user.role,
      bio: user.bio,
      lastContentLang: user.lastContentLang ?? null,
      preferredLanguage: user.preferredLanguage ?? null,
      stripeConnectId: user.stripeConnectId ?? null,
      payoutTermsAgreedAt: payoutTermsAt ? new Date(payoutTermsAt).toISOString() : null,
      spotifyUrl: (user as any).spotifyUrl ?? null,
      appleMusicUrl: (user as any).appleMusicUrl ?? null,
      bandcampUrl: (user as any).bandcampUrl ?? null,
      instagramUrl: (user as any).instagramUrl ?? null,
      youtubeUrl: (user as any).youtubeUrl ?? null,
      xUrl: (user as any).xUrl ?? null,
      phoneNumber: (user as any).phoneNumber ?? null,
      pinnedCommunityIds,
      ...policyFieldsForApi(user),
    });
  });

  // ── 自動翻訳（手動トリガー） ────────────────────────────────
  app.get("/api/translate/preferred-language", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    res.json({
      preferredLanguage: user.preferredLanguage ?? null,
      lastContentLang: user.lastContentLang ?? null,
      supported: Array.from(SUPPORTED_PREFERRED_LANGUAGES),
    });
  });

  app.patch("/api/translate/preferred-language", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const next = normalizePreferredLanguage(req.body?.preferredLanguage);
    if (!next) {
      return res.status(400).json({
        error: "Unsupported language",
        supported: Array.from(SUPPORTED_PREFERRED_LANGUAGES),
      });
    }
    await db
      .update(users)
      .set({ preferredLanguage: next, updatedAt: new Date() } as Partial<InferSelectModel<typeof users>>)
      .where(eq(users.id, user.id));
    res.json({ preferredLanguage: next });
  });

  app.post("/api/translate", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const limit = checkTranslateRateLimit(user.id);
    if (!limit.ok) {
      if (limit.retryAfterSec) res.setHeader("Retry-After", String(limit.retryAfterSec));
      return res.status(429).json({
        error: "Too many translation requests",
        retryAfterSec: limit.retryAfterSec,
      });
    }

    const text = typeof req.body?.text === "string" ? req.body.text : "";
    if (!text.trim()) {
      return res.status(400).json({ error: "text is required" });
    }
    const MAX_TRANSLATE_LENGTH = 5000;
    if (text.length > MAX_TRANSLATE_LENGTH) {
      return res.status(413).json({
        error: `text exceeds ${MAX_TRANSLATE_LENGTH} chars`,
      });
    }

    const explicitDst = normalizePreferredLanguage(req.body?.dstLang);
    const dstLang = explicitDst ?? user.preferredLanguage ?? preferredLanguageFromHeader(req) ?? "en";

    const explicitSrc = normalizePreferredLanguage(req.body?.srcLang);
    let srcLang = explicitSrc ?? null;
    if (!srcLang) {
      const detected = await detectContentLang(text);
      srcLang = detected ?? null;
    }
    if (!srcLang) {
      // 検知不能。dstLang と同じと仮定して原文返却（エンジン無駄打ち防止）
      return res.json({
        text,
        srcLang: null,
        dstLang,
        skipped: true,
        skipReason: "src_unknown",
        engine: "mymemory",
        fromCache: false,
      });
    }

    const result = await translateText({ text, srcLang, dstLang });
    res.json({
      text: result.text,
      srcLang,
      dstLang,
      skipped: result.skipped,
      skipReason: result.skipReason ?? null,
      fromCache: result.fromCache,
      engine: result.engine,
      error: result.error ?? false,
    });
  });

  /** 現行の Terms / Privacy 版への同意を記録（条項更新後の再同意用) */
  app.post("/api/auth/accept-policies", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const { acceptTerms, acceptPrivacy } = req.body as { acceptTerms?: boolean; acceptPrivacy?: boolean };
    const doTerms = acceptTerms !== false;
    const doPrivacy = acceptPrivacy !== false;
    const now = new Date();
    const patch: Partial<InferSelectModel<typeof users>> = { updatedAt: now };
    if (doTerms) {
      patch.termsAcceptedVersion = LEGAL_TERMS_VERSION;
      patch.termsAcceptedAt = now;
    }
    if (doPrivacy) {
      patch.privacyAcceptedVersion = LEGAL_PRIVACY_VERSION;
      patch.privacyAcceptedAt = now;
    }
    const [row] = await db.update(users).set(patch).where(eq(users.id, user.id)).returning();
    res.json({
      ok: true,
      ...policyFieldsForApi(row),
    });
  });

  // ── Stripe Connect（出金先連携)────────────────────────────────────────
  app.post("/api/connect/payout-terms-agree", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const now = new Date();
    await db
      .update(users)
      .set({ payoutTermsAgreedAt: now, updatedAt: now } as Partial<InferSelectModel<typeof users>>)
      .where(eq(users.id, user.id));
    res.json({ ok: true, payoutTermsAgreedAt: now.toISOString() });
  });

  app.post("/api/connect/onboard", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const [ptRow] = await db
      .select({ payoutTermsAgreedAt: users.payoutTermsAgreedAt })
      .from(users)
      .where(eq(users.id, user.id));
    if (!ptRow?.payoutTermsAgreedAt) {
      return res.status(400).json({
        error:
          "Please accept the creator payout terms. Review them in Payout Settings, then connect Stripe after agreeing.",
      });
    }

    try {
      const baseUrl = "https://rawstock.live";
      const returnUrl = `${baseUrl}/payout-settings?connect=return`;
      const refreshUrl = `${baseUrl}/payout-settings?connect=refresh`;

      let accountId = user
      .stripeConnectId;
      if (!accountId) {
        accountId = await createConnectExpressAccount({ country: "JP" });
        await db.update(users).set({ stripeConnectId: accountId, updatedAt: new Date() } as Partial<InferSelectModel<typeof users>>).where(eq(users.id, user.id));
      }

      const url = await createConnectAccountLink({ accountId, returnUrl, refreshUrl });
      res.json({ url, accountId });
    } catch (e: any) {
      console.error("Connect onboard error:", e);
      res.status(500).json({ error: e.message ?? "Failed to prepare Stripe Connect" });
    }
  });

  app.get("/api/connect/status", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

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

  // ── バナー広告：決済・分配（人数×5セント×日数、最低$100)────────────────────
  const BANNER_MIN_AMOUNT = 10_000;
  const BANNER_RATE_MODERATOR = 0.2;
  const BANNER_RATE_ADMIN = 0.2;
  const BANNER_RATE_EVENT = 0.1;
  const BANNER_RATE_PLATFORM = 0.5;

  app.post("/api/banner/checkout", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const { people, days } = req.body as { people?: number; days?: number };
    const p = Math.max(1, Number(people) || 1);
    const d = Math.max(1, Number(days) || 1);
    const amountUSD = Math.max(BANNER_MIN_AMOUNT, p * 5 * d);

    try {
      const { clientSecret, paymentIntentId } = await createBannerPaymentIntent({
        amountUSD,
        metadata: { userId: String(user.id), people: String(p), days: String(d), type: "banner_ad" },
      });
      res.json({ clientSecret, paymentIntentId, amountUSD });
    } catch (e: any) {
      console.error("Banner checkout error:", e);
      res.status(500).json({ error: e.message ?? "Failed to prepare payment" });
    }
  });

  app.post("/api/banner/confirm", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const { paymentIntentId } = req.body as { paymentIntentId?: string };
    if (!paymentIntentId) return res.status(400).json({ error: "paymentIntentId is required" });

    const status = await getPaymentIntentStatus(paymentIntentId);
    if (status !== "succeeded") {
      return res.status(400).json({ error: "Payment has not completed" });
    }

    const stripe = await getUncachableStripeClient();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    const amountUSD = pi.amount;

    const sys = await getOrCreateSystemWallets();
    const amountMod = Math.floor(amountUSD * BANNER_RATE_MODERATOR);
    const amountAdmin = Math.floor(amountUSD * BANNER_RATE_ADMIN);
    const amountEvent = Math.floor(amountUSD * BANNER_RATE_EVENT);
    const amountPlatform = amountUSD - amountMod - amountAdmin - amountEvent;

    await db.insert(transactions).values(([
      { walletId: sys.MODERATOR, amount: amountMod, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId },
      { walletId: sys.ADMIN, amount: amountAdmin, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId },
      { walletId: sys.EVENT_RESERVE, amount: amountEvent, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId },
      { walletId: sys.PLATFORM, amount: amountPlatform, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId },
    ] as unknown) as typeof transactions.$inferInsert[]);

    res.json({ ok: true, amountUSD, split: { moderator: amountMod, admin: amountAdmin, eventReserve: amountEvent, platform: amountPlatform } });
  });

  // コミュニティ広告バナー用 Stripe Checkout（3日間 $100)
  const BANNER_CHECKOUT_DAYS = 3;
  const BANNER_CHECKOUT_AMOUNT_USD = 10_000;

  app.post("/api/banner/checkout-session", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    try {
      const stripe = await getUncachableStripeClient();
      const baseUrl = "https://rawstock.live";

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: BANNER_CHECKOUT_AMOUNT_USD,
              product_data: {
                name: "Community ad banner (3 days)",
                description: `Community page ad banner slot, 3-day run ($${(BANNER_CHECKOUT_AMOUNT_USD / 100).toFixed(2)})`,
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
      res.status(500).json({ error: e.message ?? "Failed to prepare payment" });
    }
  });

  app.post("/api/banner/confirm-session", async (req: Request, res: Response) => {
    const { sessionId } = req.body as { sessionId?: string };
    if (!sessionId) return res.status(400).json({ error: "sessionId is required" });

    try {
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== "paid") {
        return res.status(400).json({ error: "Payment has not completed" });
      }

      const amountUSD = session.amount_total ?? BANNER_CHECKOUT_AMOUNT_USD;
      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? session.id;

      const sys = await getOrCreateSystemWallets();
      const amountMod = Math.floor(amountUSD * BANNER_RATE_MODERATOR);
      const amountAdmin = Math.floor(amountUSD * BANNER_RATE_ADMIN);
      const amountEvent = Math.floor(amountUSD * BANNER_RATE_EVENT);
      const amountPlatform = amountUSD - amountMod - amountAdmin - amountEvent;

      await db.insert(transactions).values(([
        { walletId: sys.MODERATOR, amount: amountMod, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId },
        { walletId: sys.ADMIN, amount: amountAdmin, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId },
        { walletId: sys.EVENT_RESERVE, amount: amountEvent, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId },
        { walletId: sys.PLATFORM, amount: amountPlatform, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId },
      ] as unknown) as typeof transactions.$inferInsert[]);

      res.json({
        ok: true,
        amountUSD,
        split: { moderator: amountMod, admin: amountAdmin, eventReserve: amountEvent, platform: amountPlatform },
      });
    } catch (e: any) {
      console.error("Banner confirm-session error:", e);
      res.status(500).json({ error: e.message ?? "Failed to confirm payment" });
    }
  });

  // ── 2-shot (1:1) paid session — mock slots + Stripe Checkout + webhook confirmation ──
  function buildMockTwoShotSlots(hostId: number): {
    slotKey: string;
    label: string;
    scheduledAt: string;
    durationMinutes: number;
    priceJpy: number;
  }[] {
    const d1 = new Date();
    d1.setUTCDate(d1.getUTCDate() + 1);
    d1.setUTCHours(11, 0, 0, 0);
    const d2 = new Date(d1);
    d2.setUTCDate(d2.getUTCDate() + 1);
    d2.setUTCHours(18, 0, 0, 0);
    const d3 = new Date(d1);
    d3.setUTCDate(d3.getUTCDate() + 3);
    d3.setUTCHours(12, 30, 0, 0);
    return [
      { slotKey: `${hostId}-slot-a`, label: "Tomorrow 20:00 JST (30 min)", scheduledAt: d1.toISOString(), durationMinutes: 30, priceJpy: 3000 },
      { slotKey: `${hostId}-slot-b`, label: "Day after · Evening (30 min)", scheduledAt: d2.toISOString(), durationMinutes: 30, priceJpy: 3000 },
      { slotKey: `${hostId}-slot-c`, label: "+3 days · Noon (45 min)", scheduledAt: d3.toISOString(), durationMinutes: 45, priceJpy: 4500 },
    ];
  }

  app.get("/api/two-shot/slots", async (req: Request, res: Response) => {
    const hostId = parseInt(String((req as any).query?.hostId ?? ""), 10);
    if (!Number.isFinite(hostId) || hostId <= 0) {
      return res.status(400).json({ error: "hostId is required" });
    }
    const [host] = await db.select({ id: users.id }).from(users).where(eq(users.id, hostId)).limit(1);
    if (!host) return res.status(404).json({ error: "Host not found" });
    return res.json({ hostId, slots: buildMockTwoShotSlots(hostId) });
  });

  app.get("/api/two-shot/reservations/:id", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const id = paramNum(req, "id");
    const [row] = await db.select().from(twoShotReservations).where(eq(twoShotReservations.id, id)).limit(1);
    if (!row) return res.status(404).json({ error: "Not found" });
    if (row.hostUserId !== user.id && row.guestUserId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return res.json(row);
  });

  app.post("/api/checkout/2shot", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const { hostId, slotKey, origin } = req.body as {
      hostId?: number;
      slotKey?: string;
      origin?: string;
    };
    if (!hostId || hostId <= 0 || !slotKey || typeof slotKey !== "string") {
      return res.status(400).json({ error: "hostId and slotKey are required" });
    }
    if (hostId === user.id) {
      return res.status(400).json({ error: "You cannot book your own slot" });
    }
    const [host] = await db.select({ id: users.id }).from(users).where(eq(users.id, hostId)).limit(1);
    if (!host) return res.status(404).json({ error: "Host not found" });

    const slots = buildMockTwoShotSlots(hostId);
    const slot = slots.find((s) => s.slotKey === slotKey);
    if (!slot) return res.status(400).json({ error: "Invalid slot" });

    const baseOrigin = (typeof origin === "string" && origin.startsWith("http") ? origin : resolvePublicAppOrigin()).replace(
      /\/$/,
      "",
    );

    try {
      const stripe = await getUncachableStripeClient();
      const [reservation] = await db
        .insert(twoShotReservations)
        .values({
          hostUserId: hostId,
          guestUserId: user.id,
          scheduledAt: new Date(slot.scheduledAt),
          durationMinutes: slot.durationMinutes,
          status: "PENDING",
          slotKey: slot.slotKey,
        } as typeof twoShotReservations.$inferInsert)
        .returning();

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "jpy",
              unit_amount: slot.priceJpy,
              product_data: {
                name: `2-shot session · ${slot.label}`,
                description: `Host #${hostId} — 1:1 paid stream (reservation #${reservation.id})`,
              },
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${baseOrigin}/two-shot/success?reservationId=${reservation.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseOrigin}/two-shot/reserve?hostId=${hostId}`,
        client_reference_id: String(reservation.id),
        metadata: {
          type: "two_shot_reservation",
          reservationId: String(reservation.id),
          hostUserId: String(hostId),
          guestUserId: String(user.id),
        },
      });

      await db
        .update(twoShotReservations)
        .set({ stripeCheckoutSessionId: session.id } as Partial<InferSelectModel<typeof twoShotReservations>>)
        .where(eq(twoShotReservations.id, reservation.id));

      return res.json({ url: session.url, sessionId: session.id, reservationId: reservation.id });
    } catch (e: any) {
      console.error("[checkout/2shot]", e);
      return res.status(500).json({ error: e?.message ?? "Failed to create checkout session" });
    }
  });

  /** Stripe Billing — 2-shot reservations (raw body + signature) */
  app.post("/api/webhook/stripe", async (req: Request, res: Response) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!webhookSecret) {
      return res.status(503).json({ error: "STRIPE_WEBHOOK_SECRET is not configured" });
    }
    const sig = req.headers["stripe-signature"];
    if (!sig || typeof sig !== "string") {
      return res.status(400).json({ error: "Missing stripe-signature" });
    }
    const buf = req.rawBody;
    if (!Buffer.isBuffer(buf)) {
      return res.status(400).json({ error: "Invalid body" });
    }
    let event: Stripe.Event;
    try {
      const stripe = await getUncachableStripeClient();
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    } catch (err: any) {
      console.warn("[webhook/stripe] signature failed", err?.message);
      return res.status(400).send(`Webhook Error: ${err?.message ?? "invalid signature"}`);
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const metaType = session.metadata?.type;
        if (metaType === "two_shot_reservation") {
          const rid = parseInt(session.metadata?.reservationId ?? "", 10);
          if (Number.isFinite(rid) && rid > 0) {
            await db
              .update(twoShotReservations)
              .set({
                status: "CONFIRMED",
                stripeCheckoutSessionId: session.id,
              } as Partial<InferSelectModel<typeof twoShotReservations>>)
              .where(and(eq(twoShotReservations.id, rid), eq(twoShotReservations.status, "PENDING")));
          }
        } else if (metaType === "ticket_purchase" || (session.metadata?.tickets && session.metadata?.userId)) {
          const ticketCredit = await creditTicketsFromTicketCheckoutSession(db, session);
          if (ticketCredit.ok && !ticketCredit.alreadyGranted) {
            console.info("[webhook/stripe] ticket_purchase credited", { sessionId: session.id, userId: ticketCredit.userId });
          }
        }
      }
    } catch (e) {
      console.error("[webhook/stripe] handler error", e);
      return res.status(500).json({ error: "handler failed" });
    }
    return res.json({ received: true });
  });

  app.put("/api/auth/profile", async (req: Request, res: Response) => {
    debugIngestServer({
      sessionId: "88cb7d",
      runId: "initial",
      hypothesisId: "H3",
      location: "server/routes.ts:/api/auth/profile",
      message: "Profile endpoint hit",
      data: { bodyKeys: Object.keys((req.body ?? {}) as Record<string, unknown>) },
      timestamp: Date.now(),
    });
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const { name, displayName, bio, avatar, profileImageUrl, spotifyUrl, appleMusicUrl, bandcampUrl, instagramUrl, youtubeUrl, xUrl, phoneNumber, pinnedCommunityIds } = req.body as {
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
      pinnedCommunityIds?: number[] | null;
    };
    const newName = name ?? displayName ?? user.displayName;
    const newBio = bio ?? user.bio;
    // Respect explicit null (clear avatar). `avatar ?? …` would incorrectly fall through when clearing.
    const newAvatar =
      avatar !== undefined
        ? avatar
        : profileImageUrl !== undefined
          ? profileImageUrl
          : user.profileImageUrl;
    const newPhone = phoneNumber !== undefined ? (phoneNumber?.trim() || null) : undefined;
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
        ...(pinnedJson !== undefined && { pinnedCommunityIds: pinnedJson }),
        updatedAt: new Date(),
      } as Partial<InferSelectModel<typeof users>>)
      .where(eq(users.id, user.id))
      .returning();
    const profileTextForLang = (newBio || "").trim() || newName;
    await syncUserLastContentLang(user.id, profileTextForLang);
    const detectedLang = await detectContentLang(profileTextForLang);
    const lastContentLangOut =
      detectedLang ?? (updated as { lastContentLang?: string | null }).lastContentLang ?? null;
    let outPinned: number[] = [];
    if ((updated as any).pinnedCommunityIds) {
      try {
        const p = JSON.parse((updated as any).pinnedCommunityIds) as number[];
        if (Array.isArray(p)) outPinned = p;
      } catch {}
    }
    const payoutTermsOut = (updated as { payoutTermsAgreedAt?: Date | null }).payoutTermsAgreedAt;
    res.json({
      id: updated.id,
      name: updated.displayName,
      displayName: updated.displayName,
      profileImageUrl: updated.profileImageUrl,
      avatar: updated.profileImageUrl,
      role: updated.role,
      bio: updated.bio,
      lastContentLang: lastContentLangOut,
      payoutTermsAgreedAt: payoutTermsOut ? new Date(payoutTermsOut).toISOString() : null,
      spotifyUrl: updated.spotifyUrl ?? null,
      appleMusicUrl: updated.appleMusicUrl ?? null,
      bandcampUrl: updated.bandcampUrl ?? null,
      instagramUrl: (updated as any).instagramUrl ?? null,
      youtubeUrl: (updated as any).youtubeUrl ?? null,
      pinnedCommunityIds: outPinned,
      xUrl: (updated as any).xUrl ?? null,
      ...policyFieldsForApi(updated as typeof users.$inferSelect),
    });
  });

  /** アカウント削除（コミュニティを管理している場合は不可) */
  app.delete("/api/auth/account", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const [owned] = await db.select().from(communities).where(eq(communities.ownerId, user.id)).limit(1);
    if (owned) {
      return res.status(400).json({ error: "You cannot delete your account while you manage a community. Delete the community first." });
    }

    try {
      await db.delete(communityMembers).where(eq(communityMembers.userId, user.id));
      await db.delete(communityModerators).where(eq(communityModerators.userId, user.id));
      await db.delete(communityPollVotes).where(eq(communityPollVotes.userId, user.id));
      await db.delete(communityVotes).where(eq(communityVotes.userId, user.id));
      await db.update(videos).set({ userId: null } as Partial<InferSelectModel<typeof videos>>).where(eq(videos.userId, user.id));
      await db.delete(videoComments).where(eq(videoComments.userId, user.id));
      await db.delete(users).where(eq(users.id, user.id));
      res.json({ ok: true });
    } catch (e) {
      console.error("Account deletion error:", e);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  /** 投稿者名からユーザー or ライバーのプロフィールIDを取得（認証不要) */
  app.get("/api/profile/by-name/:name", async (req: Request, res: Response) => {
    const name = decodeURIComponent((req.params as { name: string }).name || "");
    if (!name.trim()) return res.status(400).json({ error: "Please provide a name" });
    const [u] = await db.select({ id: users.id }).from(users).where(eq(users.displayName, name));
    if (u) return res.json({ type: "user", id: u.id });
    const [c] = await db.select({ id: creators.id }).from(creators).where(eq(creators.name, name));
    if (c) return res.json({ type: "liver", id: c.id });
    return res.status(404).json({ error: "Not found" });
  });

  /** 他ユーザーの公開プロフィール取得（認証不要) */
  app.get("/api/users/:id", async (req: Request, res: Response) => {
    const id = paramNum(req, "id");
    const [u] = await db.select({
      id: users.id,
      displayName: users.displayName,
      profileImageUrl: users.profileImageUrl,
      bio: users.bio,
      role: users.role,
      instagramUrl: users.instagramUrl,
      youtubeUrl: users.youtubeUrl,
      xUrl: users.xUrl,
      spotifyUrl: users.spotifyUrl,
      appleMusicUrl: users.appleMusicUrl,
      bandcampUrl: users.bandcampUrl,
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

    const [{ c: followersCountRaw }] = await db
      .select({ c: count() })
      .from(userFollows)
      .where(eq(userFollows.followingId, id));
    const [{ c: followingCountRaw }] = await db
      .select({ c: count() })
      .from(userFollows)
      .where(eq(userFollows.followerId, id));

    res.json({
      id: u.id,
      name: u.displayName,
      displayName: u.displayName,
      avatar: u.profileImageUrl,
      profileImageUrl: u.profileImageUrl,
      bio: u.bio ?? "",
      role: (u as any).role ?? "USER",
      instagramUrl: (u as any).instagramUrl ?? null,
      youtubeUrl: (u as any).youtubeUrl ?? null,
      xUrl: (u as any).xUrl ?? null,
      spotifyUrl: (u as any).spotifyUrl ?? null,
      appleMusicUrl: (u as any).appleMusicUrl ?? null,
      bandcampUrl: (u as any).bandcampUrl ?? null,
      pinnedCommunities,
      followersCount: Number(followersCountRaw ?? 0),
      followingCount: Number(followingCountRaw ?? 0),
    });
  });

  /** ログイン中ユーザーが :id をフォローしているか（要認証) */
  app.get("/api/users/:id/follow-status", async (req: Request, res: Response) => {
    const me = await getAuthUser(req);
    if (!me) return res.status(401).json({ error: "Not authenticated" });
    const targetId = paramNum(req, "id");
    if (!targetId) return res.status(400).json({ error: "Invalid id" });
    const [row] = await db
      .select({ id: userFollows.id })
      .from(userFollows)
      .where(and(eq(userFollows.followerId, me.id), eq(userFollows.followingId, targetId)));
    res.json({ isFollowing: !!row });
  });

  /** 公開: ユーザーのアクティブなメンターセッション商品（mentor_sessions) */
  app.get("/api/users/:id/mentor-sessions", async (req: Request, res: Response) => {
    const uid = paramNum(req, "id");
    if (!uid) return res.status(400).json({ error: "Invalid id" });
    const rows = await db
      .select()
      .from(mentorSessions)
      .where(and(eq(mentorSessions.creatorId, uid), eq(mentorSessions.isActive, true)))
      .orderBy(desc(mentorSessions.createdAt));
    res.json(rows);
  });

  /** 公開: ユーザーが参加しているコミュニティ */
  app.get("/api/users/:id/communities", async (req: Request, res: Response) => {
    const uid = paramNum(req, "id");
    if (!uid) return res.status(400).json({ error: "Invalid id" });
    const memberships = await db
      .select({ communityId: communityMembers.communityId })
      .from(communityMembers)
      .where(eq(communityMembers.userId, uid));
    if (memberships.length === 0) return res.json([]);
    const ids = memberships.map((m) => m.communityId);
    const rows = await db
      .select({
        id: communities.id,
        name: communities.name,
        thumbnail: communities.thumbnail,
        category: communities.category,
      })
      .from(communities)
      .where(inArray(communities.id, ids))
      .orderBy(desc(communities.members));
    res.json(rows);
  });

  /** フォロワー一覧（認証不要) */
  app.get("/api/users/:id/followers", async (req: Request, res: Response) => {
    const targetId = paramNum(req, "id");
    if (!targetId) return res.status(400).json({ error: "Invalid id" });
    const rows = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        profileImageUrl: users.profileImageUrl,
        bio: users.bio,
      })
      .from(userFollows)
      .innerJoin(users, eq(users.id, userFollows.followerId))
      .where(eq(userFollows.followingId, targetId));
    res.json(
      rows.map((r) => ({
        id: r.id,
        displayName: r.displayName,
        profileImageUrl: r.profileImageUrl,
        bio: r.bio,
        followersCount: 0,
      })),
    );
  });

  /** フォロー中一覧（認証不要) */
  app.get("/api/users/:id/following", async (req: Request, res: Response) => {
    const targetId = paramNum(req, "id");
    if (!targetId) return res.status(400).json({ error: "Invalid id" });
    const rows = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        profileImageUrl: users.profileImageUrl,
        bio: users.bio,
      })
      .from(userFollows)
      .innerJoin(users, eq(users.id, userFollows.followingId))
      .where(eq(userFollows.followerId, targetId));
    res.json(
      rows.map((r) => ({
        id: r.id,
        displayName: r.displayName,
        profileImageUrl: r.profileImageUrl,
        bio: r.bio,
        followersCount: 0,
      })),
    );
  });

  app.post("/api/users/:id/follow", async (req: Request, res: Response) => {
    const me = await getAuthUser(req);
    if (!me) return res.status(401).json({ error: "Not authenticated" });
    const targetId = paramNum(req, "id");
    if (!targetId) return res.status(400).json({ error: "Invalid id" });
    if (targetId === me.id) return res.status(400).json({ error: "You cannot follow yourself" });
    const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.id, targetId));
    if (!exists) return res.status(404).json({ error: "Not found" });
    await db
      .insert(userFollows)
      .values({ followerId: me.id, followingId: targetId } as typeof userFollows.$inferInsert)
      .onConflictDoNothing({ target: [userFollows.followerId, userFollows.followingId] });
    res.json({ ok: true });
  });

  app.delete("/api/users/:id/follow", async (req: Request, res: Response) => {
    const me = await getAuthUser(req);
    if (!me) return res.status(401).json({ error: "Not authenticated" });
    const targetId = paramNum(req, "id");
    if (!targetId) return res.status(400).json({ error: "Invalid id" });
    await db
      .delete(userFollows)
      .where(and(eq(userFollows.followerId, me.id), eq(userFollows.followingId, targetId)));
    res.json({ ok: true });
  });

  // ── Base URL (must match Google OAuth redirect URI registration)
  const BASE_URL = resolvePublicAppOrigin();

  // ── Google OAuth ──────────────────────────────────────────────────
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
  const GOOGLE_CALLBACK_URL = `${BASE_URL}/api/auth/google-callback`;
  const GOOGLE_STATE = "livestage-google-state";
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY ?? "";

  app.get("/api/auth/status", (_req: Request, res: Response) => {
    res.json({
      google: {
        configured: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_CALLBACK_URL),
        callbackUrl: GOOGLE_CALLBACK_URL,
        publicOrigin: BASE_URL,
        /** Web クライアント ID は公開情報。`.env` の GOOGLE_CLIENT_ID が GCP のクライアントと一致するか照合用 */
        clientId: GOOGLE_CLIENT_ID || null,
      },
    });
  });

  app.get("/api/auth/google", (_req: Request, res: Response) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CALLBACK_URL) {
      return res.status(500).json({ error: "Google OAuth is not configured" });
    }
    const params = new URLSearchParams({
      response_type: "code",
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_CALLBACK_URL,
      scope: "openid email profile",
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
      return res.redirect(`${BASE_URL}/auth/login?auth_error=invalid_state`);
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
        return res.redirect(`${BASE_URL}/auth/login?auth_error=token_failed`);
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
        return res.redirect(`${BASE_URL}/auth/login?auth_error=profile_failed`);
      }

      const googleKey = `google:${profile.sub}`;
      const displayName = profile.name ?? profile.email ?? "Google User";
      const avatar = profile.picture ?? null;
      const googleEmail = typeof profile.email === "string" ? profile.email.trim().toLowerCase() : null;

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
            email: googleEmail,
            role: "USER",
            ...tokenUpdate,
          } as typeof users.$inferInsert)
          .returning();
      } else {
        const nextValues: Partial<InferSelectModel<typeof users>> = {
          displayName,
          profileImageUrl: avatar,
          updatedAt: new Date(),
          ...tokenUpdate,
        };
        if (googleEmail) nextValues.email = googleEmail;
        [existing] = await db
          .update(users)
          .set(nextValues)
          .where(eq(users.id, existing.id))
          .returning();
      }
      await promoteAdminByEmail({ id: existing.id, email: existing.email });
      await sendWelcomeDmIfNeeded(existing.id);

      const jwtToken = makeToken(existing.id);
      // iOS Safari PWA対応: PWAのstartUrl(/)にリダイレクトしてPWA内でトークン処理
      res.redirect(`${BASE_URL}/?token=${encodeURIComponent(jwtToken)}`);
    } catch (err) {
      console.error("Google callback error:", err);
      res.redirect(`${BASE_URL}/auth/login?auth_error=server_error`);
    }
  });

  // ── YouTube Search for Jukebox ─────────────────────────────────────
  app.get("/api/youtube/search", async (req: Request, res: Response) => {
    const q = queryStr(req, "q").trim();
    if (!q) {
      return res.status(400).json({ error: "Please enter a search query" });
    }
    if (!YOUTUBE_API_KEY) {
      return res.status(500).json({ error: "YouTube API key is not configured" });
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
        let clientMessage = "YouTube search failed";
        try {
          const errJson = JSON.parse(text) as { error?: { message?: string } };
          if (errJson?.error?.message) {
            clientMessage = errJson.error.message;
          }
        } catch {
          /* keep generic */
        }
        return res.status(502).json({ error: clientMessage });
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

      // videos.list で実際の動画時間（ISO 8601 duration)を取得
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
      res.status(500).json({ error: "An error occurred during YouTube search" });
    }
  });

  /** ユーザーの Google アクセストークンを取得（必要ならリフレッシュ) */
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
        } as Partial<InferSelectModel<typeof users>>)
        .where(eq(users.id, userId));
      return data.access_token;
    } catch {
      return null;
    }
  }

  // ── YouTube プレイリスト（Google ログインユーザー向け)────────────────────────
  app.get("/api/youtube/playlists", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const accessToken = await getGoogleAccessToken(user.id);
    if (!accessToken) {
      return res.status(403).json({
        error: "Sign in with Google to use YouTube playlists",
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
        return res.status(502).json({ error: "Failed to fetch the playlist" });
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
      res.status(500).json({ error: "An error occurred while fetching the playlist" });
    }
  });

  app.get("/api/youtube/playlists/:playlistId/items", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const accessToken = await getGoogleAccessToken(user.id);
    if (!accessToken) {
      return res.status(403).json({
        error: "Sign in with Google to use YouTube playlists",
        needsGoogleLogin: true,
      });
    }
    const playlistId = paramStr(req, "playlistId");
    if (!playlistId) return res.status(400).json({ error: "playlistId is required" });
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
        return res.status(502).json({ error: "Failed to fetch the playlist" });
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
      res.status(500).json({ error: "An error occurred while fetching the playlist" });
    }
  });

  // ── Communities ───────────────────────────────────────────────────
  /** genreId で絞り込み: pop, rock, hiphop, edm, ai → category に含まれるかでフィルタ */
  const GENRE_TO_CATEGORY: Record<string, string[]> = {
    pop: ["Pop", "J-Pop", "K-Pop", "Music", "Vocal"],
    rock: ["Rock", "Band", "Guitar"],
    hiphop: ["Hip-Hop", "HipHop", "Rap", "Trap"],
    edm: ["EDM", "Electronic", "House", "DJ"],
    ai: ["AI", "Generative", "Suno", "Instrumental"],
  };
  const OFFICIAL_DISTRICT_MIN_MEMBERS = 10_000;
  const normalizeCommunityRow = (row: InferSelectModel<typeof communities>) => {
    const isOfficial = !!(row as any).isOfficial;
    const members = Number((row as any).members ?? 0);
    return {
      ...row,
      isOfficial,
      members: isOfficial ? Math.max(OFFICIAL_DISTRICT_MIN_MEMBERS, members) : members,
    };
  };

  app.get("/api/communities", async (req: Request, res: Response) => {
    const genreId = queryStr(req, "genre");
    let rows = await fetchCommunitiesListOrdered();
    if (genreId && GENRE_TO_CATEGORY[genreId]) {
      const terms = GENRE_TO_CATEGORY[genreId];
      rows = rows.filter((r) =>
        terms.some((t) => (r.category ?? "").includes(t))
      );
    }
    const normalized = rows.map(normalizeCommunityRow);
    res.json(normalized);
  });

  /** 現在ログイン中ユーザーが参加しているコミュニティ一覧 */
  app.get("/api/communities/me", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const memberships = await db
      .select({ communityId: communityMembers.communityId })
      .from(communityMembers)
      .where(eq(communityMembers.userId, user.id));

    if (memberships.length === 0) {
      return res.json([]);
    }

    const ids = memberships.map((m) => m.communityId);
    const rows = await fetchCommunitiesForIds(ids);

    const normalized = rows.map(normalizeCommunityRow);
    res.json(normalized);
  });

  app.get("/api/communities/:id", async (req: Request, res: Response) => {
    const id = paramNum(req, "id");
    const row = await fetchCommunityById(id);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(normalizeCommunityRow(row));
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

  /** コミュニティに登録しているクリエイター一覧（動画編集者 + ライバー/クリエイター) */
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

  /** コミュニティの管理人・モデレーター設定（管理人または本人のみ) */
  app.patch("/api/communities/:id/staff", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });

    const isAdmin = community.adminId === user.id;
    if (!isAdmin) return res.status(403).json({ error: "Only the community owner can change this" });

    const { adminId, moderatorIds } = req.body as { adminId?: number | null; moderatorIds?: number[] };
    if (adminId !== undefined) {
      await db
        .update(communities)
        .set({ adminId: adminId ?? null } as Partial<InferSelectModel<typeof communities>>)
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

  /** コミュニティメンバー一覧（管理人・モデレーター選択用) */
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

  /** コミュニティに参加（フォロー時などに呼ぶ) */
  app.post("/api/communities/:id/join", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

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
        .set({ members: c.m + 1 } as Partial<InferSelectModel<typeof communities>>)
        .where(eq(communities.id, communityId));
    }
    res.status(201).json({ ok: true });
  });

  // ── コミュニティ掲示板（スレッド形式) ─────────────────────────────────
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
        author: authorMap.get(r.authorUserId) ?? { displayName: "Unknown", profileImageUrl: null },
      }))
    );
  });

  /** 全コミュニティの掲示板スレッド横断フィード（ライブ告知ハブ・公開読み取り） */
  app.get("/api/community-announcements/feed", async (_req: Request, res: Response) => {
    const limit = Math.min(100, Math.max(1, parseInt(String(_req.query.limit ?? "80"), 10) || 80));
    const qRaw = typeof _req.query.q === "string" ? _req.query.q.trim() : "";
    const liveOnly =
      String(_req.query.liveOnly ?? "") === "1" ||
      String(_req.query.liveOnly ?? "").toLowerCase() === "true";

    // liveOnly はキーワード＋フライヤー画像ありで絞るため、十分な件数を先に取る
    const fetchLimit = liveOnly ? Math.min(800, Math.max(200, limit * 40)) : limit;
    const rows = await db
      .select({
        id: communityThreads.id,
        communityId: communityThreads.communityId,
        title: communityThreads.title,
        body: communityThreads.body,
        pinned: communityThreads.pinned,
        createdAt: communityThreads.createdAt,
        authorUserId: communityThreads.authorUserId,
        communityName: communities.name,
        communityCategory: communities.category,
        communityThumbnail: communities.thumbnail,
      })
      .from(communityThreads)
      .innerJoin(communities, eq(communities.id, communityThreads.communityId))
      .orderBy(desc(communityThreads.pinned), desc(communityThreads.createdAt))
      .limit(fetchLimit);

    const liveHints = [
      "live",
      "配信",
      "ライブ",
      "stream",
      "twitch",
      "youtube",
      "youtu.be",
      "公演",
      "concert",
      "tour",
      "tiktok",
      "ticket",
      "チケット",
      "streaming",
      "premiere",
    ];

    let out = rows;
    if (qRaw) {
      const ql = qRaw.toLowerCase();
      out = out.filter((r) => `${r.title} ${r.body}`.toLowerCase().includes(ql));
    }
    if (liveOnly) {
      out = out.filter((r) => {
        const blob = `${r.title} ${r.body}`.toLowerCase();
        if (!liveHints.some((h) => blob.includes(h))) return false;
        const flyer = parseThreadBody(r.body).flyerImageUrl;
        return !!flyer;
      });
    }
    const maxPerCommunity = Math.min(
      50,
      Math.max(1, parseInt(String(_req.query.maxPerCommunity ?? "2"), 10) || 2),
    );
    if (liveOnly) {
      out = diversifyAnnouncementRowsByCommunity(out, limit, maxPerCommunity);
    } else {
      out = out.slice(0, limit);
    }

    const forceLang = typeof _req.query.lang === "string" ? _req.query.lang.trim().toLowerCase() : "";
    const forceEnglish = forceLang === "en";

    const authorIds = [...new Set(out.map((r) => r.authorUserId))];
    const authorRows =
      authorIds.length > 0
        ? await db
            .select({ id: users.id, displayName: users.displayName, profileImageUrl: users.profileImageUrl })
            .from(users)
            .where(inArray(users.id, authorIds))
        : [];
    const authorMap = new Map(authorRows.map((a) => [a.id, a]));

    const mapped = out.map((r) => ({
        id: r.id,
        communityId: r.communityId,
        communityName: r.communityName,
        communityCategory: r.communityCategory,
        communityThumbnail: r.communityThumbnail,
        title: r.title,
        body: r.body,
        pinned: r.pinned,
        createdAt: r.createdAt,
        authorUserId: r.authorUserId,
        author: authorMap.get(r.authorUserId) ?? { displayName: "Unknown", profileImageUrl: null },
      }));

    if (!forceEnglish) {
      return res.json(mapped);
    }

    const translated = await Promise.all(
      mapped.map(async (row) => {
        const next = { ...row };

        const titleLang = await detectContentLang(next.title).catch(() => null);
        if (titleLang && titleLang !== "en") {
          const tr = await translateText({
            text: next.title,
            srcLang: titleLang,
            dstLang: "en",
          });
          if (!tr.error && !tr.skipped && tr.text.trim()) {
            next.title = tr.text.trim();
          }
        }

        const bodyLang = await detectContentLang(next.body).catch(() => null);
        if (next.body && bodyLang && bodyLang !== "en") {
          const tr = await translateText({
            text: next.body,
            srcLang: bodyLang,
            dstLang: "en",
          });
          if (!tr.error && !tr.skipped && tr.text.trim()) {
            next.body = tr.text.trim();
          }
        }

        return next;
      }),
    );

    return res.json(translated);
  });

  app.post("/api/communities/:id/threads", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const [memberRow] = await db
      .select({ id: communityMembers.id })
      .from(communityMembers)
      .where(and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, user.id)))
      .limit(1);
    const isCommunityOwner = community.adminId === user.id;
    const [boardModRow] = await db
      .select({ userId: communityModerators.userId })
      .from(communityModerators)
      .where(and(eq(communityModerators.communityId, communityId), eq(communityModerators.userId, user.id)))
      .limit(1);
    const canPostAsStaff = isCommunityOwner || !!boardModRow || isAdminRole(user.role);
    if (!memberRow && !canPostAsStaff) {
      return res.status(403).json({ error: "Join the community first, or post as admin/moderator" });
    }
    const { title, body } = req.body as { title?: string; body?: string };
    if (!title || !title.trim()) return res.status(400).json({ error: "Please enter a title" });
    // コンテンツモデレーション（タイトル＋本文を結合してチェック)
    const combinedText = [title, body].filter(Boolean).join(" ");
    const modResult = await moderateContent(combinedText);
    if (modResult.allowed === false) {
      return res.status(400).json({ error: modResult.reason ?? "This content is not allowed" });
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
      author: authorMap.get(thread.authorUserId) ?? { displayName: "Unknown", profileImageUrl: null },
      posts: posts.map((p) => ({
        ...p,
        author: authorMap.get(p.authorUserId) ?? { displayName: "Unknown", profileImageUrl: null },
      })),
    });
  });

  /** スレッド削除（管理人・モデレーター) */
  app.delete("/api/communities/:id/threads/:threadId", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const communityId = paramNum(req, "id");
    const threadId = paramNum(req, "threadId");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and(eq(communityModerators.communityId, communityId), eq(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "Only owners or moderators can delete this" });
    const [thread] = await db.select().from(communityThreads).where(and(eq(communityThreads.communityId, communityId), eq(communityThreads.id, threadId)));
    if (!thread) return res.status(404).json({ message: "Not found" });
    await db.delete(communityThreadPosts).where(eq(communityThreadPosts.threadId, threadId));
    await db.delete(communityThreads).where(eq(communityThreads.id, threadId));
    res.json({ ok: true });
  });

  /** スレッド返信削除（管理人・モデレーター) */
  app.delete("/api/communities/:id/threads/:threadId/posts/:postId", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const communityId = paramNum(req, "id");
    const threadId = paramNum(req, "threadId");
    const postId = paramNum(req, "postId");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and(eq(communityModerators.communityId, communityId), eq(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "Only owners or moderators can delete this" });
    const [thread] = await db.select().from(communityThreads).where(and(eq(communityThreads.communityId, communityId), eq(communityThreads.id, threadId)));
    if (!thread) return res.status(404).json({ message: "Not found" });
    await db.delete(communityThreadPosts).where(and(eq(communityThreadPosts.threadId, threadId), eq(communityThreadPosts.id, postId)));
    res.json({ ok: true });
  });

  app.post("/api/communities/:id/threads/:threadId/posts", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const communityId = paramNum(req, "id");
    const threadId = paramNum(req, "threadId");
    const [thread] = await db
      .select()
      .from(communityThreads)
      .where(and(eq(communityThreads.communityId, communityId), eq(communityThreads.id, threadId)));
    if (!thread) return res.status(404).json({ message: "Not found" });
    const [memberRow] = await db
      .select({ id: communityMembers.id })
      .from(communityMembers)
      .where(and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, user.id)))
      .limit(1);
    const [communityForReply] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!communityForReply) return res.status(404).json({ message: "Not found" });
    const isCommunityOwner = communityForReply.adminId === user.id;
    const [replyModRow] = await db
      .select({ userId: communityModerators.userId })
      .from(communityModerators)
      .where(and(eq(communityModerators.communityId, communityId), eq(communityModerators.userId, user.id)))
      .limit(1);
    const canReplyAsStaff = isCommunityOwner || !!replyModRow || isAdminRole(user.role);
    if (!memberRow && !canReplyAsStaff) {
      return res.status(403).json({ error: "Join the community first, or reply as admin/moderator" });
    }
    const { body } = req.body as { body?: string };
    if (!body || !body.trim()) return res.status(400).json({ error: "Please enter body text" });
    // コンテンツモデレーション
    const modResult = await moderateContent(body);
    if (modResult.allowed === false) {
      return res.status(400).json({ error: modResult.reason ?? "This content is not allowed" });
    }
    const [row] = await db
      .insert(communityThreadPosts)
      .values({
        threadId,
        authorUserId: user.id,
        body: body.trim(),
      } as typeof communityThreadPosts.$inferInsert)
      .returning();
    await syncUserLastContentLang(user.id, body.trim());
    res.status(201).json(row);
  });

  /** コミュニティ管理者: ジュークボックスキュー一覧・削除 */
  app.get("/api/communities/:id/admin/jukebox-queue", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and(eq(communityModerators.communityId, communityId), eq(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "Only owners or moderators can access this" });
    const rows = await db.select().from(jukeboxQueue).where(eq(jukeboxQueue.communityId, communityId)).orderBy(asc(jukeboxQueue.position));
    res.json(rows);
  });

  app.delete("/api/communities/:id/admin/jukebox-queue/:itemId", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const communityId = paramNum(req, "id");
    const itemId = paramNum(req, "itemId");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and(eq(communityModerators.communityId, communityId), eq(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "Only owners or moderators can perform this action" });
    const [item] = await db.select().from(jukeboxQueue).where(and(eq(jukeboxQueue.communityId, communityId), eq(jukeboxQueue.id, itemId)));
    if (!item) return res.status(404).json({ message: "Not found" });
    await db.delete(jukeboxQueue).where(eq(jukeboxQueue.id, itemId));
    res.json({ ok: true });
  });

  /** コミュニティ管理者: 承認済み広告一覧（スケジュール用) */
  app.get("/api/communities/:id/admin/ads", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and(eq(communityModerators.communityId, communityId), eq(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "Only owners or moderators can access this" });

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
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and(eq(communityModerators.communityId, communityId), eq(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "Only owners or moderators can access this" });

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
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const communityId = paramNum(req, "id");
    const reportId = paramNum(req, "reportId");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and(eq(communityModerators.communityId, communityId), eq(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "Only owners or moderators can perform this action" });

    const [report] = await db.select().from(reports).where(eq(reports.id, reportId));
    if (!report) return res.status(404).json({ error: "Report not found" });
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
    if (!allowed) return res.status(403).json({ error: "This report does not belong to this community" });

    if (report.contentType === "video") {
      await db.update(videos).set({ hidden: true } as Partial<InferSelectModel<typeof videos>>).where(eq(videos.id, report.contentId));
    } else if (report.contentType === "comment") {
      await db.update(videoComments).set({ hidden: true } as Partial<InferSelectModel<typeof videoComments>>).where(eq(videoComments.id, report.contentId));
    }
    await db.update(reports).set({ status: "hidden" } as Partial<InferSelectModel<typeof reports>>).where(eq(reports.id, reportId));
    res.json({ ok: true });
  });

  /** コミュニティ管理者: 通報を問題なしとしてクローズ */
  app.patch("/api/communities/:id/admin/reports/:reportId/dismiss", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const communityId = paramNum(req, "id");
    const reportId = paramNum(req, "reportId");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and(eq(communityModerators.communityId, communityId), eq(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "Only owners or moderators can perform this action" });

    const [report] = await db.select().from(reports).where(eq(reports.id, reportId));
    if (!report) return res.status(404).json({ error: "Report not found" });
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
    if (!allowed) return res.status(403).json({ error: "This report does not belong to this community" });

    await db.update(reports).set({ status: "reviewed" } as Partial<InferSelectModel<typeof reports>>).where(eq(reports.id, reportId));
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
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const memberRows = await db
      .select()
      .from(communityMembers)
      .where(and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, user.id)));
    if (memberRows.length === 0) return res.status(403).json({ error: "Join the community first" });
    const { question, options } = req.body as { question?: string; options?: string[] };
    if (!question || !question.trim()) return res.status(400).json({ error: "Please enter a question" });
    if (!options || !Array.isArray(options) || options.length < 2) return res.status(400).json({ error: "Provide at least two options" });
    const validOpts = options.filter((o: string) => o && String(o).trim()).slice(0, 10);
    if (validOpts.length < 2) return res.status(400).json({ error: "Provide at least two options" });
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
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const communityId = paramNum(req, "id");
    const pollId = paramNum(req, "pollId");
    const { optionId } = req.body as { optionId?: number };
    if (!optionId) return res.status(400).json({ error: "optionId is required" });
    const [poll] = await db.select().from(communityPolls).where(and(eq(communityPolls.communityId, communityId), eq(communityPolls.id, pollId)));
    if (!poll) return res.status(404).json({ message: "Not found" });
    const [opt] = await db.select().from(communityPollOptions).where(and(eq(communityPollOptions.pollId, pollId), eq(communityPollOptions.id, optionId)));
    if (!opt) return res.status(404).json({ message: "Option not found" });
    const memberRows = await db
      .select()
      .from(communityMembers)
      .where(and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, user.id)));
    if (memberRows.length === 0) return res.status(403).json({ error: "Join the community first" });
    const existing = await db.select().from(communityPollVotes).where(and(eq(communityPollVotes.pollId, pollId), eq(communityPollVotes.userId, user.id)));
    if (existing.length > 0) return res.status(400).json({ error: "You have already voted" });
    await db.insert(communityPollVotes).values({
      pollId,
      optionId,
      userId: user.id,
    } as typeof communityPollVotes.$inferInsert);
    res.json({ ok: true });
  });

  app.get("/api/editors", async (req: Request, res: Response) => {
    const sort = (req.query.sort as string) || "rating";
    const mode = typeof req.query.mode === "string" ? req.query.mode.trim() : "";
    const filters: SQL[] = [];

    if (mode === "per_minute") {
      filters.push(inArray(videoEditors.priceType, ["per_minute", "both"]));
    } else if (mode === "revenue_share") {
      filters.push(inArray(videoEditors.priceType, ["revenue_share", "both"]));
    } else if (mode.length > 0) {
      return res.status(400).json({ error: "Invalid mode (use per_minute or revenue_share)" });
    }

    const maxTicketsRaw = req.query.maxTicketsPerMin;
    const maxTicketsStr = Array.isArray(maxTicketsRaw) ? maxTicketsRaw[0] : maxTicketsRaw;
    if (maxTicketsStr !== undefined && String(maxTicketsStr).trim() !== "") {
      const maxT = parseInt(String(maxTicketsStr), 10);
      if (!Number.isNaN(maxT) && maxT > 0) {
        filters.push(
          and(isNotNull(videoEditors.pricePerMinute), lte(videoEditors.pricePerMinute, maxT)) as SQL,
        );
      }
    }

    const minShareRaw = req.query.minRevenueSharePercent;
    const minShareStr = Array.isArray(minShareRaw) ? minShareRaw[0] : minShareRaw;
    if (minShareStr !== undefined && String(minShareStr).trim() !== "") {
      const minS = parseInt(String(minShareStr), 10);
      if (!Number.isNaN(minS) && minS >= 1 && minS <= 100) {
        filters.push(
          and(isNotNull(videoEditors.revenueSharePercent), gte(videoEditors.revenueSharePercent, minS)) as SQL,
        );
      }
    }

    const maxDelRaw = req.query.maxDeliveryDays;
    const maxDelStr = Array.isArray(maxDelRaw) ? maxDelRaw[0] : maxDelRaw;
    if (maxDelStr !== undefined && String(maxDelStr).trim() !== "") {
      const maxD = parseInt(String(maxDelStr), 10);
      if (!Number.isNaN(maxD) && maxD > 0) {
        filters.push(lte(videoEditors.deliveryDays, maxD));
      }
    }

    const tagList = parseTagsQueryParam(req.query.tags);
    if (tagList.length > 0) {
      const arrayLit =
        "ARRAY[" + tagList.map((t) => "'" + t.replace(/'/g, "''") + "'").join(",") + "]::text[]";
      filters.push(sql`${videoEditors.styleTags} && ${sql.raw(arrayLit)}`);
    }

    let rows =
      filters.length > 0
        ? await db
            .select()
            .from(videoEditors)
            .where(and(...filters))
        : await db.select().from(videoEditors);

    const genreTerms = parseGenresQueryParam(req.query.genres);
    if (genreTerms.length > 0) {
      rows = rows.filter((e) => {
        const hay = (e.genres ?? "").toLowerCase();
        return genreTerms.some((t) => hay.includes(t));
      });
    }

    if (sort === "delivery") {
      rows = rows.sort((a, b) => a.deliveryDays - b.deliveryDays);
    } else if (sort === "price") {
      rows = rows.sort((a, b) => {
        const pa = a.pricePerMinute ?? a.revenueSharePercent ?? 9999;
        const pb = b.pricePerMinute ?? b.revenueSharePercent ?? 9999;
        return pa - pb;
      });
    } else {
      rows = rows.sort((a, b) => b.rating - a.rating);
    }
    res.json(rows);
  });

  app.get("/api/editors/me", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const [row] = await db.select().from(videoEditors).where(eq(videoEditors.userId, user.id)).limit(1);
    return res.json(row ?? null);
  });

  app.get("/api/editors/me/requests", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const [editor] = await db.select({ id: videoEditors.id }).from(videoEditors).where(eq(videoEditors.userId, user.id)).limit(1);
    if (!editor) return res.json([]);
    const rows = await db.select().from(videoEditRequests).where(eq(videoEditRequests.editorId, editor.id)).orderBy(desc(videoEditRequests.createdAt));
    res.json(rows);
  });

  app.get("/api/editors/:id", async (req: Request, res: Response) => {
    const id = paramNum(req, "id");
    const [editor] = await db.select().from(videoEditors).where(eq(videoEditors.id, id));
    if (!editor) return res.status(404).json({ error: "Not found" });
    res.json(editor);
  });

  const EDITOR_REQUEST_TICKET_FEE = 200;

  app.post("/api/editors/:id/request", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Sign in required to submit a paid edit request" });
    }

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
      return res.status(400).json({ error: "Please fill in all required fields" });
    }
    if (priceType !== "per_minute" && priceType !== "revenue_share") {
      return res.status(400).json({ error: "Invalid pricing type" });
    }

    const [editor] = await db.select().from(videoEditors).where(eq(videoEditors.id, editorId));
    if (!editor) {
      return res.status(404).json({ error: "Editor not found" });
    }

    if (editor.priceType !== "both" && editor.priceType !== priceType) {
      return res.status(400).json({ error: "This editor does not support the selected pricing type" });
    }
    if (editor.userId == null || !Number.isInteger(editor.userId) || editor.userId <= 0) {
      return res.status(400).json({ error: "This editor cannot receive paid requests (no linked account)" });
    }

    const requestUserId = `user-${user.id}`;
    const requestUserName = requesterName ?? user.displayName ?? "User";

    try {
      const result = await db.transaction(async (tx) => {
        const buyerId = String(user.id);
        const fee = EDITOR_REQUEST_TICKET_FEE;
        const balRows = await tx.select().from(ticketBalances).where(eq(ticketBalances.userId, buyerId)).limit(1);
        const cur = balRows[0]?.balance ?? 0;
        if (cur < fee) {
          const err = new Error("INSUFFICIENT_TICKETS");
          (err as any).meta = { balance: cur, required: fee };
          throw err;
        }
        const newBal = cur - fee;
        if (balRows.length === 0) {
          await tx.insert(ticketBalances).values({ userId: buyerId, balance: newBal });
        } else {
          await tx
            .update(ticketBalances)
            .set({ balance: newBal, updatedAt: new Date() })
            .where(eq(ticketBalances.userId, buyerId));
        }

        const [spendTx] = await tx
          .insert(ticketTransactions)
          .values({
            userId: buyerId,
            amount: -fee,
            type: "spend_editor_request",
            referenceId: `editor:${editorId}`,
            description: `Editor request: ${title}`,
          } as typeof ticketTransactions.$inferInsert)
          .returning({ id: ticketTransactions.id });

        const [requestRow] = await tx
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

        await tx.insert(editingRequests).values({
          userId: requestUserId,
          videoUrl: null,
          performanceDate: deadline ?? null,
          instructions: description,
          ticketFee: fee,
          ticketTransactionId: String(spendTx.id),
          status: "pending",
        } as typeof editingRequests.$inferInsert);

        if (editor.userId != null) {
          const walletId = await getOrCreateUserWallet(editor.userId, tx);
          const creatorRow = await creatorRowForUserId(tx, editor.userId);
          await recordRevenue(walletId, editor.userId, creatorRow?.id ?? null, fee, "paid_live", String(spendTx.id), tx);
        }

        return requestRow;
      });

      await db.insert(notifications).values({
        type: "editor_request",
        title: `Edit request from ${requestUserName}`,
        body: `${title} (editor ID: ${editorId})`,
        amount: budget ?? null,
        avatar: editor.avatar ?? null,
        thumbnail: null,
        timeAgo: "Just now",
      } as typeof notifications.$inferInsert);

      res.status(201).json(result);
    } catch (e: any) {
      if (e?.message === "INSUFFICIENT_TICKETS") {
        const meta = e?.meta ?? {};
        return res.status(402).json({
          error: "Insufficient tickets",
          balance: meta.balance ?? 0,
          required: meta.required ?? EDITOR_REQUEST_TICKET_FEE,
        });
      }
      console.error("[editors/request]", e);
      return res.status(500).json({ error: e?.message ?? "Request failed" });
    }
  });

  app.post("/api/editors", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const taken = await db.select().from(videoEditors).where(eq(videoEditors.userId, user.id)).limit(1);
    if (taken.length > 0) {
      return res.status(409).json({ error: "Already registered as a video editor" });
    }

    const body = req.body as {
      bio?: string;
      genres?: string;
      deliveryDays?: number;
      priceType?: string;
      pricePerMinute?: number | null;
      revenueSharePercent?: number | null;
      communityId?: number;
      styleTags?: unknown;
    };

    const communityId = body.communityId;
    if (communityId == null || !Number.isFinite(communityId)) {
      return res.status(400).json({ error: "communityId is required" });
    }
    const [comm] = await db.select({ id: communities.id }).from(communities).where(eq(communities.id, communityId));
    if (!comm) return res.status(400).json({ error: "Community not found" });

    const pricingRow = {
      priceType: String(body.priceType ?? ""),
      pricePerMinute: body.pricePerMinute ?? null,
      revenueSharePercent: body.revenueSharePercent ?? null,
    };
    const pv = validateEditorPricing(pricingRow);
    if (pv.ok === false) return res.status(400).json({ error: pv.error });

    const styleTags = normalizeEditorStyleTagSlugs(
      Array.isArray(body.styleTags) ? body.styleTags.map((x) => String(x)) : [],
    );

    const [u] = await db.select().from(users).where(eq(users.id, user.id));
    if (!u) return res.status(404).json({ error: "User not found" });

    const deliveryDays =
      typeof body.deliveryDays === "number" && body.deliveryDays > 0
        ? Math.min(90, Math.floor(body.deliveryDays))
        : 3;

    const [created] = await db
      .insert(videoEditors)
      .values({
        userId: user.id,
        name: u.displayName,
        avatar: u.profileImageUrl ?? null,
        bio: (body.bio ?? "").trim(),
        communityId,
        genres: (body.genres ?? "").trim(),
        deliveryDays,
        priceType: pricingRow.priceType,
        pricePerMinute: pricingRow.pricePerMinute,
        revenueSharePercent: pricingRow.revenueSharePercent,
        styleTags,
      } as typeof videoEditors.$inferInsert)
      .returning();

    return res.status(201).json(created);
  });

  app.put("/api/editors/:id", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const id = paramNum(req, "id");
    const [editor] = await db.select().from(videoEditors).where(eq(videoEditors.id, id));
    if (!editor) return res.status(404).json({ error: "Not found" });
    if (editor.userId !== user.id) return res.status(403).json({ error: "You cannot edit this" });

    const body = req.body as {
      bio?: string;
      genres?: string;
      deliveryDays?: number;
      priceType?: string;
      pricePerMinute?: number | null;
      revenueSharePercent?: number | null;
      communityId?: number;
      styleTags?: unknown;
    };

    const communityId = body.communityId ?? editor.communityId;
    const [comm] = await db.select({ id: communities.id }).from(communities).where(eq(communities.id, communityId));
    if (!comm) return res.status(400).json({ error: "Community not found" });

    const pricingRow = {
      priceType: String(body.priceType ?? editor.priceType),
      pricePerMinute: body.pricePerMinute !== undefined ? body.pricePerMinute : editor.pricePerMinute,
      revenueSharePercent:
        body.revenueSharePercent !== undefined ? body.revenueSharePercent : editor.revenueSharePercent,
    };
    const pv = validateEditorPricing(pricingRow);
    if (pv.ok === false) return res.status(400).json({ error: pv.error });

    let styleTags: string[] = Array.isArray(editor.styleTags) ? [...editor.styleTags] : [];
    if (body.styleTags !== undefined) {
      styleTags = normalizeEditorStyleTagSlugs(
        Array.isArray(body.styleTags) ? body.styleTags.map((x) => String(x)) : [],
      );
    }

    const deliveryDays =
      typeof body.deliveryDays === "number" && body.deliveryDays > 0
        ? Math.min(90, Math.floor(body.deliveryDays))
        : editor.deliveryDays;

    await db
      .update(videoEditors)
      .set({
        bio: body.bio !== undefined ? String(body.bio).trim() : editor.bio,
        genres: body.genres !== undefined ? String(body.genres).trim() : editor.genres,
        deliveryDays,
        communityId,
        priceType: pricingRow.priceType,
        pricePerMinute: pricingRow.pricePerMinute,
        revenueSharePercent: pricingRow.revenueSharePercent,
        styleTags,
      })
      .where(eq(videoEditors.id, id));

    const [updated] = await db.select().from(videoEditors).where(eq(videoEditors.id, id));
    return res.json(updated);
  });

  app.post("/api/communities", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });

    const { name, description, bannerUrl, iconUrl, categories } = req.body as {
      name?: string;
      description?: string;
      bannerUrl?: string;
      iconUrl?: string;
      categories?: string[] | string;
    };

    const trimmedName = (name ?? "").trim();
    const trimmedDescription = (description ?? "").trim();

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
      return res.status(400).json({ error: "Please enter name, description, and category" });
    }

    if (trimmedDescription.length < 10) {
      return res.status(400).json({ error: "Description must be at least 10 characters" });
    }

    try {
      const primaryCategory = categoryList[0] ?? "";
      const defaults = getCommunityDefaultAssets(primaryCategory);
      const banner = (bannerUrl ?? "").trim() || defaults.bannerUrl;
      const icon = (iconUrl ?? "").trim() || defaults.iconUrl;
      const [row] = await db
        .insert(communities)
        .values({
          name: trimmedName,
          members: 1,
          thumbnail: banner,
          iconUrl: icon,
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
      res.status(500).json({ error: "Failed to create community" });
    }
  });

  /** コミュニティ削除（作成者のみ) */
  app.delete("/api/communities/:id", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });

    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    if (community.ownerId !== user.id) {
      return res.status(403).json({ error: "Only the creator can delete this community" });
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
      await db.update(videos).set({ communityId: null } as Partial<InferSelectModel<typeof videos>>).where(eq(videos.communityId, communityId));
      await db.delete(communities).where(eq(communities.id, communityId));
      res.json({ ok: true });
    } catch (e) {
      console.error("Community deletion error:", e);
      res.status(500).json({ error: "Failed to delete community" });
    }
  });

  // ── Community Ads（広告申し込み・審査)────────────────────────────────
  const MIN_AD_AMOUNT = 7_000;
  const DAILY_RATE_PER_MEMBER = 5; // community ad: $0.05/day (cents)
  const GENRE_DAILY_RATE_PER_MEMBER = 3; // genre ad: $0.03/day (cents)
  const MAX_MONTHS_AHEAD = 3;

  // 広告料金・最短日数計算API
  app.get("/api/community-ads/pricing", async (req: Request, res: Response) => {
    const cid = Number(queryStr(req, "communityId")) || 0;
    if (!cid) return res.status(400).json({ error: "communityId is required" });
    const [community] = await db.select().from(communities).where(eq(communities.id, cid));
    if (!community) return res.status(404).json({ error: "Community not found" });
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
    if (!cid || !start || !end) return res.status(400).json({ error: "communityId, start, and end are required" });
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
    if (!community) return res.status(404).json({ error: "Community not found" });

    const company = (companyName ?? "").trim();
    const contact = (contactName ?? "").trim();
    const em = (email ?? "").trim();
    const banner = (bannerUrl ?? "").trim();
    const link = (linkUrl ?? "").trim();
    const start = (startDate ?? "").trim();
    const end = (endDate ?? "").trim();
    if (!company || !contact || !em || !banner || !start || !end) {
      return res.status(400).json({ error: "Please enter company name, contact name, email, banner URL, and run dates" });
    }
    if (!agreedToTerms) {
      return res.status(400).json({ error: "You must accept the advertising rate terms" });
    }

    // 予約時点のメンバー数で料金を固定
    const memberCount = community.members;
    const dailyRate = memberCount * DAILY_RATE_PER_MEMBER;
    const startD = new Date(start);
    const endD = new Date(end);
    if (isNaN(startD.getTime()) || isNaN(endD.getTime()) || endD < startD) {
      return res.status(400).json({ error: "Invalid ad run dates" });
    }
    const days = Math.ceil((endD.getTime() - startD.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    const totalAmount = days * dailyRate;
    if (totalAmount < MIN_AD_AMOUNT) {
      return res.status(400).json({ error: `Minimum ad spend is $${(MIN_AD_AMOUNT / 100).toFixed(2)}. Please check the duration or member count.` });
    }
    const maxEnd = new Date();
    maxEnd.setMonth(maxEnd.getMonth() + MAX_MONTHS_AHEAD);
    if (endD > maxEnd) {
      return res.status(400).json({ error: `End date must be within ${MAX_MONTHS_AHEAD} months` });
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
      return res.status(409).json({ error: "That period is already booked. Please choose different dates." });
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
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const cid = paramNum(req, "communityId");
    const [community] = await db.select().from(communities).where(eq(communities.id, cid));
    if (!community) return res.status(404).json({ error: "Community not found" });
    if (community.adminId !== user.id) return res.status(403).json({ error: "Only the community owner can change this" });
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
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const cid = paramNum(req, "communityId");
    const [community] = await db.select().from(communities).where(eq(communities.id, cid));
    if (!community) return res.status(404).json({ error: "Community not found" });
    if (community.adminId !== user.id) return res.status(403).json({ error: "Only the community owner can change this" });
    const { distribution } = req.body as { distribution?: Record<string, number> };
    if (!distribution || typeof distribution !== "object") {
      return res.status(400).json({ error: "distribution object is required" });
    }
    // 合計100%検証
    const total = Object.values(distribution).reduce((s, v) => s + Number(v), 0);
    if (Math.abs(total - 100) > 1) {
      return res.status(400).json({ error: `Distribution must total 100% (currently ${total}%)` });
    }
    await db.update(communities)
      .set({ revenueDistribution: JSON.stringify(distribution) } as Partial<InferSelectModel<typeof communities>>)
      .where(eq(communities.id, cid));
    res.json({ ok: true });
  });

  // ジャンル管理人自動就任バッチAPI（毎月実行想定・手動トリガーも可)
  app.post("/api/genre-owners/assign", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Only admins can run this" });
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
          .set({ ownerUserId: topCommunity.adminId, assignedCommunityId: topCommunity.id, updatedAt: new Date() } as Partial<InferSelectModel<typeof genreOwners>>)
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
    if (!user) return res.status(401).json({ error: "Please sign in" });

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
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const id = paramNum(req, "id");
    const [ad] = await db.select().from(communityAds).where(eq(communityAds.id, id));
    if (!ad) return res.status(404).json({ error: "Application not found" });
    if (ad.status !== "pending") return res.status(400).json({ error: "This application has already been processed" });
    const [mod] = await db
      .select()
      .from(communityModerators)
      .where(and(eq(communityModerators.communityId, ad.communityId), eq(communityModerators.userId, user.id)));
    if (!mod) return res.status(403).json({ error: "Only moderators of this community can approve this" });
    await db.update(communityAds).set({ status: "moderator_approved", approvedByModerator: user.id } as Partial<InferSelectModel<typeof communityAds>>).where(eq(communityAds.id, id));
    res.json({ ok: true });
  });

  app.patch("/api/community-ads/:id/approve", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const id = paramNum(req, "id");
    const [ad] = await db.select().from(communityAds).where(eq(communityAds.id, id));
    if (!ad) return res.status(404).json({ error: "Application not found" });
    if (ad.status !== "moderator_approved") return res.status(400).json({ error: "The owner can approve after moderator approval" });
    const [community] = await db.select().from(communities).where(eq(communities.id, ad.communityId));
    if (!community || community.adminId !== user.id) return res.status(403).json({ error: "Only the owner can give final approval" });
    await db.update(communityAds).set({ status: "approved", approvedByOwner: user.id } as Partial<InferSelectModel<typeof communityAds>>).where(eq(communityAds.id, id));
    res.json({ ok: true });
  });

  app.patch("/api/community-ads/:id/reject", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const id = paramNum(req, "id");
    const [ad] = await db.select().from(communityAds).where(eq(communityAds.id, id));
    if (!ad) return res.status(404).json({ error: "Application not found" });
    if (ad.status === "approved" || ad.status === "rejected") return res.status(400).json({ error: "Already processed" });
    const [community] = await db.select().from(communities).where(eq(communities.id, ad.communityId));
    const [mod] = await db
      .select()
      .from(communityModerators)
      .where(and(eq(communityModerators.communityId, ad.communityId), eq(communityModerators.userId, user.id)));
    const isOwner = community?.adminId === user.id;
    const isMod = !!mod;
    if (!isOwner && !isMod) return res.status(403).json({ error: "Only owners or moderators can reject" });
    await db.update(communityAds).set({ status: "rejected" } as Partial<InferSelectModel<typeof communityAds>>).where(eq(communityAds.id, id));
    res.json({ ok: true });
  });

  // ── Reports（通報・Claude API判定)────────────────────────────────────
  const REPORT_REASONS = ["spam", "harassment", "inappropriate", "other"] as const;

  app.post("/api/reports", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });

    const { contentType, contentId, reason } = req.body as {
      contentType?: string;
      contentId?: number;
      reason?: string;
    };
    const cid = Number(contentId) || 0;
    const type = contentType === "comment" ? "comment" : contentType === "video" ? "video" : null;
    if (!type || !cid || !reason || !REPORT_REASONS.includes(reason as any)) {
      return res.status(400).json({ error: "Provide contentType (video/comment), contentId, and reason (spam/harassment/inappropriate/other)" });
    }

    let contentText: string;
    if (type === "video") {
      const [video] = await db.select().from(videos).where(eq(videos.id, cid));
      if (!video) return res.status(404).json({ error: "Target not found" });
      contentText = video.title ?? "";
    } else {
      const [comment] = await db.select().from(videoComments).where(eq(videoComments.id, cid));
      if (!comment) return res.status(404).json({ error: "Target not found" });
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
        await db.update(videos).set({ hidden: true } as Partial<InferSelectModel<typeof videos>>).where(eq(videos.id, cid));
      } else {
        await db.update(videoComments).set({ hidden: true } as Partial<InferSelectModel<typeof videoComments>>).where(eq(videoComments.id, cid));
      }
    }

    res.status(201).json(report);
  });

  // ── Concerts（公演)──────────────────────────────────────────────────

  app.post("/api/concerts", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

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
      return res.status(400).json({ error: "Required items are missing" });
    }

    const shares = [
      Number(artistShare ?? 0),
      Number(photographerShare ?? 0),
      Number(editorShare ?? 0),
      Number(venueShare ?? 0),
    ];
    if (shares.some((s) => s < 0)) {
      return res.status(400).json({ error: "Distribution ratios must be 0 or greater" });
    }
    const sum = shares.reduce((a, b) => a + b, 0);
    if (sum !== 100) {
      return res.status(400).json({ error: "Distribution must total 100%" });
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
    if (!row) return res.status(404).json({ error: "Show not found" });
    res.json(row);
  });

  app.post("/api/concerts/:id/staff-request", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const concertId = paramNum(req, "id");
    const [concert] = await db.select().from(concerts).where(eq(concerts.id, concertId));
    if (!concert) return res.status(404).json({ error: "Show not found" });

    // 既に申請済みかチェック
    const existing = await db
      .select()
      .from(concertStaff)
      .where(and(eq(concertStaff.concertId, concertId), eq(concertStaff.staffUserId, user.id)));
    if (existing.length > 0) {
      return res.status(400).json({ error: "Already applied" });
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
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const concertId = paramNum(req, "id");
    const [concert] = await db.select().from(concerts).where(eq(concerts.id, concertId));
    if (!concert) return res.status(404).json({ error: "Show not found" });
    if (concert.artistUserId !== user.id) {
      return res.status(403).json({ error: "Only the artist can view applications" });
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
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const concertId = paramNum(req, "id");
    const staffId = paramNum(req, "staffId");

    const [concert] = await db.select().from(concerts).where(eq(concerts.id, concertId));
    if (!concert) return res.status(404).json({ error: "Show not found" });
    if (concert.artistUserId !== user.id) {
      return res.status(403).json({ error: "Only the artist can approve" });
    }

    const [staff] = await db
      .select()
      .from(concertStaff)
      .where(and(eq(concertStaff.id, staffId), eq(concertStaff.concertId, concertId)));
    if (!staff) return res.status(404).json({ error: "Request not found" });

    const [updated] = await db
      .update(concertStaff)
      .set({ status: "approved" } as Partial<InferSelectModel<typeof concertStaff>>)
      .where(eq(concertStaff.id, staffId))
      .returning();

    res.json(updated);
  });

  app.patch("/api/concerts/:id/staff/:staffId/reject", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const concertId = paramNum(req, "id");
    const staffId = paramNum(req, "staffId");

    const [concert] = await db.select().from(concerts).where(eq(concerts.id, concertId));
    if (!concert) return res.status(404).json({ error: "Show not found" });
    if (concert.artistUserId !== user.id) {
      return res.status(403).json({ error: "Only the artist can reject" });
    }

    const [staff] = await db
      .select()
      .from(concertStaff)
      .where(and(eq(concertStaff.id, staffId), eq(concertStaff.concertId, concertId)));
    if (!staff) return res.status(404).json({ error: "Request not found" });

    const [updated] = await db
      .update(concertStaff)
      .set({ status: "rejected" } as Partial<InferSelectModel<typeof concertStaff>>)
      .where(eq(concertStaff.id, staffId))
      .returning();

    res.json(updated);
  });

  // ── Genre Ads（ジャンルページ広告)───────────────────────────────────────
  const GENRE_MIN_AMOUNT = 7_000;
  const GENRE_MAX_MONTHS_AHEAD = 3;

  app.post("/api/genre-ads", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });

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
      return res.status(400).json({ error: "Invalid genreId" });
    }
    if (!companyName || !contactName || !email || !bannerUrl || !startDate || !endDate) {
      return res.status(400).json({ error: "Required items are missing" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ error: "Invalid date format (YYYY-MM-DD)" });
    }
    if (end < start) {
      return res.status(400).json({ error: "End date must be on or after start date" });
    }
    const now = new Date();
    const maxEnd = new Date(now);
    maxEnd.setMonth(maxEnd.getMonth() + GENRE_MAX_MONTHS_AHEAD);
    if (end > maxEnd) {
      return res.status(400).json({ error: `End date must be within ${GENRE_MAX_MONTHS_AHEAD} months` });
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
      return res.status(400).json({ error: `Minimum ad spend is $${(GENRE_MIN_AMOUNT / 100).toFixed(2)}` });
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
    if (!user) return res.status(401).json({ error: "Please sign in" });

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
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const id = paramNum(req, "id");

    const [ad] = await db.select().from(genreAds).where(eq(genreAds.id, id));
    if (!ad) return res.status(404).json({ error: "Application not found" });

    const [owner] = await db.select().from(genreOwners).where(and(eq(genreOwners.genreId, ad.genreId), eq(genreOwners.ownerUserId, user.id)));
    if (!owner) return res.status(403).json({ error: "You are not the genre manager" });

    await db.update(genreAds).set({ status: "approved" } as Partial<InferSelectModel<typeof genreAds>>).where(eq(genreAds.id, id));
    res.json({ ok: true });
  });

  app.patch("/api/genre-ads/:id/reject", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const id = paramNum(req, "id");

    const [ad] = await db.select().from(genreAds).where(eq(genreAds.id, id));
    if (!ad) return res.status(404).json({ error: "Application not found" });

    const [owner] = await db.select().from(genreOwners).where(and(eq(genreOwners.genreId, ad.genreId), eq(genreOwners.ownerUserId, user.id)));
    if (!owner) return res.status(403).json({ error: "You are not the genre manager" });

    await db.update(genreAds).set({ status: "rejected" } as Partial<InferSelectModel<typeof genreAds>>).where(eq(genreAds.id, id));
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

  /** 月次Cron: creator_monthly_scores の rankOverall / rankPaidLive を再計算し creators.rank / heatScore を同期 */
  app.post("/api/cron/update-liver-rankings", async (_req: Request, res: Response) => {
    const yearMonth = getYearMonth();
    const allCreators = await db.select().from(creators);
    if (allCreators.length === 0) return res.json({ ok: true, updated: 0 });

    const scores = await db.select().from(creatorMonthlyScores).where(eq(creatorMonthlyScores.yearMonth, yearMonth));
    const scoreMap = new Map(scores.map((s) => [s.creatorId, s]));

    const ranked = allCreators.map((c) => {
      const s = scoreMap.get(c.id);
      const revenue = (s?.tipGross ?? 0) + (s?.paidLiveGross ?? 0);
      const composite = revenue * 0.5 + c.totalViews * 0.3 + c.followers * 0.2;
      return { creator: c, score: s ?? null, revenue, paidLiveGross: s?.paidLiveGross ?? 0, composite };
    });

    ranked.sort((a, b) => b.composite - a.composite);
    const overallRanks = new Map(ranked.map((r, i) => [r.creator.id, i + 1]));

    const byPaidLive = [...ranked].sort((a, b) => b.paidLiveGross - a.paidLiveGross);
    const paidLiveRanks = new Map(byPaidLive.map((r, i) => [r.creator.id, i + 1]));

    for (const { creator, score, composite } of ranked) {
      const rankOverall = overallRanks.get(creator.id) ?? 999;
      const rankPaidLive = paidLiveRanks.get(creator.id) ?? 999;

      if (score) {
        await db.update(creatorMonthlyScores)
          .set({ compositeScore: composite, rankOverall, rankPaidLive, updatedAt: new Date() } as Partial<InferSelectModel<typeof creatorMonthlyScores>>)
          .where(eq(creatorMonthlyScores.id, score.id));
      } else {
        await db.insert(creatorMonthlyScores).values({
          creatorId: creator.id, yearMonth, tipGross: 0, paidLiveGross: 0,
          compositeScore: composite, rankOverall, rankPaidLive,
        } as typeof creatorMonthlyScores.$inferInsert);
      }

      await db.update(creators)
        .set({ rank: rankOverall, heatScore: composite } as Partial<InferSelectModel<typeof creators>>)
        .where(eq(creators.id, creator.id));
    }

    res.json({ ok: true, updated: ranked.length, yearMonth });
  });

  /** Admin: report queue — pending (gray_zone) items only. Pass ?all=1 to see everything. */
  app.get("/api/admin/reports", async (req: Request, res: Response) => {
    const user = await getAdminUserOrReject(req, res);
    if (!user) return;

    const showAll = req.query.all === "1";
    const rows = await db
      .select()
      .from(reports)
      .where(showAll ? undefined : eq(reports.status as any, "pending"))
      .orderBy(desc(reports.createdAt));

    res.json(rows);
  });

  /** 管理者向け: 通報されたコンテンツを非表示にする（動画 or コメント) */
  app.patch("/api/admin/reports/:id/hide", async (req: Request, res: Response) => {
    const user = await getAdminUserOrReject(req, res);
    if (!user) return;

    const id = paramNum(req, "id");
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    if (!report) return res.status(404).json({ error: "Report not found" });

    if (report.contentType === "video") {
      await db.update(videos).set({ hidden: true } as Partial<InferSelectModel<typeof videos>>).where(eq(videos.id, report.contentId));
    } else if (report.contentType === "comment") {
      await db.update(videoComments).set({ hidden: true } as Partial<InferSelectModel<typeof videoComments>>).where(eq(videoComments.id, report.contentId));
    }

    await db.update(reports).set({ status: "hidden" } as Partial<InferSelectModel<typeof reports>>).where(eq(reports.id, id));
    res.json({ ok: true });
  });

  /** 管理者向け: 問題なしとしてクローズ（ステータスを reviewed に) */
  app.patch("/api/admin/reports/:id/dismiss", async (req: Request, res: Response) => {
    const user = await getAdminUserOrReject(req, res);
    if (!user) return;

    const id = paramNum(req, "id");
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    if (!report) return res.status(404).json({ error: "Report not found" });

    await db.update(reports).set({ status: "reviewed" } as Partial<InferSelectModel<typeof reports>>).where(eq(reports.id, id));
    res.json({ ok: true });
  });

  app.get("/api/admin/stats", async (req: Request, res: Response) => {
    const admin = await getAdminUserOrReject(req, res);
    if (!admin) return;

    const [{ userCount }] = await db.select({ userCount: sql<number>`count(*)::int` }).from(users);
    const [{ videoCount }] = await db.select({ videoCount: sql<number>`count(*)::int` }).from(videos);

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [{ salesLast30Days }] = await db
      .select({
        salesLast30Days: sql<number>`coalesce(sum(${earnings.amount}), 0)::int`,
      })
      .from(earnings)
      .where(gte(earnings.createdAt, since));

    res.json({
      userCount: Number(userCount ?? 0),
      videoCount: Number(videoCount ?? 0),
      salesLast30Days: Number(salesLast30Days ?? 0),
    });
  });

  app.get("/api/admin/users", async (req: Request, res: Response) => {
    const admin = await getAdminUserOrReject(req, res);
    if (!admin) return;

    const rows = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        role: users.role,
        isBanned: users.isBanned,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    res.json(rows);
  });

  app.patch("/api/admin/users/:id", async (req: Request, res: Response) => {
    const admin = await getAdminUserOrReject(req, res);
    if (!admin) return;

    const targetUserId = paramNum(req, "id");
    if (!targetUserId) return res.status(400).json({ error: "Invalid user id" });

    const role = typeof req.body?.role === "string" ? req.body.role.trim().toUpperCase() : undefined;
    const isBanned = typeof req.body?.isBanned === "boolean" ? req.body.isBanned : undefined;

    const nextValues: Partial<InferSelectModel<typeof users>> = { updatedAt: new Date() };
    if (role !== undefined) {
      if (!["USER", "ADMIN"].includes(role)) {
        return res.status(400).json({ error: "role must be USER or ADMIN" });
      }
      nextValues.role = role;
    }
    if (isBanned !== undefined) {
      nextValues.isBanned = isBanned;
    }
    if (role === undefined && isBanned === undefined) {
      return res.status(400).json({ error: "No updatable fields provided" });
    }

    const [updated] = await db
      .update(users)
      .set(nextValues)
      .where(eq(users.id, targetUserId))
      .returning({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        role: users.role,
        isBanned: users.isBanned,
        createdAt: users.createdAt,
      });
    if (!updated) return res.status(404).json({ error: "User not found" });

    res.json(updated);
  });

  app.get("/api/admin/content", async (req: Request, res: Response) => {
    const admin = await getAdminUserOrReject(req, res);
    if (!admin) return;

    const rows = await db
      .select({
        id: videos.id,
        title: videos.title,
        creator: videos.creator,
        thumbnail: videos.thumbnail,
        hidden: videos.hidden,
        visibility: videos.visibility,
        price: videos.price,
        createdAt: videos.createdAt,
      })
      .from(videos)
      .orderBy(desc(videos.createdAt));

    res.json(rows);
  });

  app.patch("/api/admin/content/:id", async (req: Request, res: Response) => {
    const admin = await getAdminUserOrReject(req, res);
    if (!admin) return;

    const videoId = paramNum(req, "id");
    if (!videoId) return res.status(400).json({ error: "Invalid content id" });
    const hidden = typeof req.body?.hidden === "boolean" ? req.body.hidden : true;

    const [updated] = await db
      .update(videos)
      .set({
        hidden,
      } as Partial<InferSelectModel<typeof videos>>)
      .where(eq(videos.id, videoId))
      .returning({
        id: videos.id,
        title: videos.title,
        hidden: videos.hidden,
        visibility: videos.visibility,
      });
    if (!updated) return res.status(404).json({ error: "Content not found" });
    res.json(updated);
  });

  app.delete("/api/admin/content/:id", async (req: Request, res: Response) => {
    const admin = await getAdminUserOrReject(req, res);
    if (!admin) return;

    const videoId = paramNum(req, "id");
    if (!videoId) return res.status(400).json({ error: "Invalid content id" });

    await db.delete(savedVideos).where(eq(savedVideos.videoId, videoId));
    await db.delete(videoComments).where(eq(videoComments.videoId, videoId));
    await db.delete(reports).where(and(eq(reports.contentType, "video"), eq(reports.contentId, videoId)));
    await db.delete(jukeboxQueue).where(eq(jukeboxQueue.videoId, videoId));
    const deleted = await db.delete(videos).where(eq(videos.id, videoId)).returning({ id: videos.id });
    if (deleted.length === 0) return res.status(404).json({ error: "Content not found" });

    res.json({ ok: true, id: videoId });
  });

  // ── Upload signed URL (Cloudflare R2) ────────────────────────────
  app.post("/api/upload-url", async (req: Request, res: Response) => {
    debugIngestServer({
      sessionId: "88cb7d",
      runId: "initial",
      hypothesisId: "H5",
      location: "server/routes.ts:/api/upload-url",
      message: "Upload URL endpoint hit",
      data: {
        hasFileName: Boolean((req.body as { fileName?: string })?.fileName),
        hasContentType: Boolean((req.body as { contentType?: string })?.contentType),
      },
      timestamp: Date.now(),
    });
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const hasAccessKey = Boolean(process.env.R2_ACCESS_KEY_ID?.trim());
    const hasSecret = Boolean(process.env.R2_SECRET_ACCESS_KEY?.trim());
    const hasEndpoint = Boolean(process.env.R2_ENDPOINT?.trim());
    const hasBucket = Boolean(process.env.R2_BUCKET_NAME?.trim());
    console.log("[upload-url] r2_env", {
      hasAccessKey,
      hasSecret,
      hasEndpoint,
      hasBucket,
      userId: user.id,
    });

    const { fileName, contentType: rawContentType } = req.body as {
      fileName?: string;
      contentType?: string;
    };

    if (!fileName) {
      return res.status(400).json({ error: "fileName is required" });
    }

    /** ブラウザが video/* で空文字を返すことがある。署名と PUT ヘッダを一致させるため octet-stream に落とす */
    const contentType =
      typeof rawContentType === "string" && rawContentType.trim().length > 0
        ? rawContentType.trim()
        : "application/octet-stream";

    const safeName = String(fileName).replace(/[^a-zA-Z0-9_.-]/g, "_");
    const key = `rawstock_${Date.now()}_${safeName}`;

    try {
      const { uploadUrl, publicUrl } = await createSignedUploadUrl(key, contentType);
      console.log("[upload-url] presign_ok", {
        keyLen: key.length,
        keyPrefix: key.slice(0, 56),
        contentType,
      });
      res.json({ uploadUrl, key, url: publicUrl });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      const notConfigured =
        errMsg.includes("R2 is not configured") ||
        errMsg.includes("正しく設定") ||
        /not\s+configured|correctly\s+configured/i.test(errMsg);
      console.error("[upload-url] presign_failed", {
        hasAccessKey,
        hasSecret,
        hasEndpoint,
        hasBucket,
        err: e,
      });
      res.status(notConfigured ? 503 : 500).json({
        error: notConfigured
          ? "File storage is not configured. Set R2_* variables on the server (and R2_PUBLIC_BASE_URL if you use a public domain)."
          : "Failed to issue signed URL",
        code: notConfigured ? "R2_NOT_CONFIGURED" : "R2_PRESIGN_FAILED",
      });
    }
  });

  // ── Videos ───────────────────────────────────────────────────────
  app.get("/api/videos", async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "private, no-store");
    const genreId = (req as any).query?.genre;
    const communityIdParam = (req as any).query?.communityId;
    let rows = await db
      .select()
      .from(videos)
      .where(and(eq(videos.isRanked, false), eq(videos.hidden, false)))
      .orderBy(desc(videos.createdAt));
    // visibility=community の投稿のみ一覧に表示（既存データは visibility 未設定時も表示)
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
    if (!user) return res.status(401).json({ error: "Not authenticated" });
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

  /** マイリスト: 保存済み動画一覧（:id より前に定義すること) */
  app.get("/api/videos/saved", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

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
      timeAgo: r.createdAt ? formatTimeAgo(r.createdAt) : "Just now",
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
    /** チケット分配・ウォレット用は必ず users.id（creators.id を混在させない） */
    const creatorId = (row as any).userId ?? creatorUser?.id ?? null;
    res.json({ ...row, timeAgo, creatorType, creatorId, creatorLiverProfileId: creatorLiver?.id ?? null });
  });

  /** 動画コメント一覧（非表示コメントは除外) */
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

  /** コメント投稿（ログイン必須) */
  app.post("/api/videos/:id/comments", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const videoId = paramNum(req, "id");
    const text = (req.body as { text?: string }).text?.trim();
    if (!text) return res.status(400).json({ error: "Comment text is required" });

    const [row] = await db
      .insert(videoComments)
      .values({ videoId, userId: user.id, text } as typeof videoComments.$inferInsert)
      .returning();
    res.status(201).json(row);
  });

  app.post("/api/videos", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const { title, community, communityId, duration, price, thumbnail, description, concertId, visibility, videoUrl, youtubeId, postType, complianceAcknowledged } = req.body as {
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
      complianceAcknowledged?: boolean;
    };

    if (complianceAcknowledged !== true) {
      return res.status(400).json({
        message: "Confirm community guidelines and rights before posting",
        code: "COMPLIANCE_ACK_REQUIRED",
      });
    }

    if (!title || !duration || !thumbnail) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    const vis = visibility === "draft" ? "draft" : visibility === "my_page_only" ? "my_page_only" : "community";
    if (vis === "community" && (!community || !community.trim())) {
      return res.status(400).json({ message: "Specify community when posting to a community" });
    }

    const [row] = await db
      .insert(videos)
      .values({
        title,
        creator: user.displayName,
        community: community?.trim() ?? "",
        views: 0,
        timeAgo: "Just now",
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

  /** 自分の投稿の編集（タイトル・公開範囲) */
  app.patch("/api/videos/:id", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const id = paramNum(req, "id");
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    if (!video) return res.status(404).json({ message: "Not found" });
    const isOwner = (video as any).userId === user.id || video.creator === user.displayName;
    if (!isOwner) return res.status(403).json({ error: "You do not have permission to edit" });

    const { title, visibility, communityId, community } = req.body as {
      title?: string;
      visibility?: "draft" | "my_page_only" | "community";
      communityId?: number | null;
      community?: string;
    };

    const updates: Record<string, unknown> = {};
    if (title !== undefined) {
      const newTitle = title?.trim();
      if (!newTitle) return res.status(400).json({ error: "Title is required" });
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
      .set(updates as Partial<InferSelectModel<typeof videos>>)
      .where(eq(videos.id, id))
      .returning();
    res.json(updated);
  });

  /** 自分の投稿の削除（コメントも合わせて削除) */
  app.delete("/api/videos/:id", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const id = paramNum(req, "id");
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    if (!video) return res.status(404).json({ message: "Not found" });
    const isOwner = (video as any).userId === user.id || video.creator === user.displayName;
    if (!isOwner) return res.status(403).json({ error: "You do not have permission to delete" });

    await db.delete(videoComments).where(eq(videoComments.videoId, id));
    await db.delete(videos).where(eq(videos.id, id));
    res.json({ ok: true });
  });

  /** マイリスト: 動画を保存 */
  app.post("/api/videos/:id/save", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

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
      // 既に保存済み（UNIQUE制約)の場合は無視
    }
    res.json({ ok: true });
  });

  /** マイリスト: 動画の保存を解除 */
  app.delete("/api/videos/:id/save", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

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

  /** 公開プロフィール用: ユーザーの公開投稿一覧（my_page_only 以上) */
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
    if (session.spotsLeft <= 0) return res.status(400).json({ message: "Fully booked" });
    const [updated] = await db
      .update(bookingSessions)
      .set({ spotsLeft: session.spotsLeft - 1 } as Partial<InferSelectModel<typeof bookingSessions>>)
      .where(eq(bookingSessions.id, id))
      .returning();
    res.json(updated);
  });

  // ── DM（dm_threads: ユーザー間スレッド)──────────────────────────────
  app.post("/api/dm/open", async (req: Request, res: Response) => {
    const me = await getAuthUser(req);
    if (!me) return res.status(401).json({ error: "Not authenticated" });
    const raw = (req.body as { peerUserId?: unknown })?.peerUserId;
    const peer =
      typeof raw === "number" && Number.isFinite(raw)
        ? Math.floor(raw)
        : typeof raw === "string"
          ? parseInt(raw, 10)
          : NaN;
    if (!Number.isFinite(peer) || peer < 1) {
      return res.status(400).json({ error: "peerUserId is required" });
    }
    if (peer === me.id) return res.status(400).json({ error: "You cannot DM yourself" });
    const [peerUser] = await db.select({ id: users.id }).from(users).where(eq(users.id, peer));
    if (!peerUser) return res.status(404).json({ error: "User not found" });
    const u1 = Math.min(me.id, peer);
    const u2 = Math.max(me.id, peer);
    let [th] = await db
      .select()
      .from(dmThreads)
      .where(and(eq(dmThreads.user1Id, u1), eq(dmThreads.user2Id, u2)));
    if (!th) {
      [th] = await db
        .insert(dmThreads)
        .values({ user1Id: u1, user2Id: u2 } as typeof dmThreads.$inferInsert)
        .returning();
    }
    res.json({ threadId: th.id });
  });

  app.get("/api/dm-messages", async (req: Request, res: Response) => {
    const me = await getAuthUser(req);
    if (!me) return res.json([]);
    const threads = await db
      .select()
      .from(dmThreads)
      .where(or(eq(dmThreads.user1Id, me.id), eq(dmThreads.user2Id, me.id)))
      .orderBy(desc(dmThreads.updatedAt));
    const out: {
      id: number;
      name: string;
      avatar: string;
      lastMessage: string;
      time: string;
      unread: number;
      online: boolean;
      otherUserId: number;
    }[] = [];
    for (const t of threads) {
      const peerId = t.user1Id === me.id ? t.user2Id : t.user1Id;
      const [peer] = await db
        .select({ displayName: users.displayName, profileImageUrl: users.profileImageUrl })
        .from(users)
        .where(eq(users.id, peerId));
      if (!peer) continue;
      out.push({
        id: t.id,
        name: peer.displayName ?? "User",
        avatar: peer.profileImageUrl ?? "",
        lastMessage: t.lastMessagePreview ?? "",
        time: formatDmThreadTime(t.updatedAt ?? undefined),
        unread: 0,
        online: false,
        otherUserId: peerId,
      });
    }
    const opsDm = await ensureOperationsDmRow();
    const [{ welcomeDmSentAt, operationsDmOpenedAt }] = await db
      .select({
        welcomeDmSentAt: users.welcomeDmSentAt,
        operationsDmOpenedAt: users.operationsDmOpenedAt,
      })
      .from(users)
      .where(eq(users.id, me.id));
    if (opsDm) {
      const preview =
        (opsDm.lastMessage ?? "").split("\n").find((line) => line.trim().length > 0) ?? opsDm.lastMessage ?? "";
      const opsUnread = welcomeDmSentAt && !operationsDmOpenedAt ? 1 : 0;
      out.unshift({
        id: -opsDm.id,
        name: opsDm.name,
        avatar: opsDm.avatar,
        lastMessage: preview.slice(0, 200),
        time: opsDm.time || "Just now",
        unread: opsUnread,
        online: Boolean(opsDm.online),
        otherUserId: 0,
      });
    }
    res.json(out);
  });

  app.post("/api/dm-messages/:id/read", async (req: Request, res: Response) => {
    const rawId = paramNum(req, "id");
    const legacyDmId = rawId < 0 ? -rawId : rawId;
    const me = await getAuthUser(req);
    if (me && rawId > 0) {
      const [th] = await db
        .select()
        .from(dmThreads)
        .where(
          and(
            eq(dmThreads.id, rawId),
            or(eq(dmThreads.user1Id, me.id), eq(dmThreads.user2Id, me.id)),
          ),
        );
      if (th) return res.json({ ok: true });
    }
    const [updated] = await db
      .update(dmMessages)
      .set({ unread: 0 } as Partial<InferSelectModel<typeof dmMessages>>)
      .where(eq(dmMessages.id, legacyDmId))
      .returning();
    if (me) {
      const [legacyMeta] = await db
        .select({ name: dmMessages.name })
        .from(dmMessages)
        .where(eq(dmMessages.id, legacyDmId));
      if (legacyMeta?.name === OPERATIONS_DM_NAME) {
        await db
          .update(users)
          .set({ operationsDmOpenedAt: new Date(), updatedAt: new Date() } as Partial<InferSelectModel<typeof users>>)
          .where(eq(users.id, me.id));
      }
    }
    res.json(updated ?? { ok: true });
  });

  // ── Notifications ─────────────────────────────────────────────────
  app.get("/api/notifications/unread-count", async (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "private, no-store");
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
    await db.update(notifications).set({ isRead: true } as Partial<InferSelectModel<typeof notifications>>);
    res.json({ ok: true });
  });

  app.post("/api/notifications/:id/read", async (req: Request, res: Response) => {
    const id = paramNum(req, "id");
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true } as Partial<InferSelectModel<typeof notifications>>)
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
    // ギフトメッセージはモデレーション対象外（金額のみ)、通常メッセージはモデレーション実施
    if (!isGift && message) {
      const modResult = await moderateContent(message);
      if (modResult.allowed === false) {
        return res.status(400).json({ error: modResult.reason ?? "This content is not allowed" });
      }
    }
    const [msg] = await db.insert(liveStreamChat).values({
      streamId: id, username: username ?? "You", avatar, message,
      isGift: isGift ?? false, giftAmount: giftAmount ?? null,
    } as typeof liveStreamChat.$inferInsert).returning();
    res.json(msg);
  });

  // ── DM 会話（:id = dm_threads.id。レガシー dm_messages.id は下でフォールバック) ──
  app.get("/api/dm-messages/:id/peer", async (req: Request, res: Response) => {
    const rawId = paramNum(req, "id");
    const me = await getAuthUser(req);
    if (!me) return res.status(401).json({ error: "Not authenticated" });
    const legacyDmId = rawId < 0 ? -rawId : rawId;
    if (rawId > 0) {
      const [th] = await db
        .select()
        .from(dmThreads)
        .where(
          and(eq(dmThreads.id, rawId), or(eq(dmThreads.user1Id, me.id), eq(dmThreads.user2Id, me.id))),
        );
      if (th) {
        const peerId = th.user1Id === me.id ? th.user2Id : th.user1Id;
        const [peer] = await db
          .select({ displayName: users.displayName, profileImageUrl: users.profileImageUrl })
          .from(users)
          .where(eq(users.id, peerId));
        if (!peer) return res.status(404).json({ error: "Not found" });
        return res.json({
          name: peer.displayName ?? "User",
          avatar: peer.profileImageUrl ?? "",
          otherUserId: peerId,
        });
      }
    }
    const [legacyDm] = await db.select().from(dmMessages).where(eq(dmMessages.id, legacyDmId));
    if (!legacyDm) return res.status(404).json({ error: "Not found" });
    res.json({
      name: legacyDm.name,
      avatar: legacyDm.avatar,
      otherUserId: 0,
    });
  });

  app.get("/api/dm-messages/:id/conversation", async (req: Request, res: Response) => {
    const rawId = paramNum(req, "id");
    const me = await getAuthUser(req);
    if (!me) return res.status(401).json({ error: "Not authenticated" });
    const legacyDmId = rawId < 0 ? -rawId : rawId;
    if (rawId > 0) {
      const [th] = await db
        .select()
        .from(dmThreads)
        .where(
          and(eq(dmThreads.id, rawId), or(eq(dmThreads.user1Id, me.id), eq(dmThreads.user2Id, me.id))),
        );
      if (th) {
        const rows = await db
          .select()
          .from(dmThreadMessages)
          .where(eq(dmThreadMessages.threadId, rawId))
          .orderBy(asc(dmThreadMessages.createdAt));
        return res.json(
          rows.map((m) => ({
            id: m.id,
            sender: m.senderUserId === me.id ? "me" : "them",
            senderId: m.senderUserId,
            text: m.text,
            isRead: true,
            createdAt: (m.createdAt ?? new Date()).toISOString(),
            imageUrl: null as string | null,
          })),
        );
      }
    }
    const msgs = await db
      .select()
      .from(dmConversationMessages)
      .where(eq(dmConversationMessages.dmId, legacyDmId))
      .orderBy(asc(dmConversationMessages.createdAt));
    res.json(msgs);
  });

  app.post("/api/dm-messages/:id/conversation", async (req: Request, res: Response) => {
    const rawId = paramNum(req, "id");
    const legacyDmId = rawId < 0 ? -rawId : rawId;
    const me = await getAuthUser(req);
    if (!me) return res.status(401).json({ error: "Not authenticated" });
    const text = typeof (req.body as { text?: unknown })?.text === "string" ? (req.body as { text: string }).text : "";
    if (!text.trim()) return res.status(400).json({ error: "Please enter a message" });
    if (rawId > 0) {
      const [th] = await db
        .select()
        .from(dmThreads)
        .where(
          and(eq(dmThreads.id, rawId), or(eq(dmThreads.user1Id, me.id), eq(dmThreads.user2Id, me.id))),
        );
      if (th) {
        const [msg] = await db
          .insert(dmThreadMessages)
          .values({
            threadId: rawId,
            senderUserId: me.id,
            text: text.trim(),
          } as typeof dmThreadMessages.$inferInsert)
          .returning();
        await db
          .update(dmThreads)
          .set({
            lastMessagePreview: text.trim().slice(0, 200),
            updatedAt: new Date(),
          } as Partial<InferSelectModel<typeof dmThreads>>)
          .where(eq(dmThreads.id, rawId));
        await syncUserLastContentLang(me.id, text.trim());
        return res.json({
          id: msg.id,
          sender: "me",
          senderId: me.id,
          text: msg.text,
          isRead: true,
          createdAt: (msg.createdAt ?? new Date()).toISOString(),
          imageUrl: null,
        });
      }
    }
    const [msg] = await db
      .insert(dmConversationMessages)
      .values({
        dmId: legacyDmId,
        sender: "me",
        text: text.trim(),
        isRead: true,
      } as typeof dmConversationMessages.$inferInsert)
      .returning();
    await db
      .update(dmMessages)
      .set({ lastMessage: text.trim(), unread: 0 } as Partial<InferSelectModel<typeof dmMessages>>)
      .where(eq(dmMessages.id, legacyDmId));
    await syncUserLastContentLang(me.id, text.trim());
    res.json({
      ...msg,
      createdAt: (msg.createdAt ?? new Date()).toISOString(),
      imageUrl: null as string | null,
    });
  });

  // ── Jukebox ───────────────────────────────────────────────────────
  /** トップバナー用: 再生中・待機中のコミュニティ一覧（:communityId より先に定義) */
  app.get("/api/jukebox/active-sessions", async (_req: Request, res: Response) => {
    const playingRows = await db
      .select({
        communityId: jukeboxState.communityId,
        communityName: communities.name,
        trackTitle: jukeboxState.currentVideoTitle,
      })
      .from(jukeboxState)
      .innerJoin(communities, eq(communities.id, jukeboxState.communityId))
      .where(eq(jukeboxState.isPlaying, true));

    const active = playingRows
      .filter((r) => (r.trackTitle ?? "").trim().length > 0)
      .map((r) => ({
        communityId: r.communityId,
        communityName: r.communityName,
        trackTitle: (r.trackTitle ?? "").trim(),
      }));

    const idleRows = await db
      .select({
        communityId: jukeboxState.communityId,
        communityName: communities.name,
      })
      .from(jukeboxState)
      .innerJoin(communities, eq(communities.id, jukeboxState.communityId))
      .where(eq(jukeboxState.isPlaying, false));

    const activeIds = new Set(active.map((a) => a.communityId));
    const recruiting = idleRows
      .filter((r) => !activeIds.has(r.communityId))
      .map((r) => ({
        communityId: r.communityId,
        communityName: r.communityName,
      }));

    res.json({ active, recruiting });
  });

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
          await db.update(jukeboxQueue).set({ isPlayed: true } as Partial<InferSelectModel<typeof jukeboxQueue>>).where(eq(jukeboxQueue.id, currentItem.id));
          queueModified = true;
        }
        const next = queue.find((q) => !q.isPlayed && q.id !== currentItem?.id);
        if (next) {
          // 次に再生する曲は isPlayed にしない（キュー表示で消えないようにする)
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
              } as Partial<InferSelectModel<typeof jukeboxState>>,
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
            } as Partial<InferSelectModel<typeof jukeboxState>>)
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

    // youtubeId がなくても UI 用に state を返す（サムネ・タイトル表示のため)
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

  type StreamVisibility = "public" | "followers" | "community" | "paid";

  function normalizeStreamVisibility(v: unknown): StreamVisibility {
    if (v === "followers" || v === "community" || v === "paid") return v;
    return "public";
  }

  async function canViewerAccessLiveStream(
    srow: typeof streams.$inferSelect,
    viewer: Awaited<ReturnType<typeof getAuthUser>>,
  ): Promise<boolean> {
    const vis = (srow.visibility ?? "public") as StreamVisibility;
    if (vis === "public") return true;
    const hostId = srow.hostUserId;
    if (viewer && hostId != null && viewer.id === hostId) return true;
    if (vis === "followers") {
      if (hostId == null) return true;
      if (!viewer) return false;
      const [f] = await db
        .select({ id: userFollows.id })
        .from(userFollows)
        .where(and(eq(userFollows.followerId, viewer.id), eq(userFollows.followingId, hostId)));
      return !!f;
    }
    if (vis === "community") {
      const cid = srow.restrictedCommunityId;
      if (cid == null) return false;
      if (!viewer) return false;
      const [m] = await db
        .select({ id: communityMembers.id })
        .from(communityMembers)
        .where(and(eq(communityMembers.userId, viewer.id), eq(communityMembers.communityId, cid)));
      return !!m;
    }
    if (vis === "paid") {
      if (!viewer) return false;
      const [access] = await db
        .select({ id: streamPaidAccess.id })
        .from(streamPaidAccess)
        .where(and(eq(streamPaidAccess.streamId, srow.id), eq(streamPaidAccess.viewerUserId, viewer.id)))
        .limit(1);
      return !!access;
    }
    return true;
  }

  // ── Cloudflare Stream 接続テスト（直接トークン指定) ────────────────
  app.post("/api/debug/cf-stream-test", async (req: Request, res: Response) => {
    const { token, accountId, liveInputId } = req.body as {
      token?: string;
      accountId?: string;
      liveInputId?: string;
    };
    const testToken = token ?? CLOUDFLARE_STREAM_TOKEN;
    const testAccountId = accountId ?? CLOUDFLARE_ACCOUNT_ID;
    const testLiveInputId = liveInputId ?? "3e77a8086bdf3e67ea8af0bd764b350b";

    if (!testToken || !testAccountId) {
      return res.status(400).json({
        ok: false,
        error: "token and accountId are required (pass in body or set env vars)",
      });
    }

    const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${testAccountId}/stream/live_inputs/${testLiveInputId}`;
    try {
      const cfRes = await fetch(cfUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${testToken}`,
          "Content-Type": "application/json",
        },
      });
      const cfData = await cfRes.json() as Record<string, unknown>;
      return res.json({
        ok: cfRes.ok,
        status: cfRes.status,
        cfUrl,
        tokenPrefix: testToken.slice(0, 8) + "…",
        accountId: testAccountId,
        liveInputId: testLiveInputId,
        cfResponse: cfData,
      });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err.message, cfUrl });
    }
  });

  // ── Cloudflare Stream Live Input 作成 ───────────────────────────────
  app.post("/api/stream/create", async (req: Request, res: Response) => {
    debugIngestServer({
      sessionId: "88cb7d",
      runId: "initial",
      hypothesisId: "H5",
      location: "server/routes.ts:/api/stream/create",
      message: "Stream create endpoint hit",
      data: {
        hasCloudflareAccountId: Boolean(CLOUDFLARE_ACCOUNT_ID),
        hasCloudflareStreamToken: Boolean(CLOUDFLARE_STREAM_TOKEN),
        bodyKeys: Object.keys((req.body ?? {}) as Record<string, unknown>),
      },
      timestamp: Date.now(),
    });
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_STREAM_TOKEN) {
      return res.status(500).json({ error: "Cloudflare Stream is not configured" });
    }

    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const {
      name,
      title,
      visibility: visIn,
      restrictedCommunityId: rcIn,
      ticketPrice: ticketPriceIn,
    } = (req.body ?? {}) as {
      name?: string;
      title?: string;
      visibility?: unknown;
      restrictedCommunityId?: unknown;
      ticketPrice?: unknown;
    };
    const visibility = normalizeStreamVisibility(visIn);
    let restrictedCommunityId: number | null = null;
    let ticketPrice: number | null = null;
    if (visibility === "community") {
      const cid =
        typeof rcIn === "number" && Number.isFinite(rcIn)
          ? rcIn
          : parseInt(String(rcIn ?? ""), 10);
      if (!Number.isFinite(cid)) {
        return res.status(400).json({ error: "restrictedCommunityId is required for community-only streams" });
      }
      const [mem] = await db
        .select({ id: communityMembers.id })
        .from(communityMembers)
        .where(and(eq(communityMembers.userId, user.id), eq(communityMembers.communityId, cid)));
      if (!mem) {
        return res.status(403).json({ error: "You are not a member of the selected community" });
      }
      restrictedCommunityId = cid;
    }
    if (visibility === "paid") {
      const p =
        typeof ticketPriceIn === "number" && Number.isFinite(ticketPriceIn)
          ? ticketPriceIn
          : parseInt(String(ticketPriceIn ?? ""), 10);
      if (!Number.isFinite(p) || p <= 0) {
        return res.status(400).json({ error: "ticketPrice is required for paid streams" });
      }
      ticketPrice = p;
    }

    try {
      const displayTitle = (typeof title === "string" && title.trim()) || (typeof name === "string" && name.trim()) || "";
      const metaName = displayTitle || `RawStock Stream by ${user.displayName}`;
      console.log("[Cloudflare Stream] creating live_input with env:", {
        accountId: maskSecretPrefix(CLOUDFLARE_ACCOUNT_ID),
        streamToken: maskSecretPrefix(CLOUDFLARE_STREAM_TOKEN),
      });

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
              name: metaName,
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
        const detail = formatCloudflareApiErrors(json.errors);
        console.error("Cloudflare Stream create error:", cfRes.status, json.errors);
        const low = (detail ?? "").toLowerCase();
        const authHint =
          low.includes("authorization") ||
          low.includes("not authorized") ||
          low.includes("credentials") ||
          low.includes("forbidden") ||
          cfRes.status === 403;
        const hint = authHint
          ? "Fix: In Cloudflare Dashboard → My Profile → API Tokens, create a token with Account → Stream → Edit (or Stream with write). Set CLOUDFLARE_STREAM_TOKEN to that token and CLOUDFLARE_ACCOUNT_ID to the same account. R2 tokens will not work."
          : undefined;
        return res.status(502).json({
          error: "Failed to create Cloudflare Stream live input",
          ...(detail ? { detail } : {}),
          ...(hint ? { hint } : {}),
          cloudflareResponse: json,
        });
      }

      const result = json.result;
      const cfId = result.uid ?? "";
      const rtmpsUrl = result.rtmps?.url ?? "";
      const rtmpsStreamKey = result.rtmps?.streamKey ?? "";
      const whipPublish = (result.webRTC?.url ?? "").trim();
      const webRtcPlaybackUrl = (result.webRTCPlayback?.url ?? "").trim() || whipPublish;

      if (!cfId || !rtmpsUrl || !rtmpsStreamKey || !webRtcPlaybackUrl) {
        return res.status(502).json({
          error: "Incomplete Cloudflare Stream live input response",
          detail:
            "WHIP/WebRTC or RTMPS fields missing. Enable Cloudflare Stream on the account and check billing / minutes quota.",
        });
      }

      const whipUrlStored = whipPublish || webRtcPlaybackUrl;

      const [row] = await db
        .insert(streams)
        .values({
          cfLiveInputId: cfId,
          webRtcUrl: webRtcPlaybackUrl,
          rtmpsUrl,
          rtmpsStreamKey,
          currentViewers: 0,
          title: displayTitle || null,
          hostUserId: user.id,
          isLive: false,
          whipUrl: whipPublish || null,
          visibility,
          ticketPrice: visibility === "paid" ? ticketPrice : null,
          restrictedCommunityId: visibility === "community" ? restrictedCommunityId : null,
        } as typeof streams.$inferInsert)
        .returning();

      res.json({
        id: row.id,
        whipUrl: whipUrlStored,
        whepUrl: webRtcPlaybackUrl,
        webRtc: { url: webRtcPlaybackUrl },
        rtmps: { url: rtmpsUrl, streamKey: rtmpsStreamKey },
      });
    } catch (e: any) {
      console.error("Cloudflare Stream create exception:", e);
      res.status(500).json({ error: "Cloudflare Stream API request failed" });
    }
  });

  /** 配信セッション状態 + 視聴者数（broadcast ポーリング / 視聴ページ) */
  app.get("/api/stream/:id", async (req: Request, res: Response) => {
    const id = paramNum(req, "id");
    if (!id) return res.status(400).json({ error: "Invalid id" });

    const [srow] = await db.select().from(streams).where(eq(streams.id, id));
    if (srow) {
      let creator = "Host";
      let avatar = "";
      if (srow.hostUserId != null) {
        const [u] = await db.select().from(users).where(eq(users.id, srow.hostUserId));
        if (u) {
          creator = u.displayName ?? creator;
          avatar = u.profileImageUrl ?? "";
        }
      }
      const viewer = await getAuthUser(req);
      const playbackOk = await canViewerAccessLiveStream(srow, viewer);
      const vis = (srow.visibility ?? "public") as StreamVisibility;
      const streamAccessDenied = !playbackOk && vis !== "public";
      const hid = srow.hostUserId;
      let isFollowingHost = false;
      if (viewer && hid != null && viewer.id !== hid) {
        const [f] = await db
          .select({ id: userFollows.id })
          .from(userFollows)
          .where(and(eq(userFollows.followerId, viewer.id), eq(userFollows.followingId, hid)));
        isFollowingHost = !!f;
      }
      return res.json({
        id: srow.id,
        title: srow.title ?? "Live",
        creator,
        avatar,
        thumbnail: "",
        viewers: srow.currentViewers,
        currentViewers: srow.currentViewers,
        category: "live",
        fee: vis === "paid" ? "Paid" : "Free",
        price: vis === "paid" ? (srow.ticketPrice ?? null) : null,
        whepUrl: playbackOk ? srow.webRtcUrl : null,
        whipUrl: playbackOk ? (srow.whipUrl ?? srow.webRtcUrl) : null,
        isActive: srow.isLive,
        isLive: srow.isLive,
        community: "",
        timeAgo: srow.isLive ? "LIVE" : "Offline",
        visibility: vis,
        streamAccessDenied,
        streamAccessDeniedReason:
          streamAccessDenied && vis === "paid" ? "ticket_required" : undefined,
        hostUserId: hid ?? null,
        isFollowingHost: viewer && hid != null && viewer.id !== hid ? isFollowingHost : false,
      });
    }

    const [live] = await db.select().from(liveStreams).where(eq(liveStreams.id, id));
    if (!live) return res.status(404).json({ error: "Not found" });
    return res.json({
      id: live.id,
      title: live.title,
      creator: live.creator,
      avatar: live.avatar,
      thumbnail: live.thumbnail,
      viewers: live.viewers,
      currentViewers: live.viewers,
      category: live.community,
      fee: "Free",
      price: null,
      whepUrl: null,
      whipUrl: null,
      isActive: live.isLive,
      isLive: live.isLive,
      community: live.community,
      timeAgo: live.timeAgo,
      hostUserId: null,
      isFollowingHost: false,
    });
  });

  /** 配信開始: is_live + started_at、視聴者カウントリセット（ホストのみ) */
  app.post("/api/stream/:id/start", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const id = paramNum(req, "id");
    const [row] = await db.select().from(streams).where(eq(streams.id, id));
    if (!row) return res.status(404).json({ error: "Not found" });
    if (row.hostUserId != null && row.hostUserId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const now = new Date();
    const [updated] = await db
      .update(streams)
      .set({
        isLive: true,
        startedAt: now,
        endedAt: null,
        currentViewers: 0,
      } as Partial<InferSelectModel<typeof streams>>)
      .where(eq(streams.id, id))
      .returning();
    res.json(updated);
  });

  /** 配信終了（ホストのみ) */
  app.post("/api/stream/:id/end", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const id = paramNum(req, "id");
    const [row] = await db.select().from(streams).where(eq(streams.id, id));
    if (!row) return res.status(404).json({ error: "Not found" });
    if (row.hostUserId != null && row.hostUserId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const now = new Date();
    const [updated] = await db
      .update(streams)
      .set({
        isLive: false,
        endedAt: now,
      } as Partial<InferSelectModel<typeof streams>>)
      .where(eq(streams.id, id))
      .returning();
    res.json(updated);
  });

  /** 視聴者参加 */
  app.post("/api/stream/:id/join", async (req: Request, res: Response) => {
    const id = paramNum(req, "id");
    const [srow] = await db.select().from(streams).where(eq(streams.id, id));
    if (srow) {
      const viewer = await getAuthUser(req);
      const allowed = await canViewerAccessLiveStream(srow, viewer);
      if (!allowed) {
        const vis = (srow.visibility ?? "public") as StreamVisibility;
        if (vis === "paid") {
          return res.status(402).json({
            error: "Tickets required to watch this stream",
            code: "STREAM_TICKET_REQUIRED",
            required: srow.ticketPrice ?? 0,
          });
        }
        return res.status(403).json({
          error: "You are not allowed to watch this stream",
          code: "STREAM_ACCESS_DENIED",
        });
      }
      const [updated] = await db
        .update(streams)
        .set({ currentViewers: sql`${streams.currentViewers} + 1` } as unknown as Partial<InferSelectModel<typeof streams>>)
        .where(eq(streams.id, id))
        .returning();
      return res.json({ viewerCount: updated.currentViewers, currentViewers: updated.currentViewers });
    }
    const [live] = await db.select().from(liveStreams).where(eq(liveStreams.id, id));
    if (!live) return res.status(404).json({ error: "Not found" });
    const next = Math.max(0, live.viewers + 1);
    await db
      .update(liveStreams)
      .set({ viewers: next } as Partial<InferSelectModel<typeof liveStreams>>)
      .where(eq(liveStreams.id, id));
    return res.json({ viewerCount: next, currentViewers: next });
  });

  /** 有料配信の視聴権をチケットで購入して参加 */
  app.post("/api/stream/:id/join-paid", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const id = paramNum(req, "id");
    const [srow] = await db.select().from(streams).where(eq(streams.id, id));
    if (!srow) return res.status(404).json({ error: "Not found" });
    if ((srow.visibility ?? "public") !== "paid") {
      return res.status(400).json({ error: "Stream is not paid" });
    }
    const ticketPrice = srow.ticketPrice ?? 0;
    if (!Number.isInteger(ticketPrice) || ticketPrice <= 0) {
      return res.status(400).json({ error: "Invalid paid stream ticket price" });
    }
    const hostUserId = srow.hostUserId;
    if (!hostUserId) return res.status(400).json({ error: "Stream host is missing" });

    try {
      let currentViewers = srow.currentViewers;
      await db.transaction(async (tx) => {
        const existingAccess = await tx
          .select({ id: streamPaidAccess.id })
          .from(streamPaidAccess)
          .where(and(eq(streamPaidAccess.streamId, id), eq(streamPaidAccess.viewerUserId, user.id)))
          .limit(1);
        if (existingAccess.length > 0) {
          const [updated] = await tx
            .update(streams)
            .set({ currentViewers: sql`${streams.currentViewers} + 1` } as any)
            .where(eq(streams.id, id))
            .returning();
          currentViewers = updated.currentViewers;
          return;
        }

        const userId = String(user.id);
        const balRows = await tx.select().from(ticketBalances).where(eq(ticketBalances.userId, userId)).limit(1);
        const currentBalance = balRows[0]?.balance ?? 0;
        if (currentBalance < ticketPrice) {
          const err = new Error("INSUFFICIENT_TICKETS");
          (err as any).meta = { balance: currentBalance, required: ticketPrice };
          throw err;
        }
        const newBalance = currentBalance - ticketPrice;
        if (balRows.length === 0) {
          await tx.insert(ticketBalances).values({ userId, balance: newBalance });
        } else {
          await tx
            .update(ticketBalances)
            .set({ balance: newBalance, updatedAt: new Date() })
            .where(eq(ticketBalances.userId, userId));
        }

        const [spendTx] = await tx
          .insert(ticketTransactions)
          .values({
            userId,
            amount: -ticketPrice,
            type: "spend_session",
            referenceId: `live:${id}`,
            description: `Paid live access for stream ${id}`,
          })
          .returning({ id: ticketTransactions.id });

        await tx.insert(streamPaidAccess).values({
          streamId: id,
          viewerUserId: user.id,
          ticketAmount: ticketPrice,
          ticketTransactionId: spendTx.id,
        } as typeof streamPaidAccess.$inferInsert);

        const walletId = await getOrCreateUserWallet(hostUserId);
        await recordRevenue(
          walletId,
          hostUserId,
          null,
          ticketPrice,
          "paid_live",
          String(spendTx.id),
        );

        const [updated] = await tx
          .update(streams)
          .set({ currentViewers: sql`${streams.currentViewers} + 1` } as any)
          .where(eq(streams.id, id))
          .returning();
        currentViewers = updated.currentViewers;
      });
      return res.json({ ok: true, currentViewers });
    } catch (e: any) {
      if (e?.message === "INSUFFICIENT_TICKETS") {
        const meta = e?.meta ?? {};
        return res.status(402).json({
          error: "Insufficient tickets",
          balance: meta.balance ?? 0,
          required: meta.required ?? ticketPrice,
        });
      }
      return res.status(500).json({ error: e?.message ?? "Failed to join paid stream" });
    }
  });

  /** 視聴者退出 */
  app.post("/api/stream/:id/leave", async (req: Request, res: Response) => {
    const id = paramNum(req, "id");
    const [srow] = await db.select().from(streams).where(eq(streams.id, id));
    if (srow) {
      const next = Math.max(0, srow.currentViewers - 1);
      const [updated] = await db
        .update(streams)
        .set({ currentViewers: next } as Partial<InferSelectModel<typeof streams>>)
        .where(eq(streams.id, id))
        .returning();
      return res.json({ viewerCount: updated.currentViewers, currentViewers: updated.currentViewers });
    }
    const [live] = await db.select().from(liveStreams).where(eq(liveStreams.id, id));
    if (!live) return res.status(404).json({ error: "Not found" });
    const next = Math.max(0, live.viewers - 1);
    await db
      .update(liveStreams)
      .set({ viewers: next } as Partial<InferSelectModel<typeof liveStreams>>)
      .where(eq(liveStreams.id, id));
    return res.json({ viewerCount: next, currentViewers: next });
  });

  app.post("/api/jukebox/:communityId/add", async (req: Request, res: Response) => {
    const communityId = paramNum(req, "communityId");
    const { videoId, videoTitle, videoThumbnail, videoDurationSecs, addedBy, addedByAvatar, youtubeId } = req.body;
    const authUser = await getAuthUser(req);
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
      addedBy: addedBy ?? "You",
      addedByAvatar,
      addedByUserId: authUser?.id ?? null,
      position: nextPos,
      isPlayed: false,
    } as typeof jukeboxQueue.$inferInsert).returning();

    // 未再生の曲が1つもない場合（新しいセッション)は自動で再生を開始する
    // ただし、既に再生中の曲がある場合は割り込み再生しない（キュー末尾に追加するだけ)
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
          } as Partial<InferSelectModel<typeof jukeboxState>>,
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

    // 再生中の曲を特定し isPlayed にマーク（同じ曲が「次」として選ばれるのを防ぐ)
    let currentItemId: number | null = null;
    if (stateRaw?.currentVideoId != null || stateRaw?.currentVideoYoutubeId) {
      const currentItem = queue.find(
        (q) =>
          (stateRaw.currentVideoYoutubeId && (q as any).youtubeId === stateRaw.currentVideoYoutubeId) ||
          (stateRaw.currentVideoId != null && q.videoId === stateRaw.currentVideoId)
      );
      if (currentItem) {
        currentItemId = currentItem.id;
        await db.update(jukeboxQueue).set({ isPlayed: true } as Partial<InferSelectModel<typeof jukeboxQueue>>).where(eq(jukeboxQueue.id, currentItem.id));
      }
    }

    const next = queue.find((q) => !q.isPlayed && q.id !== currentItemId);
    if (next) {
      // 次に再生する曲は isPlayed にしない（再生完了時にマークする)。キュー表示で消えないようにする
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
          } as Partial<InferSelectModel<typeof jukeboxState>>,
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
        } as Partial<InferSelectModel<typeof jukeboxState>>)
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
  // videoDurationSecs が 0 または未設定の場合にのみ呼ばれる（全クライアントからの重複更新を防ぐ)
  app.patch("/api/jukebox/:communityId/duration", async (req: Request, res: Response) => {
    const communityId = paramNum(req, "communityId");
    const { durationSecs } = req.body;
    if (!durationSecs || typeof durationSecs !== "number" || durationSecs <= 0) {
      return res.status(400).json({ error: "durationSecs must be a positive number" });
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
    if (!message || !message.trim()) return res.status(400).json({ error: "Please enter a message" });
    // コンテンツモデレーション
    const modResult = await moderateContent(message);
    if (modResult.allowed === false) {
      return res.status(400).json({ error: modResult.reason ?? "This content is not allowed" });
    }
    const [msg] = await db.insert(jukeboxChat).values({
      communityId, username: username ?? "You", avatar, message,
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

  // ── Mentor session bookings ───────────────────────────────────────────────────

  /** 互換: mentor-book/[id].tsx 用セッション取得 */
  app.get("/api/mentor/session/:id", async (req: Request, res: Response) => {
    const id = paramNum(req, "id");
    if (!id) return res.status(400).json({ error: "invalid_session_id" });

    const [session] = await db
      .select()
      .from(mentorSessions)
      .where(and(eq(mentorSessions.id, id), eq(mentorSessions.isActive, true)));
    if (!session) return res.status(404).json({ error: "session_not_found" });

    return res.json({
      ...session,
      userId: session.creatorId,
    });
  });

  /** 互換: mentor-book/[id].tsx 用空き枠取得 */
  app.get("/api/availability/:userId", async (req: Request, res: Response) => {
    const userId = paramNum(req, "userId");
    if (!userId) return res.status(400).json({ error: "invalid_user_id" });
    const rows = await db
      .select()
      .from(liverAvailability)
      .where(eq(liverAvailability.liverId, userId))
      .orderBy(asc(liverAvailability.date), asc(liverAvailability.startTime));
    return res.json(rows);
  });

  /** 互換: mentor-book/[id].tsx 用予約作成（チケット即時消費) */
  app.post("/api/mentor/bookings", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { sessionId, slotId, scheduledAt } = req.body as {
      sessionId?: number | string;
      slotId?: number | string | null;
      scheduledAt?: string;
    };
    const sid =
      typeof sessionId === "number" && Number.isFinite(sessionId)
        ? sessionId
        : parseInt(String(sessionId ?? ""), 10);
    if (!sid) return res.status(400).json({ error: "session_not_found" });
    if (!scheduledAt) return res.status(400).json({ error: "scheduled_at_required" });

    const [sessionRow] = await db
      .select()
      .from(mentorSessions)
      .where(and(eq(mentorSessions.id, sid), eq(mentorSessions.isActive, true)));
    if (!sessionRow) return res.status(404).json({ error: "session_not_found" });

    const parsedPrice = Number(sessionRow.price);
    if (!Number.isInteger(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ error: "invalid_session_price" });
    }

    let parsedSlotId: number | null = null;
    if (slotId !== undefined && slotId !== null && String(slotId).trim() !== "") {
      parsedSlotId =
        typeof slotId === "number" && Number.isFinite(slotId)
          ? slotId
          : parseInt(String(slotId), 10);
      if (!parsedSlotId || !Number.isFinite(parsedSlotId)) {
        return res.status(400).json({ error: "invalid_slot_id" });
      }
      const [slot] = await db
        .select()
        .from(liverAvailability)
        .where(and(eq(liverAvailability.id, parsedSlotId), eq(liverAvailability.liverId, sessionRow.creatorId)));
      if (!slot) return res.status(404).json({ error: "slot_not_found" });
      if (slot.bookedSlots >= slot.maxSlots) return res.status(409).json({ error: "slot_full" });
    }

    try {
      let bookingId = 0;
      await db.transaction(async (tx) => {
        const userId = String(user.id);
        const balRows = await tx
          .select()
          .from(ticketBalances)
          .where(eq(ticketBalances.userId, userId))
          .limit(1);
        const currentBalance = balRows[0]?.balance ?? 0;
        if (currentBalance < parsedPrice) {
          const err = new Error("INSUFFICIENT_TICKETS");
          (err as any).meta = { balance: currentBalance, required: parsedPrice };
          throw err;
        }

        if (parsedSlotId != null) {
          const slotRows = await tx
            .update(liverAvailability)
            .set({ bookedSlots: sql`${liverAvailability.bookedSlots} + 1` } as unknown as Partial<InferSelectModel<typeof liverAvailability>>)
            .where(
              and(
                eq(liverAvailability.id, parsedSlotId),
                eq(liverAvailability.liverId, sessionRow.creatorId),
                sql`${liverAvailability.bookedSlots} < ${liverAvailability.maxSlots}`
              ),
            )
            .returning({ id: liverAvailability.id });
          if (slotRows.length === 0) {
            throw new Error("SLOT_FULL");
          }
        }

        const newBalance = currentBalance - parsedPrice;
        if (balRows.length === 0) {
          await tx.insert(ticketBalances).values({ userId, balance: newBalance });
        } else {
          await tx
            .update(ticketBalances)
            .set({ balance: newBalance, updatedAt: new Date() })
            .where(eq(ticketBalances.userId, userId));
        }

        const [booking] = await tx
          .insert(mentorBookings)
          .values({
            sessionId: sid,
            userId: `user-${user.id}`,
            userName: user.displayName,
            userAvatar: user.profileImageUrl ?? null,
            scheduledAt: new Date(scheduledAt),
            price: parsedPrice, // session.price = ticket count
            status: "paid",
            queuePosition: 0,
            agreedToTerms: true,
            agreedAt: new Date(),
            refundable: false,
          } as typeof mentorBookings.$inferInsert)
          .returning({ id: mentorBookings.id });
        bookingId = booking.id;

        const [spendTx] = await tx
          .insert(ticketTransactions)
          .values({
            userId,
            amount: -parsedPrice,
            type: "spend_session",
            referenceId: String(bookingId),
            description: `Mentor session booking ${sid}`,
          })
          .returning({ id: ticketTransactions.id });

        const walletId = await getOrCreateUserWallet(sessionRow.creatorId, tx);
        const creatorRow = await creatorRowForUserId(tx, sessionRow.creatorId);
        await recordRevenue(
          walletId,
          sessionRow.creatorId,
          creatorRow?.id ?? null,
          parsedPrice,
          "mentor",
          String(spendTx.id),
          tx,
        );
      });

      return res.json({ ok: true, bookingId });
    } catch (e: any) {
      if (e?.message === "INSUFFICIENT_TICKETS") {
        const meta = e?.meta ?? {};
        return res.status(402).json({
          error: "Insufficient tickets",
          balance: meta.balance ?? 0,
          required: meta.required ?? parsedPrice,
        });
      }
      if (e?.message === "SLOT_FULL") {
        return res.status(409).json({ error: "slot_full" });
      }
      return res.status(500).json({ error: e.message ?? "booking_create_failed" });
    }
  });

  app.get("/api/mentor/publishable-key", async (_req: Request, res: Response) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/mentor/:streamId/bookings", async (req: Request, res: Response) => {
    const streamId = paramNum(req, "streamId");
    const rows = await db
      .select()
      .from(mentorBookings)
      .where(eq(mentorBookings.streamId, streamId))
      .orderBy(asc(mentorBookings.queuePosition));
    res.json(rows);
  });

  app.get("/api/mentor/:streamId/queue-count", async (req: Request, res: Response) => {
    const streamId = paramNum(req, "streamId");
    const [{ total }] = await db
      .select({ total: count() })
      .from(mentorBookings)
      .where(sql`stream_id = ${streamId} AND status IN ('paid','waiting','notified')`);
    res.json({ count: Number(total) });
  });

  app.post("/api/mentor/:streamId/checkout", async (req: Request, res: Response) => {
    const streamId = paramNum(req, "streamId");
    const { userName, userAvatar, price = 3000 } = req.body;

    if (!userName) return res.status(400).json({ error: "userName required" });

    try {
      const stripe = await getUncachableStripeClient();

      const [{ total }] = await db
        .select({ total: count() })
        .from(mentorBookings)
        .where(sql`stream_id = ${streamId} AND status IN ('paid','waiting','notified')`);
      const queuePos = Number(total) + 1;

      const [stream] = await db.select().from(liveStreams).where(eq(liveStreams.id, streamId));
      const streamTitle = stream?.title ?? "Two-shot photo session";
      const creatorName = stream?.creator ?? "Creator";

      const baseUrl = "https://rawstock.live";

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "jpy",
              unit_amount: price,
              product_data: {
                name: `Two-shot photo session with ${creatorName}`,
                description: `${streamTitle} | Queue #${queuePos}`,
              },
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${baseUrl}/mentor-success?session_id={CHECKOUT_SESSION_ID}&stream=${streamId}`,
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
        .insert(mentorBookings)
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
        } as typeof mentorBookings.$inferInsert)
        .returning();

      res.json({ checkoutUrl: session.url, bookingId: booking.id, queuePosition: queuePos });
    } catch (e: any) {
      console.error("Stripe checkout error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/mentor/confirm-payment", async (req: Request, res: Response) => {
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
        .from(mentorBookings)
        .where(eq(mentorBookings.stripeSessionId, sessionId));
      if (!booking) return res.status(404).json({ error: "Booking not found" });
      if (booking.status === "paid") return res.json({ ok: true, booking });

      const metadata = (session.metadata ?? {}) as Record<string, string | undefined>;
      const slotIdRaw = metadata.slotId;
      const slotId = slotIdRaw && slotIdRaw.trim() ? parseInt(slotIdRaw, 10) : NaN;
      let mentorSessionForBooking:
        | (typeof mentorSessions.$inferSelect)
        | null = null;
      if (booking.sessionId != null) {
        const [mentorSession] = await db
          .select()
          .from(mentorSessions)
          .where(eq(mentorSessions.id, booking.sessionId));
        mentorSessionForBooking = mentorSession ?? null;
      }

      // 新モデル(sessionId) + slot指定時は、決済確認時に枠を確保する（競合対策)
      if (booking.sessionId != null && Number.isFinite(slotId) && slotId > 0) {
        const creatorId = mentorSessionForBooking?.creatorId;
        if (!creatorId) return res.status(404).json({ error: "session_not_found" });
        const updatedSlots = await db
          .update(liverAvailability)
          .set({ bookedSlots: sql`${liverAvailability.bookedSlots} + 1` } as unknown as Partial<InferSelectModel<typeof liverAvailability>>)
          .where(
            and(
              eq(liverAvailability.id, slotId),
              eq(liverAvailability.liverId, creatorId),
              sql`${liverAvailability.bookedSlots} < ${liverAvailability.maxSlots}`
            )
          )
          .returning();
        if (updatedSlots.length === 0) {
          return res.status(409).json({ error: "slot_full" });
        }
      }

      await db
        .update(mentorBookings)
        .set({
          status: "paid",
          stripePaymentIntentId: session.payment_intent as string,
        } as Partial<InferSelectModel<typeof mentorBookings>>)
        .where(eq(mentorBookings.stripeSessionId, sessionId));

      // 共通スコア集計用：REVENUE を transactions に記録（ライバー＝配信者に紐づくウォレット)
      if (booking.sessionId != null) {
        if (mentorSessionForBooking) {
          const [creatorUser] = await db.select().from(users).where(eq(users.id, mentorSessionForBooking.creatorId));
          if (creatorUser) {
            const walletId = await getOrCreateUserWallet(creatorUser.id);
            const [creatorRow] = await db.select().from(creators).where(eq(creators.name, creatorUser.displayName));
            await recordRevenue(walletId, creatorUser.id, creatorRow?.id ?? null, booking.price, "mentor", String(booking.id));
          }
        }
      } else if (booking.streamId != null) {
        const [stream] = await db.select().from(liveStreams).where(eq(liveStreams.id, booking.streamId));
        if (stream) {
          const [creatorUser] = await db.select().from(users).where(eq(users.displayName, stream.creator));
          if (creatorUser) {
            const walletId = await getOrCreateUserWallet(creatorUser.id);
            const [creatorRow] = await db.select().from(creators).where(eq(creators.name, stream.creator));
            await recordRevenue(walletId, creatorUser.id, creatorRow?.id ?? null, booking.price, "mentor", String(booking.id));
          }
        }
      }

      res.json({ ok: true, booking });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/mentor/:bookingId/notify", async (req: Request, res: Response) => {
    const bookingId = paramNum(req, "bookingId");
    await db
      .update(mentorBookings)
      .set({ status: "notified", notifiedAt: new Date() } as Partial<InferSelectModel<typeof mentorBookings>>)
      .where(eq(mentorBookings.id, bookingId));
    res.json({ ok: true });
  });

  app.post("/api/mentor/:bookingId/complete", async (req: Request, res: Response) => {
    const bookingId = paramNum(req, "bookingId");
    await db
      .update(mentorBookings)
      .set({ status: "completed", completedAt: new Date() } as Partial<InferSelectModel<typeof mentorBookings>>)
      .where(eq(mentorBookings.id, bookingId));
    res.json({ ok: true });
  });

  app.post("/api/mentor/:bookingId/cancel", async (req: Request, res: Response) => {
    const bookingId = paramNum(req, "bookingId");
    const { reason, isSelfCancel } = req.body;
    await db
      .update(mentorBookings)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: reason ?? "User cancelled",
        refundable: !isSelfCancel,
      } as Partial<InferSelectModel<typeof mentorBookings>>)
      .where(eq(mentorBookings.id, bookingId));
    res.json({ ok: true });
  });

  // ── Mentor Sessions（セッション商品 CRUD)─────────────────────────────────────

  /** クリエイター自身のセッション商品一覧 */
  app.get("/api/mentor/my-sessions", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const rows = await db
      .select()
      .from(mentorSessions)
      .where(eq(mentorSessions.creatorId, user.id))
      .orderBy(desc(mentorSessions.createdAt));
    res.json(rows);
  });

  /** 公開: アクティブなメンターセッション一覧（クリエイター情報付き） */
  app.get("/api/mentor/sessions", async (req: Request, res: Response) => {
    const rows = await db
      .select({
        id: mentorSessions.id,
        creatorId: mentorSessions.creatorId,
        title: mentorSessions.title,
        category: mentorSessions.category,
        description: mentorSessions.description,
        price: mentorSessions.price,
        duration: mentorSessions.duration,
        maxParticipants: mentorSessions.maxParticipants,
        createdAt: mentorSessions.createdAt,
        creatorName: users.displayName,
        creatorAvatar: users.profileImageUrl,
      })
      .from(mentorSessions)
      .innerJoin(users, eq(users.id, mentorSessions.creatorId))
      .where(eq(mentorSessions.isActive, true))
      .orderBy(desc(mentorSessions.createdAt));
    res.json(rows);
  });

  /** セッション商品を作成 */
  app.post("/api/mentor/sessions", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { title, category, description, price, duration, maxParticipants } = req.body;
    if (!title || !price) return res.status(400).json({ error: "title and price are required" });
    const [row] = await db
      .insert(mentorSessions)
      .values({
        creatorId: user.id,
        title,
        category: category ?? "other",
        description: description ?? "",
        price: Number(price),
        duration: duration ?? 30,
        maxParticipants: maxParticipants ?? 1,
        isActive: true,
      } as typeof mentorSessions.$inferInsert)
      .returning();
    res.json(row);
  });

  /** セッション商品を更新 */
  app.put("/api/mentor/sessions/:id", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const id = paramNum(req, "id");
    const [existing] = await db.select().from(mentorSessions).where(eq(mentorSessions.id, id));
    if (!existing || existing.creatorId !== user.id) return res.status(403).json({ error: "Forbidden" });
    const { title, category, description, price, duration, maxParticipants } = req.body;
    const [row] = await db
      .update(mentorSessions)
      .set({
        title: title ?? existing.title,
        category: category ?? existing.category,
        description: description ?? existing.description,
        price: price !== undefined ? Number(price) : existing.price,
        duration: duration ?? existing.duration,
        maxParticipants: maxParticipants ?? existing.maxParticipants,
        updatedAt: new Date(),
      } as Partial<InferSelectModel<typeof mentorSessions>>)
      .where(eq(mentorSessions.id, id))
      .returning();
    res.json(row);
  });

  /** セッション商品を非表示（物理削除しない) */
  app.delete("/api/mentor/sessions/:id", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const id = paramNum(req, "id");
    const [existing] = await db.select().from(mentorSessions).where(eq(mentorSessions.id, id));
    if (!existing || existing.creatorId !== user.id) return res.status(403).json({ error: "Forbidden" });
    await db
      .update(mentorSessions)
      .set({ isActive: false, updatedAt: new Date() } as Partial<InferSelectModel<typeof mentorSessions>>)
      .where(eq(mentorSessions.id, id));
    res.json({ ok: true });
  });

  /** クリエイター向け：自分セッションへの予約一覧 */
  app.get("/api/mentor/creator-bookings", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const mySessions = await db
      .select({ id: mentorSessions.id })
      .from(mentorSessions)
      .where(eq(mentorSessions.creatorId, user.id));
    if (mySessions.length === 0) return res.json([]);
    const sessionIds = mySessions.map(s => s.id);
    const bookingRows = await db
      .select()
      .from(mentorBookings)
      .where(and(
        inArray(mentorBookings.sessionId, sessionIds),
        sql`${mentorBookings.status} NOT IN ('cancelled')`
      ))
      .orderBy(desc(mentorBookings.createdAt));
    // session 情報を結合
    const sessionMap = new Map(
      (await db.select().from(mentorSessions).where(inArray(mentorSessions.id, sessionIds)))
        .map(s => [s.id, s])
    );
    const result = bookingRows.map(b => ({
      booking: b,
      session: sessionMap.get(b.sessionId!) ?? null,
    }));
    res.json(result);
  });

  /** クリエイター：セッション開始（Cloudflare Stream WHIP発行) */
  app.post("/api/mentor/bookings/:bookingId/start", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const bookingId = paramNum(req, "bookingId");
    const [booking] = await db.select().from(mentorBookings).where(eq(mentorBookings.id, bookingId));
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // 既に WHIP が発行済みなら再利用
    if (booking.whipUrl) {
      return res.json({ whipUrl: booking.whipUrl, whepUrl: booking.whepUrl });
    }

    // Cloudflare Stream でライブ入力を作成
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_STREAM_TOKEN) {
      return res.status(503).json({ error: "Cloudflare Stream not configured" });
    }
    console.log("[Cloudflare Stream] creating mentor live_input with env:", {
      accountId: maskSecretPrefix(CLOUDFLARE_ACCOUNT_ID),
      streamToken: maskSecretPrefix(CLOUDFLARE_STREAM_TOKEN),
    });
    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_STREAM_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ meta: { name: `mentor-booking-${bookingId}` }, recording: { mode: "automatic" } }),
      }
    );
    if (!cfRes.ok) {
      let cfErrorBody: unknown = null;
      try {
        cfErrorBody = await cfRes.json();
      } catch {
        cfErrorBody = await cfRes.text();
      }
      return res.status(502).json({
        error: "Cloudflare live input creation failed",
        status: cfRes.status,
        cloudflareResponse: cfErrorBody,
      });
    }
    const cfData = await cfRes.json() as { result: { uid: string; webRTC: { url: string }; webRTCPlayback: { url: string } } };
    const { uid, webRTC, webRTCPlayback } = cfData.result;
    const whipUrl = webRTC.url;
    const whepUrl = webRTCPlayback.url;

    await db
      .update(mentorBookings)
      .set({ status: "in_progress", whipUrl, whepUrl, cfStreamUid: uid } as Partial<InferSelectModel<typeof mentorBookings>>)
      .where(eq(mentorBookings.id, bookingId));

    res.json({ whipUrl, whepUrl });
  });

  /** ユーザー：セッション参加（WHEP URL取得) */
  app.get("/api/mentor/bookings/:bookingId/join", async (req: Request, res: Response) => {
    const bookingId = paramNum(req, "bookingId");
    const [booking] = await db.select().from(mentorBookings).where(eq(mentorBookings.id, bookingId));
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (!booking.whepUrl) return res.status(409).json({ error: "Session not started yet" });
    res.json({ whepUrl: booking.whepUrl });
  });

  /** セッション終了 */
  app.post("/api/mentor/bookings/:bookingId/end", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const bookingId = paramNum(req, "bookingId");
    const [booking] = await db.select().from(mentorBookings).where(eq(mentorBookings.id, bookingId));
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Cloudflare Stream のライブ入力を削除（任意)
    if (booking.cfStreamUid && CLOUDFLARE_ACCOUNT_ID && CLOUDFLARE_STREAM_TOKEN) {
      await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs/${booking.cfStreamUid}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${CLOUDFLARE_STREAM_TOKEN}` },
        }
      ).catch(() => {}); // 失敗しても続行
    }

    await db
      .update(mentorBookings)
      .set({ status: "completed", completedAt: new Date() } as Partial<InferSelectModel<typeof mentorBookings>>)
      .where(eq(mentorBookings.id, bookingId));

    res.json({ ok: true });
  });

  // ── 収益記録（投げ銭・有料ライブ・個別セッション → type: REVENUE、月末ランク集計用)
  app.post("/api/revenue/record", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Sign-in required" });

    const { amount, source, referenceId } = req.body as { amount?: number; source?: string; referenceId?: string };
    if (!amount || amount <= 0) return res.status(400).json({ error: "amount must be a positive number" });
    const src = (source ?? "tip") as RevenueSource; // tip | paid_live | mentor
    if (!["tip", "paid_live", "mentor"].includes(src)) {
      return res.status(400).json({ error: "source must be tip, paid_live, or mentor" });
    }

    const walletId = await getOrCreateUserWallet(user.id);
    const [creatorRow] = await db.select().from(creators).where(eq(creators.name, user.displayName));
    await recordRevenue(walletId, user.id, creatorRow?.id ?? null, amount, src, referenceId ?? null);
    res.status(201).json({ ok: true, amount, source: src });
  });

  // ── Revenue（ログイン必須)──────────────────────────────────────────
  app.get("/api/revenue/summary", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Sign-in required" });
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
    const withdrawalFeePolicy = getWithdrawalFeePolicy();

    // monthly breakdown (last 6 months)
    const now = new Date();
    const monthly: { month: string; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthTotal = earningRows
        .filter((e) => {
          const ed = new Date(e.createdAt!);
          return ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth();
        })
        .reduce((s, e) => s + e.netAmount, 0);
      monthly.push({ month: label, amount: monthTotal });
    }

    res.json({ totalEarned, totalWithdrawn, pendingWithdrawal, available, monthly, withdrawalFeePolicy });
  });

  app.get("/api/revenue/earnings", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Sign-in required" });
    const userId = `user-${user.id}`;
    const rows = await db
      .select()
      .from(earnings)
      .where(eq(earnings.userId, userId))
      .orderBy(desc(earnings.createdAt));
    res.json(rows);
  });

  /** 月末ランク集計用クエリの雛形（バッチの土台)。?month=YYYY-MM で指定月の REVENUE 合計ランキングを返す */
  app.get("/api/revenue/monthly-rank", async (req: Request, res: Response) => {
    const month = (req.query.month as string) ?? "";
    const match = /^(\d{4})-(\d{2})$/.exec(month);
    if (!match) {
      return res.status(400).json({ error: "month must be in YYYY-MM format" });
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
    if (!user) return res.status(401).json({ error: "Sign-in required" });
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
    if (!user) return res.status(401).json({ error: "Authentication required" });
    const userId = `user-${user.id}`;
    const { amount, bankName, bankBranch, accountType, accountNumber, accountName } = req.body;
    const amountUsdCents = Number(amount);
    if (!Number.isInteger(amountUsdCents) || amountUsdCents < 1000) {
      return res.status(400).json({ error: "Minimum withdrawal amount is 1000 USD cents" });
    }
    if (!bankName || !bankBranch || !accountType || !accountNumber || !accountName) {
      return res.status(400).json({ error: "Bank account fields are required" });
    }
    if (!user.stripeConnectId) {
      return res.status(400).json({ error: "Stripe Connect account is not connected" });
    }
    const connectAccount = await getConnectAccount(user.stripeConnectId);
    if (!connectAccount?.charges_enabled) {
      return res.status(400).json({ error: "Stripe Connect account charges are not enabled" });
    }
    // check available balance
    const earningRows = await db.select().from(earnings).where(eq(earnings.userId, userId));
    const withdrawalRows = await db.select().from(withdrawals).where(eq(withdrawals.userId, userId));
    const totalEarned = earningRows.reduce((s, e) => s + e.netAmount, 0);
    const totalUsed = withdrawalRows
      .filter((w) => w.status !== "failed")
      .reduce((s, w) => s + w.amount, 0);
    const available = totalEarned - totalUsed;
    if (amountUsdCents > available) {
      return res.status(400).json({ error: "Requested amount exceeds available balance" });
    }
    const { feeUsdCents, netTransferUsdCents } = computeWithdrawalFeeBreakdown(amountUsdCents);
    const policy = getWithdrawalFeePolicy();
    if (netTransferUsdCents < policy.minNetTransferUsdCents) {
      return res.status(400).json({
        error: "After payout fees, the transfer would be below the minimum. Increase the withdrawal amount.",
        minNetTransferUsdCents: policy.minNetTransferUsdCents,
        feeUsdCents,
        netTransferUsdCents,
      });
    }
    const [row] = await db
      .insert(withdrawals)
      .values({ userId, amount: amountUsdCents, bankName, bankBranch, accountType, accountNumber, accountName, status: "pending" } as typeof withdrawals.$inferInsert)
      .returning();
    try {
      const { transferId } = await createTransferToConnectedAccount({
        amountUsdCents: netTransferUsdCents,
        destinationAccountId: user.stripeConnectId,
        metadata: {
          withdrawalId: String(row.id),
          userId,
          grossUsdCents: String(amountUsdCents),
          feeUsdCents: String(feeUsdCents),
        },
      });
      const feeNote =
        feeUsdCents > 0
          ? `feeUsdCents=${feeUsdCents} netTransferUsdCents=${netTransferUsdCents} `
          : "";
      const [completedRow] = await db
        .update(withdrawals)
        .set({
          status: "completed",
          processedAt: new Date(),
          note: `${feeNote}Stripe transfer completed: ${transferId}`,
        })
        .where(eq(withdrawals.id, row.id))
        .returning();
      return res.json({
        ...completedRow,
        grossWithdrawUsdCents: amountUsdCents,
        feeUsdCents,
        netTransferUsdCents,
        stripeTransferId: transferId,
      });
    } catch (error: any) {
      await db
        .update(withdrawals)
        .set({
          status: "failed",
          processedAt: new Date(),
          note: `Stripe transfer failed: ${error?.message ?? "unknown_error"}`,
        })
        .where(eq(withdrawals.id, row.id));
      return res.status(500).json({ error: error?.message ?? "Stripe transfer failed" });
    }
  });

  // ── Announcements ───────────────────────────────────────────────────
  app.get("/api/announcements", async (_req: Request, res: Response) => {
    // 現在日時が startAt〜endAt の範囲内のもののみ取得（endAt が NULL の場合は無期限)
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
    if (!user) return res.status(401).json({ error: "Sign-in required" });
    const [creator] = await db.select().from(creators).where(eq(creators.name, user.displayName));
    if (!creator) {
      return res.status(404).json({ error: "Creator registration required" });
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
    if (!user) return res.status(401).json({ error: "Sign-in required" });
    const [creator] = await db.select().from(creators).where(eq(creators.name, user.displayName));
    if (!creator) return res.status(404).json({ error: "Creator registration required" });
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
        } as Partial<InferSelectModel<typeof creatorMonthlyScores>>)
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
      .set({ streamCount: creator.streamCount + 1 } as Partial<InferSelectModel<typeof creators>>)
      .where(eq(creators.id, creator.id));
    const newLevel = await syncCreatorLevelFromMonthlyProgress(creator.id, month);
    res.status(201).json({ ok: true, month, currentLevel: newLevel });
  });

  // ── Profile Roles (Creator / Mentor session liver) ────────────────────────
  app.get("/api/profile/roles", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const rows = await db.select().from(creators).where(eq(creators.name, user.displayName));
    const isEditor = rows.some((r) => r.category === "editor");
    const isMentor = rows.some((r) => r.category === "mentor");

    res.json({ isEditor, isMentor });
  });

  app.post("/api/profile/register-role", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const { role } = req.body as { role?: "editor" | "mentor" };
    if (role !== "editor" && role !== "mentor") {
      return res.status(400).json({ error: "role must be editor or mentor" });
    }

    const category = role === "editor" ? "editor" : "mentor";
    const communityLabel = role === "editor" ? "Video editor" : "Mentor session creator";

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
    if (!userName || !comment) return res.status(400).json({ error: "Please fill in all required fields" });
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
    } as Partial<InferSelectModel<typeof creators>>).where(eq(creators.id, id));
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
    if (!date || !startTime || !endTime) return res.status(400).json({ error: "Please enter date and time" });
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

  // Demo bulk seed removed — official hubs: `npx tsx scripts/reset-official-communities.ts`
  app.post("/api/seed", (_req: Request, res: Response) => {
    return res.status(410).json({
      error:
        "Demo seed has been removed. Run `npx tsx scripts/reset-official-communities.ts` after migrations to create official communities.",
    });
  });
  app.post("/api/seed-editors", (_req: Request, res: Response) => {
    return res.status(410).json({ error: "Demo seed-editors has been removed." });
  });

  // ─── Coin System API ──────────────────────────────────────────────────────
  const FREE_REQUESTS_PER_DAY = 20;

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

  /** POST /api/coins/use-revenue - 収益残高からコインに変換して消費（1コイン=$0.30) */
  app.post("/api/coins/use-revenue", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { communityId, queueItemId } = req.body as { communityId: number; queueItemId?: number };
    if (!communityId) return res.status(400).json({ error: "communityId required" });
    const userId = String(user.id);
    const today = new Date().toISOString().slice(0, 10);
    const COIN_PRICE_USD = 30;

    // 収益残高確認（wallets テーブル)
    const walletRows = await db.select().from(wallets).where(eq(wallets.userId, user.id)).limit(1);
    const walletBalance = walletRows[0]?.balanceAvailable ?? 0;
    if (walletBalance < COIN_PRICE_USD) {
      return res.status(402).json({ error: "Insufficient revenue balance", balance: walletBalance });
    }

    // 収益残高を減らす
    await db.update(wallets).set({ balanceAvailable: walletBalance - COIN_PRICE_USD, updatedAt: new Date() }).where(eq(wallets.userId, user.id));

    // コイントランザクション記録（収益→コイン変換)
    await db.insert(coinTransactions).values({
      userId,
      amount: -1,
      type: "revenue_convert",
      referenceId: queueItemId ? String(queueItemId) : null,
      description: `Revenue balance used for jukebox request in community ${communityId} ($${(COIN_PRICE_USD / 100).toFixed(2)})`,
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

    return res.json({ success: true, newWalletBalance: walletBalance - COIN_PRICE_USD });
  });

  /** POST /api/coins/create-checkout - Stripe Checkout セッションを作成してコインを購入 */
  app.post("/api/coins/create-checkout", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { packageId, origin } = req.body as { packageId: string; origin: string };

    // コインパッケージ定義（1コイン=$0.30)
    const COIN_PACKAGES: Record<string, { coins: number; priceUSD: number; label: string }> = {
      "pack-1": { coins: 1, priceUSD: 30, label: "1 Coin" },
      "pack-5": { coins: 5, priceUSD: 150, label: "5 Coins" },
      "pack-10": { coins: 10, priceUSD: 300, label: "10 Coins" },
      "pack-30": { coins: 30, priceUSD: 900, label: "30 Coins" },
    };
    const pkg = COIN_PACKAGES[packageId];
    if (!pkg) return res.status(400).json({ error: "Invalid packageId" });

    try {
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `Rawstock ${pkg.label}`,
              description: `${pkg.coins} coin${pkg.coins > 1 ? "s" : ""} for jukebox requests`,
            },
            unit_amount: pkg.priceUSD,
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

  const FREE_JUKEBOX_PER_DAY = 20;
  const TICKETS_PER_JUKEBOX = 10; // paid request after free quota
  const MENTOR_TICKET_PRICE = 500; // $5.00 per mentor session

  /** GET /api/tickets/balance */
  app.get("/api/tickets/balance", async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "private, no-store");
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

  /** POST /api/tickets/spend-jukebox — deduct TICKETS_PER_JUKEBOX for a paid jukebox request */
  app.post("/api/tickets/spend-jukebox", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { communityId, queueItemId } = req.body as { communityId: number; queueItemId?: number };
    if (!communityId) return res.status(400).json({ error: "communityId required" });
    const userId = String(user.id);
    const today = new Date().toISOString().slice(0, 10);

    try {
      let newBalance = 0;
      await db.transaction(async (tx) => {
        const [comm] = await tx.select().from(communities).where(eq(communities.id, communityId)).limit(1);
        const creatorUserId = comm?.ownerId ?? comm?.adminId;
        if (!creatorUserId) {
          throw new Error("COMMUNITY_NO_OWNER");
        }

        const balRows = await tx.select().from(ticketBalances).where(eq(ticketBalances.userId, userId)).limit(1);
        const currentBalance = balRows[0]?.balance ?? 0;
        if (currentBalance < TICKETS_PER_JUKEBOX) {
          const err = new Error("INSUFFICIENT_TICKETS");
          (err as any).meta = { balance: currentBalance, required: TICKETS_PER_JUKEBOX };
          throw err;
        }

        newBalance = currentBalance - TICKETS_PER_JUKEBOX;
        if (balRows.length === 0) {
          await tx.insert(ticketBalances).values({ userId, balance: newBalance });
        } else {
          await tx
            .update(ticketBalances)
            .set({ balance: newBalance, updatedAt: new Date() })
            .where(eq(ticketBalances.userId, userId));
        }

        const [spendTx] = await tx
          .insert(ticketTransactions)
          .values({
            userId,
            amount: -TICKETS_PER_JUKEBOX,
            type: "spend_jukebox",
            referenceId: queueItemId ? String(queueItemId) : null,
            description: `Jukebox request in community ${communityId}`,
          })
          .returning({ id: ticketTransactions.id });

        const walletId = await getOrCreateUserWallet(creatorUserId, tx);
        const creatorRow = await creatorRowForUserId(tx, creatorUserId);
        await recordRevenue(
          walletId,
          creatorUserId,
          creatorRow?.id ?? null,
          TICKETS_PER_JUKEBOX,
          "paid_live",
          String(spendTx.id),
          tx,
        );

        const countRows = await tx
          .select()
          .from(jukeboxRequestCounts)
          .where(
            and(
              eq(jukeboxRequestCounts.userId, userId),
              eq(jukeboxRequestCounts.communityId, communityId),
              eq(jukeboxRequestCounts.date, today),
            ),
          )
          .limit(1);
        if (countRows.length === 0) {
          await tx.insert(jukeboxRequestCounts).values({ userId, communityId, date: today, count: 1 });
        } else {
          await tx
            .update(jukeboxRequestCounts)
            .set({ count: countRows[0].count + 1, updatedAt: new Date() })
            .where(eq(jukeboxRequestCounts.id, countRows[0].id));
        }
      });
      return res.json({ success: true, newBalance });
    } catch (e: any) {
      if (e?.message === "INSUFFICIENT_TICKETS") {
        const meta = e?.meta ?? {};
        return res.status(402).json({
          error: "Insufficient tickets",
          balance: meta.balance ?? 0,
          required: meta.required ?? TICKETS_PER_JUKEBOX,
        });
      }
      if (e?.message === "COMMUNITY_NO_OWNER") {
        return res.status(400).json({ error: "Community has no owner for revenue" });
      }
      console.error("[tickets/spend-jukebox] failed:", e);
      return res.status(500).json({ error: "Failed to spend tickets" });
    }
  });

  /** POST /api/tickets/spend — generic spend for sessions, gifts, etc. */
  app.post("/api/tickets/spend", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { amount, type, referenceId, description, creatorId, videoId: rawVideoId } = req.body as {
      amount: number;
      type: string;
      referenceId?: string;
      description?: string;
      creatorId?: number;
      videoId?: number | string;
    };
    if (!amount || amount <= 0) return res.status(400).json({ error: "amount must be positive" });
    if (!type) return res.status(400).json({ error: "type required" });
    const userId = String(user.id);
    const revenueTypes = new Set(["spend_session", "spend_gift", "spend_jukebox", "spend_tip"]);
    const needsRevenueRecord = revenueTypes.has(type);

    let videoIdForGift: number | null = null;
    if (rawVideoId !== undefined && rawVideoId !== null && String(rawVideoId).trim() !== "") {
      const v = typeof rawVideoId === "number" ? rawVideoId : parseInt(String(rawVideoId), 10);
      if (Number.isFinite(v) && v > 0) videoIdForGift = v;
    }
    if (type === "spend_gift" && videoIdForGift == null && referenceId != null && /^\d+$/.test(String(referenceId).trim())) {
      const v = parseInt(String(referenceId).trim(), 10);
      if (Number.isFinite(v) && v > 0) videoIdForGift = v;
    }

    if (needsRevenueRecord && type !== "spend_gift" && (!Number.isInteger(creatorId) || (creatorId as number) <= 0)) {
      return res.status(400).json({ error: "creatorId required for revenue-eligible spend type" });
    }
    if (needsRevenueRecord && type === "spend_gift" && videoIdForGift == null && (!Number.isInteger(creatorId) || (creatorId as number) <= 0)) {
      return res.status(400).json({ error: "videoId or creatorId required for video purchase (spend_gift)" });
    }

    try {
      let newBalance = 0;
      await db.transaction(async (tx) => {
        let payoutCreatorUserId: number | null = null;
        if (needsRevenueRecord) {
          if (type === "spend_gift") {
            if (videoIdForGift != null) {
              const sellerId = await resolveVideoSellerUserId(tx, videoIdForGift);
              if (!sellerId) {
                const err = new Error("VIDEO_SELLER_NOT_FOUND");
                throw err;
              }
              const [vrow] = await tx
                .select({ price: videos.price, hidden: videos.hidden })
                .from(videos)
                .where(eq(videos.id, videoIdForGift))
                .limit(1);
              if (!vrow || vrow.hidden) {
                throw new Error("VIDEO_NOT_FOUND");
              }
              const expected = vrow.price ?? 0;
              if (expected <= 0) {
                throw new Error("VIDEO_NOT_PAID");
              }
              if (amount !== expected) {
                const err = new Error("VIDEO_PRICE_MISMATCH");
                (err as any).meta = { expected };
                throw err;
              }
              payoutCreatorUserId = sellerId;
            } else {
              payoutCreatorUserId = Number(creatorId);
            }
          } else {
            payoutCreatorUserId = Number(creatorId);
          }
        }

        const balRows = await tx.select().from(ticketBalances).where(eq(ticketBalances.userId, userId)).limit(1);
        const currentBalance = balRows[0]?.balance ?? 0;
        if (currentBalance < amount) {
          const err = new Error("INSUFFICIENT_TICKETS");
          (err as any).meta = { balance: currentBalance, required: amount };
          throw err;
        }

        newBalance = currentBalance - amount;
        if (balRows.length === 0) {
          await tx.insert(ticketBalances).values({ userId, balance: newBalance });
        } else {
          await tx
            .update(ticketBalances)
            .set({ balance: newBalance, updatedAt: new Date() })
            .where(eq(ticketBalances.userId, userId));
        }

        const [spendTx] = await tx
          .insert(ticketTransactions)
          .values({
            userId,
            amount: -amount,
            type,
            referenceId: referenceId ?? null,
            description: description ?? null,
          })
          .returning({ id: ticketTransactions.id });

        if (needsRevenueRecord && payoutCreatorUserId != null) {
          const walletId = await getOrCreateUserWallet(payoutCreatorUserId, tx);
          const creatorRow = await creatorRowForUserId(tx, payoutCreatorUserId);
          const source: RevenueSource = type === "spend_tip" ? "tip" : "paid_live";
          await recordRevenue(walletId, payoutCreatorUserId, creatorRow?.id ?? null, amount, source, String(spendTx.id), tx);
        }
      });
      return res.json({ success: true, newBalance });
    } catch (e: any) {
      if (e?.message === "INSUFFICIENT_TICKETS") {
        const meta = e?.meta ?? {};
        return res.status(402).json({ error: "Insufficient tickets", balance: meta.balance ?? 0, required: meta.required ?? amount });
      }
      if (e?.message === "VIDEO_SELLER_NOT_FOUND" || e?.message === "VIDEO_NOT_FOUND") {
        return res.status(404).json({ error: "Video or seller not found for payout" });
      }
      if (e?.message === "VIDEO_NOT_PAID") {
        return res.status(400).json({ error: "Video has no ticket price" });
      }
      if (e?.message === "VIDEO_PRICE_MISMATCH") {
        return res.status(400).json({ error: "Amount does not match video price", expected: e?.meta?.expected });
      }
      console.error("[tickets/spend] failed:", e);
      return res.status(500).json({ error: "Failed to spend tickets" });
    }
  });

  /** GET on checkout URL is a client mistake (e.g. opening API path in browser); only POST is valid. */
  app.get("/api/tickets/create-checkout", (_req: Request, res: Response) => {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST /api/tickets/create-checkout with JSON body { tickets, origin }" });
  });

  /** POST /api/tickets/create-checkout — create Stripe session to purchase tickets (USD) */
  app.post("/api/tickets/create-checkout", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { tickets, origin } = req.body as { tickets: number; origin: string };
    const ticketCount = Number(tickets);
    if (!Number.isInteger(ticketCount) || ticketCount < 100) {
      return res.status(400).json({ error: "Minimum purchase is 100 tickets" });
    }

    try {
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `RawStock ${ticketCount.toLocaleString()} Tickets`,
              description: `${ticketCount.toLocaleString()} Tickets — 1 Ticket = $0.01`,
            },
            unit_amount: ticketCount,
          },
          quantity: 1,
        }],
        mode: "payment",
        success_url: `${origin}/tickets?session_id={CHECKOUT_SESSION_ID}&tickets=${ticketCount}`,
        cancel_url: `${origin}/tickets`,
        metadata: {
          type: "ticket_purchase",
          userId: String(user.id),
          tickets: String(ticketCount),
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
      const tickets = parseInt(session.metadata?.tickets ?? "0");
      const metaUserId = session.metadata?.userId;
      if (!tickets || metaUserId !== String(user.id)) {
        return res.status(400).json({ error: "Invalid session" });
      }

      const credited = await creditTicketsFromTicketCheckoutSession(db, session);
      if (!credited.ok) {
        if (credited.reason === "not_paid") {
          return res.status(402).json({ error: "Payment not completed" });
        }
        return res.status(400).json({ error: "Invalid session" });
      }

      return res.json({ success: true, alreadyGranted: credited.alreadyGranted, newBalance: credited.newBalance });
    } catch (err) {
      console.error("Verify ticket purchase error:", err);
      return res.status(500).json({ error: "Failed to verify purchase" });
    }
  });

  /** GET /api/tickets/packs — list available ticket packs */
  app.get("/api/tickets/packs", (_req: Request, res: Response) => {
    return res.json(TICKET_PACKS);
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
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    if (user.role !== "ADMIN") return res.status(403).json({ error: "Only admins can perform this action" });
    const { title, imageUrl, linkUrl, description, displayOrder } = req.body as {
      title?: string; imageUrl?: string; linkUrl?: string; description?: string; displayOrder?: number;
    };
    if (!title) return res.status(400).json({ error: "title is required" });
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
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    if (user.role !== "ADMIN") return res.status(403).json({ error: "Only admins can perform this action" });
    const id = paramNum(req, "id");
    const { title, imageUrl, linkUrl, description, isActive, displayOrder } = req.body as {
      title?: string; imageUrl?: string; linkUrl?: string; description?: string; isActive?: boolean; displayOrder?: number;
    };
    try {
      const updates: Partial<InferSelectModel<typeof bannerAds>> = { updatedAt: new Date() };
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
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    if (user.role !== "ADMIN") return res.status(403).json({ error: "Only admins can perform this action" });
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
    if (!user) return res.status(401).json({ error: "Not authenticated" });
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
  const AI_EDIT_RENDERING_STATUS = "rendering";

  function isEditPlan(value: unknown): value is EditPlan {
    return Boolean(
      value &&
      typeof value === "object" &&
      Array.isArray((value as EditPlan).edl) &&
      typeof (value as EditPlan).title === "string",
    );
  }

  function parseStoredEditPlan(json: string | null): EditPlan | null {
    if (!json?.trim()) return null;
    const stored = parseAIEditStoredResult(json);
    if (stored) return stored.plan;
    try {
      const parsed: unknown = JSON.parse(json);
      return isEditPlan(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  function parseJobVideoUrls(job: InferSelectModel<typeof aiEditJobs>): string[] {
    if (job.videoUrls) {
      try {
        const parsed = JSON.parse(job.videoUrls) as unknown;
        if (Array.isArray(parsed)) {
          return parsed
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
            .filter(Boolean);
        }
      } catch {
        // ignore malformed JSON
      }
    }
    return job.videoUrl?.trim() ? [job.videoUrl.trim()] : [];
  }

  function getBaseVideoSpec(job: InferSelectModel<typeof aiEditJobs>) {
    const stored = parseAIEditStoredResult(job.result ?? null);
    return stored?.baseSpec ?? parseStoredVideoSpec(job.videoSpec ?? null);
  }

  function getRenderVideoSpec(job: InferSelectModel<typeof aiEditJobs>) {
    const stored = parseAIEditStoredResult(job.result ?? null);
    return stored?.renderSpec ?? parseStoredVideoSpec(job.videoSpec ?? null);
  }

  async function refundAIEditTickets(params: {
    userId: number;
    amount: number;
    type: string;
    description: string;
    referenceId: string;
  }) {
    const { userId, amount, type, description, referenceId } = params;
    if (!Number.isFinite(amount) || amount <= 0) return;
    const key = String(userId);
    const balRows = await db.select().from(ticketBalances).where(eq(ticketBalances.userId, key)).limit(1);
    const currentBalance = balRows[0]?.balance ?? 0;
    if (balRows.length === 0) {
      await db.insert(ticketBalances).values({ userId: key, balance: amount });
    } else {
      await db
        .update(ticketBalances)
        .set({ balance: currentBalance + amount, updatedAt: new Date() })
        .where(eq(ticketBalances.userId, key));
    }
    await db.insert(ticketTransactions).values({
      userId: key,
      amount,
      type,
      referenceId,
      description,
    });
  }

  async function scheduleAIEditPlanGeneration(params: {
    jobId: number;
    revisionPrompt?: string | null;
    refundAmount?: number;
    refundType?: string;
    refundDescription?: string;
  }) {
    const { jobId, revisionPrompt, refundAmount = 0, refundType, refundDescription } = params;
    if (!useAIEditMemoryQueue()) {
      await processAIEditJobInline({ jobId, revisionPrompt, refundAmount, refundType, refundDescription });
      return;
    }
    void (async () => {
      await db
        .update(aiEditJobs)
        .set({ status: "processing", updatedAt: new Date() } as Partial<InferSelectModel<typeof aiEditJobs>>)
        .where(eq(aiEditJobs.id, jobId));
      enqueueAIEditJob(`ai-edit:${jobId}:${revisionPrompt?.trim() ?? "initial"}`, async () => {
        await runAIEditPlanWorker({ jobId, revisionPrompt, refundAmount, refundType, refundDescription });
      });
    })();
  }

  // POST /api/ai-edit/jobs — charge tickets, create job, start async Claude processing
  app.post("/api/ai-edit/jobs", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { planMinutes, videoUrls, logoUrl, telop, targetAudience, tone, prompt, spec } = req.body as {
      planMinutes?: number;
      videoUrls?: string[];
      logoUrl?: string;
      telop?: string;
      targetAudience?: string;
      tone?: string;
      prompt?: string;
      spec?: unknown;
    };

    let videoSpecJson: string | null = null;
    if (spec !== undefined && spec !== null) {
      const normalized = normalizeVideoSpecPayload(spec);
      if (!normalized) {
        return res.status(400).json({ error: "Invalid video spec (DSL)" });
      }
      videoSpecJson = normalized;
    }
    if (!videoSpecJson) {
      return res.status(400).json({ error: "AI Edit requires a source spec built from the uploaded videos" });
    }

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
        videoSpec: videoSpecJson,
      } as typeof aiEditJobs.$inferInsert)
      .returning();

    await scheduleAIEditPlanGeneration({
      jobId: job.id,
      refundAmount: ticketCost,
      refundType: "refund_ai_edit",
      refundDescription: `Refund: AI Edit ${planMinutes}min plan (job ${job.id})`,
    });

    const [finalJob] = await db.select({ status: aiEditJobs.status }).from(aiEditJobs).where(eq(aiEditJobs.id, job.id));
    res.json({ id: job.id, status: finalJob?.status ?? job.status });
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

    const storedResult = parseAIEditStoredResult(job.result ?? null);
    const result = storedResult?.plan ?? parseStoredEditPlan(job.result ?? null);
    const parsedVideoUrls = parseJobVideoUrls(job);
    const videoSpec = storedResult?.renderSpec ?? parseStoredVideoSpec(job.videoSpec ?? null);
    const baseVideoSpec = storedResult?.baseSpec ?? videoSpec;

    res.json({
      id: job.id,
      userId: job.userId,
      videoUrl: job.videoUrl,
      videoUrls: parsedVideoUrls.length > 0 ? parsedVideoUrls : null,
      prompt: job.prompt,
      status: job.status,
      result,
      analysis: storedResult?.analysis ?? null,
      promptUsed: storedResult?.promptUsed ?? job.prompt,
      revisionPrompt: storedResult?.revisionPrompt ?? null,
      planMinutes: job.planMinutes,
      logoUrl: job.logoUrl,
      telop: job.telop,
      targetAudience: job.targetAudience,
      tone: job.tone,
      revisionCount: job.revisionCount ?? 0,
      ticketCost: job.ticketCost,
      videoSpec,
      baseVideoSpec,
      templatedRenderId: job.templatedRenderId ?? null,
      deliveredUrl: job.deliveredUrl ?? null,
      deliveredAt: job.deliveredAt ?? null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  });

  /** Templated webhook が叩く公開 URL のオリジン（末尾スラッシュなし) */
  function templatedPublicBaseUrl(): string {
    const u =
      process.env.TEMPLATED_WEBHOOK_BASE_URL?.trim() ||
      process.env.FRONTEND_URL?.trim() ||
      "https://rawstock.live";
    return u.replace(/\/$/, "");
  }

  // POST /api/ai-edit/jobs/:id/render — Templated で MP4 レンダー開始（オーナーのみ)
  app.post("/api/ai-edit/jobs/:id/render", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const apiKey = (process.env.TEMPLATED_API_KEY ?? "").trim();
    if (!apiKey) {
      return res.status(503).json({ error: "Templated is not configured (TEMPLATED_API_KEY)" });
    }

    const id = paramNum(req, "id");
    const [job] = await db.select().from(aiEditJobs).where(eq(aiEditJobs.id, id));
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.userId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (!["completed", "approved", AI_EDIT_RENDERING_STATUS].includes(job.status)) {
      return res.status(400).json({ error: "Only completed or approved jobs can be rendered" });
    }
    if (job.status === AI_EDIT_RENDERING_STATUS && job.templatedRenderId) {
      return res.status(409).json({ error: "A render is already in progress for this job" });
    }
    if (job.status === "delivered" && job.deliveredUrl?.trim()) {
      return res.status(409).json({ error: "This job has already been delivered" });
    }

    const spec = getRenderVideoSpec(job);
    if (!spec) {
      return res.status(400).json({ error: "Job has no renderable AI edit spec yet. Wait for the edit plan to finish." });
    }

    const videoUrls = parseJobVideoUrls(job);
    if (videoUrls.length === 0) {
      return res.status(400).json({ error: "No source video URLs on this job" });
    }

    const webhookUrl = `${templatedPublicBaseUrl()}/api/webhooks/templated`;
    const renderRequest = dslToTemplated(spec, {
      inputVideoUrls: videoUrls,
      logoUrl: job.logoUrl ?? undefined,
      webhookUrl,
      async: true,
    });

    const durationMs =
      typeof spec.duration === "number" && Number.isFinite(spec.duration) && spec.duration > 0
        ? Math.min(90, spec.duration) * 1000
        : undefined;

    const renderRes = await createTemplatedRender(renderRequest, {
      apiKey,
      externalId: String(job.id),
      durationMs,
    });

    if (!renderRes.id || renderRes.status === "failed") {
      return res.status(502).json({
        error: renderRes.error ?? "Templated render request failed",
        details: renderRes,
      });
    }

    const now = new Date();
    const syncUrl = renderRes.url?.trim();
    await db
      .update(aiEditJobs)
      .set({
        status: syncUrl ? "delivered" : AI_EDIT_RENDERING_STATUS,
        templatedRenderId: renderRes.id,
        ...(syncUrl
          ? {
              deliveredUrl: syncUrl,
              deliveredAt: now,
            }
          : {}),
        updatedAt: now,
      } as Partial<InferSelectModel<typeof aiEditJobs>>)
      .where(eq(aiEditJobs.id, id));

    if (syncUrl) {
      try {
        const [owner] = await db.select().from(users).where(eq(users.id, job.userId));
        await db.insert(notifications).values({
          type: "ai_edit_delivered",
          title: "Your edited video is ready",
          body: `Your AI Edit job #${job.id}${job.planMinutes ? ` (${job.planMinutes}-min plan)` : ""} has been delivered. Tap to download.`,
          amount: null,
          avatar: owner?.profileImageUrl ?? null,
          thumbnail: null,
          timeAgo: "Just now",
        } as typeof notifications.$inferInsert);
      } catch (notifErr) {
        console.error("[ai-edit/render] notification failed:", notifErr);
      }
    }

    res.json({
      ok: true,
      id: job.id,
      templatedRenderId: renderRes.id,
      status: syncUrl ? "delivered" : renderRes.status,
      url: renderRes.url ?? null,
    });
  });

  // POST /api/webhooks/templated — Templated 非同期レンダー完了
  app.post("/api/webhooks/templated", async (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    try {
      const statusRaw =
        typeof body.status === "string" ? body.status.toLowerCase() : "";
      const output =
        body.output && typeof body.output === "object" && body.output !== null
          ? (body.output as Record<string, unknown>)
          : null;
      const url =
        (output && typeof output.url === "string" ? output.url : null) ||
        (typeof body.url === "string" ? body.url : null);

      const succeeded =
        statusRaw === "succeeded" ||
        statusRaw === "completed" ||
        statusRaw === "success";

      let jobId: number | null = null;
      const ext = body.external_id ?? body.externalId;
      if (ext !== undefined && ext !== null) {
        const n = parseInt(String(ext), 10);
        if (Number.isFinite(n)) jobId = n;
      }
      if (jobId == null && typeof body.id === "string") {
        const [row] = await db
          .select()
          .from(aiEditJobs)
          .where(eq(aiEditJobs.templatedRenderId, body.id));
        if (row) jobId = row.id;
      }

      if (jobId == null) {
        console.warn("[webhooks/templated] Could not resolve job", { bodyKeys: Object.keys(body) });
        return res.status(200).json({ ok: false, reason: "job_not_found" });
      }

      if (!succeeded || !url?.trim()) {
        if (statusRaw === "failed" || statusRaw === "error") {
          await db
            .update(aiEditJobs)
            .set({ status: "failed", updatedAt: new Date() } as Partial<InferSelectModel<typeof aiEditJobs>>)
            .where(eq(aiEditJobs.id, jobId));
        }
        return res.status(200).json({ ok: true, ignored: true });
      }

      const [job] = await db.select().from(aiEditJobs).where(eq(aiEditJobs.id, jobId));
      if (!job) {
        return res.status(200).json({ ok: false, reason: "job_missing" });
      }

      const now = new Date();
      await db
        .update(aiEditJobs)
        .set({
          status: "delivered",
          deliveredUrl: url.trim(),
          deliveredAt: now,
          updatedAt: now,
        } as Partial<InferSelectModel<typeof aiEditJobs>>)
        .where(eq(aiEditJobs.id, jobId));

      try {
        const [owner] = await db.select().from(users).where(eq(users.id, job.userId));
        await db.insert(notifications).values({
          type: "ai_edit_delivered",
          title: "Your edited video is ready",
          body: `Your AI Edit job #${job.id}${job.planMinutes ? ` (${job.planMinutes}-min plan)` : ""} has been delivered. Tap to download.`,
          amount: null,
          avatar: owner?.profileImageUrl ?? null,
          thumbnail: null,
          timeAgo: "Just now",
        } as typeof notifications.$inferInsert);
      } catch (notifErr) {
        console.error("[webhooks/templated] notification failed:", notifErr);
      }

      return res.status(200).json({ ok: true, id: jobId });
    } catch (e) {
      console.error("[webhooks/templated]", e);
      return res.status(200).json({ ok: false });
    }
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
      .set({ status: "approved", updatedAt: new Date() } as Partial<InferSelectModel<typeof aiEditJobs>>)
      .where(eq(aiEditJobs.id, id));

    res.json({ ok: true, id, status: "approved" });
  });

  // POST /api/ai-edit/jobs/:id/revise — request revision (1st free, 2nd+ costs 100 tickets)
  app.post("/api/ai-edit/jobs/:id/revise", async (req: Request, res: Response) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const id = paramNum(req, "id");
    const { revisionPrompt } = req.body as { revisionPrompt?: string };
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
      .set({
        status: "pending",
        revisionCount: newRevisionCount,
        templatedRenderId: null,
        deliveredUrl: null,
        deliveredAt: null,
        updatedAt: new Date(),
      } as Partial<InferSelectModel<typeof aiEditJobs>>)
      .where(eq(aiEditJobs.id, id));

    await scheduleAIEditPlanGeneration({
      jobId: id,
      revisionPrompt,
      refundAmount: revisionCount >= 1 ? AI_EDIT_REVISION_TICKETS : 0,
      refundType: "refund_ai_edit_revision",
      refundDescription: `Refund: AI Edit Revision #${newRevisionCount} (job ${job.id})`,
    });

    const [reviseFinal] = await db.select({ status: aiEditJobs.status }).from(aiEditJobs).where(eq(aiEditJobs.id, id));
    res.json({
      ok: true,
      revisionCount: newRevisionCount,
      free: revisionCount === 0,
      status: reviseFinal?.status,
    });
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
      } as Partial<InferSelectModel<typeof aiEditJobs>>)
      .where(eq(aiEditJobs.id, id));

    // Send an in-app notification to the job owner
    try {
      const [owner] = await db.select().from(users).where(eq(users.id, job.userId));
      await db.insert(notifications).values({
        type: "ai_edit_delivered",
        title: "Your edited video is ready",
        body: `Your AI Edit job #${job.id}${job.planMinutes ? ` (${job.planMinutes}-min plan)` : ""} has been delivered. Tap to download.`,
        amount: null,
        avatar: owner?.profileImageUrl ?? null,
        thumbnail: null,
        timeAgo: "Just now",
      } as typeof notifications.$inferInsert);
    } catch (notifErr) {
      // Non-fatal — log but don't fail the delivery
      console.error("[ai-edit/deliver] Failed to send notification:", notifErr);
    }

    res.json({ ok: true, id, status: "delivered", deliveredUrl: deliveredUrl.trim() });
  });

  /** Vercel Cron 等: pending の AI Edit をバッチ処理（`CRON_SECRET` または `AI_EDIT_CRON_SECRET` の Bearer と一致） */
  app.get("/api/cron/ai-edit-process", async (req: Request, res: Response) => {
    const expected =
      process.env.CRON_SECRET?.trim() || process.env.AI_EDIT_CRON_SECRET?.trim() || "";
    if (!expected) {
      return res.status(503).json({ error: "CRON_SECRET or AI_EDIT_CRON_SECRET is not configured" });
    }
    const auth = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
    if (auth !== `Bearer ${expected}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const limit = Math.min(15, Math.max(1, parseInt(String(req.query.limit ?? "5"), 10) || 5));
    let processed = 0;
    for (let i = 0; i < limit; i++) {
      const r = await claimAndProcessNextPendingAIEditJob();
      if (!r.processed) break;
      processed++;
    }
    res.json({ ok: true, processed });
  });
}
