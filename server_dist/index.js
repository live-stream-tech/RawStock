var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "node:http";

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// server/schema.ts
var schema_exports = {};
__export(schema_exports, {
  TRANSACTION_STATUSES: () => TRANSACTION_STATUSES,
  USER_ROLES: () => USER_ROLES,
  VIDEO_VISIBILITY: () => VIDEO_VISIBILITY,
  announcements: () => announcements,
  bookingSessions: () => bookingSessions,
  communities: () => communities,
  communityAds: () => communityAds,
  communityMembers: () => communityMembers,
  communityModerators: () => communityModerators,
  communityPollOptions: () => communityPollOptions,
  communityPollVotes: () => communityPollVotes,
  communityPolls: () => communityPolls,
  communityThreadPosts: () => communityThreadPosts,
  communityThreads: () => communityThreads,
  communityVotes: () => communityVotes,
  concertStaff: () => concertStaff,
  concerts: () => concerts,
  creators: () => creators,
  dmConversationMessages: () => dmConversationMessages,
  dmMessages: () => dmMessages,
  earnings: () => earnings,
  genreAds: () => genreAds,
  genreOwners: () => genreOwners,
  jukeboxChat: () => jukeboxChat,
  jukeboxQueue: () => jukeboxQueue,
  jukeboxState: () => jukeboxState,
  liveStreamChat: () => liveStreamChat,
  liveStreams: () => liveStreams,
  liverAvailability: () => liverAvailability,
  liverReviews: () => liverReviews,
  notifications: () => notifications,
  phoneVerifications: () => phoneVerifications,
  reports: () => reports,
  savedVideos: () => savedVideos,
  streams: () => streams,
  transactions: () => transactions,
  twoshotBookings: () => twoshotBookings,
  users: () => users,
  videoComments: () => videoComments,
  videoEditRequests: () => videoEditRequests,
  videoEditors: () => videoEditors,
  videos: () => videos,
  wallets: () => wallets,
  withdrawals: () => withdrawals
});
import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  real,
  timestamp,
  unique
} from "drizzle-orm/pg-core";
var USER_ROLES = ["USER", "LIVER", "EDITOR", "MODERATOR", "ADMIN"];
var communities = pgTable("communities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  members: integer("members").notNull().default(0),
  thumbnail: text("thumbnail").notNull(),
  online: boolean("online").notNull().default(false),
  category: text("category").notNull(),
  /** 管理人（users.id）。広告収益10%の受け取り対象 */
  adminId: integer("admin_id"),
  /** 作成者＝初代管理人（users.id） */
  ownerId: integer("owner_id")
});
var communityModerators = pgTable("community_moderators", {
  id: serial("id").primaryKey(),
  communityId: integer("community_id").notNull(),
  userId: integer("user_id").notNull()
});
var communityMembers = pgTable("community_members", {
  id: serial("id").primaryKey(),
  communityId: integer("community_id").notNull(),
  userId: integer("user_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow()
});
var communityThreads = pgTable("community_threads", {
  id: serial("id").primaryKey(),
  communityId: integer("community_id").notNull(),
  authorUserId: integer("author_user_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow(),
  pinned: boolean("pinned").notNull().default(false)
});
var communityThreadPosts = pgTable("community_thread_posts", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull(),
  authorUserId: integer("author_user_id").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var communityPolls = pgTable("community_polls", {
  id: serial("id").primaryKey(),
  communityId: integer("community_id").notNull(),
  authorUserId: integer("author_user_id").notNull(),
  question: text("question").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  endAt: timestamp("end_at")
});
var communityPollOptions = pgTable("community_poll_options", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").notNull(),
  text: text("text").notNull(),
  order: integer("order").notNull().default(0)
});
var communityPollVotes = pgTable("community_poll_votes", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").notNull(),
  optionId: integer("option_id").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var communityVotes = pgTable("community_votes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  communityId: integer("community_id").notNull(),
  type: text("type").notNull(),
  // 'no_confidence' 等
  createdAt: timestamp("created_at").defaultNow()
});
var communityAds = pgTable("community_ads", {
  id: serial("id").primaryKey(),
  communityId: integer("community_id").notNull(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  bannerUrl: text("banner_url").notNull(),
  startDate: text("start_date").notNull(),
  // YYYY-MM-DD
  endDate: text("end_date").notNull(),
  dailyRate: integer("daily_rate").notNull(),
  totalAmount: integer("total_amount").notNull(),
  status: text("status").notNull().default("pending"),
  // pending | moderator_approved | approved | rejected
  approvedByModerator: integer("approved_by_moderator"),
  approvedByOwner: integer("approved_by_owner"),
  createdAt: timestamp("created_at").defaultNow()
});
var genreAds = pgTable("genre_ads", {
  id: serial("id").primaryKey(),
  genreId: text("genre_id").notNull(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  bannerUrl: text("banner_url").notNull(),
  startDate: text("start_date").notNull(),
  // YYYY-MM-DD
  endDate: text("end_date").notNull(),
  dailyRate: integer("daily_rate").notNull(),
  totalAmount: integer("total_amount").notNull(),
  status: text("status").notNull().default("pending"),
  // pending | approved | rejected
  createdAt: timestamp("created_at").defaultNow()
});
var genreOwners = pgTable("genre_owners", {
  id: serial("id").primaryKey(),
  genreId: text("genre_id").notNull().unique(),
  ownerUserId: integer("owner_user_id").notNull(),
  // users.id
  updatedAt: timestamp("updated_at").defaultNow()
});
var concerts = pgTable("concerts", {
  id: serial("id").primaryKey(),
  artistUserId: integer("artist_user_id").notNull(),
  // users.id
  title: text("title").notNull(),
  venueName: text("venue_name").notNull(),
  venueAddress: text("venue_address").notNull(),
  concertDate: text("concert_date").notNull(),
  // ISO文字列 or YYYY-MM-DD HH:mm
  ticketUrl: text("ticket_url"),
  shootingAllowed: boolean("shooting_allowed").notNull().default(false),
  shootingNotes: text("shooting_notes"),
  artistShare: integer("artist_share").notNull().default(0),
  photographerShare: integer("photographer_share").notNull().default(0),
  editorShare: integer("editor_share").notNull().default(0),
  venueShare: integer("venue_share").notNull().default(0),
  status: text("status").notNull().default("draft"),
  // draft | published
  createdAt: timestamp("created_at").defaultNow()
});
var concertStaff = pgTable("concert_staff", {
  id: serial("id").primaryKey(),
  concertId: integer("concert_id").notNull(),
  artistUserId: integer("artist_user_id").notNull(),
  // concerts.artist_user_id
  staffUserId: integer("staff_user_id").notNull(),
  // users.id
  status: text("status").notNull().default("pending"),
  // pending | approved | rejected
  createdAt: timestamp("created_at").defaultNow()
});
var VIDEO_VISIBILITY = ["draft", "my_page_only", "community"];
var videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  creator: text("creator").notNull(),
  community: text("community").notNull(),
  views: integer("views").notNull().default(0),
  timeAgo: text("time_ago").notNull(),
  duration: text("duration").notNull(),
  price: integer("price"),
  thumbnail: text("thumbnail").notNull(),
  avatar: text("avatar").notNull(),
  rank: integer("rank"),
  isRanked: boolean("is_ranked").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  /** 投稿本文（任意） */
  description: text("description"),
  /** 通報で明らかな違反と判定された場合に非表示 */
  hidden: boolean("hidden").notNull().default(false),
  concertId: integer("concert_id"),
  /** 投稿者（users.id）。既存データは null */
  userId: integer("user_id"),
  /** 公開範囲: draft=下書き, my_page_only=自分のページのみ, community=コミュニティ公開 */
  visibility: text("visibility").notNull().default("community"),
  /** コミュニティ公開時の communityId。visibility=community の場合に設定 */
  communityId: integer("community_id"),
  /** 動画URL（R2等にアップロードした動画）。再生用 */
  videoUrl: text("video_url"),
  /** YouTube動画ID。videoUrl と排他的に使用 */
  youtubeId: text("youtube_id")
});
var savedVideos = pgTable(
  "saved_videos",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    videoId: integer("video_id").notNull(),
    createdAt: timestamp("created_at").defaultNow()
  },
  (t) => [unique().on(t.userId, t.videoId)]
);
var videoComments = pgTable("video_comments", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull(),
  userId: integer("user_id").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  /** 通報で明らかな違反と判定された場合に非表示 */
  hidden: boolean("hidden").notNull().default(false)
});
var reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").notNull(),
  contentType: text("content_type").notNull(),
  // 'video' | 'comment'
  contentId: integer("content_id").notNull(),
  reason: text("reason").notNull(),
  // ユーザー選択: spam, harassment, inappropriate, other
  aiVerdict: text("ai_verdict").notNull(),
  // 'clear_violation' | 'gray_zone' | 'no_violation'
  aiReason: text("ai_reason"),
  status: text("status").notNull().default("pending"),
  // 'pending' | 'hidden' | 'reviewed'
  createdAt: timestamp("created_at").defaultNow()
});
var liveStreams = pgTable("live_streams", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  creator: text("creator").notNull(),
  community: text("community").notNull(),
  viewers: integer("viewers").notNull().default(0),
  thumbnail: text("thumbnail").notNull(),
  avatar: text("avatar").notNull(),
  timeAgo: text("time_ago").notNull(),
  isLive: boolean("is_live").notNull().default(true)
});
var streams = pgTable("streams", {
  id: serial("id").primaryKey(),
  cfLiveInputId: text("cf_live_input_id").notNull(),
  webRtcUrl: text("webrtc_url").notNull(),
  rtmpsUrl: text("rtmps_url").notNull(),
  rtmpsStreamKey: text("rtmps_stream_key").notNull(),
  currentViewers: integer("current_viewers").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow()
});
var creators = pgTable("creators", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  community: text("community").notNull(),
  avatar: text("avatar").notNull(),
  rank: integer("rank").notNull(),
  heatScore: real("heat_score").notNull().default(0),
  totalViews: integer("total_views").notNull().default(0),
  revenue: integer("revenue").notNull().default(0),
  streamCount: integer("stream_count").notNull().default(0),
  followers: integer("followers").notNull().default(0),
  revenueShare: integer("revenue_share").notNull().default(80),
  satisfactionScore: real("satisfaction_score").notNull().default(0),
  attendanceRate: real("attendance_rate").notNull().default(0),
  bio: text("bio").notNull().default(""),
  category: text("category").notNull().default("idol")
});
var bookingSessions = pgTable("booking_sessions", {
  id: serial("id").primaryKey(),
  creator: text("creator").notNull(),
  category: text("category").notNull(),
  categoryLabel: text("category_label").notNull(),
  title: text("title").notNull(),
  avatar: text("avatar").notNull(),
  thumbnail: text("thumbnail").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  duration: text("duration").notNull(),
  price: integer("price").notNull(),
  spotsTotal: integer("spots_total").notNull(),
  spotsLeft: integer("spots_left").notNull(),
  rating: real("rating").notNull().default(5),
  reviewCount: integer("review_count").notNull().default(0),
  tag: text("tag")
});
var notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  amount: integer("amount"),
  avatar: text("avatar"),
  thumbnail: text("thumbnail"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  timeAgo: text("time_ago").notNull()
});
var liveStreamChat = pgTable("live_stream_chat", {
  id: serial("id").primaryKey(),
  streamId: integer("stream_id").notNull(),
  username: text("username").notNull(),
  avatar: text("avatar"),
  message: text("message").notNull(),
  isGift: boolean("is_gift").default(false),
  giftAmount: integer("gift_amount"),
  createdAt: timestamp("created_at").defaultNow()
});
var dmConversationMessages = pgTable("dm_conversation_messages", {
  id: serial("id").primaryKey(),
  dmId: integer("dm_id").notNull(),
  sender: text("sender").notNull(),
  text: text("text").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var jukeboxState = pgTable("jukebox_state", {
  id: serial("id").primaryKey(),
  communityId: integer("community_id").notNull().unique(),
  currentVideoId: integer("current_video_id"),
  currentVideoTitle: text("current_video_title"),
  currentVideoThumbnail: text("current_video_thumbnail"),
  currentVideoDurationSecs: integer("current_video_duration_secs").default(0),
  // YouTubeなど外部動画のID（任意）
  currentVideoYoutubeId: text("current_video_youtube_id"),
  startedAt: timestamp("started_at").defaultNow(),
  isPlaying: boolean("is_playing").default(true),
  watchersCount: integer("watchers_count").default(1)
});
var jukeboxQueue = pgTable("jukebox_queue", {
  id: serial("id").primaryKey(),
  communityId: integer("community_id").notNull(),
  videoId: integer("video_id"),
  videoTitle: text("video_title").notNull(),
  videoThumbnail: text("video_thumbnail").notNull(),
  videoDurationSecs: integer("video_duration_secs").default(0),
  youtubeId: text("youtube_id"),
  addedBy: text("added_by").notNull().default("\u3042\u306A\u305F"),
  addedByAvatar: text("added_by_avatar"),
  position: integer("position").notNull().default(0),
  isPlayed: boolean("is_played").default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var jukeboxChat = pgTable("jukebox_chat", {
  id: serial("id").primaryKey(),
  communityId: integer("community_id").notNull(),
  username: text("username").notNull(),
  avatar: text("avatar"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var dmMessages = pgTable("dm_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  avatar: text("avatar").notNull(),
  lastMessage: text("last_message").notNull(),
  time: text("time").notNull(),
  unread: integer("unread").notNull().default(0),
  online: boolean("online").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0)
});
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  /** LINEアカウントID（必須・一意） */
  lineId: text("line_id").notNull().unique(),
  displayName: text("display_name").notNull().default("\u30E6\u30FC\u30B6\u30FC"),
  profileImageUrl: text("profile_image_url"),
  role: text("role").notNull().default("USER"),
  bio: text("bio").notNull().default(""),
  // NOTE: 以下のカラムはNeon側で事前に追加してください:
  // ALTER TABLE users ADD COLUMN IF NOT EXISTS spotify_url TEXT;
  // ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_music_url TEXT;
  // ALTER TABLE users ADD COLUMN IF NOT EXISTS bandcamp_url TEXT;
  // ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_url TEXT;
  // ALTER TABLE users ADD COLUMN IF NOT EXISTS youtube_url TEXT;
  // ALTER TABLE users ADD COLUMN IF NOT EXISTS x_url TEXT;
  spotifyUrl: text("spotify_url"),
  appleMusicUrl: text("apple_music_url"),
  bandcampUrl: text("bandcamp_url"),
  /** SNS・動画チャンネル（プロフィールにアイコン表示） */
  instagramUrl: text("instagram_url"),
  youtubeUrl: text("youtube_url"),
  xUrl: text("x_url"),
  /** 紐付け済みの電話番号（1電話番号 = 1ユーザー）。NULL許可だが重複は禁止。 */
  phoneNumber: text("phone_number").unique(),
  /** 電話番号が本人確認済みになった日時 */
  phoneVerifiedAt: timestamp("phone_verified_at"),
  /** Stripe Connect 連結アカウントID（Express/Custom）。連携済みなら設定される */
  stripeConnectId: text("stripe_connect_id"),
  /** Google OAuth（YouTube プレイリスト用）。Googleログインユーザーのみ */
  googleRefreshToken: text("google_refresh_token"),
  googleAccessToken: text("google_access_token"),
  googleTokenExpiresAt: timestamp("google_token_expires_at"),
  /** エニアグラム9型スコア（JSON配列 [1-9]） */
  enneagramScores: text("enneagram_scores"),
  /** プロフィールに表示する厳選コミュニティ4つ（JSON配列 [communityId, ...]） */
  pinnedCommunityIds: text("pinned_community_ids"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var phoneVerifications = pgTable("phone_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  phoneNumber: text("phone_number").notNull(),
  /** ハッシュ化された6桁コード */
  codeHash: text("code_hash").notNull(),
  /** 有効期限 */
  expiresAt: timestamp("expires_at").notNull(),
  consumed: boolean("consumed").notNull().default(false),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow()
});
var wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  // システムウォレットは null
  /** ユーザーウォレットは null。システム用: 'MODERATOR' | 'ADMIN' | 'EVENT_RESERVE' | 'PLATFORM' */
  kind: text("kind"),
  balanceAvailable: integer("balance_available").notNull().default(0),
  balancePending: integer("balance_pending").notNull().default(0),
  currency: text("currency").notNull().default("JPY"),
  updatedAt: timestamp("updated_at").defaultNow()
});
var TRANSACTION_STATUSES = ["PENDING", "SETTLED", "CANCELLED"];
var transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").notNull(),
  amount: integer("amount").notNull(),
  type: text("type").notNull(),
  // 'tip' | 'gift' | 'twoshot' | 'banner_ad' | 'payout' | 'revenue_share' | 'REVENUE' 等
  status: text("status").notNull().default("PENDING"),
  // PENDING | SETTLED | CANCELLED
  referenceId: text("reference_id"),
  settledAt: timestamp("settled_at"),
  createdAt: timestamp("created_at").defaultNow()
});
var videoEditors = pgTable("video_editors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  bio: text("bio").notNull().default(""),
  communityId: integer("community_id").notNull(),
  genres: text("genres").notNull().default(""),
  deliveryDays: integer("delivery_days").notNull().default(3),
  priceType: text("price_type").notNull(),
  pricePerMinute: integer("price_per_minute"),
  revenueSharePercent: integer("revenue_share_percent"),
  rating: real("rating").notNull().default(0),
  reviewCount: integer("review_count").notNull().default(0),
  isAvailable: boolean("is_available").notNull().default(true)
});
var videoEditRequests = pgTable("video_edit_requests", {
  id: serial("id").primaryKey(),
  editorId: integer("editor_id").notNull(),
  requesterId: text("requester_id").notNull(),
  requesterName: text("requester_name").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  priceType: text("price_type").notNull(),
  budget: integer("budget"),
  deadline: text("deadline"),
  createdAt: timestamp("created_at").defaultNow()
});
var earnings = pgTable("earnings", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default("guest-001"),
  type: text("type").notNull(),
  title: text("title").notNull(),
  amount: integer("amount").notNull(),
  revenueShare: integer("revenue_share").notNull().default(80),
  netAmount: integer("net_amount").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var withdrawals = pgTable("withdrawals", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default("guest-001"),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"),
  bankName: text("bank_name").notNull(),
  bankBranch: text("bank_branch").notNull(),
  accountType: text("account_type").notNull().default("\u666E\u901A"),
  accountNumber: text("account_number").notNull(),
  accountName: text("account_name").notNull(),
  note: text("note"),
  requestedAt: timestamp("requested_at").defaultNow(),
  processedAt: timestamp("processed_at")
});
var twoshotBookings = pgTable("twoshot_bookings", {
  id: serial("id").primaryKey(),
  streamId: integer("stream_id").notNull(),
  userId: text("user_id").notNull().default("guest"),
  userName: text("user_name").notNull(),
  userAvatar: text("user_avatar"),
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  price: integer("price").notNull(),
  status: text("status").notNull().default("pending"),
  queuePosition: integer("queue_position").notNull().default(0),
  agreedToTerms: boolean("agreed_to_terms").notNull().default(false),
  agreedAt: timestamp("agreed_at"),
  notifiedAt: timestamp("notified_at"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancelReason: text("cancel_reason"),
  refundable: boolean("refundable").notNull().default(false),
  evaluationScore: integer("evaluation_score"),
  createdAt: timestamp("created_at").defaultNow()
});
var liverReviews = pgTable("liver_reviews", {
  id: serial("id").primaryKey(),
  liverId: integer("liver_id").notNull(),
  userId: text("user_id").notNull().default("guest"),
  userName: text("user_name").notNull(),
  userAvatar: text("user_avatar"),
  satisfactionScore: integer("satisfaction_score").notNull().default(5),
  streamCountScore: integer("stream_count_score").notNull().default(5),
  attendanceScore: integer("attendance_score").notNull().default(5),
  overallScore: real("overall_score").notNull().default(5),
  comment: text("comment").notNull().default(""),
  sessionDate: text("session_date").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var liverAvailability = pgTable("liver_availability", {
  id: serial("id").primaryKey(),
  liverId: integer("liver_id").notNull(),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  maxSlots: integer("max_slots").notNull().default(3),
  bookedSlots: integer("booked_slots").notNull().default(0),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow()
});
var announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  type: text("type").notNull(),
  isPinned: boolean("is_pinned").notNull().default(false),
  startAt: timestamp("start_at"),
  endAt: timestamp("end_at"),
  createdAt: timestamp("created_at").defaultNow()
});

// server/db.ts
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("neon") ? { rejectUnauthorized: false } : false
});
var db = drizzle(pool, { schema: schema_exports });

// server/routes.ts
import { eq as eq2, asc, desc, count, sql as sql2, and as and2, or, isNull, inArray } from "drizzle-orm";

// server/stripeClient.local.ts
import Stripe from "stripe";
var SECRET_KEY = process.env.STRIPE_SECRET_KEY;
var PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;
if (!SECRET_KEY || !PUBLISHABLE_KEY) {
  console.warn(
    "[stripe] STRIPE_SECRET_KEY / STRIPE_PUBLISHABLE_KEY \u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u306A\u3044\u305F\u3081\u3001Stripe\u9023\u643A\u306F\u7121\u52B9\u3067\u3059\u3002"
  );
}
async function getUncachableStripeClient() {
  if (!SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(SECRET_KEY, { apiVersion: "2025-08-27.basil" });
}
async function getStripePublishableKey() {
  if (!PUBLISHABLE_KEY) {
    throw new Error("STRIPE_PUBLISHABLE_KEY is not set");
  }
  return PUBLISHABLE_KEY;
}
async function createConnectExpressAccount(params) {
  const stripe = await getUncachableStripeClient();
  const account = await stripe.accounts.create({
    type: "express",
    country: params.country ?? "JP",
    email: params.email ?? void 0
  });
  return account.id;
}
async function createConnectAccountLink(params) {
  const stripe = await getUncachableStripeClient();
  const link = await stripe.accountLinks.create({
    account: params.accountId,
    refresh_url: params.refreshUrl,
    return_url: params.returnUrl,
    type: "account_onboarding"
  });
  return link.url;
}
async function getConnectAccount(accountId) {
  const stripe = await getUncachableStripeClient();
  try {
    const account = await stripe.accounts.retrieve(accountId);
    return account;
  } catch {
    return null;
  }
}
async function createBannerPaymentIntent(params) {
  const stripe = await getUncachableStripeClient();
  const pi = await stripe.paymentIntents.create({
    amount: params.amountYen,
    currency: "jpy",
    automatic_payment_methods: { enabled: true },
    metadata: params.metadata ?? {}
  });
  return {
    clientSecret: pi.client_secret,
    paymentIntentId: pi.id
  };
}
async function getPaymentIntentStatus(paymentIntentId) {
  const stripe = await getUncachableStripeClient();
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status === "succeeded") return "succeeded";
    if (pi.status === "requires_payment_method") return "requires_payment_method";
    return null;
  } catch {
    return null;
  }
}

