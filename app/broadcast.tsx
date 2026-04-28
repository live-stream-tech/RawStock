import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { useQueryClient } from "@tanstack/react-query";
import { C } from "@/constants/colors";
import { connectWHIP } from "@/lib/live/whip";
import {
  apiCreateLiveStream,
  apiStartLiveStream,
  apiEndLiveStream,
  liveApiBase,
  liveAuthHeaders,
} from "@/lib/live/streamApi";
import { acquireBroadcastMediaStream } from "@/lib/live/webBroadcastMedia";
import { FaceFilterWeb, type FaceFilterWebHandle } from "@/components/web/FaceFilter";
import type { LiveStreamVisibility } from "@/lib/live/streamApi";
import { webBroadcastNeedsUserGestureForCamera } from "@/lib/pwa-standalone";
import { alertDestructiveConfirm, alertMessage } from "@/lib/alertCompat";
import { isBroadcastJapaneseUi } from "@/lib/broadcastLocale";
import { getBroadcastStrings } from "@/lib/broadcastStrings";
import { useAuth } from "@/lib/auth";

function parseRouteVisibility(v: string | undefined): LiveStreamVisibility {
  if (v === "followers" || v === "community" || v === "paid") return v;
  return "public";
}

/**
 * Plain camera preview when Jeeliz face filter is skipped (web only).
 * Mount `<video>` imperatively so SSR/hydration HTML matches (avoids React #418 from raw `<video>` in RN tree).
 */
function WebBroadcastCameraPreview({ stream }: { stream: MediaStream }) {
  const hostRef = useRef<View | null>(null);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const host = hostRef.current as unknown as HTMLDivElement | null;
    if (!host) return;
    const v = document.createElement("video");
    v.autoplay = true;
    v.muted = true;
    v.playsInline = true;
    v.setAttribute("playsinline", "true");
    v.style.cssText =
      "width:100%;height:100%;object-fit:cover;transform:scaleX(-1);background:#000;display:block;";
    v.srcObject = stream;
    void v.play().catch(() => undefined);
    host.appendChild(v);
    return () => {
      try {
        v.pause();
        v.srcObject = null;
      } catch {
        /* ignore */
      }
      v.remove();
    };
  }, [stream]);
  return <View ref={hostRef} style={styles.cameraPreviewHost} pointerEvents="none" collapsable={false} />;
}

