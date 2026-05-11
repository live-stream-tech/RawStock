import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  Platform,
  Animated,
  ActivityIndicator,
  Alert,
} from "react-native";
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { C } from "@/constants/colors";
import { ApiError, apiRequest, formatUserFacingApiError, getApiUrl } from "@/lib/query-client";
import { navigateToUserOrLiverProfile } from "@/lib/navigate-profile";
import { saveLoginReturn } from "@/lib/login-return";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/lib/auth";

/**
 * Imperatively mounts a <video> element to avoid React #418 hydration mismatch.
 * Exposes the underlying HTMLVideoElement via videoRef so WHEP can set srcObject.
 */
function WhepVideoPlayer({
  videoRef,
  muted,
}: {
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  muted: boolean;
}) {
  const hostRef = useRef<View | null>(null);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const host = hostRef.current as unknown as HTMLDivElement | null;
    if (!host) return;
    const v = document.createElement("video");
    v.autoplay = true;
    v.muted = muted;
    v.playsInline = true;
    v.setAttribute("playsinline", "true");
    v.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;display:block;";
    host.appendChild(v);
    videoRef.current = v;
    return () => {
      try { v.pause(); v.srcObject = null; } catch { /* ignore */ }
      v.remove();
      videoRef.current = null;
    };
  }, [videoRef]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || typeof document === "undefined") return;
    v.muted = muted;
    if (muted) v.setAttribute("muted", "true");
    else v.removeAttribute("muted");
    void v.play().catch(() => {});
  }, [muted, videoRef]);

  return <View ref={hostRef} style={StyleSheet.absoluteFill} collapsable={false} pointerEvents="none" />;
}

