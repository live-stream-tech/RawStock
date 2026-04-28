import { redis, isUpstashRedisConfigured } from "./redis";

const POLL_TTL_MS = 90_000;

const sseRedisKey = (communityId: number) => `jukebox:sse:${communityId}`;
const pollRedisKey = (communityId: number) => `jukebox:poll:${communityId}`;

/** In-process fallback when Upstash is not configured (single-instance approximation). */
const localSseByCommunity = new Map<number, number>();
const localPollByCommunity = new Map<number, Map<string, number>>();

function localSseIncr(communityId: number): void {
  localSseByCommunity.set(communityId, (localSseByCommunity.get(communityId) ?? 0) + 1);
}

function localSseDecr(communityId: number): void {
  const next = Math.max(0, (localSseByCommunity.get(communityId) ?? 0) - 1);
  localSseByCommunity.set(communityId, next);
}

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

/** Active SSE connections for this jukebox room (all server instances when Redis is on). */
export async function jukeboxSseConnect(communityId: number): Promise<void> {
  if (isUpstashRedisConfigured) {
    try {
      await redis.incr(sseRedisKey(communityId));
    } catch (e) {
      console.error("[jukeboxWatchers] sse incr:", e);
    }
    return;
  }
  localSseIncr(communityId);
}

export async function jukeboxSseDisconnect(communityId: number): Promise<void> {
  if (isUpstashRedisConfigured) {
    try {
      const v = await redis.decr(sseRedisKey(communityId));
      if (typeof v === "number" && v < 0) {
        await redis.set(sseRedisKey(communityId), "0");
      }
    } catch (e) {
      console.error("[jukeboxWatchers] sse decr:", e);
    }
    return;
  }
  localSseDecr(communityId);
}

/**
 * Polling clients (native, embedded player without SSE) refresh presence with each GET.
 * Distinct `sessionId` values approximate concurrent viewers.
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

/** SSE subscribers + distinct polling sessions (after expiring stale poll keys). */
export async function getJukeboxLiveViewerCount(communityId: number): Promise<number> {
  const now = Date.now();

  if (isUpstashRedisConfigured) {
    try {
      const sseKey = sseRedisKey(communityId);
      const pollKey = pollRedisKey(communityId);
      const sseRaw = await redis.get(sseKey);
      await redis.zremrangebyscore(pollKey, "-inf", now);
      const pollCard = await redis.zcard(pollKey);
      const sse =
        typeof sseRaw === "string"
          ? Math.max(0, parseInt(sseRaw, 10) || 0)
          : typeof sseRaw === "number"
            ? Math.max(0, sseRaw)
            : 0;
      const poll = typeof pollCard === "number" ? Math.max(0, pollCard) : 0;
      return sse + poll;
    } catch (e) {
      console.error("[jukeboxWatchers] get count:", e);
      return 0;
    }
  }

  const sse = Math.max(0, localSseByCommunity.get(communityId) ?? 0);
  const poll = localPollCountAfterPrune(communityId, now);
  return sse + poll;
}
