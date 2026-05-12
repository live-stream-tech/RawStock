import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  Linking,
  TextInput,
} from "react-native";
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { getPublicWebOrigin } from "@/lib/publicWebOrigin";
import { useAuth } from "@/lib/auth";
import { C } from "@/constants/colors";
import { MIN_PURCHASE_TICKETS, PRICE_PER_TICKET_USD } from "@/constants/tickets";
import { webScrollStyle } from "@/constants/layout";
import { alertError, alertMessage } from "@/lib/alertCompat";

export default function TicketsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { session_id, tickets: ticketsParam } = useLocalSearchParams<{ session_id?: string; tickets?: string }>();

  const [ticketInput, setTicketInput] = useState(String(MIN_PURCHASE_TICKETS));
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const { user, requireAuth } = useAuth();
  const isJaUi = (user?.preferredLanguage ?? "").toLowerCase().startsWith("ja");
  const t = isJaUi
    ? {
        headerTitle: "チケットショップ",
        ticketShopAction: "チケットショップ",
        purchaseAddedTitle: "チケットを追加しました",
        purchaseAddedBody: (granted: number) =>
          granted > 0
            ? `${granted.toLocaleString()}枚のチケットが残高に追加されました。`
            : "チケット残高が更新されました。",
        verifyFailedTitle: "チケット確認に失敗しました",
        verifyFailedBody: "チケット購入をまだ確認できませんでした。",
        minimumPurchaseTitle: "最低購入数",
        minimumPurchaseBody: `最低でも${MIN_PURCHASE_TICKETS.toLocaleString()}枚のチケットを購入してください。`,
        checkoutFailedTitle: "決済の開始に失敗しました",
        checkoutFailedBody: "決済を開始できませんでした。もう一度お試しください。",
        balanceLabel: "現在のチケット残高",
        balanceValue: (balance: number) => `${balance.toLocaleString()} 枚`,
        balanceNote: "1チケット = $0.01 USD ・ セッションやギフトなどに使えます",
        howToUse: "チケットの使い方",
        jukeboxRequest: "Jukeboxリクエスト",
        sendGift: "ギフトを送る",
        varies: "内容により変動",
        buyTickets: "チケットを購入",
        inputLabel: "購入するチケット数",
        inputPlaceholder: "チケット数を入力",
        purchaseHint: `1チケット = $${PRICE_PER_TICKET_USD.toFixed(2)} USD`,
        totalPrice: (price: number) => `合計: $${price.toFixed(2)} USD`,
        minPurchaseError: `最低購入数は${MIN_PURCHASE_TICKETS.toLocaleString()}枚です（$${(
          MIN_PURCHASE_TICKETS * PRICE_PER_TICKET_USD
        ).toFixed(2)}）。`,
        checkoutButton: "Stripe Checkoutへ進む",
        secureNote: "決済はStripeにより安全に処理されます。カード情報はRawStockに保存されません。",
        creatorNote: "セッションで使われたチケット売上の90%をクリエイターが受け取ります。",
      }
    : {
        headerTitle: "Ticket Shop",
        ticketShopAction: "Ticket Shop",
        purchaseAddedTitle: "Tickets Added! 🎟",
        purchaseAddedBody: (granted: number) =>
          granted > 0
            ? `${granted.toLocaleString()} tickets have been added to your balance.`
            : "Your ticket balance has been updated.",
        verifyFailedTitle: "Ticket verification failed",
        verifyFailedBody: "We could not confirm your ticket purchase yet.",
        minimumPurchaseTitle: "Minimum purchase",
        minimumPurchaseBody: `Please purchase at least ${MIN_PURCHASE_TICKETS.toLocaleString()} tickets.`,
        checkoutFailedTitle: "Checkout failed",
        checkoutFailedBody: "Failed to start checkout. Please try again.",
        balanceLabel: "Your Ticket Balance",
        balanceValue: (balance: number) => `${balance.toLocaleString()} Tickets`,
        balanceNote: "1 Ticket = $0.01 USD · Spend on sessions, gifts & more",
        howToUse: "How to use tickets",
        jukeboxRequest: "Jukebox Request",
        sendGift: "Send a Gift",
        varies: "Varies",
        buyTickets: "Buy tickets",
        inputLabel: "Number of tickets to buy",
        inputPlaceholder: "Enter tickets",
        purchaseHint: `1 Ticket = $${PRICE_PER_TICKET_USD.toFixed(2)} USD`,
        totalPrice: (price: number) => `Total: $${price.toFixed(2)} USD`,
        minPurchaseError: `Minimum purchase is ${MIN_PURCHASE_TICKETS.toLocaleString()} tickets ($${(
          MIN_PURCHASE_TICKETS * PRICE_PER_TICKET_USD
        ).toFixed(2)}).`,
        checkoutButton: "Continue to Stripe Checkout",
        secureNote: "Payments are securely processed by Stripe. Card data is never stored on RawStock.",
        creatorNote: "Creators receive 90% of ticket revenue spent in sessions.",
      };

  const { data: balanceData, refetch: refetchBalance } = useQuery<{ balance: number }>({
    queryKey: ["/api/tickets/balance"],
  });

  const ticketBalance = balanceData?.balance ?? 0;

  const handleVerifyPurchase = useCallback(
    async (sessionId: string) => {
      try {
        const res = await apiRequest("POST", "/api/tickets/verify-purchase", { sessionId });
        const data = (await res.json()) as { success?: boolean };
        if (data.success) {
          await refetchBalance();
          const granted = parseInt(ticketsParam ?? "0") || 0;
          alertMessage(
            t.purchaseAddedTitle,
            t.purchaseAddedBody(granted),
          );
        }
      } catch (err) {
        console.error("[Tickets] verify purchase error:", err);
        alertError(t.verifyFailedTitle, err, t.verifyFailedBody);
      }
    },
    [refetchBalance, t, ticketsParam],
  );

  useEffect(() => {
    if (session_id) {
      void handleVerifyPurchase(session_id);
    }
  }, [session_id, handleVerifyPurchase]);

  const parsedTickets = parseInt(ticketInput, 10) || 0;
  const isValidPurchase = parsedTickets >= MIN_PURCHASE_TICKETS;
  const totalPriceUSD = parsedTickets * PRICE_PER_TICKET_USD;

  async function handleBuyTickets() {
    if (!requireAuth(t.ticketShopAction)) return;
    if (!isValidPurchase) {
      alertMessage(t.minimumPurchaseTitle, t.minimumPurchaseBody);
      return;
    }
    setLoadingCheckout(true);
    try {
      const response = await apiRequest("POST", "/api/tickets/create-checkout", {
        tickets: parsedTickets,
        origin: getPublicWebOrigin(),
      });
      const checkout = (await response.json()) as { url?: string };
      if (checkout.url) {
        if (Platform.OS === "web" && typeof window !== "undefined") {
          window.location.href = checkout.url;
        } else {
          await Linking.openURL(checkout.url);
        }
      }
    } catch (err) {
      console.error("[Tickets] checkout error:", err);
      alertError(t.checkoutFailedTitle, err, t.checkoutFailedBody);
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
        <Text style={styles.headerTitle}>{t.headerTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={webScrollStyle(styles.scroll)} showsVerticalScrollIndicator={scrollShowsVertical} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Balance card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceTop}>
            <Text style={styles.balanceEmoji}>🎟</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.balanceLabel}>{t.balanceLabel}</Text>
              <Text style={styles.balanceValue}>{t.balanceValue(ticketBalance)}</Text>
            </View>
          </View>
          <View style={styles.balanceFooter}>
            <Ionicons name="information-circle-outline" size={13} color={C.textMuted} />
            <Text style={styles.balanceNote}>{t.balanceNote}</Text>
          </View>
        </View>

        {/* What are tickets */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>{t.howToUse}</Text>
          <View style={styles.infoGrid}>
            {[
              { icon: "musical-notes-outline" as const, label: t.jukeboxRequest, value: "10 🎟" },
              { icon: "gift-outline" as const, label: t.sendGift, value: t.varies },
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
        <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginTop: 8 }]}>{t.buyTickets}</Text>
        <View style={styles.purchaseCard}>
          <Text style={styles.inputLabel}>{t.inputLabel}</Text>
          <TextInput
            style={styles.ticketInput}
            value={ticketInput}
            onChangeText={(text) => setTicketInput(text.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
            placeholder={t.inputPlaceholder}
            placeholderTextColor={C.textMuted}
          />
          <Text style={styles.purchaseHint}>{t.purchaseHint}</Text>
          <Text style={styles.totalPrice}>{t.totalPrice(totalPriceUSD)}</Text>
          {!isValidPurchase && (
            <Text style={styles.minPurchaseError}>{t.minPurchaseError}</Text>
          )}
          <Pressable
            style={[styles.checkoutBtn, (!isValidPurchase || loadingCheckout) && styles.checkoutBtnDisabled]}
            onPress={handleBuyTickets}
            disabled={!isValidPurchase || loadingCheckout}
          >
            {loadingCheckout ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.checkoutBtnText}>{t.checkoutButton}</Text>
            )}
          </Pressable>
        </View>

        {/* Secure note */}
        <View style={styles.secureNote}>
          <Ionicons name="lock-closed-outline" size={14} color={C.textMuted} />
          <Text style={styles.secureText}>{t.secureNote}</Text>
        </View>

        {/* Creator note */}
        <View style={styles.creatorNote}>
          <Ionicons name="heart-outline" size={14} color={C.accent} />
          <Text style={styles.creatorText}>{t.creatorNote}</Text>
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
