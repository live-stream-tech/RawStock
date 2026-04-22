var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import "dotenv/config";

// server/aws-sdk-env.ts
if (!process.env.AWS_REQUEST_CHECKSUM_CALCULATION) {
  process.env.AWS_REQUEST_CHECKSUM_CALCULATION = "WHEN_REQUIRED";
}
if (!process.env.AWS_RESPONSE_CHECKSUM_VALIDATION) {
  process.env.AWS_RESPONSE_CHECKSUM_VALIDATION = "WHEN_REQUIRED";
}

// server/index.ts
import express2 from "express";
import { createServer } from "node:http";

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// server/schema.ts
var schema_exports = {};
__export(schema_exports, {
  TICKET_PACKS: () => TICKET_PACKS,
  TRANSACTION_STATUSES: () => TRANSACTION_STATUSES,
  USER_ROLES: () => USER_ROLES,
  VIDEO_VISIBILITY: () => VIDEO_VISIBILITY,
  aiEditJobs: () => aiEditJobs,
  announcements: () => announcements,
  bannerAds: () => bannerAds,
  bookingSessions: () => bookingSessions,
  coinBalances: () => coinBalances,
  coinTransactions: () => coinTransactions,
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
  creatorLevelThresholds: () => creatorLevelThresholds,
  creatorMonthlyScores: () => creatorMonthlyScores,
  creators: () => creators,
  dailyLogins: () => dailyLogins,
  dmConversationMessages: () => dmConversationMessages,
  dmMessages: () => dmMessages,
  dmThreadMessages: () => dmThreadMessages,
  dmThreads: () => dmThreads,
  earnings: () => earnings,
  editingRequests: () => editingRequests,
  genreAds: () => genreAds,
  genreOwners: () => genreOwners,
  jukeboxChat: () => jukeboxChat,
  jukeboxQueue: () => jukeboxQueue,
  jukeboxRequestCounts: () => jukeboxRequestCounts,
  jukeboxState: () => jukeboxState,
  liveStreamChat: () => liveStreamChat,
  liveStreams: () => liveStreams,
  liverAvailability: () => liverAvailability,
  liverReviews: () => liverReviews,
  mentorBookings: () => mentorBookings,
  mentorSessions: () => mentorSessions,
  notifications: () => notifications,
  phoneVerifications: () => phoneVerifications,
  reports: () => reports,
  savedVideos: () => savedVideos,
  streamPaidAccess: () => streamPaidAccess,
  streams: () => streams,
  ticketBalances: () => ticketBalances,
  ticketTransactions: () => ticketTransactions,
  transactions: () => transactions,
  translationGlossary: () => translationGlossary,
  translations: () => translations,
  twoShotReservations: () => twoShotReservations,
  userFollows: () => userFollows,
  users: () => users,
  videoComments: () => videoComments,
  videoEditRequests: () => videoEditRequests,
  videoEditors: () => videoEditors,
  videos: () => videos,
  wallets: () => wallets,
  withdrawals: () => withdrawals
});
import { sql } from "drizzle-orm";
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
  ownerId: integer("owner_id"),
  /** RawStock 公式ハブ（一覧で先頭固定・`reset-official-communities` が true にする） */
  isOfficial: boolean("is_official").notNull().default(false),
  /** 広告収益分配設定（JSON: { userId: 比率% }。管理人+モデレーター間の70%分配内訳） */
  revenueDistribution: text("revenue_distribution")
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
  linkUrl: text("link_url"),
  // クリック先URL
  startDate: text("start_date").notNull(),
  // YYYY-MM-DD
  endDate: text("end_date").notNull(),
  dailyRate: integer("daily_rate").notNull(),
  totalAmount: integer("total_amount").notNull(),
  /** 予約時点のメンバー数（料金固定のため記録） */
  memberCountAtBooking: integer("member_count_at_booking").notNull().default(0),
  /** 料金規約への同意 */
  agreedToTerms: boolean("agreed_to_terms").notNull().default(false),
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
  linkUrl: text("link_url"),
  // クリック先URL
  startDate: text("start_date").notNull(),
  // YYYY-MM-DD
  endDate: text("end_date").notNull(),
  dailyRate: integer("daily_rate").notNull(),
  totalAmount: integer("total_amount").notNull(),
  /** 予約時点のジャンル内総メンバー数（料金固定のため記録） */
  memberCountAtBooking: integer("member_count_at_booking").notNull().default(0),
  /** 料金規約への同意 */
  agreedToTerms: boolean("agreed_to_terms").notNull().default(false),
  status: text("status").notNull().default("pending"),
  // pending | approved | rejected
  createdAt: timestamp("created_at").defaultNow()
});
var genreOwners = pgTable("genre_owners", {
  id: serial("id").primaryKey(),
  genreId: text("genre_id").notNull().unique(),
  ownerUserId: integer("owner_user_id").notNull(),
  // users.id
  /** 就任の基準となったコミュニティID（最大メンバー数） */
  assignedCommunityId: integer("assigned_community_id"),
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
  youtubeId: text("youtube_id"),
  /** 投稿タイプ: daily=日常投稿（手軽・容量制限あり）, work=作品（記事+写真無料、動画価格設定可、ランキング対象） */
  postType: text("post_type").notNull().default("daily")
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
  /** WHEP 視聴用（playback）URL */
  webRtcUrl: text("webrtc_url").notNull(),
  rtmpsUrl: text("rtmps_url").notNull(),
  rtmpsStreamKey: text("rtmps_stream_key").notNull(),
  currentViewers: integer("current_viewers").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  title: text("title"),
  hostUserId: integer("host_user_id"),
  isLive: boolean("is_live").notNull().default(false),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  /** WHIP 配信（publish）URL */
  whipUrl: text("whip_url"),
  /** public | followers | community */
  visibility: text("visibility").notNull().default("public"),
  /** visibility=paid のときのチケット価格（1 ticket = $0.01） */
  ticketPrice: integer("ticket_price"),
  /** visibility=community のとき、視聴に必要なコミュニティ */
  restrictedCommunityId: integer("restricted_community_id")
});
var streamPaidAccess = pgTable("stream_paid_access", {
  id: serial("id").primaryKey(),
  streamId: integer("stream_id").notNull(),
  viewerUserId: integer("viewer_user_id").notNull(),
  ticketAmount: integer("ticket_amount").notNull(),
  ticketTransactionId: integer("ticket_transaction_id"),
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
  currentLevel: integer("current_level").notNull().default(1),
  bio: text("bio").notNull().default(""),
  category: text("category").notNull().default("idol")
});
var creatorLevelThresholds = pgTable("creator_level_thresholds", {
  id: serial("id").primaryKey(),
  level: integer("level").notNull().unique(),
  requiredTipGross: integer("required_tip_gross").notNull().default(0),
  requiredStreamCount: integer("required_stream_count").notNull().default(0),
  tipBackRate: real("tip_back_rate").notNull().default(0.5),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var creatorMonthlyScores = pgTable(
  "creator_monthly_scores",
  {
    id: serial("id").primaryKey(),
    creatorId: integer("creator_id").notNull(),
    yearMonth: text("year_month").notNull(),
    // YYYY-MM
    tipGross: integer("tip_gross").notNull().default(0),
    paidLiveGross: integer("paid_live_gross").notNull().default(0),
    streamCountMonthly: integer("stream_count_monthly").notNull().default(0),
    avgSatisfaction: real("avg_satisfaction").notNull().default(0),
    compositeScore: real("composite_score").notNull().default(0),
    startRank: integer("start_rank"),
    rankOverall: integer("rank_overall"),
    rankPaidLive: integer("rank_paid_live"),
    nextStartRank: integer("next_start_rank"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (t) => [unique().on(t.creatorId, t.yearMonth)]
);
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
var dmThreads = pgTable(
  "dm_threads",
  {
    id: serial("id").primaryKey(),
    user1Id: integer("user_1_id").notNull(),
    user2Id: integer("user_2_id").notNull(),
    lastMessagePreview: text("last_message_preview"),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (t) => [unique().on(t.user1Id, t.user2Id)]
);
var dmThreadMessages = pgTable("dm_thread_messages", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull(),
  senderUserId: integer("sender_user_id").notNull(),
  text: text("text").notNull(),
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
  addedBy: text("added_by").notNull().default("You"),
  addedByAvatar: text("added_by_avatar"),
  /** 追加したログインユーザー（未ログイン・旧データは NULL） */
  addedByUserId: integer("added_by_user_id"),
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
  /** 認証プロバイダキー（Googleユーザー: "google:{sub}"、メール登録: "email:{email}"） */
  lineId: text("line_id").notNull().unique(),
  displayName: text("display_name").notNull().default("User"),
  profileImageUrl: text("profile_image_url"),
  role: text("role").notNull().default("USER"),
  isBanned: boolean("is_banned").notNull().default(false),
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
  // migrations/0012_users_payout_terms_agreed_at.sql
  /** クリエイター払い出し条項への同意日時（初回 Stripe Connect 前に記録） */
  payoutTermsAgreedAt: timestamp("payout_terms_agreed_at"),
  /** Google OAuth（YouTube プレイリスト用）。Googleログインユーザーのみ */
  googleRefreshToken: text("google_refresh_token"),
  googleAccessToken: text("google_access_token"),
  googleTokenExpiresAt: timestamp("google_token_expires_at"),
  /** エニアグラム9型スコア（JSON配列 [1-9]） */
  enneagramScores: text("enneagram_scores"),
  /** プロフィールに表示する厳選コミュニティ4つ（JSON配列 [communityId, ...]） */
  pinnedCommunityIds: text("pinned_community_ids"),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  welcomeDmSentAt: timestamp("welcome_dm_sent_at"),
  /** 運営DM（Operations Team）を初めて開いた日時。未設定かつ welcome 済みなら一覧に未読バッジ */
  operationsDmOpenedAt: timestamp("operations_dm_opened_at"),
  // migrations/0014_users_last_content_lang.sql — franc による直近コンテンツ言語（ISO 639-1、例: ja, en）
  lastContentLang: text("last_content_lang"),
  // migrations/0015_users_policy_acceptance.sql — 条項・プライバシー同意の版と日時（constants/legalVersions と対応）
  termsAcceptedVersion: text("terms_accepted_version"),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  privacyAcceptedVersion: text("privacy_accepted_version"),
  privacyAcceptedAt: timestamp("privacy_accepted_at"),
  // migrations/0022_users_preferred_language.sql — UI・自動翻訳宛先言語（ISO 639-1）。
  // 注意: lastContentLang は franc 検知結果。preferredLanguage はユーザーの明示選択で別物。
  preferredLanguage: text("preferred_language"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var translations = pgTable(
  "translations",
  {
    id: serial("id").primaryKey(),
    srcLang: text("src_lang").notNull(),
    dstLang: text("dst_lang").notNull(),
    /** sha256(normalize(source_text)) の hex */
    textHash: text("text_hash").notNull(),
    sourceText: text("source_text").notNull(),
    translatedText: text("translated_text").notNull(),
    engine: text("engine").notNull().default("mymemory"),
    createdAt: timestamp("created_at").defaultNow()
  },
  (t) => [unique("translations_unique_idx").on(t.srcLang, t.dstLang, t.textHash)]
);
var translationGlossary = pgTable(
  "translation_glossary",
  {
    id: serial("id").primaryKey(),
    term: text("term").notNull(),
    /** '*' で全 locale 共通 */
    locale: text("locale").notNull().default("*"),
    doNotTranslate: boolean("do_not_translate").notNull().default(true),
    overrideTranslation: text("override_translation"),
    scope: text("scope").notNull().default("global"),
    createdAt: timestamp("created_at").defaultNow()
  },
  (t) => [unique("translation_glossary_term_locale_idx").on(t.term, t.locale)]
);
var userFollows = pgTable(
  "user_follows",
  {
    id: serial("id").primaryKey(),
    followerId: integer("follower_id").notNull(),
    followingId: integer("following_id").notNull(),
    createdAt: timestamp("created_at").defaultNow()
  },
  (t) => [unique().on(t.followerId, t.followingId)]
);
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
  currency: text("currency").notNull().default("USD"),
  updatedAt: timestamp("updated_at").defaultNow()
});
var TRANSACTION_STATUSES = ["PENDING", "SETTLED", "CANCELLED"];
var transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").notNull(),
  amount: integer("amount").notNull(),
  source: text("source").notNull().default("tip"),
  // tip | paid_live | mentor
  grossAmount: integer("gross_amount").notNull().default(0),
  backRate: real("back_rate").notNull().default(1),
  netAmount: integer("net_amount").notNull().default(0),
  creatorId: integer("creator_id"),
  yearMonth: text("year_month"),
  // YYYY-MM
  type: text("type").notNull(),
  // 'tip' | 'gift' | 'mentor' | 'banner_ad' | 'payout' | 'revenue_share' | 'REVENUE' 等
  status: text("status").notNull().default("PENDING"),
  // PENDING | SETTLED | CANCELLED
  referenceId: text("reference_id"),
  settledAt: timestamp("settled_at"),
  createdAt: timestamp("created_at").defaultNow()
});
var videoEditors = pgTable("video_editors", {
  id: serial("id").primaryKey(),
  /** 登録ユーザー（NULL = シード等の匿名行） */
  userId: integer("user_id").unique(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  bio: text("bio").notNull().default(""),
  communityId: integer("community_id").notNull(),
  genres: text("genres").notNull().default(""),
  deliveryDays: integer("delivery_days").notNull().default(3),
  /** per_minute | revenue_share | both (both requires pricePerMinute and revenueSharePercent) */
  priceType: text("price_type").notNull(),
  /** RawStock Tickets per minute when priceType is per_minute (1 ticket = $0.01 USD); not JPY */
  pricePerMinute: integer("price_per_minute"),
  revenueSharePercent: integer("revenue_share_percent"),
  /** Style tag slugs for OR search (overlap with query tags) */
  styleTags: text("style_tags").array().notNull().default(sql`'{}'::text[]`),
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
  accountType: text("account_type").notNull().default("Checking"),
  accountNumber: text("account_number").notNull(),
  accountName: text("account_name").notNull(),
  note: text("note"),
  requestedAt: timestamp("requested_at").defaultNow(),
  processedAt: timestamp("processed_at")
});
var mentorSessions = pgTable("mentor_sessions", {
  id: serial("id").primaryKey(),
  /** セッションを提供するクリエイター (users.id) */
  creatorId: integer("creator_id").notNull(),
  title: text("title").notNull(),
  category: text("category").notNull().default("other"),
  description: text("description").notNull().default(""),
  /** チケット価格 */
  price: integer("price").notNull(),
  /** セッション時間（分） */
  duration: integer("duration").notNull().default(30),
  /** 同時参加可能人数 */
  maxParticipants: integer("max_participants").notNull().default(1),
  /** false = 非表示（物理削除しない） */
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var mentorBookings = pgTable("mentor_bookings", {
  id: serial("id").primaryKey(),
  /** 新モデル: mentor_sessions.id への参照 */
  sessionId: integer("session_id"),
  /** 旧モデル互換: live_streams.id */
  streamId: integer("stream_id"),
  userId: text("user_id").notNull().default("guest"),
  userName: text("user_name").notNull(),
  userAvatar: text("user_avatar"),
  /** 予約日時（新モデル用） */
  scheduledAt: timestamp("scheduled_at"),
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  price: integer("price").notNull(),
  status: text("status").notNull().default("pending"),
  queuePosition: integer("queue_position").notNull().default(0),
  /** ビデオ通話 WHIP URL（配信者側）*/
  whipUrl: text("whip_url"),
  /** ビデオ通話 WHEP URL（視聴者側）*/
  whepUrl: text("whep_url"),
  /** Cloudflare Stream の uid */
  cfStreamUid: text("cf_stream_uid"),
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
var TICKET_PACKS = [
  { id: "pack-100", tickets: 100, priceUSD: 100, label: "100 Tickets", bonus: null },
  { id: "pack-500", tickets: 500, priceUSD: 500, label: "500 Tickets", bonus: null },
  { id: "pack-1200", tickets: 1200, priceUSD: 1200, label: "1,200 Tickets", bonus: null },
  { id: "pack-3000", tickets: 3e3, priceUSD: 3e3, label: "3,000 Tickets", bonus: null }
];
var ticketBalances = pgTable("ticket_balances", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  balance: integer("balance").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow()
});
var ticketTransactions = pgTable("ticket_transactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  /** Positive = credit, negative = debit */
  amount: integer("amount").notNull(),
  type: text("type").notNull(),
  /** Stripe session ID for purchases, queue/booking ID for spending */
  referenceId: text("reference_id"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow()
});
var coinBalances = pgTable("coin_balances", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  balance: integer("balance").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow()
});
var coinTransactions = pgTable("coin_transactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  /** Positive = credit, negative = debit */
  amount: integer("amount").notNull(),
  type: text("type").notNull(),
  // purchase | spend_jukebox | revenue_convert | refund
  /** Stripe Payment Intent ID for purchases, jukebox queue item ID for spending */
  referenceId: text("reference_id"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow()
});
var jukeboxRequestCounts = pgTable("jukebox_request_counts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  communityId: integer("community_id").notNull(),
  /** Date in YYYY-MM-DD format (UTC) */
  date: text("date").notNull(),
  count: integer("count").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow()
});
var bannerAds = pgTable("banner_ads", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var dailyLogins = pgTable("daily_logins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(),
  // YYYY-MM-DD (UTC)
  createdAt: timestamp("created_at").defaultNow()
});
var aiEditJobs = pgTable("ai_edit_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  videoUrl: text("video_url").notNull().default(""),
  prompt: text("prompt").notNull(),
  status: text("status").notNull().default("pending"),
  // pending | processing | completed | failed | approved | rendering | delivered
  result: text("result"),
  // JSON string of EDL
  // Enhanced AI Edit fields (v2)
  planMinutes: integer("plan_minutes"),
  // 15 | 30 | 45 | 60
  videoUrls: text("video_urls"),
  // JSON array of R2 URLs
  logoUrl: text("logo_url"),
  telop: text("telop"),
  targetAudience: text("target_audience"),
  tone: text("tone"),
  revisionCount: integer("revision_count").notNull().default(0),
  ticketCost: integer("ticket_cost"),
  /** RawStockVideoSpec の JSON（オーダー DSL。クライアント正規化済み） */
  videoSpec: text("video_spec"),
  /** Templated.io レンダー ID（Create Render 応答の id） */
  templatedRenderId: text("templated_render_id"),
  // Delivery fields — set by the editor when the finished video is uploaded
  deliveredUrl: text("delivered_url"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var editingRequests = pgTable("editing_requests", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  /** URL or note about the raw footage */
  videoUrl: text("video_url"),
  /** Date of the live performance / event */
  performanceDate: text("performance_date"),
  /** Special instructions from the creator */
  instructions: text("instructions"),
  /** Ticket fee deducted at request time */
  ticketFee: integer("ticket_fee").notNull().default(200),
  /** ticketTransactions reference ID */
  ticketTransactionId: text("ticket_transaction_id"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var twoShotReservations = pgTable("two_shot_reservations", {
  id: serial("id").primaryKey(),
  hostUserId: integer("host_user_id").notNull(),
  guestUserId: integer("guest_user_id").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  /** PENDING | CONFIRMED | COMPLETED */
  status: text("status").notNull().default("PENDING"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  /** Cloudflare Stream 等のキー（後続ステップで設定） */
  streamKey: text("stream_key"),
  /** 仮枠識別子（例: hostId-slot-1） */
  slotKey: text("slot_key"),
  createdAt: timestamp("created_at").defaultNow()
});

// server/db.ts
var pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
var db = drizzle(pool, { schema: schema_exports });

// server/routes.ts
import {
  eq as eq5,
  asc as asc3,
  desc,
  count,
  sql as sql3,
  and as and5,
  or,
  gte as gte2,
  lte as lte2,
  isNull,
  inArray,
  isNotNull
} from "drizzle-orm";

// server/editorPricing.ts
function validateEditorPricing(row) {
  const pt = row.priceType;
  if (pt !== "per_minute" && pt !== "revenue_share" && pt !== "both") {
    return { ok: false, error: "\u4E0D\u6B63\u306A\u6599\u91D1\u5F62\u5F0F\u3067\u3059" };
  }
  const pm = row.pricePerMinute ?? null;
  const rs = row.revenueSharePercent ?? null;
  if (pt === "per_minute") {
    if (pm == null || !Number.isInteger(pm) || pm <= 0) {
      return { ok: false, error: "\u5206\u5358\u4FA1\uFF08\u{1F3AB}/\u5206\uFF09\u3092\u6B63\u306E\u6574\u6570\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044" };
    }
    if (rs != null) {
      return { ok: false, error: "\u5206\u5358\u4FA1\u30E2\u30FC\u30C9\u3067\u306F\u30EC\u30D9\u30CB\u30E5\u30FC\u30B7\u30A7\u30A2\uFF05\u306F\u6307\u5B9A\u3067\u304D\u307E\u305B\u3093" };
    }
  } else if (pt === "revenue_share") {
    if (rs == null || !Number.isInteger(rs) || rs < 1 || rs > 100) {
      return { ok: false, error: "\u30AF\u30EA\u30A8\u30A4\u30BF\u30FC\u53D6\u308A\u5206\u306F1\u301C100\u306E\u6574\u6570\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044" };
    }
    if (pm != null) {
      return { ok: false, error: "\u30EC\u30D9\u30CB\u30E5\u30FC\u30B7\u30A7\u30A2\u30E2\u30FC\u30C9\u3067\u306F\u5206\u5358\u4FA1\u306F\u6307\u5B9A\u3067\u304D\u307E\u305B\u3093" };
    }
  } else {
    if (pm == null || !Number.isInteger(pm) || pm <= 0) {
      return { ok: false, error: "both \u3067\u306F\u5206\u5358\u4FA1\uFF08\u{1F3AB}/\u5206\uFF09\u304C\u5FC5\u9808\u3067\u3059" };
    }
    if (rs == null || !Number.isInteger(rs) || rs < 1 || rs > 100) {
      return { ok: false, error: "both \u3067\u306F\u30AF\u30EA\u30A8\u30A4\u30BF\u30FC\u53D6\u308A\u5206\uFF081\u301C100\uFF09\u304C\u5FC5\u9808\u3067\u3059" };
    }
  }
  return { ok: true };
}
function normalizeEditorStyleTagSlugs(input) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const raw of input) {
    const s = raw.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9_-]/g, "");
    if (s.length > 0 && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}
function parseTagsQueryParam(q) {
  if (q == null) return [];
  const parts = [];
  if (Array.isArray(q)) {
    for (const x of q) parts.push(...String(x).split(","));
  } else {
    parts.push(...String(q).split(","));
  }
  return normalizeEditorStyleTagSlugs(parts);
}
function parseGenresQueryParam(q) {
  if (q == null) return [];
  const parts = [];
  if (Array.isArray(q)) {
    for (const x of q) parts.push(...String(x).split(","));
  } else {
    parts.push(...String(q).split(","));
  }
  const out = parts.map((p) => p.trim().toLowerCase()).filter(Boolean);
  return [...new Set(out)];
}

// server/stripeClient.local.ts
import Stripe from "stripe";
var STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";
var STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY ?? "";
function requireStripe() {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured. Add it to your environment secrets.");
  }
  return new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2026-02-25.clover" });
}
async function getUncachableStripeClient() {
  return requireStripe();
}
function getStripePublishableKey() {
  return STRIPE_PUBLISHABLE_KEY;
}
async function createConnectExpressAccount(params) {
  const stripe = requireStripe();
  const account = await stripe.accounts.create({
    type: "express",
    country: params.country ?? "US"
  });
  return account.id;
}
async function createConnectAccountLink(params) {
  const stripe = requireStripe();
  const link = await stripe.accountLinks.create({
    account: params.accountId,
    refresh_url: params.refreshUrl,
    return_url: params.returnUrl,
    type: "account_onboarding"
  });
  return link.url;
}
async function getConnectAccount(accountId) {
  try {
    const stripe = requireStripe();
    return await stripe.accounts.retrieve(accountId);
  } catch {
    return null;
  }
}
async function createBannerPaymentIntent(params) {
  const stripe = requireStripe();
  const intent = await stripe.paymentIntents.create({
    amount: params.amountUSD,
    currency: "usd",
    metadata: params.metadata,
    automatic_payment_methods: { enabled: true }
  });
  return {
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id
  };
}
async function getPaymentIntentStatus(paymentIntentId) {
  try {
    const stripe = requireStripe();
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return intent.status;
  } catch {
    return null;
  }
}
async function createTransferToConnectedAccount(params) {
  const stripe = requireStripe();
  const transfer = await stripe.transfers.create({
    amount: params.amountUsdCents,
    currency: "usd",
    destination: params.destinationAccountId,
    ...params.metadata ? { metadata: params.metadata } : {}
  });
  return { transferId: transfer.id };
}

// server/aggregateRevenue.ts
import { and, asc, eq, gte, lte, sql as sql2 } from "drizzle-orm";
function parseMonthRange(yearMonth) {
  const [year, month] = yearMonth.split("-").map(Number);
  if (!year || !month) return null;
  const start = new Date(year, month - 1, 1, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59);
  return { start, end };
}
function getPrevMonth(yearMonth) {
  const [year, month] = yearMonth.split("-").map(Number);
  const d = new Date(year, month - 2, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
function round1(value) {
  return Number(value.toFixed(1));
}
function normalize(value, max) {
  if (max <= 0) return 0;
  return value / max;
}
async function getMonthlyRevenueRank(yearMonth) {
  const range = parseMonthRange(yearMonth);
  if (!range) return [];
  const rows = await db.select({
    userId: wallets.userId,
    totalRevenue: sql2`COALESCE(SUM(${transactions.amount}), 0)::int`
  }).from(transactions).innerJoin(wallets, eq(transactions.walletId, wallets.id)).where(
    and(
      eq(transactions.type, "REVENUE"),
      gte(transactions.createdAt, range.start),
      lte(transactions.createdAt, range.end)
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
async function runMonthlyCreatorAggregation(yearMonth) {
  const range = parseMonthRange(yearMonth);
  if (!range) return { yearMonth, overall: [], paidLive: [] };
  const allCreators = await db.select().from(creators).orderBy(asc(creators.id));
  if (allCreators.length === 0) return { yearMonth, overall: [], paidLive: [] };
  const monthScores = await db.select().from(creatorMonthlyScores).where(eq(creatorMonthlyScores.yearMonth, yearMonth));
  const scoreMap = /* @__PURE__ */ new Map();
  monthScores.forEach((s) => scoreMap.set(s.creatorId, s));
  const prevScores = await db.select().from(creatorMonthlyScores).where(eq(creatorMonthlyScores.yearMonth, getPrevMonth(yearMonth)));
  const prevRankMap = /* @__PURE__ */ new Map();
  prevScores.forEach((s) => {
    if (s.rankOverall) prevRankMap.set(s.creatorId, s.rankOverall);
  });
  const reviews = await db.select().from(liverReviews).where(and(gte(liverReviews.createdAt, range.start), lte(liverReviews.createdAt, range.end)));
  const satMap = /* @__PURE__ */ new Map();
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
      startRank: prevRankMap.has(c.id) ? Math.min((prevRankMap.get(c.id) ?? allCreators.length) + 2, allCreators.length) : Math.min(c.rank, allCreators.length),
      rank: 999
    };
  });
  const maxTip = Math.max(...baseRows.map((r) => r.tipGross), 0);
  const maxStreams = Math.max(...baseRows.map((r) => r.streamCountMonthly), 0);
  const maxSat = Math.max(...baseRows.map((r) => r.avgSatisfaction), 0);
  for (const row of baseRows) {
    const score = 100 * (0.4 * normalize(row.avgSatisfaction, maxSat) + 0.3 * normalize(row.streamCountMonthly, maxStreams) + 0.3 * normalize(row.tipGross, maxTip));
    row.compositeScore = round1(score);
  }
  const n = baseRows.length;
  const overallSorted = [...baseRows].sort((a, b) => {
    const aCarry = (n - (a.startRank ?? n) + 1) / n * 0.01;
    const bCarry = (n - (b.startRank ?? n) + 1) / n * 0.01;
    if (b.compositeScore + bCarry !== a.compositeScore + aCarry) {
      return b.compositeScore + bCarry - (a.compositeScore + aCarry);
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
  const paidRankMap = /* @__PURE__ */ new Map();
  paidSorted.forEach((r, i) => paidRankMap.set(r.creatorId, i + 1));
  for (const row of baseRows) {
    const nextStartRank = Math.min((overallSorted.find((r) => r.creatorId === row.creatorId)?.rank ?? n) + 2, n);
    const existing = scoreMap.get(row.creatorId);
    const payload = {
      avgSatisfaction: row.avgSatisfaction,
      compositeScore: row.compositeScore,
      startRank: row.startRank,
      rankOverall: overallSorted.find((r) => r.creatorId === row.creatorId)?.rank ?? null,
      rankPaidLive: paidRankMap.get(row.creatorId) ?? null,
      nextStartRank,
      updatedAt: /* @__PURE__ */ new Date()
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
        nextStartRank
      });
    }
    await db.update(creators).set({
      rank: overallSorted.find((r) => r.creatorId === row.creatorId)?.rank ?? row.startRank ?? 999,
      heatScore: row.compositeScore,
      satisfactionScore: row.avgSatisfaction
    }).where(eq(creators.id, row.creatorId));
  }
  return {
    yearMonth,
    overall: overallSorted,
    paidLive: paidSorted.map((r) => ({ ...r, rank: paidRankMap.get(r.creatorId) ?? 999 }))
  };
}
async function getCreatorMonthlyRankings(yearMonth, kind) {
  const creatorRows = await db.select().from(creators);
  const scoreRows = await db.select().from(creatorMonthlyScores).where(eq(creatorMonthlyScores.yearMonth, yearMonth));
  const scoreMap = /* @__PURE__ */ new Map();
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
      rank: kind === "paid_live" ? score?.rankPaidLive ?? 999 : score?.rankOverall ?? c.rank
    };
  });
  return rows.sort((a, b) => a.rank - b.rank);
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

// shared/rawstock-video-spec.ts
function rawStockClipEnergy(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`RawStockClipEnergy must be finite and in [0, 1], got ${String(value)}`);
  }
  return value;
}
function sortRawStockClipsByStart(clips) {
  return [...clips].sort((a, b) => a.start - b.start || a.end - b.end);
}

// server/lib/parseVideoSpec.ts
var CLIP_TYPES = /* @__PURE__ */ new Set(["hook", "drop", "chorus", "crowd"]);
var CUT_SPEEDS = /* @__PURE__ */ new Set(["slow", "medium", "fast"]);
var CAPTION_DENSITIES = /* @__PURE__ */ new Set(["low", "medium", "high"]);
var COLOR_GRADES = /* @__PURE__ */ new Set(["natural", "high_contrast", "gritty"]);
var FORMATS = /* @__PURE__ */ new Set(["vertical_9_16", "square_1_1", "horizontal_16_9"]);
var LOGO_POSITIONS = /* @__PURE__ */ new Set([
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "center"
]);
function isPlainObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function parseClip(raw) {
  if (!isPlainObject(raw)) return null;
  const start = raw.start;
  const end = raw.end;
  const type = raw.type;
  const energy = raw.energy;
  if (typeof start !== "number" || typeof end !== "number" || !Number.isFinite(start) || !Number.isFinite(end)) {
    return null;
  }
  if (start > end) return null;
  if (typeof type !== "string" || !CLIP_TYPES.has(type)) return null;
  if (typeof energy !== "number" || !Number.isFinite(energy)) return null;
  try {
    const e = rawStockClipEnergy(energy);
    const intent = raw.intent;
    const sourceIndex = raw.sourceIndex;
    const sourceStart = raw.sourceStart;
    const sourceEnd = raw.sourceEnd;
    const out = {
      start,
      end,
      type,
      energy: e
    };
    if (typeof intent === "string" && intent.trim()) {
      out.intent = intent.trim();
    }
    if (sourceIndex !== void 0) {
      if (typeof sourceIndex !== "number" || !Number.isInteger(sourceIndex) || sourceIndex < 0) {
        return null;
      }
      out.sourceIndex = sourceIndex;
    }
    if (sourceStart !== void 0) {
      if (typeof sourceStart !== "number" || !Number.isFinite(sourceStart) || sourceStart < 0) {
        return null;
      }
      out.sourceStart = sourceStart;
    }
    if (sourceEnd !== void 0) {
      if (typeof sourceEnd !== "number" || !Number.isFinite(sourceEnd) || sourceEnd < 0) {
        return null;
      }
      out.sourceEnd = sourceEnd;
    }
    if (out.sourceStart !== void 0 && out.sourceEnd !== void 0 && out.sourceStart > out.sourceEnd) {
      return null;
    }
    return out;
  } catch {
    return null;
  }
}
function parseStyle(raw) {
  if (!isPlainObject(raw)) return null;
  const { cut_speed, caption_density, color_grade } = raw;
  if (typeof cut_speed !== "string" || !CUT_SPEEDS.has(cut_speed)) return null;
  if (typeof caption_density !== "string" || !CAPTION_DENSITIES.has(caption_density)) return null;
  if (typeof color_grade !== "string" || !COLOR_GRADES.has(color_grade)) return null;
  return {
    cut_speed,
    caption_density,
    color_grade
  };
}
function parseOverlays(raw) {
  if (raw === void 0 || raw === null) return void 0;
  if (!isPlainObject(raw)) return void 0;
  if (typeof raw.logo !== "boolean") return void 0;
  const out = { logo: raw.logo };
  const pos = raw.position;
  if (pos !== void 0) {
    if (typeof pos !== "string" || !LOGO_POSITIONS.has(pos)) return void 0;
    out.position = pos;
  }
  return out;
}
function normalizeVideoSpecPayload(raw) {
  if (!isPlainObject(raw)) return null;
  const clipsRaw = raw.clips;
  if (!Array.isArray(clipsRaw) || clipsRaw.length === 0) return null;
  const clips = [];
  for (const c of clipsRaw) {
    const p = parseClip(c);
    if (!p) return null;
    clips.push(p);
  }
  const style = parseStyle(raw.style);
  if (!style) return null;
  const format = raw.format;
  if (typeof format !== "string" || !FORMATS.has(format)) return null;
  const spec = {
    clips: sortRawStockClipsByStart(clips),
    style,
    format,
    overlays: parseOverlays(raw.overlays)
  };
  const duration = raw.duration;
  if (typeof duration === "number" && Number.isFinite(duration) && duration >= 0) {
    spec.duration = duration;
  }
  return JSON.stringify(spec);
}
function parseStoredVideoSpec(json) {
  if (!json?.trim()) return null;
  try {
    const parsed = JSON.parse(json);
    const normalized = normalizeVideoSpecPayload(parsed);
    if (!normalized) return null;
    return JSON.parse(normalized);
  } catch {
    return null;
  }
}

// server/lib/aiEditArtifacts.ts
function parseTimestampToSeconds(value) {
  const match = value.trim().match(/^(\d{1,2}):([0-5]\d)$/);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  return minutes * 60 + seconds;
}
function clipTypeFromEDL(item, index) {
  if (item.type === "highlight") return index === 0 ? "hook" : "drop";
  if (item.type === "transition") return "crowd";
  if (item.type === "caption") return "chorus";
  return index === 0 ? "hook" : "chorus";
}
function energyFromEDLType(type) {
  switch (type) {
    case "highlight":
      return rawStockClipEnergy(0.9);
    case "transition":
      return rawStockClipEnergy(0.35);
    case "caption":
      return rawStockClipEnergy(0.45);
    case "cut":
    default:
      return rawStockClipEnergy(0.65);
  }
}
function clipDuration(clip) {
  const start = clip.sourceStart ?? clip.start;
  const end = clip.sourceEnd ?? clip.end;
  return Math.max(0, end - start);
}
function buildSegmentsFromPlan(baseSpec, plan) {
  const clips = [];
  const segments = [];
  let outputCursor = 0;
  for (const [itemIdx, item] of plan.edl.entries()) {
    const timelineStart = parseTimestampToSeconds(item.startTime);
    const timelineEnd = parseTimestampToSeconds(item.endTime);
    if (timelineStart == null || timelineEnd == null || timelineEnd <= timelineStart) {
      continue;
    }
    for (const baseClip of baseSpec.clips) {
      const overlapStart = Math.max(timelineStart, baseClip.start);
      const overlapEnd = Math.min(timelineEnd, baseClip.end);
      if (overlapEnd <= overlapStart) continue;
      const baseSourceStart = baseClip.sourceStart ?? baseClip.start;
      const sourceStart = baseSourceStart + (overlapStart - baseClip.start);
      const sourceEnd = sourceStart + (overlapEnd - overlapStart);
      const duration = overlapEnd - overlapStart;
      const clip = {
        start: outputCursor,
        end: outputCursor + duration,
        type: clipTypeFromEDL(item, itemIdx),
        energy: energyFromEDLType(item.type),
        intent: item.instruction.trim() || item.note?.trim() || void 0,
        sourceIndex: baseClip.sourceIndex ?? 0,
        sourceStart,
        sourceEnd
      };
      clips.push(clip);
      segments.push({
        itemIndex: item.index,
        sourceIndex: clip.sourceIndex ?? 0,
        outputStartSec: clip.start,
        outputEndSec: clip.end,
        sourceStartSec: sourceStart,
        sourceEndSec: sourceEnd,
        edlType: item.type
      });
      outputCursor += duration;
    }
  }
  return { clips, segments };
}
function buildAnalysis(provider, baseSpec, renderSpec, segments) {
  const sourceDurations = /* @__PURE__ */ new Map();
  for (const clip of baseSpec.clips) {
    const sourceIndex = clip.sourceIndex ?? 0;
    const duration = clipDuration(clip);
    sourceDurations.set(sourceIndex, (sourceDurations.get(sourceIndex) ?? 0) + duration);
  }
  const selectedBySource = /* @__PURE__ */ new Map();
  for (const segment of segments) {
    const entry = selectedBySource.get(segment.sourceIndex) ?? { count: 0, duration: 0 };
    entry.count += 1;
    entry.duration += Math.max(0, segment.sourceEndSec - segment.sourceStartSec);
    selectedBySource.set(segment.sourceIndex, entry);
  }
  const warnings = [];
  if (provider === "mock") {
    warnings.push("AI provider is running in mock mode. Review the edit plan carefully before rendering.");
  }
  if (segments.length === 0) {
    warnings.push("The AI plan did not map to any source segment, so the original order spec is being used.");
  }
  if (new Set(renderSpec.clips.map((clip) => clip.sourceIndex ?? 0)).size > 1) {
    warnings.push("This edit uses multiple source files. Verify the template supports all referenced video layers.");
  }
  return {
    version: 1,
    provider,
    renderPath: "templated",
    renderReady: renderSpec.clips.length > 0,
    warnings,
    nextSteps: [
      "scene_detection",
      "shot_classification",
      "audio_beat_detection",
      "highlight_scoring"
    ],
    sources: [...sourceDurations.entries()].sort((a, b) => a[0] - b[0]).map(([sourceIndex, durationSec]) => ({
      sourceIndex,
      durationSec,
      selectedClipCount: selectedBySource.get(sourceIndex)?.count ?? 0,
      selectedDurationSec: selectedBySource.get(sourceIndex)?.duration ?? 0
    })),
    segments
  };
}
function buildAIEditStoredResult(params) {
  const { plan, promptUsed, provider, baseSpec, revisionPrompt } = params;
  const { clips, segments } = buildSegmentsFromPlan(baseSpec, plan);
  const renderSpec = clips.length > 0 ? {
    clips: sortRawStockClipsByStart(clips),
    style: baseSpec.style,
    format: baseSpec.format,
    overlays: baseSpec.overlays,
    duration: clips[clips.length - 1]?.end ?? 0
  } : baseSpec;
  return {
    schemaVersion: "ai-edit-result-v1",
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    promptUsed,
    revisionPrompt: revisionPrompt?.trim() || null,
    plan,
    renderSpec,
    baseSpec,
    analysis: buildAnalysis(provider, baseSpec, renderSpec, segments)
  };
}
function parseAIEditStoredResult(json) {
  if (!json?.trim()) return null;
  try {
    const parsed = JSON.parse(json);
    if (parsed?.schemaVersion !== "ai-edit-result-v1") return null;
    if (!parsed.plan || !Array.isArray(parsed.plan.edl)) return null;
    if (!parsed.renderSpec || !Array.isArray(parsed.renderSpec.clips)) return null;
    if (!parsed.baseSpec || !Array.isArray(parsed.baseSpec.clips)) return null;
    if (!parsed.analysis || !Array.isArray(parsed.analysis.sources) || !Array.isArray(parsed.analysis.segments)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

// server/lib/aiEditJobQueue.ts
var pending = [];
var activeKeys = /* @__PURE__ */ new Set();
var running = false;
var MAX_ATTEMPTS = 1;
async function runQueue() {
  if (running) return;
  running = true;
  try {
    while (pending.length > 0) {
      const task = pending.shift();
      if (!task) continue;
      try {
        await task.handler();
        activeKeys.delete(task.key);
      } catch (error) {
        if (task.attempts + 1 < MAX_ATTEMPTS) {
          pending.push({ ...task, attempts: task.attempts + 1 });
        } else {
          activeKeys.delete(task.key);
          console.error("[ai-edit/queue] job failed permanently:", error);
        }
      }
    }
  } finally {
    running = false;
  }
}
function enqueueAIEditJob(key, handler) {
  if (activeKeys.has(key)) return false;
  activeKeys.add(key);
  pending.push({ key, handler, attempts: 0 });
  void runQueue().catch((error) => {
    console.error("[ai-edit/queue] job failed:", error);
  });
  return true;
}

// server/lib/aiEditPlanWorker.ts
import { and as and2, asc as asc2, eq as eq2 } from "drizzle-orm";

// server/aiEditAssistant.ts
var MODEL2 = "claude-haiku-4-5-20251001";
var ANTHROPIC_API_URL2 = "https://api.anthropic.com/v1/messages";
var SYSTEM_PROMPT2 = `You are a professional video editor AI assistant.
Given a set of source video files and detailed editing instructions, generate a structured Edit Decision List (EDL).

Rules:
- Include 5\u201312 edit points in the edl array, proportional to the output duration target
- Each entry must include a timestamp range, type, and clear actionable instruction
- type must be one of: "cut" | "highlight" | "transition" | "caption"
- startTime / endTime must be in "MM:SS" format (e.g. "03:45")
- If a logo or telop text is provided, incorporate them into caption entries
- Adapt pacing and style to the specified target audience and tone
- Output ONLY valid JSON \u2014 no explanation text, no markdown fences

Response format (strict JSON):
{
  "title": "Edit plan name",
  "totalDuration": "X:XX",
  "summary": "One or two sentence overview of this edit plan.",
  "edl": [
    {
      "index": 1,
      "startTime": "00:00",
      "endTime": "00:30",
      "type": "highlight",
      "instruction": "Opening: strongest performance moment to hook viewers",
      "note": "Optional directorial note"
    }
  ]
}`;
function getMockEditPlan(input) {
  const { planMinutes, prompt, targetAudience, tone, videoUrls, telop } = input;
  return {
    title: `AI Edit Plan \u2014 ${prompt.slice(0, 30)}`,
    totalDuration: `${planMinutes}:00`,
    summary: `A ${tone ?? "energetic"} cut targeting ${targetAudience ?? "general audience"}, generated from ${videoUrls.length} source file(s). (Mock data \u2014 set ANTHROPIC_API_KEY to enable live generation)`,
    edl: [
      {
        index: 1,
        startTime: "00:00",
        endTime: "00:25",
        type: "highlight",
        instruction: "Opening: most impactful performance moment to hook viewers",
        note: "Start at the peak energy point of the first video"
      },
      {
        index: 2,
        startTime: "01:10",
        endTime: "01:45",
        type: "cut",
        instruction: "Solo section close-up \u2014 tight hand and face shots",
        note: "Prioritize intimate camera angles"
      },
      {
        index: 3,
        startTime: "02:30",
        endTime: "02:50",
        type: "transition",
        instruction: "Cross-fade to audience reaction shot",
        note: "Soften energy before the mid-section"
      },
      {
        index: 4,
        startTime: "03:05",
        endTime: "03:20",
        type: "caption",
        instruction: telop ? `Insert telop: "${telop}"` : "Insert song title and artist name caption",
        note: "White text, lower-left position, 3-second hold"
      },
      {
        index: 5,
        startTime: "04:15",
        endTime: "04:55",
        type: "highlight",
        instruction: "Climax: full-band wide shot with crowd energy",
        note: "Alternate wide and close-up cuts every 2 seconds"
      },
      {
        index: 6,
        startTime: `${planMinutes - 1}:00`,
        endTime: `${planMinutes}:00`,
        type: "cut",
        instruction: "Outro: fade to black",
        note: "Gradually lower audio volume over final 10 seconds"
      }
    ]
  };
}
function buildUserMessage(input) {
  const { planMinutes, videoUrls, logoUrl, telop, targetAudience, tone, prompt } = input;
  const lines = [
    `Output duration target: ${planMinutes} minutes`,
    `Target audience: ${targetAudience ?? "General"}`,
    `Tone / Style: ${tone ?? "Energetic"}`,
    "",
    `Source videos (${videoUrls.length}):`,
    ...videoUrls.map((url, i) => `  ${i + 1}. ${url}`)
  ];
  if (logoUrl) lines.push("", `Logo (transparent PNG): ${logoUrl}`);
  if (telop) lines.push(`Telop / caption text: "${telop}"`);
  lines.push("", "Editing instructions:", prompt);
  return lines.join("\n");
}
function allowMockEditPlan() {
  return process.env.AI_EDIT_ALLOW_MOCK === "1";
}
function withMockFallback(input, reason) {
  if (!allowMockEditPlan()) {
    throw new Error(reason);
  }
  console.warn(`[aiEditAssistant] ${reason} \u2014 returning mock EDL`);
  return { plan: getMockEditPlan(input), provider: "mock" };
}
async function generateEditPlan(input) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return withMockFallback(
      input,
      "ANTHROPIC_API_KEY is not set. Set AI_EDIT_ALLOW_MOCK=1 to use mock plans locally"
    );
  }
  const userMessage = buildUserMessage(input);
  try {
    const res = await fetch(ANTHROPIC_API_URL2, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL2,
        max_tokens: 2048,
        system: SYSTEM_PROMPT2,
        messages: [{ role: "user", content: userMessage }]
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("[aiEditAssistant] Claude API error:", res.status, errText);
      return withMockFallback(input, `Claude API error (${res.status})`);
    }
    const data = await res.json();
    const text2 = data.content?.[0]?.text?.trim() ?? "";
    const jsonMatch = text2.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return withMockFallback(input, "No JSON found in Claude response");
    }
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.edl || !Array.isArray(parsed.edl)) {
      return withMockFallback(input, "Claude response did not contain a valid EDL array");
    }
    return { plan: parsed, provider: "anthropic" };
  } catch (e) {
    console.error("[aiEditAssistant] Error calling Claude:", e);
    const msg = e instanceof Error ? e.message : "Claude call failed";
    return withMockFallback(input, msg);
  }
}

// server/lib/aiEditPlanWorker.ts
function useAIEditMemoryQueue() {
  if (process.env.AI_EDIT_USE_MEMORY_QUEUE === "1") return true;
  if (process.env.AI_EDIT_USE_MEMORY_QUEUE === "0") return false;
  return process.env.VERCEL !== "1";
}
function parseJobVideoUrls(job) {
  if (job.videoUrls) {
    try {
      const parsed = JSON.parse(job.videoUrls);
      if (Array.isArray(parsed)) {
        return parsed.filter((value) => typeof value === "string").map((value) => value.trim()).filter(Boolean);
      }
    } catch {
    }
  }
  return job.videoUrl?.trim() ? [job.videoUrl.trim()] : [];
}
function getBaseVideoSpec(job) {
  const stored = parseAIEditStoredResult(job.result ?? null);
  return stored?.baseSpec ?? parseStoredVideoSpec(job.videoSpec ?? null);
}
async function refundAIEditTickets(params) {
  const { userId, amount, type, description, referenceId } = params;
  if (!Number.isFinite(amount) || amount <= 0) return;
  const key = String(userId);
  const balRows = await db.select().from(ticketBalances).where(eq2(ticketBalances.userId, key)).limit(1);
  const currentBalance = balRows[0]?.balance ?? 0;
  if (balRows.length === 0) {
    await db.insert(ticketBalances).values({ userId: key, balance: amount });
  } else {
    await db.update(ticketBalances).set({ balance: currentBalance + amount, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(ticketBalances.userId, key));
  }
  await db.insert(ticketTransactions).values({
    userId: key,
    amount,
    type,
    referenceId,
    description
  });
}
async function processAIEditJobInline(params) {
  await db.update(aiEditJobs).set({ status: "processing", updatedAt: /* @__PURE__ */ new Date() }).where(eq2(aiEditJobs.id, params.jobId));
  await runAIEditPlanWorker(params);
}
async function runAIEditPlanWorker(params) {
  const { jobId, revisionPrompt, refundAmount = 0, refundType, refundDescription } = params;
  const [freshJob] = await db.select().from(aiEditJobs).where(eq2(aiEditJobs.id, jobId));
  if (!freshJob) return;
  try {
    const baseSpec = getBaseVideoSpec(freshJob);
    if (!baseSpec) {
      throw new Error("AI Edit job has no valid source spec");
    }
    const promptUsed = revisionPrompt?.trim() ? `${freshJob.prompt.trim()}

Revision request:
${revisionPrompt.trim()}` : freshJob.prompt.trim();
    const videoUrls = parseJobVideoUrls(freshJob);
    const editInput = {
      planMinutes: freshJob.planMinutes ?? 15,
      videoUrls,
      logoUrl: freshJob.logoUrl,
      telop: freshJob.telop,
      targetAudience: freshJob.targetAudience,
      tone: freshJob.tone,
      prompt: promptUsed
    };
    const generated = await generateEditPlan(editInput);
    const storedResult = buildAIEditStoredResult({
      plan: generated.plan,
      promptUsed,
      provider: generated.provider,
      baseSpec,
      revisionPrompt
    });
    await db.update(aiEditJobs).set({
      status: "completed",
      result: JSON.stringify(storedResult),
      videoSpec: JSON.stringify(storedResult.renderSpec),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq2(aiEditJobs.id, jobId));
  } catch (error) {
    console.error("[ai-edit] Processing failed:", error);
    await db.update(aiEditJobs).set({ status: "failed", updatedAt: /* @__PURE__ */ new Date() }).where(eq2(aiEditJobs.id, jobId));
    if (refundAmount > 0 && refundType && refundDescription) {
      await refundAIEditTickets({
        userId: freshJob.userId,
        amount: refundAmount,
        type: refundType,
        description: refundDescription,
        referenceId: String(freshJob.id)
      });
    }
  }
}
async function claimAndProcessNextPendingAIEditJob() {
  const row = await db.transaction(async (tx) => {
    const pending2 = await tx.select().from(aiEditJobs).where(eq2(aiEditJobs.status, "pending")).orderBy(asc2(aiEditJobs.id)).limit(1).for("update");
    const first = pending2[0];
    if (!first) return null;
    const updated = await tx.update(aiEditJobs).set({ status: "processing", updatedAt: /* @__PURE__ */ new Date() }).where(and2(eq2(aiEditJobs.id, first.id), eq2(aiEditJobs.status, "pending"))).returning({ id: aiEditJobs.id });
    return updated[0] ?? null;
  });
  if (!row) return { processed: false };
  await runAIEditPlanWorker({ jobId: row.id });
  return { processed: true, jobId: row.id };
}

// server/lib/stripeTicketPurchase.ts
import { and as and3, eq as eq3 } from "drizzle-orm";
async function creditTicketsFromTicketCheckoutSession(executor, session) {
  if (session.payment_status !== "paid") {
    return { ok: false, reason: "not_paid" };
  }
  const metaType = session.metadata?.type;
  const isTicketPurchase = metaType === "ticket_purchase" || metaType == null && session.metadata?.tickets && session.metadata?.userId;
  if (!isTicketPurchase) {
    return { ok: false, reason: "bad_metadata" };
  }
  const tickets = parseInt(session.metadata?.tickets ?? "0", 10);
  const metaUserId = session.metadata?.userId;
  if (!tickets || tickets <= 0 || !metaUserId || !/^\d+$/.test(String(metaUserId))) {
    return { ok: false, reason: "bad_metadata" };
  }
  const userId = String(parseInt(String(metaUserId), 10));
  const sessionId = session.id;
  const existing = await executor.select({ id: ticketTransactions.id }).from(ticketTransactions).where(and3(eq3(ticketTransactions.userId, userId), eq3(ticketTransactions.referenceId, sessionId))).limit(1);
  if (existing.length > 0) {
    const balRows2 = await executor.select().from(ticketBalances).where(eq3(ticketBalances.userId, userId)).limit(1);
    return { ok: true, alreadyGranted: true, userId, newBalance: balRows2[0]?.balance ?? 0 };
  }
  const balRows = await executor.select().from(ticketBalances).where(eq3(ticketBalances.userId, userId)).limit(1);
  const currentBalance = balRows[0]?.balance ?? 0;
  if (balRows.length === 0) {
    await executor.insert(ticketBalances).values({ userId, balance: tickets });
  } else {
    await executor.update(ticketBalances).set({ balance: currentBalance + tickets, updatedAt: /* @__PURE__ */ new Date() }).where(eq3(ticketBalances.userId, userId));
  }
  await executor.insert(ticketTransactions).values({
    userId,
    amount: tickets,
    type: "purchase",
    referenceId: sessionId,
    description: `Purchased ${tickets} tickets via Stripe`
  });
  const newBalance = currentBalance + tickets;
  return { ok: true, alreadyGranted: false, userId, newBalance };
}

// shared/withdrawalFees.ts
var DEFAULT_MIN_NET_TRANSFER_USD_CENTS = 50;
function computeWithdrawalFeeBreakdown(grossUsdCents, policy) {
  const minNet = Math.max(
    1,
    Math.min(1e7, policy.minNetTransferUsdCents || DEFAULT_MIN_NET_TRANSFER_USD_CENTS)
  );
  const gross = Math.floor(grossUsdCents);
  if (!Number.isFinite(gross) || gross <= 0) {
    return { feeUsdCents: 0, netTransferUsdCents: 0 };
  }
  const bps = Math.max(0, Math.min(1e4, Math.floor(policy.bps)));
  const fixed = Math.max(0, Math.floor(policy.fixedUsdCents));
  const variable = Math.ceil(gross * bps / 1e4);
  const rawFee = variable + fixed;
  const maxFee = Math.max(0, gross - minNet);
  const feeUsdCents = Math.min(maxFee, rawFee);
  const netTransferUsdCents = gross - feeUsdCents;
  return { feeUsdCents, netTransferUsdCents };
}

// server/lib/withdrawalFees.ts
function getWithdrawalFeePolicy() {
  const bps = Math.min(1e4, Math.max(0, parseInt(process.env.WITHDRAWAL_FEE_BPS ?? "0", 10) || 0));
  const fixedUsdCents = Math.max(0, parseInt(process.env.WITHDRAWAL_FEE_FIXED_USD_CENTS ?? "0", 10) || 0);
  const minNetTransferUsdCents = Math.max(
    1,
    Math.min(
      1e7,
      parseInt(
        process.env.WITHDRAWAL_MIN_NET_TRANSFER_USD_CENTS ?? String(DEFAULT_MIN_NET_TRANSFER_USD_CENTS),
        10
      ) || DEFAULT_MIN_NET_TRANSFER_USD_CENTS
    )
  );
  return { bps, fixedUsdCents, minNetTransferUsdCents };
}
function computeWithdrawalFeeBreakdown2(grossUsdCents) {
  return computeWithdrawalFeeBreakdown(grossUsdCents, getWithdrawalFeePolicy());
}

// server/lib/dslToTemplated.ts
var DSL_TO_TEMPLATED_INPUT_VIDEO_PLACEHOLDER = "INPUT_VIDEO_URL";
var DSL_TO_TEMPLATED_LOGO_PLACEHOLDER = "INPUT_LOGO_URL";
var TEMPLATE_BY_CUT_SPEED = {
  fast: "rawstock-fast-cut",
  medium: "rawstock-standard",
  slow: "rawstock-cinematic"
};
var FORMAT_TEMPLATE_SUFFIX = {
  vertical_9_16: "vertical",
  square_1_1: "square",
  horizontal_16_9: "horizontal"
};
var TEMPLATED_TEMPLATE_ID_BY_LOGICAL = {
  "rawstock-fast-cut-vertical": "2fe20a02-019e-4a1c-81e7-a8f0130c7978",
  "rawstock-standard-vertical": "b4cccf2e-3962-4f3f-a884-186c50491602",
  "rawstock-cinematic-vertical": "9da37313-33c9-45d6-851c-081a0796aaa8"
};
function resolveTemplateId(spec) {
  const base = TEMPLATE_BY_CUT_SPEED[spec.style.cut_speed];
  const suffix = FORMAT_TEMPLATE_SUFFIX[spec.format];
  const logicalId = `${base}-${suffix}`;
  return TEMPLATED_TEMPLATE_ID_BY_LOGICAL[logicalId] ?? logicalId;
}
function clipTypeToCaptionFallback(type) {
  switch (type) {
    case "hook":
      return "HOOK";
    case "drop":
      return "DROP";
    case "chorus":
      return "CHORUS";
    case "crowd":
      return "CROWD";
  }
}
function captionValueForClip(clip) {
  const intent = clip.intent?.trim();
  if (intent) return intent;
  return clipTypeToCaptionFallback(clip.type);
}
function mapCaptionTextStyle(style) {
  if (style.caption_density === "high") return "kinetic";
  if (style.caption_density === "low") return "minimal";
  if (style.color_grade === "gritty") return "bold";
  return "subtitle";
}
function shouldEmitCaptionForClip(clip, style) {
  switch (style.caption_density) {
    case "low":
      return Boolean(clip.intent?.trim());
    case "medium":
    case "high":
      return true;
  }
}
function dslToTemplated(spec, options) {
  if (spec.clips.length === 0) {
    throw new Error("dslToTemplated: spec.clips must be non-empty");
  }
  const modifications = {};
  spec.clips.forEach((clip, i) => {
    const n = i + 1;
    const videoKey = `video${n}`;
    const sourceIndex = clip.sourceIndex ?? 0;
    const sourceUrl = options.inputVideoUrls[sourceIndex]?.trim();
    const src = sourceUrl || DSL_TO_TEMPLATED_INPUT_VIDEO_PLACEHOLDER;
    modifications[videoKey] = {
      video: {
        src,
        trim: [clip.sourceStart ?? clip.start, clip.sourceEnd ?? clip.end]
      }
    };
    if (shouldEmitCaptionForClip(clip, spec.style)) {
      const captionKey = `caption${n}`;
      modifications[captionKey] = {
        text: {
          value: captionValueForClip(clip),
          style: mapCaptionTextStyle(spec.style)
        }
      };
    }
  });
  if (spec.overlays?.logo === true) {
    const logoSrc = options.logoUrl?.trim() && options.logoUrl.trim().length > 0 ? options.logoUrl.trim() : DSL_TO_TEMPLATED_LOGO_PLACEHOLDER;
    modifications.logo1 = {
      logo: {
        src: logoSrc,
        position: spec.overlays.position
      }
    };
  }
  return {
    template: resolveTemplateId(spec),
    modifications,
    format: options.outputFormat ?? "mp4",
    webhook_url: options.webhookUrl,
    async: options.async !== false
  };
}

// server/lib/templatedClient.ts
var TEMPLATED_RENDER_URL = "https://api.templated.io/v1/render";
function templatedModificationsToLayers(modifications) {
  const layers = {};
  for (const [layerName, mod] of Object.entries(modifications)) {
    const layer = {};
    if (mod.video) {
      layer.video_url = mod.video.src;
      layer.trim = mod.video.trim;
      layer.trim_start = mod.video.trim[0];
      layer.trim_end = mod.video.trim[1];
    }
    if (mod.text) {
      layer.text = mod.text.value;
      if (mod.text.style === "bold" || mod.text.style === "kinetic") {
        layer.font_weight = "bold";
      }
    }
    if (mod.logo) {
      layer.image_url = mod.logo.src;
      if (mod.logo.position) {
        layer.position = mod.logo.position;
      }
    }
    layers[layerName] = layer;
  }
  return layers;
}
function toTemplatedApiBody(request, options) {
  const body = {
    template: request.template,
    layers: templatedModificationsToLayers(request.modifications),
    format: request.format,
    async: true
  };
  if (request.webhook_url?.trim()) {
    body.webhook_url = request.webhook_url.trim();
  }
  if (options.externalId?.trim()) {
    body.external_id = options.externalId.trim();
  }
  if (request.format === "mp4" && options.durationMs != null) {
    const ms = Math.round(options.durationMs);
    body.duration = Math.min(9e4, Math.max(1e3, ms));
  }
  return body;
}
async function createTemplatedRender(request, options) {
  const apiKey = options.apiKey.trim();
  if (!apiKey) {
    return { id: "", status: "failed", error: "TEMPLATED_API_KEY is not set" };
  }
  const body = toTemplatedApiBody(request, options);
  let res;
  try {
    res = await fetch(TEMPLATED_RENDER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { id: "", status: "failed", error: msg };
  }
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const errMsg = data && typeof data === "object" && data !== null && "message" in data ? String(data.message) : res.statusText;
    return { id: "", status: "failed", error: errMsg || `HTTP ${res.status}` };
  }
  const row = Array.isArray(data) ? data[0] : data;
  const obj = row && typeof row === "object" ? row : {};
  const id = typeof obj.id === "string" ? obj.id : "";
  const url = typeof obj.url === "string" ? obj.url : void 0;
  const statusRaw = typeof obj.status === "string" ? obj.status.toLowerCase() : "";
  let status = "pending";
  if (url) status = "succeeded";
  else if (statusRaw === "failed" || statusRaw === "error") status = "failed";
  else if (statusRaw === "processing" || statusRaw === "pending") status = statusRaw;
  return {
    id,
    status,
    url,
    webhook_url: request.webhook_url,
    error: typeof obj.error === "string" ? obj.error : void 0
  };
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
  },
  // R2 / S3 互換では path-style が安定（署名 URL とブラウザ PUT の不一致を防ぐ）
  forcePathStyle: true
}) : null;
async function createSignedUploadUrl(key, contentType) {
  if (!r2Client || !endpoint || !bucket) {
    throw new Error(
      "R2 is not configured. Set R2_ENDPOINT, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY."
    );
  }
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType
  });
  const uploadUrl = await getSignedUrl(r2Client, cmd, { expiresIn: 60 * 5 });
  const publicBase = process.env.R2_PUBLIC_BASE_URL?.trim();
  const publicUrl = publicBase ? `${publicBase.replace(/\/$/, "")}/${key}` : `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`;
  return { uploadUrl, publicUrl };
}

// server/moderation.ts
var MODEL3 = "claude-haiku-4-5-20251001";
var ANTHROPIC_API_URL3 = "https://api.anthropic.com/v1/messages";
var PHONE_PATTERN = /(\+?81[-\s]?|0)(\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4})/;
var EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
var EXTERNAL_CONTACT_PATTERN = /line\s*id\s*[:：]?\s*\S+|insta\s*[:：]?\s*\S+|twitter\s*[:：]?\s*\S+|discord\s*[:：]?\s*\S+/i;
var ADDRESS_PATTERN = /〒?\d{3}[-－]\d{4}|[都道府県市区町村]\d+[-－\d]/;
var ADULT_KEYWORDS = [
  "\u63F4\u52A9\u4EA4\u969B",
  "\u30D1\u30D1\u6D3B",
  "\u30DE\u30DE\u6D3B",
  "\u30BB\u30C3\u30AF\u30B9",
  "sex",
  "nude",
  "naked",
  "\u30A8\u30ED",
  "AV",
  "\u98A8\u4FD7",
  "\u58F2\u6625",
  "\u8CB7\u6625",
  "\u5150\u7AE5\u30DD\u30EB\u30CE",
  "loli",
  "\u30ED\u30EA"
];
var ADULT_PATTERN = new RegExp(ADULT_KEYWORDS.join("|"), "i");
var VIOLENCE_KEYWORDS = ["\u6BBA\u3059", "\u6B7B\u306D", "\u3076\u3063\u6BBA", "\u7206\u7834", "\u30C6\u30ED", "\u81EA\u6BBA\u3057\u308D"];
var VIOLENCE_PATTERN = new RegExp(VIOLENCE_KEYWORDS.join("|"), "i");
function regexFilter(text2) {
  if (PHONE_PATTERN.test(text2))
    return { blocked: true, reason: "Posts must not include phone numbers." };
  if (EMAIL_PATTERN.test(text2))
    return { blocked: true, reason: "Posts must not include email addresses." };
  if (EXTERNAL_CONTACT_PATTERN.test(text2))
    return { blocked: true, reason: "Sharing external contact info is not allowed." };
  if (ADDRESS_PATTERN.test(text2))
    return { blocked: true, reason: "Posts must not include addresses or postal codes." };
  if (ADULT_PATTERN.test(text2))
    return { blocked: true, reason: "Adult or sexual content is not allowed." };
  if (VIOLENCE_PATTERN.test(text2))
    return { blocked: true, reason: "Violence or threats are not allowed." };
  return { blocked: false, reason: "" };
}
var LLM_SYSTEM_PROMPT = `You are a real-time chat moderator.
Read the user's message and decide if it should be blocked.

Block messages that contain or solicit:
- Personal info (phone, email, address, social handles) exchange or requests
- Adult or sexual content
- Violence, threats, or hate
- Spam, scams, or phishing

Reply with JSON only (no prose):
{"allowed":true|false,"reason":"One short English sentence when allowed is false"}`;
async function llmFilter(text2) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { allowed: true, reason: "" };
  }
  try {
    const res = await fetch(ANTHROPIC_API_URL3, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL3,
        max_tokens: 128,
        system: LLM_SYSTEM_PROMPT,
        messages: [{ role: "user", content: text2 }]
      })
    });
    if (!res.ok) {
      console.error("Moderation LLM error:", res.status);
      return { allowed: true, reason: "" };
    }
    const data = await res.json();
    const raw = data.content?.[0]?.text?.trim() ?? "";
    const parsed = JSON.parse(raw);
    return {
      allowed: parsed.allowed !== false,
      reason: typeof parsed.reason === "string" ? parsed.reason : ""
    };
  } catch {
    return { allowed: true, reason: "" };
  }
}
async function moderateContent(text2) {
  if (!text2 || text2.trim().length === 0) return { allowed: true };
  const regexResult = regexFilter(text2);
  if (regexResult.blocked) {
    return { allowed: false, reason: regexResult.reason };
  }
  const llmResult = await llmFilter(text2);
  if (!llmResult.allowed) {
    return { allowed: false, reason: llmResult.reason || "This content violates community guidelines." };
  }
  return { allowed: true };
}

