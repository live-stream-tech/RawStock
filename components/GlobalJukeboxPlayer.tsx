import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { usePathname, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { C } from "@/constants/colors";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { fetchJukeboxJson, makeJukeboxPollViewerId } from "@/lib/jukebox-presence";
import { navigateToUserOrLiverProfile } from "@/lib/navigate-profile";
import { JUKEBOX_ACTIVE_SESSIONS_QUERY_KEY } from "@/lib/useJukeboxPulse";
import { jukeboxElapsedSeconds } from "@/lib/jukeboxElapsed";
import { usePlayingVideo } from "@/lib/playing-video-context";
// NOTE: Audio playback is handled by the iframe API player inside NowPlaying on jukebox/[id].tsx.
// GJP only renders the mini-player chrome.

type JukeboxState = {
  communityId: number;
  currentVideoTitle: string | null;
  currentVideoThumbnail: string | null;
  currentVideoDurationSecs: number;
  currentVideoYoutubeId?: string | null;
  startedAt: string;
  isPlaying: boolean;
  watchersCount: number;
  elapsedSecs?: number;
};

type QueueItem = {
  id: number;
  videoTitle: string;
  videoThumbnail: string;
  videoDurationSecs: number;
  youtubeId?: string | null;
  addedBy: string;
  addedByAvatar: string | null;
  addedByUserId?: number | null;
  isPlayed: boolean;
};

type ChatMsg = {
  id: number;
  username: string;
  avatar: string | null;
  message: string;
  createdAt: string;
};

type JukeboxData = {
  state: JukeboxState | null;
  queue: QueueItem[];
  chat: ChatMsg[];
};

function parseCommunityId(pathname: string | null): number | null {
  if (!pathname) return null;
  const jb = pathname.match(/^\/jukebox\/(\d+)/);
  if (jb) return parseInt(jb[1], 10);
  const cm = pathname.match(/^\/community\/(\d+)/);
  if (cm) return parseInt(cm[1], 10);
  return null;
}

// ============================================================
// GlobalJukeboxPlayer — mini-player UI only (audio: see jukebox/[id] NowPlaying)
// ============================================================
export function GlobalJukeboxPlayer() {
  const pathname = usePathname();
  const { setJukeboxIsActive, setJukeboxCommunityId } = usePlayingVideo();
  const [communityId, setCommunityId] = useState<number | null>(() =>
    parseCommunityId(pathname)
  );
  const [dismissed, setDismissed] = useState(true);
  const [elapsedDisplay, setElapsedDisplay] = useState(0);

  const isOnJukeboxPage = pathname?.match(/^\/jukebox\/\d+/) != null;

  useEffect(() => {
    const next = parseCommunityId(pathname);
    if (next !== null) {
      const isJukebox = pathname?.match(/^\/jukebox\/\d+/) != null;
      setCommunityId((prev) => {
        if (isJukebox && prev !== null && prev !== next) {
          setDismissed(true);
          return next;
        }
        if (isJukebox) return next;
        if (prev === null) return next;
        return prev;
      });
    }
  }, [pathname]);

  const qc = useQueryClient();

  // SSE live updates (web only; skip on jukebox route to avoid duplicate connections)
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!communityId) return;
    if (isOnJukeboxPage) return; // jukebox page already opens its own SSE stream

    const baseUrl = getApiUrl().replace(/\/$/, "");
    const sseUrl = `${baseUrl}/api/jukebox/${communityId}/stream`;
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;
    let retryCount = 0;
    const connect = () => {
      if (closed) return;
      es = new EventSource(sseUrl);
      es.addEventListener("state_update", (e: MessageEvent) => {
        try {
          retryCount = 0;
          const payload = JSON.parse(e.data) as { data: JukeboxState };
          qc.setQueryData<JukeboxData>([`/api/jukebox/${communityId}`], (prev) =>
            prev
              ? {
                  ...prev,
                  state: prev.state ? { ...prev.state, ...payload.data } : payload.data,
                }
              : prev
          );
        } catch {}
      });
      es.addEventListener("queue_update", (e: MessageEvent) => {
        try {
          retryCount = 0;
          const payload = JSON.parse(e.data) as { data: QueueItem[] };
          qc.setQueryData<JukeboxData>([`/api/jukebox/${communityId}`], (prev) =>
            prev ? { ...prev, queue: payload.data } : prev
          );
        } catch {}
      });
      es.onerror = () => {
        es?.close();
        if (!closed) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
          retryCount++;
          retryTimer = setTimeout(connect, delay);
        }
      };
    };

    connect();
    return () => {
      closed = true;
      es?.close();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [communityId, isOnJukeboxPage, qc]);

  const jukeboxPollViewerId = useMemo(
    () => (Platform.OS === "web" ? null : makeJukeboxPollViewerId()),
    []
  );

  const { data } = useQuery<JukeboxData>({
    queryKey: communityId ? [`/api/jukebox/${communityId}`] : ["jukebox:none"],
    enabled: !!communityId,
    queryFn: () => fetchJukeboxJson<JukeboxData>(communityId!, jukeboxPollViewerId),
    staleTime: 0,
    refetchInterval: (query) =>
      (query.state.data as JukeboxData)?.state?.isPlaying ? 10000 : 30000,
  });

  const nextMutation = useMutation({
    mutationFn: async () => {
      if (!communityId) return;
      await apiRequest("POST", `/api/jukebox/${communityId}/next`);
    },
    onSuccess: () => {
      if (!communityId) return;
      qc.invalidateQueries({ queryKey: [`/api/jukebox/${communityId}`] });
      qc.invalidateQueries({ queryKey: JUKEBOX_ACTIVE_SESSIONS_QUERY_KEY });
    },
  });

  const state = data?.state ?? null;
  const queue = data?.queue ?? [];

  // Tick elapsed display every second while playing
  useEffect(() => {
    if (!state) return;
    const calcElapsed = () => {
      const base = jukeboxElapsedSeconds(state);
      const dur = state.currentVideoDurationSecs ?? 0;
      return dur > 0 ? Math.min(base, dur) : base;
    };
    setElapsedDisplay(calcElapsed());
    if (state.isPlaying) {
      const iv = setInterval(() => setElapsedDisplay(calcElapsed()), 1000);
      return () => clearInterval(iv);
    }
  }, [state]);

  const handleNext = useCallback(() => {
    nextMutation.mutate();
  }, [nextMutation]);
  const handleNextRef = useRef(handleNext);
  handleNextRef.current = handleNext;

  // Leaving jukebox page while playing → show mini player again
  const hasVisitedJukeboxRef = useRef(isOnJukeboxPage);
  const prevIsOnJukeboxPageRef = useRef(isOnJukeboxPage);
  useEffect(() => {
    if (isOnJukeboxPage) hasVisitedJukeboxRef.current = true;
    const wasOnJukebox = prevIsOnJukeboxPageRef.current;
    prevIsOnJukeboxPageRef.current = isOnJukeboxPage;
    if (wasOnJukebox && !isOnJukeboxPage && state?.isPlaying) {
      setDismissed(false);
    }
  }, [isOnJukeboxPage, state?.isPlaying]);

  // Playback ended → hide mini player
  const prevIsPlayingRef = useRef(state?.isPlaying);
  useEffect(() => {
    const wasPlaying = prevIsPlayingRef.current;
    prevIsPlayingRef.current = state?.isPlaying;
    if (wasPlaying && !state?.isPlaying && !state?.currentVideoTitle) {
      setDismissed(true);
    }
  }, [state?.isPlaying, state?.currentVideoTitle]);

  // Mirror jukeboxIsActive into playing-video context
  useEffect(() => {
    const isActive = !dismissed && !isOnJukeboxPage && !!state?.isPlaying;
    setJukeboxIsActive(isActive);
  }, [dismissed, isOnJukeboxPage, state?.isPlaying, setJukeboxIsActive]);

  // Mirror communityId for home jukebox banner navigation
  useEffect(() => {
    setJukeboxCommunityId(communityId);
  }, [communityId, setJukeboxCommunityId]);

  // Nothing to render without a resolved community id
  if (!communityId) return null;
  if (!state) return null;

  // Hide mini player while on the full jukebox screen
  if (isOnJukeboxPage) {
    return null;
  }

  const fallbackElapsed = jukeboxElapsedSeconds(state);
  const elapsedRaw = state.isPlaying ? (elapsedDisplay || fallbackElapsed) : fallbackElapsed;
  const safeRaw = Number.isFinite(elapsedRaw) ? elapsedRaw : 0;
  const dur = state.currentVideoDurationSecs ?? 0;
  const elapsed = dur > 0 ? Math.min(safeRaw, dur) : safeRaw;
  const progress = dur > 0 ? Math.min(elapsed / dur, 1) : 0;

  const nextQueueItem = queue.find((q) => !q.isPlayed);
  const addedBy = nextQueueItem?.addedBy ?? "";

  if (dismissed) {
    return null;
  }

  // Avoid full-screen wrappers (can swallow touches on web); only the bar width is interactive.
  return (
    <View pointerEvents="box-none" style={styles.root}>
      <View style={styles.bar}>
        {/* Progress strip (top of bar) */}
        <View style={styles.barProgress}>
          <View style={[styles.barProgressFill, { width: `${progress * 100}%` as any }]} />
        </View>

        <View style={styles.barRow}>
          {/* Thumbnail */}
          <Pressable
            style={styles.barThumbWrap}
            onPress={() => router.push(`/jukebox/${communityId}`)}
          >
            {state.currentVideoThumbnail ? (
              <Image
                source={{ uri: state.currentVideoThumbnail }}
                style={styles.barThumb}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.barThumb, { backgroundColor: C.surface3 }]}>
                <Ionicons name="musical-notes" size={16} color={C.accent} />
              </View>
            )}
          </Pressable>

          {/* Title / meta */}
          <Pressable
            style={styles.barInfo}
            onPress={() => router.push(`/jukebox/${communityId}`)}
          >
            <Text style={styles.barTitle} numberOfLines={1}>
              {state.currentVideoTitle ?? "Watch party"}
            </Text>
            {addedBy ? (
              <Pressable
                onPress={() =>
                  navigateToUserOrLiverProfile({
                    userId: nextQueueItem?.addedByUserId ?? null,
                    displayName: nextQueueItem?.addedByUserId ? null : addedBy,
                  })
                }
                hitSlop={4}
              >
                <Text style={styles.barSubtitle} numberOfLines={1}>
                  {addedBy} picked this track
                </Text>
              </Pressable>
            ) : null}
          </Pressable>

          {/* Open jukebox room */}
          <Pressable
            style={styles.barIconBtn}
            onPress={() => router.push(`/jukebox/${communityId}`)}
          >
            <Ionicons name="musical-notes" size={18} color={C.accent} />
          </Pressable>

          {/* Dismiss */}
          <Pressable
            style={styles.barIconBtn}
            onPress={() => {
              setDismissed(true);
            }}
          >
            <Ionicons name="close" size={18} color={C.textSec} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 68,
    zIndex: 1000,
    pointerEvents: "box-none",
  },
  bar: {
    backgroundColor: "rgba(18,18,18,0.97)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 20,
    overflow: "hidden",
  },
  barProgress: {
    height: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    width: "100%",
  },
  barProgressFill: {
    height: "100%",
    backgroundColor: C.accent,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  barThumbWrap: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: C.surface2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  barThumb: {
    width: "100%",
    height: "100%",
  },
  barInfo: {
    flex: 1,
    gap: 2,
  },
  barTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: "700",
  },
  barSubtitle: {
    color: C.textMuted,
    fontSize: 11,
  },
  barIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
