import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { C } from "@/constants/colors";
import { apiRequest, ApiError } from "@/lib/query-client";
import { useAuth } from "@/lib/auth";
import { getPublicWebOrigin } from "@/lib/publicWebOrigin";
import { webScrollStyle } from "@/constants/layout";
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";

type Slot = {
  slotKey: string;
  label: string;
  scheduledAt: string;
  durationMinutes: number;
  priceJpy: number;
};

type SlotsResponse = { hostId: number; slots: Slot[] };

export default function TwoShotReserveScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { user, requireAuth } = useAuth();
  const { hostId: hostIdParam } = useLocalSearchParams<{ hostId?: string }>();
  const hostId = Math.max(1, parseInt(hostIdParam ?? "1", 10) || 1);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<SlotsResponse>({
    queryKey: [`/api/two-shot/slots?hostId=${hostId}`],
    enabled: Number.isFinite(hostId) && hostId > 0,
  });

  const startCheckout = useCallback(
    async (slot: Slot) => {
      if (!requireAuth("book a 2-shot session")) return;
      setCheckoutLoading(slot.slotKey);
      try {
        const origin = getPublicWebOrigin();
        const res = await apiRequest("POST", "/api/checkout/2shot", {
          hostId,
          slotKey: slot.slotKey,
          origin,
        });
        const j = (await res.json()) as { url?: string; error?: string };
        if (!j.url) throw new Error(j.error ?? "No checkout URL");
        if (Platform.OS === "web" && typeof window !== "undefined") {
          window.location.href = j.url;
        } else {
          await Linking.openURL(j.url);
        }
      } catch (e: unknown) {
        let msg = "Could not start checkout";
        if (e instanceof ApiError) {
          try {
            const j = JSON.parse(e.body) as { error?: string };
            if (j.error) msg = j.error;
          } catch {
            msg = e.message;
          }
        } else if (e instanceof Error) msg = e.message;
        Alert.alert("Checkout", msg);
      } finally {
        setCheckoutLoading(null);
      }
    },
    [hostId, requireAuth],
  );

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>2-shot booking</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={webScrollStyle(styles.scroll)} contentContainerStyle={styles.content} showsVerticalScrollIndicator={scrollShowsVertical}>
        <Text style={styles.lead}>
          Choose a slot for host <Text style={styles.mono}>#{hostId}</Text> (demo slots). Payment opens in Stripe Checkout.
        </Text>
        {!user ? (
          <Pressable style={styles.loginBtn} onPress={() => router.push("/auth/login")}>
            <Text style={styles.loginBtnText}>Sign in to reserve</Text>
          </Pressable>
        ) : null}

        {isLoading ? (
          <ActivityIndicator size="large" color={C.accent} style={{ marginTop: 24 }} />
        ) : isError ? (
          <Text style={styles.err}>Could not load slots.</Text>
        ) : (
          (data?.slots ?? []).map((slot) => (
            <View key={slot.slotKey} style={styles.card}>
              <Text style={styles.cardTitle}>{slot.label}</Text>
              <Text style={styles.cardMeta}>
                {slot.durationMinutes} min · ¥{slot.priceJpy.toLocaleString()}
              </Text>
              <Text style={styles.cardMetaDim}>{new Date(slot.scheduledAt).toLocaleString()}</Text>
              <Pressable
                style={[styles.cta, checkoutLoading === slot.slotKey && styles.ctaDisabled]}
                disabled={!!checkoutLoading || !user}
                onPress={() => startCheckout(slot)}
              >
                <Text style={styles.ctaText}>{checkoutLoading === slot.slotKey ? "Opening…" : "Reserve (Stripe)"}</Text>
              </Pressable>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
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
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: C.text },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  lead: { fontSize: 14, color: C.textSec, lineHeight: 20, marginTop: 4 },
  mono: { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", color: C.accent },
  loginBtn: {
    marginTop: 14,
    alignSelf: "flex-start",
    backgroundColor: C.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  loginBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  err: { marginTop: 16, color: C.live },
  card: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: C.text },
  cardMeta: { marginTop: 6, fontSize: 13, color: C.textSec },
  cardMetaDim: { marginTop: 2, fontSize: 12, color: C.textMuted },
  cta: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: C.accent,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});
