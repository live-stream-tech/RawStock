import React, { useState, useRef, useEffect, useCallback } from "react";
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
} from "react-native";
import { scrollShowsHorizontal, scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { C } from "@/constants/colors";
import { formatEditorRevenueShareLabel, formatEditorTicketsPerMinute, PRICE_PER_TICKET_USD } from "@/constants/tickets";
import { AppLogo } from "@/components/AppLogo";
import { COMMUNITIES, VIDEOS } from "@/constants/data";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/lib/auth";
import { webScrollStyle } from "@/constants/layout";

type AdData = { title: string; sub: string; cta: string; bg: string; accent: string; thumb: string };

const COMMUNITY_ADS: Record<string, AdData> = {
  "idol": {
    title: "Photo Session — Now Open!",
    sub: "Mar 15 Shibuya WWW • First 50 spots",
    cta: "Reserve",
    bg: "#2a0a18",
    accent: "#FF4081",
    thumb: "https://images.unsplash.com/photo-1524503033411-c9566986fc8f?w=120&h=80&fit=crop",
  },
  "cabaret": {
    title: "VIP Night Event",
    sub: "This Month Only — Special Invitation",
    cta: "Details",
    bg: "#1a0830",
    accent: "#CE93D8",
    thumb: "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=120&h=80&fit=crop",
  },
  "vtuber": {
    title: "3D Live Stream Tickets",
    sub: "Apr 1 Hyper Live • Pre-sale Now",
    cta: "Buy",
    bg: "#08122a",
    accent: "#00ffcc",
    thumb: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&h=80&fit=crop",
  },
  "influencer": {
    title: "Collab Limited Merch",
    sub: "Free Shipping • Limited Stock",
    cta: "Shop",
    bg: "#0a1f10",
    accent: "#69F0AE",
    thumb: "https://images.unsplash.com/photo-1522682078546-47888fe04e81?w=120&h=80&fit=crop",
  },
  "anisong": {
    title: "Anisong Fest 2026",
    sub: "May 3 Makuhari Messe • S Seats On Sale",
    cta: "Tickets",
    bg: "#1a0828",
    accent: "#E040FB",
    thumb: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=120&h=80&fit=crop",
  },
};

const DEFAULT_AD: AdData = {
  title: "Premium Stream Tickets Available",
  sub: "Buy now — 10% off for members",
  cta: "Buy",
  bg: "#0a1520",
  accent: C.accent,
  thumb: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=120&h=80&fit=crop",
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
  posts: Array<{
    id: number;
    threadId: number;
    authorUserId: number;
    body: string;
    createdAt: string;
    author: { displayName: string; profileImageUrl: string | null };
  }>;
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

function formatThreadDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffDay === 0) return "Today";
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function EmbeddedJukebox({ communityId }: { communityId: number }) {
  const qc = useQueryClient();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [comment, setComment] = useState("");
  const [progress, setProgress] = useState(0);

  const { data } = useQuery<JukeboxData>({
    queryKey: [`/api/jukebox/${communityId}`],
    refetchInterval: (query) =>
      (query.state.data as JukeboxData)?.state?.isPlaying ? 5000 : 10000,
  });

  const state = data?.state ?? null;
  const queue = data?.queue ?? [];
  const chat = (data?.chat ?? []).slice(-3);
  // 再生中の曲を除外した「次に再生される」キュー（Now Playing と重複しないように）
  const upcoming = queue.filter(
    (q) =>
      !q.isPlayed &&
      !(state?.currentVideoId != null && q.videoId === state.currentVideoId) &&
      !(state?.currentVideoYoutubeId && (q as any).youtubeId === state.currentVideoYoutubeId)
  );
  // 再生中の曲の「誰が選んだか」表示用
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
  }, []);

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
  }, [comment]);

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
        <Pressable style={jukeStyles.fullBtn} onPress={() => router.push(`/jukebox/${communityId}`)}>
          <Ionicons name="expand" size={13} color={C.textMuted} />
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
              <Text style={jukeStyles.addedBy} numberOfLines={1}>
                Added by {addedByItem.addedBy}
              </Text>
            )}
            <View style={jukeStyles.progressRow}>
              <View style={jukeStyles.progressTrack}>
                <View style={[jukeStyles.progressFill, { width: `${progress * 100}%` as any }]} />
              </View>
              <Text style={jukeStyles.progressTime}>
                {fmtSecs(state.currentVideoDurationSecs)}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={jukeStyles.emptyPlayer}>
          <Ionicons name="musical-notes-outline" size={24} color={C.textMuted} />
          <Text style={jukeStyles.emptyText}>No video playing</Text>
        </View>
      )}

      {chat.length > 0 && (
        <View style={jukeStyles.commentsWrap}>
          {chat.map((msg) => (
            <View key={msg.id} style={jukeStyles.commentRow}>
              <Text style={jukeStyles.commentUser}>{msg.username}</Text>
              <Text style={jukeStyles.commentText} numberOfLines={1}>{msg.message}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={jukeStyles.commentInput}>
        <TextInput
          style={jukeStyles.input}
          placeholder="Comment (not saved)"
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
  options: Array<{ optionId: number; text: string; count: number }>;
  myVoteOptionId?: number | null;
};

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
  const qc = useQueryClient();

  const { data: polls = [], refetch } = useQuery<PollItem[]>({
    queryKey: [`/api/communities/${communityId}/polls`],
    enabled: communityId > 0,
  });

  async function handleCreate() {
    const q = newQuestion.trim();
    const opts = newOptions.map((o) => o.trim()).filter(Boolean);
    if (!q) {
      Alert.alert("", "Please enter a question");
      return;
    }
    if (opts.length < 2) {
      Alert.alert("", "Please enter at least 2 options");
      return;
    }
    if (!requireAuth("Create Poll")) return;
    setCreating(true);
    try {
      await apiRequest("POST", `/api/communities/${communityId}/polls`, { question: q, options: opts });
      setShowCreate(false);
      setNewQuestion("");
      setNewOptions(["", ""]);
      refetch();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to create poll");
    } finally {
      setCreating(false);
    }
  }

  async function handleVote(pollId: number, optionId: number) {
    if (!requireAuth("Vote")) return;
    setVotingPollId(pollId);
    try {
      await apiRequest("POST", `/api/communities/${communityId}/polls/${pollId}/vote`, { optionId });
      refetch();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to vote");
    } finally {
      setVotingPollId(null);
    }
  }

  const totalVotes = (poll: PollItem) => poll.options.reduce((s, o) => s + o.count, 0);

  return (
    <View style={styles.boardList}>
      <View style={styles.boardHeader}>
        <Text style={styles.boardSectionTitle}>Polls</Text>
        {following && (
          <Pressable
            style={styles.createThreadBtn}
            onPress={() => {
              if (!requireAuth("Create Poll")) return;
              setShowCreate(true);
            }}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.createThreadBtnText}>New</Text>
          </Pressable>
        )}
      </View>
      {polls.length === 0 ? (
        <Text style={styles.boardEmpty}>No polls yet</Text>
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
              <Text style={styles.requestModalTitle}>New Poll</Text>
              <Pressable onPress={() => setShowCreate(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={C.textMuted} />
              </Pressable>
            </View>
            <Text style={styles.requestLabel}>Question</Text>
            <TextInput
              style={styles.requestInput}
              placeholder="Poll question"
              placeholderTextColor={C.textMuted}
              value={newQuestion}
              onChangeText={setNewQuestion}
            />
            <Text style={styles.requestLabel}>Options</Text>
            {newOptions.map((o, i) => (
              <TextInput
                key={i}
                style={[styles.requestInput, { marginBottom: 8 }]}
                placeholder={`Option ${i + 1}`}
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
                <Text style={styles.pollAddOptionText}>Add option</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.requestSubmitBtn, creating && styles.requestSubmitBtnDisabled]}
              onPress={handleCreate}
              disabled={creating}
            >
              {creating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.requestSubmitBtnText}>Create</Text>}
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
  onClose,
  onReply,
  requireAuth,
  canModerate,
  onDeleteThread,
  onDeletePost,
}: {
  thread: ThreadDetail;
  communityId: number;
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

  async function handlePostReply() {
    const text = replyText.trim();
    if (!text) return;
    if (!requireAuth("Reply")) return;
    setPosting(true);
    try {
      await apiRequest("POST", `/api/communities/${communityId}/threads/${thread.id}/posts`, { body: text });
      setReplyText("");
      qc.invalidateQueries({ queryKey: [`/api/communities/${communityId}/threads`] });
      qc.invalidateQueries({ queryKey: [`/api/communities/${communityId}/threads/${thread.id}`] });
      onReply();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to post reply");
    } finally {
      setPosting(false);
    }
  }

  return (
    <>
      <View style={styles.threadDetailHeader}>
        <View style={styles.threadDetailTitleRow}>
          <Text style={styles.threadDetailTitle} numberOfLines={2}>{thread.title}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {canModerate && (
              <Pressable
                onPress={() => Alert.alert("Delete Thread", "Delete this thread?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: onDeleteThread },
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
          {thread.author.profileImageUrl ? (
            <Image source={{ uri: thread.author.profileImageUrl }} style={styles.threadDetailAvatar} contentFit="cover" />
          ) : (
            <View style={[styles.threadDetailAvatar, styles.threadAvatarFallback]}>
              <Text style={styles.threadAvatarInitial}>{(thread.author.displayName ?? "?")[0]}</Text>
            </View>
          )}
          <Text style={styles.threadDetailAuthor}>{thread.author.displayName}</Text>
          <Text style={styles.threadDetailDate}>{formatThreadDate(thread.createdAt)}</Text>
        </View>
        {thread.body ? <Text style={styles.threadDetailBody}>{thread.body}</Text> : null}
      </View>
      <ScrollView style={webScrollStyle(styles.threadDetailPosts)} showsVerticalScrollIndicator={scrollShowsVertical}>
        {thread.posts.map((p) => (
          <View key={p.id} style={styles.threadPostRow}>
            {p.author.profileImageUrl ? (
              <Image source={{ uri: p.author.profileImageUrl }} style={styles.threadPostAvatar} contentFit="cover" />
            ) : (
              <View style={[styles.threadPostAvatar, styles.threadAvatarFallback]}>
                <Text style={styles.threadAvatarInitial}>{(p.author.displayName ?? "?")[0]}</Text>
              </View>
            )}
            <View style={styles.threadPostBody}>
              <Text style={styles.threadPostAuthor}>{p.author.displayName}</Text>
              <Text style={styles.threadPostDate}>{formatThreadDate(p.createdAt)}</Text>
              <Text style={styles.threadPostText}>{p.body}</Text>
            </View>
            {canModerate && (
              <Pressable
                style={styles.threadPostDelete}
                onPress={() => Alert.alert("Delete", "Delete this reply?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => onDeletePost(p.id) },
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
          placeholder="Write a reply..."
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
    </>
  );
}

const TABS = ["Latest", "Creators", "Board"] as const;
type Tab = typeof TABS[number];

type CommunityCreatorsResponse = {
  editors: (VideoEditor & { kind: "editor" })[];
  livers: ({ id: number; name: string; avatar: string; community: string; rank: number; heatScore: number; totalViews: number; followers: number; category: string; bio: string } & { kind: "liver" })[];
};

export default function CommunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>("Latest");
  const [following, setFollowing] = useState(false);
  const { user, token, requireAuth } = useAuth();
  const numericId = Number(id);

  const { data: apiCommunity } = useQuery<any>({
    queryKey: [`/api/communities/${numericId}`],
    enabled: !Number.isNaN(numericId),
  });

  const community =
    apiCommunity ??
    COMMUNITIES.find((c) => c.id === id) ??
    COMMUNITIES[0];

  const communityId = Number(community.id ?? numericId);
  const ad = getAd(community.name);
  const bottomInset = Platform.OS === "web" ? 34 : 0;

  type StaffData = {
    adminId: number | null;
    admin: { id: number; displayName: string; profileImageUrl: string | null } | null;
    moderatorIds: number[];
    moderators: { id: number; displayName: string; profileImageUrl: string | null }[];
  };
  type MemberItem = { id: number; displayName: string; profileImageUrl: string | null };

  const { data: meMemberData } = useQuery<{ isMember: boolean }>({
    queryKey: [`/api/communities/${communityId}/members/me`],
    enabled: !!user?.id,
  });
  useEffect(() => {
    if (meMemberData?.isMember !== undefined) setFollowing(meMemberData.isMember);
  }, [meMemberData?.isMember]);
  const [requestEditor, setRequestEditor] = useState<VideoEditor | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [showCreateThread, setShowCreateThread] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadBody, setNewThreadBody] = useState("");
  const [creatingThread, setCreatingThread] = useState(false);
  const [requestTitle, setRequestTitle] = useState("");
  const [requestDescription, setRequestDescription] = useState("");
  const [requestPriceType, setRequestPriceType] = useState<"per_minute" | "revenue_share">("per_minute");
  const [requestBudget, setRequestBudget] = useState("");
  const [requestDeadline, setRequestDeadline] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);

  const { data: staffData } = useQuery<StaffData>({
    queryKey: [`/api/communities/${communityId}/staff`],
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

  const { data: editors = [], isLoading: editorsLoading } = useQuery<VideoEditor[]>({
    queryKey: [`/api/communities/${communityId}/editors`],
  });

  const { data: creatorsData, isLoading: creatorsLoading } = useQuery<CommunityCreatorsResponse>({
    queryKey: [`/api/communities/${communityId}/creators`],
  });

  const topEditors = [...editors].sort((a, b) => b.rating - a.rating).slice(0, 3);
  const creatorsEditors = creatorsData?.editors ?? [];
  const creatorsLivers = creatorsData?.livers ?? [];

  const { data: apiVideos = [] } = useQuery<any[]>({
    queryKey: ["/api/videos"],
  });

  const { data: threads = [], refetch: refetchThreads } = useQuery<ThreadItem[]>({
    queryKey: [`/api/communities/${communityId}/threads`],
    enabled: activeTab === "Board" && communityId > 0,
    refetchInterval: activeTab === "Board" ? 30000 : false,
  });
  const { data: threadDetail, refetch: refetchThreadDetail } = useQuery<ThreadDetail>({
    queryKey: [`/api/communities/${communityId}/threads/${selectedThreadId}`],
    enabled: !!selectedThreadId && communityId > 0,
    refetchInterval: !!selectedThreadId ? 15000 : false,
  });

  const usingDemoVideos = apiVideos.length === 0;
  const timelineVideos = usingDemoVideos
    ? VIDEOS.slice(0, 4)
    : (apiVideos as any[]).filter((v) => v.community === community.name);

  const createThreadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/communities/${communityId}/threads`, {
        title: newThreadTitle.trim(),
        body: newThreadBody.trim(),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setShowCreateThread(false);
      setNewThreadTitle("");
      setNewThreadBody("");
      refetchThreads();
      setSelectedThreadId(data.id);
    },
  });

  async function handleCreateThread() {
    if (!newThreadTitle.trim()) {
      Alert.alert("", "Please enter a title");
      return;
    }
    if (!requireAuth("Create Thread")) return;
    setCreatingThread(true);
    try {
      await createThreadMutation.mutateAsync();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to create thread");
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
    if (!requireAuth("Manage Staff") || !isCommunityAdmin) return;
    setSavingStaff(true);
    try {
      await apiRequest("PATCH", `/api/communities/${communityId}/staff`, {
        adminId: selectedAdminId,
        moderatorIds: selectedModeratorIds,
      });
      qc.invalidateQueries({ queryKey: [`/api/communities/${communityId}/staff`] });
      setStaffModalVisible(false);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to save");
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
      Alert.alert("Error", "Please enter a title and description.");
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
      Alert.alert("Sent", "Your request has been sent!");
      setRequestEditor(null);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", "Failed to send request. Please try again later.");
    } finally {
      setSendingRequest(false);
    }
  };

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

        <Pressable style={[styles.adBanner, { backgroundColor: ad.bg }]}>
          <View style={styles.adPrBadge}>
            <Text style={styles.adPrText}>PR</Text>
          </View>
          <Image source={{ uri: ad.thumb }} style={styles.adThumb} contentFit="cover" />
          <View style={styles.adBody}>
            <Text style={styles.adTitle} numberOfLines={1}>{ad.title}</Text>
            <Text style={styles.adSub} numberOfLines={1}>{ad.sub}</Text>
          </View>
          <View style={[styles.adCtaBtn, { backgroundColor: ad.accent }]}>
            <Text style={styles.adCtaText}>{ad.cta}</Text>
          </View>
        </Pressable>

        <Pressable
          style={styles.bannerCheckoutBtn}
          onPress={() => {
            if (!requireAuth("Ad Placement")) return;
            router.push(`/community/ad-apply?communityId=${communityId}`);
          }}
        >
          <Ionicons name="megaphone" size={18} color="#fff" />
          <Text style={styles.bannerCheckoutBtnText}>Place an Ad</Text>
        </Pressable>

        <View style={styles.profileSection}>
          <View style={styles.profileRow}>
            <View style={styles.communityAvatarContainer}>
              <Image source={{ uri: community.thumbnail }} style={styles.communityAvatar} contentFit="cover" />
              {community.online && <View style={styles.onlineDot} />}
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.communityName}>{community.name}</Text>
                <View style={styles.officialBadge}>
                  <Text style={styles.officialText}>OFFICIAL</Text>
                </View>
              </View>
              <Text style={styles.categoryText}>{community.category}</Text>
            </View>
          </View>

          <Text style={styles.description}>Support community for {community.name} — connect through live streams and photo sessions</Text>

          <View style={styles.statsRow}>
            <Pressable
              style={styles.statPressable}
              onPress={() => router.push(`/community/members/${communityId}`)}
            >
              <Text style={styles.statText}>
                <Text style={styles.statNumber}>{((community.members ?? 0) / 1000).toFixed(0)}K</Text>
                {" "}followers
              </Text>
            </Pressable>
            <Text style={styles.statDivider}>·</Text>
            <Text style={styles.statText}>
              <Text style={styles.statNumber}>2</Text>
              {" "}creators
            </Text>
          </View>
          <Pressable
            style={styles.membersLink}
            onPress={() => router.push(`/community/members/${communityId}`)}
          >
            <Ionicons name="people-outline" size={16} color={C.accent} />
            <Text style={styles.membersLinkText}>View all members</Text>
            <Ionicons name="chevron-forward" size={16} color={C.accent} />
          </Pressable>

          {(staffData?.admin || (staffData?.moderators && staffData.moderators.length > 0)) && (
            <View style={styles.staffHintRow}>
              <Ionicons name="shield-checkmark-outline" size={13} color={C.accent} />
              <Text style={styles.staffHintText}>This community has an admin and moderators</Text>
            </View>
          )}

          <Pressable
            style={[styles.followBtn, following && styles.followBtnActive]}
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
                // 既にメンバーなど
                setFollowing(true);
              }
            }}
          >
            <Ionicons
              name={following ? "checkmark" : "add"}
              size={16}
              color={following ? C.textSec : "#fff"}
            />
            <Text style={[styles.followBtnText, following && styles.followBtnTextActive]}>
              {following ? "Following" : "Follow"}
            </Text>
          </Pressable>

          {(staffData?.admin || (staffData?.moderators && staffData.moderators.length > 0)) && (
            <View style={styles.staffSection}>
              <View style={styles.staffSectionHeader}>
                <Text style={styles.staffSectionTitle}>Admin & Moderators</Text>
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
                          <Text style={styles.staffEditLink}>Edit</Text>
                        </Pressable>
                        <Pressable onPress={() => router.push("/community/ad-review")}>
                          <Text style={styles.staffEditLink}>Ad Review</Text>
                        </Pressable>
                      </>
                    )}
                    <Pressable onPress={() => router.push(`/community/${communityId}/admin`)}>
                      <Text style={styles.staffEditLink}>Admin Panel</Text>
                    </Pressable>
                  </View>
                )}
              </View>
              {staffData?.admin && (
                <Pressable
                  style={styles.staffRow}
                  onPress={() => router.push(`/user/${staffData.admin!.id}`)}
                >
                  <Image source={{ uri: staffData.admin.profileImageUrl ?? undefined }} style={styles.staffAvatar} contentFit="cover" pointerEvents="none" />
                  <Text style={styles.staffLabel}>Admin</Text>
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
                    <Image source={{ uri: m.profileImageUrl ?? undefined }} style={styles.staffAvatar} contentFit="cover" pointerEvents="none" />
                    <Text style={styles.staffLabel}>Moderator</Text>
                    <Text style={styles.staffName}>{m.displayName}</Text>
                    <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
                  </Pressable>
                ))
              )}
            </View>
          )}

        </View>

        {/* Jukebox CTA */}
        <Pressable
          style={styles.jukeboxCta}
          onPress={() => router.push(`/jukebox/${communityId}`)}
        >
          <View style={styles.jukeboxCtaLeft}>
            <View style={styles.jukeboxCtaBadge}>
              <Ionicons name="musical-notes" size={14} color="#fff" />
              <Text style={styles.jukeboxCtaBadgeText}>JUKEBOX</Text>
            </View>
            <Text style={styles.jukeboxCtaTitle} numberOfLines={2}>
              Watch together in this community
            </Text>
            <Text style={styles.jukeboxCtaSub} numberOfLines={1}>
              Add YouTube or uploaded videos to the queue
            </Text>
          </View>
          <View style={styles.jukeboxCtaRight}>
            <Ionicons name="play-circle" size={26} color="#fff" />
          </View>
        </Pressable>

        <EmbeddedJukebox communityId={communityId} />

        <View style={styles.tabRow}>
          {TABS.map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </Pressable>
          ))}
        </View>

        {activeTab === "Latest" && (
          <View>
            <View style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <Ionicons name="videocam" size={18} color={C.accent} />
                <Text style={styles.requestTitle}>Request a Video</Text>
              </View>
              <Text style={styles.requestDesc}>
                Work with a professional editor to share your activity as a high-quality video with the community.
              </Text>
              <View style={styles.requestActions}>
                <Pressable style={styles.requestPrimaryBtn}>
                  <Text style={styles.requestPrimaryText}>Create Request</Text>
                </Pressable>
                <Pressable style={styles.requestSecondaryBtn}>
                  <Text style={styles.requestSecondaryText}>Editor List</Text>
                </Pressable>
              </View>
            </View>

            {timelineVideos.map((video: any) => (
              <Pressable
                key={video.id}
                style={styles.postCard}
                onPress={() =>
                  router.push(
                    usingDemoVideos
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
                    <Image source={{ uri: video.avatar }} style={styles.postAvatar} contentFit="cover" pointerEvents="none" />
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
              </Pressable>
            ))}
          </View>
        )}

        {activeTab === "Creators" && (
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
                            <Image source={{ uri: editor.avatar }} style={styles.editorAvatar} contentFit="cover" />
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
                                <Text style={styles.editorMetaText}>Delivery: {editor.deliveryDays}d</Text>
                                <Text style={styles.editorMetaText}>
                                  {editor.priceType === "both" &&
                                  editor.pricePerMinute != null &&
                                  editor.revenueSharePercent != null
                                    ? `${formatEditorTicketsPerMinute(editor.pricePerMinute)} · ${formatEditorRevenueShareLabel(editor.revenueSharePercent)}`
                                    : editor.priceType === "per_minute" && editor.pricePerMinute
                                      ? formatEditorTicketsPerMinute(editor.pricePerMinute)
                                      : editor.priceType === "revenue_share" && editor.revenueSharePercent
                                        ? formatEditorRevenueShareLabel(editor.revenueSharePercent)
                                        : "TBD"}
                                </Text>
                              </View>
                            </View>
                            <Pressable style={styles.editorRequestBtn} onPress={() => openRequestModal(editor)}>
                              <Text style={styles.editorRequestBtnText}>Request</Text>
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
              <Text style={styles.boardSectionTitle}>Threads</Text>
              {following && (
                <Pressable
                  style={styles.createThreadBtn}
                  onPress={() => {
                    if (!requireAuth("Create Thread")) return;
                    setShowCreateThread(true);
                  }}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.createThreadBtnText}>New Thread</Text>
                </Pressable>
              )}
            </View>
            {following && (
              <View style={styles.createThreadForm}>
                <TextInput
                  style={styles.createThreadInput}
                  placeholder="Title"
                  placeholderTextColor={C.textMuted}
                  value={newThreadTitle}
                  onChangeText={setNewThreadTitle}
                />
                <TextInput
                  style={[styles.createThreadInput, styles.createThreadInputBody]}
                  placeholder="Body (optional)"
                  placeholderTextColor={C.textMuted}
                  value={newThreadBody}
                  onChangeText={setNewThreadBody}
                  multiline
                  textAlignVertical="top"
                />
                <Pressable
                  style={[styles.createThreadSubmitBtn, (!newThreadTitle.trim() || creatingThread) && styles.createThreadSubmitBtnDisabled]}
                  onPress={handleCreateThread}
                  disabled={!newThreadTitle.trim() || creatingThread}
                >
                  {creatingThread ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.createThreadSubmitText}>Post Thread</Text>
                  )}
                </Pressable>
              </View>
            )}
            {threads.length === 0 ? (
              <Text style={styles.boardEmpty}>No threads yet</Text>
            ) : (
              threads.map((t) => (
                <Pressable
                  key={t.id}
                  style={styles.boardCard}
                  onPress={() => setSelectedThreadId(t.id)}
                >
                  <View style={styles.boardBody}>
                    <View style={styles.boardTagRow}>
                      {t.pinned && (
                        <View style={[styles.boardTag, { backgroundColor: C.orange + "33" }]}>
                          <Text style={[styles.boardTagText, { color: C.orange }]}>Pinned</Text>
                        </View>
                      )}
                      <Text style={styles.boardDate}>
                        {t.author.displayName} · {formatThreadDate(t.createdAt)}
                      </Text>
                    </View>
                    <Text style={styles.boardTitle}>{t.title}</Text>
                    {t.body ? <Text style={styles.boardDetail} numberOfLines={1}>{t.body}</Text> : null}
                    <Text style={styles.boardPostCount}>{t.postCount} replies</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
                </Pressable>
              ))
            )}

            {/* No-Confidence Motion — members only */}
            {following && (
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
                          Alert.alert("Coming Soon", "The no-confidence motion feature will be available soon.");
                        }}
                      >
                        <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800" }}>Submit</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* スレッド詳細モーダル */}
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
                    Alert.alert("Error", e?.message ?? "Failed to delete");
                  }
                }}
                onDeletePost={async (postId) => {
                  try {
                    await apiRequest("DELETE", `/api/communities/${communityId}/threads/${threadDetail.id}/posts/${postId}`);
                    refetchThreadDetail();
                    refetchThreads();
                  } catch (e: any) {
                    Alert.alert("Error", e?.message ?? "Failed to delete");
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

      {/* 新規スレッド作成モーダル */}
      <Modal
        visible={showCreateThread}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateThread(false)}
      >
        <View style={styles.requestModalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowCreateThread(false)} />
          <View style={styles.requestModalSheet}>
            <View style={styles.requestModalHandle} />
            <View style={styles.requestModalHeader}>
              <Text style={styles.requestModalTitle}>New Thread</Text>
              <Pressable onPress={() => setShowCreateThread(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={C.textMuted} />
              </Pressable>
            </View>
            <Text style={styles.requestLabel}>Title</Text>
            <TextInput
              style={styles.requestInput}
              placeholder="Thread title"
              placeholderTextColor={C.textMuted}
              value={newThreadTitle}
              onChangeText={setNewThreadTitle}
            />
            <Text style={styles.requestLabel}>Body (optional)</Text>
            <TextInput
              style={[styles.requestInput, styles.requestInputMultiline]}
              placeholder="Opening post content"
              placeholderTextColor={C.textMuted}
              value={newThreadBody}
              onChangeText={setNewThreadBody}
              multiline
              textAlignVertical="top"
            />
            <Pressable
              style={[styles.requestSubmitBtn, creatingThread && styles.requestSubmitBtnDisabled]}
              onPress={handleCreateThread}
              disabled={creatingThread}
            >
              {creatingThread ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.requestSubmitBtnText}>Create</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* 編集依頼モーダル */}
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
                    <Image source={{ uri: requestEditor.avatar }} style={styles.requestModalAvatar} contentFit="cover" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.requestModalTitle}>Request {requestEditor.name}</Text>
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
                  <Text style={styles.requestLabel}>Request Title</Text>
                  <TextInput
                    style={styles.requestInput}
                    placeholder="e.g. Weekly gaming stream highlight edit"
                    placeholderTextColor={C.textMuted}
                    value={requestTitle}
                    onChangeText={setRequestTitle}
                  />

                  <Text style={styles.requestLabel}>Description</Text>
                  <TextInput
                    style={[styles.requestInput, styles.requestInputMultiline]}
                    placeholder="Describe the style, length, tone, and any reference links."
                    placeholderTextColor={C.textMuted}
                    value={requestDescription}
                    onChangeText={setRequestDescription}
                    multiline
                    textAlignVertical="top"
                  />

                  <Text style={styles.requestLabel}>Pricing Model</Text>
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
                        Per minute
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
                        Revenue share
                      </Text>
                    </Pressable>
                  </View>

                  <Text style={styles.requestLabel}>
                    {requestPriceType === "per_minute" ? "Target budget (🎟 / min)" : "Target rev share (%)"}
                  </Text>
                  {requestPriceType === "per_minute" ? (
                    <Text style={styles.requestTicketHint}>
                      1 Ticket = ${PRICE_PER_TICKET_USD.toFixed(2)} USD (same as Ticket Shop)
                    </Text>
                  ) : null}
                  <TextInput
                    style={styles.requestInput}
                    placeholder={requestPriceType === "per_minute" ? "e.g. 150" : "e.g. 40"}
                    placeholderTextColor={C.textMuted}
                    value={requestBudget}
                    onChangeText={setRequestBudget}
                    keyboardType="numeric"
                  />

                  <Text style={styles.requestLabel}>Deadline</Text>
                  <TextInput
                    style={styles.requestInput}
                    placeholder="e.g. First delivery by end of March"
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
                      {sendingRequest ? "Sending..." : "Send Request"}
                    </Text>
                  </Pressable>
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* 管理人・モデレーター設定モーダル（メンバーから選択） */}
      <Modal visible={staffModalVisible} transparent animationType="slide">
        <Pressable style={styles.requestModalOverlay} onPress={() => !savingStaff && setStaffModalVisible(false)}>
          <Pressable style={[styles.requestModalSheet, styles.staffModalSheet]} onPress={() => {}}>
            <View style={styles.requestModalHandle} />
            <Text style={styles.requestModalTitle}>Admin & Moderators</Text>
            <Text style={styles.staffModalHint}>Select from members. Users who follow the community appear here.</Text>

            {membersLoading ? (
              <ActivityIndicator size="small" color={C.accent} style={{ marginVertical: 24 }} />
            ) : members.length === 0 ? (
              <View style={styles.staffEmptyWrap}>
                <Ionicons name="people-outline" size={32} color={C.textMuted} />
                <Text style={styles.staffEmptyText}>No members yet</Text>
                <Text style={styles.staffEmptySub}>Members who follow the community will appear here</Text>
              </View>
            ) : (
              <ScrollView style={webScrollStyle(styles.staffPickerScroll)} showsVerticalScrollIndicator={scrollShowsVertical}>
                <Text style={styles.staffPickerSectionTitle}>Admin (1 person)</Text>
                {members.map((m) => (
                  <Pressable
                    key={m.id}
                    style={[styles.staffPickerRow, selectedAdminId === m.id && styles.staffPickerRowSelected]}
                    onPress={() => setSelectedAdminId(selectedAdminId === m.id ? null : m.id)}
                  >
                    <Image source={{ uri: m.profileImageUrl ?? undefined }} style={styles.staffPickerAvatar} contentFit="cover" />
                    <Text style={styles.staffPickerName} numberOfLines={1}>{m.displayName}</Text>
                    {selectedAdminId === m.id && <Ionicons name="checkmark-circle" size={22} color={C.accent} />}
                  </Pressable>
                ))}
                <Text style={[styles.staffPickerSectionTitle, { marginTop: 16 }]}>Moderators (multiple allowed)</Text>
                {members.map((m) => (
                  <Pressable
                    key={`mod-${m.id}`}
                    style={[styles.staffPickerRow, selectedModeratorIds.includes(m.id) && styles.staffPickerRowSelected]}
                    onPress={() => toggleModerator(m.id)}
                  >
                    <Image source={{ uri: m.profileImageUrl ?? undefined }} style={styles.staffPickerAvatar} contentFit="cover" />
                    <Text style={styles.staffPickerName} numberOfLines={1}>{m.displayName}</Text>
                    {selectedModeratorIds.includes(m.id) && <Ionicons name="checkmark-circle" size={22} color={C.accent} />}
                  </Pressable>
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
    marginBottom: 12,
    backgroundColor: C.surface,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
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
  fullBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
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
  adBanner: {
    flexDirection: "row",
    alignItems: "center",
    height: 76,
    paddingHorizontal: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
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
  bannerCheckoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: C.accent,
  },
  bannerCheckoutBtnDisabled: { opacity: 0.7 },
  bannerCheckoutBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  profileSection: { padding: 16, gap: 10 },
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
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 10,
  },
  staffSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  staffSectionTitle: { color: C.textMuted, fontSize: 12, fontWeight: "600" },
  staffAdminLinks: { flexDirection: "row", alignItems: "center", gap: 16 },
  staffEditLink: { color: C.accent, fontSize: 13, fontWeight: "600" },
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
    gap: 6,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  membersLinkText: { color: C.accent, fontSize: 14, fontWeight: "600" },
  staffHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  staffHintText: { color: C.textMuted, fontSize: 11 },
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 11,
  },
  followBtnActive: {
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
  },
  followBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  followBtnTextActive: { color: C.textSec },
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
  requestCard: {
    margin: 16,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  requestHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  requestTitle: { color: C.text, fontSize: 14, fontWeight: "700" },
  requestDesc: { color: C.textSec, fontSize: 12, lineHeight: 17 },
  requestActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  requestPrimaryBtn: {
    flex: 1,
    backgroundColor: C.accent,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: "center",
  },
  requestPrimaryText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  requestSecondaryBtn: {
    backgroundColor: C.surface3,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  requestSecondaryText: { color: C.text, fontSize: 13, fontWeight: "700" },
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
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  createThreadBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
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
  boardEmpty: { color: C.textMuted, fontSize: 14, paddingVertical: 24, textAlign: "center" },
  boardPostCount: { color: C.textMuted, fontSize: 10, marginTop: 2 },
  threadDetailHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  threadDetailTitleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8, gap: 8 },
  threadDetailTitle: { color: C.text, fontSize: 16, fontWeight: "800", flex: 1 },
  threadDetailMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  threadDetailAvatar: { width: 28, height: 28, borderRadius: 14 },
  threadAvatarFallback: { backgroundColor: C.surface2, alignItems: "center", justifyContent: "center" },
  threadAvatarInitial: { color: C.textMuted, fontSize: 12, fontWeight: "700" },
  threadDetailAuthor: { color: C.textSec, fontSize: 12, fontWeight: "600" },
  threadDetailDate: { color: C.textMuted, fontSize: 11 },
  threadDetailBody: { color: C.textSec, fontSize: 13, lineHeight: 20 },
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
    alignItems: "center",
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
  },
  boardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  boardBody: { flex: 1, gap: 4 },
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
  boardDetail: {
    color: C.textSec,
    fontSize: 11,
  },
  jukeboxCta: {
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: C.accentDark,
    borderWidth: 1,
    borderColor: C.accent,
    gap: 10,
  },
  jukeboxCtaLeft: {
    flex: 1,
    gap: 4,
  },
  jukeboxCtaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  jukeboxCtaBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  jukeboxCtaTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  jukeboxCtaSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
  },
  jukeboxCtaRight: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
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
