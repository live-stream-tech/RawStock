import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/query-client";
import { C } from "@/constants/colors";
import { CREATORS } from "@/constants/data";

type Liver = {
  id: number;
  name: string;
  community: string;
  avatar: string;
  rank: number;
  heatScore: number;
  streamCount: number;
  followers: number;
  satisfactionScore: number;
  attendanceRate: number;
  bio: string;
  category: string;
};

type LiversResponse = {
  rankingType: "overall" | "paid_live";
  month: string;
  rows: Liver[];
};

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "idol", label: "Idol" },
  { id: "english", label: "English" },
  { id: "fortune", label: "Fortune" },
  { id: "counselor", label: "Counselor" },
  { id: "cooking", label: "Cooking" },
  { id: "coaching", label: "Coaching" },
];

const CATEGORY_ICONS: Record<string, string> = {
  idol: "musical-notes-outline",
  english: "language-outline",
  fortune: "star-outline",
  counselor: "heart-outline",
  cooking: "restaurant-outline",
  coaching: "trophy-outline",
};

function ScoreBadge({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <View style={[styles.scoreBadge, { borderColor: color + "44", backgroundColor: color + "11" }]}>
      <Text style={[styles.scoreValue, { color }]}>{score.toFixed(1)}</Text>
      <Text style={styles.scoreLabel}>{label}</Text>
    </View>
  );
}

function LiverCard({ liver }: { liver: Liver }) {
  return (
    <Pressable style={styles.card} onPress={() => router.push(`/livers/${liver.id}`)}>
      <View style={styles.cardTop}>
        <Image source={{ uri: liver.avatar }} style={styles.avatar} contentFit="cover" />
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{liver.name}</Text>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>#{liver.rank}</Text>
            </View>
          </View>
          <Text style={styles.community}>{liver.community}</Text>
          <Text style={styles.bio} numberOfLines={2}>{liver.bio}</Text>
        </View>
      </View>

      <View style={styles.scoresRow}>
        <ScoreBadge label="Satisfaction" score={liver.satisfactionScore} color={C.accent} />
        <ScoreBadge label="Streams" score={Math.min(liver.streamCount / 10, 5.0)} color={C.orange} />
        <ScoreBadge label="Attendance" score={liver.attendanceRate} color={C.green} />
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.statItem}>
          <Ionicons name="people-outline" size={13} color={C.textMuted} />
          <Text style={styles.statText}>{liver.followers.toLocaleString()} followers</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="radio-outline" size={13} color={C.textMuted} />
          <Text style={styles.statText}>{liver.streamCount} streams</Text>
        </View>
        <View style={styles.detailBtn}>
          <Text style={styles.detailBtnText}>View</Text>
          <Ionicons name="chevron-forward" size={12} color={C.accent} />
        </View>
      </View>
    </Pressable>
  );
}

