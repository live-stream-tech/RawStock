import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  Platform,
  Alert,
  Animated,
  Dimensions,
  useWindowDimensions,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { scrollShowsHorizontal, scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { C } from "@/constants/colors";
import { apiRequest, ApiError, formatUserFacingApiError, getApiUrl } from "@/lib/query-client";
import { navigateToUserOrLiverProfile } from "@/lib/navigate-profile";
import { useAuth } from "@/lib/auth";
import { JUKEBOX_ACTIVE_SESSIONS_QUERY_KEY } from "@/lib/useJukeboxPulse";
import { saveLoginReturn } from "@/lib/login-return";
import { HorizontalScroll } from "@/components/HorizontalScroll";
import { TranslateButton } from "@/components/TranslateButton";
import { webScrollStyle } from "@/constants/layout";
import { jukeboxElapsedSeconds } from "@/lib/jukeboxElapsed";
import { fetchJukeboxJson, makeJukeboxPollViewerId } from "@/lib/jukebox-presence";

type JukeboxState = {
  communityId: number;
  currentVideoId?: number | null;
  currentVideoTitle: string | null;
  currentVideoThumbnail: string | null;
  currentVideoDurationSecs: number;
  currentVideoYoutubeId?: string | null;
  startedAt: string;
  isPlaying: boolean;
  watchersCount: number;
  /** Server-calculated elapsed seconds (playback position). */
  elapsedSecs?: number;
};

type QueueItem = {
  id: number;
  videoId?: number | null;
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

type Video = {
  id: number;
  title: string;
  thumbnail: string;
  duration: string;
  category: string;
  price?: number | null;
};

/** Accepts watch/embed/shorts/live URLs, youtu.be, m.youtube.com, or a bare 11-char video id (common on mobile paste). */
function extractYouTubeId(raw: string): string | null {
  const input = raw.trim();
  if (!input) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

  try {
    const u = new URL(input);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be") {
      const seg = u.pathname.replace(/^\//, "").split("/")[0];
      return seg && /^[a-zA-Z0-9_-]{11}$/.test(seg) ? seg : null;
    }

    if (host === "m.youtube.com" || host.endsWith("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

      const parts = u.pathname.split("/").filter(Boolean);
      const shortsIdx = parts.indexOf("shorts");
      if (shortsIdx >= 0 && parts[shortsIdx + 1]) return parts[shortsIdx + 1];
      const liveIdx = parts.indexOf("live");
      if (liveIdx >= 0 && parts[liveIdx + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[liveIdx + 1])) {
        return parts[liveIdx + 1];
      }
      const embedIdx = parts.indexOf("embed");
      if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1];
    }
    return null;
  } catch {
    return null;
  }
}

function showJukeboxAlert(title: string, message?: string) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

function fmtSecs(s: number): string {
  if (!s || s <= 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function JukeboxChatListEmptyView() {
  return (
    <View style={jukeboxChatListEmptyStyles.wrap} accessible accessibilityLabel="No comments yet. Type below to post.">
      <Ionicons name="chatbubble-outline" size={30} color={C.textMuted} importantForAccessibility="no" />
      <Text style={jukeboxChatListEmptyStyles.title} importantForAccessibility="no">
        No comments yet
      </Text>
      <Text style={jukeboxChatListEmptyStyles.sub} importantForAccessibility="no">
        Type below to join the party
      </Text>
    </View>
  );
}

const jukeboxChatListEmptyStyles = StyleSheet.create({
  wrap: {
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: C.textMuted,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  sub: {
    color: C.textSec,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 15,
  },
});

/** On iPhone/iPad Safari (including PWA), avoid keyboard-driven layout shifts. */
function isIosLikeWebClient(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iP(hone|od|ad)/.test(ua)) return true;
  const nav = navigator as Navigator & { maxTouchPoints?: number };
  if (navigator.platform === "MacIntel" && (nav.maxTouchPoints ?? 0) > 1) return true;
  return false;
}

/**
 * NowPlaying: YouTube IFrame API integrated player (audio + video, mute=0)
 * Switch tracks via loadVideoById() without audio interruption
 * iOS Safari: show tap overlay only on first interaction
 * Portrait: 16:9 height. Landscape: fullscreen.
 */
function NowPlaying({
  state,
  onAdvance,
  allowManualSkip = true,
  addModalOpen,
  embedInSidebarColumn,
  interactionResumeNonce = 0,
  communityLabel,
  onCommunityPress,
}: {
  state: JukeboxState | null;
  onAdvance: (source: "manual" | "ended") => void;
  /** When false, the Skip control is disabled (only the requester may skip). */
  allowManualSkip?: boolean;
  /** Add-video modal open — used to resume iframe after close (iOS WebKit often pauses background media). */
  addModalOpen?: boolean;
  /** Desktop 2-col: window may be "landscape" but player sits in a narrow column — use 16:9 box, not full-window fill. */
  embedInSidebarColumn?: boolean;
  /** Parent increments this to retry playback for backgrounded iframes. */
  interactionResumeNonce?: number;
  /** Community name/id for this jukebox (shown in playback overlay). */
  communityLabel?: string | null;
  onCommunityPress?: () => void;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [elapsedDisplay, setElapsedDisplay] = useState(0);
  const [screenW, setScreenW] = useState(() => Dimensions.get("window").width);
  const [screenH, setScreenH] = useState(() => Dimensions.get("window").height);
  const onAdvanceRef = useRef(onAdvance);
  onAdvanceRef.current = onAdvance;
  // iOS Safari requires a first tap; audio then persists across track changes.
  const [needsTap, setNeedsTap] = useState(true);
  /** When server is playing but WebKit reports PAUSED/CUED/UNSTARTED. */
  const [needsResumeTap, setNeedsResumeTap] = useState(false);
  // IFrame API player reference.
  const ytPlayerRef = useRef<any>(null);
  const ytContainerIdRef = useRef<string>(`jb-yt-${Math.random().toString(36).slice(2)}`);
  const stateRef = useRef<JukeboxState | null>(state);
  stateRef.current = state;
  /** Auto tryResume only after user has interacted once (iOS autoplay policy). */
  const hasUserInteractedRef = useRef(false);
  const lastThrottleMsRef = useRef(0);

  const runTryResumeCore = useCallback(() => {
    if (Platform.OS !== "web") return;
    if (!hasUserInteractedRef.current) return;
    const s = stateRef.current;
    if (!s?.isPlaying || !s?.currentVideoYoutubeId) return;
    const player = ytPlayerRef.current;
    if (!player) return;
    try {
      player.unMute?.();
      player.setVolume?.(100);
      const ps = typeof player.getPlayerState === "function" ? player.getPlayerState() : undefined;
      const w = window as any;
      const PLAYING = w.YT?.PlayerState?.PLAYING ?? 1;
      if (ps !== PLAYING) {
        player.playVideo?.();
      }
    } catch {
      /* noop */
    }
  }, []);

  const scheduleTryResume = useCallback(() => {
    if (Platform.OS !== "web") return;
    setTimeout(runTryResumeCore, 50);
  }, [runTryResumeCore]);

  const throttledScheduleTryResume = useCallback(() => {
    const now = Date.now();
    if (now - lastThrottleMsRef.current < 200) return;
    lastThrottleMsRef.current = now;
    scheduleTryResume();
  }, [scheduleTryResume]);

  // Track viewport size changes.
  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => {
      setScreenW(window.width);
      setScreenH(window.height);
    });
    return () => sub?.remove();
  }, []);

  // Update displayed elapsed time every second while playing.
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

  // Pulse animation for LIVE label.
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => { pulse.stop(); };
  }, [pulseAnim]);

  // Initialize YouTube IFrame API player and handle track switching.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!state?.currentVideoYoutubeId) return;

    const startSec =
      state.elapsedSecs && state.elapsedSecs > 0
        ? state.elapsedSecs
        : jukeboxElapsedSeconds(state);

    function ensureYouTubeApi(): Promise<any> {
      return new Promise((resolve) => {
        const w = window as any;
        if (w.YT && w.YT.Player) { resolve(w.YT); return; }
        const prev = w.onYouTubeIframeAPIReady;
        w.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve(w.YT); };
        if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
          const tag = document.createElement('script');
          tag.src = 'https://www.youtube.com/iframe_api';
          document.body.appendChild(tag);
        }
      });
    }

    let cancelled = false;
    ensureYouTubeApi().then((YT: any) => {
      if (cancelled) return;
      if (ytPlayerRef.current) {
        // Track switch: use loadVideoById without destroying player.
        try {
          ytPlayerRef.current.loadVideoById({
            videoId: state.currentVideoYoutubeId,
            startSeconds: Math.floor(startSec),
          });
          ytPlayerRef.current.unMute?.();
          ytPlayerRef.current.setVolume?.(100);
        } catch {
          try { ytPlayerRef.current.destroy(); } catch {}
          ytPlayerRef.current = null;
        }
      }
      if (!ytPlayerRef.current) {
        // Create player instance.
        const containerId = ytContainerIdRef.current;
        ytPlayerRef.current = new YT.Player(containerId, {
          videoId: state.currentVideoYoutubeId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            mute: 0,
            controls: 0,
            rel: 0,
            disablekb: 1,
            playsinline: 1,
            start: Math.floor(startSec),
          },
          events: {
            onReady: (event: any) => {
              if (cancelled) return;
              try {
                event.target?.unMute?.();
                event.target?.setVolume?.(100);
                event.target?.playVideo?.();
                setNeedsTap(false); // Autoplay succeeded (Android/Desktop)
              } catch {}
            },
            onStateChange: (event: any) => {
              try {
                const w = window as any;
                const YT = w.YT;
                if (!YT?.PlayerState) return;
                const ps = event.data;
                if (ps === YT.PlayerState.ENDED) {
                  onAdvanceRef.current("ended");
                  setNeedsResumeTap(false);
                  return;
                }
                if (ps === YT.PlayerState.PLAYING) {
                  hasUserInteractedRef.current = true;
                  setNeedsTap(false);
                  setNeedsResumeTap(false);
                  return;
                }
                const srv = stateRef.current;
                if (
                  srv?.isPlaying &&
                  srv?.currentVideoYoutubeId &&
                  (ps === YT.PlayerState.PAUSED ||
                    ps === YT.PlayerState.CUED ||
                    ps === YT.PlayerState.UNSTARTED)
                ) {
                  setNeedsResumeTap(true);
                }
              } catch {}
            },
          },
        });
      }
    }).catch(() => {});

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- loadVideoById handles in-player sync; avoid remounting on elapsed/startedAt ticks
  }, [state?.currentVideoYoutubeId]);

  // Destroy player on unmount.
  useEffect(() => {
    return () => {
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
      }
    };
  }, []);

  const prevAddModalOpen = useRef(!!addModalOpen);
  useEffect(() => {
    const wasOpen = prevAddModalOpen.current;
    prevAddModalOpen.current = !!addModalOpen;
    if (Platform.OS !== "web") return;
    if (wasOpen && !addModalOpen) {
      const t = setTimeout(() => scheduleTryResume(), 250);
      return () => clearTimeout(t);
    }
  }, [addModalOpen, scheduleTryResume]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const onResizeGroup = () => throttledScheduleTryResume();
    /** WebKit pauses easily on rotation — resume after a short delay (may need multiple tries) */
    const onOrientation = () => {
      throttledScheduleTryResume();
      setTimeout(() => scheduleTryResume(), 350);
      setTimeout(() => scheduleTryResume(), 800);
    };
    window.addEventListener("resize", onResizeGroup);
    window.addEventListener("orientationchange", onOrientation);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onResizeGroup);
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      scheduleTryResume();
      setTimeout(scheduleTryResume, 120);
      setTimeout(scheduleTryResume, 300);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("resize", onResizeGroup);
      window.removeEventListener("orientationchange", onOrientation);
      vv?.removeEventListener("resize", onResizeGroup);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [scheduleTryResume, throttledScheduleTryResume]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (interactionResumeNonce <= 0) return;
    if (!stateRef.current?.isPlaying) return;
    const t = setTimeout(() => scheduleTryResume(), 280);
    return () => clearTimeout(t);
  }, [interactionResumeNonce, scheduleTryResume]);

  useEffect(() => {
    if (!state?.isPlaying) setNeedsResumeTap(false);
  }, [state?.isPlaying]);

  useEffect(() => {
    setNeedsResumeTap(false);
  }, [state?.currentVideoYoutubeId]);

  // iOS Safari: first audio start tied to user gesture.
  const handleTapToUnmute = useCallback(() => {
    hasUserInteractedRef.current = true;
    runTryResumeCore();
    setNeedsTap(false);
  }, [runTryResumeCore]);

  const handleResumePlaybackTap = useCallback(() => {
    hasUserInteractedRef.current = true;
    runTryResumeCore();
    setNeedsResumeTap(false);
  }, [runTryResumeCore]);

  // Portrait: 16:9. Landscape: fullscreen. Sidebar embed: always 16:9 box.
  const isLandscape = !embedInSidebarColumn && screenW > screenH;
  const videoAreaH = isLandscape ? screenH : Math.round(screenW * 9 / 16);
  const videoStyle = embedInSidebarColumn
    ? ({ width: "100%", aspectRatio: 16 / 9 } as const)
    : isLandscape
      ? StyleSheet.absoluteFillObject
      : { height: videoAreaH };

  if (!state) {
    return (
      <View style={[styles.nowPlayingEmpty, videoStyle]}>
        <Ionicons name="musical-notes-outline" size={40} color={C.textMuted} />
        {communityLabel ? (
          <Text style={styles.nowPlayingEmptyCommunity} numberOfLines={2}>
            {communityLabel}
          </Text>
        ) : null}
        <Text style={styles.emptyText}>No video playing</Text>
      </View>
    );
  }

  const fallbackElapsed = jukeboxElapsedSeconds(state);
  const elapsedRaw = state.isPlaying ? (elapsedDisplay || fallbackElapsed) : fallbackElapsed;
  const safeRaw = Number.isFinite(elapsedRaw) ? elapsedRaw : 0;
  const dur = state.currentVideoDurationSecs ?? 0;
  const elapsed = dur > 0 ? Math.min(safeRaw, dur) : safeRaw;
  const progress =
    dur > 0 ? Math.min(elapsed / dur, 1) : 0;

  return (
    <View style={[styles.nowPlaying, videoStyle]}>
      {/* YouTube IFrame API player container (audio + video) */}
      {Platform.OS === "web" && state?.currentVideoYoutubeId ? (
        <View
          nativeID={ytContainerIdRef.current}
          collapsable={false}
          style={StyleSheet.absoluteFillObject}
        />
      ) : state?.currentVideoThumbnail ? (
        <Image source={{ uri: state.currentVideoThumbnail }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      ) : null}
      {/* iOS/WebKit: first-audio start or resume while server is playing */}
      {Platform.OS === "web" && state?.currentVideoYoutubeId && needsTap ? (
        <Pressable
          style={styles.audioOverlay}
          onPress={handleTapToUnmute}
          accessibilityLabel="Tap to enable audio"
        >
          <View style={styles.audioOverlayInnerColumn}>
            <Ionicons name="volume-mute" size={22} color="#fff" />
            <Text style={styles.audioOverlayText}>Tap to enable audio</Text>
            <Text style={styles.audioOverlayHint}>Required on iPhone and Safari</Text>
          </View>
        </Pressable>
      ) : null}
      {Platform.OS === "web" && state?.currentVideoYoutubeId && !needsTap && needsResumeTap ? (
        <Pressable
          style={styles.audioOverlay}
          onPress={handleResumePlaybackTap}
          accessibilityLabel="Tap to resume playback"
        >
          <View style={styles.audioOverlayInnerColumn}>
            <Ionicons name="play-circle" size={28} color="#fff" />
            <Text style={styles.audioOverlayText}>Playback stopped</Text>
            <Text style={styles.audioOverlayHint}>Tap to resume</Text>
          </View>
        </Pressable>
      ) : null}
      {/* Bottom overlay: title, progress, skip */}
      <View style={styles.nowPlayingTop}>
        <View style={styles.liveChip}>
          <Animated.View style={[styles.liveChipDot, { transform: [{ scale: pulseAnim }] }]} />
          <Text style={styles.liveChipText}>Watching Together</Text>
        </View>
        <View style={styles.watchersChip}>
          <Ionicons name="people" size={12} color="#fff" />
          <Text style={styles.watchersText}>{state.watchersCount}</Text>
        </View>
      </View>

      <View style={styles.nowPlayingBottom}>
        {communityLabel ? (
          <Pressable
            onPress={onCommunityPress}
            disabled={!onCommunityPress}
            hitSlop={{ top: 4, bottom: 4 }}
            style={styles.nowPlayingCommunityPressable}
          >
            <Ionicons name="people-outline" size={11} color="rgba(255,255,255,0.75)" />
            <Text style={styles.nowPlayingCommunityLine} numberOfLines={1}>
              {communityLabel}
            </Text>
          </Pressable>
        ) : null}
        <Text style={styles.nowPlayingTitle} numberOfLines={2}>
          {state.currentVideoTitle ?? ""}
        </Text>

        <View style={styles.progressRow}>
          <Text style={styles.progressTime}>{fmtSecs(elapsed)}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
            <View style={[styles.progressThumb, { left: `${progress * 100}%` as any }]} />
          </View>
          <Text style={styles.progressTime}>{fmtSecs(state.currentVideoDurationSecs)}</Text>
        </View>

        <View style={styles.nextRow}>
          <Pressable
            style={[styles.nextBtn, !allowManualSkip && styles.nextBtnDisabled]}
            onPress={() => {
              if (!allowManualSkip) return;
              hasUserInteractedRef.current = true;
              onAdvance("manual");
            }}
            disabled={!allowManualSkip}
            accessibilityRole="button"
            accessibilityLabel={allowManualSkip ? "Skip to next track" : "Skip unavailable"}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="play-skip-forward" size={16} color={C.textMuted} />
            <Text style={[styles.nextBtnText, !allowManualSkip && styles.nextBtnTextDisabled]}>Skip</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function QueueRow({
  items,
  state,
  onAdd,
  userName,
  userId,
  onDelete,
  variant = "horizontal",
  showAddInHeader = false,
}: {
  items: QueueItem[];
  state: JukeboxState | null;
  onAdd: () => void;
  userName?: string | null;
  userId?: number | null;
  onDelete?: (id: number) => void;
  variant?: "horizontal" | "vertical";
  showAddInHeader?: boolean;
}) {
  // Exclude played and currently-playing tracks from queue display.
  const upcoming = items.filter(
    (q) =>
      !q.isPlayed &&
      !(state?.currentVideoId != null && q.videoId === state.currentVideoId) &&
      !(state?.currentVideoYoutubeId && (q.youtubeId ?? null) === state.currentVideoYoutubeId)
  );
  const isVertical = variant === "vertical";

  const itemNodes = upcoming.map((item) => {
    const canDeleteOwnRequest =
      !!onDelete &&
      ((userId != null && item.addedByUserId != null && item.addedByUserId === userId) ||
        (!!userName && item.addedBy === userName));
    return (
    isVertical ? (
      <View key={item.id} style={styles.queueItemVertical}>
        <Image source={{ uri: item.videoThumbnail }} style={styles.queueThumbVertical} contentFit="cover" />
        <View style={styles.queueItemVerticalBody}>
          <Text style={styles.queueItemTitleVertical} numberOfLines={2}>
            {item.videoTitle}
          </Text>
          <View style={styles.queueItemVerticalMeta}>
            {item.addedByAvatar ? (
              <Pressable
                onPress={() =>
                  navigateToUserOrLiverProfile({
                    userId: item.addedByUserId ?? null,
                    displayName: item.addedByUserId ? null : item.addedBy,
                  })
                }
                hitSlop={4}
              >
                <Image source={{ uri: item.addedByAvatar }} style={styles.queueItemAvatar} contentFit="cover" />
              </Pressable>
            ) : null}
            <Text style={styles.queueItemByVertical}>{item.addedBy}</Text>
          </View>
        </View>
        {canDeleteOwnRequest ? (
          <Pressable onPress={() => onDelete(item.id)} style={styles.queueItemDeleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={16} color="#fff" />
          </Pressable>
        ) : null}
      </View>
    ) : (
      <View key={item.id} style={styles.queueItem}>
        {canDeleteOwnRequest ? (
          <Pressable
            onPress={() => onDelete(item.id)}
            style={{ position: "absolute", top: 4, right: 4, zIndex: 20, elevation: 20, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 10, padding: 2 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={14} color="#fff" />
          </Pressable>
        ) : null}
        <Image source={{ uri: item.videoThumbnail }} style={styles.queueThumb} contentFit="cover" />
        <View style={styles.queueItemOverlay} />
        <Text style={styles.queueItemTitle} numberOfLines={2}>
          {item.videoTitle}
        </Text>
        <View style={styles.queueItemByRow}>
          {item.addedByAvatar ? (
            <Pressable
              onPress={() =>
                navigateToUserOrLiverProfile({
                  userId: item.addedByUserId ?? null,
                  displayName: item.addedByUserId ? null : item.addedBy,
                })
              }
              hitSlop={4}
            >
              <Image source={{ uri: item.addedByAvatar }} style={styles.queueItemAvatar} contentFit="cover" />
            </Pressable>
          ) : null}
          <Text style={styles.queueItemBy}>{item.addedBy}</Text>
        </View>
      </View>
    )
  );
  });

  return (
    <View style={[styles.queueSection, isVertical && styles.queueSectionVertical]}>
      <View style={[styles.queueHeader, showAddInHeader && styles.queueHeaderWithAdd]}>
        <Ionicons name="list" size={14} color={C.accent} />
        <Text style={styles.queueHeaderText}>UP NEXT</Text>
        <Text style={styles.queueCount}>{upcoming.length}</Text>
        {showAddInHeader ? (
          <Pressable
            style={styles.queueAddHeaderBtn}
            onPress={onAdd}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            accessibilityRole="button"
            accessibilityLabel="Add video to queue"
          >
            <Ionicons name="add" size={16} color={C.accent} />
            <Text style={styles.queueAddHeaderText}>Add</Text>
          </Pressable>
        ) : null}
      </View>
      {isVertical ? (
        <ScrollView
          style={webScrollStyle(styles.queueVerticalScroll)}
          showsVerticalScrollIndicator={scrollShowsVertical}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.queueVerticalContent}
        >
          {upcoming.length === 0 ? (
            <Pressable
              onPress={onAdd}
              style={styles.queueEmptyVertical}
              accessibilityRole="button"
              accessibilityLabel="Queue is empty. Add a video."
            >
              <Ionicons name="add-circle-outline" size={36} color={C.accent} />
              <Text style={styles.queueEmptyTitle}>Nothing queued yet</Text>
              <Text style={styles.queueEmptyHint}>Tap here or Add above</Text>
            </Pressable>
          ) : (
            itemNodes
          )}
        </ScrollView>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={scrollShowsHorizontal}
          keyboardShouldPersistTaps="always"
          nestedScrollEnabled
          contentContainerStyle={styles.queueScroll}
        >
          {upcoming.length === 0 ? (
            <Pressable
              onPress={onAdd}
              style={styles.queueEmptyHorizontal}
              accessibilityRole="button"
              accessibilityLabel="Queue is empty. Add a video."
            >
              <Ionicons name="add-circle-outline" size={32} color={C.accent} />
              <Text style={styles.queueEmptyTitleH}>Nothing queued yet</Text>
              <Text style={styles.queueEmptyHintH}>Tap or use Add above</Text>
            </Pressable>
          ) : (
            <>
              {itemNodes}
              {/* When header shows Add, omit trailing tile — horizontal ScrollView often steals taps on mobile */}
              {!showAddInHeader ? (
                <Pressable
                  style={styles.addQueueBtn}
                  onPress={onAdd}
                  hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                  accessibilityRole="button"
                  accessibilityLabel="Add video to queue"
                >
                  <Ionicons name="add" size={24} color={C.accent} />
                  <Text style={styles.addQueueText}>Add Video</Text>
                </Pressable>
              ) : null}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

export default function JukeboxScreen() {
  const { id, stationLabel } = useLocalSearchParams<{ id: string; stationLabel?: string }>();
  const communityId = parseInt(id ?? "1");
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const desktopAddScrollRef = useRef<ScrollView>(null);
  const { user } = useAuth();
  const { width: winW, height: winH } = useWindowDimensions();
  const isDesktopWebJukebox = Platform.OS === "web" && winW >= 900;
  const isLandscape = winW > winH && !isDesktopWebJukebox;
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const chatPanelAnim = useRef(new Animated.Value(0)).current;
  const [chatInput, setChatInput] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [ytUrl, setYtUrl] = useState("");
  const [ytQuery, setYtQuery] = useState("");
  const [ytResults, setYtResults] = useState<
    { videoId: string; title: string; thumbnail: string; durationSecs?: number }[]
  >([]);
  const [ytSearching, setYtSearching] = useState(false);
  const [ytPlaylists, setYtPlaylists] = useState<
    { id: string; title: string; thumbnail: string }[]
  >([]);
  const [ytPlaylistItems, setYtPlaylistItems] = useState<
    { videoId: string; title: string; thumbnail: string }[]
  >([]);
  const [ytPlaylistsLoading, setYtPlaylistsLoading] = useState(false);
  const [ytPlaylistsNeedGoogle, setYtPlaylistsNeedGoogle] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [interactionResumeNonce, setInteractionResumeNonce] = useState(0);

  /** Disable KAV inside Add modal to avoid iframe playback interruption. */
  const kavDisabledOnIosWeb = Platform.OS === "web" && isIosLikeWebClient();
  /**
   * Main layout (including chat): on wide web use height; on iPhone/iPad Safari use padding
   * to reduce layout jump when the virtual keyboard opens.
   */
  const jukeboxKeyboardBehavior: "padding" | "height" =
    Platform.OS === "web" && !kavDisabledOnIosWeb ? "height" : "padding";

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  // Track soft keyboard visibility to collapse queue row when keyboard is open,
  // freeing vertical space so the comment input stays above the keyboard.
  const [keyboardShown, setKeyboardShown] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardShown(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardShown(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // Landscape chat panel animation.
  useEffect(() => {
    Animated.spring(chatPanelAnim, {
      toValue: chatPanelOpen ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [chatPanelOpen, chatPanelAnim]);

  const jukeboxKey = useMemo(() => [`/api/jukebox/${communityId}`] as const, [communityId]);

  const jukeboxPollViewerId = useMemo(
    () => (Platform.OS === "web" ? null : makeJukeboxPollViewerId()),
    []
  );

  const { data: communityRow } = useQuery<{ id: number; name: string }>({
    queryKey: [`/api/communities/${communityId}`],
    enabled: Number.isFinite(communityId) && communityId > 0,
    throwOnError: false,
  });

  const communityDisplayName =
    (stationLabel && String(stationLabel).trim()) ||
    (communityRow?.name && String(communityRow.name).trim()) ||
    `Community #${communityId}`;

  // Always fetch fresh data on visit; avoid stale cache.
  const { data } = useQuery<JukeboxData>({
    queryKey: jukeboxKey,
    queryFn: () => fetchJukeboxJson<JukeboxData>(communityId, jukeboxPollViewerId),
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  // Real-time updates via SSE stream.
  useEffect(() => {
    if (Platform.OS !== "web") return; // Native falls back to polling.
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
          qc.setQueryData<JukeboxData>(jukeboxKey, (prev) =>
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
          qc.setQueryData<JukeboxData>(jukeboxKey, (prev) =>
            prev ? { ...prev, queue: payload.data } : prev
          );
        } catch {}
      });

      es.addEventListener("chat", (e: MessageEvent) => {
        try {
          retryCount = 0;
          const payload = JSON.parse(e.data) as { data: ChatMsg };
          qc.setQueryData<JukeboxData>(jukeboxKey, (prev) => {
            if (!prev) return prev;
            const exists = prev.chat.some((c) => c.id === payload.data.id);
            if (exists) return prev;
            return { ...prev, chat: [...prev.chat, payload.data] };
          });
        } catch {}
      });

      es.onerror = () => {
        es?.close();
        if (!closed) {
          // Exponential backoff: 1 -> 2 -> 4 -> 8 -> 16 -> 30s max.
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
  }, [communityId, qc, jukeboxKey]);

  const { data: myVideos = [] } = useQuery<Video[]>({
    queryKey: ["/api/videos/my"],
    enabled: !!user,
  });

  const { data: ticketData, refetch: refetchTickets } = useQuery<{ balance: number }>({
    queryKey: ["/api/tickets/balance"],
    enabled: !!user,
  });

  const { data: reqCountData, refetch: refetchReqCount } = useQuery<{
    count: number;
    freeRemaining: number;
    freeLimit: number;
    ticketsPerRequest: number;
  }>({
    queryKey: [`/api/tickets/request-count?communityId=${communityId}`],
    enabled: !!user && !!communityId,
  });

  const freeRemaining = reqCountData?.freeRemaining ?? 20;
  const ticketsPerRequest = reqCountData?.ticketsPerRequest ?? 10;

  const state = data?.state ?? null;
  const queue = data?.queue ?? [];
  const chat = data?.chat ?? [];

  const currentPlayingQueueItem = useMemo(() => {
    const qList = data?.queue ?? [];
    if (!state?.isPlaying) return null;
    return (
      qList.find(
        (q) =>
          (state.currentVideoYoutubeId != null &&
            (q.youtubeId ?? null) === state.currentVideoYoutubeId) ||
          (state.currentVideoId != null && q.videoId === state.currentVideoId),
      ) ?? null
    );
  }, [state, data]);

  const canManualSkip = useMemo(() => {
    if (!state?.isPlaying || !user?.id) return false;
    if (!currentPlayingQueueItem) return false;
    return (
      currentPlayingQueueItem.addedByUserId != null &&
      currentPlayingQueueItem.addedByUserId === user.id
    );
  }, [state?.isPlaying, user?.id, currentPlayingQueueItem]);

  const uploadedVideos: Video[] = myVideos;
  const purchasedVideos: Video[] = (myVideos as any[]).filter((v) => v.price && v.price > 0);

  const chatMutation = useMutation({
    mutationFn: (msg: string) =>
      apiRequest("POST", `/api/jukebox/${communityId}/chat`, {
        username: user?.name ?? "Guest",
        avatar:
          user?.avatar ??
          "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=80&h=80&fit=crop",
        message: msg,
      }),
    onSuccess: () => {
      // Chat updates arrive via SSE; no invalidate needed.
      // Fallback: refetch when SSE is unavailable.
      if (Platform.OS !== "web") qc.invalidateQueries({ queryKey: jukeboxKey });
    },
    onError: (e: Error & { body?: string }) => {
      let detail = e.message ?? "メッセージ送信に失敗しました";
      try {
        if (e.body) {
          const j = JSON.parse(e.body) as { error?: string };
          if (j.error) detail = j.error;
        }
      } catch {
        /* keep detail */
      }
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert(detail);
      } else {
        Alert.alert("Comment", detail);
      }
    },
  });

  const nextMutation = useMutation({
    mutationFn: ({ source }: { source: "manual" | "ended" }) =>
      apiRequest("POST", `/api/jukebox/${communityId}/next`, { source }),
    onSuccess: () => {
      // Refetch on web too — POST and SSE may hit different instances on Vercel, so EventEmitter misses updates
      qc.invalidateQueries({ queryKey: jukeboxKey });
      qc.invalidateQueries({ queryKey: JUKEBOX_ACTIVE_SESSIONS_QUERY_KEY });
    },
  });

  const addMutation = useMutation({
    mutationFn: async (video: Video) => {
      const currentFreeRemaining = reqCountData?.freeRemaining ?? 20;

      if (currentFreeRemaining > 0) {
        // Free request count is best-effort.
        // On some mobile sessions auth can expire while jukebox add itself is still allowed.
        // Do not block queue insertion when this tracking endpoint fails.
        try {
          await apiRequest("POST", "/api/tickets/record-free-request", { communityId });
        } catch (err) {
          if (!(err instanceof ApiError) || (err.status !== 401 && err.status !== 403)) {
            throw err;
          }
        }
      } else {
        // Paid request — deduct tickets first
        const currentBalance = ticketData?.balance ?? 0;
        if (currentBalance < ticketsPerRequest) {
          throw { code: "insufficient_tickets", balance: currentBalance, required: ticketsPerRequest };
        }
        const addRes = await apiRequest("POST", `/api/jukebox/${communityId}/add`, {
          videoId: video.id,
          videoTitle: video.title,
          videoThumbnail: video.thumbnail,
          videoDurationSecs: (video as any).durationSecs ?? 0,
          youtubeId: (video as any).youtubeId ?? null,
          addedBy: user?.name ?? "Guest",
          addedByAvatar: user?.avatar ?? "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=80&h=80&fit=crop",
        });
        const item = await addRes.json();
        await apiRequest("POST", "/api/tickets/spend-jukebox", {
          communityId,
          queueItemId: item?.id ?? null,
        });
        await refetchTickets();
        await refetchReqCount();
        return addRes;
      }

      const result = await apiRequest("POST", `/api/jukebox/${communityId}/add`, {
        videoId: video.id,
        videoTitle: video.title,
        videoThumbnail: video.thumbnail,
        videoDurationSecs: (video as any).durationSecs ?? 0,
        youtubeId: (video as any).youtubeId ?? null,
        addedBy: user?.name ?? "Guest",
        addedByAvatar: user?.avatar ?? "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=80&h=80&fit=crop",
      });
      await refetchReqCount();
      return result;
    },
    onSuccess: () => {
      if (Platform.OS !== "web") {
        try {
          const Haptics = require("expo-haptics") as {
            notificationAsync: (t: number) => Promise<void>;
            NotificationFeedbackType: { Success: number };
          };
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
          /* noop */
        }
      }
      setYtUrl("");
      setShowAddModal(false);
      qc.invalidateQueries({ queryKey: jukeboxKey });
      qc.invalidateQueries({ queryKey: JUKEBOX_ACTIVE_SESSIONS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: [`/api/tickets/request-count?communityId=${communityId}`] });
    },
    onError: (err: any) => {
      if (err?.code === "insufficient_tickets") {
        const freeLimit =
          (
            qc.getQueryData([
              `/api/tickets/request-count?communityId=${communityId}`,
            ]) as { freeLimit?: number } | undefined
          )?.freeLimit ?? 20;
        Alert.alert(
          "Not Enough Tickets 🎟",
          `You've used your ${freeLimit} free requests today.\n\nYou need ${err.required} 🎟 to add more songs but only have ${err.balance} 🎟.`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Get Tickets", onPress: () => router.push("/tickets") },
          ]
        );
      } else if (err instanceof ApiError && err.status === 401) {
        Alert.alert(
          "Login required",
          "ログインの有効期限が切れている可能性があります。再度 Sign in してからお試しください。",
          [{ text: "OK", onPress: () => router.push("/auth/login") }]
        );
      } else {
        Alert.alert("Error", "Queue への追加に失敗しました。もう一度お試しください。");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: number) => {
      return apiRequest("DELETE", `/api/jukebox/${communityId}/queue/${itemId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: jukeboxKey });
      qc.invalidateQueries({ queryKey: JUKEBOX_ACTIVE_SESSIONS_QUERY_KEY });
    },
    onError: (err) => {
      const msg = formatUserFacingApiError(err);
      Alert.alert("削除できませんでした", msg);
    },
  });

  const handleAddYouTube = async () => {
    const url = ytUrl.trim();
    if (!url) return;
    const idPart = extractYouTubeId(url);
    if (!idPart) {
      showJukeboxAlert(
        "Invalid link",
        "YouTube link / Shorts URL を使うか、11文字の video id を貼り付けてください。",
      );
      return;
    }
    // Fetch duration from YouTube Search API (for direct URL add).
    let durationSecs = 0;
    try {
      const res = await apiRequest("GET", `/api/youtube/search?q=${encodeURIComponent(idPart)}`);
      const results = (await res.json()) as { videoId: string; durationSecs?: number }[];
      const match = results.find((r) => r.videoId === idPart);
      if (match?.durationSecs) durationSecs = match.durationSecs;
    } catch { /* ignore duration fetch failures */ }
    const video: Video & { youtubeId: string; durationSecs: number } = {
      id: Math.floor(Math.random() * 2000000),
      title: "YouTube Request",
      thumbnail: `https://img.youtube.com/vi/${idPart}/hqdefault.jpg`,
      duration: "0:00",
      category: "YouTube",
      price: null,
      youtubeId: idPart,
      durationSecs,
    };
    addMutation.mutate(video);
  };

  const handleSearchYouTube = async () => {
    const q = ytQuery.trim();
    if (!q || ytSearching) return;
    setYtSearching(true);
    try {
      const res = await apiRequest(
        "GET",
        `/api/youtube/search?q=${encodeURIComponent(q)}`,
      );
      const data = (await res.json()) as {
        videoId: string;
        title: string;
        thumbnail: string;
        durationSecs?: number;
      }[];
      setYtResults(data);
    } catch (e: unknown) {
      let msg = "YouTube 検索に失敗しました。時間をおいて再試行してください。";
      if (e instanceof ApiError) {
        try {
          const j = JSON.parse(e.body) as { error?: string };
          if (j?.error) msg = j.error;
          else msg = `YouTube 検索に失敗しました (${e.status})。`;
        } catch {
          msg = `YouTube 検索に失敗しました (${e.status})。`;
        }
      }
      showJukeboxAlert("YouTube", msg);
    } finally {
      setYtSearching(false);
      setInteractionResumeNonce((n) => n + 1);
      Keyboard.dismiss();
    }
  };

  const sendChat = useCallback(() => {
    const msg = chatInput.trim();
    if (!msg) return;
    if (!user) {
      router.push("/auth/login");
      return;
    }
    if (chatMutation.isPending) return;
    setChatInput("");
    chatMutation.mutate(msg, {
      onError: () => setChatInput(msg),
    });
  }, [chatInput, user, chatMutation]);

  const handleAdvance = useCallback(
    (source: "manual" | "ended") => {
      nextMutation.mutate(
        { source },
        {
          onError: (err) => {
            if (source !== "manual") return;
            const msg = formatUserFacingApiError(err);
            if (Platform.OS === "web" && typeof window !== "undefined") {
              window.alert(msg);
            } else {
              Alert.alert("Skip unavailable", msg);
            }
          },
        },
      );
    },
    [nextMutation],
  );

  // Entering room can trigger playback start (logged-in users only).
  // If queue exists but isPlaying=false, call next once to kick off playback.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (!user) return; // Skip for guests.
    if (autoStartedRef.current) return; // Only once.
    if (!data) return; // Data not ready.
    const hasQueue = (data.queue ?? []).some((q) => !q.isPlayed);
    if (hasQueue && !data.state?.isPlaying) {
      autoStartedRef.current = true;
      nextMutation.mutate({ source: "manual" });
    } else if (data.state?.isPlaying || (data.queue ?? []).length === 0) {
      // Already playing or queue empty -> mark auto-start as done.
      autoStartedRef.current = true;
    }
  }, [data, user, nextMutation]);

  useEffect(() => {
    if (chat.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [chat.length]);



  // Fetch playlists when modal is open and user is signed in.
  useEffect(() => {
    if (!showAddModal || !user) {
      setYtPlaylists([]);
      setYtPlaylistsNeedGoogle(false);
      setSelectedPlaylistId(null);
      setYtPlaylistItems([]);
      return;
    }
    let cancelled = false;
    setYtPlaylistsLoading(true);
    setYtPlaylistsNeedGoogle(false);
    apiRequest("GET", "/api/youtube/playlists")
      .then((res) => res.json())
      .then((data: { id: string; title: string; thumbnail: string }[]) => {
        if (!cancelled) setYtPlaylists(Array.isArray(data) ? data : []);
      })
      .catch((e: any) => {
        if (!cancelled && (e?.status === 403 || e?.body)) {
          try {
            const parsed = e?.body ? JSON.parse(e.body) : {};
            if (parsed?.needsGoogleLogin) setYtPlaylistsNeedGoogle(true);
          } catch {}
        }
        if (!cancelled) setYtPlaylists([]);
      })
      .finally(() => {
        if (!cancelled) setYtPlaylistsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showAddModal, user]);

  // Fetch videos inside selected playlist.
  useEffect(() => {
    if (!selectedPlaylistId || !user) {
      setYtPlaylistItems([]);
      return;
    }
    let cancelled = false;
    apiRequest("GET", `/api/youtube/playlists/${selectedPlaylistId}/items`)
      .then((res) => res.json())
      .then((data: { videoId: string; title: string; thumbnail: string }[]) => {
        if (!cancelled) setYtPlaylistItems(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setYtPlaylistItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPlaylistId, user]);

  // Landscape: chat panel translateY (0=closed, 1=open).
  const panelH = winH * 0.55;
  const translateY = chatPanelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [panelH, 0],
  });

  // Latest chat item.
  const latestChat = chat.length > 0 ? chat[chat.length - 1] : null;

  const jukeboxAddPanelCore = (
    <>
      <Text style={styles.modalTitle}>Jukebox に追加</Text>
      <Text style={styles.addPanelIntro}>
        YouTube 検索・link 貼り付け・playlist 選択で曲を追加できます。曲は順番に再生され、終了または Skip されるまで流れます。
      </Text>
        <View style={styles.ytInputSection}>
        <Text style={styles.ytLabel}>YouTube を検索</Text>
        <View style={[styles.ytRow, Platform.OS !== "web" && styles.ytRowNative]}>
          <TextInput
            style={styles.ytInput}
            placeholder="曲名または channel 名で検索"
            placeholderTextColor={C.textMuted}
            value={ytQuery}
            onChangeText={setYtQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            style={[styles.ytSearchButton, (ytSearching || !ytQuery.trim()) && styles.ytSearchButtonDisabled]}
            onPress={handleSearchYouTube}
            disabled={ytSearching || !ytQuery.trim()}
            accessibilityRole="button"
            accessibilityLabel={ytSearching ? "Searching YouTube" : "Search YouTube"}
          >
            <Ionicons name="search" size={16} color="#fff" />
            <Text style={styles.ytSearchButtonText}>{ytSearching ? "Searching..." : "Search"}</Text>
          </Pressable>
        </View>
      </View>
        <View style={styles.ytInputSection}>
        <Text style={styles.ytLabel}>YouTube URL から追加</Text>
        <View style={[styles.ytRow, Platform.OS !== "web" && styles.ytRowNative]}>
          <TextInput
            style={styles.ytInput}
            placeholder="https://www.youtube.com/watch?v=..."
            placeholderTextColor={C.textMuted}
            value={ytUrl}
            onChangeText={setYtUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            style={[styles.ytAddButton, !ytUrl.trim() && styles.ytAddButtonDisabled]}
            onPress={handleAddYouTube}
            disabled={!ytUrl.trim()}
            accessibilityRole="button"
            accessibilityLabel="Add video from this YouTube URL"
          >
            <Ionicons name="logo-youtube" size={16} color="#fff" />
            <Text style={styles.ytAddButtonText}>Add this URL</Text>
          </Pressable>
        </View>
      </View>
      {user && (
        <View style={styles.ytInputSection}>
          <Text style={styles.ytLabel}>My Playlists (Google login)</Text>
          {ytPlaylistsNeedGoogle ? (
            <Pressable
              style={styles.ytPlaylistLoginHint}
              onPress={() => {
                if (Platform.OS === "web" && typeof window !== "undefined") {
                  const returnTo = window.location.pathname + window.location.search;
                  saveLoginReturn(returnTo);
                  const url = new URL("/api/auth/google", getApiUrl()).toString();
                  (window.top || window).location.replace(url);
                } else {
                  router.push("/auth/login");
                }
              }}
            >
              <Ionicons name="logo-youtube" size={18} color="#FF0000" />
              <Text style={styles.ytPlaylistLoginText}>playlist を表示するには Google で Sign in</Text>
            </Pressable>
          ) : ytPlaylistsLoading ? (
            <Text style={styles.ytPlaylistLoading}>Loading...</Text>
          ) : selectedPlaylistId ? (
            <View>
              <Pressable style={styles.ytPlaylistBack} onPress={() => setSelectedPlaylistId(null)}>
                <Ionicons name="chevron-back" size={16} color={C.accent} />
                <Text style={styles.ytPlaylistBackText}>Back to playlists</Text>
              </Pressable>
              <ScrollView
                style={webScrollStyle(styles.ytPlaylistItemsScroll)}
                showsVerticalScrollIndicator={scrollShowsVertical}
                keyboardShouldPersistTaps="always"
                nestedScrollEnabled
              >
                {ytPlaylistItems.map((item) => {
                  const video: Video & { youtubeId: string; durationSecs: number } = {
                    id: Math.floor(Math.random() * 2000000),
                    title: item.title,
                    thumbnail: item.thumbnail,
                    duration: "0:00",
                    category: "YouTube",
                    price: null,
                    youtubeId: item.videoId,
                    durationSecs: (item as any).durationSecs ?? 0,
                  };
                  return (
                    <Pressable
                      key={item.videoId}
                      style={styles.modalItem}
                      onPress={() => addMutation.mutate(video)}
                      disabled={addMutation.isPending}
                    >
                      <Image
                        source={{ uri: item.thumbnail }}
                        style={styles.modalThumb}
                        contentFit="cover"
                        pointerEvents="none"
                      />
                      <View style={styles.modalItemInfo}>
                        <Text style={styles.modalItemTitle} numberOfLines={2}>
                          {item.title}
                        </Text>
                        <View style={styles.modalItemMeta}>
                          <Ionicons name="list" size={12} color={C.accent} />
                          <Text style={styles.modalItemMetaText}>playlist から追加</Text>
                        </View>
                      </View>
                      <View pointerEvents="none">
                        <Ionicons name="add-circle" size={24} color={C.accent} />
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : ytPlaylists.length > 0 ? (
            <HorizontalScroll style={styles.ytPlaylistRow} showArrows={false}>
              {ytPlaylists.map((pl) => (
                <Pressable key={pl.id} style={styles.ytPlaylistChip} onPress={() => setSelectedPlaylistId(pl.id)}>
                  {pl.thumbnail ? (
                    <Image source={{ uri: pl.thumbnail }} style={styles.ytPlaylistChipThumb} contentFit="cover" />
                  ) : (
                    <View style={[styles.ytPlaylistChipThumb, { backgroundColor: C.surface3 }]} />
                  )}
                  <Text style={styles.ytPlaylistChipTitle} numberOfLines={2}>
                    {pl.title}
                  </Text>
                </Pressable>
              ))}
            </HorizontalScroll>
          ) : (
            <Text style={styles.ytPlaylistEmpty}>playlist が見つかりません</Text>
          )}
        </View>
      )}
      <ScrollView
        style={webScrollStyle(styles.modalList)}
        showsVerticalScrollIndicator={scrollShowsVertical}
        contentContainerStyle={styles.modalListContent}
        keyboardShouldPersistTaps="always"
        nestedScrollEnabled
      >
        {ytResults.length > 0 && (
          <>
            <Text style={styles.modalSubtitle}>YouTube Results</Text>
            {ytResults.map((r) => {
              const video: Video & { youtubeId: string; durationSecs: number } = {
                id: Math.floor(Math.random() * 2000000),
                title: r.title,
                thumbnail: r.thumbnail,
                duration: "0:00",
                category: "YouTube",
                price: null,
                youtubeId: r.videoId,
                durationSecs: r.durationSecs ?? 0,
              };
              return (
                <Pressable
                  key={r.videoId}
                  style={styles.modalItem}
                  onPress={() => addMutation.mutate(video)}
                  disabled={addMutation.isPending}
                >
                  <Image
                    source={{ uri: r.thumbnail }}
                    style={styles.modalThumb}
                    contentFit="cover"
                    pointerEvents="none"
                  />
                  <View style={styles.modalItemInfo}>
                    <Text style={styles.modalItemTitle} numberOfLines={2}>
                      {r.title}
                    </Text>
                    <View style={styles.modalItemMeta}>
                      <Ionicons name="logo-youtube" size={12} color="#FF0000" />
                      <Text style={styles.modalItemMetaText}>YouTube から追加</Text>
                    </View>
                  </View>
                  <View pointerEvents="none">
                    <Ionicons name="add-circle" size={24} color={C.accent} />
                  </View>
                </Pressable>
              );
            })}
          </>
        )}
        <Text style={styles.modalSubtitle}>My Purchased Videos</Text>
        {purchasedVideos.length === 0 && <Text style={styles.emptyPurchasedText}>購入済み動画はまだありません</Text>}
        {purchasedVideos.map((video) => (
          <Pressable
            key={video.id}
            style={styles.modalItem}
            onPress={() => addMutation.mutate(video)}
            disabled={addMutation.isPending}
          >
            <Image
              source={{ uri: video.thumbnail }}
              style={styles.modalThumb}
              contentFit="cover"
              pointerEvents="none"
            />
            <View style={styles.modalItemInfo}>
              <Text style={styles.modalItemTitle} numberOfLines={2}>
                {video.title}
              </Text>
              <View style={styles.modalItemMeta}>
                <Ionicons name="checkmark-circle" size={12} color={C.green} />
                <Text style={styles.modalItemMetaText}>Purchased · 🎟{video.price?.toLocaleString()}</Text>
              </View>
            </View>
            <View pointerEvents="none">
              <Ionicons name="add-circle" size={24} color={C.accent} />
            </View>
          </Pressable>
        ))}
        {uploadedVideos.length > 0 && (
          <>
            <Text style={styles.modalSubtitle}>My Uploads</Text>
            {uploadedVideos.map((video) => (
              <Pressable
                key={`u-${video.id}`}
                style={styles.modalItem}
                onPress={() => addMutation.mutate(video)}
                disabled={addMutation.isPending}
              >
                <Image
                  source={{ uri: video.thumbnail }}
                  style={styles.modalThumb}
                  contentFit="cover"
                  pointerEvents="none"
                />
                <View style={styles.modalItemInfo}>
                  <Text style={styles.modalItemTitle} numberOfLines={2}>
                    {video.title}
                  </Text>
                  <View style={styles.modalItemMeta}>
                    <Ionicons name="person-circle" size={12} color={C.accent} />
                    <Text style={styles.modalItemMetaText}>
                      My post · {video.price ? `🎟${video.price.toLocaleString()}` : "無料"}
                    </Text>
                  </View>
                </View>
                <View pointerEvents="none">
                  <Ionicons name="add-circle" size={24} color={C.accent} />
                </View>
              </Pressable>
            ))}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );

  if (isDesktopWebJukebox) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, flexDirection: "row" }}>
        <View style={styles.desktopMainCol}>
          <View style={[styles.header, { paddingTop: topInset + 8 }]}>
            <Pressable
              style={styles.backBtn}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
            <View style={styles.headerCenter}>
              <View style={styles.jukeboxBadge}>
                <Ionicons name="musical-notes" size={11} color="#fff" />
                <Text style={styles.jukeboxBadgeText}>JUKEBOX</Text>
              </View>
              <Pressable
                onPress={() => !stationLabel && router.push(`/community/${communityId}`)}
                style={styles.headerCommunityNamePressable}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`Open community ${communityDisplayName}`}
              >
                <Text style={styles.headerCommunityName} numberOfLines={2}>
                  {communityDisplayName}
                </Text>
              </Pressable>
              <Text style={styles.headerTitle}>Watch Party</Text>
              <Text style={styles.jukeboxPricingHint} numberOfLines={3}>
                {user
                  ? `${freeRemaining} free left today (max ${reqCountData?.freeLimit ?? 20}/day) · then ${ticketsPerRequest} tickets/request`
                  : `Sign in: up to ${reqCountData?.freeLimit ?? 20} free requests per community per day, then ${ticketsPerRequest} tickets each.`}
              </Text>
            </View>
            <View style={{ width: 36 }} />
          </View>
          <View style={styles.desktopPlayerWrap}>
            <NowPlaying
              state={state}
              onAdvance={handleAdvance}
              allowManualSkip={canManualSkip}
              addModalOpen={false}
              embedInSidebarColumn
              interactionResumeNonce={interactionResumeNonce}
              communityLabel={communityDisplayName}
              onCommunityPress={() => router.push(`/community/${communityId}`)}
            />
          </View>
        </View>
        <View style={styles.desktopSidebar}>
          <View style={styles.desktopQueueBlock}>
            <QueueRow
              variant="vertical"
              items={queue}
              state={state}
              userName={user?.name}
              userId={user?.id ?? null}
              onDelete={(id) => deleteMutation.mutate(id)}
              showAddInHeader
              onAdd={() => {
                desktopAddScrollRef.current?.scrollTo({ y: 0, animated: true });
              }}
            />
          </View>
          <View style={styles.desktopChatBlock}>
            <View style={styles.chatHeader}>
              <Ionicons name="chatbubbles" size={14} color={C.accent} />
              <Text style={styles.chatHeaderText}>Comments</Text>
            </View>
            <FlatList
              ref={flatListRef}
              data={chat}
              keyExtractor={(item) => item.id.toString()}
              style={styles.desktopChatList}
              contentContainerStyle={[
                styles.chatListContent,
                chat.length === 0 && styles.chatListContentWhenEmpty,
              ]}
              ListEmptyComponent={JukeboxChatListEmptyView}
              showsVerticalScrollIndicator={scrollShowsVertical}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
              removeClippedSubviews={false}
              renderItem={({ item }) => (
                <View style={[styles.chatMsg, item.username === (user?.name ?? "Guest") && styles.chatMsgMine]}>
                  {item.username !== (user?.name ?? "Guest") && (
                    <Pressable
                      onPress={() => navigateToUserOrLiverProfile({ displayName: item.username })}
                      hitSlop={4}
                    >
                      {item.avatar ? (
                        <Image source={{ uri: item.avatar }} style={styles.chatAvatar} contentFit="cover" />
                      ) : (
                        <View style={[styles.chatAvatar, { backgroundColor: C.surface3, alignItems: "center", justifyContent: "center" }]}>
                          <Ionicons name="person" size={12} color={C.textMuted} />
                        </View>
                      )}
                    </Pressable>
                  )}
                  <View style={[styles.chatBubble, item.username === (user?.name ?? "Guest") && styles.chatBubbleMine]}>
                    {item.username !== (user?.name ?? "Guest") && <Text style={styles.chatUsername}>{item.username}</Text>}
                    <Text style={[styles.chatText, item.username === (user?.name ?? "Guest") && styles.chatTextMine]}>{item.message}</Text>
                    {item.username !== (user?.name ?? "Guest") && item.message ? (
                      <TranslateButton text={item.message} compact />
                    ) : null}
                  </View>
                </View>
              )}
            />
            <View style={[styles.inputRow, { paddingBottom: bottomInset + 8 }]}>
              <TextInput
                style={styles.input}
                placeholder="コメントを追加..."
                placeholderTextColor={C.textMuted}
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={sendChat}
                returnKeyType="send"
                editable={!chatMutation.isPending}
              />
              <Pressable
                style={[styles.sendBtn, (!chatInput.trim() || chatMutation.isPending) && styles.sendBtnDisabled]}
                onPress={sendChat}
                disabled={!chatInput.trim() || chatMutation.isPending}
                accessibilityRole="button"
                accessibilityLabel="Send comment"
              >
                <Ionicons name="send" size={16} color="#fff" />
              </Pressable>
            </View>
          </View>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.desktopAddBlock}
            keyboardVerticalOffset={0}
          >
            <ScrollView
              ref={desktopAddScrollRef}
              style={webScrollStyle(undefined)}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={scrollShowsVertical}
              contentContainerStyle={styles.desktopAddScrollContent}
            >
              {jukeboxAddPanelCore}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={jukeboxKeyboardBehavior as "padding" | "height"}
      keyboardVerticalOffset={0}
      enabled={!showAddModal}
    >
      <View style={[styles.container]}>
        {/* Header: portrait only */}
        {!isLandscape && (
          <View style={[styles.header, { paddingTop: topInset + 8 }]}>
            <Pressable
              style={styles.backBtn}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
            <View style={styles.headerCenter}>
              <View style={styles.jukeboxBadge}>
                <Ionicons name="musical-notes" size={11} color="#fff" />
                <Text style={styles.jukeboxBadgeText}>JUKEBOX</Text>
              </View>
              <Pressable
                onPress={() => !stationLabel && router.push(`/community/${communityId}`)}
                style={styles.headerCommunityNamePressable}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`Open community ${communityDisplayName}`}
              >
                <Text style={styles.headerCommunityName} numberOfLines={2}>
                  {communityDisplayName}
                </Text>
              </Pressable>
              <Text style={styles.headerTitle}>Watch Party</Text>
              <Text style={styles.jukeboxPricingHint} numberOfLines={3}>
                {user
                  ? `${freeRemaining} free left today (max ${reqCountData?.freeLimit ?? 20}/day) · then ${ticketsPerRequest} tickets/request`
                  : `Sign in: up to ${reqCountData?.freeLimit ?? 20} free requests per community per day, then ${ticketsPerRequest} tickets each.`}
              </Text>
            </View>
            <View style={{ width: 36 }} />
          </View>
        )}

        {/* Single NowPlaying instance — avoids unmount on rotate (was destroying YT iframe / audio). */}
        <View
          style={
            isLandscape
              ? StyleSheet.absoluteFillObject
              : styles.portraitPlayerSlot
          }
        >
          <NowPlaying
            state={state}
            onAdvance={handleAdvance}
            allowManualSkip={canManualSkip}
            addModalOpen={showAddModal}
            interactionResumeNonce={interactionResumeNonce}
            communityLabel={communityDisplayName}
            onCommunityPress={() => router.push(`/community/${communityId}`)}
          />
        </View>

        {/* Portrait: queue + chat; keep above video layer for WebKit stability */}
        {!isLandscape && (
          <View style={styles.portraitBelowPlayer}>
            {/* Hide queue row when keyboard is open so the comment input stays visible */}
            {!keyboardShown && (
              <QueueRow items={queue} state={state} userName={user?.name} userId={user?.id ?? null} onDelete={(id) => deleteMutation.mutate(id)} onAdd={() => {
                if (!user) { router.push("/auth/login"); return; }
                setShowAddModal(true);
              }} showAddInHeader />
            )}

            <View style={styles.chatSection}>
              <View style={styles.chatHeader}>
                <Ionicons name="chatbubbles" size={14} color={C.accent} />
                <Text style={styles.chatHeaderText}>Comments</Text>
              </View>
              <FlatList
                ref={flatListRef}
                data={chat}
                keyExtractor={(item) => item.id.toString()}
                style={styles.chatList}
                contentContainerStyle={[
                  styles.chatListContent,
                  chat.length === 0 && styles.chatListContentWhenEmpty,
                ]}
                ListEmptyComponent={JukeboxChatListEmptyView}
                showsVerticalScrollIndicator={scrollShowsVertical}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="none"
                removeClippedSubviews={false}
                renderItem={({ item }) => (
                  <View style={[styles.chatMsg, item.username === (user?.name ?? "Guest") && styles.chatMsgMine]}>
                    {item.username !== (user?.name ?? "Guest") && (
                      <Pressable
                        onPress={() => navigateToUserOrLiverProfile({ displayName: item.username })}
                        hitSlop={4}
                      >
                        {item.avatar ? (
                          <Image source={{ uri: item.avatar }} style={styles.chatAvatar} contentFit="cover" />
                        ) : (
                          <View style={[styles.chatAvatar, { backgroundColor: C.surface3, alignItems: "center", justifyContent: "center" }]}>
                            <Ionicons name="person" size={12} color={C.textMuted} />
                          </View>
                        )}
                      </Pressable>
                    )}
                    <View style={[styles.chatBubble, item.username === (user?.name ?? "Guest") && styles.chatBubbleMine]}>
                      {item.username !== (user?.name ?? "Guest") && (
                        <Text style={styles.chatUsername}>{item.username}</Text>
                      )}
                      <Text style={[styles.chatText, item.username === (user?.name ?? "Guest") && styles.chatTextMine]}>
                        {item.message}
                      </Text>
                      {item.username !== (user?.name ?? "Guest") && item.message ? (
                        <TranslateButton text={item.message} compact />
                      ) : null}
                    </View>
                  </View>
                )}
              />
            </View>

            <View style={[styles.inputRow, { paddingBottom: bottomInset + 8 }]}>
              <TextInput
                style={styles.input}
                placeholder="コメントを追加..."
                placeholderTextColor={C.textMuted}
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={sendChat}
                returnKeyType="send"
                blurOnSubmit={false}
                editable={!chatMutation.isPending}
                showSoftInputOnFocus
              />
              <Pressable
                style={[styles.sendBtn, (!chatInput.trim() || chatMutation.isPending) && styles.sendBtnDisabled]}
                onPress={sendChat}
                disabled={!chatInput.trim() || chatMutation.isPending}
                accessibilityRole="button"
                accessibilityLabel="Send comment"
              >
                <Ionicons name="send" size={16} color="#fff" />
              </Pressable>
            </View>
          </View>
        )}

        {/* Landscape: chrome only (NowPlaying already mounted above). */}
        {isLandscape && (
          <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          <Pressable
            style={[styles.landscapeBackBtn, { top: insets.top + 8, left: insets.left + 8 }]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>

            <Pressable
              style={[styles.landscapeAddBtn, { top: insets.top + 8, right: insets.right + 8 }]}
              onPress={() => {
                if (!user) { router.push("/auth/login"); return; }
                setShowAddModal(true);
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Add video to queue"
            >
              <Ionicons name="add" size={22} color="#fff" />
            </Pressable>

            <Pressable
              style={[
                styles.landscapeCommunityPill,
                { top: insets.top + 8, left: insets.left + 52, right: insets.right + 52 },
              ]}
              onPress={() => router.push(`/community/${communityId}`)}
              accessibilityRole="button"
              accessibilityLabel={`Open community ${communityDisplayName}`}
            >
              <Ionicons name="people-outline" size={13} color={C.accent} />
              <Text style={styles.landscapeCommunityPillText} numberOfLines={1}>
                {communityDisplayName}
              </Text>
            </Pressable>

            <Text
              style={[styles.landscapePricingHint, { top: insets.top + 44, left: insets.left + 52, right: insets.right + 52 }]}
              numberOfLines={2}
            >
              {user
                ? `${freeRemaining} free · then ${ticketsPerRequest} tickets`
                : `${reqCountData?.freeLimit ?? 20} free/day · then ${ticketsPerRequest} tickets`}
            </Text>

            {!chatPanelOpen && (
              <Pressable
                style={[styles.landscapeChatBar, { bottom: insets.bottom + 8, left: insets.left + 12, right: insets.right + 12 }]}
                onPress={() => setChatPanelOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={latestChat ? "Open comments" : "Open comments, no messages yet"}
              >
                <Ionicons name="chatbubbles" size={13} color={C.accent} />
                {latestChat ? (
                  <Text style={styles.landscapeChatBarText} numberOfLines={1}>
                    <Text style={{ color: C.accent, fontWeight: "700" }}>{latestChat.username}: </Text>
                    {latestChat.message}
                  </Text>
                ) : (
                  <Text style={styles.landscapeChatBarText}>コメントを見る</Text>
                )}
                <Ionicons name="chevron-up" size={13} color="rgba(255,255,255,0.5)" />
              </Pressable>
            )}

            {chatPanelOpen && (
              <Animated.View
                style={[
                  styles.landscapeChatPanel,
                  { bottom: 0, left: 0, right: 0, height: panelH, transform: [{ translateY }] },
                ]}
              >
                <View style={styles.landscapeChatPanelHeader}>
                  <Ionicons name="chatbubbles" size={14} color={C.accent} />
                  <Text style={styles.chatHeaderText}>Comments</Text>
                  <Pressable
                    onPress={() => setChatPanelOpen(false)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel="Close comments"
                  >
                    <Ionicons name="chevron-down" size={18} color={C.textMuted} />
                  </Pressable>
                </View>
                <FlatList
                  ref={flatListRef}
                  data={chat}
                  keyExtractor={(item) => item.id.toString()}
                  style={{ flex: 1 }}
                  contentContainerStyle={[
                    styles.chatListContent,
                    chat.length === 0 && styles.chatListContentWhenEmpty,
                  ]}
                  ListEmptyComponent={JukeboxChatListEmptyView}
                  showsVerticalScrollIndicator={scrollShowsVertical}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="none"
                  removeClippedSubviews={false}
                  renderItem={({ item }) => (
                    <View style={[styles.chatMsg, item.username === (user?.name ?? "Guest") && styles.chatMsgMine]}>
                      {item.username !== (user?.name ?? "Guest") && (
                        <Pressable
                          onPress={() => navigateToUserOrLiverProfile({ displayName: item.username })}
                          hitSlop={4}
                        >
                          {item.avatar ? (
                            <Image source={{ uri: item.avatar }} style={styles.chatAvatar} contentFit="cover" />
                          ) : (
                            <View style={[styles.chatAvatar, { backgroundColor: C.surface3, alignItems: "center", justifyContent: "center" }]}>
                              <Ionicons name="person" size={12} color={C.textMuted} />
                            </View>
                          )}
                        </Pressable>
                      )}
                      <View style={[styles.chatBubble, item.username === (user?.name ?? "Guest") && styles.chatBubbleMine]}>
                        {item.username !== (user?.name ?? "Guest") && (
                          <Text style={styles.chatUsername}>{item.username}</Text>
                        )}
                        <Text style={[styles.chatText, item.username === (user?.name ?? "Guest") && styles.chatTextMine]}>
                          {item.message}
                        </Text>
                        {item.username !== (user?.name ?? "Guest") && item.message ? (
                          <TranslateButton text={item.message} compact />
                        ) : null}
                      </View>
                    </View>
                  )}
                />
                <View style={[styles.inputRow, { paddingBottom: bottomInset + 8 }]}>
                  <TextInput
                    style={styles.input}
                    placeholder="コメントを追加..."
                    placeholderTextColor={C.textMuted}
                    value={chatInput}
                    onChangeText={setChatInput}
                    onSubmitEditing={sendChat}
                    returnKeyType="send"
                    blurOnSubmit={false}
                    editable={!chatMutation.isPending}
                    showSoftInputOnFocus
                  />
                  <Pressable
                    style={[styles.sendBtn, (!chatInput.trim() || chatMutation.isPending) && styles.sendBtnDisabled]}
                    onPress={sendChat}
                    disabled={!chatInput.trim() || chatMutation.isPending}
                    accessibilityRole="button"
                    accessibilityLabel="Send comment"
                  >
                    <Ionicons name="send" size={16} color="#fff" />
                  </Pressable>
                </View>
              </Animated.View>
            )}
          </View>
        )}
      </View>

      {/* Add Video Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
          /** iOS WebKit: optional; desktop web runs full behavior. */
          enabled={!kavDisabledOnIosWeb}
        >
        <View style={styles.modalBg} pointerEvents="box-none">
          <Pressable
            style={[StyleSheet.absoluteFillObject, styles.modalBackdrop]}
            onPress={() => !addMutation.isPending && setShowAddModal(false)}
            accessibilityLabel="Dismiss"
          />
          <View style={[
            styles.modalSheet,
            Platform.OS !== "web" && { height: Math.round(winH * 0.82) },
          ]}>
            <View style={styles.modalSheetTopRow}>
              <View style={styles.modalSheetTopSide} />
              <View style={styles.modalHandle} />
              <View style={[styles.modalSheetTopSide, styles.modalSheetTopSideEnd]}>
                <Pressable
                  onPress={() => !addMutation.isPending && setShowAddModal(false)}
                  style={styles.modalCloseBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  disabled={addMutation.isPending}
                >
                  <Ionicons name="close" size={26} color={C.textSec} />
                </Pressable>
              </View>
            </View>
            {addMutation.isPending ? (
              <View style={styles.modalPendingOverlay} pointerEvents="auto">
                <ActivityIndicator size="large" color={C.accent} />
              </View>
            ) : null}
            <ScrollView
              style={styles.modalPanelScroll}
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              contentContainerStyle={styles.modalPanelScrollContent}
            >
              {jukeboxAddPanelCore}
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>


    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  portraitPlayerSlot: {
    position: "relative",
    zIndex: 0,
    overflow: "hidden",
  },
  portraitBelowPlayer: {
    flex: 1,
    minHeight: 0,
    zIndex: 2,
    position: "relative",
  },
  desktopMainCol: { flex: 1, minWidth: 0 },
  desktopPlayerWrap: { width: "100%" },
  desktopSidebar: {
    width: 400,
    maxWidth: "44%",
    flexShrink: 0,
    borderLeftWidth: 1,
    borderLeftColor: C.border,
    backgroundColor: C.surface,
  },
  desktopQueueBlock: { borderBottomWidth: 1, borderBottomColor: C.border },
  desktopChatBlock: { flex: 1, minHeight: 140, borderBottomWidth: 1, borderBottomColor: C.border },
  desktopChatList: { flex: 1 },
  desktopAddBlock: { maxHeight: 400, flexGrow: 0 },
  desktopAddScrollContent: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 24 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerCenter: { alignItems: "center", gap: 2, flex: 1, minWidth: 0, paddingHorizontal: 4 },
  headerCommunityNamePressable: { maxWidth: "100%" },
  headerCommunityName: {
    color: C.text,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 18,
  },
  jukeboxBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  jukeboxBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  headerTitle: { color: C.textSec, fontSize: 11, marginTop: 1 },
  jukeboxPricingHint: {
    fontSize: 10,
    color: C.textMuted,
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 8,
    lineHeight: 14,
    maxWidth: 320,
    alignSelf: "center",
  },

  landscapeCommunityPill: {
    position: "absolute",
    zIndex: 45,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(8,12,20,0.78)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  landscapeCommunityPillText: {
    flex: 1,
    flexShrink: 1,
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    minWidth: 0,
  },
  landscapePricingHint: {
    position: "absolute",
    zIndex: 44,
    fontSize: 10,
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
    lineHeight: 13,
  },

  nowPlaying: {
    position: "relative",
    overflow: "hidden",
    justifyContent: "space-between",
    backgroundColor: "transparent",
  },
  unmuteOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  unmuteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.72)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  unmuteBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  // iOS Safari audio-enable overlay.
  audioOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  audioOverlayInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  audioOverlayInnerColumn: {
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    maxWidth: "88%",
  },
  audioOverlayText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  audioOverlayHint: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  nowPlayingEmpty: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surface,
    gap: 8,
  },
  nowPlayingEmptyCommunity: {
    color: C.text,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  emptyText: { color: C.textMuted, fontSize: 13 },
  nowPlayingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,18,28,0.55)",
  },
  nowPlayingTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveChipDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.live,
  },
  liveChipText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  watchersChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  watchersText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  nowPlayingCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  nowPlayingBottom: {
    padding: 12,
    gap: 6,
  },
  nowPlayingCommunityPressable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  nowPlayingCommunityLine: {
    flexShrink: 1,
    color: "rgba(255,255,255,0.88)",
    fontSize: 11,
    fontWeight: "700",
  },
  nowPlayingTitle: { color: "#fff", fontSize: 14, fontWeight: "700", lineHeight: 19 },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressTime: { color: "rgba(255,255,255,0.6)", fontSize: 10, width: 32 },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 2,
    position: "relative",
    overflow: "visible",
  },
  progressFill: {
    height: 3,
    backgroundColor: C.accent,
    borderRadius: 2,
  },
  progressThumb: {
    position: "absolute",
    top: -4,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: C.accent,
    marginLeft: -5,
  },
  nextRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
  },
  nextBtnDisabled: {
    opacity: 0.38,
    backgroundColor: "transparent",
  },
  nextBtnTextDisabled: {
    opacity: 0.65,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 44,
    minWidth: 88,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  nextBtnText: { color: C.textMuted, fontSize: 11 },

  queueSection: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
  },
  queueSectionVertical: {
    borderTopWidth: 0,
    paddingTop: 0,
    maxHeight: 200,
    minHeight: 80,
  },
  queueVerticalScroll: { maxHeight: 160 },
  queueVerticalContent: { paddingHorizontal: 12, gap: 8, paddingBottom: 8 },
  queueItemVertical: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.surface2,
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  queueThumbVertical: { width: 52, height: 52, borderRadius: 6 },
  queueItemVerticalBody: { flex: 1, minWidth: 0 },
  queueItemTitleVertical: { color: C.text, fontSize: 12, fontWeight: "600", lineHeight: 16 },
  queueItemVerticalMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  queueItemByVertical: { color: C.textMuted, fontSize: 10, flex: 1 },
  queueItemDeleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  queueHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  /** Keep "Add" above the video layer on small screens (Android z-order) */
  queueHeaderWithAdd: {
    zIndex: 4,
    ...(Platform.OS === "android" ? { elevation: 6 } : {}),
  },
  queueHeaderText: { color: C.accent, fontSize: 11, fontWeight: "800", flex: 1 },
  queueCount: { color: C.textMuted, fontSize: 11 },
  queueAddHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "rgba(41,182,207,0.14)",
    borderWidth: 1,
    borderColor: C.accent + "66",
    borderRadius: 999,
    paddingHorizontal: 14,
    minHeight: 44,
    minWidth: 72,
    paddingVertical: 8,
  },
  queueAddHeaderText: { color: C.accent, fontSize: 11, fontWeight: "700" },
  queueScroll: { paddingHorizontal: 16, gap: 8, paddingBottom: 10 },
  queueItem: {
    width: 110,
    height: 90,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    backgroundColor: C.surface,
  },
  queueThumb: { ...StyleSheet.absoluteFillObject as any },
  queueItemOverlay: {
    ...StyleSheet.absoluteFillObject as any,
    backgroundColor: "rgba(10,18,28,0.5)",
  },
  queueItemTitle: {
    position: "absolute",
    bottom: 18,
    left: 6,
    right: 6,
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 13,
  },
  queueItemByRow: {
    position: "absolute",
    bottom: 5,
    left: 6,
    right: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  queueItemAvatar: { width: 12, height: 12, borderRadius: 6 },
  queueItemBy: { color: "rgba(255,255,255,0.6)", fontSize: 9 },
  addQueueBtn: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.accent + "66",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addQueueText: { color: C.accent, fontSize: 10, fontWeight: "600" },

  chatSection: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 6,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  chatHeaderText: { color: C.accent, fontSize: 11, fontWeight: "700" },
  chatList: { flex: 1 },
  chatListContent: { paddingHorizontal: 12, gap: 8, paddingVertical: 6 },
  /** Centers `ListEmptyComponent` when the thread has no rows. */
  chatListContentWhenEmpty: { flexGrow: 1, justifyContent: "center", minHeight: 100 },
  chatMsg: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    maxWidth: "85%",
  },
  chatMsgMine: { alignSelf: "flex-end", flexDirection: "row-reverse" },
  chatAvatar: { width: 24, height: 24, borderRadius: 12, flexShrink: 0 },
  chatBubble: {
    backgroundColor: C.surface2,
    borderRadius: 12,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 1,
  },
  chatBubbleMine: {
    backgroundColor: C.accentDark,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 4,
  },
  chatUsername: { color: C.accent, fontSize: 10, fontWeight: "700" },
  chatText: { color: C.text, fontSize: 13, lineHeight: 18 },
  chatTextMine: { color: "#fff" },

  inputRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.bg,
    zIndex: 6,
    ...(Platform.OS === "android" ? { elevation: 8 } : {}),
  },
  queueEmptyVertical: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: "dashed",
    backgroundColor: C.surface2,
  },
  queueEmptyHorizontal: {
    width: 220,
    minHeight: 90,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    gap: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.accent + "44",
    backgroundColor: C.surface2,
  },
  queueEmptyTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  queueEmptyHint: {
    color: C.textMuted,
    fontSize: 11,
    textAlign: "center",
  },
  queueEmptyTitleH: {
    color: C.text,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  queueEmptyHintH: {
    color: C.textMuted,
    fontSize: 10,
    textAlign: "center",
  },

  input: {
    flex: 1,
    height: 44,
    backgroundColor: C.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    color: C.text,
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: C.surface2 },

  // Landscape only.
  landscapeBackBtn: {
    position: "absolute",
    zIndex: 50,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  landscapeAddBtn: {
    position: "absolute",
    zIndex: 60,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "android" ? { elevation: 12 } : {}),
  },
  landscapeChatBar: {
    position: "absolute",
    zIndex: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(10,18,28,0.82)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  landscapeChatBarText: {
    flex: 1,
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
  },
  landscapeChatPanel: {
    position: "absolute",
    zIndex: 50,
    backgroundColor: "rgba(10,18,28,0.95)",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
  landscapeChatPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  /** Keeps dim tap-to-dismiss below the sheet on native (avoid touches stuck on backdrop). */
  modalBackdrop: {
    zIndex: 0,
  },
  modalSheet: {
    position: "relative",
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 16,
    maxHeight: Platform.OS === "web" ? 560 : "82%",
    overflow: "hidden",
    zIndex: 1,
    ...Platform.select({
      android: { elevation: 24 },
      default: {},
    }),
  },
  modalSheetTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    minHeight: 32,
  },
  modalSheetTopSide: { flex: 1 },
  modalSheetTopSideEnd: { alignItems: "flex-end" },
  modalCloseBtn: { padding: 2 },
  /** Covers form while add request is in flight (sheet keeps natural height). */
  modalPendingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 44,
    bottom: 0,
    backgroundColor: "rgba(10,18,28,0.45)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 50,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  modalPanelScroll: { flex: 1 },
  modalPanelScrollContent: { paddingBottom: 20 },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
  },
  modalTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },
  addPanelIntro: {
    fontSize: 11,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  modalSubtitle: {
    color: C.textSec,
    fontSize: 12,
    marginBottom: 8,
    marginTop: 12,
  },
  ytInputSection: {
    marginBottom: 8,
    gap: 6,
  },
  ytLabel: {
    color: C.textSec,
    fontSize: 12,
  },
  ytRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ytRowNative: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  ytInput: {
    flex: 1,
    minWidth: 0,
    backgroundColor: C.surface2,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: C.text,
    fontSize: 12,
  },
  ytAddButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ff0000",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    flexShrink: 0,
    ...Platform.select({ web: {}, default: { alignSelf: "stretch" as const } }),
  },
  ytAddButtonDisabled: {
    opacity: 0.4,
  },
  ytAddButtonText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  ytSearchButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.accent,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    flexShrink: 0,
    ...Platform.select({ web: {}, default: { alignSelf: "stretch" as const } }),
  },
  ytSearchButtonDisabled: {
    opacity: 0.4,
  },
  ytSearchButtonText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  modalList: {
    maxHeight: 200,
  },
  modalListContent: {
    paddingRight: Platform.OS === "web" ? 10 : 0,
    paddingBottom: 4,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    alignSelf: "stretch",
    width: "100%",
  },
  /** Slightly larger tap target for thumbnails on phones */
  modalThumb: { width: 72, height: 48, borderRadius: 6 },
  modalItemInfo: { flex: 1, gap: 3 },
  modalItemTitle: { color: C.text, fontSize: 13, fontWeight: "600", lineHeight: 17 },
  modalItemMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  modalItemMetaText: { color: C.textMuted, fontSize: 11 },
  emptyPurchasedText: {
    color: C.textMuted,
    fontSize: 12,
    paddingVertical: 8,
  },
  ytPlaylistLoginHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,0,0,0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,0,0,0.3)",
  },
  ytPlaylistLoginText: { color: C.text, fontSize: 12 },
  ytPlaylistLoading: { color: C.textMuted, fontSize: 12, paddingVertical: 8 },
  ytPlaylistBack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  ytPlaylistBackText: { color: C.accent, fontSize: 12 },
  ytPlaylistItemsScroll: { maxHeight: 200 },
  ytPlaylistRow: { marginBottom: 8 },
  ytPlaylistChip: {
    width: 100,
    marginRight: 8,
    backgroundColor: C.surface2,
    borderRadius: 8,
    overflow: "hidden",
  },
  ytPlaylistChipThumb: { width: "100%", height: 56, borderRadius: 6 },
  ytPlaylistChipTitle: {
    color: C.text,
    fontSize: 11,
    padding: 6,
    marginTop: 2,
  },
  ytPlaylistEmpty: { color: C.textMuted, fontSize: 12, paddingVertical: 8 },

});
