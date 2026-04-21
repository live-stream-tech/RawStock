CREATE TABLE IF NOT EXISTS "two_shot_reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"host_user_id" integer NOT NULL,
	"guest_user_id" integer NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"stripe_checkout_session_id" text,
	"stream_key" text,
	"slot_key" text,
	"created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "two_shot_reservations_host_idx" ON "two_shot_reservations" ("host_user_id");
CREATE INDEX IF NOT EXISTS "two_shot_reservations_guest_idx" ON "two_shot_reservations" ("guest_user_id");
CREATE INDEX IF NOT EXISTS "two_shot_reservations_stripe_session_idx" ON "two_shot_reservations" ("stripe_checkout_session_id");
