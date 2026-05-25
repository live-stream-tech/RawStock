import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Linking,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { C } from "@/constants/colors";
import { VIDEOS } from "@/constants/data";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/query-client";
import { navigateFromVideoCreatorRow, navigateToUserOrLiverProfile } from "@/lib/navigate-profile";
import { usePlayingVideo } from "@/lib/playing-video-context";
import { webScrollStyle } from "@/constants/layout";
import { parseDurationLabelToSec } from "@/lib/parse-duration-label";
import { TranslateButton } from "@/components/TranslateButton";
import { alertConfirm, alertError, alertMessage } from "@/lib/alertCompat";
import { resolvePublicMediaUri } from "@/lib/resolve-public-media-uri";
import { VideoDetailPlayer } from "@/components/VideoDetailPlayer";
import { logPlaybackStart } from "@/lib/videoPlaybackTelemetry";

const WORK_PRICE_OPTIONS = [300, 500, 1000, 2000, 3000, 5000] as const;

type VideoComment = {
  id: number;
  videoId: number;
  userId: number;
  text: string;
  createdAt: string;
  displayName?: string | null;
  profileImageUrl?: string | null;
};

function formatRelativeTime(dateStr: string | Date | null | undefined, isJaUi: boolean): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffSec < 60) return isJaUi ? "たった今" : "Just now";
  if (diffMin < 60) return isJaUi ? `${diffMin}分前` : `${diffMin}m ago`;
  if (diffHour < 24) return isJaUi ? `${diffHour}時間前` : `${diffHour}h ago`;
  if (diffDay < 7) return isJaUi ? `${diffDay}日前` : `${diffDay}d ago`;
  if (diffDay < 30) return isJaUi ? `${Math.floor(diffDay / 7)}週間前` : `${Math.floor(diffDay / 7)}w ago`;
  if (diffDay < 365) return isJaUi ? `${Math.floor(diffDay / 30)}か月前` : `${Math.floor(diffDay / 30)}mo ago`;
  return isJaUi ? `${Math.floor(diffDay / 365)}年前` : `${Math.floor(diffDay / 365)}y ago`;
}

