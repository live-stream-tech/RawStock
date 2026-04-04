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
  /** バナー表示に対応する遷移先（フォールバック時は null） */
  targetCommunityId: number | null;
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
    };
  }
  const recruiting = data?.recruiting ?? [];
  if (recruiting.length > 0) {
    const row = recruiting[pickIndex(recruiting.length)]!;
    return {
      mode: "request_open",
      labelLine: "REQUEST OPEN",
      trackLine: "あなたの選曲を待っています",
      targetCommunityId: row.communityId,
    };
  }
  return {
    mode: "fallback",
    labelLine: "JUKEBOX",
    trackLine: "Underground Session Mix Vol.7",
    targetCommunityId: null,
  };
}

const PULSE_QUERY_KEY = ["/api/jukebox/active-sessions"] as const;

export function useJukeboxPulse() {
  const { data, dataUpdatedAt, isLoading, isError } = useQuery<JukeboxActiveSessionsResponse>({
    queryKey: PULSE_QUERY_KEY,
    refetchInterval: 20_000,
    staleTime: 10_000,
  });

  const pulse = useMemo(() => buildPulse(data), [data, dataUpdatedAt]);

  return { pulse, isLoading, isError, raw: data };
}
