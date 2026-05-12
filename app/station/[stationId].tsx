import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { C } from "@/constants/colors";
import { F } from "@/constants/fonts";
import { getTabTopInset, getTabBottomInset, webScrollStyle } from "@/constants/layout";
import { AppLogo } from "@/components/AppLogo";
import { MetallicLine } from "@/components/MetallicLine";
import { HorizontalScroll } from "@/components/HorizontalScroll";
import { ResponsivePromoBanner } from "@/components/ResponsivePromoBanner";
import { STATIONS, STATION_CATEGORY_LABEL } from "@/constants/stations";
import { STATION_JUKEBOX_IDS } from "@/constants/stationJukebox";
import { resolvePublicMediaUri } from "@/lib/resolve-public-media-uri";

const CATEGORY_TERMS: Record<string, string[]> = {
  music: ["music", "band", "rock", "club", "rave", "dj", "live", "singer"],
  ai_video: ["ai", "video", "edit", "generative", "visual"],
  idol_influencer: ["idol", "influencer", "streamer", "liver", "creator", "social"],
  entertainment: ["entertainment", "show", "performance", "performer", "stage", "talent"],
};

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "w";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

function matchesStation(item: any, category: string): boolean {
  const terms = [category, STATION_CATEGORY_LABEL[category] ?? "", ...(CATEGORY_TERMS[category] ?? [])]
    .map((t) => t.toLowerCase());
  const cat = String(item.category ?? "").toLowerCase();
  const name = String(item.name ?? "").toLowerCase();
  return terms.some((t) => t && (cat === t || cat.includes(t) || name.includes(t)));
}

