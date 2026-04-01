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
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { useAuth } from "@/lib/auth";
import { C } from "@/constants/colors";

const PRICE_PER_TICKET_USD = 0.01;
const MIN_PURCHASE_TICKETS = 100;

export default function TicketsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { session_id, tickets: ticketsParam } = useLocalSearchParams<{ session_id?: string; tickets?: string }>();

  const [ticketInput, setTicketInput] = useState(String(MIN_PURCHASE_TICKETS));
  const [loadingCheckout, setLoadingCheckout] = useState(false);
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

  const parsedTickets = parseInt(ticketInput, 10) || 0;
  const isValidPurchase = parsedTickets >= MIN_PURCHASE_TICKETS;
  const totalPriceUSD = parsedTickets * PRICE_PER_TICKET_USD;

  async function handleBuyTickets() {
    if (!requireAuth("Ticket Shop")) return;
    if (!isValidPurchase) {
      Alert.alert(
        "Minimum Purchase",
        `Please purchase at least ${MIN_PURCHASE_TICKETS.toLocaleString()} tickets.`
      );
      return;
    }
    setLoadingCheckout(true);
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
        tickets: parsedTickets,
        origin,
      }) as any;
      if (res.url) {
        await Linking.openURL(res.url);
      }
    } catch (err) {
      console.error("[Tickets] checkout error:", err);
      Alert.alert("Error", "Failed to start checkout. Please try again.");
    } finally {
      setLoadingCheckout(false);
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

        {/* Ticket amount input */}
        <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginTop: 8 }]}>Buy Tickets</Text>
        <View style={styles.purchaseCard}>
          <Text style={styles.inputLabel}>Ticket Quantity</Text>
          <TextInput
            style={styles.ticketInput}
            value={ticketInput}
            onChangeText={(text) => setTicketInput(text.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
            placeholder="Enter tickets"
            placeholderTextColor={C.textMuted}
          />
          <Text style={styles.purchaseHint}>
            1 Ticket = ${PRICE_PER_TICKET_USD.toFixed(2)} USD
          </Text>
          <Text style={styles.totalPrice}>Total: ${totalPriceUSD.toFixed(2)} USD</Text>
          {!isValidPurchase && (
            <Text style={styles.minPurchaseError}>
              Minimum purchase is {MIN_PURCHASE_TICKETS.toLocaleString()} tickets (${(MIN_PURCHASE_TICKETS * PRICE_PER_TICKET_USD).toFixed(2)}).
            </Text>
          )}
          <Pressable
            style={[styles.checkoutBtn, (!isValidPurchase || loadingCheckout) && styles.checkoutBtnDisabled]}
            onPress={handleBuyTickets}
            disabled={!isValidPurchase || loadingCheckout}
          >
            {loadingCheckout ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.checkoutBtnText}>Proceed to Stripe Checkout</Text>
            )}
          </Pressable>
        </View>

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
  purchaseCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  inputLabel: {
    color: C.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  ticketInput: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: C.text,
    fontSize: 18,
    fontWeight: "700",
    backgroundColor: C.bg,
  },
  purchaseHint: {
    color: C.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
  totalPrice: {
    color: C.text,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 8,
  },
  minPurchaseError: {
    color: "#ff6b6b",
    fontSize: 12,
    marginTop: 8,
  },
  checkoutBtn: {
    backgroundColor: C.accent,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  checkoutBtnDisabled: {
    opacity: 0.6,
  },
  checkoutBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
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