// server/aggregateRevenue.ts
import { eq, sql, and, gte, lte } from "drizzle-orm";
async function getMonthlyRevenueRank(yearMonth) {
  const [year, month] = yearMonth.split("-").map(Number);
  if (!year || !month) return [];
  const start = new Date(year, month - 1, 1, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59);
  const rows = await db.select({
    userId: wallets.userId,
    totalRevenue: sql`COALESCE(SUM(${transactions.amount}), 0)::int`
  }).from(transactions).innerJoin(wallets, eq(transactions.walletId, wallets.id)).where(
    and(
      eq(transactions.type, "REVENUE"),
      gte(transactions.createdAt, start),
      lte(transactions.createdAt, end)
    )
  ).groupBy(wallets.userId);
  const withUser = await Promise.all(
    rows.filter((r) => r.userId != null).map(async (r) => {
      const [u] = await db.select({ displayName: users.displayName }).from(users).where(eq(users.id, r.userId));
      return {
        userId: r.userId,
        displayName: u?.displayName ?? "\u4E0D\u660E",
        totalRevenue: Number(r.totalRevenue)
      };
    })
  );
  withUser.sort((a, b) => b.totalRevenue - a.totalRevenue);
  return withUser.map((row, index) => ({ ...row, rank: index + 1 }));
}

// server/claudeReport.ts
var MODEL = "claude-haiku-4-5-20251001";
var ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
var SYSTEM_PROMPT = `\u3042\u306A\u305F\u306F\u30B3\u30F3\u30C6\u30F3\u30C4\u30E2\u30C7\u30EC\u30FC\u30B7\u30E7\u30F3\u306E\u5224\u5B9A\u8005\u3067\u3059\u3002
\u30E6\u30FC\u30B6\u30FC\u304C\u9078\u629E\u3057\u305F\u901A\u5831\u7406\u7531\u306B\u57FA\u3065\u304D\u3001\u6295\u7A3F\u307E\u305F\u306F\u30B3\u30E1\u30F3\u30C8\u306E\u30C6\u30AD\u30B9\u30C8\u304C\u4EE5\u4E0B\u306E\u3044\u305A\u308C\u304B\u306B\u8A72\u5F53\u3059\u308B\u304B\u5224\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u5224\u5B9A\u57FA\u6E96:
- \u30B9\u30D1\u30E0: \u5E83\u544A\u30FB\u5BA3\u4F1D\u30FB\u30D5\u30A3\u30C3\u30B7\u30F3\u30B0\u30FB\u7121\u95A2\u4FC2\u306A\u7E70\u308A\u8FD4\u3057
- \u30CF\u30E9\u30B9\u30E1\u30F3\u30C8: \u8AB9\u8B17\u4E2D\u50B7\u30FB\u3044\u3058\u3081\u30FB\u5DEE\u5225\u7684\u8868\u73FE\u30FB\u500B\u4EBA\u653B\u6483
- \u6027\u7684\u30B3\u30F3\u30C6\u30F3\u30C4: \u9732\u9AA8\u306A\u6027\u7684\u8868\u73FE\u30FB\u5150\u7AE5\u306B\u95A2\u9023\u3059\u308B\u4E0D\u9069\u5207\u306A\u5185\u5BB9
- \u66B4\u529B\u7684\u30B3\u30F3\u30C6\u30F3\u30C4: \u8105\u8FEB\u30FB\u66B4\u529B\u306E\u52A9\u9577\u30FB\u30B0\u30ED\u30C6\u30B9\u30AF\u306A\u63CF\u5199

\u5224\u5B9A\u7D50\u679C\u306F\u5FC5\u305A\u4EE5\u4E0B\u306E3\u7A2E\u985E\u306E\u3044\u305A\u308C\u304B1\u3064\u3060\u3051\u3092\u8FD4\u3057\u3066\u304F\u3060\u3055\u3044\u3002JSON\u306E\u307F\u3092\u8FD4\u3057\u3001\u8AAC\u660E\u6587\u306F\u4E0D\u8981\u3067\u3059\u3002
- clear_violation: \u660E\u3089\u304B\u306B\u898F\u7D04\u9055\u53CD\uFF08\u4E0A\u8A18\u306E\u3044\u305A\u308C\u304B\u306B\u660E\u78BA\u306B\u8A72\u5F53\uFF09
- gray_zone: \u30B0\u30EC\u30FC\u30BE\u30FC\u30F3\uFF08\u5224\u65AD\u304C\u96E3\u3057\u3044\u3001\u6587\u8108\u6B21\u7B2C\uFF09
- no_violation: \u9055\u53CD\u306A\u3057\uFF08\u8A72\u5F53\u3057\u306A\u3044\u3001\u8AA4\u901A\u5831\u306E\u53EF\u80FD\u6027)

\u8FD4\u5374\u5F62\u5F0F\uFF08\u3053\u306EJSON\u5F62\u5F0F\u306E\u307F\uFF09:
{"verdict":"clear_violation"|"gray_zone"|"no_violation","reason":"\u77ED\u3044\u7406\u7531\uFF081\u6587\uFF09"}`;
async function judgeReportContent(contentText, userReason) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { verdict: "gray_zone", reason: "API\u30AD\u30FC\u672A\u8A2D\u5B9A\u306E\u305F\u3081\u7BA1\u7406\u8005\u78BA\u8A8D\u306B\u56DE\u3057\u307E\u3057\u305F\u3002" };
  }
  const userPrompt = `\u901A\u5831\u7406\u7531: ${userReason}

\u5BFE\u8C61\u30C6\u30AD\u30B9\u30C8:
${contentText}`;
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }]
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("Claude API error:", res.status, errText);
    return { verdict: "gray_zone", reason: `API\u30A8\u30E9\u30FC(${res.status})\u306E\u305F\u3081\u7BA1\u7406\u8005\u78BA\u8A8D\u306B\u56DE\u3057\u307E\u3057\u305F\u3002` };
  }
  const data = await res.json();
  const text2 = data.content?.[0]?.text?.trim() ?? "";
  try {
    const parsed = JSON.parse(text2);
    const verdict = parsed.verdict;
    if (verdict === "clear_violation" || verdict === "gray_zone" || verdict === "no_violation") {
      return {
        verdict,
        reason: typeof parsed.reason === "string" ? parsed.reason : ""
      };
    }
  } catch {
  }
  return { verdict: "gray_zone", reason: "\u5224\u5B9A\u7D50\u679C\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u305F\u305F\u3081\u7BA1\u7406\u8005\u78BA\u8A8D\u306B\u56DE\u3057\u307E\u3057\u305F\u3002" };
}

// server/r2.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
var endpoint = process.env.R2_ENDPOINT;
var bucket = process.env.R2_BUCKET_NAME;
var accessKeyId = process.env.R2_ACCESS_KEY_ID;
var secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
if (!endpoint || !bucket) {
  console.warn("[R2] R2_ENDPOINT / R2_BUCKET_NAME \u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093");
}
var r2Client = endpoint && accessKeyId && secretAccessKey ? new S3Client({
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey
  }
}) : null;
async function createSignedUploadUrl(key, contentType) {
  if (!r2Client || !endpoint || !bucket) {
    throw new Error("R2 \u30AF\u30E9\u30A4\u30A2\u30F3\u30C8\u304C\u6B63\u3057\u304F\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093");
  }
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType
  });
  const uploadUrl = await getSignedUrl(r2Client, cmd, { expiresIn: 60 * 5 });
  const publicUrl = `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`;
  return { uploadUrl, publicUrl };
}

