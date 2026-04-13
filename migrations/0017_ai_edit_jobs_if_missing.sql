-- 0000 に ai_edit_jobs が無い／テーブルを落としたあとなど、combined の 0003/0004 が失敗する場合に先に実行する。
-- server/schema.ts の ai_edit_jobs と一致（video_spec / templated_render_id 込み）

CREATE TABLE IF NOT EXISTS "ai_edit_jobs" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "video_url" text DEFAULT '' NOT NULL,
  "prompt" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "result" text,
  "plan_minutes" integer,
  "video_urls" text,
  "logo_url" text,
  "telop" text,
  "target_audience" text,
  "tone" text,
  "revision_count" integer DEFAULT 0 NOT NULL,
  "ticket_cost" integer,
  "video_spec" text,
  "templated_render_id" text,
  "delivered_url" text,
  "delivered_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
