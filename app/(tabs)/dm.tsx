import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth";
import { saveLoginReturn } from "@/lib/login-return";
import { alertMessage } from "@/lib/alertCompat";
import { C } from "@/constants/colors";
import { navigateToUserOrLiverProfile } from "@/lib/navigate-profile";
import { getTabTopInset, getTabBottomInset, webScrollStyle } from "@/constants/layout";
import { MetallicLine } from "@/components/MetallicLine";
import { apiRequest } from "@/lib/query-client";

type DMItem = {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  /** Counterpart users.id (0 = operations dummy peer) */
  otherUserId?: number;
};

type FollowUser = {
  id: number;
  displayName: string;
  profileImageUrl: string | null;
  bio?: string | null;
};

export default function DMScreen() {
  const insets = useSafeAreaInsets();
  const topInset = getTabTopInset(insets);
  const bottomInset = getTabBottomInset(insets);
  const { user, token, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeLoadingUserId, setComposeLoadingUserId] = useState<number | null>(null);
  const [composeSearch, setComposeSearch] = useState("");
  const [composeFilter, setComposeFilter] = useState<"all" | "following" | "followers" | "recent">("all");

  useEffect(() => {
    if (authLoading) return;
    if (user || token) return;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      saveLoginReturn(window.location.pathname + window.location.search);
    }
    router.replace("/auth/login" as any);
  }, [authLoading, user, token]);

  const { data: dmList = [] } = useQuery<DMItem[]>({
    queryKey: ["/api/dm-messages"],
  });

  const { data: followers = [] } = useQuery<FollowUser[]>({
    queryKey: user?.id ? [`/api/users/${user.id}/followers`] : ["followers-disabled"],
    enabled: Boolean(user?.id),
  });
  const { data: following = [] } = useQuery<FollowUser[]>({
    queryKey: user?.id ? [`/api/users/${user.id}/following`] : ["following-disabled"],
    enabled: Boolean(user?.id),
  });

  const composeCandidates = useMemo(() => {
    const followerMap = new Map<number, FollowUser>(followers.map((u) => [u.id, u]));
    const followingMap = new Map<number, FollowUser>(following.map((u) => [u.id, u]));
    const recentIds = new Set(
      dmList
        .map((d) => d.otherUserId ?? 0)
        .filter((id) => Number.isInteger(id) && id > 0) as number[],
    );
    const map = new Map<number, FollowUser>();
    const source =
      composeFilter === "following"
        ? following
        : composeFilter === "followers"
          ? followers
          : composeFilter === "recent"
            ? Array.from(recentIds)
                .map((id) => followingMap.get(id) ?? followerMap.get(id))
                .filter((u): u is FollowUser => Boolean(u))
            : [...following, ...followers];
    for (const u of source) {
      if (!u?.id) continue;
      if (user?.id && u.id === user.id) continue;
      map.set(u.id, u);
    }
    const q = composeSearch.trim().toLowerCase();
    const rows = Array.from(map.values());
    if (!q) return rows;
    return rows.filter((u) => {
      const name = (u.displayName || "").toLowerCase();
      const bio = (u.bio || "").toLowerCase();
      return name.includes(q) || bio.includes(q);
    });
  }, [followers, following, composeSearch, user?.id, composeFilter, dmList]);

  function handleComposePress() {
    if (!user) {
      alertMessage("Sign in required", "Please sign in to start a new DM.");
      return;
    }
    setComposeSearch("");
    setComposeFilter("all");
    setShowComposeModal(true);
  }

  async function handleStartDm(peerUserId: number) {
    if (composeLoadingUserId) return;
    setComposeLoadingUserId(peerUserId);
    try {
      const res = await apiRequest("POST", "/api/dm/open", { peerUserId });
      const data = (await res.json()) as { threadId?: number };
      if (!data.threadId) throw new Error("Could not open DM thread.");
      await queryClient.invalidateQueries({ queryKey: ["/api/dm-messages"] });
      setShowComposeModal(false);
      router.push(`/dm/${data.threadId}`);
    } catch (e: any) {
      alertMessage("Could not start DM", e?.message ?? "Please try again.");
    } finally {
      setComposeLoadingUserId(null);
    }
  }

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Pressable onPress={handleComposePress} hitSlop={8}>
          <Ionicons name="create-outline" size={22} color={C.text} />
        </Pressable>
      </View>
      <MetallicLine thickness={1} style={{ marginHorizontal: 16 }} />

      <ScrollView
        style={webScrollStyle(styles.scroll)}
        showsVerticalScrollIndicator={scrollShowsVertical}
      >
        {dmList.map((item, index) => (
          <View
            key={item.id}
            style={[styles.dmItem, index < dmList.length - 1 && styles.dmItemBorder]}
          >
            {item.otherUserId && item.otherUserId > 0 ? (
              <Pressable
                style={styles.avatarContainer}
                onPress={() => navigateToUserOrLiverProfile({ userId: item.otherUserId })}
                hitSlop={4}
              >
                <Image source={{ uri: item.avatar }} style={styles.avatar} contentFit="cover" />
                {item.online && <View style={styles.onlineDot} />}
              </Pressable>
            ) : (
              <View style={styles.avatarContainer}>
                <Image source={{ uri: item.avatar }} style={styles.avatar} contentFit="cover" />
                {item.online && <View style={styles.onlineDot} />}
              </View>
            )}

            <Pressable style={styles.content} onPress={() => router.push(`/dm/${item.id}`)}>
              <View style={styles.topRow}>
                <Text style={[styles.name, item.unread > 0 && styles.nameUnread]}>{item.name}</Text>
                <Text style={[styles.time, item.unread > 0 && styles.timeUnread]}>{item.time}</Text>
              </View>
              <View style={styles.bottomRow}>
                <Text
                  style={[styles.lastMessage, item.unread > 0 && styles.lastMessageUnread]}
                  numberOfLines={1}
                >
                  {item.lastMessage}
                </Text>
                {item.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unread}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          </View>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={showComposeModal} transparent animationType="fade" onRequestClose={() => setShowComposeModal(false)}>
        <View style={styles.composeBackdrop}>
          <View style={styles.composeCard}>
            <View style={styles.composeHeader}>
              <Text style={styles.composeTitle}>Start a new DM</Text>
              <Pressable onPress={() => setShowComposeModal(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={C.text} />
              </Pressable>
            </View>

            <View style={styles.composeSearchRow}>
              <Ionicons name="search" size={16} color={C.textMuted} />
              <TextInput
                style={styles.composeSearchInput}
                placeholder="Search followers"
                placeholderTextColor={C.textMuted}
                value={composeSearch}
                onChangeText={setComposeSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={styles.composeFilterRow}>
              {[
                { id: "all", label: "All" },
                { id: "following", label: "Following" },
                { id: "followers", label: "Followers" },
                { id: "recent", label: "Recent" },
              ].map((f) => (
                <Pressable
                  key={f.id}
                  style={[styles.composeFilterChip, composeFilter === f.id && styles.composeFilterChipActive]}
                  onPress={() => setComposeFilter(f.id as "all" | "following" | "followers" | "recent")}
                >
                  <Text style={[styles.composeFilterChipText, composeFilter === f.id && styles.composeFilterChipTextActive]}>
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <ScrollView style={styles.composeList} showsVerticalScrollIndicator={scrollShowsVertical}>
              {composeCandidates.length === 0 ? (
                <Text style={styles.composeEmptyText}>No followers/following users found.</Text>
              ) : (
                composeCandidates.map((u) => {
                  const isLoading = composeLoadingUserId === u.id;
                  return (
                    <Pressable
                      key={u.id}
                      style={styles.composeUserRow}
                      onPress={() => void handleStartDm(u.id)}
                      disabled={Boolean(composeLoadingUserId)}
                    >
                      <Image source={{ uri: u.profileImageUrl ?? "" }} style={styles.composeAvatar} contentFit="cover" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.composeUserName} numberOfLines={1}>
                          {u.displayName || "User"}
                        </Text>
                        <Text style={styles.composeUserBio} numberOfLines={1}>
                          {u.bio?.trim() || "Tap to start a DM"}
                        </Text>
                      </View>
                      {isLoading ? (
                        <ActivityIndicator size="small" color={C.accent} />
                      ) : (
                        <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
                      )}
                    </Pressable>
                  );
                })
              )}
              <View style={{ height: 8 }} />
            </ScrollView>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    color: C.text,
    fontSize: 20,
    fontWeight: "800",
  },
  scroll: {
    flex: 1,
  },
  dmItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dmItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: C.green,
    borderWidth: 2,
    borderColor: C.bg,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    color: C.textSec,
    fontSize: 15,
    fontWeight: "600",
  },
  nameUnread: {
    color: C.text,
    fontWeight: "700",
  },
  time: {
    color: C.textMuted,
    fontSize: 12,
  },
  timeUnread: {
    color: C.accent,
    fontWeight: "600",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lastMessage: {
    flex: 1,
    color: C.textMuted,
    fontSize: 13,
  },
  lastMessageUnread: {
    color: C.textSec,
    fontWeight: "500",
  },
  unreadBadge: {
    backgroundColor: C.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  unreadText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  composeBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.56)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  composeCard: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "82%",
    borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 10,
  },
  composeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  composeTitle: { color: C.text, fontSize: 16, fontWeight: "800" },
  composeSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  composeSearchInput: {
    flex: 1,
    color: C.text,
    fontSize: 14,
  },
  composeFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  composeFilterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  composeFilterChipActive: {
    backgroundColor: C.accent + "20",
    borderColor: C.accent,
  },
  composeFilterChipText: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  composeFilterChipTextActive: {
    color: C.accent,
  },
  composeList: {
    maxHeight: 420,
  },
  composeEmptyText: {
    color: C.textMuted,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 18,
  },
  composeUserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  composeAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.bg,
  },
  composeUserName: {
    color: C.text,
    fontSize: 14,
    fontWeight: "700",
  },
  composeUserBio: {
    color: C.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
});
