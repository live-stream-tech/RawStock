import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { scrollShowsHorizontal, scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { C } from "@/constants/colors";
import { VIDEOS } from "@/constants/data";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/query-client";
import { usePlayingVideo } from "@/lib/playing-video-context";
import { webScrollStyle } from "@/constants/layout";

type VideoComment = {
  id: number;
  videoId: number;
  userId: number;
  text: string;
  createdAt: string;
  displayName?: string | null;
  profileImageUrl?: string | null;
};

function formatRelativeTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
  if (diffDay < 365) return `${Math.floor(diffDay / 30)}mo ago`;
  return `${Math.floor(diffDay / 365)}y ago`;
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

  const REPORT_REASONS: { value: string; label: string }[] = [
    { value: "spam", label: "Spam" },
    { value: "harassment", label: "Harassment" },
    { value: "inappropriate", label: "Inappropriate content" },
    { value: "other", label: "Other" },
  ];

  const isDemo = demo === "1" || demo === "true";

  const { data: apiVideo } = useQuery<any>({
    queryKey: [`/api/videos/${id}`],
    enabled: !!id && !isDemo,
  });

  const fallbackVideo = isDemo ? VIDEOS.find((v) => v.id === String(id)) ?? VIDEOS[0] : undefined;
  const video = (apiVideo as any) ?? fallbackVideo;

  const { data: comments = [] } = useQuery<VideoComment[]>({
    queryKey: [`/api/videos/${id}/comments`],
    enabled: !!id && !isDemo,
  });

  const { data: savedData, refetch: refetchSaved } = useQuery<{ saved: boolean }>({
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

  const creatorId = (video as any)?.creatorId;
  const creatorType = (video as any)?.creatorType;
  const isOwner =
    !!apiVideo &&
    !!user &&
    (creatorType === "user" && typeof creatorId === "number" && creatorId === user.id);

  async function handleAddComment() {
    const text = commentText.trim();
    if (!text) return;
    if (isDemo) return;
    if (!requireAuth("Comment")) return;
    try {
      await apiRequest("POST", `/api/videos/${id}/comments`, { text });
      setCommentText("");
      await qc.invalidateQueries({ queryKey: [`/api/videos/${id}/comments`] });
    } catch {
      Alert.alert("Error", "Failed to post comment");
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
      Alert.alert("", "Please enter a title");
      return;
    }
    if (!requireAuth("Edit")) return;
    try {
      await apiRequest("PATCH", `/api/videos/${id}`, { title: newTitle });
      await qc.invalidateQueries({ queryKey: [`/api/videos/${id}`] });
      await qc.invalidateQueries({ queryKey: ["/api/videos/my"] });
      setEditMode(false);
    } catch {
      Alert.alert("Error", "Failed to update post");
    }
  }

  function confirmDelete() {
    if (!isOwner) return;
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: deletePost,
      },
    ]);
  }

  async function deletePost() {
    if (isDemo) return;
    if (!requireAuth("Delete")) return;
    try {
      await apiRequest("DELETE", `/api/videos/${id}`);
      await qc.invalidateQueries({ queryKey: ["/api/videos"] });
      await qc.invalidateQueries({ queryKey: ["/api/videos/my"] });
      router.replace("/(tabs)/profile");
    } catch {
      Alert.alert("Error", "Failed to delete post");
    }
  }

  async function handlePurchase() {
    if (!requireAuth("Purchase")) return;
    if (isDemo) return;
    if (!video?.price) return;
    setPurchaseLoading(true);
    try {
      await apiRequest("POST", "/api/tickets/spend", {
        amount: video.price,
        description: `Video: ${video.title}`,
        videoId: Number(id),
      });
      setPurchased(true);
      qc.invalidateQueries({ queryKey: ["/api/tickets/balance"] });
    } catch (err: any) {
      if (err?.status === 402) {
        Alert.alert(
          "Not Enough Tickets 🎟",
          `This content costs ${video.price} 🎟. Top up your balance to unlock it.`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Get Tickets", onPress: () => router.push("/tickets") },
          ]
        );
      } else {
        Alert.alert("Error", "Purchase failed. Please try again.");
      }
    } finally {
      setPurchaseLoading(false);
    }
  }

  function openReportModal(type: "video" | "comment", contentId: number) {
    if (!requireAuth("Report")) return;
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
      Alert.alert("Submitted", "Your report has been received and will be reviewed.");
      await qc.invalidateQueries({ queryKey: [`/api/videos/${id}`] });
      await qc.invalidateQueries({ queryKey: [`/api/videos/${id}/comments`] });
      await qc.invalidateQueries({ queryKey: ["/api/videos"] });
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to submit report");
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
        {/* メディア領域（テキスト / 写真展 / 動画など共通レイアウト） */}
        <View style={styles.playerContainer}>
          <Image
            source={{ uri: (video as any).thumbnail || "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop" }}
            style={styles.playerThumb}
            contentFit="cover"
          />
          <View style={styles.playerOverlay}>
            {/* 動画再生ボタン（videoUrl または youtubeId がある場合） */}
            {((video as any).videoUrl || (video as any).youtubeId) && !video.price && (
              <Pressable
                style={styles.playOverlayBtn}
                onPress={() =>
                  playVideo({
                    videoId: Number(id),
                    title: video.title,
                    thumbnail: (video as any).thumbnail,
                    videoUrl: (video as any).videoUrl ?? null,
                    youtubeId: (video as any).youtubeId ?? null,
                  })
                }
              >
                <Ionicons name="play-circle" size={64} color="rgba(255,255,255,0.9)" />
              </Pressable>
            )}
            {/* 有料コンテンツの場合のみロック表示 */}
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
                placeholder="Edit title"
                placeholderTextColor={C.textMuted}
              />
            ) : (
              <Text style={styles.videoTitle}>{video.title}</Text>
            )}
            {isOwner && !editMode && (
              <View style={styles.postActionsRow}>
                <Pressable style={styles.postActionBtn} onPress={openEdit}>
                  <Ionicons name="pencil-outline" size={14} color={C.textSec} />
                  <Text style={styles.postActionText}>Edit</Text>
                </Pressable>
                <Pressable style={styles.postActionBtn} onPress={confirmDelete}>
                  <Ionicons name="trash-outline" size={14} color={C.textSec} />
                  <Text style={styles.postActionText}>Delete</Text>
                </Pressable>
              </View>
            )}
            {!editMode && apiVideo && (
              <Pressable style={styles.postActionBtn} onPress={() => openReportModal("video", Number(id))}>
                <Ionicons name="flag-outline" size={14} color={C.textSec} />
                <Text style={styles.postActionText}>Report</Text>
              </Pressable>
            )}
            {editMode && (
              <View style={styles.postActionsRow}>
                <Pressable style={styles.postActionBtn} onPress={() => setEditMode(false)}>
                  <Text style={styles.postActionText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.postActionBtn} onPress={saveEdit}>
                  <Text style={[styles.postActionText, { color: C.accent }]}>Save</Text>
                </Pressable>
              </View>
            )}
          </View>
          {(video.description ?? video.title) ? (
            <Text style={styles.videoDesc}>{video.description ?? video.title}</Text>
          ) : null}

          {/* Comments Preview */}
          <View style={styles.commentsPreview}>
            {comments.map((c) => (
              <View key={c.id} style={styles.commentItem}>
                <Image
                  source={{ uri: c.profileImageUrl ?? undefined }}
                  style={styles.commentAvatar}
                  contentFit="cover"
                />
                <View style={styles.commentContent}>
                  <Text style={styles.commentName}>{c.displayName ?? "User"}</Text>
                  <Text style={styles.commentText} numberOfLines={1}>
                    {c.text}
                  </Text>
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
                placeholder="Add a comment..."
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

          {/* 課金コンテンツ用 CTA（テキスト / 写真 / 動画 いずれも共通） */}
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
                            Purchase · 🎟{video.price.toLocaleString()}
                          </Text>
                        </>
                    }
                  </Pressable>
                  <Text style={styles.viewCount}>
                    {video.views.toLocaleString()} views
                  </Text>
                </>
              ) : (
                <Text style={styles.viewCount}>
                  You own this content
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Creator info */}
        <View style={styles.creatorSection}>
          <Pressable
            style={styles.creatorRow}
            onPress={() => {
              const type = (video as any).creatorType;
              const cid = (video as any).creatorId;
              if (type === "user" && typeof cid === "number") {
                router.push(`/user/${cid}`);
                return;
              }
              if (type === "liver" && typeof cid === "number") {
                router.push(`/livers/${cid}`);
                return;
              }
              if (!video?.creator) return;
              apiRequest("GET", `/api/profile/by-name/${encodeURIComponent(video.creator)}`)
                .then((res) => res.json())
                .then(({ type: t, id: i }: { type: "user" | "liver"; id: number }) => {
                  if (t === "user") router.push(`/user/${i}`);
                  else router.push(`/livers/${i}`);
                })
                .catch(() => {});
            }}
          >
            <Image source={{ uri: video.avatar }} style={styles.creatorAvatar} contentFit="cover" pointerEvents="none" />
            <View style={styles.creatorInfo}>
              <Text style={styles.creatorName}>{video.creator}</Text>
              <Text style={styles.creatorCommunity}>{video.community}</Text>
            </View>
            <Pressable style={styles.followBtn} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.followBtnText}>Follow</Text>
            </Pressable>
          </Pressable>
        </View>

        {/* Video meta */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="eye-outline" size={16} color={C.textSec} />
            <Text style={styles.metaText}>{video.views.toLocaleString()} views</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={16} color={C.textSec} />
            <Text style={styles.metaText}>
              {(video as any).timeAgo ?? (video as any).time_ago ?? formatRelativeTime((video as any).createdAt ?? (video as any).created_at) ?? "just now"}
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
                Save
              </Text>
            </Pressable>
          )}
          <View style={styles.metaItem}>
            <Ionicons name="heart-outline" size={16} color={C.textSec} />
            <Text style={styles.metaText}>Like</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="share-outline" size={16} color={C.textSec} />
            <Text style={styles.metaText}>Share</Text>
          </View>
        </View>

        {/* AI編集アシスタント導線 */}
        {!isDemo && (video as any).videoUrl && (
          <Pressable
            style={styles.aiEditBtn}
            onPress={() => {
              const url = encodeURIComponent((video as any).videoUrl ?? "");
              router.push(`/ai-edit?videoUrl=${url}`);
            }}
          >
            <Ionicons name="sparkles" size={15} color="#000" />
            <Text style={styles.aiEditBtnText}>AI Edit Assistant</Text>
            <Ionicons name="chevron-forward" size={13} color="#000" style={{ marginLeft: "auto" }} />
          </Pressable>
        )}

        <View style={{ height: 100 + bottomInset }} />
      </ScrollView>

      {/* 通報モーダル */}
      <Modal visible={!!reportTarget} transparent animationType="fade">
        <Pressable style={styles.reportModalOverlay} onPress={() => !reportSubmitting && setReportTarget(null)}>
          <Pressable style={styles.reportModalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.reportModalTitle}>Report</Text>
            <Text style={styles.reportModalSub}>
              Why are you reporting this {reportTarget?.type === "video" ? "post" : "comment"}?
            </Text>
            <Text style={styles.reportFlowNote}>
              After submission, AI moderation will review the content. Clear violations are removed immediately. Borderline cases are reviewed by an admin. Content found to be compliant remains visible.
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
                <Text style={styles.reportCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.reportSubmitBtn, (!reportReason || reportSubmitting) && styles.reportSubmitBtnDisabled]}
                disabled={!reportReason || reportSubmitting}
                onPress={submitReport}
              >
                {reportSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.reportSubmitText}>Submit</Text>}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ページ離脱確認モーダル */}
      <Modal visible={showLeaveModal} animationType="fade" transparent>
        <View style={styles.leaveModalBg}>
          <View style={styles.leaveModalCard}>
            <View style={styles.leaveModalIconRow}>
              <Ionicons name="play-circle" size={28} color={C.accent} />
            </View>
            <Text style={styles.leaveModalTitle}>Now Playing</Text>
            <Text style={styles.leaveModalMsg}>
              Keep playing while you navigate?{"\n"}
              A mini player will appear at the bottom.
            </Text>
            <View style={styles.leaveModalBtns}>
              <Pressable
                style={[styles.leaveModalBtn, styles.leaveModalBtnSecondary]}
                onPress={() => {
                  stopPlaying();
                  setShowLeaveModal(false);
                  router.back();
                }}
              >
                <Text style={styles.leaveModalBtnSecondaryText}>Stop & Leave</Text>
              </Pressable>
              <Pressable
                style={[styles.leaveModalBtn, styles.leaveModalBtnPrimary]}
                onPress={() => {
                  setShowLeaveModal(false);
                  router.back();
                }}
              >
                <Ionicons name="play" size={14} color={C.bg} />
                <Text style={styles.leaveModalBtnPrimaryText}>Keep Watching</Text>
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
