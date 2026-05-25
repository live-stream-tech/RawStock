import { sql } from "drizzle-orm";
import { db } from "./db";

let jukeboxQueueUserColumnReady = false;
let userFollowsSchemaReady = false;
let jukeboxRequestCountsReady = false;
let clientErrorEventsReady = false;
let bugReportsReady = false;
let mentorBookingsSchemaReady = false;
let notificationsSchemaReady = false;
let videoLikesSchemaReady = false;
let usersAuthSubjectRenameReady = false;

/**
 * Production DBs may not have run every SQL migration from the repo.
 * Apply small, idempotent DDL once per serverless instance / dev process.
 */
export async function ensureJukeboxQueueSchema(): Promise<void> {
  if (jukeboxQueueUserColumnReady) return;
  try {
    await db.execute(
      sql.raw(
        `ALTER TABLE "jukebox_queue" ADD COLUMN IF NOT EXISTS "added_by_user_id" integer`,
      ),
    );
    jukeboxQueueUserColumnReady = true;
  } catch (e) {
    console.error("[runtimeSchemaGuards] jukebox_queue.added_by_user_id:", e);
  }
}

/** Matches `migrations/0008_stream_visibility_user_follows.sql` (idempotent). */
export async function ensureUserFollowsSchema(): Promise<void> {
  if (userFollowsSchemaReady) return;
  try {
    await db.execute(
      sql.raw(`CREATE TABLE IF NOT EXISTS "user_follows" (
  "id" serial PRIMARY KEY NOT NULL,
  "follower_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "following_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "user_follows_follower_following_unique" UNIQUE ("follower_id", "following_id"),
  CONSTRAINT "user_follows_no_self" CHECK ("follower_id" <> "following_id")
)`),
    );
    await db.execute(
      sql.raw(
        `CREATE INDEX IF NOT EXISTS "user_follows_following_id_idx" ON "user_follows" ("following_id")`,
      ),
    );
    await db.execute(
      sql.raw(`CREATE INDEX IF NOT EXISTS "user_follows_follower_id_idx" ON "user_follows" ("follower_id")`),
    );
    await db.execute(
      sql.raw(
        `ALTER TABLE "streams" ADD COLUMN IF NOT EXISTS "visibility" text NOT NULL DEFAULT 'public'`,
      ),
    );
    await db.execute(
      sql.raw(
        `ALTER TABLE "streams" ADD COLUMN IF NOT EXISTS "restricted_community_id" integer REFERENCES "communities"("id")`,
      ),
    );
    userFollowsSchemaReady = true;
  } catch (e) {
    console.error("[runtimeSchemaGuards] user_follows / streams visibility:", e);
  }
}

/** Ensures jukebox_request_counts table and required columns exist (idempotent). */
export async function ensureJukeboxRequestCountsSchema(): Promise<void> {
  if (jukeboxRequestCountsReady) return;
  try {
    await db.execute(
      sql.raw(`
        CREATE TABLE IF NOT EXISTS "jukebox_request_counts" (
          id serial PRIMARY KEY NOT NULL,
          user_id text NOT NULL,
          community_id integer NOT NULL,
          date text NOT NULL,
          count integer DEFAULT 0 NOT NULL,
          updated_at timestamp DEFAULT now()
        )
      `),
    );
    await db.execute(
      sql.raw(`ALTER TABLE "jukebox_request_counts" ADD COLUMN IF NOT EXISTS "date" text`),
    );
    await db.execute(
      sql.raw(`ALTER TABLE "jukebox_request_counts" ADD COLUMN IF NOT EXISTS "count" integer DEFAULT 0`),
    );
    await db.execute(
      sql.raw(`ALTER TABLE "jukebox_request_counts" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now()`),
    );
    jukeboxRequestCountsReady = true;
  } catch (e) {
    console.error("[runtimeSchemaGuards] jukebox_request_counts:", e);
  }
}

