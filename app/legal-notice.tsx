import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { C } from "@/constants/colors";

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

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Business Operator</Text>
        <Text style={styles.body}>RawStock</Text>

        <Text style={styles.sectionTitle}>Representative</Text>
        <Text style={styles.body}>RawStock Operations</Text>

        <Text style={styles.sectionTitle}>Contact</Text>
        <Text style={styles.body}>support@rawstock.app</Text>

        <Text style={styles.sectionTitle}>Service Name</Text>
        <Text style={styles.body}>RawStock — Underground Music Marketplace</Text>

        <Text style={styles.sectionTitle}>Service Description</Text>
        <Text style={styles.body}>
          RawStock is a global platform connecting underground music creators and their fans. Users can purchase digital content, book live sessions, and join communities using Tickets (virtual currency).
        </Text>

        <Text style={styles.sectionTitle}>Pricing</Text>
        <Text style={styles.body}>
          Ticket prices are listed on each content or session page. Tickets are purchased with real money at the rates displayed at checkout. All prices include applicable taxes.
        </Text>

        <Text style={styles.sectionTitle}>Payment Methods</Text>
        <Text style={styles.body}>
          Payments are processed securely via Stripe. Accepted methods include major credit and debit cards.
        </Text>

        <Text style={styles.sectionTitle}>Delivery</Text>
        <Text style={styles.body}>
          Digital content and Tickets are delivered immediately upon successful payment. No physical delivery is required.
        </Text>

        <Text style={styles.sectionTitle}>Refund Policy</Text>
        <Text style={styles.body}>
          Due to the nature of digital content, all sales are final. Refunds are not available after purchase unless required by applicable law. If a session is cancelled by the creator, a full refund will be issued.
        </Text>

        <Text style={styles.sectionTitle}>Creator Payouts</Text>
        <Text style={styles.body}>
          Creators receive 90% of revenue from their content and sessions. Payouts are processed according to the schedule and terms set out in the Creator Agreement.
        </Text>

        <Text style={styles.sectionTitle}>Prohibited Uses</Text>
        <Text style={styles.body}>
          Users may not use RawStock for any unlawful purpose, including but not limited to distributing illegal content, fraud, or harassment.
        </Text>

        <Text style={styles.sectionTitle}>Governing Law</Text>
        <Text style={styles.body}>
          These terms are governed by and construed in accordance with applicable law. Disputes shall be resolved through binding arbitration where permitted.
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
  },
});
