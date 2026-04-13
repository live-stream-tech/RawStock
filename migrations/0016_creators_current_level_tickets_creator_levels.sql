-- Align production DB with server/schema.ts (fixes missing column / tables on Neon).
-- Apply in Neon SQL Editor or: psql $DATABASE_URL -f migrations/0016_creators_current_level_tickets_creator_levels.sql

-- creators: Drizzle selects all columns (e.g. /api/profile/roles, /api/livers/me/level-progress)
ALTER TABLE "creators" ADD COLUMN IF NOT EXISTS "current_level" integer DEFAULT 1 NOT NULL;

-- Ticket economy (jukebox paid requests, balance API)
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

-- Creator level system (level-progress + tip back rate)
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