/** Ensures client_error_events table exists for production-safe client error ingest. */
export async function ensureClientErrorEventsSchema(): Promise<void> {
  if (clientErrorEventsReady) return;
  try {
    await db.execute(
      sql.raw(`
        CREATE TABLE IF NOT EXISTS "client_error_events" (
          "id" serial PRIMARY KEY NOT NULL,
          "kind" text NOT NULL,
          "severity" text NOT NULL DEFAULT 'error',
          "title" text,
          "message" text NOT NULL,
          "status" integer,
          "code" text,
          "route" text,
          "method" text,
          "request_url" text,
          "user_id" integer,
          "session_id" text,
          "platform" text,
          "user_agent" text,
          "fingerprint" text,
          "payload_json" text,
          "stack" text,
          "component_stack" text,
          "created_at" timestamp DEFAULT now()
        )
      `),
    );
    await db.execute(
      sql.raw(`CREATE INDEX IF NOT EXISTS "client_error_events_created_at_idx" ON "client_error_events" ("created_at" DESC)`),
    );
    await db.execute(
      sql.raw(`CREATE INDEX IF NOT EXISTS "client_error_events_fingerprint_idx" ON "client_error_events" ("fingerprint")`),
    );
    await db.execute(
      sql.raw(`ALTER TABLE "client_error_events" ADD COLUMN IF NOT EXISTS "resolved_at" timestamp`),
    );
    await db.execute(
      sql.raw(`ALTER TABLE "client_error_events" ADD COLUMN IF NOT EXISTS "resolved_by" integer`),
    );
    await db.execute(
      sql.raw(
        `CREATE INDEX IF NOT EXISTS "client_error_events_resolved_at_idx" ON "client_error_events" ("resolved_at")`,
      ),
    );
    clientErrorEventsReady = true;
  } catch (e) {
    console.error("[runtimeSchemaGuards] client_error_events:", e);
  }
}

/**
 * Production DBs may still have `twoshot_bookings` (migration 0005 not applied).
 * Ensures `mentor_bookings` + `mentor_sessions` exist with columns the API expects.
 */