async function viewerApiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = {
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  try {
    const token = await AsyncStorage.getItem("auth_token");
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    /* ignore */
  }
  const nativeBase = getApiUrl();
  const url =
    Platform.OS === "web"
      ? path.startsWith("/")
        ? path
        : `/${path}`
      : new URL(path.replace(/^\//, ""), nativeBase).toString();
  return fetch(url, { ...init, credentials: "include", headers });
}

type LiveStream = {
  id: number;
  title: string;
  creator: string;
  avatar: string;
  thumbnail: string;
  viewers: number;
  currentViewers?: number;
  category: string;
  fee: string;
  price: number | null;
  whepUrl?: string | null;
  isActive?: boolean;
  isLive?: boolean;
  /** API: true when access requirements are not met (no playback URL). */
  streamAccessDenied?: boolean;
  streamAccessDeniedReason?: "ticket_required" | "auth_required" | string;
  visibility?: string;
  hostUserId?: number | null;
  /** Whether current user already follows the host (excluding self). */
  isFollowingHost?: boolean;
};

type ChatMsg = {
  id: number;
  username: string;
  avatar: string | null;
  message: string;
  isGift: boolean;
  giftAmount: number | null;
  createdAt: string;
};

const GIFT_OPTIONS = [
  { amount: 100, label: "🎟100", emoji: "🌸" },
  { amount: 500, label: "🎟500", emoji: "⭐" },
  { amount: 1000, label: "🎟1,000", emoji: "💎" },
  { amount: 5000, label: "🎟5,000", emoji: "👑" },
];

function PulseDot() {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.6, duration: 600, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);
  return (
    <Animated.View style={[styles.liveDot, { transform: [{ scale: anim }] }]} />
  );
}

type MentorBooking = {
  id: number;
  queuePosition: number;
  status: string;
  userName: string;
  userId: string;
};

/** Demo-mode fallback when the API returns no stream data. */
const DEMO_LIVE_STREAMS: Record<number, LiveStream> = {
  1: { id: 1, title: "Miyu ♪ Songs & Dance Live!", creator: "Miyu", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop", thumbnail: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&h=200&fit=crop", viewers: 1240, category: "idol", fee: "Free", price: null },
  2: { id: 2, title: "REIKA Night Talk — Real Talk", creator: "REIKA", avatar: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=40&h=40&fit=crop", thumbnail: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300&h=200&fit=crop", viewers: 890, category: "idol", fee: "Free", price: null },
  3: { id: 3, title: "Morning Yoga Together 🧘", creator: "Yoga Instructor Nana", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop", thumbnail: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=200&fit=crop", viewers: 420, category: "coaching", fee: "Free", price: null },
  4: { id: 4, title: "Rina's Late Night Fortune 🔮", creator: "Rina Kanzaki", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop", thumbnail: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=200&fit=crop", viewers: 312, category: "fortune", fee: "Free", price: null },
};

export default function LiveStreamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const streamId = parseInt(id ?? "1");
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const flatListRef = useRef<FlatList>(null);

  const [chatInput, setChatInput] = useState("");
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showMentorNotif, setShowMentorNotif] = useState(false);
  const notifAnim = useRef(new Animated.Value(0)).current;
  /** Start muted for autoplay; user can tap to hear audio (Safari/PWA). */
  const [isMuted, setIsMuted] = useState(true);
  const [hasAudioTrack, setHasAudioTrack] = useState(false);
  const isMutedRef = useRef(true);
  isMutedRef.current = isMuted;

  // WHEP WebRTC viewer
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const trackAttachedRef = useRef(false);
  const [whepError, setWhepError] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { user, requireAuth } = useAuth();

  const myUserId = user ? `user-${user.id}` : "guest";
  const myUsername = user?.name ?? "Guest";

  const { data: apiStream, isFetched: streamMetaFetched } = useQuery<LiveStream | null>({
    queryKey: ["stream-viewer", streamId],
    queryFn: async () => {
      const r1 = await viewerApiFetch(`/api/stream/${streamId}`);
      if (r1.ok) return r1.json() as Promise<LiveStream>;
      const r2 = await viewerApiFetch(`/api/live-streams/${streamId}`);
      if (r2.ok) return r2.json() as Promise<LiveStream>;
      return null;
    },
    refetchInterval: 5000,
  });

  const stream = apiStream ?? DEMO_LIVE_STREAMS[streamId];
  const streamAccessDenied = apiStream?.streamAccessDenied === true;
  const paidTicketRequired = apiStream?.streamAccessDeniedReason === "ticket_required";
  const authRequiredForStream = apiStream?.streamAccessDeniedReason === "auth_required";
  const hostUserId = apiStream?.hostUserId ?? null;
  /** Tips require a real host user id (legacy seed streams do not have one). */
  const tipRecipientUserId = useMemo(() => {
    const h = apiStream?.hostUserId;
    if (h == null) return null;
    if (typeof h === "number" && Number.isInteger(h) && h > 0) return h;
    const s = String(h).trim();
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    return null;
  }, [apiStream?.hostUserId]);
  const canSendTips = streamMetaFetched && tipRecipientUserId != null;
  const showFollowControl = hostUserId != null && user?.id !== hostUserId;

  const followHostMutation = useMutation({
    mutationFn: async () => {
      if (hostUserId == null) throw new Error("Host information is missing");
      const r = await viewerApiFetch(`/api/users/${hostUserId}/follow`, { method: "POST" });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((body as { error?: string }).error ?? "Failed to follow host");
      return body;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["stream-viewer", streamId] });
    },
    onError: (e: Error) => {
      Alert.alert("Follow", e.message);
    },
  });

  /** Count the user as a viewer while this screen is visible. */
  useEffect(() => {
    if (!streamId || !streamMetaFetched) return;
    if (streamAccessDenied) return;
    void viewerApiFetch(`/api/stream/${streamId}/join`, { method: "POST" });
    return () => {
      void viewerApiFetch(`/api/stream/${streamId}/leave`, { method: "POST" });
    };
  }, [streamId, streamMetaFetched, streamAccessDenied]);

  const unlockPaidStreamMutation = useMutation({
    mutationFn: async () => {
      if (!requireAuth("watch paid stream")) throw new Error("AUTH_REQUIRED");
      const res = await viewerApiFetch(`/api/stream/${streamId}/join-paid`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err: Error & { status?: number; required?: number; balance?: number } = new Error(
          (body as { error?: string }).error ?? "Failed to unlock paid stream",
        );
        err.status = res.status;
        err.required = (body as { required?: number }).required;
        err.balance = (body as { balance?: number }).balance;
        throw err;
      }
      return body;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["stream-viewer", streamId] });
      await qc.invalidateQueries({ queryKey: ["/api/tickets/balance"] });
    },
    onError: (e: Error & { status?: number; required?: number; balance?: number }) => {
      if (e.message === "AUTH_REQUIRED") return;
      if (e.status === 402) {
        Alert.alert(
          "Insufficient tickets",
          `You need 🎟${(e.required ?? 0).toLocaleString()} to watch this stream.`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Get Tickets", onPress: () => router.push("/tickets") },
          ],
        );
        return;
      }
      Alert.alert("Paid Stream", e.message);
    },
  });

  const { data: chat = [] } = useQuery<ChatMsg[]>({
    queryKey: [`/api/live-streams/${streamId}/chat`],
    queryFn: async () => {
      const r = await viewerApiFetch(`/api/live-streams/${streamId}/chat`);
      if (r.status === 403 || r.status === 404) return [];
      if (!r.ok) return [];
      return (await r.json()) as ChatMsg[];
    },
    refetchInterval: 3000,
    enabled: streamMetaFetched && streamAccessDenied !== true && Number.isFinite(streamId) && streamId > 0,
  });

  const { data: myBooking } = useQuery<MentorBooking[], Error, MentorBooking | null>({
    queryKey: [`/api/mentor/${streamId}/bookings`],
    refetchInterval: 5000,
    select: (bookings: MentorBooking[]) =>
      bookings.find((b) => b.userId === myUserId) ?? null,
  });

  const myBookingTyped = myBooking as unknown as MentorBooking | null;
  useEffect(() => {
    if (myBookingTyped?.status === "notified" && !showMentorNotif) {
      setShowMentorNotif(true);
      Animated.spring(notifAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start();
    }
  }, [myBookingTyped?.status, notifAnim, showMentorNotif]);

  useEffect(() => {
    setHasAudioTrack(false);
    setIsMuted(true);
  }, [streamId]);

  // WHEP connection (viewer-side WebRTC)
  const connectWHEP = useCallback(async (whepUrl: string) => {
    if (Platform.OS !== "web") return;
    try {
      setWhepError(false);
      trackAttachedRef.current = false;
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
        bundlePolicy: "max-bundle",
      });
      pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });

      pc.ontrack = (e) => {
        const ms = e.streams[0];
        if (videoRef.current && ms) {
          trackAttachedRef.current = true;
          videoRef.current.srcObject = ms;
          videoRef.current.muted = isMutedRef.current;
          if (isMutedRef.current) {
            videoRef.current.setAttribute("muted", "true");
          } else {
            videoRef.current.removeAttribute("muted");
          }
          void videoRef.current.play().catch(() => {});
          if (ms.getAudioTracks().some((t) => t.readyState !== "ended")) {
            setHasAudioTrack(true);
          }
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") { resolve(); return; }
        const check = () => {
          if (pc.iceGatheringState === "complete") {
            pc.removeEventListener("icegatheringstatechange", check);
            resolve();
          }
        };
        pc.addEventListener("icegatheringstatechange", check);
        setTimeout(resolve, 3000);
      });

      const res = await fetch(whepUrl, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: pc.localDescription!.sdp,
      });
      if (!res.ok) throw new Error(`WHEP ${res.status}`);
      const answerSdp = await res.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      pcRef.current = pc;
    } catch (err) {
      console.error("WHEP error:", err);
      setWhepError(true);
    }
  }, []);

  const sLive = stream as LiveStream | undefined;
  const whepUrl = sLive?.whepUrl;
  const streamLive = !!(sLive?.isActive ?? sLive?.isLive);

  useEffect(() => {
    if (whepUrl && streamLive && Platform.OS === "web") {
      setHasAudioTrack(false);
      void connectWHEP(whepUrl);
      const timeout = setTimeout(() => {
        // If SDP exchange succeeded but no media track arrives, surface an explicit error.
        if (!trackAttachedRef.current) setWhepError(true);
      }, 10000);
      return () => {
        clearTimeout(timeout);
        if (pcRef.current) {
          pcRef.current.close();
          pcRef.current = null;
        }
        setHasAudioTrack(false);
      };
    }
    return () => {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };
  }, [whepUrl, streamLive, connectWHEP]);

  const chatMutation = useMutation({
    mutationFn: ({ message, isGift, giftAmount }: { message: string; isGift?: boolean; giftAmount?: number }) =>
      apiRequest("POST", `/api/live-streams/${streamId}/chat`, {
        username: myUsername,
        avatar: user?.avatar ?? user?.profileImageUrl ?? null,
        message, isGift: isGift ?? false, giftAmount: giftAmount ?? null,
      }),
    onSuccess: (_data, vars) => {
      setChatInput("");
      void qc.invalidateQueries({ queryKey: [`/api/live-streams/${streamId}/chat`] });
      if (vars?.isGift) {
        void qc.invalidateQueries({ queryKey: ["/api/tickets/balance"] });
      }
    },
    onError: (err, vars) => {
      if (err instanceof ApiError && err.status === 401) {
        void requireAuth(vars?.isGift ? "send gifts" : "comment");
        return;
      }
      if (vars?.isGift && err instanceof ApiError && err.status === 402) {
        const amount = vars.giftAmount ?? 0;
        Alert.alert(
          "Insufficient tickets",
          `You need 🎟${amount.toLocaleString()} to send this gift. Please top up your tickets.`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Get Tickets", onPress: () => router.push("/tickets") },
          ],
        );
        return;
      }
      Alert.alert(vars?.isGift ? "Gift" : "Comment", formatUserFacingApiError(err));
    },
  });

  const sendChat = useCallback(() => {
    const msg = chatInput.trim();
    if (!msg) return;
    if (!requireAuth("comment")) return;
    chatMutation.mutate({ message: msg });
  }, [chatInput, requireAuth, chatMutation]);

  const sendGift = useCallback(
    (amount: number, _emoji: string) => {
      if (!requireAuth("send gifts")) return;
      if (!canSendTips || tipRecipientUserId == null) {
        Alert.alert(
          "Tips",
          streamMetaFetched && tipRecipientUserId == null
            ? "Tips are not available for this stream yet."
            : "Stream details are still loading. Try again in a moment.",
        );
        return;
      }
      setShowGiftModal(false);
      chatMutation.mutate({
        message: `${_emoji} Sent a 🎟${amount.toLocaleString()} gift!`,
        isGift: true,
        giftAmount: amount,
      });
    },
    [canSendTips, tipRecipientUserId, chatMutation, requireAuth, streamMetaFetched],
  );

  useEffect(() => {
    if (chat.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [chat.length]);

  if (!stream) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#000" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={styles.container}>
        {/* Stream Thumbnail / Player */}
        <View style={[styles.player, { paddingTop: topInset }]}>
          {/* Thumbnail — always shown as fallback behind the video */}
          <Image source={{ uri: stream.thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" />
          {/* WHEP video player — imperatively mounted to avoid React #418 hydration mismatch */}
          {Platform.OS === "web" && <WhepVideoPlayer videoRef={videoRef} muted={isMuted} />}
          {whepError && (
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.6)" }}>
              <Ionicons name="wifi-outline" size={40} color="#ffffff88" />
              <Text style={{ color: "#fff", marginTop: 8, fontSize: 13 }}>Failed to load stream</Text>
            </View>
          )}
          {streamAccessDenied && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(0,0,0,0.75)",
                paddingHorizontal: 24,
              }}
            >
              <Ionicons name="lock-closed-outline" size={40} color="#ffffffaa" />
              <Text style={{ color: "#fff", marginTop: 12, fontSize: 15, fontWeight: "700", textAlign: "center" }}>
                {authRequiredForStream ? "Sign-in required" : "You do not have access to this stream."}
              </Text>
              <Text style={{ color: "#ffffffb3", marginTop: 8, fontSize: 13, textAlign: "center" }}>
                {authRequiredForStream
                  ? "Sign in with your RawStock account to watch."
                  : apiStream?.visibility === "followers"
                    ? "Follow this creator to watch this stream."
                    : apiStream?.visibility === "community"
                      ? "Join the required community to watch this stream."
                      : apiStream?.visibility === "paid"
                        ? "This is a paid stream. Unlock it with tickets to continue."
                        : "Please satisfy the requirements and try again."}
              </Text>
              {authRequiredForStream ? (
                <Pressable
                  style={{ marginTop: 16, backgroundColor: C.accent, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 }}
                  onPress={() => {
                    if (Platform.OS === "web" && typeof window !== "undefined") {
                      saveLoginReturn(`${window.location.pathname}${window.location.search}`);
                    }
                    router.push("/auth/login");
                  }}
                >
                  <Text style={{ color: "#000", fontSize: 13, fontWeight: "800" }}>Sign in</Text>
                </Pressable>
              ) : null}
              {paidTicketRequired ? (
                <Pressable
                  style={{ marginTop: 16, backgroundColor: C.orange, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 }}
                  disabled={unlockPaidStreamMutation.isPending}
                  onPress={() => unlockPaidStreamMutation.mutate()}
                >
                  <Text style={{ color: "#000", fontSize: 13, fontWeight: "800" }}>
                    {unlockPaidStreamMutation.isPending
                      ? "Unlocking..."
                      : `Unlock for 🎟${(apiStream?.price ?? 0).toLocaleString()}`}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}
          <View style={styles.playerDimmer} />

          {Platform.OS === "web" &&
            streamLive &&
            !whepError &&
            hasAudioTrack &&
            isMuted &&
            !streamAccessDenied && (
              <Pressable
                style={styles.unmutePill}
                onPress={() => setIsMuted(false)}
                accessibilityRole="button"
                accessibilityLabel="Tap to unmute"
              >
                <Ionicons name="volume-mute" size={16} color="#000" />
                <Text style={styles.unmutePillText}>Tap to unmute</Text>
              </Pressable>
            )}

          {/* Top bar */}
          <View style={[styles.playerTop, { paddingTop: topInset + 8 }]}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
            <View style={styles.liveBadge}>
              <PulseDot />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
            <View style={styles.viewersBadge}>
              <Ionicons name="people" size={13} color="#fff" />
              <Text style={styles.viewersText}>{(stream.viewers).toLocaleString()}</Text>
            </View>
          </View>

          {/* Creator info + title at bottom of player */}
          <View style={styles.playerBottom}>
            <View style={styles.creatorRow}>
              <Pressable
                onPress={() =>
                  navigateToUserOrLiverProfile({
                    userId: stream.hostUserId ?? null,
                    displayName: stream.hostUserId ? null : stream.creator,
                  })
                }
                hitSlop={6}
              >
                <Image source={{ uri: stream.avatar }} style={styles.creatorAvatar} contentFit="cover" />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={styles.streamTitle} numberOfLines={2}>{stream.title}</Text>
                <Text style={styles.creatorName}>{stream.creator}</Text>
              </View>
              {showFollowControl ? (
                <Pressable
                  style={[styles.followBtn, apiStream?.isFollowingHost && styles.followBtnFollowing]}
                  disabled={followHostMutation.isPending || apiStream?.isFollowingHost}
                  onPress={() => {
                    if (!requireAuth("follow")) return;
                    followHostMutation.mutate();
                  }}
                >
                  {followHostMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.followBtnText}>
                      {apiStream?.isFollowingHost ? "Following" : "Follow"}
                    </Text>
                  )}
                </Pressable>
              ) : null}
            </View>
            {stream.price && (
              <View style={styles.paidBadge}>
                <Ionicons name="lock-closed" size={10} color={C.orange} />
                <Text style={styles.paidText}>🎟{stream.price.toLocaleString()}</Text>
              </View>
            )}
            {/* Mentor session booking button */}
            {myBooking ? (
              <View style={styles.mentorBooked}>
                <Ionicons name="people" size={12} color={C.accent} />
                <Text style={styles.mentorBookedText}>Session booked #{(myBooking as unknown as MentorBooking).queuePosition}</Text>
              </View>
            ) : (
              <Pressable
                style={styles.mentorBtn}
                onPress={() => router.push(`/mentor-booking/${streamId}`)}
              >
                <Ionicons name="people-outline" size={13} color="#fff" />
                <Text style={styles.mentorBtnText}>Mentor Session</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Mentor session turn notification */}
        {showMentorNotif && (
          <Animated.View
            style={[
              styles.mentorNotif,
              {
                transform: [{ scale: notifAnim }],
                opacity: notifAnim,
              },
            ]}
          >
            <View style={styles.mentorNotifInner}>
              <View style={styles.mentorNotifIcon}>
                <Ionicons name="camera" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mentorNotifTitle}>It’s your turn!</Text>
                <Text style={styles.mentorNotifBody}>Please start your mentor session</Text>
              </View>
              <Pressable onPress={() => setShowMentorNotif(false)}>
                <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Watermark overlay (when mentor session notified/active) */}
        {(myBooking as unknown as MentorBooking | null)?.status === "notified" && (
          <View style={styles.watermarkOverlay} pointerEvents="none">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Text
                key={i}
                style={[
                  styles.watermarkText,
                  {
                    top: `${15 + i * 16}%` as any,
                    left: i % 2 === 0 ? "5%" : "30%",
                    transform: [{ rotate: "-25deg" }],
                  },
                ]}
              >
                {myUserId} • RawStock
              </Text>
            ))}
          </View>
        )}

        {/* Chat area */}
        <View style={styles.chatSection}>
          <View style={styles.chatHeader}>
            <Ionicons name="chatbubbles-outline" size={13} color={C.accent} />
            <Text style={styles.chatHeaderText}>Live Chat</Text>
            <View style={styles.joinedBadge}>
              <Ionicons name="checkmark-circle" size={11} color={C.green} />
              <Text style={styles.joinedText}>Live</Text>
            </View>
          </View>

          <FlatList
            ref={flatListRef}
            data={chat}
            keyExtractor={(item) => item.id.toString()}
            style={styles.chatList}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={scrollShowsVertical}
            renderItem={({ item }) => (
              item.isGift ? (
                <View style={styles.giftBubble}>
                  <View style={styles.giftLeft}>
                    {item.avatar ? (
                      <Pressable onPress={() => navigateToUserOrLiverProfile({ displayName: item.username })} hitSlop={4}>
                        <Image source={{ uri: item.avatar }} style={styles.chatAvatar} contentFit="cover" />
                      </Pressable>
                    ) : (
                      <Pressable onPress={() => navigateToUserOrLiverProfile({ displayName: item.username })} hitSlop={4}>
                        <View style={[styles.chatAvatar, { backgroundColor: C.surface3 }]} />
                      </Pressable>
                    )}
                  </View>
                  <View style={styles.giftContent}>
                    <Text style={styles.giftUsername}>{item.username}</Text>
                    <Text style={styles.giftMessage}>{item.message}</Text>
                    {item.giftAmount && (
                      <Text style={styles.giftAmount}>🎟{item.giftAmount.toLocaleString()}</Text>
                    )}
                  </View>
                </View>
              ) : (
                <View style={[styles.chatMsg, item.username === "You" && styles.chatMsgMine]}>
                  {item.username !== "You" && (
                    item.avatar ? (
                      <Pressable onPress={() => navigateToUserOrLiverProfile({ displayName: item.username })} hitSlop={4}>
                        <Image source={{ uri: item.avatar }} style={styles.chatAvatar} contentFit="cover" />
                      </Pressable>
                    ) : (
                      <Pressable onPress={() => navigateToUserOrLiverProfile({ displayName: item.username })} hitSlop={4}>
                        <View style={[styles.chatAvatar, { backgroundColor: C.surface3 }]} />
                      </Pressable>
                    )
                  )}
                  <View style={[styles.chatBubble, item.username === "You" && styles.chatBubbleMine]}>
                    {item.username !== "You" && (
                      <Text style={styles.chatUsername}>{item.username}</Text>
                    )}
                    <Text style={[styles.chatText, item.username === "You" && styles.chatTextMine]}>
                      {item.message}
                    </Text>
                  </View>
                </View>
              )
            )}
          />
        </View>

        {/* Input row */}
        <View style={[styles.inputRow, { paddingBottom: bottomInset + 8 }]}>
          <Pressable
            style={[styles.giftBtn, !canSendTips && styles.giftBtnDisabled]}
            onPress={() => {
              if (!canSendTips) {
                Alert.alert(
                  "Tips",
                  streamMetaFetched && tipRecipientUserId == null
                    ? "Tips are not available for this stream yet."
                    : "Loading stream details… Try again in a moment.",
                );
                return;
              }
              setShowGiftModal(true);
            }}
          >
            <Ionicons name="gift" size={18} color={canSendTips ? C.orange : C.textMuted} />
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="Add a comment..."
            placeholderTextColor={C.textMuted}
            value={chatInput}
            onChangeText={setChatInput}
            onSubmitEditing={sendChat}
            returnKeyType="send"
          />
          <Pressable
            style={[styles.sendBtn, (!chatInput.trim() || chatMutation.isPending) && styles.sendBtnOff]}
            onPress={sendChat}
            disabled={chatMutation.isPending}
          >
            {chatMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={15} color="#fff" />
            )}
          </Pressable>
        </View>

        {/* Gift modal */}
        <Modal visible={showGiftModal} transparent animationType="slide">
          <Pressable style={styles.giftModalBg} onPress={() => setShowGiftModal(false)}>
            <Pressable style={[styles.giftModalSheet, { paddingBottom: bottomInset + 16 }]} onPress={() => {}}>
              <View style={styles.giftModalHandle} />
              <Text style={styles.giftModalTitle}>Send a Gift</Text>
              <Text style={styles.giftModalSub}>Support the creator directly</Text>
              <View style={styles.giftGrid}>
                {GIFT_OPTIONS.map((g) => (
                  <Pressable key={g.amount} style={styles.giftOption} onPress={() => sendGift(g.amount, g.emoji)}>
                    <Text style={styles.giftEmoji}>{g.emoji}</Text>
                    <Text style={styles.giftOptionLabel}>{g.label}</Text>
                  </Pressable>
                ))}
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1218" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { color: C.textMuted, fontSize: 14 },

  player: {
    height: 240,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#000",
  },
  playerDimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  unmutePill: {
    position: "absolute",
    right: 12,
    bottom: 120,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 5,
  },
  unmutePillText: { color: "#000", fontSize: 13, fontWeight: "800" },
  playerTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.live,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  liveBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  viewersBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: "auto" as any,
  },
  viewersText: { color: "#fff", fontSize: 11, fontWeight: "600" },

  playerBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  creatorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  creatorAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: "rgba(255,255,255,0.4)" },
  streamTitle: { color: "#fff", fontSize: 13, fontWeight: "700", lineHeight: 17 },
  creatorName: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 1 },
  followBtn: {
    backgroundColor: C.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  followBtnFollowing: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  followBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,139,0,0.2)",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.orange + "55",
  },
  paidText: { color: C.orange, fontSize: 10, fontWeight: "600" },

  chatSection: { flex: 1, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 6 },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  chatHeaderText: { color: C.accent, fontSize: 11, fontWeight: "700", flex: 1 },
  joinedBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  joinedText: { color: C.green, fontSize: 10, fontWeight: "600" },

  chatList: { flex: 1 },
  chatContent: { paddingHorizontal: 12, paddingVertical: 4, gap: 6 },

  chatMsg: { flexDirection: "row", alignItems: "flex-end", gap: 6, maxWidth: "85%" },
  chatMsgMine: { alignSelf: "flex-end", flexDirection: "row-reverse" },
  chatAvatar: { width: 24, height: 24, borderRadius: 12 },
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

  giftBubble: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(255,139,0,0.12)",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: C.orange + "55",
  },
  giftLeft: {},
  giftContent: { flex: 1 },
  giftUsername: { color: C.orange, fontSize: 11, fontWeight: "700", marginBottom: 2 },
  giftMessage: { color: C.text, fontSize: 13, lineHeight: 18 },
  giftAmount: { color: C.orange, fontSize: 15, fontWeight: "800", marginTop: 2 },

  inputRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.bg,
    alignItems: "center",
  },
  giftBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.orange + "55",
  },
  giftBtnDisabled: {
    opacity: 0.45,
    borderColor: C.border,
  },
  input: {
    flex: 1,
    height: 38,
    backgroundColor: C.surface,
    borderRadius: 19,
    paddingHorizontal: 14,
    color: C.text,
    fontSize: 14,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnOff: { backgroundColor: C.surface2 },

  giftModalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  giftModalSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  giftModalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginBottom: 16 },
  giftModalTitle: { color: C.text, fontSize: 18, fontWeight: "800", textAlign: "center" },
  giftModalSub: { color: C.textMuted, fontSize: 12, textAlign: "center", marginTop: 4, marginBottom: 20 },
  giftGrid: { flexDirection: "row", gap: 12, justifyContent: "space-between", marginBottom: 8 },
  giftOption: {
    flex: 1,
    backgroundColor: C.surface2,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: C.orange + "44",
  },
  giftEmoji: { fontSize: 28 },
  giftOptionLabel: { color: C.orange, fontSize: 13, fontWeight: "700" },

  mentorBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(229,57,53,0.85)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  mentorBtnText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  mentorBooked: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(41,182,207,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: C.accent + "66",
  },
  mentorBookedText: { color: C.accent, fontSize: 11, fontWeight: "700" },
  mentorNotif: {
    position: "absolute",
    left: 12,
    right: 12,
    top: "30%",
    zIndex: 100,
    borderRadius: 16,
    overflow: "hidden",
  },
  mentorNotifInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.live,
    padding: 16,
  },
  mentorNotifIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  mentorNotifTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  mentorNotifBody: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 },
  watermarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  watermarkText: {
    position: "absolute",
    color: "rgba(255,255,255,0.12)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
