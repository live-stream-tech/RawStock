import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { C } from "@/constants/colors";
import { webScrollStyle } from "@/constants/layout";

const CONTACT = "rawstock.infomation@gmail.com";

type Row = { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; path: string; sub?: string };

const DOC_ROWS: Row[] = [
  { icon: "document-text-outline", label: "Terms of Service", path: "/terms" },
  { icon: "shield-outline", label: "Privacy Policy", path: "/privacy" },
  { icon: "people-outline", label: "Community Guidelines", path: "/community-guidelines" },
  { icon: "ribbon-outline", label: "DMCA / Copyright (U.S. & UK note)", path: "/dmca" },
  {
    icon: "business-outline",
    label: "Legal Notice",
    path: "/legal-notice",
    sub: "Specified commercial transactions style",
  },
  { icon: "list-outline", label: "Legal Notice (table)", path: "/tokusho", sub: "Tokusho-style summary" },
];

export default function LegalHubScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Legal & Policies</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={webScrollStyle(styles.scroll)}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.intro}>
          All policies below are part of RawStock. Tap an item to read the full text. For inquiries: {CONTACT}
        </Text>

        <Text style={styles.sectionLabel}>Operator</Text>
        <View style={styles.card}>
          <Text style={styles.cardBody}>
            Hiromi Kanokifu, doing business as <Text style={styles.bold}>RawStock</Text> (sole proprietor, Japan).
            {"\n\n"}
            Shibuya Dogenzaka Tokyu Bldg 2F-C, 1-10-8 Dogenzaka, Shibuya, Tokyo 150-0043, Japan
            {"\n\n"}
            {CONTACT}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Documents</Text>
        <View style={styles.card}>
          {DOC_ROWS.map((row, i) => (
            <View key={row.path}>
              {i > 0 ? <View style={styles.rowDivider} /> : null}
              <Pressable style={styles.row} onPress={() => router.push(row.path as any)}>
                <View style={styles.rowIcon}>
                  <Ionicons name={row.icon} size={18} color={C.accent} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  {row.sub ? <Text style={styles.rowSub}>{row.sub}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
              </Pressable>
            </View>
          ))}
        </View>

        <Text style={styles.footerNote}>
          A single reference document for counsel is maintained in the repository at docs/LEGAL.md (not legal advice).
        </Text>

        <View style={{ height: 80 }} />
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
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  intro: {
    fontSize: 14,
    lineHeight: 22,
    color: C.textSec,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: C.textMuted,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 20,
    overflow: "hidden",
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 22,
    color: C.textSec,
    padding: 16,
  },
  bold: { fontWeight: "700", color: C.text },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "600", color: C.text },
  rowSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  rowDivider: { height: 1, backgroundColor: C.border, marginLeft: 62 },
  footerNote: {
    fontSize: 12,
    lineHeight: 18,
    color: C.textMuted,
    fontStyle: "italic",
  },
});
