import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  real,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

/** ユーザー権限（ライバーランク・分配ロジック等で使用） */
export const USER_ROLES = ["USER", "LIVER", "EDITOR", "MODERATOR", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const communities = pgTable("communities", {
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
  /** 広告収益分配設定（JSON: { userId: 比率% }。管理人+モデレーター間の70%分配内訳） */
  revenueDistribution: text("revenue_distribution"),
});

/** コミュニティのモデレーター（複数可）。広告収益10%の分配対象 */
export const communityModerators = pgTable("community_moderators", {
  id: serial("id").primaryKey(),
  communityId: integer("community_id").notNull(),
  userId: integer("user_id").notNull(),
});

/** コミュニティに参加しているメンバー（管理人・モデレーター選択の候補） */
export const communityMembers = pgTable("community_members", {
  id: serial("id").primaryKey(),
  communityId: integer("community_id").notNull(),
  userId: integer("user_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
});

/** コミュニティ掲示板スレッド */
export const communityThreads = pgTable("community_threads", {
  id: serial("id").primaryKey(),
  communityId: integer("community_id").notNull(),
  authorUserId: integer("author_user_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow(),
  pinned: boolean("pinned").notNull().default(false),
});

/** スレッドへの返信 */
export const communityThreadPosts = pgTable("community_thread_posts", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull(),
  authorUserId: integer("author_user_id").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/** コミュニティアンケート */
export const communityPolls = pgTable("community_polls", {
  id: serial("id").primaryKey(),
  communityId: integer("community_id").notNull(),
  authorUserId: integer("author_user_id").notNull(),
  question: text("question").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  endAt: timestamp("end_at"),
});

/** アンケートの選択肢 */
export const communityPollOptions = pgTable("community_poll_options", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").notNull(),
  text: text("text").notNull(),
  order: integer("order").notNull().default(0),
});

/** アンケートの投票 */
export const communityPollVotes = pgTable("community_poll_votes", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").notNull(),
  optionId: integer("option_id").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/** 不信任投票等のコミュニティ投票 */
export const communityVotes = pgTable("community_votes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  communityId: integer("community_id").notNull(),
  type: text("type").notNull(), // 'no_confidence' 等
  createdAt: timestamp("created_at").defaultNow(),
});

/** コミュニティ広告申し込み（審査フロー: モデレーター仮承認 → 管理人最終承認） */
export const communityAds = pgTable("community_ads", {
  id: serial("id").primaryKey(),
  communityId: integer("community_id").notNull(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  bannerUrl: text("banner_url").notNull(),
  linkUrl: text("link_url"), // クリック先URL
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  endDate: text("end_date").notNull(),
  dailyRate: integer("daily_rate").notNull(),
  totalAmount: integer("total_amount").notNull(),
  /** 予約時点のメンバー数（料金固定のため記録） */
  memberCountAtBooking: integer("member_count_at_booking").notNull().default(0),
  /** 料金規約への同意 */
  agreedToTerms: boolean("agreed_to_terms").notNull().default(false),
  status: text("status").notNull().default("pending"), // pending | moderator_approved | approved | rejected
  approvedByModerator: integer("approved_by_moderator"),
  approvedByOwner: integer("approved_by_owner"),
  createdAt: timestamp("created_at").defaultNow(),
});

/** ジャンルページ広告申し込み（ジャンル単位のバナー枠） */
export const genreAds = pgTable("genre_ads", {
  id: serial("id").primaryKey(),
  genreId: text("genre_id").notNull(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  bannerUrl: text("banner_url").notNull(),
  linkUrl: text("link_url"), // クリック先URL
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  endDate: text("end_date").notNull(),
  dailyRate: integer("daily_rate").notNull(),
  totalAmount: integer("total_amount").notNull(),
  /** 予約時点のジャンル内総メンバー数（料金固定のため記録） */
  memberCountAtBooking: integer("member_count_at_booking").notNull().default(0),
  /** 料金規約への同意 */
  agreedToTerms: boolean("agreed_to_terms").notNull().default(false),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  createdAt: timestamp("created_at").defaultNow(),
});

/** ジャンル管理人（毎月1日に最大メンバー数コミュニティの管理人を自動アサイン） */
export const genreOwners = pgTable("genre_owners", {
  id: serial("id").primaryKey(),
  genreId: text("genre_id").notNull().unique(),
  ownerUserId: integer("owner_user_id").notNull(), // users.id
  /** 就任の基準となったコミュニティID（最大メンバー数） */
  assignedCommunityId: integer("assigned_community_id"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/** 公演情報（アーティスト主催のライブ・イベント） */
export const concerts = pgTable("concerts", {
  id: serial("id").primaryKey(),
  artistUserId: integer("artist_user_id").notNull(), // users.id
  title: text("title").notNull(),
  venueName: text("venue_name").notNull(),
  venueAddress: text("venue_address").notNull(),
  concertDate: text("concert_date").notNull(), // ISO文字列 or YYYY-MM-DD HH:mm
  ticketUrl: text("ticket_url"),
  shootingAllowed: boolean("shooting_allowed").notNull().default(false),
  shootingNotes: text("shooting_notes"),
  artistShare: integer("artist_share").notNull().default(0),
  photographerShare: integer("photographer_share").notNull().default(0),
  editorShare: integer("editor_share").notNull().default(0),
  venueShare: integer("venue_share").notNull().default(0),
  status: text("status").notNull().default("draft"), // draft | published
  createdAt: timestamp("created_at").defaultNow(),
});

/** 公演の公認スタッフ（撮影者・編集者など） */
export const concertStaff = pgTable("concert_staff", {
  id: serial("id").primaryKey(),
  concertId: integer("concert_id").notNull(),
  artistUserId: integer("artist_user_id").notNull(), // concerts.artist_user_id
  staffUserId: integer("staff_user_id").notNull(), // users.id
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  createdAt: timestamp("created_at").defaultNow(),
});

/** 投稿の公開範囲 */
export const VIDEO_VISIBILITY = ["draft", "my_page_only", "community"] as const;
export type VideoVisibility = (typeof VIDEO_VISIBILITY)[number];

export const videos = pgTable("videos", {
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
  postType: text("post_type").notNull().default("daily"),
});

/** マイリスト（気に入った動画の保存） */
export const savedVideos = pgTable(
  "saved_videos",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    videoId: integer("video_id").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [unique().on(t.userId, t.videoId)]
);

/** 投稿動画へのコメント */
export const videoComments = pgTable("video_comments", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull(),
  userId: integer("user_id").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  /** 通報で明らかな違反と判定された場合に非表示 */
  hidden: boolean("hidden").notNull().default(false),
});

/** 通報（Claude API判定: clear_violation=自動非表示, gray_zone=管理者確認待ち） */
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").notNull(),
  contentType: text("content_type").notNull(), // 'video' | 'comment'
  contentId: integer("content_id").notNull(),
  reason: text("reason").notNull(), // ユーザー選択: spam, harassment, inappropriate, other
  aiVerdict: text("ai_verdict").notNull(), // 'clear_violation' | 'gray_zone' | 'no_violation'
  aiReason: text("ai_reason"),
  status: text("status").notNull().default("pending"), // 'pending' | 'hidden' | 'reviewed'
  createdAt: timestamp("created_at").defaultNow(),
});

export const liveStreams = pgTable("live_streams", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  creator: text("creator").notNull(),
  community: text("community").notNull(),
  viewers: integer("viewers").notNull().default(0),
  thumbnail: text("thumbnail").notNull(),
  avatar: text("avatar").notNull(),
  timeAgo: text("time_ago").notNull(),
  isLive: boolean("is_live").notNull().default(true),
});

/** Cloudflare Stream の Live Input を管理するテーブル */
export const streams = pgTable("streams", {
  id: serial("id").primaryKey(),
  cfLiveInputId: text("cf_live_input_id").notNull(),
  webRtcUrl: text("webrtc_url").notNull(),
  rtmpsUrl: text("rtmps_url").notNull(),
  rtmpsStreamKey: text("rtmps_stream_key").notNull(),
  currentViewers: integer("current_viewers").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const creators = pgTable("creators", {
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
  category: text("category").notNull().default("idol"),
});

export const creatorLevelThresholds = pgTable("creator_level_thresholds", {
  id: serial("id").primaryKey(),
  level: integer("level").notNull().unique(),
  requiredTipGross: integer("required_tip_gross").notNull().default(0),
  requiredStreamCount: integer("required_stream_count").notNull().default(0),
  tipBackRate: real("tip_back_rate").notNull().default(0.5),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const creatorMonthlyScores = pgTable(
  "creator_monthly_scores",
  {
    id: serial("id").primaryKey(),
    creatorId: integer("creator_id").notNull(),
    yearMonth: text("year_month").notNull(), // YYYY-MM
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
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [unique().on(t.creatorId, t.yearMonth)],
);

export const bookingSessions = pgTable("booking_sessions", {
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
  rating: real("rating").notNull().default(5.0),
  reviewCount: integer("review_count").notNull().default(0),
  tag: text("tag"),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  amount: integer("amount"),
  avatar: text("avatar"),
  thumbnail: text("thumbnail"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  timeAgo: text("time_ago").notNull(),
});

export const liveStreamChat = pgTable("live_stream_chat", {
  id: serial("id").primaryKey(),
  streamId: integer("stream_id").notNull(),
  username: text("username").notNull(),
  avatar: text("avatar"),
  message: text("message").notNull(),
  isGift: boolean("is_gift").default(false),
  giftAmount: integer("gift_amount"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dmConversationMessages = pgTable("dm_conversation_messages", {
  id: serial("id").primaryKey(),
  dmId: integer("dm_id").notNull(),
  sender: text("sender").notNull(),
  text: text("text").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const jukeboxState = pgTable("jukebox_state", {
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
  watchersCount: integer("watchers_count").default(1),
});

export const jukeboxQueue = pgTable("jukebox_queue", {
  id: serial("id").primaryKey(),
  communityId: integer("community_id").notNull(),
  videoId: integer("video_id"),
  videoTitle: text("video_title").notNull(),
  videoThumbnail: text("video_thumbnail").notNull(),
  videoDurationSecs: integer("video_duration_secs").default(0),
  youtubeId: text("youtube_id"),
  addedBy: text("added_by").notNull().default("あなた"),
  addedByAvatar: text("added_by_avatar"),
  position: integer("position").notNull().default(0),
  isPlayed: boolean("is_played").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const jukeboxChat = pgTable("jukebox_chat", {
  id: serial("id").primaryKey(),
  communityId: integer("community_id").notNull(),
  username: text("username").notNull(),
  avatar: text("avatar"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dmMessages = pgTable("dm_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  avatar: text("avatar").notNull(),
  lastMessage: text("last_message").notNull(),
  time: text("time").notNull(),
  unread: integer("unread").notNull().default(0),
  online: boolean("online").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** 認証はLINEログインのみ。email/password は廃止。 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  /** LINEアカウントID（必須・一意） */
  lineId: text("line_id").notNull().unique(),
  displayName: text("display_name").notNull().default("User"),
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
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/** 電話番号認証コード（SMS）の検証用テーブル */
export const phoneVerifications = pgTable("phone_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  phoneNumber: text("phone_number").notNull(),
  /** ハッシュ化された6桁コード */
  codeHash: text("code_hash").notNull(),
  /** 有効期限 */
  expiresAt: timestamp("expires_at").notNull(),
  consumed: boolean("consumed").notNull().default(false),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

/** 分配・出金用ウォレット（ライバーランク月末確定・バナー広告15,000円等の計算基盤） */
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"), // システムウォレットは null
  /** ユーザーウォレットは null。システム用: 'MODERATOR' | 'ADMIN' | 'EVENT_RESERVE' | 'PLATFORM' */
  kind: text("kind"),
  balanceAvailable: integer("balance_available").notNull().default(0),
  balancePending: integer("balance_pending").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/** 取引ステータス（分配は PENDING → 確定後に SETTLED） */
export const TRANSACTION_STATUSES = ["PENDING", "SETTLED", "CANCELLED"] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

/** 入出金・分配の取引履歴（月末確定・バナー広告ロジック用） */
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").notNull(),
  amount: integer("amount").notNull(),
  source: text("source").notNull().default("tip"), // tip | paid_live | twoshot
  grossAmount: integer("gross_amount").notNull().default(0),
  backRate: real("back_rate").notNull().default(1),
  netAmount: integer("net_amount").notNull().default(0),
  creatorId: integer("creator_id"),
  yearMonth: text("year_month"), // YYYY-MM
  type: text("type").notNull(), // 'tip' | 'gift' | 'twoshot' | 'banner_ad' | 'payout' | 'revenue_share' | 'REVENUE' 等
  status: text("status").notNull().default("PENDING"), // PENDING | SETTLED | CANCELLED
  referenceId: text("reference_id"),
  settledAt: timestamp("settled_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

/** 動画編集者（編集者一覧・依頼用） */
export const videoEditors = pgTable("video_editors", {
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
  isAvailable: boolean("is_available").notNull().default(true),
});

/** 動画編集依頼 */
export const videoEditRequests = pgTable("video_edit_requests", {
  id: serial("id").primaryKey(),
  editorId: integer("editor_id").notNull(),
  requesterId: text("requester_id").notNull(),
  requesterName: text("requester_name").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  priceType: text("price_type").notNull(),
  budget: integer("budget"),
  deadline: text("deadline"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const earnings = pgTable("earnings", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default("guest-001"),
  type: text("type").notNull(),
  title: text("title").notNull(),
  amount: integer("amount").notNull(),
  revenueShare: integer("revenue_share").notNull().default(80),
  netAmount: integer("net_amount").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const withdrawals = pgTable("withdrawals", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default("guest-001"),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"),
  bankName: text("bank_name").notNull(),
  bankBranch: text("bank_branch").notNull(),
  accountType: text("account_type").notNull().default("普通"),
  accountNumber: text("account_number").notNull(),
  accountName: text("account_name").notNull(),
  note: text("note"),
  requestedAt: timestamp("requested_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const twoshotBookings = pgTable("twoshot_bookings", {
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
  createdAt: timestamp("created_at").defaultNow(),
});

export const liverReviews = pgTable("liver_reviews", {
  id: serial("id").primaryKey(),
  liverId: integer("liver_id").notNull(),
  userId: text("user_id").notNull().default("guest"),
  userName: text("user_name").notNull(),
  userAvatar: text("user_avatar"),
  satisfactionScore: integer("satisfaction_score").notNull().default(5),
  streamCountScore: integer("stream_count_score").notNull().default(5),
  attendanceScore: integer("attendance_score").notNull().default(5),
  overallScore: real("overall_score").notNull().default(5.0),
  comment: text("comment").notNull().default(""),
  sessionDate: text("session_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const liverAvailability = pgTable("liver_availability", {
  id: serial("id").primaryKey(),
  liverId: integer("liver_id").notNull(),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  maxSlots: integer("max_slots").notNull().default(3),
  bookedSlots: integer("booked_slots").notNull().default(0),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  type: text("type").notNull(),
  isPinned: boolean("is_pinned").notNull().default(false),
  startAt: timestamp("start_at"),
  endAt: timestamp("end_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Ticket System ────────────────────────────────────────────────────────────

/**
 * Ticket packs available for purchase.
 * 1 Ticket = $0.01 USD. Packs: 100T=$1, 500T=$5, 1200T=$12, 3000T=$30.
 */
export const TICKET_PACKS = [
  { id: "pack-100",  tickets: 100,  priceUSD: 100,  label: "100 Tickets",  bonus: null },
  { id: "pack-500",  tickets: 500,  priceUSD: 500,  label: "500 Tickets",  bonus: null },
  { id: "pack-1200", tickets: 1200, priceUSD: 1200, label: "1,200 Tickets", bonus: null },
  { id: "pack-3000", tickets: 3000, priceUSD: 3000, label: "3,000 Tickets", bonus: null },
] as const;

/**
 * Ticket balances per user. 1 Ticket = $0.01 USD.
 */
export const ticketBalances = pgTable("ticket_balances", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  balance: integer("balance").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Audit log of all ticket movements.
 * type: purchase | spend_jukebox | spend_session | spend_gift | revenue_convert | refund
 */
export const ticketTransactions = pgTable("ticket_transactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  /** Positive = credit, negative = debit */
  amount: integer("amount").notNull(),
  type: text("type").notNull(),
  /** Stripe session ID for purchases, queue/booking ID for spending */
  referenceId: text("reference_id"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Coin System (legacy — kept for backward compatibility) ───────────────────

/**
 * Coin balances per user.
 * 1 coin = $0.30 USD (30 cents).
 */
export const coinBalances = pgTable("coin_balances", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  balance: integer("balance").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Audit log of all coin movements.
 * type: purchase | spend_jukebox | revenue_convert | refund
 */
export const coinTransactions = pgTable("coin_transactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  /** Positive = credit, negative = debit */
  amount: integer("amount").notNull(),
  type: text("type").notNull(), // purchase | spend_jukebox | revenue_convert | refund
  /** Stripe Payment Intent ID for purchases, jukebox queue item ID for spending */
  referenceId: text("reference_id"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Tracks daily jukebox request counts per user per community.
 * First 3 per day are free; 4th+ costs 1 coin ($0.30).
 */
export const jukeboxRequestCounts = pgTable("jukebox_request_counts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  communityId: integer("community_id").notNull(),
  /** Date in YYYY-MM-DD format (UTC) */
  date: text("date").notNull(),
  count: integer("count").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Banner advertisements managed by operators.
 * Displayed on the top page. Revenue goes 100% to the platform.
 */
export const bannerAds = pgTable("banner_ads", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Tracks daily unique logins per user.
 * Used to display "today's active user count" on the top page.
 */
export const dailyLogins = pgTable("daily_logins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD (UTC)
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── AI Edit Jobs ────────────────────────────────────────────────────────────

/**
 * AI Edit Assistant jobs.
 * Claude generates an Edit Decision List (EDL) from a video URL and prompt.
 * status: pending | processing | completed | failed | approved
 */
export const aiEditJobs = pgTable("ai_edit_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  videoUrl: text("video_url").notNull().default(""),
  prompt: text("prompt").notNull(),
  status: text("status").notNull().default("pending"), // pending | processing | completed | failed | approved
  result: text("result"), // JSON string of EDL
  // Enhanced AI Edit fields (v2)
  planMinutes: integer("plan_minutes"),      // 15 | 30 | 45 | 60
  videoUrls: text("video_urls"),             // JSON array of R2 URLs
  logoUrl: text("logo_url"),
  telop: text("telop"),
  targetAudience: text("target_audience"),
  tone: text("tone"),
  revisionCount: integer("revision_count").notNull().default(0),
  ticketCost: integer("ticket_cost"),
  // Delivery fields — set by the editor when the finished video is uploaded
  deliveredUrl: text("delivered_url"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Editing Requests ─────────────────────────────────────────────────────────

/**
 * Creator video editing requests.
 * Service fee is deducted from ticketBalances. Creator earns 90% of revenue.
 * status: pending | in_progress | delivered | cancelled
 */
export const editingRequests = pgTable("editing_requests", {
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
  updatedAt: timestamp("updated_at").defaultNow(),
});
