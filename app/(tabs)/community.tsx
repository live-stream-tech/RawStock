import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Linking,
  Modal,
} from "react-native";
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { C } from "@/constants/colors";
import { getTabTopInset, getTabBottomInset, webScrollStyle } from "@/constants/layout";
import { MetallicLine } from "@/components/MetallicLine";
import { AppLogo } from "@/components/AppLogo";
import { HorizontalScroll } from "@/components/HorizontalScroll";
import { useQuery } from "@tanstack/react-query";
import { TEMP_BANNER_IMAGE_PATH, TEMP_BANNER_TARGET_URL } from "@/constants/bannerLinks";
import { STATION_CATEGORY_LABEL } from "@/constants/stations";

const COMMUNITY_X_LINK = "https://x.com/ndjtpamwu";

type StationRow = {
  id: number;
  name: string;
  members: number;
  thumbnail: string;
  online?: boolean;
  category?: string;
};

const MOCK_ACTIVITY_SEEDS = [
  {
    title: "Creator Onboarding",
    thumb: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1280&h=720&q=80",
    status: "Now: UI draft",
    next: "Next: signup form",
    href: "/community/create" as const,
  },
  {
    title: "Sales Page",
    thumb: "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1280&h=720&q=80",
    status: "Now: visual mock",
    next: "Next: payment flow",
    href: "/upload/work" as const,
  },
  {
    title: "Watch Party",
    thumb: "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=1280&h=720&q=80",
    status: "Now: concept card",
    next: "Next: reservation flow",
    href: "/stations" as const,
  },
  {
    title: "Editor Match",
    thumb: "https://images.unsplash.com/photo-1574717024453-3540569c3f7b?auto=format&fit=crop&w=1280&h=720&q=80",
    status: "Now: dummy list",
    next: "Next: request form",
    href: "/find-editor" as const,
  },
  {
    title: "Contest Form",
    thumb: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1280&h=720&q=80",
    status: "Now: requirements",
    next: "Next: posting flow",
    href: "/upload" as const,
  },
];


