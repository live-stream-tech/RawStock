import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from "react-native";
import { webScrollStyle } from "@/constants/layout";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { C } from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";
import { useAuth } from "@/lib/auth";
import { scrollShowsHorizontal, scrollShowsVertical } from "@/lib/web-scroll-indicators";

type FollowUser = {
  id: number;
  displayName: string;
  profileImageUrl: string | null;
  bio: string | null;
  followersCount: number;
};

export default function FollowingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = parseInt(id ?? "0");
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { token } = useAuth();

  const { data: following = [], isLoading } = useQuery<FollowUser[]>({
    queryKey: [`/api/users/${userId}/following`],
    enabled: userId > 0,
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const res = await fetch(new URL(`/api/users/${userId}/following`, baseUrl).toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return res.json();
    },
  });

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Following</Text>
        <View style={{ width: 40 }} />
      </View>
      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.muted}>Loading...</Text>
        </View>
      ) : following.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.muted}>Not following anyone yet</Text>
        </View>
      ) : (
        <ScrollView style={webScrollStyle(styles.scroll)} showsVerticalScrollIndicator={scrollShowsVertical}>
          {following.map((u) => (
            <Pressable
              key={u.id}
              style={styles.row}
              onPress={() => router.push(`/user/${u.id}`)}
            >
              {u.profileImageUrl ? (
                <Image source={{ uri: u.profileImageUrl }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>{(u.displayName ?? "?")[0].toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.info}>
                <Text style={styles.name}>{u.displayName}</Text>
                {u.bio ? <Text style={styles.bio} numberOfLines={1}>{u.bio}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: C.text },
  scroll: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  muted: { color: C.textMuted, fontSize: 14 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: { backgroundColor: C.surface2, alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: C.text, fontSize: 18, fontWeight: "700" },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "600", color: C.text },
  bio: { fontSize: 12, color: C.textMuted, marginTop: 2 },
});
