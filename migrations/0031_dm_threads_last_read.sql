-- Per-user read cursors for 1:1 DM threads (count peer messages after last read)
ALTER TABLE "dm_threads" ADD COLUMN IF NOT EXISTS "user_1_last_read_message_id" integer;
ALTER TABLE "dm_threads" ADD COLUMN IF NOT EXISTS "user_2_last_read_message_id" integer;
