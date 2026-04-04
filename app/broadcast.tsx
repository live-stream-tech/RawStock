import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  TextInput,
  Alert,
  Animated,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { C } from "@/constants/colors";
import { connectWHIP } from "@/lib/live/whip";
import { apiCreateLiveStream, apiStartLiveStream, apiEndLiveStream, liveApiBase } from "@/lib/live/streamApi";
import { acquireBroadcastMediaStream } from "@/lib/live/nativeBroadcastStream";
import type { LiveStreamVisibility } from "@/lib/live/streamApi";

function parseRouteVisibility(v: string | undefined): LiveStreamVisibility {
  if (v === "followers" || v === "community") return v;
  return "public";
}

const FILTERS = [
  { id: "none", label: "None", icon: "ban-outline", css: "" },
  { id: "beauty", label: "Beauty", icon: "sparkles-outline", css: "brightness(1.05) saturate(1.1)" },
  { id: "smooth", label: "Smooth", icon: "water-outline", css: "contrast(0.9) brightness(1.1) saturate(0.95)" },
  { id: "warm", label: "Warm", icon: "sunny-outline", css: "sepia(0.3) saturate(1.2) brightness(1.05)" },
  { id: "cool", label: "Cool", icon: "snow-outline", css: "hue-rotate(15deg) saturate(1.1) brightness(0.98)" },
  { id: "vivid", label: "Vivid", icon: "color-palette-outline", css: "saturate(1.5) contrast(1.05)" },
];

