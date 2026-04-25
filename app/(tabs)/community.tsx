import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { navigateFromVideoCreatorRow } from "@/lib/navigate-profile";
import { C } from "@/constants/colors";
import { getTabTopInset, getTabBottomInset, webScrollStyle } from "@/constants/layout";
import { MetallicLine } from "@/components/MetallicLine";
import { AppLogo } from "@/components/AppLogo";
import { HorizontalScroll } from "@/components/HorizontalScroll";
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

function CommunityRankCard({
  item,
  index,
  showCreateButton = false,
}: {
  item: CommunityRow;
  index: number;
  showCreateButton?: boolean;
}) {
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
      {showCreateButton ? (
        <Pressable
          style={styles.createFromStationChip}
          onPress={(e) => {
            (e as any).stopPropagation?.();
            router.push({
              pathname: "/community/create",
              params: {
                stationId: String(item.id),
                stationName: item.name,
                stationCategory: item.category ?? "General",
              },
            });
          }}
        >
          <Ionicons name="add" size={11} color="#000" />
          <Text style={styles.createFromStationChipText}>Create</Text>
        </Pressable>
      ) : null}
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
  const [officialSort, setOfficialSort] = useState<"members" | "active" | "newest">("members");
  const [showStationCommunities, setShowStationCommunities] = useState(false);
  const [contentTab, setContentTab] = useState<"paid" | "community">("paid");

  const { data: apiCommunities = [], isLoading: communitiesLoading } = useQuery<any[]>({
    queryKey: ["/api/communities"],
  });
  const { data: officialStationStats } = useQuery<{
    officialCommunityCount: number;
    uniqueMemberCount: number;
    memberSum: number;
  }>({
    queryKey: ["/api/district/official-station/stats"],
  });

  const { officialBase, userBase } = useMemo(() => {
    // District definition:
    // - Official Station = top 10 communities (legacy official bucket uplift)
    // - Community = user-created communities (the rest)
    const sorted = [...apiCommunities].sort((a, b) => (b.members ?? 0) - (a.members ?? 0));
    return {
      officialBase: sorted.slice(0, 10),
      userBase: sorted.slice(10),
    };
  }, [apiCommunities]);

  const { data: rankedApiVideos = [], isLoading: rankedLoading } = useQuery<any[]>({
    queryKey: ["/api/videos/ranked"],
  });

  const purchaseData = rankedApiVideos;

  const filteredOfficial = useMemo(() => {
    const base = officialBase;
    if (officialSort === "active") {
      return [...base].sort((a, b) => {
        const onlineDiff = Number(Boolean(b.online)) - Number(Boolean(a.online));
        if (onlineDiff !== 0) return onlineDiff;
        return (b.members ?? 0) - (a.members ?? 0);
      });
    }
    if (officialSort === "newest") {
      return [...base].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
    }
    return [...base].sort((a, b) => (b.members ?? 0) - (a.members ?? 0));
  }, [officialBase, officialSort]);
  const filteredUser = useMemo(() => {
    return userBase;
  }, [userBase]);
  const officialLeadId = filteredOfficial[0]?.id ?? officialBase[0]?.id ?? null;
  const stationLead = filteredOfficial[0] ?? officialBase[0] ?? null;
  const stationCommunityCount = officialStationStats?.officialCommunityCount ?? filteredOfficial.length;
  const stationMembers = officialStationStats?.uniqueMemberCount ?? 0;

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <AppLogo height={36} />
      </View>
      <MetallicLine thickness={1} style={{ marginHorizontal: 16 }} />

      <ScrollView style={webScrollStyle(styles.scroll)} showsVerticalScrollIndicator={scrollShowsVertical}>
        <View style={styles.section}>
          <View style={[styles.sectionHeader, styles.sectionHeaderFirst]}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>Official Station</Text>
          </View>

          <View style={styles.adBannerSlot}>
            <Text style={styles.adBannerText}>Ad Banner Space</Text>
          </View>

          <View style={styles.stationCoreBox}>
            <View style={styles.stationTopRow}>
              <Image
                source={{ uri: stationLead?.thumbnail || "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=256&h=256&fit=crop" }}
                style={styles.stationIcon}
                contentFit="cover"
              />
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.stationName} numberOfLines={1}>
                  {stationLead?.name ?? "Official Station"}
                </Text>
                <Pressable
                  onPress={() => setShowStationCommunities((v) => !v)}
                  style={styles.stationCountLink}
                >
                  <Text style={styles.stationCountLinkText}>
                    Communities: {stationCommunityCount}
                  </Text>
                  <Ionicons
                    name={showStationCommunities ? "chevron-up" : "chevron-down"}
                    size={14}
                    color={C.accent}
                  />
                </Pressable>
                <Text style={styles.stationMembersText}>Members: {formatNum(stationMembers)}</Text>
              </View>
            </View>
          </View>

          {showStationCommunities && (
            <HorizontalScroll contentContainerStyle={styles.hList}>
              {filteredOfficial.map((item, index) => (
                <CommunityRankCard key={item.id} item={item} index={index} showCreateButton />
              ))}
            </HorizontalScroll>
          )}

          <View style={styles.stationLinksRow}>
            <Pressable
              style={styles.stationLinkBtn}
              onPress={() =>
                officialLeadId != null ? router.push(`/jukebox/${officialLeadId}` as any) : router.push("/community" as any)
              }
            >
              <Ionicons name="musical-notes-outline" size={16} color={C.accent} />
              <Text style={styles.stationLinkText}>JUKEBOX</Text>
            </Pressable>
          </View>

          <View style={styles.tabSwitchRow}>
            <Pressable
              style={[styles.tabSwitchBtn, contentTab === "paid" && styles.tabSwitchBtnActive]}
              onPress={() => setContentTab("paid")}
            >
              <Text style={[styles.tabSwitchText, contentTab === "paid" && styles.tabSwitchTextActive]}>
                Paid Videos
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabSwitchBtn, contentTab === "community" && styles.tabSwitchBtnActive]}
              onPress={() => setContentTab("community")}
            >
              <Text style={[styles.tabSwitchText, contentTab === "community" && styles.tabSwitchTextActive]}>
                Community
              </Text>
            </Pressable>
          </View>

          <View style={styles.sortRow}>
            {([
              ["members", "By Members"],
              ["active", "By Active"],
              ["newest", "By Newest"],
            ] as const).map(([key, label]) => (
              <Pressable
                key={key}
                style={[styles.sortPill, officialSort === key && styles.sortPillActive]}
                onPress={() => setOfficialSort(key)}
              >
                <Text style={[styles.sortPillText, officialSort === key && styles.sortPillTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {communitiesLoading ? (
            <ActivityIndicator color={C.accent} style={{ marginVertical: 24 }} />
          ) : filteredOfficial.length === 0 ? (
            <Text style={styles.emptyInline}>No official stations yet</Text>
          ) : (
            <View />
          )}
        </View>

        {contentTab === "paid" ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>Paid Video Ranking</Text>
            </View>
            {rankedLoading ? (
              <ActivityIndicator color={C.accent} style={{ marginVertical: 24 }} />
            ) : purchaseData.length === 0 ? (
              <Text style={styles.emptyInline}>No ranked paid videos yet</Text>
            ) : (
              <HorizontalScroll contentContainerStyle={styles.hList}>
                {purchaseData.map((item) => (
                  <PurchaseRankCard key={item.id} item={item} />
                ))}
              </HorizontalScroll>
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>Community</Text>
            </View>
            {communitiesLoading ? (
              <ActivityIndicator color={C.accent} style={{ marginVertical: 24 }} />
            ) : filteredUser.length === 0 ? (
              <Text style={styles.emptyInline}>No communities yet</Text>
            ) : (
              <HorizontalScroll contentContainerStyle={styles.hList}>
                {filteredUser.map((item, index) => (
                  <CommunityRankCard key={item.id} item={item} index={index} />
                ))}
              </HorizontalScroll>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  adBannerSlot: {
    marginHorizontal: 16,
    marginBottom: 10,
    height: 72,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  adBannerText: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  stationCoreBox: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  stationTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stationIcon: {
    width: 48,
    height: 48,
    borderRadius: 6,
  },
  stationName: {
    color: C.text,
    fontSize: 15,
    fontWeight: "800",
  },
  stationCountLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  stationCountLinkText: {
    color: C.accent,
    fontSize: 12,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  stationMembersText: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  stationLinksRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  stationLinkBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  stationLinkText: { color: C.textSec, fontSize: 12, fontWeight: "600" },
  tabSwitchRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  tabSwitchBtn: {
    flex: 1,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  tabSwitchBtnActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  tabSwitchText: {
    color: C.textSec,
    fontSize: 12,
    fontWeight: "700",
  },
  tabSwitchTextActive: {
    color: "#000",
  },
  sortRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  sortPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
  },
  sortPillActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  sortPillText: { color: C.textSec, fontSize: 11, fontWeight: "700" },
  sortPillTextActive: { color: "#000" },
  liveAnnounceLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  liveAnnounceLinkText: { flex: 1, color: C.textSec, fontSize: 13, fontWeight: "600" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  createFromStationChip: {
    position: "absolute",
    top: 36,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: C.accent,
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  createFromStationChipText: {
    color: "#000",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.2,
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
