import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { useAuth } from "@/lib/auth";
import { C } from "@/constants/colors";

const PACKS = [
  { id: "pack-100",  tickets: 100,  priceUSD: 1.00,  label: "100 Tickets",   bonus: null, popular: false },
  { id: "pack-500",  tickets: 500,  priceUSD: 5.00,  label: "500 Tickets",   bonus: null, popular: true  },
  { id: "pack-1200", tickets: 1200, priceUSD: 12.00, label: "1,200 Tickets", bonus: null, popular: false },
  { id: "pack-3000", tickets: 3000, priceUSD: 30.00, label: "3,000 Tickets", bonus: null, popular: false },
] as const;

export default function TicketsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { session_id, tickets: ticketsParam } = useLocalSearchParams<{ session_id?: string; tickets?: string }>();

  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const { requireAuth } = useAuth();

  const { data: balanceData, refetch: refetchBalance } = useQuery<{ balance: number }>({
    queryKey: ["/api/tickets/balance"],
  });

  const ticketBalance = balanceData?.balance ?? 0;

  React.useEffect(() => {
    if (session_id) {
      handleVerifyPurchase(session_id);
    }
  }, [session_id]);

  async function handleVerifyPurchase(sessionId: string) {
    try {
      const res = await apiRequest("POST", "/api/tickets/verify-purchase", { sessionId }) as any;
      if (res.success) {
        await refetchBalance();
        const granted = parseInt(ticketsParam ?? "0") || 0;
        Alert.alert(
          "Tickets Added! 🎟",
          granted > 0
            ? `${granted.toLocaleString()} tickets have been added to your balance.`
            : "Your tickets have been credited.",
          [{ text: "Great!" }]
        );
      }
    } catch {
    }
  }

  async function handleBuyPack(packId: string) {
    if (!requireAuth("Ticket Shop")) return;
    setLoadingPack(packId);
    try {
      // Derive origin from EXPO_PUBLIC_DOMAIN when available (production), then
      // fall back to window.location.origin on web, or the API base URL on native.
      let origin: string;
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      if (domain) {
        // Normalise: strip protocol prefix if already present, then add https://
        const bare = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
        origin = `https://${bare}`;
      } else if (Platform.OS === "web") {
        origin = window.location.origin;
      } else {
        origin = new URL("/", getApiUrl()).origin;
      }

      const res = await apiRequest("POST", "/api/tickets/create-checkout", {
        packId,
        origin,
      }) as any;
      if (res.url) {
        await Linking.openURL(res.url);
      }
    } catch (err) {
      console.error("[Tickets] checkout error:", err);
      Alert.alert("Error", "Failed to start checkout. Please try again.");
    } finally {
      setLoadingPack(null);
    }
  }

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Ticket Shop</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Balance card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceTop}>
            <Text style={styles.balanceEmoji}>🎟</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.balanceLabel}>Your Ticket Balance</Text>
              <Text style={styles.balanceValue}>{ticketBalance.toLocaleString()} Tickets</Text>
            </View>
          </View>
          <View style={styles.balanceFooter}>
            <Ionicons name="information-circle-outline" size={13} color={C.textMuted} />
            <Text style={styles.balanceNote}>1 Ticket = $0.01 USD · Spend on sessions, gifts & more</Text>
          </View>
        </View>

        {/* What are tickets */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>How Tickets Work</Text>
          <View style={styles.infoGrid}>
            {[
              { icon: "ticket-outline" as const, label: "Mentor Session", value: "500 🎟" },
              { icon: "musical-notes-outline" as const, label: "Jukebox Request", value: "30 🎟" },
              { icon: "gift-outline" as const, label: "Send a Gift", value: "Varies" },
            ].map((item) => (
              <View key={item.label} style={styles.infoCard}>
                <Ionicons name={item.icon} size={22} color={C.accent} />
                <Text style={styles.infoCardLabel}>{item.label}</Text>
                <Text style={styles.infoCardValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Pack selection */}
        <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginTop: 8 }]}>Choose a Pack</Text>

        {PACKS.map((pack) => (
          <Pressable
            key={pack.id}
            style={[styles.packCard, pack.popular && styles.packCardPopular]}
            onPress={() => handleBuyPack(pack.id)}
            disabled={loadingPack !== null}
          >
            {pack.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
              </View>
            )}
            <View style={styles.packRow}>
              <Text style={styles.packEmoji}>🎟</Text>
              <View style={{ flex: 1 }}>
                <View style={styles.packLabelRow}>
                  <Text style={styles.packLabel}>{pack.label}</Text>
                  {pack.bonus ? (
                    <View style={styles.bonusBadge}>
                      <Text style={styles.bonusBadgeText}>{pack.bonus}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.packSub}>${pack.priceUSD.toFixed(2)} USD</Text>
              </View>
              <View style={styles.packBuyBtn}>
                {loadingPack === pack.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.packBuyText}>${pack.priceUSD.toFixed(2)}</Text>
                )}
              </View>
            </View>
          </Pressable>
        ))}

        {/* Secure note */}
        <View style={styles.secureNote}>
          <Ionicons name="lock-closed-outline" size={14} color={C.textMuted} />
          <Text style={styles.secureText}>Payments processed securely via Stripe. Card details are never stored by RawStock.</Text>
        </View>

        {/* Creator note */}
        <View style={styles.creatorNote}>
          <Ionicons name="heart-outline" size={14} color={C.accent} />
          <Text style={styles.creatorText}>Creators earn 90% of all ticket revenue spent on their sessions.</Text>
        </View>
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
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: C.text,
    fontSize: 16,
    fontWeight: "700",
  },
  scroll: { flex: 1 },
  balanceCard: {
    margin: 16,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  balanceTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  balanceEmoji: { fontSize: 36 },
  balanceLabel: { color: C.textMuted, fontSize: 12 },
  balanceValue: { color: C.text, fontSize: 28, fontWeight: "800", marginTop: 2 },
  balanceFooter: { flexDirection: "row", alignItems: "center", gap: 6 },
  balanceNote: { color: C.textMuted, fontSize: 11, flex: 1 },
  infoSection: { marginHorizontal: 16, marginBottom: 8 },
  sectionTitle: { color: C.text, fontSize: 15, fontWeight: "800", marginBottom: 12 },
  infoGrid: { flexDirection: "row", gap: 10 },
  infoCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  infoCardLabel: { color: C.textSec, fontSize: 10, textAlign: "center" },
  infoCardValue: { color: C.accent, fontSize: 13, fontWeight: "800" },
  packCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  packCardPopular: {
    borderColor: C.accent,
    backgroundColor: "rgba(108,92,231,0.06)",
  },
  popularBadge: {
    alignSelf: "flex-start",
    backgroundColor: C.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 10,
  },
  popularBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  packRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  packEmoji: { fontSize: 28 },
  packLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  packLabel: { color: C.text, fontSize: 15, fontWeight: "700" },
  bonusBadge: {
    backgroundColor: "rgba(0,200,83,0.12)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bonusBadgeText: { color: C.green, fontSize: 10, fontWeight: "700" },
  packSub: { color: C.textMuted, fontSize: 12, marginTop: 3 },
  packBuyBtn: {
    backgroundColor: C.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 64,
    alignItems: "center",
  },
  packBuyText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  secureNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
  },
  secureText: { flex: 1, color: C.textMuted, fontSize: 11, lineHeight: 16 },
  creatorNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
  },
  creatorText: { flex: 1, color: C.textMuted, fontSize: 11, lineHeight: 16 },
});
