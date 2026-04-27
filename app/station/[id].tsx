import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/constants/colors";
import { getTabTopInset, webScrollStyle } from "@/constants/layout";
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";

type StationRow = {
  id: number;
  name: string;
  category: string;
  members: number;
  thumbnail: string;
  online?: boolean;
};

type CommunityRow = {
  id: number;
  name: string;
  category?: string | null;
  thumbnail?: string | null;
  members?: number;
};

function matchesStationCategory(stationCategory: string, communityCategory: string): boolean {
  const sc = stationCategory.trim().toLowerCase();
  const cc = communityCategory.trim().toLowerCase();
  if (!sc || !cc) return false;
  if (cc.includes(sc)) return true;
  if (sc === "edm") return /edm|electronic|house|techno|dance|dnb|drum/i.test(cc);
  if (sc === "indie") return /indie|alternative/i.test(cc);
  if (sc === "hiphop") return /hip-?hop|rap|trap/i.test(cc);
  if (sc === "rnb") return /r&b|neo soul|soul/i.test(cc);
  return false;
}

export default function StationDetailScreen() {
  const insets = useSafeAreaInsets();
  const topInset = getTabTopInset(insets);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const stationId = Number(id ?? "0");

  const { data: stations = [] } = useQuery<StationRow[]>({
    queryKey: ["/api/stations"],
  });
  const { data: communities = [] } = useQuery<CommunityRow[]>({
    queryKey: ["/api/communities"],
  });

  const station = useMemo(() => stations.find((s) => s.id === stationId) ?? null, [stations, stationId]);
  const linkedCommunities = useMemo(() => {
    if (!station) return [];
    return communities
      .filter((c) => matchesStationCategory(station.category ?? "", String(c.category ?? "")))
      .sort((a, b) => Number(b.members ?? 0) - Number(a.members ?? 0));
  }, [station, communities]);

  if (!station) {
    return (
      <View style={[styles.container, { paddingTop: topInset + 12 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Station</Text>
          <View style={{ width: 36 }} />
        </View>
        <Text style={styles.emptyText}>Station not found.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset + 12 }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Station</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={webScrollStyle(styles.scroll)} showsVerticalScrollIndicator={scrollShowsVertical}>
        <View style={styles.heroCard}>
          <Image source={{ uri: station.thumbnail }} style={styles.heroImage} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <Text style={styles.stationName}>{station.name}</Text>
            <Text style={styles.stationMeta}>Category: {station.category}</Text>
            <Text style={styles.stationMeta}>Members: {Number(station.members ?? 0).toLocaleString()}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Communities in this station</Text>
        {linkedCommunities.length === 0 ? (
          <Text style={styles.emptyText}>No communities linked yet.</Text>
        ) : (
          linkedCommunities.map((c) => (
            <Pressable key={c.id} style={styles.communityRow} onPress={() => router.push(`/community/${c.id}`)}>
              <Image
                source={{ uri: c.thumbnail || "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=128&h=128&fit=crop" }}
                style={styles.communityThumb}
                contentFit="cover"
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.communityName} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text style={styles.communityMeta} numberOfLines={1}>
                  {c.category || "Community"} · {Number(c.members ?? 0).toLocaleString()} members
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
            </Pressable>
          ))
        )}
        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: C.text, fontSize: 18, fontWeight: "800" },
  heroCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    flexDirection: "row",
    gap: 10,
  },
  heroImage: { width: 62, height: 62, borderRadius: 8 },
  stationName: { color: C.text, fontSize: 16, fontWeight: "800", marginBottom: 4 },
  stationMeta: { color: C.textMuted, fontSize: 12, lineHeight: 17 },
  sectionTitle: { color: C.text, fontSize: 14, fontWeight: "800", marginHorizontal: 16, marginBottom: 8 },
  communityRow: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  communityThumb: { width: 44, height: 44, borderRadius: 8 },
  communityName: { color: C.text, fontSize: 14, fontWeight: "700" },
  communityMeta: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  emptyText: { color: C.textMuted, fontSize: 13, marginHorizontal: 16, marginTop: 10 },
});