export default function VideoDetailScreen() {
  const { id, demo } = useLocalSearchParams<{ id: string; demo?: string }>();
  const insets = useSafeAreaInsets();
  const [purchased, setPurchased] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: "video" | "comment"; id: number } | null>(null);
  const [reportReason, setReportReason] = useState<string>("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const qc = useQueryClient();
  const { user, requireAuth } = useAuth();
  const { playVideo, playing, stopPlaying } = usePlayingVideo();
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const isPlayingThisVideo = playing?.videoId === Number(id);
  const [workFee, setWorkFee] = useState<"free" | "paid">("free");
  const [workTicketPrice, setWorkTicketPrice] = useState(500);
  const [savingWorkPrice, setSavingWorkPrice] = useState(false);
  const isJaUi = (user?.preferredLanguage ?? "").toLowerCase().startsWith("ja");
  const t = isJaUi
    ? {
        userFallback: "ユーザー",
        commentAction: "コメント",
        editAction: "編集",
        deleteAction: "削除",
        purchaseAction: "購入",
        reportAction: "通報",
        commentFailedTitle: "エラー",
        commentFailedBody: "コメントの投稿に失敗しました。",
        titleRequired: "タイトルを入力してください。",
        updateFailedTitle: "エラー",
        updateFailedBody: "投稿の更新に失敗しました。",
        deletePostTitle: "投稿を削除",
        deletePostBody: "この投稿を削除してもよろしいですか？",
        cancel: "キャンセル",
        delete: "削除",
        deleteFailedTitle: "エラー",
        deleteFailedBody: "投稿の削除に失敗しました。",
        savePricingFailed: "価格の保存に失敗しました",
        insufficientTicketsTitle: "チケット不足 🎟",
        insufficientTicketsBody: (price: number) =>
          `このコンテンツの視聴には${price}🎟が必要です。残高を追加して解除してください。`,
        buyTickets: "チケットを購入",
        purchaseFailedTitle: "購入に失敗しました",
        purchaseFailedBody: "購入に失敗しました。しばらくしてからお試しください。",
        reportSubmittedTitle: "送信しました",
        reportSubmittedBody: "通報を受け付けました。確認の上で対応します。",
        reportFailedTitle: "通報に失敗しました",
        reportFailedBody: "通報の送信に失敗しました。",
        openFailedTitle: "開けませんでした",
        openFailedBody: "YouTubeでこの動画を開けませんでした。",
        openOnYoutube: "YouTubeで開く",
        editTitlePlaceholder: "タイトルを編集",
        edit: "編集",
        report: "通報",
        save: "保存",
        ownerPricingTitle: "動画価格（チケット）",
        free: "無料",
        paid: "有料",
        savePrice: "価格を保存",
        enterComment: "コメントを入力...",
        purchase: (price: number) => `購入 · 🎟${price.toLocaleString()}`,
        views: (count: number) => `${count.toLocaleString()}回視聴`,
        ownedContent: "このコンテンツは購入済みです",
        follow: "フォロー",
        saveLabel: "保存",
        like: "いいね",
        share: "共有",
        shareCopiedTitle: "リンクをコピーしました",
        shareCopiedBody: "この投稿のリンクをクリップボードに保存しました。",
        aiEditAssistant: "AI編集アシスタント",
        reportModalTitle: "通報",
        reportModalSub: (type: "video" | "comment" | undefined) =>
          `この${type === "video" ? "投稿" : "コメント"}を通報する理由を選択してください。`,
        reportFlowNote:
          "送信後はAIモデレーションが内容を確認します。明確な違反は即時に削除され、判断が難しいケースは管理者が確認します。問題なしと判断されたコンテンツは公開されたままになります。",
        reportSubmit: "送信",
        nowPlaying: "再生中",
        leaveModalMessage: "移動中も再生を続けますか？\n下部にミニプレイヤーが表示されます。",
        stopAndGoBack: "停止して戻る",
        keepWatching: "視聴を続ける",
        spam: "スパム",
        harassment: "嫌がらせ",
        inappropriate: "不適切なコンテンツ",
        other: "その他",
      }
    : {
        userFallback: "User",
        commentAction: "Comment",
        editAction: "Edit",
        deleteAction: "Delete",
        purchaseAction: "Purchase",
        reportAction: "Report",
        commentFailedTitle: "Error",
        commentFailedBody: "Failed to post comment.",
        titleRequired: "Enter a title.",
        updateFailedTitle: "Error",
        updateFailedBody: "Failed to update post.",
        deletePostTitle: "Delete post",
        deletePostBody: "Are you sure you want to delete this post?",
        cancel: "Cancel",
        delete: "Delete",
        deleteFailedTitle: "Error",
        deleteFailedBody: "Failed to delete post.",
        savePricingFailed: "Could not save pricing",
        insufficientTicketsTitle: "Insufficient tickets 🎟",
        insufficientTicketsBody: (price: number) =>
          `This content costs ${price} 🎟. Top up your balance to unlock it.`,
        buyTickets: "Buy tickets",
        purchaseFailedTitle: "Purchase failed",
        purchaseFailedBody: "Purchase failed. Please try again later.",
        reportSubmittedTitle: "Submitted",
        reportSubmittedBody: "Your report has been received and will be reviewed.",
        reportFailedTitle: "Report failed",
        reportFailedBody: "Failed to submit report.",
        openFailedTitle: "Open failed",
        openFailedBody: "Could not open this video on YouTube.",
        openOnYoutube: "Open on YouTube",
        editTitlePlaceholder: "Edit title",
        edit: "Edit",
        report: "Report",
        save: "Save",
        ownerPricingTitle: "Video pricing (tickets)",
        free: "Free",
        paid: "Paid",
        savePrice: "Save price",
        enterComment: "Enter a comment...",
        purchase: (price: number) => `Purchase · 🎟${price.toLocaleString()}`,
        views: (count: number) => `${count.toLocaleString()} views`,
        ownedContent: "You own this content",
        follow: "Follow",
        saveLabel: "Save",
        like: "Like",
        share: "Share",
        shareCopiedTitle: "Link copied",
        shareCopiedBody: "The link to this post has been copied to your clipboard.",
        aiEditAssistant: "AI edit assistant",
        reportModalTitle: "Report",
        reportModalSub: (type: "video" | "comment" | undefined) =>
          `Select a reason for reporting this ${type === "video" ? "post" : "comment"}.`,
        reportFlowNote:
          "After submission, AI moderation will review the content. Clear violations are removed immediately. Borderline cases are reviewed by an admin. Content found to be compliant remains visible.",
        reportSubmit: "Submit",
        nowPlaying: "Now playing",
        leaveModalMessage: "Keep playing while you navigate?\nA mini player will appear at the bottom.",
        stopAndGoBack: "Stop and go back",
        keepWatching: "Keep watching",
        spam: "Spam",
        harassment: "Harassment",
        inappropriate: "Inappropriate content",
        other: "Other",
      };

  const REPORT_REASONS: { value: string; label: string }[] = [
    { value: "spam", label: t.spam },
    { value: "harassment", label: t.harassment },
    { value: "inappropriate", label: t.inappropriate },
    { value: "other", label: t.other },
  ];

  const isDemo = demo === "1" || demo === "true";

  const { data: apiVideo } = useQuery<any>({
    queryKey: [`/api/videos/${id}`],
    enabled: !!id && !isDemo,
  });
  useEffect(() => {
    if (!apiVideo) return;
    const p = (apiVideo as any).price;
    if (typeof p === "number" && p > 0) {
      setWorkFee("paid");
      setWorkTicketPrice(p);
    } else {
      setWorkFee("free");
    }
  }, [apiVideo]);
  const isWorkPost = (apiVideo as any)?.postType === "work";
  const hasWorkVideo = !!(apiVideo as any)?.videoUrl?.trim?.();

  const fallbackVideo = isDemo ? VIDEOS.find((v) => v.id === String(id)) ?? VIDEOS[0] : undefined;
  const video = (apiVideo as any) ?? fallbackVideo;
  const youtubeWatchUrl =
    typeof (video as any)?.youtubeId === "string" && (video as any).youtubeId.trim()
      ? `https://www.youtube.com/watch?v=${encodeURIComponent((video as any).youtubeId.trim())}`
      : null;

  const { data: comments = [] } = useQuery<VideoComment[]>({
    queryKey: [`/api/videos/${id}/comments`],
    enabled: !!id && !isDemo,
  });

  const { data: savedData } = useQuery<{ saved: boolean }>({
    queryKey: [`/api/videos/${id}/saved`],
    enabled: !!id && !isDemo && !!user,
  });
  const isSaved = savedData?.saved ?? false;

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/videos/${id}/save`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/videos/${id}/saved`] });
      qc.invalidateQueries({ queryKey: ["/api/videos/saved"] });
    },
  });
  const unsaveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/videos/${id}/save`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/videos/${id}/saved`] });
      qc.invalidateQueries({ queryKey: ["/api/videos/saved"] });
    },
  });

  const { data: likeData } = useQuery<{ liked: boolean; likes: number }>({
    queryKey: [`/api/videos/${id}/like`],
    enabled: !!id && !isDemo,
  });
  const isLiked = likeData?.liked ?? false;
  const likeCount = likeData?.likes ?? 0;
  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/videos/${id}/like`);
      return (await res.json()) as { liked: boolean; likes: number };
    },
    onSuccess: (data) => {
      qc.setQueryData([`/api/videos/${id}/like`], data);
    },
  });
  const unlikeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/videos/${id}/like`);
      return (await res.json()) as { liked: boolean; likes: number };
    },
    onSuccess: (data) => {
      qc.setQueryData([`/api/videos/${id}/like`], data);
    },
  });

  async function handleShare() {
    const url =
      Platform.OS === "web" && typeof window !== "undefined"
        ? `${window.location.origin}/video/${id}`
        : `https://rawstock.live/video/${id}`;
    const title = String(video?.title ?? "RawStock");
    if (Platform.OS === "web" && typeof navigator !== "undefined") {
      const nav = navigator as Navigator & {
        share?: (data: { title?: string; url?: string }) => Promise<void>;
      };
      if (typeof nav.share === "function") {
        try {
          await nav.share({ title, url });
          return;
        } catch {
          // User cancelled or share failed; fall through to clipboard.
        }
      }
      try {
        await navigator.clipboard?.writeText(url);
        alertMessage(t.shareCopiedTitle, t.shareCopiedBody);
        return;
      } catch {
        alertMessage(t.shareCopiedTitle, url);
        return;
      }
    }
    try {
      const { Share } = await import("react-native");
      await Share.share({ message: `${title}\n${url}`, url, title });
    } catch {
      alertMessage(t.shareCopiedTitle, url);
    }
  }

  const creatorId = (video as any)?.creatorId;
  const creatorType = (video as any)?.creatorType;
  const ownerUserId = (apiVideo as any)?.userId;
  const isOwner =
    !!apiVideo &&
    !!user &&
    ((typeof ownerUserId === "number" && ownerUserId === user.id) ||
      (creatorType === "user" && typeof creatorId === "number" && creatorId === user.id) ||
      (typeof video?.creator === "string" &&
        (video.creator === user.displayName || video.creator === user.name)));

  async function handleAddComment() {
    const text = commentText.trim();
    if (!text) return;
    if (isDemo) return;
    if (!requireAuth(t.commentAction)) return;
    try {
      await apiRequest("POST", `/api/videos/${id}/comments`, { text });
      setCommentText("");
      await qc.invalidateQueries({ queryKey: [`/api/videos/${id}/comments`] });
    } catch {
      Alert.alert(t.commentFailedTitle, t.commentFailedBody);
    }
  }

  function openEdit() {
    if (!isOwner || !apiVideo || isDemo) return;
    setEditTitle(video.title ?? "");
    setEditMode(true);
  }

  async function saveEdit() {
    const newTitle = editTitle.trim();
    if (!newTitle) {
      Alert.alert("", t.titleRequired);
      return;
    }
    if (!requireAuth(t.editAction)) return;
    try {
      await apiRequest("PATCH", `/api/videos/${id}`, { title: newTitle });
      await qc.invalidateQueries({ queryKey: [`/api/videos/${id}`] });
      await qc.invalidateQueries({ queryKey: ["/api/videos/my"] });
      setEditMode(false);
    } catch {
      Alert.alert(t.updateFailedTitle, t.updateFailedBody);
    }
  }

  function confirmDelete() {
    if (!isOwner) return;
    Alert.alert(t.deletePostTitle, t.deletePostBody, [
      { text: t.cancel, style: "cancel" },
      {
        text: t.delete,
        style: "destructive",
        onPress: deletePost,
      },
    ]);
  }

  async function deletePost() {
    if (isDemo) return;
    if (!requireAuth(t.deleteAction)) return;
    try {
      await apiRequest("DELETE", `/api/videos/${id}`);
      await qc.invalidateQueries({ queryKey: ["/api/videos"] });
      await qc.invalidateQueries({ queryKey: ["/api/videos/my"] });
      await qc.invalidateQueries({ queryKey: ["/api/videos/ranked"] });
      router.replace("/profile");
    } catch {
      Alert.alert(t.deleteFailedTitle, t.deleteFailedBody);
    }
  }

  async function saveWorkVideoPricing() {
    if (!apiVideo || isDemo || !isOwner) return;
    if (!requireAuth(t.editAction)) return;
    setSavingWorkPrice(true);
    try {
      const nextPrice = workFee === "paid" ? workTicketPrice : null;
      await apiRequest("PATCH", `/api/videos/${id}`, { price: nextPrice });
      await qc.invalidateQueries({ queryKey: [`/api/videos/${id}`] });
      await qc.invalidateQueries({ queryKey: ["/api/videos/my"] });
      await qc.invalidateQueries({ queryKey: ["/api/videos"] });
      await qc.invalidateQueries({ queryKey: ["/api/videos/ranked"] });
    } catch (e: unknown) {
      alertError(t.savePricingFailed, e);
    } finally {
      setSavingWorkPrice(false);
    }
  }

  async function handlePurchase() {
    if (!requireAuth(t.purchaseAction)) return;
    if (isDemo) return;
    if (!video?.price) return;
    setPurchaseLoading(true);
    try {
      await apiRequest("POST", "/api/tickets/spend", {
        amount: video.price,
        type: "spend_gift",
        referenceId: String(id),
        creatorId: typeof creatorId === "number" ? creatorId : undefined,
        description: `Video: ${video.title}`,
        videoId: Number(id),
      });
      setPurchased(true);
      qc.invalidateQueries({ queryKey: ["/api/tickets/balance"] });
    } catch (err: any) {
      if (err?.status === 402) {
        alertConfirm(
          t.insufficientTicketsTitle,
          t.insufficientTicketsBody(video.price),
          () => router.push("/tickets"),
          { confirmLabel: t.buyTickets },
        );
      } else {
        alertError(t.purchaseFailedTitle, err, t.purchaseFailedBody);
      }
    } finally {
      setPurchaseLoading(false);
    }
  }

  function openReportModal(type: "video" | "comment", contentId: number) {
    if (!requireAuth(t.reportAction)) return;
    if (isDemo) return;
    setReportTarget({ type, id: contentId });
    setReportReason("");
  }

  async function submitReport() {
    if (!reportTarget || !reportReason) return;
    setReportSubmitting(true);
    try {
      await apiRequest("POST", "/api/reports", {
        contentType: reportTarget.type,
        contentId: reportTarget.id,
        reason: reportReason,
      });
      setReportTarget(null);
      alertMessage(t.reportSubmittedTitle, t.reportSubmittedBody);
      await qc.invalidateQueries({ queryKey: [`/api/videos/${id}`] });
      await qc.invalidateQueries({ queryKey: [`/api/videos/${id}/comments`] });
      await qc.invalidateQueries({ queryKey: ["/api/videos"] });
    } catch (e: any) {
      alertError(t.reportFailedTitle, e, t.reportFailedBody);
    } finally {
      setReportSubmitting(false);
    }
  }

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  if (!video) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <Pressable
          style={[styles.backBtn, { top: topInset + 12 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container]}>
      <ScrollView
        style={webScrollStyle(styles.scroll)}
        showsVerticalScrollIndicator={scrollShowsVertical}
      >
        {/* Media area (shared layout for text/photos/video) */}
        <View style={styles.playerContainer}>
          {isPlayingThisVideo && playing?.videoUrl && !(video as any).youtubeId ? (
            <VideoDetailPlayer
              videoUrl={playing.videoUrl}
              videoId={Number(id)}
            />
          ) : (
            <Image
              source={{
                uri: resolvePublicMediaUri(
                  (video as any).thumbnail || "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop",
                ),
              }}
              style={styles.playerThumb}
              contentFit="cover"
            />
          )}
          <View style={styles.playerOverlay}>
            {isPlayingThisVideo && playing?.videoUrl && !(video as any).youtubeId ? (
              <Pressable style={styles.stopVideoBtn} onPress={() => stopPlaying()} hitSlop={12}>
                <Ionicons name="close-circle" size={36} color="rgba(255,255,255,0.95)" />
              </Pressable>
            ) : null}
            {/* Video play button (when videoUrl or youtubeId exists) */}
            {((video as any).videoUrl || (video as any).youtubeId) &&
              !video.price &&
              !(isPlayingThisVideo && playing?.videoUrl) && (
              <Pressable
                style={styles.playOverlayBtn}
                onPress={async () => {
                  if (Platform.OS !== "web" && !(video as any).videoUrl && youtubeWatchUrl) {
                    const canOpen = await Linking.canOpenURL(youtubeWatchUrl);
                    if (canOpen) {
                      await Linking.openURL(youtubeWatchUrl);
                      return;
                    }
                  }
                  const rawVideoUrl = String((video as any).videoUrl ?? "").trim();
                  if ((video as any).videoUrl && !youtubeWatchUrl) {
                    await logPlaybackStart({
                      surface: "play_tap",
                      videoId: Number(id),
                      rawUrl: rawVideoUrl,
                    });
                  }
                  playVideo({
                    videoId: Number(id),
                    title: video.title,
                    thumbnail: resolvePublicMediaUri((video as any).thumbnail),
                    videoUrl: rawVideoUrl ? resolvePublicMediaUri(rawVideoUrl) : null,
                    youtubeId: (video as any).youtubeId ?? null,
                  });
                }}
              >
                <Ionicons name="play-circle" size={64} color="rgba(255,255,255,0.9)" />
              </Pressable>
            )}
            {!!youtubeWatchUrl && (
              <Pressable
                style={styles.youtubeOpenBtn}
                onPress={async () => {
                  const canOpen = await Linking.canOpenURL(youtubeWatchUrl);
                  if (!canOpen) {
                    Alert.alert(t.openFailedTitle, t.openFailedBody);
                    return;
                  }
                  await Linking.openURL(youtubeWatchUrl);
                }}
              >
                <Ionicons name="logo-youtube" size={14} color="#fff" />
                <Text style={styles.youtubeOpenBtnText}>{t.openOnYoutube}</Text>
              </Pressable>
            )}
            {/* Show lock only for paid content */}
            {!purchased && video.price && (
              <View style={styles.lockedOverlay}>
                <Ionicons name="lock-closed" size={32} color="rgba(255,255,255,0.6)" />
              </View>
            )}
            <View style={styles.playerControls}>
              <Pressable
                style={[styles.backBtn, { top: topInset + 12 }]}
                onPress={() => isPlayingThisVideo ? setShowLeaveModal(true) : router.back()}
              >
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Video Info */}
        <View style={styles.infoSection}>
          <View style={styles.titleRow}>
            {editMode ? (
              <TextInput
                style={styles.editTitleInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder={t.editTitlePlaceholder}
                placeholderTextColor={C.textMuted}
              />
            ) : (
              <Text style={styles.videoTitle}>{video.title}</Text>
            )}
            {isOwner && !editMode && (
              <View style={styles.postActionsRow}>
                <Pressable style={styles.postActionBtn} onPress={openEdit}>
                  <Ionicons name="pencil-outline" size={14} color={C.textSec} />
                  <Text style={styles.postActionText}>{t.edit}</Text>
                </Pressable>
                <Pressable style={styles.postActionBtn} onPress={confirmDelete}>
                  <Ionicons name="trash-outline" size={14} color={C.textSec} />
                  <Text style={styles.postActionText}>{t.delete}</Text>
                </Pressable>
              </View>
            )}
            {!editMode && apiVideo && (
              <Pressable style={styles.postActionBtn} onPress={() => openReportModal("video", Number(id))}>
                <Ionicons name="flag-outline" size={14} color={C.textSec} />
                <Text style={styles.postActionText}>{t.report}</Text>
              </Pressable>
            )}
            {editMode && (
              <View style={styles.postActionsRow}>
                <Pressable style={styles.postActionBtn} onPress={() => setEditMode(false)}>
                  <Text style={styles.postActionText}>{t.cancel}</Text>
                </Pressable>
                <Pressable style={styles.postActionBtn} onPress={saveEdit}>
                  <Text style={[styles.postActionText, { color: C.accent }]}>{t.save}</Text>
                </Pressable>
              </View>
            )}
          </View>
          {(video.description ?? video.title) ? (
            <Text style={styles.videoDesc}>{video.description ?? video.title}</Text>
          ) : null}

          {isOwner && isWorkPost && hasWorkVideo && !isDemo ? (
            <View style={styles.ownerPricingBox}>
              <Text style={styles.ownerPricingTitle}>{t.ownerPricingTitle}</Text>
              <View style={styles.ownerPricingRow}>
                <Pressable
                  style={[styles.ownerPricingChip, workFee === "free" && styles.ownerPricingChipOn]}
                  onPress={() => setWorkFee("free")}
                >
                  <Text style={[styles.ownerPricingChipText, workFee === "free" && styles.ownerPricingChipTextOn]}>
                    {t.free}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.ownerPricingChip, workFee === "paid" && styles.ownerPricingChipOn]}
                  onPress={() => setWorkFee("paid")}
                >
                  <Text style={[styles.ownerPricingChipText, workFee === "paid" && styles.ownerPricingChipTextOn]}>
                    {t.paid}
                  </Text>
                </Pressable>
              </View>
              {workFee === "paid" ? (
                <View style={styles.ownerPricePicker}>
                  {WORK_PRICE_OPTIONS.map((p) => (
                    <Pressable
                      key={p}
                      style={[styles.ownerPriceBtn, workTicketPrice === p && styles.ownerPriceBtnOn]}
                      onPress={() => setWorkTicketPrice(p)}
                    >
                      <Text style={[styles.ownerPriceBtnText, workTicketPrice === p && styles.ownerPriceBtnTextOn]}>
                        🎟{p}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <Pressable
                style={[styles.ownerPricingSave, savingWorkPrice && { opacity: 0.6 }]}
                onPress={saveWorkVideoPricing}
                disabled={savingWorkPrice}
              >
                {savingWorkPrice ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.ownerPricingSaveText}>{t.savePrice}</Text>
                )}
              </Pressable>
            </View>
          ) : null}

          {/* Comments Preview */}
          <View style={styles.commentsPreview}>
            {comments.map((c) => (
              <View key={c.id} style={styles.commentItem}>
                <Pressable
                  onPress={() => navigateToUserOrLiverProfile({ userId: c.userId })}
                  hitSlop={4}
                >
                  <Image
                    source={{ uri: c.profileImageUrl ?? undefined }}
                    style={styles.commentAvatar}
                    contentFit="cover"
                  />
                </Pressable>
                <View style={styles.commentContent}>
                  <Text style={styles.commentName}>{c.displayName ?? t.userFallback}</Text>
                  <Text style={styles.commentText} numberOfLines={1}>
                    {c.text}
                  </Text>
                  {c.text ? <TranslateButton text={c.text} compact /> : null}
                </View>
                {!isDemo && (
                  <Pressable style={styles.commentReportBtn} onPress={() => openReportModal("comment", c.id)} hitSlop={8}>
                    <Ionicons name="flag-outline" size={14} color={C.textMuted} />
                  </Pressable>
                )}
              </View>
            ))}
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder={t.enterComment}
                placeholderTextColor={C.textMuted}
                value={commentText}
                onChangeText={setCommentText}
                maxLength={200}
              />
              <Pressable style={styles.commentSendBtn} onPress={handleAddComment} disabled={!commentText.trim()}>
                <Ionicons
                  name="send"
                  size={16}
                  color={commentText.trim() ? C.accent : C.textMuted}
                />
              </Pressable>
            </View>
          </View>

          {/* Paid-content CTA (shared for text/photo/video) */}
          {video.price && (
            <View style={styles.purchaseSection}>
              {!purchased ? (
                <>
                  <Pressable
                    style={[styles.purchaseBtn, purchaseLoading && { opacity: 0.7 }]}
                    onPress={handlePurchase}
                    disabled={purchaseLoading}
                  >
                    {purchaseLoading
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <>
                          <Ionicons name="cart" size={16} color="#fff" />
                          <Text style={styles.purchaseBtnText}>
                            {t.purchase(video.price)}
                          </Text>
                        </>
                    }
                  </Pressable>
                  <Text style={styles.viewCount}>
                    {t.views(video.views)}
                  </Text>
                </>
              ) : (
                <Text style={styles.viewCount}>
                  {t.ownedContent}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Creator info */}
        <View style={styles.creatorSection}>
          <Pressable
            style={styles.creatorRow}
            onPress={() => navigateFromVideoCreatorRow(video as any)}
          >
            <Image source={{ uri: video.avatar }} style={styles.creatorAvatar} contentFit="cover" />
            <View style={styles.creatorInfo}>
              <Text style={styles.creatorName}>{video.creator}</Text>
              <Text style={styles.creatorCommunity}>{video.community}</Text>
            </View>
            <Pressable style={styles.followBtn} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.followBtnText}>{t.follow}</Text>
            </Pressable>
          </Pressable>
        </View>

        {/* Video meta */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="eye-outline" size={16} color={C.textSec} />
            <Text style={styles.metaText}>{t.views(video.views)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={16} color={C.textSec} />
            <Text style={styles.metaText}>
              {(video as any).timeAgo ??
                (video as any).time_ago ??
                formatRelativeTime((video as any).createdAt ?? (video as any).created_at, isJaUi) ??
                (isJaUi ? "たった今" : "Just now")}
            </Text>
          </View>
          {user && !isDemo && (
            <Pressable
              style={styles.metaItem}
              onPress={() => {
                if (isSaved) unsaveMutation.mutate();
                else saveMutation.mutate();
              }}
              disabled={saveMutation.isPending || unsaveMutation.isPending}
            >
              <Ionicons
                name={isSaved ? "bookmark" : "bookmark-outline"}
                size={16}
                color={isSaved ? C.accent : C.textSec}
              />
              <Text style={[styles.metaText, isSaved && { color: C.accent }]}>
                {t.saveLabel}
              </Text>
            </Pressable>
          )}
          <Pressable
            style={styles.metaItem}
            onPress={() => {
              if (isDemo) return;
              if (!requireAuth(t.like)) return;
              if (isLiked) unlikeMutation.mutate();
              else likeMutation.mutate();
            }}
            disabled={likeMutation.isPending || unlikeMutation.isPending}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={16}
              color={isLiked ? "#ff4d6d" : C.textSec}
            />
            <Text style={[styles.metaText, isLiked && { color: "#ff4d6d" }]}>
              {likeCount > 0 ? `${t.like} · ${likeCount.toLocaleString()}` : t.like}
            </Text>
          </Pressable>
          <Pressable style={styles.metaItem} onPress={handleShare}>
            <Ionicons name="share-outline" size={16} color={C.textSec} />
            <Text style={styles.metaText}>{t.share}</Text>
          </Pressable>
        </View>

        {/* AI edit assistant entry point */}
        {!isDemo && (video as any).videoUrl && (
          <Pressable
            style={styles.aiEditBtn}
            onPress={() => {
              const rawUrl = String((video as any).videoUrl ?? "");
              const url = encodeURIComponent(rawUrl);
              const parsed = parseDurationLabelToSec(String((video as any).duration ?? ""));
              const dur =
                parsed != null && parsed > 0 ? `&durationSec=${Math.round(parsed)}` : "";
              router.push(`/ai-edit?videoUrl=${url}${dur}`);
            }}
          >
            <Ionicons name="sparkles" size={15} color="#000" />
            <Text style={styles.aiEditBtnText}>{t.aiEditAssistant}</Text>
            <Ionicons name="chevron-forward" size={13} color="#000" style={{ marginLeft: "auto" }} />
          </Pressable>
        )}

        <View style={{ height: 100 + bottomInset }} />
      </ScrollView>

      {/* Report modal */}
      <Modal visible={!!reportTarget} transparent animationType="fade">
        <Pressable style={styles.reportModalOverlay} onPress={() => !reportSubmitting && setReportTarget(null)}>
          <Pressable style={styles.reportModalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.reportModalTitle}>{t.reportModalTitle}</Text>
            <Text style={styles.reportModalSub}>
              {t.reportModalSub(reportTarget?.type)}
            </Text>
            <Text style={styles.reportFlowNote}>
              {t.reportFlowNote}
            </Text>
            {REPORT_REASONS.map((r) => (
              <Pressable
                key={r.value}
                style={[styles.reportReasonBtn, reportReason === r.value && styles.reportReasonBtnActive]}
                onPress={() => setReportReason(r.value)}
              >
                <Text style={[styles.reportReasonText, reportReason === r.value && styles.reportReasonTextActive]}>{r.label}</Text>
              </Pressable>
            ))}
            <View style={styles.reportModalActions}>
              <Pressable style={styles.reportCancelBtn} onPress={() => setReportTarget(null)} disabled={reportSubmitting}>
                <Text style={styles.reportCancelText}>{t.cancel}</Text>
              </Pressable>
              <Pressable
                style={[styles.reportSubmitBtn, (!reportReason || reportSubmitting) && styles.reportSubmitBtnDisabled]}
                disabled={!reportReason || reportSubmitting}
                onPress={submitReport}
              >
                {reportSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.reportSubmitText}>{t.reportSubmit}</Text>}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Leave-page confirmation modal */}
      <Modal visible={showLeaveModal} animationType="fade" transparent>
        <View style={styles.leaveModalBg}>
          <View style={styles.leaveModalCard}>
            <View style={styles.leaveModalIconRow}>
              <Ionicons name="play-circle" size={28} color={C.accent} />
            </View>
            <Text style={styles.leaveModalTitle}>{t.nowPlaying}</Text>
            <Text style={styles.leaveModalMsg}>{t.leaveModalMessage}</Text>
            <View style={styles.leaveModalBtns}>
              <Pressable
                style={[styles.leaveModalBtn, styles.leaveModalBtnSecondary]}
                onPress={() => {
                  stopPlaying();
                  setShowLeaveModal(false);
                  router.back();
                }}
              >
                <Text style={styles.leaveModalBtnSecondaryText}>{t.stopAndGoBack}</Text>
              </Pressable>
              <Pressable
                style={[styles.leaveModalBtn, styles.leaveModalBtnPrimary]}
                onPress={() => {
                  setShowLeaveModal(false);
                  router.back();
                }}
              >
                <Ionicons name="play" size={14} color={C.bg} />
                <Text style={styles.leaveModalBtnPrimaryText}>{t.keepWatching}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flex: 1,
  },
  playerContainer: {
    width: "100%",
    height: 280,
    position: "relative",
  },
  playerThumb: {
    width: "100%",
    height: "100%",
  },
  playerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  playOverlayBtn: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  stopVideoBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 2,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  playerControls: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  youtubeOpenBtn: {
    position: "absolute",
    right: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  youtubeOpenBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  backBtn: {
    position: "absolute",
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoSection: {
    padding: 16,
    gap: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  videoTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 24,
  },
  videoDesc: {
    color: C.textSec,
    fontSize: 13,
    lineHeight: 20,
  },
  ownerPricingBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
    gap: 10,
  },
  ownerPricingTitle: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  ownerPricingRow: { flexDirection: "row", gap: 8 },
  ownerPricingChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  ownerPricingChipOn: {
    borderColor: C.accent,
    backgroundColor: "rgba(41,182,207,0.15)",
  },
  ownerPricingChipText: { color: C.textSec, fontSize: 13, fontWeight: "700" },
  ownerPricingChipTextOn: { color: C.accent },
  ownerPricePicker: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  ownerPriceBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  ownerPriceBtnOn: { borderColor: C.accent, backgroundColor: C.accent },
  ownerPriceBtnText: { color: C.textSec, fontSize: 12, fontWeight: "700" },
  ownerPriceBtnTextOn: { color: "#fff" },
  ownerPricingSave: {
    alignSelf: "flex-start",
    backgroundColor: C.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  ownerPricingSaveText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  editTitleInput: {
    flex: 1,
    backgroundColor: C.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: C.text,
    fontSize: 15,
  },
  postActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  postActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  postActionText: {
    color: C.textSec,
    fontSize: 11,
    fontWeight: "600",
  },
  commentsPreview: {
    backgroundColor: C.bg,
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  commentItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.accent,
  },
  commentContent: {
    flex: 1,
  },
  commentName: {
    color: C.text,
    fontSize: 11,
    fontWeight: "700",
  },
  commentText: {
    color: C.textSec,
    fontSize: 11,
  },
  commentReportBtn: {
    padding: 4,
  },
  reportModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  reportModalBox: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  reportModalTitle: {
    color: C.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  reportModalSub: {
    color: C.textSec,
    fontSize: 13,
    marginBottom: 8,
  },
  reportFlowNote: {
    color: C.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 16,
  },
  reportReasonBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: C.surface2,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  reportReasonBtnActive: {
    borderColor: C.accent,
    backgroundColor: C.accent + "22",
  },
  reportReasonText: {
    color: C.textSec,
    fontSize: 14,
    fontWeight: "600",
  },
  reportReasonTextActive: {
    color: C.accent,
  },
  reportModalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  reportCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
  },
  reportCancelText: {
    color: C.textSec,
    fontSize: 14,
    fontWeight: "700",
  },
  reportSubmitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.accent,
    alignItems: "center",
  },
  reportSubmitBtnDisabled: {
    backgroundColor: C.surface3,
    opacity: 0.8,
  },
  reportSubmitText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  commentInput: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: C.text,
    fontSize: 13,
  },
  commentSendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  purchaseSection: {
    gap: 8,
    alignItems: "center",
  },
  purchaseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#111",
    borderRadius: 10,
    paddingVertical: 14,
    width: "100%",
  },
  purchaseBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  viewCount: {
    color: C.textMuted,
    fontSize: 12,
  },
  creatorSection: {
    padding: 16,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  creatorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: C.accent,
  },
  creatorInfo: {
    flex: 1,
  },
  creatorName: {
    color: C.text,
    fontSize: 14,
    fontWeight: "700",
  },
  creatorCommunity: {
    color: C.textSec,
    fontSize: 12,
    marginTop: 2,
  },
  followBtn: {
    backgroundColor: C.accent,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  followBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    color: C.textSec,
    fontSize: 12,
  },
  leaveModalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  leaveModalCard: {
    backgroundColor: C.surface2,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    gap: 12,
  },
  leaveModalIconRow: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,255,204,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  leaveModalTitle: {
    color: C.text,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  leaveModalMsg: {
    color: C.textSec,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  leaveModalBtns: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    width: "100%",
  },
  leaveModalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  leaveModalBtnPrimary: {
    backgroundColor: C.accent,
  },
  leaveModalBtnSecondary: {
    backgroundColor: C.surface3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  leaveModalBtnPrimaryText: {
    color: C.bg,
    fontSize: 14,
    fontWeight: "700",
  },
  leaveModalBtnSecondaryText: {
    color: C.textSec,
    fontSize: 14,
    fontWeight: "600",
  },
  aiEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: C.accent,
    borderRadius: 12,
  },
  aiEditBtnText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "800",
    flex: 1,
  },
});
