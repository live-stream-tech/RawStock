import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  Platform,
  ActivityIndicator,
} from "react-native";
import { scrollShowsHorizontal, scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { navigateFromVideoCreatorRow } from "@/lib/navigate-profile";
import { C } from "@/constants/colors";
import { getTabTopInset, getTabBottomInset, webScrollStyle } from "@/constants/layout";
import { MetallicLine } from "@/components/MetallicLine";
import { AppLogo } from "@/components/AppLogo";
import { useQuery } from "@tanstack/react-query";

type CommunityRow = {
  id: number;
  name: string;
  members: number;
  thumbnail: string;
  online?: boolean;
  category?: string;
  isOfficial?: boolean;
};

type OfficialWithChildren = {
  official: CommunityRow;
  children: CommunityRow[];
};

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

function CommunityRankCard({ item, index }: { item: CommunityRow; index: number }) {
  return (
    <Pressable
      style={styles.rankCard}
      onPress={() => router.push(`/community/${item.id}`)}
    >
      <Image source={{ uri: item.thumbnail }} style={styles.rankCardImage} contentFit="cover" />
      <View style={styles.rankCardOverlay} />
      <RankBadge rank={index + 1} />
      {item.isOfficial ? (
        <View style={styles.officialChip}>
          <Text style={styles.officialChipText}>HUB</Text>
        </View>
      ) : null}
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

function PurchaseRankCard({ item }: { item: any }) {
  return (
    <Pressable
      style={styles.purchaseCard}
      onPress={() => router.push(`/video/${item.id}` as any)}
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
          <Pressable
            onPress={(e) => {
              (e as any).stopPropagation?.();
              navigateFromVideoCreatorRow(item);
            }}
            hitSlop={4}
          >
            <Image source={{ uri: item.avatar }} style={styles.purchaseCardAvatar} contentFit="cover" />
          </Pressable>
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

  const { data: apiCommunities = [], isLoading: communitiesLoading } = useQuery<any[]>({
    queryKey: ["/api/communities"],
  });

  const { sortedOfficial, sortedRest, sortedAll } = useMemo(() => {
    const sorted = [...apiCommunities].sort((a, b) => {
      const o = Number(!!b.isOfficial) - Number(!!a.isOfficial);
      if (o !== 0) return o;
      return (b.members ?? 0) - (a.members ?? 0);
    });
    return {
      sortedAll: sorted,
      sortedOfficial: sorted.filter((c) => c.isOfficial),
      sortedRest: sorted.filter((c) => !c.isOfficial),
    };
  }, [apiCommunities]);

  const { officialWithChildren, unassignedChildren } = useMemo(() => {
    const normalize = (v: unknown) => String(v ?? "").trim().toLowerCase();
    const hubs = sortedOfficial;
    const children = sortedRest;
    const used = new Set<number>();

    const grouped: OfficialWithChildren[] = hubs.map((official) => {
      const officialCategory = normalize(official.category);
      const matched = children.filter((child) => {
        const childCategory = normalize(child.category);
        if (!officialCategory || !childCategory) return false;
        const hit = childCategory.includes(officialCategory) || officialCategory.includes(childCategory);
        if (hit) used.add(child.id);
        return hit;
      });
      return { official, children: matched };
    });

    const unassigned = children.filter((c) => !used.has(c.id));
    return { officialWithChildren: grouped, unassignedChildren: unassigned };
  }, [sortedOfficial, sortedRest]);

  const { data: rankedApiVideos = [], isLoading: rankedLoading } = useQuery<any[]>({
    queryKey: ["/api/videos/ranked"],
  });

  const purchaseData = rankedApiVideos;

  const query = search.trim().toLowerCase();
  const filteredOfficialWithChildren = useMemo(() => {
    if (!query) return officialWithChildren;
    return officialWithChildren
      .map((g) => ({
        official: g.official,
        children: g.children.filter((c) => c.name.toLowerCase().includes(query)),
      }))
      .filter((g) => g.official.name.toLowerCase().includes(query) || g.children.length > 0);
  }, [officialWithChildren, query]);
  const filteredUnassigned = useMemo(() => {
    if (!query) return unassignedChildren;
    return unassignedChildren.filter((c) => c.name.toLowerCase().includes(query));
  }, [unassignedChildren, query]);

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <AppLogo height={36} />
      </View>
      <MetallicLine thickness={1} style={{ marginHorizontal: 16 }} />
      <Pressable style={styles.globalAnnounceCta} onPress={() => router.push("/live-announcements")}>
        <Ionicons name="earth-outline" size={22} color={C.accent} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.globalAnnounceTitle}>Global live announcements</Text>
          <Text style={styles.globalAnnounceSub}>Browse board posts across communities · tap to open</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={C.textMuted} />
      </Pressable>
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
        {sortedOfficial.length > 0 ? (
          <View style={styles.section}>
            <View style={[styles.sectionHeader, styles.sectionHeaderFirst]}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>Community hubs</Text>
            </View>
            {communitiesLoading ? (
              <ActivityIndicator color={C.accent} style={{ marginVertical: 24 }} />
            ) : (
              <FlatList
                data={sortedOfficial}
                keyExtractor={(item) => String(item.id)}
                horizontal
                showsHorizontalScrollIndicator={scrollShowsHorizontal}
                contentContainerStyle={styles.hList}
                renderItem={({ item, index }) => (
                  <CommunityRankCard item={item} index={index} />
                )}
              />
            )}
          </View>
        ) : null}

        {filteredOfficialWithChildren.map(({ official, children }) => (
          <View style={styles.section} key={`official-children-${official.id}`}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>{official.name} communities</Text>
            </View>
            {children.length === 0 ? (
              <Text style={styles.emptyInline}>No communities yet</Text>
            ) : (
              <FlatList
                data={children}
                keyExtractor={(item) => String(item.id)}
                horizontal
                showsHorizontalScrollIndicator={scrollShowsHorizontal}
                contentContainerStyle={styles.hList}
                renderItem={({ item, index }) => (
                  <CommunityRankCard item={item} index={index} />
                )}
              />
            )}
          </View>
        ))}

        {filteredUnassigned.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>Other communities</Text>
            </View>
            <FlatList
              data={filteredUnassigned}
              keyExtractor={(item) => String(item.id)}
              horizontal
              showsHorizontalScrollIndicator={scrollShowsHorizontal}
              contentContainerStyle={styles.hList}
              renderItem={({ item, index }) => (
                <CommunityRankCard item={item} index={index} />
              )}
            />
          </View>
        ) : null}

        {!communitiesLoading && sortedAll.length === 0 ? (
          <Text style={styles.emptyInline}>No communities yet</Text>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>Jukebox chart</Text>
          </View>
          {rankedLoading ? (
            <ActivityIndicator color={C.accent} style={{ marginVertical: 24 }} />
          ) : purchaseData.length === 0 ? (
            <Text style={styles.emptyInline}>No chart entries yet</Text>
          ) : (
            <FlatList
              data={purchaseData}
              keyExtractor={(item) => String(item.id)}
              horizontal
              showsHorizontalScrollIndicator={scrollShowsHorizontal}
              contentContainerStyle={styles.hList}
              renderItem={({ item }) => <PurchaseRankCard item={item} />}
            />
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  globalAnnounceCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 14,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.accent + "44",
  },
  globalAnnounceTitle: { color: C.text, fontSize: 15, fontWeight: "800" },
  globalAnnounceSub: { color: C.textMuted, fontSize: 12, marginTop: 4 },
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
  sectionAccent: {
    width: 3,
    height: 16,
    backgroundColor: C.accent,
    borderRadius: 2,
  },
  sectionTitle: { color: C.text, fontSize: 15, fontWeight: "700" },
  sectionHeaderFirst: { marginTop: 12 },
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
  officialChip: {
    position: "absolute",
    top: 36,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: C.accent + "99",
  },
  officialChipText: {
    color: C.accent,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.6,
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
  emptyInline: {
    color: C.textMuted,
    fontSize: 13,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
