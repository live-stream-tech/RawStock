-- 1:1 DM スレッド（user_1_id < user_2_id で正規化）
CREATE TABLE IF NOT EXISTS "dm_threads" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_1_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "user_2_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "last_message_preview" text,
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "dm_threads_pair_unique" UNIQUE ("user_1_id", "user_2_id"),
  CONSTRAINT "dm_threads_ordered" CHECK ("user_1_id" < "user_2_id")
);

CREATE TABLE IF NOT EXISTS "dm_thread_messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "thread_id" integer NOT NULL REFERENCES "dm_threads"("id") ON DELETE CASCADE,
  "sender_user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "text" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "dm_thread_messages_thread_id_idx" ON "dm_thread_messages" ("thread_id");