// server/routes.ts
import jwt from "jsonwebtoken";
var JWT_SECRET = process.env.SESSION_SECRET ?? "livestage-dev-secret";
var CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
var CLOUDFLARE_STREAM_TOKEN = process.env.CLOUDFLARE_STREAM_TOKEN ?? "";
function makeToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "90d" });
}
function paramStr(req, key) {
  const v = req.params[key];
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}
function paramNum(req, key) {
  return parseInt(paramStr(req, key), 10) || 0;
}
function formatTimeAgo(d) {
  if (!d) return "\u305F\u3063\u305F\u4ECA";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "\u305F\u3063\u305F\u4ECA";
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1e3);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffSec < 60) return "\u305F\u3063\u305F\u4ECA";
  if (diffMin < 60) return `${diffMin}\u5206\u524D`;
  if (diffHour < 24) return `${diffHour}\u6642\u9593\u524D`;
  if (diffDay < 7) return `${diffDay}\u65E5\u524D`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}\u9031\u9593\u524D`;
  if (diffDay < 365) return `${Math.floor(diffDay / 30)}\u30F6\u6708\u524D`;
  return `${Math.floor(diffDay / 365)}\u5E74\u524D`;
}
function queryStr(req, key) {
  const v = req.query[key];
  if (Array.isArray(v)) return typeof v[0] === "string" ? v[0] : "";
  return typeof v === "string" ? v : "";
}
async function getAuthUser(req) {
  const auth = req.headers?.authorization ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    if (typeof payload === "string" || !payload || typeof payload.sub !== "number") return null;
    const sub = payload.sub;
    const [user] = await db.select().from(users).where(eq2(users.id, sub));
    if (!user) return null;
    return {
      ...user,
      avatar: user.profileImageUrl
    };
  } catch {
    return null;
  }
}
var SYSTEM_WALLET_KINDS = ["MODERATOR", "ADMIN", "EVENT_RESERVE", "PLATFORM"];
async function getOrCreateSystemWallets() {
  const result = {};
  for (const kind of SYSTEM_WALLET_KINDS) {
    const [w] = await db.select().from(wallets).where(eq2(wallets.kind, kind));
    if (w) {
      result[kind] = w.id;
    } else {
      const [created] = await db.insert(wallets).values({ kind, userId: null }).returning();
      result[kind] = created.id;
    }
  }
  return result;
}
async function getOrCreateUserWallet(userId) {
  const [w] = await db.select().from(wallets).where(and2(eq2(wallets.userId, userId), isNull(wallets.kind)));
  if (w) return w.id;
  const [created] = await db.insert(wallets).values({ userId, kind: null }).returning();
  return created.id;
}
async function recordRevenue(walletId, amount, source, referenceId) {
  await db.insert(transactions).values({
    walletId,
    amount,
    type: "REVENUE",
    status: "PENDING",
    referenceId
  });
}
async function registerRoutes(app2) {
  app2.get("/api/auth/me", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u672A\u8A8D\u8A3C\u3067\u3059" });
    const [u] = await db.select({
      enneagramScores: users.enneagramScores,
      pinnedCommunityIds: users.pinnedCommunityIds
    }).from(users).where(eq2(users.id, user.id));
    let enneagramScores = null;
    let pinnedCommunityIds = [];
    if (u) {
      if (u.enneagramScores) {
        try {
          const p = JSON.parse(u.enneagramScores);
          if (Array.isArray(p) && p.length === 9) enneagramScores = p;
        } catch {
        }
      }
      if (u.pinnedCommunityIds) {
        try {
          const p = JSON.parse(u.pinnedCommunityIds);
          if (Array.isArray(p)) pinnedCommunityIds = p;
        } catch {
        }
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
      spotifyUrl: user.spotifyUrl ?? null,
      appleMusicUrl: user.appleMusicUrl ?? null,
      bandcampUrl: user.bandcampUrl ?? null,
      instagramUrl: user.instagramUrl ?? null,
      youtubeUrl: user.youtubeUrl ?? null,
      xUrl: user.xUrl ?? null,
      phoneNumber: user.phoneNumber ?? null,
      enneagramScores,
      pinnedCommunityIds
    });
  });
  app2.post("/api/connect/onboard", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u672A\u8A8D\u8A3C\u3067\u3059" });
    try {
      const baseUrl = process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : process.env.APP_URL ?? "http://localhost:8081";
      const returnUrl = `${baseUrl}/payout-settings?connect=return`;
      const refreshUrl = `${baseUrl}/payout-settings?connect=refresh`;
      let accountId = user.stripeConnectId;
      if (!accountId) {
        accountId = await createConnectExpressAccount({ country: "JP" });
        await db.update(users).set({ stripeConnectId: accountId, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(users.id, user.id));
      }
      const url = await createConnectAccountLink({ accountId, returnUrl, refreshUrl });
      res.json({ url, accountId });
    } catch (e) {
      console.error("Connect onboard error:", e);
      res.status(500).json({ error: e.message ?? "Stripe Connect \u306E\u6E96\u5099\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
    }
  });
  app2.get("/api/connect/status", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u672A\u8A8D\u8A3C\u3067\u3059" });
    if (!user.stripeConnectId) {
      return res.json({ connected: false, stripeConnectId: null, chargesEnabled: false });
    }
    const account = await getConnectAccount(user.stripeConnectId);
    const chargesEnabled = account?.charges_enabled ?? false;
    res.json({
      connected: !!account,
      stripeConnectId: user.stripeConnectId,
      chargesEnabled,
      detailsSubmitted: account?.details_submitted ?? false
    });
  });
  const BANNER_MIN_AMOUNT = 15e3;
  const BANNER_RATE_MODERATOR = 0.2;
  const BANNER_RATE_ADMIN = 0.2;
  const BANNER_RATE_EVENT = 0.1;
  const BANNER_RATE_PLATFORM = 0.5;
  app2.post("/api/banner/checkout", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u672A\u8A8D\u8A3C\u3067\u3059" });
    const { people, days } = req.body;
    const p = Math.max(1, Number(people) || 1);
    const d = Math.max(1, Number(days) || 1);
    const amountYen = Math.max(BANNER_MIN_AMOUNT, p * 5 * d);
    try {
      const { clientSecret, paymentIntentId } = await createBannerPaymentIntent({
        amountYen,
        metadata: { userId: String(user.id), people: String(p), days: String(d), type: "banner_ad" }
      });
      res.json({ clientSecret, paymentIntentId, amountYen });
    } catch (e) {
      console.error("Banner checkout error:", e);
      res.status(500).json({ error: e.message ?? "\u6C7A\u6E08\u306E\u6E96\u5099\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
    }
  });
  app2.post("/api/banner/confirm", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u672A\u8A8D\u8A3C\u3067\u3059" });
    const { paymentIntentId } = req.body;
    if (!paymentIntentId) return res.status(400).json({ error: "paymentIntentId \u304C\u5FC5\u8981\u3067\u3059" });
    const status = await getPaymentIntentStatus(paymentIntentId);
    if (status !== "succeeded") {
      return res.status(400).json({ error: "\u6C7A\u6E08\u304C\u5B8C\u4E86\u3057\u3066\u3044\u307E\u305B\u3093" });
    }
    const stripe = await getUncachableStripeClient();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    const amountYen = pi.amount;
    const sys = await getOrCreateSystemWallets();
    const amountMod = Math.floor(amountYen * BANNER_RATE_MODERATOR);
    const amountAdmin = Math.floor(amountYen * BANNER_RATE_ADMIN);
    const amountEvent = Math.floor(amountYen * BANNER_RATE_EVENT);
    const amountPlatform = amountYen - amountMod - amountAdmin - amountEvent;
    await db.insert(transactions).values([
      { walletId: sys.MODERATOR, amount: amountMod, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId },
      { walletId: sys.ADMIN, amount: amountAdmin, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId },
      { walletId: sys.EVENT_RESERVE, amount: amountEvent, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId },
      { walletId: sys.PLATFORM, amount: amountPlatform, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId }
    ]);
    res.json({ ok: true, amountYen, split: { moderator: amountMod, admin: amountAdmin, eventReserve: amountEvent, platform: amountPlatform } });
  });
  const BANNER_CHECKOUT_DAYS = 3;
  const BANNER_CHECKOUT_AMOUNT_YEN = 15e3;
  app2.post("/api/banner/checkout-session", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u672A\u8A8D\u8A3C\u3067\u3059" });
    try {
      const stripe = await getUncachableStripeClient();
      const baseUrl = process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : process.env.APP_URL ?? "http://localhost:8081";
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "jpy",
              unit_amount: BANNER_CHECKOUT_AMOUNT_YEN,
              product_data: {
                name: "\u30B3\u30DF\u30E5\u30CB\u30C6\u30A3\u5E83\u544A\u30D0\u30CA\u30FC\uFF083\u65E5\u9593\uFF09",
                description: `\u30B3\u30DF\u30E5\u30CB\u30C6\u30A3\u30DA\u30FC\u30B8\u306E\u5E83\u544A\u30D0\u30CA\u30FC\u67A0 3\u65E5\u9593\u51FA\u7A3F\uFF08\xA5${BANNER_CHECKOUT_AMOUNT_YEN.toLocaleString()}\uFF09`
              }
            },
            quantity: 1
          }
        ],
        mode: "payment",
        success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/community`,
        metadata: {
          type: "banner_ad",
          days: String(BANNER_CHECKOUT_DAYS),
          userId: String(user.id)
        }
      });
      res.json({ checkoutUrl: session.url });
    } catch (e) {
      console.error("Banner checkout session error:", e);
      res.status(500).json({ error: e.message ?? "\u6C7A\u6E08\u306E\u6E96\u5099\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
    }
  });
  app2.post("/api/banner/confirm-session", async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: "sessionId \u304C\u5FC5\u8981\u3067\u3059" });
    try {
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== "paid") {
        return res.status(400).json({ error: "\u6C7A\u6E08\u304C\u5B8C\u4E86\u3057\u3066\u3044\u307E\u305B\u3093" });
      }
      const amountYen = session.amount_total ?? BANNER_CHECKOUT_AMOUNT_YEN;
      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? session.id;
      const sys = await getOrCreateSystemWallets();
      const amountMod = Math.floor(amountYen * BANNER_RATE_MODERATOR);
      const amountAdmin = Math.floor(amountYen * BANNER_RATE_ADMIN);
      const amountEvent = Math.floor(amountYen * BANNER_RATE_EVENT);
      const amountPlatform = amountYen - amountMod - amountAdmin - amountEvent;
      await db.insert(transactions).values([
        { walletId: sys.MODERATOR, amount: amountMod, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId },
        { walletId: sys.ADMIN, amount: amountAdmin, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId },
        { walletId: sys.EVENT_RESERVE, amount: amountEvent, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId },
        { walletId: sys.PLATFORM, amount: amountPlatform, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId }
      ]);
      res.json({
        ok: true,
        amountYen,
        split: { moderator: amountMod, admin: amountAdmin, eventReserve: amountEvent, platform: amountPlatform }
      });
    } catch (e) {
      console.error("Banner confirm-session error:", e);
      res.status(500).json({ error: e.message ?? "\u6C7A\u6E08\u306E\u78BA\u8A8D\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
    }
  });
  app2.put("/api/auth/profile", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u672A\u8A8D\u8A3C\u3067\u3059" });
    const { name, displayName, bio, avatar, profileImageUrl, spotifyUrl, appleMusicUrl, bandcampUrl, instagramUrl, youtubeUrl, xUrl, phoneNumber, enneagramScores, pinnedCommunityIds } = req.body;
    const newName = name ?? displayName ?? user.displayName;
    const newBio = bio ?? user.bio;
    const newAvatar = avatar ?? profileImageUrl ?? user.profileImageUrl;
    const newPhone = phoneNumber !== void 0 ? phoneNumber?.trim() || null : void 0;
    const enneagramJson = enneagramScores !== void 0 ? Array.isArray(enneagramScores) && enneagramScores.length === 9 ? JSON.stringify(enneagramScores) : null : void 0;
    const pinnedJson = pinnedCommunityIds !== void 0 ? Array.isArray(pinnedCommunityIds) ? JSON.stringify(pinnedCommunityIds.slice(0, 4)) : null : void 0;
    const [updated] = await db.update(users).set({
      displayName: newName,
      bio: newBio,
      profileImageUrl: newAvatar !== void 0 ? newAvatar : void 0,
      spotifyUrl: spotifyUrl !== void 0 ? spotifyUrl : user.spotifyUrl ?? null,
      appleMusicUrl: appleMusicUrl !== void 0 ? appleMusicUrl : user.appleMusicUrl ?? null,
      bandcampUrl: bandcampUrl !== void 0 ? bandcampUrl : user.bandcampUrl ?? null,
      ...instagramUrl !== void 0 ? { instagramUrl: instagramUrl?.trim() || null } : {},
      ...youtubeUrl !== void 0 ? { youtubeUrl: youtubeUrl?.trim() || null } : {},
      ...xUrl !== void 0 ? { xUrl: xUrl?.trim() || null } : {},
      ...newPhone !== void 0 && { phoneNumber: newPhone },
      ...enneagramJson !== void 0 && { enneagramScores: enneagramJson },
      ...pinnedJson !== void 0 && { pinnedCommunityIds: pinnedJson },
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq2(users.id, user.id)).returning();
    let outEnneagram = null;
    let outPinned = [];
    if (updated.enneagramScores) {
      try {
        const p = JSON.parse(updated.enneagramScores);
        if (Array.isArray(p) && p.length === 9) outEnneagram = p;
      } catch {
      }
    }
    if (updated.pinnedCommunityIds) {
      try {
        const p = JSON.parse(updated.pinnedCommunityIds);
        if (Array.isArray(p)) outPinned = p;
      } catch {
      }
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
      instagramUrl: updated.instagramUrl ?? null,
      youtubeUrl: updated.youtubeUrl ?? null,
      enneagramScores: outEnneagram,
      pinnedCommunityIds: outPinned,
      xUrl: updated.xUrl ?? null
    });
  });
  app2.delete("/api/auth/account", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u672A\u8A8D\u8A3C\u3067\u3059" });
    const [owned] = await db.select().from(communities).where(eq2(communities.ownerId, user.id)).limit(1);
    if (owned) {
      return res.status(400).json({ error: "\u7BA1\u7406\u3057\u3066\u3044\u308B\u30B3\u30DF\u30E5\u30CB\u30C6\u30A3\u304C\u3042\u308B\u305F\u3081\u524A\u9664\u3067\u304D\u307E\u305B\u3093\u3002\u5148\u306B\u30B3\u30DF\u30E5\u30CB\u30C6\u30A3\u3092\u524A\u9664\u3057\u3066\u304F\u3060\u3055\u3044\u3002" });
    }
    try {
      await db.delete(communityMembers).where(eq2(communityMembers.userId, user.id));
      await db.delete(communityModerators).where(eq2(communityModerators.userId, user.id));
      await db.delete(communityPollVotes).where(eq2(communityPollVotes.userId, user.id));
      await db.delete(communityVotes).where(eq2(communityVotes.userId, user.id));
      await db.update(videos).set({ userId: null }).where(eq2(videos.userId, user.id));
      await db.delete(videoComments).where(eq2(videoComments.userId, user.id));
      await db.delete(users).where(eq2(users.id, user.id));
      res.json({ ok: true });
    } catch (e) {
      console.error("Account deletion error:", e);
      res.status(500).json({ error: "\u30A2\u30AB\u30A6\u30F3\u30C8\u306E\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
    }
  });
  app2.get("/api/profile/by-name/:name", async (req, res) => {
    const name = decodeURIComponent(req.params.name || "");
    if (!name.trim()) return res.status(400).json({ error: "\u540D\u524D\u3092\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044" });
    const [u] = await db.select({ id: users.id }).from(users).where(eq2(users.displayName, name));
    if (u) return res.json({ type: "user", id: u.id });
    const [c] = await db.select({ id: creators.id }).from(creators).where(eq2(creators.name, name));
    if (c) return res.json({ type: "liver", id: c.id });
    return res.status(404).json({ error: "Not found" });
  });
  app2.get("/api/users/:id", async (req, res) => {
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
      pinnedCommunityIds: users.pinnedCommunityIds
    }).from(users).where(eq2(users.id, id));
    if (!u) return res.status(404).json({ error: "Not found" });
    let pinnedCommunities = [];
    const pinnedRaw = u.pinnedCommunityIds;
    if (pinnedRaw && typeof pinnedRaw === "string") {
      try {
        const ids = JSON.parse(pinnedRaw);
        if (Array.isArray(ids) && ids.length > 0) {
          const rows = await db.select({ id: communities.id, name: communities.name, thumbnail: communities.thumbnail, category: communities.category }).from(communities).where(inArray(communities.id, ids.slice(0, 4)));
          pinnedCommunities = rows.map((r) => ({
            id: r.id,
            name: r.name,
            thumbnail: r.thumbnail,
            category: r.category
          }));
        }
      } catch {
      }
    }
    let enneagramScores = null;
    const scoresRaw = u.enneagramScores;
    if (scoresRaw && typeof scoresRaw === "string") {
      try {
        const parsed = JSON.parse(scoresRaw);
        if (Array.isArray(parsed) && parsed.length === 9) enneagramScores = parsed;
      } catch {
      }
    }
    res.json({
      id: u.id,
      name: u.displayName,
      displayName: u.displayName,
      avatar: u.profileImageUrl,
      profileImageUrl: u.profileImageUrl,
      bio: u.bio ?? "",
      instagramUrl: u.instagramUrl ?? null,
      youtubeUrl: u.youtubeUrl ?? null,
      xUrl: u.xUrl ?? null,
      spotifyUrl: u.spotifyUrl ?? null,
      appleMusicUrl: u.appleMusicUrl ?? null,
      bandcampUrl: u.bandcampUrl ?? null,
      enneagramScores,
      pinnedCommunities
    });
  });
  const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID ?? "";
  const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET ?? "";
  const LINE_CALLBACK_URL = process.env.LINE_CALLBACK_URL ?? "https://6542d57d-f8ce-404c-adb7-16f6dc84b252-00-1ncerp2gwoflp.spock.replit.dev/api/auth/line-callback";
  const FRONTEND_URL = (process.env.FRONTEND_URL ?? "").replace(/\/$/, "");
  const lineRedirect = (path2) => FRONTEND_URL ? `${FRONTEND_URL}${path2}` : path2;
  const LINE_STATE = "livestage-line-state";
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
  const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL ?? "https://6542d57d-f8ce-404c-adb7-16f6dc84b252-00-1ncerp2gwoflp.spock.replit.dev/api/auth/google-callback";
  const GOOGLE_STATE = "livestage-google-state";
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY ?? "";
  app2.get("/api/auth/status", (_req, res) => {
    res.json({
      line: {
        configured: !!(LINE_CHANNEL_ID && LINE_CHANNEL_SECRET && LINE_CALLBACK_URL),
        callbackUrl: LINE_CALLBACK_URL || null
      },
      google: {
        configured: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_CALLBACK_URL)
      }
    });
  });
  app2.get("/api/auth/line", (_req, res) => {
    if (!LINE_CHANNEL_ID || !LINE_CHANNEL_SECRET || !LINE_CALLBACK_URL) {
      return res.status(500).json({ error: "LINE OAuth is not configured (LINE_CHANNEL_ID, LINE_CHANNEL_SECRET, LINE_CALLBACK_URL)" });
    }
    const params = new URLSearchParams({
      response_type: "code",
      client_id: LINE_CHANNEL_ID,
      redirect_uri: LINE_CALLBACK_URL,
      state: LINE_STATE,
      scope: "profile"
    });
    res.redirect(`https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`);
  });
  app2.get("/api/auth/google", (_req, res) => {
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
      prompt: "consent"
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  });
  app2.get("/api/auth/google-callback", async (req, res) => {
    const code = req.query.code;
    const state = req.query.state;
    if (!code || state !== GOOGLE_STATE) {
      return res.redirect(lineRedirect("/?line_error=invalid_state"));
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
          client_secret: GOOGLE_CLIENT_SECRET
        }).toString()
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        return res.redirect(lineRedirect("/?line_error=token_failed"));
      }
      const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const profile = await profileRes.json();
      if (!profile.sub) {
        return res.redirect(lineRedirect("/?line_error=profile_failed"));
      }
      const googleKey = `google:${profile.sub}`;
      const displayName = profile.name ?? profile.email ?? "Google\u30E6\u30FC\u30B6\u30FC";
      const avatar = profile.picture ?? null;
      const expiresAt = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1e3) : null;
      const tokenUpdate = {
        googleAccessToken: tokenData.access_token,
        ...tokenData.refresh_token ? { googleRefreshToken: tokenData.refresh_token } : {},
        ...expiresAt ? { googleTokenExpiresAt: expiresAt } : {}
      };
      let [existing] = await db.select().from(users).where(eq2(users.lineId, googleKey));
      if (!existing) {
        [existing] = await db.insert(users).values({
          lineId: googleKey,
          displayName,
          profileImageUrl: avatar,
          role: "USER",
          ...tokenUpdate
        }).returning();
      } else {
        [existing] = await db.update(users).set({
          displayName,
          profileImageUrl: avatar,
          updatedAt: /* @__PURE__ */ new Date(),
          ...tokenUpdate
        }).where(eq2(users.id, existing.id)).returning();
      }
      const jwtToken = makeToken(existing.id);
      res.redirect(lineRedirect(`/?line_token=${encodeURIComponent(jwtToken)}`));
    } catch (err) {
      console.error("Google callback error:", err);
      res.redirect(lineRedirect("/?line_error=server_error"));
    }
  });
  app2.get("/api/youtube/search", async (req, res) => {
    const q = queryStr(req, "q").trim();
    if (!q) {
      return res.status(400).json({ error: "\u691C\u7D22\u30AD\u30FC\u30EF\u30FC\u30C9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044" });
    }
    if (!YOUTUBE_API_KEY) {
      return res.status(500).json({ error: "YouTube API \u30AD\u30FC\u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093" });
    }
    try {
      const params = new URLSearchParams({
        key: YOUTUBE_API_KEY,
        part: "snippet",
        type: "video",
        q,
        maxResults: "8"
      });
      const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
      if (!ytRes.ok) {
        const text2 = await ytRes.text();
        console.error("YouTube search error:", ytRes.status, text2);
        return res.status(502).json({ error: "YouTube \u691C\u7D22\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
      }
      const json = await ytRes.json();
      const items = json.items ?? [];
      const results = items.map((item) => {
        const videoId = item.id?.videoId;
        const title = item.snippet?.title ?? "";
        const thumbs = item.snippet?.thumbnails;
        const thumbUrl = thumbs?.high?.url ?? thumbs?.medium?.url ?? thumbs?.default?.url ?? "";
        if (!videoId || !thumbUrl) return null;
        return { videoId, title, thumbnail: thumbUrl };
      }).filter(Boolean);
      res.json(results);
    } catch (e) {
      console.error("YouTube search exception:", e);
      res.status(500).json({ error: "YouTube \u691C\u7D22\u3067\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F" });
    }
  });
  async function getGoogleAccessToken(userId) {
    const [u] = await db.select().from(users).where(eq2(users.id, userId));
    if (!u || !u.googleRefreshToken) return null;
    const row = u;
    const expiresAt = row.googleTokenExpiresAt ? new Date(row.googleTokenExpiresAt).getTime() : 0;
    const now = Date.now();
    if (row.googleAccessToken && expiresAt > now + 6e4) {
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
          client_secret: GOOGLE_CLIENT_SECRET
        }).toString()
      });
      const data = await tokenRes.json();
      if (!data.access_token) return null;
      const newExpiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1e3) : null;
      await db.update(users).set({
        googleAccessToken: data.access_token,
        ...newExpiresAt ? { googleTokenExpiresAt: newExpiresAt } : {},
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq2(users.id, userId));
      return data.access_token;
    } catch {
      return null;
    }
  }
  app2.get("/api/youtube/playlists", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044" });
    const accessToken = await getGoogleAccessToken(user.id);
    if (!accessToken) {
      return res.status(403).json({
        error: "YouTube \u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u3092\u5229\u7528\u3059\u308B\u306B\u306F Google \u3067\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044",
        needsGoogleLogin: true
      });
    }
    try {
      const params = new URLSearchParams({
        part: "snippet",
        mine: "true",
        maxResults: "25"
      });
      const ytRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlists?${params.toString()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!ytRes.ok) {
        const text2 = await ytRes.text();
        console.error("YouTube playlists error:", ytRes.status, text2);
        return res.status(502).json({ error: "\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
      }
      const json = await ytRes.json();
      const items = (json.items ?? []).map((item) => {
        const thumbs = item.snippet?.thumbnails;
        const thumbUrl = thumbs?.medium?.url ?? thumbs?.default?.url ?? "";
        return {
          id: item.id,
          title: item.snippet?.title ?? "",
          thumbnail: thumbUrl
        };
      });
      res.json(items);
    } catch (e) {
      console.error("YouTube playlists exception:", e);
      res.status(500).json({ error: "\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306E\u53D6\u5F97\u3067\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F" });
    }
  });
  app2.get("/api/youtube/playlists/:playlistId/items", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044" });
    const accessToken = await getGoogleAccessToken(user.id);
    if (!accessToken) {
      return res.status(403).json({
        error: "YouTube \u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u3092\u5229\u7528\u3059\u308B\u306B\u306F Google \u3067\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044",
        needsGoogleLogin: true
      });
    }
    const playlistId = paramStr(req, "playlistId");
    if (!playlistId) return res.status(400).json({ error: "\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8ID\u304C\u5FC5\u8981\u3067\u3059" });
    try {
      const params = new URLSearchParams({
        part: "snippet,contentDetails",
        playlistId,
        maxResults: "50"
      });
      const ytRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!ytRes.ok) {
        const text2 = await ytRes.text();
        console.error("YouTube playlistItems error:", ytRes.status, text2);
        return res.status(502).json({ error: "\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
      }
      const json = await ytRes.json();
      const items = (json.items ?? []).map((item) => {
        const videoId = item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId;
        const thumbs = item.snippet?.thumbnails;
        const thumbUrl = thumbs?.high?.url ?? thumbs?.medium?.url ?? thumbs?.default?.url ?? "";
        if (!videoId) return null;
        return {
          videoId,
          title: item.snippet?.title ?? "",
          thumbnail: thumbUrl
        };
      }).filter(Boolean);
      res.json(items);
    } catch (e) {
      console.error("YouTube playlistItems exception:", e);
      res.status(500).json({ error: "\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306E\u53D6\u5F97\u3067\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F" });
    }
  });
  app2.get("/api/auth/callback/line", async (req, res) => {
    const code = req.query.code;
    const state = req.query.state;
    console.log("[LINE callback/line] received", { hasCode: !!code, stateMatch: state === LINE_STATE });
    if (!code || state !== LINE_STATE) {
      return res.redirect(lineRedirect("/?line_error=invalid_state"));
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
          client_secret: LINE_CHANNEL_SECRET
        }).toString()
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        console.error("[LINE callback] token failed", tokenData);
        const err = tokenData.error_description ?? tokenData.error ?? "token_failed";
        return res.redirect(lineRedirect(`/?line_error=${encodeURIComponent(err)}`));
      }
      const profileRes = await fetch("https://api.line.me/v2/profile", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const profile = await profileRes.json();
      if (!profile.userId) {
        console.error("[LINE callback] profile failed", profile);
        return res.redirect(lineRedirect("/?line_error=profile_failed"));
      }
      const lineId = profile.userId;
      console.log("[LINE callback] profile ok", { lineId, displayName: profile.displayName });
      const lineName = profile.displayName ?? "LINE\u30E6\u30FC\u30B6\u30FC";
      const lineAvatar = profile.pictureUrl ?? null;
      let [existing] = await db.select().from(users).where(eq2(users.lineId, lineId));
      if (!existing) {
        [existing] = await db.insert(users).values({
          lineId,
          displayName: lineName,
          profileImageUrl: lineAvatar,
          role: "USER"
        }).returning();
      } else {
        [existing] = await db.update(users).set({ displayName: lineName, profileImageUrl: lineAvatar, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(users.id, existing.id)).returning();
      }
      const jwtToken = makeToken(existing.id);
      res.redirect(lineRedirect(`/?line_token=${encodeURIComponent(jwtToken)}`));
    } catch (err) {
      console.error("LINE callback error:", err);
      res.redirect(lineRedirect("/?line_error=server_error"));
    }
  });
  app2.get("/api/auth/line-callback", async (req, res) => {
    const code = req.query.code;
    const state = req.query.state;
    console.log("[LINE callback] received", { hasCode: !!code, stateMatch: state === LINE_STATE });
    if (!code || state !== LINE_STATE) {
      return res.redirect(lineRedirect("/?line_error=invalid_state"));
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
          client_secret: LINE_CHANNEL_SECRET
        }).toString()
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        console.error("[LINE callback] token failed", tokenData);
        const err = tokenData.error_description ?? tokenData.error ?? "token_failed";
        return res.redirect(lineRedirect(`/?line_error=${encodeURIComponent(err)}`));
      }
      const profileRes = await fetch("https://api.line.me/v2/profile", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const profile = await profileRes.json();
      if (!profile.userId) {
        console.error("[LINE callback] profile failed", profile);
        return res.redirect(lineRedirect("/?line_error=profile_failed"));
      }
      const lineId = profile.userId;
      console.log("[LINE callback] profile ok", { lineId, displayName: profile.displayName });
      const lineName = profile.displayName ?? "LINE\u30E6\u30FC\u30B6\u30FC";
      const lineAvatar = profile.pictureUrl ?? null;
      let [existing] = await db.select().from(users).where(eq2(users.lineId, lineId));
      if (!existing) {
        [existing] = await db.insert(users).values({
          lineId,
          displayName: lineName,
          profileImageUrl: lineAvatar,
          role: "USER"
        }).returning();
      } else {
        [existing] = await db.update(users).set({ displayName: lineName, profileImageUrl: lineAvatar, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(users.id, existing.id)).returning();
      }
      const jwtToken = makeToken(existing.id);
      console.log("[LINE callback] success", { userId: existing.id });
      res.redirect(lineRedirect(`/?line_token=${encodeURIComponent(jwtToken)}`));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[LINE callback] server_error", err);
      res.redirect(lineRedirect(`/?line_error=${encodeURIComponent("server_error:" + msg.slice(0, 80))}`));
    }
  });
  const GENRE_TO_CATEGORY = {
    anime: ["\u30A2\u30CB\u30E1", "\u97F3\u697D"],
    band: ["\u30D0\u30F3\u30C9", "\u97F3\u697D"],
    subcul: ["\u30B5\u30D6\u30AB\u30EB", "\u30E9\u30A4\u30D5\u30B9\u30BF\u30A4\u30EB", "\u30A2\u30FC\u30C8"],
    english: ["\u82F1\u4F1A\u8A71"],
    fortune: ["\u5360\u3044"]
  };
  app2.get("/api/communities", async (req, res) => {
    const genreId = queryStr(req, "genre");
    let rows = await db.select().from(communities).orderBy(desc(communities.members));
    if (genreId && GENRE_TO_CATEGORY[genreId]) {
      const terms = GENRE_TO_CATEGORY[genreId];
      rows = rows.filter(
        (r) => terms.some((t) => (r.category ?? "").includes(t))
      );
    }
    res.json(rows);
  });
  app2.get("/api/communities/me", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u672A\u8A8D\u8A3C\u3067\u3059" });
    const memberships = await db.select({ communityId: communityMembers.communityId }).from(communityMembers).where(eq2(communityMembers.userId, user.id));
    if (memberships.length === 0) {
      return res.json([]);
    }
    const ids = memberships.map((m) => m.communityId);
    const rows = await db.select().from(communities).where(inArray(communities.id, ids)).orderBy(desc(communities.members));
    res.json(rows);
  });
  app2.get("/api/communities/:id", async (req, res) => {
    const id = paramNum(req, "id");
    const [row] = await db.select().from(communities).where(eq2(communities.id, id));
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });
  app2.get("/api/communities/:id/editors", async (req, res) => {
    const communityId = paramNum(req, "id");
    const rows = await db.select().from(videoEditors).where(eq2(videoEditors.communityId, communityId)).orderBy(desc(videoEditors.isAvailable), desc(videoEditors.rating));
    res.json(rows);
  });
  app2.get("/api/communities/:id/creators", async (req, res) => {
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq2(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const editors = await db.select().from(videoEditors).where(eq2(videoEditors.communityId, communityId)).orderBy(desc(videoEditors.rating));
    const livers = await db.select().from(creators).where(eq2(creators.community, community.name)).orderBy(asc(creators.rank));
    res.json({
      editors: editors.map((e) => ({ ...e, kind: "editor" })),
      livers: livers.map((l) => ({ ...l, kind: "liver" }))
    });
  });
  app2.get("/api/communities/:id/staff", async (req, res) => {
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq2(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const admin = community.adminId ? (await db.select().from(users).where(eq2(users.id, community.adminId)))[0] ?? null : null;
    const modRows = await db.select({ userId: communityModerators.userId }).from(communityModerators).where(eq2(communityModerators.communityId, communityId));
    const moderatorUsers = modRows.length > 0 ? await db.select().from(users).where(inArray(users.id, modRows.map((r) => r.userId))) : [];
    res.json({
      adminId: community.adminId,
      ownerId: community.ownerId,
      admin: admin ? { id: admin.id, displayName: admin.displayName, profileImageUrl: admin.profileImageUrl } : null,
      moderatorIds: modRows.map((r) => r.userId),
      moderators: moderatorUsers.map((u) => ({ id: u.id, displayName: u.displayName, profileImageUrl: u.profileImageUrl }))
    });
  });
  app2.patch("/api/communities/:id/staff", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u672A\u8A8D\u8A3C\u3067\u3059" });
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq2(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    if (!isAdmin) return res.status(403).json({ error: "\u7BA1\u7406\u4EBA\u306E\u307F\u8A2D\u5B9A\u3067\u304D\u307E\u3059" });
    const { adminId, moderatorIds } = req.body;
    if (adminId !== void 0) {
      await db.update(communities).set({ adminId: adminId ?? null }).where(eq2(communities.id, communityId));
    }
    if (moderatorIds !== void 0 && Array.isArray(moderatorIds)) {
      await db.delete(communityModerators).where(eq2(communityModerators.communityId, communityId));
      for (const uid of moderatorIds) {
        if (Number.isInteger(uid)) {
          await db.insert(communityModerators).values({ communityId, userId: uid });
        }
      }
    }
    const [updated] = await db.select().from(communities).where(eq2(communities.id, communityId));
    res.json(updated);
  });
  app2.get("/api/communities/:id/members", async (req, res) => {
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq2(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const rows = await db.select({ userId: communityMembers.userId }).from(communityMembers).where(eq2(communityMembers.communityId, communityId));
    const memberUsers = rows.length > 0 ? await db.select({
      id: users.id,
      displayName: users.displayName,
      profileImageUrl: users.profileImageUrl
    }).from(users).where(inArray(users.id, rows.map((r) => r.userId))) : [];
    res.json(memberUsers);
  });
  app2.get("/api/communities/:id/members/me", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.json({ isMember: false });
    const communityId = paramNum(req, "id");
    const rows = await db.select().from(communityMembers).where(
      and2(
        eq2(communityMembers.communityId, communityId),
        eq2(communityMembers.userId, user.id)
      )
    );
    res.json({ isMember: rows.length > 0 });
  });
  app2.post("/api/communities/:id/join", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u672A\u8A8D\u8A3C\u3067\u3059" });
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq2(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const existing = await db.select().from(communityMembers).where(
      and2(
        eq2(communityMembers.communityId, communityId),
        eq2(communityMembers.userId, user.id)
      )
    );
    if (existing.length > 0) {
      return res.json({ ok: true, alreadyMember: true });
    }
    await db.insert(communityMembers).values({
      communityId,
      userId: user.id
    });
    const [c] = await db.select({ m: communities.members }).from(communities).where(eq2(communities.id, communityId));
    if (c) {
      await db.update(communities).set({ members: c.m + 1 }).where(eq2(communities.id, communityId));
    }
    res.status(201).json({ ok: true });
  });
  app2.get("/api/communities/:id/threads", async (req, res) => {
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq2(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const rows = await db.select({
      id: communityThreads.id,
      communityId: communityThreads.communityId,
      authorUserId: communityThreads.authorUserId,
      title: communityThreads.title,
      body: communityThreads.body,
      createdAt: communityThreads.createdAt,
      pinned: communityThreads.pinned
    }).from(communityThreads).where(eq2(communityThreads.communityId, communityId)).orderBy(desc(communityThreads.pinned), desc(communityThreads.createdAt));
    const postCounts = await Promise.all(
      rows.map(async (t) => {
        const [c] = await db.select({ n: count() }).from(communityThreadPosts).where(eq2(communityThreadPosts.threadId, t.id));
        return c?.n ?? 0;
      })
    );
    const authorIds = [...new Set(rows.map((r) => r.authorUserId))];
    const authorRows = authorIds.length > 0 ? await db.select({ id: users.id, displayName: users.displayName, profileImageUrl: users.profileImageUrl }).from(users).where(inArray(users.id, authorIds)) : [];
    const authorMap = new Map(authorRows.map((a) => [a.id, a]));
    res.json(
      rows.map((r, i) => ({
        ...r,
        postCount: postCounts[i],
        author: authorMap.get(r.authorUserId) ?? { displayName: "\u4E0D\u660E", profileImageUrl: null }
      }))
    );
  });
  app2.post("/api/communities/:id/threads", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044" });
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq2(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const memberRows = await db.select().from(communityMembers).where(and2(eq2(communityMembers.communityId, communityId), eq2(communityMembers.userId, user.id)));
    if (memberRows.length === 0) return res.status(403).json({ error: "\u30B3\u30DF\u30E5\u30CB\u30C6\u30A3\u306B\u53C2\u52A0\u3057\u3066\u304F\u3060\u3055\u3044" });
    const { title, body } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: "\u30BF\u30A4\u30C8\u30EB\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044" });
    const [row] = await db.insert(communityThreads).values({
      communityId,
      authorUserId: user.id,
      title: title.trim(),
      body: (body ?? "").trim()
    }).returning();
    res.status(201).json(row);
  });
  app2.get("/api/communities/:id/threads/:threadId", async (req, res) => {
    const communityId = paramNum(req, "id");
    const threadId = paramNum(req, "threadId");
    const [thread] = await db.select().from(communityThreads).where(and2(eq2(communityThreads.communityId, communityId), eq2(communityThreads.id, threadId)));
    if (!thread) return res.status(404).json({ message: "Not found" });
    const posts = await db.select().from(communityThreadPosts).where(eq2(communityThreadPosts.threadId, threadId)).orderBy(asc(communityThreadPosts.createdAt));
    const authorIds = [thread.authorUserId, ...posts.map((p) => p.authorUserId)];
    const authorRows = await db.select({ id: users.id, displayName: users.displayName, profileImageUrl: users.profileImageUrl }).from(users).where(inArray(users.id, authorIds));
    const authorMap = new Map(authorRows.map((a) => [a.id, a]));
    res.json({
      ...thread,
      author: authorMap.get(thread.authorUserId) ?? { displayName: "\u4E0D\u660E", profileImageUrl: null },
      posts: posts.map((p) => ({
        ...p,
        author: authorMap.get(p.authorUserId) ?? { displayName: "\u4E0D\u660E", profileImageUrl: null }
      }))
    });
  });
  app2.delete("/api/communities/:id/threads/:threadId", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044" });
    const communityId = paramNum(req, "id");
    const threadId = paramNum(req, "threadId");
    const [community] = await db.select().from(communities).where(eq2(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and2(eq2(communityModerators.communityId, communityId), eq2(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "\u7BA1\u7406\u4EBA\u307E\u305F\u306F\u30E2\u30C7\u30EC\u30FC\u30BF\u30FC\u306E\u307F\u524A\u9664\u3067\u304D\u307E\u3059" });
    const [thread] = await db.select().from(communityThreads).where(and2(eq2(communityThreads.communityId, communityId), eq2(communityThreads.id, threadId)));
    if (!thread) return res.status(404).json({ message: "Not found" });
    await db.delete(communityThreadPosts).where(eq2(communityThreadPosts.threadId, threadId));
    await db.delete(communityThreads).where(eq2(communityThreads.id, threadId));
    res.json({ ok: true });
  });
  app2.delete("/api/communities/:id/threads/:threadId/posts/:postId", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044" });
    const communityId = paramNum(req, "id");
    const threadId = paramNum(req, "threadId");
    const postId = paramNum(req, "postId");
    const [community] = await db.select().from(communities).where(eq2(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and2(eq2(communityModerators.communityId, communityId), eq2(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "\u7BA1\u7406\u4EBA\u307E\u305F\u306F\u30E2\u30C7\u30EC\u30FC\u30BF\u30FC\u306E\u307F\u524A\u9664\u3067\u304D\u307E\u3059" });
    const [thread] = await db.select().from(communityThreads).where(and2(eq2(communityThreads.communityId, communityId), eq2(communityThreads.id, threadId)));
    if (!thread) return res.status(404).json({ message: "Not found" });
    await db.delete(communityThreadPosts).where(and2(eq2(communityThreadPosts.threadId, threadId), eq2(communityThreadPosts.id, postId)));
    res.json({ ok: true });
  });
  app2.post("/api/communities/:id/threads/:threadId/posts", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044" });
    const communityId = paramNum(req, "id");
    const threadId = paramNum(req, "threadId");
    const [thread] = await db.select().from(communityThreads).where(and2(eq2(communityThreads.communityId, communityId), eq2(communityThreads.id, threadId)));
    if (!thread) return res.status(404).json({ message: "Not found" });
    const memberRows = await db.select().from(communityMembers).where(and2(eq2(communityMembers.communityId, communityId), eq2(communityMembers.userId, user.id)));
    if (memberRows.length === 0) return res.status(403).json({ error: "\u30B3\u30DF\u30E5\u30CB\u30C6\u30A3\u306B\u53C2\u52A0\u3057\u3066\u304F\u3060\u3055\u3044" });
    const { body } = req.body;
    if (!body || !body.trim()) return res.status(400).json({ error: "\u672C\u6587\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044" });
    const [row] = await db.insert(communityThreadPosts).values({
      threadId,
      authorUserId: user.id,
      body: body.trim()
    }).returning();
    res.status(201).json(row);
  });
  app2.get("/api/communities/:id/admin/jukebox-queue", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044" });
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq2(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and2(eq2(communityModerators.communityId, communityId), eq2(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "\u7BA1\u7406\u4EBA\u307E\u305F\u306F\u30E2\u30C7\u30EC\u30FC\u30BF\u30FC\u306E\u307F\u30A2\u30AF\u30BB\u30B9\u53EF\u80FD\u3067\u3059" });
    const rows = await db.select().from(jukeboxQueue).where(eq2(jukeboxQueue.communityId, communityId)).orderBy(asc(jukeboxQueue.position));
    res.json(rows);
  });
  app2.delete("/api/communities/:id/admin/jukebox-queue/:itemId", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044" });
    const communityId = paramNum(req, "id");
    const itemId = paramNum(req, "itemId");
    const [community] = await db.select().from(communities).where(eq2(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and2(eq2(communityModerators.communityId, communityId), eq2(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "\u7BA1\u7406\u4EBA\u307E\u305F\u306F\u30E2\u30C7\u30EC\u30FC\u30BF\u30FC\u306E\u307F\u64CD\u4F5C\u53EF\u80FD\u3067\u3059" });
    const [item] = await db.select().from(jukeboxQueue).where(and2(eq2(jukeboxQueue.communityId, communityId), eq2(jukeboxQueue.id, itemId)));
    if (!item) return res.status(404).json({ message: "Not found" });
    await db.delete(jukeboxQueue).where(eq2(jukeboxQueue.id, itemId));
    res.json({ ok: true });
  });
  app2.get("/api/communities/:id/admin/ads", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044" });
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq2(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and2(eq2(communityModerators.communityId, communityId), eq2(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "\u7BA1\u7406\u4EBA\u307E\u305F\u306F\u30E2\u30C7\u30EC\u30FC\u30BF\u30FC\u306E\u307F\u30A2\u30AF\u30BB\u30B9\u53EF\u80FD\u3067\u3059" });
    const rows = await db.select().from(communityAds).where(and2(eq2(communityAds.communityId, communityId), eq2(communityAds.status, "approved"))).orderBy(asc(communityAds.startDate));
    res.json(rows);
  });
  app2.get("/api/communities/:id/admin/reports", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044" });
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq2(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and2(eq2(communityModerators.communityId, communityId), eq2(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "\u7BA1\u7406\u4EBA\u307E\u305F\u306F\u30E2\u30C7\u30EC\u30FC\u30BF\u30FC\u306E\u307F\u30A2\u30AF\u30BB\u30B9\u53EF\u80FD\u3067\u3059" });
    const videoIdsInCommunity = await db.select({ id: videos.id }).from(videos).where(eq2(videos.communityId, communityId));
    const vidSet = new Set(videoIdsInCommunity.map((v) => v.id));
    const byName = await db.select({ id: videos.id }).from(videos).where(eq2(videos.community, community.name));
    byName.forEach((v) => vidSet.add(v.id));
    const allReports = await db.select().from(reports).orderBy(desc(reports.createdAt));
    const filtered = [];
    for (const r of allReports) {
      if (r.contentType === "video") {
        if (vidSet.has(r.contentId)) filtered.push(r);
      } else if (r.contentType === "comment") {
        const [cm] = await db.select({ videoId: videoComments.videoId }).from(videoComments).where(eq2(videoComments.id, r.contentId));
        if (cm) {
          const [v] = await db.select({ id: videos.id, communityId: videos.communityId, community: videos.community }).from(videos).where(eq2(videos.id, cm.videoId));
          if (v && (v.communityId === communityId || v.community === community.name)) filtered.push(r);
        }
      }
    }
    res.json(filtered);
  });
  app2.patch("/api/communities/:id/admin/reports/:reportId/hide", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044" });
    const communityId = paramNum(req, "id");
    const reportId = paramNum(req, "reportId");
    const [community] = await db.select().from(communities).where(eq2(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and2(eq2(communityModerators.communityId, communityId), eq2(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "\u7BA1\u7406\u4EBA\u307E\u305F\u306F\u30E2\u30C7\u30EC\u30FC\u30BF\u30FC\u306E\u307F\u64CD\u4F5C\u53EF\u80FD\u3067\u3059" });
    const [report] = await db.select().from(reports).where(eq2(reports.id, reportId));
    if (!report) return res.status(404).json({ error: "\u901A\u5831\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    const vidSet = new Set((await db.select({ id: videos.id }).from(videos).where(eq2(videos.communityId, communityId))).map((v) => v.id));
    const byName = await db.select({ id: videos.id }).from(videos).where(eq2(videos.community, community.name));
    byName.forEach((v) => vidSet.add(v.id));
    let allowed = false;
    if (report.contentType === "video") allowed = vidSet.has(report.contentId);
    else if (report.contentType === "comment") {
      const [cm] = await db.select({ videoId: videoComments.videoId }).from(videoComments).where(eq2(videoComments.id, report.contentId));
      if (cm) {
        const [v] = await db.select({ communityId: videos.communityId, community: videos.community }).from(videos).where(eq2(videos.id, cm.videoId));
        allowed = !!v && (v.communityId === communityId || v.community === community.name);
      }
    }
    if (!allowed) return res.status(403).json({ error: "\u3053\u306E\u901A\u5831\u306F\u3053\u306E\u30B3\u30DF\u30E5\u30CB\u30C6\u30A3\u306B\u5C5E\u3057\u3066\u3044\u307E\u305B\u3093" });
    if (report.contentType === "video") {
      await db.update(videos).set({ hidden: true }).where(eq2(videos.id, report.contentId));
    } else if (report.contentType === "comment") {
      await db.update(videoComments).set({ hidden: true }).where(eq2(videoComments.id, report.contentId));
    }
    await db.update(reports).set({ status: "hidden" }).where(eq2(reports.id, reportId));
    res.json({ ok: true });
  });
  app2.patch("/api/communities/:id/admin/reports/:reportId/dismiss", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044" });
    const communityId = paramNum(req, "id");
    const reportId = paramNum(req, "reportId");
    const [community] = await db.select().from(communities).where(eq2(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and2(eq2(communityModerators.communityId, communityId), eq2(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "\u7BA1\u7406\u4EBA\u307E\u305F\u306F\u30E2\u30C7\u30EC\u30FC\u30BF\u30FC\u306E\u307F\u64CD\u4F5C\u53EF\u80FD\u3067\u3059" });
    const [report] = await db.select().from(reports).where(eq2(reports.id, reportId));
    if (!report) return res.status(404).json({ error: "\u901A\u5831\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    const vidSet = new Set((await db.select({ id: videos.id }).from(videos).where(eq2(videos.communityId, communityId))).map((v) => v.id));
    const byName = await db.select({ id: videos.id }).from(videos).where(eq2(videos.community, community.name));
    byName.forEach((v) => vidSet.add(v.id));
    let allowed = false;
    if (report.contentType === "video") allowed = vidSet.has(report.contentId);
    else if (report.contentType === "comment") {
      const [cm] = await db.select({ videoId: videoComments.videoId }).from(videoComments).where(eq2(videoComments.id, report.contentId));
      if (cm) {
        const [v] = await db.select({ communityId: videos.communityId, community: videos.community }).from(videos).where(eq2(videos.id, cm.videoId));
        allowed = !!v && (v.communityId === communityId || v.community === community.name);
      }
    }
    if (!allowed) return res.status(403).json({ error: "\u3053\u306E\u901A\u5831\u306F\u3053\u306E\u30B3\u30DF\u30E5\u30CB\u30C6\u30A3\u306B\u5C5E\u3057\u3066\u3044\u307E\u305B\u3093" });
    await db.update(reports).set({ status: "reviewed" }).where(eq2(reports.id, reportId));
    res.json({ ok: true });
  });
  app2.get("/api/communities/:id/polls", async (req, res) => {
    const user = await getAuthUser(req);
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq2(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const polls = await db.select().from(communityPolls).where(eq2(communityPolls.communityId, communityId)).orderBy(desc(communityPolls.createdAt));
    const result = await Promise.all(
      polls.map(async (p) => {
        const opts = await db.select().from(communityPollOptions).where(eq2(communityPollOptions.pollId, p.id)).orderBy(asc(communityPollOptions.order));
        const votes = await db.select().from(communityPollVotes).where(eq2(communityPollVotes.pollId, p.id));
        const voteCounts = opts.map((o) => ({ optionId: o.id, text: o.text, count: votes.filter((v) => v.optionId === o.id).length }));
        let myVoteOptionId = null;
        if (user) {
          const myVote = votes.find((v) => v.userId === user.id);
          if (myVote) myVoteOptionId = myVote.optionId;
        }
        return { ...p, options: voteCounts, myVoteOptionId };
      })
    );
    res.json(result);
  });
  app2.post("/api/communities/:id/polls", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044" });
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq2(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const memberRows = await db.select().from(communityMembers).where(and2(eq2(communityMembers.communityId, communityId), eq2(communityMembers.userId, user.id)));
    if (memberRows.length === 0) return res.status(403).json({ error: "\u30B3\u30DF\u30E5\u30CB\u30C6\u30A3\u306B\u53C2\u52A0\u3057\u3066\u304F\u3060\u3055\u3044" });
    const { question, options } = req.body;
    if (!question || !question.trim()) return res.status(400).json({ error: "\u8CEA\u554F\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044" });
    if (!options || !Array.isArray(options) || options.length < 2) return res.status(400).json({ error: "\u9078\u629E\u80A2\u30922\u3064\u4EE5\u4E0A\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044" });
    const validOpts = options.filter((o) => o && String(o).trim()).slice(0, 10);
    if (validOpts.length < 2) return res.status(400).json({ error: "\u9078\u629E\u80A2\u30922\u3064\u4EE5\u4E0A\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044" });
    const [poll] = await db.insert(communityPolls).values({
      communityId,
      authorUserId: user.id,
      question: question.trim()
    }).returning();
    for (let i = 0; i < validOpts.length; i++) {
      await db.insert(communityPollOptions).values({
        pollId: poll.id,
        text: validOpts[i].trim(),
        order: i
      });
    }
    res.status(201).json(poll);
  });
  app2.post("/api/communities/:id/polls/:pollId/vote", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044" });
    const communityId = paramNum(req, "id");
    const pollId = paramNum(req, "pollId");
    const { optionId } = req.body;
    if (!optionId) return res.status(400).json({ error: "optionId \u3092\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044" });
    const [poll] = await db.select().from(communityPolls).where(and2(eq2(communityPolls.communityId, communityId), eq2(communityPolls.id, pollId)));
    if (!poll) return res.status(404).json({ message: "Not found" });
    const [opt] = await db.select().from(communityPollOptions).where(and2(eq2(communityPollOptions.pollId, pollId), eq2(communityPollOptions.id, optionId)));
    if (!opt) return res.status(404).json({ message: "\u9078\u629E\u80A2\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    const memberRows = await db.select().from(communityMembers).where(and2(eq2(communityMembers.communityId, communityId), eq2(communityMembers.userId, user.id)));
    if (memberRows.length === 0) return res.status(403).json({ error: "\u30B3\u30DF\u30E5\u30CB\u30C6\u30A3\u306B\u53C2\u52A0\u3057\u3066\u304F\u3060\u3055\u3044" });
    const existing = await db.select().from(communityPollVotes).where(and2(eq2(communityPollVotes.pollId, pollId), eq2(communityPollVotes.userId, user.id)));
    if (existing.length > 0) return res.status(400).json({ error: "\u3059\u3067\u306B\u6295\u7968\u6E08\u307F\u3067\u3059" });
    await db.insert(communityPollVotes).values({
      pollId,
      optionId,
      userId: user.id
    });
    res.json({ ok: true });
  });
  app2.get("/api/editors/:id", async (req, res) => {
    const id = paramNum(req, "id");
    const [editor] = await db.select().from(videoEditors).where(eq2(videoEditors.id, id));
    if (!editor) return res.status(404).json({ error: "Not found" });
    res.json(editor);
  });
  app2.post("/api/editors/:id/request", async (req, res) => {
    const editorId = paramNum(req, "id");
    const { requesterName, title, description, priceType, budget, deadline } = req.body;
    if (!title || !description || !priceType) {
      return res.status(400).json({ error: "\u5FC5\u9808\u9805\u76EE\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044" });
    }
    if (priceType !== "per_minute" && priceType !== "revenue_share") {
      return res.status(400).json({ error: "\u4E0D\u6B63\u306A\u6599\u91D1\u5F62\u5F0F\u3067\u3059" });
    }
    const [editor] = await db.select().from(videoEditors).where(eq2(videoEditors.id, editorId));
    if (!editor) {
      return res.status(404).json({ error: "Editor not found" });
    }
    const user = await getAuthUser(req);
    const requestUserId = user ? `user-${user.id}` : "guest";
    const requestUserName = requesterName ?? user?.displayName ?? "\u30B2\u30B9\u30C8\u30E6\u30FC\u30B6\u30FC";
    const [requestRow] = await db.insert(videoEditRequests).values({
      editorId,
      requesterId: requestUserId,
      requesterName: requestUserName,
      title,
      description,
      priceType,
      budget: budget ?? null,
      deadline: deadline ?? null
    }).returning();
    await db.insert(notifications).values({
      type: "editor_request",
      title: `${requestUserName} \u304B\u3089\u7DE8\u96C6\u4F9D\u983C`,
      body: `${title}\uFF08\u7DE8\u96C6\u8005ID: ${editorId}\uFF09`,
      amount: budget ?? null,
      avatar: editor.avatar ?? null,
      thumbnail: null,
      timeAgo: "\u305F\u3063\u305F\u4ECA"
    });
    res.status(201).json(requestRow);
  });
  app2.post("/api/communities", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044" });
    const { name, description, bannerUrl, iconUrl, categories } = req.body;
    const trimmedName = (name ?? "").trim();
    const trimmedDescription = (description ?? "").trim();
    const banner = (bannerUrl ?? "").trim() || "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=450&fit=crop";
    const icon = (iconUrl ?? "").trim() || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&h=160&fit=crop";
    const categoryList = Array.isArray(categories) ? categories.map((c) => String(c).trim()).filter(Boolean) : typeof categories === "string" ? categories.split(/[,\s]+/).map((c) => c.trim()).filter(Boolean) : [];
    if (!trimmedName || !trimmedDescription || categoryList.length === 0) {
      return res.status(400).json({ error: "\u540D\u524D\u30FB\u8AAC\u660E\u30FB\u30AB\u30C6\u30B4\u30EA\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044" });
    }
    if (trimmedDescription.length < 10) {
      return res.status(400).json({ error: "\u8AAC\u660E\u6587\u306F10\u6587\u5B57\u4EE5\u4E0A\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044" });
    }
    try {
      const primaryCategory = categoryList[0];
      const [row] = await db.insert(communities).values({
        name: trimmedName,
        members: 0,
        thumbnail: banner,
        online: false,
        category: primaryCategory,
        adminId: user.id,
        ownerId: user.id
      }).returning();
      res.status(201).json({
        ...row,
        description: trimmedDescription,
        bannerUrl: banner,
        iconUrl: icon,
        categories: categoryList
      });
    } catch (e) {
      console.error("Create community error:", e);
      res.status(500).json({ error: "\u30B3\u30DF\u30E5\u30CB\u30C6\u30A3\u306E\u4F5C\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
    }
  });
  app2.delete("/api/communities/:id", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044" });
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq2(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    if (community.ownerId !== user.id) {
      return res.status(403).json({ error: "\u30B3\u30DF\u30E5\u30CB\u30C6\u30A3\u306E\u524A\u9664\u306F\u4F5C\u6210\u8005\u306E\u307F\u53EF\u80FD\u3067\u3059" });
    }
    try {
      const threadRows = await db.select({ id: communityThreads.id }).from(communityThreads).where(eq2(communityThreads.communityId, communityId));
      const threadIds = threadRows.map((t) => t.id);
      if (threadIds.length > 0) {
        await db.delete(communityThreadPosts).where(inArray(communityThreadPosts.threadId, threadIds));
      }
      await db.delete(communityThreads).where(eq2(communityThreads.communityId, communityId));
      const pollRows = await db.select({ id: communityPolls.id }).from(communityPolls).where(eq2(communityPolls.communityId, communityId));
      const pollIds = pollRows.map((p) => p.id);
      if (pollIds.length > 0) {
        await db.delete(communityPollVotes).where(inArray(communityPollVotes.pollId, pollIds));
        await db.delete(communityPollOptions).where(inArray(communityPollOptions.pollId, pollIds));
      }
      await db.delete(communityPolls).where(eq2(communityPolls.communityId, communityId));
      await db.delete(communityVotes).where(eq2(communityVotes.communityId, communityId));
      await db.delete(communityAds).where(eq2(communityAds.communityId, communityId));
      await db.delete(communityModerators).where(eq2(communityModerators.communityId, communityId));
      await db.delete(communityMembers).where(eq2(communityMembers.communityId, communityId));
      await db.delete(jukeboxChat).where(eq2(jukeboxChat.communityId, communityId));
      await db.delete(jukeboxQueue).where(eq2(jukeboxQueue.communityId, communityId));
      await db.delete(jukeboxState).where(eq2(jukeboxState.communityId, communityId));
      await db.delete(videoEditors).where(eq2(videoEditors.communityId, communityId));
      await db.update(videos).set({ communityId: null }).where(eq2(videos.communityId, communityId));
      await db.delete(communities).where(eq2(communities.id, communityId));
      res.json({ ok: true });
    } catch (e) {
      console.error("Community deletion error:", e);
      res.status(500).json({ error: "\u30B3\u30DF\u30E5\u30CB\u30C6\u30A3\u306E\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
    }
  });
  const MIN_AD_AMOUNT = 1e4;
  const DAILY_RATE_PER_MEMBER = 10;
  const MAX_MONTHS_AHEAD = 3;
  app2.post("/api/community-ads", async (req, res) => {
    const { communityId: bodyCommunityId, companyName, contactName, email, bannerUrl, startDate, endDate } = req.body;
    const cid = Number(bodyCommunityId) || 0;
    const [community] = await db.select().from(communities).where(eq2(communities.id, cid));
    if (!community) return res.status(404).json({ error: "\u30B3\u30DF\u30E5\u30CB\u30C6\u30A3\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    const company = (companyName ?? "").trim();
    const contact = (contactName ?? "").trim();
    const em = (email ?? "").trim();
    const banner = (bannerUrl ?? "").trim();
    const start = (startDate ?? "").trim();
    const end = (endDate ?? "").trim();
    if (!company || !contact || !em || !banner || !start || !end) {
      return res.status(400).json({ error: "\u4F1A\u793E\u540D\u30FB\u62C5\u5F53\u8005\u540D\u30FB\u30E1\u30FC\u30EB\u30FB\u30D0\u30CA\u30FCURL\u30FB\u63B2\u8F09\u671F\u9593\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044" });
    }
    const dailyRate = community.members * DAILY_RATE_PER_MEMBER;
    const startD = new Date(start);
    const endD = new Date(end);
    if (isNaN(startD.getTime()) || isNaN(endD.getTime()) || endD < startD) {
      return res.status(400).json({ error: "\u63B2\u8F09\u671F\u9593\u306E\u65E5\u4ED8\u304C\u4E0D\u6B63\u3067\u3059" });
    }
    const days = Math.ceil((endD.getTime() - startD.getTime()) / (24 * 60 * 60 * 1e3)) + 1;
    const totalAmount = days * dailyRate;
    if (totalAmount < MIN_AD_AMOUNT) {
      return res.status(400).json({ error: `\u6700\u4F4E\u51FA\u7A3F\u91D1\u984D\u306F${MIN_AD_AMOUNT.toLocaleString()}\u5186\u4EE5\u4E0A\u3067\u3059\u3002\u65E5\u6570\u307E\u305F\u306F\u30E1\u30F3\u30D0\u30FC\u6570\u3092\u3054\u78BA\u8A8D\u304F\u3060\u3055\u3044\u3002` });
    }
    const maxEnd = /* @__PURE__ */ new Date();
    maxEnd.setMonth(maxEnd.getMonth() + MAX_MONTHS_AHEAD);
    if (endD > maxEnd) {
      return res.status(400).json({ error: `\u63B2\u8F09\u7D42\u4E86\u65E5\u306F${MAX_MONTHS_AHEAD}\u30F6\u6708\u4EE5\u5185\u3067\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044` });
    }
    const [row] = await db.insert(communityAds).values({
      communityId: cid,
      companyName: company,
      contactName: contact,
      email: em,
      bannerUrl: banner,
      startDate: start,
      endDate: end,
      dailyRate,
      totalAmount,
      status: "pending"
    }).returning();
    res.status(201).json(row);
  });
  app2.get("/api/community-ads/review", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044" });
    const ownedRows = await db.select({ id: communities.id }).from(communities).where(eq2(communities.adminId, user.id));
    const modRows = await db.select({ communityId: communityModerators.communityId }).from(communityModerators).where(eq2(communityModerators.userId, user.id));
    const communityIds = /* @__PURE__ */ new Set();
    ownedRows.forEach((r) => communityIds.add(r.id));
    modRows.forEach((r) => communityIds.add(r.communityId));
    if (communityIds.size === 0) {
      return res.json([]);
    }
    const ids = Array.from(communityIds);
    const ads = await db.select().from(communityAds).where(and2(inArray(communityAds.communityId, ids), inArray(communityAds.status, ["pending", "moderator_approved"]))).orderBy(desc(communityAds.createdAt));
    const commList = await db.select({ id: communities.id, name: communities.name, adminId: communities.adminId }).from(communities).where(inArray(communities.id, ids));
    const commMap = new Map(commList.map((c) => [c.id, c]));
    const result = ads.map((ad) => ({
      ...ad,
      communityName: commMap.get(ad.communityId)?.name ?? "",
      isOwner: commMap.get(ad.communityId)?.adminId === user.id
    }));
    res.json(result);
  });
  app2.patch("/api/community-ads/:id/moderator-approve", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044" });
    const id = paramNum(req, "id");
    const [ad] = await db.select().from(communityAds).where(eq2(communityAds.id, id));
    if (!ad) return res.status(404).json({ error: "\u7533\u3057\u8FBC\u307F\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    if (ad.status !== "pending") return res.status(400).json({ error: "\u3053\u306E\u7533\u3057\u8FBC\u307F\u306F\u65E2\u306B\u51E6\u7406\u6E08\u307F\u3067\u3059" });
    const [mod] = await db.select().from(communityModerators).where(and2(eq2(communityModerators.communityId, ad.communityId), eq2(communityModerators.userId, user.id)));
    if (!mod) return res.status(403).json({ error: "\u3053\u306E\u30B3\u30DF\u30E5\u30CB\u30C6\u30A3\u306E\u30E2\u30C7\u30EC\u30FC\u30BF\u30FC\u306E\u307F\u627F\u8A8D\u3067\u304D\u307E\u3059" });
    await db.update(communityAds).set({ status: "moderator_approved", approvedByModerator: user.id }).where(eq2(communityAds.id, id));
    res.json({ ok: true });
  });
  app2.patch("/api/community-ads/:id/approve", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044" });
    const id = paramNum(req, "id");
    const [ad] = await db.select().from(communityAds).where(eq2(communityAds.id, id));
    if (!ad) return res.status(404).json({ error: "\u7533\u3057\u8FBC\u307F\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    if (ad.status !== "moderator_approved") return res.status(400).json({ error: "\u30E2\u30C7\u30EC\u30FC\u30BF\u30FC\u627F\u8A8D\u5F8C\u306B\u7BA1\u7406\u4EBA\u304C\u627F\u8A8D\u3067\u304D\u307E\u3059" });
    const [community] = await db.select().from(communities).where(eq2(communities.id, ad.communityId));
    if (!community || community.adminId !== user.id) return res.status(403).json({ error: "\u7BA1\u7406\u4EBA\u306E\u307F\u6700\u7D42\u627F\u8A8D\u3067\u304D\u307E\u3059" });
    await db.update(communityAds).set({ status: "approved", approvedByOwner: user.id }).where(eq2(communityAds.id, id));
    res.json({ ok: true });
  });
  app2.patch("/api/community-ads/:id/reject", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044" });
    const id = paramNum(req, "id");
    const [ad] = await db.select().from(communityAds).where(eq2(communityAds.id, id));
    if (!ad) return res.status(404).json({ error: "\u7533\u3057\u8FBC\u307F\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    if (ad.status === "approved" || ad.status === "rejected") return res.status(400).json({ error: "\u65E2\u306B\u51E6\u7406\u6E08\u307F\u3067\u3059" });
    const [community] = await db.select().from(communities).where(eq2(communities.id, ad.communityId));
    const [mod] = await db.select().from(communityModerators).where(and2(eq2(communityModerators.communityId, ad.communityId), eq2(communityModerators.userId, user.id)));
    const isOwner = community?.adminId === user.id;
    const isMod = !!mod;
    if (!isOwner && !isMod) return res.status(403).json({ error: "\u7BA1\u7406\u4EBA\u307E\u305F\u306F\u30E2\u30C7\u30EC\u30FC\u30BF\u30FC\u306E\u307F\u5374\u4E0B\u3067\u304D\u307E\u3059" });
    await db.update(communityAds).set({ status: "rejected" }).where(eq2(communityAds.id, id));
    res.json({ ok: true });
  });
  const REPORT_REASONS = ["spam", "harassment", "inappropriate", "other"];
  app2.post("/api/reports", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044" });
    const { contentType, contentId, reason } = req.body;
    const cid = Number(contentId) || 0;
    const type = contentType === "comment" ? "comment" : contentType === "video" ? "video" : null;
    if (!type || !cid || !reason || !REPORT_REASONS.includes(reason)) {
      return res.status(400).json({ error: "contentType(video/comment), contentId, reason(spam/harassment/inappropriate/other)\u3092\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044" });
    }
    let contentText;
    if (type === "video") {
      const [video] = await db.select().from(videos).where(eq2(videos.id, cid));
      if (!video) return res.status(404).json({ error: "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
      contentText = video.title ?? "";
    } else {
      const [comment] = await db.select().from(videoComments).where(eq2(videoComments.id, cid));
      if (!comment) return res.status(404).json({ error: "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
      contentText = comment.text ?? "";
    }
    const { verdict, reason: aiReason } = await judgeReportContent(contentText, reason);
    const [report] = await db.insert(reports).values({
      reporterId: user.id,
      contentType: type,
      contentId: cid,
      reason,
      aiVerdict: verdict,
      aiReason: aiReason ?? "",
      status: verdict === "clear_violation" ? "hidden" : verdict === "gray_zone" ? "pending" : "reviewed"
    }).returning();
    if (verdict === "clear_violation") {
      if (type === "video") {
        await db.update(videos).set({ hidden: true }).where(eq2(videos.id, cid));
      } else {
        await db.update(videoComments).set({ hidden: true }).where(eq2(videoComments.id, cid));
      }
    }
    res.status(201).json(report);
  });
  app2.post("/api/concerts", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u672A\u8A8D\u8A3C\u3067\u3059" });
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
      status
    } = req.body;
    if (!title || !venueName || !venueAddress || !concertDate) {
      return res.status(400).json({ error: "\u5FC5\u9808\u9805\u76EE\u304C\u4E0D\u8DB3\u3057\u3066\u3044\u307E\u3059" });
    }
    const shares = [
      Number(artistShare ?? 0),
      Number(photographerShare ?? 0),
      Number(editorShare ?? 0),
      Number(venueShare ?? 0)
    ];
    if (shares.some((s) => s < 0)) {
      return res.status(400).json({ error: "\u5206\u914D\u6BD4\u7387\u306F0\u4EE5\u4E0A\u3067\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044" });
    }
    const sum = shares.reduce((a, b) => a + b, 0);
    if (sum !== 100) {
      return res.status(400).json({ error: "\u5206\u914D\u6BD4\u7387\u306E\u5408\u8A08\u306F100%\u306B\u3057\u3066\u304F\u3060\u3055\u3044" });
    }
    const [row] = await db.insert(concerts).values({
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
      status: status ?? "draft"
    }).returning();
    res.status(201).json(row);
  });
  app2.get("/api/concerts", async (_req, res) => {
    const rows = await db.select().from(concerts).where(eq2(concerts.status, "published")).orderBy(desc(concerts.concertDate), desc(concerts.createdAt));
    res.json(rows);
  });
  app2.get("/api/concerts/:id", async (req, res) => {
    const id = paramNum(req, "id");
    const [row] = await db.select().from(concerts).where(eq2(concerts.id, id));
    if (!row) return res.status(404).json({ error: "\u516C\u6F14\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    res.json(row);
  });
  app2.post("/api/concerts/:id/staff-request", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u672A\u8A8D\u8A3C\u3067\u3059" });
    const concertId = paramNum(req, "id");
    const [concert] = await db.select().from(concerts).where(eq2(concerts.id, concertId));
    if (!concert) return res.status(404).json({ error: "\u516C\u6F14\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    const existing = await db.select().from(concertStaff).where(and2(eq2(concertStaff.concertId, concertId), eq2(concertStaff.staffUserId, user.id)));
    if (existing.length > 0) {
      return res.status(400).json({ error: "\u3059\u3067\u306B\u7533\u8ACB\u6E08\u307F\u3067\u3059" });
    }
    const [row] = await db.insert(concertStaff).values({
      concertId,
      artistUserId: concert.artistUserId,
      staffUserId: user.id,
      status: "pending"
    }).returning();
    res.status(201).json(row);
  });
  app2.get("/api/concerts/:id/staff-requests", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u672A\u8A8D\u8A3C\u3067\u3059" });
    const concertId = paramNum(req, "id");
    const [concert] = await db.select().from(concerts).where(eq2(concerts.id, concertId));
    if (!concert) return res.status(404).json({ error: "\u516C\u6F14\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    if (concert.artistUserId !== user.id) {
      return res.status(403).json({ error: "\u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u306E\u307F\u7533\u8ACB\u4E00\u89A7\u3092\u95B2\u89A7\u3067\u304D\u307E\u3059" });
    }
    const rows = await db.select().from(concertStaff).where(eq2(concertStaff.concertId, concertId)).orderBy(desc(concertStaff.createdAt));
    res.json(rows);
  });
  app2.get("/api/concerts/:id/staff-req", async (req, res) => {
    return app2._router.handle(
      { ...req, url: `/api/concerts/${paramNum(req, "id")}/staff-requests`, params: req.params },
      res,
      () => {
      }
    );
  });
  app2.patch("/api/concerts/:id/staff/:staffId/approve", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u672A\u8A8D\u8A3C\u3067\u3059" });
    const concertId = paramNum(req, "id");
    const staffId = paramNum(req, "staffId");
    const [concert] = await db.select().from(concerts).where(eq2(concerts.id, concertId));
    if (!concert) return res.status(404).json({ error: "\u516C\u6F14\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    if (concert.artistUserId !== user.id) {
      return res.status(403).json({ error: "\u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u306E\u307F\u627F\u8A8D\u3067\u304D\u307E\u3059" });
    }
    const [staff] = await db.select().from(concertStaff).where(and2(eq2(concertStaff.id, staffId), eq2(concertStaff.concertId, concertId)));
    if (!staff) return res.status(404).json({ error: "\u7533\u8ACB\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    const [updated] = await db.update(concertStaff).set({ status: "approved" }).where(eq2(concertStaff.id, staffId)).returning();
    res.json(updated);
  });
  app2.patch("/api/concerts/:id/staff/:staffId/reject", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u672A\u8A8D\u8A3C\u3067\u3059" });
    const concertId = paramNum(req, "id");
    const staffId = paramNum(req, "staffId");
    const [concert] = await db.select().from(concerts).where(eq2(concerts.id, concertId));
    if (!concert) return res.status(404).json({ error: "\u516C\u6F14\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    if (concert.artistUserId !== user.id) {
      return res.status(403).json({ error: "\u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u306E\u307F\u5374\u4E0B\u3067\u304D\u307E\u3059" });
    }
    const [staff] = await db.select().from(concertStaff).where(and2(eq2(concertStaff.id, staffId), eq2(concertStaff.concertId, concertId)));
    if (!staff) return res.status(404).json({ error: "\u7533\u8ACB\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    const [updated] = await db.update(concertStaff).set({ status: "rejected" }).where(eq2(concertStaff.id, staffId)).returning();
    res.json(updated);
  });
  const GENRE_DAILY_RATE_PER_MEMBER = 5;
  const GENRE_MIN_AMOUNT = 1e4;
  const GENRE_MAX_MONTHS_AHEAD = 3;
  app2.post("/api/genre-ads", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044" });
    const { genreId, companyName, contactName, email, bannerUrl, startDate, endDate } = req.body;
    const gid = (genreId ?? "").trim();
    if (!gid || !GENRE_TO_CATEGORY[gid]) {
      return res.status(400).json({ error: "genreId \u304C\u4E0D\u6B63\u3067\u3059" });
    }
    if (!companyName || !contactName || !email || !bannerUrl || !startDate || !endDate) {
      return res.status(400).json({ error: "\u5FC5\u9808\u9805\u76EE\u304C\u4E0D\u8DB3\u3057\u3066\u3044\u307E\u3059" });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ error: "\u65E5\u4ED8\u306E\u5F62\u5F0F\u304C\u4E0D\u6B63\u3067\u3059\uFF08YYYY-MM-DD\uFF09" });
    }
    if (end < start) {
      return res.status(400).json({ error: "\u7D42\u4E86\u65E5\u306F\u958B\u59CB\u65E5\u4EE5\u964D\u306B\u3057\u3066\u304F\u3060\u3055\u3044" });
    }
    const now = /* @__PURE__ */ new Date();
    const maxEnd = new Date(now);
    maxEnd.setMonth(maxEnd.getMonth() + GENRE_MAX_MONTHS_AHEAD);
    if (end > maxEnd) {
      return res.status(400).json({ error: `\u63B2\u8F09\u7D42\u4E86\u65E5\u306F${GENRE_MAX_MONTHS_AHEAD}\u30F6\u6708\u4EE5\u5185\u3067\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044` });
    }
    const cats = GENRE_TO_CATEGORY[gid];
    const communityRows = await db.select({ members: communities.members }).from(communities).where(
      or(
        ...cats.map(
          (c) => sql2`${communities.category} ILIKE ${"%" + c + "%"}`
        )
      )
    );
    const totalMembers = communityRows.reduce((sum, r) => sum + (r.members ?? 0), 0);
    const dailyRate = totalMembers * GENRE_DAILY_RATE_PER_MEMBER;
    const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1e3)) + 1;
    const totalAmount = dailyRate * days;
    if (totalAmount < GENRE_MIN_AMOUNT) {
      return res.status(400).json({ error: `\u6700\u4F4E\u51FA\u7A3F\u91D1\u984D\u306F${GENRE_MIN_AMOUNT.toLocaleString()}\u5186\u4EE5\u4E0A\u3067\u3059` });
    }
    const [row] = await db.insert(genreAds).values({
      genreId: gid,
      companyName,
      contactName,
      email,
      bannerUrl,
      startDate,
      endDate,
      dailyRate,
      totalAmount
    }).returning();
    res.status(201).json(row);
  });
  app2.get("/api/genre-ads/review", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044" });
    const ownerRows = await db.select().from(genreOwners).where(eq2(genreOwners.ownerUserId, user.id));
    if (ownerRows.length === 0) return res.json([]);
    const genreIds = ownerRows.map((o) => o.genreId);
    const rows = await db.select().from(genreAds).where(and2(inArray(genreAds.genreId, genreIds), eq2(genreAds.status, "pending"))).orderBy(desc(genreAds.createdAt));
    res.json(rows);
  });
  app2.patch("/api/genre-ads/:id/approve", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044" });
    const id = paramNum(req, "id");
    const [ad] = await db.select().from(genreAds).where(eq2(genreAds.id, id));
    if (!ad) return res.status(404).json({ error: "\u7533\u3057\u8FBC\u307F\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    const [owner] = await db.select().from(genreOwners).where(and2(eq2(genreOwners.genreId, ad.genreId), eq2(genreOwners.ownerUserId, user.id)));
    if (!owner) return res.status(403).json({ error: "\u3053\u306E\u30B8\u30E3\u30F3\u30EB\u306E\u7BA1\u7406\u4EBA\u3067\u306F\u3042\u308A\u307E\u305B\u3093" });
    await db.update(genreAds).set({ status: "approved" }).where(eq2(genreAds.id, id));
    res.json({ ok: true });
  });
  app2.patch("/api/genre-ads/:id/reject", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044" });
    const id = paramNum(req, "id");
    const [ad] = await db.select().from(genreAds).where(eq2(genreAds.id, id));
    if (!ad) return res.status(404).json({ error: "\u7533\u3057\u8FBC\u307F\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    const [owner] = await db.select().from(genreOwners).where(and2(eq2(genreOwners.genreId, ad.genreId), eq2(genreOwners.ownerUserId, user.id)));
    if (!owner) return res.status(403).json({ error: "\u3053\u306E\u30B8\u30E3\u30F3\u30EB\u306E\u7BA1\u7406\u4EBA\u3067\u306F\u3042\u308A\u307E\u305B\u3093" });
    await db.update(genreAds).set({ status: "rejected" }).where(eq2(genreAds.id, id));
    res.json({ ok: true });
  });
  app2.post("/api/cron/update-genre-owners", async (_req, res) => {
    for (const [gid, cats] of Object.entries(GENRE_TO_CATEGORY)) {
      const rows = await db.select({ id: communities.id, members: communities.members, adminId: communities.adminId }).from(communities).where(
        or(
          ...cats.map(
            (c) => sql2`${communities.category} ILIKE ${"%" + c + "%"}`
          )
        )
      ).orderBy(desc(communities.members)).limit(1);
      const top = rows[0];
      if (!top || !top.adminId) continue;
      const existing = await db.select().from(genreOwners).where(eq2(genreOwners.genreId, gid)).limit(1);
      if (existing.length > 0) {
        await db.update(genreOwners).set({ ownerUserId: top.adminId, updatedAt: sql2`now()` }).where(eq2(genreOwners.genreId, gid));
      } else {
        await db.insert(genreOwners).values({ genreId: gid, ownerUserId: top.adminId });
      }
    }
    res.json({ ok: true });
  });
  app2.get("/api/admin/reports", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044" });
    if (user.role !== "ADMIN") return res.status(403).json({ error: "\u7BA1\u7406\u8005\u306E\u307F\u30A2\u30AF\u30BB\u30B9\u53EF\u80FD\u3067\u3059" });
    const rows = await db.select().from(reports).orderBy(desc(reports.createdAt));
    res.json(rows);
  });
  app2.patch("/api/admin/reports/:id/hide", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044" });
    if (user.role !== "ADMIN") return res.status(403).json({ error: "\u7BA1\u7406\u8005\u306E\u307F\u64CD\u4F5C\u53EF\u80FD\u3067\u3059" });
    const id = paramNum(req, "id");
    const [report] = await db.select().from(reports).where(eq2(reports.id, id));
    if (!report) return res.status(404).json({ error: "\u901A\u5831\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    if (report.contentType === "video") {
      await db.update(videos).set({ hidden: true }).where(eq2(videos.id, report.contentId));
    } else if (report.contentType === "comment") {
      await db.update(videoComments).set({ hidden: true }).where(eq2(videoComments.id, report.contentId));
    }
    await db.update(reports).set({ status: "hidden" }).where(eq2(reports.id, id));
    res.json({ ok: true });
  });
  app2.patch("/api/admin/reports/:id/dismiss", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044" });
    if (user.role !== "ADMIN") return res.status(403).json({ error: "\u7BA1\u7406\u8005\u306E\u307F\u64CD\u4F5C\u53EF\u80FD\u3067\u3059" });
    const id = paramNum(req, "id");
    const [report] = await db.select().from(reports).where(eq2(reports.id, id));
    if (!report) return res.status(404).json({ error: "\u901A\u5831\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    await db.update(reports).set({ status: "reviewed" }).where(eq2(reports.id, id));
    res.json({ ok: true });
  });
  app2.post("/api/upload-url", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u672A\u8A8D\u8A3C\u3067\u3059" });
    const { fileName, contentType } = req.body;
    if (!fileName || !contentType) {
      return res.status(400).json({ error: "fileName \u3068 contentType \u306F\u5FC5\u9808\u3067\u3059" });
    }
    const safeName = String(fileName).replace(/[^a-zA-Z0-9_.-]/g, "_");
    const key = `rawstock_${Date.now()}_${safeName}`;
    try {
      const { uploadUrl, publicUrl } = await createSignedUploadUrl(key, contentType);
      res.json({ uploadUrl, key, url: publicUrl });
    } catch (e) {
      console.error("Create signed upload URL error:", e);
      res.status(500).json({ error: "\u7F72\u540D\u4ED8\u304DURL\u306E\u767A\u884C\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
    }
  });
  app2.get("/api/videos", async (req, res) => {
    const genreId = req.query?.genre;
    const communityIdParam = req.query?.communityId;
    let rows = await db.select().from(videos).where(and2(eq2(videos.isRanked, false), eq2(videos.hidden, false))).orderBy(desc(videos.createdAt));
    rows = rows.filter((r) => r.visibility !== "draft" && r.visibility !== "my_page_only");
    const names = [...new Set(rows.map((r) => r.creator))];
    const userMap = /* @__PURE__ */ new Map();
    const creatorMap = /* @__PURE__ */ new Map();
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
  app2.get("/api/videos/my", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u672A\u8A8D\u8A3C\u3067\u3059" });
    const rows = await db.select().from(videos).where(or(eq2(videos.creator, user.displayName), eq2(videos.userId, user.id))).orderBy(desc(videos.createdAt));
    const filtered = rows.filter((r) => !r.hidden);
    res.json(filtered);
  });
  app2.get("/api/videos/ranked", async (_req, res) => {
    const rows = await db.select().from(videos).where(and2(eq2(videos.isRanked, true), eq2(videos.hidden, false))).orderBy(asc(videos.rank));
    res.json(rows);
  });
  app2.get("/api/videos/saved", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u672A\u8A8D\u8A3C\u3067\u3059" });
    const rows = await db.select({
      id: videos.id,
      title: videos.title,
      thumbnail: videos.thumbnail,
      creator: videos.creator,
      community: videos.community,
      views: videos.views,
      createdAt: videos.createdAt
    }).from(savedVideos).innerJoin(videos, eq2(videos.id, savedVideos.videoId)).where(and2(eq2(savedVideos.userId, user.id), eq2(videos.hidden, false))).orderBy(desc(savedVideos.createdAt));
    const timeAgoList = rows.map((r) => ({
      ...r,
      timeAgo: r.createdAt ? formatTimeAgo(r.createdAt) : "\u305F\u3063\u305F\u4ECA"
    }));
    res.json(timeAgoList);
  });
  app2.get("/api/videos/:id", async (req, res) => {
    const id = paramNum(req, "id");
    const authUser = await getAuthUser(req);
    const [row] = await db.select().from(videos).where(eq2(videos.id, id));
    if (!row || row.hidden) return res.status(404).json({ message: "Not found" });
    const vis = row.visibility;
    const isOwner = authUser && (row.userId === authUser.id || row.creator === authUser.displayName);
    if (vis === "draft" && !isOwner) return res.status(404).json({ message: "Not found" });
    if (vis === "my_page_only" && !isOwner) return res.status(404).json({ message: "Not found" });
    const timeAgo = row.createdAt ? formatTimeAgo(row.createdAt) : row.timeAgo;
    const [creatorUser] = await db.select({ id: users.id }).from(users).where(eq2(users.displayName, row.creator));
    const [creatorLiver] = !creatorUser ? await db.select({ id: creators.id }).from(creators).where(eq2(creators.name, row.creator)) : [];
    const creatorType = creatorUser ? "user" : creatorLiver ? "liver" : null;
    const creatorId = row.userId ?? creatorUser?.id ?? creatorLiver?.id ?? null;
    res.json({ ...row, timeAgo, creatorType, creatorId });
  });
  app2.get("/api/videos/:id/comments", async (req, res) => {
    const videoId = paramNum(req, "id");
    const rows = await db.select({
      id: videoComments.id,
      videoId: videoComments.videoId,
      userId: videoComments.userId,
      text: videoComments.text,
      createdAt: videoComments.createdAt,
      displayName: users.displayName,
      profileImageUrl: users.profileImageUrl
    }).from(videoComments).leftJoin(users, eq2(users.id, videoComments.userId)).where(and2(eq2(videoComments.videoId, videoId), eq2(videoComments.hidden, false))).orderBy(asc(videoComments.createdAt));
    res.json(rows);
  });
  app2.post("/api/videos/:id/comments", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u672A\u8A8D\u8A3C\u3067\u3059" });
    const videoId = paramNum(req, "id");
    const text2 = req.body.text?.trim();
    if (!text2) return res.status(400).json({ error: "\u30B3\u30E1\u30F3\u30C8\u672C\u6587\u306F\u5FC5\u9808\u3067\u3059" });
    const [row] = await db.insert(videoComments).values({ videoId, userId: user.id, text: text2 }).returning();
    res.status(201).json(row);
  });
  app2.post("/api/videos", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u672A\u8A8D\u8A3C\u3067\u3059" });
    const { title, community, communityId, duration, price, thumbnail, description, concertId, visibility, videoUrl, youtubeId } = req.body;
    if (!title || !duration || !thumbnail) {
      return res.status(400).json({ message: "\u5FC5\u9808\u30D5\u30A3\u30FC\u30EB\u30C9\u304C\u4E0D\u8DB3\u3057\u3066\u3044\u307E\u3059" });
    }
    const vis = visibility === "draft" ? "draft" : visibility === "my_page_only" ? "my_page_only" : "community";
    if (vis === "community" && (!community || !community.trim())) {
      return res.status(400).json({ message: "\u30B3\u30DF\u30E5\u30CB\u30C6\u30A3\u516C\u958B\u6642\u306F community \u3092\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044" });
    }
    const [row] = await db.insert(videos).values({
      title,
      creator: user.displayName,
      community: community?.trim() ?? "",
      views: 0,
      timeAgo: "\u305F\u3063\u305F\u4ECA",
      duration,
      price: price ?? null,
      thumbnail,
      description: description?.trim() || null,
      avatar: user.profileImageUrl ?? user.avatar ?? "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop",
      isRanked: false,
      concertId: concertId ?? null,
      userId: user.id,
      visibility: vis,
      communityId: vis === "community" ? communityId ?? null : null,
      videoUrl: videoUrl?.trim() || null,
      youtubeId: youtubeId?.trim() || null
    }).returning();
    res.status(201).json(row);
  });
  app2.patch("/api/videos/:id", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u672A\u8A8D\u8A3C\u3067\u3059" });
    const id = paramNum(req, "id");
    const [video] = await db.select().from(videos).where(eq2(videos.id, id));
    if (!video) return res.status(404).json({ message: "Not found" });
    const isOwner = video.userId === user.id || video.creator === user.displayName;
    if (!isOwner) return res.status(403).json({ error: "\u7DE8\u96C6\u6A29\u9650\u304C\u3042\u308A\u307E\u305B\u3093" });
    const { title, visibility, communityId, community } = req.body;
    const updates = {};
    if (title !== void 0) {
      const newTitle = title?.trim();
      if (!newTitle) return res.status(400).json({ error: "\u30BF\u30A4\u30C8\u30EB\u306F\u5FC5\u9808\u3067\u3059" });
      updates.title = newTitle;
    }
    if (visibility !== void 0) {
      const vis = ["draft", "my_page_only", "community"].includes(visibility) ? visibility : video.visibility;
      updates.visibility = vis;
      if (vis === "community" && communityId != null) updates.communityId = communityId;
      if (vis === "community" && community?.trim()) updates.community = community.trim();
      if (vis !== "community") updates.communityId = null;
    }
    if (Object.keys(updates).length === 0) return res.json(video);
    const [updated] = await db.update(videos).set(updates).where(eq2(videos.id, id)).returning();
    res.json(updated);
  });
  app2.delete("/api/videos/:id", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u672A\u8A8D\u8A3C\u3067\u3059" });
    const id = paramNum(req, "id");
    const [video] = await db.select().from(videos).where(eq2(videos.id, id));
    if (!video) return res.status(404).json({ message: "Not found" });
    const isOwner = video.userId === user.id || video.creator === user.displayName;
    if (!isOwner) return res.status(403).json({ error: "\u524A\u9664\u6A29\u9650\u304C\u3042\u308A\u307E\u305B\u3093" });
    await db.delete(videoComments).where(eq2(videoComments.videoId, id));
    await db.delete(videos).where(eq2(videos.id, id));
    res.json({ ok: true });
  });
  app2.post("/api/videos/:id/save", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u672A\u8A8D\u8A3C\u3067\u3059" });
    const videoId = paramNum(req, "id");
    const [video] = await db.select().from(videos).where(eq2(videos.id, videoId));
    if (!video || video.hidden) return res.status(404).json({ message: "Not found" });
    const vis = video.visibility;
    const isOwner = video.userId === user.id || video.creator === user.displayName;
    if (vis === "draft" && !isOwner) return res.status(404).json({ message: "Not found" });
    if (vis === "my_page_only" && !isOwner) return res.status(404).json({ message: "Not found" });
    try {
      await db.insert(savedVideos).values({ userId: user.id, videoId });
    } catch {
    }
    res.json({ ok: true });
  });
  app2.delete("/api/videos/:id/save", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u672A\u8A8D\u8A3C\u3067\u3059" });
    const videoId = paramNum(req, "id");
    await db.delete(savedVideos).where(and2(eq2(savedVideos.userId, user.id), eq2(savedVideos.videoId, videoId)));
    res.json({ ok: true });
  });
  app2.get("/api/videos/:id/saved", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.json({ saved: false });
    const videoId = paramNum(req, "id");
    const [row] = await db.select().from(savedVideos).where(and2(eq2(savedVideos.userId, user.id), eq2(savedVideos.videoId, videoId)));
    res.json({ saved: !!row });
  });
  app2.get("/api/users/:id/posts", async (req, res) => {
    const userId = paramNum(req, "id");
    const [targetUser] = await db.select({ id: users.id, displayName: users.displayName }).from(users).where(eq2(users.id, userId));
    if (!targetUser) return res.status(404).json({ message: "Not found" });
    const rows = await db.select().from(videos).where(
      and2(
        or(eq2(videos.userId, userId), eq2(videos.creator, targetUser.displayName)),
        eq2(videos.hidden, false)
      )
    ).orderBy(desc(videos.createdAt));
    const filtered = rows.filter((r) => {
      const v = r.visibility;
      return v !== "draft";
    });
    res.json(filtered);
  });
  app2.get("/api/live-streams", async (_req, res) => {
    const rows = await db.select().from(liveStreams).where(eq2(liveStreams.isLive, true)).orderBy(desc(liveStreams.viewers));
    res.json(rows);
  });
  app2.get("/api/creators", async (_req, res) => {
    const rows = await db.select().from(creators).orderBy(asc(creators.rank));
    res.json(rows);
  });
  app2.get("/api/booking-sessions", async (req, res) => {
    const category = queryStr(req, "category");
    const rows = category && category !== "all" ? await db.select().from(bookingSessions).where(eq2(bookingSessions.category, category)) : await db.select().from(bookingSessions);
    res.json(rows);
  });
  app2.post("/api/booking-sessions/:id/book", async (req, res) => {
    const id = paramNum(req, "id");
    const [session] = await db.select().from(bookingSessions).where(eq2(bookingSessions.id, id));
    if (!session) return res.status(404).json({ message: "Not found" });
    if (session.spotsLeft <= 0) return res.status(400).json({ message: "\u6E80\u5E2D\u3067\u3059" });
    const [updated] = await db.update(bookingSessions).set({ spotsLeft: session.spotsLeft - 1 }).where(eq2(bookingSessions.id, id)).returning();
    res.json(updated);
  });
  app2.get("/api/dm-messages", async (_req, res) => {
    const rows = await db.select().from(dmMessages).orderBy(asc(dmMessages.sortOrder));
    res.json(rows);
  });
  app2.post("/api/dm-messages/:id/read", async (req, res) => {
    const id = paramNum(req, "id");
    const [updated] = await db.update(dmMessages).set({ unread: 0 }).where(eq2(dmMessages.id, id)).returning();
    res.json(updated);
  });
  app2.get("/api/notifications", async (req, res) => {
    const type = queryStr(req, "type");
    const rows = type && type !== "all" ? await db.select().from(notifications).where(eq2(notifications.type, type)).orderBy(desc(notifications.createdAt)) : await db.select().from(notifications).orderBy(desc(notifications.createdAt));
    res.json(rows);
  });
  app2.post("/api/notifications/read-all", async (_req, res) => {
    await db.update(notifications).set({ isRead: true });
    res.json({ ok: true });
  });
  app2.post("/api/notifications/:id/read", async (req, res) => {
    const id = paramNum(req, "id");
    const [updated] = await db.update(notifications).set({ isRead: true }).where(eq2(notifications.id, id)).returning();
    res.json(updated);
  });
  app2.get("/api/live-streams/:id", async (req, res) => {
    const id = paramNum(req, "id");
    const [stream] = await db.select().from(liveStreams).where(eq2(liveStreams.id, id));
    if (!stream) return res.status(404).json({ error: "Not found" });
    res.json(stream);
  });
  app2.get("/api/live-streams/:id/chat", async (req, res) => {
    const id = paramNum(req, "id");
    const msgs = await db.select().from(liveStreamChat).where(eq2(liveStreamChat.streamId, id)).orderBy(asc(liveStreamChat.createdAt));
    res.json(msgs);
  });
  app2.post("/api/live-streams/:id/chat", async (req, res) => {
    const id = paramNum(req, "id");
    const { username, avatar, message, isGift, giftAmount } = req.body;
    const [msg] = await db.insert(liveStreamChat).values({
      streamId: id,
      username: username ?? "\u3042\u306A\u305F",
      avatar,
      message,
      isGift: isGift ?? false,
      giftAmount: giftAmount ?? null
    }).returning();
    res.json(msg);
  });
  app2.get("/api/dm-messages/:id/conversation", async (req, res) => {
    const id = paramNum(req, "id");
    const msgs = await db.select().from(dmConversationMessages).where(eq2(dmConversationMessages.dmId, id)).orderBy(asc(dmConversationMessages.createdAt));
    res.json(msgs);
  });
  app2.post("/api/dm-messages/:id/conversation", async (req, res) => {
    const id = paramNum(req, "id");
    const { text: text2 } = req.body;
    const [msg] = await db.insert(dmConversationMessages).values({
      dmId: id,
      sender: "me",
      text: text2,
      isRead: true
    }).returning();
    await db.update(dmMessages).set({ lastMessage: text2, unread: 0 }).where(eq2(dmMessages.id, id));
    res.json(msg);
  });
  app2.get("/api/jukebox/:communityId", async (req, res) => {
    const communityId = paramNum(req, "communityId");
    const now = /* @__PURE__ */ new Date();
    const [stateRaw] = await db.select().from(jukeboxState).where(eq2(jukeboxState.communityId, communityId));
    const queue = await db.select().from(jukeboxQueue).where(eq2(jukeboxQueue.communityId, communityId)).orderBy(asc(jukeboxQueue.position));
    let state = stateRaw ?? null;
    let queueModified = false;
    if (state && state.currentVideoDurationSecs && state.currentVideoDurationSecs > 0 && state.startedAt) {
      const elapsedSecs2 = (now.getTime() - new Date(state.startedAt).getTime()) / 1e3;
      if (elapsedSecs2 >= state.currentVideoDurationSecs) {
        const currentItem = queue.find(
          (q) => state.currentVideoYoutubeId && q.youtubeId === state.currentVideoYoutubeId || state.currentVideoId != null && q.videoId === state.currentVideoId
        );
        if (currentItem) {
          await db.update(jukeboxQueue).set({ isPlayed: true }).where(eq2(jukeboxQueue.id, currentItem.id));
          queueModified = true;
        }
        const next = queue.find((q) => !q.isPlayed && q.id !== currentItem?.id);
        if (next) {
          queueModified = true;
          const watchers = Math.floor(Math.random() * 80) + 20;
          const [updated] = await db.insert(jukeboxState).values({
            communityId,
            currentVideoId: next.videoId,
            currentVideoTitle: next.videoTitle,
            currentVideoThumbnail: next.videoThumbnail,
            currentVideoDurationSecs: next.videoDurationSecs ?? 0,
            currentVideoYoutubeId: next.youtubeId ?? null,
            startedAt: now,
            isPlaying: true,
            watchersCount: watchers
          }).onConflictDoUpdate({
            target: jukeboxState.communityId,
            set: {
              currentVideoId: next.videoId,
              currentVideoTitle: next.videoTitle,
              currentVideoThumbnail: next.videoThumbnail,
              currentVideoDurationSecs: next.videoDurationSecs ?? 0,
              currentVideoYoutubeId: next.youtubeId ?? null,
              startedAt: now,
              isPlaying: true,
              watchersCount: watchers
            }
          }).returning();
          state = updated;
        } else {
          const [updated] = await db.update(jukeboxState).set({
            currentVideoId: null,
            currentVideoTitle: null,
            currentVideoThumbnail: null,
            currentVideoDurationSecs: 0,
            currentVideoYoutubeId: null,
            isPlaying: false
          }).where(eq2(jukeboxState.communityId, communityId)).returning();
          state = updated;
        }
      }
    }
    const queueToReturn = queueModified ? await db.select().from(jukeboxQueue).where(eq2(jukeboxQueue.communityId, communityId)).orderBy(asc(jukeboxQueue.position)) : queue;
    const chat = await db.select().from(jukeboxChat).where(eq2(jukeboxChat.communityId, communityId)).orderBy(asc(jukeboxChat.createdAt));
    let elapsedSecs = 0;
    if (state?.startedAt && (state.currentVideoDurationSecs ?? 0) > 0) {
      elapsedSecs = Math.max(
        0,
        Math.min(
          state.currentVideoDurationSecs ?? 0,
          (now.getTime() - new Date(state.startedAt).getTime()) / 1e3
        )
      );
    }
    const effectiveState = state && state.isPlaying && (state.currentVideoTitle || state.currentVideoYoutubeId) ? state : null;
    res.json({
      state: effectiveState ? {
        ...effectiveState,
        elapsedSecs
      } : null,
      queue: queueToReturn,
      chat
    });
  });
  app2.post("/api/stream/create", async (req, res) => {
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_STREAM_TOKEN) {
      return res.status(500).json({ error: "Cloudflare Stream is not configured" });
    }
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u672A\u8A8D\u8A3C\u3067\u3059" });
    const { name } = req.body ?? {};
    try {
      const cfRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${CLOUDFLARE_STREAM_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            meta: {
              name: name || `RawStock Stream by ${user.displayName}`
            }
          })
        }
      );
      const json = await cfRes.json();
      if (!cfRes.ok || !json.success || !json.result) {
        console.error("Cloudflare Stream create error:", json.errors);
        return res.status(502).json({ error: "Cloudflare Stream live input \u4F5C\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
      }
      const result = json.result;
      const cfId = result.uid ?? "";
      const rtmpsUrl = result.rtmps?.url ?? "";
      const rtmpsStreamKey = result.rtmps?.streamKey ?? "";
      const webRtcPlaybackUrl = result.webRTCPlayback?.url ?? result.webRTC?.url ?? "";
      if (!cfId || !rtmpsUrl || !rtmpsStreamKey || !webRtcPlaybackUrl) {
        return res.status(502).json({ error: "Cloudflare Stream \u30EC\u30B9\u30DD\u30F3\u30B9\u304C\u4E0D\u5B8C\u5168\u3067\u3059" });
      }
      const [row] = await db.insert(streams).values({
        cfLiveInputId: cfId,
        webRtcUrl: webRtcPlaybackUrl,
        rtmpsUrl,
        rtmpsStreamKey,
        currentViewers: 0
      }).returning();
      res.json({
        id: row.id,
        webRtc: { url: webRtcPlaybackUrl },
        rtmps: { url: rtmpsUrl, streamKey: rtmpsStreamKey }
      });
    } catch (e) {
      console.error("Cloudflare Stream create exception:", e);
      res.status(500).json({ error: "Cloudflare Stream API \u901A\u4FE1\u3067\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F" });
    }
  });
  app2.post("/api/jukebox/:communityId/add", async (req, res) => {
    const communityId = paramNum(req, "communityId");
    const { videoId, videoTitle, videoThumbnail, videoDurationSecs, addedBy, addedByAvatar, youtubeId } = req.body;
    const existing = await db.select().from(jukeboxQueue).where(eq2(jukeboxQueue.communityId, communityId)).orderBy(desc(jukeboxQueue.position));
    const nextPos = existing.length > 0 ? existing[0].position + 1 : 1;
    const [item] = await db.insert(jukeboxQueue).values({
      communityId,
      videoId,
      videoTitle,
      videoThumbnail,
      videoDurationSecs: videoDurationSecs ?? 0,
      youtubeId: youtubeId ?? null,
      addedBy: addedBy ?? "\u3042\u306A\u305F",
      addedByAvatar,
      position: nextPos,
      isPlayed: false
    }).returning();
    const [stateRow] = await db.select().from(jukeboxState).where(eq2(jukeboxState.communityId, communityId));
    const isCurrentlyPlaying = !!(stateRow?.isPlaying && (stateRow.currentVideoId != null || stateRow.currentVideoYoutubeId));
    const hasUnplayed = existing.some((q) => !q.isPlayed);
    if (!hasUnplayed && !isCurrentlyPlaying) {
      const watchers = Math.floor(Math.random() * 80) + 20;
      await db.insert(jukeboxState).values({
        communityId,
        currentVideoId: item.videoId,
        currentVideoTitle: item.videoTitle,
        currentVideoThumbnail: item.videoThumbnail,
        currentVideoDurationSecs: item.videoDurationSecs ?? 0,
        currentVideoYoutubeId: item.youtubeId ?? null,
        startedAt: /* @__PURE__ */ new Date(),
        isPlaying: true,
        watchersCount: watchers
      }).onConflictDoUpdate({
        target: jukeboxState.communityId,
        set: {
          currentVideoId: item.videoId,
          currentVideoTitle: item.videoTitle,
          currentVideoThumbnail: item.videoThumbnail,
          currentVideoDurationSecs: item.videoDurationSecs ?? 0,
          currentVideoYoutubeId: item.youtubeId ?? null,
          startedAt: /* @__PURE__ */ new Date(),
          isPlaying: true,
          watchersCount: watchers
        }
      });
    }
    res.json(item);
  });
  app2.post("/api/jukebox/:communityId/next", async (req, res) => {
    const communityId = paramNum(req, "communityId");
    const [stateRaw] = await db.select().from(jukeboxState).where(eq2(jukeboxState.communityId, communityId));
    const queue = await db.select().from(jukeboxQueue).where(eq2(jukeboxQueue.communityId, communityId)).orderBy(asc(jukeboxQueue.position));
    let currentItemId = null;
    if (stateRaw?.currentVideoId != null || stateRaw?.currentVideoYoutubeId) {
      const currentItem = queue.find(
        (q) => stateRaw.currentVideoYoutubeId && q.youtubeId === stateRaw.currentVideoYoutubeId || stateRaw.currentVideoId != null && q.videoId === stateRaw.currentVideoId
      );
      if (currentItem) {
        currentItemId = currentItem.id;
        await db.update(jukeboxQueue).set({ isPlayed: true }).where(eq2(jukeboxQueue.id, currentItem.id));
      }
    }
    const next = queue.find((q) => !q.isPlayed && q.id !== currentItemId);
    if (next) {
      const watchers = Math.floor(Math.random() * 80) + 20;
      await db.insert(jukeboxState).values({
        communityId,
        currentVideoId: next.videoId,
        currentVideoTitle: next.videoTitle,
        currentVideoThumbnail: next.videoThumbnail,
        currentVideoDurationSecs: next.videoDurationSecs ?? 0,
        currentVideoYoutubeId: next.youtubeId ?? null,
        startedAt: /* @__PURE__ */ new Date(),
        isPlaying: true,
        watchersCount: watchers
      }).onConflictDoUpdate({
        target: jukeboxState.communityId,
        set: {
          currentVideoId: next.videoId,
          currentVideoTitle: next.videoTitle,
          currentVideoThumbnail: next.videoThumbnail,
          currentVideoDurationSecs: next.videoDurationSecs ?? 0,
          currentVideoYoutubeId: next.youtubeId ?? null,
          startedAt: /* @__PURE__ */ new Date(),
          isPlaying: true,
          watchersCount: watchers
        }
      });
    } else {
      await db.update(jukeboxState).set({
        currentVideoId: null,
        currentVideoTitle: null,
        currentVideoThumbnail: null,
        currentVideoDurationSecs: 0,
        currentVideoYoutubeId: null,
        isPlaying: false
      }).where(eq2(jukeboxState.communityId, communityId));
    }
    res.json({ ok: true });
  });
  app2.post("/api/jukebox/:communityId/chat", async (req, res) => {
    const communityId = paramNum(req, "communityId");
    const { username, avatar, message } = req.body;
    const [msg] = await db.insert(jukeboxChat).values({
      communityId,
      username: username ?? "\u3042\u306A\u305F",
      avatar,
      message
    }).returning();
    res.json(msg);
  });
  app2.get("/api/twoshot/publishable-key", async (_req, res) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/twoshot/:streamId/bookings", async (req, res) => {
    const streamId = paramNum(req, "streamId");
    const rows = await db.select().from(twoshotBookings).where(eq2(twoshotBookings.streamId, streamId)).orderBy(asc(twoshotBookings.queuePosition));
    res.json(rows);
  });
  app2.get("/api/twoshot/:streamId/queue-count", async (req, res) => {
    const streamId = paramNum(req, "streamId");
    const [{ total }] = await db.select({ total: count() }).from(twoshotBookings).where(sql2`stream_id = ${streamId} AND status IN ('paid','waiting','notified')`);
    res.json({ count: Number(total) });
  });
  app2.post("/api/twoshot/:streamId/checkout", async (req, res) => {
    const streamId = paramNum(req, "streamId");
    const { userName, userAvatar, price = 3e3 } = req.body;
    if (!userName) return res.status(400).json({ error: "userName required" });
    try {
      const stripe = await getUncachableStripeClient();
      const [{ total }] = await db.select({ total: count() }).from(twoshotBookings).where(sql2`stream_id = ${streamId} AND status IN ('paid','waiting','notified')`);
      const queuePos = Number(total) + 1;
      const [stream] = await db.select().from(liveStreams).where(eq2(liveStreams.id, streamId));
      const streamTitle = stream?.title ?? "\u30C4\u30FC\u30B7\u30E7\u30C3\u30C8\u64AE\u5F71";
      const creatorName = stream?.creator ?? "\u30AF\u30EA\u30A8\u30A4\u30BF\u30FC";
      const baseUrl = process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : "http://localhost:8081";
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "jpy",
              unit_amount: price,
              product_data: {
                name: `\u30C4\u30FC\u30B7\u30E7\u30C3\u30C8\u64AE\u5F71 with ${creatorName}`,
                description: `${streamTitle} | \u6574\u7406\u756A\u53F7${queuePos}\u756A`
              }
            },
            quantity: 1
          }
        ],
        mode: "payment",
        success_url: `${baseUrl}/twoshot-success?session_id={CHECKOUT_SESSION_ID}&stream=${streamId}`,
        cancel_url: `${baseUrl}/live/${streamId}`,
        metadata: {
          streamId: streamId.toString(),
          userName,
          userAvatar: userAvatar ?? "",
          queuePosition: queuePos.toString(),
          price: price.toString()
        }
      });
      const [booking] = await db.insert(twoshotBookings).values({
        streamId,
        userName,
        userAvatar,
        stripeSessionId: session.id,
        price,
        status: "pending",
        queuePosition: queuePos,
        agreedToTerms: true,
        agreedAt: /* @__PURE__ */ new Date(),
        refundable: false
      }).returning();
      res.json({ checkoutUrl: session.url, bookingId: booking.id, queuePosition: queuePos });
    } catch (e) {
      console.error("Stripe checkout error:", e);
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/twoshot/confirm-payment", async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: "sessionId required" });
    try {
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== "paid") {
        return res.status(400).json({ error: "Payment not completed" });
      }
      const [booking] = await db.select().from(twoshotBookings).where(eq2(twoshotBookings.stripeSessionId, sessionId));
      if (!booking) return res.status(404).json({ error: "Booking not found" });
      await db.update(twoshotBookings).set({
        status: "paid",
        stripePaymentIntentId: session.payment_intent
      }).where(eq2(twoshotBookings.stripeSessionId, sessionId));
      const [stream] = await db.select().from(liveStreams).where(eq2(liveStreams.id, booking.streamId));
      if (stream) {
        const [creatorUser] = await db.select().from(users).where(eq2(users.displayName, stream.creator));
        if (creatorUser) {
          const walletId = await getOrCreateUserWallet(creatorUser.id);
          await recordRevenue(walletId, booking.price, "twoshot", String(booking.id));
        }
      }
      res.json({ ok: true, booking });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/twoshot/:bookingId/notify", async (req, res) => {
    const bookingId = paramNum(req, "bookingId");
    await db.update(twoshotBookings).set({ status: "notified", notifiedAt: /* @__PURE__ */ new Date() }).where(eq2(twoshotBookings.id, bookingId));
    res.json({ ok: true });
  });
  app2.post("/api/twoshot/:bookingId/complete", async (req, res) => {
    const bookingId = paramNum(req, "bookingId");
    await db.update(twoshotBookings).set({ status: "completed", completedAt: /* @__PURE__ */ new Date() }).where(eq2(twoshotBookings.id, bookingId));
    res.json({ ok: true });
  });
  app2.post("/api/twoshot/:bookingId/cancel", async (req, res) => {
    const bookingId = paramNum(req, "bookingId");
    const { reason, isSelfCancel } = req.body;
    await db.update(twoshotBookings).set({
      status: "cancelled",
      cancelledAt: /* @__PURE__ */ new Date(),
      cancelReason: reason ?? "\u30E6\u30FC\u30B6\u30FC\u30AD\u30E3\u30F3\u30BB\u30EB",
      refundable: !isSelfCancel
    }).where(eq2(twoshotBookings.id, bookingId));
    res.json({ ok: true });
  });
  app2.post("/api/revenue/record", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u304C\u5FC5\u8981\u3067\u3059" });
    const { amount, source, referenceId } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "amount \u306F\u6B63\u306E\u6570\u3067\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044" });
    const src = source ?? "tip";
    const walletId = await getOrCreateUserWallet(user.id);
    await recordRevenue(walletId, amount, src, referenceId ?? null);
    res.status(201).json({ ok: true, amount, source: src });
  });
  app2.get("/api/revenue/summary", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u304C\u5FC5\u8981\u3067\u3059" });
    const userId = `user-${user.id}`;
    const earningRows = await db.select().from(earnings).where(eq2(earnings.userId, userId));
    const withdrawalRows = await db.select().from(withdrawals).where(eq2(withdrawals.userId, userId));
    const totalEarned = earningRows.reduce((s, e) => s + e.netAmount, 0);
    const totalWithdrawn = withdrawalRows.filter((w) => w.status === "completed").reduce((s, w) => s + w.amount, 0);
    const pendingWithdrawal = withdrawalRows.filter((w) => w.status === "pending" || w.status === "processing").reduce((s, w) => s + w.amount, 0);
    const available = totalEarned - totalWithdrawn - pendingWithdrawal;
    const now = /* @__PURE__ */ new Date();
    const monthly = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${d.getMonth() + 1}\u6708`;
      const monthTotal = earningRows.filter((e) => {
        const ed = new Date(e.createdAt);
        return ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth();
      }).reduce((s, e) => s + e.netAmount, 0);
      monthly.push({ month: label, amount: monthTotal });
    }
    res.json({ totalEarned, totalWithdrawn, pendingWithdrawal, available, monthly });
  });
  app2.get("/api/revenue/earnings", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u304C\u5FC5\u8981\u3067\u3059" });
    const userId = `user-${user.id}`;
    const rows = await db.select().from(earnings).where(eq2(earnings.userId, userId)).orderBy(desc(earnings.createdAt));
    res.json(rows);
  });
  app2.get("/api/revenue/monthly-rank", async (req, res) => {
    const month = req.query.month ?? "";
    const match = /^(\d{4})-(\d{2})$/.exec(month);
    if (!match) {
      return res.status(400).json({ error: "month \u306F YYYY-MM \u5F62\u5F0F\u3067\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044" });
    }
    const rankings = await getMonthlyRevenueRank(month);
    res.json({ month, rankings });
  });
  app2.get("/api/revenue/withdrawals", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u304C\u5FC5\u8981\u3067\u3059" });
    const userId = `user-${user.id}`;
    const rows = await db.select().from(withdrawals).where(eq2(withdrawals.userId, userId)).orderBy(desc(withdrawals.requestedAt));
    res.json(rows);
  });
  app2.post("/api/revenue/withdraw", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u304C\u5FC5\u8981\u3067\u3059" });
    const userId = `user-${user.id}`;
    const { amount, bankName, bankBranch, accountType, accountNumber, accountName } = req.body;
    if (!amount || amount < 1e3) {
      return res.status(400).json({ error: "\u6700\u4F4E\u5F15\u304D\u51FA\u3057\u984D\u306F\xA51,000\u3067\u3059" });
    }
    const earningRows = await db.select().from(earnings).where(eq2(earnings.userId, userId));
    const withdrawalRows = await db.select().from(withdrawals).where(eq2(withdrawals.userId, userId));
    const totalEarned = earningRows.reduce((s, e) => s + e.netAmount, 0);
    const totalUsed = withdrawalRows.filter((w) => w.status !== "failed").reduce((s, w) => s + w.amount, 0);
    const available = totalEarned - totalUsed;
    if (amount > available) {
      return res.status(400).json({ error: "\u5F15\u304D\u51FA\u3057\u53EF\u80FD\u6B8B\u9AD8\u3092\u8D85\u3048\u3066\u3044\u307E\u3059" });
    }
    const [row] = await db.insert(withdrawals).values({ userId, amount, bankName, bankBranch, accountType, accountNumber, accountName, status: "pending" }).returning();
    res.json(row);
  });
  app2.get("/api/announcements", async (_req, res) => {
    const rows = await db.select().from(announcements).where(
      sql2`(start_at IS NULL OR start_at <= now()) AND (end_at IS NULL OR end_at >= now())`
    ).orderBy(desc(announcements.isPinned), desc(announcements.createdAt));
    res.json(rows);
  });
  app2.get("/api/livers", async (req, res) => {
    const name = queryStr(req, "name");
    const minScore = queryStr(req, "minScore");
    const category = queryStr(req, "category");
    const date = queryStr(req, "date");
    let rows = await db.select().from(creators).orderBy(asc(creators.rank));
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
      const avail = await db.select().from(liverAvailability).where(eq2(liverAvailability.date, date));
      const availIds = new Set(avail.map((a) => a.liverId));
      rows = rows.filter((r) => availIds.has(r.id));
    }
    res.json(rows);
  });
  app2.get("/api/livers/:id", async (req, res) => {
    const id = paramNum(req, "id");
    const [liver] = await db.select().from(creators).where(eq2(creators.id, id));
    if (!liver) return res.status(404).json({ error: "Not found" });
    res.json(liver);
  });
  app2.get("/api/profile/roles", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u672A\u8A8D\u8A3C\u3067\u3059" });
    const rows = await db.select().from(creators).where(eq2(creators.name, user.displayName));
    const isEditor = rows.some((r) => r.category === "editor");
    const isTwoshot = rows.some((r) => r.category === "twoshot");
    res.json({ isEditor, isTwoshot });
  });
  app2.post("/api/profile/register-role", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "\u672A\u8A8D\u8A3C\u3067\u3059" });
    const { role } = req.body;
    if (role !== "editor" && role !== "twoshot") {
      return res.status(400).json({ error: "role \u306F editor \u304B twoshot \u3092\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044" });
    }
    const category = role === "editor" ? "editor" : "twoshot";
    const communityLabel = role === "editor" ? "\u52D5\u753B\u7DE8\u96C6\u30AF\u30EA\u30A8\u30A4\u30BF\u30FC" : "\u30C4\u30FC\u30B7\u30E7\u30C3\u30C8\u30E9\u30A4\u30D0\u30FC";
    const existing = await db.select().from(creators).where(
      and2(
        eq2(creators.name, user.displayName),
        eq2(creators.category, category)
      )
    );
    if (existing.length > 0) {
      return res.json({ ok: true, alreadyRegistered: true });
    }
    const avatar = user.avatar ?? "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop";
    const [created] = await db.insert(creators).values({
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
      category
    }).returning();
    res.status(201).json({ ok: true, creator: created });
  });
  app2.get("/api/livers/:id/reviews", async (req, res) => {
    const id = paramNum(req, "id");
    const rows = await db.select().from(liverReviews).where(eq2(liverReviews.liverId, id)).orderBy(desc(liverReviews.createdAt));
    res.json(rows);
  });
  app2.post("/api/livers/:id/reviews", async (req, res) => {
    const id = paramNum(req, "id");
    const { userId, userName, userAvatar, satisfactionScore, streamCountScore, attendanceScore, comment, sessionDate } = req.body;
    if (!userName || !comment) return res.status(400).json({ error: "\u5FC5\u9808\u9805\u76EE\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044" });
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
      sessionDate: sessionDate ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
    }).returning();
    const allReviews = await db.select().from(liverReviews).where(eq2(liverReviews.liverId, id));
    const avgOverall = allReviews.reduce((s, r) => s + r.overallScore, 0) / allReviews.length;
    const avgSatisfaction = allReviews.reduce((s, r) => s + r.satisfactionScore, 0) / allReviews.length;
    const avgAttendance = allReviews.reduce((s, r) => s + r.attendanceScore, 0) / allReviews.length;
    await db.update(creators).set({
      heatScore: parseFloat(avgOverall.toFixed(1)),
      satisfactionScore: parseFloat(avgSatisfaction.toFixed(1)),
      attendanceRate: parseFloat(avgAttendance.toFixed(1))
    }).where(eq2(creators.id, id));
    res.status(201).json(row);
  });
  app2.get("/api/livers/:id/availability", async (req, res) => {
    const id = paramNum(req, "id");
    const rows = await db.select().from(liverAvailability).where(eq2(liverAvailability.liverId, id)).orderBy(asc(liverAvailability.date), asc(liverAvailability.startTime));
    res.json(rows);
  });
  app2.post("/api/livers/:id/availability", async (req, res) => {
    const id = paramNum(req, "id");
    const { date, startTime, endTime, maxSlots, note } = req.body;
    if (!date || !startTime || !endTime) return res.status(400).json({ error: "\u65E5\u4ED8\u3068\u6642\u9593\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044" });
    const [row] = await db.insert(liverAvailability).values({
      liverId: id,
      date,
      startTime,
      endTime,
      maxSlots: maxSlots ?? 3,
      bookedSlots: 0,
      note: note ?? ""
    }).returning();
    res.status(201).json(row);
  });
  app2.delete("/api/livers/:id/availability/:slotId", async (req, res) => {
    const slotId = paramNum(req, "slotId");
    await db.delete(liverAvailability).where(eq2(liverAvailability.id, slotId));
    res.json({ ok: true });
  });
  app2.post("/api/seed", async (_req, res) => {
    const existingDm = await db.select().from(dmMessages);
    if (existingDm.length === 0) {
      await db.insert(dmMessages).values([
        { name: "\u685C\u82B1\u30A2\u30EA\u30B9", avatar: "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=100&h=100&fit=crop", lastMessage: "\u3042\u308A\u304C\u3068\u3046\u3054\u3056\u3044\u307E\u3059\uFF01\u6B21\u306E\u914D\u4FE1\u3082\u3088\u308D\u3057\u304F\u304A\u9858\u3044\u3057\u307E\u3059", time: "\u305F\u3063\u305F\u4ECA", unread: 2, online: true, sortOrder: 1 },
        { name: "\u30A8\u30DF\u30EA\u30FC\u5148\u751F", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop", lastMessage: "\u6B21\u306E\u30EC\u30C3\u30B9\u30F3\u306F3/2\u306E19:00\u304B\u3089\u3067\u3059\u3002\u304A\u697D\u3057\u307F\u306B\uFF01", time: "5\u5206\u524D", unread: 1, online: true, sortOrder: 2 },
        { name: "\u661F\u7A7A\u308A\u3093", avatar: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&h=100&fit=crop", lastMessage: "\u9451\u5B9A\u306E\u7D50\u679C\u3092DM\u3067\u304A\u9001\u308A\u3057\u307E\u3059\u306D", time: "12\u5206\u524D", unread: 0, online: false, sortOrder: 3 },
        { name: "\u5FC3\u7406\u58EB \u307F\u304F", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop", lastMessage: "\u304A\u6C17\u6301\u3061\u3092\u805E\u304B\u305B\u3066\u3044\u305F\u3060\u3044\u3066\u3042\u308A\u304C\u3068\u3046\u3054\u3056\u3044\u307E\u3059", time: "1\u6642\u9593\u524D", unread: 0, online: true, sortOrder: 4 },
        { name: "\u6599\u7406\u5BB6 \u306F\u308B\u304B", avatar: "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=100&h=100&fit=crop", lastMessage: "\u30EC\u30B7\u30D4\u3092\u9001\u308A\u307E\u3057\u305F\uFF01\u305C\u3072\u4F5C\u3063\u3066\u307F\u3066\u304F\u3060\u3055\u3044\u{1F373}", time: "3\u6642\u9593\u524D", unread: 0, online: false, sortOrder: 5 },
        { name: "\u30E9\u30A4\u30D5\u30B3\u30FC\u30C1 \u3051\u3093\u3058", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop", lastMessage: "\u76EE\u6A19\u8A2D\u5B9A\u30B7\u30FC\u30C8\u3092\u78BA\u8A8D\u3057\u307E\u3057\u305F\u3002\u7D20\u6674\u3089\u3057\u3044\u9032\u6357\u3067\u3059\uFF01", time: "\u6628\u65E5", unread: 0, online: false, sortOrder: 6 },
        { name: "\u30E8\u30AC\u8B1B\u5E2B \u306A\u306A", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop", lastMessage: "\u660E\u65E5\u306E\u30AF\u30E9\u30B9\u3082\u304A\u5F85\u3061\u3057\u3066\u3044\u307E\u3059", time: "\u6628\u65E5", unread: 0, online: false, sortOrder: 7 },
        { name: "\u5730\u4E0B\u30A2\u30A4\u30C9\u30EB\u754C\u9688", avatar: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=100&h=100&fit=crop", lastMessage: "\u3010\u304A\u77E5\u3089\u305B\u3011\u672C\u65E521:00\u304B\u3089\u30E9\u30A4\u30D6\u914D\u4FE1\u304C\u3042\u308A\u307E\u3059", time: "2\u65E5\u524D", unread: 0, online: false, sortOrder: 8 }
      ]);
    }
    const communityData = [
      { name: "\u5730\u4E0B\u30A2\u30A4\u30C9\u30EB\u754C\u9688", category: "idol" },
      { name: "\u304A\u7B11\u3044\u82B8\u4EBA\u754C\u9688", category: "idol" },
      { name: "\u30AD\u30E3\u30D0\u5B22\u30FB\u30DB\u30B9\u30C8\u754C\u9688", category: "idol" },
      { name: "JK\u65E5\u5E38\u754C\u9688", category: "idol" },
      { name: "\u30A2\u30A4\u30C9\u30EB\u90E8", category: "idol" },
      { name: "\u82F1\u4F1A\u8A71\u30AF\u30E9\u30D6", category: "english" },
      { name: "\u5360\u3044\u30B5\u30ED\u30F3", category: "fortune" },
      { name: "\u30D5\u30A3\u30C3\u30C8\u30CD\u30B9\u90E8", category: "coaching" },
      { name: "\u30AB\u30A6\u30F3\u30BB\u30EA\u30F3\u30B0\u30EB\u30FC\u30E0", category: "counselor" },
      { name: "\u6599\u7406\u6559\u5BA4", category: "cooking" }
    ];
    const existingComm = await db.select().from(communities);
    const existingCommNames = new Set(existingComm.map((c) => c.name));
    for (const { name, category } of communityData) {
      if (!existingCommNames.has(name)) {
        await db.insert(communities).values({
          name,
          members: 0,
          thumbnail: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=250&fit=crop",
          online: false,
          category
        });
        existingCommNames.add(name);
      }
    }
    const existingCreators = await db.select().from(creators);
    if (existingCreators.length >= 10) {
      return res.json({ ok: true, message: "Already seeded" });
    }
    const existingNames = new Set(existingCreators.map((c) => c.name));
    const demoCreators = [
      {
        name: "\u661F\u7A7A\u307F\u3086",
        community: "\u5730\u4E0B\u30A2\u30A4\u30C9\u30EB\u754C\u9688",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
        rank: 1,
        heatScore: 1090.1,
        totalViews: 185320,
        revenue: 173e3,
        streamCount: 34,
        followers: 48e3,
        revenueShare: 80,
        satisfactionScore: 4.5,
        attendanceRate: 4.3,
        bio: "\u5730\u4E0B\u30A2\u30A4\u30C9\u30EB\u754C\u9688\u306E\u30C8\u30C3\u30D7\u30E9\u30F3\u30AB\u30FC\u3002\u6B4C\u3068\u30C0\u30F3\u30B9\u3067\u6BCE\u56DE\u8996\u8074\u8005\u3092\u9B45\u4E86\u3059\u308B\u5B9F\u529B\u6D3E\u30E9\u30A4\u30D0\u30FC\u3002",
        category: "idol"
      },
      {
        name: "\u30B3\u30F3\u30D3\u82B8\u4EBA\u300C\u30C0\u30D6\u30EB\u30D1\u30F3\u30C1\u300D",
        community: "\u304A\u7B11\u3044\u82B8\u4EBA\u754C\u9688",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
        rank: 2,
        heatScore: 923.5,
        totalViews: 172450,
        revenue: 119e3,
        streamCount: 45,
        followers: 92e3,
        revenueShare: 80,
        satisfactionScore: 4.2,
        attendanceRate: 4.1,
        bio: "\u304A\u7B11\u3044\u30B3\u30F3\u30D3\u3068\u3057\u3066\u6D3B\u52D5\u4E2D\u3002\u30E9\u30A4\u30D6\u914D\u4FE1\u3067\u3082\u606F\u306E\u5408\u3063\u305F\u30C8\u30FC\u30AF\u3067\u7B11\u3044\u3092\u5C4A\u3051\u307E\u3059\u3002",
        category: "idol"
      },
      {
        name: "\u9E97\u83EF -REIKA-",
        community: "\u30AD\u30E3\u30D0\u5B22\u30FB\u30DB\u30B9\u30C8\u754C\u9688",
        avatar: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&h=100&fit=crop",
        rank: 3,
        heatScore: 1414,
        totalViews: 164800,
        revenue: 165e3,
        streamCount: 52,
        followers: 67e3,
        revenueShare: 80,
        satisfactionScore: 4.6,
        attendanceRate: 4.8,
        bio: "\u30AD\u30E3\u30D0\u5B22\xD7\u30E9\u30A4\u30D0\u30FC\u3068\u3057\u3066\u5927\u4EBA\u6C17\u3002\u30C8\u30FC\u30AF\u529B\u3068\u7F8E\u8C8C\u3067\u591A\u304F\u306E\u30D5\u30A1\u30F3\u3092\u7372\u5F97\u3002",
        category: "idol"
      },
      {
        name: "\u307E\u3044\u307E\u304417\u6B73",
        community: "JK\u65E5\u5E38\u754C\u9688",
        avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop",
        rank: 4,
        heatScore: 865.7,
        totalViews: 148900,
        revenue: 85500,
        streamCount: 68,
        followers: 52e3,
        revenueShare: 80,
        satisfactionScore: 4.3,
        attendanceRate: 4.5,
        bio: "JK\u306E\u30EA\u30A2\u30EB\u306A\u65E5\u5E38\u3092\u767A\u4FE1\u4E2D\u3002\u7D20\u6734\u3067\u89AA\u3057\u307F\u3084\u3059\u3044\u30AD\u30E3\u30E9\u304C\u4EBA\u6C17\u306E\u79D8\u5BC6\u3002",
        category: "idol"
      },
      {
        name: "\u685C\u4E95 \u307F\u306A\u307F",
        community: "\u30A2\u30A4\u30C9\u30EB\u90E8",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
        rank: 1,
        heatScore: 4.8,
        totalViews: 125e3,
        revenue: 98e4,
        streamCount: 87,
        followers: 15200,
        revenueShare: 80,
        satisfactionScore: 4.9,
        attendanceRate: 4.7,
        bio: "\u6BCE\u65E5\u5143\u6C17\u306B\u914D\u4FE1\u4E2D\uFF01\u307F\u3093\u306A\u3068\u4E00\u7DD2\u306B\u697D\u3057\u3044\u6642\u9593\u3092\u904E\u3054\u3057\u305F\u3044\u3067\u3059\u266A",
        category: "idol"
      },
      {
        name: "\u7530\u4E2D \u3086\u3046\u304D",
        community: "\u82F1\u4F1A\u8A71\u30AF\u30E9\u30D6",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
        rank: 2,
        heatScore: 4.6,
        totalViews: 89e3,
        revenue: 65e4,
        streamCount: 62,
        followers: 9800,
        revenueShare: 80,
        satisfactionScore: 4.7,
        attendanceRate: 4.5,
        bio: "TOEIC 990\u70B9\u53D6\u5F97\u3002\u30D3\u30B8\u30CD\u30B9\u82F1\u8A9E\u304B\u3089\u65E5\u5E38\u4F1A\u8A71\u307E\u3067\u4E01\u5BE7\u306B\u6559\u3048\u307E\u3059\uFF01",
        category: "english"
      },
      {
        name: "\u795E\u5D0E \u30EA\u30CA",
        community: "\u5360\u3044\u30B5\u30ED\u30F3",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
        rank: 3,
        heatScore: 4.5,
        totalViews: 73e3,
        revenue: 52e4,
        streamCount: 45,
        followers: 7600,
        revenueShare: 80,
        satisfactionScore: 4.6,
        attendanceRate: 4.3,
        bio: "\u30BF\u30ED\u30C3\u30C8\u30FB\u897F\u6D0B\u5360\u661F\u8853\u30FB\u6570\u79D8\u8853\u3092\u7D44\u307F\u5408\u308F\u305B\u305F\u72EC\u81EA\u306E\u30EA\u30FC\u30C7\u30A3\u30F3\u30B0\u3067\u3001\u3042\u306A\u305F\u306E\u672A\u6765\u3092\u7167\u3089\u3057\u307E\u3059\u3002",
        category: "fortune"
      },
      {
        name: "\u677E\u672C \u3053\u3046\u305F",
        community: "\u30D5\u30A3\u30C3\u30C8\u30CD\u30B9\u90E8",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop",
        rank: 4,
        heatScore: 4.3,
        totalViews: 58e3,
        revenue: 42e4,
        streamCount: 38,
        followers: 5400,
        revenueShare: 80,
        satisfactionScore: 4.4,
        attendanceRate: 4.8,
        bio: "\u5143\u30D7\u30ED\u30B5\u30C3\u30AB\u30FC\u9078\u624B\u3002\u30C0\u30A4\u30A8\u30C3\u30C8\u30FB\u7B4B\u30C8\u30EC\u30FB\u30E1\u30F3\u30BF\u30EB\u30B3\u30FC\u30C1\u30F3\u30B0\u3092\u5C02\u9580\u3068\u3059\u308B\u30D1\u30FC\u30BD\u30CA\u30EB\u30C8\u30EC\u30FC\u30CA\u30FC\u3002",
        category: "coaching"
      },
      {
        name: "\u4F0A\u85E4 \u3055\u3084\u304B",
        community: "\u30AB\u30A6\u30F3\u30BB\u30EA\u30F3\u30B0\u30EB\u30FC\u30E0",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop",
        rank: 5,
        heatScore: 4.7,
        totalViews: 41e3,
        revenue: 38e4,
        streamCount: 29,
        followers: 4200,
        revenueShare: 80,
        satisfactionScore: 4.8,
        attendanceRate: 4.9,
        bio: "\u81E8\u5E8A\u5FC3\u7406\u58EB\u30FB\u516C\u8A8D\u5FC3\u7406\u5E2B\u3002\u60A9\u307F\u3092\u62B1\u3048\u305F\u65B9\u306E\u8A71\u3092\u4E01\u5BE7\u306B\u8074\u304D\u3001\u4E00\u7DD2\u306B\u89E3\u6C7A\u7B56\u3092\u63A2\u3057\u307E\u3059\u3002",
        category: "counselor"
      },
      {
        name: "\u4E2D\u6751 \u3042\u304A\u3044",
        community: "\u6599\u7406\u6559\u5BA4",
        avatar: "https://images.unsplash.com/photo-1502767089025-6572583495b9?w=150&h=150&fit=crop",
        rank: 6,
        heatScore: 4.4,
        totalViews: 33e3,
        revenue: 29e4,
        streamCount: 24,
        followers: 3100,
        revenueShare: 80,
        satisfactionScore: 4.5,
        attendanceRate: 4.6,
        bio: "\u30D5\u30E9\u30F3\u30B9\u6599\u7406\u5B66\u6821\u5352\u696D\u3002\u5BB6\u5EAD\u3067\u672C\u683C\u7684\u306A\u30EC\u30B7\u30D4\u3092\u697D\u3057\u304F\u5B66\u3079\u308B\u6599\u7406\u6559\u5BA4\u3092\u958B\u50AC\u4E2D\u3002",
        category: "cooking"
      }
    ];
    const toInsert = demoCreators.filter((c) => !existingNames.has(c.name));
    if (toInsert.length === 0) {
      return res.json({ ok: true, message: "Already seeded" });
    }
    const insertedCreators = await db.insert(creators).values(toInsert).returning();
    const today = /* @__PURE__ */ new Date();
    const availData = [];
    for (const c of insertedCreators) {
      for (let d = 0; d < 7; d++) {
        const dt = new Date(today);
        dt.setDate(today.getDate() + d);
        const dateStr = dt.toISOString().slice(0, 10);
        availData.push({ liverId: c.id, date: dateStr, startTime: "19:00", endTime: "21:00", maxSlots: 3, bookedSlots: Math.floor(Math.random() * 2), note: "" });
        if (d % 2 === 0) {
          availData.push({ liverId: c.id, date: dateStr, startTime: "13:00", endTime: "15:00", maxSlots: 2, bookedSlots: 0, note: "\u5348\u5F8C\u306E\u90E8" });
        }
      }
    }
    await db.insert(liverAvailability).values(availData);
    const reviewAuthors = [
      { name: "\u3086\u304D", avatar: "https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=80&h=80&fit=crop" },
      { name: "\u305F\u304B\u3057", avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=80&h=80&fit=crop" },
      { name: "\u306F\u308B\u304B", avatar: "https://images.unsplash.com/photo-1554151228-14d9def656e4?w=80&h=80&fit=crop" },
      { name: "\u3051\u3093\u3058", avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=80&h=80&fit=crop" }
    ];
    const comments = [
      "\u3068\u3066\u3082\u697D\u3057\u3044\u6642\u9593\u3067\u3057\u305F\uFF01\u307E\u305F\u4E88\u7D04\u3057\u305F\u3044\u3067\u3059\u3002",
      "\u4E01\u5BE7\u306A\u5BFE\u5FDC\u3067\u5927\u6E80\u8DB3\u3067\u3059\u3002\u30B9\u30B1\u30B8\u30E5\u30FC\u30EB\u901A\u308A\u306B\u9032\u3093\u3067\u304F\u308C\u307E\u3057\u305F\u3002",
      "\u7D20\u6674\u3089\u3057\u3044\u914D\u4FE1\u3067\u3057\u305F\u3002\u307E\u305F\u53C2\u52A0\u3057\u305F\u3044\u3068\u601D\u3044\u307E\u3059\uFF01",
      "\u671F\u5F85\u4EE5\u4E0A\u306E\u5185\u5BB9\u3067\u3057\u305F\u3002\u6BCE\u56DE\u6765\u308B\u306E\u304C\u697D\u3057\u307F\u3067\u3059\u3002",
      "\u6642\u9593\u3092\u5B88\u3063\u3066\u304F\u308C\u3066\u4FE1\u983C\u3067\u304D\u307E\u3059\u3002\u6B21\u56DE\u3082\u4E88\u7D04\u3057\u307E\u3059\uFF01"
    ];
    const reviewData = [];
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
          sessionDate: dt.toISOString().slice(0, 10)
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
        const labels = ["\u30A2\u30A4\u30C9\u30EB", "\u82F1\u4F1A\u8A71", "\u5360\u3044", "\u30B3\u30FC\u30C1\u30F3\u30B0", "\u30AB\u30A6\u30F3\u30BB\u30E9\u30FC"];
        const prices = [3e3, 5e3, 4e3, 6e3, 4500];
        const cat = categories[i % categories.length];
        return {
          creator: c.name,
          category: cat,
          categoryLabel: labels[i % labels.length],
          title: `${c.name}\u3068\u306E1\u5BFE1\u30BB\u30C3\u30B7\u30E7\u30F3`,
          avatar: c.avatar,
          thumbnail: `https://images.unsplash.com/photo-151645036045${i}-9312f5e86fc7?w=400&h=250&fit=crop`,
          date: dt.toISOString().slice(0, 10),
          time: "19:00",
          duration: "30\u5206",
          price: prices[i % prices.length],
          spotsTotal: 5,
          spotsLeft: 2 + i,
          rating: parseFloat((4.3 + Math.random() * 0.7).toFixed(1)),
          reviewCount: 10 + i * 5,
          tag: i === 0 ? "\u4EBA\u6C17" : null
        };
      });
      await db.insert(bookingSessions).values(bookingData);
    }
    const existingLive = await db.select().from(liveStreams);
    if (existingLive.length === 0) {
      await db.insert(liveStreams).values([
        { title: "\u661F\u7A7A\u307F\u3086\u266A \u6B4C\u3068\u30C0\u30F3\u30B9\u3067\u304A\u5C4A\u3051\uFF01", creator: "\u661F\u7A7A\u307F\u3086", community: "\u5730\u4E0B\u30A2\u30A4\u30C9\u30EB\u754C\u9688", viewers: 1240, thumbnail: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&h=200&fit=crop", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop", timeAgo: "\u914D\u4FE1\u4E88\u5B9A", isLive: true },
        { title: "\u9E97\u83EF\u306E\u591C\u30C8\u30FC\u30AF\u3010\u672C\u97F3\u3067\u8A9E\u308B\u3088\u3011", creator: "\u9E97\u83EF -REIKA-", community: "\u30AD\u30E3\u30D0\u5B22\u30FB\u30DB\u30B9\u30C8\u754C\u9688", viewers: 890, thumbnail: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300&h=200&fit=crop", avatar: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=40&h=40&fit=crop", timeAgo: "\u914D\u4FE1\u4E88\u5B9A", isLive: true },
        { title: "\u671D\u6D3B\uFF01\u4E00\u7DD2\u306B\u30E8\u30AC\u3057\u3088\u3046", creator: "\u677E\u672C \u3053\u3046\u305F", community: "\u30D5\u30A3\u30C3\u30C8\u30CD\u30B9\u90E8", viewers: 420, thumbnail: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=200&fit=crop", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop", timeAgo: "\u914D\u4FE1\u4E88\u5B9A", isLive: true },
        { title: "\u795E\u5D0E\u30EA\u30CA\u3010\u6DF1\u591C\u306E\u5360\u3044\u30BF\u30A4\u30E0\u3011", creator: "\u795E\u5D0E \u30EA\u30CA", community: "\u5360\u3044\u30B5\u30ED\u30F3", viewers: 312, thumbnail: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=200&fit=crop", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop", timeAgo: "\u914D\u4FE1\u4E88\u5B9A", isLive: true }
      ]);
    }
    res.json({ ok: true, created: insertedCreators.length });
  });
  app2.post("/api/seed-editors", async (_req, res) => {
    const existing = await db.select().from(videoEditors);
    if (existing.length >= 5) {
      return res.json({ ok: true, message: "Already seeded" });
    }
    const [idolCommunity] = await db.select({ id: communities.id }).from(communities).where(eq2(communities.name, "\u5730\u4E0B\u30A2\u30A4\u30C9\u30EB\u754C\u9688"));
    const defaultCommunityId = idolCommunity?.id ?? 1;
    const demoEditors = [
      {
        name: "\u6620\u50CF\u7DE8\u96C6\u30DE\u30F3",
        avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&h=150&fit=crop",
        bio: "\u30C6\u30ED\u30C3\u30D7\u30FB\u30AB\u30C3\u30C8\u30FB\u30B5\u30E0\u30CD\u307E\u3067\u30EF\u30F3\u30B9\u30C8\u30C3\u30D7\u3067\u5BFE\u5FDC\u3059\u308B\u52D5\u753B\u7DE8\u96C6\u30AF\u30EA\u30A8\u30A4\u30BF\u30FC\u3002",
        communityId: defaultCommunityId,
        genres: "YouTube,\u30D0\u30E9\u30A8\u30C6\u30A3,\u30B2\u30FC\u30E0",
        deliveryDays: 3,
        priceType: "per_minute",
        pricePerMinute: 1500,
        revenueSharePercent: null,
        rating: 4.9,
        reviewCount: 128,
        isAvailable: true
      },
      {
        name: "\u30B7\u30CD\u30DE\u7DE8\u96C6\u30B9\u30BF\u30B8\u30AA",
        avatar: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=150&h=150&fit=crop",
        bio: "\u6620\u753B\u98A8\u306E\u30B7\u30CD\u30DE\u30C6\u30A3\u30C3\u30AF\u306AMV\u5236\u4F5C\u304C\u5F97\u610F\u3067\u3059\u3002",
        communityId: defaultCommunityId,
        genres: "MV,\u30A2\u30FC\u30C6\u30A3\u30B9\u30C8,\u30B7\u30CD\u30DE\u30C6\u30A3\u30C3\u30AF",
        deliveryDays: 7,
        priceType: "revenue_share",
        pricePerMinute: null,
        revenueSharePercent: 40,
        rating: 4.8,
        reviewCount: 76,
        isAvailable: false
      },
      {
        name: "\u30B7\u30E7\u30FC\u30C8\u52D5\u753B\u8077\u4EBA",
        avatar: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=150&h=150&fit=crop",
        bio: "TikTok\u30FBYouTube\u30B7\u30E7\u30FC\u30C8\u306E\u4F38\u3073\u308B\u69CB\u6210\u3092\u63D0\u6848\u3057\u307E\u3059\u3002",
        communityId: defaultCommunityId,
        genres: "\u30B7\u30E7\u30FC\u30C8\u52D5\u753B,\u7E26\u578B,SNS\u904B\u7528",
        deliveryDays: 2,
        priceType: "per_minute",
        pricePerMinute: 2e3,
        revenueSharePercent: null,
        rating: 5,
        reviewCount: 54,
        isAvailable: true
      },
      {
        name: "\u30B2\u30FC\u30E0\u5B9F\u6CC1\u30A8\u30C7\u30A3\u30BF\u30FC",
        avatar: "https://images.unsplash.com/photo-1533236897111-3e94666b2dde?w=150&h=150&fit=crop",
        bio: "APEX/VALORANT\u306A\u3069FPS\u7CFB\u5B9F\u6CC1\u306E\u7DE8\u96C6\u304C\u4E2D\u5FC3\u3067\u3059\u3002",
        communityId: defaultCommunityId,
        genres: "\u30B2\u30FC\u30E0\u5B9F\u6CC1,FPS,\u5207\u308A\u629C\u304D",
        deliveryDays: 4,
        priceType: "per_minute",
        pricePerMinute: 1200,
        revenueSharePercent: null,
        rating: 4.6,
        reviewCount: 90,
        isAvailable: false
      },
      {
        name: "\u6559\u80B2\u30C1\u30E3\u30F3\u30CD\u30EB\u7DE8\u96C6\u5BA4",
        avatar: "https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?w=150&h=150&fit=crop",
        bio: "\u30D3\u30B8\u30CD\u30B9\u30FB\u6559\u80B2\u7CFB\u306E\u5206\u304B\u308A\u3084\u3059\u3044\u56F3\u89E3\u52D5\u753B\u3092\u5236\u4F5C\u3057\u307E\u3059\u3002",
        communityId: defaultCommunityId,
        genres: "\u30D3\u30B8\u30CD\u30B9,\u6559\u80B2,\u30BB\u30DF\u30CA\u30FC",
        deliveryDays: 5,
        priceType: "revenue_share",
        pricePerMinute: null,
        revenueSharePercent: 30,
        rating: 4.7,
        reviewCount: 33,
        isAvailable: true
      }
    ];
    await db.insert(videoEditors).values(demoEditors);
    res.json({ ok: true, count: demoEditors.length });
  });
}

