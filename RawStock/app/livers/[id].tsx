import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { scrollShowsHorizontal, scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Linking } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { C } from "@/constants/colors";
import { CREATORS } from "@/constants/data";

type Liver = {
  id: number;
  name: string;
  community: string;
  avatar: string;
  rank: number;
  heatScore: number;
  streamCount: number;
  followers: number;
  satisfactionScore: number;
  attendanceRate: number;
  bio: string;
  category: string;
  spotifyUrl?: string | null;
  appleMusicUrl?: string | null;
  bandcampUrl?: string | null;
};

type Review = {
  id: number;
  liverId: number;
  userId: string;
  userName: string;
  userAvatar: string | null;
  satisfactionScore: number;
  streamCountScore: number;
  attendanceScore: number;
  overallScore: number;
  comment: string;
  sessionDate: string;
  createdAt: string;
};

type Slot = {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  maxSlots: number;
  bookedSlots: number;
  note: string;
};

type VideoSummary = {
  id: number;
  title: string;
  thumbnail: string;
  creator: string;
  community: string;
  timeAgo?: string | null;
};

type CommunitySummary = {
  id: number;
  name: string;
  members: number;
  thumbnail: string;
  online: boolean;
  category: string;
};

function StarRow({ score, max = 5 }: { score: number; max?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {Array.from({ length: max }, (_, i) => (
        <Ionicons
          key={i}
          name={i < Math.round(score) ? "star" : "star-outline"}
          size={12}
          color={C.orange}
        />
      ))}
    </View>
  );
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <View style={styles.scoreBarRow}>
      <Text style={styles.scoreBarLabel}>{label}</Text>
      <View style={styles.scoreBarBg}>
        <View style={[styles.scoreBarFill, { width: `${(score / 5) * 100}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.scoreBarValue, { color }]}>{score.toFixed(1)}</Text>
    </View>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function formatSlotDate(dateStr: string): string {
  const d = new Date(dateStr);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${d.getMonth() + 1}/${d.getDate()} (${weekdays[d.getDay()]})`;
}

export default function LiverDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const liverId = parseInt(id ?? "1");
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"overview" | "reviews" | "schedule">("overview");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [myName, setMyName] = useState("Guest");
  const [mySatisfaction, setMySatisfaction] = useState(5);
  const [myStreamCount, setMyStreamCount] = useState(5);
  const [myAttendance, setMyAttendance] = useState(5);
  const [myComment, setMyComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: liver, isLoading: liverLoading } = useQuery<Liver>({
    queryKey: [`/api/livers/${liverId}`],
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<Review[]>({
    queryKey: [`/api/livers/${liverId}/reviews`],
  });

  const { data: slots = [] } = useQuery<Slot[]>({
    queryKey: [`/api/livers/${liverId}/availability`],
  });
  const { data: allVideos = [] } = useQuery<VideoSummary[]>({
    queryKey: ["/api/videos"],
  });
  const { data: allCommunities = [] } = useQuery<CommunitySummary[]>({
    queryKey: ["/api/communities"],
  });

  const reviewMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", `/api/livers/${liverId}/reviews`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/livers/${liverId}/reviews`] });
      queryClient.invalidateQueries({ queryKey: [`/api/livers/${liverId}`] });
      setShowReviewModal(false);
      setMyComment("");
      Alert.alert("Posted", "Your review has been submitted.");
    },
    onError: () => Alert.alert("Error", "Failed to submit review."),
  });

  function handleReviewSubmit() {
    if (!myComment.trim()) {
      Alert.alert("Missing Input", "Please enter a comment.");
      return;
    }
    reviewMutation.mutate({
      userName: myName,
      satisfactionScore: mySatisfaction,
      streamCountScore: myStreamCount,
      attendanceScore: myAttendance,
      comment: myComment,
      sessionDate: new Date().toISOString().slice(0, 10),
    });
  }

  if (liverLoading) {
    return (
      <View style={[styles.container, { paddingTop: topInset, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  const creatorBase = CREATORS.find((c) => c.id === String(liverId));
  const fallbackLiver: Liver | undefined = creatorBase && {
    id: liverId,
    name: creatorBase.name,
    community: creatorBase.community,
    avatar: creatorBase.avatar,
    rank: creatorBase.rank,
    heatScore: creatorBase.heatScore,
    streamCount: creatorBase.streamCount,
    followers: creatorBase.followers,
    satisfactionScore: 4.6,
    attendanceRate: 4.8,
    bio: `A popular creator active in ${creatorBase.community}.`,
    category: "dummy",
    spotifyUrl: null,
    appleMusicUrl: null,
    bandcampUrl: null,
  };

  const displayLiver = liver ?? fallbackLiver;

  if (!displayLiver) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <Text style={{ color: C.text, margin: 20 }}>Creator not found.</Text>
      </View>
    );
  }

  const avgOverall = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.overallScore, 0) / reviews.length)
    : displayLiver.heatScore;

  const upcomingSlots = slots
    .filter((s) => s.date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    .slice(0, 10);

  function ScoreSelector({ value, onChange, max = 5 }: { value: number; onChange: (v: number) => void; max?: number }) {
    return (
      <View style={{ flexDirection: "row", gap: 8 }}>
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            style={[styles.scoreStar, n <= value && styles.scoreStarActive]}
          >
            <Ionicons name="star" size={20} color={n <= value ? C.orange : C.textMuted} />
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{displayLiver.name}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={scrollShowsVertical}>
        <View style={styles.profileCard}>
          <Image source={{ uri: displayLiver.avatar }} style={styles.avatar} contentFit="cover" />
          <View style={styles.profileInfo}>
            <View style={styles.nameRankRow}>
              <Text style={styles.name}>{displayLiver.name}</Text>
              <View style={styles.rankBadge}>
                <Ionicons name="trophy" size={11} color={C.orange} />
                <Text style={styles.rankText}>#{displayLiver.rank}</Text>
              </View>
            </View>
            <Text style={styles.community}>{displayLiver.community}</Text>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{displayLiver.followers.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{displayLiver.streamCount}</Text>
                <Text style={styles.statLabel}>Streams</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{avgOverall.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Overall</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 音楽リンク */}
        {(displayLiver.spotifyUrl || displayLiver.appleMusicUrl || displayLiver.bandcampUrl) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Listen &amp; Buy Music</Text>
            {displayLiver.spotifyUrl && (
              <Pressable
                style={styles.musicBtn}
                onPress={() => Linking.openURL(displayLiver.spotifyUrl as string)}
              >
                <Ionicons name="musical-notes-outline" size={16} color="#1DB954" />
                <Text style={styles.musicBtnText}>Listen on Spotify</Text>
              </Pressable>
            )}
            {displayLiver.appleMusicUrl && (
              <Pressable
                style={styles.musicBtn}
                onPress={() => Linking.openURL(displayLiver.appleMusicUrl as string)}
              >
                <Ionicons name="musical-note-outline" size={16} color="#FA2D48" />
                <Text style={styles.musicBtnText}>Listen on Apple Music</Text>
              </Pressable>
            )}
            {displayLiver.bandcampUrl && (
              <Pressable
                style={styles.musicBtn}
                onPress={() => Linking.openURL(displayLiver.bandcampUrl as string)}
              >
                <Ionicons name="logo-soundcloud" size={16} color="#00ffcc" />
                <Text style={styles.musicBtnText}>Listen / Buy on Bandcamp</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* コンパクトなタイムライン + 参加コミュニティ */}
        {(() => {
          const myVideos = (allVideos as VideoSummary[]).filter((v) => v.creator === displayLiver.name).slice(0, 3);
          const liverCommunities = (allCommunities as CommunitySummary[]).filter(
            (c) => c.name === displayLiver.community
          );
          return (
            <>
              {myVideos.length > 0 && (
                <View style={styles.miniTimelineSection}>
                  <View style={styles.miniTimelineHeader}>
                    <Text style={styles.miniTimelineTitle}>Recent Posts</Text>
                    <Text style={styles.miniTimelineCount}>{myVideos.length}</Text>
                  </View>
                  <View style={styles.miniTimelineList}>
                    {myVideos.map((v) => (
                      <Pressable
                        key={v.id}
                        style={styles.miniTimelineItem}
                        onPress={() => router.push(`/video/${v.id}`)}
                      >
                        <View style={styles.miniTimelineIcon}>
                          <Ionicons name="document-text-outline" size={14} color={C.accent} />
                        </View>
                        <View style={styles.miniTimelineBody}>
                          <Text style={styles.miniTimelineText} numberOfLines={2}>
                            {v.title}
                          </Text>
                          <Text style={styles.miniTimelineMeta} numberOfLines={1}>
                            {v.community} · {v.timeAgo ?? "Just now"}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {liverCommunities.length > 0 && (
                <View style={styles.miniCommunitiesSection}>
                  <View style={styles.miniCommunitiesHeader}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons name="people-outline" size={16} color={C.accent} />
                      <Text style={styles.miniCommunitiesTitle}>Communities</Text>
                    </View>
                    <Text style={styles.miniCommunitiesCount}>{liverCommunities.length}</Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={scrollShowsHorizontal}
                    contentContainerStyle={styles.miniCommunitiesList}
                  >
                    {liverCommunities.map((c) => (
                      <Pressable
                        key={c.id}
                        style={styles.miniCommunityCard}
                        onPress={() => router.push(`/community/${c.id}`)}
                      >
                        <Image source={{ uri: c.thumbnail }} style={styles.miniCommunityThumb} contentFit="cover" />
                        <View style={styles.miniCommunityOverlay} />
                        {c.online && (
                          <View style={styles.miniCommunityLiveBadge}>
                            <View style={styles.miniCommunityLiveDot} />
                            <Text style={styles.miniCommunityLiveText}>LIVE</Text>
                          </View>
                        )}
                        <View style={styles.miniCommunityBottom}>
                          <Text style={styles.miniCommunityName} numberOfLines={1}>
                            {c.name}
                          </Text>
                          <Text style={styles.miniCommunityMeta} numberOfLines={1}>
                            {c.members.toLocaleString()} members
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          );
        })()}

        <View style={styles.tabs}>
          {(["overview", "reviews", "schedule"] as const).map((tab) => {
            const labels = { overview: "Scores", reviews: `Reviews (${reviews.length})`, schedule: "Schedule" };
            return (
              <Pressable
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {labels[tab]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {activeTab === "overview" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3-Axis Score</Text>
            <View style={styles.scoreCard}>
              <View style={styles.overallRow}>
                <Text style={styles.overallScore}>{avgOverall.toFixed(1)}</Text>
                <View>
                  <StarRow score={avgOverall} />
                  <Text style={styles.overallSub}>Based on {reviews.length} reviews</Text>
                </View>
              </View>
              <View style={{ gap: 10, marginTop: 16 }}>
                <ScoreBar label="① Satisfaction" score={displayLiver.satisfactionScore} color={C.accent} />
                <ScoreBar label="② Stream Count" score={Math.min(displayLiver.streamCount / 20, 5.0)} color={C.orange} />
                <ScoreBar label="③ Attendance Rate" score={displayLiver.attendanceRate} color={C.green} />
              </View>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Stream Stats</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Ionicons name="radio-outline" size={20} color={C.accent} />
                <Text style={styles.metricValue}>{displayLiver.streamCount}</Text>
                <Text style={styles.metricLabel}>Total Streams</Text>
              </View>
              <View style={styles.metricCard}>
                <Ionicons name="people-outline" size={20} color={C.orange} />
                <Text style={styles.metricValue}>{(displayLiver.followers / 1000).toFixed(1)}K</Text>
                <Text style={styles.metricLabel}>Followers</Text>
              </View>
              <View style={styles.metricCard}>
                <Ionicons name="star-outline" size={20} color={C.green} />
                <Text style={styles.metricValue}>{displayLiver.attendanceRate.toFixed(1)}</Text>
                <Text style={styles.metricLabel}>Attendance</Text>
              </View>
            </View>

            <Pressable
              style={styles.bookBtn}
              onPress={() => setActiveTab("schedule")}
            >
              <Ionicons name="calendar-outline" size={16} color="#fff" />
              <Text style={styles.bookBtnText}>Check Available Time Slots</Text>
            </Pressable>
          </View>
        )}

        {activeTab === "reviews" && (
          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>User Reviews</Text>
              <Pressable style={styles.addReviewBtn} onPress={() => setShowReviewModal(true)}>
                <Ionicons name="create-outline" size={14} color={C.accent} />
                <Text style={styles.addReviewBtnText}>Write a Review</Text>
              </Pressable>
            </View>

            {reviewsLoading ? (
              <ActivityIndicator color={C.accent} style={{ margin: 20 }} />
            ) : reviews.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubble-outline" size={32} color={C.textMuted} />
                <Text style={styles.emptyText}>No reviews yet</Text>
                <Pressable style={styles.firstReviewBtn} onPress={() => setShowReviewModal(true)}>
                  <Text style={styles.firstReviewBtnText}>Be the first to review</Text>
                </Pressable>
              </View>
            ) : (
              reviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerInfo}>
                      {review.userAvatar ? (
                        <Image source={{ uri: review.userAvatar }} style={styles.reviewerAvatar} contentFit="cover" />
                      ) : (
                        <View style={[styles.reviewerAvatar, styles.reviewerAvatarFallback]}>
                          <Text style={styles.reviewerInitial}>{review.userName[0]}</Text>
                        </View>
                      )}
                      <View>
                        <Text style={styles.reviewerName}>{review.userName}</Text>
                        <Text style={styles.reviewDate}>Joined {formatDate(review.sessionDate)}</Text>
                      </View>
                    </View>
                    <View style={styles.reviewOverallBadge}>
                      <Ionicons name="star" size={12} color={C.orange} />
                      <Text style={styles.reviewOverallText}>{review.overallScore.toFixed(1)}</Text>
                    </View>
                  </View>

                  <View style={styles.reviewScores}>
                    <View style={styles.reviewScoreItem}>
                      <Text style={styles.reviewScoreLabel}>Satisfaction</Text>
                      <StarRow score={review.satisfactionScore} />
                    </View>
                    <View style={styles.reviewScoreItem}>
                      <Text style={styles.reviewScoreLabel}>Streams</Text>
                      <StarRow score={review.streamCountScore} />
                    </View>
                    <View style={styles.reviewScoreItem}>
                      <Text style={styles.reviewScoreLabel}>Attendance</Text>
                      <StarRow score={review.attendanceScore} />
                    </View>
                  </View>

                  <Text style={styles.reviewComment}>{review.comment}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === "schedule" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Slots</Text>
            {upcomingSlots.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={32} color={C.textMuted} />
                <Text style={styles.emptyText}>No available slots right now</Text>
              </View>
            ) : (
              upcomingSlots.map((slot) => {
                const isFull = slot.bookedSlots >= slot.maxSlots;
                const remaining = slot.maxSlots - slot.bookedSlots;
                return (
                  <View key={slot.id} style={styles.slotCard}>
                    <View style={styles.slotLeft}>
                      <View style={styles.slotDateBlock}>
                        <Text style={styles.slotDate}>{formatSlotDate(slot.date)}</Text>
                        <Text style={styles.slotTime}>{slot.startTime} 〜 {slot.endTime}</Text>
                      </View>
                      {slot.note ? <Text style={styles.slotNote}>{slot.note}</Text> : null}
                    </View>
                    <View style={styles.slotRight}>
                      <View style={[styles.slotStatusBadge, isFull && styles.slotStatusFull]}>
                        <Text style={[styles.slotStatusText, isFull && { color: C.live }]}>
                          {isFull ? "Full" : `${remaining} left`}
                        </Text>
                      </View>
                      {!isFull && (
                        <Pressable
                          style={styles.slotBookBtn}
                          onPress={() => Alert.alert("Book", `Book ${slot.date} ${slot.startTime}–${slot.endTime}?`)}
                        >
                          <Text style={styles.slotBookBtnText}>Book</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={showReviewModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowReviewModal(false)}>
          <Pressable
            style={[styles.modalSheet, { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 16 }]}
            onPress={() => {}}
          >
            <View style={styles.modalHandle} />
            <View style={styles.modalTitleRow}>
              <Ionicons name="star-outline" size={18} color={C.orange} />
              <Text style={styles.modalTitle}>Post a Review</Text>
            </View>

            <Text style={styles.modalFieldLabel}>Your Name</Text>
            <View style={styles.modalInput}>
              <TextInput
                style={styles.modalInputText}
                value={myName}
                onChangeText={setMyName}
                placeholder="Display name"
                placeholderTextColor={C.textMuted}
              />
            </View>

            <Text style={styles.modalFieldLabel}>① Satisfaction</Text>
            <ScoreSelector value={mySatisfaction} onChange={setMySatisfaction} />

            <Text style={[styles.modalFieldLabel, { marginTop: 12 }]}>② Stream Count</Text>
            <ScoreSelector value={myStreamCount} onChange={setMyStreamCount} />

            <Text style={[styles.modalFieldLabel, { marginTop: 12 }]}>③ Attendance Rate</Text>
            <ScoreSelector value={myAttendance} onChange={setMyAttendance} />

            <Text style={[styles.modalFieldLabel, { marginTop: 12 }]}>Comment</Text>
            <View style={[styles.modalInput, { height: 80 }]}>
              <TextInput
                style={[styles.modalInputText, { textAlignVertical: "top" }]}
                value={myComment}
                onChangeText={setMyComment}
                placeholder="Share your experience"
                placeholderTextColor={C.textMuted}
                multiline
                maxLength={300}
              />
            </View>

            <Pressable
              style={[styles.submitBtn, reviewMutation.isPending && { opacity: 0.6 }]}
              onPress={handleReviewSubmit}
              disabled={reviewMutation.isPending}
            >
              {reviewMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>Submit</Text>
                </>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.surface, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: C.text, flex: 1, textAlign: "center" },
  scroll: { flex: 1 },
  profileCard: {
    flexDirection: "row", gap: 14, marginHorizontal: 16, marginBottom: 16,
    backgroundColor: C.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  profileInfo: { flex: 1 },
  nameRankRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  name: { fontSize: 18, fontWeight: "800", color: C.text },
  rankBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: C.surface3, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
  },
  rankText: { fontSize: 11, fontWeight: "700", color: C.orange },
  community: { fontSize: 12, color: C.textMuted, marginBottom: 4 },
  statRow: { flexDirection: "row", alignItems: "center" },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: "800", color: C.text },
  statLabel: { fontSize: 10, color: C.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: C.border },
  miniTimelineSection: {
    marginHorizontal: 16,
    marginBottom: 10,
  },
  miniTimelineHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  miniTimelineTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
  },
  miniTimelineCount: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  miniTimelineList: {
    gap: 6,
  },
  miniTimelineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  miniTimelineIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  miniTimelineBody: {
    flex: 1,
  },
  miniTimelineText: {
    color: C.text,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 1,
  },
  miniTimelineMeta: {
    color: C.textMuted,
    fontSize: 10,
  },
  miniCommunitiesSection: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  miniCommunitiesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  miniCommunitiesTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
  },
  miniCommunitiesCount: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  miniCommunitiesList: {
    gap: 10,
  },
  miniCommunityCard: {
    width: 130,
    height: 110,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  miniCommunityThumb: {
    width: "100%",
    height: "100%",
  },
  miniCommunityOverlay: {
    ...StyleSheet.absoluteFillObject as any,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  miniCommunityBottom: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8,
  },
  miniCommunityName: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  miniCommunityMeta: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 10,
    marginTop: 2,
  },
  miniCommunityLiveBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.live,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  miniCommunityLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  miniCommunityLiveText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  tabs: {
    flexDirection: "row", marginHorizontal: 16, marginBottom: 12,
    backgroundColor: C.surface, borderRadius: 10, padding: 4,
    borderWidth: 1, borderColor: C.border,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  tabActive: { backgroundColor: C.accent },
  tabText: { fontSize: 12, fontWeight: "600", color: C.textSec },
  tabTextActive: { color: "#fff" },
  section: { marginHorizontal: 16 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: C.text, marginBottom: 12 },
  musicBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  musicBtnText: { fontSize: 13, color: C.textSec, fontWeight: "600" },
  scoreCard: {
    backgroundColor: C.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: C.border, marginBottom: 8,
  },
  overallRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  overallScore: { fontSize: 40, fontWeight: "900", color: C.text },
  overallSub: { fontSize: 11, color: C.textMuted, marginTop: 4 },
  scoreBarRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  scoreBarLabel: { fontSize: 12, color: C.textSec, width: 130 },
  scoreBarBg: { flex: 1, height: 8, backgroundColor: C.surface2, borderRadius: 4, overflow: "hidden" },
  scoreBarFill: { height: "100%", borderRadius: 4 },
  scoreBarValue: { fontSize: 13, fontWeight: "700", width: 30, textAlign: "right" },
  metricsGrid: { flexDirection: "row", gap: 8, marginBottom: 16 },
  metricCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: 12, padding: 14,
    alignItems: "center", gap: 6, borderWidth: 1, borderColor: C.border,
  },
  metricValue: { fontSize: 18, fontWeight: "800", color: C.text },
  metricLabel: { fontSize: 10, color: C.textMuted },
  bookBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: C.accent, borderRadius: 12, paddingVertical: 13, marginBottom: 8,
  },
  bookBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  reviewsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  addReviewBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: C.surface, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: C.accent,
  },
  addReviewBtnText: { fontSize: 12, fontWeight: "600", color: C.accent },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 14, color: C.textMuted },
  firstReviewBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: C.accent,
  },
  firstReviewBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  reviewCard: {
    backgroundColor: C.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: C.border, marginBottom: 10,
  },
  reviewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  reviewerInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  reviewerAvatar: { width: 36, height: 36, borderRadius: 18 },
  reviewerAvatarFallback: { backgroundColor: C.surface3, alignItems: "center", justifyContent: "center" },
  reviewerInitial: { fontSize: 14, fontWeight: "700", color: C.text },
  reviewerName: { fontSize: 13, fontWeight: "700", color: C.text },
  reviewDate: { fontSize: 11, color: C.textMuted },
  reviewOverallBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#2A1F00", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4,
  },
  reviewOverallText: { fontSize: 12, fontWeight: "700", color: C.orange },
  reviewScores: { flexDirection: "row", gap: 12, marginBottom: 10 },
  reviewScoreItem: { gap: 4 },
  reviewScoreLabel: { fontSize: 10, color: C.textMuted },
  reviewComment: { fontSize: 13, color: C.textSec, lineHeight: 19 },
  slotCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: C.surface, borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: C.border, marginBottom: 8,
  },
  slotLeft: { flex: 1 },
  slotDateBlock: {},
  slotDate: { fontSize: 14, fontWeight: "700", color: C.text, marginBottom: 2 },
  slotTime: { fontSize: 12, color: C.textMuted },
  slotNote: { fontSize: 11, color: C.textMuted, marginTop: 4 },
  slotRight: { alignItems: "flex-end", gap: 6 },
  slotStatusBadge: {
    backgroundColor: "#0D2330", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4,
  },
  slotStatusFull: { backgroundColor: "#2A0F0F" },
  slotStatusText: { fontSize: 11, fontWeight: "600", color: C.accent },
  slotBookBtn: {
    backgroundColor: C.accent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6,
  },
  slotBookBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20,
  },
  modalHandle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  modalTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: C.text },
  modalFieldLabel: {
    fontSize: 11, fontWeight: "700", color: C.textMuted, textTransform: "uppercase",
    letterSpacing: 0.5, marginBottom: 8,
  },
  modalInput: {
    backgroundColor: C.surface2, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 12, borderWidth: 1, borderColor: C.border,
  },
  modalInputText: { fontSize: 14, color: C.text },
  scoreStar: { padding: 2 },
  scoreStarActive: {},
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14, marginTop: 4,
  },
  submitBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
