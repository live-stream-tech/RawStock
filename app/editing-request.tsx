import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/lib/auth";
import { C } from "@/constants/colors";
import { getTabBottomInset } from "@/constants/layout";

const EDITING_FEE = 200; // 🎟 deducted from ticket balance

export default function EditingRequestScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const scrollBottomPad = getTabBottomInset(insets) + 100;

  const { user, requireAuth } = useAuth();
  const [videoUrl, setVideoUrl] = useState("");
  const [performanceDate, setPerformanceDate] = useState("");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: ticketData } = useQuery<{ balance: number }>({
    queryKey: ["/api/tickets/balance"],
    enabled: !!user,
  });
  const ticketBalance = ticketData?.balance ?? 0;
  const canAfford = ticketBalance >= EDITING_FEE;

  async function handleSubmit() {
    if (!requireAuth("Editing Request")) return;
    if (!videoUrl.trim()) {
      Alert.alert("Required", "Please enter your video URL or footage description.");
      return;
    }
    if (!canAfford) {
      Alert.alert(
        "Not Enough Tickets 🎟",
        `You need ${EDITING_FEE} 🎟 to submit an editing request.\nYou currently have ${ticketBalance} 🎟.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Get Tickets", onPress: () => router.push("/tickets") },
        ]
      );
      return;
    }

    setLoading(true);
    try {
      await apiRequest("POST", "/api/editing-requests", {
        videoUrl: videoUrl.trim(),
        performanceDate: performanceDate.trim() || null,
        instructions: instructions.trim() || null,
      });
      Alert.alert(
        "Request Submitted! 🎉",
        `${EDITING_FEE} 🎟 have been deducted.\n\nOur team will review your submission.`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (e: any) {
      const err = e?.body ?? e ?? {};
      if (err?.error === "Insufficient tickets") {
        Alert.alert("Not Enough Tickets", `You need ${EDITING_FEE} 🎟 but only have ${err.balance ?? ticketBalance} 🎟.`);
      } else {
        Alert.alert("Error", "Failed to submit request. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Platform queue</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={scrollShowsVertical}
        contentContainerStyle={{ paddingBottom: scrollBottomPad, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >

        <Text style={styles.intro}>
          Submit footage details for the platform editing queue. To pick a specific editor, use Find an editor from the home banner.
        </Text>

        {/* Fee banner */}
        <View style={styles.feeRow}>
          <Ionicons name="ticket-outline" size={16} color={C.accent} />
          <Text style={styles.feeText}>Service fee: <Text style={styles.feeAmount}>{EDITING_FEE} 🎟</Text></Text>
          <Text style={[styles.feeBalance, !canAfford && styles.feeInsufficient]}>
            Balance: {ticketBalance.toLocaleString()} 🎟
          </Text>
          {!canAfford && (
            <Pressable onPress={() => router.push("/tickets")}>
              <Text style={styles.feeTopUp}>Top up →</Text>
            </Pressable>
          )}
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Video URL / Footage Description *</Text>
            <TextInput
              style={styles.input}
              value={videoUrl}
              onChangeText={setVideoUrl}
              placeholder="YouTube link, cloud storage URL, or describe your footage..."
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Performance Date</Text>
            <TextInput
              style={styles.input}
              value={performanceDate}
              onChangeText={setPerformanceDate}
              placeholder="e.g. 2026-03-20"
              placeholderTextColor={C.textMuted}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Special Instructions</Text>
            <TextInput
              style={[styles.input, styles.inputTall]}
              value={instructions}
              onChangeText={setInstructions}
              placeholder="Highlight reel, subtitles, colour grade preference, music rights info..."
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={5}
            />
          </View>
        </View>

        {/* Submit */}
        <Pressable
          style={[styles.submitBtn, (!canAfford || loading) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canAfford || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={16} color="#fff" />
          )}
          <Text style={styles.submitBtnText}>
            {loading ? "Submitting..." : `Submit for ${EDITING_FEE} 🎟`}
          </Text>
        </Pressable>

        {!canAfford && (
          <Pressable style={styles.getTicketsBtn} onPress={() => router.push("/tickets")}>
            <Ionicons name="ticket-outline" size={15} color={C.accent} />
            <Text style={styles.getTicketsText}>Get Tickets to continue</Text>
          </Pressable>
        )}
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
  headerTitle: { flex: 1, textAlign: "center", color: C.text, fontSize: 16, fontWeight: "700" },
  scroll: { flex: 1 },
  intro: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    color: C.textSec,
    fontSize: 13,
    lineHeight: 19,
  },
  feeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  feeText: { color: C.textSec, fontSize: 12, flex: 1 },
  feeAmount: { color: C.accent, fontWeight: "800" },
  feeBalance: { color: C.green, fontSize: 12, fontWeight: "700" },
  feeInsufficient: { color: C.live },
  feeTopUp: { color: C.accent, fontSize: 12, fontWeight: "700" },
  form: { marginHorizontal: 16, gap: 14 },
  field: { gap: 6 },
  label: { color: C.textSec, fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  input: {
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.text,
    fontSize: 14,
    textAlignVertical: "top",
  },
  inputTall: { minHeight: 100 },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.accent,
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 15,
    borderRadius: 12,
    gap: 8,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  getTicketsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
  },
  getTicketsText: { color: C.accent, fontSize: 13, fontWeight: "700" },
});
