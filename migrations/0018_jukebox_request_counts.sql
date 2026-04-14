-- jukebox_request_counts: align with server/schema.ts (fixes "column date does not exist" on /api/tickets/*).
-- Apply in Neon SQL Editor or: psql $DATABASE_URL -f migrations/0018_jukebox_request_counts.sql

CREATE TABLE IF NOT EXISTS "jukebox_request_counts" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "community_id" integer NOT NULL,
  "date" text NOT NULL,
  "count" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp DEFAULT now()
);

-- Legacy tables created without "date" (reserved-looking name but valid as quoted identifier in PG)
ALTER TABLE "jukebox_request_counts" ADD COLUMN IF NOT EXISTS "date" text;
UPDATE "jukebox_request_counts"
SET "date" = to_char(timezone('UTC', now()), 'YYYY-MM-DD')
WHERE "date" IS NULL;
ALTER TABLE "jukebox_request_counts" ALTER COLUMN "date" SET NOT NULL;

ALTER TABLE "jukebox_request_counts" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
ALTER TABLE "jukebox_request_counts" ADD COLUMN IF NOT EXISTS "count" integer DEFAULT 0 NOT NULL;
