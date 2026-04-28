import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Linking } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { webScrollStyle, getTabTopInset, getTabBottomInset } from "@/constants/layout";
import { C } from "@/constants/colors";
import { AppLogo } from "@/components/AppLogo";
import { MetallicLine } from "@/components/MetallicLine";
import { STATIONS } from "@/constants/stations";
import { TEMP_BANNER_IMAGE_PATH, TEMP_BANNER_TARGET_URL } from "@/constants/bannerLinks";

const STATION_SHORT_DESC: Record<string, string> = {
  music: "Bands, DJs, clubs, and live music creators.",
  ai_video: "AI-native video creators and editors.",
  idol_influencer: "Idols, streamers, and social creators.",
  entertainment: "General entertainment, shows, and performers.",
};

export default function StationsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = getTabTopInset(insets);
  const bottomInset = getTabBottomInset(insets);

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <AppLogo height={36} />
      </View>
      <MetallicLine thickness={1} style={{ marginHorizontal: 16 }} />

      <ScrollView style={webScrollStyle(styles.scroll)} showsVerticalScrollIndicator={scrollShowsVertical}>
        <Pressable
          style={styles.banner}
          accessibilityRole="link"
          accessibilityLabel="Sponsored banner"
          onPress={() => void Linking.openURL(TEMP_BANNER_TARGET_URL)}
        >
          <Image source={{ uri: TEMP_BANNER_IMAGE_PATH }} style={styles.bannerImage} contentFit="contain" contentPosition="center" />
        </Pressable>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionTitle}>Official Stations</Text>
        </View>

        <View style={styles.stack}>
          {STATIONS.map((s) => (
            <Pressable
              key={s.id}
              style={styles.card}
              onPress={() => router.push(`/station/${s.category}` as any)}
            >
              <Image source={{ uri: s.thumbnail }} style={styles.icon} contentFit="cover" />
              <View style={styles.cardBody}>
                <Text style={styles.name} numberOfLines={2}>
                  {s.name}
                </Text>
                <Text style={styles.meta} numberOfLines={2}>
                  {STATION_SHORT_DESC[s.category] ?? "Official station for creators."}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={{ height: 24 }} />
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
    paddingBottom: 10,
  },
  scroll: { flex: 1 },
  banner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 14,
    height: 72,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#0a0a0a",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
  },
  sectionAccent: {
    width: 2,
    height: 14,
    backgroundColor: C.accent,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  stack: {
    gap: 10,
    paddingHorizontal: 16,
  },
  card: {
    width: "100%",
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  icon: {
    width: 88,
    height: 88,
    backgroundColor: C.surface,
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 6,
    justifyContent: "center",
  },
  name: {
    color: C.text,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  meta: {
    color: C.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
});

