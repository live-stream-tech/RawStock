import { router } from "expo-router";
import { apiRequest } from "@/lib/query-client";

/** ユーザー／ライバープロフィールへ遷移（ID が無い場合は表示名で API 解決）。 */
export function navigateToUserOrLiverProfile(opts: {
  userId?: number | null;
  liverId?: number | null;
  displayName?: string | null;
}): void {
  const uid = opts.userId;
  const lid = opts.liverId;
  if (typeof uid === "number" && uid > 0) {
    router.push(`/user/${uid}`);
    return;
  }
  if (typeof lid === "number" && lid > 0) {
    router.push(`/livers/${lid}`);
    return;
  }
  const name = opts.displayName?.trim();
  if (!name) return;
  void apiRequest("GET", `/api/profile/by-name/${encodeURIComponent(name)}`)
    .then((res) => res.json())
    .then((j: { type: "user" | "liver"; id: number }) => {
      if (j?.type === "user") router.push(`/user/${j.id}`);
      else if (j?.type === "liver") router.push(`/livers/${j.id}`);
    })
    .catch(() => {});
}

/** 動画・タイムライン行の creatorType / creatorId / creator 名。 */
export function navigateFromVideoCreatorRow(video: {
  creator?: string | null;
  creatorType?: string | null;
  creatorId?: number | null;
}): void {
  const type = video.creatorType;
  const cid = video.creatorId;
  if (type === "user" && typeof cid === "number" && cid > 0) {
    router.push(`/user/${cid}`);
    return;
  }
  if (type === "liver" && typeof cid === "number" && cid > 0) {
    router.push(`/livers/${cid}`);
    return;
  }
  navigateToUserOrLiverProfile({ displayName: video.creator ?? null });
}
