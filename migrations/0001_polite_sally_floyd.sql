CREATE TABLE "mentor_bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"slot_id" integer,
	"user_id" integer NOT NULL,
	"user_name" text NOT NULL,
	"user_avatar" text,
	"scheduled_at" timestamp NOT NULL,
	"price" integer NOT NULL,
	"stripe_session_id" text,
	"stripe_payment_intent_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"cf_live_input_id" text,
	"whip_url" text,
	"whep_url" text,
	"rtmps_url" text,
	"rtmps_key" text,
	"started_at" timestamp,
	"ended_at" timestamp,
	"cancel_reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mentor_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"category" text DEFAULT 'counselor' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price" integer NOT NULL,
	"duration" integer DEFAULT 30 NOT NULL,
	"max_participants" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
