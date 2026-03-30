CREATE TABLE "announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"type" text NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"start_at" timestamp,
	"end_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "booking_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"creator" text NOT NULL,
	"category" text NOT NULL,
	"category_label" text NOT NULL,
	"title" text NOT NULL,
	"avatar" text NOT NULL,
	"thumbnail" text NOT NULL,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"duration" text NOT NULL,
	"price" integer NOT NULL,
	"spots_total" integer NOT NULL,
	"spots_left" integer NOT NULL,
	"rating" real DEFAULT 5 NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"tag" text
);
--> statement-breakpoint
CREATE TABLE "communities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"members" integer DEFAULT 0 NOT NULL,
	"thumbnail" text NOT NULL,
	"online" boolean DEFAULT false NOT NULL,
	"category" text NOT NULL,
	"admin_id" integer,
	"owner_id" integer
);
--> statement-breakpoint
CREATE TABLE "community_ads" (
	"id" serial PRIMARY KEY NOT NULL,
	"community_id" integer NOT NULL,
	"company_name" text NOT NULL,
	"contact_name" text NOT NULL,
	"email" text NOT NULL,
	"banner_url" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"daily_rate" integer NOT NULL,
	"total_amount" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_by_moderator" integer,
	"approved_by_owner" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "community_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"community_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "community_moderators" (
	"id" serial PRIMARY KEY NOT NULL,
	"community_id" integer NOT NULL,
	"user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_poll_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"poll_id" integer NOT NULL,
	"text" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_poll_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"poll_id" integer NOT NULL,
	"option_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "community_polls" (
	"id" serial PRIMARY KEY NOT NULL,
	"community_id" integer NOT NULL,
	"author_user_id" integer NOT NULL,
	"question" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"end_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "community_thread_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" integer NOT NULL,
	"author_user_id" integer NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "community_threads" (
	"id" serial PRIMARY KEY NOT NULL,
	"community_id" integer NOT NULL,
	"author_user_id" integer NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"pinned" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"community_id" integer NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "concert_staff" (
	"id" serial PRIMARY KEY NOT NULL,
	"concert_id" integer NOT NULL,
	"artist_user_id" integer NOT NULL,
	"staff_user_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "concerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"artist_user_id" integer NOT NULL,
	"title" text NOT NULL,
	"venue_name" text NOT NULL,
	"venue_address" text NOT NULL,
	"concert_date" text NOT NULL,
	"ticket_url" text,
	"shooting_allowed" boolean DEFAULT false NOT NULL,
	"shooting_notes" text,
	"artist_share" integer DEFAULT 0 NOT NULL,
	"photographer_share" integer DEFAULT 0 NOT NULL,
	"editor_share" integer DEFAULT 0 NOT NULL,
	"venue_share" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "creators" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"community" text NOT NULL,
	"avatar" text NOT NULL,
	"rank" integer NOT NULL,
	"heat_score" real DEFAULT 0 NOT NULL,
	"total_views" integer DEFAULT 0 NOT NULL,
	"revenue" integer DEFAULT 0 NOT NULL,
	"stream_count" integer DEFAULT 0 NOT NULL,
	"followers" integer DEFAULT 0 NOT NULL,
	"followers_count" integer DEFAULT 0 NOT NULL,
	"following_count" integer DEFAULT 0 NOT NULL,
	"revenue_share" integer DEFAULT 80 NOT NULL,
	"satisfaction_score" real DEFAULT 0 NOT NULL,
	"attendance_rate" real DEFAULT 0 NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'idol' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dm_conversation_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"dm_id" integer NOT NULL,
	"sender_id" integer,
	"sender" text NOT NULL,
	"text" text,
	"image_url" text,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dm_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user1_id" integer NOT NULL,
	"user2_id" integer NOT NULL,
	"last_message" text DEFAULT '',
	"last_message_at" timestamp DEFAULT now(),
	"unread_count1" integer DEFAULT 0,
	"unread_count2" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dm_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"avatar" text NOT NULL,
	"last_message" text NOT NULL,
	"time" text NOT NULL,
	"unread" integer DEFAULT 0 NOT NULL,
	"online" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "earnings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT 'guest-001' NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"amount" integer NOT NULL,
	"revenue_share" integer DEFAULT 80 NOT NULL,
	"net_amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"id" serial PRIMARY KEY NOT NULL,
	"follower_id" integer NOT NULL,
	"following_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "genre_ads" (
	"id" serial PRIMARY KEY NOT NULL,
	"genre_id" text NOT NULL,
	"company_name" text NOT NULL,
	"contact_name" text NOT NULL,
	"email" text NOT NULL,
	"banner_url" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"daily_rate" integer NOT NULL,
	"total_amount" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "genre_owners" (
	"id" serial PRIMARY KEY NOT NULL,
	"genre_id" text NOT NULL,
	"owner_user_id" integer NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "genre_owners_genre_id_unique" UNIQUE("genre_id")
);
--> statement-breakpoint
CREATE TABLE "jukebox_chat" (
	"id" serial PRIMARY KEY NOT NULL,
	"community_id" integer NOT NULL,
	"username" text NOT NULL,
	"avatar" text,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jukebox_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"community_id" integer NOT NULL,
	"video_id" integer,
	"video_title" text NOT NULL,
	"video_thumbnail" text NOT NULL,
	"video_duration_secs" integer DEFAULT 0,
	"youtube_id" text,
	"added_by" text DEFAULT 'あなた' NOT NULL,
	"added_by_avatar" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_played" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jukebox_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"community_id" integer NOT NULL,
	"current_video_id" integer,
	"current_video_title" text,
	"current_video_thumbnail" text,
	"current_video_duration_secs" integer DEFAULT 0,
	"current_video_youtube_id" text,
	"started_at" timestamp DEFAULT now(),
	"is_playing" boolean DEFAULT true,
	"watchers_count" integer DEFAULT 1,
	CONSTRAINT "jukebox_state_community_id_unique" UNIQUE("community_id")
);
--> statement-breakpoint
CREATE TABLE "live_stream_chat" (
	"id" serial PRIMARY KEY NOT NULL,
	"stream_id" integer NOT NULL,
	"username" text NOT NULL,
	"avatar" text,
	"message" text NOT NULL,
	"is_gift" boolean DEFAULT false,
	"gift_amount" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "live_streams" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"creator" text NOT NULL,
	"community" text NOT NULL,
	"viewers" integer DEFAULT 0 NOT NULL,
	"thumbnail" text NOT NULL,
	"avatar" text NOT NULL,
	"time_ago" text NOT NULL,
	"is_live" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "liver_availability" (
	"id" serial PRIMARY KEY NOT NULL,
	"liver_id" integer NOT NULL,
	"date" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"max_slots" integer DEFAULT 3 NOT NULL,
	"booked_slots" integer DEFAULT 0 NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "liver_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"liver_id" integer NOT NULL,
	"user_id" text DEFAULT 'guest' NOT NULL,
	"user_name" text NOT NULL,
	"user_avatar" text,
	"satisfaction_score" integer DEFAULT 5 NOT NULL,
	"stream_count_score" integer DEFAULT 5 NOT NULL,
	"attendance_score" integer DEFAULT 5 NOT NULL,
	"overall_score" real DEFAULT 5 NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"session_date" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"amount" integer,
	"avatar" text,
	"thumbnail" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"time_ago" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "phone_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"phone_number" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"consumed" boolean DEFAULT false NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"reporter_id" integer NOT NULL,
	"content_type" text NOT NULL,
	"content_id" integer NOT NULL,
	"reason" text NOT NULL,
	"ai_verdict" text NOT NULL,
	"ai_reason" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"video_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "saved_videos_user_id_video_id_unique" UNIQUE("user_id","video_id")
);
--> statement-breakpoint
CREATE TABLE "streams" (
	"id" serial PRIMARY KEY NOT NULL,
	"cf_live_input_id" text NOT NULL,
	"whip_url" text,
	"webrtc_url" text NOT NULL,
	"rtmps_url" text NOT NULL,
	"rtmps_stream_key" text NOT NULL,
	"user_id" integer,
	"title" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"current_viewers" integer DEFAULT 0 NOT NULL,
	"max_viewers" integer DEFAULT 20 NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"reference_id" text,
	"settled_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "twoshot_bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"stream_id" integer NOT NULL,
	"user_id" text DEFAULT 'guest' NOT NULL,
	"user_name" text NOT NULL,
	"user_avatar" text,
	"stripe_session_id" text,
	"stripe_payment_intent_id" text,
	"price" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"queue_position" integer DEFAULT 0 NOT NULL,
	"agreed_to_terms" boolean DEFAULT false NOT NULL,
	"agreed_at" timestamp,
	"notified_at" timestamp,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"cancel_reason" text,
	"refundable" boolean DEFAULT false NOT NULL,
	"evaluation_score" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"line_id" text NOT NULL,
	"display_name" text DEFAULT 'ユーザー' NOT NULL,
	"profile_image_url" text,
	"role" text DEFAULT 'USER' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"spotify_url" text,
	"apple_music_url" text,
	"bandcamp_url" text,
	"instagram_url" text,
	"youtube_url" text,
	"x_url" text,
	"phone_number" text,
	"phone_verified_at" timestamp,
	"stripe_connect_id" text,
	"google_refresh_token" text,
	"google_access_token" text,
	"google_token_expires_at" timestamp,
	"followers_count" integer DEFAULT 0 NOT NULL,
	"following_count" integer DEFAULT 0 NOT NULL,
	"enneagram_scores" text,
	"pinned_community_ids" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_line_id_unique" UNIQUE("line_id"),
	CONSTRAINT "users_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "video_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"video_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"hidden" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_edit_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"editor_id" integer NOT NULL,
	"requester_id" text NOT NULL,
	"requester_name" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_type" text NOT NULL,
	"budget" integer,
	"deadline" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_editors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"avatar" text,
	"bio" text DEFAULT '' NOT NULL,
	"community_id" integer NOT NULL,
	"genres" text DEFAULT '' NOT NULL,
	"delivery_days" integer DEFAULT 3 NOT NULL,
	"price_type" text NOT NULL,
	"price_per_minute" integer,
	"revenue_share_percent" integer,
	"rating" real DEFAULT 0 NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"creator" text NOT NULL,
	"community" text NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"time_ago" text NOT NULL,
	"duration" text NOT NULL,
	"price" integer,
	"thumbnail" text NOT NULL,
	"avatar" text NOT NULL,
	"rank" integer,
	"is_ranked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"description" text,
	"hidden" boolean DEFAULT false NOT NULL,
	"concert_id" integer,
	"user_id" integer,
	"visibility" text DEFAULT 'community' NOT NULL,
	"community_id" integer,
	"video_url" text,
	"youtube_id" text,
	"post_type" text DEFAULT 'daily' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"kind" text,
	"balance_available" integer DEFAULT 0 NOT NULL,
	"balance_pending" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'JPY' NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "withdrawals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT 'guest-001' NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"bank_name" text NOT NULL,
	"bank_branch" text NOT NULL,
	"account_type" text DEFAULT '普通' NOT NULL,
	"account_number" text NOT NULL,
	"account_name" text NOT NULL,
	"note" text,
	"requested_at" timestamp DEFAULT now(),
	"processed_at" timestamp
);