export async function ensureMentorBookingsSchema(): Promise<void> {
  if (mentorBookingsSchemaReady) return;
  try {
    await db.execute(
      sql.raw(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'twoshot_bookings'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'mentor_bookings'
          ) THEN
            ALTER TABLE "twoshot_bookings" RENAME TO "mentor_bookings";
          END IF;
        END $$;
      `),
    );

    await db.execute(
      sql.raw(`
        CREATE TABLE IF NOT EXISTS "mentor_bookings" (
          "id" serial PRIMARY KEY NOT NULL,
          "stream_id" integer,
          "session_id" integer,
          "user_id" text DEFAULT 'guest' NOT NULL,
          "user_name" text NOT NULL,
          "user_avatar" text,
          "scheduled_at" timestamp,
          "stripe_session_id" text,
          "stripe_payment_intent_id" text,
          "price" integer NOT NULL,
          "status" text DEFAULT 'pending' NOT NULL,
          "queue_position" integer DEFAULT 0 NOT NULL,
          "whip_url" text,
          "whep_url" text,
          "cf_stream_uid" text,
          "agreed_to_terms" boolean DEFAULT false NOT NULL,
          "agreed_at" timestamp,
          "notified_at" timestamp,
          "completed_at" timestamp,
          "cancelled_at" timestamp,
          "cancel_reason" text,
          "refundable" boolean DEFAULT false NOT NULL,
          "evaluation_score" integer,
          "created_at" timestamp DEFAULT now()
        )
      `),
    );

    await db.execute(
      sql.raw(`
        CREATE TABLE IF NOT EXISTS "mentor_sessions" (
          "id" serial PRIMARY KEY NOT NULL,
          "creator_id" integer NOT NULL,
          "title" text NOT NULL,
          "category" text NOT NULL DEFAULT 'other',
          "description" text NOT NULL DEFAULT '',
          "price" integer NOT NULL,
          "duration" integer NOT NULL DEFAULT 30,
          "max_participants" integer NOT NULL DEFAULT 1,
          "is_active" boolean NOT NULL DEFAULT true,
          "created_at" timestamp DEFAULT now(),
          "updated_at" timestamp DEFAULT now()
        )
      `),
    );

    await db.execute(
      sql.raw(`
        ALTER TABLE "mentor_bookings"
          ADD COLUMN IF NOT EXISTS "session_id" integer,
          ADD COLUMN IF NOT EXISTS "scheduled_at" timestamp,
          ADD COLUMN IF NOT EXISTS "whip_url" text,
          ADD COLUMN IF NOT EXISTS "whep_url" text,
          ADD COLUMN IF NOT EXISTS "cf_stream_uid" text
      `),
    );

    await db.execute(
      sql.raw(`ALTER TABLE "mentor_bookings" ALTER COLUMN "stream_id" DROP NOT NULL`),
    ).catch(() => {});

    await db.execute(
      sql.raw(`UPDATE "transactions" SET "source" = 'mentor' WHERE "source" = 'twoshot'`),
    ).catch(() => {});
    await db.execute(
      sql.raw(`UPDATE "earnings" SET "type" = 'mentor' WHERE "type" = 'twoshot'`),
    ).catch(() => {});
    await db.execute(
      sql.raw(`UPDATE "creators" SET "category" = 'mentor' WHERE "category" = 'twoshot'`),
    ).catch(() => {});

    mentorBookingsSchemaReady = true;
  } catch (e) {
    console.error("[runtimeSchemaGuards] mentor_bookings:", e);
  }
}

/** Matches `migrations/0032_notifications_user_id.sql` (idempotent). */
export async function ensureNotificationsSchema(): Promise<void> {
  if (notificationsSchemaReady) return;
  try {
    await db.execute(
      sql.raw(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "user_id" integer`),
    );
    await db.execute(
      sql.raw(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "target_path" text`),
    );
    await db.execute(
      sql.raw(
        `CREATE INDEX IF NOT EXISTS "notifications_user_id_created_at_idx" ON "notifications" ("user_id", "created_at" DESC)`,
      ),
    );
    notificationsSchemaReady = true;
  } catch (e) {
    console.error("[runtimeSchemaGuards] notifications:", e);
  }
}

/** Ensures bug_reports table exists for user-submitted issue intake. */
export async function ensureBugReportsSchema(): Promise<void> {
  if (bugReportsReady) return;
  try {
    await db.execute(
      sql.raw(`
        CREATE TABLE IF NOT EXISTS "bug_reports" (
          "id" serial PRIMARY KEY NOT NULL,
          "user_id" integer,
          "title" text NOT NULL,
          "description" text NOT NULL,
          "expected_behavior" text,
          "actual_behavior" text,
          "route" text,
          "session_id" text,
          "platform" text,
          "user_agent" text,
          "payload_json" text,
          "status" text NOT NULL DEFAULT 'open',
          "resolved_at" timestamp,
          "resolved_by" integer,
          "created_at" timestamp DEFAULT now()
        )
      `),
    );
    await db.execute(
      sql.raw(`CREATE INDEX IF NOT EXISTS "bug_reports_created_at_idx" ON "bug_reports" ("created_at" DESC)`),
    );
    await db.execute(
      sql.raw(`CREATE INDEX IF NOT EXISTS "bug_reports_status_idx" ON "bug_reports" ("status")`),
    );
    bugReportsReady = true;
  } catch (e) {
    console.error("[runtimeSchemaGuards] bug_reports:", e);
  }
}

/** Ensures video_likes table exists (idempotent). */
export async function ensureVideoLikesSchema(): Promise<void> {
  if (videoLikesSchemaReady) return;
  try {
    await db.execute(
      sql.raw(`
        CREATE TABLE IF NOT EXISTS "video_likes" (
          "id" serial PRIMARY KEY NOT NULL,
          "user_id" integer NOT NULL,
          "video_id" integer NOT NULL,
          "created_at" timestamp DEFAULT now(),
          CONSTRAINT "video_likes_user_video_unique" UNIQUE ("user_id", "video_id")
        )
      `),
    );
    await db.execute(
      sql.raw(`CREATE INDEX IF NOT EXISTS "video_likes_video_id_idx" ON "video_likes" ("video_id")`),
    );
    videoLikesSchemaReady = true;
  } catch (e) {
    console.error("[runtimeSchemaGuards] video_likes:", e);
  }
}

/**
 * Renames the legacy `users.line_id` column (LINE Login era) to `auth_subject`
 * if a freshly provisioned DB skipped migration 0033. Idempotent.
 * Prevents Google OAuth callback from failing with `column "auth_subject" does not exist`.
 */
export async function ensureUsersAuthSubjectRename(): Promise<void> {
  if (usersAuthSubjectRenameReady) return;
  try {
    await db.execute(
      sql.raw(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'line_id'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'auth_subject'
          ) THEN
            ALTER TABLE users RENAME COLUMN line_id TO auth_subject;
          END IF;

          IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE table_name = 'users' AND constraint_name = 'users_line_id_unique'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE table_name = 'users' AND constraint_name = 'users_auth_subject_unique'
          ) THEN
            ALTER TABLE users RENAME CONSTRAINT users_line_id_unique TO users_auth_subject_unique;
          END IF;
        END $$;
      `),
    );
    usersAuthSubjectRenameReady = true;
  } catch (e) {
    console.error("[runtimeSchemaGuards] users.auth_subject rename:", e);
  }
}
