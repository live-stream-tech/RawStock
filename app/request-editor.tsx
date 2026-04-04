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
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/lib/auth";
import { C } from "@/constants/colors";
import {
  formatEditorRevenueShareLabel,
  formatEditorTicketsPerMinute,
  formatUsdFromTickets,
  PRICE_PER_TICKET_USD,
} from "@/constants/tickets";

type VideoEditor = {
  id: number;
  name: string;
  priceType: "per_minute" | "revenue_share";
  pricePerMinute: number | null;
  revenueSharePercent: number | null;
};

export default function RequestEditorScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { editorId: editorIdParam, editorName: nameParam, editorPrice: priceParam } = useLocalSearchParams<{
    editorId?: string;
    editorName?: string;
    editorPrice?: string;
  }>();

  const editorId = parseInt(String(editorIdParam ?? ""), 10);
  const hasValidId = Number.isFinite(editorId) && editorId > 0;

  const { user, requireAuth } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requestPriceType, setRequestPriceType] = useState<"per_minute" | "revenue_share">("per_minute");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [sending, setSending] = useState(false);

  const { data: editor, isLoading: editorLoading } = useQuery<VideoEditor>({
    queryKey: [`/api/editors/${editorId}`],
    enabled: hasValidId,
  });

  const displayName = editor?.name ?? (nameParam ? decodeURIComponent(String(nameParam)) : "");
  const rateHint =
    editor?.priceType === "per_minute" && editor.pricePerMinute != null
      ? `${formatEditorTicketsPerMinute(editor.pricePerMinute)} (${formatUsdFromTickets(editor.pricePerMinute)}/min)`
      : editor?.priceType === "revenue_share" && editor.revenueSharePercent != null
        ? formatEditorRevenueShareLabel(editor.revenueSharePercent)
        : priceParam
          ? decodeURIComponent(String(priceParam))
          : null;

  React.useEffect(() => {
    if (editor?.priceType === "per_minute" || editor?.priceType === "revenue_share") {
      setRequestPriceType(editor.priceType);
    }
  }, [editor?.priceType]);

  async function handleSend() {
    if (!requireAuth("Editor Request")) return;
    const t = title.trim();
    const d = description.trim();
    if (!t || !d) {
      Alert.alert("Required", "Please enter a title and description.");
      return;
    }

    const budgetNumber = budget ? Number(budget.replace(/[^0-9]/g, "")) : undefined;

    setSending(true);
    try {
      await apiRequest("POST", `/api/editors/${editorId}/request`, {
        requesterName: user?.displayName ?? undefined,
        title: t,
        description: d,
        priceType: requestPriceType,
        budget: budgetNumber,
        deadline: deadline.trim() || undefined,
      });
      Alert.alert("Sent", "Your request has been sent!", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", "Failed to send request. Please try again later.");
    } finally {
      setSending(false);
    }
  }

  if (!hasValidId) {
    return (
      <View style={[styles.container, { paddingTop: topInset + 12, paddingBottom: bottomInset }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Request Editor</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.errorText}>Invalid editor. Go back and pick an editor from the list.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Request Editor</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={scrollShowsVertical} contentContainerStyle={{ paddingBottom: 32 }}>
        {editorLoading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={C.accent} />
        ) : (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroName}>{displayName || "Editor"}</Text>
              {rateHint ? <Text style={styles.heroRate}>{rateHint}</Text> : null}
              <Text style={styles.heroNote}>
                Budget targets are in tickets (1 Ticket = ${PRICE_PER_TICKET_USD.toFixed(2)} USD), same as the Ticket Shop.
              </Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Request Title *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Highlight reel from March livestream"
                placeholderTextColor={C.textMuted}
              />

              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={description}
                onChangeText={setDescription}
                placeholder="Footage links, length, style references, deadline expectations..."
                placeholderTextColor={C.textMuted}
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.label}>Pricing Model</Text>
              <View style={styles.priceTypeRow}>
                <Pressable
                  style={[styles.priceTypePill, requestPriceType === "per_minute" && styles.priceTypePillActive]}
                  onPress={() => setRequestPriceType("per_minute")}
                >
                  <Text style={[styles.priceTypeText, requestPriceType === "per_minute" && styles.priceTypeTextActive]}>Per minute</Text>
                </Pressable>
                <Pressable
                  style={[styles.priceTypePill, requestPriceType === "revenue_share" && styles.priceTypePillActive]}
                  onPress={() => setRequestPriceType("revenue_share")}
                >
                  <Text style={[styles.priceTypeText, requestPriceType === "revenue_share" && styles.priceTypeTextActive]}>Revenue share</Text>
                </Pressable>
              </View>

              <Text style={styles.label}>
                {requestPriceType === "per_minute" ? "Target budget (🎟 / min)" : "Target rev share (%)"}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={requestPriceType === "per_minute" ? "e.g. 150" : "e.g. 40"}
                placeholderTextColor={C.textMuted}
                value={budget}
                onChangeText={setBudget}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Deadline</Text>
              <TextInput
                style={styles.input}
                value={deadline}
                onChangeText={setDeadline}
                placeholder="e.g. First cut by end of month"
                placeholderTextColor={C.textMuted}
              />

              <Pressable
                style={[styles.submitBtn, sending && styles.submitBtnDisabled]}
                onPress={handleSend}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Send Request</Text>
                )}
              </Pressable>
            </View>
          </>
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
  errorText: { color: C.textMuted, textAlign: "center", marginTop: 40, paddingHorizontal: 24, fontSize: 14 },
  hero: { margin: 16, gap: 8 },
  heroName: { color: C.text, fontSize: 20, fontWeight: "800" },
  heroRate: { color: C.accent, fontSize: 14, fontWeight: "600" },
  heroNote: { color: C.textMuted, fontSize: 11, lineHeight: 16 },
  form: { paddingHorizontal: 16, gap: 10 },
  label: { color: C.textSec, fontSize: 12, fontWeight: "700", marginTop: 6 },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.text,
    fontSize: 15,
  },
  inputMultiline: { minHeight: 120, paddingTop: 12 },
  priceTypeRow: { flexDirection: "row", gap: 8 },
  priceTypePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  priceTypePillActive: { backgroundColor: C.accent, borderColor: C.accent },
  priceTypeText: { color: C.textSec, fontSize: 13, fontWeight: "600" },
  priceTypeTextActive: { color: "#050505" },
  submitBtn: {
    marginTop: 16,
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
