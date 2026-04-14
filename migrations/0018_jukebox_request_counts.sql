-- jukebox_request_counts: align with server/schema.ts (fixes "column date does not exist" on /api/tickets/*).
-- Safe when the table already exists (avoids duplicate_table / 42P07).
-- Apply: psql $DATABASE_URL -f migrations/0018_jukebox_request_counts.sql

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'jukebox_request_counts'
  ) THEN
    CREATE TABLE public.jukebox_request_counts (
      id serial PRIMARY KEY NOT NULL,
      user_id text NOT NULL,
      community_id integer NOT NULL,
      date text NOT NULL,
      count integer DEFAULT 0 NOT NULL,
      updated_at timestamp DEFAULT now()
    );
  END IF;
END
$migration$;

-- Legacy tables missing columns
ALTER TABLE "jukebox_request_counts" ADD COLUMN IF NOT EXISTS "date" text;
UPDATE "jukebox_request_counts"
SET "date" = to_char(timezone('UTC', now()), 'YYYY-MM-DD')
WHERE "date" IS NULL;
ALTER TABLE "jukebox_request_counts" ALTER COLUMN "date" SET NOT NULL;

ALTER TABLE "jukebox_request_counts" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
ALTER TABLE "jukebox_request_counts" ADD COLUMN IF NOT EXISTS "count" integer DEFAULT 0 NOT NULL;
