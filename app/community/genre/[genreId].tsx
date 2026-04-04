import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { scrollShowsHorizontal, scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { Image } from "expo-image";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/constants/colors";
import { getTabTopInset, getTabBottomInset, webScrollStyle } from "@/constants/layout";
import { AppLogo } from "@/components/AppLogo";
import { COMMUNITIES } from "@/constants/data";
import { useQuery } from "@tanstack/react-query";

const GENRE_TO_CATEGORY: Record<string, string[]> = {
  pop: ["Pop", "J-Pop", "K-Pop", "Music"],
  rock: ["Rock", "Band", "Music"],
  hiphop: ["Hip-Hop", "HipHop", "Rap"],
  edm: ["EDM", "Electronic", "DJ"],
  ai: ["AI", "AI Music", "Generative"],
};

const GENRE_DATA: Record<string, { name: string; icon: string; color: string }> = {
  pop: { name: "Pop", icon: "musical-note-outline", color: "#FF4081" },
  rock: { name: "Rock", icon: "flash-outline", color: "#FF6B35" },
  hiphop: { name: "Hip-Hop", icon: "mic-outline", color: C.accent },
  edm: { name: "EDM", icon: "radio-outline", color: "#7B2FFF" },
  ai: { name: "AI Music", icon: "hardware-chip-outline", color: "#00BFA5" },
};

type AdData = { title: string; sub: string; cta: string; bg: string; accent: string; thumb: string };

const GENRE_ADS: Record<string, AdData> = {
  pop: {
    title: "J-Pop Summer Festival 2026",
    sub: "Jul 20 Makuhari Messe • Tickets On Sale",
    cta: "Tickets",
    bg: "#1a0818",
    accent: "#FF4081",
    thumb: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=120&h=80&fit=crop",
  },
  rock: {
    title: "Summer Rock Stage",
    sub: "Summer Sonic · Rock in Japan Pre-Sale",
    cta: "Buy",
    bg: "#0a1520",
    accent: "#FF6B35",
    thumb: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=120&h=80&fit=crop",
  },
  hiphop: {
    title: "Underground Cypher Vol.9",
    sub: "Invite-Only Freestyle Battle • Apply Now",
    cta: "Enter",
    bg: "#0a0f1a",
    accent: C.accent,
    thumb: "https://images.unsplash.com/photo-1571609060955-a91a54b3e7d5?w=120&h=80&fit=crop",
  },
  edm: {
    title: "EDM Club Night Osaka",
    sub: "Every Saturday NOON • Guest DJs",
    cta: "Tickets",
    bg: "#120a28",
    accent: "#7B2FFF",
    thumb: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=120&h=80&fit=crop",
  },
  ai: {
    title: "AI Music Hackathon 2026",
    sub: "Generative AI × Music Production • ¥1M Prize",
    cta: "Apply",
    bg: "#001a18",
    accent: "#00BFA5",
    thumb: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=120&h=80&fit=crop",
  },
};

const DEFAULT_AD: AdData = {
  title: "Premium Stream Tickets Available",
  sub: "Buy now — 10% off for members",
  cta: "Buy",
  bg: "#0a1520",
  accent: C.accent,
  thumb: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=120&h=80&fit=crop",
};

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "w";
  return n.toLocaleString();
}

function filterCommunitiesByGenre(items: { id: string | number; category?: string }[], genreId: string) {
  const terms = GENRE_TO_CATEGORY[genreId];
  if (!terms) return items;
  return items.filter((r) => terms.some((t) => (r.category ?? "").includes(t)));
}

