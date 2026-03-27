import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { C } from "@/constants/colors";

type EDLItem = {
  index: number;
  startTime: string;
  endTime: string;
  type: "cut" | "highlight" | "transition" | "caption";
  instruction: string;
  note?: string;
};

type EditPlan = {
  title: string;
  totalDuration: string;
  summary: string;
  edl: EDLItem[];
};

type Job = {
  id: number;
  videoUrl: string;
  prompt: string;
  status: string;
  result: EditPlan | null;
  createdAt: string;
  updatedAt: string;
};

const TYPE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  highlight: { icon: "star", color: C.accent, label: "Highlight" },
  cut: { icon: "cut", color: "#f5c842", label: "Cut" },
  transition: { icon: "git-merge", color: "#7c3aed", label: "Transition" },
  caption: { icon: "text", color: "#3b82f6", label: "Caption" },
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Queued",
  processing: "Processing...",
  completed: "Complete",
  failed: "Failed",
  approved: "Approved",
};

export default function AIEditJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const qc = useQueryClient();
  const [approving, setApproving] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: job, isLoading, isError } = useQuery<Job>({
    queryKey: [`/api/ai-edit/jobs/${id}`],
    enabled: !!id,
    refetchInterval: false,
    retry: false,
  });

  const status = job?.status ?? "pending";
  const isDone = status === "completed" || status === "failed" || status === "approved";

  useEffect(() => {
    if (!id || isDone) return;

    pollRef.current = setInterval(() => {
      qc.invalidateQueries({ queryKey: [`/api/ai-edit/jobs/${id}`] });
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [id, isDone]);

  async function handleApprove() {
    if (!job) return;
    setApproving(true);
    try {
      await apiRequest("POST", `/api/ai-edit/jobs/${job.id}/approve`);
      await qc.invalidateQueries({ queryKey: [`/api/ai-edit/jobs/${id}`] });
      Alert.alert("Approved 🎉", "Your edit plan has been approved and published.");
    } catch (e: any) {
      Alert.alert("Error", "Failed to approve. Please try again.");
    } finally {
      setApproving(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: topInset + 12 }]}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </Pressable>
          <Text style={styles.headerTitle}>AI Edit Assistant</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      </View>
    );
  }

  if (isError || !job) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: topInset + 12 }]}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </Pressable>
          <Text style={styles.headerTitle}>AI Edit Assistant</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color={C.live} />
          <Text style={styles.errorText}>Job not found.</Text>
          <Pressable style={styles.retryBtn} onPress={() => router.replace("/ai-edit")}>
            <Text style={styles.retryBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const plan = job.result;

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>AI Edit Assistant</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Status card */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
              {STATUS_LABELS[status] ?? status}
            </Text>
            {(status === "pending" || status === "processing") && (
              <ActivityIndicator size="small" color={C.accent} style={{ marginLeft: 6 }} />
            )}
          </View>
          <Text style={styles.statusPrompt} numberOfLines={2}>
            {job.prompt}
          </Text>
          <Text style={styles.statusUrl} numberOfLines={1}>
            {job.videoUrl}
          </Text>
        </View>

        {/* Processing indicator */}
        {(status === "pending" || status === "processing") && (
          <View style={styles.processingCard}>
            <Ionicons name="sparkles" size={28} color={C.accent} />
            <Text style={styles.processingTitle}>Claude is generating your edit plan...</Text>
            <Text style={styles.processingNote}>Auto-refreshes every 5 seconds. Please wait.</Text>
          </View>
        )}

        {/* Failed state */}
        {status === "failed" && (
          <View style={styles.failedCard}>
            <Ionicons name="alert-circle" size={32} color={C.live} />
            <Text style={styles.failedTitle}>Processing Failed</Text>
            <Text style={styles.failedNote}>Please try again or check that your video URL is valid.</Text>
            <Pressable
              style={styles.retryBtn}
              onPress={() => router.replace("/ai-edit")}
            >
              <Text style={styles.retryBtnText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {/* Result — EDL */}
        {plan && (status === "completed" || status === "approved") && (
          <>
            <View style={styles.planHeader}>
              <Text style={styles.planTitle}>{plan.title}</Text>
              <View style={styles.planMeta}>
                <Ionicons name="time-outline" size={13} color={C.textSec} />
                <Text style={styles.planMetaText}>Total {plan.totalDuration}</Text>
              </View>
              <Text style={styles.planSummary}>{plan.summary}</Text>
            </View>

            <Text style={styles.edlSectionLabel}>Edit Decision List</Text>

            {plan.edl.map((item) => {
              const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.cut;
              return (
                <View key={item.index} style={styles.edlItem}>
                  <View style={[styles.edlIndexBadge, { backgroundColor: cfg.color + "22" }]}>
                    <Text style={[styles.edlIndexText, { color: cfg.color }]}>{item.index}</Text>
                  </View>
                  <View style={styles.edlContent}>
                    <View style={styles.edlTopRow}>
                      <View style={[styles.edlTypeBadge, { backgroundColor: cfg.color + "22" }]}>
                        <Ionicons name={cfg.icon} size={10} color={cfg.color} />
                        <Text style={[styles.edlTypeText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                      <Text style={styles.edlTime}>
                        {item.startTime} → {item.endTime}
                      </Text>
                    </View>
                    <Text style={styles.edlInstruction}>{item.instruction}</Text>
                    {item.note && (
                      <Text style={styles.edlNote}>{item.note}</Text>
                    )}
                  </View>
                </View>
              );
            })}

            {status === "completed" && (
              <Pressable
                style={[styles.approveBtn, approving && styles.approveBtnDisabled]}
                onPress={handleApprove}
                disabled={approving}
              >
                {approving ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Ionicons name="checkmark-circle" size={18} color="#000" />
                )}
                <Text style={styles.approveBtnText}>
                  {approving ? "Submitting..." : "Approve & Publish"}
                </Text>
              </Pressable>
            )}

            {status === "approved" && (
              <View style={styles.approvedBanner}>
                <Ionicons name="checkmark-circle" size={20} color={C.accent} />
                <Text style={styles.approvedText}>This plan has been approved and published</Text>
              </View>
            )}

            <Pressable
              style={styles.newPlanBtn}
              onPress={() => router.replace("/ai-edit")}
            >
              <Ionicons name="add-circle-outline" size={15} color={C.textSec} />
              <Text style={styles.newPlanBtnText}>Create a New Edit Plan</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
    case "approved":
      return C.accent;
    case "processing":
      return C.amber;
    case "failed":
      return C.live;
    default:
      return C.textSec;
  }
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
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  errorText: { color: C.textSec, fontSize: 15, textAlign: "center" },
  statusCard: {
    margin: 16,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.borderDim,
    gap: 6,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: "700" },
  statusPrompt: { color: C.text, fontSize: 14, fontWeight: "600", lineHeight: 20 },
  statusUrl: { color: C.textMuted, fontSize: 11 },
  processingCard: {
    marginHorizontal: 16,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: C.borderDim,
    marginBottom: 16,
  },
  processingTitle: { color: C.text, fontSize: 15, fontWeight: "700", textAlign: "center" },
  processingNote: { color: C.textMuted, fontSize: 12, textAlign: "center" },
  failedCard: {
    marginHorizontal: 16,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: C.live + "44",
    marginBottom: 16,
  },
  failedTitle: { color: C.live, fontSize: 16, fontWeight: "800" },
  failedNote: { color: C.textSec, fontSize: 13, textAlign: "center" },
  retryBtn: {
    backgroundColor: C.live,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  planHeader: {
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 6,
  },
  planTitle: { color: C.text, fontSize: 20, fontWeight: "800" },
  planMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  planMetaText: { color: C.textSec, fontSize: 12 },
  planSummary: { color: C.textSec, fontSize: 13, lineHeight: 20 },
  edlSectionLabel: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 4,
  },
  edlItem: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderDim,
    flexDirection: "row",
    overflow: "hidden",
  },
  edlIndexBadge: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  edlIndexText: { fontSize: 14, fontWeight: "800" },
  edlContent: {
    flex: 1,
    padding: 12,
    gap: 5,
  },
  edlTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  edlTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  edlTypeText: { fontSize: 10, fontWeight: "700" },
  edlTime: { color: C.textMuted, fontSize: 11, fontWeight: "600" },
  edlInstruction: { color: C.text, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  edlNote: { color: C.textMuted, fontSize: 11, lineHeight: 16 },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.accent,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 15,
    borderRadius: 12,
    gap: 8,
  },
  approveBtnDisabled: { opacity: 0.5 },
  approveBtnText: { color: "#000", fontSize: 15, fontWeight: "800" },
  approvedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.accent + "18",
    borderWidth: 1,
    borderColor: C.accent + "44",
  },
  approvedText: { color: C.accent, fontSize: 14, fontWeight: "700" },
  newPlanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
  },
  newPlanBtnText: { color: C.textSec, fontSize: 13, fontWeight: "600" },
});
