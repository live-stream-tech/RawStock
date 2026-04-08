ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "operations_dm_opened_at" timestamp;
-- 既存ユーザーは運営DM未読バッジを出さない（ウェルカム送信済みは「開いた」扱い）
UPDATE "users"
SET "operations_dm_opened_at" = COALESCE("operations_dm_opened_at", "welcome_dm_sent_at", NOW())
WHERE "welcome_dm_sent_at" IS NOT NULL;
