import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
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
import { DM_USAGE_GUIDE_BODY, DM_USAGE_GUIDE_TITLE } from "@/constants/dmUsageGuide";
import { apiRequest, getApiUrl, readAuthToken, uploadUserMediaBlobToR2 } from "@/lib/query-client";
import { navigateToUserOrLiverProfile } from "@/lib/navigate-profile";
import { useAuth } from "@/lib/auth";
import { saveLoginReturn } from "@/lib/login-return";
import { TranslateButton } from "@/components/TranslateButton";
import * as ImagePicker from "expo-image-picker";

type DMItem = {
  id: number;
  name: string;
  avatar: string | null;
  online: boolean;
  lastMessage: string;
  otherUserId?: number;
};

type ConvMsg = {
  id: number;
  senderId?: number | null;
  sender: string;
  text: string | null;
  imageUrl: string | null;
  isRead: boolean;
  createdAt: string;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function DMChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dmId = parseInt(id ?? "1");
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const [input, setInput] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const { token, user, loading: authLoading } = useAuth();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: dmList = [] } = useQuery<DMItem[]>({
    queryKey: ["/api/dm-messages"],
  });
  const dmInfo = dmList.find((d) => d.id === dmId);

  const { data: peerMeta } = useQuery<{ name: string; avatar: string; otherUserId: number }>({
    queryKey: [`/api/dm-messages/${dmId}/peer`],
    enabled:
      Number.isFinite(dmId) &&
      dmId !== 0 &&
      !!(token || user) &&
      (!dmInfo || !dmInfo.otherUserId || dmInfo.otherUserId <= 0),
    queryFn: async () => {
      const t = (await readAuthToken()) ?? token;
      if (!t) throw new Error("peer");
      const res = await fetch(new URL(`/api/dm-messages/${dmId}/peer`, getApiUrl()).toString(), {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) throw new Error("peer");
      return res.json() as Promise<{ name: string; avatar: string; otherUserId: number }>;
    },
  });

  const headerName = dmInfo?.name ?? peerMeta?.name ?? "";
  const headerAvatar = dmInfo?.avatar ?? peerMeta?.avatar ?? null;
  const headerPeerUserId = dmInfo?.otherUserId ?? peerMeta?.otherUserId ?? 0;
  const myAvatar = user?.avatar ?? user?.profileImageUrl ?? null;

  const { data: messages = [] } = useQuery<ConvMsg[]>({
    queryKey: [`/api/dm-messages/${dmId}/conversation`],
    enabled: Number.isFinite(dmId) && dmId !== 0 && !!(token || user),
    refetchInterval: 4000,
  });

  useEffect(() => {
    if (authLoading) return;
    if (user || token) return;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      saveLoginReturn(window.location.pathname + window.location.search);
    }
    router.replace("/auth/login" as any);
  }, [authLoading, user, token]);

  const sendMutation = useMutation({
    mutationFn: (payload: { text?: string; attachmentUrl?: string }) =>
      apiRequest("POST", `/api/dm-messages/${dmId}/conversation`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/dm-messages/${dmId}/conversation`] });
      qc.invalidateQueries({ queryKey: ["/api/dm-messages"] });
      setAttachmentUrl(null);
    },
    onError: (e: unknown) => {
      Alert.alert("Send failed", e instanceof Error ? e.message : "Could not send DM");
    },
  });

  const uploadImageBlobToR2 = useCallback(
    (blob: Blob, fileName: string, mime: string): Promise<string> =>
      uploadUserMediaBlobToR2(blob, fileName, mime),
    [],
  );

  const pickImage = useCallback(async () => {
    try {
      setUploadingImage(true);
      if (Platform.OS === "web") {
        const inputEl = document.createElement("input");
        inputEl.type = "file";
        inputEl.accept = "image/jpeg,image/png,image/webp,image/gif";
        await new Promise<void>((resolve) => {
          inputEl.onchange = async () => {
            try {
              const file = inputEl.files?.[0];
              if (!file) return resolve();
              const mime = file.type || "image/jpeg";
              const safeName = (file.name || `dm-${Date.now()}.jpg`).replace(/[^\w.-]/g, "_");
              const url = await uploadImageBlobToR2(file, safeName, mime);
              setAttachmentUrl(url);
            } catch (e) {
              Alert.alert("Attachment failed", e instanceof Error ? e.message : "Upload failed");
            } finally {
              resolve();
            }
          };
          inputEl.click();
        });
        return;
      }
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Permission required", "Allow photo library access to attach an image.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.9,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const mime = asset.mimeType ?? "image/jpeg";
      const ext = mime.split("/")[1] || "jpg";
      const name = `dm-${Date.now()}.${ext}`.replace(/[^\w.-]/g, "_");
      const imgRes = await fetch(asset.uri);
      const blob = await imgRes.blob();
      const url = await uploadImageBlobToR2(blob, name, mime);
      setAttachmentUrl(url);
    } catch (e) {
      Alert.alert("Attachment failed", e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingImage(false);
    }
  }, [uploadImageBlobToR2]);

  const sendMessage = useCallback(() => {
    const msg = input.trim();
    if (!msg && !attachmentUrl) return;
    setInput("");
    sendMutation.mutate({ text: msg || undefined, attachmentUrl: attachmentUrl ?? undefined });
  }, [input, attachmentUrl, sendMutation]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  /** Clear ops-DM unread badge the first time a legacy negative thread id is opened */
  useEffect(() => {
    if (!(token || user) || !Number.isFinite(dmId) || dmId === 0 || dmId > 0) return;
    void (async () => {
      try {
        await apiRequest("POST", `/api/dm-messages/${dmId}/read`, {});
        await qc.invalidateQueries({ queryKey: ["/api/dm-messages"] });
      } catch {
        // ignore
      }
    })();
  }, [dmId, token, user, qc]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: topInset + 10 }]}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </Pressable>

          {headerName ? (
            <View style={styles.headerCenter}>
              {headerPeerUserId > 0 ? (
                <Pressable
                  style={styles.avatarWrap}
                  onPress={() => navigateToUserOrLiverProfile({ userId: headerPeerUserId })}
                  hitSlop={4}
                >
                  <Image source={headerAvatar ? { uri: headerAvatar } : undefined} style={styles.headerAvatar} contentFit="cover" />
                  {(dmInfo?.online ?? false) && <View style={styles.onlineDot} />}
                </Pressable>
              ) : (
                <View style={styles.avatarWrap}>
                  <Image source={headerAvatar ? { uri: headerAvatar } : undefined} style={styles.headerAvatar} contentFit="cover" />
                  {(dmInfo?.online ?? false) && <View style={styles.onlineDot} />}
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.headerName}>{headerName}</Text>
                <Text style={styles.headerStatus}>
                  {dmInfo?.online ? "Online" : "Recently offline"}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.headerCenter} />
          )}

          <Pressable style={styles.menuBtn}>
            <Ionicons name="ellipsis-horizontal" size={20} color={C.textSec} />
          </Pressable>
        </View>

        {/* Ops notice: not persisted; single canned block for every DM thread */}
        <View style={styles.usageBanner} accessibilityLabel={`${DM_USAGE_GUIDE_TITLE}。${DM_USAGE_GUIDE_BODY}`}>
          <View style={styles.usageBannerIconWrap}>
            <Ionicons name="book-outline" size={16} color={C.accent} />
          </View>
          <View style={styles.usageBannerTextCol}>
            <Text style={styles.usageBannerTitle}>{DM_USAGE_GUIDE_TITLE}</Text>
            <Text style={styles.usageBannerBody}>{DM_USAGE_GUIDE_BODY}</Text>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={scrollShowsVertical}
          renderItem={({ item, index }) => {
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const showAvatar = item.sender === "them" && (prevMsg?.sender !== "them");
            const showMyAvatar = item.sender === "me" && (prevMsg?.sender !== "me");
            return (
              <View style={[
                styles.msgRow,
                item.sender === "me" ? styles.msgRowMe : styles.msgRowThem,
              ]}>
                {item.sender === "them" && (
                  <View style={styles.avatarSpacer}>
                    {showAvatar && headerAvatar ? (
                      headerPeerUserId > 0 ? (
                        <Pressable onPress={() => navigateToUserOrLiverProfile({ userId: headerPeerUserId })} hitSlop={4}>
                          <Image source={{ uri: headerAvatar }} style={styles.msgAvatar} contentFit="cover" />
                        </Pressable>
                      ) : (
                        <Image source={{ uri: headerAvatar }} style={styles.msgAvatar} contentFit="cover" />
                      )
                    ) : null}
                  </View>
                )}
                <View style={styles.msgGroup}>
                  <View style={[
                    styles.bubble,
                    item.sender === "me" ? styles.bubbleMe : styles.bubbleThem,
                  ]}>
                    {item.imageUrl ? (
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={styles.bubbleImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                    ) : null}
                    {item.text ? (
                      <Text style={[styles.bubbleText, item.sender === "me" && styles.bubbleTextMe, item.imageUrl && { marginTop: 8 }]}>
                        {item.text}
                      </Text>
                    ) : null}
                  </View>
                  {item.sender === "them" && item.text ? (
                    <TranslateButton text={item.text} compact />
                  ) : null}
                  <Text style={[styles.timeText, item.sender === "me" && styles.timeTextMe]}>
                    {formatTime(item.createdAt)}
                  </Text>
                </View>
                {item.sender === "me" && (
                  <View style={[styles.avatarSpacer, styles.avatarSpacerMe]}>
                    {showMyAvatar && myAvatar ? (
                      <Image source={{ uri: myAvatar }} style={styles.msgAvatar} contentFit="cover" />
                    ) : null}
                  </View>
                )}
              </View>
            );
          }}
        />

        {/* Input */}
        <View style={[styles.inputRow, { paddingBottom: bottomInset + 8 }]}>
          <Pressable style={styles.attachBtn} onPress={pickImage} disabled={uploadingImage}>
            <Ionicons name="image-outline" size={24} color={uploadingImage ? C.accent : C.textSec} />
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="Message..."
            placeholderTextColor={C.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            multiline
          />
          {attachmentUrl ? (
            <Pressable style={styles.attachmentChip} onPress={() => setAttachmentUrl(null)}>
              <Ionicons name="attach" size={12} color={C.accent} />
              <Text style={styles.attachmentChipText}>Attached</Text>
              <Ionicons name="close" size={12} color={C.textMuted} />
            </Pressable>
          ) : null}
          <Pressable
            style={[styles.sendBtn, !input.trim() && !attachmentUrl && styles.sendBtnOff]}
            onPress={sendMessage}
          >
            <Ionicons name="send" size={15} color="#fff" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarWrap: { position: "relative" },
  headerAvatar: { width: 38, height: 38, borderRadius: 19 },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.green,
    borderWidth: 2,
    borderColor: C.bg,
  },
  headerName: { color: C.text, fontSize: 15, fontWeight: "700" },
  headerStatus: { color: C.green, fontSize: 11, marginTop: 1 },
  menuBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },

  usageBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  usageBannerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.accent + "18",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  usageBannerTextCol: { flex: 1, minWidth: 0 },
  usageBannerTitle: {
    color: C.accent,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  usageBannerBody: {
    color: C.textSec,
    fontSize: 11,
    lineHeight: 16,
  },

  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },

  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, marginBottom: 2 },
  msgRowMe: { justifyContent: "flex-end" },
  msgRowThem: { justifyContent: "flex-start" },
  avatarSpacer: { width: 30, flexShrink: 0 },
  avatarSpacerMe: { alignItems: "flex-end" },
  msgAvatar: { width: 28, height: 28, borderRadius: 14 },
  msgGroup: { maxWidth: "72%", gap: 2 },

  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bubbleMe: {
    backgroundColor: C.accent,
    borderBottomRightRadius: 4,
    alignSelf: "flex-end",
  },
  bubbleThem: {
    backgroundColor: C.surface2,
    borderBottomLeftRadius: 4,
    alignSelf: "flex-start",
  },
  bubbleText: { color: C.text, fontSize: 14, lineHeight: 20 },
  bubbleTextMe: { color: "#fff" },
  timeText: { color: C.textMuted, fontSize: 10, paddingLeft: 4 },
  timeTextMe: { textAlign: "right", paddingLeft: 0, paddingRight: 4 },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.bg,
  },
  attachBtn: { paddingBottom: 7 },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 100,
    backgroundColor: C.surface,
    borderRadius: 19,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: C.text,
    fontSize: 14,
    lineHeight: 20,
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
  bubbleImage: { width: 200, height: 150, borderRadius: 10 },
  attachmentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingHorizontal: 8,
    height: 28,
    marginBottom: 4,
  },
  attachmentChipText: {
    color: C.textSec,
    fontSize: 11,
    fontWeight: "600",
  },
});
