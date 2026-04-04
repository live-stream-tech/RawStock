import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  TextInput,
  Animated,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { C } from "@/constants/colors";
import { connectWHIP } from "@/lib/live/whip";
import { apiCreateLiveStream, apiStartLiveStream, apiEndLiveStream, liveApiBase } from "@/lib/live/streamApi";
import { acquireBroadcastMediaStream } from "@/lib/live/webBroadcastMedia";
import type { LiveStreamVisibility } from "@/lib/live/streamApi";
import { webBroadcastNeedsUserGestureForCamera } from "@/lib/pwa-standalone";
import { alertDestructiveConfirm, alertMessage } from "@/lib/alertCompat";
import {
  DeepARBroadcastProcessor,
  type DeepARBroadcastProcessorHandle,
} from "@/components/DeepARBroadcastProcessor";

const DEEPAR_LICENSE_KEY =
  typeof process !== "undefined" && process.env.EXPO_PUBLIC_DEEPAR_KEY
    ? String(process.env.EXPO_PUBLIC_DEEPAR_KEY).trim()
    : "";

function parseRouteVisibility(v: string | undefined): LiveStreamVisibility {
  if (v === "followers" || v === "community") return v;
  return "public";
}

/** 本番は Web / PWA のみ。Expo Go 等で開いた場合の案内 */
function BroadcastNativePlaceholder() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.nonWebRoot, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <Ionicons name="globe-outline" size={48} color={C.textMuted} />
      <Text style={styles.nonWebTitle}>ブラウザまたは PWA で開いてください</Text>
      <Text style={styles.nonWebSub}>
        ライブ配信は Web 版（ホーム画面に追加した RawStock や Chrome / Safari）のみ対応しています。
      </Text>
      <Pressable style={styles.nonWebBtn} onPress={() => router.back()}>
        <Text style={styles.nonWebBtnText}>戻る</Text>
      </Pressable>
    </View>
  );
}

export default function BroadcastScreen() {
  if (Platform.OS !== "web") {
    return <BroadcastNativePlaceholder />;
  }
  return <BroadcastWeb />;
}