/** Production broadcasting is Web/PWA-only; show fallback on other platforms. */
function BroadcastNativePlaceholder() {
  const insets = useSafeAreaInsets();
  const t = getBroadcastStrings(isBroadcastJapaneseUi());
  return (
    <View style={[styles.nonWebRoot, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <Ionicons name="globe-outline" size={48} color={C.textMuted} />
      <Text style={styles.nonWebTitle}>{t.nonWebTitle}</Text>
      <Text style={styles.nonWebSub}>{t.nonWebSub}</Text>
      <Pressable style={styles.nonWebBtn} onPress={() => router.back()}>
        <Text style={styles.nonWebBtnText}>{t.nonWebBack}</Text>
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
  const t = getBroadcastStrings(isBroadcastJapaneseUi());
  const { user, requireAuth } = useAuth();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ visibility?: string; communityId?: string; ticketPrice?: string }>();
  const routeVisibility = parseRouteVisibility(
    typeof params.visibility === "string" ? params.visibility : undefined,
  );
  const routeCommunityId =
    typeof params.communityId === "string" && params.communityId.trim() !== ""
      ? parseInt(params.communityId, 10)
      : NaN;
  const routeTicketPrice =
    typeof params.ticketPrice === "string" && params.ticketPrice.trim() !== ""
      ? parseInt(params.ticketPrice, 10)
      : NaN;

  const faceFilterRef = useRef<FaceFilterWebHandle | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<"idle" | "creating" | "ready" | "starting" | "live" | "stopping">("idle");
  const [streamId, setStreamId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [viewers, setViewers] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [cameraError, setCameraError] = useState(false);
  const [webPreviewLoading, setWebPreviewLoading] = useState(false);
  /** Jeeliz output (canvas + mic) when ready; null until FaceFilter reports. */
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  /** Raw getUserMedia stream passed into FaceFilter. */
  const [jeelizSourceStream, setJeelizSourceStream] = useState<MediaStream | null>(null);
  /** Default to raw camera on web for stable startup; face filter can be re-enabled later. */
  const [skipFaceFilter, setSkipFaceFilter] = useState(true);
  const [lastLiveError, setLastLiveError] = useState<string | null>(null);
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const viewersPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const webNeedsCameraTap = webBroadcastNeedsUserGestureForCamera();

  const onJeelizOutputStream = useCallback((stream: MediaStream | null) => {
    if (stream) {
      localStreamRef.current = stream;
      setCameraStream(stream);
      setCameraError(false);
      setPhase("ready");
      setLastLiveError(null);
    } else {
      localStreamRef.current = null;
      setCameraStream(null);
    }
  }, []);

  const onJeelizError = useCallback((message: string) => {
    const raw = rawStreamRef.current;
    if (raw) {
      void (async () => {
        try {
          await faceFilterRef.current?.destroy?.();
        } catch {
          /* ignore */
        }
        setSkipFaceFilter(true);
        setJeelizSourceStream(null);
        localStreamRef.current = raw;
        setCameraStream(raw);
        setCameraError(false);
        setPhase("ready");
        setLastLiveError(`Face filter is unavailable, so live uses normal camera. ${message}`);
        setWebPreviewLoading(false);
      })();
      return;
    }
    setCameraError(true);
    setLastLiveError(message);
    setWebPreviewLoading(false);
  }, []);

  /** If Jeeliz never calls back (CDN hang, WebGL stall), do not block Go live forever. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!jeelizSourceStream || skipFaceFilter) return;
    const raw = rawStreamRef.current;
    if (!raw) return;
    const tid = window.setTimeout(() => {
      if (localStreamRef.current) return;
      void (async () => {
        try {
          await faceFilterRef.current?.destroy?.();
        } catch {
          /* ignore */
        }
        setSkipFaceFilter(true);
        setJeelizSourceStream(null);
        localStreamRef.current = raw;
        setCameraStream(raw);
        setCameraError(false);
        setPhase("ready");
        setLastLiveError(
          "Face filter took too long to start; using normal camera. Try reloading if this keeps happening.",
        );
        setWebPreviewLoading(false);
      })();
    }, 22000);
    return () => window.clearTimeout(tid);
  }, [jeelizSourceStream, skipFaceFilter]);

  useEffect(() => {
    if (!webNeedsCameraTap) void startWebCamera();
    return () => {
      void cleanup();
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
          const r = await fetch(`${API_BASE}/api/stream/${streamId}`, {
            credentials: "include",
            headers: await liveAuthHeaders(),
          });
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

  const startWebCamera = async () => {
    setWebPreviewLoading(true);
    setCameraError(false);
    setLastLiveError(null);
    setSkipFaceFilter(true);
    try {
      const raw = await acquireBroadcastMediaStream();
      rawStreamRef.current = raw;
      // Stable default path: avoid filter init stalls and go live immediately.
      localStreamRef.current = raw;
      setCameraStream(raw);
      setPhase("ready");
      setJeelizSourceStream(null);
    } catch {
      setCameraError(true);
    } finally {
      setWebPreviewLoading(false);
    }
  };

  const cleanup = async () => {
    try {
      await faceFilterRef.current?.destroy?.();
    } catch {
      /* ignore */
    }
    setJeelizSourceStream(null);
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
    setSkipFaceFilter(false);
  };

  const handleGoLive = async () => {
    setLastLiveError(null);
    if (!requireAuth("start a live broadcast")) {
      return;
    }
    if (!title.trim()) {
      const msg = t.titleRequired;
      alertMessage(t.alertTitleLive, msg);
      setLastLiveError(msg);
      return;
    }
    if (!localStreamRef.current) {
      try {
        const raw = await acquireBroadcastMediaStream();
        rawStreamRef.current = raw;
        setJeelizSourceStream(raw);
      } catch {
        const msg = t.cameraPermissionPWA;
        alertMessage(t.alertTitleLive, msg);
        setLastLiveError(msg);
        return;
      }
      const deadline = Date.now() + 20000;
      while (!localStreamRef.current && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 80));
      }
    }
    if (!localStreamRef.current) {
      const msg = t.cameraPermissionShort;
      alertMessage(t.alertTitleLive, msg);
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
        ticketPrice:
          routeVisibility === "paid" && Number.isFinite(routeTicketPrice)
            ? routeTicketPrice
            : undefined,
      });
      createdStreamId = id;
      setStreamId(id);
      setPhase("starting");
      const pc = await connectWHIP(wUrl, localStreamRef.current);
      pcRef.current = pc;
      await apiStartLiveStream(id);
      void qc.invalidateQueries({ queryKey: ["/api/live-streams"] });
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
          /* Immediately after creation, end may fail in some cases. */
        }
      }
      setStreamId(null);
      const errText = e?.message ?? t.goLiveFailed;
      alertMessage(t.alertTitleLive, errText);
      setLastLiveError(errText);
      setPhase("ready");
    }
  };

  const handleStop = () => {
    alertDestructiveConfirm(
      t.endConfirmTitle,
      t.endConfirmMessage,
      async () => {
        setPhase("stopping");
        try {
          if (streamId) await apiEndLiveStream(streamId);
          void qc.invalidateQueries({ queryKey: ["/api/live-streams"] });
        } catch {
          /* ignore */
        }
        await cleanup();
        setPhase("idle");
        router.back();
      },
      { confirmLabel: t.endConfirmOk, cancelLabel: t.endCancel },
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
    cameraError ||
    !user ||
    !title.trim() ||
    !cameraStream;

  return (
    <View style={styles.container}>
      <View style={styles.cameraArea}>
        {skipFaceFilter && cameraStream ? (
          <WebBroadcastCameraPreview stream={cameraStream} />
        ) : (
          <FaceFilterWeb
            ref={faceFilterRef}
            sourceStream={jeelizSourceStream}
            onOutputStream={onJeelizOutputStream}
            onError={onJeelizError}
          />
        )}

        {cameraError && (
          <View style={styles.cameraErrorOverlay}>
            <Ionicons name="videocam-off-outline" size={48} color="#ffffff88" />
            <Text style={styles.cameraErrorText}>{t.cameraErrorTitle}</Text>
            <Text style={styles.cameraErrorSub}>{t.cameraErrorSub}</Text>
            <Pressable style={styles.pwaCameraRetryBtn} onPress={() => void startWebCamera()}>
              <Text style={styles.pwaCameraRetryText}>{t.cameraRetry}</Text>
            </Pressable>
          </View>
        )}

        {webNeedsCameraTap && !jeelizSourceStream && !cameraError && (
          <View style={styles.pwaCameraGate}>
            {webPreviewLoading ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <>
                <Text style={styles.pwaCameraGateTitle}>{t.pwaGateTitle}</Text>
                <Text style={styles.pwaCameraGateSub}>{t.pwaGateSub}</Text>
                <Pressable style={styles.pwaCameraPrimaryBtn} onPress={() => void startWebCamera()}>
                  <Ionicons name="videocam" size={20} color="#000" />
                  <Text style={styles.pwaCameraPrimaryText}>{t.pwaGateBtn}</Text>
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
                void cleanup();
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
              <Text style={styles.readyText}>{t.readyLabel}</Text>
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
              placeholder={t.titlePlaceholder}
              placeholderTextColor={C.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={60}
              editable={!isLoading}
            />
          </View>
        )}

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
              <Text style={styles.stopBtnText}>{t.stopStream}</Text>
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
                    {webNeedsCameraTap && !jeelizSourceStream ? t.allowCameraFirst : t.goLive}
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
  cameraPreviewHost: { flex: 1, width: "100%", height: "100%", backgroundColor: "#000" },
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
