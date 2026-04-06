import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/query-client";

const AUTH_TOKEN_KEY = "auth_token";

/** Express の getAuthUser は Bearer JWT のみ見る。credentials だけでは未認証になる。 */
export async function liveAuthHeaders(
  base?: Record<string, string>,
): Promise<Record<string, string>> {
  const h = { ...(base ?? {}) };
  try {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (token) h.Authorization = `Bearer ${token}`;
  } catch {
    /* ignore */
  }
  return h;
}

/**
 * 配信 API のベース URL。`getApiUrl()` と揃える。
 * 相対パス `/api` だけだと、Expo のオリジン（例: :8080）で開いたときに API に届かない。
 * EXPO_PUBLIC_DOMAIN で API を別ホストにしている場合もずれないようにする。
 */
export function liveApiBase(): string {
  return getApiUrl().replace(/\/+$/, "");
}

export type LiveStreamVisibility = "public" | "followers" | "community";

export async function apiCreateLiveStream(
  title: string,
  opts?: { visibility?: LiveStreamVisibility; restrictedCommunityId?: number },
): Promise<{ id: number; whipUrl: string }> {
  const API_BASE = liveApiBase();
  const visibility = opts?.visibility ?? "public";
  const body: Record<string, unknown> = { title, visibility };
  if (visibility === "community" && opts?.restrictedCommunityId != null) {
    body.restrictedCommunityId = opts.restrictedCommunityId;
  }
  const createRes = await fetch(`${API_BASE}/api/stream/create`, {
    method: "POST",
    headers: await liveAuthHeaders({ "Content-Type": "application/json" }),
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!createRes.ok) {
    const err = (await createRes.json().catch(() => ({}))) as {
      error?: string;
      detail?: string;
      hint?: string;
    };
    const base = err.error ?? "Failed to create stream";
    const parts = [base];
    if (err.detail) parts.push(err.detail);
    if (err.hint) parts.push(err.hint);
    throw new Error(parts.join("\n\n"));
  }
  const data = (await createRes.json()) as { id?: number; whipUrl?: string };
  if (typeof data.id !== "number" || !Number.isFinite(data.id)) {
    throw new Error("Failed to create stream (missing id).");
  }
  if (typeof data.whipUrl !== "string" || !data.whipUrl.trim()) {
    throw new Error(
      "Missing WHIP publish URL. Check Cloudflare Stream is enabled and the live input returns WebRTC.",
    );
  }
  return { id: data.id, whipUrl: data.whipUrl.trim() };
}

export async function apiStartLiveStream(streamId: number): Promise<void> {
  const API_BASE = liveApiBase();
  const res = await fetch(`${API_BASE}/api/stream/${streamId}/start`, {
    method: "POST",
    headers: await liveAuthHeaders(),
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to start stream");
  }
}

export async function apiEndLiveStream(streamId: number): Promise<void> {
  const API_BASE = liveApiBase();
  const res = await fetch(`${API_BASE}/api/stream/${streamId}/end`, {
    method: "POST",
    headers: await liveAuthHeaders(),
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to end stream");
  }
}
