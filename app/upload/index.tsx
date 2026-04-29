import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  ActionSheetIOS,
} from "react-native";
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, ApiError, formatUserFacingApiError, uploadUserMediaBlobToR2 } from "@/lib/query-client";
import { C } from "@/constants/colors";
import { useAuth } from "@/lib/auth";
import { DAILY_POST_LIMITS } from "@/constants/upload-limits";
import { HorizontalScroll } from "@/components/HorizontalScroll";
import { webScrollStyle } from "@/constants/layout";

type MediaItem = { id: string; uri: string; type: "image" | "video"; size?: number; durationSec?: number };
type Community = { id: number; name: string; thumbnail: string };

const UPLOAD_LOG = "[upload]";
const IMAGE_COMPRESS_MAX_WIDTH = 1920;
const IMAGE_COMPRESS_QUALITY = 0.75;

function toUploadErrorMessage(err: unknown, maxMb: number): string {
  if (err instanceof ApiError && err.status === 413) {
    return `File is too large. Please use a file under ${maxMb}MB.`;
  }
  if (err instanceof Error && /under\s+\d+mb/i.test(err.message)) {
    return err.message;
  }
  return err instanceof Error ? err.message : "Upload に失敗しました。より小さいファイルでお試しください。";
}

async function compressImageForUpload(uri: string): Promise<string> {
  if (Platform.OS === "web") return uri;
  const result = await manipulateAsync(
    uri,
    [{ resize: { width: IMAGE_COMPRESS_MAX_WIDTH } }],
    { compress: IMAGE_COMPRESS_QUALITY, format: SaveFormat.JPEG }
  );
  return result.uri;
}