export default function GenreScreen() {
  const { genreId } = useLocalSearchParams<{ genreId: string }>();
  const insets = useSafeAreaInsets();
  const topInset = getTabTopInset(insets);
  const bottomInset = getTabBottomInset();

  const genre = GENRE_DATA[genreId ?? ""] ?? null;

  const { data: apiCommunities = [] } = useQuery<any[]>({
    queryKey: [`/api/communities${genreId ? `?genre=${genreId}` : ""}`],
    enabled: !!genreId,
  });

  const usingDemo = apiCommunities.length === 0;
  const source = usingDemo ? COMMUNITIES : apiCommunities;
  const communities = genreId ? filterCommunitiesByGenre(source, genreId) : source;
  const sortedCommunities = [...communities].sort((a, b) => (b.members ?? 0) - (a.members ?? 0));

  const ad: AdData = (genreId ? GENRE_ADS[genreId] : undefined) ?? DEFAULT_AD;

  if (!genre) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <Text style={styles.notFound}>Genre not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <AppLogo height={36} />
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <View style={styles.headerTitle}>
          <Ionicons name={genre.icon as any} size={20} color={genre.color} />
          <Text style={styles.headerText}>{genre.name}</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={webScrollStyle(styles.scroll)} showsVerticalScrollIndicator={scrollShowsVertical}>
        <Pressable style={[styles.bannerAd, { backgroundColor: ad.bg }]}>
          <View style={styles.adPrBadge}>
            <Text style={styles.adPrText}>PR</Text>
          </View>
          <Image source={{ uri: ad.thumb }} style={styles.adThumb} contentFit="cover" />
          <View style={styles.adBody}>
            <Text style={styles.adTitle} numberOfLines={1}>{ad.title}</Text>
            <Text style={styles.adSub} numberOfLines={1}>{ad.sub}</Text>
          </View>
          <View style={[styles.adCtaBtn, { backgroundColor: ad.accent }]}>
            <Text style={styles.adCtaText}>{ad.cta}</Text>
          </View>
        </Pressable>

        <View style={styles.sectionHeader}>
          <View style={[styles.sectionAccent, { backgroundColor: genre.color }]} />
          <Text style={styles.sectionTitle}>Communities</Text>
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              style={styles.adApplyBtn}
              onPress={() => router.push({ pathname: "/community/genre-ad-apply", params: { genreId } })}
            >
              <Ionicons name="megaphone-outline" size={14} color="#fff" />
              <Text style={styles.adApplyText}>Apply for Genre Ad</Text>
            </Pressable>
        </View>

        {sortedCommunities.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={C.textMuted} />
            <Text style={styles.emptyText}>No communities in this genre yet</Text>
          </View>
        ) : (
          <View style={styles.communityGrid}>
            {sortedCommunities.map((item, index) => (
              <Pressable
                key={String(item.id)}
                style={styles.communityCard}
                onPress={() => router.push(`/community/${item.id}`)}
              >
                <Image source={{ uri: item.thumbnail }} style={styles.communityCardImage} contentFit="cover" />
                <View style={styles.communityCardOverlay} />
                {item.online && (
                  <View style={styles.onlineChip}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.onlineText}>LIVE</Text>
                  </View>
                )}
                <View style={styles.communityCardBottom}>
                  <Text style={styles.communityCardName} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.communityCardMeta}>
                    <Ionicons name="people" size={11} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.communityCardMembers}>{formatNum(item.members ?? 0)}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
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
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 32, alignItems: "flex-start" },
  headerTitle: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerText: { color: C.text, fontSize: 18, fontWeight: "700" },
  scroll: { flex: 1 },
  bannerAd: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    minHeight: 72,
  },
  adPrBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 1,
  },
  adPrText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  adThumb: { width: 100, height: 72, backgroundColor: C.surface3 },
  adBody: { flex: 1, padding: 12, justifyContent: "center" },
  adTitle: { color: "#fff", fontSize: 14, fontWeight: "700" },
  adSub: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 },
  adCtaBtn: {
    marginRight: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  adCtaText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionAccent: { width: 3, height: 18, borderRadius: 2 },
  sectionTitle: { color: C.text, fontSize: 15, fontWeight: "700" },
  actionsRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  adApplyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: C.accent,
  },
  adApplyText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyText: { color: C.textMuted, fontSize: 14, marginTop: 12 },
  communityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 10,
  },
  communityCard: {
    width: "47%",
    aspectRatio: 0.75,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    backgroundColor: C.surface,
  },
  communityCardImage: {
    ...StyleSheet.absoluteFillObject as any,
  },
  communityCardOverlay: {
    ...StyleSheet.absoluteFillObject as any,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  onlineChip: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,0,0,0.8)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  onlineDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#fff" },
  onlineText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  communityCardBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  communityCardName: { color: "#fff", fontSize: 13, fontWeight: "700" },
  communityCardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  communityCardMembers: { color: "rgba(255,255,255,0.8)", fontSize: 11 },
  notFound: { color: C.text, textAlign: "center", marginTop: 40, fontSize: 16 },
});
