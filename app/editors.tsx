import React, { useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { C } from "@/constants/colors";
import { F } from "@/constants/fonts";
import { formatEditorRevenueShareLabel, formatEditorTicketsPerMinute } from "@/constants/tickets";

type SortKey = "rating" | "delivery" | "price";

type VideoEditor = {
  id: number;
  name: string;
  avatar: string | null;
  bio: string;
  genres: string;
  deliveryDays: number;
  priceType: "per_minute" | "revenue_share" | "both";
  pricePerMinute: number | null;
  revenueSharePercent: number | null;
  styleTags?: string[];
  rating: number;
  reviewCount: number;
  isAvailable: boolean;
};

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "rating", label: "Popular" },
  { key: "delivery", label: "Fastest" },
  { key: "price", label: "Price" },
];

function StarRating({ rating }: { rating: number }) {
  const stars = Math.round(rating * 2) / 2;
  return (
    <View style={card.stars}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={stars >= i ? "star" : stars >= i - 0.5 ? "star-half" : "star-outline"}
          size={11}
          color={C.accent}
        />
      ))}
      <Text style={card.ratingText}>{rating.toFixed(1)}</Text>
    </View>
  );
}

function EditorCard({ editor }: { editor: VideoEditor }) {
  const genres = editor.genres
    ? editor.genres.split(",").map((g) => g.trim()).filter(Boolean)
    : [];

  const priceLabel =
    editor.priceType === "both" &&
    editor.pricePerMinute != null &&
    editor.revenueSharePercent != null
      ? `${formatEditorTicketsPerMinute(editor.pricePerMinute)} · ${formatEditorRevenueShareLabel(editor.revenueSharePercent)}`
      : editor.priceType === "per_minute"
        ? editor.pricePerMinute != null
          ? formatEditorTicketsPerMinute(editor.pricePerMinute)
          : "Per minute"
        : editor.revenueSharePercent != null
          ? formatEditorRevenueShareLabel(editor.revenueSharePercent)
          : "Revenue share";

  const requestHref: Href = `/request-editor?editorId=${editor.id}&editorName=${encodeURIComponent(editor.name)}&editorPrice=${encodeURIComponent(priceLabel)}`;

  return (
    <Pressable
      style={card.container}
      onPress={() => router.push(requestHref)}
    >
      <View style={card.header}>
        {editor.avatar ? (
          <Image source={{ uri: editor.avatar }} style={card.avatar} contentFit="cover" />
        ) : (
          <View style={[card.avatar, card.avatarFallback]}>
            <Text style={card.avatarInitial}>{editor.name[0]}</Text>
          </View>
        )}
        <View style={card.info}>
          <Text style={card.name} numberOfLines={1}>{editor.name}</Text>
          <StarRating rating={editor.rating} />
          <Text style={card.reviewCount}>({editor.reviewCount} reviews)</Text>
        </View>
        <View style={[card.statusBadge, editor.isAvailable ? card.statusAvailable : card.statusInquire]}>
          <Text style={[card.statusText, editor.isAvailable ? card.statusAvailableText : card.statusInquireText]}>
            {editor.isAvailable ? "Available" : "Inquire"}
          </Text>
        </View>
      </View>

      {editor.bio ? (
        <Text style={card.bio} numberOfLines={2}>{editor.bio}</Text>
      ) : null}

      <View style={card.metaRow}>
        <View style={card.metaItem}>
          <Ionicons name="time-outline" size={12} color={C.textMuted} />
          <Text style={card.metaText}>{editor.deliveryDays}d delivery</Text>
        </View>
        <View style={card.metaItem}>
          <Ionicons name="pricetag-outline" size={12} color={C.textMuted} />
          <Text style={card.metaText}>{priceLabel}</Text>
        </View>
      </View>

      {genres.length > 0 && (
        <View style={card.genreRow}>
          {genres.slice(0, 4).map((g) => (
            <View key={g} style={card.genreTag}>
              <Text style={card.genreText}>{g}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={card.footer}>
        <View style={card.ctaBtn}>
          <Text style={card.ctaText}>Request</Text>
          <Ionicons name="arrow-forward" size={14} color="#fff" />
        </View>
      </View>
    </Pressable>
  );
}

export default function EditorsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const [sort, setSort] = useState<SortKey>("rating");

  const { data: editors = [], isLoading } = useQuery<VideoEditor[]>({
    queryKey: [`/api/editors?sort=${sort}`],
  });

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Editors</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            style={[styles.sortBtn, sort === opt.key && styles.sortBtnActive]}
            onPress={() => setSort(opt.key)}
          >
            <Text style={[styles.sortText, sort === opt.key && styles.sortTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={scrollShowsVertical} contentContainerStyle={{ paddingBottom: 32 }}>
        {isLoading ? (
          <Text style={styles.emptyText}>Loading editors...</Text>
        ) : editors.length === 0 ? (
          <Text style={styles.emptyText}>No editors available yet</Text>
        ) : (
          editors.map((editor) => (
            <EditorCard key={editor.id} editor={editor} />
          ))
        )}
      </ScrollView>
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
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", color: C.text, fontSize: 16, fontWeight: "700" },
  sortRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sortBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  sortBtnActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  sortText: { color: C.textSec, fontSize: 12, fontWeight: "600" },
  sortTextActive: { color: "#fff" },
  scroll: { flex: 1 },
  emptyText: { color: C.textMuted, textAlign: "center", marginTop: 60, fontSize: 14 },
});

const card = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 10,
  },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarFallback: { backgroundColor: C.surface2, alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: C.text, fontSize: 18, fontWeight: "700" },
  info: { flex: 1, gap: 2 },
  name: { color: C.text, fontSize: 15, fontWeight: "700" },
  stars: { flexDirection: "row", alignItems: "center", gap: 2 },
  ratingText: { color: C.textSec, fontSize: 11, marginLeft: 4 },
  reviewCount: { color: C.textMuted, fontSize: 10 },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  statusAvailable: { backgroundColor: "rgba(0,200,100,0.12)" },
  statusInquire: { backgroundColor: C.surface2 },
  statusText: { fontSize: 10, fontWeight: "700", fontFamily: F.mono },
  statusAvailableText: { color: "#00c864" },
  statusInquireText: { color: C.textMuted },
  bio: { color: C.textSec, fontSize: 12, lineHeight: 17 },
  metaRow: { flexDirection: "row", gap: 14 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: C.textMuted, fontSize: 11 },
  genreRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  genreTag: {
    backgroundColor: C.surface2,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  genreText: { color: C.textSec, fontSize: 11 },
  footer: { alignItems: "flex-end" },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  ctaText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
