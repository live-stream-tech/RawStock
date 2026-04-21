-- editing_requests: プロ編集依頼のチケット手数料トラッキング（Drizzle schema と一致）
CREATE TABLE IF NOT EXISTS "editing_requests" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "video_url" text,
  "performance_date" text,
  "instructions" text,
  "ticket_fee" integer DEFAULT 200 NOT NULL,
  "ticket_transaction_id" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