// ─── Community Card (ranked horizontal) ──────────────────────────────────────
function CommunityRankCard({ item, rank }: { item: any; rank: number }) {
  return (
    <Pressable
      style={rankCard.wrap}
      onPress={() => router.push(`/community/${item.id}` as any)}
    >
      <Image
        source={{ uri: resolvePublicMediaUri(item.thumbnail) }}
        style={rankCard.thumb}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.78)"]}
        style={StyleSheet.absoluteFillObject as any}
      />
      <View style={rankCard.rankBadge}>
        <Text style={rankCard.rankText}>{rank}</Text>
      </View>
      <View style={rankCard.info}>
        <Text style={rankCard.name} numberOfLines={1}>{item.name}</Text>
        <View style={rankCard.metaRow}>
          <Ionicons name="people" size={10} color="rgba(255,255,255,0.6)" />
          <Text style={rankCard.meta}>{formatNum(item.members ?? 0)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const rankCard = StyleSheet.create({
  wrap: { width: 140, height: 160, position: "relative", overflow: "hidden", backgroundColor: C.surface },
  thumb: { ...StyleSheet.absoluteFillObject as any },
  rankBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 2,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { color: "#000", fontSize: 11, fontFamily: F.mono, fontWeight: "800" },
  info: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 8, gap: 3 },
  name: { color: "#fff", fontSize: 11, fontWeight: "700", lineHeight: 14 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  meta: { color: "rgba(255,255,255,0.65)", fontSize: 10, fontFamily: F.mono },
});

// ─── Video Card (ranked horizontal) ──────────────────────────────────────────
function VideoRankCard({ item, rank }: { item: any; rank: number }) {
  return (
    <Pressable
      style={videoCard.wrap}
      onPress={() => router.push(`/video/${item.id}` as any)}
    >
      <Image
        source={{ uri: resolvePublicMediaUri(item.thumbnail) }}
        style={videoCard.thumb}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.82)"]}
        style={StyleSheet.absoluteFillObject as any}
      />
      <View style={videoCard.rankBadge}>
        <Text style={videoCard.rankText}>{rank}</Text>
      </View>
      {item.price != null && item.price > 0 && (
        <View style={videoCard.pricePill}>
          <Text style={videoCard.priceText}>🎟{item.price.toLocaleString()}</Text>
        </View>
      )}
      <View style={videoCard.info}>
        <Text style={videoCard.title} numberOfLines={2}>{item.title}</Text>
        <View style={videoCard.metaRow}>
          <Ionicons name="eye-outline" size={10} color="rgba(255,255,255,0.55)" />
          <Text style={videoCard.meta}>{formatNum(item.views ?? 0)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const videoCard = StyleSheet.create({
  wrap: { width: 180, height: 120, position: "relative", overflow: "hidden", backgroundColor: C.surface },
  thumb: { ...StyleSheet.absoluteFillObject as any },
  rankBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 2,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { color: "#000", fontSize: 11, fontFamily: F.mono, fontWeight: "800" },
  pricePill: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: C.accent,
  },
  priceText: { color: C.accent, fontSize: 9, fontFamily: F.mono, fontWeight: "700" },
  info: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 8, gap: 3 },
  title: { color: "#fff", fontSize: 11, fontWeight: "700", lineHeight: 14 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  meta: { color: "rgba(255,255,255,0.55)", fontSize: 10, fontFamily: F.mono },
});

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionAccent} />
      <Text style={styles.sectionTitle}>{title}</Text>
      {right && <View style={{ flex: 1, alignItems: "flex-end" }}>{right}</View>}
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function StationScreen() {
  const { stationId } = useLocalSearchParams<{ stationId: string }>();
  const insets = useSafeAreaInsets();
  const topInset = getTabTopInset(insets);
  const bottomInset = getTabBottomInset(insets);
  const [query, setQuery] = useState("");

  const station = STATIONS.find((s) => s.category === stationId) ?? STATIONS.find((s) => String(s.id) === stationId) ?? null;

  const { data: apiCommunities = [], isLoading: commLoading } = useQuery<any[]>({
    queryKey: ["/api/communities"],
    enabled: !!station,
  });

  const { data: apiVideos = [] } = useQuery<any[]>({
    queryKey: ["/api/videos"],
    enabled: !!station,
  });

  const communities = React.useMemo(() => {
    if (!station) return [];
    const matched = apiCommunities
      .filter((c) => matchesStation(c, station.category))
      .sort((a, b) => (b.members ?? 0) - (a.members ?? 0));
    if (matched.length > 0) return matched;
    // seed placeholders when empty
    return [
      { id: `seed-1`, name: `${station.name} Official`, thumbnail: station.thumbnail, members: 2400 },
      { id: `seed-2`, name: `${station.name} Creators`, thumbnail: station.thumbnail, members: 1800 },
      { id: `seed-3`, name: `${station.name} Daily Feed`, thumbnail: station.thumbnail, members: 1200 },
    ];
  }, [apiCommunities, station]);

  const videos = React.useMemo(() => {
    if (!station) return [];
    return apiVideos
      .filter((v) => matchesStation(v, station.category))
      .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
      .slice(0, 10);
  }, [apiVideos, station]);

  const filteredCommunities = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return communities;
    return communities.filter((c) => String(c.name ?? "").toLowerCase().includes(q));
  }, [communities, query]);

  const stationJukeboxId = station ? (STATION_JUKEBOX_IDS[station.category] ?? null) : null;

  if (!station) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <Text style={styles.notFound}>Station not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <AppLogo height={30} />
        <View style={styles.headerTitle}>
          <Text style={styles.headerText}>{station.name}</Text>
        </View>
      </View>
      <MetallicLine thickness={1} />

      <ScrollView style={webScrollStyle(styles.scroll)} showsVerticalScrollIndicator={scrollShowsVertical}>

        {/* Banner */}
        <ResponsivePromoBanner accessibilityLabel="Sponsored banner" style={styles.banner} />

        {/* Search + Create */}
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={14} color={C.textMuted} style={{ marginLeft: 10 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search communities..."
              placeholderTextColor={C.textMuted}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
          </View>
          <Pressable
            style={styles.createBtn}
            onPress={() =>
              router.push({
                pathname: "/community/create",
                params: { stationId: String(station.id), stationName: station.name, stationCategory: station.category },
              } as any)
            }
          >
            <Ionicons name="add" size={16} color="#000" />
            <Text style={styles.createBtnText}>Create</Text>
          </Pressable>
        </View>

        {/* Jukebox */}
        <Pressable
          style={styles.jukebox}
          onPress={() =>
            stationJukeboxId
              ? router.push(`/jukebox/${stationJukeboxId}?stationLabel=${encodeURIComponent(station.name)}` as any)
              : undefined
          }
        >
          <LinearGradient
            colors={["#062822", "#0a1514", "#0c0c0c"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject as any}
          />
          <View style={styles.jukeboxInner}>
            <View style={styles.jukeboxIcon}>
              <Ionicons name="musical-notes" size={22} color={C.accent} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.jukeboxBadgeRow}>
                <View style={styles.jukeboxPill}>
                  <Text style={styles.jukeboxPillText}>JUKEBOX</Text>
                </View>
              </View>
              <Text style={styles.jukeboxLabel}>Open {station.name} watch-along room</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.accent} />
          </View>
        </Pressable>

        {/* Popular Communities */}
        <View style={styles.sectionGap} />
        <SectionHeader
          title="Popular communities"
          right={
            <Pressable onPress={() => router.push("/community" as any)}>
              <Text style={styles.viewAll}>ALL</Text>
            </Pressable>
          }
        />
        {commLoading ? (
          <ActivityIndicator color={C.accent} style={{ marginVertical: 24 }} />
        ) : (
          <HorizontalScroll contentContainerStyle={styles.hScroll}>
            {filteredCommunities.slice(0, 10).map((item, i) => (
              <CommunityRankCard key={String(item.id)} item={item} rank={i + 1} />
            ))}
            {filteredCommunities.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No communities found</Text>
              </View>
            )}
          </HorizontalScroll>
        )}

        {/* Popular Videos */}
        {videos.length > 0 && (
          <>
            <View style={styles.sectionGap} />
            <View style={styles.sectionDivider} />
            <View style={styles.sectionGap} />
            <SectionHeader title="Popular videos" />
            <HorizontalScroll contentContainerStyle={styles.hScroll}>
              {videos.map((item, i) => (
                <VideoRankCard key={item.id} item={item} rank={i + 1} />
              ))}
            </HorizontalScroll>
          </>
        )}

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
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 28 },
  headerTitle: { flex: 1, alignItems: "flex-end" },
  headerText: {
    color: C.accent,
    fontSize: 13,
    fontFamily: F.mono,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  scroll: { flex: 1 },

  // Banner
  banner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },

  // Search row
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
  },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    height: 38,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    color: C.text,
    fontSize: 13,
    paddingRight: 10,
    height: "100%",
    fontFamily: F.mono,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.accent,
    borderRadius: 4,
    height: 38,
    paddingHorizontal: 14,
  },
  createBtnText: { color: "#000", fontSize: 13, fontWeight: "800", fontFamily: F.mono },

  // Jukebox
  jukebox: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,255,204,0.35)",
  },
  jukeboxInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
  },
  jukeboxIcon: {
    width: 44,
    height: 44,
    borderRadius: 4,
    backgroundColor: "rgba(0,255,204,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,255,204,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  jukeboxBadgeRow: { flexDirection: "row", alignItems: "center" },
  jukeboxPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 2,
    backgroundColor: "rgba(0,255,204,0.12)",
    borderWidth: 1,
    borderColor: "rgba(0,255,204,0.35)",
  },
  jukeboxPillText: { color: C.accent, fontSize: 8, fontFamily: F.mono, fontWeight: "800", letterSpacing: 1.5 },
  jukeboxLabel: { color: C.text, fontSize: 13, fontWeight: "600", marginTop: 2 },

  // Section
  sectionGap: { height: 20 },
  sectionDivider: { height: 1, backgroundColor: C.border, marginHorizontal: 16 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionAccent: { width: 3, height: 18, borderRadius: 1, backgroundColor: C.accent },
  sectionTitle: {
    color: C.text,
    fontSize: 15,
    fontFamily: F.display,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  viewAll: { color: C.accent, fontSize: 9, fontFamily: F.mono, letterSpacing: 1.2, textTransform: "uppercase" },
  hScroll: { paddingHorizontal: 16, paddingBottom: 4, gap: 10 },
  emptyCard: {
    width: 200,
    height: 160,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { color: C.textMuted, fontSize: 12, fontFamily: F.mono },
  notFound: { color: C.text, textAlign: "center", marginTop: 40, fontSize: 16 },
});
