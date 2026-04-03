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
