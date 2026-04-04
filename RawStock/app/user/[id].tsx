import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
} from "react-native";
import { scrollShowsHorizontal, scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Linking } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { getApiUrl } from "@/lib/query-client";
import { C } from "@/constants/colors";
import { F } from "@/constants/fonts";

type PinnedCommunity = {
  id: number;
  name: string;
  thumbnail: string;
  category: string;
};

type UserProfile = {
  id: number;
  name: string;
  displayName: string;
  avatar: string | null;
  profileImageUrl: string | null;
  bio: string;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  xUrl?: string | null;
  enneagramScores?: number[] | null;
  pinnedCommunities?: PinnedCommunity[];
  followersCount?: number;
  followingCount?: number;
};

type MentorSession = {
  id: number;
  title: string;
  category: string;
  description: string;
  price: number;
  duration: number;
  maxParticipants: number;
};

type VideoItem = {
  id: number;
  title: string;
  thumbnail: string;
  community: string;
  timeAgo?: string;
};


export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = parseInt(id ?? "0");
  const insets = useSafeAreaInsets();
  const { user: me, token } = useAuth();
  const queryClient = useQueryClient();
  const { data: mentorSessions } = useQuery<MentorSession[]>({
    queryKey: [`/api/mentor/sessions/${userId}`],
    enabled: userId > 0,
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const res = await fetch(new URL(`/api/mentor/sessions/${userId}`, baseUrl).toString());
      return res.json();
    },
  });

  const { data: followStatus, refetch: refetchFollowStatus } = useQuery<{ isFollowing: boolean }>({
    queryKey: [`/api/users/${userId}/follow-status`],
    enabled: userId > 0 && !!me,
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const res = await fetch(new URL(`/api/users/${userId}/follow-status`, baseUrl).toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return res.json();
    },
  });
  const isFollowing = followStatus?.isFollowing ?? false;
  const followMutation = useMutation({
    mutationFn: async () => {
      const baseUrl = getApiUrl();
      const method = isFollowing ? "DELETE" : "POST";
      const res = await fetch(new URL(`/api/users/${userId}/follow`, baseUrl).toString(), {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      refetchFollowStatus();
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}`] });
    },
  });
  const handleDM = useCallback(() => {
    if (!me) {
      Alert.alert("Login Required", "Please sign in to send a DM");
      return;
    }
    router.push(`/dm/${userId}`);
  }, [me, userId]);

  const handleFollow = useCallback(() => {
    if (!me) {
      Alert.alert("Login Required", "Please sign in to follow");
      return;
    }
    followMutation.mutate();
  }, [me, followMutation]);
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const { data: profile, isLoading, isError } = useQuery<UserProfile>({
    queryKey: [`/api/users/${userId}`],
    enabled: userId > 0,
  });

  const { data: posts = [] } = useQuery<VideoItem[]>({
    queryKey: [`/api/users/${userId}/posts`],
    enabled: userId > 0,
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={C.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }
  if (isError || !profile) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={C.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>User not found</Text>
        </View>
      </View>
    );
  }

  const avatar = profile.avatar ?? profile.profileImageUrl ?? null;
  const pinnedCommunities = profile.pinnedCommunities ?? [];

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={scrollShowsVertical}>
        {/* 写真・名前・公開情報 */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{(profile.name ?? "?")[0].toUpperCase()}</Text>
              </View>
            )}
          </View>
          <Text style={styles.name}>{profile.name}</Text>
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
          {/* フォロー数 */}
          <View style={styles.followStatsRow}>
            <Pressable style={styles.followStat} onPress={() => router.push(`/user/${userId}/followers`)}>
              <Text style={styles.followStatValue}>{profile.followersCount ?? 0}</Text>
              <Text style={styles.followStatLabel}>Followers</Text>
            </Pressable>
            <Pressable style={styles.followStat} onPress={() => router.push(`/user/${userId}/following`)}>
              <Text style={styles.followStatValue}>{profile.followingCount ?? 0}</Text>
              <Text style={styles.followStatLabel}>Following</Text>
            </Pressable>
          </View>
          {/* フォローボタン・DMボタン（自分以外） */}
          {me && me.id !== userId && (
            <View style={styles.actionRow}>
              <Pressable
                style={[styles.followBtn, isFollowing && styles.followBtnActive]}
                onPress={handleFollow}
                disabled={followMutation.isPending}
              >
                <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                  {followMutation.isPending ? "..." : isFollowing ? "Following" : "Follow"}
                </Text>
              </Pressable>
              <Pressable style={styles.dmBtn} onPress={handleDM}>
                <Ionicons name="chatbubble-outline" size={16} color={C.text} />
                <Text style={styles.dmBtnText}>DM</Text>
              </Pressable>
            </View>
          )}

          {(profile.instagramUrl || profile.youtubeUrl || profile.xUrl) ? (
            <View style={styles.socialRow}>
              {profile.instagramUrl && (
                <Pressable style={styles.socialBtn} onPress={() => profile.instagramUrl && Linking.openURL(profile.instagramUrl)}>
                  <Ionicons name="logo-instagram" size={22} color="#E4405F" />
                </Pressable>
              )}
              {profile.youtubeUrl && (
                <Pressable style={styles.socialBtn} onPress={() => profile.youtubeUrl && Linking.openURL(profile.youtubeUrl)}>
                  <Ionicons name="logo-youtube" size={22} color="#FF0000" />
                </Pressable>
              )}
              {profile.xUrl && (
                <Pressable style={styles.socialBtn} onPress={() => profile.xUrl && Linking.openURL(profile.xUrl)}>
                  <Ionicons name="logo-twitter" size={22} color="#1DA1F2" />
                </Pressable>
              )}
            </View>
          ) : null}
        </View>

        {/* メンターセッション */}
        {mentorSessions && mentorSessions.length > 0 && (
          <View style={styles.mentorSection}>
            <Text style={styles.sectionTitle}>MENTOR SESSION</Text>
            {mentorSessions.map(s => (
              <Pressable
                key={s.id}
                style={styles.mentorCard}
                onPress={() => router.push(`/mentor-book/${s.id}`)}
              >
                <View style={styles.mentorCardLeft}>
                  <View style={styles.mentorCatBadge}>
                    <Text style={styles.mentorCatText}>{s.category}</Text>
                  </View>
                  <Text style={styles.mentorTitle}>{s.title}</Text>
                  <Text style={styles.mentorDesc} numberOfLines={2}>{s.description}</Text>
                  <View style={styles.mentorMeta}>
                    <Text style={styles.mentorMetaText}>{s.duration} min</Text>
                    <Text style={styles.mentorMetaDot}>·</Text>
                    <Text style={styles.mentorMetaText}>Up to {s.maxParticipants}</Text>
                  </View>
                </View>
                <View style={styles.mentorCardRight}>
                  <Text style={styles.mentorPrice}>🎟{s.price.toLocaleString()}</Text>
                  <View style={styles.bookBtn}>
                    <Text style={styles.bookBtnText}>Book</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* 参加コミュニティ厳選4つ（パネル表示） */}
        {pinnedCommunities.length > 0 && (
          <View style={styles.communitiesSection}>
            <Text style={styles.sectionTitle}>Communities</Text>
            <View style={styles.communityGrid}>
              {pinnedCommunities.slice(0, 4).map((c) => (
                <Pressable
                  key={c.id}
                  style={styles.communityPanel}
                  onPress={() => router.push(`/community/${c.id}`)}
                >
                  <Image source={{ uri: c.thumbnail }} style={styles.communityThumb} contentFit="cover" />
                  <Text style={styles.communityName} numberOfLines={2}>{c.name}</Text>
                  <Text style={styles.communityCategory} numberOfLines={1}>{c.category}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}



        {/* 投稿一覧 */}
        <View style={styles.postsSection}>
          <Text style={styles.postsTitle}>Posts</Text>
          {posts.length === 0 ? (
            <Text style={styles.emptyText}>No posts yet</Text>
          ) : (
            posts.map((v) => (
              <Pressable
                key={v.id}
                style={styles.postItem}
                onPress={() => router.push(`/video/${v.id}`)}
              >
                <Image source={{ uri: v.thumbnail }} style={styles.postThumb} contentFit="cover" />
                <View style={styles.postBody}>
                  <Text style={styles.postTitle} numberOfLines={2}>{v.title}</Text>
                  <Text style={styles.postMeta} numberOfLines={1}>
                    {v.community || "My Page"} · {v.timeAgo ?? ""}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
              </Pressable>
            ))
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
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
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: C.textMuted, fontSize: 14 },
  scroll: { flex: 1 },
  profileCard: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatarWrap: { marginBottom: 12 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarFallback: {
    backgroundColor: C.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { color: C.textMuted, fontSize: 36, fontWeight: "700" },
  name: { color: C.text, fontSize: 20, fontWeight: "800", marginBottom: 8 },
  bio: { color: C.textSec, fontSize: 14, lineHeight: 22, textAlign: "center", maxWidth: "100%" },
  socialRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  followStatsRow: { flexDirection: "row", gap: 24, marginTop: 12, marginBottom: 4 },
  followStat: { alignItems: "center" as const, gap: 2 },
  followStatValue: { fontSize: 18, fontWeight: "700" as const, color: C.text },
  followStatLabel: { fontSize: 11, color: C.textMuted },
  actionRow: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 10, marginTop: 12 },
  followBtn: { paddingVertical: 10, paddingHorizontal: 28, borderRadius: 24, borderWidth: 1.5, borderColor: C.accent },
  followBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  followBtnText: { fontSize: 14, fontWeight: "600" as const, color: C.accent },
  dmBtn: { flexDirection: "row" as const, alignItems: "center" as const, gap: 5, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 24, borderWidth: 1.5, borderColor: C.border },
  dmBtnText: { fontSize: 14, fontWeight: "600" as const, color: C.text },
  followBtnTextActive: { color: "#050505" },
  socialBtn: { padding: 8 },
  sectionTitle: {
    color: C.textSec,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  communitiesSection: { paddingHorizontal: 16, paddingBottom: 24 },
  communityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  communityPanel: {
    width: "47%",
    backgroundColor: C.surface2,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
  },
  communityThumb: { width: "100%", height: 72, backgroundColor: C.surface3 },
  communityName: {
    color: C.text,
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  communityCategory: {
    color: C.textMuted,
    fontSize: 11,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  enneagramSection: { paddingHorizontal: 16, paddingBottom: 24, alignItems: "center" },
  enneagramWrap: { backgroundColor: C.surface2, borderRadius: 16, padding: 16 },
  postsSection: { paddingHorizontal: 16, paddingBottom: 32 },
  postsTitle: { color: C.text, fontSize: 16, fontWeight: "700", marginBottom: 12 },
  emptyText: { color: C.textMuted, fontSize: 14, paddingVertical: 24 },
  postItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  postThumb: { width: 64, height: 48, borderRadius: 8 },
  postBody: { flex: 1 },
  postTitle: { color: C.text, fontSize: 14, fontWeight: "600" },
  postMeta: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  // メンターセッション
  mentorSection: { paddingHorizontal: 16, paddingBottom: 24 },
  mentorCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: C.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.borderDim,
    padding: 14,
    marginBottom: 10,
  },
  mentorCardLeft: { flex: 1, marginRight: 12 },
  mentorCardRight: { alignItems: "flex-end", gap: 8 },
  mentorCatBadge: { backgroundColor: C.borderDim, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start", marginBottom: 6 },
  mentorCatText: { fontFamily: F.mono, fontSize: 10, color: C.accent },
  mentorTitle: { fontFamily: F.display, fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 4 },
  mentorDesc: { fontFamily: F.mono, fontSize: 11, color: C.textSec, marginBottom: 6 },
  mentorMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  mentorMetaText: { fontFamily: F.mono, fontSize: 11, color: C.textMuted },
  mentorMetaDot: { color: C.textMuted, fontSize: 11 },
  mentorPrice: { fontFamily: F.display, fontSize: 16, fontWeight: "800", color: C.accent },
  bookBtn: { backgroundColor: C.accent, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 8 },
  bookBtnText: { fontFamily: F.display, fontSize: 13, fontWeight: "700", color: C.bg },
});