function BroadcastWeb() {
  const params = useLocalSearchParams<{ visibility?: string; communityId?: string }>();
  const routeVisibility = parseRouteVisibility(
    typeof params.visibility === "string" ? params.visibility : undefined,
  );
  const routeCommunityId =
    typeof params.communityId === "string" && params.communityId.trim() !== ""
      ? parseInt(params.communityId, 10)
      : NaN;

  const videoRef = useRef<any>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);
  const deepARProcessorRef = useRef<DeepARBroadcastProcessorHandle | null>(null);

  const [phase, setPhase] = useState<"idle" | "creating" | "ready" | "starting" | "live" | "stopping">("idle");
  const [streamId, setStreamId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [viewers, setViewers] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [cameraError, setCameraError] = useState(false);
  const [webPreviewLoading, setWebPreviewLoading] = useState(false);
  const [deeparBusy, setDeeparBusy] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  /** キーがあっても既定はオフ。DeepAR 未同梱・初期化失敗時も生カメラで配信できるようにする */
  const [useDeepARBlur, setUseDeepARBlur] = useState(false);
  const [lastLiveError, setLastLiveError] = useState<string | null>(null);
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const viewersPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const webNeedsCameraTap = webBroadcastNeedsUserGestureForCamera();

  useEffect(() => {
    if (!webNeedsCameraTap) void startWebCamera();
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === "live") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
          Animated.timing(blinkAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
      elapsedRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      viewersPollRef.current = setInterval(async () => {
        if (!streamId) return;
        try {
          const API_BASE = liveApiBase();
          const r = await fetch(`${API_BASE}/api/stream/${streamId}`);
          if (r.ok) {
            const d = await r.json();
            setViewers(d.currentViewers ?? 0);
          }
        } catch {
          /* ignore */
        }
      }, 5000);
    } else {
      blinkAnim.stopAnimation();
      blinkAnim.setValue(1);
      if (elapsedRef.current) clearInterval(elapsedRef.current);
      if (viewersPollRef.current) clearInterval(viewersPollRef.current);
      if (phase === "idle") {
        setElapsed(0);
        setViewers(0);
      }
    }
    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
      if (viewersPollRef.current) clearInterval(viewersPollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- blinkAnim is stable ref-backed Animated.Value
  }, [phase, streamId]);

  const bindWebPreview = async (stream: MediaStream) => {
    localStreamRef.current = stream;
    const el = videoRef.current as HTMLVideoElement | null;
    if (el) {
      el.srcObject = stream;
      try {
        await el.play();
      } catch {
        /* PWA / iOS で無音プレビューは play が弾かれることがある */
      }
    }
    setCameraError(false);
    setDeeparBusy(false);
    setPhase("ready");
  };

  useEffect(() => {
    if (!cameraStream) return;
    if (DEEPAR_LICENSE_KEY && useDeepARBlur) return;
    void bindWebPreview(cameraStream);
  }, [cameraStream, useDeepARBlur]);

  const startWebCamera = async () => {
    setWebPreviewLoading(true);
    if (DEEPAR_LICENSE_KEY && useDeepARBlur) setDeeparBusy(true);
    try {
      const stream = await acquireBroadcastMediaStream();
      rawStreamRef.current = stream;
      setCameraStream(stream);
    } catch {
      setCameraError(true);
      setDeeparBusy(false);
    } finally {
      setWebPreviewLoading(false);
    }
  };

  const cleanup = () => {
    deepARProcessorRef.current?.dispose();
    deepARProcessorRef.current = null;
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (rawStreamRef.current) {
      rawStreamRef.current.getTracks().forEach((t) => {
        if (t.readyState !== "ended") t.stop();
      });
      rawStreamRef.current = null;
    }
    setCameraStream(null);
    setDeeparBusy(false);
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const handleGoLive = async () => {
    setLastLiveError(null);
    if (!title.trim()) {
      const msg = "配信タイトルを入力してください。";
      alertMessage("ライブ配信", msg);
      setLastLiveError(msg);
      return;
    }
    if (!localStreamRef.current) {
      try {
        const stream = await acquireBroadcastMediaStream();
        rawStreamRef.current = stream;
        setCameraStream(stream);
        if (!DEEPAR_LICENSE_KEY || !useDeepARBlur) {
          await bindWebPreview(stream);
        } else {
          setDeeparBusy(true);
        }
      } catch {
        const msg =
          "カメラとマイクの許可が必要です。PWA の場合は設定アプリから RawStock（Safari）のカメラ・マイクをオンにしてください。";
        alertMessage("ライブ配信", msg);
        setLastLiveError(msg);
        return;
      }
    }
    if (!localStreamRef.current) {
      const msg = "カメラとマイクの許可が必要です。";
      alertMessage("ライブ配信", msg);
      setLastLiveError(msg);
      return;
    }
    let createdStreamId: number | null = null;
    try {
      setPhase("creating");
      const { id, whipUrl: wUrl } = await apiCreateLiveStream(title, {
        visibility: routeVisibility,
        restrictedCommunityId:
          routeVisibility === "community" && Number.isFinite(routeCommunityId)
            ? routeCommunityId
            : undefined,
      });
      createdStreamId = id;
      setStreamId(id);
      setPhase("starting");
      const pc = await connectWHIP(wUrl, localStreamRef.current);
      pcRef.current = pc;
      await apiStartLiveStream(id);
      setPhase("live");
      setLastLiveError(null);
    } catch (e: any) {
      console.error("GoLive error:", e);
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (createdStreamId != null) {
        try {
          await apiEndLiveStream(createdStreamId);
        } catch {
          /* 作成直後の失敗時は end が効かない場合もある */
        }
      }
      setStreamId(null);
      const errText =
        e?.message ?? "配信を開始できませんでした。ネットワークとマイク・カメラを確認してください。";
      alertMessage("ライブ配信", errText);
      setLastLiveError(errText);
      setPhase("ready");
    }
  };

  const handleStop = () => {
    alertDestructiveConfirm(
      "配信を終了",
      "ライブ配信を終了しますか？",
      async () => {
        setPhase("stopping");
        try {
          if (streamId) await apiEndLiveStream(streamId);
        } catch {
          /* ignore */
        }
        cleanup();
        setPhase("idle");
        router.back();
      },
      { confirmLabel: "終了", cancelLabel: "キャンセル" },
    );
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const isLive = phase === "live";
  const isLoading = phase === "creating" || phase === "starting" || phase === "stopping";
  const topInset = 67;
  const bottomInset = 34;

  const goLiveDisabled =
    isLoading ||
    webPreviewLoading ||
    deeparBusy ||
    cameraError ||
    !title.trim() ||
    !localStreamRef.current;

  const showDeepARToggle = Boolean(DEEPAR_LICENSE_KEY) && !isLive;

  return (
    <View style={styles.container}>
      <View style={styles.cameraArea}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: "scaleX(-1)",
            display: "block",
          }}
        />

        {DEEPAR_LICENSE_KEY && useDeepARBlur && cameraStream ? (
          <DeepARBroadcastProcessor
            ref={deepARProcessorRef}
            rawStream={cameraStream}
            licenseKey={DEEPAR_LICENSE_KEY}
            blurStrength={5}
            onReady={(merged) => {
              void bindWebPreview(merged);
            }}
            onError={(msg) => {
              setLastLiveError(msg);
              setDeeparBusy(false);
              const s = rawStreamRef.current;
              if (s) void bindWebPreview(s);
            }}
          />
        ) : null}

        {cameraError && (
          <View style={styles.cameraErrorOverlay}>
            <Ionicons name="videocam-off-outline" size={48} color="#ffffff88" />
            <Text style={styles.cameraErrorText}>カメラ・マイクが使えません</Text>
            <Text style={styles.cameraErrorSub}>
              設定でカメラとマイクを許可するか、下のボタンでもう一度お試しください。
            </Text>
            <Pressable style={styles.pwaCameraRetryBtn} onPress={() => void startWebCamera()}>
              <Text style={styles.pwaCameraRetryText}>もう一度許可する</Text>
            </Pressable>
          </View>
        )}

        {webNeedsCameraTap && !cameraStream && !cameraError && (
          <View style={styles.pwaCameraGate}>
            {webPreviewLoading ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <>
                <Text style={styles.pwaCameraGateTitle}>PWA / モバイルでは先に許可が必要です</Text>
                <Text style={styles.pwaCameraGateSub}>下のボタンをタップしてカメラとマイクをオンにしてください</Text>
                <Pressable style={styles.pwaCameraPrimaryBtn} onPress={() => void startWebCamera()}>
                  <Ionicons name="videocam" size={20} color="#000" />
                  <Text style={styles.pwaCameraPrimaryText}>カメラ・マイクを許可</Text>
                </Pressable>
              </>
            )}
          </View>
        )}

        <View style={[styles.topOverlay, { paddingTop: topInset + 8 }]}>
          <Pressable
            style={styles.closeButton}
            onPress={() => {
              if (isLive) handleStop();
              else {
                cleanup();
                router.back();
              }
            }}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>

          <View style={styles.topCenter}>
            {isLive ? (
              <>
                <Animated.View style={[styles.liveBadge, { opacity: blinkAnim }]}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </Animated.View>
                <Text style={styles.elapsedText}>{formatTime(elapsed)}</Text>
              </>
            ) : isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.readyText}>配信準備</Text>
            )}
          </View>

          {isLive ? (
            <View style={styles.viewersBadge}>
              <Ionicons name="people" size={14} color="#fff" />
              <Text style={styles.viewersText}>{viewers}</Text>
            </View>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>
      </View>

      <View style={[styles.controls, { paddingBottom: bottomInset + 12 }]}>
        {!isLive && (
          <View style={styles.titleRow}>
            <Ionicons name="create-outline" size={16} color={C.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.titleInput}
              placeholder="配信タイトル（必須）"
              placeholderTextColor={C.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={60}
              editable={!isLoading}
            />
          </View>
        )}

        {showDeepARToggle ? (
          <Pressable
            style={styles.deeparToggleRow}
            onPress={() => {
              if (isLoading || webPreviewLoading) return;
              setUseDeepARBlur((v) => !v);
            }}
            disabled={isLoading || webPreviewLoading}
          >
            <Ionicons
              name={useDeepARBlur ? "checkmark-circle" : "ellipse-outline"}
              size={22}
              color={useDeepARBlur ? C.accent : C.textMuted}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.deeparToggleTitle}>背景ぼかし（DeepAR）</Text>
              <Text style={styles.deeparToggleSub}>オフにすると従来どおり生カメラのみです</Text>
            </View>
          </Pressable>
        ) : null}

        {isLive ? (
          <View style={styles.liveControls}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="people" size={16} color={C.accent} />
                <Text style={styles.statValue}>{viewers}</Text>
                <Text style={styles.statLabel}>Viewers</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="time-outline" size={16} color={C.accent} />
                <Text style={styles.statValue}>{formatTime(elapsed)}</Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="shield-checkmark-outline" size={16} color={C.green} />
                <Text style={[styles.statValue, { color: C.green }]}>Max 20</Text>
                <Text style={styles.statLabel}>Concurrent</Text>
              </View>
            </View>
            <Pressable style={styles.stopBtn} onPress={handleStop}>
              <View style={styles.stopDot} />
              <Text style={styles.stopBtnText}>配信を終了</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Pressable
              style={[styles.goLiveBtn, goLiveDisabled && styles.goLiveBtnDisabled]}
              onPress={handleGoLive}
              disabled={goLiveDisabled}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <View style={styles.goLiveDot} />
                  <Text style={styles.goLiveBtnText}>
                    {webNeedsCameraTap && !cameraStream ? "先にカメラを許可" : "配信開始"}
                  </Text>
                </>
              )}
            </Pressable>
            {lastLiveError ? (
              <Text style={styles.liveErrorBanner} accessibilityLiveRegion="polite">
                {lastLiveError}
              </Text>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nonWebRoot: {
    flex: 1,
    backgroundColor: C.bg,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  nonWebTitle: { color: C.text, fontSize: 18, fontWeight: "800", textAlign: "center" },
  nonWebSub: { color: C.textMuted, fontSize: 14, textAlign: "center", lineHeight: 21 },
  nonWebBtn: {
    marginTop: 8,
    backgroundColor: C.accent,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  nonWebBtnText: { color: "#000", fontSize: 16, fontWeight: "800" },
  container: { flex: 1, backgroundColor: "#000" },
  cameraArea: { flex: 1, backgroundColor: "#000", overflow: "hidden" },
  pwaCameraGate: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.72)",
    paddingHorizontal: 28,
    gap: 14,
  },
  pwaCameraGateTitle: { color: "#fff", fontSize: 16, fontWeight: "800", textAlign: "center" },
  pwaCameraGateSub: { color: "#ffffffaa", fontSize: 13, textAlign: "center", lineHeight: 19 },
  pwaCameraPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.accent,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
    marginTop: 6,
  },
  pwaCameraPrimaryText: { color: "#000", fontSize: 16, fontWeight: "800" },
  pwaCameraRetryBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  pwaCameraRetryText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  cameraErrorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    gap: 10,
  },
  cameraErrorText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cameraErrorSub: { color: "#ffffff88", fontSize: 13, textAlign: "center", paddingHorizontal: 24 },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  topCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.live,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#fff" },
  liveBadgeText: { color: "#fff", fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  elapsedText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  readyText: { color: "#ffffffcc", fontSize: 14, fontWeight: "600" },
  viewersBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  viewersText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  controls: {
    backgroundColor: C.bg,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  titleInput: { flex: 1, color: C.text, fontSize: 14 },
  deeparToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  deeparToggleTitle: { color: C.text, fontSize: 14, fontWeight: "700" },
  deeparToggleSub: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  goLiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.live,
    borderRadius: 14,
    paddingVertical: 15,
  },
  goLiveBtnDisabled: { opacity: 0.5 },
  goLiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  goLiveBtnText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },
  liveErrorBanner: {
    marginTop: 10,
    color: "#ff8a80",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  liveControls: { gap: 12 },
  statsRow: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  statItem: { flex: 1, alignItems: "center", gap: 3 },
  statDivider: { width: 1, height: 36, backgroundColor: C.border },
  statValue: { color: C.text, fontSize: 16, fontWeight: "800" },
  statLabel: { color: C.textMuted, fontSize: 11 },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#ff4d0022",
  },
  stopDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ff4d00" },
  stopBtnText: { color: "#ff4d00", fontSize: 15, fontWeight: "700" },
});
