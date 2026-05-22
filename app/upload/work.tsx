import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  ActivityIndicator,
  ScrollView,
  Modal,
  ActionSheetIOS,
  Alert,
} from "react-native";
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, ApiError, uploadUserMediaBlobToR2 } from "@/lib/query-client";
import { C } from "@/constants/colors";
import { useAuth } from "@/lib/auth";
import { WORK_POST_LIMITS } from "@/constants/upload-limits";
import { HorizontalScroll } from "@/components/HorizontalScroll";
import { webScrollStyle } from "@/constants/layout";
import { alertError, alertMessage } from "@/lib/alertCompat";
import { beginActionTelemetry } from "@/lib/actionTelemetry";
import { reportUploadFailure } from "@/lib/reportUploadFailure";
import { VideoUploadPrepModal } from "@/components/VideoUploadPrepModal";

const WORK_VIDEO_MAX_SEC = 120;

type FeeType = "free" | "paid";
type PriceOption = 300 | 500 | 1000 | 2000 | 3000 | 5000;
const PRICE_OPTIONS: PriceOption[] = [300, 500, 1000, 2000, 3000, 5000];

type MediaItem = { id: string; uri: string; type: "image" | "video"; size?: number; durationSec?: number };
type Community = { id: number; name: string; thumbnail: string };

const UPLOAD_LOG = "[upload]";
const IMAGE_COMPRESS_MAX_WIDTH = 1920;
const IMAGE_COMPRESS_QUALITY = 0.75;