export default function BroadcastScreen() {
  const params = useLocalSearchParams<{ visibility?: string; communityId?: string }>();
  const routeVisibility = parseRouteVisibility(
    typeof params.visibility === "string" ? params.visibility : undefined,
  );
  const routeCommunityId =
    typeof params.communityId === "string" && params.communityId.trim() !== ""
      ? parseInt(params.communityId, 10)
      : NaN;

  const insets = useSafeAreaInsets();
  const videoRef = useRef<any>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const [phase, setPhase] = useState<"idle" | "creating" | "ready" | "starting" | "live" | "stopping">("idle");
  const [streamId, setStreamId] = useState<number | null>(null);
  const [selectedFilter, setSelectedFilter] = useState("none");
  const [title, setTitle] = useState("");
  const [viewers, setViewers] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [cameraError, setCameraError] = useState(false);
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const viewersPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const nativeWhipBlocked = Platform.OS !== "web";

  useEffect(() => {
    if (Platform.OS === "web") {
      startWebCamera();
    } else {
      void startNativePreview();
    }
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
        } catch {}
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
    try {
      const stream = await acquireBroadcastMediaStream();
      localStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setPhase("ready");
    } catch {
      setCameraError(true);
    }
  };

  const startNativePreview = async () => {
    try {
      if (!cameraPermission?.granted) {
        const res = await requestCameraPermission();
        if (!res.granted) {
          setCameraError(true);
          return;
        }
      }
      setPhase("ready");
    } catch {
      setCameraError(true);
    }
  };

  const cleanup = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const handleGoLive = async () => {
    if (nativeWhipBlocked) {
      Alert.alert(
        "ライブ配信",
        "モバイルからの WHIP 配信は、ネイティブ向け WebRTC（MediaStream）パイプライン整備後に有効になります。詳細は docs/LIVE_NATIVE_AND_FILTERS.md を参照してください。当面はブラウザ（Web）から Go Live してください。",
      );
      return;
    }
    if (!title.trim()) {
      Alert.alert("Enter a title", "Please enter a stream title before going live.");
      return;
    }
    if (!localStreamRef.current) {
      Alert.alert("Camera required", "Please allow camera access.");
      return;
    }
    try {
      setPhase("creating");
      const { id, whipUrl: wUrl } = await apiCreateLiveStream(title, {
        visibility: routeVisibility,
        restrictedCommunityId:
          routeVisibility === "community" && Number.isFinite(routeCommunityId)
            ? routeCommunityId
            : undefined,
      });
      setStreamId(id);
      setPhase("starting");
      const pc = await connectWHIP(wUrl, localStreamRef.current);
      pcRef.current = pc;
      await apiStartLiveStream(id);
      setPhase("live");
    } catch (e: any) {
      console.error("GoLive error:", e);
      Alert.alert("Stream error", e.message ?? "Could not start the stream.");
      setPhase("ready");
    }
  };

  const handleStop = () => {
    Alert.alert("End Stream", "Are you sure you want to end the live stream?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End",
        style: "destructive",
        onPress: async () => {
          setPhase("stopping");
          try {
            if (streamId) await apiEndLiveStream(streamId);
          } catch {}
          cleanup();
          setPhase("idle");
          router.back();
        },
      },
    ]);
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
  const currentFilter = FILTERS.find((f) => f.id === selectedFilter);
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const goLiveDisabled = !title.trim() || isLoading || cameraError || nativeWhipBlocked;

  return (
    <View style={styles.container}>
      <View style={styles.cameraArea}>
        {Platform.OS === "web" ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: currentFilter?.css || "",
              transform: "scaleX(-1)",
              display: "block",
            }}
          />
        ) : (
          <CameraView style={styles.cameraFill} facing="front" mode="video" />
        )}

        {Platform.OS === "web" && !isLive && (
          <View style={styles.filterHint}>
            <Text style={styles.filterHintText}>CSS filters are preview-only; the encoded stream may look different.</Text>
          </View>
        )}

        {cameraError && (
          <View style={styles.cameraErrorOverlay}>
            <Ionicons name="videocam-off-outline" size={48} color="#ffffff88" />
            <Text style={styles.cameraErrorText}>Camera access required</Text>
            <Text style={styles.cameraErrorSub}>
              {Platform.OS === "web"
                ? "Please allow camera access in your browser settings"
                : "Please allow camera and microphone in system settings"}
            </Text>
          </View>
        )}

        {nativeWhipBlocked && !cameraError && phase === "ready" && (
          <View style={styles.nativeHint}>
            <Text style={styles.nativeHintText}>
              プレビューのみ（モバイル WHIP はネイティブ WebRTC 整備後）。配信は Web から実行してください。
            </Text>
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
              <Text style={styles.readyText}>Ready to Stream</Text>
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

        {!isLive && Platform.OS === "web" && (
          <View style={styles.filterRow}>
            {FILTERS.map((f) => {
              const isActive = selectedFilter === f.id;
              return (
                <Pressable
                  key={f.id}
                  style={[styles.filterBtn, isActive && styles.filterBtnActive]}
                  onPress={() => setSelectedFilter(f.id)}
                >
                  <Ionicons name={f.icon as any} size={16} color={isActive ? "#fff" : "#ffffff99"} />
                  <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>{f.label}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View style={[styles.controls, { paddingBottom: bottomInset + 12 }]}>
        {!isLive && (
          <View style={styles.titleRow}>
            <Ionicons name="create-outline" size={16} color={C.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.titleInput}
              placeholder="Stream title"
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
              <Text style={styles.stopBtnText}>End Stream</Text>
            </Pressable>
          </View>
        ) : (
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
                <Text style={styles.goLiveBtnText}>{nativeWhipBlocked ? "Go Live (Web only)" : "Go Live"}</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  cameraArea: { flex: 1, backgroundColor: "#000", overflow: "hidden" },
  cameraFill: { flex: 1, width: "100%" },
  filterHint: {
    position: "absolute",
    bottom: 88,
    left: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 8,
  },
  filterHintText: { color: "#ffffffaa", fontSize: 10, textAlign: "center" },
  nativeHint: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
  },
  nativeHintText: { color: "#ffffffcc", fontSize: 12, textAlign: "center", lineHeight: 17 },
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
  filterRow: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  filterBtn: {
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterBtnActive: { backgroundColor: "rgba(41,182,207,0.35)", borderColor: C.accent },
  filterLabel: { color: "#ffffff88", fontSize: 10, fontWeight: "600" },
  filterLabelActive: { color: "#fff" },
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
