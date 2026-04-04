import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
} from "react-native";
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { C } from "@/constants/colors";
import { F } from "@/constants/fonts";
import {
  EDITOR_DELIVERY_PRESETS,
  EDITOR_GENRE_OPTIONS,
  EDITOR_STYLE_TAG_OPTIONS,
} from "@/constants/video-editor-profile";
import { formatEditorRevenueShareLabel, formatEditorTicketsPerMinute } from "@/constants/tickets";
import { webScrollStyle } from "@/constants/layout";

type SortKey = "rating" | "delivery" | "price";
type PriceMode = "" | "per_minute" | "revenue_share";

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

function buildEditorsApiUrl(opts: {
  sort: SortKey;
  mode: PriceMode;
  maxTicketsPerMin: string;
  minRevenueSharePercent: string;
  maxDeliveryDays: string;
  genres: string[];
  styleSlugs: string[];
}): string {
  const p = new URLSearchParams();
  p.set("sort", opts.sort);
  if (opts.mode) p.set("mode", opts.mode);
  const maxT = opts.maxTicketsPerMin.trim();
  if (maxT) p.set("maxTicketsPerMin", maxT);
  const minS = opts.minRevenueSharePercent.trim();
  if (minS) p.set("minRevenueSharePercent", minS);
  const maxD = opts.maxDeliveryDays.trim();
  if (maxD) p.set("maxDeliveryDays", maxD);
  if (opts.genres.length > 0) p.set("genres", opts.genres.join(","));
  if (opts.styleSlugs.length > 0) p.set("tags", opts.styleSlugs.join(","));
  return `/api/editors?${p.toString()}`;
}

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