// server/middleware.ts
import express from "express";
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origin = req.header("origin");
    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, "");
    const isLocalhost = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    const isAllowedOrigin = origin && isLocalhost || origin && frontendUrl && origin === frontendUrl;
    if (isAllowedOrigin && origin) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false }));
}
var log = console.log;
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path2 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path2.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
}

// server/index.ts
import * as fs from "fs";
import * as path from "path";
import { createProxyMiddleware } from "http-proxy-middleware";
var app = express2();
var log2 = console.log;
app.get("/healthcheck", (_req, res) => res.status(200).send("OK"));
app.get("/api/healthcheck", (_req, res) => res.status(200).send("OK"));
function serveExpoManifest(platform, res) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function configureExpoAndLanding(app2) {
  const isDev = process.env.NODE_ENV === "development";
  log2("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      if (req.path === "/" || req.path === "/manifest") {
        return serveExpoManifest(platform, res);
      }
    }
    next();
  });
  if (isDev) {
    const expoDevPort = 8081;
    log2(`Dev mode: proxying web requests to Expo dev server on port ${expoDevPort}`);
    const expoProxy = createProxyMiddleware({
      target: `http://localhost:${expoDevPort}`,
      changeOrigin: true,
      ws: true,
      on: {
        error: (_err, _req, res) => {
          const r = res;
          if (r && typeof r.status === "function") {
            r.status(502).send("Expo dev server not ready yet. Please wait a moment and refresh.");
          }
        }
      }
    });
    app2.use((req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      const platform = req.header("expo-platform");
      if (platform && (platform === "ios" || platform === "android")) return next();
      return expoProxy(req, res, next);
    });
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      log2(`Serving Expo web export from: ${distPath}`);
      app2.use(express2.static(distPath));
      app2.use((req, res, next) => {
        if (req.path.startsWith("/api")) return next();
        const indexPath = path.join(distPath, "index.html");
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          next();
        }
      });
    } else {
      log2("WARNING: dist/ directory not found. Run 'npx expo export --platform web' to build.");
      app2.use((req, res, next) => {
        if (req.path.startsWith("/api")) return next();
        res.status(404).send("Web app not built. Please run the build command.");
      });
    }
  }
  log2("Expo routing: Checking expo-platform header on / and /manifest");
}
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);
  await registerRoutes(app);
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  const server = createServer(app);
  server.listen(
    {
      port,
      host: "0.0.0.0"
    },
    () => {
      log2(`express server serving on port ${port}`);
    }
  );
})();
