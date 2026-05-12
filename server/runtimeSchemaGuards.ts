import { sql } from "drizzle-orm";
import { db } from "./db";

let jukeboxQueueUserColumnReady = false;
let userFollowsSchemaReady = false;
let jukeboxRequestCountsReady = false;
let clientErrorEventsReady = false;
let bugReportsReady = false;

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
