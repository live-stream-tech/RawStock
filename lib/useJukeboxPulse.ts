import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

export type JukeboxActiveSession = {
  communityId: number;
  communityName: string;
  trackTitle: string;
};

export type JukeboxRecruitingSession = {
  communityId: number;
  communityName: string;
};

export type JukeboxActiveSessionsResponse = {
  active: JukeboxActiveSession[];
  recruiting: JukeboxRecruitingSession[];
};

export type JukeboxPulse = {
  mode: "on_air" | "request_open" | "fallback";
  labelLine: string;
  trackLine: string;
  /** Navigation target for the banner (null in fallback mode) */
  targetCommunityId: number | null;
  /** Display name for UI (null in fallback mode) */
  communityName: string | null;
};

function pickIndex(len: number): number {
  if (len <= 0) return 0;
  return Math.floor(Math.random() * len);
}

function buildPulse(data: JukeboxActiveSessionsResponse | undefined): JukeboxPulse {
  const active = data?.active ?? [];
  if (active.length > 0) {
    const row = active[pickIndex(active.length)]!;
    return {
      mode: "on_air",
      labelLine: `ON AIR @ ${row.communityName}`,
      trackLine: row.trackTitle,
      targetCommunityId: row.communityId,
      communityName: row.communityName,
    };
  }
  const recruiting = data?.recruiting ?? [];
  if (recruiting.length > 0) {
    const row = recruiting[pickIndex(recruiting.length)]!;
    return {
      mode: "request_open",
      labelLine: "REQUEST OPEN",
      trackLine: "Waiting for your pick",
      targetCommunityId: row.communityId,
      communityName: row.communityName,
    };
  }
  return {
    mode: "fallback",
    labelLine: "JUKEBOX",
    trackLine: "Underground Session Mix Vol.7",
    targetCommunityId: null,
    communityName: null,
  };
}

/** Shared query key for the home jukebox banner; exported so mutations can invalidate it */
export const JUKEBOX_ACTIVE_SESSIONS_QUERY_KEY = ["/api/jukebox/active-sessions"] as const;

export function useJukeboxPulse() {
  const { data, dataUpdatedAt, isLoading, isError } = useQuery<JukeboxActiveSessionsResponse>({
    queryKey: JUKEBOX_ACTIVE_SESSIONS_QUERY_KEY,
    refetchInterval: 12_000,
    staleTime: 5_000,
  });

  const pulse = useMemo(() => buildPulse(data), [data, dataUpdatedAt]);

  return { pulse, isLoading, isError, raw: data };
}