// server/langFromText.ts
var MIN_LENGTH = 10;
var ISO639_3_TO_1 = {
  jpn: "ja",
  eng: "en",
  kor: "ko",
  zho: "zh",
  cmn: "zh",
  spa: "es",
  fra: "fr",
  deu: "de",
  por: "pt",
  ita: "it",
  vie: "vi",
  tha: "th",
  ind: "id",
  rus: "ru",
  arb: "ar"
};
async function detectContentLang(text2) {
  try {
    const t = text2.trim();
    if (t.length < MIN_LENGTH) return null;
    const { franc } = await import("franc");
    const code = franc(t);
    if (code === "und") return null;
    return ISO639_3_TO_1[code] ?? null;
  } catch {
    return null;
  }
}

// server/lib/translate/index.ts
import crypto from "node:crypto";
import { and as and4, eq as eq4 } from "drizzle-orm";

// server/lib/translate/glossary.ts
var CACHE_TTL_MS = 5 * 60 * 1e3;
var cache = null;
async function loadGlossary() {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) {
    return cache.entries;
  }
  try {
    const rows = await db.select().from(translationGlossary);
    const entries = rows.map((r) => ({
      term: r.term,
      locale: r.locale ?? "*",
      doNotTranslate: r.doNotTranslate,
      overrideTranslation: r.overrideTranslation ?? null
    }));
    cache = { entries, loadedAt: Date.now() };
    return entries;
  } catch (e) {
    console.warn("loadGlossary failed; using empty glossary", e);
    return cache?.entries ?? [];
  }
}
var PLACEHOLDER_PREFIX = "__RSGLOSS";
var PLACEHOLDER_SUFFIX = "__";
function makePlaceholder(index) {
  return `${PLACEHOLDER_PREFIX}${index}${PLACEHOLDER_SUFFIX}`;
}
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
async function maskGlossary(text2, dstLang) {
  const entries = await loadGlossary();
  if (entries.length === 0) return { masked: text2, replacements: /* @__PURE__ */ new Map() };
  const sorted = [...entries].sort((a, b) => b.term.length - a.term.length);
  let masked = text2;
  const replacements = /* @__PURE__ */ new Map();
  let nextIndex = 0;
  for (const entry of sorted) {
    if (!entry.term) continue;
    if (!entry.doNotTranslate && !entry.overrideTranslation) continue;
    const pattern = new RegExp(`\\b${escapeRegExp(entry.term)}\\b`, "gi");
    if (!pattern.test(masked)) continue;
    const placeholder = makePlaceholder(nextIndex++);
    const restoreTo = entry.overrideTranslation && (entry.locale === "*" || entry.locale === dstLang) ? entry.overrideTranslation : entry.term;
    masked = masked.replace(new RegExp(`\\b${escapeRegExp(entry.term)}\\b`, "gi"), placeholder);
    replacements.set(placeholder, restoreTo);
  }
  return { masked, replacements };
}
function unmaskGlossary(translated, replacements) {
  if (replacements.size === 0) return translated;
  let out = translated;
  for (const [placeholder, value] of replacements) {
    out = out.replace(new RegExp(escapeRegExp(placeholder), "gi"), value);
  }
  return out;
}