function toUploadErrorMessage(err: unknown, maxMb: number, isJaUi: boolean): string {
  if (err instanceof ApiError && err.status === 413) {
    return isJaUi
      ? `ファイルサイズが大きすぎます。${maxMb}MB未満のファイルを選択してください。`
      : `File is too large. Please use a file under ${maxMb}MB.`;
  }
  if (err instanceof Error && /under\s+\d+mb/i.test(err.message)) {
    return isJaUi ? `ファイルは${maxMb}MB未満にしてください。` : err.message;
  }
  if (err instanceof Error) return err.message;
  return isJaUi ? "アップロードに失敗しました。より小さいファイルで再試行してください。" : "Upload failed. Try a smaller file and retry.";
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

export default function WorkUploadScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const queryClient = useQueryClient();
  const { user, requireAuth } = useAuth();
  const isJaUi = (user?.preferredLanguage ?? "").toLowerCase().startsWith("ja");
  const t = isJaUi
    ? {
        publishAction: "公開",
        postAction: "投稿",
        missingTextTitle: "本文が未入力です",
        missingTextBody: "投稿文を入力してください。",
        missingPhotoTitle: "写真が未追加です",
        missingPhotoBody: "写真を1枚以上追加してください。",
        selectCommunityTitle: "コミュニティを選択",
        selectCommunityBody: "コミュニティを選択してください。",
        confirmationTitle: "確認が必要です",
        confirmationBody: "投稿前にガイドラインと権利確認に同意してください。",
        uploadFailedTitle: "アップロードに失敗しました",
        uploadImageFailedBody: "画像をアップロードできませんでした。通信状況を確認して、もう一度お試しください。",
        uploadVideoFailedBody: "動画をアップロードできませんでした。通信状況を確認して、もう一度お試しください。",
        signInRequiredTitle: "サインインが必要です",
        signInRequiredBody: "投稿するにはサインインが必要です。",
        invalidContentTitle: "内容を確認してください",
        invalidContentBody: "入力内容を見直してください。",
        postFailedTitle: "投稿に失敗しました",
        postFailedBody: "投稿に失敗しました。",
        errorTitle: "エラー",
        permissionRequired: "権限が必要です",
        allowPhotos: "写真を選択するにはメディアライブラリへのアクセスを許可してください。",
        allowVideos: "動画を選択するにはメディアライブラリへのアクセスを許可してください。",
        fileLimit: `ファイルは${WORK_POST_LIMITS.maxFileSizeMB}MB未満にしてください。`,
        headerTitle: "作品投稿",
        switchToDaily: "日常投稿",
        workHint: "ライブの感想を文章と写真で投稿。続きは動画で見せることもできます（無料・有料）。",
        limitHint: `画像・動画は1ファイルあたり最大${WORK_POST_LIMITS.maxFileSizeMB}MBです。`,
        reviewSectionTitle: "ライブレビュー",
        reviewSectionSub: "文章と写真（無料）",
        reviewPlaceholder: "ライブの感想を書いてください（必須）",
        reviewPhotosLabel: "レビュー写真",
        thumbnailLabel: "サムネイル",
        thumbnailChange: "タップして変更",
        thumbnailOptional: "任意 · 一覧用",
        videoSectionTitle: "続きを動画で",
        videoSectionSub: "任意 · 無料または有料で公開",
        videoReady: "動画を追加済み",
        videoAddLabel: "続きの動画を追加",
        videoAddSub: "ブラウザでトリミング・圧縮できます",
        videoPricingHint: "視聴料金",
        addPhotoRequired: "写真を追加（必須）",
        postTo: "投稿先",
        myPageOnly: "マイページのみ",
        community: "コミュニティ",
        publishFromMyPosts: "マイ投稿から公開",
        videoPricing: "動画価格",
        free: "無料",
        paid: "有料",
        linkedConcert: (concertId: number) => `連携コンサート: ${concertId}`,
        guidelinesPrefix: "コミュニティガイドラインを読み、遵守することに同意します。",
        guidelinesLink: "コミュニティガイドライン",
        rightsConfirm: "このコンテンツを投稿する権利を有しており、他者の知的財産権やプライバシーを侵害しないことを確認します。",
        postButton: "投稿する",
        publishModalTitle: "公開する作品を選択",
        cancel: "キャンセル",
        addPhoto: "写真を追加",
        addVideo: "動画を追加",
      }
    : {
        publishAction: "publish",
        postAction: "post",
        missingTextTitle: "Missing text",
        missingTextBody: "Enter post text.",
        missingPhotoTitle: "Missing photo",
        missingPhotoBody: "Add at least one photo.",
        selectCommunityTitle: "Select community",
        selectCommunityBody: "Select a community.",
        confirmationTitle: "Confirmation required",
        confirmationBody: "Review and accept Guidelines and rights before posting.",
        uploadFailedTitle: "Upload failed",
        uploadImageFailedBody: "Could not upload the image. Check your connection and try again.",
        uploadVideoFailedBody: "Could not upload the video. Check your connection and try again.",
        signInRequiredTitle: "Sign in required",
        signInRequiredBody: "Sign in is required to post.",
        invalidContentTitle: "Invalid content",
        invalidContentBody: "Please review your input.",
        postFailedTitle: "Post failed",
        postFailedBody: "Failed to post.",
        errorTitle: "Error",
        permissionRequired: "Permission required",
        allowPhotos: "Allow media library access to select photos.",
        allowVideos: "Allow media library access to select videos.",
        fileLimit: `File must be under ${WORK_POST_LIMITS.maxFileSizeMB}MB`,
        headerTitle: "Post Work",
        switchToDaily: "Daily Post",
        workHint: "Share a live review with text and photos. Optionally add a video for the rest — free or paid.",
        limitHint: `File size limit: ${WORK_POST_LIMITS.maxFileSizeMB}MB per image/video.`,
        reviewSectionTitle: "Live review",
        reviewSectionSub: "Text and photos — free",
        reviewPlaceholder: "Write your live review (required)",
        reviewPhotosLabel: "Review photos",
        thumbnailLabel: "Thumbnail",
        thumbnailChange: "Tap to change",
        thumbnailOptional: "Optional · for listings",
        videoSectionTitle: "Continue on video",
        videoSectionSub: "Optional · free or paid",
        videoReady: "Video added",
        videoAddLabel: "Add continuation video",
        videoAddSub: "Trim and compress in your browser",
        videoPricingHint: "Viewing price",
        addPhotoRequired: "Add photo (required)",
        postTo: "Post To",
        myPageOnly: "My Page Only",
        community: "Community",
        publishFromMyPosts: "Publish from My posts",
        videoPricing: "Video Pricing",
        free: "Free",
        paid: "Paid",
        linkedConcert: (concertId: number) => `Linked Concert: ${concertId}`,
        guidelinesPrefix: "I have read and agree to follow the",
        guidelinesLink: "Community Guidelines",
        rightsConfirm: "I confirm I have the rights to post this content and it does not infringe others' intellectual property or privacy.",
        postButton: "Post",
        publishModalTitle: "Select a work to publish",
        cancel: "Cancel",
        addPhoto: "Add Photo",
        addVideo: "Add Video",
      };

  const { data: communities = [] } = useQuery<Community[]>({ queryKey: ["/api/communities"] });
  const { concertId: rawConcertId } = useLocalSearchParams<{ concertId?: string }>();
  const concertId = rawConcertId ? parseInt(rawConcertId as string, 10) || null : null;

  const [text, setText] = useState("");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<number | null>(null);
  const [postTarget, setPostTarget] = useState<"my_page_only" | "community">("community");
  const [showPublishFromModal, setShowPublishFromModal] = useState(false);
  const [fee, setFee] = useState<FeeType>("free");
  const [price, setPrice] = useState<PriceOption>(500);
  const [uploading, setUploading] = useState(false);
  const [agreeGuidelines, setAgreeGuidelines] = useState(false);
  const [agreeRights, setAgreeRights] = useState(false);
  const [videoPrepFile, setVideoPrepFile] = useState<File | null>(null);
  const [videoPrepOpen, setVideoPrepOpen] = useState(false);

  const { data: myVideos = [] } = useQuery<any[]>({
    queryKey: ["/api/videos/my"],
    enabled: showPublishFromModal && !!user,
  });
  const myPageOnlyWorks = myVideos.filter(
    (v) => (v as any).postType === "work" && ((v as any).visibility === "my_page_only" || (v as any).visibility === "draft")
  );

  const activeCommunityId = selectedCommunityId ?? communities[0]?.id ?? null;
  const selectedCommunity = communities.find((c) => c.id === activeCommunityId);

  const imageItems = mediaItems.filter((m) => m.type === "image");
  const thumbnailItem = imageItems[0] ?? null;
  const bodyImages = imageItems.slice(1);
  const hasPhoto = mediaItems.some((m) => m.type === "image");
  const videoItem = mediaItems.find((m) => m.type === "video") ?? null;
  const hasVideo = videoItem !== null;

  function addMedia(id: string, uri: string, type: "image" | "video", size?: number, durationSec?: number) {
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
    console.log(`${UPLOAD_LOG} step:work_native_blob_fetch_start`, { name, mime });
    const blob = await (await fetch(uri)).blob();
    console.log(`${UPLOAD_LOG} step:work_native_blob_fetch_ok`, { size: blob.size });
    if (blob.size > WORK_POST_LIMITS.maxFileSizeMB * 1024 * 1024) {
      throw new Error(`File must be under ${WORK_POST_LIMITS.maxFileSizeMB}MB`);
    }
    console.log(`${UPLOAD_LOG} step:work_native_r2_upload_start`);
    const url = await uploadUserMediaBlobToR2(blob, name, mime);
    console.log(`${UPLOAD_LOG} step:work_native_r2_upload_ok`);
    return url;
  }

  async function pickPhoto() {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e: any) => {
        const file = e.target.files?.[0] as File | undefined;
        if (!file) return;
        if (file.size > WORK_POST_LIMITS.maxFileSizeMB * 1024 * 1024) {
          reportUploadFailure({
            title: t.errorTitle,
            message: t.fileLimit,
            stage: "pick_photo_file_size",
            flow: "work",
            mediaType: "image",
            fileSizeBytes: file.size,
          });
          alertMessage(t.errorTitle, t.fileLimit);
          return;
        }
        addMedia(`img-${Date.now()}`, URL.createObjectURL(file), "image");
      };
      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t.permissionRequired, t.allowPhotos);
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
        reportUploadFailure({
          title: t.errorTitle,
          err,
          stage: "pick_photo_native",
          flow: "work",
          mediaType: "image",
        });
        alertError(t.errorTitle, err, toUploadErrorMessage(err, WORK_POST_LIMITS.maxFileSizeMB, isJaUi), {
          skipIngest: true,
        });
      } finally {
        setUploading(false);
      }
    }
  }

  async function pickVideo() {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "video/*";
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0] as File | undefined;
        if (!file) return;
        // No raw size pre-check — VideoUploadPrepModal trims and compresses to fit R2 limit.
        const BROWSER_SAFETY_BYTES = 4 * 1024 * 1024 * 1024; // 4 GB
        if (file.size > BROWSER_SAFETY_BYTES) {
          alertMessage(t.errorTitle, "File is too large to process in the browser (limit: 4 GB).");
          return;
        }
        setVideoPrepFile(file);
        setVideoPrepOpen(true);
      };
      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t.permissionRequired, t.allowVideos);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: false,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      ...(Platform.OS === "ios"
        ? { videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720 }
        : {}),
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if ((asset.fileSize ?? 0) > WORK_POST_LIMITS.maxFileSizeMB * 1024 * 1024) {
        reportUploadFailure({
          title: t.errorTitle,
          message: t.fileLimit,
          stage: "pick_video_asset_size",
          flow: "work",
          mediaType: "video",
          fileSizeBytes: asset.fileSize ?? undefined,
        });
        alertMessage(t.errorTitle, t.fileLimit);
        return;
      }
      try {
        setUploading(true);
        const mime = asset.mimeType ?? "video/mp4";
        const name = asset.fileName ?? "video.mp4";
        const url = await uploadFileToR2Native(asset.uri, name, mime);
        addMedia(`vid-${Date.now()}`, url, "video");
      } catch (err: unknown) {
        reportUploadFailure({
          title: t.errorTitle,
          err,
          stage: "pick_video_native",
          flow: "work",
          mediaType: "video",
        });
        alertError(t.errorTitle, err, toUploadErrorMessage(err, WORK_POST_LIMITS.maxFileSizeMB, isJaUi), {
          skipIngest: true,
        });
      } finally {
        setUploading(false);
      }
    }
  }


  async function ensureHttpsUrl(uri: string, type: "image" | "video"): Promise<string> {
    if (!uri.startsWith("blob:")) {
      console.log(`${UPLOAD_LOG} step:work_submit_blob_skip`, { type });
      return uri;
    }
    console.log(`${UPLOAD_LOG} step:work_submit_blob_presign`, { type });
    const res = await fetch(uri);
    if (!res.ok) {
      console.error(`${UPLOAD_LOG} step:work_submit_blob_read_failed`, res.status);
      throw new Error("Failed to load file");
    }
    const blob = await res.blob();
    if (blob.size > WORK_POST_LIMITS.maxFileSizeMB * 1024 * 1024) {
      throw new Error(`File must be under ${WORK_POST_LIMITS.maxFileSizeMB}MB`);
    }
    const contentType = res.headers.get("content-type") || (type === "image" ? "image/jpeg" : "video/mp4");
    const ext = type === "image" ? "jpg" : "mp4";
    console.log(`${UPLOAD_LOG} step:work_submit_r2_upload_start`, { type });
    try {
      const url = await uploadUserMediaBlobToR2(blob, `upload.${ext}`, contentType);
      console.log(`${UPLOAD_LOG} step:work_submit_r2_upload_ok`, { type });
      return url;
    } catch (e: unknown) {
      if (e instanceof ApiError) throw e;
      throw e instanceof Error ? e : new Error(String(e));
    }
  }

  async function handlePublishFromExisting(videoId: number) {
    if (!requireAuth(t.publishAction) || !selectedCommunity) return;
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
      alertError(t.postFailedTitle, err, t.postFailedBody);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    const title = text.trim();
    if (!title.length) {
      alertMessage(t.missingTextTitle, t.missingTextBody);
      return;
    }
    if (postTarget === "community" && !selectedCommunity) {
      alertMessage(t.selectCommunityTitle, t.selectCommunityBody);
      return;
    }
    if (!requireAuth(t.postAction)) return;
    if (!agreeGuidelines || !agreeRights) {
      alertMessage(t.confirmationTitle, t.confirmationBody);
      return;
    }
    const action = beginActionTelemetry({
      action: "work_post_submit",
      title: "Work post",
      method: "POST",
      requestUrl: "/api/videos",
      timeoutMs: 30_000,
      extra: {
        postTarget,
        mediaCount: mediaItems.length,
        hasVideo,
        communityId: postTarget === "community" ? selectedCommunity?.id ?? null : null,
      },
    });
    setUploading(true);
    try {
      console.log(`${UPLOAD_LOG} step:work_submit_start`, { hasPhoto, hasVideo });
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
          action.fail(e, { stage: "thumbnail_upload" });
          console.error(`${UPLOAD_LOG} step:work_submit_thumbnail_upload_failed`, e);
          alertError(t.uploadFailedTitle, e, t.uploadImageFailedBody, { skipIngest: true });
          return;
        }
      }
      let videoUrlToSend: string | null = null;
      if (firstVideo?.uri) {
        try {
          console.log(`${UPLOAD_LOG} step:work_submit_video_prepare`);
          videoUrlToSend = firstVideo.uri.startsWith("blob:")
            ? await ensureHttpsUrl(firstVideo.uri, "video")
            : firstVideo.uri;
          console.log(`${UPLOAD_LOG} step:work_submit_video_ok`);
        } catch (e: any) {
          action.fail(e, { stage: "video_upload" });
          console.error(`${UPLOAD_LOG} step:work_submit_video_failed`, e);
          alertError(t.uploadFailedTitle, e, t.uploadVideoFailedBody, { skipIngest: true });
          return;
        }
      }
      console.log(`${UPLOAD_LOG} step:work_submit_api_videos`);
      const avatarUrl =
        user?.avatar ??
        user?.profileImageUrl ??
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop";

      const videoPrice = hasVideo ? (fee === "paid" ? price : null) : null;

      await apiRequest("POST", "/api/videos", {
        title,
        description: title,
        creator: creatorName,
        community: communityName,
        communityId: postTarget === "community" ? selectedCommunity?.id : null,
        duration: "00:00",
        price: videoPrice,
        thumbnail: thumbUrl,
        avatar: avatarUrl,
        concertId,
        visibility: postTarget === "my_page_only" ? "my_page_only" : "community",
        videoUrl: videoUrlToSend,
        postType: "work",
        complianceAcknowledged: true,
      });
      router.replace("/profile");
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos/ranked"] });
      action.success({
        stage: "posted",
        hasVideo: Boolean(videoUrlToSend),
        visibility: postTarget === "my_page_only" ? "my_page_only" : "community",
      });
    } catch (err: any) {
      action.fail(err, { stage: "create_post" });
      if (err instanceof ApiError) {
        if (err.status === 401) alertMessage(t.signInRequiredTitle, t.signInRequiredBody);
        else if (err.status === 400) alertError(t.invalidContentTitle, err, t.invalidContentBody, { skipIngest: true });
        else alertError(t.postFailedTitle, err, t.postFailedBody, { skipIngest: true });
      } else {
        alertError(t.postFailedTitle, err, t.postFailedBody, { skipIngest: true });
      }
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
        <Text style={styles.headerTitle}>{t.headerTitle}</Text>
        <Pressable style={styles.dailyLink} onPress={() => router.replace("/upload")}>
          <Text style={styles.dailyLinkText}>{t.switchToDaily}</Text>
        </Pressable>
      </View>

      <View style={styles.workHint}>
        <Text style={styles.workHintText}>{t.workHint}</Text>
      </View>
      <View style={styles.limitHint}>
        <Text style={styles.limitHintText}>{t.limitHint}</Text>
      </View>

      <ScrollView
        style={webScrollStyle(styles.scroll)}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={scrollShowsVertical}
      >
        {/* ── Live review (text + photos) ── */}
        <View style={styles.flowSection}>
          <View style={styles.flowSectionHeader}>
            <View style={styles.flowSectionBadge}>
              <Ionicons name="document-text-outline" size={16} color={C.accent} />
            </View>
            <View style={styles.flowSectionTitles}>
              <Text style={styles.flowSectionTitle}>{t.reviewSectionTitle}</Text>
              <Text style={styles.flowSectionSub}>{t.reviewSectionSub}</Text>
            </View>
          </View>

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.mainInput}
              placeholder={t.reviewPlaceholder}
              placeholderTextColor={C.textMuted}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={2000}
            />
          </View>

          <View style={styles.coverRow}>
            <Pressable style={styles.coverThumb} onPress={!uploading ? pickPhoto : undefined}>
              {thumbnailItem ? (
                <Image source={{ uri: thumbnailItem.uri }} style={styles.coverThumbImg} contentFit="cover" />
              ) : (
                <Ionicons name="image-outline" size={22} color={C.textMuted} />
              )}
            </Pressable>
            <View style={styles.coverMeta}>
              <Text style={styles.coverLabel}>{t.thumbnailLabel}</Text>
              <Text style={styles.coverSub}>
                {thumbnailItem ? t.thumbnailChange : t.thumbnailOptional}
              </Text>
            </View>
            {thumbnailItem && (
              <Pressable onPress={() => removeMedia(thumbnailItem.id)} hitSlop={10}>
                <Ionicons name="close-circle" size={20} color={C.textMuted} />
              </Pressable>
            )}
          </View>

          <Text style={styles.inlineLabel}>{t.reviewPhotosLabel}</Text>
          <View style={styles.bodyImagesRow}>
            {bodyImages.map((img) => (
              <View key={img.id} style={styles.bodyImgWrap}>
                <Image source={{ uri: img.uri }} style={styles.bodyImg} contentFit="cover" />
                <Pressable style={styles.bodyImgRemove} onPress={() => removeMedia(img.id)} hitSlop={6}>
                  <Ionicons name="close" size={12} color="#fff" />
                </Pressable>
              </View>
            ))}
            {!uploading && (
              <Pressable style={styles.bodyImgAdd} onPress={pickPhoto}>
                <Ionicons name="add" size={22} color={C.textMuted} />
              </Pressable>
            )}
          </View>
        </View>

        {/* ── Continue on video (optional, free/paid) ── */}
        <View style={[styles.flowSection, styles.flowSectionVideo]}>
          <View style={styles.flowSectionHeader}>
            <View style={[styles.flowSectionBadge, styles.flowSectionBadgeVideo]}>
              <Ionicons name="play-circle-outline" size={18} color={C.accent} />
            </View>
            <View style={styles.flowSectionTitles}>
              <Text style={styles.flowSectionTitle}>{t.videoSectionTitle}</Text>
              <Text style={styles.flowSectionSub}>{t.videoSectionSub}</Text>
            </View>
          </View>

          {videoItem ? (
            <View style={styles.videoAdded}>
              <Ionicons name="videocam" size={22} color={C.accent} />
              <Text style={styles.videoAddedText}>{t.videoReady}</Text>
              <Pressable onPress={() => removeMedia(videoItem.id)} hitSlop={8}>
                <Ionicons name="close-circle" size={22} color={C.textMuted} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[styles.videoAddArea, uploading && styles.videoAddAreaDisabled]}
              onPress={!uploading ? pickVideo : undefined}
            >
              <Ionicons name="videocam-outline" size={28} color={C.accent} />
              <Text style={styles.videoAddLabel}>{t.videoAddLabel}</Text>
              <Text style={styles.videoAddSub}>{t.videoAddSub}</Text>
            </Pressable>
          )}

          {hasVideo && (
            <View style={styles.videoPricingBlock}>
              <Text style={styles.inlineLabel}>{t.videoPricingHint}</Text>
              <View style={styles.feeRow}>
                <Pressable style={[styles.feeBtn, fee === "free" && styles.feeBtnActive]} onPress={() => setFee("free")}>
                  <Text style={[styles.feeBtnText, fee === "free" && styles.feeBtnTextActive]}>{t.free}</Text>
                </Pressable>
                <Pressable style={[styles.feeBtn, fee === "paid" && styles.feeBtnActive]} onPress={() => setFee("paid")}>
                  <Text style={[styles.feeBtnText, fee === "paid" && styles.feeBtnTextActive]}>{t.paid}</Text>
                </Pressable>
              </View>
              {fee === "paid" && (
                <View style={styles.priceRow}>
                  {PRICE_OPTIONS.map((p) => (
                    <Pressable
                      key={p}
                      style={[styles.priceBtn, price === p && styles.priceBtnActive]}
                      onPress={() => setPrice(p)}
                    >
                      <Text style={[styles.priceBtnText, price === p && styles.priceBtnTextActive]}>🎟{p}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.optionsSection}>
          <Text style={styles.optionsLabel}>{t.postTo}</Text>
          <View style={styles.postTargetRow}>
            <Pressable
              style={[styles.postTargetBtn, postTarget === "my_page_only" && styles.postTargetBtnActive]}
              onPress={() => setPostTarget("my_page_only")}
            >
              <Text style={[styles.postTargetText, postTarget === "my_page_only" && styles.postTargetTextActive]}>{t.myPageOnly}</Text>
            </Pressable>
            <Pressable
              style={[styles.postTargetBtn, postTarget === "community" && styles.postTargetBtnActive]}
              onPress={() => setPostTarget("community")}
            >
              <Text style={[styles.postTargetText, postTarget === "community" && styles.postTargetTextActive]}>{t.community}</Text>
            </Pressable>
          </View>

          {postTarget === "community" && (
            <>
              <Text style={styles.optionsLabel}>{t.community}</Text>
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
              {myPageOnlyWorks.length > 0 && (
                <Pressable style={styles.publishFromBtn} onPress={() => setShowPublishFromModal(true)}>
                  <Ionicons name="document-outline" size={16} color={C.accent} />
                  <Text style={styles.publishFromText}>{t.publishFromMyPosts}</Text>
                </Pressable>
              )}
            </>
          )}

          {concertId && (
            <View style={[styles.communityChip, { marginTop: 8 }]}>
              <Ionicons name="musical-notes-outline" size={14} color={C.textMuted} />
              <Text style={styles.communityChipText}>{t.linkedConcert(concertId)}</Text>
            </View>
          )}

          <View style={styles.complianceBlock}>
            <Pressable style={styles.complianceRow} onPress={() => setAgreeGuidelines((v) => !v)}>
              <View style={[styles.complianceCheckOuter, agreeGuidelines && styles.complianceCheckOuterOn]}>
                {agreeGuidelines ? <Ionicons name="checkmark" size={14} color="#050505" /> : null}
              </View>
              <Text style={styles.complianceText}>
                {t.guidelinesPrefix}{" "}
                <Text style={styles.complianceLink} onPress={() => router.push("/community-guidelines")}>
                  {t.guidelinesLink}
                </Text>
              </Text>
            </Pressable>
            <Pressable style={styles.complianceRow} onPress={() => setAgreeRights((v) => !v)}>
              <View style={[styles.complianceCheckOuter, agreeRights && styles.complianceCheckOuterOn]}>
                {agreeRights ? <Ionicons name="checkmark" size={14} color="#050505" /> : null}
              </View>
              <Text style={styles.complianceText}>{t.rightsConfirm}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: bottomInset + 12 }]}>
        <Pressable
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>{t.postButton}</Text>
          )}
        </Pressable>
      </View>

      {showPublishFromModal ? (
      <Modal visible transparent animationType="slide">
        <Pressable style={styles.menuOverlay} onPress={() => !uploading && setShowPublishFromModal(false)}>
          <Pressable style={styles.publishFromModal} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.publishFromModalTitle}>{t.publishModalTitle}</Text>
            <ScrollView style={webScrollStyle(styles.publishFromList)} showsVerticalScrollIndicator={scrollShowsVertical}>
              {myPageOnlyWorks.map((v) => (
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
              <Text style={styles.publishFromCancelText}>{t.cancel}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      ) : null}

      <VideoUploadPrepModal
        visible={videoPrepOpen}
        file={videoPrepFile}
        maxClipSec={WORK_VIDEO_MAX_SEC}
        onClose={() => {
          setVideoPrepOpen(false);
          setVideoPrepFile(null);
        }}
        onPrepared={async ({ previewUrl, blob, durationSec, fileName }) => {
          setVideoPrepOpen(false);
          setVideoPrepFile(null);
          setUploading(true);
          try {
            const url = await uploadUserMediaBlobToR2(blob, fileName, blob.type || "video/mp4");
            addMedia(`vid-${Date.now()}`, url, "video", blob.size, durationSec);
          } catch (err: unknown) {
            reportUploadFailure({
              title: t.errorTitle,
              err,
              stage: "pick_video_web_prep",
              flow: "work",
              mediaType: "video",
              fileSizeBytes: blob.size,
            });
            alertError(t.errorTitle, err, toUploadErrorMessage(err, WORK_POST_LIMITS.maxFileSizeMB, isJaUi), {
              skipIngest: true,
            });
            if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
          } finally {
            setUploading(false);
          }
        }}
      />

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
  dailyLink: { padding: 8 },
  dailyLinkText: { color: C.textMuted, fontSize: 13, fontWeight: "600" },
  workHint: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: C.surface2 },
  workHintText: { color: C.textMuted, fontSize: 12 },
  limitHint: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: C.surface2, borderTopWidth: 1, borderTopColor: C.border },
  limitHintText: { color: C.textMuted, fontSize: 11 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, gap: 16 },
  flowSection: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    gap: 12,
  },
  flowSectionVideo: {
    borderColor: "rgba(41,182,207,0.35)",
    backgroundColor: "rgba(41,182,207,0.06)",
  },
  flowSectionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  flowSectionBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(41,182,207,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  flowSectionBadgeVideo: { backgroundColor: "rgba(41,182,207,0.22)" },
  flowSectionTitles: { flex: 1 },
  flowSectionTitle: { color: C.text, fontSize: 15, fontWeight: "800" },
  flowSectionSub: { color: C.textMuted, fontSize: 11, marginTop: 2 },
  inlineLabel: { color: C.textMuted, fontSize: 11, fontWeight: "600", marginBottom: 4 },
  videoPricingBlock: { marginTop: 4, gap: 8 },
  /* cover row */
  coverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  coverThumb: {
    width: 96,
    height: 54,
    borderRadius: 4,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  coverThumbImg: { width: 96, height: 54 },
  coverMeta: { flex: 1 },
  coverLabel: { color: C.text, fontSize: 13, fontWeight: "600" },
  coverSub: { color: C.textMuted, fontSize: 11, marginTop: 2 },
  bodyImagesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  bodyImgWrap: { position: "relative", width: 72, height: 72, borderRadius: 4, overflow: "hidden", backgroundColor: C.surface },
  bodyImg: { width: 72, height: 72 },
  bodyImgRemove: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  bodyImgAdd: {
    width: 72,
    height: 72,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surface,
  },
  videoAddArea: {
    padding: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.accent,
    borderStyle: "dashed",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.surface,
  },
  videoAddAreaDisabled: { opacity: 0.5 },
  videoAddLabel: { color: C.accent, fontSize: 15, fontWeight: "700" },
  videoAddSub: { color: C.textMuted, fontSize: 11 },
  videoAdded: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 6,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  videoAddedText: { flex: 1, color: C.text, fontSize: 14, fontWeight: "600" },
  inputWrap: {
    minHeight: 120,
    backgroundColor: C.bg,
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
  optionsSection: { gap: 10 },
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
  feeRow: { flexDirection: "row", gap: 10 },
  feeBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 3,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  feeBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  feeBtnText: { color: C.textSec, fontSize: 14, fontWeight: "700" },
  feeBtnTextActive: { color: "#fff" },
  priceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  priceBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 3,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  priceBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  priceBtnText: { color: C.textSec, fontSize: 13, fontWeight: "700" },
  priceBtnTextActive: { color: "#fff" },
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
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.bg,
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
