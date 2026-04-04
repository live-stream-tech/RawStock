import React, { useState, useRef, useEffect, useCallback } from "react";
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
} from "react-native";
import { scrollShowsHorizontal, scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { C } from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/lib/auth";
import { Linking } from "react-native";
import { getApiUrl } from "@/lib/query-client";
import { saveLoginReturn } from "@/lib/login-return";
import { HorizontalScroll } from "@/components/HorizontalScroll";
import { webScrollStyle } from "@/constants/layout";

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
  /** サーバーが計算した経過秒数（放送位置）。存在しない場合は startedAt から計算 */
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

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1) || null;
    }
    if (u.hostname.endsWith("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/");
      const idx = parts.indexOf("embed");
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    }
    return null;
  } catch {
    return null;
  }
}

function fmtSecs(s: number): string {
  if (!s || s <= 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function calcProgress(startedAt: string, durationSecs: number): number {
  const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
  if (durationSecs <= 0) return 0;
  return Math.min(elapsed / durationSecs, 1);
}

/** Web かつ iPhone / iPad Safari（PWA 含む）— キーボードでレイアウトを動かさない */
function isIosLikeWebClient(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iP(hone|od|ad)/.test(ua)) return true;
  const nav = navigator as Navigator & { maxTouchPoints?: number };
  if (navigator.platform === "MacIntel" && (nav.maxTouchPoints ?? 0) > 1) return true;
  return false;
}

/**
 * NowPlaying: YouTube IFrame API 統合プレイヤー（音声＋映像、mute=0）
 * 曲変更時は loadVideoById() で切り替え（音声途切れなし）
 * iOS Safari: 初回1回だけタップオーバーレイを表示
 * 縦向き: 16:9 の高さ。横向き: 全画面
 */
function NowPlaying({
  state,
  onNext,
  addModalOpen,
  embedInSidebarColumn,
  interactionResumeNonce = 0,
}: {
  state: JukeboxState | null;
  onNext: () => void;
  /** Add-video modal open — used to resume iframe after close (iOS WebKit often pauses background media). */
  addModalOpen?: boolean;
  /** Desktop 2-col: window may be "landscape" but player sits in a narrow column — use 16:9 box, not full-window fill. */
  embedInSidebarColumn?: boolean;
  /** 親がインクリメント（検索完了など）— バックグラウンドになった iframe の再生を再度試す */
  interactionResumeNonce?: number;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [elapsedDisplay, setElapsedDisplay] = useState(0);
  const [screenW, setScreenW] = useState(() => Dimensions.get("window").width);
  const [screenH, setScreenH] = useState(() => Dimensions.get("window").height);
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;
  // iOS Safari: 初回のみタップが必要（その後は曲変更でも音声継続）
  const [needsTap, setNeedsTap] = useState(true);
  /** サーバーは再生中だが WebKit が PAUSED/CUED/UNSTARTED になったとき */
  const [needsResumeTap, setNeedsResumeTap] = useState(false);
  // IFrame API プレイヤーの参照
  const ytPlayerRef = useRef<any>(null);
  const ytContainerIdRef = useRef<string>(`jb-yt-${Math.random().toString(36).slice(2)}`);
  const stateRef = useRef<JukeboxState | null>(state);
  stateRef.current = state;
  /** 自動 tryResume はユーザーが一度でも再生に関わった後のみ（iOS 自動再生ポリシー） */
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

  // 画面サイズ変化を追跡
  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => {
      setScreenW(window.width);
      setScreenH(window.height);
    });
    return () => sub?.remove();
  }, []);

  // 表示用の経過時間を1秒ごとに更新（再生中のみ）
  useEffect(() => {
    if (!state) return;
    const calcElapsed = () => {
      const base =
        !state.isPlaying && typeof state.elapsedSecs === "number"
          ? state.elapsedSecs
          : (Date.now() - new Date(state.startedAt).getTime()) / 1000;
      return Math.min(base, state.currentVideoDurationSecs);
    };
    setElapsedDisplay(calcElapsed());
    if (state.isPlaying) {
      const iv = setInterval(() => setElapsedDisplay(calcElapsed()), 1000);
      return () => clearInterval(iv);
    }
  }, [
    state?.isPlaying,
    state?.startedAt,
    state?.currentVideoDurationSecs,
    state?.currentVideoYoutubeId,
    state?.elapsedSecs,
  ]);

  // LIVE ラベルのパルスアニメーション
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

  // YouTube IFrame API プレイヤーの初期化・曲切り替え
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!state?.currentVideoYoutubeId) return;

    const startSec = state.elapsedSecs && state.elapsedSecs > 0
      ? state.elapsedSecs
      : Math.max(0, (Date.now() - new Date(state.startedAt).getTime()) / 1000);

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
        // 曲切り替え: プレイヤーを破棄せず loadVideoById で切り替え（音声途切れなし）
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
        // プレイヤー新規作成
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
                setNeedsTap(false); // 自動再生成功（Android/PC）
              } catch {}
            },
            onStateChange: (event: any) => {
              try {
                const w = window as any;
                const YT = w.YT;
                if (!YT?.PlayerState) return;
                const ps = event.data;
                if (ps === YT.PlayerState.ENDED) {
                  onNextRef.current();
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
  }, [state?.currentVideoYoutubeId]);

  // アンマウント時にプレイヤーを破棄
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
    window.addEventListener("resize", onResizeGroup);
    window.addEventListener("orientationchange", onResizeGroup);
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
      window.removeEventListener("orientationchange", onResizeGroup);
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

  // iOS Safari: 初回音声（ユーザージェスチャー直結のため遅延なし）
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

  // 縦向き: 16:9 の高さ。横向き: 全画面。サイドバー埋め込み時は常に 16:9 ボックス。
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
        <Text style={styles.emptyText}>No video playing</Text>
      </View>
    );
  }

  const fallbackElapsed =
    typeof state.elapsedSecs === "number"
      ? state.elapsedSecs
      : (Date.now() - new Date(state.startedAt).getTime()) / 1000;
  const elapsed = Math.min(
    state.isPlaying ? (elapsedDisplay || fallbackElapsed) : fallbackElapsed,
    state.currentVideoDurationSecs
  );
  const progress =
    state.currentVideoDurationSecs > 0
      ? Math.min(elapsed / state.currentVideoDurationSecs, 1)
      : 0;

  return (
    <View style={[styles.nowPlaying, videoStyle]}>
      {/* YouTube IFrame API プレイヤーコンテナ（音声＋映像） */}
      {Platform.OS === 'web' && state?.currentVideoYoutubeId ? (
        <div
          id={ytContainerIdRef.current}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' } as any}
        />
      ) : state?.currentVideoThumbnail ? (
        <Image source={{ uri: state.currentVideoThumbnail }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      ) : null}
      {/* iOS / WebKit: 初回音声 or 途中停止時の再開（サーバーは再生中） */}
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
      {/* 下部オーバーレイ: タイトル・プログレス・スキップ */}
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
            style={styles.nextBtn}
            onPress={() => {
              hasUserInteractedRef.current = true;
              onNext();
            }}
          >
            <Ionicons name="play-skip-forward" size={14} color={C.textMuted} />
            <Text style={styles.nextBtnText}>Skip</Text>
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
  onDelete,
  variant = "horizontal",
}: {
  items: QueueItem[];
  state: JukeboxState | null;
  onAdd: () => void;
  userName?: string | null;
  onDelete?: (id: number) => void;
  variant?: "horizontal" | "vertical";
}) {
  // 再生済みを除外し、再生中の曲もキュー表示から除外（Now Playing と重複しないように）
  const upcoming = items.filter(
    (q) =>
      !q.isPlayed &&
      !(state?.currentVideoId != null && q.videoId === state.currentVideoId) &&
      !(state?.currentVideoYoutubeId && (q.youtubeId ?? null) === state.currentVideoYoutubeId)
  );
  const isVertical = variant === "vertical";

  const itemNodes = upcoming.map((item) =>
    isVertical ? (
      <View key={item.id} style={styles.queueItemVertical}>
        <Image source={{ uri: item.videoThumbnail }} style={styles.queueThumbVertical} contentFit="cover" />
        <View style={styles.queueItemVerticalBody}>
          <Text style={styles.queueItemTitleVertical} numberOfLines={2}>
            {item.videoTitle}
          </Text>
          <View style={styles.queueItemVerticalMeta}>
            {item.addedByAvatar ? (
              <Image source={{ uri: item.addedByAvatar }} style={styles.queueItemAvatar} contentFit="cover" />
            ) : null}
            <Text style={styles.queueItemByVertical}>{item.addedBy}</Text>
          </View>
        </View>
        {userName && item.addedBy === userName && onDelete ? (
          <Pressable onPress={() => onDelete(item.id)} style={styles.queueItemDeleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={16} color="#fff" />
          </Pressable>
        ) : null}
      </View>
    ) : (
      <View key={item.id} style={styles.queueItem}>
        {userName && item.addedBy === userName && onDelete ? (
          <Pressable
            onPress={() => onDelete(item.id)}
            style={{ position: "absolute", top: 4, right: 4, zIndex: 20, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 10, padding: 2 }}
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
            <Image source={{ uri: item.addedByAvatar }} style={styles.queueItemAvatar} contentFit="cover" />
          ) : null}
          <Text style={styles.queueItemBy}>{item.addedBy}</Text>
        </View>
      </View>
    )
  );

  return (
    <View style={[styles.queueSection, isVertical && styles.queueSectionVertical]}>
      <View style={styles.queueHeader}>
        <Ionicons name="list" size={14} color={C.accent} />
        <Text style={styles.queueHeaderText}>UP NEXT</Text>
        <Text style={styles.queueCount}>{upcoming.length}</Text>
      </View>
      {isVertical ? (
        <ScrollView
          style={webScrollStyle(styles.queueVerticalScroll)}
          showsVerticalScrollIndicator={scrollShowsVertical}
          contentContainerStyle={styles.queueVerticalContent}
        >
          {itemNodes}
        </ScrollView>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={scrollShowsHorizontal} contentContainerStyle={styles.queueScroll}>
          {itemNodes}
          <Pressable style={styles.addQueueBtn} onPress={onAdd} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
            <Ionicons name="add" size={24} color={C.accent} />
            <Text style={styles.addQueueText}>Add Video</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

export default function JukeboxScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const communityId = parseInt(id ?? "1");
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
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

  /** Add モーダル内のみ: レイアウト跳びで iframe が止まりやすいので KAV オフ */
  const kavDisabledOnIosWeb = Platform.OS === "web" && isIosLikeWebClient();
  /**
   * 本体（チャット含む）: react-native-keyboard-controller の behavior="height" は
   * キーボード表示時に flex:0 + 固定 height になり、Android で入力欄が潰れる・タップ不能になることがある。
   * iOS / Android ネイティブと iOS Web は padding。デスクトップ Web のみ height。
   */
  const jukeboxKeyboardBehavior: "padding" | "height" =
    Platform.OS === "web" && !kavDisabledOnIosWeb ? "height" : "padding";

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  // 横向きチャットパネルのアニメーション
  useEffect(() => {
    Animated.spring(chatPanelAnim, {
      toValue: chatPanelOpen ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [chatPanelOpen]);

  const jukeboxKey = [`/api/jukebox/${communityId}`] as const;

  // ページ訪問時に常に最新データを取得（staleTime:0でキャッシュが古いままになる問題を防止）
  const { data } = useQuery<JukeboxData>({
    queryKey: jukeboxKey,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  // SSE ストリームでリアルタイム更新
  useEffect(() => {
    if (Platform.OS !== "web") return; // ネイティブはポーリングにフォールバック
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
            prev ? { ...prev, state: payload.data } : prev
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
          // 指数バックオフ: 1→2→4→8→16→30秒上限
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
  }, [communityId]);

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

  const ticketBalance = ticketData?.balance ?? 0;
  const freeRemaining = reqCountData?.freeRemaining ?? 3;
  const ticketsPerRequest = reqCountData?.ticketsPerRequest ?? 30;

  const state = data?.state ?? null;
  const queue = data?.queue ?? [];
  const chat = data?.chat ?? [];

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
      // SSE 経由でチャットが更新されるので invalidate 不要
      // フォールバック： SSE 接続がない場合は refetch
      if (Platform.OS !== "web") qc.invalidateQueries({ queryKey: jukeboxKey });
    },
    onError: (e: Error & { body?: string }) => {
      let detail = e.message ?? "送信に失敗しました";
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
        Alert.alert("コメント", detail);
      }
    },
  });

  const nextMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/jukebox/${communityId}/next`),
    onSuccess: () => {
      if (Platform.OS !== "web") qc.invalidateQueries({ queryKey: jukeboxKey });
    },
  });

  const addMutation = useMutation({
    mutationFn: async (video: Video) => {
      const currentFreeRemaining = reqCountData?.freeRemaining ?? 3;

      if (currentFreeRemaining > 0) {
        // Free request — just record it
        await apiRequest("POST", "/api/tickets/record-free-request", { communityId });
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
      setYtUrl("");
      setShowAddModal(false);
      if (Platform.OS !== "web") qc.invalidateQueries({ queryKey: jukeboxKey });
    },
    onError: (err: any) => {
      if (err?.code === "insufficient_tickets") {
        Alert.alert(
          "Not Enough Tickets 🎟",
          `You've used your 3 free requests today.\n\nYou need ${err.required} 🎟 to add more songs but only have ${err.balance} 🎟.`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Get Tickets", onPress: () => router.push("/tickets") },
          ]
        );
      } else {
        Alert.alert("Error", "Failed to add to queue. Please try again.");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: number) => {
      const addedBy = user?.name ? `?addedBy=${encodeURIComponent(user.name)}` : "";
      return apiRequest("DELETE", `/api/jukebox/${communityId}/queue/${itemId}${addedBy}`);
    },
    onSuccess: () => {
      if (Platform.OS !== "web") qc.invalidateQueries({ queryKey: jukeboxKey });
    },
  });

  const handleAddYouTube = async () => {
    const url = ytUrl.trim();
    if (!url) return;
    const idPart = extractYouTubeId(url);
    if (!idPart) {
      alert("Please enter a valid YouTube URL");
      return;
    }
    // YouTube search API で duration を取得（URL 直接追加時）
    let durationSecs = 0;
    try {
      const res = await apiRequest("GET", `/api/youtube/search?q=${encodeURIComponent(idPart)}`);
      const results = (await res.json()) as { videoId: string; durationSecs?: number }[];
      const match = results.find((r) => r.videoId === idPart);
      if (match?.durationSecs) durationSecs = match.durationSecs;
    } catch { /* duration 取得失敗は無視 */ }
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
    } catch (e: any) {
      alert("YouTube search failed. Please try again later.");
    } finally {
      setYtSearching(false);
      setInteractionResumeNonce((n) => n + 1);
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

  const handleNext = useCallback(() => {
    nextMutation.mutate();
  }, [nextMutation]);

  // 入室 = 再生開始（ログインユーザーのみ・負荷軽減）
  // キューに曲があるが isPlaying=false のとき、1回だけ next を呼んで再生を開始する
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (!user) return; // ゲストは不要
    if (autoStartedRef.current) return; // 1回だけ
    if (!data) return; // データ未取得
    const hasQueue = (data.queue ?? []).some((q) => !q.isPlayed);
    if (hasQueue && !data.state?.isPlaying) {
      autoStartedRef.current = true;
      nextMutation.mutate();
    } else if (data.state?.isPlaying || (data.queue ?? []).length === 0) {
      // 既に再生中 or キュー空 → 自動開始不要フラグを立てる
      autoStartedRef.current = true;
    }
  }, [data, user]);

  useEffect(() => {
    if (chat.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [chat.length]);



  // プレイリスト取得（モーダル表示時・ログイン済み）
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
  }, [showAddModal, user?.id]);

  // プレイリスト内の動画取得
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
  }, [selectedPlaylistId, user?.id]);

  // 横向き: チャットパネルの translateY（0=閉じ, 1=開く）
  const panelH = winH * 0.55;
  const translateY = chatPanelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [panelH, 0],
  });

  // 最新チャット1件
  const latestChat = chat.length > 0 ? chat[chat.length - 1] : null;

  const jukeboxAddPanelCore = (
    <>
      <Text style={styles.modalTitle}>Add to Jukebox</Text>
      <Text style={{ fontSize: 11, color: C.textMuted, textAlign: "center", marginBottom: 8, lineHeight: 16 }}>
        ⚠️ Videos longer than 10 minutes will be skipped at the 10-minute mark
      </Text>
      <View style={styles.ytInputSection}>
        <Text style={styles.ytLabel}>Search YouTube</Text>
        <View style={styles.ytRow}>
          <TextInput
            style={styles.ytInput}
            placeholder="Search by song or channel name"
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
          >
            <Ionicons name="search" size={16} color="#fff" />
            <Text style={styles.ytSearchButtonText}>{ytSearching ? "Searching..." : "Search"}</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.ytInputSection}>
        <Text style={styles.ytLabel}>Add from YouTube URL</Text>
        <View style={styles.ytRow}>
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
              <Text style={styles.ytPlaylistLoginText}>Sign in with Google to view your playlists</Text>
            </Pressable>
          ) : ytPlaylistsLoading ? (
            <Text style={styles.ytPlaylistLoading}>Loading...</Text>
          ) : selectedPlaylistId ? (
            <View>
              <Pressable style={styles.ytPlaylistBack} onPress={() => setSelectedPlaylistId(null)}>
                <Ionicons name="chevron-back" size={16} color={C.accent} />
                <Text style={styles.ytPlaylistBackText}>Back to playlists</Text>
              </Pressable>
              <ScrollView style={webScrollStyle(styles.ytPlaylistItemsScroll)} showsVerticalScrollIndicator={scrollShowsVertical}>
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
                      <Image source={{ uri: item.thumbnail }} style={styles.modalThumb} contentFit="cover" />
                      <View style={styles.modalItemInfo}>
                        <Text style={styles.modalItemTitle} numberOfLines={2}>
                          {item.title}
                        </Text>
                        <View style={styles.modalItemMeta}>
                          <Ionicons name="list" size={12} color={C.accent} />
                          <Text style={styles.modalItemMetaText}>From playlist</Text>
                        </View>
                      </View>
                      <Ionicons name="add-circle" size={24} color={C.accent} />
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
            <Text style={styles.ytPlaylistEmpty}>No playlists found</Text>
          )}
        </View>
      )}
      <ScrollView style={webScrollStyle(styles.modalList)} showsVerticalScrollIndicator={scrollShowsVertical}>
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
                  <Image source={{ uri: r.thumbnail }} style={styles.modalThumb} contentFit="cover" />
                  <View style={styles.modalItemInfo}>
                    <Text style={styles.modalItemTitle} numberOfLines={2}>
                      {r.title}
                    </Text>
                    <View style={styles.modalItemMeta}>
                      <Ionicons name="logo-youtube" size={12} color="#FF0000" />
                      <Text style={styles.modalItemMetaText}>Add from YouTube</Text>
                    </View>
                  </View>
                  <Ionicons name="add-circle" size={24} color={C.accent} />
                </Pressable>
              );
            })}
          </>
        )}
        <Text style={styles.modalSubtitle}>My Purchased Videos</Text>
        {purchasedVideos.length === 0 && <Text style={styles.emptyPurchasedText}>No purchased videos yet</Text>}
        {purchasedVideos.map((video) => (
          <Pressable
            key={video.id}
            style={styles.modalItem}
            onPress={() => addMutation.mutate(video)}
            disabled={addMutation.isPending}
          >
            <Image source={{ uri: video.thumbnail }} style={styles.modalThumb} contentFit="cover" />
            <View style={styles.modalItemInfo}>
              <Text style={styles.modalItemTitle} numberOfLines={2}>
                {video.title}
              </Text>
              <View style={styles.modalItemMeta}>
                <Ionicons name="checkmark-circle" size={12} color={C.green} />
                <Text style={styles.modalItemMetaText}>Purchased · 🎟{video.price?.toLocaleString()}</Text>
              </View>
            </View>
            <Ionicons name="add-circle" size={24} color={C.accent} />
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
                <Image source={{ uri: video.thumbnail }} style={styles.modalThumb} contentFit="cover" />
                <View style={styles.modalItemInfo}>
                  <Text style={styles.modalItemTitle} numberOfLines={2}>
                    {video.title}
                  </Text>
                  <View style={styles.modalItemMeta}>
                    <Ionicons name="person-circle" size={12} color={C.accent} />
                    <Text style={styles.modalItemMetaText}>
                      My post · {video.price ? `🎟${video.price.toLocaleString()}` : "Free"}
                    </Text>
                  </View>
                </View>
                <Ionicons name="add-circle" size={24} color={C.accent} />
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
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
            <View style={styles.headerCenter}>
              <View style={styles.jukeboxBadge}>
                <Ionicons name="musical-notes" size={11} color="#fff" />
                <Text style={styles.jukeboxBadgeText}>JUKEBOX</Text>
              </View>
              <Text style={styles.headerTitle}>Community Watch Party</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>
          <View style={styles.desktopPlayerWrap}>
            <NowPlaying
              state={state}
              onNext={handleNext}
              addModalOpen={false}
              embedInSidebarColumn
              interactionResumeNonce={interactionResumeNonce}
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
              onDelete={(id) => deleteMutation.mutate(id)}
              onAdd={() => {}}
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
              contentContainerStyle={styles.chatListContent}
              showsVerticalScrollIndicator={scrollShowsVertical}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
              removeClippedSubviews={false}
              renderItem={({ item }) => (
                <View style={[styles.chatMsg, item.username === (user?.name ?? "Guest") && styles.chatMsgMine]}>
                  {item.username !== (user?.name ?? "Guest") &&
                    (item.avatar ? (
                      <Image source={{ uri: item.avatar }} style={styles.chatAvatar} contentFit="cover" />
                    ) : (
                      <View style={[styles.chatAvatar, { backgroundColor: C.surface3, alignItems: "center", justifyContent: "center" }]}>
                        <Ionicons name="person" size={12} color={C.textMuted} />
                      </View>
                    ))}
                  <View style={[styles.chatBubble, item.username === (user?.name ?? "Guest") && styles.chatBubbleMine]}>
                    {item.username !== (user?.name ?? "Guest") && <Text style={styles.chatUsername}>{item.username}</Text>}
                    <Text style={[styles.chatText, item.username === (user?.name ?? "Guest") && styles.chatTextMine]}>{item.message}</Text>
                  </View>
                </View>
              )}
            />
            <View style={[styles.inputRow, { paddingBottom: bottomInset + 8 }]}>
              <TextInput
                style={styles.input}
                placeholder="Add a comment..."
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
      /** ネイティブでは KAV の padding アニメが TextInput フォーカスと競合しキーボードが即閉じることがある。Web のみ有効。 */
      enabled={Platform.OS === "web" && !showAddModal}
    >
      <View style={[styles.container]}>
        {/* Header: portrait only */}
        {!isLandscape && (
          <View style={[styles.header, { paddingTop: topInset + 8 }]}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
            <View style={styles.headerCenter}>
              <View style={styles.jukeboxBadge}>
                <Ionicons name="musical-notes" size={11} color="#fff" />
                <Text style={styles.jukeboxBadgeText}>JUKEBOX</Text>
              </View>
              <Text style={styles.headerTitle}>Community Watch Party</Text>
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
            onNext={handleNext}
            addModalOpen={showAddModal}
            interactionResumeNonce={interactionResumeNonce}
          />
        </View>

        {/* Portrait: queue + chat（WebKit で動画レイヤーより手前に固定し、タッチ・キーボードを奪われにくくする） */}
        {!isLandscape && (
          <View style={styles.portraitBelowPlayer}>
            <QueueRow items={queue} state={state} userName={user?.name} onDelete={(id) => deleteMutation.mutate(id)} onAdd={() => {
              if (!user) { router.push("/auth/login"); return; }
              setShowAddModal(true);
            }} />

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
                contentContainerStyle={styles.chatListContent}
                showsVerticalScrollIndicator={scrollShowsVertical}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="none"
                removeClippedSubviews={false}
                renderItem={({ item }) => (
                  <View style={[styles.chatMsg, item.username === (user?.name ?? "Guest") && styles.chatMsgMine]}>
                    {item.username !== (user?.name ?? "Guest") && (
                      item.avatar ? (
                        <Image source={{ uri: item.avatar }} style={styles.chatAvatar} contentFit="cover" />
                      ) : (
                        <View style={[styles.chatAvatar, { backgroundColor: C.surface3, alignItems: "center", justifyContent: "center" }]}>
                          <Ionicons name="person" size={12} color={C.textMuted} />
                        </View>
                      )
                    )}
                    <View style={[styles.chatBubble, item.username === (user?.name ?? "Guest") && styles.chatBubbleMine]}>
                      {item.username !== (user?.name ?? "Guest") && (
                        <Text style={styles.chatUsername}>{item.username}</Text>
                      )}
                      <Text style={[styles.chatText, item.username === (user?.name ?? "Guest") && styles.chatTextMine]}>
                        {item.message}
                      </Text>
                    </View>
                  </View>
                )}
              />
            </View>

            <View style={[styles.inputRow, { paddingBottom: bottomInset + 8 }]}>
              <TextInput
                style={styles.input}
                placeholder="Add a comment..."
                placeholderTextColor={C.textMuted}
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={sendChat}
                returnKeyType="send"
                editable={!chatMutation.isPending}
                showSoftInputOnFocus
              />
              <Pressable
                style={[styles.sendBtn, (!chatInput.trim() || chatMutation.isPending) && styles.sendBtnDisabled]}
                onPress={sendChat}
                disabled={!chatInput.trim() || chatMutation.isPending}
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
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>

            <Pressable
              style={[styles.landscapeAddBtn, { top: insets.top + 8, right: insets.right + 8 }]}
              onPress={() => {
                if (!user) { router.push("/auth/login"); return; }
                setShowAddModal(true);
              }}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </Pressable>

            {!chatPanelOpen && (
              <Pressable
                style={[styles.landscapeChatBar, { bottom: insets.bottom + 8, left: insets.left + 12, right: insets.right + 12 }]}
                onPress={() => setChatPanelOpen(true)}
              >
                <Ionicons name="chatbubbles" size={13} color={C.accent} />
                {latestChat ? (
                  <Text style={styles.landscapeChatBarText} numberOfLines={1}>
                    <Text style={{ color: C.accent, fontWeight: "700" }}>{latestChat.username}: </Text>
                    {latestChat.message}
                  </Text>
                ) : (
                  <Text style={styles.landscapeChatBarText}>View comments</Text>
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
                  <Pressable onPress={() => setChatPanelOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="chevron-down" size={18} color={C.textMuted} />
                  </Pressable>
                </View>
                <FlatList
                  ref={flatListRef}
                  data={chat}
                  keyExtractor={(item) => item.id.toString()}
                  style={{ flex: 1 }}
                  contentContainerStyle={styles.chatListContent}
                  showsVerticalScrollIndicator={scrollShowsVertical}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="none"
                  removeClippedSubviews={false}
                  renderItem={({ item }) => (
                    <View style={[styles.chatMsg, item.username === (user?.name ?? "Guest") && styles.chatMsgMine]}>
                      {item.username !== (user?.name ?? "Guest") && (
                        item.avatar ? (
                          <Image source={{ uri: item.avatar }} style={styles.chatAvatar} contentFit="cover" />
                        ) : (
                          <View style={[styles.chatAvatar, { backgroundColor: C.surface3, alignItems: "center", justifyContent: "center" }]}>
                            <Ionicons name="person" size={12} color={C.textMuted} />
                          </View>
                        )
                      )}
                      <View style={[styles.chatBubble, item.username === (user?.name ?? "Guest") && styles.chatBubbleMine]}>
                        {item.username !== (user?.name ?? "Guest") && (
                          <Text style={styles.chatUsername}>{item.username}</Text>
                        )}
                        <Text style={[styles.chatText, item.username === (user?.name ?? "Guest") && styles.chatTextMine]}>
                          {item.message}
                        </Text>
                      </View>
                    </View>
                  )}
                />
                <View style={[styles.inputRow, { paddingBottom: bottomInset + 8 }]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Add a comment..."
                    placeholderTextColor={C.textMuted}
                    value={chatInput}
                    onChangeText={setChatInput}
                    onSubmitEditing={sendChat}
                    returnKeyType="send"
                    editable={!chatMutation.isPending}
                    showSoftInputOnFocus
                  />
                  <Pressable
                    style={[styles.sendBtn, (!chatInput.trim() || chatMutation.isPending) && styles.sendBtnDisabled]}
                    onPress={sendChat}
                    disabled={!chatInput.trim() || chatMutation.isPending}
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
          enabled={!kavDisabledOnIosWeb}
        >
        <Pressable style={styles.modalBg} onPress={() => setShowAddModal(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            {jukeboxAddPanelCore}
          </Pressable>
        </Pressable>
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
  headerCenter: { alignItems: "center", gap: 2 },
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
  headerTitle: { color: C.textSec, fontSize: 12 },

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
  // iOS Safari 音声有効化オーバーレイ
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
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
  queueHeaderText: { color: C.accent, fontSize: 11, fontWeight: "800", flex: 1 },
  queueCount: { color: C.textMuted, fontSize: 11 },
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
  input: {
    flex: 1,
    height: 40,
    backgroundColor: C.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    color: C.text,
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: C.surface2 },

  // 横向き専用
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
    zIndex: 50,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
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
  modalSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 16,
    maxHeight: Platform.OS === "web" ? 560 : "65%",
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: "center",
    marginBottom: 14,
  },
  modalTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
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
  ytInput: {
    flex: 1,
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
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalThumb: { width: 64, height: 40, borderRadius: 6 },
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
