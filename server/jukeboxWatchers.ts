import { redis, isUpstashRedisConfigured } from "./redis";

const POLL_TTL_MS = 90_000;

const pollRedisKey = (communityId: number) => `jukebox:poll:${communityId}`;

/** In-process fallback when Upstash is not configured (single-instance approximation). */
const localPollByCommunity = new Map<number, Map<string, number>>();

function localPollPruneAndTouch(communityId: number, sessionId: string, now: number): void {
  let m = localPollByCommunity.get(communityId);
  if (!m) {
    m = new Map();
    localPollByCommunity.set(communityId, m);
  }
  for (const [sid, exp] of m) {
    if (exp <= now) m.delete(sid);
  }
  m.set(sessionId, now + POLL_TTL_MS);
}

function localPollCountAfterPrune(communityId: number, now: number): number {
  const m = localPollByCommunity.get(communityId);
  if (!m) return 0;
  for (const [sid, exp] of m) {
    if (exp <= now) m.delete(sid);
  }
  return m.size;
}

export function isValidJukeboxPollViewerId(raw: string): boolean {
  return /^[a-zA-Z0-9_-]{8,64}$/.test(raw);
}

/**
 * Presence refresh: call from GET ?viewer= and periodically while SSE is open with the same id.
 * Distinct `sessionId` values approximate concurrent viewers (works across serverless instances when Redis is on).
 */
export async function jukeboxPollTouch(communityId: number, sessionId: string): Promise<void> {
  if (!isValidJukeboxPollViewerId(sessionId)) return;

  const now = Date.now();
  const expireAt = now + POLL_TTL_MS;
  const pollKey = pollRedisKey(communityId);

  if (isUpstashRedisConfigured) {
    try {
      await redis.zremrangebyscore(pollKey, "-inf", now);
      await redis.zadd(pollKey, { score: expireAt, member: sessionId });
    } catch (e) {
      console.error("[jukeboxWatchers] poll touch:", e);
    }
    return;
  }

  localPollPruneAndTouch(communityId, sessionId, now);
}

/** Distinct polling sessions after expiring stale keys (single source of truth for viewer count). */
export async function getJukeboxLiveViewerCount(communityId: number): Promise<number> {
  const now = Date.now();

  if (isUpstashRedisConfigured) {
    try {
      const pollKey = pollRedisKey(communityId);
      await redis.zremrangebyscore(pollKey, "-inf", now);
      const pollCard = await redis.zcard(pollKey);
      return typeof pollCard === "number" ? Math.max(0, pollCard) : 0;
    } catch (e) {
      console.error("[jukeboxWatchers] get count:", e);
      return 0;
    }
  }

  return localPollCountAfterPrune(communityId, now);
}
