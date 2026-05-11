import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  Platform,
  Alert,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  useWindowDimensions,
} from "react-native";
import { scrollShowsHorizontal, scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/lib/auth";
import { C } from "@/constants/colors";
import { getTabTopInset, getTabBottomInset, webScrollStyle } from "@/constants/layout";
import {
  apiRequest,
  compressImageBlobForUpload,
  formatUserFacingApiError,
  getApiUrl,
  readAuthToken,
  uploadUserMediaBlobToR2,
} from "@/lib/query-client";
import { AppLogo } from "@/components/AppLogo";
import { MetallicLine } from "@/components/MetallicLine";
import { saveLoginReturn } from "@/lib/login-return";

function useUnreadCount() {
  const { data } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30_000,
  });
  return data?.count ?? 0;
}

function useDmUnreadCount() {
  const { data } = useQuery<{ count: number }>({
    queryKey: ["/api/dm-messages/unread-count"],
    refetchInterval: 30_000,
  });
  return data?.count ?? 0;
}

type MyVideo = {
  id: number;
  title: string;
  thumbnail: string;
  creator: string;
  community: string;
  timeAgo?: string | null;
};

type MyCommunity = {
  id: number;
  name: string;
  members: number;
  thumbnail: string;
  iconUrl?: string | null;
  online: boolean;
  category: string;
  isOfficial?: boolean;
};

type LevelProgress = {
  month: string;
  currentLevel: number;
  nextLevel: number;
  tipBackRate: number;
  tipGrossThisMonth: number;
  streamCountThisMonth: number;
  requiredTipGross: number;
  requiredStreamCount: number;
  remainingTipGross: number;
  remainingStreamCount: number;
};


