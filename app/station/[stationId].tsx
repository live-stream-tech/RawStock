import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { C } from "@/constants/colors";
import { getTabTopInset, getTabBottomInset, webScrollStyle } from "@/constants/layout";
import { AppLogo } from "@/components/AppLogo";
import { STATIONS, STATION_CATEGORY_LABEL } from "@/constants/stations";

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "w";
  return n.toLocaleString();
}

const STATION_CATEGORY_TERMS: Record<string, string[]> = {
  band_club_rave: ["band", "rock", "club", "rave", "dj", "music", "バンド", "クラブ", "レイヴ", "音楽"],
  streamer: ["streamer", "liver", "live", "creator", "配信", "ライバー", "ライブ"],
  ai_video_creator: ["ai", "video", "edit", "generative", "ai映像", "ai動画", "編集"],
  visual_performer: ["visual", "art", "photo", "design", "ビジュアル", "映像", "写真"],
  mentor_expert: ["mentor", "coach", "expert", "session", "メンター", "専門家", "コーチ"],
  v_liver_avatar: ["v", "avatar", "virtual", "vtuber", "vライバー", "アバター", "バーチャル"],
  voice_artist: ["voice", "vocal", "singer", "podcast", "ボイス", "ボーカル", "歌"],
  lifestyle_influencer: ["lifestyle", "influencer", "daily", "ライフ", "暮らし", "インフルエンサー"],
  singer_idol: ["singer", "idol", "vocal", "歌手", "アイドル", "音楽"],
  dance_performer: ["dance", "performer", "choreo", "ダンス", "パフォーマー"],
};

export default function StationScreen() {
  const { stationId } = useLocalSearchParams<{ stationId: string }>();
  const insets = useSafeAreaInsets();
  const topInset = getTabTopInset(insets);
  const bottomInset = getTabBottomInset(insets);

  const stationByCategory = STATIONS.find((s) => s.category === stationId);
  const stationByNumericId = STATIONS.find((s) => String(s.id) === stationId);
  const station = stationByCategory ?? stationByNumericId ?? null;

  const { data: apiCommunities = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/communities"],
    enabled: !!station,
  });

  const filtered = React.useMemo(() => {
    if (!station) return [];
    const label = STATION_CATEGORY_LABEL[station.category] ?? "";
    const terms = STATION_CATEGORY_TERMS[station.category] ?? [];
    const needles = [station.category, label, ...terms].filter(Boolean).map((v) => v.toLowerCase());
    return apiCommunities
      .filter((c: any) => {
        const cat = String(c.category ?? "").toLowerCase();
        const name = String(c.name ?? "").toLowerCase();
        return needles.some((n) => cat === n || cat.includes(n) || name.includes(n));
      })
      .sort((a: any, b: any) => (b.members ?? 0) - (a.members ?? 0));
  }, [apiCommunities, station]);

  const stationSeeds = React.useMemo(
    () =>
      station
        ? [
            { id: `seed-${station.id}-1`, name: `${station.name} Official`, thumbnail: station.thumbnail, members: 2400 },
            { id: `seed-${station.id}-2`, name: `${station.name} Creators`, thumbnail: station.thumbnail, members: 1800 },
            { id: `seed-${station.id}-3`, name: `${station.name} Daily Feed`, thumbnail: station.thumbnail, members: 1200 },
          ]
        : [],
    [station]
  );
  const displayItems = filtered.length > 0 ? filtered : stationSeeds;

  if (!station) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <Text style={styles.notFound}>Station not found</Text>
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
          <Ionicons name="albums-outline" size={20} color={C.accent} />
          <Text style={styles.headerText}>{station.name}</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={webScrollStyle(styles.scroll)} showsVerticalScrollIndicator={scrollShowsVertical}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionTitle}>Channels</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={C.accent} style={{ marginVertical: 32 }} />
        ) : (
          <View style={styles.communityGrid}>
            {displayItems.map((item: any) => (
              <Pressable
                key={String(item.id)}
                style={styles.communityCard}
                onPress={() =>
                  String(item.id).startsWith("seed-")
                    ? router.push({
                        pathname: "/community/create",
                        params: {
                          stationId: String(station.id),
                          stationName: station.name,
                          stationCategory: station.category,
                        },
                      } as any)
                    : router.push(`/community/${item.id}`)
                }
              >
                <Image source={{ uri: item.thumbnail }} style={styles.communityCardImage} contentFit="cover" />
                <View style={styles.communityCardOverlay} />
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
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 32, alignItems: "flex-start" },
  headerTitle: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerText: { color: C.text, fontSize: 18, fontWeight: "700" },
  scroll: { flex: 1 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  sectionAccent: { width: 3, height: 18, borderRadius: 2, backgroundColor: C.accent },
  sectionTitle: { color: C.text, fontSize: 15, fontWeight: "700" },
  communityGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 10 },
  communityCard: { width: "47%", aspectRatio: 0.75, overflow: "hidden", position: "relative", backgroundColor: C.surface },
  communityCardImage: { ...StyleSheet.absoluteFillObject as any },
  communityCardOverlay: { ...StyleSheet.absoluteFillObject as any, backgroundColor: "rgba(0,0,0,0.35)" },
  communityCardBottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 10 },
  communityCardName: { color: "#fff", fontSize: 13, fontWeight: "700" },
  communityCardMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  communityCardMembers: { color: "rgba(255,255,255,0.8)", fontSize: 11 },
  notFound: { color: C.text, textAlign: "center", marginTop: 40, fontSize: 16 },
});