export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const topInset = getTabTopInset(insets);
  const bottomInset = getTabBottomInset(insets);
  const [selectedMock, setSelectedMock] = useState<null | (typeof MOCK_ACTIVITY_SEEDS)[number]>(null);

  const { data: stations = [], isLoading: stationsLoading } = useQuery<StationRow[]>({
    queryKey: ["/api/stations"],
  });
  const stationRows = useMemo(
    () => [...stations].sort((a, b) => (b.members ?? 0) - (a.members ?? 0)),
    [stations],
  );

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <AppLogo height={36} />
      </View>
      <MetallicLine thickness={1} style={{ marginHorizontal: 16 }} />

      <ScrollView style={webScrollStyle(styles.scroll)} showsVerticalScrollIndicator={scrollShowsVertical}>
        <View style={styles.adBannerSlot}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Sponsor banner"
            onPress={() => {
              void Linking.openURL(TEMP_BANNER_TARGET_URL);
            }}
            style={styles.adBannerFrame}
          >
            <Image
              source={{ uri: TEMP_BANNER_IMAGE_PATH }}
              style={styles.adBannerImage}
              contentFit="contain"
              contentPosition="center"
            />
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={[styles.sectionHeader, styles.sectionHeaderFirst]}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>Stations</Text>
          </View>

          {stationsLoading ? (
            <ActivityIndicator color={C.accent} style={{ marginVertical: 24 }} />
          ) : stationRows.length === 0 ? (
            <Text style={styles.emptyInline}>No stations yet.</Text>
          ) : (
            <HorizontalScroll contentContainerStyle={styles.stationStrip}>
              {stationRows.slice(0, 10).map((s) => (
                <Pressable
                  key={s.id}
                  style={styles.stationMiniCard}
                  onPress={() =>
                    router.push({
                      pathname: "/community/create",
                      params: {
                        stationId: String(s.id),
                        stationName: s.name,
                        stationCategory: s.category ?? "",
                      },
                    } as any)
                  }
                >
                  <Image source={{ uri: s.thumbnail }} style={styles.stationMiniThumb} contentFit="cover" />
                  <Text style={styles.stationMiniName} numberOfLines={2}>
                    {s.name}
                  </Text>
                  <Text style={styles.stationMiniMeta}>
                    {(s.category && STATION_CATEGORY_LABEL[s.category]) || "Official"}
                  </Text>
                </Pressable>
              ))}
            </HorizontalScroll>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>Activity</Text>
          </View>
          <HorizontalScroll contentContainerStyle={styles.hList}>
            {MOCK_ACTIVITY_SEEDS.map((row) => (
              <Pressable
                key={row.title}
                style={styles.mockCard}
                onPress={() => {
                  if (row.href) {
                    router.push(row.href as any);
                    return;
                  }
                  setSelectedMock(row);
                }}
              >
                <Image source={{ uri: row.thumb }} style={styles.mockCardThumb} contentFit="cover" />
                <View style={styles.mockCardBody}>
                  <Text style={styles.mockBadge}>DUMMY</Text>
                  <Text style={styles.mockCardTitle} numberOfLines={2}>{row.title}</Text>
                  <Text style={styles.mockCardMeta}>Preview</Text>
                  <Text style={styles.mockCardState}>{row.status}</Text>
                  <Text style={styles.mockCardState}>{row.next}</Text>
                </View>
              </Pressable>
            ))}
          </HorizontalScroll>
          <Pressable
            style={styles.mockActionBtn}
            onPress={() => {
              void Linking.openURL(COMMUNITY_X_LINK);
            }}
          >
            <Text style={styles.mockActionBtnText}>Feedback</Text>
          </Pressable>
        </View>

        <Modal visible={!!selectedMock} transparent animationType="fade" onRequestClose={() => setSelectedMock(null)}>
          <View style={styles.modalScrim}>
            <View style={styles.modalCard}>
              <Text style={styles.modalBadge}>DUMMY DETAIL</Text>
              <Text style={styles.modalTitle}>{selectedMock?.title}</Text>
              <Text style={styles.modalBody}>{selectedMock?.status}</Text>
              <Text style={styles.modalBody}>{selectedMock?.next}</Text>
              <Pressable style={styles.modalCloseBtn} onPress={() => setSelectedMock(null)}>
              <Text style={styles.modalCloseBtnText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  adBannerSlot: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 10,
    overflow: "hidden",
    backgroundColor: "#0a0a0a",
  },
  adBannerFrame: {
    width: "100%",
    height: 48,
    backgroundColor: "#0a0a0a",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  adBannerText: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  adBannerImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#0a0a0a",
  },
  stationCoreBox: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  stationCoreTitle: {
    color: C.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  stationMembersText: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  stationPitchStrong: {
    color: C.text,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 2,
  },
  stationPitchSub: {
    color: C.accent,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
  },
  stationSceneRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  stationSceneChip: {
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "rgba(0,255,204,0.28)",
    backgroundColor: "rgba(0,255,204,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stationSceneChipText: {
    color: C.accent,
    fontSize: 11,
    fontWeight: "700",
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
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
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
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
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
    backgroundColor: "rgba(255,255,255,0.06)",
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
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  stationStrip: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },
  stationMiniCard: {
    width: 184,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.045)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  stationMiniThumb: {
    width: "100%",
    height: 132,
    backgroundColor: C.surface,
  },
  stationMiniName: {
    color: C.text,
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingTop: 8,
    minHeight: 42,
  },
  stationMiniMeta: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  scroll: { flex: 1 },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 18,
  },
  sectionAccent: {
    width: 2,
    height: 14,
    backgroundColor: C.accent,
    borderRadius: 2,
  },
  sectionTitle: { color: C.text, fontSize: 13, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  sectionHeaderFirst: { marginTop: 12 },
  hList: {
    paddingHorizontal: 16,
    gap: 12,
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
  announcementMiniCard: {
    width: 220,
    minHeight: 88,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    gap: 6,
  },
  announcementMiniTitle: {
    color: C.text,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  announcementMiniMeta: {
    color: C.textMuted,
    fontSize: 11,
  },
  mockCaption: {
    color: C.textMuted,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  mockCard: {
    width: 250,
    minHeight: 222,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.035)",
  },
  mockCardThumb: {
    width: "100%",
    height: 136,
    backgroundColor: C.surface,
  },
  mockCardBody: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 5,
  },
  mockBadge: {
    alignSelf: "flex-start",
    color: "#050505",
    backgroundColor: C.accent,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  mockCardTitle: {
    color: C.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
  },
  mockCardMeta: {
    color: C.textMuted,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  mockCardState: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
    lineHeight: 15,
  },
  mockActionBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,255,204,0.35)",
    backgroundColor: "rgba(0,255,204,0.1)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  mockActionBtnText: {
    color: C.accent,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  modalScrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    padding: 14,
    gap: 8,
  },
  modalBadge: {
    alignSelf: "flex-start",
    color: "#050505",
    backgroundColor: C.accent,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  modalTitle: {
    color: C.text,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
  },
  modalBody: {
    color: C.textSec,
    fontSize: 12,
    lineHeight: 18,
  },
  modalCloseBtn: {
    marginTop: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  modalCloseBtnText: {
    color: C.text,
    fontSize: 12,
    fontWeight: "700",
  },
});
