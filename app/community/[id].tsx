import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  Animated,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { C } from "@/constants/colors";
import { formatEditorRevenueShareLabel, formatEditorTicketsPerMinute, PRICE_PER_TICKET_USD } from "@/constants/tickets";
import { AppLogo } from "@/components/AppLogo";
import { EventFlyerImage } from "@/components/EventFlyerImage";
import { AnnouncementBodyView } from "@/components/AnnouncementBodyView";
import { apiRequest, formatUserFacingApiError, uploadUserMediaBlobToR2 } from "@/lib/query-client";
import { fetchJukeboxJson, makeJukeboxPollViewerId } from "@/lib/jukebox-presence";
import { navigateToUserOrLiverProfile, navigateFromVideoCreatorRow } from "@/lib/navigate-profile";
import { useAuth } from "@/lib/auth";
import { webScrollStyle } from "@/constants/layout";
import { TranslateButton } from "@/components/TranslateButton";
import { parseThreadBody, youtubeThumbnailFromVideoUrl } from "@/lib/parse-thread-body";
import {
  assertAnnouncementScreenshotResolutionOk,
  readImageDimensionsFromFileWeb,
  readImageDimensionsFromUri,
} from "@/lib/flyer-image-quality";
import * as ImagePicker from "expo-image-picker";
import type { ImagePickerAsset } from "expo-image-picker";
import { useDemoMode } from "@/lib/demo-mode";
import { TEMP_BANNER_IMAGE_PATH, TEMP_BANNER_TARGET_URL } from "@/constants/bannerLinks";
import { alertError, alertMessage } from "@/lib/alertCompat";

const MAX_ANNOUNCEMENT_SCREENSHOT_BYTES = 15 * 1024 * 1024;

async function uploadImageBlobToR2(blob: Blob, fileName: string, mime: string): Promise<string> {
  return uploadUserMediaBlobToR2(blob, fileName, mime);
}

type AdData = { title: string; sub: string; cta: string; bg: string; accent: string; thumb: string };
type ActiveCommunityAd = {
  id: number;
  bannerUrl: string;
  linkUrl: string | null;
  companyName: string;
};

const COMMUNITY_ADS: Record<string, AdData> = {
  "idol": {
    title: "Photo Session — Now Open!",
    sub: "Mar 15 Shibuya WWW • First 50 spots",
    cta: "Reserve",
    bg: "#2a0a18",
    accent: "#FF4081",
    thumb: TEMP_BANNER_IMAGE_PATH,
  },
  "cabaret": {
    title: "VIP Night Event",
    sub: "This Month Only — Special Invitation",
    cta: "Details",
    bg: "#1a0830",
    accent: "#CE93D8",
    thumb: TEMP_BANNER_IMAGE_PATH,
  },
  "vtuber": {
    title: "3D Live Stream Tickets",
    sub: "Apr 1 Hyper Live • Pre-sale Now",
    cta: "Buy",
    bg: "#08122a",
    accent: "#00ffcc",
    thumb: TEMP_BANNER_IMAGE_PATH,
  },
  "influencer": {
    title: "Collab Limited Merch",
    sub: "Free Shipping • Limited Stock",
    cta: "Shop",
    bg: "#0a1f10",
    accent: "#69F0AE",
    thumb: TEMP_BANNER_IMAGE_PATH,
  },
  "anisong": {
    title: "Anisong Fest 2026",
    sub: "May 3 Makuhari Messe • S Seats On Sale",
    cta: "Tickets",
    bg: "#1a0828",
    accent: "#E040FB",
    thumb: TEMP_BANNER_IMAGE_PATH,
  },
};

const DEFAULT_AD: AdData = {
  title: "Premium Stream Tickets Available",
  sub: "Buy now — 10% off for members",
  cta: "Buy",
  bg: "#0a1520",
  accent: C.accent,
  thumb: TEMP_BANNER_IMAGE_PATH,
};

function getAd(name: string): AdData {
  const key = Object.keys(COMMUNITY_ADS).find((k) => name.includes(k));
  return key ? COMMUNITY_ADS[key] : DEFAULT_AD;
}

type ThreadItem = {
  id: number;
  communityId: number;
  authorUserId: number;
  title: string;
  body: string;
  createdAt: string;
  pinned: boolean;
  postCount: number;
  author: { displayName: string; profileImageUrl: string | null };
};

type ThreadDetail = ThreadItem & {
  posts: {
    id: number;
    threadId: number;
    authorUserId: number;
    body: string;
    createdAt: string;
    author: { displayName: string; profileImageUrl: string | null };
  }[];
};

type JukeboxState = {
  communityId: number;
  currentVideoId?: number | null;
  currentVideoTitle: string | null;
  currentVideoThumbnail: string | null;
  currentVideoDurationSecs: number;
  currentVideoYoutubeId?: string | null;
  startedAt: string;
  isPlaying: boolean;
  watchersCount: number;
};

type QueueItem = {
  id: number;
  videoId?: number | null;
  youtubeId?: string | null;
  videoTitle: string;
  videoThumbnail: string;
  videoDurationSecs: number;
  addedBy: string;
  addedByAvatar: string | null;
  addedByUserId?: number | null;
  isPlayed: boolean;
};

type ChatMsg = {
  id: number;
  username: string;
  avatar: string | null;
  message: string;
  createdAt: string;
};

type JukeboxData = {
  state: JukeboxState | null;
  queue: QueueItem[];
  chat: ChatMsg[];
};

type VideoEditor = {
  id: number;
  /** Registered users (rows from the video_editors API) */
  userId?: number | null;
  name: string;
  avatar: string;
  bio: string;
  communityId: number;
  genres: string;
  deliveryDays: number;
  priceType: "per_minute" | "revenue_share" | "both";
  pricePerMinute: number | null;
  revenueSharePercent: number | null;
  styleTags?: string[];
  rating: number;
  reviewCount: number;
  isAvailable: boolean;
};

function calcProgress(startedAt: string, durationSecs: number): number {
  const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
  if (durationSecs <= 0) return 0;
  return Math.min(elapsed / durationSecs, 1);
}

function fmtSecs(s: number): string {
  if (!s || s <= 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatThreadDate(dateStr: string, isJaUi = false): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffDay === 0) return isJaUi ? "今日" : "Today";
  if (diffDay === 1) return isJaUi ? "昨日" : "Yesterday";
  if (diffDay < 7) return isJaUi ? `${diffDay}日前` : `${diffDay}d ago`;
  return d.toLocaleDateString(isJaUi ? "ja-JP" : "en-US", { month: "short", day: "numeric" });
}

