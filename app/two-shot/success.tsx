import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { C } from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/lib/auth";

type ReservationRow = {
  id: number;
  hostUserId: number;
  guestUserId: number;
  status: string;
  scheduledAt: string;
  durationMinutes: number;
};

export default function TwoShotSuccessScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { user } = useAuth();
  const { reservationId } = useLocalSearchParams<{ reservationId?: string; session_id?: string }>();
  const rid = parseInt(reservationId ?? "", 10);
  const [row, setRow] = useState<ReservationRow | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !Number.isFinite(rid) || rid <= 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiRequest("GET", `/api/two-shot/reservations/${rid}`);
        const j = (await res.json()) as ReservationRow;
        if (!cancelled) setRow(j);
      } catch {
        if (!cancelled) setErr("Could not load reservation");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, rid]);

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.replace("/(tabs)")}>
          <Ionicons name="home-outline" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>2-shot</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.body}>
        <Ionicons name="checkmark-circle" size={48} color={C.green} />
        <Text style={styles.title}>Payment submitted</Text>
        <Text style={styles.sub}>
          Reservation #{rid || "—"}. When Stripe sends <Text style={styles.mono}>checkout.session.completed</Text>, status becomes{" "}
          <Text style={styles.bold}>CONFIRMED</Text>.
        </Text>
        {!user ? (
          <Text style={styles.hint}>Sign in to see reservation details.</Text>
        ) : !row && !err ? (
          <ActivityIndicator color={C.accent} style={{ marginTop: 16 }} />
        ) : err ? (
          <Text style={styles.err}>{err}</Text>
        ) : row ? (
          <View style={styles.card}>
            <Text style={styles.cardLine}>Status: {row.status}</Text>
            <Text style={styles.cardLine}>Host: #{row.hostUserId}</Text>
            <Text style={styles.cardLine}>Guest: #{row.guestUserId}</Text>
            <Text style={styles.cardLine}>
              When: {new Date(row.scheduledAt).toLocaleString()} ({row.durationMinutes} min)
            </Text>
          </View>
        ) : null}
      </View>
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
  body: { paddingHorizontal: 20, paddingTop: 24, alignItems: "center" },
  title: { marginTop: 12, fontSize: 20, fontWeight: "800", color: C.text, textAlign: "center" },
  sub: { marginTop: 10, fontSize: 13, color: C.textSec, textAlign: "center", lineHeight: 20 },
  mono: { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 12 },
  bold: { fontWeight: "800", color: C.text },
  hint: { marginTop: 12, color: C.textMuted, fontSize: 13 },
  err: { marginTop: 12, color: C.live },
  card: {
    marginTop: 20,
    alignSelf: "stretch",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    gap: 6,
  },
  cardLine: { fontSize: 13, color: C.textSec },
});
