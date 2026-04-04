/**
 * mentor-room/[id].tsx
 * メンターセッション ビデオ通話ルーム
 * - role=mentor: WHIP で配信（メンター側）
 * - role=user: WHEP で視聴（参加者側）
 */
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";
import { F } from "@/constants/fonts";
import { useAuth } from "@/lib/auth";
import { connectWHIP } from "@/lib/live/whip";

export default function MentorRoomScreen() {
  const { id, role, whipUrl: whipParam, whepUrl: whepParam } = useLocalSearchParams<{
    id: string;
    role: "mentor" | "user";
    whipUrl?: string;
    whepUrl?: string;
  }>();
  const router = useRouter();
  const { token } = useAuth();

  const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  });

  // Web のみ WebRTC（Native は MediaStream 供給後に connectWHIP を共有利用予定）
  useEffect(() => {
    if (Platform.OS !== "web") {
      setStatus("error");
      setErrorMsg(
        "メンターセッションの映像は現在ブラウザ（Web）のみ対応です。モバイルはネイティブ WebRTC パイプライン整備後に有効化予定です（docs/LIVE_NATIVE_AND_FILTERS.md）。",
      );
      return;
    }
    if (role === "mentor") {
      startMentor();
    } else {
      joinAsUser();
    }
    return () => {
      pcRef.current?.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startTimer = () => {
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  /** メンター側: WHIP で配信（ネイティブでは同 connectWHIP に MediaStream を渡す） */
  const startMentor = async () => {
    if (!whipParam) { setStatus("error"); setErrorMsg("WHIP URL not found"); return; }
    try {
      const stream = await (navigator as any).mediaDevices.getUserMedia({ video: true, audio: true });
      const localVideo = document.getElementById("local-video") as HTMLVideoElement;
      if (localVideo) { localVideo.srcObject = stream; localVideo.muted = true; }

      const whip = decodeURIComponent(whipParam);
      const pc = await connectWHIP(whip, stream);
      pcRef.current = pc;
      setStatus("connected");
      startTimer();
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e.message);
    }
  };

  /** 参加者側: WHEP で視聴 */
  const joinAsUser = async () => {
    // まず API から WHEP URL を取得
    let whep = whepParam ? decodeURIComponent(whepParam) : "";
    if (!whep && id) {
      try {
        const res = await fetch(`${getApiUrl()}/api/mentor/bookings/${id}/join`, { headers: authHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to join session");
        whep = data.whepUrl;
      } catch (e: any) {
        setStatus("error");
        setErrorMsg(e.message);
        return;
      }
    }
    if (!whep) { setStatus("error"); setErrorMsg("WHEP URL not found"); return; }

    try {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }] });
      pcRef.current = pc;
      pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });

      pc.ontrack = (e) => {
        const remoteVideo = document.getElementById("remote-video") as HTMLVideoElement;
        if (remoteVideo && e.streams[0]) remoteVideo.srcObject = e.streams[0];
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await new Promise<void>(resolve => {
        if (pc.iceGatheringState === "complete") { resolve(); return; }
        pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === "complete") resolve(); };
        setTimeout(resolve, 3000);
      });

      const res = await fetch(whep, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: pc.localDescription?.sdp,
      });
      if (!res.ok) throw new Error(`WHEP error: ${res.status}`);
      const answer = await res.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answer });
      setStatus("connected");
      startTimer();
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e.message);
    }
  };

  const endSession = async () => {
    Alert.alert("End Session", "End this session?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End", style: "destructive",
        onPress: async () => {
          pcRef.current?.close();
          if (timerRef.current) clearInterval(timerRef.current);
          if (role === "mentor" && id) {
            await fetch(`${getApiUrl()}/api/mentor/bookings/${id}/end`, {
              method: "POST",
              headers: authHeaders(),
            });
          }
          router.back();
        },
      },
    ]);
  };

  if (Platform.OS !== "web") {
    return (
      <View style={styles.center}>
        <Ionicons name="videocam-off-outline" size={48} color={C.textMuted} />
        <Text style={styles.errorText}>Video calls are only available in a web browser</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MENTOR SESSION</Text>
        {status === "connected" && (
          <View style={styles.timerBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
          </View>
        )}
      </View>

      {/* ビデオエリア */}
      <View style={styles.videoArea}>
        {status === "connecting" && (
          <View style={styles.center}>
            <ActivityIndicator color={C.accent} size="large" />
            <Text style={styles.connectingText}>Connecting...</Text>
          </View>
        )}
        {status === "error" && (
          <View style={styles.center}>
            <Ionicons name="alert-circle-outline" size={48} color={C.live} />
            <Text style={styles.errorText}>{errorMsg}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => {
                setStatus("connecting");
                if (role === "mentor") void startMentor();
                else void joinAsUser();
              }}
            >
              <Text style={styles.retryBtnText}>Reconnect</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* Web ビデオ要素は dangerouslySetInnerHTML 経由で挿入 */}
        {Platform.OS === "web" && (
          <div style={{ width: "100%", height: "100%", position: "relative" }}>
            {role === "mentor" ? (
              <video
                id="local-video"
                autoPlay
                muted
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover", backgroundColor: "#000" }}
              />
            ) : (
              <video
                id="remote-video"
                autoPlay
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover", backgroundColor: "#000" }}
              />
            )}
          </div>
        )}
      </View>

      {/* コントロール */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.endBtn} onPress={endSession}>
          <Ionicons name="call" size={24} color="#fff" />
          <Text style={styles.endBtnText}>End</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 56 : 20,
    paddingHorizontal: 20,
    paddingBottom: 12,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  headerTitle: { fontFamily: F.display, fontSize: 14, fontWeight: "800", color: C.text, letterSpacing: 2 },
  timerBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,77,0,0.2)", borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.live },
  timerText: { fontFamily: F.mono, fontSize: 13, color: C.live },
  videoArea: { flex: 1 },
  connectingText: { fontFamily: F.mono, fontSize: 14, color: C.textSec, marginTop: 12 },
  errorText: { fontFamily: F.mono, fontSize: 13, color: C.live, textAlign: "center", paddingHorizontal: 32 },
  retryBtn: { borderWidth: 1, borderColor: C.accent, borderRadius: 4, paddingHorizontal: 20, paddingVertical: 10 },
  retryBtnText: { fontFamily: F.mono, fontSize: 13, color: C.accent },
  controls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  endBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#e53e3e",
    borderRadius: 40,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  endBtnText: { fontFamily: F.display, fontSize: 16, fontWeight: "700", color: "#fff" },
  backBtn: { borderWidth: 1, borderColor: C.accent, borderRadius: 4, paddingHorizontal: 20, paddingVertical: 10, marginTop: 16 },
  backBtnText: { fontFamily: F.mono, fontSize: 13, color: C.accent },
});
