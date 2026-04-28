import { fetch } from "expo/fetch";
import { getApiUrl, readAuthToken, throwIfResNotOk } from "./query-client";

/** Session id for JUKEBOX polling presence (`?viewer=`); not used when the client only uses SSE. */
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
