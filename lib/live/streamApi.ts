import { Platform } from "react-native";

export function liveApiBase(): string {
  return Platform.OS === "web" ? "" : process.env.EXPO_PUBLIC_API_URL ?? "";
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
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to create stream");
  }
  const data = (await createRes.json()) as { id?: number; whipUrl?: string };
  if (typeof data.id !== "number" || !Number.isFinite(data.id)) {
    throw new Error("配信の作成に失敗しました（ID が取得できません）");
  }
  if (typeof data.whipUrl !== "string" || !data.whipUrl.trim()) {
    throw new Error("配信用 URL が取得できませんでした。Cloudflare Stream の設定を確認してください。");
  }
  return { id: data.id, whipUrl: data.whipUrl.trim() };
}

export async function apiStartLiveStream(streamId: number): Promise<void> {
  const API_BASE = liveApiBase();
  const res = await fetch(`${API_BASE}/api/stream/${streamId}/start`, {
    method: "POST",
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
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to end stream");
  }
}
