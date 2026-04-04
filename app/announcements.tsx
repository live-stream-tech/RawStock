import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from "react-native";
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { C } from "@/constants/colors";
import { webScrollStyle } from "@/constants/layout";

type AnnouncementRow = {
  id: number;
  title: string;
  body: string;
  type: string;
  isPinned: boolean;
  startAt: string | null;
  endAt: string | null;
  createdAt: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  official: "運営",
  event: "イベント",
  community: "コミュニティ",
  recruiting: "募集",
  maintenance: "メンテナンス",
};

function typeLabel(type: string): string {
  return TYPE_LABEL[type] ?? "Other";
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" });
}

export default function AnnouncementsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: rows = [], isLoading } = useQuery<AnnouncementRow[]>({
    queryKey: ["/api/announcements"],
    throwOnError: false,
  });

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button">
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>お知らせ</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={webScrollStyle(styles.scroll)} showsVerticalScrollIndicator={scrollShowsVertical}>
        {isLoading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>読み込み中…</Text>
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="newspaper-outline" size={40} color={C.textMuted} />
            <Text style={styles.emptyText}>お知らせはありません</Text>
          </View>
        ) : (
          rows.map((item) => (
            <View
              key={item.id}
              style={[styles.card, item.isPinned && styles.cardPinned]}
            >
              <View style={styles.cardTop}>
                {item.isPinned ? (
                  <View style={styles.pinnedBadge}>
                    <Ionicons name="pin" size={12} color={C.accent} />
                    <Text style={styles.pinnedText}>固定</Text>
                  </View>
                ) : null}
                <View style={styles.typePill}>
                  <Text style={styles.typePillText}>{typeLabel(item.type)}</Text>
                </View>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBody}>{item.body}</Text>
              {item.createdAt ? (
                <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
              ) : null}
            </View>
          ))
        )}
        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: C.text, fontSize: 18, fontWeight: "800" },
  scroll: { flex: 1 },
  empty: {
    paddingTop: 48,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 12,
  },
  emptyText: { color: C.textMuted, fontSize: 15 },
  card: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardPinned: {
    borderColor: C.accent + "55",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  pinnedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: C.accent + "22",
  },
  pinnedText: { color: C.accent, fontSize: 11, fontWeight: "700" },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: C.surface3,
  },
  typePillText: { color: C.textSec, fontSize: 11, fontWeight: "600" },
  cardTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },
  cardBody: {
    color: C.textSec,
    fontSize: 14,
    lineHeight: 21,
  },
  cardDate: {
    marginTop: 12,
    color: C.textMuted,
    fontSize: 12,
  },
});
