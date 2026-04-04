import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { C } from "@/constants/colors";
import { webScrollStyle } from "@/constants/layout";

const ROWS: [string, string][] = [
  ["Seller", "Hiromi Kanokifu"],
  ["Address", "Shibuya Dogenzaka Tokyu Bldg 2F-C, 1-10-8 Dogenzaka, Shibuya, Tokyo 150-0043, Japan"],
  ["Phone", "Not publicly listed. Please contact us by email."],
  ["Email", "rawstock.infomation@gmail.com"],
  ["Response Hours", "Email inquiries accepted. Replies within 3 business days."],
  ["Service URL", typeof window !== "undefined" ? window.location.origin : "https://rawstock.app"],
  ["Pricing", "Prices shown on each content or service page (inclusive of applicable taxes)."],
  ["Payment Methods", "Credit card (Visa / Mastercard / American Express / JCB) via Stripe."],
  ["Payment Timing", "Charged immediately upon purchase completion."],
  ["Service Delivery", "Access to purchased content is granted immediately after payment."],
  ["Cancellations & Refunds", "Due to the digital nature of the content, refunds and cancellations are not accepted after purchase, except in cases of service failure attributable to RawStock."],
  ["System Requirements", "Internet connection required. Supported browsers: Chrome, Safari, Firefox (latest versions)."],
];

export default function TokushoScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Legal Notice</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={webScrollStyle(styles.scroll)}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.docTitle}>Specified Commercial Transactions Act Disclosure</Text>
        <Text style={styles.docSub}>Required disclosure under Japanese law</Text>

        <View style={styles.table}>
          {ROWS.map(([label, value], i) => (
            <View key={i} style={[styles.row, i > 0 && styles.rowBorder]}>
              <Text style={styles.rowLabel}>{label}</Text>
              <Text style={styles.rowValue}>{value}</Text>
            </View>
          ))}
        </View>

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
  headerTitle: { fontSize: 18, fontWeight: "700", color: C.text, letterSpacing: 0.5 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24 },
  docTitle: { fontSize: 18, fontWeight: "700", color: C.text, marginBottom: 6, textAlign: "center" },
  docSub: { fontSize: 12, color: C.textMuted, marginBottom: 20, textAlign: "center" },
  table: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: C.border },
  rowLabel: {
    width: 120,
    fontSize: 13,
    fontWeight: "600",
    color: C.textMuted,
  },
  rowValue: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: C.textSec,
  },
});