// server/lib/translate/mymemory.ts
var ENDPOINT = "https://api.mymemory.translated.net/get";
var MyMemoryError = class extends Error {
  status;
  constructor(message, status) {
    super(message);
    this.name = "MyMemoryError";
    this.status = status;
  }
};
function normalizeLang(code) {
  const lower = code.toLowerCase();
  if (lower === "zh") return "zh-CN";
  return lower;
}
async function myMemoryTranslate(text2, srcLang, dstLang) {
  const params = new URLSearchParams();
  params.set("q", text2);
  params.set("langpair", `${normalizeLang(srcLang)}|${normalizeLang(dstLang)}`);
  const email = process.env.MYMEMORY_EMAIL;
  if (email) params.set("de", email);
  const url = `${ENDPOINT}?${params.toString()}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    throw new MyMemoryError(`MyMemory HTTP ${res.status}`, res.status);
  }
  const json = await res.json().catch(() => null);
  if (!json || !json.responseData?.translatedText) {
    throw new MyMemoryError("MyMemory empty response");
  }
  if (typeof json.responseStatus === "number" && json.responseStatus >= 400) {
    throw new MyMemoryError(
      `MyMemory error ${json.responseStatus}: ${json.responseDetails ?? "unknown"}`,
      json.responseStatus
    );
  }
  return { translatedText: json.responseData.translatedText };
}

// server/lib/translate/shortText.ts
var SHORT_WORD_THRESHOLD = 2;
var SHORT_VISIBLE_THRESHOLD = 8;
var NON_TEXTUAL_RE = /^[\s\d\W_]+$/u;
function shouldSkipTranslation(input) {
  const trimmed = input.trim();
  if (!trimmed) return { skip: true, reason: "empty" };
  if (NON_TEXTUAL_RE.test(trimmed)) {
    return { skip: true, reason: "non_textual" };
  }
  const visibleLength = trimmed.replace(/\s+/g, "").length;
  if (visibleLength <= SHORT_VISIBLE_THRESHOLD) {
    return { skip: true, reason: "too_short_visible" };
  }
  const wordCount = trimmed.split(/\s+/u).filter(Boolean).length;
  if (wordCount <= SHORT_WORD_THRESHOLD) {
    return { skip: true, reason: "too_short_words" };
  }
  return { skip: false };
}

// server/lib/translate/index.ts
function selectedEngine() {
  const e = (process.env.TRANSLATE_ENGINE ?? "").toLowerCase();
  if (e === "mymemory" || e === "") return "mymemory";
  console.warn(`Unknown TRANSLATE_ENGINE=${e}; falling back to mymemory`);
  return "mymemory";
}
function normalizeForHash(text2) {
  return text2.trim().replace(/\s+/g, " ");
}
function hashText(text2) {
  return crypto.createHash("sha256").update(normalizeForHash(text2)).digest("hex");
}
async function readFromCache(srcLang, dstLang, textHash) {
  try {
    const [row] = await db.select({ translatedText: translations.translatedText }).from(translations).where(
      and4(
        eq4(translations.srcLang, srcLang),
        eq4(translations.dstLang, dstLang),
        eq4(translations.textHash, textHash)
      )
    ).limit(1);
    return row?.translatedText ?? null;
  } catch (e) {
    console.warn("translations cache read failed", e);
    return null;
  }
}
async function writeToCache(args) {
  try {
    await db.insert(translations).values({
      srcLang: args.srcLang,
      dstLang: args.dstLang,
      textHash: args.textHash,
      sourceText: args.sourceText,
      translatedText: args.translatedText,
      engine: args.engine
    }).onConflictDoNothing();
  } catch (e) {
    console.warn("translations cache write failed", e);
  }
}
async function translateText(input) {
  const engine = selectedEngine();
  const text2 = input.text ?? "";
  const srcLang = (input.srcLang ?? "").toLowerCase();
  const dstLang = (input.dstLang ?? "").toLowerCase();
  if (!srcLang || !dstLang || srcLang === dstLang) {
    return { text: text2, fromCache: false, skipped: true, skipReason: "same_lang", engine };
  }
  const decision = shouldSkipTranslation(text2);
  if (decision.skip) {
    return {
      text: text2,
      fromCache: false,
      skipped: true,
      skipReason: decision.reason ?? "empty",
      engine
    };
  }
  const textHash = hashText(text2);
  const cached = await readFromCache(srcLang, dstLang, textHash);
  if (cached !== null) {
    return { text: cached, fromCache: true, skipped: false, engine };
  }
  const { masked, replacements } = await maskGlossary(text2, dstLang);
  try {
    const result = engine === "mymemory" ? await myMemoryTranslate(masked, srcLang, dstLang) : await myMemoryTranslate(masked, srcLang, dstLang);
    const restored = unmaskGlossary(result.translatedText, replacements);
    const finalText = restored.trim();
    if (finalText && finalText !== masked) {
      await writeToCache({
        srcLang,
        dstLang,
        textHash,
        sourceText: text2,
        translatedText: finalText,
        engine
      });
    }
    return { text: finalText || text2, fromCache: false, skipped: false, engine };
  } catch (e) {
    if (e instanceof MyMemoryError) {
      console.warn("translateText engine error", e.message);
    } else {
      console.warn("translateText unexpected error", e);
    }
    return { text: text2, fromCache: false, skipped: false, engine, error: true };
  }
}

// server/debugIngest.ts
function debugIngestServer(body, sessionId = "88cb7d") {
  if (process.env.NODE_ENV === "production") return;
  fetch("http://127.0.0.1:7508/ingest/394829cb-326c-4cb8-ad25-91374b2c7523", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": sessionId },
    body: JSON.stringify(body)
  }).catch(() => {
  });
}

// constants/legalVersions.ts
var LEGAL_TERMS_VERSION = "2026-04-04";
var LEGAL_PRIVACY_VERSION = "2026-04-04";

// server/redis.ts
import { Redis } from "@upstash/redis";
import { EventEmitter } from "node:events";
var UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL ?? "";
var UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN && !UPSTASH_REDIS_REST_URL.startsWith("https://") && UPSTASH_REDIS_REST_TOKEN.startsWith("https://")) {
  console.log("[Redis] URL and TOKEN appear swapped \u2014 auto-correcting.");
  [UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN] = [UPSTASH_REDIS_REST_TOKEN, UPSTASH_REDIS_REST_URL];
}
var useRedis = !!(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);
if (!useRedis) {
  console.warn("[Redis] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not set. Using in-memory event bus for SSE.");
}
var redis = useRedis ? new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN }) : null;
var eventBus = new EventEmitter();
eventBus.setMaxListeners(200);
function jukeboxChannel(communityId) {
  return `jukebox:${communityId}`;
}
async function publishJukeboxEvent(communityId, event) {
  const channel = jukeboxChannel(communityId);
  const payload = { ...event, ts: Date.now() };
  if (useRedis) {
    try {
      const key = channel;
      const serialized = JSON.stringify(payload);
      await redis.lpush(key, serialized);
      await redis.ltrim(key, 0, 99);
      await redis.expire(key, 3600);
    } catch (e) {
      console.error("[Redis] publishJukeboxEvent error:", e);
    }
  }
  eventBus.emit(channel, payload);
}
function parseRedisItem(item) {
  if (typeof item === "string") {
    try {
      return JSON.parse(item);
    } catch {
      return null;
    }
  }
  return item;
}
function isStoredJukeboxEvent(e) {
  return e !== null && typeof e === "object" && "ts" in e && typeof e.ts === "number";
}
function subscribeJukeboxEvents(communityId, callback) {
  const channel = jukeboxChannel(communityId);
  let lastSeenTs = Date.now();
  const handler = (payload) => {
    lastSeenTs = Math.max(lastSeenTs, payload.ts);
    callback(payload);
  };
  eventBus.on(channel, handler);
  let pollInterval = null;
  if (useRedis) {
    pollInterval = setInterval(async () => {
      try {
        const items = await redis.lrange(channel, 0, 19);
        const events = items.map(parseRedisItem).filter(isStoredJukeboxEvent).filter((e) => e.ts > lastSeenTs).sort((a, b) => a.ts - b.ts);
        for (const event of events) {
          lastSeenTs = Math.max(lastSeenTs, event.ts);
          callback(event);
        }
      } catch {
      }
    }, 1e3);
  }
  return () => {
    eventBus.off(channel, handler);
    if (pollInterval) clearInterval(pollInterval);
  };
}

// server/routes.ts
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
var JWT_SECRET = process.env.SESSION_SECRET ?? "livestage-dev-secret";
var CLOUDFLARE_ACCOUNT_ID = (process.env.CLOUDFLARE_ACCOUNT_ID ?? "").trim();
var CLOUDFLARE_STREAM_TOKEN = (process.env.CLOUDFLARE_STREAM_TOKEN ?? "").trim();
var ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
function maskSecretPrefix(value) {
  if (!value) return "(empty, len=0)";
  const prefix = value.slice(0, 3);
  return `${prefix}*** (len=${value.length})`;
}
function resolvePublicAppOrigin() {
  const fromEnv = process.env.FRONTEND_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}`;
  }
  return "https://rawstock.live";
}
function formatCloudflareApiErrors(errors) {
  if (errors == null) return "";
  if (Array.isArray(errors)) {
    const parts = errors.map((e) => {
      if (e && typeof e === "object" && "message" in e) {
        const m = e.message;
        return typeof m === "string" ? m : "";
      }
      return "";
    }).filter(Boolean);
    return parts.join("; ");
  }
  return "";
}
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
  if (!d) return "Just now";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "Just now";
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1e3);
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
function queryStr(req, key) {
  const v = req.query[key];
  if (Array.isArray(v)) return typeof v[0] === "string" ? v[0] : "";
  return typeof v === "string" ? v : "";
}
var SUPPORTED_PREFERRED_LANGUAGES = /* @__PURE__ */ new Set([
  "en",
  "ja",
  "ko",
  "zh",
  "es",
  "fr",
  "de",
  "pt",
  "it",
  "vi",
  "th",
  "id",
  "ru",
  "ar"
]);
function normalizePreferredLanguage(value) {
  if (typeof value !== "string") return null;
  const lower = value.trim().toLowerCase();
  if (!lower) return null;
  const base = lower.split(/[-_]/u)[0];
  return SUPPORTED_PREFERRED_LANGUAGES.has(base) ? base : null;
}
function preferredLanguageFromHeader(req) {
  const raw = req.headers["accept-language"] ?? "";
  if (!raw) return null;
  const first = raw.split(",")[0]?.trim();
  return normalizePreferredLanguage(first);
}
var TRANSLATE_RATE_WINDOW_MS = 6e4;
var TRANSLATE_RATE_LIMIT = 30;
var translateRateBuckets = /* @__PURE__ */ new Map();
function checkTranslateRateLimit(userId) {
  const now = Date.now();
  const bucket2 = translateRateBuckets.get(userId);
  if (!bucket2 || now - bucket2.windowStart >= TRANSLATE_RATE_WINDOW_MS) {
    translateRateBuckets.set(userId, { windowStart: now, count: 1 });
    return { ok: true };
  }
  if (bucket2.count >= TRANSLATE_RATE_LIMIT) {
    const retryAfterSec = Math.ceil(
      (TRANSLATE_RATE_WINDOW_MS - (now - bucket2.windowStart)) / 1e3
    );
    return { ok: false, retryAfterSec };
  }
  bucket2.count += 1;
  return { ok: true };
}
async function getAuthUser(req) {
  const auth = req.headers?.authorization ?? "";
  if (!auth.startsWith("Bearer ")) {
    debugIngestServer({
      sessionId: "88cb7d",
      runId: "initial",
      hypothesisId: "H4",
      location: "server/routes.ts:getAuthUser",
      message: "Missing bearer token",
      data: { hasAuthHeader: Boolean(auth), authPrefix: typeof auth === "string" ? auth.slice(0, 16) : "" },
      timestamp: Date.now()
    });
    return null;
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    if (typeof payload === "string" || !payload || typeof payload.sub !== "number") return null;
    const sub = payload.sub;
    const [user] = await db.select().from(users).where(eq5(users.id, sub));
    if (!user) return null;
    debugIngestServer({
      sessionId: "88cb7d",
      runId: "initial",
      hypothesisId: "H4",
      location: "server/routes.ts:getAuthUser",
      message: "Authenticated request",
      data: { userId: user.id },
      timestamp: Date.now()
    });
    return {
      ...user,
      avatar: user.profileImageUrl,
      lastContentLang: user.lastContentLang ?? null,
      preferredLanguage: user.preferredLanguage ?? null
    };
  } catch {
    return null;
  }
}
async function syncUserLastContentLang(userId, rawText) {
  try {
    const lang = await detectContentLang(rawText);
    if (!lang) return;
    await db.update(users).set({ lastContentLang: lang, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(users.id, userId));
  } catch (e) {
    console.warn("syncUserLastContentLang skipped:", e);
  }
}
function policyFieldsForApi(u) {
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
    needsPrivacyReacceptance: pv !== LEGAL_PRIVACY_VERSION
  };
}
function isAdminRole(role) {
  return (role ?? "").toUpperCase() === "ADMIN";
}
async function getAdminUserOrReject(req, res) {
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
async function promoteAdminByEmail(target) {
  if (!ADMIN_EMAIL) return;
  if (target) {
    const normalized = (target.email ?? "").trim().toLowerCase();
    if (normalized !== ADMIN_EMAIL) return;
    await db.update(users).set({ role: "ADMIN", updatedAt: /* @__PURE__ */ new Date() }).where(eq5(users.id, target.id));
    return;
  }
  await db.update(users).set({ role: "ADMIN", updatedAt: /* @__PURE__ */ new Date() }).where(eq5(users.email, ADMIN_EMAIL));
}
var OPERATIONS_DM_NAME = "Operations Team";
var OPERATIONS_DM_AVATAR = "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=100&h=100&fit=crop";
var WELCOME_DM_TEXT = [
  "Welcome to RawStock \u2014 we're the Operations Team.",
  "",
  "Here's how to get started:",
  "",
  "Everyone",
  "\u2022 Sign in with Google to comment, buy tickets, upload, and manage your profile.",
  "\u2022 Open My Page \u2192 Edit profile to add a photo, bio, and social links.",
  "\u2022 Explore communities, join the ones you like, and chat with members.",
  "",
  "Fans",
  "\u2022 Buy tickets and use them for paid videos, live gifts, jukebox requests in communities, and more.",
  "\u2022 Follow creators from their profile to stay updated.",
  "",
  "Creators",
  "\u2022 Upload videos and set a price to sell. Use the AI Edit Assistant to polish raw footage.",
  "\u2022 Go live from the web / PWA broadcaster to connect with fans in real time.",
  "\u2022 Open Revenue to see earnings and request payouts (Stripe Connect setup required).",
  "",
  "Community hosts",
  "\u2022 Run a community: member activity can generate shared revenue (e.g. ads, jukebox).",
  "",
  "Questions? Reply to this DM anytime."
].join("\n");
async function ensureOperationsDmRow() {
  const [existing] = await db.select().from(dmMessages).where(eq5(dmMessages.name, OPERATIONS_DM_NAME));
  if (existing) return existing;
  try {
    const previewLine = WELCOME_DM_TEXT.split("\n").find((line) => line.trim().length > 0) ?? "Welcome to RawStock";
    const [created] = await db.insert(dmMessages).values({
      name: OPERATIONS_DM_NAME,
      avatar: OPERATIONS_DM_AVATAR,
      lastMessage: previewLine.slice(0, 500),
      time: "Just now",
      unread: 0,
      online: true,
      sortOrder: 0
    }).returning();
    if (created) {
      await db.insert(dmConversationMessages).values({
        dmId: created.id,
        sender: "them",
        text: WELCOME_DM_TEXT,
        isRead: false
      });
    }
    return created;
  } catch {
    const [again] = await db.select().from(dmMessages).where(eq5(dmMessages.name, OPERATIONS_DM_NAME));
    return again;
  }
}
function formatDmThreadTime(d) {
  if (!d) return "";
  const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
  if (Number.isNaN(t)) return "";
  const ms = Date.now() - t;
  const m = Math.floor(ms / 6e4);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  const dt = new Date(t);
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
}
async function sendWelcomeDmIfNeeded(userId) {
  try {
    await db.transaction(async (tx) => {
      const [claimed] = await tx.update(users).set({ welcomeDmSentAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(and5(eq5(users.id, userId), isNull(users.welcomeDmSentAt))).returning({ id: users.id });
      if (!claimed) return;
      let [operationsDm] = await tx.select().from(dmMessages).where(eq5(dmMessages.name, OPERATIONS_DM_NAME));
      if (!operationsDm) {
        [operationsDm] = await tx.insert(dmMessages).values({
          name: OPERATIONS_DM_NAME,
          avatar: OPERATIONS_DM_AVATAR,
          lastMessage: WELCOME_DM_TEXT,
          time: "Just now",
          unread: 1,
          online: true,
          sortOrder: 0
        }).returning();
      } else {
        const [updatedDm] = await tx.update(dmMessages).set({
          lastMessage: WELCOME_DM_TEXT,
          time: "Just now",
          unread: (operationsDm.unread ?? 0) + 1,
          online: true
        }).where(eq5(dmMessages.id, operationsDm.id)).returning();
        operationsDm = updatedDm ?? operationsDm;
      }
      await tx.insert(dmConversationMessages).values({
        dmId: operationsDm.id,
        sender: "them",
        text: WELCOME_DM_TEXT,
        isRead: false
      });
    });
  } catch (error) {
    console.error("Failed to send welcome DM:", error);
  }
}
var SYSTEM_WALLET_KINDS = ["MODERATOR", "ADMIN", "EVENT_RESERVE", "PLATFORM"];
async function getOrCreateSystemWallets() {
  const result = {};
  for (const kind of SYSTEM_WALLET_KINDS) {
    const [w] = await db.select().from(wallets).where(eq5(wallets.kind, kind));
    if (w) {
      result[kind] = w.id;
    } else {
      const [created] = await db.insert(wallets).values({ kind, userId: null }).returning();
      result[kind] = created.id;
    }
  }
  return result;
}
async function getOrCreateUserWallet(userId, executor = db) {
  const [w] = await executor.select().from(wallets).where(and5(eq5(wallets.userId, userId), isNull(wallets.kind)));
  if (w) return w.id;
  const [created] = await executor.insert(wallets).values({ userId, kind: null }).returning();
  return created.id;
}
var DEFAULT_LEVEL_THRESHOLDS = [
  { level: 1, requiredTipGross: 0, requiredStreamCount: 0, tipBackRate: 0.5 },
  { level: 2, requiredTipGross: 5e4, requiredStreamCount: 4, tipBackRate: 0.55 },
  { level: 3, requiredTipGross: 1e5, requiredStreamCount: 8, tipBackRate: 0.6 },
  { level: 4, requiredTipGross: 16e4, requiredStreamCount: 12, tipBackRate: 0.65 },
  { level: 5, requiredTipGross: 24e4, requiredStreamCount: 16, tipBackRate: 0.7 },
  { level: 6, requiredTipGross: 34e4, requiredStreamCount: 20, tipBackRate: 0.75 },
  { level: 7, requiredTipGross: 46e4, requiredStreamCount: 24, tipBackRate: 0.8 }
];
function getYearMonth(date = /* @__PURE__ */ new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
async function ensureDefaultLevelThresholds(executor = db) {
  const rows = await executor.select().from(creatorLevelThresholds).orderBy(asc3(creatorLevelThresholds.level));
  if (rows.length > 0) return rows;
  await executor.insert(creatorLevelThresholds).values(
    DEFAULT_LEVEL_THRESHOLDS.map((t) => ({
      level: t.level,
      requiredTipGross: t.requiredTipGross,
      requiredStreamCount: t.requiredStreamCount,
      tipBackRate: t.tipBackRate
    }))
  );
  return executor.select().from(creatorLevelThresholds).orderBy(asc3(creatorLevelThresholds.level));
}
async function syncCreatorLevelFromMonthlyProgress(creatorId, yearMonth, executor = db) {
  const thresholds = await ensureDefaultLevelThresholds(executor);
  const [score] = await executor.select().from(creatorMonthlyScores).where(and5(eq5(creatorMonthlyScores.creatorId, creatorId), eq5(creatorMonthlyScores.yearMonth, yearMonth)));
  const tipGross = score?.tipGross ?? 0;
  const streamCountMonthly = score?.streamCountMonthly ?? 0;
  const achieved = thresholds.reduce((acc, t) => {
    if (tipGross >= t.requiredTipGross && streamCountMonthly >= t.requiredStreamCount) return Math.max(acc, t.level);
    return acc;
  }, 1);
  await executor.update(creators).set({ currentLevel: achieved }).where(eq5(creators.id, creatorId));
  return achieved;
}
async function upsertCreatorMonthlyRevenue(creatorId, yearMonth, source, grossAmount, executor = db) {
  const [existing] = await executor.select().from(creatorMonthlyScores).where(and5(eq5(creatorMonthlyScores.creatorId, creatorId), eq5(creatorMonthlyScores.yearMonth, yearMonth)));
  if (!existing) {
    await executor.insert(creatorMonthlyScores).values({
      creatorId,
      yearMonth,
      tipGross: source === "tip" ? grossAmount : 0,
      paidLiveGross: source === "tip" ? 0 : grossAmount
    });
    return;
  }
  await executor.update(creatorMonthlyScores).set({
    tipGross: source === "tip" ? existing.tipGross + grossAmount : existing.tipGross,
    paidLiveGross: source === "tip" ? existing.paidLiveGross : existing.paidLiveGross + grossAmount,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq5(creatorMonthlyScores.id, existing.id));
}
async function recordRevenue(walletId, userId, creatorId, amount, source, referenceId, executor = db) {
  const yearMonth = getYearMonth();
  let backRate = 0.9;
  if (source === "tip") {
    const thresholds = await ensureDefaultLevelThresholds(executor);
    const [creator] = creatorId ? await executor.select().from(creators).where(eq5(creators.id, creatorId)) : [];
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
    referenceId
  });
  await executor.insert(earnings).values({
    userId: `user-${userId}`,
    type: source,
    title: source === "tip" ? "Tip revenue" : "Paid live revenue",
    amount,
    revenueShare: Math.round(backRate * 100),
    netAmount
  });
  if (creatorId) {
    const [creator] = await executor.select().from(creators).where(eq5(creators.id, creatorId));
    if (creator) {
      await executor.update(creators).set({
        revenue: creator.revenue + amount,
        revenueShare: Math.round(backRate * 100)
      }).where(eq5(creators.id, creatorId));
    }
    await upsertCreatorMonthlyRevenue(creatorId, yearMonth, source, amount, executor);
    await syncCreatorLevelFromMonthlyProgress(creatorId, yearMonth, executor);
  }
}
async function creatorRowForUserId(executor, userId) {
  const [u] = await executor.select({ displayName: users.displayName }).from(users).where(eq5(users.id, userId)).limit(1);
  if (!u) return void 0;
  const [row] = await executor.select().from(creators).where(eq5(creators.name, u.displayName)).limit(1);
  return row;
}
async function resolveVideoSellerUserId(executor, videoId) {
  const [row] = await executor.select().from(videos).where(eq5(videos.id, videoId)).limit(1);
  if (!row || row.hidden) return null;
  if (row.userId != null && Number.isInteger(row.userId) && row.userId > 0) return row.userId;
  const [creatorUser] = await executor.select({ id: users.id }).from(users).where(eq5(users.displayName, row.creator)).limit(1);
  return creatorUser?.id ?? null;
}
async function registerRoutes(app2) {
  await promoteAdminByEmail();
  app2.post("/api/auth/register", async (req, res) => {
    const { password, name } = req.body ?? {};
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    const [existing] = await db.select().from(users).where(eq5(users.email, email));
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const hash = await bcrypt.hash(password, 10);
    const displayName = name || email.split("@")[0];
    const lineId = `email:${email}`;
    const preferredLanguage = normalizePreferredLanguage(req.body?.preferredLanguage) ?? preferredLanguageFromHeader(req);
    const [user] = await db.insert(users).values({
      lineId,
      displayName,
      email,
      passwordHash: hash,
      role: "USER",
      bio: "",
      preferredLanguage
    }).returning();
    await promoteAdminByEmail({ id: user.id, email: user.email });
    await sendWelcomeDmIfNeeded(user.id);
    const token = makeToken(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.displayName,
        email: user.email,
        preferredLanguage: user.preferredLanguage ?? null
      }
    });
  });
  app2.post("/api/auth/demo", (_req, res) => {
    return res.status(403).json({ error: "Demo login is disabled", code: "DEMO_DISABLED" });
  });
  app2.post("/api/auth/login", async (req, res) => {
    const password = req.body?.password;
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const [user] = await db.select().from(users).where(eq5(users.email, email));
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    await promoteAdminByEmail({ id: user.id, email: user.email });
    await sendWelcomeDmIfNeeded(user.id);
    let preferredLanguage = user.preferredLanguage ?? null;
    if (!preferredLanguage) {
      const guess = normalizePreferredLanguage(req.body?.preferredLanguage) ?? preferredLanguageFromHeader(req);
      if (guess) {
        try {
          await db.update(users).set({ preferredLanguage: guess, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(users.id, user.id));
          preferredLanguage = guess;
        } catch (e) {
          console.warn("login preferredLanguage backfill failed", e);
        }
      }
    } else {
      const explicit = normalizePreferredLanguage(req.body?.preferredLanguage);
      if (explicit && explicit !== preferredLanguage) {
        try {
          await db.update(users).set({ preferredLanguage: explicit, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(users.id, user.id));
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
        preferredLanguage
      }
    });
  });
  app2.get("/api/auth/me", async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const [u] = await db.select({
      pinnedCommunityIds: users.pinnedCommunityIds
    }).from(users).where(eq5(users.id, user.id));
    let pinnedCommunityIds = [];
    if (u) {
      if (u.pinnedCommunityIds) {
        try {
          const p = JSON.parse(u.pinnedCommunityIds);
          if (Array.isArray(p)) pinnedCommunityIds = p;
        } catch {
        }
      }
    }
    const payoutTermsAt = user.payoutTermsAgreedAt;
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
      spotifyUrl: user.spotifyUrl ?? null,
      appleMusicUrl: user.appleMusicUrl ?? null,
      bandcampUrl: user.bandcampUrl ?? null,
      instagramUrl: user.instagramUrl ?? null,
      youtubeUrl: user.youtubeUrl ?? null,
      xUrl: user.xUrl ?? null,
      phoneNumber: user.phoneNumber ?? null,
      pinnedCommunityIds,
      ...policyFieldsForApi(user)
    });
  });
  app2.get("/api/translate/preferred-language", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    res.json({
      preferredLanguage: user.preferredLanguage ?? null,
      lastContentLang: user.lastContentLang ?? null,
      supported: Array.from(SUPPORTED_PREFERRED_LANGUAGES)
    });
  });
  app2.patch("/api/translate/preferred-language", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const next = normalizePreferredLanguage(req.body?.preferredLanguage);
    if (!next) {
      return res.status(400).json({
        error: "Unsupported language",
        supported: Array.from(SUPPORTED_PREFERRED_LANGUAGES)
      });
    }
    await db.update(users).set({ preferredLanguage: next, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(users.id, user.id));
    res.json({ preferredLanguage: next });
  });
  app2.post("/api/translate", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const limit = checkTranslateRateLimit(user.id);
    if (!limit.ok) {
      if (limit.retryAfterSec) res.setHeader("Retry-After", String(limit.retryAfterSec));
      return res.status(429).json({
        error: "Too many translation requests",
        retryAfterSec: limit.retryAfterSec
      });
    }
    const text2 = typeof req.body?.text === "string" ? req.body.text : "";
    if (!text2.trim()) {
      return res.status(400).json({ error: "text is required" });
    }
    const MAX_TRANSLATE_LENGTH = 5e3;
    if (text2.length > MAX_TRANSLATE_LENGTH) {
      return res.status(413).json({
        error: `text exceeds ${MAX_TRANSLATE_LENGTH} chars`
      });
    }
    const explicitDst = normalizePreferredLanguage(req.body?.dstLang);
    const dstLang = explicitDst ?? user.preferredLanguage ?? preferredLanguageFromHeader(req) ?? "en";
    const explicitSrc = normalizePreferredLanguage(req.body?.srcLang);
    let srcLang = explicitSrc ?? null;
    if (!srcLang) {
      const detected = await detectContentLang(text2);
      srcLang = detected ?? null;
    }
    if (!srcLang) {
      return res.json({
        text: text2,
        srcLang: null,
        dstLang,
        skipped: true,
        skipReason: "src_unknown",
        engine: "mymemory",
        fromCache: false
      });
    }
    const result = await translateText({ text: text2, srcLang, dstLang });
    res.json({
      text: result.text,
      srcLang,
      dstLang,
      skipped: result.skipped,
      skipReason: result.skipReason ?? null,
      fromCache: result.fromCache,
      engine: result.engine,
      error: result.error ?? false
    });
  });
  app2.post("/api/auth/accept-policies", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const { acceptTerms, acceptPrivacy } = req.body;
    const doTerms = acceptTerms !== false;
    const doPrivacy = acceptPrivacy !== false;
    const now = /* @__PURE__ */ new Date();
    const patch = { updatedAt: now };
    if (doTerms) {
      patch.termsAcceptedVersion = LEGAL_TERMS_VERSION;
      patch.termsAcceptedAt = now;
    }
    if (doPrivacy) {
      patch.privacyAcceptedVersion = LEGAL_PRIVACY_VERSION;
      patch.privacyAcceptedAt = now;
    }
    const [row] = await db.update(users).set(patch).where(eq5(users.id, user.id)).returning();
    res.json({
      ok: true,
      ...policyFieldsForApi(row)
    });
  });
  app2.post("/api/connect/payout-terms-agree", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const now = /* @__PURE__ */ new Date();
    await db.update(users).set({ payoutTermsAgreedAt: now, updatedAt: now }).where(eq5(users.id, user.id));
    res.json({ ok: true, payoutTermsAgreedAt: now.toISOString() });
  });
  app2.post("/api/connect/onboard", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const [ptRow] = await db.select({ payoutTermsAgreedAt: users.payoutTermsAgreedAt }).from(users).where(eq5(users.id, user.id));
    if (!ptRow?.payoutTermsAgreedAt) {
      return res.status(400).json({
        error: "Please accept the creator payout terms. Review them in Payout Settings, then connect Stripe after agreeing."
      });
    }
    try {
      const baseUrl = "https://rawstock.live";
      const returnUrl = `${baseUrl}/payout-settings?connect=return`;
      const refreshUrl = `${baseUrl}/payout-settings?connect=refresh`;
      let accountId = user.stripeConnectId;
      if (!accountId) {
        accountId = await createConnectExpressAccount({ country: "JP" });
        await db.update(users).set({ stripeConnectId: accountId, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(users.id, user.id));
      }
      const url = await createConnectAccountLink({ accountId, returnUrl, refreshUrl });
      res.json({ url, accountId });
    } catch (e) {
      console.error("Connect onboard error:", e);
      res.status(500).json({ error: e.message ?? "Failed to prepare Stripe Connect" });
    }
  });
  app2.get("/api/connect/status", async (req, res) => {
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
      detailsSubmitted: account?.details_submitted ?? false
    });
  });
  const BANNER_MIN_AMOUNT = 1e4;
  const BANNER_RATE_MODERATOR = 0.2;
  const BANNER_RATE_ADMIN = 0.2;
  const BANNER_RATE_EVENT = 0.1;
  const BANNER_RATE_PLATFORM = 0.5;
  app2.post("/api/banner/checkout", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const { people, days } = req.body;
    const p = Math.max(1, Number(people) || 1);
    const d = Math.max(1, Number(days) || 1);
    const amountUSD = Math.max(BANNER_MIN_AMOUNT, p * 5 * d);
    try {
      const { clientSecret, paymentIntentId } = await createBannerPaymentIntent({
        amountUSD,
        metadata: { userId: String(user.id), people: String(p), days: String(d), type: "banner_ad" }
      });
      res.json({ clientSecret, paymentIntentId, amountUSD });
    } catch (e) {
      console.error("Banner checkout error:", e);
      res.status(500).json({ error: e.message ?? "Failed to prepare payment" });
    }
  });
  app2.post("/api/banner/confirm", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const { paymentIntentId } = req.body;
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
    await db.insert(transactions).values([
      { walletId: sys.MODERATOR, amount: amountMod, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId },
      { walletId: sys.ADMIN, amount: amountAdmin, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId },
      { walletId: sys.EVENT_RESERVE, amount: amountEvent, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId },
      { walletId: sys.PLATFORM, amount: amountPlatform, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId }
    ]);
    res.json({ ok: true, amountUSD, split: { moderator: amountMod, admin: amountAdmin, eventReserve: amountEvent, platform: amountPlatform } });
  });
  const BANNER_CHECKOUT_DAYS = 3;
  const BANNER_CHECKOUT_AMOUNT_USD = 1e4;
  app2.post("/api/banner/checkout-session", async (req, res) => {
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
                description: `Community page ad banner slot, 3-day run ($${(BANNER_CHECKOUT_AMOUNT_USD / 100).toFixed(2)})`
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
      res.status(500).json({ error: e.message ?? "Failed to prepare payment" });
    }
  });
  app2.post("/api/banner/confirm-session", async (req, res) => {
    const { sessionId } = req.body;
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
      await db.insert(transactions).values([
        { walletId: sys.MODERATOR, amount: amountMod, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId },
        { walletId: sys.ADMIN, amount: amountAdmin, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId },
        { walletId: sys.EVENT_RESERVE, amount: amountEvent, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId },
        { walletId: sys.PLATFORM, amount: amountPlatform, type: "banner_ad", status: "PENDING", referenceId: paymentIntentId }
      ]);
      res.json({
        ok: true,
        amountUSD,
        split: { moderator: amountMod, admin: amountAdmin, eventReserve: amountEvent, platform: amountPlatform }
      });
    } catch (e) {
      console.error("Banner confirm-session error:", e);
      res.status(500).json({ error: e.message ?? "Failed to confirm payment" });
    }
  });
  function buildMockTwoShotSlots(hostId) {
    const d1 = /* @__PURE__ */ new Date();
    d1.setUTCDate(d1.getUTCDate() + 1);
    d1.setUTCHours(11, 0, 0, 0);
    const d2 = new Date(d1);
    d2.setUTCDate(d2.getUTCDate() + 1);
    d2.setUTCHours(18, 0, 0, 0);
    const d3 = new Date(d1);
    d3.setUTCDate(d3.getUTCDate() + 3);
    d3.setUTCHours(12, 30, 0, 0);
    return [
      { slotKey: `${hostId}-slot-a`, label: "Tomorrow 20:00 JST (30 min)", scheduledAt: d1.toISOString(), durationMinutes: 30, priceJpy: 3e3 },
      { slotKey: `${hostId}-slot-b`, label: "Day after \xB7 Evening (30 min)", scheduledAt: d2.toISOString(), durationMinutes: 30, priceJpy: 3e3 },
      { slotKey: `${hostId}-slot-c`, label: "+3 days \xB7 Noon (45 min)", scheduledAt: d3.toISOString(), durationMinutes: 45, priceJpy: 4500 }
    ];
  }
  app2.get("/api/two-shot/slots", async (req, res) => {
    const hostId = parseInt(String(req.query?.hostId ?? ""), 10);
    if (!Number.isFinite(hostId) || hostId <= 0) {
      return res.status(400).json({ error: "hostId is required" });
    }
    const [host] = await db.select({ id: users.id }).from(users).where(eq5(users.id, hostId)).limit(1);
    if (!host) return res.status(404).json({ error: "Host not found" });
    return res.json({ hostId, slots: buildMockTwoShotSlots(hostId) });
  });
  app2.get("/api/two-shot/reservations/:id", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const id = paramNum(req, "id");
    const [row] = await db.select().from(twoShotReservations).where(eq5(twoShotReservations.id, id)).limit(1);
    if (!row) return res.status(404).json({ error: "Not found" });
    if (row.hostUserId !== user.id && row.guestUserId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return res.json(row);
  });
  app2.post("/api/checkout/2shot", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const { hostId, slotKey, origin } = req.body;
    if (!hostId || hostId <= 0 || !slotKey || typeof slotKey !== "string") {
      return res.status(400).json({ error: "hostId and slotKey are required" });
    }
    if (hostId === user.id) {
      return res.status(400).json({ error: "You cannot book your own slot" });
    }
    const [host] = await db.select({ id: users.id }).from(users).where(eq5(users.id, hostId)).limit(1);
    if (!host) return res.status(404).json({ error: "Host not found" });
    const slots = buildMockTwoShotSlots(hostId);
    const slot = slots.find((s) => s.slotKey === slotKey);
    if (!slot) return res.status(400).json({ error: "Invalid slot" });
    const baseOrigin = (typeof origin === "string" && origin.startsWith("http") ? origin : resolvePublicAppOrigin()).replace(
      /\/$/,
      ""
    );
    try {
      const stripe = await getUncachableStripeClient();
      const [reservation] = await db.insert(twoShotReservations).values({
        hostUserId: hostId,
        guestUserId: user.id,
        scheduledAt: new Date(slot.scheduledAt),
        durationMinutes: slot.durationMinutes,
        status: "PENDING",
        slotKey: slot.slotKey
      }).returning();
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "jpy",
              unit_amount: slot.priceJpy,
              product_data: {
                name: `2-shot session \xB7 ${slot.label}`,
                description: `Host #${hostId} \u2014 1:1 paid stream (reservation #${reservation.id})`
              }
            },
            quantity: 1
          }
        ],
        mode: "payment",
        success_url: `${baseOrigin}/two-shot/success?reservationId=${reservation.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseOrigin}/two-shot/reserve?hostId=${hostId}`,
        client_reference_id: String(reservation.id),
        metadata: {
          type: "two_shot_reservation",
          reservationId: String(reservation.id),
          hostUserId: String(hostId),
          guestUserId: String(user.id)
        }
      });
      await db.update(twoShotReservations).set({ stripeCheckoutSessionId: session.id }).where(eq5(twoShotReservations.id, reservation.id));
      return res.json({ url: session.url, sessionId: session.id, reservationId: reservation.id });
    } catch (e) {
      console.error("[checkout/2shot]", e);
      return res.status(500).json({ error: e?.message ?? "Failed to create checkout session" });
    }
  });
  app2.post("/api/webhook/stripe", async (req, res) => {
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
    let event;
    try {
      const stripe = await getUncachableStripeClient();
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    } catch (err) {
      console.warn("[webhook/stripe] signature failed", err?.message);
      return res.status(400).send(`Webhook Error: ${err?.message ?? "invalid signature"}`);
    }
    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const metaType = session.metadata?.type;
        if (metaType === "two_shot_reservation") {
          const rid = parseInt(session.metadata?.reservationId ?? "", 10);
          if (Number.isFinite(rid) && rid > 0) {
            await db.update(twoShotReservations).set({
              status: "CONFIRMED",
              stripeCheckoutSessionId: session.id
            }).where(and5(eq5(twoShotReservations.id, rid), eq5(twoShotReservations.status, "PENDING")));
          }
        } else if (metaType === "ticket_purchase" || session.metadata?.tickets && session.metadata?.userId) {
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
  app2.put("/api/auth/profile", async (req, res) => {
    debugIngestServer({
      sessionId: "88cb7d",
      runId: "initial",
      hypothesisId: "H3",
      location: "server/routes.ts:/api/auth/profile",
      message: "Profile endpoint hit",
      data: { bodyKeys: Object.keys(req.body ?? {}) },
      timestamp: Date.now()
    });
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const { name, displayName, bio, avatar, profileImageUrl, spotifyUrl, appleMusicUrl, bandcampUrl, instagramUrl, youtubeUrl, xUrl, phoneNumber, pinnedCommunityIds } = req.body;
    const newName = name ?? displayName ?? user.displayName;
    const newBio = bio ?? user.bio;
    const newAvatar = avatar ?? profileImageUrl ?? user.profileImageUrl;
    const newPhone = phoneNumber !== void 0 ? phoneNumber?.trim() || null : void 0;
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
      ...pinnedJson !== void 0 && { pinnedCommunityIds: pinnedJson },
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq5(users.id, user.id)).returning();
    const profileTextForLang = (newBio || "").trim() || newName;
    await syncUserLastContentLang(user.id, profileTextForLang);
    const detectedLang = await detectContentLang(profileTextForLang);
    const lastContentLangOut = detectedLang ?? updated.lastContentLang ?? null;
    let outPinned = [];
    if (updated.pinnedCommunityIds) {
      try {
        const p = JSON.parse(updated.pinnedCommunityIds);
        if (Array.isArray(p)) outPinned = p;
      } catch {
      }
    }
    const payoutTermsOut = updated.payoutTermsAgreedAt;
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
      instagramUrl: updated.instagramUrl ?? null,
      youtubeUrl: updated.youtubeUrl ?? null,
      pinnedCommunityIds: outPinned,
      xUrl: updated.xUrl ?? null,
      ...policyFieldsForApi(updated)
    });
  });
  app2.delete("/api/auth/account", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const [owned] = await db.select().from(communities).where(eq5(communities.ownerId, user.id)).limit(1);
    if (owned) {
      return res.status(400).json({ error: "You cannot delete your account while you manage a community. Delete the community first." });
    }
    try {
      await db.delete(communityMembers).where(eq5(communityMembers.userId, user.id));
      await db.delete(communityModerators).where(eq5(communityModerators.userId, user.id));
      await db.delete(communityPollVotes).where(eq5(communityPollVotes.userId, user.id));
      await db.delete(communityVotes).where(eq5(communityVotes.userId, user.id));
      await db.update(videos).set({ userId: null }).where(eq5(videos.userId, user.id));
      await db.delete(videoComments).where(eq5(videoComments.userId, user.id));
      await db.delete(users).where(eq5(users.id, user.id));
      res.json({ ok: true });
    } catch (e) {
      console.error("Account deletion error:", e);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });
  app2.get("/api/profile/by-name/:name", async (req, res) => {
    const name = decodeURIComponent(req.params.name || "");
    if (!name.trim()) return res.status(400).json({ error: "Please provide a name" });
    const [u] = await db.select({ id: users.id }).from(users).where(eq5(users.displayName, name));
    if (u) return res.json({ type: "user", id: u.id });
    const [c] = await db.select({ id: creators.id }).from(creators).where(eq5(creators.name, name));
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
      role: users.role,
      instagramUrl: users.instagramUrl,
      youtubeUrl: users.youtubeUrl,
      xUrl: users.xUrl,
      spotifyUrl: users.spotifyUrl,
      appleMusicUrl: users.appleMusicUrl,
      bandcampUrl: users.bandcampUrl,
      pinnedCommunityIds: users.pinnedCommunityIds
    }).from(users).where(eq5(users.id, id));
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
    const [{ c: followersCountRaw }] = await db.select({ c: count() }).from(userFollows).where(eq5(userFollows.followingId, id));
    const [{ c: followingCountRaw }] = await db.select({ c: count() }).from(userFollows).where(eq5(userFollows.followerId, id));
    res.json({
      id: u.id,
      name: u.displayName,
      displayName: u.displayName,
      avatar: u.profileImageUrl,
      profileImageUrl: u.profileImageUrl,
      bio: u.bio ?? "",
      role: u.role ?? "USER",
      instagramUrl: u.instagramUrl ?? null,
      youtubeUrl: u.youtubeUrl ?? null,
      xUrl: u.xUrl ?? null,
      spotifyUrl: u.spotifyUrl ?? null,
      appleMusicUrl: u.appleMusicUrl ?? null,
      bandcampUrl: u.bandcampUrl ?? null,
      pinnedCommunities,
      followersCount: Number(followersCountRaw ?? 0),
      followingCount: Number(followingCountRaw ?? 0)
    });
  });
  app2.get("/api/users/:id/follow-status", async (req, res) => {
    const me = await getAuthUser(req);
    if (!me) return res.status(401).json({ error: "Not authenticated" });
    const targetId = paramNum(req, "id");
    if (!targetId) return res.status(400).json({ error: "Invalid id" });
    const [row] = await db.select({ id: userFollows.id }).from(userFollows).where(and5(eq5(userFollows.followerId, me.id), eq5(userFollows.followingId, targetId)));
    res.json({ isFollowing: !!row });
  });
  app2.get("/api/users/:id/mentor-sessions", async (req, res) => {
    const uid = paramNum(req, "id");
    if (!uid) return res.status(400).json({ error: "Invalid id" });
    const rows = await db.select().from(mentorSessions).where(and5(eq5(mentorSessions.creatorId, uid), eq5(mentorSessions.isActive, true))).orderBy(desc(mentorSessions.createdAt));
    res.json(rows);
  });
  app2.get("/api/users/:id/communities", async (req, res) => {
    const uid = paramNum(req, "id");
    if (!uid) return res.status(400).json({ error: "Invalid id" });
    const memberships = await db.select({ communityId: communityMembers.communityId }).from(communityMembers).where(eq5(communityMembers.userId, uid));
    if (memberships.length === 0) return res.json([]);
    const ids = memberships.map((m) => m.communityId);
    const rows = await db.select({
      id: communities.id,
      name: communities.name,
      thumbnail: communities.thumbnail,
      category: communities.category
    }).from(communities).where(inArray(communities.id, ids)).orderBy(desc(communities.members));
    res.json(rows);
  });
  app2.get("/api/users/:id/followers", async (req, res) => {
    const targetId = paramNum(req, "id");
    if (!targetId) return res.status(400).json({ error: "Invalid id" });
    const rows = await db.select({
      id: users.id,
      displayName: users.displayName,
      profileImageUrl: users.profileImageUrl,
      bio: users.bio
    }).from(userFollows).innerJoin(users, eq5(users.id, userFollows.followerId)).where(eq5(userFollows.followingId, targetId));
    res.json(
      rows.map((r) => ({
        id: r.id,
        displayName: r.displayName,
        profileImageUrl: r.profileImageUrl,
        bio: r.bio,
        followersCount: 0
      }))
    );
  });
  app2.get("/api/users/:id/following", async (req, res) => {
    const targetId = paramNum(req, "id");
    if (!targetId) return res.status(400).json({ error: "Invalid id" });
    const rows = await db.select({
      id: users.id,
      displayName: users.displayName,
      profileImageUrl: users.profileImageUrl,
      bio: users.bio
    }).from(userFollows).innerJoin(users, eq5(users.id, userFollows.followingId)).where(eq5(userFollows.followerId, targetId));
    res.json(
      rows.map((r) => ({
        id: r.id,
        displayName: r.displayName,
        profileImageUrl: r.profileImageUrl,
        bio: r.bio,
        followersCount: 0
      }))
    );
  });
  app2.post("/api/users/:id/follow", async (req, res) => {
    const me = await getAuthUser(req);
    if (!me) return res.status(401).json({ error: "Not authenticated" });
    const targetId = paramNum(req, "id");
    if (!targetId) return res.status(400).json({ error: "Invalid id" });
    if (targetId === me.id) return res.status(400).json({ error: "You cannot follow yourself" });
    const [exists] = await db.select({ id: users.id }).from(users).where(eq5(users.id, targetId));
    if (!exists) return res.status(404).json({ error: "Not found" });
    await db.insert(userFollows).values({ followerId: me.id, followingId: targetId }).onConflictDoNothing({ target: [userFollows.followerId, userFollows.followingId] });
    res.json({ ok: true });
  });
  app2.delete("/api/users/:id/follow", async (req, res) => {
    const me = await getAuthUser(req);
    if (!me) return res.status(401).json({ error: "Not authenticated" });
    const targetId = paramNum(req, "id");
    if (!targetId) return res.status(400).json({ error: "Invalid id" });
    await db.delete(userFollows).where(and5(eq5(userFollows.followerId, me.id), eq5(userFollows.followingId, targetId)));
    res.json({ ok: true });
  });
  const BASE_URL = resolvePublicAppOrigin();
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
  const GOOGLE_CALLBACK_URL = `${BASE_URL}/api/auth/google-callback`;
  const GOOGLE_STATE = "livestage-google-state";
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY ?? "";
  app2.get("/api/auth/status", (_req, res) => {
    res.json({
      google: {
        configured: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_CALLBACK_URL),
        callbackUrl: GOOGLE_CALLBACK_URL,
        publicOrigin: BASE_URL,
        /** Web クライアント ID は公開情報。`.env` の GOOGLE_CLIENT_ID が GCP のクライアントと一致するか照合用 */
        clientId: GOOGLE_CLIENT_ID || null
      }
    });
  });
  app2.get("/api/auth/google", (_req, res) => {
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
      prompt: "consent"
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  });
  app2.get("/api/auth/google-callback", async (req, res) => {
    const code = req.query.code;
    const state = req.query.state;
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
          client_secret: GOOGLE_CLIENT_SECRET
        }).toString()
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        return res.redirect(`${BASE_URL}/auth/login?auth_error=token_failed`);
      }
      const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const profile = await profileRes.json();
      if (!profile.sub) {
        return res.redirect(`${BASE_URL}/auth/login?auth_error=profile_failed`);
      }
      const googleKey = `google:${profile.sub}`;
      const displayName = profile.name ?? profile.email ?? "Google User";
      const avatar = profile.picture ?? null;
      const googleEmail = typeof profile.email === "string" ? profile.email.trim().toLowerCase() : null;
      const expiresAt = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1e3) : null;
      const tokenUpdate = {
        googleAccessToken: tokenData.access_token,
        ...tokenData.refresh_token ? { googleRefreshToken: tokenData.refresh_token } : {},
        ...expiresAt ? { googleTokenExpiresAt: expiresAt } : {}
      };
      let [existing] = await db.select().from(users).where(eq5(users.lineId, googleKey));
      if (!existing) {
        [existing] = await db.insert(users).values({
          lineId: googleKey,
          displayName,
          profileImageUrl: avatar,
          email: googleEmail,
          role: "USER",
          ...tokenUpdate
        }).returning();
      } else {
        const nextValues = {
          displayName,
          profileImageUrl: avatar,
          updatedAt: /* @__PURE__ */ new Date(),
          ...tokenUpdate
        };
        if (googleEmail) nextValues.email = googleEmail;
        [existing] = await db.update(users).set(nextValues).where(eq5(users.id, existing.id)).returning();
      }
      await promoteAdminByEmail({ id: existing.id, email: existing.email });
      await sendWelcomeDmIfNeeded(existing.id);
      const jwtToken = makeToken(existing.id);
      res.redirect(`${BASE_URL}/?token=${encodeURIComponent(jwtToken)}`);
    } catch (err) {
      console.error("Google callback error:", err);
      res.redirect(`${BASE_URL}/auth/login?auth_error=server_error`);
    }
  });
  app2.get("/api/youtube/search", async (req, res) => {
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
        maxResults: "8"
      });
      const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
      if (!ytRes.ok) {
        const text2 = await ytRes.text();
        console.error("YouTube search error:", ytRes.status, text2);
        let clientMessage = "YouTube search failed";
        try {
          const errJson = JSON.parse(text2);
          if (errJson?.error?.message) {
            clientMessage = errJson.error.message;
          }
        } catch {
        }
        return res.status(502).json({ error: clientMessage });
      }
      const json = await ytRes.json();
      const items = json.items ?? [];
      const baseResults = items.map((item) => {
        const videoId = item.id?.videoId;
        const title = item.snippet?.title ?? "";
        const thumbs = item.snippet?.thumbnails;
        const thumbUrl = thumbs?.high?.url ?? thumbs?.medium?.url ?? thumbs?.default?.url ?? "";
        if (!videoId || !thumbUrl) return null;
        return { videoId, title, thumbnail: thumbUrl };
      }).filter(Boolean);
      const videoIds = baseResults.map((r) => r.videoId).join(",");
      let durationMap = {};
      if (videoIds) {
        try {
          const vParams = new URLSearchParams({
            key: YOUTUBE_API_KEY,
            part: "contentDetails",
            id: videoIds
          });
          const vRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?${vParams.toString()}`);
          if (vRes.ok) {
            const vJson = await vRes.json();
            for (const v of vJson.items ?? []) {
              if (v.id && v.contentDetails?.duration) {
                const m = v.contentDetails.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                if (m) {
                  const secs = parseInt(m[1] ?? "0") * 3600 + parseInt(m[2] ?? "0") * 60 + parseInt(m[3] ?? "0");
                  durationMap[v.id] = secs;
                }
              }
            }
          }
        } catch {
        }
      }
      const results = baseResults.map((r) => ({
        ...r,
        durationSecs: durationMap[r.videoId] ?? 0
      }));
      res.json(results);
    } catch (e) {
      console.error("YouTube search exception:", e);
      res.status(500).json({ error: "An error occurred during YouTube search" });
    }
  });
  async function getGoogleAccessToken(userId) {
    const [u] = await db.select().from(users).where(eq5(users.id, userId));
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
      }).where(eq5(users.id, userId));
      return data.access_token;
    } catch {
      return null;
    }
  }
  app2.get("/api/youtube/playlists", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const accessToken = await getGoogleAccessToken(user.id);
    if (!accessToken) {
      return res.status(403).json({
        error: "Sign in with Google to use YouTube playlists",
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
        return res.status(502).json({ error: "Failed to fetch the playlist" });
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
      res.status(500).json({ error: "An error occurred while fetching the playlist" });
    }
  });
  app2.get("/api/youtube/playlists/:playlistId/items", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const accessToken = await getGoogleAccessToken(user.id);
    if (!accessToken) {
      return res.status(403).json({
        error: "Sign in with Google to use YouTube playlists",
        needsGoogleLogin: true
      });
    }
    const playlistId = paramStr(req, "playlistId");
    if (!playlistId) return res.status(400).json({ error: "playlistId is required" });
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
        return res.status(502).json({ error: "Failed to fetch the playlist" });
      }
      const json = await ytRes.json();
      const baseItems = (json.items ?? []).map((item) => {
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
      let durationMap = {};
      const videoIds = baseItems.map((i) => i.videoId).join(",");
      if (videoIds && YOUTUBE_API_KEY) {
        try {
          const vParams = new URLSearchParams({ key: YOUTUBE_API_KEY, part: "contentDetails", id: videoIds });
          const vRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?${vParams.toString()}`);
          if (vRes.ok) {
            const vJson = await vRes.json();
            for (const v of vJson.items ?? []) {
              if (v.id && v.contentDetails?.duration) {
                const m = v.contentDetails.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                if (m) durationMap[v.id] = parseInt(m[1] ?? "0") * 3600 + parseInt(m[2] ?? "0") * 60 + parseInt(m[3] ?? "0");
              }
            }
          }
        } catch {
        }
      }
      const items = baseItems.map((i) => ({ ...i, durationSecs: durationMap[i.videoId] ?? 0 }));
      res.json(items);
    } catch (e) {
      console.error("YouTube playlistItems exception:", e);
      res.status(500).json({ error: "An error occurred while fetching the playlist" });
    }
  });
  const GENRE_TO_CATEGORY = {
    pop: ["Pop", "J-Pop", "K-Pop", "Music", "Vocal"],
    rock: ["Rock", "Band", "Guitar"],
    hiphop: ["Hip-Hop", "HipHop", "Rap", "Trap"],
    edm: ["EDM", "Electronic", "House", "DJ"],
    ai: ["AI", "Generative", "Suno", "Instrumental"]
  };
  app2.get("/api/communities", async (req, res) => {
    const genreId = queryStr(req, "genre");
    let rows = await db.select().from(communities).orderBy(desc(communities.isOfficial), desc(communities.members));
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
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const memberships = await db.select({ communityId: communityMembers.communityId }).from(communityMembers).where(eq5(communityMembers.userId, user.id));
    if (memberships.length === 0) {
      return res.json([]);
    }
    const ids = memberships.map((m) => m.communityId);
    const rows = await db.select().from(communities).where(inArray(communities.id, ids)).orderBy(desc(communities.isOfficial), desc(communities.members));
    res.json(rows);
  });
  app2.get("/api/communities/:id", async (req, res) => {
    const id = paramNum(req, "id");
    const [row] = await db.select().from(communities).where(eq5(communities.id, id));
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });
  app2.get("/api/communities/:id/editors", async (req, res) => {
    const communityId = paramNum(req, "id");
    const rows = await db.select().from(videoEditors).where(eq5(videoEditors.communityId, communityId)).orderBy(desc(videoEditors.isAvailable), desc(videoEditors.rating));
    res.json(rows);
  });
  app2.get("/api/communities/:id/creators", async (req, res) => {
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq5(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const editors = await db.select().from(videoEditors).where(eq5(videoEditors.communityId, communityId)).orderBy(desc(videoEditors.rating));
    const livers = await db.select().from(creators).where(eq5(creators.community, community.name)).orderBy(asc3(creators.rank));
    res.json({
      editors: editors.map((e) => ({ ...e, kind: "editor" })),
      livers: livers.map((l) => ({ ...l, kind: "liver" }))
    });
  });
  app2.get("/api/communities/:id/staff", async (req, res) => {
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq5(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const admin = community.adminId ? (await db.select().from(users).where(eq5(users.id, community.adminId)))[0] ?? null : null;
    const modRows = await db.select({ userId: communityModerators.userId }).from(communityModerators).where(eq5(communityModerators.communityId, communityId));
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
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq5(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    if (!isAdmin) return res.status(403).json({ error: "Only the community owner can change this" });
    const { adminId, moderatorIds } = req.body;
    if (adminId !== void 0) {
      await db.update(communities).set({ adminId: adminId ?? null }).where(eq5(communities.id, communityId));
    }
    if (moderatorIds !== void 0 && Array.isArray(moderatorIds)) {
      await db.delete(communityModerators).where(eq5(communityModerators.communityId, communityId));
      for (const uid of moderatorIds) {
        if (Number.isInteger(uid)) {
          await db.insert(communityModerators).values({ communityId, userId: uid });
        }
      }
    }
    const [updated] = await db.select().from(communities).where(eq5(communities.id, communityId));
    res.json(updated);
  });
  app2.get("/api/communities/:id/members", async (req, res) => {
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq5(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const rows = await db.select({ userId: communityMembers.userId }).from(communityMembers).where(eq5(communityMembers.communityId, communityId));
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
      and5(
        eq5(communityMembers.communityId, communityId),
        eq5(communityMembers.userId, user.id)
      )
    );
    res.json({ isMember: rows.length > 0 });
  });
  app2.post("/api/communities/:id/join", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq5(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const existing = await db.select().from(communityMembers).where(
      and5(
        eq5(communityMembers.communityId, communityId),
        eq5(communityMembers.userId, user.id)
      )
    );
    if (existing.length > 0) {
      return res.json({ ok: true, alreadyMember: true });
    }
    await db.insert(communityMembers).values({
      communityId,
      userId: user.id
    });
    const [c] = await db.select({ m: communities.members }).from(communities).where(eq5(communities.id, communityId));
    if (c) {
      await db.update(communities).set({ members: c.m + 1 }).where(eq5(communities.id, communityId));
    }
    res.status(201).json({ ok: true });
  });
  app2.get("/api/communities/:id/threads", async (req, res) => {
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq5(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const rows = await db.select({
      id: communityThreads.id,
      communityId: communityThreads.communityId,
      authorUserId: communityThreads.authorUserId,
      title: communityThreads.title,
      body: communityThreads.body,
      createdAt: communityThreads.createdAt,
      pinned: communityThreads.pinned
    }).from(communityThreads).where(eq5(communityThreads.communityId, communityId)).orderBy(desc(communityThreads.pinned), desc(communityThreads.createdAt));
    const postCounts = await Promise.all(
      rows.map(async (t) => {
        const [c] = await db.select({ n: count() }).from(communityThreadPosts).where(eq5(communityThreadPosts.threadId, t.id));
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
        author: authorMap.get(r.authorUserId) ?? { displayName: "Unknown", profileImageUrl: null }
      }))
    );
  });
  app2.get("/api/community-announcements/feed", async (_req, res) => {
    const limit = Math.min(100, Math.max(1, parseInt(String(_req.query.limit ?? "80"), 10) || 80));
    const qRaw = typeof _req.query.q === "string" ? _req.query.q.trim() : "";
    const liveOnly = String(_req.query.liveOnly ?? "") === "1" || String(_req.query.liveOnly ?? "").toLowerCase() === "true";
    const fetchLimit = liveOnly ? Math.min(300, limit * 4) : limit;
    const rows = await db.select({
      id: communityThreads.id,
      communityId: communityThreads.communityId,
      title: communityThreads.title,
      body: communityThreads.body,
      pinned: communityThreads.pinned,
      createdAt: communityThreads.createdAt,
      authorUserId: communityThreads.authorUserId,
      communityName: communities.name,
      communityCategory: communities.category,
      communityThumbnail: communities.thumbnail
    }).from(communityThreads).innerJoin(communities, eq5(communities.id, communityThreads.communityId)).orderBy(desc(communityThreads.pinned), desc(communityThreads.createdAt)).limit(fetchLimit);
    const liveHints = [
      "live",
      "\u914D\u4FE1",
      "\u30E9\u30A4\u30D6",
      "stream",
      "twitch",
      "youtube",
      "youtu.be",
      "\u516C\u6F14",
      "concert",
      "tour",
      "tiktok",
      "ticket",
      "\u30C1\u30B1\u30C3\u30C8",
      "streaming",
      "premiere"
    ];
    let out = rows;
    if (qRaw) {
      const ql = qRaw.toLowerCase();
      out = out.filter((r) => `${r.title} ${r.body}`.toLowerCase().includes(ql));
    }
    if (liveOnly) {
      out = out.filter((r) => {
        const blob = `${r.title} ${r.body}`.toLowerCase();
        return liveHints.some((h) => blob.includes(h));
      });
    }
    out = out.slice(0, limit);
    const authorIds = [...new Set(out.map((r) => r.authorUserId))];
    const authorRows = authorIds.length > 0 ? await db.select({ id: users.id, displayName: users.displayName, profileImageUrl: users.profileImageUrl }).from(users).where(inArray(users.id, authorIds)) : [];
    const authorMap = new Map(authorRows.map((a) => [a.id, a]));
    res.json(
      out.map((r) => ({
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
        author: authorMap.get(r.authorUserId) ?? { displayName: "Unknown", profileImageUrl: null }
      }))
    );
  });
  app2.post("/api/communities/:id/threads", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq5(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const [memberRow] = await db.select({ id: communityMembers.id }).from(communityMembers).where(and5(eq5(communityMembers.communityId, communityId), eq5(communityMembers.userId, user.id))).limit(1);
    const isCommunityOwner = community.adminId === user.id;
    const [boardModRow] = await db.select({ userId: communityModerators.userId }).from(communityModerators).where(and5(eq5(communityModerators.communityId, communityId), eq5(communityModerators.userId, user.id))).limit(1);
    const canPostAsStaff = isCommunityOwner || !!boardModRow || isAdminRole(user.role);
    if (!memberRow && !canPostAsStaff) {
      return res.status(403).json({ error: "Join the community first, or post as admin/moderator" });
    }
    const { title, body } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: "Please enter a title" });
    const combinedText = [title, body].filter(Boolean).join(" ");
    const modResult = await moderateContent(combinedText);
    if (modResult.allowed === false) {
      return res.status(400).json({ error: modResult.reason ?? "This content is not allowed" });
    }
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
    const [thread] = await db.select().from(communityThreads).where(and5(eq5(communityThreads.communityId, communityId), eq5(communityThreads.id, threadId)));
    if (!thread) return res.status(404).json({ message: "Not found" });
    const posts = await db.select().from(communityThreadPosts).where(eq5(communityThreadPosts.threadId, threadId)).orderBy(asc3(communityThreadPosts.createdAt));
    const authorIds = [thread.authorUserId, ...posts.map((p) => p.authorUserId)];
    const authorRows = await db.select({ id: users.id, displayName: users.displayName, profileImageUrl: users.profileImageUrl }).from(users).where(inArray(users.id, authorIds));
    const authorMap = new Map(authorRows.map((a) => [a.id, a]));
    res.json({
      ...thread,
      author: authorMap.get(thread.authorUserId) ?? { displayName: "Unknown", profileImageUrl: null },
      posts: posts.map((p) => ({
        ...p,
        author: authorMap.get(p.authorUserId) ?? { displayName: "Unknown", profileImageUrl: null }
      }))
    });
  });
  app2.delete("/api/communities/:id/threads/:threadId", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const communityId = paramNum(req, "id");
    const threadId = paramNum(req, "threadId");
    const [community] = await db.select().from(communities).where(eq5(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and5(eq5(communityModerators.communityId, communityId), eq5(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "Only owners or moderators can delete this" });
    const [thread] = await db.select().from(communityThreads).where(and5(eq5(communityThreads.communityId, communityId), eq5(communityThreads.id, threadId)));
    if (!thread) return res.status(404).json({ message: "Not found" });
    await db.delete(communityThreadPosts).where(eq5(communityThreadPosts.threadId, threadId));
    await db.delete(communityThreads).where(eq5(communityThreads.id, threadId));
    res.json({ ok: true });
  });
  app2.delete("/api/communities/:id/threads/:threadId/posts/:postId", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const communityId = paramNum(req, "id");
    const threadId = paramNum(req, "threadId");
    const postId = paramNum(req, "postId");
    const [community] = await db.select().from(communities).where(eq5(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and5(eq5(communityModerators.communityId, communityId), eq5(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "Only owners or moderators can delete this" });
    const [thread] = await db.select().from(communityThreads).where(and5(eq5(communityThreads.communityId, communityId), eq5(communityThreads.id, threadId)));
    if (!thread) return res.status(404).json({ message: "Not found" });
    await db.delete(communityThreadPosts).where(and5(eq5(communityThreadPosts.threadId, threadId), eq5(communityThreadPosts.id, postId)));
    res.json({ ok: true });
  });
  app2.post("/api/communities/:id/threads/:threadId/posts", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const communityId = paramNum(req, "id");
    const threadId = paramNum(req, "threadId");
    const [thread] = await db.select().from(communityThreads).where(and5(eq5(communityThreads.communityId, communityId), eq5(communityThreads.id, threadId)));
    if (!thread) return res.status(404).json({ message: "Not found" });
    const [memberRow] = await db.select({ id: communityMembers.id }).from(communityMembers).where(and5(eq5(communityMembers.communityId, communityId), eq5(communityMembers.userId, user.id))).limit(1);
    const [communityForReply] = await db.select().from(communities).where(eq5(communities.id, communityId));
    if (!communityForReply) return res.status(404).json({ message: "Not found" });
    const isCommunityOwner = communityForReply.adminId === user.id;
    const [replyModRow] = await db.select({ userId: communityModerators.userId }).from(communityModerators).where(and5(eq5(communityModerators.communityId, communityId), eq5(communityModerators.userId, user.id))).limit(1);
    const canReplyAsStaff = isCommunityOwner || !!replyModRow || isAdminRole(user.role);
    if (!memberRow && !canReplyAsStaff) {
      return res.status(403).json({ error: "Join the community first, or reply as admin/moderator" });
    }
    const { body } = req.body;
    if (!body || !body.trim()) return res.status(400).json({ error: "Please enter body text" });
    const modResult = await moderateContent(body);
    if (modResult.allowed === false) {
      return res.status(400).json({ error: modResult.reason ?? "This content is not allowed" });
    }
    const [row] = await db.insert(communityThreadPosts).values({
      threadId,
      authorUserId: user.id,
      body: body.trim()
    }).returning();
    await syncUserLastContentLang(user.id, body.trim());
    res.status(201).json(row);
  });
  app2.get("/api/communities/:id/admin/jukebox-queue", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq5(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and5(eq5(communityModerators.communityId, communityId), eq5(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "Only owners or moderators can access this" });
    const rows = await db.select().from(jukeboxQueue).where(eq5(jukeboxQueue.communityId, communityId)).orderBy(asc3(jukeboxQueue.position));
    res.json(rows);
  });
  app2.delete("/api/communities/:id/admin/jukebox-queue/:itemId", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const communityId = paramNum(req, "id");
    const itemId = paramNum(req, "itemId");
    const [community] = await db.select().from(communities).where(eq5(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and5(eq5(communityModerators.communityId, communityId), eq5(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "Only owners or moderators can perform this action" });
    const [item] = await db.select().from(jukeboxQueue).where(and5(eq5(jukeboxQueue.communityId, communityId), eq5(jukeboxQueue.id, itemId)));
    if (!item) return res.status(404).json({ message: "Not found" });
    await db.delete(jukeboxQueue).where(eq5(jukeboxQueue.id, itemId));
    res.json({ ok: true });
  });
  app2.get("/api/communities/:id/admin/ads", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq5(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and5(eq5(communityModerators.communityId, communityId), eq5(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "Only owners or moderators can access this" });
    const rows = await db.select().from(communityAds).where(and5(eq5(communityAds.communityId, communityId), eq5(communityAds.status, "approved"))).orderBy(asc3(communityAds.startDate));
    res.json(rows);
  });
  app2.get("/api/communities/:id/admin/reports", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq5(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and5(eq5(communityModerators.communityId, communityId), eq5(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "Only owners or moderators can access this" });
    const videoIdsInCommunity = await db.select({ id: videos.id }).from(videos).where(eq5(videos.communityId, communityId));
    const vidSet = new Set(videoIdsInCommunity.map((v) => v.id));
    const byName = await db.select({ id: videos.id }).from(videos).where(eq5(videos.community, community.name));
    byName.forEach((v) => vidSet.add(v.id));
    const allReports = await db.select().from(reports).orderBy(desc(reports.createdAt));
    const filtered = [];
    for (const r of allReports) {
      if (r.contentType === "video") {
        if (vidSet.has(r.contentId)) filtered.push(r);
      } else if (r.contentType === "comment") {
        const [cm] = await db.select({ videoId: videoComments.videoId }).from(videoComments).where(eq5(videoComments.id, r.contentId));
        if (cm) {
          const [v] = await db.select({ id: videos.id, communityId: videos.communityId, community: videos.community }).from(videos).where(eq5(videos.id, cm.videoId));
          if (v && (v.communityId === communityId || v.community === community.name)) filtered.push(r);
        }
      }
    }
    res.json(filtered);
  });
  app2.patch("/api/communities/:id/admin/reports/:reportId/hide", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const communityId = paramNum(req, "id");
    const reportId = paramNum(req, "reportId");
    const [community] = await db.select().from(communities).where(eq5(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and5(eq5(communityModerators.communityId, communityId), eq5(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "Only owners or moderators can perform this action" });
    const [report] = await db.select().from(reports).where(eq5(reports.id, reportId));
    if (!report) return res.status(404).json({ error: "Report not found" });
    const vidSet = new Set((await db.select({ id: videos.id }).from(videos).where(eq5(videos.communityId, communityId))).map((v) => v.id));
    const byName = await db.select({ id: videos.id }).from(videos).where(eq5(videos.community, community.name));
    byName.forEach((v) => vidSet.add(v.id));
    let allowed = false;
    if (report.contentType === "video") allowed = vidSet.has(report.contentId);
    else if (report.contentType === "comment") {
      const [cm] = await db.select({ videoId: videoComments.videoId }).from(videoComments).where(eq5(videoComments.id, report.contentId));
      if (cm) {
        const [v] = await db.select({ communityId: videos.communityId, community: videos.community }).from(videos).where(eq5(videos.id, cm.videoId));
        allowed = !!v && (v.communityId === communityId || v.community === community.name);
      }
    }
    if (!allowed) return res.status(403).json({ error: "This report does not belong to this community" });
    if (report.contentType === "video") {
      await db.update(videos).set({ hidden: true }).where(eq5(videos.id, report.contentId));
    } else if (report.contentType === "comment") {
      await db.update(videoComments).set({ hidden: true }).where(eq5(videoComments.id, report.contentId));
    }
    await db.update(reports).set({ status: "hidden" }).where(eq5(reports.id, reportId));
    res.json({ ok: true });
  });
  app2.patch("/api/communities/:id/admin/reports/:reportId/dismiss", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const communityId = paramNum(req, "id");
    const reportId = paramNum(req, "reportId");
    const [community] = await db.select().from(communities).where(eq5(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const isAdmin = community.adminId === user.id;
    const [modRow] = await db.select().from(communityModerators).where(and5(eq5(communityModerators.communityId, communityId), eq5(communityModerators.userId, user.id)));
    const isMod = !!modRow;
    if (!isAdmin && !isMod) return res.status(403).json({ error: "Only owners or moderators can perform this action" });
    const [report] = await db.select().from(reports).where(eq5(reports.id, reportId));
    if (!report) return res.status(404).json({ error: "Report not found" });
    const vidSet = new Set((await db.select({ id: videos.id }).from(videos).where(eq5(videos.communityId, communityId))).map((v) => v.id));
    const byName = await db.select({ id: videos.id }).from(videos).where(eq5(videos.community, community.name));
    byName.forEach((v) => vidSet.add(v.id));
    let allowed = false;
    if (report.contentType === "video") allowed = vidSet.has(report.contentId);
    else if (report.contentType === "comment") {
      const [cm] = await db.select({ videoId: videoComments.videoId }).from(videoComments).where(eq5(videoComments.id, report.contentId));
      if (cm) {
        const [v] = await db.select({ communityId: videos.communityId, community: videos.community }).from(videos).where(eq5(videos.id, cm.videoId));
        allowed = !!v && (v.communityId === communityId || v.community === community.name);
      }
    }
    if (!allowed) return res.status(403).json({ error: "This report does not belong to this community" });
    await db.update(reports).set({ status: "reviewed" }).where(eq5(reports.id, reportId));
    res.json({ ok: true });
  });
  app2.get("/api/communities/:id/polls", async (req, res) => {
    const user = await getAuthUser(req);
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq5(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const polls = await db.select().from(communityPolls).where(eq5(communityPolls.communityId, communityId)).orderBy(desc(communityPolls.createdAt));
    const result = await Promise.all(
      polls.map(async (p) => {
        const opts = await db.select().from(communityPollOptions).where(eq5(communityPollOptions.pollId, p.id)).orderBy(asc3(communityPollOptions.order));
        const votes = await db.select().from(communityPollVotes).where(eq5(communityPollVotes.pollId, p.id));
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
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq5(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    const memberRows = await db.select().from(communityMembers).where(and5(eq5(communityMembers.communityId, communityId), eq5(communityMembers.userId, user.id)));
    if (memberRows.length === 0) return res.status(403).json({ error: "Join the community first" });
    const { question, options } = req.body;
    if (!question || !question.trim()) return res.status(400).json({ error: "Please enter a question" });
    if (!options || !Array.isArray(options) || options.length < 2) return res.status(400).json({ error: "Provide at least two options" });
    const validOpts = options.filter((o) => o && String(o).trim()).slice(0, 10);
    if (validOpts.length < 2) return res.status(400).json({ error: "Provide at least two options" });
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
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const communityId = paramNum(req, "id");
    const pollId = paramNum(req, "pollId");
    const { optionId } = req.body;
    if (!optionId) return res.status(400).json({ error: "optionId is required" });
    const [poll] = await db.select().from(communityPolls).where(and5(eq5(communityPolls.communityId, communityId), eq5(communityPolls.id, pollId)));
    if (!poll) return res.status(404).json({ message: "Not found" });
    const [opt] = await db.select().from(communityPollOptions).where(and5(eq5(communityPollOptions.pollId, pollId), eq5(communityPollOptions.id, optionId)));
    if (!opt) return res.status(404).json({ message: "Option not found" });
    const memberRows = await db.select().from(communityMembers).where(and5(eq5(communityMembers.communityId, communityId), eq5(communityMembers.userId, user.id)));
    if (memberRows.length === 0) return res.status(403).json({ error: "Join the community first" });
    const existing = await db.select().from(communityPollVotes).where(and5(eq5(communityPollVotes.pollId, pollId), eq5(communityPollVotes.userId, user.id)));
    if (existing.length > 0) return res.status(400).json({ error: "You have already voted" });
    await db.insert(communityPollVotes).values({
      pollId,
      optionId,
      userId: user.id
    });
    res.json({ ok: true });
  });
  app2.get("/api/editors", async (req, res) => {
    const sort = req.query.sort || "rating";
    const mode = typeof req.query.mode === "string" ? req.query.mode.trim() : "";
    const filters = [];
    if (mode === "per_minute") {
      filters.push(inArray(videoEditors.priceType, ["per_minute", "both"]));
    } else if (mode === "revenue_share") {
      filters.push(inArray(videoEditors.priceType, ["revenue_share", "both"]));
    } else if (mode.length > 0) {
      return res.status(400).json({ error: "Invalid mode (use per_minute or revenue_share)" });
    }
    const maxTicketsRaw = req.query.maxTicketsPerMin;
    const maxTicketsStr = Array.isArray(maxTicketsRaw) ? maxTicketsRaw[0] : maxTicketsRaw;
    if (maxTicketsStr !== void 0 && String(maxTicketsStr).trim() !== "") {
      const maxT = parseInt(String(maxTicketsStr), 10);
      if (!Number.isNaN(maxT) && maxT > 0) {
        filters.push(
          and5(isNotNull(videoEditors.pricePerMinute), lte2(videoEditors.pricePerMinute, maxT))
        );
      }
    }
    const minShareRaw = req.query.minRevenueSharePercent;
    const minShareStr = Array.isArray(minShareRaw) ? minShareRaw[0] : minShareRaw;
    if (minShareStr !== void 0 && String(minShareStr).trim() !== "") {
      const minS = parseInt(String(minShareStr), 10);
      if (!Number.isNaN(minS) && minS >= 1 && minS <= 100) {
        filters.push(
          and5(isNotNull(videoEditors.revenueSharePercent), gte2(videoEditors.revenueSharePercent, minS))
        );
      }
    }
    const maxDelRaw = req.query.maxDeliveryDays;
    const maxDelStr = Array.isArray(maxDelRaw) ? maxDelRaw[0] : maxDelRaw;
    if (maxDelStr !== void 0 && String(maxDelStr).trim() !== "") {
      const maxD = parseInt(String(maxDelStr), 10);
      if (!Number.isNaN(maxD) && maxD > 0) {
        filters.push(lte2(videoEditors.deliveryDays, maxD));
      }
    }
    const tagList = parseTagsQueryParam(req.query.tags);
    if (tagList.length > 0) {
      const arrayLit = "ARRAY[" + tagList.map((t) => "'" + t.replace(/'/g, "''") + "'").join(",") + "]::text[]";
      filters.push(sql3`${videoEditors.styleTags} && ${sql3.raw(arrayLit)}`);
    }
    let rows = filters.length > 0 ? await db.select().from(videoEditors).where(and5(...filters)) : await db.select().from(videoEditors);
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
  app2.get("/api/editors/me", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const [row] = await db.select().from(videoEditors).where(eq5(videoEditors.userId, user.id)).limit(1);
    return res.json(row ?? null);
  });
  app2.get("/api/editors/:id", async (req, res) => {
    const id = paramNum(req, "id");
    const [editor] = await db.select().from(videoEditors).where(eq5(videoEditors.id, id));
    if (!editor) return res.status(404).json({ error: "Not found" });
    res.json(editor);
  });
  const EDITOR_REQUEST_TICKET_FEE = 200;
  app2.post("/api/editors/:id/request", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Sign in required to submit a paid edit request" });
    }
    const editorId = paramNum(req, "id");
    const { requesterName, title, description, priceType, budget, deadline } = req.body;
    if (!title || !description || !priceType) {
      return res.status(400).json({ error: "Please fill in all required fields" });
    }
    if (priceType !== "per_minute" && priceType !== "revenue_share") {
      return res.status(400).json({ error: "Invalid pricing type" });
    }
    const [editor] = await db.select().from(videoEditors).where(eq5(videoEditors.id, editorId));
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
        const balRows = await tx.select().from(ticketBalances).where(eq5(ticketBalances.userId, buyerId)).limit(1);
        const cur = balRows[0]?.balance ?? 0;
        if (cur < fee) {
          const err = new Error("INSUFFICIENT_TICKETS");
          err.meta = { balance: cur, required: fee };
          throw err;
        }
        const newBal = cur - fee;
        if (balRows.length === 0) {
          await tx.insert(ticketBalances).values({ userId: buyerId, balance: newBal });
        } else {
          await tx.update(ticketBalances).set({ balance: newBal, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(ticketBalances.userId, buyerId));
        }
        const [spendTx] = await tx.insert(ticketTransactions).values({
          userId: buyerId,
          amount: -fee,
          type: "spend_editor_request",
          referenceId: `editor:${editorId}`,
          description: `Editor request: ${title}`
        }).returning({ id: ticketTransactions.id });
        const [requestRow] = await tx.insert(videoEditRequests).values({
          editorId,
          requesterId: requestUserId,
          requesterName: requestUserName,
          title,
          description,
          priceType,
          budget: budget ?? null,
          deadline: deadline ?? null
        }).returning();
        await tx.insert(editingRequests).values({
          userId: requestUserId,
          videoUrl: null,
          performanceDate: deadline ?? null,
          instructions: description,
          ticketFee: fee,
          ticketTransactionId: String(spendTx.id),
          status: "pending"
        });
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
        timeAgo: "Just now"
      });
      res.status(201).json(result);
    } catch (e) {
      if (e?.message === "INSUFFICIENT_TICKETS") {
        const meta = e?.meta ?? {};
        return res.status(402).json({
          error: "Insufficient tickets",
          balance: meta.balance ?? 0,
          required: meta.required ?? EDITOR_REQUEST_TICKET_FEE
        });
      }
      console.error("[editors/request]", e);
      return res.status(500).json({ error: e?.message ?? "Request failed" });
    }
  });
  app2.post("/api/editors", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const taken = await db.select().from(videoEditors).where(eq5(videoEditors.userId, user.id)).limit(1);
    if (taken.length > 0) {
      return res.status(409).json({ error: "Already registered as a video editor" });
    }
    const body = req.body;
    const communityId = body.communityId;
    if (communityId == null || !Number.isFinite(communityId)) {
      return res.status(400).json({ error: "communityId is required" });
    }
    const [comm] = await db.select({ id: communities.id }).from(communities).where(eq5(communities.id, communityId));
    if (!comm) return res.status(400).json({ error: "Community not found" });
    const pricingRow = {
      priceType: String(body.priceType ?? ""),
      pricePerMinute: body.pricePerMinute ?? null,
      revenueSharePercent: body.revenueSharePercent ?? null
    };
    const pv = validateEditorPricing(pricingRow);
    if (pv.ok === false) return res.status(400).json({ error: pv.error });
    const styleTags = normalizeEditorStyleTagSlugs(
      Array.isArray(body.styleTags) ? body.styleTags.map((x) => String(x)) : []
    );
    const [u] = await db.select().from(users).where(eq5(users.id, user.id));
    if (!u) return res.status(404).json({ error: "User not found" });
    const deliveryDays = typeof body.deliveryDays === "number" && body.deliveryDays > 0 ? Math.min(90, Math.floor(body.deliveryDays)) : 3;
    const [created] = await db.insert(videoEditors).values({
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
      styleTags
    }).returning();
    return res.status(201).json(created);
  });
  app2.put("/api/editors/:id", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const id = paramNum(req, "id");
    const [editor] = await db.select().from(videoEditors).where(eq5(videoEditors.id, id));
    if (!editor) return res.status(404).json({ error: "Not found" });
    if (editor.userId !== user.id) return res.status(403).json({ error: "You cannot edit this" });
    const body = req.body;
    const communityId = body.communityId ?? editor.communityId;
    const [comm] = await db.select({ id: communities.id }).from(communities).where(eq5(communities.id, communityId));
    if (!comm) return res.status(400).json({ error: "Community not found" });
    const pricingRow = {
      priceType: String(body.priceType ?? editor.priceType),
      pricePerMinute: body.pricePerMinute !== void 0 ? body.pricePerMinute : editor.pricePerMinute,
      revenueSharePercent: body.revenueSharePercent !== void 0 ? body.revenueSharePercent : editor.revenueSharePercent
    };
    const pv = validateEditorPricing(pricingRow);
    if (pv.ok === false) return res.status(400).json({ error: pv.error });
    let styleTags = Array.isArray(editor.styleTags) ? [...editor.styleTags] : [];
    if (body.styleTags !== void 0) {
      styleTags = normalizeEditorStyleTagSlugs(
        Array.isArray(body.styleTags) ? body.styleTags.map((x) => String(x)) : []
      );
    }
    const deliveryDays = typeof body.deliveryDays === "number" && body.deliveryDays > 0 ? Math.min(90, Math.floor(body.deliveryDays)) : editor.deliveryDays;
    await db.update(videoEditors).set({
      bio: body.bio !== void 0 ? String(body.bio).trim() : editor.bio,
      genres: body.genres !== void 0 ? String(body.genres).trim() : editor.genres,
      deliveryDays,
      communityId,
      priceType: pricingRow.priceType,
      pricePerMinute: pricingRow.pricePerMinute,
      revenueSharePercent: pricingRow.revenueSharePercent,
      styleTags
    }).where(eq5(videoEditors.id, id));
    const [updated] = await db.select().from(videoEditors).where(eq5(videoEditors.id, id));
    return res.json(updated);
  });
  app2.post("/api/communities", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const { name, description, bannerUrl, iconUrl, categories } = req.body;
    const trimmedName = (name ?? "").trim();
    const trimmedDescription = (description ?? "").trim();
    const banner = (bannerUrl ?? "").trim() || "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=450&fit=crop";
    const icon = (iconUrl ?? "").trim() || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&h=160&fit=crop";
    const categoryList = Array.isArray(categories) ? categories.map((c) => String(c).trim()).filter(Boolean) : typeof categories === "string" ? categories.split(/[,\s]+/).map((c) => c.trim()).filter(Boolean) : [];
    if (!trimmedName || !trimmedDescription || categoryList.length === 0) {
      return res.status(400).json({ error: "Please enter name, description, and category" });
    }
    if (trimmedDescription.length < 10) {
      return res.status(400).json({ error: "Description must be at least 10 characters" });
    }
    try {
      const primaryCategory = categoryList[0];
      const [row] = await db.insert(communities).values({
        name: trimmedName,
        members: 1,
        thumbnail: banner,
        online: false,
        category: primaryCategory,
        adminId: user.id,
        ownerId: user.id
      }).returning();
      await db.insert(communityMembers).values({
        communityId: row.id,
        userId: user.id
      });
      res.status(201).json({
        ...row,
        description: trimmedDescription,
        bannerUrl: banner,
        iconUrl: icon,
        categories: categoryList
      });
    } catch (e) {
      console.error("Create community error:", e);
      res.status(500).json({ error: "Failed to create community" });
    }
  });
  app2.delete("/api/communities/:id", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const communityId = paramNum(req, "id");
    const [community] = await db.select().from(communities).where(eq5(communities.id, communityId));
    if (!community) return res.status(404).json({ message: "Not found" });
    if (community.ownerId !== user.id) {
      return res.status(403).json({ error: "Only the creator can delete this community" });
    }
    try {
      const threadRows = await db.select({ id: communityThreads.id }).from(communityThreads).where(eq5(communityThreads.communityId, communityId));
      const threadIds = threadRows.map((t) => t.id);
      if (threadIds.length > 0) {
        await db.delete(communityThreadPosts).where(inArray(communityThreadPosts.threadId, threadIds));
      }
      await db.delete(communityThreads).where(eq5(communityThreads.communityId, communityId));
      const pollRows = await db.select({ id: communityPolls.id }).from(communityPolls).where(eq5(communityPolls.communityId, communityId));
      const pollIds = pollRows.map((p) => p.id);
      if (pollIds.length > 0) {
        await db.delete(communityPollVotes).where(inArray(communityPollVotes.pollId, pollIds));
        await db.delete(communityPollOptions).where(inArray(communityPollOptions.pollId, pollIds));
      }
      await db.delete(communityPolls).where(eq5(communityPolls.communityId, communityId));
      await db.delete(communityVotes).where(eq5(communityVotes.communityId, communityId));
      await db.delete(communityAds).where(eq5(communityAds.communityId, communityId));
      await db.delete(communityModerators).where(eq5(communityModerators.communityId, communityId));
      await db.delete(communityMembers).where(eq5(communityMembers.communityId, communityId));
      await db.delete(jukeboxRequestCounts).where(eq5(jukeboxRequestCounts.communityId, communityId));
      await db.delete(jukeboxChat).where(eq5(jukeboxChat.communityId, communityId));
      await db.delete(jukeboxQueue).where(eq5(jukeboxQueue.communityId, communityId));
      await db.delete(jukeboxState).where(eq5(jukeboxState.communityId, communityId));
      await db.delete(videoEditors).where(eq5(videoEditors.communityId, communityId));
      await db.update(videos).set({ communityId: null }).where(eq5(videos.communityId, communityId));
      await db.delete(communities).where(eq5(communities.id, communityId));
      res.json({ ok: true });
    } catch (e) {
      console.error("Community deletion error:", e);
      res.status(500).json({ error: "Failed to delete community" });
    }
  });
  const MIN_AD_AMOUNT = 7e3;
  const DAILY_RATE_PER_MEMBER = 5;
  const GENRE_DAILY_RATE_PER_MEMBER = 3;
  const MAX_MONTHS_AHEAD = 3;
  app2.get("/api/community-ads/pricing", async (req, res) => {
    const cid = Number(queryStr(req, "communityId")) || 0;
    if (!cid) return res.status(400).json({ error: "communityId is required" });
    const [community] = await db.select().from(communities).where(eq5(communities.id, cid));
    if (!community) return res.status(404).json({ error: "Community not found" });
    const memberCount = community.members;
    const dailyRate = memberCount * DAILY_RATE_PER_MEMBER;
    const minDays = dailyRate > 0 ? Math.ceil(MIN_AD_AMOUNT / dailyRate) : 0;
    res.json({
      memberCount,
      dailyRate,
      minDays,
      minAmount: MIN_AD_AMOUNT,
      ratePerMember: DAILY_RATE_PER_MEMBER
    });
  });
  app2.get("/api/community-ads/availability", async (req, res) => {
    const cid = Number(queryStr(req, "communityId")) || 0;
    const start = queryStr(req, "start");
    const end = queryStr(req, "end");
    if (!cid || !start || !end) return res.status(400).json({ error: "communityId, start, and end are required" });
    const conflicts = await db.select({ id: communityAds.id, startDate: communityAds.startDate, endDate: communityAds.endDate }).from(communityAds).where(
      and5(
        eq5(communityAds.communityId, cid),
        inArray(communityAds.status, ["pending", "moderator_approved", "approved"]),
        and5(
          lte2(communityAds.startDate, end),
          gte2(communityAds.endDate, start)
        )
      )
    );
    res.json({ available: conflicts.length === 0, conflicts });
  });
  app2.post("/api/community-ads", async (req, res) => {
    const { communityId: bodyCommunityId, companyName, contactName, email, bannerUrl, linkUrl, startDate, endDate, agreedToTerms } = req.body;
    const cid = Number(bodyCommunityId) || 0;
    const [community] = await db.select().from(communities).where(eq5(communities.id, cid));
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
    const memberCount = community.members;
    const dailyRate = memberCount * DAILY_RATE_PER_MEMBER;
    const startD = new Date(start);
    const endD = new Date(end);
    if (isNaN(startD.getTime()) || isNaN(endD.getTime()) || endD < startD) {
      return res.status(400).json({ error: "Invalid ad run dates" });
    }
    const days = Math.ceil((endD.getTime() - startD.getTime()) / (24 * 60 * 60 * 1e3)) + 1;
    const totalAmount = days * dailyRate;
    if (totalAmount < MIN_AD_AMOUNT) {
      return res.status(400).json({ error: `Minimum ad spend is $${(MIN_AD_AMOUNT / 100).toFixed(2)}. Please check the duration or member count.` });
    }
    const maxEnd = /* @__PURE__ */ new Date();
    maxEnd.setMonth(maxEnd.getMonth() + MAX_MONTHS_AHEAD);
    if (endD > maxEnd) {
      return res.status(400).json({ error: `End date must be within ${MAX_MONTHS_AHEAD} months` });
    }
    const conflicts = await db.select({ id: communityAds.id }).from(communityAds).where(
      and5(
        eq5(communityAds.communityId, cid),
        inArray(communityAds.status, ["pending", "moderator_approved", "approved"]),
        and5(lte2(communityAds.startDate, end), gte2(communityAds.endDate, start))
      )
    );
    if (conflicts.length > 0) {
      return res.status(409).json({ error: "That period is already booked. Please choose different dates." });
    }
    const [row] = await db.insert(communityAds).values({
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
      status: "pending"
    }).returning();
    res.status(201).json(row);
  });
  app2.get("/api/community-ads/revenue-settings/:communityId", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const cid = paramNum(req, "communityId");
    const [community] = await db.select().from(communities).where(eq5(communities.id, cid));
    if (!community) return res.status(404).json({ error: "Community not found" });
    if (community.adminId !== user.id) return res.status(403).json({ error: "Only the community owner can change this" });
    const mods = await db.select({ userId: communityModerators.userId, displayName: users.displayName, profileImageUrl: users.profileImageUrl }).from(communityModerators).leftJoin(users, eq5(communityModerators.userId, users.id)).where(eq5(communityModerators.communityId, cid));
    let distribution = {};
    const rawDist = community.revenueDistribution;
    if (rawDist) {
      try {
        distribution = JSON.parse(rawDist);
      } catch {
      }
    }
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
      revenueStructure: { eventFund: 10, adminAndMods: 70, platform: 20 }
    });
  });
  app2.patch("/api/community-ads/revenue-settings/:communityId", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const cid = paramNum(req, "communityId");
    const [community] = await db.select().from(communities).where(eq5(communities.id, cid));
    if (!community) return res.status(404).json({ error: "Community not found" });
    if (community.adminId !== user.id) return res.status(403).json({ error: "Only the community owner can change this" });
    const { distribution } = req.body;
    if (!distribution || typeof distribution !== "object") {
      return res.status(400).json({ error: "distribution object is required" });
    }
    const total = Object.values(distribution).reduce((s, v) => s + Number(v), 0);
    if (Math.abs(total - 100) > 1) {
      return res.status(400).json({ error: `Distribution must total 100% (currently ${total}%)` });
    }
    await db.update(communities).set({ revenueDistribution: JSON.stringify(distribution) }).where(eq5(communities.id, cid));
    res.json({ ok: true });
  });
  app2.post("/api/genre-owners/assign", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Only admins can run this" });
    const allCommunities = await db.select({ id: communities.id, category: communities.category, members: communities.members, adminId: communities.adminId }).from(communities).where(sql3`${communities.adminId} IS NOT NULL`);
    const byGenre = /* @__PURE__ */ new Map();
    for (const c of allCommunities) {
      const existing = byGenre.get(c.category);
      if (!existing || c.members > existing.members) {
        byGenre.set(c.category, c);
      }
    }
    const results = [];
    for (const [genreId, topCommunity] of byGenre.entries()) {
      if (!topCommunity.adminId) continue;
      const existing = await db.select().from(genreOwners).where(eq5(genreOwners.genreId, genreId));
      if (existing.length > 0) {
        await db.update(genreOwners).set({ ownerUserId: topCommunity.adminId, assignedCommunityId: topCommunity.id, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(genreOwners.genreId, genreId));
      } else {
        await db.insert(genreOwners).values({
          genreId,
          ownerUserId: topCommunity.adminId,
          assignedCommunityId: topCommunity.id
        });
      }
      results.push({ genreId, ownerUserId: topCommunity.adminId, communityId: topCommunity.id });
    }
    res.json({ ok: true, assigned: results });
  });
  app2.get("/api/community-ads/review", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const ownedRows = await db.select({ id: communities.id }).from(communities).where(eq5(communities.adminId, user.id));
    const modRows = await db.select({ communityId: communityModerators.communityId }).from(communityModerators).where(eq5(communityModerators.userId, user.id));
    const communityIds = /* @__PURE__ */ new Set();
    ownedRows.forEach((r) => communityIds.add(r.id));
    modRows.forEach((r) => communityIds.add(r.communityId));
    if (communityIds.size === 0) {
      return res.json([]);
    }
    const ids = Array.from(communityIds);
    const ads = await db.select().from(communityAds).where(and5(inArray(communityAds.communityId, ids), inArray(communityAds.status, ["pending", "moderator_approved"]))).orderBy(desc(communityAds.createdAt));
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
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const id = paramNum(req, "id");
    const [ad] = await db.select().from(communityAds).where(eq5(communityAds.id, id));
    if (!ad) return res.status(404).json({ error: "Application not found" });
    if (ad.status !== "pending") return res.status(400).json({ error: "This application has already been processed" });
    const [mod] = await db.select().from(communityModerators).where(and5(eq5(communityModerators.communityId, ad.communityId), eq5(communityModerators.userId, user.id)));
    if (!mod) return res.status(403).json({ error: "Only moderators of this community can approve this" });
    await db.update(communityAds).set({ status: "moderator_approved", approvedByModerator: user.id }).where(eq5(communityAds.id, id));
    res.json({ ok: true });
  });
  app2.patch("/api/community-ads/:id/approve", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const id = paramNum(req, "id");
    const [ad] = await db.select().from(communityAds).where(eq5(communityAds.id, id));
    if (!ad) return res.status(404).json({ error: "Application not found" });
    if (ad.status !== "moderator_approved") return res.status(400).json({ error: "The owner can approve after moderator approval" });
    const [community] = await db.select().from(communities).where(eq5(communities.id, ad.communityId));
    if (!community || community.adminId !== user.id) return res.status(403).json({ error: "Only the owner can give final approval" });
    await db.update(communityAds).set({ status: "approved", approvedByOwner: user.id }).where(eq5(communityAds.id, id));
    res.json({ ok: true });
  });
  app2.patch("/api/community-ads/:id/reject", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const id = paramNum(req, "id");
    const [ad] = await db.select().from(communityAds).where(eq5(communityAds.id, id));
    if (!ad) return res.status(404).json({ error: "Application not found" });
    if (ad.status === "approved" || ad.status === "rejected") return res.status(400).json({ error: "Already processed" });
    const [community] = await db.select().from(communities).where(eq5(communities.id, ad.communityId));
    const [mod] = await db.select().from(communityModerators).where(and5(eq5(communityModerators.communityId, ad.communityId), eq5(communityModerators.userId, user.id)));
    const isOwner = community?.adminId === user.id;
    const isMod = !!mod;
    if (!isOwner && !isMod) return res.status(403).json({ error: "Only owners or moderators can reject" });
    await db.update(communityAds).set({ status: "rejected" }).where(eq5(communityAds.id, id));
    res.json({ ok: true });
  });
  const REPORT_REASONS = ["spam", "harassment", "inappropriate", "other"];
  app2.post("/api/reports", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const { contentType, contentId, reason } = req.body;
    const cid = Number(contentId) || 0;
    const type = contentType === "comment" ? "comment" : contentType === "video" ? "video" : null;
    if (!type || !cid || !reason || !REPORT_REASONS.includes(reason)) {
      return res.status(400).json({ error: "Provide contentType (video/comment), contentId, and reason (spam/harassment/inappropriate/other)" });
    }
    let contentText;
    if (type === "video") {
      const [video] = await db.select().from(videos).where(eq5(videos.id, cid));
      if (!video) return res.status(404).json({ error: "Target not found" });
      contentText = video.title ?? "";
    } else {
      const [comment] = await db.select().from(videoComments).where(eq5(videoComments.id, cid));
      if (!comment) return res.status(404).json({ error: "Target not found" });
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
        await db.update(videos).set({ hidden: true }).where(eq5(videos.id, cid));
      } else {
        await db.update(videoComments).set({ hidden: true }).where(eq5(videoComments.id, cid));
      }
    }
    res.status(201).json(report);
  });
  app2.post("/api/concerts", async (req, res) => {
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
      status
    } = req.body;
    if (!title || !venueName || !venueAddress || !concertDate) {
      return res.status(400).json({ error: "Required items are missing" });
    }
    const shares = [
      Number(artistShare ?? 0),
      Number(photographerShare ?? 0),
      Number(editorShare ?? 0),
      Number(venueShare ?? 0)
    ];
    if (shares.some((s) => s < 0)) {
      return res.status(400).json({ error: "Distribution ratios must be 0 or greater" });
    }
    const sum = shares.reduce((a, b) => a + b, 0);
    if (sum !== 100) {
      return res.status(400).json({ error: "Distribution must total 100%" });
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
    const rows = await db.select().from(concerts).where(eq5(concerts.status, "published")).orderBy(desc(concerts.concertDate), desc(concerts.createdAt));
    res.json(rows);
  });
  app2.get("/api/concerts/:id", async (req, res) => {
    const id = paramNum(req, "id");
    const [row] = await db.select().from(concerts).where(eq5(concerts.id, id));
    if (!row) return res.status(404).json({ error: "Show not found" });
    res.json(row);
  });
  app2.post("/api/concerts/:id/staff-request", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const concertId = paramNum(req, "id");
    const [concert] = await db.select().from(concerts).where(eq5(concerts.id, concertId));
    if (!concert) return res.status(404).json({ error: "Show not found" });
    const existing = await db.select().from(concertStaff).where(and5(eq5(concertStaff.concertId, concertId), eq5(concertStaff.staffUserId, user.id)));
    if (existing.length > 0) {
      return res.status(400).json({ error: "Already applied" });
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
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const concertId = paramNum(req, "id");
    const [concert] = await db.select().from(concerts).where(eq5(concerts.id, concertId));
    if (!concert) return res.status(404).json({ error: "Show not found" });
    if (concert.artistUserId !== user.id) {
      return res.status(403).json({ error: "Only the artist can view applications" });
    }
    const rows = await db.select().from(concertStaff).where(eq5(concertStaff.concertId, concertId)).orderBy(desc(concertStaff.createdAt));
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
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const concertId = paramNum(req, "id");
    const staffId = paramNum(req, "staffId");
    const [concert] = await db.select().from(concerts).where(eq5(concerts.id, concertId));
    if (!concert) return res.status(404).json({ error: "Show not found" });
    if (concert.artistUserId !== user.id) {
      return res.status(403).json({ error: "Only the artist can approve" });
    }
    const [staff] = await db.select().from(concertStaff).where(and5(eq5(concertStaff.id, staffId), eq5(concertStaff.concertId, concertId)));
    if (!staff) return res.status(404).json({ error: "Request not found" });
    const [updated] = await db.update(concertStaff).set({ status: "approved" }).where(eq5(concertStaff.id, staffId)).returning();
    res.json(updated);
  });
  app2.patch("/api/concerts/:id/staff/:staffId/reject", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const concertId = paramNum(req, "id");
    const staffId = paramNum(req, "staffId");
    const [concert] = await db.select().from(concerts).where(eq5(concerts.id, concertId));
    if (!concert) return res.status(404).json({ error: "Show not found" });
    if (concert.artistUserId !== user.id) {
      return res.status(403).json({ error: "Only the artist can reject" });
    }
    const [staff] = await db.select().from(concertStaff).where(and5(eq5(concertStaff.id, staffId), eq5(concertStaff.concertId, concertId)));
    if (!staff) return res.status(404).json({ error: "Request not found" });
    const [updated] = await db.update(concertStaff).set({ status: "rejected" }).where(eq5(concertStaff.id, staffId)).returning();
    res.json(updated);
  });
  const GENRE_MIN_AMOUNT = 7e3;
  const GENRE_MAX_MONTHS_AHEAD = 3;
  app2.post("/api/genre-ads", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const { genreId, companyName, contactName, email, bannerUrl, startDate, endDate } = req.body;
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
    const now = /* @__PURE__ */ new Date();
    const maxEnd = new Date(now);
    maxEnd.setMonth(maxEnd.getMonth() + GENRE_MAX_MONTHS_AHEAD);
    if (end > maxEnd) {
      return res.status(400).json({ error: `End date must be within ${GENRE_MAX_MONTHS_AHEAD} months` });
    }
    const cats = GENRE_TO_CATEGORY[gid];
    const communityRows = await db.select({ members: communities.members }).from(communities).where(
      or(
        ...cats.map(
          (c) => sql3`${communities.category} ILIKE ${"%" + c + "%"}`
        )
      )
    );
    const totalMembers = communityRows.reduce((sum, r) => sum + (r.members ?? 0), 0);
    const dailyRate = totalMembers * GENRE_DAILY_RATE_PER_MEMBER;
    const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1e3)) + 1;
    const totalAmount = dailyRate * days;
    if (totalAmount < GENRE_MIN_AMOUNT) {
      return res.status(400).json({ error: `Minimum ad spend is $${(GENRE_MIN_AMOUNT / 100).toFixed(2)}` });
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
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const ownerRows = await db.select().from(genreOwners).where(eq5(genreOwners.ownerUserId, user.id));
    if (ownerRows.length === 0) return res.json([]);
    const genreIds = ownerRows.map((o) => o.genreId);
    const rows = await db.select().from(genreAds).where(and5(inArray(genreAds.genreId, genreIds), eq5(genreAds.status, "pending"))).orderBy(desc(genreAds.createdAt));
    res.json(rows);
  });
  app2.patch("/api/genre-ads/:id/approve", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const id = paramNum(req, "id");
    const [ad] = await db.select().from(genreAds).where(eq5(genreAds.id, id));
    if (!ad) return res.status(404).json({ error: "Application not found" });
    const [owner] = await db.select().from(genreOwners).where(and5(eq5(genreOwners.genreId, ad.genreId), eq5(genreOwners.ownerUserId, user.id)));
    if (!owner) return res.status(403).json({ error: "You are not the genre manager" });
    await db.update(genreAds).set({ status: "approved" }).where(eq5(genreAds.id, id));
    res.json({ ok: true });
  });
  app2.patch("/api/genre-ads/:id/reject", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const id = paramNum(req, "id");
    const [ad] = await db.select().from(genreAds).where(eq5(genreAds.id, id));
    if (!ad) return res.status(404).json({ error: "Application not found" });
    const [owner] = await db.select().from(genreOwners).where(and5(eq5(genreOwners.genreId, ad.genreId), eq5(genreOwners.ownerUserId, user.id)));
    if (!owner) return res.status(403).json({ error: "You are not the genre manager" });
    await db.update(genreAds).set({ status: "rejected" }).where(eq5(genreAds.id, id));
    res.json({ ok: true });
  });
  app2.post("/api/cron/update-genre-owners", async (_req, res) => {
    for (const [gid, cats] of Object.entries(GENRE_TO_CATEGORY)) {
      const rows = await db.select({ id: communities.id, members: communities.members, adminId: communities.adminId }).from(communities).where(
        or(
          ...cats.map(
            (c) => sql3`${communities.category} ILIKE ${"%" + c + "%"}`
          )
        )
      ).orderBy(desc(communities.members)).limit(1);
      const top = rows[0];
      if (!top || !top.adminId) continue;
      const existing = await db.select().from(genreOwners).where(eq5(genreOwners.genreId, gid)).limit(1);
      if (existing.length > 0) {
        await db.update(genreOwners).set({ ownerUserId: top.adminId, updatedAt: sql3`now()` }).where(eq5(genreOwners.genreId, gid));
      } else {
        await db.insert(genreOwners).values({ genreId: gid, ownerUserId: top.adminId });
      }
    }
    res.json({ ok: true });
  });
  app2.get("/api/admin/reports", async (req, res) => {
    const user = await getAdminUserOrReject(req, res);
    if (!user) return;
    const showAll = req.query.all === "1";
    const rows = await db.select().from(reports).where(showAll ? void 0 : eq5(reports.status, "pending")).orderBy(desc(reports.createdAt));
    res.json(rows);
  });
  app2.patch("/api/admin/reports/:id/hide", async (req, res) => {
    const user = await getAdminUserOrReject(req, res);
    if (!user) return;
    const id = paramNum(req, "id");
    const [report] = await db.select().from(reports).where(eq5(reports.id, id));
    if (!report) return res.status(404).json({ error: "Report not found" });
    if (report.contentType === "video") {
      await db.update(videos).set({ hidden: true }).where(eq5(videos.id, report.contentId));
    } else if (report.contentType === "comment") {
      await db.update(videoComments).set({ hidden: true }).where(eq5(videoComments.id, report.contentId));
    }
    await db.update(reports).set({ status: "hidden" }).where(eq5(reports.id, id));
    res.json({ ok: true });
  });
  app2.patch("/api/admin/reports/:id/dismiss", async (req, res) => {
    const user = await getAdminUserOrReject(req, res);
    if (!user) return;
    const id = paramNum(req, "id");
    const [report] = await db.select().from(reports).where(eq5(reports.id, id));
    if (!report) return res.status(404).json({ error: "Report not found" });
    await db.update(reports).set({ status: "reviewed" }).where(eq5(reports.id, id));
    res.json({ ok: true });
  });
  app2.get("/api/admin/stats", async (req, res) => {
    const admin = await getAdminUserOrReject(req, res);
    if (!admin) return;
    const [{ userCount }] = await db.select({ userCount: sql3`count(*)::int` }).from(users);
    const [{ videoCount }] = await db.select({ videoCount: sql3`count(*)::int` }).from(videos);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
    const [{ salesLast30Days }] = await db.select({
      salesLast30Days: sql3`coalesce(sum(${earnings.amount}), 0)::int`
    }).from(earnings).where(gte2(earnings.createdAt, since));
    res.json({
      userCount: Number(userCount ?? 0),
      videoCount: Number(videoCount ?? 0),
      salesLast30Days: Number(salesLast30Days ?? 0)
    });
  });
  app2.get("/api/admin/users", async (req, res) => {
    const admin = await getAdminUserOrReject(req, res);
    if (!admin) return;
    const rows = await db.select({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
      role: users.role,
      isBanned: users.isBanned,
      createdAt: users.createdAt
    }).from(users).orderBy(desc(users.createdAt));
    res.json(rows);
  });
  app2.patch("/api/admin/users/:id", async (req, res) => {
    const admin = await getAdminUserOrReject(req, res);
    if (!admin) return;
    const targetUserId = paramNum(req, "id");
    if (!targetUserId) return res.status(400).json({ error: "Invalid user id" });
    const role = typeof req.body?.role === "string" ? req.body.role.trim().toUpperCase() : void 0;
    const isBanned = typeof req.body?.isBanned === "boolean" ? req.body.isBanned : void 0;
    const nextValues = { updatedAt: /* @__PURE__ */ new Date() };
    if (role !== void 0) {
      if (!["USER", "ADMIN"].includes(role)) {
        return res.status(400).json({ error: "role must be USER or ADMIN" });
      }
      nextValues.role = role;
    }
    if (isBanned !== void 0) {
      nextValues.isBanned = isBanned;
    }
    if (role === void 0 && isBanned === void 0) {
      return res.status(400).json({ error: "No updatable fields provided" });
    }
    const [updated] = await db.update(users).set(nextValues).where(eq5(users.id, targetUserId)).returning({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
      role: users.role,
      isBanned: users.isBanned,
      createdAt: users.createdAt
    });
    if (!updated) return res.status(404).json({ error: "User not found" });
    res.json(updated);
  });
  app2.get("/api/admin/content", async (req, res) => {
    const admin = await getAdminUserOrReject(req, res);
    if (!admin) return;
    const rows = await db.select({
      id: videos.id,
      title: videos.title,
      creator: videos.creator,
      thumbnail: videos.thumbnail,
      hidden: videos.hidden,
      visibility: videos.visibility,
      price: videos.price,
      createdAt: videos.createdAt
    }).from(videos).orderBy(desc(videos.createdAt));
    res.json(rows);
  });
  app2.patch("/api/admin/content/:id", async (req, res) => {
    const admin = await getAdminUserOrReject(req, res);
    if (!admin) return;
    const videoId = paramNum(req, "id");
    if (!videoId) return res.status(400).json({ error: "Invalid content id" });
    const hidden = typeof req.body?.hidden === "boolean" ? req.body.hidden : true;
    const [updated] = await db.update(videos).set({
      hidden
    }).where(eq5(videos.id, videoId)).returning({
      id: videos.id,
      title: videos.title,
      hidden: videos.hidden,
      visibility: videos.visibility
    });
    if (!updated) return res.status(404).json({ error: "Content not found" });
    res.json(updated);
  });
  app2.delete("/api/admin/content/:id", async (req, res) => {
    const admin = await getAdminUserOrReject(req, res);
    if (!admin) return;
    const videoId = paramNum(req, "id");
    if (!videoId) return res.status(400).json({ error: "Invalid content id" });
    await db.delete(savedVideos).where(eq5(savedVideos.videoId, videoId));
    await db.delete(videoComments).where(eq5(videoComments.videoId, videoId));
    await db.delete(reports).where(and5(eq5(reports.contentType, "video"), eq5(reports.contentId, videoId)));
    await db.delete(jukeboxQueue).where(eq5(jukeboxQueue.videoId, videoId));
    const deleted = await db.delete(videos).where(eq5(videos.id, videoId)).returning({ id: videos.id });
    if (deleted.length === 0) return res.status(404).json({ error: "Content not found" });
    res.json({ ok: true, id: videoId });
  });
  app2.post("/api/upload-url", async (req, res) => {
    debugIngestServer({
      sessionId: "88cb7d",
      runId: "initial",
      hypothesisId: "H5",
      location: "server/routes.ts:/api/upload-url",
      message: "Upload URL endpoint hit",
      data: {
        hasFileName: Boolean(req.body?.fileName),
        hasContentType: Boolean(req.body?.contentType)
      },
      timestamp: Date.now()
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
      userId: user.id
    });
    const { fileName, contentType: rawContentType } = req.body;
    if (!fileName) {
      return res.status(400).json({ error: "fileName is required" });
    }
    const contentType = typeof rawContentType === "string" && rawContentType.trim().length > 0 ? rawContentType.trim() : "application/octet-stream";
    const safeName = String(fileName).replace(/[^a-zA-Z0-9_.-]/g, "_");
    const key = `rawstock_${Date.now()}_${safeName}`;
    try {
      const { uploadUrl, publicUrl } = await createSignedUploadUrl(key, contentType);
      console.log("[upload-url] presign_ok", {
        keyLen: key.length,
        keyPrefix: key.slice(0, 56),
        contentType
      });
      res.json({ uploadUrl, key, url: publicUrl });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      const notConfigured = errMsg.includes("R2 is not configured") || errMsg.includes("\u6B63\u3057\u304F\u8A2D\u5B9A");
      console.error("[upload-url] presign_failed", {
        hasAccessKey,
        hasSecret,
        hasEndpoint,
        hasBucket,
        err: e
      });
      res.status(notConfigured ? 503 : 500).json({
        error: notConfigured ? "File storage is not configured. Set R2_* variables on the server (and R2_PUBLIC_BASE_URL if you use a public domain)." : "Failed to issue signed URL",
        code: notConfigured ? "R2_NOT_CONFIGURED" : "R2_PRESIGN_FAILED"
      });
    }
  });
  app2.get("/api/videos", async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    const genreId = req.query?.genre;
    const communityIdParam = req.query?.communityId;
    let rows = await db.select().from(videos).where(and5(eq5(videos.isRanked, false), eq5(videos.hidden, false))).orderBy(desc(videos.createdAt));
    rows = rows.filter((r) => r.visibility !== "draft" && r.visibility !== "my_page_only");
    const names = Array.from(new Set(rows.map((r) => r.creator)));
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
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const rows = await db.select().from(videos).where(or(eq5(videos.creator, user.displayName), eq5(videos.userId, user.id))).orderBy(desc(videos.createdAt));
    const filtered = rows.filter((r) => !r.hidden);
    res.json(filtered);
  });
  app2.get("/api/videos/ranked", async (_req, res) => {
    const rows = await db.select().from(videos).where(and5(eq5(videos.postType, "work"), eq5(videos.hidden, false))).orderBy(asc3(videos.rank));
    res.json(rows);
  });
  app2.get("/api/videos/saved", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const rows = await db.select({
      id: videos.id,
      title: videos.title,
      thumbnail: videos.thumbnail,
      creator: videos.creator,
      community: videos.community,
      views: videos.views,
      createdAt: videos.createdAt
    }).from(savedVideos).innerJoin(videos, eq5(videos.id, savedVideos.videoId)).where(and5(eq5(savedVideos.userId, user.id), eq5(videos.hidden, false))).orderBy(desc(savedVideos.createdAt));
    const timeAgoList = rows.map((r) => ({
      ...r,
      timeAgo: r.createdAt ? formatTimeAgo(r.createdAt) : "Just now"
    }));
    res.json(timeAgoList);
  });
  app2.get("/api/videos/:id", async (req, res) => {
    const id = paramNum(req, "id");
    const authUser = await getAuthUser(req);
    const [row] = await db.select().from(videos).where(eq5(videos.id, id));
    if (!row || row.hidden) return res.status(404).json({ message: "Not found" });
    const vis = row.visibility;
    const isOwner = authUser && (row.userId === authUser.id || row.creator === authUser.displayName);
    if (vis === "draft" && !isOwner) return res.status(404).json({ message: "Not found" });
    if (vis === "my_page_only" && !isOwner) return res.status(404).json({ message: "Not found" });
    const timeAgo = row.createdAt ? formatTimeAgo(row.createdAt) : row.timeAgo;
    const [creatorUser] = await db.select({ id: users.id }).from(users).where(eq5(users.displayName, row.creator));
    const [creatorLiver] = !creatorUser ? await db.select({ id: creators.id }).from(creators).where(eq5(creators.name, row.creator)) : [];
    const creatorType = creatorUser ? "user" : creatorLiver ? "liver" : null;
    const creatorId = row.userId ?? creatorUser?.id ?? null;
    res.json({ ...row, timeAgo, creatorType, creatorId, creatorLiverProfileId: creatorLiver?.id ?? null });
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
    }).from(videoComments).leftJoin(users, eq5(users.id, videoComments.userId)).where(and5(eq5(videoComments.videoId, videoId), eq5(videoComments.hidden, false))).orderBy(asc3(videoComments.createdAt));
    res.json(rows);
  });
  app2.post("/api/videos/:id/comments", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const videoId = paramNum(req, "id");
    const text2 = req.body.text?.trim();
    if (!text2) return res.status(400).json({ error: "Comment text is required" });
    const [row] = await db.insert(videoComments).values({ videoId, userId: user.id, text: text2 }).returning();
    res.status(201).json(row);
  });
  app2.post("/api/videos", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const { title, community, communityId, duration, price, thumbnail, description, concertId, visibility, videoUrl, youtubeId, postType, complianceAcknowledged } = req.body;
    if (complianceAcknowledged !== true) {
      return res.status(400).json({
        message: "Confirm community guidelines and rights before posting",
        code: "COMPLIANCE_ACK_REQUIRED"
      });
    }
    if (!title || !duration || !thumbnail) {
      return res.status(400).json({ message: "Required fields are missing" });
    }
    const vis = visibility === "draft" ? "draft" : visibility === "my_page_only" ? "my_page_only" : "community";
    if (vis === "community" && (!community || !community.trim())) {
      return res.status(400).json({ message: "Specify community when posting to a community" });
    }
    const [row] = await db.insert(videos).values({
      title,
      creator: user.displayName,
      community: community?.trim() ?? "",
      views: 0,
      timeAgo: "Just now",
      duration,
      price: price ?? null,
      thumbnail,
      description: description?.trim() || null,
      avatar: user.profileImageUrl ?? user.avatar ?? "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop",
      concertId: concertId ?? null,
      userId: user.id,
      visibility: vis,
      communityId: vis === "community" ? communityId ?? null : null,
      videoUrl: videoUrl?.trim() || null,
      youtubeId: youtubeId?.trim() || null,
      postType: postType === "work" ? "work" : "daily",
      isRanked: postType === "work"
    }).returning();
    res.status(201).json(row);
  });
  app2.patch("/api/videos/:id", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const id = paramNum(req, "id");
    const [video] = await db.select().from(videos).where(eq5(videos.id, id));
    if (!video) return res.status(404).json({ message: "Not found" });
    const isOwner = video.userId === user.id || video.creator === user.displayName;
    if (!isOwner) return res.status(403).json({ error: "You do not have permission to edit" });
    const { title, visibility, communityId, community } = req.body;
    const updates = {};
    if (title !== void 0) {
      const newTitle = title?.trim();
      if (!newTitle) return res.status(400).json({ error: "Title is required" });
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
    const [updated] = await db.update(videos).set(updates).where(eq5(videos.id, id)).returning();
    res.json(updated);
  });
  app2.delete("/api/videos/:id", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const id = paramNum(req, "id");
    const [video] = await db.select().from(videos).where(eq5(videos.id, id));
    if (!video) return res.status(404).json({ message: "Not found" });
    const isOwner = video.userId === user.id || video.creator === user.displayName;
    if (!isOwner) return res.status(403).json({ error: "You do not have permission to delete" });
    await db.delete(videoComments).where(eq5(videoComments.videoId, id));
    await db.delete(videos).where(eq5(videos.id, id));
    res.json({ ok: true });
  });
  app2.post("/api/videos/:id/save", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const videoId = paramNum(req, "id");
    const [video] = await db.select().from(videos).where(eq5(videos.id, videoId));
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
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const videoId = paramNum(req, "id");
    await db.delete(savedVideos).where(and5(eq5(savedVideos.userId, user.id), eq5(savedVideos.videoId, videoId)));
    res.json({ ok: true });
  });
  app2.get("/api/videos/:id/saved", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.json({ saved: false });
    const videoId = paramNum(req, "id");
    const [row] = await db.select().from(savedVideos).where(and5(eq5(savedVideos.userId, user.id), eq5(savedVideos.videoId, videoId)));
    res.json({ saved: !!row });
  });
  app2.get("/api/users/:id/posts", async (req, res) => {
    const userId = paramNum(req, "id");
    const [targetUser] = await db.select({ id: users.id, displayName: users.displayName }).from(users).where(eq5(users.id, userId));
    if (!targetUser) return res.status(404).json({ message: "Not found" });
    const rows = await db.select().from(videos).where(
      and5(
        or(eq5(videos.userId, userId), eq5(videos.creator, targetUser.displayName)),
        eq5(videos.hidden, false)
      )
    ).orderBy(desc(videos.createdAt));
    const filtered = rows.filter((r) => {
      const v = r.visibility;
      return v !== "draft";
    });
    res.json(filtered);
  });
  app2.get("/api/live-streams", async (_req, res) => {
    const rows = await db.select().from(liveStreams).where(eq5(liveStreams.isLive, true)).orderBy(desc(liveStreams.viewers));
    res.json(rows);
  });
  app2.get("/api/creators", async (_req, res) => {
    const rows = await db.select().from(creators).orderBy(asc3(creators.rank));
    res.json(rows);
  });
  app2.get("/api/booking-sessions", async (req, res) => {
    const category = queryStr(req, "category");
    const rows = category && category !== "all" ? await db.select().from(bookingSessions).where(eq5(bookingSessions.category, category)) : await db.select().from(bookingSessions);
    res.json(rows);
  });
  app2.post("/api/booking-sessions/:id/book", async (req, res) => {
    const id = paramNum(req, "id");
    const [session] = await db.select().from(bookingSessions).where(eq5(bookingSessions.id, id));
    if (!session) return res.status(404).json({ message: "Not found" });
    if (session.spotsLeft <= 0) return res.status(400).json({ message: "Fully booked" });
    const [updated] = await db.update(bookingSessions).set({ spotsLeft: session.spotsLeft - 1 }).where(eq5(bookingSessions.id, id)).returning();
    res.json(updated);
  });
  app2.post("/api/dm/open", async (req, res) => {
    const me = await getAuthUser(req);
    if (!me) return res.status(401).json({ error: "Not authenticated" });
    const raw = req.body?.peerUserId;
    const peer = typeof raw === "number" && Number.isFinite(raw) ? Math.floor(raw) : typeof raw === "string" ? parseInt(raw, 10) : NaN;
    if (!Number.isFinite(peer) || peer < 1) {
      return res.status(400).json({ error: "peerUserId is required" });
    }
    if (peer === me.id) return res.status(400).json({ error: "You cannot DM yourself" });
    const [peerUser] = await db.select({ id: users.id }).from(users).where(eq5(users.id, peer));
    if (!peerUser) return res.status(404).json({ error: "User not found" });
    const u1 = Math.min(me.id, peer);
    const u2 = Math.max(me.id, peer);
    let [th] = await db.select().from(dmThreads).where(and5(eq5(dmThreads.user1Id, u1), eq5(dmThreads.user2Id, u2)));
    if (!th) {
      [th] = await db.insert(dmThreads).values({ user1Id: u1, user2Id: u2 }).returning();
    }
    res.json({ threadId: th.id });
  });
  app2.get("/api/dm-messages", async (req, res) => {
    const me = await getAuthUser(req);
    if (!me) return res.json([]);
    const threads = await db.select().from(dmThreads).where(or(eq5(dmThreads.user1Id, me.id), eq5(dmThreads.user2Id, me.id))).orderBy(desc(dmThreads.updatedAt));
    const out = [];
    for (const t of threads) {
      const peerId = t.user1Id === me.id ? t.user2Id : t.user1Id;
      const [peer] = await db.select({ displayName: users.displayName, profileImageUrl: users.profileImageUrl }).from(users).where(eq5(users.id, peerId));
      if (!peer) continue;
      out.push({
        id: t.id,
        name: peer.displayName ?? "User",
        avatar: peer.profileImageUrl ?? "",
        lastMessage: t.lastMessagePreview ?? "",
        time: formatDmThreadTime(t.updatedAt ?? void 0),
        unread: 0,
        online: false,
        otherUserId: peerId
      });
    }
    const opsDm = await ensureOperationsDmRow();
    const [{ welcomeDmSentAt, operationsDmOpenedAt }] = await db.select({
      welcomeDmSentAt: users.welcomeDmSentAt,
      operationsDmOpenedAt: users.operationsDmOpenedAt
    }).from(users).where(eq5(users.id, me.id));
    if (opsDm) {
      const preview = (opsDm.lastMessage ?? "").split("\n").find((line) => line.trim().length > 0) ?? opsDm.lastMessage ?? "";
      const opsUnread = welcomeDmSentAt && !operationsDmOpenedAt ? 1 : 0;
      out.unshift({
        id: -opsDm.id,
        name: opsDm.name,
        avatar: opsDm.avatar,
        lastMessage: preview.slice(0, 200),
        time: opsDm.time || "Just now",
        unread: opsUnread,
        online: Boolean(opsDm.online),
        otherUserId: 0
      });
    }
    res.json(out);
  });
  app2.post("/api/dm-messages/:id/read", async (req, res) => {
    const rawId = paramNum(req, "id");
    const legacyDmId = rawId < 0 ? -rawId : rawId;
    const me = await getAuthUser(req);
    if (me && rawId > 0) {
      const [th] = await db.select().from(dmThreads).where(
        and5(
          eq5(dmThreads.id, rawId),
          or(eq5(dmThreads.user1Id, me.id), eq5(dmThreads.user2Id, me.id))
        )
      );
      if (th) return res.json({ ok: true });
    }
    const [updated] = await db.update(dmMessages).set({ unread: 0 }).where(eq5(dmMessages.id, legacyDmId)).returning();
    if (me) {
      const [legacyMeta] = await db.select({ name: dmMessages.name }).from(dmMessages).where(eq5(dmMessages.id, legacyDmId));
      if (legacyMeta?.name === OPERATIONS_DM_NAME) {
        await db.update(users).set({ operationsDmOpenedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq5(users.id, me.id));
      }
    }
    res.json(updated ?? { ok: true });
  });
  app2.get("/api/notifications/unread-count", async (_req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    const [{ count: count2 }] = await db.select({ count: sql3`count(*)::int` }).from(notifications).where(eq5(notifications.isRead, false));
    res.json({ count: count2 ?? 0 });
  });
  app2.get("/api/notifications", async (req, res) => {
    const type = queryStr(req, "type");
    const rows = type && type !== "all" ? await db.select().from(notifications).where(eq5(notifications.type, type)).orderBy(desc(notifications.createdAt)) : await db.select().from(notifications).orderBy(desc(notifications.createdAt));
    res.json(rows);
  });
  app2.post("/api/notifications/read-all", async (_req, res) => {
    await db.update(notifications).set({ isRead: true });
    res.json({ ok: true });
  });
  app2.post("/api/notifications/:id/read", async (req, res) => {
    const id = paramNum(req, "id");
    const [updated] = await db.update(notifications).set({ isRead: true }).where(eq5(notifications.id, id)).returning();
    res.json(updated);
  });
  app2.get("/api/live-streams/:id", async (req, res) => {
    const id = paramNum(req, "id");
    const [stream] = await db.select().from(liveStreams).where(eq5(liveStreams.id, id));
    if (!stream) return res.status(404).json({ error: "Not found" });
    res.json(stream);
  });
  app2.get("/api/live-streams/:id/chat", async (req, res) => {
    const id = paramNum(req, "id");
    const msgs = await db.select().from(liveStreamChat).where(eq5(liveStreamChat.streamId, id)).orderBy(asc3(liveStreamChat.createdAt));
    res.json(msgs);
  });
  app2.post("/api/live-streams/:id/chat", async (req, res) => {
    const id = paramNum(req, "id");
    const { username, avatar, message, isGift, giftAmount } = req.body;
    if (!isGift && message) {
      const modResult = await moderateContent(message);
      if (modResult.allowed === false) {
        return res.status(400).json({ error: modResult.reason ?? "This content is not allowed" });
      }
    }
    const [msg] = await db.insert(liveStreamChat).values({
      streamId: id,
      username: username ?? "You",
      avatar,
      message,
      isGift: isGift ?? false,
      giftAmount: giftAmount ?? null
    }).returning();
    res.json(msg);
  });
  app2.get("/api/dm-messages/:id/peer", async (req, res) => {
    const rawId = paramNum(req, "id");
    const me = await getAuthUser(req);
    if (!me) return res.status(401).json({ error: "Not authenticated" });
    const legacyDmId = rawId < 0 ? -rawId : rawId;
    if (rawId > 0) {
      const [th] = await db.select().from(dmThreads).where(
        and5(eq5(dmThreads.id, rawId), or(eq5(dmThreads.user1Id, me.id), eq5(dmThreads.user2Id, me.id)))
      );
      if (th) {
        const peerId = th.user1Id === me.id ? th.user2Id : th.user1Id;
        const [peer] = await db.select({ displayName: users.displayName, profileImageUrl: users.profileImageUrl }).from(users).where(eq5(users.id, peerId));
        if (!peer) return res.status(404).json({ error: "Not found" });
        return res.json({
          name: peer.displayName ?? "User",
          avatar: peer.profileImageUrl ?? "",
          otherUserId: peerId
        });
      }
    }
    const [legacyDm] = await db.select().from(dmMessages).where(eq5(dmMessages.id, legacyDmId));
    if (!legacyDm) return res.status(404).json({ error: "Not found" });
    res.json({
      name: legacyDm.name,
      avatar: legacyDm.avatar,
      otherUserId: 0
    });
  });
  app2.get("/api/dm-messages/:id/conversation", async (req, res) => {
    const rawId = paramNum(req, "id");
    const me = await getAuthUser(req);
    if (!me) return res.status(401).json({ error: "Not authenticated" });
    const legacyDmId = rawId < 0 ? -rawId : rawId;
    if (rawId > 0) {
      const [th] = await db.select().from(dmThreads).where(
        and5(eq5(dmThreads.id, rawId), or(eq5(dmThreads.user1Id, me.id), eq5(dmThreads.user2Id, me.id)))
      );
      if (th) {
        const rows = await db.select().from(dmThreadMessages).where(eq5(dmThreadMessages.threadId, rawId)).orderBy(asc3(dmThreadMessages.createdAt));
        return res.json(
          rows.map((m) => ({
            id: m.id,
            sender: m.senderUserId === me.id ? "me" : "them",
            senderId: m.senderUserId,
            text: m.text,
            isRead: true,
            createdAt: (m.createdAt ?? /* @__PURE__ */ new Date()).toISOString(),
            imageUrl: null
          }))
        );
      }
    }
    const msgs = await db.select().from(dmConversationMessages).where(eq5(dmConversationMessages.dmId, legacyDmId)).orderBy(asc3(dmConversationMessages.createdAt));
    res.json(msgs);
  });
  app2.post("/api/dm-messages/:id/conversation", async (req, res) => {
    const rawId = paramNum(req, "id");
    const legacyDmId = rawId < 0 ? -rawId : rawId;
    const me = await getAuthUser(req);
    if (!me) return res.status(401).json({ error: "Not authenticated" });
    const text2 = typeof req.body?.text === "string" ? req.body.text : "";
    if (!text2.trim()) return res.status(400).json({ error: "Please enter a message" });
    if (rawId > 0) {
      const [th] = await db.select().from(dmThreads).where(
        and5(eq5(dmThreads.id, rawId), or(eq5(dmThreads.user1Id, me.id), eq5(dmThreads.user2Id, me.id)))
      );
      if (th) {
        const [msg2] = await db.insert(dmThreadMessages).values({
          threadId: rawId,
          senderUserId: me.id,
          text: text2.trim()
        }).returning();
        await db.update(dmThreads).set({
          lastMessagePreview: text2.trim().slice(0, 200),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq5(dmThreads.id, rawId));
        await syncUserLastContentLang(me.id, text2.trim());
        return res.json({
          id: msg2.id,
          sender: "me",
          senderId: me.id,
          text: msg2.text,
          isRead: true,
          createdAt: (msg2.createdAt ?? /* @__PURE__ */ new Date()).toISOString(),
          imageUrl: null
        });
      }
    }
    const [msg] = await db.insert(dmConversationMessages).values({
      dmId: legacyDmId,
      sender: "me",
      text: text2.trim(),
      isRead: true
    }).returning();
    await db.update(dmMessages).set({ lastMessage: text2.trim(), unread: 0 }).where(eq5(dmMessages.id, legacyDmId));
    await syncUserLastContentLang(me.id, text2.trim());
    res.json({
      ...msg,
      createdAt: (msg.createdAt ?? /* @__PURE__ */ new Date()).toISOString(),
      imageUrl: null
    });
  });
  app2.get("/api/jukebox/active-sessions", async (_req, res) => {
    const playingRows = await db.select({
      communityId: jukeboxState.communityId,
      communityName: communities.name,
      trackTitle: jukeboxState.currentVideoTitle
    }).from(jukeboxState).innerJoin(communities, eq5(communities.id, jukeboxState.communityId)).where(eq5(jukeboxState.isPlaying, true));
    const active = playingRows.filter((r) => (r.trackTitle ?? "").trim().length > 0).map((r) => ({
      communityId: r.communityId,
      communityName: r.communityName,
      trackTitle: (r.trackTitle ?? "").trim()
    }));
    const idleRows = await db.select({
      communityId: jukeboxState.communityId,
      communityName: communities.name
    }).from(jukeboxState).innerJoin(communities, eq5(communities.id, jukeboxState.communityId)).where(eq5(jukeboxState.isPlaying, false));
    const activeIds = new Set(active.map((a) => a.communityId));
    const recruiting = idleRows.filter((r) => !activeIds.has(r.communityId)).map((r) => ({
      communityId: r.communityId,
      communityName: r.communityName
    }));
    res.json({ active, recruiting });
  });
  app2.get("/api/jukebox/:communityId", async (req, res) => {
    const communityId = paramNum(req, "communityId");
    const now = /* @__PURE__ */ new Date();
    const [stateRaw] = await db.select().from(jukeboxState).where(eq5(jukeboxState.communityId, communityId));
    const queue = await db.select().from(jukeboxQueue).where(and5(eq5(jukeboxQueue.communityId, communityId), eq5(jukeboxQueue.isPlayed, false))).orderBy(asc3(jukeboxQueue.position));
    let state = stateRaw ?? null;
    let queueModified = false;
    if (state && state.currentVideoDurationSecs && state.currentVideoDurationSecs > 0 && state.startedAt) {
      const elapsedSecs2 = (now.getTime() - new Date(state.startedAt).getTime()) / 1e3;
      if (elapsedSecs2 >= state.currentVideoDurationSecs) {
        const currentItem = queue.find(
          (q) => state.currentVideoYoutubeId && q.youtubeId === state.currentVideoYoutubeId || state.currentVideoId != null && q.videoId === state.currentVideoId
        );
        if (currentItem) {
          await db.update(jukeboxQueue).set({ isPlayed: true }).where(eq5(jukeboxQueue.id, currentItem.id));
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
          }).where(eq5(jukeboxState.communityId, communityId)).returning();
          state = updated;
        }
      }
    }
    const queueToReturn = queueModified ? await db.select().from(jukeboxQueue).where(and5(eq5(jukeboxQueue.communityId, communityId), eq5(jukeboxQueue.isPlayed, false))).orderBy(asc3(jukeboxQueue.position)) : queue;
    const chat = await db.select().from(jukeboxChat).where(eq5(jukeboxChat.communityId, communityId)).orderBy(desc(jukeboxChat.createdAt)).limit(30).then((rows) => rows.reverse());
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
  app2.get("/api/jukebox/:communityId/stream", async (req, res) => {
    const communityId = paramNum(req, "communityId");
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    res.write("event: ping\ndata: {}\n\n");
    try {
      const [currentState] = await db.select().from(jukeboxState).where(eq5(jukeboxState.communityId, communityId));
      if (currentState) {
        const elapsed = currentState.isPlaying && currentState.startedAt ? (Date.now() - new Date(currentState.startedAt).getTime()) / 1e3 : 0;
        const stateData = { ...currentState, elapsedSecs: Math.max(0, elapsed) };
        res.write(`event: state_update
data: ${JSON.stringify({ type: "state_update", data: stateData, ts: Date.now() })}

`);
      }
      const currentQueue = await db.select().from(jukeboxQueue).where(and5(eq5(jukeboxQueue.communityId, communityId), eq5(jukeboxQueue.isPlayed, false))).orderBy(asc3(jukeboxQueue.position));
      res.write(`event: queue_update
data: ${JSON.stringify({ type: "queue_update", data: currentQueue, ts: Date.now() })}

`);
    } catch (e) {
      console.error("[SSE] initial snapshot error:", e);
    }
    const unsubscribe = subscribeJukeboxEvents(communityId, (event) => {
      try {
        const eventType = event.type ?? "message";
        const data = JSON.stringify(event);
        res.write(`event: ${eventType}
data: ${data}

`);
      } catch {
      }
    });
    const pingInterval = setInterval(() => {
      try {
        res.write("event: ping\ndata: {}\n\n");
      } catch {
      }
    }, 15e3);
    req.on("close", () => {
      unsubscribe();
      clearInterval(pingInterval);
    });
  });
  function normalizeStreamVisibility(v) {
    if (v === "followers" || v === "community" || v === "paid") return v;
    return "public";
  }
  async function canViewerAccessLiveStream(srow, viewer) {
    const vis = srow.visibility ?? "public";
    if (vis === "public") return true;
    const hostId = srow.hostUserId;
    if (viewer && hostId != null && viewer.id === hostId) return true;
    if (vis === "followers") {
      if (hostId == null) return true;
      if (!viewer) return false;
      const [f] = await db.select({ id: userFollows.id }).from(userFollows).where(and5(eq5(userFollows.followerId, viewer.id), eq5(userFollows.followingId, hostId)));
      return !!f;
    }
    if (vis === "community") {
      const cid = srow.restrictedCommunityId;
      if (cid == null) return false;
      if (!viewer) return false;
      const [m] = await db.select({ id: communityMembers.id }).from(communityMembers).where(and5(eq5(communityMembers.userId, viewer.id), eq5(communityMembers.communityId, cid)));
      return !!m;
    }
    if (vis === "paid") {
      if (!viewer) return false;
      const [access] = await db.select({ id: streamPaidAccess.id }).from(streamPaidAccess).where(and5(eq5(streamPaidAccess.streamId, srow.id), eq5(streamPaidAccess.viewerUserId, viewer.id))).limit(1);
      return !!access;
    }
    return true;
  }
  app2.post("/api/debug/cf-stream-test", async (req, res) => {
    const { token, accountId, liveInputId } = req.body;
    const testToken = token ?? CLOUDFLARE_STREAM_TOKEN;
    const testAccountId = accountId ?? CLOUDFLARE_ACCOUNT_ID;
    const testLiveInputId = liveInputId ?? "3e77a8086bdf3e67ea8af0bd764b350b";
    if (!testToken || !testAccountId) {
      return res.status(400).json({
        ok: false,
        error: "token and accountId are required (pass in body or set env vars)"
      });
    }
    const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${testAccountId}/stream/live_inputs/${testLiveInputId}`;
    try {
      const cfRes = await fetch(cfUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${testToken}`,
          "Content-Type": "application/json"
        }
      });
      const cfData = await cfRes.json();
      return res.json({
        ok: cfRes.ok,
        status: cfRes.status,
        cfUrl,
        tokenPrefix: testToken.slice(0, 8) + "\u2026",
        accountId: testAccountId,
        liveInputId: testLiveInputId,
        cfResponse: cfData
      });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message, cfUrl });
    }
  });
  app2.post("/api/stream/create", async (req, res) => {
    debugIngestServer({
      sessionId: "88cb7d",
      runId: "initial",
      hypothesisId: "H5",
      location: "server/routes.ts:/api/stream/create",
      message: "Stream create endpoint hit",
      data: {
        hasCloudflareAccountId: Boolean(CLOUDFLARE_ACCOUNT_ID),
        hasCloudflareStreamToken: Boolean(CLOUDFLARE_STREAM_TOKEN),
        bodyKeys: Object.keys(req.body ?? {})
      },
      timestamp: Date.now()
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
      ticketPrice: ticketPriceIn
    } = req.body ?? {};
    const visibility = normalizeStreamVisibility(visIn);
    let restrictedCommunityId = null;
    let ticketPrice = null;
    if (visibility === "community") {
      const cid = typeof rcIn === "number" && Number.isFinite(rcIn) ? rcIn : parseInt(String(rcIn ?? ""), 10);
      if (!Number.isFinite(cid)) {
        return res.status(400).json({ error: "restrictedCommunityId is required for community-only streams" });
      }
      const [mem] = await db.select({ id: communityMembers.id }).from(communityMembers).where(and5(eq5(communityMembers.userId, user.id), eq5(communityMembers.communityId, cid)));
      if (!mem) {
        return res.status(403).json({ error: "You are not a member of the selected community" });
      }
      restrictedCommunityId = cid;
    }
    if (visibility === "paid") {
      const p = typeof ticketPriceIn === "number" && Number.isFinite(ticketPriceIn) ? ticketPriceIn : parseInt(String(ticketPriceIn ?? ""), 10);
      if (!Number.isFinite(p) || p <= 0) {
        return res.status(400).json({ error: "ticketPrice is required for paid streams" });
      }
      ticketPrice = p;
    }
    try {
      const displayTitle = typeof title === "string" && title.trim() || typeof name === "string" && name.trim() || "";
      const metaName = displayTitle || `RawStock Stream by ${user.displayName}`;
      console.log("[Cloudflare Stream] creating live_input with env:", {
        accountId: maskSecretPrefix(CLOUDFLARE_ACCOUNT_ID),
        streamToken: maskSecretPrefix(CLOUDFLARE_STREAM_TOKEN)
      });
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
              name: metaName
            }
          })
        }
      );
      const json = await cfRes.json();
      if (!cfRes.ok || !json.success || !json.result) {
        const detail = formatCloudflareApiErrors(json.errors);
        console.error("Cloudflare Stream create error:", cfRes.status, json.errors);
        const low = (detail ?? "").toLowerCase();
        const authHint = low.includes("authorization") || low.includes("not authorized") || low.includes("credentials") || low.includes("forbidden") || cfRes.status === 403;
        const hint = authHint ? "Fix: In Cloudflare Dashboard \u2192 My Profile \u2192 API Tokens, create a token with Account \u2192 Stream \u2192 Edit (or Stream with write). Set CLOUDFLARE_STREAM_TOKEN to that token and CLOUDFLARE_ACCOUNT_ID to the same account. R2 tokens will not work." : void 0;
        return res.status(502).json({
          error: "Failed to create Cloudflare Stream live input",
          ...detail ? { detail } : {},
          ...hint ? { hint } : {},
          cloudflareResponse: json
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
          detail: "WHIP/WebRTC or RTMPS fields missing. Enable Cloudflare Stream on the account and check billing / minutes quota."
        });
      }
      const whipUrlStored = whipPublish || webRtcPlaybackUrl;
      const [row] = await db.insert(streams).values({
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
        restrictedCommunityId: visibility === "community" ? restrictedCommunityId : null
      }).returning();
      res.json({
        id: row.id,
        whipUrl: whipUrlStored,
        whepUrl: webRtcPlaybackUrl,
        webRtc: { url: webRtcPlaybackUrl },
        rtmps: { url: rtmpsUrl, streamKey: rtmpsStreamKey }
      });
    } catch (e) {
      console.error("Cloudflare Stream create exception:", e);
      res.status(500).json({ error: "Cloudflare Stream API request failed" });
    }
  });
  app2.get("/api/stream/:id", async (req, res) => {
    const id = paramNum(req, "id");
    if (!id) return res.status(400).json({ error: "Invalid id" });
    const [srow] = await db.select().from(streams).where(eq5(streams.id, id));
    if (srow) {
      let creator = "Host";
      let avatar = "";
      if (srow.hostUserId != null) {
        const [u] = await db.select().from(users).where(eq5(users.id, srow.hostUserId));
        if (u) {
          creator = u.displayName ?? creator;
          avatar = u.profileImageUrl ?? "";
        }
      }
      const viewer = await getAuthUser(req);
      const playbackOk = await canViewerAccessLiveStream(srow, viewer);
      const vis = srow.visibility ?? "public";
      const streamAccessDenied = !playbackOk && vis !== "public";
      const hid = srow.hostUserId;
      let isFollowingHost = false;
      if (viewer && hid != null && viewer.id !== hid) {
        const [f] = await db.select({ id: userFollows.id }).from(userFollows).where(and5(eq5(userFollows.followerId, viewer.id), eq5(userFollows.followingId, hid)));
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
        price: vis === "paid" ? srow.ticketPrice ?? null : null,
        whepUrl: playbackOk ? srow.webRtcUrl : null,
        whipUrl: playbackOk ? srow.whipUrl ?? srow.webRtcUrl : null,
        isActive: srow.isLive,
        isLive: srow.isLive,
        community: "",
        timeAgo: srow.isLive ? "LIVE" : "Offline",
        visibility: vis,
        streamAccessDenied,
        streamAccessDeniedReason: streamAccessDenied && vis === "paid" ? "ticket_required" : void 0,
        hostUserId: hid ?? null,
        isFollowingHost: viewer && hid != null && viewer.id !== hid ? isFollowingHost : false
      });
    }
    const [live] = await db.select().from(liveStreams).where(eq5(liveStreams.id, id));
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
      isFollowingHost: false
    });
  });
  app2.post("/api/stream/:id/start", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const id = paramNum(req, "id");
    const [row] = await db.select().from(streams).where(eq5(streams.id, id));
    if (!row) return res.status(404).json({ error: "Not found" });
    if (row.hostUserId != null && row.hostUserId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const now = /* @__PURE__ */ new Date();
    const [updated] = await db.update(streams).set({
      isLive: true,
      startedAt: now,
      endedAt: null,
      currentViewers: 0
    }).where(eq5(streams.id, id)).returning();
    res.json(updated);
  });
  app2.post("/api/stream/:id/end", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const id = paramNum(req, "id");
    const [row] = await db.select().from(streams).where(eq5(streams.id, id));
    if (!row) return res.status(404).json({ error: "Not found" });
    if (row.hostUserId != null && row.hostUserId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const now = /* @__PURE__ */ new Date();
    const [updated] = await db.update(streams).set({
      isLive: false,
      endedAt: now
    }).where(eq5(streams.id, id)).returning();
    res.json(updated);
  });
  app2.post("/api/stream/:id/join", async (req, res) => {
    const id = paramNum(req, "id");
    const [srow] = await db.select().from(streams).where(eq5(streams.id, id));
    if (srow) {
      const viewer = await getAuthUser(req);
      const allowed = await canViewerAccessLiveStream(srow, viewer);
      if (!allowed) {
        const vis = srow.visibility ?? "public";
        if (vis === "paid") {
          return res.status(402).json({
            error: "Tickets required to watch this stream",
            code: "STREAM_TICKET_REQUIRED",
            required: srow.ticketPrice ?? 0
          });
        }
        return res.status(403).json({
          error: "You are not allowed to watch this stream",
          code: "STREAM_ACCESS_DENIED"
        });
      }
      const [updated] = await db.update(streams).set({ currentViewers: sql3`${streams.currentViewers} + 1` }).where(eq5(streams.id, id)).returning();
      return res.json({ viewerCount: updated.currentViewers, currentViewers: updated.currentViewers });
    }
    const [live] = await db.select().from(liveStreams).where(eq5(liveStreams.id, id));
    if (!live) return res.status(404).json({ error: "Not found" });
    const next = Math.max(0, live.viewers + 1);
    await db.update(liveStreams).set({ viewers: next }).where(eq5(liveStreams.id, id));
    return res.json({ viewerCount: next, currentViewers: next });
  });
  app2.post("/api/stream/:id/join-paid", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const id = paramNum(req, "id");
    const [srow] = await db.select().from(streams).where(eq5(streams.id, id));
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
        const existingAccess = await tx.select({ id: streamPaidAccess.id }).from(streamPaidAccess).where(and5(eq5(streamPaidAccess.streamId, id), eq5(streamPaidAccess.viewerUserId, user.id))).limit(1);
        if (existingAccess.length > 0) {
          const [updated2] = await tx.update(streams).set({ currentViewers: sql3`${streams.currentViewers} + 1` }).where(eq5(streams.id, id)).returning();
          currentViewers = updated2.currentViewers;
          return;
        }
        const userId = String(user.id);
        const balRows = await tx.select().from(ticketBalances).where(eq5(ticketBalances.userId, userId)).limit(1);
        const currentBalance = balRows[0]?.balance ?? 0;
        if (currentBalance < ticketPrice) {
          const err = new Error("INSUFFICIENT_TICKETS");
          err.meta = { balance: currentBalance, required: ticketPrice };
          throw err;
        }
        const newBalance = currentBalance - ticketPrice;
        if (balRows.length === 0) {
          await tx.insert(ticketBalances).values({ userId, balance: newBalance });
        } else {
          await tx.update(ticketBalances).set({ balance: newBalance, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(ticketBalances.userId, userId));
        }
        const [spendTx] = await tx.insert(ticketTransactions).values({
          userId,
          amount: -ticketPrice,
          type: "spend_session",
          referenceId: `live:${id}`,
          description: `Paid live access for stream ${id}`
        }).returning({ id: ticketTransactions.id });
        await tx.insert(streamPaidAccess).values({
          streamId: id,
          viewerUserId: user.id,
          ticketAmount: ticketPrice,
          ticketTransactionId: spendTx.id
        });
        const walletId = await getOrCreateUserWallet(hostUserId);
        await recordRevenue(
          walletId,
          hostUserId,
          null,
          ticketPrice,
          "paid_live",
          String(spendTx.id)
        );
        const [updated] = await tx.update(streams).set({ currentViewers: sql3`${streams.currentViewers} + 1` }).where(eq5(streams.id, id)).returning();
        currentViewers = updated.currentViewers;
      });
      return res.json({ ok: true, currentViewers });
    } catch (e) {
      if (e?.message === "INSUFFICIENT_TICKETS") {
        const meta = e?.meta ?? {};
        return res.status(402).json({
          error: "Insufficient tickets",
          balance: meta.balance ?? 0,
          required: meta.required ?? ticketPrice
        });
      }
      return res.status(500).json({ error: e?.message ?? "Failed to join paid stream" });
    }
  });
  app2.post("/api/stream/:id/leave", async (req, res) => {
    const id = paramNum(req, "id");
    const [srow] = await db.select().from(streams).where(eq5(streams.id, id));
    if (srow) {
      const next2 = Math.max(0, srow.currentViewers - 1);
      const [updated] = await db.update(streams).set({ currentViewers: next2 }).where(eq5(streams.id, id)).returning();
      return res.json({ viewerCount: updated.currentViewers, currentViewers: updated.currentViewers });
    }
    const [live] = await db.select().from(liveStreams).where(eq5(liveStreams.id, id));
    if (!live) return res.status(404).json({ error: "Not found" });
    const next = Math.max(0, live.viewers - 1);
    await db.update(liveStreams).set({ viewers: next }).where(eq5(liveStreams.id, id));
    return res.json({ viewerCount: next, currentViewers: next });
  });
  app2.post("/api/jukebox/:communityId/add", async (req, res) => {
    const communityId = paramNum(req, "communityId");
    const { videoId, videoTitle, videoThumbnail, videoDurationSecs, addedBy, addedByAvatar, youtubeId } = req.body;
    const authUser = await getAuthUser(req);
    const existing = await db.select().from(jukeboxQueue).where(eq5(jukeboxQueue.communityId, communityId)).orderBy(desc(jukeboxQueue.position));
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
      isPlayed: false
    }).returning();
    const [stateRow] = await db.select().from(jukeboxState).where(eq5(jukeboxState.communityId, communityId));
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
    const updatedQueue = await db.select().from(jukeboxQueue).where(and5(eq5(jukeboxQueue.communityId, communityId), eq5(jukeboxQueue.isPlayed, false))).orderBy(asc3(jukeboxQueue.position));
    await publishJukeboxEvent(communityId, {
      type: "queue_update",
      data: updatedQueue
    });
    if (!hasUnplayed && !isCurrentlyPlaying) {
      const [newState] = await db.select().from(jukeboxState).where(eq5(jukeboxState.communityId, communityId));
      if (newState) {
        await publishJukeboxEvent(communityId, {
          type: "state_update",
          data: newState
        });
      }
    }
    res.json(item);
  });
  app2.post("/api/jukebox/:communityId/next", async (req, res) => {
    const communityId = paramNum(req, "communityId");
    const [stateRaw] = await db.select().from(jukeboxState).where(eq5(jukeboxState.communityId, communityId));
    const queue = await db.select().from(jukeboxQueue).where(and5(eq5(jukeboxQueue.communityId, communityId), eq5(jukeboxQueue.isPlayed, false))).orderBy(asc3(jukeboxQueue.position));
    let currentItemId = null;
    if (stateRaw?.currentVideoId != null || stateRaw?.currentVideoYoutubeId) {
      const currentItem = queue.find(
        (q) => stateRaw.currentVideoYoutubeId && q.youtubeId === stateRaw.currentVideoYoutubeId || stateRaw.currentVideoId != null && q.videoId === stateRaw.currentVideoId
      );
      if (currentItem) {
        currentItemId = currentItem.id;
        await db.update(jukeboxQueue).set({ isPlayed: true }).where(eq5(jukeboxQueue.id, currentItem.id));
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
      }).where(eq5(jukeboxState.communityId, communityId));
    }
    const [latestState] = await db.select().from(jukeboxState).where(eq5(jukeboxState.communityId, communityId));
    if (latestState) {
      await publishJukeboxEvent(communityId, {
        type: "state_update",
        data: latestState
      });
    }
    const latestQueue = await db.select().from(jukeboxQueue).where(and5(eq5(jukeboxQueue.communityId, communityId), eq5(jukeboxQueue.isPlayed, false))).orderBy(asc3(jukeboxQueue.position));
    await publishJukeboxEvent(communityId, {
      type: "queue_update",
      data: latestQueue
    });
    res.json({ ok: true });
  });
  app2.patch("/api/jukebox/:communityId/duration", async (req, res) => {
    const communityId = paramNum(req, "communityId");
    const { durationSecs } = req.body;
    if (!durationSecs || typeof durationSecs !== "number" || durationSecs <= 0) {
      return res.status(400).json({ error: "durationSecs must be a positive number" });
    }
    const [current] = await db.select({ currentVideoDurationSecs: jukeboxState.currentVideoDurationSecs }).from(jukeboxState).where(eq5(jukeboxState.communityId, communityId));
    if (!current) return res.status(404).json({ error: "jukebox state not found" });
    if (current.currentVideoDurationSecs && current.currentVideoDurationSecs > 0) {
      return res.json({ ok: true, updated: false });
    }
    await db.update(jukeboxState).set({ currentVideoDurationSecs: durationSecs }).where(eq5(jukeboxState.communityId, communityId));
    res.json({ ok: true, updated: true });
  });
  app2.post("/api/jukebox/:communityId/chat", async (req, res) => {
    const communityId = paramNum(req, "communityId");
    const { username, avatar, message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: "Please enter a message" });
    const modResult = await moderateContent(message);
    if (modResult.allowed === false) {
      return res.status(400).json({ error: modResult.reason ?? "This content is not allowed" });
    }
    const [msg] = await db.insert(jukeboxChat).values({
      communityId,
      username: username ?? "You",
      avatar,
      message
    }).returning();
    await publishJukeboxEvent(communityId, {
      type: "chat",
      data: msg
    });
    res.json(msg);
  });
  app2.delete("/api/jukebox/:communityId/queue/:itemId", async (req, res) => {
    const communityId = paramNum(req, "communityId");
    const itemId = paramNum(req, "itemId");
    const addedBy = req.query.addedBy || req.body?.addedBy || null;
    const [item] = await db.select().from(jukeboxQueue).where(and5(eq5(jukeboxQueue.communityId, communityId), eq5(jukeboxQueue.id, itemId)));
    if (!item) return res.status(404).json({ error: "Item not found" });
    const [stateRow] = await db.select().from(jukeboxState).where(eq5(jukeboxState.communityId, communityId));
    const isCurrentlyPlaying = stateRow?.isPlaying && (item.youtubeId && item.youtubeId === stateRow.currentVideoYoutubeId || item.videoId != null && item.videoId === stateRow.currentVideoId);
    if (isCurrentlyPlaying) {
      return res.status(400).json({ error: "Cannot remove the currently playing track" });
    }
    if (addedBy && item.addedBy !== addedBy) {
      return res.status(403).json({ error: "You can only remove your own requests" });
    }
    await db.delete(jukeboxQueue).where(eq5(jukeboxQueue.id, itemId));
    res.json({ ok: true });
  });
  app2.get("/api/mentor/session/:id", async (req, res) => {
    const id = paramNum(req, "id");
    if (!id) return res.status(400).json({ error: "invalid_session_id" });
    const [session] = await db.select().from(mentorSessions).where(and5(eq5(mentorSessions.id, id), eq5(mentorSessions.isActive, true)));
    if (!session) return res.status(404).json({ error: "session_not_found" });
    return res.json({
      ...session,
      userId: session.creatorId
    });
  });
  app2.get("/api/availability/:userId", async (req, res) => {
    const userId = paramNum(req, "userId");
    if (!userId) return res.status(400).json({ error: "invalid_user_id" });
    const rows = await db.select().from(liverAvailability).where(eq5(liverAvailability.liverId, userId)).orderBy(asc3(liverAvailability.date), asc3(liverAvailability.startTime));
    return res.json(rows);
  });
  app2.post("/api/mentor/bookings", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { sessionId, slotId, scheduledAt } = req.body;
    const sid = typeof sessionId === "number" && Number.isFinite(sessionId) ? sessionId : parseInt(String(sessionId ?? ""), 10);
    if (!sid) return res.status(400).json({ error: "session_not_found" });
    if (!scheduledAt) return res.status(400).json({ error: "scheduled_at_required" });
    const [sessionRow] = await db.select().from(mentorSessions).where(and5(eq5(mentorSessions.id, sid), eq5(mentorSessions.isActive, true)));
    if (!sessionRow) return res.status(404).json({ error: "session_not_found" });
    const parsedPrice = Number(sessionRow.price);
    if (!Number.isInteger(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ error: "invalid_session_price" });
    }
    let parsedSlotId = null;
    if (slotId !== void 0 && slotId !== null && String(slotId).trim() !== "") {
      parsedSlotId = typeof slotId === "number" && Number.isFinite(slotId) ? slotId : parseInt(String(slotId), 10);
      if (!parsedSlotId || !Number.isFinite(parsedSlotId)) {
        return res.status(400).json({ error: "invalid_slot_id" });
      }
      const [slot] = await db.select().from(liverAvailability).where(and5(eq5(liverAvailability.id, parsedSlotId), eq5(liverAvailability.liverId, sessionRow.creatorId)));
      if (!slot) return res.status(404).json({ error: "slot_not_found" });
      if (slot.bookedSlots >= slot.maxSlots) return res.status(409).json({ error: "slot_full" });
    }
    try {
      let bookingId = 0;
      await db.transaction(async (tx) => {
        const userId = String(user.id);
        const balRows = await tx.select().from(ticketBalances).where(eq5(ticketBalances.userId, userId)).limit(1);
        const currentBalance = balRows[0]?.balance ?? 0;
        if (currentBalance < parsedPrice) {
          const err = new Error("INSUFFICIENT_TICKETS");
          err.meta = { balance: currentBalance, required: parsedPrice };
          throw err;
        }
        if (parsedSlotId != null) {
          const slotRows = await tx.update(liverAvailability).set({ bookedSlots: sql3`${liverAvailability.bookedSlots} + 1` }).where(
            and5(
              eq5(liverAvailability.id, parsedSlotId),
              eq5(liverAvailability.liverId, sessionRow.creatorId),
              sql3`${liverAvailability.bookedSlots} < ${liverAvailability.maxSlots}`
            )
          ).returning({ id: liverAvailability.id });
          if (slotRows.length === 0) {
            throw new Error("SLOT_FULL");
          }
        }
        const newBalance = currentBalance - parsedPrice;
        if (balRows.length === 0) {
          await tx.insert(ticketBalances).values({ userId, balance: newBalance });
        } else {
          await tx.update(ticketBalances).set({ balance: newBalance, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(ticketBalances.userId, userId));
        }
        const [booking] = await tx.insert(mentorBookings).values({
          sessionId: sid,
          userId: `user-${user.id}`,
          userName: user.displayName,
          userAvatar: user.profileImageUrl ?? null,
          scheduledAt: new Date(scheduledAt),
          price: parsedPrice,
          // session.price = ticket count
          status: "paid",
          queuePosition: 0,
          agreedToTerms: true,
          agreedAt: /* @__PURE__ */ new Date(),
          refundable: false
        }).returning({ id: mentorBookings.id });
        bookingId = booking.id;
        const [spendTx] = await tx.insert(ticketTransactions).values({
          userId,
          amount: -parsedPrice,
          type: "spend_session",
          referenceId: String(bookingId),
          description: `Mentor session booking ${sid}`
        }).returning({ id: ticketTransactions.id });
        const walletId = await getOrCreateUserWallet(sessionRow.creatorId, tx);
        const creatorRow = await creatorRowForUserId(tx, sessionRow.creatorId);
        await recordRevenue(
          walletId,
          sessionRow.creatorId,
          creatorRow?.id ?? null,
          parsedPrice,
          "mentor",
          String(spendTx.id),
          tx
        );
      });
      return res.json({ ok: true, bookingId });
    } catch (e) {
      if (e?.message === "INSUFFICIENT_TICKETS") {
        const meta = e?.meta ?? {};
        return res.status(402).json({
          error: "Insufficient tickets",
          balance: meta.balance ?? 0,
          required: meta.required ?? parsedPrice
        });
      }
      if (e?.message === "SLOT_FULL") {
        return res.status(409).json({ error: "slot_full" });
      }
      return res.status(500).json({ error: e.message ?? "booking_create_failed" });
    }
  });
  app2.get("/api/mentor/publishable-key", async (_req, res) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/mentor/:streamId/bookings", async (req, res) => {
    const streamId = paramNum(req, "streamId");
    const rows = await db.select().from(mentorBookings).where(eq5(mentorBookings.streamId, streamId)).orderBy(asc3(mentorBookings.queuePosition));
    res.json(rows);
  });
  app2.get("/api/mentor/:streamId/queue-count", async (req, res) => {
    const streamId = paramNum(req, "streamId");
    const [{ total }] = await db.select({ total: count() }).from(mentorBookings).where(sql3`stream_id = ${streamId} AND status IN ('paid','waiting','notified')`);
    res.json({ count: Number(total) });
  });
  app2.post("/api/mentor/:streamId/checkout", async (req, res) => {
    const streamId = paramNum(req, "streamId");
    const { userName, userAvatar, price = 3e3 } = req.body;
    if (!userName) return res.status(400).json({ error: "userName required" });
    try {
      const stripe = await getUncachableStripeClient();
      const [{ total }] = await db.select({ total: count() }).from(mentorBookings).where(sql3`stream_id = ${streamId} AND status IN ('paid','waiting','notified')`);
      const queuePos = Number(total) + 1;
      const [stream] = await db.select().from(liveStreams).where(eq5(liveStreams.id, streamId));
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
                description: `${streamTitle} | Queue #${queuePos}`
              }
            },
            quantity: 1
          }
        ],
        mode: "payment",
        success_url: `${baseUrl}/mentor-success?session_id={CHECKOUT_SESSION_ID}&stream=${streamId}`,
        cancel_url: `${baseUrl}/live/${streamId}`,
        metadata: {
          streamId: streamId.toString(),
          userName,
          userAvatar: userAvatar ?? "",
          queuePosition: queuePos.toString(),
          price: price.toString()
        }
      });
      const [booking] = await db.insert(mentorBookings).values({
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
  app2.post("/api/mentor/confirm-payment", async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: "sessionId required" });
    try {
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== "paid") {
        return res.status(400).json({ error: "Payment not completed" });
      }
      const [booking] = await db.select().from(mentorBookings).where(eq5(mentorBookings.stripeSessionId, sessionId));
      if (!booking) return res.status(404).json({ error: "Booking not found" });
      if (booking.status === "paid") return res.json({ ok: true, booking });
      const metadata = session.metadata ?? {};
      const slotIdRaw = metadata.slotId;
      const slotId = slotIdRaw && slotIdRaw.trim() ? parseInt(slotIdRaw, 10) : NaN;
      let mentorSessionForBooking = null;
      if (booking.sessionId != null) {
        const [mentorSession] = await db.select().from(mentorSessions).where(eq5(mentorSessions.id, booking.sessionId));
        mentorSessionForBooking = mentorSession ?? null;
      }
      if (booking.sessionId != null && Number.isFinite(slotId) && slotId > 0) {
        const creatorId = mentorSessionForBooking?.creatorId;
        if (!creatorId) return res.status(404).json({ error: "session_not_found" });
        const updatedSlots = await db.update(liverAvailability).set({ bookedSlots: sql3`${liverAvailability.bookedSlots} + 1` }).where(
          and5(
            eq5(liverAvailability.id, slotId),
            eq5(liverAvailability.liverId, creatorId),
            sql3`${liverAvailability.bookedSlots} < ${liverAvailability.maxSlots}`
          )
        ).returning();
        if (updatedSlots.length === 0) {
          return res.status(409).json({ error: "slot_full" });
        }
      }
      await db.update(mentorBookings).set({
        status: "paid",
        stripePaymentIntentId: session.payment_intent
      }).where(eq5(mentorBookings.stripeSessionId, sessionId));
      if (booking.sessionId != null) {
        if (mentorSessionForBooking) {
          const [creatorUser] = await db.select().from(users).where(eq5(users.id, mentorSessionForBooking.creatorId));
          if (creatorUser) {
            const walletId = await getOrCreateUserWallet(creatorUser.id);
            const [creatorRow] = await db.select().from(creators).where(eq5(creators.name, creatorUser.displayName));
            await recordRevenue(walletId, creatorUser.id, creatorRow?.id ?? null, booking.price, "mentor", String(booking.id));
          }
        }
      } else if (booking.streamId != null) {
        const [stream] = await db.select().from(liveStreams).where(eq5(liveStreams.id, booking.streamId));
        if (stream) {
          const [creatorUser] = await db.select().from(users).where(eq5(users.displayName, stream.creator));
          if (creatorUser) {
            const walletId = await getOrCreateUserWallet(creatorUser.id);
            const [creatorRow] = await db.select().from(creators).where(eq5(creators.name, stream.creator));
            await recordRevenue(walletId, creatorUser.id, creatorRow?.id ?? null, booking.price, "mentor", String(booking.id));
          }
        }
      }
      res.json({ ok: true, booking });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/mentor/:bookingId/notify", async (req, res) => {
    const bookingId = paramNum(req, "bookingId");
    await db.update(mentorBookings).set({ status: "notified", notifiedAt: /* @__PURE__ */ new Date() }).where(eq5(mentorBookings.id, bookingId));
    res.json({ ok: true });
  });
  app2.post("/api/mentor/:bookingId/complete", async (req, res) => {
    const bookingId = paramNum(req, "bookingId");
    await db.update(mentorBookings).set({ status: "completed", completedAt: /* @__PURE__ */ new Date() }).where(eq5(mentorBookings.id, bookingId));
    res.json({ ok: true });
  });
  app2.post("/api/mentor/:bookingId/cancel", async (req, res) => {
    const bookingId = paramNum(req, "bookingId");
    const { reason, isSelfCancel } = req.body;
    await db.update(mentorBookings).set({
      status: "cancelled",
      cancelledAt: /* @__PURE__ */ new Date(),
      cancelReason: reason ?? "User cancelled",
      refundable: !isSelfCancel
    }).where(eq5(mentorBookings.id, bookingId));
    res.json({ ok: true });
  });
  app2.get("/api/mentor/my-sessions", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const rows = await db.select().from(mentorSessions).where(eq5(mentorSessions.creatorId, user.id)).orderBy(desc(mentorSessions.createdAt));
    res.json(rows);
  });
  app2.post("/api/mentor/sessions", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { title, category, description, price, duration, maxParticipants } = req.body;
    if (!title || !price) return res.status(400).json({ error: "title and price are required" });
    const [row] = await db.insert(mentorSessions).values({
      creatorId: user.id,
      title,
      category: category ?? "other",
      description: description ?? "",
      price: Number(price),
      duration: duration ?? 30,
      maxParticipants: maxParticipants ?? 1,
      isActive: true
    }).returning();
    res.json(row);
  });
  app2.put("/api/mentor/sessions/:id", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const id = paramNum(req, "id");
    const [existing] = await db.select().from(mentorSessions).where(eq5(mentorSessions.id, id));
    if (!existing || existing.creatorId !== user.id) return res.status(403).json({ error: "Forbidden" });
    const { title, category, description, price, duration, maxParticipants } = req.body;
    const [row] = await db.update(mentorSessions).set({
      title: title ?? existing.title,
      category: category ?? existing.category,
      description: description ?? existing.description,
      price: price !== void 0 ? Number(price) : existing.price,
      duration: duration ?? existing.duration,
      maxParticipants: maxParticipants ?? existing.maxParticipants,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq5(mentorSessions.id, id)).returning();
    res.json(row);
  });
  app2.delete("/api/mentor/sessions/:id", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const id = paramNum(req, "id");
    const [existing] = await db.select().from(mentorSessions).where(eq5(mentorSessions.id, id));
    if (!existing || existing.creatorId !== user.id) return res.status(403).json({ error: "Forbidden" });
    await db.update(mentorSessions).set({ isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(mentorSessions.id, id));
    res.json({ ok: true });
  });
  app2.get("/api/mentor/creator-bookings", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const mySessions = await db.select({ id: mentorSessions.id }).from(mentorSessions).where(eq5(mentorSessions.creatorId, user.id));
    if (mySessions.length === 0) return res.json([]);
    const sessionIds = mySessions.map((s) => s.id);
    const bookingRows = await db.select().from(mentorBookings).where(and5(
      inArray(mentorBookings.sessionId, sessionIds),
      sql3`${mentorBookings.status} NOT IN ('cancelled')`
    )).orderBy(desc(mentorBookings.createdAt));
    const sessionMap = new Map(
      (await db.select().from(mentorSessions).where(inArray(mentorSessions.id, sessionIds))).map((s) => [s.id, s])
    );
    const result = bookingRows.map((b) => ({
      booking: b,
      session: sessionMap.get(b.sessionId) ?? null
    }));
    res.json(result);
  });
  app2.post("/api/mentor/bookings/:bookingId/start", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const bookingId = paramNum(req, "bookingId");
    const [booking] = await db.select().from(mentorBookings).where(eq5(mentorBookings.id, bookingId));
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.whipUrl) {
      return res.json({ whipUrl: booking.whipUrl, whepUrl: booking.whepUrl });
    }
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_STREAM_TOKEN) {
      return res.status(503).json({ error: "Cloudflare Stream not configured" });
    }
    console.log("[Cloudflare Stream] creating mentor live_input with env:", {
      accountId: maskSecretPrefix(CLOUDFLARE_ACCOUNT_ID),
      streamToken: maskSecretPrefix(CLOUDFLARE_STREAM_TOKEN)
    });
    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_STREAM_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ meta: { name: `mentor-booking-${bookingId}` }, recording: { mode: "automatic" } })
      }
    );
    if (!cfRes.ok) {
      let cfErrorBody = null;
      try {
        cfErrorBody = await cfRes.json();
      } catch {
        cfErrorBody = await cfRes.text();
      }
      return res.status(502).json({
        error: "Cloudflare live input creation failed",
        status: cfRes.status,
        cloudflareResponse: cfErrorBody
      });
    }
    const cfData = await cfRes.json();
    const { uid, webRTC, webRTCPlayback } = cfData.result;
    const whipUrl = webRTC.url;
    const whepUrl = webRTCPlayback.url;
    await db.update(mentorBookings).set({ status: "in_progress", whipUrl, whepUrl, cfStreamUid: uid }).where(eq5(mentorBookings.id, bookingId));
    res.json({ whipUrl, whepUrl });
  });
  app2.get("/api/mentor/bookings/:bookingId/join", async (req, res) => {
    const bookingId = paramNum(req, "bookingId");
    const [booking] = await db.select().from(mentorBookings).where(eq5(mentorBookings.id, bookingId));
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (!booking.whepUrl) return res.status(409).json({ error: "Session not started yet" });
    res.json({ whepUrl: booking.whepUrl });
  });
  app2.post("/api/mentor/bookings/:bookingId/end", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const bookingId = paramNum(req, "bookingId");
    const [booking] = await db.select().from(mentorBookings).where(eq5(mentorBookings.id, bookingId));
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.cfStreamUid && CLOUDFLARE_ACCOUNT_ID && CLOUDFLARE_STREAM_TOKEN) {
      await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs/${booking.cfStreamUid}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${CLOUDFLARE_STREAM_TOKEN}` }
        }
      ).catch(() => {
      });
    }
    await db.update(mentorBookings).set({ status: "completed", completedAt: /* @__PURE__ */ new Date() }).where(eq5(mentorBookings.id, bookingId));
    res.json({ ok: true });
  });
  app2.post("/api/revenue/record", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Sign-in required" });
    const { amount, source, referenceId } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "amount must be a positive number" });
    const src = source ?? "tip";
    if (!["tip", "paid_live", "mentor"].includes(src)) {
      return res.status(400).json({ error: "source must be tip, paid_live, or mentor" });
    }
    const walletId = await getOrCreateUserWallet(user.id);
    const [creatorRow] = await db.select().from(creators).where(eq5(creators.name, user.displayName));
    await recordRevenue(walletId, user.id, creatorRow?.id ?? null, amount, src, referenceId ?? null);
    res.status(201).json({ ok: true, amount, source: src });
  });
  app2.get("/api/revenue/summary", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Sign-in required" });
    const userId = `user-${user.id}`;
    const earningRows = await db.select().from(earnings).where(eq5(earnings.userId, userId));
    const withdrawalRows = await db.select().from(withdrawals).where(eq5(withdrawals.userId, userId));
    const totalEarned = earningRows.reduce((s, e) => s + e.netAmount, 0);
    const totalWithdrawn = withdrawalRows.filter((w) => w.status === "completed").reduce((s, w) => s + w.amount, 0);
    const pendingWithdrawal = withdrawalRows.filter((w) => w.status === "pending" || w.status === "processing").reduce((s, w) => s + w.amount, 0);
    const available = totalEarned - totalWithdrawn - pendingWithdrawal;
    const withdrawalFeePolicy = getWithdrawalFeePolicy();
    const now = /* @__PURE__ */ new Date();
    const monthly = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthTotal = earningRows.filter((e) => {
        const ed = new Date(e.createdAt);
        return ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth();
      }).reduce((s, e) => s + e.netAmount, 0);
      monthly.push({ month: label, amount: monthTotal });
    }
    res.json({ totalEarned, totalWithdrawn, pendingWithdrawal, available, monthly, withdrawalFeePolicy });
  });
  app2.get("/api/revenue/earnings", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Sign-in required" });
    const userId = `user-${user.id}`;
    const rows = await db.select().from(earnings).where(eq5(earnings.userId, userId)).orderBy(desc(earnings.createdAt));
    res.json(rows);
  });
  app2.get("/api/revenue/monthly-rank", async (req, res) => {
    const month = req.query.month ?? "";
    const match = /^(\d{4})-(\d{2})$/.exec(month);
    if (!match) {
      return res.status(400).json({ error: "month must be in YYYY-MM format" });
    }
    const kind = queryStr(req, "kind") || "overall";
    if (queryStr(req, "refresh") === "1") {
      await runMonthlyCreatorAggregation(month);
    }
    if (kind === "overall" || kind === "paid_live") {
      const rankings2 = await getCreatorMonthlyRankings(month, kind === "paid_live" ? "paid_live" : "overall");
      return res.json({ month, kind, rankings: rankings2 });
    }
    const rankings = await getMonthlyRevenueRank(month);
    res.json({ month, kind: "revenue", rankings });
  });
  app2.get("/api/revenue/withdrawals", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Sign-in required" });
    const userId = `user-${user.id}`;
    const rows = await db.select().from(withdrawals).where(eq5(withdrawals.userId, userId)).orderBy(desc(withdrawals.requestedAt));
    res.json(rows);
  });
  app2.post("/api/revenue/withdraw", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });
    const userId = `user-${user.id}`;
    const { amount, bankName, bankBranch, accountType, accountNumber, accountName } = req.body;
    const amountUsdCents = Number(amount);
    if (!Number.isInteger(amountUsdCents) || amountUsdCents < 1e3) {
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
    const earningRows = await db.select().from(earnings).where(eq5(earnings.userId, userId));
    const withdrawalRows = await db.select().from(withdrawals).where(eq5(withdrawals.userId, userId));
    const totalEarned = earningRows.reduce((s, e) => s + e.netAmount, 0);
    const totalUsed = withdrawalRows.filter((w) => w.status !== "failed").reduce((s, w) => s + w.amount, 0);
    const available = totalEarned - totalUsed;
    if (amountUsdCents > available) {
      return res.status(400).json({ error: "Requested amount exceeds available balance" });
    }
    const { feeUsdCents, netTransferUsdCents } = computeWithdrawalFeeBreakdown2(amountUsdCents);
    const policy = getWithdrawalFeePolicy();
    if (netTransferUsdCents < policy.minNetTransferUsdCents) {
      return res.status(400).json({
        error: "After payout fees, the transfer would be below the minimum. Increase the withdrawal amount.",
        minNetTransferUsdCents: policy.minNetTransferUsdCents,
        feeUsdCents,
        netTransferUsdCents
      });
    }
    const [row] = await db.insert(withdrawals).values({ userId, amount: amountUsdCents, bankName, bankBranch, accountType, accountNumber, accountName, status: "pending" }).returning();
    try {
      const { transferId } = await createTransferToConnectedAccount({
        amountUsdCents: netTransferUsdCents,
        destinationAccountId: user.stripeConnectId,
        metadata: {
          withdrawalId: String(row.id),
          userId,
          grossUsdCents: String(amountUsdCents),
          feeUsdCents: String(feeUsdCents)
        }
      });
      const feeNote = feeUsdCents > 0 ? `feeUsdCents=${feeUsdCents} netTransferUsdCents=${netTransferUsdCents} ` : "";
      const [completedRow] = await db.update(withdrawals).set({
        status: "completed",
        processedAt: /* @__PURE__ */ new Date(),
        note: `${feeNote}Stripe transfer completed: ${transferId}`
      }).where(eq5(withdrawals.id, row.id)).returning();
      return res.json({
        ...completedRow,
        grossWithdrawUsdCents: amountUsdCents,
        feeUsdCents,
        netTransferUsdCents,
        stripeTransferId: transferId
      });
    } catch (error) {
      await db.update(withdrawals).set({
        status: "failed",
        processedAt: /* @__PURE__ */ new Date(),
        note: `Stripe transfer failed: ${error?.message ?? "unknown_error"}`
      }).where(eq5(withdrawals.id, row.id));
      return res.status(500).json({ error: error?.message ?? "Stripe transfer failed" });
    }
  });
  app2.get("/api/announcements", async (_req, res) => {
    const rows = await db.select().from(announcements).where(
      sql3`(start_at IS NULL OR start_at <= now()) AND (end_at IS NULL OR end_at >= now())`
    ).orderBy(desc(announcements.isPinned), desc(announcements.createdAt));
    res.json(rows);
  });
  app2.get("/api/livers", async (req, res) => {
    const name = queryStr(req, "name");
    const minScore = queryStr(req, "minScore");
    const category = queryStr(req, "category");
    const date = queryStr(req, "date");
    const rankingType = queryStr(req, "rankingType") || "overall";
    const month = queryStr(req, "month") || getYearMonth();
    let rows = await db.select().from(creators).orderBy(asc3(creators.rank));
    if (rankingType === "overall" || rankingType === "paid_live") {
      const scores = await db.select().from(creatorMonthlyScores).where(eq5(creatorMonthlyScores.yearMonth, month));
      const rankMap = /* @__PURE__ */ new Map();
      scores.forEach((s) => {
        rankMap.set(
          s.creatorId,
          rankingType === "paid_live" ? s.rankPaidLive ?? 999 : s.rankOverall ?? 999
        );
      });
      rows = rows.map((r) => ({
        ...r,
        rank: rankMap.get(r.id) ?? r.rank
      })).sort((a, b) => a.rank - b.rank);
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
      const avail = await db.select().from(liverAvailability).where(eq5(liverAvailability.date, date));
      const availIds = new Set(avail.map((a) => a.liverId));
      rows = rows.filter((r) => availIds.has(r.id));
    }
    res.json({ rankingType, month, rows });
  });
  app2.get("/api/livers/:id", async (req, res) => {
    const id = paramNum(req, "id");
    const [liver] = await db.select().from(creators).where(eq5(creators.id, id));
    if (!liver) return res.status(404).json({ error: "Not found" });
    res.json(liver);
  });
  app2.get("/api/livers/me/level-progress", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Sign-in required" });
    const [creator] = await db.select().from(creators).where(eq5(creators.name, user.displayName));
    if (!creator) {
      return res.status(404).json({ error: "Creator registration required" });
    }
    const month = queryStr(req, "month") || getYearMonth();
    await ensureDefaultLevelThresholds();
    const [score] = await db.select().from(creatorMonthlyScores).where(and5(eq5(creatorMonthlyScores.creatorId, creator.id), eq5(creatorMonthlyScores.yearMonth, month)));
    const tipGrossThisMonth = score?.tipGross ?? 0;
    const streamCountThisMonth = score?.streamCountMonthly ?? 0;
    const level = await syncCreatorLevelFromMonthlyProgress(creator.id, month);
    const thresholds = await db.select().from(creatorLevelThresholds).orderBy(asc3(creatorLevelThresholds.level));
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
      remainingStreamCount
    });
  });
  app2.post("/api/livers/me/streams/record", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Sign-in required" });
    const [creator] = await db.select().from(creators).where(eq5(creators.name, user.displayName));
    if (!creator) return res.status(404).json({ error: "Creator registration required" });
    const month = getYearMonth();
    const [score] = await db.select().from(creatorMonthlyScores).where(and5(eq5(creatorMonthlyScores.creatorId, creator.id), eq5(creatorMonthlyScores.yearMonth, month)));
    if (score) {
      await db.update(creatorMonthlyScores).set({
        streamCountMonthly: score.streamCountMonthly + 1,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq5(creatorMonthlyScores.id, score.id));
    } else {
      await db.insert(creatorMonthlyScores).values({
        creatorId: creator.id,
        yearMonth: month,
        streamCountMonthly: 1
      });
    }
    await db.update(creators).set({ streamCount: creator.streamCount + 1 }).where(eq5(creators.id, creator.id));
    const newLevel = await syncCreatorLevelFromMonthlyProgress(creator.id, month);
    res.status(201).json({ ok: true, month, currentLevel: newLevel });
  });
  app2.get("/api/profile/roles", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const rows = await db.select().from(creators).where(eq5(creators.name, user.displayName));
    const isEditor = rows.some((r) => r.category === "editor");
    const isMentor = rows.some((r) => r.category === "mentor");
    res.json({ isEditor, isMentor });
  });
  app2.post("/api/profile/register-role", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const { role } = req.body;
    if (role !== "editor" && role !== "mentor") {
      return res.status(400).json({ error: "role must be editor or mentor" });
    }
    const category = role === "editor" ? "editor" : "mentor";
    const communityLabel = role === "editor" ? "Video editor" : "Mentor session creator";
    const existing = await db.select().from(creators).where(
      and5(
        eq5(creators.name, user.displayName),
        eq5(creators.category, category)
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
    const rows = await db.select().from(liverReviews).where(eq5(liverReviews.liverId, id)).orderBy(desc(liverReviews.createdAt));
    res.json(rows);
  });
  app2.post("/api/livers/:id/reviews", async (req, res) => {
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
      sessionDate: sessionDate ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
    }).returning();
    const allReviews = await db.select().from(liverReviews).where(eq5(liverReviews.liverId, id));
    const avgOverall = allReviews.reduce((s, r) => s + r.overallScore, 0) / allReviews.length;
    const avgSatisfaction = allReviews.reduce((s, r) => s + r.satisfactionScore, 0) / allReviews.length;
    const avgAttendance = allReviews.reduce((s, r) => s + r.attendanceScore, 0) / allReviews.length;
    await db.update(creators).set({
      heatScore: parseFloat(avgOverall.toFixed(1)),
      satisfactionScore: parseFloat(avgSatisfaction.toFixed(1)),
      attendanceRate: parseFloat(avgAttendance.toFixed(1))
    }).where(eq5(creators.id, id));
    res.status(201).json(row);
  });
  app2.get("/api/livers/:id/availability", async (req, res) => {
    const id = paramNum(req, "id");
    const rows = await db.select().from(liverAvailability).where(eq5(liverAvailability.liverId, id)).orderBy(asc3(liverAvailability.date), asc3(liverAvailability.startTime));
    res.json(rows);
  });
  app2.post("/api/livers/:id/availability", async (req, res) => {
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
      note: note ?? ""
    }).returning();
    res.status(201).json(row);
  });
  app2.delete("/api/livers/:id/availability/:slotId", async (req, res) => {
    const slotId = paramNum(req, "slotId");
    await db.delete(liverAvailability).where(eq5(liverAvailability.id, slotId));
    res.json({ ok: true });
  });
  app2.post("/api/seed", (_req, res) => {
    return res.status(410).json({
      error: "Demo seed has been removed. Run `npx tsx scripts/reset-official-communities.ts` after migrations to create official communities."
    });
  });
  app2.post("/api/seed-editors", (_req, res) => {
    return res.status(410).json({ error: "Demo seed-editors has been removed." });
  });
  const FREE_REQUESTS_PER_DAY = 20;
  app2.get("/api/coins/balance", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const userId = String(user.id);
    const rows = await db.select().from(coinBalances).where(eq5(coinBalances.userId, userId)).limit(1);
    const balance = rows[0]?.balance ?? 0;
    return res.json({ balance });
  });
  app2.get("/api/coins/request-count", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const communityId = parseInt(req.query.communityId);
    if (isNaN(communityId)) return res.status(400).json({ error: "communityId required" });
    const userId = String(user.id);
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const rows = await db.select().from(jukeboxRequestCounts).where(and5(
      eq5(jukeboxRequestCounts.userId, userId),
      eq5(jukeboxRequestCounts.communityId, communityId),
      eq5(jukeboxRequestCounts.date, today)
    )).limit(1);
    const count2 = rows[0]?.count ?? 0;
    const freeRemaining = Math.max(0, FREE_REQUESTS_PER_DAY - count2);
    return res.json({ count: count2, freeRemaining, freeLimit: FREE_REQUESTS_PER_DAY });
  });
  app2.post("/api/coins/spend-jukebox", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { communityId, queueItemId } = req.body;
    if (!communityId) return res.status(400).json({ error: "communityId required" });
    const userId = String(user.id);
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const balRows = await db.select().from(coinBalances).where(eq5(coinBalances.userId, userId)).limit(1);
    const currentBalance = balRows[0]?.balance ?? 0;
    if (currentBalance < 1) return res.status(402).json({ error: "Insufficient coins", balance: currentBalance });
    if (balRows.length === 0) {
      await db.insert(coinBalances).values({ userId, balance: -1 });
    } else {
      await db.update(coinBalances).set({ balance: currentBalance - 1, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(coinBalances.userId, userId));
    }
    await db.insert(coinTransactions).values({
      userId,
      amount: -1,
      type: "spend_jukebox",
      referenceId: queueItemId ? String(queueItemId) : null,
      description: `Jukebox request in community ${communityId}`
    });
    const countRows = await db.select().from(jukeboxRequestCounts).where(and5(
      eq5(jukeboxRequestCounts.userId, userId),
      eq5(jukeboxRequestCounts.communityId, communityId),
      eq5(jukeboxRequestCounts.date, today)
    )).limit(1);
    if (countRows.length === 0) {
      await db.insert(jukeboxRequestCounts).values({ userId, communityId, date: today, count: 1 });
    } else {
      await db.update(jukeboxRequestCounts).set({ count: countRows[0].count + 1, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(jukeboxRequestCounts.id, countRows[0].id));
    }
    return res.json({ success: true, newBalance: currentBalance - 1 });
  });
  app2.post("/api/coins/record-free-request", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { communityId } = req.body;
    if (!communityId) return res.status(400).json({ error: "communityId required" });
    const userId = String(user.id);
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const countRows = await db.select().from(jukeboxRequestCounts).where(and5(
      eq5(jukeboxRequestCounts.userId, userId),
      eq5(jukeboxRequestCounts.communityId, communityId),
      eq5(jukeboxRequestCounts.date, today)
    )).limit(1);
    if (countRows.length === 0) {
      await db.insert(jukeboxRequestCounts).values({ userId, communityId, date: today, count: 1 });
    } else {
      await db.update(jukeboxRequestCounts).set({ count: countRows[0].count + 1, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(jukeboxRequestCounts.id, countRows[0].id));
    }
    return res.json({ success: true });
  });
  app2.post("/api/coins/use-revenue", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { communityId, queueItemId } = req.body;
    if (!communityId) return res.status(400).json({ error: "communityId required" });
    const userId = String(user.id);
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const COIN_PRICE_USD = 30;
    const walletRows = await db.select().from(wallets).where(eq5(wallets.userId, user.id)).limit(1);
    const walletBalance = walletRows[0]?.balanceAvailable ?? 0;
    if (walletBalance < COIN_PRICE_USD) {
      return res.status(402).json({ error: "Insufficient revenue balance", balance: walletBalance });
    }
    await db.update(wallets).set({ balanceAvailable: walletBalance - COIN_PRICE_USD, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(wallets.userId, user.id));
    await db.insert(coinTransactions).values({
      userId,
      amount: -1,
      type: "revenue_convert",
      referenceId: queueItemId ? String(queueItemId) : null,
      description: `Revenue balance used for jukebox request in community ${communityId} ($${(COIN_PRICE_USD / 100).toFixed(2)})`
    });
    const countRows = await db.select().from(jukeboxRequestCounts).where(and5(
      eq5(jukeboxRequestCounts.userId, userId),
      eq5(jukeboxRequestCounts.communityId, communityId),
      eq5(jukeboxRequestCounts.date, today)
    )).limit(1);
    if (countRows.length === 0) {
      await db.insert(jukeboxRequestCounts).values({ userId, communityId, date: today, count: 1 });
    } else {
      await db.update(jukeboxRequestCounts).set({ count: countRows[0].count + 1, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(jukeboxRequestCounts.id, countRows[0].id));
    }
    return res.json({ success: true, newWalletBalance: walletBalance - COIN_PRICE_USD });
  });
  app2.post("/api/coins/create-checkout", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { packageId, origin } = req.body;
    const COIN_PACKAGES = {
      "pack-1": { coins: 1, priceUSD: 30, label: "1 Coin" },
      "pack-5": { coins: 5, priceUSD: 150, label: "5 Coins" },
      "pack-10": { coins: 10, priceUSD: 300, label: "10 Coins" },
      "pack-30": { coins: 30, priceUSD: 900, label: "30 Coins" }
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
              description: `${pkg.coins} coin${pkg.coins > 1 ? "s" : ""} for jukebox requests`
            },
            unit_amount: pkg.priceUSD
          },
          quantity: 1
        }],
        mode: "payment",
        success_url: `${origin}/coins/success?session_id={CHECKOUT_SESSION_ID}&coins=${pkg.coins}`,
        cancel_url: `${origin}/coins/cancel`,
        metadata: {
          userId: String(user.id),
          coins: String(pkg.coins),
          packageId
        }
      });
      return res.json({ url: session.url, sessionId: session.id });
    } catch (err) {
      console.error("Stripe checkout error:", err);
      return res.status(500).json({ error: "Failed to create checkout session" });
    }
  });
  app2.post("/api/coins/verify-purchase", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { sessionId } = req.body;
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
      const existing = await db.select().from(coinTransactions).where(and5(
        eq5(coinTransactions.userId, String(user.id)),
        eq5(coinTransactions.referenceId, sessionId)
      )).limit(1);
      if (existing.length > 0) {
        const balRows2 = await db.select().from(coinBalances).where(eq5(coinBalances.userId, String(user.id))).limit(1);
        return res.json({ success: true, alreadyGranted: true, balance: balRows2[0]?.balance ?? 0 });
      }
      const balRows = await db.select().from(coinBalances).where(eq5(coinBalances.userId, String(user.id))).limit(1);
      const currentBalance = balRows[0]?.balance ?? 0;
      if (balRows.length === 0) {
        await db.insert(coinBalances).values({ userId: String(user.id), balance: coins });
      } else {
        await db.update(coinBalances).set({ balance: currentBalance + coins, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(coinBalances.userId, String(user.id)));
      }
      await db.insert(coinTransactions).values({
        userId: String(user.id),
        amount: coins,
        type: "purchase",
        referenceId: sessionId,
        description: `Purchased ${coins} coin${coins > 1 ? "s" : ""} via Stripe`
      });
      return res.json({ success: true, newBalance: currentBalance + coins });
    } catch (err) {
      console.error("Verify purchase error:", err);
      return res.status(500).json({ error: "Failed to verify purchase" });
    }
  });
  const FREE_JUKEBOX_PER_DAY = 20;
  const TICKETS_PER_JUKEBOX = 10;
  const MENTOR_TICKET_PRICE = 500;
  app2.get("/api/tickets/balance", async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const userId = String(user.id);
    const rows = await db.select().from(ticketBalances).where(eq5(ticketBalances.userId, userId)).limit(1);
    return res.json({ balance: rows[0]?.balance ?? 0 });
  });
  app2.get("/api/tickets/request-count", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const communityId = parseInt(req.query.communityId);
    if (isNaN(communityId)) return res.status(400).json({ error: "communityId required" });
    const userId = String(user.id);
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const rows = await db.select().from(jukeboxRequestCounts).where(and5(
      eq5(jukeboxRequestCounts.userId, userId),
      eq5(jukeboxRequestCounts.communityId, communityId),
      eq5(jukeboxRequestCounts.date, today)
    )).limit(1);
    const count2 = rows[0]?.count ?? 0;
    const freeRemaining = Math.max(0, FREE_JUKEBOX_PER_DAY - count2);
    return res.json({ count: count2, freeRemaining, freeLimit: FREE_JUKEBOX_PER_DAY, ticketsPerRequest: TICKETS_PER_JUKEBOX });
  });
  app2.post("/api/tickets/record-free-request", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { communityId } = req.body;
    if (!communityId) return res.status(400).json({ error: "communityId required" });
    const userId = String(user.id);
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const countRows = await db.select().from(jukeboxRequestCounts).where(and5(
      eq5(jukeboxRequestCounts.userId, userId),
      eq5(jukeboxRequestCounts.communityId, communityId),
      eq5(jukeboxRequestCounts.date, today)
    )).limit(1);
    if (countRows.length === 0) {
      await db.insert(jukeboxRequestCounts).values({ userId, communityId, date: today, count: 1 });
    } else {
      await db.update(jukeboxRequestCounts).set({ count: countRows[0].count + 1, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(jukeboxRequestCounts.id, countRows[0].id));
    }
    return res.json({ success: true });
  });
  app2.post("/api/tickets/spend-jukebox", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { communityId, queueItemId } = req.body;
    if (!communityId) return res.status(400).json({ error: "communityId required" });
    const userId = String(user.id);
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    try {
      let newBalance = 0;
      await db.transaction(async (tx) => {
        const [comm] = await tx.select().from(communities).where(eq5(communities.id, communityId)).limit(1);
        const creatorUserId = comm?.ownerId ?? comm?.adminId;
        if (!creatorUserId) {
          throw new Error("COMMUNITY_NO_OWNER");
        }
        const balRows = await tx.select().from(ticketBalances).where(eq5(ticketBalances.userId, userId)).limit(1);
        const currentBalance = balRows[0]?.balance ?? 0;
        if (currentBalance < TICKETS_PER_JUKEBOX) {
          const err = new Error("INSUFFICIENT_TICKETS");
          err.meta = { balance: currentBalance, required: TICKETS_PER_JUKEBOX };
          throw err;
        }
        newBalance = currentBalance - TICKETS_PER_JUKEBOX;
        if (balRows.length === 0) {
          await tx.insert(ticketBalances).values({ userId, balance: newBalance });
        } else {
          await tx.update(ticketBalances).set({ balance: newBalance, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(ticketBalances.userId, userId));
        }
        const [spendTx] = await tx.insert(ticketTransactions).values({
          userId,
          amount: -TICKETS_PER_JUKEBOX,
          type: "spend_jukebox",
          referenceId: queueItemId ? String(queueItemId) : null,
          description: `Jukebox request in community ${communityId}`
        }).returning({ id: ticketTransactions.id });
        const walletId = await getOrCreateUserWallet(creatorUserId, tx);
        const creatorRow = await creatorRowForUserId(tx, creatorUserId);
        await recordRevenue(
          walletId,
          creatorUserId,
          creatorRow?.id ?? null,
          TICKETS_PER_JUKEBOX,
          "paid_live",
          String(spendTx.id),
          tx
        );
        const countRows = await tx.select().from(jukeboxRequestCounts).where(
          and5(
            eq5(jukeboxRequestCounts.userId, userId),
            eq5(jukeboxRequestCounts.communityId, communityId),
            eq5(jukeboxRequestCounts.date, today)
          )
        ).limit(1);
        if (countRows.length === 0) {
          await tx.insert(jukeboxRequestCounts).values({ userId, communityId, date: today, count: 1 });
        } else {
          await tx.update(jukeboxRequestCounts).set({ count: countRows[0].count + 1, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(jukeboxRequestCounts.id, countRows[0].id));
        }
      });
      return res.json({ success: true, newBalance });
    } catch (e) {
      if (e?.message === "INSUFFICIENT_TICKETS") {
        const meta = e?.meta ?? {};
        return res.status(402).json({
          error: "Insufficient tickets",
          balance: meta.balance ?? 0,
          required: meta.required ?? TICKETS_PER_JUKEBOX
        });
      }
      if (e?.message === "COMMUNITY_NO_OWNER") {
        return res.status(400).json({ error: "Community has no owner for revenue" });
      }
      console.error("[tickets/spend-jukebox] failed:", e);
      return res.status(500).json({ error: "Failed to spend tickets" });
    }
  });
  app2.post("/api/tickets/spend", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { amount, type, referenceId, description, creatorId, videoId: rawVideoId } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "amount must be positive" });
    if (!type) return res.status(400).json({ error: "type required" });
    const userId = String(user.id);
    const revenueTypes = /* @__PURE__ */ new Set(["spend_session", "spend_gift", "spend_jukebox", "spend_tip"]);
    const needsRevenueRecord = revenueTypes.has(type);
    let videoIdForGift = null;
    if (rawVideoId !== void 0 && rawVideoId !== null && String(rawVideoId).trim() !== "") {
      const v = typeof rawVideoId === "number" ? rawVideoId : parseInt(String(rawVideoId), 10);
      if (Number.isFinite(v) && v > 0) videoIdForGift = v;
    }
    if (type === "spend_gift" && videoIdForGift == null && referenceId != null && /^\d+$/.test(String(referenceId).trim())) {
      const v = parseInt(String(referenceId).trim(), 10);
      if (Number.isFinite(v) && v > 0) videoIdForGift = v;
    }
    if (needsRevenueRecord && type !== "spend_gift" && (!Number.isInteger(creatorId) || creatorId <= 0)) {
      return res.status(400).json({ error: "creatorId required for revenue-eligible spend type" });
    }
    if (needsRevenueRecord && type === "spend_gift" && videoIdForGift == null && (!Number.isInteger(creatorId) || creatorId <= 0)) {
      return res.status(400).json({ error: "videoId or creatorId required for video purchase (spend_gift)" });
    }
    try {
      let newBalance = 0;
      await db.transaction(async (tx) => {
        let payoutCreatorUserId = null;
        if (needsRevenueRecord) {
          if (type === "spend_gift") {
            if (videoIdForGift != null) {
              const sellerId = await resolveVideoSellerUserId(tx, videoIdForGift);
              if (!sellerId) {
                const err = new Error("VIDEO_SELLER_NOT_FOUND");
                throw err;
              }
              const [vrow] = await tx.select({ price: videos.price, hidden: videos.hidden }).from(videos).where(eq5(videos.id, videoIdForGift)).limit(1);
              if (!vrow || vrow.hidden) {
                throw new Error("VIDEO_NOT_FOUND");
              }
              const expected = vrow.price ?? 0;
              if (expected <= 0) {
                throw new Error("VIDEO_NOT_PAID");
              }
              if (amount !== expected) {
                const err = new Error("VIDEO_PRICE_MISMATCH");
                err.meta = { expected };
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
        const balRows = await tx.select().from(ticketBalances).where(eq5(ticketBalances.userId, userId)).limit(1);
        const currentBalance = balRows[0]?.balance ?? 0;
        if (currentBalance < amount) {
          const err = new Error("INSUFFICIENT_TICKETS");
          err.meta = { balance: currentBalance, required: amount };
          throw err;
        }
        newBalance = currentBalance - amount;
        if (balRows.length === 0) {
          await tx.insert(ticketBalances).values({ userId, balance: newBalance });
        } else {
          await tx.update(ticketBalances).set({ balance: newBalance, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(ticketBalances.userId, userId));
        }
        const [spendTx] = await tx.insert(ticketTransactions).values({
          userId,
          amount: -amount,
          type,
          referenceId: referenceId ?? null,
          description: description ?? null
        }).returning({ id: ticketTransactions.id });
        if (needsRevenueRecord && payoutCreatorUserId != null) {
          const walletId = await getOrCreateUserWallet(payoutCreatorUserId, tx);
          const creatorRow = await creatorRowForUserId(tx, payoutCreatorUserId);
          const source = type === "spend_tip" ? "tip" : "paid_live";
          await recordRevenue(walletId, payoutCreatorUserId, creatorRow?.id ?? null, amount, source, String(spendTx.id), tx);
        }
      });
      return res.json({ success: true, newBalance });
    } catch (e) {
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
  app2.get("/api/tickets/create-checkout", (_req, res) => {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST /api/tickets/create-checkout with JSON body { tickets, origin }" });
  });
  app2.post("/api/tickets/create-checkout", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { tickets, origin } = req.body;
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
              description: `${ticketCount.toLocaleString()} Tickets \u2014 1 Ticket = $0.01`
            },
            unit_amount: ticketCount
          },
          quantity: 1
        }],
        mode: "payment",
        success_url: `${origin}/tickets?session_id={CHECKOUT_SESSION_ID}&tickets=${ticketCount}`,
        cancel_url: `${origin}/tickets`,
        metadata: {
          type: "ticket_purchase",
          userId: String(user.id),
          tickets: String(ticketCount)
        }
      });
      return res.json({ url: session.url, sessionId: session.id });
    } catch (err) {
      console.error("Ticket checkout error:", err);
      return res.status(500).json({ error: "Failed to create checkout session" });
    }
  });
  app2.post("/api/tickets/verify-purchase", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { sessionId } = req.body;
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
  app2.get("/api/tickets/packs", (_req, res) => {
    return res.json(TICKET_PACKS);
  });
  app2.get("/api/platform-banners", async (_req, res) => {
    try {
      const rows = await db.select().from(bannerAds).where(eq5(bannerAds.isActive, true)).orderBy(asc3(bannerAds.displayOrder), desc(bannerAds.createdAt));
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/platform-banners", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    if (user.role !== "ADMIN") return res.status(403).json({ error: "Only admins can perform this action" });
    const { title, imageUrl, linkUrl, description, displayOrder } = req.body;
    if (!title) return res.status(400).json({ error: "title is required" });
    try {
      const [row] = await db.insert(bannerAds).values({
        title,
        imageUrl: imageUrl ?? null,
        linkUrl: linkUrl ?? null,
        description: description ?? null,
        isActive: true,
        displayOrder: displayOrder ?? 0
      }).returning();
      res.json(row);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.patch("/api/platform-banners/:id", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    if (user.role !== "ADMIN") return res.status(403).json({ error: "Only admins can perform this action" });
    const id = paramNum(req, "id");
    const { title, imageUrl, linkUrl, description, isActive, displayOrder } = req.body;
    try {
      const updates = { updatedAt: /* @__PURE__ */ new Date() };
      if (title !== void 0) updates.title = title;
      if (imageUrl !== void 0) updates.imageUrl = imageUrl;
      if (linkUrl !== void 0) updates.linkUrl = linkUrl;
      if (description !== void 0) updates.description = description;
      if (isActive !== void 0) updates.isActive = isActive;
      if (displayOrder !== void 0) updates.displayOrder = displayOrder;
      const [row] = await db.update(bannerAds).set(updates).where(eq5(bannerAds.id, id)).returning();
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(row);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/platform-banners/:id", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    if (user.role !== "ADMIN") return res.status(403).json({ error: "Only admins can perform this action" });
    const id = paramNum(req, "id");
    try {
      await db.delete(bannerAds).where(eq5(bannerAds.id, id));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/daily-login", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    try {
      await db.insert(dailyLogins).values({ userId: user.id, date: today }).onConflictDoNothing();
      const [{ cnt }] = await db.select({ cnt: count() }).from(dailyLogins).where(eq5(dailyLogins.date, today));
      res.json({ date: today, count: Number(cnt) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/daily-login/count", async (_req, res) => {
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    try {
      const [{ cnt }] = await db.select({ cnt: count() }).from(dailyLogins).where(eq5(dailyLogins.date, today));
      res.json({ date: today, count: Number(cnt) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  const AI_EDIT_PLAN_TICKETS = { 15: 200, 30: 400, 45: 600, 60: 800 };
  const AI_EDIT_REVISION_TICKETS = 100;
  const AI_EDIT_RENDERING_STATUS = "rendering";
  function isEditPlan(value) {
    return Boolean(
      value && typeof value === "object" && Array.isArray(value.edl) && typeof value.title === "string"
    );
  }
  function parseStoredEditPlan(json) {
    if (!json?.trim()) return null;
    const stored = parseAIEditStoredResult(json);
    if (stored) return stored.plan;
    try {
      const parsed = JSON.parse(json);
      return isEditPlan(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  function parseJobVideoUrls2(job) {
    if (job.videoUrls) {
      try {
        const parsed = JSON.parse(job.videoUrls);
        if (Array.isArray(parsed)) {
          return parsed.filter((value) => typeof value === "string").map((value) => value.trim()).filter(Boolean);
        }
      } catch {
      }
    }
    return job.videoUrl?.trim() ? [job.videoUrl.trim()] : [];
  }
  function getBaseVideoSpec2(job) {
    const stored = parseAIEditStoredResult(job.result ?? null);
    return stored?.baseSpec ?? parseStoredVideoSpec(job.videoSpec ?? null);
  }
  function getRenderVideoSpec(job) {
    const stored = parseAIEditStoredResult(job.result ?? null);
    return stored?.renderSpec ?? parseStoredVideoSpec(job.videoSpec ?? null);
  }
  async function refundAIEditTickets2(params) {
    const { userId, amount, type, description, referenceId } = params;
    if (!Number.isFinite(amount) || amount <= 0) return;
    const key = String(userId);
    const balRows = await db.select().from(ticketBalances).where(eq5(ticketBalances.userId, key)).limit(1);
    const currentBalance = balRows[0]?.balance ?? 0;
    if (balRows.length === 0) {
      await db.insert(ticketBalances).values({ userId: key, balance: amount });
    } else {
      await db.update(ticketBalances).set({ balance: currentBalance + amount, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(ticketBalances.userId, key));
    }
    await db.insert(ticketTransactions).values({
      userId: key,
      amount,
      type,
      referenceId,
      description
    });
  }
  async function scheduleAIEditPlanGeneration(params) {
    const { jobId, revisionPrompt, refundAmount = 0, refundType, refundDescription } = params;
    if (!useAIEditMemoryQueue()) {
      await processAIEditJobInline({ jobId, revisionPrompt, refundAmount, refundType, refundDescription });
      return;
    }
    void (async () => {
      await db.update(aiEditJobs).set({ status: "processing", updatedAt: /* @__PURE__ */ new Date() }).where(eq5(aiEditJobs.id, jobId));
      enqueueAIEditJob(`ai-edit:${jobId}:${revisionPrompt?.trim() ?? "initial"}`, async () => {
        await runAIEditPlanWorker({ jobId, revisionPrompt, refundAmount, refundType, refundDescription });
      });
    })();
  }
  app2.post("/api/ai-edit/jobs", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { planMinutes, videoUrls, logoUrl, telop, targetAudience, tone, prompt, spec } = req.body;
    let videoSpecJson = null;
    if (spec !== void 0 && spec !== null) {
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
    const balRows = await db.select().from(ticketBalances).where(eq5(ticketBalances.userId, userId)).limit(1);
    const currentBalance = balRows[0]?.balance ?? 0;
    if (currentBalance < ticketCost) {
      return res.status(402).json({ error: "Insufficient tickets", balance: currentBalance, required: ticketCost });
    }
    if (balRows.length === 0) {
      await db.insert(ticketBalances).values({ userId, balance: -ticketCost });
    } else {
      await db.update(ticketBalances).set({ balance: currentBalance - ticketCost, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(ticketBalances.userId, userId));
    }
    await db.insert(ticketTransactions).values({
      userId,
      amount: -ticketCost,
      type: "spend_ai_edit",
      description: `AI Edit: ${planMinutes}min plan`
    });
    const [job] = await db.insert(aiEditJobs).values({
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
      videoSpec: videoSpecJson
    }).returning();
    await scheduleAIEditPlanGeneration({
      jobId: job.id,
      refundAmount: ticketCost,
      refundType: "refund_ai_edit",
      refundDescription: `Refund: AI Edit ${planMinutes}min plan (job ${job.id})`
    });
    const [finalJob] = await db.select({ status: aiEditJobs.status }).from(aiEditJobs).where(eq5(aiEditJobs.id, job.id));
    res.json({ id: job.id, status: finalJob?.status ?? job.status });
  });
  app2.get("/api/ai-edit/jobs/:id", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const id = paramNum(req, "id");
    const [job] = await db.select().from(aiEditJobs).where(eq5(aiEditJobs.id, id));
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.userId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const storedResult = parseAIEditStoredResult(job.result ?? null);
    const result = storedResult?.plan ?? parseStoredEditPlan(job.result ?? null);
    const parsedVideoUrls = parseJobVideoUrls2(job);
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
      updatedAt: job.updatedAt
    });
  });
  function templatedPublicBaseUrl() {
    const u = process.env.TEMPLATED_WEBHOOK_BASE_URL?.trim() || process.env.FRONTEND_URL?.trim() || "https://rawstock.live";
    return u.replace(/\/$/, "");
  }
  app2.post("/api/ai-edit/jobs/:id/render", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const apiKey = (process.env.TEMPLATED_API_KEY ?? "").trim();
    if (!apiKey) {
      return res.status(503).json({ error: "Templated is not configured (TEMPLATED_API_KEY)" });
    }
    const id = paramNum(req, "id");
    const [job] = await db.select().from(aiEditJobs).where(eq5(aiEditJobs.id, id));
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
    const videoUrls = parseJobVideoUrls2(job);
    if (videoUrls.length === 0) {
      return res.status(400).json({ error: "No source video URLs on this job" });
    }
    const webhookUrl = `${templatedPublicBaseUrl()}/api/webhooks/templated`;
    const renderRequest = dslToTemplated(spec, {
      inputVideoUrls: videoUrls,
      logoUrl: job.logoUrl ?? void 0,
      webhookUrl,
      async: true
    });
    const durationMs = typeof spec.duration === "number" && Number.isFinite(spec.duration) && spec.duration > 0 ? Math.min(90, spec.duration) * 1e3 : void 0;
    const renderRes = await createTemplatedRender(renderRequest, {
      apiKey,
      externalId: String(job.id),
      durationMs
    });
    if (!renderRes.id || renderRes.status === "failed") {
      return res.status(502).json({
        error: renderRes.error ?? "Templated render request failed",
        details: renderRes
      });
    }
    const now = /* @__PURE__ */ new Date();
    const syncUrl = renderRes.url?.trim();
    await db.update(aiEditJobs).set({
      status: syncUrl ? "delivered" : AI_EDIT_RENDERING_STATUS,
      templatedRenderId: renderRes.id,
      ...syncUrl ? {
        deliveredUrl: syncUrl,
        deliveredAt: now
      } : {},
      updatedAt: now
    }).where(eq5(aiEditJobs.id, id));
    if (syncUrl) {
      try {
        const [owner] = await db.select().from(users).where(eq5(users.id, job.userId));
        await db.insert(notifications).values({
          type: "ai_edit_delivered",
          title: "Your edited video is ready",
          body: `Your AI Edit job #${job.id}${job.planMinutes ? ` (${job.planMinutes}-min plan)` : ""} has been delivered. Tap to download.`,
          amount: null,
          avatar: owner?.profileImageUrl ?? null,
          thumbnail: null,
          timeAgo: "Just now"
        });
      } catch (notifErr) {
        console.error("[ai-edit/render] notification failed:", notifErr);
      }
    }
    res.json({
      ok: true,
      id: job.id,
      templatedRenderId: renderRes.id,
      status: syncUrl ? "delivered" : renderRes.status,
      url: renderRes.url ?? null
    });
  });
  app2.post("/api/webhooks/templated", async (req, res) => {
    const body = req.body;
    try {
      const statusRaw = typeof body.status === "string" ? body.status.toLowerCase() : "";
      const output = body.output && typeof body.output === "object" && body.output !== null ? body.output : null;
      const url = (output && typeof output.url === "string" ? output.url : null) || (typeof body.url === "string" ? body.url : null);
      const succeeded = statusRaw === "succeeded" || statusRaw === "completed" || statusRaw === "success";
      let jobId = null;
      const ext = body.external_id ?? body.externalId;
      if (ext !== void 0 && ext !== null) {
        const n = parseInt(String(ext), 10);
        if (Number.isFinite(n)) jobId = n;
      }
      if (jobId == null && typeof body.id === "string") {
        const [row] = await db.select().from(aiEditJobs).where(eq5(aiEditJobs.templatedRenderId, body.id));
        if (row) jobId = row.id;
      }
      if (jobId == null) {
        console.warn("[webhooks/templated] Could not resolve job", { bodyKeys: Object.keys(body) });
        return res.status(200).json({ ok: false, reason: "job_not_found" });
      }
      if (!succeeded || !url?.trim()) {
        if (statusRaw === "failed" || statusRaw === "error") {
          await db.update(aiEditJobs).set({ status: "failed", updatedAt: /* @__PURE__ */ new Date() }).where(eq5(aiEditJobs.id, jobId));
        }
        return res.status(200).json({ ok: true, ignored: true });
      }
      const [job] = await db.select().from(aiEditJobs).where(eq5(aiEditJobs.id, jobId));
      if (!job) {
        return res.status(200).json({ ok: false, reason: "job_missing" });
      }
      const now = /* @__PURE__ */ new Date();
      await db.update(aiEditJobs).set({
        status: "delivered",
        deliveredUrl: url.trim(),
        deliveredAt: now,
        updatedAt: now
      }).where(eq5(aiEditJobs.id, jobId));
      try {
        const [owner] = await db.select().from(users).where(eq5(users.id, job.userId));
        await db.insert(notifications).values({
          type: "ai_edit_delivered",
          title: "Your edited video is ready",
          body: `Your AI Edit job #${job.id}${job.planMinutes ? ` (${job.planMinutes}-min plan)` : ""} has been delivered. Tap to download.`,
          amount: null,
          avatar: owner?.profileImageUrl ?? null,
          thumbnail: null,
          timeAgo: "Just now"
        });
      } catch (notifErr) {
        console.error("[webhooks/templated] notification failed:", notifErr);
      }
      return res.status(200).json({ ok: true, id: jobId });
    } catch (e) {
      console.error("[webhooks/templated]", e);
      return res.status(200).json({ ok: false });
    }
  });
  app2.post("/api/ai-edit/jobs/:id/approve", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const id = paramNum(req, "id");
    const [job] = await db.select().from(aiEditJobs).where(eq5(aiEditJobs.id, id));
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.userId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (job.status !== "completed") {
      return res.status(400).json({ error: "Only completed jobs can be approved" });
    }
    await db.update(aiEditJobs).set({ status: "approved", updatedAt: /* @__PURE__ */ new Date() }).where(eq5(aiEditJobs.id, id));
    res.json({ ok: true, id, status: "approved" });
  });
  app2.post("/api/ai-edit/jobs/:id/revise", async (req, res) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const id = paramNum(req, "id");
    const { revisionPrompt } = req.body;
    const [job] = await db.select().from(aiEditJobs).where(eq5(aiEditJobs.id, id));
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.userId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (job.status !== "completed" && job.status !== "approved") {
      return res.status(400).json({ error: "Only completed or approved jobs can be revised" });
    }
    const revisionCount = job.revisionCount ?? 0;
    if (revisionCount >= 1) {
      const userId = String(user.id);
      const balRows = await db.select().from(ticketBalances).where(eq5(ticketBalances.userId, userId)).limit(1);
      const currentBalance = balRows[0]?.balance ?? 0;
      if (currentBalance < AI_EDIT_REVISION_TICKETS) {
        return res.status(402).json({ error: "Insufficient tickets", balance: currentBalance, required: AI_EDIT_REVISION_TICKETS });
      }
      if (balRows.length === 0) {
        await db.insert(ticketBalances).values({ userId, balance: -AI_EDIT_REVISION_TICKETS });
      } else {
        await db.update(ticketBalances).set({ balance: currentBalance - AI_EDIT_REVISION_TICKETS, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(ticketBalances.userId, userId));
      }
      await db.insert(ticketTransactions).values({
        userId,
        amount: -AI_EDIT_REVISION_TICKETS,
        type: "spend_ai_edit_revision",
        referenceId: String(job.id),
        description: `AI Edit Revision #${revisionCount + 1} (job ${job.id})`
      });
    }
    const newRevisionCount = revisionCount + 1;
    await db.update(aiEditJobs).set({
      status: "pending",
      revisionCount: newRevisionCount,
      templatedRenderId: null,
      deliveredUrl: null,
      deliveredAt: null,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq5(aiEditJobs.id, id));
    await scheduleAIEditPlanGeneration({
      jobId: id,
      revisionPrompt,
      refundAmount: revisionCount >= 1 ? AI_EDIT_REVISION_TICKETS : 0,
      refundType: "refund_ai_edit_revision",
      refundDescription: `Refund: AI Edit Revision #${newRevisionCount} (job ${job.id})`
    });
    const [reviseFinal] = await db.select({ status: aiEditJobs.status }).from(aiEditJobs).where(eq5(aiEditJobs.id, id));
    res.json({
      ok: true,
      revisionCount: newRevisionCount,
      free: revisionCount === 0,
      status: reviseFinal?.status
    });
  });
  app2.post("/api/ai-edit/jobs/:id/deliver", async (req, res) => {
    const editor = await getAuthUser(req);
    if (!editor) return res.status(401).json({ error: "Unauthorized" });
    const id = paramNum(req, "id");
    const { deliveredUrl } = req.body;
    if (!deliveredUrl?.trim()) {
      return res.status(400).json({ error: "deliveredUrl is required" });
    }
    const [job] = await db.select().from(aiEditJobs).where(eq5(aiEditJobs.id, id));
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.status === "delivered") {
      return res.status(409).json({ error: "This job has already been delivered" });
    }
    if (!["approved", "completed"].includes(job.status)) {
      return res.status(400).json({ error: "Only approved or completed jobs can be delivered" });
    }
    const now = /* @__PURE__ */ new Date();
    await db.update(aiEditJobs).set({
      status: "delivered",
      deliveredUrl: deliveredUrl.trim(),
      deliveredAt: now,
      updatedAt: now
    }).where(eq5(aiEditJobs.id, id));
    try {
      const [owner] = await db.select().from(users).where(eq5(users.id, job.userId));
      await db.insert(notifications).values({
        type: "ai_edit_delivered",
        title: "Your edited video is ready",
        body: `Your AI Edit job #${job.id}${job.planMinutes ? ` (${job.planMinutes}-min plan)` : ""} has been delivered. Tap to download.`,
        amount: null,
        avatar: owner?.profileImageUrl ?? null,
        thumbnail: null,
        timeAgo: "Just now"
      });
    } catch (notifErr) {
      console.error("[ai-edit/deliver] Failed to send notification:", notifErr);
    }
    res.json({ ok: true, id, status: "delivered", deliveredUrl: deliveredUrl.trim() });
  });
  app2.get("/api/cron/ai-edit-process", async (req, res) => {
    const expected = process.env.CRON_SECRET?.trim() || process.env.AI_EDIT_CRON_SECRET?.trim() || "";
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

// lib/brand.ts
var DEFAULT_RAWSTOCK_LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663449879480/M2pBP9b9EdXaS65j3mPhNW/RawStock_logo_3fd8a263.webp";
var DEFAULT_HERO_VIDEO_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
var DEFAULT_HERO_POSTER_URL = "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1920&q=80";
var RAWSTOCK_LOGO_URL = typeof process !== "undefined" && process.env.PUBLIC_LOGO_URL?.trim() || DEFAULT_RAWSTOCK_LOGO_URL;
var RAWSTOCK_HERO_VIDEO_URL = typeof process !== "undefined" && process.env.PUBLIC_HERO_VIDEO_URL?.trim() || DEFAULT_HERO_VIDEO_URL;
var RAWSTOCK_HERO_POSTER_URL = typeof process !== "undefined" && process.env.PUBLIC_HERO_POSTER_URL?.trim() || DEFAULT_HERO_POSTER_URL;
var RAWSTOCK_LP_STEP_IMG_SHOOT = process.env.PUBLIC_LP_STEP_SHOOT_IMG?.trim() || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80";
var RAWSTOCK_LP_STEP_IMG_EDIT = process.env.PUBLIC_LP_STEP_EDIT_IMG?.trim() || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80";
var RAWSTOCK_LP_STEP_IMG_SELL = process.env.PUBLIC_LP_STEP_SELL_IMG?.trim() || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80";
var RAWSTOCK_LP_STEP_IMG_PROMO = process.env.PUBLIC_LP_STEP_PROMO_IMG?.trim() || "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80";
var RAWSTOCK_LP_FEATURE_IMG_JUKE = process.env.PUBLIC_LP_FEATURE_JUKE_IMG?.trim() || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=960&q=80";
var RAWSTOCK_LP_FEATURE_IMG_AI = process.env.PUBLIC_LP_FEATURE_AI_IMG?.trim() || "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=960&q=80";
var RAWSTOCK_LP_FEATURE_IMG_DISTRICT = process.env.PUBLIC_LP_FEATURE_DISTRICT_IMG?.trim() || "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=960&q=80";
var RAWSTOCK_LP_FEATURE_IMG_LIVE = process.env.PUBLIC_LP_FEATURE_LIVE_IMG?.trim() || "https://images.unsplash.com/photo-1540039155733-5bb30b53aa88?w=960&q=80";
var RAWSTOCK_LP_FEATURE_IMG_GLOBAL = process.env.PUBLIC_LP_FEATURE_GLOBAL_IMG?.trim() || "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=960&q=80";
var RAWSTOCK_LOGO_URL_PLACEHOLDER = "RAWSTOCK_LOGO_URL_PLACEHOLDER";
var RAWSTOCK_HERO_VIDEO_URL_PLACEHOLDER = "RAWSTOCK_HERO_VIDEO_URL_PLACEHOLDER";
var RAWSTOCK_HERO_POSTER_URL_PLACEHOLDER = "RAWSTOCK_HERO_POSTER_URL_PLACEHOLDER";
var LP_CANONICAL_URL_PLACEHOLDER = "LP_CANONICAL_URL_PLACEHOLDER";
var RAWSTOCK_LP_STEP_IMG_SHOOT_PLACEHOLDER = "RAWSTOCK_LP_STEP_IMG_SHOOT_PLACEHOLDER";
var RAWSTOCK_LP_STEP_IMG_EDIT_PLACEHOLDER = "RAWSTOCK_LP_STEP_IMG_EDIT_PLACEHOLDER";
var RAWSTOCK_LP_STEP_IMG_SELL_PLACEHOLDER = "RAWSTOCK_LP_STEP_IMG_SELL_PLACEHOLDER";
var RAWSTOCK_LP_STEP_IMG_PROMO_PLACEHOLDER = "RAWSTOCK_LP_STEP_IMG_PROMO_PLACEHOLDER";
var RAWSTOCK_LP_FEATURE_IMG_JUKE_PLACEHOLDER = "RAWSTOCK_LP_FEATURE_IMG_JUKE_PLACEHOLDER";
var RAWSTOCK_LP_FEATURE_IMG_AI_PLACEHOLDER = "RAWSTOCK_LP_FEATURE_IMG_AI_PLACEHOLDER";
var RAWSTOCK_LP_FEATURE_IMG_DISTRICT_PLACEHOLDER = "RAWSTOCK_LP_FEATURE_IMG_DISTRICT_PLACEHOLDER";
var RAWSTOCK_LP_FEATURE_IMG_LIVE_PLACEHOLDER = "RAWSTOCK_LP_FEATURE_IMG_LIVE_PLACEHOLDER";
var RAWSTOCK_LP_FEATURE_IMG_GLOBAL_PLACEHOLDER = "RAWSTOCK_LP_FEATURE_IMG_GLOBAL_PLACEHOLDER";

// server/index.ts
var app = express2();
var log2 = console.log;
function injectLpMarketingHtml(html, canonicalUrl) {
  let out = html.split(RAWSTOCK_LOGO_URL_PLACEHOLDER).join(RAWSTOCK_LOGO_URL).split(RAWSTOCK_HERO_VIDEO_URL_PLACEHOLDER).join(RAWSTOCK_HERO_VIDEO_URL).split(RAWSTOCK_HERO_POSTER_URL_PLACEHOLDER).join(RAWSTOCK_HERO_POSTER_URL).split(LP_CANONICAL_URL_PLACEHOLDER).join(canonicalUrl).split(RAWSTOCK_LP_STEP_IMG_SHOOT_PLACEHOLDER).join(RAWSTOCK_LP_STEP_IMG_SHOOT).split(RAWSTOCK_LP_STEP_IMG_EDIT_PLACEHOLDER).join(RAWSTOCK_LP_STEP_IMG_EDIT).split(RAWSTOCK_LP_STEP_IMG_SELL_PLACEHOLDER).join(RAWSTOCK_LP_STEP_IMG_SELL).split(RAWSTOCK_LP_STEP_IMG_PROMO_PLACEHOLDER).join(RAWSTOCK_LP_STEP_IMG_PROMO).split(RAWSTOCK_LP_FEATURE_IMG_JUKE_PLACEHOLDER).join(RAWSTOCK_LP_FEATURE_IMG_JUKE).split(RAWSTOCK_LP_FEATURE_IMG_AI_PLACEHOLDER).join(RAWSTOCK_LP_FEATURE_IMG_AI).split(RAWSTOCK_LP_FEATURE_IMG_DISTRICT_PLACEHOLDER).join(RAWSTOCK_LP_FEATURE_IMG_DISTRICT).split(RAWSTOCK_LP_FEATURE_IMG_LIVE_PLACEHOLDER).join(RAWSTOCK_LP_FEATURE_IMG_LIVE).split(RAWSTOCK_LP_FEATURE_IMG_GLOBAL_PLACEHOLDER).join(RAWSTOCK_LP_FEATURE_IMG_GLOBAL);
  const weglotKey = process.env.WEGLOT_API_KEY?.trim();
  if (weglotKey) {
    out = out.replace(
      "<!--WEGLOT_INJECT-->",
      `<script type="text/javascript" src="https://cdn.weglot.com/weglot.min.js"></script><script>Weglot.initialize({ api_key: ${JSON.stringify(weglotKey)} });</script>`
    );
  } else {
    out = out.replace("<!--WEGLOT_INJECT-->", "");
  }
  return out;
}
function canonicalPageUrlFromReq(req, pathname) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host") || "localhost";
  const path2 = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${protocol}://${host}${path2}`;
}
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
  app2.get("/lp", (req, res) => {
    const raw = fs.readFileSync(
      path.resolve(process.cwd(), "server/templates/landing-page.html"),
      "utf-8"
    );
    const html = injectLpMarketingHtml(
      raw,
      canonicalPageUrlFromReq(req, "/lp")
    );
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  });
  const lpStandalonePath = path.resolve(
    process.cwd(),
    "public/lp-standalone.html"
  );
  app2.get("/lp-standalone.html", (req, res) => {
    if (!fs.existsSync(lpStandalonePath)) {
      return res.status(404).send("lp-standalone.html not found");
    }
    const raw = fs.readFileSync(lpStandalonePath, "utf-8");
    const html = injectLpMarketingHtml(
      raw,
      canonicalPageUrlFromReq(req, "/lp-standalone.html")
    );
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  });
  const teamzPath = path.resolve(process.cwd(), "public/teamz.html");
  app2.get("/teamz", (req, res) => {
    if (!fs.existsSync(teamzPath)) {
      return res.status(404).send("teamz.html not found");
    }
    const raw = fs.readFileSync(teamzPath, "utf-8");
    const html = injectLpMarketingHtml(
      raw,
      canonicalPageUrlFromReq(req, "/teamz")
    );
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  });
  app2.get("/assets/logo-200x70-v2.png", (_req, res) => {
    const logoPath = path.resolve(process.cwd(), "assets/logo-200x70-v2.png");
    res.sendFile(logoPath);
  });
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path === "/lp" || req.path === "/teamz" || req.path === "/lp-standalone.html") {
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
    const expoDevPort = parseInt(process.env.EXPO_PORT || "8081", 10);
    log2(`Dev mode: proxying web requests to Expo dev server on port ${expoDevPort}`);
    const expoProxy = createProxyMiddleware({
      // Metro は 127.0.0.1 のみ LISTEN することが多く、::1 へプロキシすると 502 になる
      target: `http://127.0.0.1:${expoDevPort}`,
      changeOrigin: true,
      ws: true,
      on: {
        proxyReq: (proxyReq) => {
          proxyReq.removeHeader("origin");
          proxyReq.removeHeader("referer");
        },
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
  const port = parseInt(process.env.PORT || "5001", 10);
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
