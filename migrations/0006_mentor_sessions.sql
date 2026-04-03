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
