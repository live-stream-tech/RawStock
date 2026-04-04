import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from "react-native";
import { webScrollStyle } from "@/constants/layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { C } from "@/constants/colors";
import { scrollShowsHorizontal, scrollShowsVertical } from "@/lib/web-scroll-indicators";

const CONTACT_EMAIL = "rawstock.infomation@gmail.com";

export default function LegalNoticeScreen() {
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
        showsVerticalScrollIndicator={scrollShowsVertical}
        showsHorizontalScrollIndicator={scrollShowsHorizontal}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.sectionTitle}>Business operator (sole proprietor)</Text>
        <Text style={styles.body}>Trade name: RawStock</Text>
        <Text style={styles.body}>Name: Hiromi Kanokifu</Text>

        <Text style={styles.sectionTitle}>Address</Text>
        <Text style={styles.body}>
          Shibuya Dogenzaka Tokyu Bldg 2F-C, 1-10-8 Dogenzaka, Shibuya, Tokyo 150-0043, Japan
        </Text>

        <Text style={styles.sectionTitle}>Contact</Text>
        <Text style={styles.body}>{CONTACT_EMAIL}</Text>
        <Text style={styles.bodyMuted}>
          Phone number is not published. Please contact us by email. We aim to respond within three business days.
        </Text>

        <Text style={styles.sectionTitle}>Service name</Text>
        <Text style={styles.body}>RawStock — Underground Music Marketplace</Text>

        <Text style={styles.sectionTitle}>Service description</Text>
        <Text style={styles.body}>
          RawStock connects underground music creators and fans. Users can purchase digital content, book live sessions,
          and join communities using Tickets (virtual currency).
        </Text>

        <Text style={styles.sectionTitle}>Pricing</Text>
        <Text style={styles.body}>
          Ticket and content prices are shown on each page. Purchases are charged in the currency and amount displayed at
          checkout, including applicable taxes where stated.
        </Text>

        <Text style={styles.sectionTitle}>Payment methods</Text>
        <Text style={styles.body}>
          Payments are processed securely via Stripe. Major credit and debit cards are accepted where available.
        </Text>

        <Text style={styles.sectionTitle}>Delivery</Text>
        <Text style={styles.body}>
          Digital content and Tickets are delivered immediately after successful payment. No physical shipment.
        </Text>

        <Text style={styles.sectionTitle}>Refund policy</Text>
        <Text style={styles.body}>
          Because content is digital, sales are generally final. Refunds are not offered after purchase except where
          required by applicable law or where a paid session is cancelled by the creator, in which case a refund will be
          issued according to the Service rules.
        </Text>

        <Text style={styles.sectionTitle}>Creator payouts</Text>
        <Text style={styles.body}>
          Creators ordinarily receive 90% of applicable revenue from their content and sessions, subject to Stripe fees,
          chargebacks, and the Terms of Service. Payouts require completion of Stripe Connect onboarding and compliance
          checks.
        </Text>

        <Text style={styles.sectionTitle}>Prohibited uses</Text>
        <Text style={styles.body}>
          Unlawful use, distribution of illegal content, fraud, harassment, or other violations described in the Terms of
          Service are prohibited.
        </Text>

        <Text style={styles.sectionTitle}>Governing law</Text>
        <Text style={styles.body}>
          Notices and commercial terms for the Service are governed by the laws of Japan, without prejudice to mandatory
          consumer protections in your country of residence.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
    letterSpacing: 0.5,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    color: C.text,
    lineHeight: 22,
    marginBottom: 6,
  },
  bodyMuted: {
    fontSize: 13,
    color: C.textSec,
    lineHeight: 20,
    marginTop: 4,
  },
});