function EmbeddedJukebox({ communityId }: { communityId: number }) {
  const qc = useQueryClient();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [comment, setComment] = useState("");
  const [progress, setProgress] = useState(0);
  const embeddedPollViewerId = useMemo(() => makeJukeboxPollViewerId(), []);

  const { data } = useQuery<JukeboxData>({
    queryKey: [`/api/jukebox/${communityId}`],
    queryFn: () => fetchJukeboxJson<JukeboxData>(communityId, embeddedPollViewerId),
    refetchInterval: (query) =>
      (query.state.data as JukeboxData)?.state?.isPlaying ? 5000 : 10000,
  });

  const state = data?.state ?? null;
  const queue = data?.queue ?? [];
  const chat = (data?.chat ?? []).slice(-3);
  // "Up next" queue excluding currently playing track.
  const upcoming = queue.filter(
    (q) =>
      !q.isPlayed &&
      !(state?.currentVideoId != null && q.videoId === state.currentVideoId) &&
      !(state?.currentVideoYoutubeId && (q as any).youtubeId === state.currentVideoYoutubeId)
  );
  // Display helper for who selected the current track.
  const addedByItem =
    state &&
    queue.find(
      (q) =>
        (state.currentVideoId != null && q.videoId === state.currentVideoId) ||
        (state.currentVideoYoutubeId && (q as any).youtubeId === state.currentVideoYoutubeId)
    );

  useEffect(() => {
    if (!state?.isPlaying) return;
    const iv = setInterval(() => {
      setProgress(calcProgress(state.startedAt, state.currentVideoDurationSecs));
    }, 1000);
    return () => clearInterval(iv);
  }, [state?.startedAt, state?.currentVideoDurationSecs, state?.isPlaying]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const chatMutation = useMutation({
    mutationFn: (msg: string) =>
      apiRequest("POST", `/api/jukebox/${communityId}/chat`, {
        username: "You",
        avatar: null,
        message: msg,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/jukebox/${communityId}`] }),
  });

  const sendComment = useCallback(() => {
    const msg = comment.trim();
    if (!msg) return;
    setComment("");
    chatMutation.mutate(msg);
  }, [comment, chatMutation]);

  const elapsedSecsEmbedded =
    state && state.currentVideoDurationSecs > 0
      ? Math.min(progress * state.currentVideoDurationSecs, state.currentVideoDurationSecs)
      : 0;

  return (
    <View style={jukeStyles.container}>
      <View style={jukeStyles.header}>
        <View style={jukeStyles.badge}>
          <Animated.View style={[jukeStyles.badgeDot, { transform: [{ scale: pulseAnim }] }]} />
          <Text style={jukeStyles.badgeText}>JUKEBOX</Text>
        </View>
        <View style={jukeStyles.watchersChip}>
          <Ionicons name="people" size={11} color="rgba(255,255,255,0.7)" />
          <Text style={jukeStyles.watchersText}>{state?.watchersCount ?? 0} watching</Text>
        </View>
        <Pressable style={jukeStyles.openRoomBtn} onPress={() => router.push(`/jukebox/${communityId}`)} hitSlop={6}>
          <Text style={jukeStyles.openRoomText}>Open room</Text>
          <Ionicons name="chevron-forward" size={14} color={C.accent} />
        </Pressable>
      </View>

      {state ? (
        <View style={jukeStyles.playerRow}>
          <View style={jukeStyles.thumbWrap}>
            {state.currentVideoThumbnail ? (
              <Image source={{ uri: state.currentVideoThumbnail }} style={jukeStyles.thumb} contentFit="cover" />
            ) : (
              <View style={[jukeStyles.thumb, { backgroundColor: C.surface3 }]} />
            )}
            <View style={jukeStyles.thumbOverlay} />
            <View style={jukeStyles.playCircle}>
              <Ionicons name="play" size={14} color="#fff" />
            </View>
          </View>
          <View style={jukeStyles.playerInfo}>
            <Text style={jukeStyles.nowPlayingTitle} numberOfLines={2}>
              {state.currentVideoTitle}
            </Text>
            {addedByItem && (
              <Pressable
                onPress={() =>
                  navigateToUserOrLiverProfile({
                    userId: (addedByItem as QueueItem).addedByUserId ?? null,
                    displayName: (addedByItem as QueueItem).addedByUserId ? null : addedByItem.addedBy,
                  })
                }
                hitSlop={4}
              >
                <Text style={jukeStyles.addedBy} numberOfLines={1}>
                  Added by {addedByItem.addedBy}
                </Text>
              </Pressable>
            )}
            <View style={jukeStyles.progressRow}>
              <Text style={[jukeStyles.progressTime, jukeStyles.progressTimeL]}>{fmtSecs(elapsedSecsEmbedded)}</Text>
              <View style={jukeStyles.progressTrack}>
                <View style={[jukeStyles.progressFill, { width: `${progress * 100}%` as any }]} />
              </View>
              <Text style={[jukeStyles.progressTime, jukeStyles.progressTimeR]}>{fmtSecs(state.currentVideoDurationSecs)}</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={jukeStyles.emptyPlayer}>
          <Ionicons name="musical-notes-outline" size={24} color={C.textMuted} />
          <Text style={jukeStyles.emptyText}>No video playing</Text>
        </View>
      )}

      {upcoming.length > 0 && (
        <View style={jukeStyles.upNextRow}>
          <Ionicons name="play-forward-outline" size={14} color={C.textMuted} />
          <Text style={jukeStyles.upNextText} numberOfLines={1}>
            Up next · {upcoming.length} queued
          </Text>
        </View>
      )}

      {chat.length > 0 && (
        <View style={jukeStyles.commentsWrap}>
          {chat.map((msg) => (
            <View key={msg.id} style={jukeStyles.commentRow}>
              <Pressable onPress={() => navigateToUserOrLiverProfile({ displayName: msg.username })} hitSlop={2}>
                <Text style={jukeStyles.commentUser}>{msg.username}</Text>
              </Pressable>
              <Text style={jukeStyles.commentText} numberOfLines={1}>{msg.message}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={jukeStyles.commentInput}>
        <TextInput
          style={jukeStyles.input}
          placeholder="Comment in jukebox chat…"
          placeholderTextColor={C.textMuted}
          value={comment}
          onChangeText={setComment}
          onSubmitEditing={sendComment}
          returnKeyType="send"
        />
        <Pressable
          style={[jukeStyles.sendBtn, !comment.trim() && jukeStyles.sendBtnDisabled]}
          onPress={sendComment}
        >
          <Ionicons name="send" size={14} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

type PollItem = {
  id: number;
  question: string;
  createdAt: string;
  options: { optionId: number; text: string; count: number }[];
  myVoteOptionId?: number | null;
};

/** Polls UI — not wired into community tabs yet. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PollsTab({
  communityId,
  following,
  requireAuth,
}: {
  communityId: number;
  following: boolean;
  requireAuth: (label: string) => boolean;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState(["", ""]);
  const [creating, setCreating] = useState(false);
  const [votingPollId, setVotingPollId] = useState<number | null>(null);
  const { user } = useAuth();
  const isJaUi = (user?.preferredLanguage ?? "").toLowerCase().startsWith("ja");
  const ui = isJaUi
    ? {
        missingQuestionTitle: "質問が未入力です",
        missingQuestionBody: "質問を入力してください",
        missingOptionsTitle: "選択肢が不足しています",
        missingOptionsBody: "少なくとも2つの選択肢を入力してください",
        createPollAction: "アンケート作成",
        voteAction: "投票",
        createPollFailedTitle: "アンケートを作成できませんでした",
        createPollFailedBody: "アンケートの作成に失敗しました",
        voteFailedTitle: "投票できませんでした",
        voteFailedBody: "投票に失敗しました",
        pollsTitle: "アンケート",
        newPollTitle: "新しいアンケート",
        noPollsYet: "まだアンケートはありません",
        questionLabel: "質問",
        questionPlaceholder: "アンケートの質問",
        optionsLabel: "選択肢",
        optionPlaceholder: (index: number) => `選択肢 ${index + 1}`,
        addOption: "選択肢を追加",
        create: "作成",
        newPollA11y: "新しいアンケート",
      }
    : {
        missingQuestionTitle: "Missing question",
        missingQuestionBody: "Please enter a question",
        missingOptionsTitle: "Missing options",
        missingOptionsBody: "Please enter at least 2 options",
        createPollAction: "Create Poll",
        voteAction: "Vote",
        createPollFailedTitle: "Could not create poll",
        createPollFailedBody: "Failed to create poll",
        voteFailedTitle: "Could not vote",
        voteFailedBody: "Failed to vote",
        pollsTitle: "Polls",
        newPollTitle: "New Poll",
        noPollsYet: "No polls yet",
        questionLabel: "Question",
        questionPlaceholder: "Poll question",
        optionsLabel: "Options",
        optionPlaceholder: (index: number) => `Option ${index + 1}`,
        addOption: "Add option",
        create: "Create",
        newPollA11y: "New poll",
      };

  const { data: polls = [], refetch } = useQuery<PollItem[]>({
    queryKey: [`/api/communities/${communityId}/polls`],
    enabled: communityId > 0,
  });

  async function handleCreate() {
    const q = newQuestion.trim();
    const opts = newOptions.map((o) => o.trim()).filter(Boolean);
    if (!q) {
      alertMessage(ui.missingQuestionTitle, ui.missingQuestionBody);
      return;
    }
    if (opts.length < 2) {
      alertMessage(ui.missingOptionsTitle, ui.missingOptionsBody);
      return;
    }
    if (!requireAuth(ui.createPollAction)) return;
    setCreating(true);
    try {
      await apiRequest("POST", `/api/communities/${communityId}/polls`, { question: q, options: opts });
      setShowCreate(false);
      setNewQuestion("");
      setNewOptions(["", ""]);
      refetch();
    } catch (e: any) {
      alertError(ui.createPollFailedTitle, e, ui.createPollFailedBody);
    } finally {
      setCreating(false);
    }
  }

  async function handleVote(pollId: number, optionId: number) {
    if (!requireAuth(ui.voteAction)) return;
    setVotingPollId(pollId);
    try {
      await apiRequest("POST", `/api/communities/${communityId}/polls/${pollId}/vote`, { optionId });
      refetch();
    } catch (e: any) {
      alertError(ui.voteFailedTitle, e, ui.voteFailedBody);
    } finally {
      setVotingPollId(null);
    }
  }

  const totalVotes = (poll: PollItem) => poll.options.reduce((s, o) => s + o.count, 0);

  return (
    <View style={styles.boardList}>
      <View style={styles.boardHeader}>
        <Text style={styles.boardSectionTitle}>{ui.pollsTitle}</Text>
        {following && (
          <Pressable
            style={styles.createThreadBtn}
            onPress={() => {
              if (!requireAuth(ui.createPollAction)) return;
              setShowCreate(true);
            }}
            accessibilityLabel={ui.newPollA11y}
          >
            <Ionicons name="add" size={22} color="#000" />
          </Pressable>
        )}
      </View>
      {polls.length === 0 ? (
        <Text style={styles.boardEmpty}>{ui.noPollsYet}</Text>
      ) : (
        polls.map((poll) => {
          const total = totalVotes(poll);
          return (
            <View key={poll.id} style={styles.pollCard}>
              <Text style={styles.pollQuestion}>{poll.question}</Text>
              {poll.options.map((opt) => {
                const voted = poll.myVoteOptionId === opt.optionId;
                return (
                  <Pressable
                    key={opt.optionId}
                    style={[styles.pollOption, voted && styles.pollOptionVoted]}
                    onPress={() => !voted && handleVote(poll.id, opt.optionId)}
                    disabled={votingPollId === poll.id || !!voted}
                  >
                    <View style={[styles.pollOptionBar, { width: `${total > 0 ? (opt.count / total) * 100 : 0}%` as any }]} />
                    <Text style={styles.pollOptionText}>{opt.text}</Text>
                    <Text style={styles.pollOptionCount}>{opt.count}</Text>
                    {voted && <Ionicons name="checkmark-circle" size={16} color={C.accent} />}
                  </Pressable>
                );
              })}
            </View>
          );
        })
      )}

      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.requestModalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowCreate(false)} />
          <View style={styles.requestModalSheet}>
            <View style={styles.requestModalHandle} />
            <View style={styles.requestModalHeader}>
              <Text style={styles.requestModalTitle}>{ui.newPollTitle}</Text>
              <Pressable onPress={() => setShowCreate(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={C.textMuted} />
              </Pressable>
            </View>
            <Text style={styles.requestLabel}>{ui.questionLabel}</Text>
            <TextInput
              style={styles.requestInput}
              placeholder={ui.questionPlaceholder}
              placeholderTextColor={C.textMuted}
              value={newQuestion}
              onChangeText={setNewQuestion}
            />
            <Text style={styles.requestLabel}>{ui.optionsLabel}</Text>
            {newOptions.map((o, i) => (
              <TextInput
                key={i}
                style={[styles.requestInput, { marginBottom: 8 }]}
                placeholder={ui.optionPlaceholder(i)}
                placeholderTextColor={C.textMuted}
                value={o}
                onChangeText={(t) => {
                  const next = [...newOptions];
                  next[i] = t;
                  setNewOptions(next);
                }}
              />
            ))}
            {newOptions.length < 10 && (
              <Pressable
                style={styles.pollAddOption}
                onPress={() => setNewOptions([...newOptions, ""])}
              >
                <Ionicons name="add" size={16} color={C.accent} />
                <Text style={styles.pollAddOptionText}>{ui.addOption}</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.requestSubmitBtn, creating && styles.requestSubmitBtnDisabled]}
              onPress={handleCreate}
              disabled={creating}
            >
              {creating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.requestSubmitBtnText}>{ui.create}</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ThreadDetailContent({
  thread,
  communityId,
  communityThumbnail,
  onClose,
  onReply,
  requireAuth,
  canModerate,
  onDeleteThread,
  onDeletePost,
}: {
  thread: ThreadDetail;
  communityId: number;
  /** Shown if the announcement image URL is dead. */
  communityThumbnail?: string | null;
  onClose: () => void;
  onReply: () => void;
  requireAuth: (label: string) => boolean;
  canModerate: boolean;
  onDeleteThread: () => void;
  onDeletePost: (postId: number) => void;
}) {
  const [replyText, setReplyText] = useState("");
  const [posting, setPosting] = useState(false);
  const qc = useQueryClient();
  const { user } = useAuth();
  const isJaUi = (user?.preferredLanguage ?? "").toLowerCase().startsWith("ja");
  const ui = isJaUi
    ? {
        replyAction: "返信",
        replyFailedTitle: "返信できませんでした",
        replyFailedBody: "返信の投稿に失敗しました",
        deleteThreadTitle: "スレッドを削除",
        deleteThreadBody: "このスレッドを削除しますか？",
        deleteReplyTitle: "返信を削除",
        deleteReplyBody: "この返信を削除しますか？",
        cancel: "キャンセル",
        delete: "削除",
        watchShortClip: "ショート動画を見る",
        writeReplyPlaceholder: "返信を書く...",
      }
    : {
        replyAction: "Reply",
        replyFailedTitle: "Could not post reply",
        replyFailedBody: "Failed to post reply",
        deleteThreadTitle: "Delete Thread",
        deleteThreadBody: "Delete this thread?",
        deleteReplyTitle: "Delete",
        deleteReplyBody: "Delete this reply?",
        cancel: "Cancel",
        delete: "Delete",
        watchShortClip: "Watch short clip",
        writeReplyPlaceholder: "Write a reply...",
      };
  const parsedThreadBody = parseThreadBody(thread.body);
  const shortVideoThumb =
    parsedThreadBody.shortVideoUrl != null
      ? youtubeThumbnailFromVideoUrl(parsedThreadBody.shortVideoUrl)
      : null;

  async function handlePostReply() {
    const text = replyText.trim();
    if (!text) return;
    if (!requireAuth(ui.replyAction)) return;
    setPosting(true);
    try {
      await apiRequest("POST", `/api/communities/${communityId}/threads/${thread.id}/posts`, { body: text });
      setReplyText("");
      qc.invalidateQueries({ queryKey: [`/api/communities/${communityId}/threads`] });
      qc.invalidateQueries({ queryKey: [`/api/communities/${communityId}/threads/${thread.id}`] });
      onReply();
    } catch (e: any) {
      alertError(ui.replyFailedTitle, e, ui.replyFailedBody);
    } finally {
      setPosting(false);
    }
  }

  return (
    <View style={styles.threadDetailRoot}>
      <ScrollView
        style={webScrollStyle(styles.threadDetailMainScroll)}
        contentContainerStyle={styles.threadDetailMainScrollContent}
        showsVerticalScrollIndicator={scrollShowsVertical}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.threadDetailHeader}>
          <View style={styles.threadDetailTitleRow}>
            <Text style={styles.threadDetailTitle} numberOfLines={2}>{thread.title}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {canModerate && (
                <Pressable
                  onPress={() => Alert.alert(ui.deleteThreadTitle, ui.deleteThreadBody, [
                    { text: ui.cancel, style: "cancel" },
                    { text: ui.delete, style: "destructive", onPress: onDeleteThread },
                  ])}
                >
                  <Ionicons name="trash-outline" size={20} color={C.textMuted} />
                </Pressable>
              )}
              <Pressable onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={24} color={C.textMuted} />
              </Pressable>
            </View>
          </View>
          <View style={styles.threadDetailMeta}>
            <Pressable onPress={() => navigateToUserOrLiverProfile({ userId: thread.authorUserId })} hitSlop={4}>
              <Text style={styles.threadDetailAuthor}>{thread.author.displayName}</Text>
            </Pressable>
            <Text style={styles.threadDetailDate}> · {formatThreadDate(thread.createdAt, isJaUi)}</Text>
          </View>
          {parsedThreadBody.flyerImageUrl ? (
            <EventFlyerImage
              uri={parsedThreadBody.flyerImageUrl}
              fallbackUri={communityThumbnail}
              style={styles.threadDetailFlyer}
              contentFit="contain"
              recyclingKey={`thread-flyer-${thread.id}`}
            />
          ) : null}
          {parsedThreadBody.shortVideoUrl ? (
            <Pressable
              style={styles.threadDetailShortClip}
              onPress={() => Linking.openURL(parsedThreadBody.shortVideoUrl!)}
            >
              {shortVideoThumb ? (
                <Image source={{ uri: shortVideoThumb }} style={styles.threadDetailShortThumb} contentFit="cover" />
              ) : (
                <View style={[styles.threadDetailShortThumb, styles.threadDetailShortPlaceholder]} />
              )}
              <View style={styles.threadDetailShortOverlay} pointerEvents="none">
                <Ionicons name="play-circle" size={48} color="#ffffffee" />
                <Text style={styles.threadDetailShortLabel}>{ui.watchShortClip}</Text>
              </View>
            </Pressable>
          ) : null}
          {parsedThreadBody.text ? (
            <View style={styles.threadDetailBodyWrap}>
              <AnnouncementBodyView text={parsedThreadBody.text} variant="full" />
            </View>
          ) : null}
        </View>
        {thread.posts.map((p) => (
          <View key={p.id} style={styles.threadPostRow}>
            <Pressable
              onPress={() => navigateToUserOrLiverProfile({ userId: p.authorUserId })}
              hitSlop={4}
            >
              {p.author.profileImageUrl ? (
                <Image source={{ uri: p.author.profileImageUrl }} style={styles.threadPostAvatar} contentFit="cover" />
              ) : (
                <View style={[styles.threadPostAvatar, styles.threadAvatarFallback]}>
                  <Text style={styles.threadAvatarInitial}>{(p.author.displayName ?? "?")[0]}</Text>
                </View>
              )}
            </Pressable>
            <View style={styles.threadPostBody}>
              <Text style={styles.threadPostAuthor}>{p.author.displayName}</Text>
              <Text style={styles.threadPostDate}>{formatThreadDate(p.createdAt, isJaUi)}</Text>
              <Text style={styles.threadPostText}>{p.body}</Text>
              {p.body ? <TranslateButton text={p.body} compact /> : null}
            </View>
            {canModerate && (
              <Pressable
                style={styles.threadPostDelete}
                onPress={() => Alert.alert(ui.deleteReplyTitle, ui.deleteReplyBody, [
                  { text: ui.cancel, style: "cancel" },
                  { text: ui.delete, style: "destructive", onPress: () => onDeletePost(p.id) },
                ])}
              >
                <Ionicons name="trash-outline" size={16} color={C.textMuted} />
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>
      <View style={styles.threadReplyRow}>
        <TextInput
          style={styles.threadReplyInput}
          placeholder={ui.writeReplyPlaceholder}
          placeholderTextColor={C.textMuted}
          value={replyText}
          onChangeText={setReplyText}
          multiline
        />
        <Pressable
          style={[styles.threadReplyBtn, (!replyText.trim() || posting) && styles.threadReplyBtnDisabled]}
          onPress={handlePostReply}
          disabled={!replyText.trim() || posting}
        >
          {posting ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" />}
        </Pressable>
      </View>
    </View>
  );
}

const BASE_TABS = ["Board", "Latest", "Creators"] as const;
type Tab = "Board" | "Latest" | "Creators" | "Ranking";
const BOARD_TAB_LABEL = "Community Chat";

type CommunityCreatorsResponse = {
  editors: (VideoEditor & { kind: "editor" })[];
  livers: ({ id: number; name: string; avatar: string; community: string; rank: number; heatScore: number; totalViews: number; followers: number; category: string; bio: string } & { kind: "liver" })[];
};

export default function CommunityDetailScreen() {
  const { id, tab: tabParam, openThread: openThreadParam } = useLocalSearchParams<{
    id: string;
    tab?: string;
    openThread?: string;
  }>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>("Board");
  const [following, setFollowing] = useState(false);
  const { user, requireAuth } = useAuth();
  const isJaUi = (user?.preferredLanguage ?? "").toLowerCase().startsWith("ja");
  const ui = isJaUi
    ? {
        invalidCommunity: "無効なコミュニティです",
        communityNotFound: "コミュニティが見つかりません",
        goBack: "戻る",
        viewAllMembers: "メンバー一覧を見る",
        rankingHint: "コミュニティ一覧はランキングタブで見られます。",
        eventBoard: "イベント掲示板",
        videoRanking: "動画ランキング",
        boardTabLabel: "コミュニティチャット",
        latestTab: "最新",
        creatorsTab: "クリエイター",
        rankingTab: "ランキング",
        request: "依頼",
        pinned: "固定",
        shortClip: "ショート動画",
        replies: (count: number) => (count === 1 ? "1件の返信" : `${count}件の返信`),
        officialUpdatesTitle: "公式のお知らせとフィードバック",
        officialUpdatesSub:
          "新しいお知らせにはイベント画像のスクリーンショットを使い、要望はフィードバックボックスから送ってください。",
        createFeedback: "フィードバック作成",
        openFeedbackBox: "フィードバック入力を開く",
        sendFeedback: "フィードバックを送る",
        announcementsFeedback: "お知らせとフィードバック",
        threadsTitle: "スレッド",
        boardStaffHint: "運営は ＋ から投稿できます（参加不要）。",
        noThreadsYet: "まだスレッドがありません。最初の投稿をしてみましょう。",
        staffTitle: "管理者とモデレーター",
        edit: "編集",
        adReview: "広告レビュー",
        adminPanel: "管理パネル",
        admin: "管理者",
        moderator: "モデレーター",
        deleteFailedTitle: "エラー",
        deleteFailedBody: "削除に失敗しました",
        feedbackBox: "フィードバックボックス",
        newAnnouncement: "新しいお知らせ",
        newThread: "新しいスレッド",
        feedbackTitlePlaceholder: "タイトル（任意）",
        announcementTitlePlaceholder: "タイトル 例: 4/20 live @ venue",
        threadTitlePlaceholder: "スレッドタイトル",
        feedbackBodyPlaceholder: "要望、アイデア、問題点を共有してください。",
        announcementBodyPlaceholder: "任意: 日付: …、会場: …、チケット: https://…",
        threadBodyPlaceholder: "本文（任意）",
        flyerQualityHint:
          "イベント画像のスクリーンショットだけを添付してください。本文には Date:, City:, Venue:, Lineup:, Tickets: などを明記し、チケットや地図のリンクを貼ってください。",
        remove: "削除",
        submitFeedback: "フィードバックを送信",
        postAnnouncement: "お知らせを投稿",
        createThread: "スレッドを作成",
        missingTitleTitle: "タイトルが未入力です",
        missingTitleBody: "タイトルを入力してください",
        missingFeedbackTitle: "フィードバックが未入力です",
        missingFeedbackBody: "フィードバック内容を入力してください",
        screenshotRequiredTitle: "スクリーンショットが必要です",
        screenshotRequiredBody:
          "お知らせにはイベントのスクリーンショットが必要です。チケットアプリ、カレンダー、ポスターなどを追加してください。",
        createThreadFailedTitle: "スレッドを作成できませんでした",
        createThreadFailedBody: "スレッドの作成に失敗しました",
        manageStaff: "スタッフ管理",
        saveStaffFailedTitle: "スタッフを保存できませんでした",
        saveStaffFailedBody: "保存に失敗しました",
        screenshotLabel: "スクリーンショット",
        screenshotUnderLimit: "スクリーンショットは15MB未満にしてください",
        imageVerifyFailed: "画像を確認できませんでした。",
        uploadFailedTitle: "アップロードに失敗しました",
        permissionRequiredTitle: "権限が必要です",
        photosPermissionBody: "スクリーンショットをアップロードするには写真へのアクセスを許可してください。",
        cameraPermissionBody:
          "印刷物を撮影する場合はカメラへのアクセスを許可してください。スクリーンショットを使う場合は写真から追加してください。",
        comingSoonTitle: "近日対応",
        comingSoonBody: "no-confidence motion 機能は近日公開予定です。",
        submit: "送信",
        requestSentTitle: "送信しました",
        requestSentBody: "依頼を送信しました！",
        requestFailedTitle: "依頼に失敗しました",
        requestFailedBody: "依頼の送信に失敗しました。時間をおいて再度お試しください。",
        requestEditorTitle: (name: string) => `${name} に依頼`,
        requestTitleLabel: "依頼タイトル",
        requestTitlePlaceholder: "例: 毎週の配信ハイライト編集",
        descriptionLabel: "説明",
        requestDescriptionPlaceholder: "スタイル、長さ、トーン、参考リンクなどを書いてください。",
        pricingModel: "料金モデル",
        perMinute: "分単価",
        revenueShare: "レベニューシェア",
        targetBudget: "目標予算 (🎟 / 分)",
        targetRevShare: "希望レベニューシェア (%)",
        ticketHint: `1 Ticket = $${PRICE_PER_TICKET_USD.toFixed(2)} USD（Ticket Shop と同じ）`,
        budgetPlaceholderPerMinute: "例: 150",
        budgetPlaceholderRevenueShare: "例: 40",
        deadline: "締切",
        deadlinePlaceholder: "例: 3月末までに初稿",
        sending: "送信中...",
        sendRequest: "依頼を送る",
        adminModeratorsTitle: "管理者とモデレーター",
        staffModalHint: "メンバーから選択してください。コミュニティをフォローしているユーザーが表示されます。",
        noMembersYet: "まだメンバーがいません",
        noMembersYetSub: "コミュニティをフォローしたメンバーがここに表示されます",
        adminSingle: "管理者（1名）",
        moderatorsMultiple: "モデレーター（複数可）",
        uploadScreenshotFile: "スクリーンショットをアップロード",
        uploading: "アップロード中...",
        fromPhotos: "写真から選ぶ",
        takePhoto: "写真を撮る",
        deliveryDays: (days: number) => `納期: ${days}日`,
        tbd: "要相談",
      }
    : {
        invalidCommunity: "Invalid community",
        communityNotFound: "Community not found",
        goBack: "Go back",
        viewAllMembers: "View all members",
        rankingHint: "Community list is available in the Ranking tab.",
        eventBoard: "Event board",
        videoRanking: "Video Ranking",
        boardTabLabel: "Community Chat",
        latestTab: "Latest",
        creatorsTab: "Creators",
        rankingTab: "Ranking",
        request: "Request",
        pinned: "Pinned",
        shortClip: "Short clip",
        replies: (count: number) => (count === 1 ? "1 reply" : `${count} replies`),
        officialUpdatesTitle: "Official updates and feedback",
        officialUpdatesSub:
          "New announcements use an event screenshot, and requests should be sent through the feedback box.",
        createFeedback: "Create feedback",
        openFeedbackBox: "Open feedback box",
        sendFeedback: "Send feedback",
        announcementsFeedback: "Announcements & Feedback",
        threadsTitle: "Threads",
        boardStaffHint: "Staff: tap ＋ to compose (join not required).",
        noThreadsYet: "No threads yet. Start the conversation.",
        staffTitle: "Admin & moderators",
        edit: "Edit",
        adReview: "Ad Review",
        adminPanel: "Admin Panel",
        admin: "Admin",
        moderator: "Moderator",
        deleteFailedTitle: "Error",
        deleteFailedBody: "Failed to delete",
        feedbackBox: "Feedback Box",
        newAnnouncement: "New announcement",
        newThread: "New thread",
        feedbackTitlePlaceholder: "Title (optional)",
        announcementTitlePlaceholder: "Title — e.g. Apr 20 live @ venue",
        threadTitlePlaceholder: "Thread title",
        feedbackBodyPlaceholder: "Share your request, idea, or issue.",
        announcementBodyPlaceholder: "Optional: Date: …, Venue: …, Tickets: https://…",
        threadBodyPlaceholder: "Body (optional)",
        flyerQualityHint:
          "Use the image buttons for an event screenshot only. In the text box, add lines like Date:, City:, Venue:, Lineup:, Tickets: and paste ticket or map links.",
        remove: "Remove",
        submitFeedback: "Submit feedback",
        postAnnouncement: "Post announcement",
        createThread: "Create thread",
        missingTitleTitle: "Missing title",
        missingTitleBody: "Please enter a title",
        missingFeedbackTitle: "Missing feedback",
        missingFeedbackBody: "Please enter your feedback",
        screenshotRequiredTitle: "Screenshot required",
        screenshotRequiredBody:
          "Announcements require an event screenshot. Capture the ticket app, calendar, or poster, then add it from Photos.",
        createThreadFailedTitle: "Could not create thread",
        createThreadFailedBody: "Failed to create thread",
        manageStaff: "Manage Staff",
        saveStaffFailedTitle: "Could not save staff",
        saveStaffFailedBody: "Failed to save",
        screenshotLabel: "Screenshot",
        screenshotUnderLimit: "Screenshot must be under 15MB",
        imageVerifyFailed: "Could not verify the image.",
        uploadFailedTitle: "Upload failed",
        permissionRequiredTitle: "Permission required",
        photosPermissionBody: "Allow Photos access to upload your screenshot.",
        cameraPermissionBody:
          "Allow camera access if you are photographing a printed poster instead of uploading a screen capture.",
        comingSoonTitle: "Coming Soon",
        comingSoonBody: "The no-confidence motion feature will be available soon.",
        submit: "Submit",
        requestSentTitle: "Sent",
        requestSentBody: "Your request has been sent!",
        requestFailedTitle: "Request failed",
        requestFailedBody: "Failed to send request. Please try again later.",
        requestEditorTitle: (name: string) => `Request ${name}`,
        requestTitleLabel: "Request Title",
        requestTitlePlaceholder: "e.g. Weekly gaming stream highlight edit",
        descriptionLabel: "Description",
        requestDescriptionPlaceholder: "Describe the style, length, tone, and any reference links.",
        pricingModel: "Pricing Model",
        perMinute: "Per minute",
        revenueShare: "Revenue share",
        targetBudget: "Target budget (🎟 / min)",
        targetRevShare: "Target rev share (%)",
        ticketHint: `1 Ticket = $${PRICE_PER_TICKET_USD.toFixed(2)} USD (same as Ticket Shop)`,
        budgetPlaceholderPerMinute: "e.g. 150",
        budgetPlaceholderRevenueShare: "e.g. 40",
        deadline: "Deadline",
        deadlinePlaceholder: "e.g. First delivery by end of March",
        sending: "Sending...",
        sendRequest: "Send Request",
        adminModeratorsTitle: "Admin & Moderators",
        staffModalHint: "Select from members. Users who follow the community appear here.",
        noMembersYet: "No members yet",
        noMembersYetSub: "Members who follow the community will appear here",
        adminSingle: "Admin (1 person)",
        moderatorsMultiple: "Moderators (multiple allowed)",
        uploadScreenshotFile: "Upload screenshot file",
        uploading: "Uploading...",
        fromPhotos: "From Photos",
        takePhoto: "Take photo",
        deliveryDays: (days: number) => `Delivery: ${days}d`,
        tbd: "TBD",
      };
  const { isDemoMode } = useDemoMode();
  const numericId = Number(id);

  const { data: apiCommunity, isLoading: communityLoading } = useQuery<any>({
    queryKey: [`/api/communities/${numericId}`],
    enabled: !Number.isNaN(numericId),
  });

  const communityId = numericId;
  const bottomInset = Platform.OS === "web" ? 34 : 0;
  const isOfficialCommunity = !!apiCommunity?.isOfficial;
  const announceBoard = isOfficialCommunity;
  const tabs = isOfficialCommunity ? (["Board", "Ranking"] as const) : BASE_TABS;

  type StaffData = {
    adminId: number | null;
    admin: { id: number; displayName: string; profileImageUrl: string | null } | null;
    moderatorIds: number[];
    moderators: { id: number; displayName: string; profileImageUrl: string | null }[];
  };
  type MemberItem = { id: number; displayName: string; profileImageUrl: string | null };

  const { data: meMemberData } = useQuery<{ isMember: boolean }>({
    queryKey: [`/api/communities/${communityId}/members/me`],
    enabled: !!user?.id && communityId > 0,
  });
  useEffect(() => {
    if (meMemberData?.isMember !== undefined) setFollowing(meMemberData.isMember);
  }, [meMemberData?.isMember]);

  useEffect(() => {
    const t = (tabParam ?? "").trim().toLowerCase();
    if (t === "board") setActiveTab("Board");
    else if (t === "latest") setActiveTab("Latest");
    else if (t === "creators") setActiveTab("Creators");
    else if (t === "ranking") setActiveTab("Ranking");
  }, [tabParam]);

  useEffect(() => {
    if (isOfficialCommunity && activeTab === "Latest") setActiveTab("Ranking");
    if (isOfficialCommunity && activeTab === "Creators") setActiveTab("Ranking");
  }, [isOfficialCommunity, activeTab]);

  const consumedOpenThreadKey = useRef<string | null>(null);
  useEffect(() => {
    if (activeTab !== "Board" || !openThreadParam) return;
    const key = `${communityId}:${openThreadParam}`;
    if (consumedOpenThreadKey.current === key) return;
    const n = parseInt(String(openThreadParam), 10);
    if (!Number.isFinite(n) || n <= 0) return;
    consumedOpenThreadKey.current = key;
    setSelectedThreadId(n);
  }, [openThreadParam, activeTab, communityId]);
  const [requestEditor, setRequestEditor] = useState<VideoEditor | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [showCreateThread, setShowCreateThread] = useState(false);
  const [threadComposerMode, setThreadComposerMode] = useState<"thread" | "announcement" | "feedback">(
    "thread",
  );
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadBody, setNewThreadBody] = useState("");
  const [announcementScreenshotUrl, setAnnouncementScreenshotUrl] = useState<string | null>(null);
  const [uploadingAnnouncementScreenshot, setUploadingAnnouncementScreenshot] = useState(false);
  const [creatingThread, setCreatingThread] = useState(false);
  const [requestTitle, setRequestTitle] = useState("");
  const [requestDescription, setRequestDescription] = useState("");
  const [requestPriceType, setRequestPriceType] = useState<"per_minute" | "revenue_share">("per_minute");
  const [requestBudget, setRequestBudget] = useState("");
  const [requestDeadline, setRequestDeadline] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);

  const { data: staffData } = useQuery<StaffData>({
    queryKey: [`/api/communities/${communityId}/staff`],
    enabled: communityId > 0,
  });
  const [staffModalVisible, setStaffModalVisible] = useState(false);
  const { data: members = [], isLoading: membersLoading } = useQuery<MemberItem[]>({
    queryKey: [`/api/communities/${communityId}/members`],
    enabled: staffModalVisible,
  });
  const [selectedAdminId, setSelectedAdminId] = useState<number | null>(null);
  const [selectedModeratorIds, setSelectedModeratorIds] = useState<number[]>([]);
  const [savingStaff, setSavingStaff] = useState(false);
  const [showNoConfidenceForm, setShowNoConfidenceForm] = useState(false);
  const [noConfidenceReason, setNoConfidenceReason] = useState("");
  const qc = useQueryClient();
  const isCommunityAdmin = !!staffData?.adminId && user?.id === staffData.adminId;
  const isModerator = staffData?.moderatorIds?.includes(user?.id ?? 0) ?? false;
  const isPlatformAdmin = (user?.role ?? "").toUpperCase() === "ADMIN";
  /** Official hubs have open posting UX (auth required at submit), others keep member/staff gating. */
  const canPostToBoard = isOfficialCommunity || following || isCommunityAdmin || isModerator || isPlatformAdmin;

  const { data: creatorsData, isLoading: creatorsLoading } = useQuery<CommunityCreatorsResponse>({
    queryKey: [`/api/communities/${communityId}/creators`],
    enabled: communityId > 0,
  });

  const creatorsEditors = creatorsData?.editors ?? [];
  const creatorsLivers = creatorsData?.livers ?? [];

  const { data: apiVideos = [] } = useQuery<any[]>({
    queryKey: ["/api/videos"],
  });
  const { data: allCommunities = [] } = useQuery<any[]>({
    queryKey: ["/api/communities"],
    enabled: isOfficialCommunity,
  });
  const { data: rankedVideos = [] } = useQuery<any[]>({
    queryKey: ["/api/videos/ranked", communityId],
    enabled: communityId > 0,
  });
  const { data: activeAds = [] } = useQuery<ActiveCommunityAd[]>({
    queryKey: [`/api/communities/${communityId}/ads/active`],
    enabled: communityId > 0,
  });

  const { data: threads = [], refetch: refetchThreads } = useQuery<ThreadItem[]>({
    queryKey: [`/api/communities/${communityId}/threads`],
    enabled: activeTab === "Board" && communityId > 0,
    refetchInterval: activeTab === "Board" ? 30000 : false,
  });
  const displayThreads = useMemo(() => {
    if (!announceBoard) return threads;
    return [...threads].sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [threads, announceBoard]);
  const { data: threadDetail, refetch: refetchThreadDetail } = useQuery<ThreadDetail>({
    queryKey: [`/api/communities/${communityId}/threads/${selectedThreadId}`],
    enabled: !!selectedThreadId && communityId > 0,
    refetchInterval: !!selectedThreadId ? 15000 : false,
  });

  const timelineVideos = useMemo(() => {
    const videos = apiVideos as any[];
    if (isOfficialCommunity) {
      const selfId = Number(communityId);
      const category = String(apiCommunity?.category ?? "").trim().toLowerCase();
      const childIds = new Set(
        (allCommunities as any[])
          .filter((c) => !c.isOfficial)
          .filter((c) => {
            const cc = String(c.category ?? "").trim().toLowerCase();
            return cc.includes(category) || category.includes(cc);
          })
          .map((c) => Number(c.id))
          .filter((n) => Number.isFinite(n) && n > 0),
      );
      // Official Station direct posts must always be included.
      // Child-community aggregation remains additive when available.
      return videos
        .filter((v) => v.visibility === "community")
        .filter((v) => Number(v.communityId) === selfId || childIds.has(Number(v.communityId)))
        .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    }
    const name = apiCommunity?.name;
    if (!name) return [];
    return videos.filter((v) => v.community === name);
  }, [apiVideos, apiCommunity?.name, apiCommunity?.category, isOfficialCommunity, allCommunities]);
  const communityRankedVideos = useMemo(() => {
    if (isOfficialCommunity) {
      const selfId = Number(communityId);
      const category = String(apiCommunity?.category ?? "").trim().toLowerCase();
      const childIds = new Set(
        (allCommunities as any[])
          .filter((c) => !c.isOfficial)
          .filter((c) => {
            const cc = String(c.category ?? "").trim().toLowerCase();
            return cc.includes(category) || category.includes(cc);
          })
          .map((c) => Number(c.id))
          .filter((n) => Number.isFinite(n) && n > 0),
      );
      const rankedByChildren = (rankedVideos as any[])
        .filter((v) => Number(v.communityId) === selfId || childIds.has(Number(v.communityId)))
        .sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
      if (rankedByChildren.length > 0) return rankedByChildren;
      return [...timelineVideos].sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    }
    const name = apiCommunity?.name;
    if (!name) return [];
    const byCommunity = (rankedVideos as any[]).filter((v) => v.community === name);
    if (byCommunity.length > 0) return byCommunity;
    return [...timelineVideos].sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
  }, [rankedVideos, timelineVideos, apiCommunity?.name, apiCommunity?.category, isOfficialCommunity, allCommunities]);
  const childCommunities = useMemo(() => {
    if (!isOfficialCommunity) return [] as any[];
    const category = String(apiCommunity?.category ?? "").trim().toLowerCase();
    if (!category) return [] as any[];
    return (allCommunities as any[])
      .filter((c) => !c.isOfficial)
      .filter((c) => {
        const cc = String(c.category ?? "").trim().toLowerCase();
        return cc.includes(category) || category.includes(cc);
      })
      .sort((a, b) => (b.members ?? 0) - (a.members ?? 0));
  }, [isOfficialCommunity, apiCommunity?.category, allCommunities]);

  const createThreadMutation = useMutation({
    mutationFn: async () => {
      const title =
        newThreadTitle.trim() ||
        (threadComposerMode === "feedback" ? "Feedback" : "");
      const text = newThreadBody.trim();
      const shot = announcementScreenshotUrl?.trim() ?? "";
      const body = shot ? (text ? `FLYER_IMAGE: ${shot}\n\n${text}` : `FLYER_IMAGE: ${shot}`) : text;
      const res = await apiRequest("POST", `/api/communities/${communityId}/threads`, {
        title,
        body,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setShowCreateThread(false);
      setNewThreadTitle("");
      setNewThreadBody("");
      setAnnouncementScreenshotUrl(null);
      refetchThreads();
      setSelectedThreadId(data.id);
    },
  });

  function openDefaultThreadComposer() {
    setThreadComposerMode(isOfficialCommunity ? "announcement" : "thread");
    setShowCreateThread(true);
  }

  function openFeedbackComposer() {
    setThreadComposerMode("feedback");
    setNewThreadTitle("");
    setNewThreadBody("");
    setAnnouncementScreenshotUrl(null);
    setShowCreateThread(true);
  }

  function closeCreateThreadModal() {
    setShowCreateThread(false);
    setThreadComposerMode(isOfficialCommunity ? "announcement" : "thread");
    setNewThreadTitle("");
    setNewThreadBody("");
    setAnnouncementScreenshotUrl(null);
  }

  async function pickAnnouncementScreenshotWeb() {
    if (!requireAuth(ui.createThread)) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp,image/gif";
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (file.size > MAX_ANNOUNCEMENT_SCREENSHOT_BYTES) {
        Alert.alert("", ui.screenshotUnderLimit);
        return;
      }
      try {
        const { width, height } = await readImageDimensionsFromFileWeb(file);
        assertAnnouncementScreenshotResolutionOk(width, height);
      } catch (err: unknown) {
        Alert.alert(
          ui.screenshotLabel,
          err instanceof Error ? err.message : ui.imageVerifyFailed,
        );
        return;
      }
      try {
        setUploadingAnnouncementScreenshot(true);
        const mime =
          file.type && /^image\/(jpeg|png|webp|gif)$/i.test(file.type) ? file.type : "image/jpeg";
        const name = (file.name || "event-screenshot.jpg").replace(/[^\w.-]/g, "_");
        const url = await uploadImageBlobToR2(file, name, mime);
        setAnnouncementScreenshotUrl(url);
      } catch (err: unknown) {
        Alert.alert(ui.uploadFailedTitle, formatUserFacingApiError(err));
      } finally {
        setUploadingAnnouncementScreenshot(false);
      }
    };
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  async function uploadNativeAnnouncementScreenshot(asset: ImagePickerAsset) {
    try {
      let w = typeof asset.width === "number" ? asset.width : 0;
      let h = typeof asset.height === "number" ? asset.height : 0;
      if (!w || !h) {
        const d = await readImageDimensionsFromUri(asset.uri);
        w = d.width;
        h = d.height;
      }
      assertAnnouncementScreenshotResolutionOk(w, h);
    } catch (err: unknown) {
      Alert.alert(
        ui.screenshotLabel,
        err instanceof Error ? err.message : ui.imageVerifyFailed,
      );
      return;
    }
    try {
      setUploadingAnnouncementScreenshot(true);
      const mime = asset.mimeType ?? "image/jpeg";
      const name = asset.fileName ?? "event-screenshot.jpg";
      const blob = await (await fetch(asset.uri)).blob();
      if (blob.size > MAX_ANNOUNCEMENT_SCREENSHOT_BYTES) {
        Alert.alert("", ui.screenshotUnderLimit);
        return;
      }
      const url = await uploadImageBlobToR2(blob, name.replace(/[^\w.-]/g, "_"), mime);
      setAnnouncementScreenshotUrl(url);
    } catch (err: unknown) {
      Alert.alert(ui.uploadFailedTitle, formatUserFacingApiError(err));
    } finally {
      setUploadingAnnouncementScreenshot(false);
    }
  }

  async function pickAnnouncementScreenshotFromLibrary() {
    if (!requireAuth(ui.createThread)) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(ui.permissionRequiredTitle, ui.photosPermissionBody);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;
    await uploadNativeAnnouncementScreenshot(result.assets[0]);
  }

  async function pickAnnouncementScreenshotFromCamera() {
    if (!requireAuth(ui.createThread)) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(ui.permissionRequiredTitle, ui.cameraPermissionBody);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.92,
    });
    if (result.canceled || !result.assets[0]) return;
    await uploadNativeAnnouncementScreenshot(result.assets[0]);
  }

  async function handleCreateThread() {
    if (!newThreadTitle.trim() && threadComposerMode !== "feedback") {
      alertMessage(ui.missingTitleTitle, ui.missingTitleBody);
      return;
    }
    if (threadComposerMode === "feedback" && !newThreadBody.trim()) {
      alertMessage(ui.missingFeedbackTitle, ui.missingFeedbackBody);
      return;
    }
    if (threadComposerMode === "announcement" && !announcementScreenshotUrl?.trim()) {
      alertMessage(ui.screenshotRequiredTitle, ui.screenshotRequiredBody);
      return;
    }
    if (!requireAuth(ui.createThread)) return;
    setCreatingThread(true);
    try {
      await createThreadMutation.mutateAsync();
    } catch (e: any) {
      alertError(ui.createThreadFailedTitle, e, ui.createThreadFailedBody);
    } finally {
      setCreatingThread(false);
    }
  }

  const openRequestModal = (editor: VideoEditor) => {
    setRequestEditor(editor);
    setRequestTitle("");
    setRequestDescription("");
    setRequestPriceType("per_minute");
    setRequestBudget("");
    setRequestDeadline("");
  };

  const closeRequestModal = () => {
    if (sendingRequest) return;
    setRequestEditor(null);
  };

  const saveStaff = async () => {
    if (!requireAuth(ui.manageStaff) || !isCommunityAdmin) return;
    setSavingStaff(true);
    try {
      await apiRequest("PATCH", `/api/communities/${communityId}/staff`, {
        adminId: selectedAdminId,
        moderatorIds: selectedModeratorIds,
      });
      qc.invalidateQueries({ queryKey: [`/api/communities/${communityId}/staff`] });
      setStaffModalVisible(false);
    } catch (e: any) {
      alertError(ui.saveStaffFailedTitle, e, ui.saveStaffFailedBody);
    } finally {
      setSavingStaff(false);
    }
  };

  const toggleModerator = (userId: number) => {
    setSelectedModeratorIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSendRequest = async () => {
    if (!requestEditor) return;
    const title = requestTitle.trim();
    const description = requestDescription.trim();
    if (!title || !description) {
      alertMessage("Missing fields", "Please enter a title and description.");
      return;
    }

    const budgetNumber = requestBudget ? Number(requestBudget.replace(/[^0-9]/g, "")) : undefined;

    setSendingRequest(true);
    try {
      await apiRequest("POST", `/api/editors/${requestEditor.id}/request`, {
        requesterName: user?.displayName ?? undefined,
        title,
        description,
        priceType: requestPriceType,
        budget: budgetNumber,
        deadline: requestDeadline.trim() || undefined,
      });
      alertMessage(ui.requestSentTitle, ui.requestSentBody);
      setRequestEditor(null);
    } catch (e: any) {
      console.error(e);
      alertError(ui.requestFailedTitle, e, ui.requestFailedBody);
    } finally {
      setSendingRequest(false);
    }
  };

  const idInvalid = !id || Number.isNaN(numericId) || numericId <= 0;
  if (idInvalid) {
    return (
      <View style={[styles.container, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 24, paddingHorizontal: 20 }]}>
        <Text style={{ color: C.text, fontSize: 16, fontWeight: "700" }}>{ui.invalidCommunity}</Text>
        <Pressable style={{ marginTop: 16 }} onPress={() => router.back()}>
          <Text style={{ color: C.accent, fontWeight: "600" }}>{ui.goBack}</Text>
        </Pressable>
      </View>
    );
  }
  if (communityLoading) {
    return (
      <View style={[styles.container, { flex: 1, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }
  if (!apiCommunity) {
    return (
      <View style={[styles.container, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 24, paddingHorizontal: 20 }]}>
        <Text style={{ color: C.text, fontSize: 16, fontWeight: "700" }}>{ui.communityNotFound}</Text>
        <Pressable style={{ marginTop: 16 }} onPress={() => router.back()}>
          <Text style={{ color: C.accent, fontWeight: "600" }}>{ui.goBack}</Text>
        </Pressable>
      </View>
    );
  }

  const community = apiCommunity;
  const ad = getAd(community.name ?? "");
  const activeAd = activeAds[0] ?? null;
  const compactOfficialBoard = isOfficialCommunity && activeTab === "Board";

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <ScrollView style={webScrollStyle(styles.scroll)} showsVerticalScrollIndicator={scrollShowsVertical}>
        <View style={styles.coverContainer}>
          <Image source={{ uri: community.thumbnail }} style={styles.coverImage} contentFit="cover" />
          <View style={styles.coverOverlay} />
          <View style={[styles.coverHeader, { top: (Platform.OS === "web" ? 67 : insets.top) + 12 }]}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
            <AppLogo height={36} />
          </View>
        </View>

        {!compactOfficialBoard && (
        <View style={styles.promoRow}>
          <Pressable
            style={[styles.adBanner, styles.adBannerFlex, { backgroundColor: activeAd ? C.surface : ad.bg }]}
            onPress={() => {
              const target = activeAd?.linkUrl?.trim() || TEMP_BANNER_TARGET_URL;
              if (/^https?:\/\//i.test(target)) void Linking.openURL(target);
            }}
          >
            <View style={styles.adPrBadge}>
              <Text style={styles.adPrText}>PR</Text>
            </View>
            <Image source={{ uri: activeAd?.bannerUrl?.trim() || ad.thumb }} style={styles.adThumb} contentFit="cover" />
            <View style={styles.adBody}>
              <Text style={styles.adTitle} numberOfLines={1}>{activeAd?.companyName?.trim() || ad.title}</Text>
              <Text style={styles.adSub} numberOfLines={1}>{activeAd ? "Sponsored" : ad.sub}</Text>
            </View>
            <View style={[styles.adCtaBtn, { backgroundColor: activeAd ? C.accent : ad.accent }]}>
              <Text style={styles.adCtaText}>{activeAd ? "Visit" : ad.cta}</Text>
            </View>
          </Pressable>
          <Pressable
            style={styles.placeAdSideBtn}
            onPress={() => {
              if (!requireAuth("Ad Placement")) return;
              router.push(`/community/ad-apply?communityId=${communityId}`);
            }}
          >
            <Ionicons name="megaphone-outline" size={20} color="#fff" />
            <Text style={styles.placeAdSideText}>Place{"\n"}Ad</Text>
          </Pressable>
        </View>
        )}

        {!compactOfficialBoard && (
        <View style={[styles.profileSection, styles.profileSectionTight]}>
          <View style={styles.profileRow}>
            <View style={styles.communityAvatarContainer}>
              <Image
                source={{ uri: community.iconUrl?.trim() || community.thumbnail }}
                style={styles.communityAvatar}
                contentFit="cover"
              />
              {community.online && <View style={styles.onlineDot} />}
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.communityName} numberOfLines={2}>{community.name}</Text>
                {isOfficialCommunity ? (
                  <View style={styles.officialBadge}>
                    <Text style={styles.officialText}>OFFICIAL</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.categoryText}>{community.category}</Text>
            </View>
            {!isOfficialCommunity ? (
              <Pressable
                style={[styles.followBtnChip, following && styles.followBtnChipActive]}
                onPress={async () => {
                  if (following) {
                    setFollowing(false);
                    return;
                  }
                  if (!requireAuth("Follow")) return;
                  try {
                    await apiRequest("POST", `/api/communities/${communityId}/join`);
                    setFollowing(true);
                    qc.invalidateQueries({ queryKey: [`/api/communities/${communityId}/members`] });
                  } catch {
                    setFollowing(true);
                  }
                }}
                hitSlop={6}
              >
                <Ionicons
                  name={following ? "checkmark" : "add"}
                  size={14}
                  color={following ? C.textSec : "#fff"}
                />
                <Text style={[styles.followBtnChipText, following && styles.followBtnChipTextActive]}>
                  {following ? "Following" : "Follow"}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.statsRow}>
            <Text style={styles.statText}>
              <Text style={styles.statNumber}>
                {isOfficialCommunity ? childCommunities.length : ((community.members ?? 0) / 1000).toFixed(0)}
              </Text>
              {" "}{isOfficialCommunity ? "communities" : "followers"}
            </Text>
            <Text style={styles.statDivider}>·</Text>
            <Text style={styles.statText}>
              <Text style={styles.statNumber}>2</Text>
              {" "}creators
            </Text>
          </View>
          {isOfficialCommunity && activeTab !== "Board" ? (
            <View style={styles.childCommunitiesBox}>
              <View style={styles.childCommunitiesHead}>
                <Ionicons name="layers-outline" size={13} color={C.accent} />
                <Text style={styles.membersLinkText}>Communities</Text>
              </View>
              {childCommunities.length === 0 ? (
                <Text style={styles.childCommunitiesEmpty}>No linked communities yet</Text>
              ) : (
                childCommunities.slice(0, 8).map((c) => (
                  <Pressable
                    key={`child-community-${c.id}`}
                    style={styles.childCommunityRow}
                    onPress={() => router.push(`/community/${c.id}`)}
                  >
                    <Text style={styles.childCommunityName} numberOfLines={1}>{c.name}</Text>
                    <Ionicons name="chevron-forward" size={12} color={C.textMuted} />
                  </Pressable>
                ))
              )}
            </View>
          ) : !isOfficialCommunity ? (
            <Pressable
              style={styles.membersLink}
              onPress={() => router.push(`/community/members/${communityId}`)}
              hitSlop={6}
            >
              <Ionicons name="people-outline" size={13} color={C.accent} />
              <Text style={styles.membersLinkText}>{ui.viewAllMembers}</Text>
              <Ionicons name="chevron-forward" size={13} color={C.textMuted} />
            </Pressable>
          ) : (
            <View style={styles.stationBoardHintRow}>
              <Ionicons name="layers-outline" size={12} color={C.textMuted} />
              <Text style={styles.stationBoardHintText}>{ui.rankingHint}</Text>
            </View>
          )}

        </View>
        )}

        {!compactOfficialBoard && (
          <EmbeddedJukebox communityId={communityId} />
        )}

        <View style={styles.tabRow}>
          {tabs.map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === "Board"
                  ? (isOfficialCommunity ? ui.eventBoard : ui.boardTabLabel)
                  : tab === "Ranking"
                    ? ui.videoRanking
                    : tab === "Latest"
                      ? ui.latestTab
                      : ui.creatorsTab}
              </Text>
            </Pressable>
          ))}
        </View>

        {(activeTab === "Latest" || activeTab === "Ranking") && (
          <View>
            {(activeTab === "Ranking" ? communityRankedVideos : timelineVideos).map((video: any, idx: number) => (
              <Pressable
                key={video.id}
                style={styles.postCard}
                onPress={() =>
                  router.push(
                    isDemoMode
                      ? (`/video/${video.id}?demo=1` as any)
                      : (`/video/${video.id}` as any),
                  )
                }
              >
                <View style={styles.postHeader}>
                  <Pressable
                    style={styles.postCreatorPressable}
                    onPress={(e) => {
                      e.stopPropagation();
                      navigateFromVideoCreatorRow(video as any);
                    }}
                  >
                    <Image source={{ uri: video.avatar }} style={styles.postAvatar} contentFit="cover" />
                    <View style={styles.postMeta}>
                      <Text style={styles.postCreator}>{video.creator}</Text>
                      <Text style={styles.postTime}>{video.timeAgo}</Text>
                    </View>
                  </Pressable>
                  {video.price && (
                    <View style={styles.pricePill}>
                      <Text style={styles.pricePillText}>🎟{video.price}</Text>
                    </View>
                  )}
                </View>
                <Image source={{ uri: video.thumbnail }} style={styles.postImage} contentFit="cover" />
                <Text style={styles.postTitle} numberOfLines={1}>{video.title}</Text>
                {activeTab === "Ranking" ? (
                  <View style={styles.rankMiniBadge}>
                    <Text style={styles.rankMiniBadgeText}>#{idx + 1}</Text>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        )}

        {activeTab === "Creators" && !isOfficialCommunity && (
          <View style={styles.editorTab}>
            {creatorsLoading && creatorsEditors.length === 0 && creatorsLivers.length === 0 ? (
              <Text style={styles.editorEmptyText}>Loading...</Text>
            ) : creatorsEditors.length === 0 && creatorsLivers.length === 0 ? (
              <Text style={styles.editorEmptyText}>No creators registered in this community yet</Text>
            ) : (
              <>
                {creatorsLivers.length > 0 && (
                  <>
                    <Text style={styles.editorSectionTitle}>Creators</Text>
                    <View style={styles.editorList}>
                      {creatorsLivers.map((liver) => (
                        <Pressable
                          key={`liver-${liver.id}`}
                          style={styles.editorCard}
                          onPress={() => router.push(`/livers/${liver.id}`)}
                        >
                          <Image source={{ uri: liver.avatar }} style={styles.editorAvatar} contentFit="cover" />
                          <View style={styles.editorBody}>
                            <Text style={styles.editorName} numberOfLines={1}>{liver.name}</Text>
                            <View style={styles.editorMetaRow}>
                              <Text style={styles.editorMetaText}>Followers {liver.followers.toLocaleString()}</Text>
                              <Text style={styles.editorMetaText}>Views {liver.totalViews.toLocaleString()}</Text>
                            </View>
                            {liver.bio ? <Text style={styles.editorGenreText} numberOfLines={2}>{liver.bio}</Text> : null}
                          </View>
                          <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}
                {creatorsEditors.length > 0 && (
                  <>
                    <Text style={styles.editorSectionTitle}>Video Editors</Text>
                    <View style={styles.editorList}>
                      {creatorsEditors.map((editor) => {
                        const genres = editor.genres.split(",").map((g) => g.trim()).filter(Boolean);
                        return (
                          <View key={editor.id} style={styles.editorCard}>
                            <Pressable
                              onPress={() =>
                                navigateToUserOrLiverProfile({
                                  userId: editor.userId ?? null,
                                  displayName: editor.userId ? null : editor.name,
                                })
                              }
                              hitSlop={4}
                            >
                              <Image source={{ uri: editor.avatar }} style={styles.editorAvatar} contentFit="cover" />
                            </Pressable>
                            <View style={styles.editorBody}>
                              <View style={styles.editorHeaderRow}>
                                <Text style={styles.editorName} numberOfLines={1}>{editor.name}</Text>
                                <View style={[styles.editorAvailabilityBadge, editor.isAvailable ? styles.editorAvailable : styles.editorMaybe]}>
                                  <Text style={[styles.editorAvailabilityText, editor.isAvailable ? styles.editorAvailableText : styles.editorMaybeText]}>
                                    {editor.isAvailable ? "Available" : "Inquire"}
                                  </Text>
                                </View>
                              </View>
                              <View style={styles.editorRatingRow}>
                                <Ionicons name="star" size={12} color={C.orange} />
                                <Text style={styles.editorRatingText}>{editor.rating.toFixed(1)}</Text>
                                <Text style={styles.editorReviewText}>({editor.reviewCount})</Text>
                              </View>
                              {genres.length > 0 && (
                                <View style={styles.editorGenresRow}>
                                  {genres.slice(0, 3).map((g) => (
                                    <View key={g} style={styles.editorGenreTag}>
                                      <Text style={styles.editorGenreTagText}>{g}</Text>
                                    </View>
                                  ))}
                                </View>
                              )}
                              <View style={styles.editorMetaRow}>
                                <Text style={styles.editorMetaText}>{ui.deliveryDays(editor.deliveryDays)}</Text>
                                <Text style={styles.editorMetaText}>
                                  {editor.priceType === "both" &&
                                  editor.pricePerMinute != null &&
                                  editor.revenueSharePercent != null
                                    ? `${formatEditorTicketsPerMinute(editor.pricePerMinute)} · ${formatEditorRevenueShareLabel(editor.revenueSharePercent)}`
                                    : editor.priceType === "per_minute" && editor.pricePerMinute
                                      ? formatEditorTicketsPerMinute(editor.pricePerMinute)
                                      : editor.priceType === "revenue_share" && editor.revenueSharePercent
                                        ? formatEditorRevenueShareLabel(editor.revenueSharePercent)
                                        : ui.tbd}
                                </Text>
                              </View>
                            </View>
                            <Pressable style={styles.editorRequestBtn} onPress={() => openRequestModal(editor)}>
                              <Text style={styles.editorRequestBtnText}>{ui.request}</Text>
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                  </>
                )}
              </>
            )}
          </View>
        )}

        {activeTab === "Board" && (
          <View style={styles.boardList}>
            <View style={styles.boardHeader}>
              <Text style={styles.boardSectionTitle}>
                {isOfficialCommunity ? ui.announcementsFeedback : ui.threadsTitle}
              </Text>
              {canPostToBoard && (
                <Pressable
                  style={styles.createThreadBtn}
                  onPress={() => {
                    if (!requireAuth(ui.createThread)) return;
                    openDefaultThreadComposer();
                  }}
                  accessibilityLabel={ui.newThread}
                >
                  <Ionicons name="add" size={22} color="#000" />
                </Pressable>
              )}
            </View>
            {canPostToBoard && !following && !isOfficialCommunity ? (
              <Text style={styles.boardStaffHint}>{ui.boardStaffHint}</Text>
            ) : null}
            {displayThreads.length === 0 ? (
              <Text style={styles.boardEmpty}>{ui.noThreadsYet}</Text>
            ) : announceBoard ? (
              displayThreads.map((t) => {
                const parsed = parseThreadBody(t.body);
                const hasFlyer = !!parsed.flyerImageUrl;
                return (
                  <View
                    key={t.id}
                    style={[
                      hasFlyer ? styles.boardCardAnnouncePeatix : styles.boardCardAnnounce,
                      t.pinned ? styles.boardCardAnnouncePinned : null,
                    ]}
                  >
                    <Pressable onPress={() => setSelectedThreadId(t.id)}>
                      {hasFlyer ? (
                        <View style={styles.boardFlyerHeroWrap}>
                          <EventFlyerImage
                            uri={parsed.flyerImageUrl}
                            fallbackUri={apiCommunity?.thumbnail ?? null}
                            style={styles.boardFlyerImageHero}
                            contentFit="cover"
                            recyclingKey={`board-hero-${t.id}`}
                          />
                          {t.pinned ? (
                            <View style={styles.boardFlyerPinnedBadge}>
                              <Ionicons name="pin" size={11} color={C.orange} />
                              <Text style={styles.boardAnnouncePinnedText}>{ui.pinned}</Text>
                            </View>
                          ) : null}
                        </View>
                      ) : (
                        <View style={styles.boardAnnounceTopRow}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, flexWrap: "wrap" }}>
                            {t.pinned ? (
                              <View style={styles.boardAnnouncePinnedPill}>
                                <Ionicons name="pin" size={11} color={C.orange} />
                                <Text style={styles.boardAnnouncePinnedText}>{ui.pinned}</Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={styles.boardAnnounceDateStrong}>{formatThreadDate(t.createdAt, isJaUi)}</Text>
                        </View>
                      )}
                      <View style={hasFlyer ? styles.boardAnnouncePeatixBody : styles.boardAnnouncePressBlock}>
                        {hasFlyer ? (
                          <View style={styles.boardAnnouncePeatixMetaRow}>
                            <Text style={styles.boardAnnounceDateStrong}>{formatThreadDate(t.createdAt, isJaUi)}</Text>
                          </View>
                        ) : null}
                        {parsed.shortVideoUrl ? (
                          <Pressable
                            style={styles.boardShortClipRow}
                            onPress={(e) => {
                              e?.stopPropagation?.();
                              Linking.openURL(parsed.shortVideoUrl!);
                            }}
                          >
                            <Ionicons name="logo-youtube" size={18} color="#ff4d4d" />
                            <Text style={styles.boardShortClipText} numberOfLines={1}>
                              {ui.shortClip}
                            </Text>
                            <Ionicons name="open-outline" size={16} color={C.textMuted} />
                          </Pressable>
                        ) : null}
                        <Text style={hasFlyer ? styles.boardTitleAnnouncePeatix : styles.boardTitleAnnounce} numberOfLines={hasFlyer ? 2 : 3}>
                          {t.title}
                        </Text>
                      </View>
                    </Pressable>
                    {parsed.text ? (
                      <View style={hasFlyer ? styles.boardAnnounceLinkedBlockPeatix : styles.boardAnnounceLinkedBlock}>
                        <AnnouncementBodyView
                          text={parsed.text}
                          variant="compact"
                          proseNumberOfLines={hasFlyer ? 3 : 4}
                          maxCompactFields={4}
                        />
                      </View>
                    ) : null}
                    <Pressable onPress={() => setSelectedThreadId(t.id)}>
                      <View
                        style={[
                          styles.boardAnnounceFooter,
                          hasFlyer && styles.boardAnnounceFooterPeatix,
                          hasFlyer ? styles.boardAnnounceFooterPadH : styles.boardAnnounceFooterPadHInner,
                        ]}
                      >
                        <Text style={styles.boardAnnounceAuthor} numberOfLines={1}>
                          {t.author.displayName}
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Text style={styles.boardAnnounceReplyCount}>
                            {ui.replies(t.postCount)}
                          </Text>
                          <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
                        </View>
                      </View>
                    </Pressable>
                  </View>
                );
              })
            ) : (
              displayThreads.map((t) => {
                const parsed = parseThreadBody(t.body);
                const hasFlyer = !!parsed.flyerImageUrl;
                return (
                  <View key={t.id} style={[styles.boardCard, hasFlyer && styles.boardCardPeatixThread]}>
                    {hasFlyer ? (
                      <EventFlyerImage
                        uri={parsed.flyerImageUrl}
                        fallbackUri={apiCommunity?.thumbnail ?? null}
                        style={styles.boardFlyerThreadHero}
                        contentFit="cover"
                        recyclingKey={`board-thread-${t.id}`}
                      />
                    ) : null}
                    <View
                      style={[
                        styles.boardThreadRow,
                        !hasFlyer && styles.boardThreadRowGrow,
                        hasFlyer && styles.boardThreadRowUnderFlyer,
                      ]}
                    >
                      <View style={[styles.boardBody, { flex: 1, minWidth: 0 }]}>
                        <Pressable onPress={() => setSelectedThreadId(t.id)}>
                          <View style={styles.boardTagRow}>
                            {t.pinned && (
                              <View style={[styles.boardTag, { backgroundColor: C.orange + "33" }]}>
                                <Text style={[styles.boardTagText, { color: C.orange }]}>{ui.pinned}</Text>
                              </View>
                            )}
                            <Text style={styles.boardDate}>
                              {t.author.displayName} · {formatThreadDate(t.createdAt, isJaUi)}
                            </Text>
                          </View>
                          <Text style={[styles.boardTitle, hasFlyer && styles.boardTitleUnderFlyer]}>{t.title}</Text>
                          <Text style={styles.boardPostCount}>{ui.replies(t.postCount)}</Text>
                        </Pressable>
                        {parsed.text ? (
                          <View style={{ marginTop: 6 }}>
                            <AnnouncementBodyView
                              text={parsed.text}
                              variant="compact"
                              proseNumberOfLines={hasFlyer ? 2 : 1}
                              maxCompactFields={2}
                            />
                          </View>
                        ) : null}
                      </View>
                      <Pressable onPress={() => setSelectedThreadId(t.id)} hitSlop={8} style={{ justifyContent: "center" }}>
                        <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}

            {/* No-Confidence Motion — members only */}
            {following && !isOfficialCommunity && (
              <View style={{ marginTop: 24, borderWidth: 1, borderColor: "#ff444433", borderRadius: 4, padding: 16, gap: 10, backgroundColor: "#ff444408" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="alert-circle-outline" size={18} color="#ff4444" />
                  <Text style={{ color: "#ff4444", fontSize: 14, fontWeight: "800" }}>No-Confidence Motion</Text>
                </View>
                <Text style={{ color: C.textSec, fontSize: 12, lineHeight: 18 }}>
                  You can file a no-confidence motion against the current admin.{"\n"}
                  If a majority of members (50%+) agree, an election for a new admin will be held automatically.
                </Text>
                {!showNoConfidenceForm ? (
                  <Pressable
                    style={{ backgroundColor: "#ff4444", borderRadius: 3, paddingVertical: 10, alignItems: "center" }}
                    onPress={() => setShowNoConfidenceForm(true)}
                  >
                    <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800" }}>File No-Confidence Motion</Text>
                  </Pressable>
                ) : (
                  <View style={{ gap: 8 }}>
                    <Text style={{ color: C.textSec, fontSize: 11 }}>Reason (Required)</Text>
                    <TextInput
                      style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: "#ff444455", borderRadius: 3, color: C.text, fontSize: 13, padding: 10, minHeight: 80, textAlignVertical: "top" }}
                      placeholder="Describe the issue with the current admin"
                      placeholderTextColor={C.textMuted}
                      value={noConfidenceReason}
                      onChangeText={setNoConfidenceReason}
                      multiline
                    />
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Pressable
                        style={{ flex: 1, borderWidth: 1, borderColor: C.textMuted, borderRadius: 3, paddingVertical: 10, alignItems: "center" }}
                        onPress={() => { setShowNoConfidenceForm(false); setNoConfidenceReason(""); }}
                      >
                        <Text style={{ color: C.textSec, fontSize: 13 }}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        style={{ flex: 2, backgroundColor: noConfidenceReason.trim() ? "#ff4444" : "#ff444466", borderRadius: 3, paddingVertical: 10, alignItems: "center" }}
                        disabled={!noConfidenceReason.trim()}
                        onPress={() => {
                          setShowNoConfidenceForm(false);
                          setNoConfidenceReason("");
                          Alert.alert(ui.comingSoonTitle, ui.comingSoonBody);
                        }}
                      >
                        <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800" }}>{ui.submit}</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            )}
            {isOfficialCommunity && canPostToBoard ? (
              <View style={styles.stationBottomInfo}>
                <View style={styles.boardAnnounceIntro}>
                  <View style={styles.boardAnnounceIntroIcon}>
                    <Ionicons name="chatbubbles-outline" size={22} color={C.accent} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.boardAnnounceIntroTitle}>{ui.officialUpdatesTitle}</Text>
                    <Text style={styles.boardAnnounceIntroSub}>
                      {ui.officialUpdatesSub}
                    </Text>
                  </View>
                </View>
                <Pressable
                  style={styles.feedbackBottomLink}
                  onPress={() => {
                    if (!requireAuth(ui.createFeedback)) return;
                    openFeedbackComposer();
                  }}
                  accessibilityLabel={ui.openFeedbackBox}
                >
                  <Ionicons name="chatbox-ellipses-outline" size={13} color={C.textMuted} />
                  <Text style={styles.feedbackBottomLinkText}>{ui.sendFeedback}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}

        {!isOfficialCommunity && (staffData?.admin || (staffData?.moderators && staffData.moderators.length > 0)) && (
          <View style={styles.staffSection}>
            <View style={styles.staffSectionHeader}>
              <Text style={styles.staffSectionTitle}>{ui.staffTitle}</Text>
              {(isCommunityAdmin || isModerator) && (
                <View style={styles.staffAdminLinks}>
                  {isCommunityAdmin && (
                    <>
                      <Pressable
                        onPress={() => {
                          setSelectedAdminId(staffData?.adminId ?? null);
                          setSelectedModeratorIds(staffData?.moderatorIds ?? []);
                          setStaffModalVisible(true);
                        }}
                      >
                        <Text style={styles.staffEditLink}>{ui.edit}</Text>
                      </Pressable>
                      <Pressable onPress={() => router.push("/community/ad-review")}>
                        <Text style={styles.staffEditLink}>{ui.adReview}</Text>
                      </Pressable>
                    </>
                  )}
                  <Pressable onPress={() => router.push(`/community/${communityId}/admin`)}>
                    <Text style={styles.staffEditLink}>{ui.adminPanel}</Text>
                  </Pressable>
                </View>
              )}
            </View>
            {staffData?.admin && (
              <Pressable
                style={styles.staffRow}
                onPress={() => router.push(`/user/${staffData.admin!.id}`)}
              >
                <Image source={{ uri: staffData.admin.profileImageUrl ?? undefined }} style={styles.staffAvatar} contentFit="cover" />
                <Text style={styles.staffLabel}>{ui.admin}</Text>
                <Text style={styles.staffName}>{staffData.admin.displayName}</Text>
                <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
              </Pressable>
            )}
            {staffData?.moderators && staffData.moderators.length > 0 && (
              staffData.moderators.map((m) => (
                <Pressable
                  key={m.id}
                  style={styles.staffRow}
                  onPress={() => router.push(`/user/${m.id}`)}
                >
                  <Image source={{ uri: m.profileImageUrl ?? undefined }} style={styles.staffAvatar} contentFit="cover" />
                  <Text style={styles.staffLabel}>{ui.moderator}</Text>
                  <Text style={styles.staffName}>{m.displayName}</Text>
                  <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
                </Pressable>
              ))
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Thread details modal */}
      <Modal
        visible={!!selectedThreadId}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedThreadId(null)}
      >
        <View style={styles.requestModalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setSelectedThreadId(null)} />
          <View style={[styles.requestModalSheet, { maxHeight: "85%" }]}>
            <View style={styles.requestModalHandle} />
            {threadDetail ? (
              <ThreadDetailContent
                thread={threadDetail}
                communityId={communityId}
                communityThumbnail={apiCommunity?.thumbnail ?? null}
                onClose={() => setSelectedThreadId(null)}
                onReply={() => refetchThreadDetail()}
                requireAuth={requireAuth}
                canModerate={isCommunityAdmin || isModerator}
                onDeleteThread={async () => {
                  try {
                    await apiRequest("DELETE", `/api/communities/${communityId}/threads/${threadDetail.id}`);
                    setSelectedThreadId(null);
                    refetchThreads();
                  } catch (e: any) {
                    Alert.alert(ui.deleteFailedTitle, e?.message ?? ui.deleteFailedBody);
                  }
                }}
                onDeletePost={async (postId) => {
                  try {
                    await apiRequest("DELETE", `/api/communities/${communityId}/threads/${threadDetail.id}/posts/${postId}`);
                    refetchThreadDetail();
                    refetchThreads();
                  } catch (e: any) {
                    Alert.alert(ui.deleteFailedTitle, e?.message ?? ui.deleteFailedBody);
                  }
                }}
              />
            ) : (
              <View style={{ padding: 24, alignItems: "center" }}>
                <ActivityIndicator color={C.accent} />
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* New thread modal */}
      <Modal
        visible={showCreateThread}
        transparent
        animationType="slide"
        onRequestClose={closeCreateThreadModal}
      >
        <View style={styles.requestModalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeCreateThreadModal} />
          <View style={styles.requestModalSheet}>
            <View style={styles.requestModalHandle} />
            <View style={styles.requestModalHeader}>
              <Text style={styles.requestModalTitle}>
                {threadComposerMode === "feedback"
                  ? ui.feedbackBox
                  : announceBoard
                    ? ui.newAnnouncement
                    : ui.newThread}
              </Text>
              <Pressable onPress={closeCreateThreadModal} hitSlop={8}>
                <Ionicons name="close" size={24} color={C.textMuted} />
              </Pressable>
            </View>
            <TextInput
              style={[styles.requestInput, { marginBottom: 8 }]}
              placeholder={
                threadComposerMode === "feedback"
                  ? ui.feedbackTitlePlaceholder
                  : announceBoard
                    ? ui.announcementTitlePlaceholder
                    : ui.threadTitlePlaceholder
              }
              placeholderTextColor={C.textMuted}
              value={newThreadTitle}
              onChangeText={setNewThreadTitle}
            />
            <TextInput
              style={[styles.requestInput, styles.requestInputMultiline]}
              placeholder={
                threadComposerMode === "feedback"
                  ? ui.feedbackBodyPlaceholder
                  : announceBoard
                  ? ui.announcementBodyPlaceholder
                  : ui.threadBodyPlaceholder
              }
              placeholderTextColor={C.textMuted}
              value={newThreadBody}
              onChangeText={setNewThreadBody}
              multiline
              textAlignVertical="top"
            />
            {threadComposerMode === "announcement" ? (
              <View style={styles.flyerAttachBlock}>
                <Text style={styles.flyerQualityHint}>
                  {ui.flyerQualityHint}
                </Text>
                {Platform.OS === "web" ? (
                  <Pressable
                    style={[
                      styles.flyerAttachBtn,
                      (uploadingAnnouncementScreenshot || creatingThread) && styles.flyerAttachBtnDisabled,
                    ]}
                    onPress={pickAnnouncementScreenshotWeb}
                    disabled={uploadingAnnouncementScreenshot || creatingThread}
                  >
                    {uploadingAnnouncementScreenshot ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                        <Text style={styles.flyerAttachBtnText}>{ui.uploadScreenshotFile}</Text>
                      </>
                    )}
                  </Pressable>
                ) : uploadingAnnouncementScreenshot ? (
                  <View style={[styles.flyerAttachBtn, styles.flyerAttachBtnUploading]}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.flyerAttachBtnText}>{ui.uploading}</Text>
                  </View>
                ) : (
                  <View style={styles.screenshotPickRow}>
                    <Pressable
                      style={[
                        styles.flyerAttachBtn,
                        styles.flyerAttachBtnHalf,
                        creatingThread && styles.flyerAttachBtnDisabled,
                      ]}
                      onPress={pickAnnouncementScreenshotFromLibrary}
                      disabled={creatingThread}
                    >
                      <Ionicons name="images-outline" size={18} color="#fff" />
                      <Text style={styles.flyerAttachBtnText}>{ui.fromPhotos}</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.flyerAttachBtn,
                        styles.flyerAttachBtnHalf,
                        creatingThread && styles.flyerAttachBtnDisabled,
                      ]}
                      onPress={pickAnnouncementScreenshotFromCamera}
                      disabled={creatingThread}
                    >
                      <Ionicons name="camera-outline" size={18} color="#fff" />
                      <Text style={styles.flyerAttachBtnText}>{ui.takePhoto}</Text>
                    </Pressable>
                  </View>
                )}
                {announcementScreenshotUrl ? (
                  <View style={styles.flyerPreviewWrap}>
                    <Image
                      source={{ uri: announcementScreenshotUrl }}
                      style={styles.flyerPreviewImg}
                      contentFit="cover"
                    />
                    <Pressable
                      style={styles.flyerRemoveBtn}
                      onPress={() => setAnnouncementScreenshotUrl(null)}
                      hitSlop={8}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
                      <Text style={styles.flyerRemoveText}>{ui.remove}</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : null}
            <Pressable
              style={[
                styles.requestSubmitBtn,
                (creatingThread ||
                  uploadingAnnouncementScreenshot ||
                  (threadComposerMode !== "feedback" && !newThreadTitle.trim()) ||
                  (threadComposerMode === "feedback" && !newThreadBody.trim()) ||
                  (threadComposerMode === "announcement" && !announcementScreenshotUrl?.trim())) &&
                  styles.requestSubmitBtnDisabled,
              ]}
              onPress={handleCreateThread}
              disabled={
                creatingThread ||
                uploadingAnnouncementScreenshot ||
                (threadComposerMode !== "feedback" && !newThreadTitle.trim()) ||
                (threadComposerMode === "feedback" && !newThreadBody.trim()) ||
                (threadComposerMode === "announcement" && !announcementScreenshotUrl?.trim())
              }
            >
              {creatingThread ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.requestSubmitBtnText}>
                  {threadComposerMode === "feedback"
                    ? ui.submitFeedback
                    : announceBoard
                      ? ui.postAnnouncement
                      : ui.createThread}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Edit request modal */}
      <Modal
        visible={!!requestEditor}
        transparent
        animationType="slide"
        onRequestClose={closeRequestModal}
      >
        <Pressable style={styles.requestModalOverlay} onPress={closeRequestModal}>
          <Pressable
            style={styles.requestModalSheet}
            onPress={() => {}}
          >
            <View style={styles.requestModalHandle} />
            {requestEditor && (
              <>
                <View style={styles.requestModalHeader}>
                  <View style={styles.requestModalEditorRow}>
                    <Pressable
                      onPress={() =>
                        navigateToUserOrLiverProfile({
                          userId: requestEditor.userId ?? null,
                          displayName: !requestEditor.userId ? requestEditor.name : null,
                        })
                      }
                      hitSlop={6}
                    >
                      <Image source={{ uri: requestEditor.avatar }} style={styles.requestModalAvatar} contentFit="cover" />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.requestModalTitle}>{ui.requestEditorTitle(requestEditor.name)}</Text>
                      <View style={styles.editorRatingRow}>
                        <Ionicons name="star" size={12} color={C.orange} />
                        <Text style={styles.editorRatingText}>{requestEditor.rating.toFixed(1)}</Text>
                        <Text style={styles.editorReviewText}>({requestEditor.reviewCount})</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <ScrollView
                  style={webScrollStyle(styles.requestModalScroll)}
                  showsVerticalScrollIndicator={scrollShowsVertical}
                >
                  <Text style={styles.requestLabel}>{ui.requestTitleLabel}</Text>
                  <TextInput
                    style={styles.requestInput}
                    placeholder={ui.requestTitlePlaceholder}
                    placeholderTextColor={C.textMuted}
                    value={requestTitle}
                    onChangeText={setRequestTitle}
                  />

                  <Text style={styles.requestLabel}>{ui.descriptionLabel}</Text>
                  <TextInput
                    style={[styles.requestInput, styles.requestInputMultiline]}
                    placeholder={ui.requestDescriptionPlaceholder}
                    placeholderTextColor={C.textMuted}
                    value={requestDescription}
                    onChangeText={setRequestDescription}
                    multiline
                    textAlignVertical="top"
                  />

                  <Text style={styles.requestLabel}>{ui.pricingModel}</Text>
                  <View style={styles.requestPriceTypeRow}>
                    <Pressable
                      style={[
                        styles.requestPriceTypePill,
                        requestPriceType === "per_minute" && styles.requestPriceTypePillActive,
                      ]}
                      onPress={() => setRequestPriceType("per_minute")}
                    >
                      <Text
                        style={[
                          styles.requestPriceTypeText,
                          requestPriceType === "per_minute" && styles.requestPriceTypeTextActive,
                        ]}
                      >
                        {ui.perMinute}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.requestPriceTypePill,
                        requestPriceType === "revenue_share" && styles.requestPriceTypePillActive,
                      ]}
                      onPress={() => setRequestPriceType("revenue_share")}
                    >
                      <Text
                        style={[
                          styles.requestPriceTypeText,
                          requestPriceType === "revenue_share" && styles.requestPriceTypeTextActive,
                        ]}
                      >
                        {ui.revenueShare}
                      </Text>
                    </Pressable>
                  </View>

                  <Text style={styles.requestLabel}>
                    {requestPriceType === "per_minute" ? ui.targetBudget : ui.targetRevShare}
                  </Text>
                  {requestPriceType === "per_minute" ? (
                    <Text style={styles.requestTicketHint}>
                      {ui.ticketHint}
                    </Text>
                  ) : null}
                  <TextInput
                    style={styles.requestInput}
                    placeholder={requestPriceType === "per_minute" ? ui.budgetPlaceholderPerMinute : ui.budgetPlaceholderRevenueShare}
                    placeholderTextColor={C.textMuted}
                    value={requestBudget}
                    onChangeText={setRequestBudget}
                    keyboardType="numeric"
                  />

                  <Text style={styles.requestLabel}>{ui.deadline}</Text>
                  <TextInput
                    style={styles.requestInput}
                    placeholder={ui.deadlinePlaceholder}
                    placeholderTextColor={C.textMuted}
                    value={requestDeadline}
                    onChangeText={setRequestDeadline}
                  />

                  <Pressable
                    style={[styles.requestSubmitBtn, sendingRequest && styles.requestSubmitBtnDisabled]}
                    onPress={handleSendRequest}
                    disabled={sendingRequest}
                  >
                    <Text style={styles.requestSubmitBtnText}>
                      {sendingRequest ? ui.sending : ui.sendRequest}
                    </Text>
                  </Pressable>
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Admin/moderator settings modal (select from members) */}
      <Modal visible={staffModalVisible} transparent animationType="slide">
        <Pressable style={styles.requestModalOverlay} onPress={() => !savingStaff && setStaffModalVisible(false)}>
          <Pressable style={[styles.requestModalSheet, styles.staffModalSheet]} onPress={() => {}}>
            <View style={styles.requestModalHandle} />
            <Text style={styles.requestModalTitle}>{ui.adminModeratorsTitle}</Text>
            <Text style={styles.staffModalHint}>{ui.staffModalHint}</Text>

            {membersLoading ? (
              <ActivityIndicator size="small" color={C.accent} style={{ marginVertical: 24 }} />
            ) : members.length === 0 ? (
              <View style={styles.staffEmptyWrap}>
                <Ionicons name="people-outline" size={32} color={C.textMuted} />
                  <Text style={styles.staffEmptyText}>{ui.noMembersYet}</Text>
                  <Text style={styles.staffEmptySub}>{ui.noMembersYetSub}</Text>
              </View>
            ) : (
              <ScrollView style={webScrollStyle(styles.staffPickerScroll)} showsVerticalScrollIndicator={scrollShowsVertical}>
                <Text style={styles.staffPickerSectionTitle}>{ui.adminSingle}</Text>
                {members.map((m) => (
                  <View
                    key={m.id}
                    style={[styles.staffPickerRow, selectedAdminId === m.id && styles.staffPickerRowSelected]}
                  >
                    <Pressable onPress={() => router.push(`/user/${m.id}`)} hitSlop={4}>
                      <Image source={{ uri: m.profileImageUrl ?? undefined }} style={styles.staffPickerAvatar} contentFit="cover" />
                    </Pressable>
                    <Pressable
                      style={{ flex: 1, justifyContent: "center", minHeight: 44 }}
                      onPress={() => setSelectedAdminId(selectedAdminId === m.id ? null : m.id)}
                    >
                      <Text style={styles.staffPickerName} numberOfLines={1}>{m.displayName}</Text>
                    </Pressable>
                    <Pressable onPress={() => setSelectedAdminId(selectedAdminId === m.id ? null : m.id)} hitSlop={8}>
                      {selectedAdminId === m.id ? <Ionicons name="checkmark-circle" size={22} color={C.accent} /> : <View style={{ width: 22 }} />}
                    </Pressable>
                  </View>
                ))}
                <Text style={[styles.staffPickerSectionTitle, { marginTop: 16 }]}>{ui.moderatorsMultiple}</Text>
                {members.map((m) => (
                  <View
                    key={`mod-${m.id}`}
                    style={[styles.staffPickerRow, selectedModeratorIds.includes(m.id) && styles.staffPickerRowSelected]}
                  >
                    <Pressable onPress={() => router.push(`/user/${m.id}`)} hitSlop={4}>
                      <Image source={{ uri: m.profileImageUrl ?? undefined }} style={styles.staffPickerAvatar} contentFit="cover" />
                    </Pressable>
                    <Pressable
                      style={{ flex: 1, justifyContent: "center", minHeight: 44 }}
                      onPress={() => toggleModerator(m.id)}
                    >
                      <Text style={styles.staffPickerName} numberOfLines={1}>{m.displayName}</Text>
                    </Pressable>
                    <Pressable onPress={() => toggleModerator(m.id)} hitSlop={8}>
                      {selectedModeratorIds.includes(m.id) ? (
                        <Ionicons name="checkmark-circle" size={22} color={C.accent} />
                      ) : (
                        <View style={{ width: 22 }} />
                      )}
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
              <Pressable style={styles.cancelBtn} onPress={() => !savingStaff && setStaffModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.requestSubmitBtn, savingStaff && styles.requestSubmitBtnDisabled]} onPress={saveStaff} disabled={savingStaff}>
                <Text style={styles.requestSubmitBtnText}>{savingStaff ? "Saving..." : "Save"}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const jukeStyles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 12,
    backgroundColor: C.surface2,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.accentDark,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.accent,
  },
  badgeText: {
    color: C.accent,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  watchersChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  watchersText: {
    color: C.textSec,
    fontSize: 11,
  },
  openRoomBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.accent + "55",
    flexShrink: 0,
  },
  openRoomText: {
    color: C.accent,
    fontSize: 11,
    fontWeight: "700",
  },
  playerRow: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  thumbWrap: {
    width: 90,
    height: 60,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    backgroundColor: C.surface3,
  },
  thumb: {
    width: 90,
    height: 60,
    borderRadius: 8,
  },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject as any,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  playCircle: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  playerInfo: {
    flex: 1,
    gap: 4,
    justifyContent: "center",
  },
  nowPlayingTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 17,
  },
  addedBy: {
    color: C.accent,
    fontSize: 11,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: C.surface3,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 3,
    backgroundColor: C.accent,
    borderRadius: 2,
  },
  progressTime: {
    color: C.textMuted,
    fontSize: 10,
    width: 36,
    fontVariant: ["tabular-nums"] as any,
  },
  progressTimeL: { textAlign: "right" },
  progressTimeR: { textAlign: "left" },
  upNextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  upNextText: {
    flex: 1,
    color: C.textSec,
    fontSize: 11,
    fontWeight: "600",
  },
  emptyPlayer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
  },
  emptyText: {
    color: C.textMuted,
    fontSize: 12,
  },
  commentsWrap: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 4,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  commentUser: {
    color: C.accent,
    fontSize: 11,
    fontWeight: "700",
    minWidth: 40,
  },
  commentText: {
    color: C.textSec,
    fontSize: 11,
    flex: 1,
  },
  commentInput: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  input: {
    flex: 1,
    height: 34,
    backgroundColor: C.surface2,
    borderRadius: 17,
    paddingHorizontal: 12,
    color: C.text,
    fontSize: 13,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: C.surface3,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  coverContainer: { height: 130, position: "relative" },
  coverImage: { width: "100%", height: "100%" },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  coverHeader: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  promoRow: {
    flexDirection: "row",
    alignItems: "stretch",
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  adBanner: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 72,
    paddingHorizontal: 12,
    gap: 10,
    overflow: "hidden",
    borderRadius: 12,
  },
  adBannerFlex: {
    flex: 1,
    minWidth: 0,
  },
  placeAdSideBtn: {
    width: 72,
    borderRadius: 12,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  placeAdSideText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 13,
  },
  adPrBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  adPrText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  adThumb: { width: 80, height: 54, borderRadius: 6 },
  adBody: { flex: 1, gap: 4 },
  adTitle: { color: "#fff", fontSize: 13, fontWeight: "700" },
  adSub: { color: "rgba(255,255,255,0.55)", fontSize: 11 },
  adCtaBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 6 },
  adCtaText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  profileSection: { padding: 16, gap: 10 },
  profileSectionTight: { paddingTop: 12, gap: 8 },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  communityAvatarContainer: { position: "relative" },
  communityAvatar: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.accent,
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.green,
    borderWidth: 2,
    borderColor: C.bg,
  },
  profileInfo: { flex: 1, gap: 4 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  communityName: { color: C.text, fontSize: 17, fontWeight: "800" },
  officialBadge: {
    backgroundColor: C.surface3,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  officialText: { color: C.textSec, fontSize: 9, fontWeight: "700" },
  categoryText: { color: C.textSec, fontSize: 12 },
  description: { color: C.textSec, fontSize: 13, lineHeight: 19 },
  staffSection: {
    marginTop: 20,
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 8,
  },
  staffSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  staffSectionTitle: { color: C.textMuted, fontSize: 11, fontWeight: "600" },
  staffAdminLinks: { flexDirection: "row", alignItems: "center", gap: 12 },
  staffEditLink: { color: C.accent, fontSize: 12, fontWeight: "600" },
  staffRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  staffAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.surface3 },
  staffLabel: { color: C.textMuted, fontSize: 11, width: 72 },
  staffName: { color: C.text, fontSize: 13, fontWeight: "600" },
  staffModalHint: { color: C.textMuted, fontSize: 11, marginBottom: 8 },
  staffModalSheet: { maxHeight: "80%" },
  staffEmptyWrap: { alignItems: "center", paddingVertical: 32, gap: 8 },
  staffEmptyText: { color: C.textMuted, fontSize: 15, fontWeight: "600" },
  staffEmptySub: { color: C.textMuted, fontSize: 12 },
  staffPickerScroll: { maxHeight: 280 },
  staffPickerSectionTitle: { color: C.textMuted, fontSize: 12, fontWeight: "700", marginBottom: 8 },
  staffPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: C.surface3,
    marginBottom: 6,
  },
  staffPickerRowSelected: { backgroundColor: C.accent + "22", borderWidth: 1, borderColor: C.accent + "66" },
  staffPickerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface3 },
  staffPickerName: { flex: 1, color: C.text, fontSize: 14, fontWeight: "600" },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, backgroundColor: C.surface3 },
  cancelBtnText: { color: C.textSec, fontSize: 14, fontWeight: "700" },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statPressable: {
    paddingVertical: 4,
    paddingRight: 4,
  },
  statText: { color: C.textSec, fontSize: 12 },
  statNumber: { color: C.text, fontWeight: "700" },
  statDivider: { color: C.textMuted },
  membersLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    paddingVertical: 2,
    paddingHorizontal: 0,
    alignSelf: "flex-start",
  },
  membersLinkText: { color: C.accent, fontSize: 12, fontWeight: "600" },
  childCommunitiesBox: {
    marginTop: 8,
    width: "100%",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    backgroundColor: C.surface,
    overflow: "hidden",
  },
  childCommunitiesHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  childCommunitiesEmpty: { color: C.textMuted, fontSize: 12, paddingHorizontal: 10, paddingVertical: 10 },
  stationBoardHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 2,
    marginTop: 6,
  },
  stationBoardHintText: {
    color: C.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  childCommunityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  childCommunityName: { color: C.textSec, fontSize: 12, flex: 1, marginRight: 8 },
  followBtnChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: C.accent,
    flexShrink: 0,
  },
  followBtnChipActive: {
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
  },
  followBtnChipText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  followBtnChipTextActive: { color: C.textSec },
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginBottom: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: { borderBottomColor: C.accent },
  tabText: { color: C.textMuted, fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: C.text, fontWeight: "700" },
  postCard: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    padding: 14,
    gap: 10,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  postCreatorPressable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  postAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: C.accent,
  },
  postMeta: { flex: 1 },
  postCreator: { color: C.text, fontSize: 13, fontWeight: "700" },
  postTime: { color: C.textMuted, fontSize: 11, marginTop: 2 },
  pricePill: {
    backgroundColor: C.accent,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pricePillText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  postImage: {
    width: "100%",
    height: 190,
    borderRadius: 10,
  },
  postTitle: { color: C.textSec, fontSize: 13, lineHeight: 18 },
  rankMiniBadge: {
    alignSelf: "flex-start",
    marginTop: -2,
    backgroundColor: C.accent + "22",
    borderWidth: 1,
    borderColor: C.accent + "55",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  rankMiniBadgeText: { color: C.accent, fontSize: 11, fontWeight: "700" },
  creatorList: { padding: 16, gap: 12 },
  creatorItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 12,
  },
  creatorAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: C.accent,
  },
  creatorInfo: { flex: 1, gap: 3 },
  creatorName: { color: C.text, fontSize: 13, fontWeight: "700" },
  creatorCommunity: { color: C.textSec, fontSize: 11 },
  creatorStats: { flexDirection: "row", gap: 10 },
  creatorStat: { color: C.textMuted, fontSize: 11 },
  followSmallBtn: {
    backgroundColor: C.accent,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  followSmallText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  /* Video editors */
  editorTab: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  editorSectionTitle: {
    color: C.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  editorRankingScroll: {
    paddingVertical: 4,
    paddingRight: 8,
    gap: 8,
  },
  editorRankCard: {
    width: 140,
    padding: 10,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
  },
  editorRankBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  editorRankBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  editorRankAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 6,
  },
  editorRankName: {
    color: C.text,
    fontSize: 13,
    fontWeight: "700",
  },
  editorGenreText: {
    color: C.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  editorRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  editorRatingText: {
    color: C.orange,
    fontSize: 12,
    fontWeight: "700",
  },
  editorReviewText: {
    color: C.textMuted,
    fontSize: 11,
  },
  editorAvailabilityBadge: {
    marginTop: 6,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  editorAvailabilityText: {
    fontSize: 11,
    fontWeight: "700",
  },
  editorAvailable: {
    backgroundColor: "#1B5E20",
  },
  editorAvailableText: {
    color: "#C8E6C9",
  },
  editorMaybe: {
    backgroundColor: "#263238",
  },
  editorMaybeText: {
    color: C.textSec,
  },
  editorEmptyRanking: {
    paddingVertical: 16,
  },
  editorEmptyText: {
    color: C.textMuted,
    fontSize: 13,
  },
  editorList: {
    marginTop: 16,
    gap: 10,
  },
  editorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  editorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  editorBody: {
    flex: 1,
    gap: 4,
  },
  editorHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  editorName: {
    color: C.text,
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
  },
  editorGenresRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  editorGenreTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: C.surface3,
  },
  editorGenreTagText: {
    color: C.textSec,
    fontSize: 11,
  },
  editorMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  editorMetaText: {
    color: C.textMuted,
    fontSize: 11,
  },
  editorRequestBtn: {
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: C.accent,
  },
  editorRequestBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  boardList: { padding: 16, gap: 10 },
  boardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  boardSectionTitle: { color: C.text, fontSize: 15, fontWeight: "800" },
  createThreadBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.accent,
  },
  createThreadBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  feedbackBottomLink: {
    marginTop: 8,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    opacity: 0.9,
  },
  feedbackBottomLinkText: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: "500",
  },
  stationBottomInfo: {
    marginTop: 10,
  },
  createThreadForm: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  createThreadInput: {
    backgroundColor: C.surface2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: C.text,
    fontSize: 14,
  },
  createThreadInputBody: {
    minHeight: 60,
    maxHeight: 100,
  },
  createThreadSubmitBtn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  createThreadSubmitBtnDisabled: { opacity: 0.5 },
  createThreadSubmitText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  flyerAttachBlock: { marginTop: 10, gap: 10 },
  flyerQualityHint: {
    color: C.textMuted,
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: 2,
  },
  flyerAttachBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  flyerAttachBtnDisabled: { opacity: 0.45 },
  screenshotPickRow: { flexDirection: "row", gap: 10 },
  flyerAttachBtnHalf: { flex: 1, minWidth: 0 },
  flyerAttachBtnUploading: { opacity: 0.88 },
  flyerAttachBtnText: { color: C.text, fontSize: 14, fontWeight: "700" },
  flyerPreviewWrap: {
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface2,
  },
  flyerPreviewImg: { width: "100%", height: 160, backgroundColor: C.surface2 },
  flyerRemoveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: C.surface,
  },
  flyerRemoveText: { color: "#ff6b6b", fontSize: 13, fontWeight: "700" },
  boardEmpty: { color: C.textMuted, fontSize: 14, paddingVertical: 24, textAlign: "center" },
  boardPostCount: { color: C.textMuted, fontSize: 10, marginTop: 2 },
  boardAnnounceIntro: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: C.accent + "44",
  },
  boardAnnounceIntroIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.accent + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  boardAnnounceIntroTitle: { color: C.text, fontSize: 15, fontWeight: "800" },
  boardAnnounceIntroSub: { color: C.textSec, fontSize: 12, lineHeight: 18 },
  boardStaffHint: {
    color: C.textMuted,
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  boardCardAnnounce: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
    gap: 6,
    overflow: "hidden",
  },
  /** Peatix-style: edge-to-edge flyer, meta + title below */
  boardCardAnnouncePeatix: {
    backgroundColor: C.surface,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    padding: 0,
  },
  boardFlyerHeroWrap: {
    width: "100%",
    position: "relative",
    backgroundColor: C.surface2,
  },
  boardFlyerImageHero: {
    width: "100%",
    aspectRatio: 2 / 3,
    maxHeight: 520,
    backgroundColor: C.surface2,
  },
  boardFlyerPinnedBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.72)",
    borderWidth: 1,
    borderColor: C.orange + "66",
  },
  boardAnnouncePeatixBody: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 8,
  },
  /** Title / clip block inside official announce cards (body with links is separate). */
  /** Inside boardCardAnnounce (already padded); do not add extra horizontal inset. */
  boardAnnouncePressBlock: {
    paddingTop: 4,
    paddingBottom: 4,
    gap: 8,
  },
  boardAnnounceLinkedBlockPeatix: {
    paddingHorizontal: 14,
    paddingTop: 2,
    paddingBottom: 8,
  },
  boardAnnounceLinkedBlock: {
    paddingTop: 2,
    paddingBottom: 6,
  },
  boardAnnounceFooterPadH: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  boardAnnounceFooterPadHInner: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  boardAnnouncePeatixMetaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  boardTitleAnnouncePeatix: {
    color: C.text,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
    marginTop: 2,
  },
  boardAnnounceFooterPeatix: {
    marginTop: 4,
    paddingTop: 10,
  },
  boardCardAnnouncePinned: {
    borderColor: C.orange + "66",
    backgroundColor: C.orange + "0c",
  },
  boardAnnounceTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  boardAnnouncePinnedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: C.orange + "22",
  },
  boardAnnouncePinnedText: { color: C.orange, fontSize: 10, fontWeight: "800" },
  boardAnnounceDateStrong: { color: C.textMuted, fontSize: 11, fontWeight: "600" },
  boardTitleAnnounce: { color: C.text, fontSize: 14, fontWeight: "700", lineHeight: 19 },
  boardShortClipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 8,
  },
  boardShortClipText: { flex: 1, color: C.accent, fontSize: 12, fontWeight: "700" },
  boardDetailAnnounce: { color: C.textSec, fontSize: 12, lineHeight: 17 },
  boardAnnounceFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  boardAnnounceAuthor: { color: C.textMuted, fontSize: 11, fontWeight: "600", flex: 1, marginRight: 8 },
  boardAnnounceReplyCount: { color: C.textMuted, fontSize: 11, fontWeight: "600" },
  threadDetailHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  threadDetailTitleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8, gap: 8 },
  threadDetailTitle: { color: C.text, fontSize: 16, fontWeight: "800", flex: 1 },
  threadDetailMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 8,
  },
  threadAvatarFallback: { backgroundColor: C.surface2, alignItems: "center", justifyContent: "center" },
  threadAvatarInitial: { color: C.textMuted, fontSize: 12, fontWeight: "700" },
  threadDetailAuthor: { color: C.textSec, fontSize: 12, fontWeight: "600" },
  threadDetailDate: { color: C.textMuted, fontSize: 11 },
  threadDetailFlyer: {
    width: "100%",
    aspectRatio: 2 / 3,
    maxHeight: 560,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 10,
    backgroundColor: C.surface2,
  },
  threadDetailShortClip: {
    width: "100%",
    height: 160,
    borderRadius: 10,
    marginTop: 4,
    marginBottom: 10,
    overflow: "hidden",
    backgroundColor: C.surface2,
  },
  threadDetailShortThumb: { width: "100%", height: "100%" },
  threadDetailShortPlaceholder: { alignItems: "center", justifyContent: "center" },
  threadDetailShortOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  threadDetailShortLabel: { color: "#fff", fontSize: 13, fontWeight: "800" },
  threadDetailBodyWrap: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 },
  threadDetailRoot: { flex: 1 },
  threadDetailMainScroll: { flex: 1 },
  threadDetailMainScrollContent: { paddingBottom: 16 },
  threadDetailPosts: { maxHeight: 280, padding: 16 },
  threadPostRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  threadPostAvatar: { width: 32, height: 32, borderRadius: 16 },
  threadPostBody: { flex: 1 },
  threadPostAuthor: { color: C.text, fontSize: 12, fontWeight: "700" },
  threadPostDate: { color: C.textMuted, fontSize: 10, marginTop: 1 },
  threadPostText: { color: C.textSec, fontSize: 13, marginTop: 4 },
  threadPostDelete: { padding: 4 },
  threadReplyRow: { flexDirection: "row", gap: 8, padding: 16, borderTopWidth: 1, borderTopColor: C.border },
  threadReplyInput: {
    flex: 1,
    backgroundColor: C.surface2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: C.text,
    fontSize: 14,
    maxHeight: 80,
  },
  threadReplyBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  threadReplyBtnDisabled: { opacity: 0.5 },
  pollCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  pollQuestion: { color: C.text, fontSize: 14, fontWeight: "700", marginBottom: 12 },
  pollOption: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    position: "relative",
  },
  pollOptionBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: C.accent + "44",
  },
  pollOptionText: { color: C.text, fontSize: 13, flex: 1, paddingVertical: 10, paddingHorizontal: 12, zIndex: 1 },
  pollOptionCount: { color: C.textMuted, fontSize: 12, paddingRight: 12, zIndex: 1 },
  pollOptionVoted: { borderColor: C.accent, opacity: 0.9 },
  pollAddOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    marginBottom: 12,
  },
  pollAddOptionText: { color: C.accent, fontSize: 13, fontWeight: "600" },
  boardCard: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
  },
  boardCardPeatixThread: {
    flexDirection: "column",
    padding: 0,
    overflow: "hidden",
    borderRadius: 14,
  },
  boardFlyerThreadHero: {
    width: "100%",
    aspectRatio: 2 / 3,
    maxHeight: 480,
    backgroundColor: C.surface2,
  },
  boardThreadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  boardThreadRowGrow: { flex: 1 },
  boardThreadRowUnderFlyer: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  boardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  boardBody: { flex: 1, gap: 4 },
  boardFlyerImageCompact: {
    width: "100%",
    height: 96,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: C.surface2,
  },
  boardTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  boardTag: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  boardTagText: {
    fontSize: 10,
    fontWeight: "700",
  },
  boardDate: {
    color: C.textMuted,
    fontSize: 10,
  },
  boardTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 17,
  },
  boardTitleUnderFlyer: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 21,
    marginTop: 2,
  },
  boardDetail: {
    color: C.textSec,
    fontSize: 11,
  },
  boardDetailUnderFlyer: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  requestModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  requestModalSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 24,
    maxHeight: "90%",
  },
  requestModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: "center",
    marginBottom: 8,
  },
  requestModalHeader: {
    marginBottom: 8,
  },
  requestModalEditorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  requestModalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  requestModalTitle: {
    color: C.text,
    fontSize: 15,
    fontWeight: "700",
  },
  requestModalScroll: {
    marginTop: 8,
  },
  requestLabel: {
    color: C.textSec,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 4,
  },
  requestTicketHint: {
    color: C.textMuted,
    fontSize: 10,
    marginBottom: 6,
    lineHeight: 14,
  },
  requestInput: {
    backgroundColor: C.surface2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: C.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: C.border,
  },
  requestInputMultiline: {
    height: 90,
  },
  requestPriceTypeRow: {
    flexDirection: "row",
    gap: 8,
  },
  requestPriceTypePill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    backgroundColor: C.surface2,
  },
  requestPriceTypePillActive: {
    borderColor: C.accent,
    backgroundColor: "rgba(41,182,207,0.1)",
  },
  requestPriceTypeText: {
    color: C.textSec,
    fontSize: 12,
    fontWeight: "700",
  },
  requestPriceTypeTextActive: {
    color: C.text,
  },
  requestSubmitBtn: {
    marginTop: 16,
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  requestSubmitBtnDisabled: {
    opacity: 0.6,
  },
  requestSubmitBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
});
