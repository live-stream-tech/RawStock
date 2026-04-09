ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "terms_accepted_version" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "terms_accepted_at" TIMESTAMP;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "privacy_accepted_version" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "privacy_accepted_at" TIMESTAMP;