function ResultRow({
  editor,
  expanded,
  onToggle,
}: {
  editor: VideoEditor;
  expanded: boolean;
  onToggle: () => void;
}) {
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
    <View style={card.container}>
      <Pressable onPress={onToggle} style={card.headerTap}>
        <View style={card.header}>
          {editor.avatar ? (
            <Image source={{ uri: editor.avatar }} style={card.avatar} contentFit="cover" />
          ) : (
            <View style={[card.avatar, card.avatarFallback]}>
              <Text style={card.avatarInitial}>{editor.name[0]}</Text>
            </View>
          )}
          <View style={card.info}>
            <Text style={card.name} numberOfLines={1}>
              {editor.name}
            </Text>
            <StarRating rating={editor.rating} />
            <Text style={card.reviewCount}>({editor.reviewCount} reviews)</Text>
          </View>
          <View style={[card.statusBadge, editor.isAvailable ? card.statusAvailable : card.statusInquire]}>
            <Text style={[card.statusText, editor.isAvailable ? card.statusAvailableText : card.statusInquireText]}>
              {editor.isAvailable ? "Available" : "Inquire"}
            </Text>
          </View>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={C.textMuted} />
        </View>
        {!expanded && editor.bio ? (
          <Text style={card.bioPreview} numberOfLines={2}>
            {editor.bio}
          </Text>
        ) : null}
      </Pressable>

      {expanded ? (
        <View style={card.expanded}>
          {editor.bio ? <Text style={card.bioFull}>{editor.bio}</Text> : null}
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
              {genres.map((g) => (
                <View key={g} style={card.genreTag}>
                  <Text style={card.genreText}>{g}</Text>
                </View>
              ))}
            </View>
          )}
          <Pressable style={card.ctaBtn} onPress={() => router.push(requestHref)}>
            <Text style={card.ctaText}>Request</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default function FindEditorScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const [sort, setSort] = useState<SortKey>("rating");
  const [mode, setMode] = useState<PriceMode>("");
  const [maxTicketsPerMin, setMaxTicketsPerMin] = useState("");
  const [minRevenueSharePercent, setMinRevenueSharePercent] = useState("");
  const [maxDeliveryDays, setMaxDeliveryDays] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedStyleSlugs, setSelectedStyleSlugs] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [searchUrl, setSearchUrl] = useState(() =>
    buildEditorsApiUrl({
      sort: "rating",
      mode: "",
      maxTicketsPerMin: "",
      minRevenueSharePercent: "",
      maxDeliveryDays: "",
      genres: [],
      styleSlugs: [],
    }),
  );

  const runSearch = useCallback(() => {
    setSearchUrl(
      buildEditorsApiUrl({
        sort,
        mode,
        maxTicketsPerMin,
        minRevenueSharePercent,
        maxDeliveryDays,
        genres: selectedGenres,
        styleSlugs: selectedStyleSlugs,
      }),
    );
    setExpandedId(null);
  }, [
    sort,
    mode,
    maxTicketsPerMin,
    minRevenueSharePercent,
    maxDeliveryDays,
    selectedGenres,
    selectedStyleSlugs,
  ]);

  const { data: editors = [], isLoading } = useQuery<VideoEditor[]>({
    queryKey: [searchUrl],
  });

  const toggleGenre = (g: string) => {
    setSelectedGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  };

  const toggleStyle = (slug: string) => {
    setSelectedStyleSlugs((prev) => (prev.includes(slug) ? prev.filter((x) => x !== slug) : [...prev, slug]));
  };

  const sortOptions = useMemo(
    () =>
      [
        { key: "rating" as const, label: "Popular" },
        { key: "delivery" as const, label: "Fastest" },
        { key: "price" as const, label: "Price" },
      ] as const,
    [],
  );

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Find an editor</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={webScrollStyle(styles.scroll)}
        showsVerticalScrollIndicator={scrollShowsVertical}
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>What are you looking for?</Text>
        <Text style={styles.sectionHint}>Same categories as editor profiles — pick any that fit your footage.</Text>

        <Text style={styles.label}>Genres</Text>
        <View style={styles.chipWrap}>
          {EDITOR_GENRE_OPTIONS.map((genre) => {
            const on = selectedGenres.includes(genre);
            return (
              <Pressable key={genre} style={[styles.chip, on && styles.chipOn]} onPress={() => toggleGenre(genre)}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{genre}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Style tags</Text>
        <View style={styles.chipWrap}>
          {EDITOR_STYLE_TAG_OPTIONS.map(({ label, slug }) => {
            const on = selectedStyleSlugs.includes(slug);
            return (
              <Pressable key={slug} style={[styles.chip, on && styles.chipOn]} onPress={() => toggleStyle(slug)}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Pricing</Text>
        <View style={styles.row}>
          {(
            [
              { key: "" as const, label: "Any" },
              { key: "per_minute" as const, label: "Per minute" },
              { key: "revenue_share" as const, label: "Revenue share" },
            ] as const
          ).map((opt) => (
            <Pressable
              key={opt.key || "any"}
              style={[styles.modeBtn, mode === opt.key && styles.modeBtnOn]}
              onPress={() => setMode(opt.key)}
            >
              <Text style={[styles.modeBtnText, mode === opt.key && styles.modeBtnTextOn]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        {mode === "per_minute" || mode === "" ? (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Max tickets / min (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 100"
              placeholderTextColor={C.textMuted}
              value={maxTicketsPerMin}
              onChangeText={setMaxTicketsPerMin}
              keyboardType="numeric"
            />
          </View>
        ) : null}

        {mode === "revenue_share" || mode === "" ? (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Min creator revenue share % (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 70"
              placeholderTextColor={C.textMuted}
              value={minRevenueSharePercent}
              onChangeText={setMinRevenueSharePercent}
              keyboardType="numeric"
            />
          </View>
        ) : null}

        <Text style={styles.label}>Max standard delivery (days)</Text>
        <View style={styles.row}>
          <Pressable
            style={[styles.dayChip, maxDeliveryDays === "" && styles.dayChipOn]}
            onPress={() => setMaxDeliveryDays("")}
          >
            <Text style={[styles.dayChipText, maxDeliveryDays === "" && styles.dayChipTextOn]}>Any</Text>
          </Pressable>
          {EDITOR_DELIVERY_PRESETS.map((d) => (
            <Pressable
              key={d}
              style={[styles.dayChip, maxDeliveryDays === d && styles.dayChipOn]}
              onPress={() => setMaxDeliveryDays(d)}
            >
              <Text style={[styles.dayChipText, maxDeliveryDays === d && styles.dayChipTextOn]}>≤{d}d</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Sort results</Text>
        <View style={styles.sortRow}>
          {sortOptions.map((opt) => (
            <Pressable
              key={opt.key}
              style={[styles.sortBtn, sort === opt.key && styles.sortBtnOn]}
              onPress={() => setSort(opt.key)}
            >
              <Text style={[styles.sortText, sort === opt.key && styles.sortTextOn]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.searchBtn} onPress={runSearch}>
          <Ionicons name="search" size={18} color="#050505" />
          <Text style={styles.searchBtnText}>Search editors</Text>
        </Pressable>

        <Text style={styles.resultsTitle}>Results</Text>
        {isLoading ? (
          <Text style={styles.emptyText}>Loading…</Text>
        ) : editors.length === 0 ? (
          <Text style={styles.emptyText}>No editors match. Try fewer filters.</Text>
        ) : (
          editors.map((ed) => (
            <ResultRow
              key={ed.id}
              editor={ed}
              expanded={expandedId === ed.id}
              onToggle={() => setExpandedId((id) => (id === ed.id ? null : ed.id))}
            />
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
  scroll: { flex: 1 },
  sectionTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 16,
    marginHorizontal: 16,
  },
  sectionHint: {
    color: C.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  label: {
    color: C.textSec,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 14,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.borderDim,
  },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { color: C.textSec, fontSize: 13 },
  chipTextOn: { color: "#050505", fontWeight: "600" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16 },
  modeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.borderDim,
  },
  modeBtnOn: { backgroundColor: C.accent, borderColor: C.accent },
  modeBtnText: { color: C.textSec, fontSize: 12, fontWeight: "600" },
  modeBtnTextOn: { color: "#050505" },
  field: { marginHorizontal: 16, marginTop: 10 },
  fieldLabel: { color: C.textMuted, fontSize: 11, marginBottom: 6 },
  input: {
    backgroundColor: C.surface2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borderDim,
    color: C.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.borderDim,
  },
  dayChipOn: { backgroundColor: C.accent, borderColor: C.accent },
  dayChipText: { color: C.textSec, fontSize: 12 },
  dayChipTextOn: { color: "#050505", fontWeight: "700" },
  sortRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    flexWrap: "wrap",
  },
  sortBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  sortBtnOn: { backgroundColor: C.accent, borderColor: C.accent },
  sortText: { color: C.textSec, fontSize: 12, fontWeight: "600" },
  sortTextOn: { color: "#fff" },
  searchBtn: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  searchBtnText: { color: "#050505", fontSize: 15, fontWeight: "800" },
  resultsTitle: {
    color: C.text,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 24,
    marginBottom: 4,
    marginHorizontal: 16,
  },
  emptyText: { color: C.textMuted, textAlign: "center", marginTop: 16, fontSize: 14, paddingHorizontal: 16 },
});

const card = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  headerTap: { padding: 14 },
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
  bioPreview: { color: C.textSec, fontSize: 12, lineHeight: 17, marginTop: 8 },
  expanded: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  bioFull: { color: C.textSec, fontSize: 13, lineHeight: 19 },
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
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: C.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  ctaText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
