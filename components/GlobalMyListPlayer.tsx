import React, { useEffect, useRef, useState } from "react";
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
import { C } from "@/constants/colors";
import { usePlayingVideo } from "@/lib/playing-video-context";

export function GlobalMyListPlayer() {
  const pathname = usePathname();
  const { playing, stopPlaying, jukeboxIsActive } = usePlayingVideo();
  const [dismissed, setDismissed] = useState(true);
  const youtubePlayerRef = useRef<any | null>(null);
  const containerIdRef = useRef<string>(`global-ml-${Math.random().toString(36).slice(2)}`).current;
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const isOnVideoPage = pathname?.match(/\/video\/(\d+)/) != null;
  const match = pathname?.match(/\/video\/(\d+)/);
  const currentVideoId = match ? parseInt(match[1], 10) : null;
  const isCurrentVideo = isOnVideoPage && playing && currentVideoId === playing.videoId;

  // ビデオページから離脱したらミニプレイヤーを自動表示（Spotify 風）
  const prevIsOnVideoPageRef = useRef(isOnVideoPage);
  useEffect(() => {
    const wasOnVideo = prevIsOnVideoPageRef.current;
    prevIsOnVideoPageRef.current = isOnVideoPage;
    if (wasOnVideo && !isOnVideoPage && playing) {
      setDismissed(false);
    }
  }, [isOnVideoPage, playing]);

  // playing が null になったら dismissed をリセット
  useEffect(() => {
    if (!playing) setDismissed(true);
  }, [playing]);

  // YouTube IFrame（Web）
  useEffect(() => {
    if (Platform.OS !== "web" || !playing?.youtubeId) return;
    const vid = playing.youtubeId;
    let cancelled = false;

    function ensureYT(): Promise<any> {
      return new Promise((resolve) => {
        const w = window as any;
        if (w.YT?.Player) {
          resolve(w.YT);
          return;
        }
        const prev = w.onYouTubeIframeAPIReady;
        w.onYouTubeIframeAPIReady = () => {
          if (prev) prev();
          resolve(w.YT);
        };
        if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
          const s = document.createElement("script");
          s.src = "https://www.youtube.com/iframe_api";
          document.body.appendChild(s);
        }
      });
    }

    ensureYT().then((YT: any) => {
      if (cancelled) return;
      const el = document.getElementById(containerIdRef);
      if (!el) return;

      if (youtubePlayerRef.current) {
        try {
          youtubePlayerRef.current.loadVideoById(vid);
        } catch {
          try {
            youtubePlayerRef.current.destroy();
          } catch {}
          youtubePlayerRef.current = null;
        }
      }

      if (!youtubePlayerRef.current) {
        youtubePlayerRef.current = new YT.Player(containerIdRef, {
          videoId: vid,
          playerVars: {
            autoplay: 1,
            rel: 0,
            controls: 1,
            playsinline: 1,
          },
          events: {
            onReady: (e: any) => {
              try {
                e.target?.unMute?.();
              } catch {}
            },
          },
        });
      }
    });

    return () => {
      cancelled = true;
      if (youtubePlayerRef.current) {
        try {
          youtubePlayerRef.current.destroy();
        } catch {}
        youtubePlayerRef.current = null;
      }
    };
  }, [playing?.youtubeId, containerIdRef]);

  // HTML5 video（videoUrl）
  useEffect(() => {
    if (Platform.OS !== "web" || !playing?.videoUrl) return;
    const el = document.getElementById(`ml-video-${containerIdRef}`) as HTMLVideoElement | null;
    if (el) {
      videoRef.current = el;
      el.src = playing.videoUrl;
      el.play().catch(() => {});
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = "";
        videoRef.current = null;
      }
    };
  }, [playing?.videoUrl, containerIdRef]);

  if (!playing) return null;
  if (!playing.youtubeId && !playing.videoUrl) return null;

  const hasYoutube = !!playing.youtubeId;

  return (
    <View pointerEvents="box-none" style={[styles.root, StyleSheet.absoluteFill]}>
      {/* 単一プレイヤー要素（常にマウント、位置のみ変更で音切れ防止） */}
      <View
        style={[
          styles.playerShell,
          isCurrentVideo && styles.playerShellFull,
          !isCurrentVideo && styles.playerShellHidden,
        ]}
        pointerEvents="none"
      >
        {Platform.OS === "web" && hasYoutube ? (
          <View style={styles.ytWrap} nativeID={containerIdRef} />
        ) : null}
        {Platform.OS === "web" && playing.videoUrl ? (
          <video
            id={`ml-video-${containerIdRef}`}
            src={playing.videoUrl}
            style={isCurrentVideo ? styles.fullVideoEl : styles.hiddenVideo}
            playsInline
            muted={false}
            controls={isCurrentVideo ?? false}
          />
        ) : null}
      </View>

      {/* 動画ページ上: フルスクリーン閉じるボタン */}
      {isCurrentVideo && (
        <View style={[styles.fullOverlay, StyleSheet.absoluteFill]} pointerEvents="box-none">
          <Pressable style={styles.fullCloseBtn} onPress={() => stopPlaying()}>
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
        </View>
      )}

      {/* 動画ページ外: Spotify 風ミニプレイヤーバー */}
      {!isCurrentVideo && !dismissed && (
        <View style={[styles.bar, jukeboxIsActive && styles.barWithJukebox]}>
          {/* プログレスバー（バー上部） */}
          <View style={styles.barProgress} />

          <View style={styles.barRow}>
            {/* サムネイル */}
            <Pressable
              style={styles.barThumbWrap}
              onPress={() => router.push(`/video/${playing.videoId}`)}
            >
              {playing.thumbnail ? (
                <Image
                  source={{ uri: playing.thumbnail }}
                  style={styles.barThumb}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.barThumb, { backgroundColor: C.surface3, alignItems: "center", justifyContent: "center" }]}>
                  <Ionicons name="play" size={16} color={C.accent} />
                </View>
              )}
            </Pressable>

            {/* タイトル */}
            <Pressable
              style={styles.barInfo}
              onPress={() => router.push(`/video/${playing.videoId}`)}
            >
              <Text style={styles.barTitle} numberOfLines={1}>
                {playing.title}
              </Text>
              <Text style={styles.barSubtitle} numberOfLines={1}>
                タップして再生ページへ
              </Text>
            </Pressable>

            {/* 動画ページへ */}
            <Pressable
              style={styles.barIconBtn}
              onPress={() => router.push(`/video/${playing.videoId}`)}
            >
              <Ionicons name="play-circle" size={22} color={C.accent} />
            </Pressable>

            {/* 停止 */}
            <Pressable
              style={styles.barIconBtn}
              onPress={() => {
                stopPlaying();
                setDismissed(true);
              }}
            >
              <Ionicons name="close" size={18} color={C.textSec} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: "absolute", pointerEvents: "box-none" },
  playerShell: {
    position: "absolute",
    overflow: "hidden",
    zIndex: 999,
  },
  playerShellFull: {
    left: "50%",
    top: "50%",
    width: "100%",
    maxWidth: 800,
    height: 450,
    marginLeft: -400,
    marginTop: -225,
  },
  playerShellHidden: {
    left: -9999,
    top: 0,
    width: 320,
    height: 180,
    opacity: 0,
  },
  ytWrap: { width: "100%", height: "100%" },
  hiddenVideo: { position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 },
  fullVideoEl: { width: "100%", height: "100%", objectFit: "contain" },
  fullOverlay: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 1001,
  },
  fullCloseBtn: {
    position: "absolute",
    top: 48,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  // Spotify 風バースタイル
  bar: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 68, // タブバーの上（60px + マージン8px）
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
    zIndex: 1000,
  },
  barProgress: {
    height: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    width: "100%",
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
    flexShrink: 0,
  },
  // Jukeboxバーが表示中は上にスタック
  barWithJukebox: {
    bottom: 136, // 68 + 64 (Jukeboxバーの高さ) + 4
  },
});
