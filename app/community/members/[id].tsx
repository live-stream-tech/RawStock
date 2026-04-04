import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { scrollShowsHorizontal, scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { C } from "@/constants/colors";
import { COMMUNITIES } from "@/constants/data";

type MemberItem = { id: number; displayName: string; profileImageUrl: string | null };

export default function CommunityMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const communityId = Number(id);
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const { data: community } = useQuery<any>({
    queryKey: [`/api/communities/${communityId}`],
    enabled: !Number.isNaN(communityId),
  });

  const { data: members = [], isLoading } = useQuery<MemberItem[]>({
    queryKey: [`/api/communities/${communityId}/members`],
    enabled: !Number.isNaN(communityId),
  });

  const communityName =
    community?.name ?? COMMUNITIES.find((c) => Number(c.id) === communityId)?.name ?? "Community";

  return (
    <View style={[styles.container, { paddingTop: topInset + 12 }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {communityName} — Members
        </Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={scrollShowsVertical}>
        <View style={styles.countRow}>
          <Ionicons name="people" size={18} color={C.accent} />
          <Text style={styles.countText}>
            <Text style={styles.countNum}>{members.length}</Text> members
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={C.accent} style={{ marginTop: 48 }} />
        ) : members.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={C.textMuted} />
            <Text style={styles.emptyText}>No members yet</Text>
            <Text style={styles.emptySub}>Join this community to become a member</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {members.map((m) => (
              <Pressable
                key={m.id}
                style={styles.memberRow}
                onPress={() => router.push(`/user/${m.id}`)}
              >
                <Image
                  source={{ uri: m.profileImageUrl ?? undefined }}
                  style={styles.avatar}
                  contentFit="cover"
                />
                <Text style={styles.memberName} numberOfLines={1}>
                  {m.displayName}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  scroll: {
    flex: 1,
  },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  countText: {
    fontSize: 15,
    color: C.textSec,
  },
  countNum: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: C.textSec,
    marginTop: 16,
  },
  emptySub: {
    fontSize: 13,
    color: C.textMuted,
    marginTop: 8,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 4,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surface2,
    marginRight: 12,
  },
  memberName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
