import { Redis } from "@upstash/redis";
import { EventEmitter } from "node:events";

let UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL ?? "";
let UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";

// Auto-correct swapped URL/token credentials (common misconfiguration)
if (
  UPSTASH_REDIS_REST_URL &&
  UPSTASH_REDIS_REST_TOKEN &&
  !UPSTASH_REDIS_REST_URL.startsWith("https://") &&
  UPSTASH_REDIS_REST_TOKEN.startsWith("https://")
) {
  console.log("[Redis] URL and TOKEN appear swapped — auto-correcting.");
  [UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN] = [UPSTASH_REDIS_REST_TOKEN, UPSTASH_REDIS_REST_URL];
}

const useRedis = !!(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);

if (!useRedis) {
  console.warn("[Redis] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not set. Using in-memory event bus for SSE.");
}

export const redis = new Redis({
  url: UPSTASH_REDIS_REST_URL || "https://placeholder.upstash.io",
  token: UPSTASH_REDIS_REST_TOKEN || "placeholder",
});

const eventBus = new EventEmitter();
eventBus.setMaxListeners(200);

export function jukeboxChannel(communityId: number): string {
  return `jukebox:${communityId}`;
}

export async function publishJukeboxEvent(
  communityId: number,
  event: JukeboxSSEEvent
): Promise<void> {
  const channel = jukeboxChannel(communityId);
  const payload = { ...event, ts: Date.now() };

  if (useRedis) {
    try {
      const key = channel;
      const serialized = JSON.stringify(payload);
      await redis.lpush(key, serialized);
      await redis.ltrim(key, 0, 99);
      await redis.expire(key, 3600);
    } catch (e) {
      console.error("[Redis] publishJukeboxEvent error:", e);
    }
  }

  // Always emit locally for same-instance subscribers
  eventBus.emit(channel, payload);
}

type StoredJukeboxEvent = JukeboxSSEEvent & { ts: number };

function parseRedisItem(item: unknown): unknown {
  if (typeof item === "string") {
    try { return JSON.parse(item); } catch { return null; }
  }
  return item;
}

function isStoredJukeboxEvent(e: unknown): e is StoredJukeboxEvent {
  return (
    e !== null &&
    typeof e === "object" &&
    "ts" in e &&
    typeof (e as Record<string, unknown>).ts === "number"
  );
}

export function subscribeJukeboxEvents(
  communityId: number,
  callback: (event: StoredJukeboxEvent) => void
): () => void {
  const channel = jukeboxChannel(communityId);

  // Track last seen timestamp to deduplicate between EventEmitter and Redis poll
  let lastSeenTs = Date.now();

  // Same-instance: EventEmitter fires immediately
  const handler = (payload: StoredJukeboxEvent) => {
    lastSeenTs = Math.max(lastSeenTs, payload.ts);
    callback(payload);
  };
  eventBus.on(channel, handler);

  // Cross-instance: Poll Redis for events from other server instances
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  if (useRedis) {
    pollInterval = setInterval(async () => {
      try {
        // lrange returns newest-first (lpush inserts at head)
        const items = await redis.lrange(channel, 0, 19);
        const events = (items as unknown[])
          .map(parseRedisItem)
          .filter(isStoredJukeboxEvent)
          .filter((e) => e.ts > lastSeenTs)
          .sort((a, b) => a.ts - b.ts); // oldest first

        for (const event of events) {
          lastSeenTs = Math.max(lastSeenTs, event.ts);
          callback(event);
        }
      } catch {
        // Redis poll error — ignore, will retry next interval
      }
    }, 1000);
  }

  return () => {
    eventBus.off(channel, handler);
    if (pollInterval) clearInterval(pollInterval);
  };
}

export type JukeboxSSEEvent =
  | { type: "state_update"; data: Record<string, unknown> }
  | { type: "queue_update"; data: Record<string, unknown>[] }
  | { type: "chat"; data: Record<string, unknown> }
  | { type: "ping" };
