import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Platform, ScrollView, Linking } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { C } from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { webScrollStyle } from "@/constants/layout";
import { TranslateButton } from "@/components/TranslateButton";
import { parseThreadBody } from "@/lib/parse-thread-body";

export type GlobalAnnouncementItem = {
  id: number;
  communityId: number;
  communityName: string;
  communityCategory: string;
  communityThumbnail: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  authorUserId: number;
  author: { displayName: string; profileImageUrl: string | null };
};

type Props = {
  /** Use when parent screen controls the search query */
  searchQuery?: string;
  onSearchQueryChange?: (q: string) => void;
  /** Bottom inset (for tab bar spacing) */
  bottomInset?: number;
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function GlobalLiveAnnouncementsFeed({ searchQuery = "", onSearchQueryChange, bottomInset = 0 }: Props) {
  const [liveOnly, setLiveOnly] = useState(true);
  const [localQ, setLocalQ] = useState("");
  const controlled = onSearchQueryChange != null;
  const q = (controlled ? searchQuery : localQ).trim();

  const { data = [], isLoading, isError, refetch, isFetching } = useQuery<GlobalAnnouncementItem[]>({
    queryKey: ["community-announcements-feed", { q, liveOnly }],
    queryFn: async () => {
      const u = new URL("/api/community-announcements/feed", getApiUrl());
      u.searchParams.set("limit", "80");
      u.searchParams.set("lang", "en");
      if (q) u.searchParams.set("q", q);
      if (liveOnly) u.searchParams.set("liveOnly", "1");
      const res = await fetch(u.toString(), { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return (await res.json()) as GlobalAnnouncementItem[];
    },
    staleTime: 60_000,
  });

  const paddingBottom = 24 + bottomInset;

  const setQ = (t: string) => {
    if (controlled) onSearchQueryChange!(t);
    else setLocalQ(t);
  };

  const intro = useMemo(
    () =>
      "Cross-community board posts that look like streams, lives, or events. Use this feed to scan announcements from everywhere on RawStock.",
    [],
  );

  return (
    <View style={styles.root}>
      {!controlled ? (
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={18} color={C.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by community, title, or body"
            placeholderTextColor={C.textMuted}
            value={localQ}
            onChangeText={setLocalQ}
          />
          {localQ.length > 0 ? (
            <Pressable onPress={() => setLocalQ("")} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={C.textMuted} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.introBox}>
        <Ionicons name="earth-outline" size={22} color={C.accent} />
        <Text style={styles.introText}>{intro}</Text>
      </View>

      <Pressable style={[styles.filterChip, liveOnly && styles.filterChipOn]} onPress={() => setLiveOnly((v) => !v)}>
        <Ionicons name="radio-outline" size={16} color={liveOnly ? "#000" : C.textMuted} />
        <Text style={[styles.filterChipText, liveOnly && styles.filterChipTextOn]}>
          Live / stream-like posts only
        </Text>
      </Pressable>

      <View style={styles.toolbar}>
        <Text style={styles.countLabel}>{isLoading ? "…" : `${data.length} posts`}</Text>
        <Pressable onPress={() => refetch()} hitSlop={8} style={styles.refreshBtn}>
          {isFetching ? <ActivityIndicator size="small" color={C.accent} /> : <Ionicons name="refresh" size={20} color={C.accent} />}
        </Pressable>
      </View>

      {isError ? (
        <Text style={styles.errorText}>Could not load the feed. Check your connection and try again.</Text>
      ) : null}

      <ScrollView
        style={webScrollStyle(styles.scroll)}
        contentContainerStyle={{ paddingBottom }}
        showsVerticalScrollIndicator={scrollShowsVertical}
      >
        {isLoading ? (
          <View style={styles.centerPad}>
            <ActivityIndicator color={C.accent} size="large" />
          </View>
        ) : data.length === 0 ? (
          <Text style={styles.empty}>No matching posts. Try different keywords or turn off the live filter.</Text>
        ) : (
          data.map((item) => {
            const parsed = parseThreadBody(item.body);
            return (
            <Pressable
              key={`${item.communityId}-${item.id}`}
              style={[styles.card, item.pinned && styles.cardPinned]}
              onPress={() => {
                router.push(`/community/${item.communityId}?tab=Board&openThread=${item.id}`);
              }}
            >
              <View style={styles.cardTop}>
                <Image source={{ uri: item.communityThumbnail }} style={styles.commThumb} contentFit="cover" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.commName} numberOfLines={1}>
                    {item.communityName}
                  </Text>
                  <Text style={styles.commCat} numberOfLines={1}>
                    {item.communityCategory}
                  </Text>
                </View>
                <Text style={styles.when}>{formatWhen(item.createdAt)}</Text>
              </View>
              <View style={styles.titleRow}>
                {item.pinned ? (
                  <View style={styles.pinBadge}>
                    <Ionicons name="pin" size={11} color={C.orange} />
                    <Text style={styles.pinText}>Pinned</Text>
                  </View>
                ) : null}
                <Text style={styles.title} numberOfLines={3}>
                  {item.title}
                </Text>
              </View>
              {parsed.flyerImageUrl ? (
                <Image source={{ uri: parsed.flyerImageUrl }} style={styles.cardFlyer} contentFit="cover" />
              ) : null}
              {parsed.shortVideoUrl ? (
                <Pressable
                  style={styles.cardClipRow}
                  onPress={(ev) => {
                    (ev as { stopPropagation?: () => void }).stopPropagation?.();
                    Linking.openURL(parsed.shortVideoUrl!);
                  }}
                >
                  <Ionicons name="play-circle" size={20} color={C.accent} />
                  <Text style={styles.cardClipText} numberOfLines={1}>
                    Short clip attached
                  </Text>
                </Pressable>
              ) : null}
              {parsed.text ? (
                <Text style={styles.body} numberOfLines={3}>
                  {parsed.text}
                </Text>
              ) : null}
              {parsed.text ? <TranslateButton text={parsed.text} dstLang="en" compact /> : null}
              <View style={styles.footer}>
                <Text style={styles.author} numberOfLines={1}>
                  {item.author.displayName}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
              </View>
            </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "web" ? 10 : 8,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: { flex: 1, color: C.text, fontSize: 14, paddingVertical: 4 },
  introBox: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.accent + "44",
  },
  introText: { flex: 1, color: C.textSec, fontSize: 12, lineHeight: 18 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    marginLeft: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface2,
  },
  filterChipOn: { backgroundColor: C.accent + "33", borderColor: C.accent },
  filterChipText: { color: C.textMuted, fontSize: 12, fontWeight: "700" },
  filterChipTextOn: { color: C.text },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  countLabel: { color: C.textMuted, fontSize: 12, fontWeight: "600" },
  refreshBtn: { padding: 4 },
  errorText: { color: "#f88", fontSize: 13, marginHorizontal: 16, marginBottom: 8 },
  scroll: { flex: 1 },
  centerPad: { paddingVertical: 48, alignItems: "center" },
  empty: { color: C.textMuted, fontSize: 14, marginHorizontal: 16, lineHeight: 21 },
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  cardPinned: { borderColor: C.orange + "55", backgroundColor: C.orange + "08" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  commThumb: { width: 40, height: 40, borderRadius: 10, backgroundColor: C.surface3 },
  commName: { color: C.text, fontSize: 14, fontWeight: "800" },
  commCat: { color: C.textMuted, fontSize: 11, marginTop: 2 },
  when: { color: C.textMuted, fontSize: 11, fontWeight: "600" },
  titleRow: { gap: 6 },
  pinBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: C.orange + "22",
  },
  pinText: { color: C.orange, fontSize: 10, fontWeight: "800" },
  title: { color: C.text, fontSize: 16, fontWeight: "800", lineHeight: 22 },
  cardFlyer: {
    width: "100%",
    height: 140,
    borderRadius: 10,
    marginTop: 4,
    backgroundColor: C.surface2,
  },
  cardClipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardClipText: { flex: 1, color: C.accent, fontSize: 12, fontWeight: "800" },
  body: { color: C.textSec, fontSize: 13, lineHeight: 19 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  author: { color: C.textMuted, fontSize: 12, fontWeight: "600", flex: 1, marginRight: 8 },
});
