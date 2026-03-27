import { Redis } from "@upstash/redis";
import { EventEmitter } from "node:events";

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL ?? "";
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";

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

  eventBus.emit(channel, payload);
}

export function subscribeJukeboxEvents(
  communityId: number,
  callback: (event: JukeboxSSEEvent & { ts: number }) => void
): () => void {
  const channel = jukeboxChannel(communityId);
  const handler = (payload: JukeboxSSEEvent & { ts: number }) => {
    callback(payload);
  };
  eventBus.on(channel, handler);
  return () => {
    eventBus.off(channel, handler);
  };
}

export type JukeboxSSEEvent =
  | { type: "state_update"; data: Record<string, unknown> }
  | { type: "queue_update"; data: Record<string, unknown>[] }
  | { type: "chat"; data: Record<string, unknown> }
  | { type: "ping" };
