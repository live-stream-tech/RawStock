import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { C } from "@/constants/colors";
import { F } from "@/constants/fonts";
import { getQueryFn } from "@/lib/query-client";
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { webScrollStyle } from "@/constants/layout";

const CATEGORY_LABELS: Record<string, string> = {
  counselor: "Counseling",
  english: "English Conversation",
  coaching: "Coaching",
  music: "Music Lesson",
  yoga: "Yoga & Meditation",
  fortune: "Fortune Telling",
  other: "Other",
};

const CATEGORIES = ["all", "music", "coaching", "english", "counselor", "yoga", "fortune", "other"];

type MentorSessionRow = {
  id: number;
  creatorId: number;
  title: string;
  category: string;
  description: string;
  price: number;
  duration: number;
  maxParticipants: number;
  createdAt: string;
  creatorName: string;
  creatorAvatar: string | null;
};

export default function MentorSessionsScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const { data: sessions = [], isLoading, refetch } = useQuery<MentorSessionRow[]>({
    queryKey: ["/api/mentor/sessions"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const filtered = filter === "all" ? sessions : sessions.filter((s) => s.category === filter);

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 16 }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Mentor Sessions</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterContent}
      >
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            style={[styles.filterChip, filter === cat && styles.filterChipActive]}
            onPress={() => setFilter(cat)}
          >
            <Text style={[styles.filterChipText, filter === cat && styles.filterChipTextActive]}>
              {cat === "all" ? "All" : (CATEGORY_LABELS[cat] ?? cat)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.accent} />
        </View>
      ) : (
        <ScrollView
          style={webScrollStyle(styles.scroll)}
          showsVerticalScrollIndicator={scrollShowsVertical}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        >
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={40} color={C.textMuted} />
              <Text style={styles.emptyText}>No sessions available</Text>
              <Text style={styles.emptySubtext}>Check back later or try a different category.</Text>
            </View>
          ) : (
            filtered.map((session) => (
              <Pressable
                key={session.id}
                style={styles.card}
                onPress={() => router.push(`/mentor-book/${session.id}` as any)}
              >
                <View style={styles.cardHeader}>
                  {session.creatorAvatar ? (
                    <Image source={{ uri: session.creatorAvatar }} style={styles.avatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Ionicons name="person" size={16} color={C.textMuted} />
                    </View>
                  )}
                  <View style={styles.creatorInfo}>
                    <Text style={styles.creatorName}>{session.creatorName}</Text>
                    <Text style={styles.categoryLabel}>
                      {CATEGORY_LABELS[session.category] ?? session.category}
                    </Text>
                  </View>
                  <View style={styles.priceTag}>
                    <Text style={styles.priceValue}>{session.price.toLocaleString()}</Text>
                    <Text style={styles.priceUnit}>tickets</Text>
                  </View>
                </View>

                <Text style={styles.sessionTitle}>{session.title}</Text>

                {session.description ? (
                  <Text style={styles.sessionDesc} numberOfLines={2}>{session.description}</Text>
                ) : null}

                <View style={styles.cardMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={12} color={C.textSec} />
                    <Text style={styles.metaText}>{session.duration} min</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="people-outline" size={12} color={C.textSec} />
                    <Text style={styles.metaText}>Max {session.maxParticipants}</Text>
                  </View>
                  <View style={styles.bookBtn}>
                    <Text style={styles.bookBtnText}>Book</Text>
                  </View>
                </View>
              </Pressable>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.borderDim,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", color: C.text, fontSize: 16, fontWeight: "600" },
  filterBar: { maxHeight: 48, flexGrow: 0 },
  filterContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: "row" },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.borderDim,
  },
  filterChipActive: { backgroundColor: C.accent, borderColor: C.accent },
  filterChipText: { color: C.textSec, fontSize: 12 },
  filterChipTextActive: { color: "#000", fontWeight: "600" },
  scroll: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32, gap: 12 },
  emptyText: { color: C.text, fontSize: 16, fontWeight: "600" },
  emptySubtext: { color: C.textMuted, fontSize: 13, textAlign: "center", lineHeight: 20 },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: C.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderDim,
    padding: 14,
    gap: 8,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: { backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  creatorInfo: { flex: 1 },
  creatorName: { color: C.text, fontSize: 13, fontWeight: "600" },
  categoryLabel: { color: C.textMuted, fontSize: 11, marginTop: 1 },
  priceTag: { alignItems: "flex-end" },
  priceValue: { color: C.accent, fontSize: 15, fontWeight: "700", fontFamily: F.mono },
  priceUnit: { color: C.textMuted, fontSize: 10 },
  sessionTitle: { color: C.text, fontSize: 14, fontWeight: "600", lineHeight: 20 },
  sessionDesc: { color: C.textMuted, fontSize: 13, lineHeight: 18 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 2 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: C.textSec, fontSize: 11, fontFamily: F.mono },
  bookBtn: {
    marginLeft: "auto",
    backgroundColor: C.accent,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  bookBtnText: { color: "#000", fontSize: 12, fontWeight: "700" },
});
