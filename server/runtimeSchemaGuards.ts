import { sql } from "drizzle-orm";
import { db } from "./db";

let jukeboxQueueUserColumnAttempted = false;

/**
 * Production DBs may not have run every SQL migration from the repo.
 * Apply small, idempotent DDL once per serverless instance / dev process.
 */
export async function ensureJukeboxQueueSchema(): Promise<void> {
  if (jukeboxQueueUserColumnAttempted) return;
  jukeboxQueueUserColumnAttempted = true;
  try {
    await db.execute(
      sql.raw(
        `ALTER TABLE "jukebox_queue" ADD COLUMN IF NOT EXISTS "added_by_user_id" integer`,
      ),
    );
  } catch (e) {
    console.error("[runtimeSchemaGuards] jukebox_queue.added_by_user_id:", e);
  }
}
