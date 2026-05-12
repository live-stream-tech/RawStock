import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/constants/colors";
import { webScrollStyle } from "@/constants/layout";
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { AuthGuard, useAuth } from "@/lib/auth";
import { alertError, alertMessageThen } from "@/lib/alertCompat";
import { apiRequest } from "@/lib/query-client";
import {
  getClientErrorSessionId,
  getCurrentClientRoute,
  getRecentClientDebugBreadcrumbs,
} from "@/lib/clientErrorContext";
import { summarizeForErrorExtra } from "@/lib/debugIngest";

function currentPlatform(): string {
  if (Platform.OS) return Platform.OS;
  if (typeof navigator !== "undefined" && navigator.userAgent) return "web";
  return "unknown";
}

export default function BugReportScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ source?: string }>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [actualBehavior, setActualBehavior] = useState("");

  const submitMutation = useMutation({
    mutationFn: async () => {
      const sourceRoute =
        typeof params.source === "string" && params.source.trim()
          ? params.source.trim()
          : getCurrentClientRoute();
      const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : null;
      const res = await apiRequest("POST", "/api/bug-reports", {
        title,
        description,
        expectedBehavior: expectedBehavior || null,
        actualBehavior: actualBehavior || null,
        route: sourceRoute,
        sessionId: getClientErrorSessionId(),
        platform: currentPlatform(),
        userAgent,
        extra: {
          reporterUserId: user?.id ?? null,
          recentEvents: summarizeForErrorExtra(getRecentClientDebugBreadcrumbs()),
        },
      });
      return res.json() as Promise<{ ok: boolean; id: number | null }>;
    },
    onSuccess: () => {
      alertMessageThen(
        "Bug report sent",
        "Thanks. Your report was saved for review.",
        () => router.back(),
      );
    },
    onError: (err) => {
      alertError("Bug report failed", err, "Could not submit your report. Please try again.");
    },
  });

  const canSubmit = title.trim().length >= 4 && description.trim().length >= 10 && !submitMutation.isPending;

  return (
    <AuthGuard>
      <View style={[styles.container, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Report a Bug</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          style={webScrollStyle(styles.scroll)}
          showsVerticalScrollIndicator={scrollShowsVertical}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tell us what broke</Text>
            <Text style={styles.cardSubtitle}>
              We will attach your current route, session id, and recent app events automatically.
            </Text>

            <Text style={styles.label}>Short title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Example: Jukebox add button does nothing"
              placeholderTextColor={C.textMuted}
              style={styles.input}
              maxLength={200}
            />

            <Text style={styles.label}>What happened?</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the steps, what you tapped, and what you saw."
              placeholderTextColor={C.textMuted}
              style={[styles.input, styles.textarea]}
              multiline
              textAlignVertical="top"
              maxLength={4000}
            />

            <Text style={styles.label}>What should have happened? (optional)</Text>
            <TextInput
              value={expectedBehavior}
              onChangeText={setExpectedBehavior}
              placeholder="Example: The song should be added to the queue and tickets deducted once."
              placeholderTextColor={C.textMuted}
              style={[styles.input, styles.textareaSmall]}
              multiline
              textAlignVertical="top"
              maxLength={2000}
            />

            <Text style={styles.label}>What happened instead? (optional)</Text>
            <TextInput
              value={actualBehavior}
              onChangeText={setActualBehavior}
              placeholder="Example: The spinner stayed on screen and nothing changed."
              placeholderTextColor={C.textMuted}
              style={[styles.input, styles.textareaSmall]}
              multiline
              textAlignVertical="top"
              maxLength={2000}
            />

            <View style={styles.contextBox}>
              <Text style={styles.contextTitle}>Attached automatically</Text>
              <Text style={styles.contextText}>Route: {params.source || getCurrentClientRoute() || "-"}</Text>
              <Text style={styles.contextText}>Session: {getClientErrorSessionId()}</Text>
              <Text style={styles.contextText}>Platform: {currentPlatform()}</Text>
            </View>

            <Pressable
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              disabled={!canSubmit}
              onPress={() => submitMutation.mutate()}
            >
              <Ionicons name="send-outline" size={16} color={canSubmit ? C.bg : C.textMuted} />
              <Text style={[styles.submitText, !canSubmit && styles.submitTextDisabled]}>
                {submitMutation.isPending ? "Sending..." : "Send bug report"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </AuthGuard>
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
  headerTitle: { color: C.text, fontSize: 18, fontWeight: "700" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 16,
  },
  cardTitle: { color: C.text, fontSize: 17, fontWeight: "700" },
  cardSubtitle: { color: C.textMuted, fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: 16 },
  label: { color: C.text, fontSize: 12, fontWeight: "700", marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.borderDim,
    borderRadius: 10,
    color: C.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textarea: {
    minHeight: 140,
  },
  textareaSmall: {
    minHeight: 96,
  },
  contextBox: {
    marginTop: 16,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.borderDim,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  contextTitle: { color: C.text, fontSize: 12, fontWeight: "700" },
  contextText: { color: C.textMuted, fontSize: 12 },
  submitBtn: {
    marginTop: 18,
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  submitBtnDisabled: {
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.borderDim,
  },
  submitText: { color: C.bg, fontSize: 14, fontWeight: "700" },
  submitTextDisabled: { color: C.textMuted },
});
