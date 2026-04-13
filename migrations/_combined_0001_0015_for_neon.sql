-- =============================================================================
-- 0001 〜 0016 を 1 本にまとめた SQL（Neon の SQL Editor へそのまま貼り付け可）
-- 前提: migrations/0000_lean_slayback.sql をすでに適用済みであること
-- =============================================================================
--
-- 【0001 と 0005 の競合について】
-- 0000 では twoshot_bookings があり、0005 で mentor_bookings にリネームします。
-- 一方 0001 は mentor_bookings / mentor_sessions を新規 CREATE するため、
-- 0000 直後の DB で 0001 をそのまま流すと 0005 で「mentor_bookings は既に存在」になります。
-- そのためこのファイルでは 0001 の CREATE TABLE 2 つをコメントアウトしています。
-- （mentor_sessions は 0006 で IF NOT EXISTS 作成されます。）
--
-- 【ai_edit_jobs について】
-- 0003・0004 は ai_edit_jobs への ALTER です。0000 にテーブルが無い場合は先に
-- テーブル作成が必要です（例: npm run db:push で schema に合わせる）。
--
-- =============================================================================

-- ========== 0001_polite_sally_floyd.sql（CREATE は 0005 と競合するためスキップ）==========
-- CREATE TABLE "mentor_bookings" ( ... );
-- CREATE TABLE "mentor_sessions" ( ... );

-- ========== 0002_welcome_dm_flag.sql ==========
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "welcome_dm_sent_at" timestamp;

-- ========== 0003_ai_edit_video_spec.sql ==========
ALTER TABLE "ai_edit_jobs" ADD COLUMN IF NOT EXISTS "video_spec" text;

-- ========== 0004_ai_edit_templated_render_id.sql ==========
ALTER TABLE "ai_edit_jobs" ADD COLUMN IF NOT EXISTS "templated_render_id" text;

-- ========== 0005_rename_twoshot_to_mentor.sql ==========
ALTER TABLE "twoshot_bookings" RENAME TO "mentor_bookings";
UPDATE "transactions" SET "source" = 'mentor' WHERE "source" = 'twoshot';
UPDATE "earnings" SET "type" = 'mentor' WHERE "type" = 'twoshot';
UPDATE "creators" SET "category" = 'mentor' WHERE "category" = 'twoshot';

-- ========== 0006_mentor_sessions.sql ==========
-- Migration: mentor_sessions テーブル追加 + mentor_bookings にカラム追加

CREATE TABLE IF NOT EXISTS "mentor_sessions" (
  "id" serial PRIMARY KEY,
  "creator_id" integer NOT NULL,
  "title" text NOT NULL,
  "category" text NOT NULL DEFAULT 'other',
  "description" text NOT NULL DEFAULT '',
  "price" integer NOT NULL,
  "duration" integer NOT NULL DEFAULT 30,
  "max_participants" integer NOT NULL DEFAULT 1,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

ALTER TABLE "mentor_bookings"
  ADD COLUMN IF NOT EXISTS "session_id" integer,
  ADD COLUMN IF NOT EXISTS "scheduled_at" timestamp,
  ADD COLUMN IF NOT EXISTS "whip_url" text,
  ADD COLUMN IF NOT EXISTS "whep_url" text,
  ADD COLUMN IF NOT EXISTS "cf_stream_uid" text;

-- stream_id を nullable に変更（新モデルでは不要）
ALTER TABLE "mentor_bookings"
  ALTER COLUMN "stream_id" DROP NOT NULL;

-- ========== 0007_streams_session.sql ==========
-- Live session fields on Cloudflare-backed streams (WHIP/WHEP + viewer count + host)

ALTER TABLE "streams"
  ADD COLUMN IF NOT EXISTS "title" text,
  ADD COLUMN IF NOT EXISTS "host_user_id" integer,
  ADD COLUMN IF NOT EXISTS "is_live" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "started_at" timestamp,
  ADD COLUMN IF NOT EXISTS "ended_at" timestamp,
  ADD COLUMN IF NOT EXISTS "whip_url" text;

-- ========== 0008_stream_visibility_user_follows.sql ==========
-- User follow graph (for followers-only live visibility)
CREATE TABLE IF NOT EXISTS "user_follows" (
  "id" serial PRIMARY KEY NOT NULL,
  "follower_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "following_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "user_follows_follower_following_unique" UNIQUE ("follower_id", "following_id"),
  CONSTRAINT "user_follows_no_self" CHECK ("follower_id" <> "following_id")
);

CREATE INDEX IF NOT EXISTS "user_follows_following_id_idx" ON "user_follows" ("following_id");
CREATE INDEX IF NOT EXISTS "user_follows_follower_id_idx" ON "user_follows" ("follower_id");

-- Live visibility: public | followers | community
ALTER TABLE "streams"
  ADD COLUMN IF NOT EXISTS "visibility" text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS "restricted_community_id" integer REFERENCES "communities"("id");

-- ========== 0009_dm_threads.sql ==========
-- 1:1 DM スレッド（user_1_id < user_2_id で正規化）
CREATE TABLE IF NOT EXISTS "dm_threads" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_1_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "user_2_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "last_message_preview" text,
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "dm_threads_pair_unique" UNIQUE ("user_1_id", "user_2_id"),
  CONSTRAINT "dm_threads_ordered" CHECK ("user_1_id" < "user_2_id")
);

