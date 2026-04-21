-- video_editors: Drizzle expects user_id + style_tags (fixes "column user_id does not exist" on /api/communities/:id/editors and /creators).
-- Equivalent to migrations 0010 + 0011 if those were never applied on Neon/Vercel DB.
-- Apply: psql $DATABASE_URL -f migrations/0019_video_editors_user_id_style_tags.sql

ALTER TABLE "video_editors" ADD COLUMN IF NOT EXISTS "style_tags" text[] NOT NULL DEFAULT '{}';
ALTER TABLE "video_editors" ADD COLUMN IF NOT EXISTS "user_id" integer;

CREATE UNIQUE INDEX IF NOT EXISTS "video_editors_user_id_unique"
  ON "video_editors" ("user_id")
  WHERE ("user_id" IS NOT NULL);