export default function DailyUploadScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const queryClient = useQueryClient();
  const { user, requireAuth } = useAuth();

  const { data: communities = [] } = useQuery<Community[]>({ queryKey: ["/api/communities"] });
  const { concertId: rawConcertId } = useLocalSearchParams<{ concertId?: string }>();
  const concertId = rawConcertId ? parseInt(rawConcertId as string, 10) || null : null;

  const [text, setText] = useState("");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<number | null>(null);
  const [postTarget, setPostTarget] = useState<"my_page_only" | "community">("my_page_only");
  const [showPublishFromModal, setShowPublishFromModal] = useState(false);
  const [addMenuVisible, setAddMenuVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [agreeGuidelines, setAgreeGuidelines] = useState(false);
  const [agreeRights, setAgreeRights] = useState(false);

  const { data: myVideos = [] } = useQuery<any[]>({
    queryKey: ["/api/videos/my"],
    enabled: showPublishFromModal && !!user,
  });
  const myPageOnlyVideos = myVideos.filter(
    (v) => ((v as any).postType === "daily" || !(v as any).postType) && ((v as any).visibility === "my_page_only" || (v as any).visibility === "draft")
  );

  const activeCommunityId = selectedCommunityId ?? communities[0]?.id ?? null;
  const selectedCommunity = communities.find((c) => c.id === activeCommunityId);

  const videoCount = mediaItems.filter((m) => m.type === "video").length;
  const canAddMore = mediaItems.length < DAILY_POST_LIMITS.maxMediaCount;
  const canAddVideo = videoCount < DAILY_POST_LIMITS.maxVideoCount;

  function addMedia(id: string, uri: string, type: "image" | "video", size?: number, durationSec?: number) {
    if (mediaItems.length >= DAILY_POST_LIMITS.maxMediaCount) {
      Alert.alert("", `1投稿あたり最大 ${DAILY_POST_LIMITS.maxMediaCount} 件までです`);
      return;
    }
    if (type === "video" && videoCount >= DAILY_POST_LIMITS.maxVideoCount) {
      Alert.alert("", "1投稿に追加できる動画は1本までです");
      return;
    }
    setMediaItems((prev) => [...prev, { id, uri, type, size, durationSec }]);
  }

  function removeMedia(id: string) {
    setMediaItems((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item?.uri.startsWith("blob:")) URL.revokeObjectURL(item.uri);
      return prev.filter((m) => m.id !== id);
    });
  }


  async function uploadFileToR2Native(uri: string, name: string, mime: string) {
    console.log(`${UPLOAD_LOG} step:daily_native_blob_fetch_start`, { name, mime });
    const blob = await (await fetch(uri)).blob();
    console.log(`${UPLOAD_LOG} step:daily_native_blob_fetch_ok`, { size: blob.size });
    if (blob.size > DAILY_POST_LIMITS.maxFileSizeMB * 1024 * 1024) {
      throw new Error(`File must be under ${DAILY_POST_LIMITS.maxFileSizeMB}MB`);
    }
    console.log(`${UPLOAD_LOG} step:daily_native_r2_upload_start`);
    const url = await uploadUserMediaBlobToR2(blob, name, mime);
    console.log(`${UPLOAD_LOG} step:daily_native_r2_upload_ok`);
    return url;
  }

  async function pickPhoto() {
    setAddMenuVisible(false);
    if (!canAddMore) return;
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e: any) => {
        const file = e.target.files?.[0] as File | undefined;
        if (!file) return;
        if (file.size > DAILY_POST_LIMITS.maxFileSizeMB * 1024 * 1024) {
          Alert.alert("", `File must be under ${DAILY_POST_LIMITS.maxFileSizeMB}MB`);
          return;
        }
        addMedia(`img-${Date.now()}`, URL.createObjectURL(file), "image", file.size);
      };
      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "写真を選ぶにはメディアライブラリへのアクセスを許可してください");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      try {
        setUploading(true);
        const compressedUri = await compressImageForUpload(asset.uri);
        const mime = "image/jpeg";
        const name = asset.fileName ?? "image.jpg";
        const url = await uploadFileToR2Native(compressedUri, name, mime);
        addMedia(`img-${Date.now()}`, url, "image");
      } catch (err: unknown) {
        Alert.alert("Error", toUploadErrorMessage(err, DAILY_POST_LIMITS.maxFileSizeMB));
      } finally {
        setUploading(false);
      }
    }
  }

  async function pickVideo() {
    setAddMenuVisible(false);
    if (!canAddMore || !canAddVideo) return;
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "video/*";
      input.onchange = (e: any) => {
        const file = e.target.files?.[0] as File | undefined;
        if (!file) return;
        if (file.size > DAILY_POST_LIMITS.maxFileSizeMB * 1024 * 1024) {
          Alert.alert("", `File must be under ${DAILY_POST_LIMITS.maxFileSizeMB}MB`);
          return;
        }
        addMedia(`vid-${Date.now()}`, URL.createObjectURL(file), "video", file.size);
      };
      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "動画を選ぶにはメディアライブラリへのアクセスを許可してください");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: false,
      videoMaxDuration: DAILY_POST_LIMITS.maxVideoDurationSec,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if ((asset.fileSize ?? 0) > DAILY_POST_LIMITS.maxFileSizeMB * 1024 * 1024) {
        Alert.alert("", `File must be under ${DAILY_POST_LIMITS.maxFileSizeMB}MB`);
        return;
      }
      const durationSec = asset.duration ? Math.ceil(asset.duration / 1000) : undefined;
      if (durationSec && durationSec > DAILY_POST_LIMITS.maxVideoDurationSec) {
        Alert.alert("", `Video must be under ${DAILY_POST_LIMITS.maxVideoDurationSec} seconds`);
        return;
      }
      try {
        setUploading(true);
        const mime = asset.mimeType ?? "video/mp4";
        const name = asset.fileName ?? "video.mp4";
        const url = await uploadFileToR2Native(asset.uri, name, mime);
        addMedia(`vid-${Date.now()}`, url, "video", undefined, durationSec);
      } catch (err: unknown) {
        Alert.alert("Error", toUploadErrorMessage(err, DAILY_POST_LIMITS.maxFileSizeMB));
      } finally {
        setUploading(false);
      }
    }
  }

  function openAddMenu() {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Add Photo", canAddVideo ? "Add Video" : "Add Video (1 max)"],
          cancelButtonIndex: 0,
        },
        (i) => {
          if (i === 1) pickPhoto();
          if (i === 2 && canAddVideo) pickVideo();
        }
      );
    } else {
      setAddMenuVisible(true);
    }
  }

  async function ensureHttpsUrl(uri: string, type: "image" | "video"): Promise<string> {
    if (!uri.startsWith("blob:")) {
      console.log(`${UPLOAD_LOG} step:daily_submit_blob_skip`, { type, alreadyHttps: true });
      return uri;
    }
    console.log(`${UPLOAD_LOG} step:daily_submit_blob_presign`, { type });
    const res = await fetch(uri);
    if (!res.ok) {
      console.error(`${UPLOAD_LOG} step:daily_submit_blob_read_failed`, res.status);
      throw new Error("Failed to load file");
    }
    const blob = await res.blob();
    if (blob.size > DAILY_POST_LIMITS.maxFileSizeMB * 1024 * 1024) {
      throw new Error(`File must be under ${DAILY_POST_LIMITS.maxFileSizeMB}MB`);
    }
    const contentType = res.headers.get("content-type") || (type === "image" ? "image/jpeg" : "video/mp4");
    const ext = type === "image" ? "jpg" : "mp4";
    console.log(`${UPLOAD_LOG} step:daily_submit_r2_upload_start`, { type });
    try {
      const url = await uploadUserMediaBlobToR2(blob, `upload.${ext}`, contentType);
      console.log(`${UPLOAD_LOG} step:daily_submit_r2_upload_ok`, { type });
      return url;
    } catch (e: unknown) {
      if (e instanceof ApiError) throw e;
      throw e instanceof Error ? e : new Error(String(e));
    }
  }

  async function handlePublishFromExisting(videoId: number) {
    if (!requireAuth("publish") || !selectedCommunity) return;
    setUploading(true);
    try {
      await apiRequest("PATCH", `/api/videos/${videoId}`, {
        visibility: "community",
        communityId: selectedCommunity.id,
        community: selectedCommunity.name,
      });
      setShowPublishFromModal(false);
      router.replace("/profile");
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos/my"] });
    } catch (err: any) {
      Alert.alert("Error", formatUserFacingApiError(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    const title = text.trim().slice(0, DAILY_POST_LIMITS.maxTextLength);
    if (!title.length) {
      Alert.alert("", "テキストを入力してください");
      return;
    }
    if (postTarget === "community" && !selectedCommunity) {
      Alert.alert("", "Community を選択してください");
      return;
    }
    if (!requireAuth("post")) return;
    if (!agreeGuidelines || !agreeRights) {
      Alert.alert("Confirmation required", "投稿前に Guidelines と rights のチェックを確認してください。");
      return;
    }
    setUploading(true);
    try {
      console.log(`${UPLOAD_LOG} step:daily_submit_start`, { hasMedia: mediaItems.length > 0 });
      const communityName = selectedCommunity?.name ?? "";
      const creatorName = user?.name ?? user?.displayName ?? "Creator";
      const firstImage = mediaItems.find((m) => m.type === "image");
      const firstVideo = mediaItems.find((m) => m.type === "video");
      let thumbUrl =
        firstImage?.uri ??
        selectedCommunity?.thumbnail ??
        "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop";
      if (thumbUrl.startsWith("blob:") && firstImage) {
        try {
          thumbUrl = await ensureHttpsUrl(firstImage.uri, "image");
        } catch (e: any) {
          console.error(`${UPLOAD_LOG} step:daily_submit_thumbnail_upload_failed`, e);
          Alert.alert(
            "Upload failed",
            e?.message ?? "画像を Upload できませんでした。通信状況を確認して再試行してください。",
          );
          return;
        }
      }
      let videoUrlToSend: string | null = null;
      if (firstVideo?.uri) {
        try {
          console.log(`${UPLOAD_LOG} step:daily_submit_video_prepare`);
          videoUrlToSend = firstVideo.uri.startsWith("blob:")
            ? await ensureHttpsUrl(firstVideo.uri, "video")
            : firstVideo.uri;
          console.log(`${UPLOAD_LOG} step:daily_submit_video_ok`);
        } catch (e: any) {
          console.error(`${UPLOAD_LOG} step:daily_submit_video_failed`, e);
          Alert.alert(
            "Upload failed",
            e?.message ?? "動画を Upload できませんでした。通信状況を確認して再試行してください。",
          );
          return;
        }
      }
      console.log(`${UPLOAD_LOG} step:daily_submit_api_videos`);
      const avatarUrl =
        user?.avatar ??
        user?.profileImageUrl ??
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop";

      await apiRequest("POST", "/api/videos", {
        title,
        description: title,
        creator: creatorName,
        community: communityName,
        communityId: postTarget === "community" ? selectedCommunity?.id : null,
        duration: "00:00",
        price: null,
        thumbnail: thumbUrl,
        avatar: avatarUrl,
        concertId,
        visibility: postTarget === "my_page_only" ? "my_page_only" : "community",
        videoUrl: videoUrlToSend,
        postType: "daily",
        complianceAcknowledged: true,
      });
      router.replace("/profile");
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos/my"] });
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 401) {
        Alert.alert("Sign in required", "投稿するには Sign in が必要です。");
        return;
      }
      Alert.alert("Error", formatUserFacingApiError(err));
    } finally {
      setUploading(false);
    }
  }

  const canSubmit = text.trim().length > 0 && !uploading && agreeGuidelines && agreeRights;

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Daily Post</Text>
        <Pressable style={styles.workLink} onPress={() => router.push("/upload/work")}>
          <Text style={styles.workLinkText}>Post Work</Text>
        </Pressable>
      </View>

      <View style={styles.limitHint}>
        <Text style={styles.limitHintText}>
          最大 {DAILY_POST_LIMITS.maxMediaCount} 件、動画は1本まで（{DAILY_POST_LIMITS.maxVideoDurationSec}秒以内 / {DAILY_POST_LIMITS.maxFileSizeMB}MB以内）
        </Text>
      </View>

      <ScrollView
        style={webScrollStyle(styles.scroll)}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={scrollShowsVertical}
      >
        {mediaItems.length > 0 && (
          <View style={styles.previewRow}>
            <HorizontalScroll contentContainerStyle={styles.previewScroll} showArrows={false}>
              {mediaItems.map((item) => (
                <View key={item.id} style={styles.previewItem}>
                  {item.type === "image" ? (
                    <Image source={{ uri: item.uri }} style={styles.previewThumb} contentFit="cover" />
                  ) : (
                    <View style={[styles.previewThumb, styles.previewVideo]}>
                      <Ionicons name="videocam" size={28} color={C.textMuted} />
                    </View>
                  )}
                  <Pressable style={styles.removeBtn} onPress={() => removeMedia(item.id)} hitSlop={8}>
                    <Ionicons name="close" size={16} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </HorizontalScroll>
          </View>
        )}

        <View style={styles.inputWrap}>
          <TextInput
            style={styles.mainInput}
            placeholder="いま何をシェアしますか？"
            placeholderTextColor={C.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={DAILY_POST_LIMITS.maxTextLength}
          />
          <Text style={styles.charCount}>{text.length}/{DAILY_POST_LIMITS.maxTextLength}</Text>
        </View>

        <View style={styles.optionsSection}>
          <Text style={styles.optionsLabel}>Post To</Text>
          <View style={styles.postTargetRow}>
            <Pressable
              style={[styles.postTargetBtn, postTarget === "my_page_only" && styles.postTargetBtnActive]}
              onPress={() => setPostTarget("my_page_only")}
            >
              <Text style={[styles.postTargetText, postTarget === "my_page_only" && styles.postTargetTextActive]}>My Page Only</Text>
            </Pressable>
            <Pressable
              style={[styles.postTargetBtn, postTarget === "community" && styles.postTargetBtnActive]}
              onPress={() => setPostTarget("community")}
            >
              <Text style={[styles.postTargetText, postTarget === "community" && styles.postTargetTextActive]}>Community</Text>
            </Pressable>
          </View>

          {postTarget === "community" && (
            <>
              <Text style={styles.optionsLabel}>Community</Text>
              <HorizontalScroll contentContainerStyle={styles.communityRow} showArrows={false}>
                {communities.map((c) => (
                  <Pressable
                    key={c.id}
                    style={[styles.communityPill, activeCommunityId === c.id && styles.communityPillActive]}
                    onPress={() => setSelectedCommunityId(c.id)}
                  >
                    <Text style={[styles.communityPillText, activeCommunityId === c.id && styles.communityPillTextActive]} numberOfLines={1}>
                      {c.name}
                    </Text>
                  </Pressable>
                ))}
              </HorizontalScroll>
              {myPageOnlyVideos.length > 0 && (
                <Pressable style={styles.publishFromBtn} onPress={() => setShowPublishFromModal(true)}>
                  <Ionicons name="document-outline" size={16} color={C.accent} />
                  <Text style={styles.publishFromText}>My posts から公開</Text>
                </Pressable>
              )}
            </>
          )}

          {concertId && (
            <View style={[styles.communityChip, { marginTop: 8 }]}>
              <Ionicons name="musical-notes-outline" size={14} color={C.textMuted} />
              <Text style={styles.communityChipText}>Linked Concert: {concertId}</Text>
            </View>
          )}

          <View style={styles.complianceBlock}>
            <Pressable style={styles.complianceRow} onPress={() => setAgreeGuidelines((v) => !v)}>
              <View style={[styles.complianceCheckOuter, agreeGuidelines && styles.complianceCheckOuterOn]}>
                {agreeGuidelines ? <Ionicons name="checkmark" size={14} color="#050505" /> : null}
              </View>
              <Text style={styles.complianceText}>
                I have read and agree to follow the{" "}
                <Text style={styles.complianceLink} onPress={() => router.push("/community-guidelines")}>
                  Community Guidelines
                </Text>
                .
              </Text>
            </Pressable>
            <Pressable style={styles.complianceRow} onPress={() => setAgreeRights((v) => !v)}>
              <View style={[styles.complianceCheckOuter, agreeRights && styles.complianceCheckOuterOn]}>
                {agreeRights ? <Ionicons name="checkmark" size={14} color="#050505" /> : null}
              </View>
              <Text style={styles.complianceText}>
                I confirm I have the rights to post this content and it does not infringe others&apos; intellectual
                property or privacy.
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: bottomInset + 12 }]}>
        <Pressable style={styles.addBtn} onPress={openAddMenu} disabled={!canAddMore}>
          <Ionicons name="add" size={26} color={C.accent} />
        </Pressable>
        <Pressable
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Post</Text>
          )}
        </Pressable>
      </View>

      <Modal visible={showPublishFromModal} transparent animationType="slide">
        <Pressable style={styles.menuOverlay} onPress={() => !uploading && setShowPublishFromModal(false)}>
          <Pressable style={styles.publishFromModal} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.publishFromModalTitle}>公開する投稿を選択</Text>
            <ScrollView style={webScrollStyle(styles.publishFromList)} showsVerticalScrollIndicator={scrollShowsVertical}>
              {myPageOnlyVideos.map((v) => (
                <Pressable
                  key={v.id}
                  style={styles.publishFromItem}
                  onPress={() => handlePublishFromExisting(v.id)}
                  disabled={uploading}
                >
                  <Image source={{ uri: v.thumbnail }} style={styles.publishFromThumb} contentFit="cover" />
                  <Text style={styles.publishFromItemTitle} numberOfLines={2}>{v.title}</Text>
                  <Ionicons name="arrow-forward" size={16} color={C.accent} />
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.publishFromCancel} onPress={() => setShowPublishFromModal(false)} disabled={uploading}>
              <Text style={styles.publishFromCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={addMenuVisible} transparent animationType="fade">
        <Pressable style={styles.menuOverlay} onPress={() => setAddMenuVisible(false)}>
          <View style={styles.menuCard}>
            <Pressable style={styles.menuItem} onPress={pickPhoto} disabled={!canAddMore}>
              <Ionicons name="image-outline" size={22} color={C.text} />
              <Text style={styles.menuItemText}>Add Photo</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={pickVideo} disabled={!canAddMore || !canAddVideo}>
              <Ionicons name="videocam-outline" size={22} color={C.text} />
              <Text style={styles.menuItemText}>Add Video (1 max)</Text>
            </Pressable>
            <Pressable style={[styles.menuItem, styles.menuItemCancel]} onPress={() => setAddMenuVisible(false)}>
              <Text style={styles.menuItemCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
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
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: C.text, fontSize: 17, fontWeight: "700" },
  workLink: { padding: 8 },
  workLinkText: { color: C.accent, fontSize: 13, fontWeight: "700" },
  limitHint: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: C.surface2 },
  limitHintText: { color: C.textMuted, fontSize: 11 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  previewRow: { marginBottom: 12 },
  previewScroll: { flexDirection: "row", gap: 10 },
  previewItem: { position: "relative" },
  previewThumb: { width: 80, aspectRatio: 16 / 9, borderRadius: 3, backgroundColor: C.surface },
  previewVideo: { alignItems: "center", justifyContent: "center" },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrap: {
    minHeight: 120,
    backgroundColor: C.surface,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  mainInput: {
    color: C.text,
    fontSize: 16,
    minHeight: 90,
    textAlignVertical: "top",
    padding: 0,
  },
  charCount: { color: C.textMuted, fontSize: 11, marginTop: 4, textAlign: "right" },
  optionsSection: { marginTop: 20, gap: 10 },
  optionsLabel: { color: C.textMuted, fontSize: 12, fontWeight: "600" },
  communityRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  communityChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 3,
    backgroundColor: C.surface2,
  },
  communityChipText: { fontSize: 12, color: C.textMuted, marginLeft: 4 },
  communityPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 3,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  communityPillActive: { borderColor: C.accent, backgroundColor: "rgba(41,182,207,0.15)" },
  communityPillText: { color: C.textSec, fontSize: 13, fontWeight: "600" },
  communityPillTextActive: { color: C.accent },
  postTargetRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  postTargetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 3,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  postTargetBtnActive: { borderColor: C.accent, backgroundColor: "rgba(41,182,207,0.15)" },
  postTargetText: { color: C.textSec, fontSize: 13, fontWeight: "600" },
  postTargetTextActive: { color: C.accent },
  complianceBlock: { marginTop: 20, gap: 12 },
  complianceRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  complianceCheckOuter: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: C.accent,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  complianceCheckOuterOn: { backgroundColor: C.accent },
  complianceText: { flex: 1, color: C.textMuted, fontSize: 12, lineHeight: 18 },
  complianceLink: { color: C.accent, textDecorationLine: "underline" },
  publishFromBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, paddingVertical: 8 },
  publishFromText: { color: C.accent, fontSize: 13, fontWeight: "600" },
  publishFromModal: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    padding: 20,
    maxHeight: "70%",
  },
  publishFromModalTitle: { color: C.text, fontSize: 16, fontWeight: "800", marginBottom: 16 },
  publishFromList: { maxHeight: 300 },
  publishFromItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  publishFromThumb: { width: 56, height: 56, borderRadius: 3 },
  publishFromItemTitle: { flex: 1, color: C.text, fontSize: 14 },
  publishFromCancel: { marginTop: 16, paddingVertical: 12, alignItems: "center" },
  publishFromCancelText: { color: C.textMuted, fontSize: 14 },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.bg,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 3,
    backgroundColor: "rgba(41,182,207,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 3,
    backgroundColor: C.accent,
  },
  submitBtnDisabled: { backgroundColor: C.surface3, opacity: 0.8 },
  submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  menuOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  menuCard: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    padding: 16,
    paddingBottom: 32,
  },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 8 },
  menuItemText: { color: C.text, fontSize: 16, fontWeight: "600" },
  menuItemCancel: { marginTop: 8, alignItems: "center" },
  menuItemCancelText: { color: C.textMuted, fontSize: 15 },
});