CREATE TABLE IF NOT EXISTS "dm_thread_messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "thread_id" integer NOT NULL REFERENCES "dm_threads"("id") ON DELETE CASCADE,
  "sender_user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "text" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "dm_thread_messages_thread_id_idx" ON "dm_thread_messages" ("thread_id");

-- ========== 0010_video_editors_style_tags.sql ==========
ALTER TABLE "video_editors" ADD COLUMN "style_tags" text[] NOT NULL DEFAULT '{}';

-- ========== 0011_video_editors_user_id.sql ==========
ALTER TABLE "video_editors" ADD COLUMN "user_id" integer;
CREATE UNIQUE INDEX "video_editors_user_id_unique" ON "video_editors" ("user_id") WHERE "user_id" IS NOT NULL;

-- ========== 0012_users_payout_terms_agreed_at.sql ==========
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "payout_terms_agreed_at" timestamp;

-- ========== 0013_users_operations_dm_opened_at.sql ==========
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "operations_dm_opened_at" timestamp;
-- 既存ユーザーは運営DM未読バッジを出さない（ウェルカム送信済みは「開いた」扱い）
UPDATE "users"
SET "operations_dm_opened_at" = COALESCE("operations_dm_opened_at", "welcome_dm_sent_at", NOW())
WHERE "welcome_dm_sent_at" IS NOT NULL;

-- ========== 0014_users_last_content_lang.sql ==========
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_content_lang" TEXT;

-- ========== 0015_users_policy_acceptance.sql ==========
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "terms_accepted_version" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "terms_accepted_at" TIMESTAMP;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "privacy_accepted_version" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "privacy_accepted_at" TIMESTAMP;

-- ========== 0016_creators_current_level_tickets_creator_levels.sql ==========
ALTER TABLE "creators" ADD COLUMN IF NOT EXISTS "current_level" integer DEFAULT 1 NOT NULL;

CREATE TABLE IF NOT EXISTS "ticket_balances" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL UNIQUE,
  "balance" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ticket_transactions" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "amount" integer NOT NULL,
  "type" text NOT NULL,
  "reference_id" text,
  "description" text,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "creator_level_thresholds" (
  "id" serial PRIMARY KEY NOT NULL,
  "level" integer NOT NULL UNIQUE,
  "required_tip_gross" integer DEFAULT 0 NOT NULL,
  "required_stream_count" integer DEFAULT 0 NOT NULL,
  "tip_back_rate" real DEFAULT 0.5 NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "creator_monthly_scores" (
  "id" serial PRIMARY KEY NOT NULL,
  "creator_id" integer NOT NULL,
  "year_month" text NOT NULL,
  "tip_gross" integer DEFAULT 0 NOT NULL,
  "paid_live_gross" integer DEFAULT 0 NOT NULL,
  "stream_count_monthly" integer DEFAULT 0 NOT NULL,
  "avg_satisfaction" real DEFAULT 0 NOT NULL,
  "composite_score" real DEFAULT 0 NOT NULL,
  "start_rank" integer,
  "rank_overall" integer,
  "rank_paid_live" integer,
  "next_start_rank" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "creator_monthly_scores_creator_id_year_month_unique" UNIQUE ("creator_id", "year_month")
);
