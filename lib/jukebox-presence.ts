import { Platform } from "react-native";
import { fetch } from "expo/fetch";
import { getApiUrl, readAuthToken, throwIfResNotOk } from "./query-client";

const WEB_VIEWER_STORAGE_KEY = "rawstock_jukebox_viewer_v1";

function isLikelyValidViewerId(raw: string): boolean {
  return /^[a-zA-Z0-9_-]{8,64}$/.test(raw);
}

/**
 * Stable per-tab viewer id for jukebox presence (`?viewer=` on GET + SSE).
 * Web: persisted in sessionStorage. Native: new id each call — memoize at the call site with `useMemo`.
 */
export function getOrCreateJukeboxViewerSessionId(): string {
  if (Platform.OS === "web" && typeof globalThis.sessionStorage !== "undefined") {
    try {
      const existing = sessionStorage.getItem(WEB_VIEWER_STORAGE_KEY);
      if (existing && isLikelyValidViewerId(existing)) return existing;
      const created = makeJukeboxPollViewerId();
      sessionStorage.setItem(WEB_VIEWER_STORAGE_KEY, created);
      return created;
    } catch {
      return makeJukeboxPollViewerId();
    }
  }
  return makeJukeboxPollViewerId();
}

/** Session id for JUKEBOX polling presence (`?viewer=`). */
export function makeJukeboxPollViewerId(): string {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch {
    /* ignore */
  }
  return `jv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 15)}`;
}

export async function fetchJukeboxJson<T>(communityId: number, pollViewerId: string | null): Promise<T> {
  const baseUrl = getApiUrl();
  const url = new URL(`/api/jukebox/${communityId}`, baseUrl);
  if (pollViewerId) url.searchParams.set("viewer", pollViewerId);
  const headers: Record<string, string> = {};
  const token = await readAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url.toString(), {
    credentials: "include",
    headers,
  });
  await throwIfResNotOk(res);
  return (await res.json()) as T;
}