/** Post list for public profile preview. */
function ProfilePreviewPosts({ userId }: { userId: number }) {
  const { data: posts = [] } = useQuery<MyVideo[]>({
    queryKey: [`/api/users/${userId}/posts`],
    enabled: userId > 0,
  });
  if (posts.length === 0) return <Text style={styles.timelineEmptyText}>No posts yet</Text>;
  return (
    <View style={styles.previewPostsList}>
      {posts.slice(0, 6).map((v) => (
        <Pressable key={v.id} style={styles.previewPostItem} onPress={() => router.push(`/video/${v.id}`)}>
          <Image source={{ uri: v.thumbnail }} style={styles.timelineThumb} contentFit="cover" />
          <View style={styles.timelineBody}>
            <Text style={styles.timelineTitle} numberOfLines={2}>{v.title}</Text>
            <Text style={styles.timelineMeta} numberOfLines={1}>{v.community} · {v.timeAgo ?? ""}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}

// v2: ignore legacy dismiss flag and allow showing prompt again.
const PWA_DISMISSED_KEY = "pwa_add_to_home_dismissed_v2";

/** PWA "Add to Home Screen" FAB + popup for eligible web users. */
function usePwaInstallBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<{ prompt(): Promise<void> } | null>(null);

  const isWeb = Platform.OS === "web";
  const isIos =
    isWeb &&
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isIosChrome =
    isWeb &&
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    /CriOS/.test(navigator.userAgent);
  const isIosSafari = isIos && !isIosChrome;

  useEffect(() => {
    if (!isWeb || typeof window === "undefined") return;

    let isStandalone = false;
    try {
      if (typeof window.matchMedia === "function") {
        isStandalone = window.matchMedia("(display-mode: standalone)").matches;
      }
      // iOS Safari PWA
      if (!isStandalone && typeof navigator !== "undefined" && (navigator as any).standalone === true) {
        isStandalone = true;
      }
    } catch {
      // If detection fails, do not treat as standalone mode.
      isStandalone = false;
    }

    if (isStandalone) {
      setShowBanner(false);
      return;
    }

    // v2 treats "dismissed" flag loosely so prompt can reappear.
    try {
      const dismissed = window.localStorage.getItem(PWA_DISMISSED_KEY);
      if (dismissed === "1") {
        // Do not permanently hide by legacy flag; allow one more display.
        // If closed again, a new flag will be stored.
      }
    } catch {
      // Continue showing even if localStorage is unavailable.
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as unknown as { prompt(): Promise<void> });
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    setShowBanner(true);

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, [isWeb]);

  const onDismiss = () => {
    if (isWeb && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(PWA_DISMISSED_KEY, "1");
      } catch {
        // In environments without localStorage, close without persisting.
      }
    }
    setShowPopup(false);
    setShowBanner(false);
  };

  const onFabPress = () => setShowPopup(true);

  const onAddPress = () => {
    if (isIosSafari) {
      setShowPopup(false);
      return;
    }
    if (isIosChrome) {
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      setShowPopup(false);
      setShowBanner(false);
      if (isWeb && typeof window !== "undefined") {
        window.localStorage.setItem(PWA_DISMISSED_KEY, "1");
      }
    }
  };

  return {
    showBanner,
    showPopup,
    onAddPress,
    onDismiss,
    onFabPress,
    isIosSafari,
    isIosChrome,
    hasDeferredPrompt: !!deferredPrompt,
  };
}

export default function ProfileScreen() {
  const { width: windowWidth } = useWindowDimensions();
  /** Avoid SSR vs client width mismatch (React hydration #418). */
  const [layoutMetricsReady, setLayoutMetricsReady] = useState(false);
  useLayoutEffect(() => {
    setLayoutMetricsReady(true);
  }, []);
  const insets = useSafeAreaInsets();
  const topInset = getTabTopInset(insets);
  const bottomInset = getTabBottomInset(insets);
  const unreadCount = useUnreadCount();
  const dmUnreadCount = useDmUnreadCount();
  const { user, token, loading: authLoading, logout, updateProfile, loginWithToken } = useAuth();
  const queryClient = useQueryClient();

  // postMessage listener for popup-login completion.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const handler = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "auth_success" && event.data?.token) {
        try {
          await loginWithToken(event.data.token);
          queryClient.invalidateQueries();
        } catch (e) {
          console.error("[profile] popup auth failed:", e);
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [loginWithToken, queryClient]);

  // Profile edit state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [languageSaving, setLanguageSaving] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  /** Main header avatar: pick image and save without opening the edit modal */
  const [headerAvatarUploading, setHeaderAvatarUploading] = useState(false);

  useEffect(() => {
    setPreferredLanguage((user?.preferredLanguage ?? "en").toLowerCase());
  }, [user?.preferredLanguage]);

  async function updatePreferredLanguage(nextLanguage: "en" | "ja") {
    if (!user || languageSaving || preferredLanguage === nextLanguage) return;
    setLanguageSaving(true);
    try {
      await apiRequest("PATCH", "/api/translate/preferred-language", {
        preferredLanguage: nextLanguage,
      });
      setPreferredLanguage(nextLanguage);
      if (token) {
        await loginWithToken(token);
      }
      queryClient.invalidateQueries();
      Alert.alert(
        nextLanguage === "ja" ? "言語設定を保存しました" : "Language preference saved",
        nextLanguage === "ja"
          ? "日本語表示に切り替えました。"
          : "Switched to English UI.",
      );
    } catch (e: unknown) {
      const message = formatUserFacingApiError(e);
      Alert.alert("Could not update language", message);
    } finally {
      setLanguageSaving(false);
    }
  }

  // Role / creator registration state
  const { data: roleStatus, refetch: refetchRoles } = useQuery<{ isEditor: boolean; isMentor: boolean } | null>({
    queryKey: ["/api/profile/roles"],
    enabled: !!user,
  });
  const { data: levelProgress } = useQuery<LevelProgress>({
    queryKey: ["/api/livers/me/level-progress"],
    enabled: !!user && !!token,
  });

  const { data: myVideos = [] } = useQuery<MyVideo[]>({
    queryKey: ["/api/videos/my"],
    enabled: !!user && !!token,
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const res = await fetch(new URL("/api/videos/my", baseUrl).toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
  const { data: myCommunities = [] } = useQuery<MyCommunity[]>({
    queryKey: ["/api/communities/me"],
    enabled: !!user && !!token,
  });
  const myOfficialJoined = React.useMemo(
    () => myCommunities.filter((c) => Boolean(c.isOfficial)),
    [myCommunities],
  );
  const myRegularJoined = React.useMemo(
    () => myCommunities.filter((c) => !Boolean(c.isOfficial)),
    [myCommunities],
  );
  const { data: savedVideos = [] } = useQuery<MyVideo[]>({
    queryKey: ["/api/videos/saved"],
    enabled: !!user && !!token,
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const res = await fetch(new URL("/api/videos/saved", baseUrl).toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
  const [roleLoading, setRoleLoading] = useState<"editor" | "mentor" | null>(null);

  const { data: ticketData } = useQuery<{ balance: number }>({
    queryKey: ["/api/tickets/balance"],
    enabled: !!user,
  });
  const ticketBalance = ticketData?.balance ?? 0;

  const pwaBanner = usePwaInstallBanner();
  const compactProfileHeader = layoutMetricsReady && windowWidth <= 390;

  // Search state
  const [searchText, setSearchText] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  useEffect(() => {
    const id = setTimeout(() => {
      setSearchDebounced(searchText.trim());
    }, 300);
    return () => clearTimeout(id);
  }, [searchText]);

  type Liver = {
    id: number;
    name: string;
    community: string;
    avatar: string;
    category: string;
    followers: number;
  };
  type LiverSearchResponse = { rows: Liver[] };

  const { data: searchPayload } = useQuery<LiverSearchResponse>({
    queryKey: [searchDebounced ? `/api/livers?name=${encodeURIComponent(searchDebounced)}` : "/api/livers"],
    enabled: searchDebounced.length > 0,
  });
  const searchResults = searchPayload?.rows ?? [];







  function openProfileEdit() {
    setEditName(user?.name ?? user?.displayName ?? "");
    setEditBio(user?.bio ?? "");
    setEditAvatar(user?.avatar ?? user?.profileImageUrl ?? "");
    setShowProfileModal(true);
  }

  async function saveProfile() {
    if (!editName.trim()) {
      Alert.alert("Invalid input", "Please enter a display name.");
      return;
    }
    setProfileSaving(true);
    try {
      await updateProfile({ name: editName.trim(), bio: editBio.trim(), avatar: editAvatar.trim() || null });
      setShowProfileModal(false);
      router.replace("/profile");
    } catch (e: any) {
      Alert.alert("Save failed", e.message ?? "Please try again in a moment.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function uploadAvatarBlob(blob: Blob, fileName: string, mimeType: string): Promise<string> {
    return uploadUserMediaBlobToR2(blob, fileName, mimeType);
  }

  /** Returns public URL after upload, or null if user cancelled / no file */
  async function pickAndUploadAvatarUrl(): Promise<string | null> {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      return await new Promise((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif";
        input.oncancel = () => {
          input.remove();
          resolve(null);
        };
        input.onchange = async (e: Event) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) {
            input.remove();
            resolve(null);
            return;
          }
          try {
            let mime =
              file.type && /^image\/(jpeg|png|webp|gif|heic|heif)$/i.test(file.type) ? file.type : "image/jpeg";
            let safeName = (file.name || `avatar_${Date.now()}.jpg`).replace(/[^\w.-]/g, "_");
            let body: Blob = file;
            const looksHeic = /\.hei[cf]$/i.test(file.name) || /^image\/hei[cf]$/i.test(file.type);
            const needsCoerce =
              looksHeic ||
              !file.type ||
              !/^image\/(jpeg|png|webp|gif)$/i.test(file.type);
            if (needsCoerce) {
              if (typeof createImageBitmap === "function") {
                try {
                  const probe = await createImageBitmap(file);
                  probe.close();
                } catch {
                  throw new Error(
                    "Could not read this image in the browser. Try JPEG or PNG, or pick a different photo.",
                  );
                }
              }
              body = await compressImageBlobForUpload(file, looksHeic || /^image\/hei/.test(file.type) ? "image/jpeg" : mime);
              mime = "image/jpeg";
              safeName = safeName.replace(/\.[^.]+$/, "") + ".jpg";
            }
            resolve(await uploadAvatarBlob(body, safeName, mime));
          } catch (err) {
            reject(err);
          } finally {
            input.remove();
          }
        };
        document.body.appendChild(input);
        input.click();
      });
    }
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Allow photo library access to choose a photo.");
        return null;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || result.assets.length === 0) return null;
    const asset = result.assets[0];
    const mime = asset.mimeType || "image/jpeg";
    const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : mime.includes("gif") ? "gif" : "jpg";
    const fileName = asset.fileName?.trim() || `avatar_${Date.now()}.${ext}`;
    const blob = await (await fetch(asset.uri)).blob();
    return await uploadAvatarBlob(blob, fileName, mime);
  }

  async function pickAvatarFromHeader() {
    if (!user || avatarUploading || headerAvatarUploading) return;
    try {
      setHeaderAvatarUploading(true);
      const url = await pickAndUploadAvatarUrl();
      if (!url) return;
      // Avatar-only update avoids accidental overwrite of other profile fields.
      await updateProfile({ avatar: url });
      await queryClient.invalidateQueries();
    } catch (e: any) {
      Alert.alert("Update failed", formatUserFacingApiError(e));
    } finally {
      setHeaderAvatarUploading(false);
    }
  }

  async function pickAvatarImage() {
    if (avatarUploading) return;
    try {
      setAvatarUploading(true);
      const url = await pickAndUploadAvatarUrl();
      if (url) setEditAvatar(url);
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? "Could not upload the image.");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function runDeleteVideo(id: number) {
    try {
      await apiRequest("DELETE", `/api/videos/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/videos/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos/ranked"] });
    } catch (e: any) {
      Alert.alert("Delete Failed", e?.message ?? "Please try again later.");
    }
  }

  function deleteVideo(id: number) {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm("Delete this post? This cannot be undone.")) {
        void runDeleteVideo(id);
      }
      return;
    }
    Alert.alert("Delete Post?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => void runDeleteVideo(id),
      },
    ]);
  }

  async function runBulkDeleteWorks() {
    try {
      await apiRequest("DELETE", "/api/videos/mine?postType=work");
      queryClient.invalidateQueries({ queryKey: ["/api/videos/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos/ranked"] });
    } catch (e: any) {
      Alert.alert("Delete Failed", formatUserFacingApiError(e));
    }
  }

  function deleteAllWorks() {
    const n = myVideos.filter((v: any) => (v as any).postType === "work").length;
    if (n === 0) return;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm(`Delete all ${n} Work post(s)? This cannot be undone.`)) {
        void runBulkDeleteWorks();
      }
      return;
    }
    Alert.alert("Delete all Works?", `Remove ${n} Work post(s). This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete all", style: "destructive", onPress: () => void runBulkDeleteWorks() },
    ]);
  }

  async function runBulkDeleteAllPosts() {
    try {
      await apiRequest("DELETE", "/api/videos/mine?postType=all");
      queryClient.invalidateQueries({ queryKey: ["/api/videos/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos/ranked"] });
    } catch (e: any) {
      Alert.alert("Delete Failed", formatUserFacingApiError(e));
    }
  }

  function deleteAllMyPosts() {
    const n = myVideos.length;
    if (n === 0) return;
    const msg = `Delete ALL ${n} post(s) (Daily and Work)? This cannot be undone.`;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm(msg)) void runBulkDeleteAllPosts();
      return;
    }
    Alert.alert("Delete all posts?", msg, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete everything", style: "destructive", onPress: () => void runBulkDeleteAllPosts() },
    ]);
  }

  async function registerRole(role: "editor" | "mentor") {
    if (!user || roleLoading) return;
    setRoleLoading(role);
    try {
      await apiRequest("POST", "/api/profile/register-role", { role });
      await refetchRoles();
      Alert.alert(
        "Registered!",
        role === "editor"
          ? "You're registered as a Video Editor. You'll appear in creator listings."
          : "You're registered as a Session Liver. You'll appear in creator listings.",
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Registration failed");
    } finally {
      setRoleLoading(null);
    }
  }

  const profileFloatingActions = (
    <>
      {Platform.OS === "web" && pwaBanner.showBanner && (
        <>
          <Pressable
            style={[styles.pwaFab, { bottom: bottomInset + 16, zIndex: 100 }]}
            onPress={pwaBanner.onFabPress}
          >
            <View style={styles.pwaFabPearlOuter}>
              <LinearGradient
                colors={[
                  "rgba(251, 113, 133, 0.88)",
                  "rgba(192, 132, 252, 0.82)",
                  "rgba(56, 189, 248, 0.78)",
                  "rgba(52, 211, 153, 0.72)",
                ]}
                locations={[0, 0.35, 0.65, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <LinearGradient
                colors={["rgba(255,255,255,0.5)", "rgba(255,255,255,0.08)", "rgba(255,255,255,0)"]}
                start={{ x: 0.25, y: 0 }}
                end={{ x: 0.7, y: 0.45 }}
                style={styles.pwaFabPearlHighlight}
              />
              <LinearGradient
                colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.18)"]}
                start={{ x: 0.4, y: 0.5 }}
                end={{ x: 1, y: 1 }}
                style={styles.pwaFabPearlInnerGlow}
              />
              <View style={styles.pwaFabGradient}>
                <Ionicons name="phone-portrait-outline" size={22} color="#f8fafc" style={styles.pwaFabIconPearl} />
              </View>
            </View>
          </Pressable>
          <Modal visible={pwaBanner.showPopup} transparent animationType="fade">
            <Pressable style={styles.pwaPopupOverlay} onPress={pwaBanner.onDismiss}>
              <Pressable style={styles.pwaPopupBox} onPress={(e) => e.stopPropagation()}>
                <View style={styles.pwaPopupHeader}>
                  <Text style={styles.pwaPopupTitle}>Add to Home Screen</Text>
                  <Pressable style={styles.pwaPopupClose} onPress={pwaBanner.onDismiss} hitSlop={8}>
                    <Ionicons name="close" size={22} color={C.textMuted} />
                  </Pressable>
                </View>
                {pwaBanner.isIosChrome ? (
                  <Text style={styles.pwaPopupBody}>
                    Please open in Safari to add this app to your home screen.
                  </Text>
                ) : pwaBanner.isIosSafari ? (
                  <>
                    <Text style={styles.pwaPopupBody}>
                      {`Tap the Share button (□↑) at the bottom of Safari, then select "Add to Home Screen".`}
                    </Text>
                    <Pressable style={styles.pwaPopupBtn} onPress={pwaBanner.onAddPress}>
                      <Text style={styles.pwaPopupBtnText}>OK</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={styles.pwaPopupBody}>Add to your home screen and use it as an app</Text>
                    <Pressable
                      style={[styles.pwaPopupBtn, !pwaBanner.hasDeferredPrompt && styles.pwaPopupBtnDisabled]}
                      disabled={!pwaBanner.hasDeferredPrompt}
                      onPress={pwaBanner.onAddPress}
                    >
                      <Text style={styles.pwaPopupBtnText}>Add</Text>
                    </Pressable>
                  </>
                )}
              </Pressable>
            </Pressable>
          </Modal>
        </>
      )}
    </>
  );

  if (!authLoading && !user) {
    function handleGoogleLogin() {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const returnTo = window.location.pathname + window.location.search;
        saveLoginReturn(returnTo);
        const apiBase = getApiUrl();
        const url = new URL("/api/auth/google", apiBase).toString();
        window.location.href = url;
      } else {
        router.replace("/");
      }
    }

    return (
      <View style={{ flex: 1 }}>
        <View style={[styles.container, styles.guestContainer, { paddingTop: topInset + 40 }]}>
          <Ionicons name="person-circle-outline" size={80} color={C.textMuted} />
          <View style={styles.guestLogoWrap}>
            <AppLogo height={36} />
          </View>
          <Text style={styles.guestSub}>{ui.signInToProfile}</Text>
          <Pressable style={styles.googleLoginBtn} onPress={handleGoogleLogin}>
            <Image source={{ uri: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" }} style={styles.googleIcon} contentFit="contain" />
            <Text style={styles.googleLoginText}>Sign in with Google</Text>
          </Pressable>
          <View style={styles.guestLegalLinks}>
            <Pressable onPress={() => router.push("/legal")}>
              <Text style={styles.guestLegalLinkText}>Legal & Policies</Text>
            </Pressable>
          </View>
        </View>
        {profileFloatingActions}
      </View>
    );
  }

  const tipProgressRatio = levelProgress
    ? levelProgress.requiredTipGross > 0
      ? Math.min(1, levelProgress.tipGrossThisMonth / levelProgress.requiredTipGross)
      : 1
    : 0;
  const streamProgressRatio = levelProgress
    ? levelProgress.requiredStreamCount > 0
      ? Math.min(1, levelProgress.streamCountThisMonth / levelProgress.requiredStreamCount)
      : 1
    : 0;
  const overallProgressRatio = Math.min(1, (tipProgressRatio + streamProgressRatio) / 2);
  const progressPercent = Math.round(overallProgressRatio * 100);
  const isCreatorMode = Boolean(roleStatus?.isEditor || roleStatus?.isMentor);
  const isJaUi = preferredLanguage === "ja";
  const ui = isJaUi
    ? {
        signInToProfile: "サインインしてマイページを表示",
        searchPlaceholder: "アーティスト・クリエイターを検索",
        live: "ライブ",
        appLanguage: "アプリ表示言語",
        followers: "フォロワー",
        following: "フォロー中",
        creatorManage: "クリエイター管理",
        creatorManageSub: "運用・収益化に関する機能",
        creatorLevel: "クリエイターレベル",
        creatorLevelHint: "クリエイター登録後にレベル進捗を表示します。",
        ticketBalance: "チケット残高",
        topUp: "チャージ",
        revenueManagement: "収益管理",
        creatorRegistration: "クリエイター登録",
        creatorRegistrationSub: "動画編集者またはセッションライバーとして掲載できます。",
        videoEditor: "動画編集者",
        sessionLiver: "セッションライバー",
        creatorDashboard: "クリエイターダッシュボード",
        creatorDashboardSub: "マイページから管理画面へ移動できます。",
        mentorSessionsBookings: "メンター枠・予約管理",
        mentorSessionsBookingsSub: "商品、予約、ビデオ通話",
        availabilitySchedule: "スケジュール管理",
        availabilityScheduleSub: "空き枠・チケット枠の設定",
        editorListing: "編集者プロフィール",
        editorListingSub: "プロフィール、料金、納期設定",
        editRequestsInbox: "編集依頼Inbox",
        editRequestsInboxSub: "クライアントからの依頼一覧",
        enjoy: "楽しむ",
        enjoySub: "コミュニティを見つけて、お気に入りを保存し、日常をシェア",
      }
    : {
        signInToProfile: "Sign in to view your profile",
        searchPlaceholder: "Search artists & creators",
        live: "Live",
        appLanguage: "App language",
        followers: "Followers",
        following: "Following",
        creatorManage: "Creator Manage",
        creatorManageSub: "Operations and monetization tools for creators",
        creatorLevel: "CREATOR LEVEL",
        creatorLevelHint: "Register as a creator to see your level progress.",
        ticketBalance: "TICKET BALANCE",
        topUp: "Top Up",
        revenueManagement: "REVENUE MANAGEMENT",
        creatorRegistration: "Creator Registration",
        creatorRegistrationSub: "Register as a Video Editor or Session Liver to appear in creator listings.",
        videoEditor: "Video Editor",
        sessionLiver: "Session Liver",
        creatorDashboard: "Creator dashboard",
        creatorDashboardSub: "Open your management screens without leaving My Page.",
        mentorSessionsBookings: "Mentor sessions & bookings",
        mentorSessionsBookingsSub: "Products, reservations, and video calls",
        availabilitySchedule: "Availability schedule",
        availabilityScheduleSub: "Open slots and ticketed sessions",
        editorListing: "Editor listing",
        editorListingSub: "Profile, pricing, and delivery settings",
        editRequestsInbox: "Edit requests inbox",
        editRequestsInboxSub: "Incoming jobs from clients",
        enjoy: "Enjoy",
        enjoySub: "Discover communities, save favorites, and share your daily moments",
      };

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <AppLogo height={36} />
        <View style={styles.headerRight}>
          <Pressable style={styles.notifButton} onPress={() => router.push("/notifications?filter=all")}>
            <Ionicons name="notifications-outline" size={22} color={C.text} />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>
      <MetallicLine thickness={1} style={{ marginHorizontal: 16 }} />

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color={C.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={ui.searchPlaceholder}
          placeholderTextColor={C.textMuted}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <ScrollView style={webScrollStyle(styles.scroll)} showsVerticalScrollIndicator={scrollShowsVertical}>
        <View style={[styles.profileHeader, compactProfileHeader && styles.profileHeaderCompact]}>
          <View style={styles.profileLeft}>
            <Pressable
              style={[styles.avatarContainer, (headerAvatarUploading || avatarUploading) && { opacity: 0.75 }]}
              onPress={pickAvatarFromHeader}
              onLongPress={openProfileEdit}
              delayLongPress={380}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              accessibilityHint="Long press to edit name and bio"
            >
              {(user?.avatar ?? user?.profileImageUrl) ? (
                <Image
                  key={user.avatar ?? user.profileImageUrl ?? ""}
                  source={{ uri: (user.avatar ?? user.profileImageUrl) ?? "" }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <View style={styles.avatarWhiteCircle} />
                </View>
              )}
              {headerAvatarUploading ? (
                <View style={styles.avatarHeaderLoading}>
                  <ActivityIndicator color={C.accent} size="small" />
                </View>
              ) : (
                <View style={styles.avatarEditBadge}>
                  <Ionicons name="camera-outline" size={10} color="#fff" />
                </View>
              )}
            </Pressable>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>
                {user?.name ?? user?.displayName ?? ""}
              </Text>
            </View>
          </View>
          <View style={[styles.headerActions, compactProfileHeader && styles.headerActionsCompact]}>
            <Pressable
              style={({ pressed }) => [
                styles.editBtn,
                pressed && styles.headerBtnPressed,
              ]}
              onPress={() => setShowPreviewModal(true)}
            >
              <Ionicons name="eye-outline" size={18} color={C.accent} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.editBtn,
                pressed && styles.headerBtnPressed,
              ]}
              onPress={openProfileEdit}
            >
              <Ionicons name="pencil-outline" size={18} color={C.accent} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.editBtn,
                pressed && styles.headerBtnPressed,
              ]}
              onPress={() => router.push("/settings")}
            >
              <Ionicons name="settings-outline" size={18} color={C.accent} />
            </Pressable>
            <Pressable
              testID="logout-button"
              accessibilityLabel="Log out"
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.logoutBtn,
                pressed && styles.headerBtnPressed,
              ]}
              onPress={() => logout()}
            >
              <Ionicons name="log-out-outline" size={18} color={C.live} />
            </Pressable>
          </View>
        </View>

        {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
        <View style={styles.quickActionsRow}>
          <Pressable style={styles.quickActionBtn} onPress={() => router.push("/dm")}>
            <Ionicons name="paper-plane-outline" size={15} color={C.accent} />
            <Text style={styles.quickActionText}>DM</Text>
            {dmUnreadCount > 0 && <View style={styles.dmUnreadDot} />}
          </Pressable>
          <Pressable
            style={styles.quickActionBtn}
            onPress={() => router.push("/live" as any)}
            accessibilityLabel="Go live"
            accessibilityRole="button"
          >
            <Ionicons name="radio-outline" size={15} color={C.accent} />
            <Text style={styles.quickActionText}>{ui.live}</Text>
          </Pressable>
        </View>
        <View style={styles.languageRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.languageLabel}>{ui.appLanguage}</Text>
            <Text style={styles.languageHint}>
              {isJaUi ? "一部の画面は段階的に日本語化されています。" : "Some screens are localized to your selected language."}
            </Text>
          </View>
          <View style={styles.languagePills}>
            <Pressable
              style={[styles.languagePill, preferredLanguage === "en" && styles.languagePillActive]}
              onPress={() => void updatePreferredLanguage("en")}
              disabled={languageSaving}
            >
              <Text style={[styles.languagePillText, preferredLanguage === "en" && styles.languagePillTextActive]}>
                English
              </Text>
            </Pressable>
            <Pressable
              style={[styles.languagePill, preferredLanguage === "ja" && styles.languagePillActive]}
              onPress={() => void updatePreferredLanguage("ja")}
              disabled={languageSaving}
            >
              <Text style={[styles.languagePillText, preferredLanguage === "ja" && styles.languagePillTextActive]}>
                Japanese
              </Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.followRow}>
          <Pressable style={styles.followStat} onPress={() => router.push(`/user/${user?.id}/followers`)}>
            <Text style={styles.followStatValue}>{user?.followersCount ?? 0}</Text>
            <Text style={styles.followStatLabel}>{ui.followers}</Text>
          </Pressable>
          <Pressable style={styles.followStat} onPress={() => router.push(`/user/${user?.id}/following`)}>
            <Text style={styles.followStatValue}>{user?.followingCount ?? 0}</Text>
            <Text style={styles.followStatLabel}>{ui.following}</Text>
          </Pressable>
        </View>

        {(user?.instagramUrl || user?.youtubeUrl || user?.xUrl) ? (
          <View style={styles.socialLinksRow}>
            {user?.instagramUrl ? (
              <Pressable
                style={styles.socialIconBtn}
                onPress={() => user.instagramUrl && Linking.openURL(user.instagramUrl)}
              >
                <Ionicons name="logo-instagram" size={22} color="#E4405F" />
              </Pressable>
            ) : null}
            {user?.youtubeUrl ? (
              <Pressable
                style={styles.socialIconBtn}
                onPress={() => user.youtubeUrl && Linking.openURL(user.youtubeUrl)}
              >
                <Ionicons name="logo-youtube" size={22} color="#FF0000" />
              </Pressable>
            ) : null}
            {user?.xUrl ? (
              <Pressable
                style={styles.socialIconBtn}
                onPress={() => user.xUrl && Linking.openURL(user.xUrl)}
              >
                <Ionicons name="logo-twitter" size={22} color="#1DA1F2" />
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {isCreatorMode ? (
          <>
            <View style={styles.modeSectionHeader}>
              <Text style={styles.modeSectionTitle}>{ui.creatorManage}</Text>
              <Text style={styles.modeSectionSub}>{ui.creatorManageSub}</Text>
            </View>
            {/* Supporter Level */}
            <View style={styles.supporterCard}>
              <View style={styles.supporterHeader}>
                <Ionicons name="trending-up" size={16} color={C.accent} />
                <Text style={styles.supporterTitle}>
                  {levelProgress ? `${ui.creatorLevel} ${levelProgress.currentLevel}` : ui.creatorLevel}
                </Text>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeText}>{`${progressPercent}%`}</Text>
                </View>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                <Ionicons name="trophy-outline" size={14} color={C.orange} style={styles.trophyIcon} />
              </View>
              {levelProgress ? (
                <>
                  <Text style={styles.supporterSub}>
                    TIP BACK RATE: {Math.round(levelProgress.tipBackRate * 100)}% / PAID LIVE: 90%
                  </Text>
                  <Text style={styles.supporterHint}>
                    {levelProgress.remainingStreamCount} more streams or ¥
                    {levelProgress.remainingTipGross.toLocaleString()} more in tips to next level
                  </Text>
                </>
              ) : (
                <Text style={styles.supporterHint}>{ui.creatorLevelHint}</Text>
              )}
            </View>

            {/* Ticket Balance */}
            {user && (
              <Pressable style={styles.ticketBalanceRow} onPress={() => router.push("/tickets")}>
                <Text style={styles.ticketEmoji}>🎟</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ticketBalanceLabel}>{ui.ticketBalance}</Text>
                  <Text style={styles.ticketBalanceValue}>{ticketBalance.toLocaleString()} Tickets</Text>
                </View>
                <View style={styles.ticketTopUpBtn}>
                  <Text style={styles.ticketTopUpText}>{ui.topUp}</Text>
                </View>
              </Pressable>
            )}

            <Pressable style={styles.revenueBtn} onPress={() => router.push("/revenue")}>
              <Ionicons name="wallet-outline" size={16} color="#050505" />
              <Text style={styles.revenueBtnText}>{ui.revenueManagement}</Text>
            </Pressable>

            <Pressable style={styles.adReviewBtn} onPress={() => router.push("/community/ad-review")}>
              <Ionicons name="megaphone-outline" size={16} color="#050505" />
              <Text style={styles.adReviewBtnText}>Ad Review (Admins & Mods)</Text>
            </Pressable>

            {/* Creator / mentor session registration */}
            <View style={styles.roleCard}>
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.roleTitle}>{ui.creatorRegistration}</Text>
                  <Text style={styles.roleSub}>{ui.creatorRegistrationSub}</Text>
                </View>
              </View>
              <View style={styles.roleButtonsRow}>
                <Pressable
                  style={[
                    styles.roleButton,
                    roleStatus?.isEditor && styles.roleButtonActive,
                  ]}
                  disabled={!!roleStatus?.isEditor || roleLoading === "editor"}
                  onPress={() => registerRole("editor")}
                >
                  <Ionicons
                    name="color-wand-outline"
                    size={16}
                    color={roleStatus?.isEditor ? "#050505" : C.textSec}
                  />
                  <Text
                    style={[
                      styles.roleButtonText,
                      roleStatus?.isEditor && styles.roleButtonTextActive,
                    ]}
                  >
                    {ui.videoEditor}
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.roleButton,
                    roleStatus?.isMentor && styles.roleButtonActive,
                  ]}
                  disabled={!!roleStatus?.isMentor || roleLoading === "mentor"}
                  onPress={() => registerRole("mentor")}
                >
                  <Ionicons
                    name="camera-outline"
                    size={16}
                    color={roleStatus?.isMentor ? "#050505" : C.textSec}
                  />
                  <Text
                    style={[
                      styles.roleButtonText,
                      roleStatus?.isMentor && styles.roleButtonTextActive,
                    ]}
                  >
                    {ui.sessionLiver}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.creatorManageCard}>
              <Text style={styles.creatorManageTitle}>{ui.creatorDashboard}</Text>
              <Text style={styles.creatorManageSub}>{ui.creatorDashboardSub}</Text>
              {roleStatus?.isMentor ? (
                <>
                  <Pressable
                    style={styles.creatorManageRow}
                    onPress={() => router.push("/mentor-manage" as any)}
                    accessibilityRole="button"
                    accessibilityLabel="Mentor sessions and bookings"
                  >
                    <View style={styles.creatorManageIcon}>
                      <Ionicons name="videocam-outline" size={18} color={C.accent} />
                    </View>
                    <View style={styles.creatorManageRowBody}>
                      <Text style={styles.creatorManageRowTitle}>{ui.mentorSessionsBookings}</Text>
                      <Text style={styles.creatorManageRowSub}>{ui.mentorSessionsBookingsSub}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
                  </Pressable>
                  <Pressable
                    style={styles.creatorManageRow}
                    onPress={() => router.push("/liver-schedule" as any)}
                    accessibilityRole="button"
                    accessibilityLabel="Availability schedule"
                  >
                    <View style={styles.creatorManageIcon}>
                      <Ionicons name="calendar-outline" size={18} color={C.accent} />
                    </View>
                    <View style={styles.creatorManageRowBody}>
                      <Text style={styles.creatorManageRowTitle}>{ui.availabilitySchedule}</Text>
                      <Text style={styles.creatorManageRowSub}>{ui.availabilityScheduleSub}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
                  </Pressable>
                </>
              ) : null}
              {roleStatus?.isEditor ? (
                <>
                  <Pressable
                    style={styles.creatorManageRow}
                    onPress={() => router.push("/editor-profile" as any)}
                    accessibilityRole="button"
                    accessibilityLabel="Editor listing"
                  >
                    <View style={styles.creatorManageIcon}>
                      <Ionicons name="color-wand-outline" size={18} color={C.accent} />
                    </View>
                    <View style={styles.creatorManageRowBody}>
                      <Text style={styles.creatorManageRowTitle}>{ui.editorListing}</Text>
                      <Text style={styles.creatorManageRowSub}>{ui.editorListingSub}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
                  </Pressable>
                  <Pressable
                    style={styles.creatorManageRow}
                    onPress={() => router.push("/editor-inbox" as any)}
                    accessibilityRole="button"
                    accessibilityLabel="Edit requests inbox"
                  >
                    <View style={styles.creatorManageIcon}>
                      <Ionicons name="mail-outline" size={18} color={C.accent} />
                    </View>
                    <View style={styles.creatorManageRowBody}>
                      <Text style={styles.creatorManageRowTitle}>{ui.editRequestsInbox}</Text>
                      <Text style={styles.creatorManageRowSub}>{ui.editRequestsInboxSub}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
                  </Pressable>
                </>
              ) : null}
            </View>
          </>
        ) : (
          <View style={styles.modeSectionHeader}>
            <Text style={styles.modeSectionTitle}>{ui.enjoy}</Text>
            <Text style={styles.modeSectionSub}>{ui.enjoySub}</Text>
          </View>
        )}

        {(user?.role ?? "").toUpperCase() === "ADMIN" && (
          <Pressable style={styles.adminPanelBtn} onPress={() => router.push("/admin")}>
            <Ionicons name="settings-outline" size={16} color="#050505" />
            <Text style={styles.adminPanelBtnText}>Admin Panel</Text>
          </Pressable>
        )}

        {/* Search results */}
        {searchDebounced.length > 0 && searchResults.length > 0 && (
          <View style={styles.searchResults}>
            {searchResults.slice(0, 8).map((liver) => (
              <View key={liver.id} style={styles.searchResultRow}>
                <Pressable onPress={() => router.push(`/livers/${liver.id}`)} hitSlop={4}>
                  <Image source={{ uri: liver.avatar }} style={styles.searchResultAvatar} contentFit="cover" />
                </Pressable>
                <Pressable style={styles.searchResultBody} onPress={() => router.push(`/livers/${liver.id}`)}>
                  <Text style={styles.searchResultName} numberOfLines={1}>
                    {liver.name}
                  </Text>
                  <Text style={styles.searchResultMeta} numberOfLines={1}>
                    {liver.community} / {liver.category}
                  </Text>
                </Pressable>
                <Pressable onPress={() => router.push(`/livers/${liver.id}`)} hitSlop={8}>
                  <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* My List */}
        <View style={styles.myListSection}>
          <View style={styles.myListHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="bookmark" size={16} color={C.accent} />
              <Text style={styles.myListTitle}>Watchlist</Text>
            </View>
            <Text style={styles.myListCount}>{savedVideos.length}</Text>
          </View>
          <View style={styles.myListContent}>
            {savedVideos.slice(0, 8).map((v) => (
              <Pressable
                key={v.id}
                style={styles.myListItem}
                onPress={() => router.push(`/video/${v.id}`)}
              >
                <Image source={{ uri: v.thumbnail }} style={styles.timelineThumb} contentFit="cover" />
                <View style={styles.timelineBody}>
                  <Text style={styles.timelineTitle} numberOfLines={2}>{v.title}</Text>
                  <Text style={styles.timelineMeta} numberOfLines={1}>{v.community} · {v.timeAgo ?? ""}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
              </Pressable>
            ))}
            {savedVideos.length === 0 && (
              <Text style={styles.myListEmpty}>Add videos you like to your Watchlist</Text>
            )}
          </View>
        </View>

        {/* Official hubs joined */}
        {myOfficialJoined.length > 0 && (
          <View style={styles.myCommunitiesSection}>
            <View style={styles.myCommunitiesHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="layers-outline" size={16} color={C.accent} />
                <Text style={styles.myCommunitiesTitle}>Official list</Text>
              </View>
              <Text style={styles.myCommunitiesCount}>{myOfficialJoined.length}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={scrollShowsHorizontal}
              contentContainerStyle={styles.myCommunitiesList}
            >
              {myOfficialJoined.map((c) => (
                <Pressable
                  key={c.id}
                  style={styles.myCommunityCard}
                  onPress={() => router.push(`/community/${c.id}`)}
                >
                  <Image source={{ uri: c.thumbnail }} style={styles.myCommunityThumb} contentFit="cover" />
                  <View style={styles.myCommunityOverlay} />
                  <View style={styles.myCommunityHubBadge}>
                    <Text style={styles.myCommunityHubBadgeText}>HUB</Text>
                  </View>
                  {c.online && (
                    <View style={styles.myCommunityLiveBadge}>
                      <View style={styles.myCommunityLiveDot} />
                      <Text style={styles.myCommunityLiveText}>LIVE</Text>
                    </View>
                  )}
                  <View style={styles.myCommunityBottom}>
                    <Text style={styles.myCommunityName} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text style={styles.myCommunityMeta} numberOfLines={1}>
                      {c.members.toLocaleString()} members
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Other joined communities */}
        {myRegularJoined.length > 0 && (
          <View style={styles.myCommunitiesSection}>
            <View style={styles.myCommunitiesHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="people-outline" size={16} color={C.accent} />
                <Text style={styles.myCommunitiesTitle}>My Communities</Text>
              </View>
              <Text style={styles.myCommunitiesCount}>{myRegularJoined.length}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={scrollShowsHorizontal}
              contentContainerStyle={styles.myCommunitiesList}
            >
              {myRegularJoined.map((c) => (
                <Pressable
                  key={c.id}
                  style={styles.myCommunityCard}
                  onPress={() => router.push(`/community/${c.id}`)}
                >
                  <Image source={{ uri: c.thumbnail }} style={styles.myCommunityThumb} contentFit="cover" />
                  <View style={styles.myCommunityOverlay} />
                  {c.online && (
                    <View style={styles.myCommunityLiveBadge}>
                      <View style={styles.myCommunityLiveDot} />
                      <Text style={styles.myCommunityLiveText}>LIVE</Text>
                    </View>
                  )}
                  <View style={styles.myCommunityBottom}>
                    <Text style={styles.myCommunityName} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text style={styles.myCommunityMeta} numberOfLines={1}>
                      {c.members.toLocaleString()} members
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.postsHeader}>
          <View style={styles.postsLeft}>
            <Text style={styles.postsTitle}>Daily</Text>
            <Text style={styles.postsCount}>
              {myVideos.filter((v: any) => (v as any).postType === "daily" || !(v as any).postType).length}
            </Text>
          </View>
          <Pressable style={styles.uploadBtn} onPress={() => router.push("/upload")}>
            <Ionicons name="add" size={16} color="#050505" />
            <Text style={styles.uploadBtnText}>Post</Text>
          </Pressable>
        </View>

        <View style={styles.timelineList}>
          {myVideos
            .filter((v: any) => (v as any).postType === "daily" || !(v as any).postType)
            .slice(0, 4)
            .map((video) => (
            <View key={video.id} style={styles.timelineItem}>
              <Pressable
                style={styles.timelineDeleteBtn}
                onPress={() => deleteVideo(video.id)}
                hitSlop={8}
              >
                <Ionicons name="trash-outline" size={16} color={C.textMuted} />
              </Pressable>
              <Pressable
                style={styles.timelineMain}
                onPress={() => router.push(`/video/${video.id}`)}
              >
                <Image source={{ uri: video.thumbnail }} style={styles.timelineThumb} contentFit="cover" />
                <View style={styles.timelineBody}>
                  <Text style={styles.timelineTitle} numberOfLines={2}>
                    {video.title}
                  </Text>
                  <Text style={styles.timelineMeta} numberOfLines={1}>
                    {video.community} · {video.timeAgo ?? "just now"}
                  </Text>
                </View>
              </Pressable>
            </View>
          ))}
          {myVideos.filter((v: any) => (v as any).postType === "daily" || !(v as any).postType).length === 0 && (
            <View style={styles.timelineEmpty}>
              <Text style={styles.timelineEmptyText}>No daily posts yet</Text>
              <Text style={styles.timelineEmptySub}>{`Tap "Post" to share something quick`}</Text>
            </View>
          )}
        </View>

        {/* Works timeline */}
        <View style={styles.postsHeader}>
          <View style={styles.postsLeft}>
            <Text style={styles.postsTitle}>Works</Text>
            <Text style={styles.postsCount}>
              {myVideos.filter((v: any) => (v as any).postType === "work").length}
            </Text>
          </View>
          <Pressable style={styles.uploadBtn} onPress={() => router.push("/upload/work")}>
            <Ionicons name="add" size={16} color="#050505" />
            <Text style={styles.uploadBtnText}>Post Work</Text>
          </Pressable>
        </View>

        {myVideos.filter((v: any) => (v as any).postType === "work").length > 0 ? (
          <Pressable style={styles.deleteAllWorksLink} onPress={deleteAllWorks}>
            <Text style={styles.deleteAllWorksText}>Delete all Works</Text>
          </Pressable>
        ) : null}

        <View style={styles.timelineList}>
          {myVideos
            .filter((v: any) => (v as any).postType === "work")
            .slice(0, 4)
            .map((video) => (
            <View key={video.id} style={styles.timelineItem}>
              <Pressable
                style={styles.timelineDeleteBtn}
                onPress={() => deleteVideo(video.id)}
                hitSlop={8}
              >
                <Ionicons name="trash-outline" size={16} color={C.textMuted} />
              </Pressable>
              <Pressable
                style={styles.timelineMain}
                onPress={() => router.push(`/video/${video.id}`)}
              >
                <Image source={{ uri: video.thumbnail }} style={styles.timelineThumb} contentFit="cover" />
                <View style={styles.timelineBody}>
                  <Text style={styles.timelineTitle} numberOfLines={2}>
                    {video.title}
                  </Text>
                  <Text style={styles.timelineMeta} numberOfLines={1}>
                    {video.community} · {video.timeAgo ?? "just now"}
                  </Text>
                </View>
              </Pressable>
            </View>
          ))}
          {myVideos.filter((v: any) => (v as any).postType === "work").length === 0 && (
            <View style={styles.timelineEmpty}>
              <Text style={styles.timelineEmptyText}>No works posted yet</Text>
              <Text style={styles.timelineEmptySub}>
                {`Tap "Post Work" to share articles, photos & videos`}
              </Text>
            </View>
          )}
        </View>

        {myVideos.length > 0 ? (
          <View style={styles.dangerZone}>
            <Text style={styles.dangerZoneLabel}>Data</Text>
            <Pressable style={styles.deleteAllPostsBtn} onPress={deleteAllMyPosts}>
              <Ionicons name="warning-outline" size={16} color={C.live} />
              <Text style={styles.deleteAllPostsText}>Delete all my posts (Daily + Works)</Text>
            </Pressable>
            <Text style={styles.dangerZoneHint}>
              Removes every post you own. Use the row above to delete only Works.
            </Text>
          </View>
        ) : null}

        <View style={{ height: 120 }} />
      </ScrollView>



      {profileFloatingActions}

      {/* Public profile preview modal */}
      <Modal visible={showPreviewModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowPreviewModal(false)} />
          <View style={[styles.modalSheet, styles.previewModalSheet, { paddingBottom: getTabBottomInset(insets) + 16, maxHeight: "90%" }]}>
            <View style={styles.modalHandle} />
            <View style={styles.previewModalHeader}>
              <Text style={styles.modalTitle}>Profile Preview</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Pressable
                  style={styles.previewOpenPageBtn}
                  onPress={() => {
                    setShowPreviewModal(false);
                    if (user?.id) router.push(`/user/${user.id}`);
                  }}
                >
                  <Text style={styles.previewOpenPageText}>View full page</Text>
                </Pressable>
                <Pressable onPress={() => setShowPreviewModal(false)} hitSlop={8}>
                  <Ionicons name="close" size={24} color={C.textMuted} />
                </Pressable>
              </View>
            </View>
            <ScrollView style={webScrollStyle(styles.previewScroll)} showsVerticalScrollIndicator={scrollShowsVertical}>
              <View style={styles.previewProfileCard}>
                <View style={styles.previewAvatarWrap}>
                  {(user?.avatar ?? user?.profileImageUrl) ? (
                    <Image source={{ uri: (user.avatar ?? user.profileImageUrl) ?? "" }} style={styles.previewAvatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.previewAvatar, styles.avatarFallback]}>
                      <View style={styles.previewWhiteCircle} />
                    </View>
                  )}
                </View>
                <Text style={styles.previewName}>{user?.name ?? user?.displayName ?? ""}</Text>
                {user?.bio ? <Text style={styles.previewBio}>{user.bio}</Text> : (
                  <Text style={styles.previewBio}>No bio set yet</Text>
                )}
                {/* Role badges */}
                <View style={styles.previewRoleBadges}>
                  {roleStatus?.isEditor && (
                    <View style={styles.previewRoleBadge}>
                      <Ionicons name="color-wand-outline" size={11} color={C.accent} />
                      <Text style={styles.previewRoleBadgeText}>Video Editor</Text>
                    </View>
                  )}
                  {roleStatus?.isMentor && (
                    <View style={styles.previewRoleBadge}>
                      <Ionicons name="camera-outline" size={11} color={C.accent} />
                      <Text style={styles.previewRoleBadgeText}>Session Liver</Text>
                    </View>
                  )}
                </View>
                {(user?.instagramUrl || user?.youtubeUrl || user?.xUrl) ? (
                  <View style={styles.socialLinksRow}>
                    {user?.instagramUrl && <View style={styles.socialIconBtn}><Ionicons name="logo-instagram" size={22} color="#E4405F" /></View>}
                    {user?.youtubeUrl && <View style={styles.socialIconBtn}><Ionicons name="logo-youtube" size={22} color="#FF0000" /></View>}
                    {user?.xUrl && <View style={styles.socialIconBtn}><Ionicons name="logo-twitter" size={22} color="#1DA1F2" /></View>}
                  </View>
                ) : null}
              </View>
               {myOfficialJoined.length > 0 && (
                <View style={styles.previewCommunitiesSection}>
                  <Text style={styles.previewSectionTitle}>Official list</Text>
                  <View style={styles.previewCommunityGrid}>
                    {myOfficialJoined.slice(0, 6).map((c) => (
                      <Pressable key={c.id} style={styles.previewCommunityChip} onPress={() => router.push(`/community/${c.id}`)}>
                        <Image
                          source={{ uri: c.iconUrl?.trim() || c.thumbnail }}
                          style={styles.previewCommunityThumb}
                          contentFit="cover"
                        />
                        <Text style={styles.previewCommunityName} numberOfLines={1}>{c.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
              {myRegularJoined.length > 0 && (
                <View style={styles.previewCommunitiesSection}>
                  <Text style={styles.previewSectionTitle}>My Communities</Text>
                  <View style={styles.previewCommunityGrid}>
                    {myRegularJoined.slice(0, 6).map((c) => (
                      <Pressable key={c.id} style={styles.previewCommunityChip} onPress={() => router.push(`/community/${c.id}`)}>
                        <Image
                          source={{ uri: c.iconUrl?.trim() || c.thumbnail }}
                          style={styles.previewCommunityThumb}
                          contentFit="cover"
                        />
                        <Text style={styles.previewCommunityName} numberOfLines={1}>{c.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.previewPostsSection}>
                <Text style={styles.postsTitle}>Posts</Text>
                <ProfilePreviewPosts userId={user?.id ?? 0} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Profile Edit Modal */}
      <Modal visible={showProfileModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowProfileModal(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalKbWrap}
            keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
          >
          <View style={[styles.modalSheet, { paddingBottom: getTabBottomInset(insets) + 16 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.profileEditHeaderRow}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="person-circle-outline" size={20} color={C.accent} />
                <Text style={styles.modalTitle}>Edit Profile</Text>
              </View>
              <Pressable
                onPress={() => setShowProfileModal(false)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={26} color={C.textMuted} />
              </Pressable>
            </View>
            <Text style={styles.profileEditHint}>
              Tap the photo to change it. Add SNS and music links from Settings → Edit Profile.
            </Text>

            <ScrollView
              style={styles.profileEditScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={scrollShowsVertical}
            >
              <Pressable
                style={[styles.editAvatarHero, avatarUploading && styles.editAvatarHeroDisabled]}
                onPress={pickAvatarImage}
                disabled={avatarUploading}
                accessibilityRole="button"
                accessibilityLabel="Change profile photo"
              >
                {editAvatar ? (
                  <Image source={{ uri: editAvatar }} style={styles.editAvatarHeroImage} contentFit="cover" />
                ) : (
                  <View style={[styles.editAvatarHeroImage, styles.editAvatarPlaceholder]}>
                    <Ionicons name="person-outline" size={44} color={C.textMuted} />
                  </View>
                )}
                {avatarUploading ? (
                  <View style={styles.editAvatarLoadingMask}>
                    <ActivityIndicator color="#fff" size="large" />
                  </View>
                ) : (
                  <View style={styles.editAvatarCamBadge} pointerEvents="none">
                    <Ionicons name="camera" size={18} color="#fff" />
                  </View>
                )}
              </Pressable>
              <Text style={styles.editAvatarTapHint}>Tap photo to change</Text>
              {editAvatar ? (
                <Pressable
                  style={styles.removePhotoBtn}
                  onPress={() => {
                    Alert.alert("Remove photo", "Changes apply after you save.", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Remove", style: "destructive", onPress: () => setEditAvatar("") },
                    ]);
                  }}
                  disabled={avatarUploading}
                >
                  <Text style={styles.removePhotoText}>Remove photo</Text>
                </Pressable>
              ) : null}

              <Text style={[styles.profileFieldLabel, styles.profileFieldLabelFirst]}>Display name</Text>
              <View style={styles.profileInputWrap}>
                <Ionicons name="person-outline" size={16} color={C.textMuted} />
                <TextInput
                  style={styles.profileInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Display name"
                  placeholderTextColor={C.textMuted}
                  maxLength={30}
                />
              </View>

              <Text style={styles.profileFieldLabel}>Bio</Text>
              <View style={[styles.profileInputWrap, { alignItems: "flex-start", paddingTop: 12, paddingBottom: 12 }]}>
                <Ionicons name="text-outline" size={16} color={C.textMuted} style={{ marginTop: 2 }} />
                <TextInput
                  style={[styles.profileInput, { height: 88, textAlignVertical: "top" }]}
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder="Write a short bio"
                  placeholderTextColor={C.textMuted}
                  multiline
                  maxLength={200}
                />
              </View>

              <View style={styles.modalActions}>
                <Pressable style={styles.cancelBtn} onPress={() => setShowProfileModal(false)}>
                  <Text style={styles.cancelBtnText}>Close</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveBtn, profileSaving && { opacity: 0.6 }]}
                  onPress={saveProfile}
                  disabled={profileSaving}
                >
                  {profileSaving ? (
                    <ActivityIndicator color="#050505" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={styles.saveBtnText}>Save</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>


    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  identityBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: C.orange,
    borderRadius: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  identityText: { color: C.orange, fontSize: 11, fontWeight: "700" },
  notifButton: { position: "relative" },
  notifBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: C.live,
    borderRadius: 2,
    minWidth: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  notifBadgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: C.surface,
    borderRadius: 3,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, color: C.text, fontSize: 14 },
  scroll: { flex: 1 },
  profileHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  profileHeaderCompact: {
    gap: 10,
  },
  profileLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1, minWidth: 0 },
  avatarContainer: {
    position: "relative",
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 35,
    padding: 2,
  },
  avatar: { width: 66, height: 66, borderRadius: 33 },
  profileInfo: { gap: 6 },
  profileName: { color: C.text, fontSize: 18, fontWeight: "800", flexShrink: 1 },
  followRow: { flexDirection: "row", gap: 24, marginTop: 10, marginBottom: 4 },
  followStat: { alignItems: "center" as const, gap: 2 },
  followStatValue: { fontSize: 18, fontWeight: "700" as const, color: C.text },
  followStatLabel: { fontSize: 11, color: C.textMuted },
  followNumber: { color: C.text, fontSize: 14, fontWeight: "700" },
  followLabel: { color: C.textMuted, fontSize: 9, fontWeight: "600", letterSpacing: 0.3 },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  bio: { color: C.textSec, fontSize: 13, paddingHorizontal: 16, marginBottom: 10 },
  quickActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  quickActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: C.surface,
  },
  quickActionText: { color: C.textSec, fontSize: 12, fontWeight: "700" },
  dmUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.live,
    marginLeft: 2,
  },
  languageRow: {
    paddingHorizontal: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  languageLabel: { color: C.textSec, fontSize: 12, fontWeight: "700" },
  languageHint: { color: C.textMuted, fontSize: 10, marginTop: 3 },
  languagePills: { flexDirection: "row", alignItems: "center", gap: 8 },
  languagePill: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: C.surface,
  },
  languagePillActive: {
    borderColor: C.accent,
    backgroundColor: "rgba(0,255,204,0.12)",
  },
  languagePillText: { color: C.textSec, fontSize: 11, fontWeight: "700" },
  languagePillTextActive: { color: C.accent },
  socialLinksRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  socialIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 3,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  tagsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 16, flexWrap: "wrap" },
  tag: {
    backgroundColor: C.surface,
    borderRadius: 3,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.border,
  },
  tagText: { color: C.textSec, fontSize: 12, fontWeight: "600" },


  supporterCard: {
    marginHorizontal: 16,
    backgroundColor: C.surface,
    borderRadius: 3,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  supporterHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  supporterTitle: { color: C.accent, fontSize: 12, fontWeight: "800", letterSpacing: 0.5, flex: 1 },
  activeBadge: { backgroundColor: C.accent, borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2 },
  activeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  progressBar: {
    height: 8,
    backgroundColor: C.surface2,
    borderRadius: 2,
    overflow: "hidden",
    position: "relative",
  },
  progressFill: { height: "100%", backgroundColor: C.accent, borderRadius: 2 },
  trophyIcon: { position: "absolute", right: 0, top: -3 },
  supporterSub: { color: C.accent, fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  supporterHint: { color: C.textMuted, fontSize: 11, lineHeight: 16 },
  modeSectionHeader: {
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 4,
  },
  modeSectionTitle: { color: C.text, fontSize: 14, fontWeight: "800" },
  modeSectionSub: { color: C.textMuted, fontSize: 11, marginTop: 3, lineHeight: 16 },
  roleCard: {
    marginHorizontal: 16,
    backgroundColor: C.surface,
    borderRadius: 3,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  roleTitle: { color: C.text, fontSize: 13, fontWeight: "700" },
  roleSub: { color: C.textMuted, fontSize: 11 },
  roleButtonsRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  roleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 3,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
  },
  roleButtonActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  roleButtonText: { color: C.textSec, fontSize: 12, fontWeight: "700" },
  roleButtonTextActive: { color: "#050505" },
  creatorManageCard: {
    marginHorizontal: 16,
    backgroundColor: C.surface,
    borderRadius: 3,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 4,
  },
  creatorManageTitle: { color: C.text, fontSize: 13, fontWeight: "800" },
  creatorManageSub: { color: C.textMuted, fontSize: 11, lineHeight: 16, marginBottom: 6 },
  creatorManageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  creatorManageIcon: {
    width: 36,
    height: 36,
    borderRadius: 3,
    backgroundColor: C.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  creatorManageRowBody: { flex: 1, minWidth: 0 },
  creatorManageRowTitle: { color: C.text, fontSize: 13, fontWeight: "700" },
  creatorManageRowSub: { color: C.textMuted, fontSize: 11, marginTop: 2 },
  ticketBalanceRow: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  ticketEmoji: { fontSize: 26 },
  ticketBalanceLabel: { color: C.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  ticketBalanceValue: { color: C.text, fontSize: 16, fontWeight: "800", marginTop: 1 },
  ticketTopUpBtn: {
    backgroundColor: C.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ticketTopUpText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  revenueBtn: {
    marginHorizontal: 16,
    backgroundColor: C.green,
    borderRadius: 3,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  },
  revenueBtnText: { color: "#050505", fontSize: 14, fontWeight: "800", letterSpacing: 0.5 },
  adReviewBtn: {
    marginHorizontal: 16,
    backgroundColor: C.orange,
    borderRadius: 3,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  },
  adReviewBtnText: { color: "#050505", fontSize: 14, fontWeight: "800", letterSpacing: 0.5 },
  adminPanelBtn: {
    marginHorizontal: 16,
    backgroundColor: C.accent,
    borderRadius: 3,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  },
  adminPanelBtnText: { color: "#050505", fontSize: 14, fontWeight: "800", letterSpacing: 0.5 },
  searchResults: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: C.surface,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  searchResultAvatar: {
    width: 32,
    height: 32,
    borderRadius: 3,
    marginRight: 10,
  },
  searchResultBody: { flex: 1 },
  searchResultName: { color: C.text, fontSize: 13, fontWeight: "700" },
  searchResultMeta: { color: C.textMuted, fontSize: 11, marginTop: 2 },
  postsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  postsLeft: { gap: 2 },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.accent,
    borderRadius: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  uploadBtnText: { color: "#050505", fontSize: 12, fontWeight: "700" },
  postsTitle: { color: C.text, fontSize: 13, fontWeight: "800", letterSpacing: 1 },
  postsCount: { color: C.textMuted, fontSize: 12, fontWeight: "600" },
  timelineList: { paddingHorizontal: 16, gap: 6, marginBottom: 12 },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.surface,
    borderRadius: 3,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  timelineMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  timelineThumb: { width: 64, aspectRatio: 16 / 9, borderRadius: 3, backgroundColor: C.surface2 },
  timelineBody: { flex: 1 },
  timelineTitle: { color: C.text, fontSize: 12, fontWeight: "700", marginBottom: 1 },
  timelineMeta: { color: C.textMuted, fontSize: 10 },
  timelineDeleteBtn: {
    paddingRight: 6,
    paddingVertical: 4,
  },
  deleteAllWorksLink: {
    alignSelf: "flex-end",
    marginRight: 16,
    marginBottom: 6,
    paddingVertical: 4,
  },
  deleteAllWorksText: {
    color: C.live,
    fontSize: 12,
    fontWeight: "600",
  },
  dangerZone: {
    marginHorizontal: 16,
    marginTop: 24,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,77,0,0.35)",
    backgroundColor: "rgba(255,77,0,0.06)",
    gap: 10,
  },
  dangerZoneLabel: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  deleteAllPostsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingVertical: 6,
  },
  deleteAllPostsText: {
    color: C.live,
    fontSize: 13,
    fontWeight: "700",
  },
  dangerZoneHint: {
    color: C.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  timelineEmpty: { paddingHorizontal: 16, paddingVertical: 12, alignItems: "center" },
  timelineEmptyText: { color: C.textSec, fontSize: 13, fontWeight: "700" },
  timelineEmptySub: { color: C.textMuted, fontSize: 11, marginTop: 4 },
  myListSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  myListHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  myListTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
  },
  myListCount: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  myListContent: {
    backgroundColor: C.surface,
    borderRadius: 3,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  myListItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  myListEmpty: {
    color: C.textMuted,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 16,
  },
  myCommunitiesSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  myCommunitiesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  myCommunitiesTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
  },
  myCommunitiesCount: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  myCommunitiesList: {
    gap: 10,
  },
  myCommunityCard: {
    width: 140,
    height: 120,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  myCommunityThumb: {
    width: "100%",
    height: "100%",
  },
  myCommunityOverlay: {
    ...StyleSheet.absoluteFillObject as any,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  myCommunityBottom: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8,
  },
  myCommunityName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  myCommunityMeta: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    marginTop: 2,
  },
  myCommunityLiveBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.live,
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  myCommunityLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 2,
    backgroundColor: "#fff",
  },
  myCommunityLiveText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  myCommunityHubBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: C.accent + "99",
  },
  myCommunityHubBadgeText: {
    color: C.accent,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
    width: "100%",
  },
  modalKbWrap: {
    flex: 1,
    justifyContent: "flex-end",
    width: "100%",
    maxWidth: "100%",
  },
  modalSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    padding: 20,
    maxHeight: "88%",
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: "center",
    marginBottom: 18,
  },
  previewModalSheet: { paddingHorizontal: 16 },
  previewModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  previewOpenPageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: C.accent,
    borderRadius: 3,
  },
  previewOpenPageText: { color: "#050505", fontSize: 12, fontWeight: "700" },
  previewScroll: { flex: 1 },
  previewProfileCard: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.borderDim,
    marginBottom: 16,
  },
  previewAvatarWrap: { marginBottom: 14 },
  previewAvatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: C.accent },
  previewWhiteCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#fff",
  },
  previewName: { color: C.text, fontSize: 18, fontWeight: "800", marginBottom: 8 },
  previewBio: { color: C.textSec, fontSize: 14, lineHeight: 20, textAlign: "center", marginBottom: 12 },
  previewPostsSection: { paddingHorizontal: 16, paddingBottom: 24 },
  previewPostsList: { gap: 8 },
  previewRoleBadges: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 10 },
  previewRoleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.surface2,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: C.borderDim,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  previewRoleBadgeText: { color: C.textSec, fontSize: 10, fontWeight: "700" },
  previewSectionTitle: { color: C.textSec, fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginBottom: 10, marginTop: 4 },
  previewCommunitiesSection: { paddingHorizontal: 16, marginBottom: 20 },
  previewCommunityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  previewCommunityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.surface2,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: C.borderDim,
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: "47%",
  },
  previewCommunityThumb: { width: 28, height: 28, borderRadius: 2 },
  previewCommunityName: { color: C.text, fontSize: 11, fontWeight: "700", flex: 1 },
  previewPostItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: C.surface,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  modalTitle: { color: C.text, fontSize: 18, fontWeight: "800" },
  modalSub: { color: C.textMuted, fontSize: 12, marginBottom: 20 },
  profileEditHint: { color: C.textMuted, fontSize: 11, lineHeight: 16, marginBottom: 12 },
  profileEditHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: 12,
  },
  profileEditScroll: { maxHeight: 420, marginTop: 4 },
  editAvatarHero: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignSelf: "center",
    marginTop: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: C.accent,
    backgroundColor: C.surface2,
  },
  editAvatarHeroDisabled: { opacity: 0.85 },
  editAvatarHeroImage: { width: "100%", height: "100%" },
  editAvatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  editAvatarLoadingMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  editAvatarCamBadge: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: C.bg,
  },
  editAvatarTapHint: {
    alignSelf: "center",
    marginTop: 10,
    fontSize: 12,
    fontWeight: "600",
    color: C.textSec,
  },
  removePhotoBtn: { alignSelf: "center", marginTop: 6, paddingVertical: 8, paddingHorizontal: 12 },
  removePhotoText: { color: C.textMuted, fontSize: 12, fontWeight: "600", textDecorationLine: "underline" },
  profileFieldLabelFirst: { marginTop: 18 },
  modalScroll: { maxHeight: 380 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 22, marginBottom: 8 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
  },
  cancelBtnText: { color: C.textSec, fontSize: 14, fontWeight: "700" },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 3,
    backgroundColor: C.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  saveBtnText: { color: "#050505", fontSize: 14, fontWeight: "800" },

  // Guest / not logged in
  guestContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 },
  guestLogoWrap: { marginBottom: 4 },
  guestSub: { color: C.textMuted, fontSize: 14, textAlign: "center" },
  guestLoginBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.accent,
    borderRadius: 3,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  guestLoginText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  guestRegisterBtn: { paddingVertical: 8 },
  guestRegisterText: { color: C.accent, fontSize: 14, fontWeight: "600" },
  googleLoginBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.accent,
    borderRadius: 3,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  googleIcon: { width: 22, height: 22 },
  googleLoginText: { color: "#050505", fontSize: 16, fontWeight: "800" },
  guestLegalLinks: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 4,
    paddingHorizontal: 16,
  },
  guestLegalLinkText: { color: C.accent, fontSize: 12, fontFamily: "Courier Prime", textDecorationLine: "none" },
  guestLegalSeparator: { color: C.textMuted, fontSize: 12 },

  pwaFab: {
    position: "absolute",
    right: 28,
    width: 48,
    height: 62,
    borderRadius: 24,
    overflow: "visible",
    shadowColor: "#a78bfa",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 14,
  },
  pwaFabPearlOuter: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.42)",
  },
  pwaFabPearlHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  pwaFabPearlInnerGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  pwaFabGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pwaFabIconPearl: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.55,
    shadowRadius: 2,
  },
  pwaPopupOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  pwaPopupBox: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: C.surface,
    borderRadius: 3,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  pwaPopupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  pwaPopupTitle: { color: C.text, fontSize: 16, fontWeight: "800" },
  pwaPopupClose: { padding: 4 },
  pwaPopupBody: {
    color: C.textSec,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  pwaPopupBtn: {
    backgroundColor: C.accent,
    borderRadius: 3,
    paddingVertical: 12,
    alignItems: "center",
  },
  pwaPopupBtnDisabled: { opacity: 0.6 },
  pwaPopupBtnText: { color: "#050505", fontSize: 14, fontWeight: "700" },

  // Header actions (edit + logout)
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "nowrap",
    columnGap: 6,
    rowGap: 0,
    marginLeft: 8,
    maxWidth: 170,
    flexShrink: 0,
  },
  headerActionsCompact: {
    marginLeft: 6,
    maxWidth: 156,
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBtnPressed: {
    backgroundColor: C.surface2,
    borderColor: C.accent,
  },

  // Avatar fallback + edit badge
  avatarFallback: {
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWhiteCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarInitial: { color: C.accent, fontSize: 28, fontWeight: "800" },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 3,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: C.bg,
  },
  avatarHeaderLoading: {
    position: "absolute",
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: 33,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Profile edit modal fields
  profileFieldLabel: { color: C.textSec, fontSize: 12, fontWeight: "600", marginBottom: 8, marginTop: 16 },
  profileInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface2,
    borderRadius: 3,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  profileInput: { flex: 1, color: C.text, fontSize: 14, paddingVertical: 12 },
});
