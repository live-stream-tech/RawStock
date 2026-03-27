import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { apiRequest } from "@/lib/query-client";
import { C } from "@/constants/colors";

export default function BannerSuccessScreen() {
  const { session_id } = useLocalSearchParams<{ session_id: string }>();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<{ amountYen: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session_id) {
      setLoading(false);
      return;
    }
    apiRequest("POST", "/api/banner/confirm-session", { sessionId: session_id })
      .then(async (res) => {
        const data = await res.json();
        setResult({ amountYen: data.amountYen });
      })
      .catch(() => setError("Failed to confirm payment."))
      .finally(() => setLoading(false));
  }, [session_id]);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Confirming payment…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { paddingTop: topInset, paddingBottom: bottomInset }]}>
        <Ionicons name="alert-circle" size={60} color={C.live} />
        <Text style={styles.errorTitle}>Confirmation Error</Text>
        <Text style={styles.errorBody}>{error}</Text>
        <Pressable style={styles.btn} onPress={() => router.replace("/community")}>
          <Text style={styles.btnText}>Back to Community</Text>
        </Pressable>
      </View>
    );
  }

  const amountYen = result?.amountYen ?? 15_000;

  return (
    <View style={[styles.container, { paddingTop: topInset, paddingBottom: bottomInset }]}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark" size={48} color="#fff" />
      </View>
      <Text style={styles.title}>Payment Complete</Text>
      <Text style={styles.subtitle}>Your community ad banner (3 days) has been confirmed.</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Amount Paid</Text>
        <Text style={styles.amount}>🎟{amountYen.toLocaleString()}</Text>
        <Text style={styles.cardSub}>Your banner will be displayed for 3 days.</Text>
      </View>

      <Pressable style={styles.btn} onPress={() => router.replace("/community")}>
        <Ionicons name="people" size={16} color="#fff" />
        <Text style={styles.btnText}>Back to Community</Text>
      </Pressable>
      <Pressable style={styles.subBtn} onPress={() => router.replace("/")}>
        <Text style={styles.subBtnText}>Go to Home</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  successIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: { color: C.text, fontSize: 26, fontWeight: "800" },
  subtitle: { color: C.textSec, fontSize: 14, textAlign: "center" },
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 6,
    width: "100%",
    borderWidth: 1,
    borderColor: C.border,
  },
  cardLabel: { color: C.textMuted, fontSize: 12 },
  amount: { color: C.accent, fontSize: 32, fontWeight: "800" },
  cardSub: { color: C.textSec, fontSize: 12, textAlign: "center" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.accent,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: "100%",
    justifyContent: "center",
  },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  subBtn: { paddingVertical: 10 },
  subBtnText: { color: C.textMuted, fontSize: 13 },
  loadingText: { color: C.textSec, fontSize: 14, marginTop: 16 },
  errorTitle: { color: C.text, fontSize: 20, fontWeight: "800" },
  errorBody: { color: C.textSec, fontSize: 13, textAlign: "center" },
});