export default function LiversScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : 0;

  const [searchText, setSearchText] = useState("");
  const [category, setCategory] = useState("all");
  const [minScore, setMinScore] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [rankingType, setRankingType] = useState<"overall" | "paid_live">("overall");

  const queryParams = new URLSearchParams();
  if (searchText) queryParams.set("name", searchText);
  if (category !== "all") queryParams.set("category", category);
  if (minScore) queryParams.set("minScore", minScore);
  if (selectedDate) queryParams.set("date", selectedDate);
  queryParams.set("rankingType", rankingType);
  const queryString = queryParams.toString();

  const { data: apiPayload, isLoading } = useQuery<LiversResponse>({
    queryKey: [`/api/livers?${queryString}`, searchText, category, minScore, selectedDate, rankingType],
    queryFn: async () => {
      const url = new URL(`/api/livers${queryString ? "?" + queryString : ""}`, getApiUrl());
      const res = await fetch(url.toString());
      return res.json();
    },
  });
  const apiLivers = apiPayload?.rows ?? [];

  const fallbackLivers: Liver[] =
    apiLivers.length === 0 && !searchText && category === "all"
      ? CREATORS.map((c, i) => ({
          id: parseInt(c.id) || i + 1,
          name: c.name,
          community: c.community,
          avatar: c.avatar,
          rank: c.rank,
          heatScore: c.heatScore,
          streamCount: c.streamCount,
          followers: c.followers,
          satisfactionScore: 4.6,
          attendanceRate: 4.8,
          bio: `A popular creator active in ${c.community}.`,
          category: "idol",
        }))
      : [];

  const livers = apiLivers.length > 0 ? apiLivers : fallbackLivers;

  return (
    <View style={[styles.container, { paddingTop: topInset, paddingBottom: bottomInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Creator Rankings</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.rankToggleRow}>
        <Pressable
          style={[styles.rankToggleBtn, rankingType === "overall" && styles.rankToggleBtnActive]}
          onPress={() => setRankingType("overall")}
        >
          <Text style={[styles.rankToggleText, rankingType === "overall" && styles.rankToggleTextActive]}>
            Overall (3 metrics)
          </Text>
        </Pressable>
        <Pressable
          style={[styles.rankToggleBtn, rankingType === "paid_live" && styles.rankToggleBtnActive]}
          onPress={() => setRankingType("paid_live")}
        >
          <Text style={[styles.rankToggleText, rankingType === "paid_live" && styles.rankToggleTextActive]}>
            Paid Live (Sales)
          </Text>
        </Pressable>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={C.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search by name"
          placeholderTextColor={C.textMuted}
        />
        {searchText.length > 0 && (
          <Pressable onPress={() => setSearchText("")}>
            <Ionicons name="close-circle" size={16} color={C.textMuted} />
          </Pressable>
        )}
      </View>

      <View style={styles.filterRow}>
        <View style={styles.filterItem}>
          <Ionicons name="star-outline" size={13} color={C.textMuted} />
          <TextInput
            style={styles.filterInput}
            value={minScore}
            onChangeText={setMinScore}
            placeholder="Min score"
            placeholderTextColor={C.textMuted}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.filterItem}>
          <Ionicons name="calendar-outline" size={13} color={C.textMuted} />
          <TextInput
            style={styles.filterInput}
            value={selectedDate}
            onChangeText={setSelectedDate}
            placeholder="Date (YYYY-MM-DD)"
            placeholderTextColor={C.textMuted}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catScroll}
        contentContainerStyle={styles.catScrollContent}
      >
        {CATEGORIES.map((cat) => {
          const isActive = category === cat.id;
          return (
            <Pressable
              key={cat.id}
              style={[styles.catPill, isActive && styles.catPillActive]}
              onPress={() => setCategory(cat.id)}
            >
              {cat.id !== "all" && (
                <Ionicons
                  name={CATEGORY_ICONS[cat.id] as any}
                  size={12}
                  color={isActive ? "#fff" : C.textSec}
                />
              )}
              <Text style={[styles.catPillText, isActive && styles.catPillTextActive]}>
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator color={C.accent} style={{ marginTop: 48 }} />
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {livers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="person-outline" size={40} color={C.textMuted} />
              <Text style={styles.emptyText}>No creators match your filters</Text>
            </View>
          ) : (
            livers.map((liver) => <LiverCard key={liver.id} liver={liver} />)
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.surface, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: C.surface, marginHorizontal: 16, marginBottom: 10,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: C.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text },
  rankToggleRow: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  rankToggleBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: "center",
    paddingVertical: 9,
  },
  rankToggleBtnActive: {
    borderColor: C.accent,
    backgroundColor: C.accent + "22",
  },
  rankToggleText: {
    fontSize: 11,
    color: C.textSec,
    fontWeight: "700",
  },
  rankToggleTextActive: {
    color: C.accent,
  },
  filterRow: {
    flexDirection: "row", gap: 8, marginHorizontal: 16, marginBottom: 10,
  },
  filterItem: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: C.border,
  },
  filterInput: { flex: 1, fontSize: 12, color: C.text },
  catScroll: { flexGrow: 0, marginBottom: 8 },
  catScrollContent: { paddingHorizontal: 16, gap: 8 },
  catPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  catPillActive: { backgroundColor: C.accent, borderColor: C.accent },
  catPillText: { fontSize: 12, fontWeight: "600", color: C.textSec },
  catPillTextActive: { color: "#fff" },
  scroll: { flex: 1 },
  card: {
    backgroundColor: C.surface, marginHorizontal: 16, marginBottom: 12,
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border,
  },
  cardTop: { flexDirection: "row", gap: 12, marginBottom: 12 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  name: { fontSize: 16, fontWeight: "700", color: C.text },
  rankBadge: {
    backgroundColor: C.surface3, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
  },
  rankText: { fontSize: 11, fontWeight: "700", color: C.accent },
  community: { fontSize: 12, color: C.textMuted, marginBottom: 4 },
  bio: { fontSize: 12, color: C.textSec, lineHeight: 17 },
  scoresRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  scoreBadge: {
    flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 10,
    borderWidth: 1,
  },
  scoreValue: { fontSize: 18, fontWeight: "800" },
  scoreLabel: { fontSize: 10, color: C.textMuted, marginTop: 2 },
  cardFooter: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10,
  },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 11, color: C.textMuted },
  detailBtn: {
    flexDirection: "row", alignItems: "center", gap: 2,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    backgroundColor: C.surface2,
  },
  detailBtnText: { fontSize: 12, fontWeight: "600", color: C.accent },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, color: C.textMuted },
});
