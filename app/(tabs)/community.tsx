import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  Platform,
} from "react-native";
import { scrollShowsHorizontal, scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { C } from "@/constants/colors";
import { getTabTopInset, getTabBottomInset, webScrollStyle } from "@/constants/layout";
import { MetallicLine } from "@/components/MetallicLine";
import { AppLogo } from "@/components/AppLogo";
import { COMMUNITIES, RANKED_VIDEOS } from "@/constants/data";
import { useQuery } from "@tanstack/react-query";

const GENRES = [
  { id: "pop", name: "Pop", icon: "musical-note-outline" as const, count: 1204, color: "#FF4081" },
  { id: "rock", name: "Rock", icon: "flash-outline" as const, count: 876, color: "#FF6B35" },
  { id: "hiphop", name: "Hip-Hop", icon: "mic-outline" as const, count: 942, color: C.accent },
  { id: "edm", name: "EDM", icon: "radio-outline" as const, count: 642, color: "#7B2FFF" },
  { id: "ai", name: "AI Music", icon: "hardware-chip-outline" as const, count: 389, color: "#00BFA5" },
];

const PURCHASE_TABS = ["Weekly", "Monthly", "All Time"] as const;
type PurchaseTab = typeof PURCHASE_TABS[number];

const PURCHASE_EXTRAS = [
  {
    id: "p4",
    rank: 4,
    title: "Underground Idol Live — Full Cut",
    creator: "Underground Scene",
    community: "Underground Scene",
    views: 28100,
    timeAgo: "2d ago",
    duration: "52:10",
    price: 1500,
    thumbnail: "https://images.unsplash.com/photo-1524503033411-c9566986fc8f?w=400&h=225&fit=crop",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&h=50&fit=crop",
  },
  {
    id: "p5",
    rank: 5,
    title: "Pro Performer Talk Masterclass",
    creator: "Night Scene",
    community: "Night Scene",
    views: 19870,
    timeAgo: "4d ago",
    duration: "35:44",
    price: 2000,
    thumbnail: "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=400&h=225&fit=crop",
    avatar: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=50&h=50&fit=crop",
  },
];

function formatNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

function RankBadge({ rank }: { rank: number }) {
  const colors: Record<number, string> = { 1: "#FFD700", 2: "#C0C0C0", 3: "#CD7F32" };
  const bg = colors[rank] ?? C.surface3;
  const textColor = rank <= 3 ? "#000" : C.textSec;
  return (
    <View style={[styles.rankBadge, { backgroundColor: bg }]}>
      <Text style={[styles.rankBadgeText, { color: textColor }]}>{rank}</Text>
    </View>
  );
}

function CommunityRankCard({ item, index }: { item: typeof COMMUNITIES[0]; index: number }) {
  return (
    <Pressable
      style={styles.rankCard}
      onPress={() => router.push(`/community/${item.id}`)}
    >
      <Image source={{ uri: item.thumbnail }} style={styles.rankCardImage} contentFit="cover" />
      <View style={styles.rankCardOverlay} />
      <RankBadge rank={index + 1} />
      {item.online && (
        <View style={styles.onlineChip}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>LIVE</Text>
        </View>
      )}
      <View style={styles.rankCardBottom}>
        <Text style={styles.rankCardName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.rankCardMeta}>
          <Ionicons name="people" size={11} color="rgba(255,255,255,0.7)" />
          <Text style={styles.rankCardMembers}>{formatNum(item.members)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function PurchaseRankCard({
  item,
  isDemo,
}: {
  item: (typeof RANKED_VIDEOS[0]) | (typeof PURCHASE_EXTRAS[0]) | any;
  isDemo: boolean;
}) {
  return (
    <Pressable
      style={styles.purchaseCard}
      onPress={() =>
        router.push(isDemo ? (`/video/${item.id}?demo=1` as any) : (`/video/${item.id}` as any))
      }
    >
      <Image source={{ uri: item.thumbnail }} style={styles.purchaseCardImage} contentFit="cover" />
      <View style={styles.purchaseCardOverlay} />
      {item.rank && <RankBadge rank={item.rank} />}
      {item.price && (
        <View style={styles.priceChip}>
          <Text style={styles.priceChipText}>🎟{item.price.toLocaleString()}</Text>
        </View>
      )}
      <View style={styles.purchaseCardBottom}>
        <Text style={styles.purchaseCardTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.purchaseCardMeta}>
          <Image source={{ uri: item.avatar }} style={styles.purchaseCardAvatar} contentFit="cover" />
          <Text style={styles.purchaseCardCreator} numberOfLines={1}>{item.creator}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const topInset = getTabTopInset(insets);
  const bottomInset = getTabBottomInset();
  const [search, setSearch] = useState("");
  const [purchaseTab, setPurchaseTab] = useState<PurchaseTab>("Weekly");

  const { data: apiCommunities = [] } = useQuery<any[]>({
    queryKey: ["/api/communities"],
  });

  const usingDemoCommunities = apiCommunities.length === 0;
  const sourceCommunities = usingDemoCommunities ? COMMUNITIES : apiCommunities;
  const sortedCommunities = [...sourceCommunities].sort((a, b) => b.members - a.members);

  const { data: rankedApiVideos = [] } = useQuery<any[]>({
    queryKey: ["/api/videos/ranked"],
  });

  const usingDemoRanked = rankedApiVideos.length === 0;

  const purchaseData = usingDemoRanked
    ? purchaseTab === "All Time"
      ? [...RANKED_VIDEOS, ...PURCHASE_EXTRAS]
      : purchaseTab === "Monthly"
      ? [...RANKED_VIDEOS.slice(1), PURCHASE_EXTRAS[0], RANKED_VIDEOS[0]]
      : [...RANKED_VIDEOS, PURCHASE_EXTRAS[1]]
    : rankedApiVideos;

  const filteredGenres = search
    ? GENRES.filter((g) => g.name.includes(search))
    : GENRES;

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <AppLogo height={36} />
      </View>
      <MetallicLine thickness={1} style={{ marginHorizontal: 16 }} />
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={C.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search communities"
            placeholderTextColor={C.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <Pressable style={styles.createBtn} onPress={() => router.push("/community/create")}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.createBtnText}>New</Text>
        </Pressable>
      </View>

      <ScrollView style={webScrollStyle(styles.scroll)} showsVerticalScrollIndicator={scrollShowsVertical}>
        <View style={styles.section}>
          <View style={[styles.sectionHeader, styles.sectionHeaderFirst]}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>Browse by Genre</Text>
          </View>
          <View style={styles.genreGrid}>
            {filteredGenres.map((genre) => (
              <Pressable
                key={genre.id}
                style={[styles.genreChip, { borderColor: genre.color + "55" }]}
                onPress={() => router.push(`/community/genre/${genre.id}`)}
              >
                <Ionicons name={genre.icon} size={18} color={genre.color} />
                <Text style={[styles.genreChipText, { color: genre.color }]}>{genre.name}</Text>
                <Text style={styles.genreChipCount}>{formatNum(genre.count)}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>Top Communities</Text>
          </View>
          <FlatList
            data={sortedCommunities}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={scrollShowsHorizontal}
            contentContainerStyle={styles.hList}
            renderItem={({ item, index }) => (
              <CommunityRankCard item={item} index={index} />
            )}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>Jukebox Chart</Text>
            </View>
            <View style={styles.tabPills}>
              {PURCHASE_TABS.map((tab) => (
                <Pressable
                  key={tab}
                  style={[styles.tabPill, purchaseTab === tab && styles.tabPillActive]}
                  onPress={() => setPurchaseTab(tab)}
                >
                  <Text style={[styles.tabPillText, purchaseTab === tab && styles.tabPillTextActive]}>
                    {tab}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <FlatList
            data={purchaseData}
            keyExtractor={(item) => item.id + purchaseTab}
            horizontal
            showsHorizontalScrollIndicator={scrollShowsHorizontal}
            contentContainerStyle={styles.hList}
            renderItem={({ item }) => <PurchaseRankCard item={item} isDemo={usingDemoRanked} />}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 3,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1,
    color: C.text,
    fontSize: 14,
    height: 42,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.accent,
    borderRadius: 3,
    paddingHorizontal: 14,
    height: 42,
  },
  createBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  scroll: { flex: 1 },
  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
    marginTop: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 8,
    marginTop: 20,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionAccent: {
    width: 3,
    height: 16,
    backgroundColor: C.accent,
    borderRadius: 2,
  },
  sectionTitle: { color: C.text, fontSize: 15, fontWeight: "700" },
  sectionHeaderFirst: { marginTop: 12 },
  genreGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 8,
  },
  genreChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.surface,
    borderRadius: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  genreChipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  genreChipCount: {
    color: C.textMuted,
    fontSize: 11,
  },
  hList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  rankCard: {
    width: 140,
    height: 180,
    borderRadius: 3,
    overflow: "hidden",
    position: "relative",
    backgroundColor: C.surface,
  },
  rankCardImage: {
    ...StyleSheet.absoluteFillObject as any,
  },
  rankCardOverlay: {
    ...StyleSheet.absoluteFillObject as any,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  rankBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  onlineChip: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 2,
    backgroundColor: "#FF3B30",
  },
  onlineText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  rankCardBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    gap: 4,
  },
  rankCardName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  rankCardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  rankCardMembers: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
  },
  purchaseCard: {
    width: 160,
    height: 210,
    borderRadius: 3,
    overflow: "hidden",
    position: "relative",
    backgroundColor: C.surface,
  },
  purchaseCardImage: {
    ...StyleSheet.absoluteFillObject as any,
  },
  purchaseCardOverlay: {
    ...StyleSheet.absoluteFillObject as any,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  priceChip: {
    position: "absolute",
    top: 36,
    left: 8,
    backgroundColor: C.accent,
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priceChipText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  purchaseCardBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    gap: 6,
  },
  purchaseCardTitle: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  purchaseCardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  purchaseCardAvatar: {
    width: 18,
    height: 18,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  purchaseCardCreator: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 10,
    flex: 1,
  },
  tabPills: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: 3,
    padding: 2,
    gap: 2,
  },
  tabPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 2,
  },
  tabPillActive: {
    backgroundColor: C.accent,
  },
  tabPillText: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  tabPillTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
});
