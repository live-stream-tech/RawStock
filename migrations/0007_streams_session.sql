-- Live session fields on Cloudflare-backed streams (WHIP/WHEP + viewer count + host)

ALTER TABLE "streams"
  ADD COLUMN IF NOT EXISTS "title" text,
  ADD COLUMN IF NOT EXISTS "host_user_id" integer,
  ADD COLUMN IF NOT EXISTS "is_live" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "started_at" timestamp,
  ADD COLUMN IF NOT EXISTS "ended_at" timestamp,
  ADD COLUMN IF NOT EXISTS "whip_url" text;
