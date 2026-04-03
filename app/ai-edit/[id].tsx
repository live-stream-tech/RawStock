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
import type { RawStockVideoSpec } from "../../shared/rawstock-video-spec";

// ─── Types ───────────────────────────────────────────────────────────────────

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
  videoUrls: string[] | null;
  prompt: string;
  status: string;
  result: EditPlan | null;
  planMinutes: number | null;
  logoUrl: string | null;
  telop: string | null;
  targetAudience: string | null;
  tone: string | null;
  revisionCount: number;
  ticketCost: number | null;
  videoSpec: RawStockVideoSpec | null;
  templatedRenderId: string | null;
  deliveredUrl: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const REVISION_TICKETS = 100;

const PLAN_LABELS: Record<number, string> = {
  15: "Lite",
  30: "Standard",
  45: "Pro",
  60: "Full",
};

const TYPE_CONFIG: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }
> = {
  highlight:  { icon: "star",       color: C.accent,   label: "Highlight"   },
  cut:        { icon: "cut",        color: "#f5c842",  label: "Cut"         },
  transition: { icon: "git-merge",  color: "#7c3aed",  label: "Transition"  },
  caption:    { icon: "text",       color: "#3b82f6",  label: "Caption"     },
};

const STATUS_LABELS: Record<string, string> = {
  pending:    "Queued",
  processing: "Processing…",
  completed:  "Complete",
  failed:     "Failed",
  approved:   "Approved",
  delivered:  "Delivered",
};

function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
    case "approved":
      return C.accent;
    case "delivered":
      return "#22c55e"; // green
    case "processing":
      return C.amber;
    case "failed":
      return C.live;
    default:
      return C.textSec;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AIEditJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const qc = useQueryClient();
  const [approving, setApproving] = useState(false);
  const [revising, setRevising] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: job, isLoading, isError } = useQuery<Job>({
    queryKey: [`/api/ai-edit/jobs/${id}`],
    enabled: !!id,
    refetchInterval: false,
    retry: false,
  });

  const status = job?.status ?? "pending";
  const isDone =
    status === "completed" || status === "failed" || status === "approved" || status === "delivered";

  useEffect(() => {
    if (!id || isDone) return;
    pollRef.current = setInterval(() => {
      qc.invalidateQueries({ queryKey: [`/api/ai-edit/jobs/${id}`] });
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [id, isDone]);

  function handleDownload() {
    if (!job?.deliveredUrl) return;
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const a = document.createElement("a");
      a.href = job.deliveredUrl;
      a.download = `ai-edit-job-${job.id}.mp4`;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // On native, open in browser as a fallback
      import("expo-linking").then(({ openURL }) => openURL(job.deliveredUrl!));
    }
  }

  async function handleApprove() {
    if (!job) return;
    setApproving(true);
    try {
      await apiRequest("POST", `/api/ai-edit/jobs/${job.id}/approve`);
      await qc.invalidateQueries({ queryKey: [`/api/ai-edit/jobs/${id}`] });
      Alert.alert("Approved", "Your edit plan has been approved and published.");
    } catch {
      Alert.alert("Error", "Failed to approve. Please try again.");
    } finally {
      setApproving(false);
    }
  }

  async function handleRevise() {
    if (!job) return;
    const revisionCount = job.revisionCount ?? 0;
    const isFree = revisionCount === 0;
    const costLabel = isFree ? "free" : `${REVISION_TICKETS} tickets`;
    Alert.alert(
      "Request Revision",
      `Claude will re-generate the edit plan (${costLabel}). Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request",
          onPress: async () => {
            setRevising(true);
            try {
              const res = await apiRequest("POST", `/api/ai-edit/jobs/${job.id}/revise`);
              if (!res.ok) {
                const err = (await res.json()) as { error?: string };
                throw new Error(err.error ?? "Failed to request revision");
              }
              await qc.invalidateQueries({ queryKey: [`/api/ai-edit/jobs/${id}`] });
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "Failed to request revision.");
            } finally {
              setRevising(false);
            }
          },
        },
      ]
    );
  }

  // ── Loading / Error states ────────────────────────────────────────────────

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
          <Pressable style={styles.ghostBtn} onPress={() => router.replace("/ai-edit")}>
            <Text style={styles.ghostBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const plan = job.result;
  const revisionCount = job.revisionCount ?? 0;
  const nextRevisionFree = revisionCount === 0;
  const planLabel = job.planMinutes ? PLAN_LABELS[job.planMinutes] ?? `${job.planMinutes}min` : null;

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
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Status card ── */}
        <View style={styles.statusCard}>
          <View style={styles.statusTopRow}>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
              <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
                {STATUS_LABELS[status] ?? status}
              </Text>
              {(status === "pending" || status === "processing") && (
                <ActivityIndicator size="small" color={C.accent} style={{ marginLeft: 4 }} />
              )}
            </View>
            {/* Revision badge */}
            {revisionCount > 0 && (
              <View style={styles.revisionBadge}>
                <Ionicons name="refresh" size={10} color={C.amber} />
                <Text style={styles.revisionBadgeText}>Rev #{revisionCount}</Text>
              </View>
            )}
          </View>

          {/* Plan info */}
          {planLabel && (
            <View style={styles.planInfoRow}>
              {job.planMinutes && (
                <>
                  <View style={styles.planTag}>
                    <Text style={styles.planTagText}>{planLabel}</Text>
                  </View>
                  <Text style={styles.planTagDetail}>{job.planMinutes} min plan</Text>
                </>
              )}
              {job.ticketCost && (
                <View style={styles.ticketTag}>
                  <Ionicons name="ticket" size={10} color={C.textMuted} />
                  <Text style={styles.ticketTagText}>{job.ticketCost}</Text>
                </View>
              )}
            </View>
          )}

          <Text style={styles.statusPrompt} numberOfLines={2}>
            {job.prompt}
          </Text>

          {/* Meta chips */}
          {(job.targetAudience || job.tone || job.telop) && (
            <View style={styles.metaChips}>
              {job.targetAudience && (
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>{job.targetAudience}</Text>
                </View>
              )}
              {job.tone && (
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>{job.tone}</Text>
                </View>
              )}
              {job.telop && (
                <View style={styles.metaChip}>
                  <Ionicons name="text" size={9} color={C.textMuted} />
                  <Text style={styles.metaChipText}>{job.telop}</Text>
                </View>
              )}
            </View>
          )}

          {/* Source video count */}
          {job.videoUrls && (
            <Text style={styles.sourceInfo}>
              {job.videoUrls.length} source video{job.videoUrls.length !== 1 ? "s" : ""}
              {job.logoUrl ? " · logo included" : ""}
            </Text>
          )}
        </View>

        {/* ── Processing indicator ── */}
        {(status === "pending" || status === "processing") && (
          <View style={styles.processingCard}>
            <Ionicons name="sparkles" size={28} color={C.accent} />
            <Text style={styles.processingTitle}>
              {status === "processing"
                ? "Claude is generating your edit plan…"
                : "Queued — Claude will begin shortly…"}
            </Text>
            <Text style={styles.processingNote}>Auto-refreshes every 5 seconds.</Text>
          </View>
        )}

        {/* ── Failed state ── */}
        {status === "failed" && (
          <View style={styles.failedCard}>
            <Ionicons name="alert-circle" size={32} color={C.live} />
            <Text style={styles.failedTitle}>Processing Failed</Text>
            <Text style={styles.failedNote}>
              Please try again or check that your video files are accessible.
            </Text>
            <Pressable style={styles.retryBtn} onPress={() => router.replace("/ai-edit")}>
              <Text style={styles.retryBtnText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {/* ── EDL Result ── */}
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

            <Text style={styles.edlSectionLabel}>EDIT DECISION LIST</Text>

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
                    {item.note && <Text style={styles.edlNote}>{item.note}</Text>}
                  </View>
                </View>
              );
            })}

            {/* ── Action buttons ── */}
            {status === "completed" && (
              <View style={styles.actionsRow}>
                {/* Approve */}
                <Pressable
                  style={[styles.approveBtn, approving && styles.btnDisabled]}
                  onPress={handleApprove}
                  disabled={approving || revising}
                >
                  {approving ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Ionicons name="checkmark-circle" size={16} color="#000" />
                  )}
                  <Text style={styles.approveBtnText}>
                    {approving ? "Submitting…" : "Approve & Publish"}
                  </Text>
                </Pressable>

                {/* Revise */}
                <Pressable
                  style={[styles.reviseBtn, (revising || approving) && styles.btnDisabled]}
                  onPress={handleRevise}
                  disabled={revising || approving}
                >
                  {revising ? (
                    <ActivityIndicator size="small" color={C.text} />
                  ) : (
                    <Ionicons name="refresh" size={15} color={C.text} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviseBtnText}>
                      {revising ? "Requesting…" : "Request Revision"}
                    </Text>
                    <Text style={styles.reviseBtnSub}>
                      {nextRevisionFree ? "Free" : `${REVISION_TICKETS} tickets`}
                    </Text>
                  </View>
                </Pressable>
              </View>
            )}

            {status === "approved" && (
              <>
                <View style={styles.approvedBanner}>
                  <Ionicons name="checkmark-circle" size={18} color={C.accent} />
                  <Text style={styles.approvedText}>Approved and published</Text>
                </View>

                {/* Still allow revision on approved jobs */}
                <Pressable
                  style={[styles.reviseBtn, styles.reviseBtnFull, revising && styles.btnDisabled]}
                  onPress={handleRevise}
                  disabled={revising}
                >
                  {revising ? (
                    <ActivityIndicator size="small" color={C.text} />
                  ) : (
                    <Ionicons name="refresh" size={15} color={C.text} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviseBtnText}>
                      {revising ? "Requesting…" : "Request Another Revision"}
                    </Text>
                    <Text style={styles.reviseBtnSub}>
                      {nextRevisionFree ? "Free" : `${REVISION_TICKETS} tickets`}
                    </Text>
                  </View>
                </Pressable>
              </>
            )}

            <Pressable style={styles.newPlanBtn} onPress={() => router.replace("/ai-edit")}>
              <Ionicons name="add-circle-outline" size={15} color={C.textSec} />
              <Text style={styles.newPlanBtnText}>Create a New Edit Plan</Text>
            </Pressable>
          </>
        )}

        {/* ── Delivered ── */}
        {status === "delivered" && job.deliveredUrl && (
          <View style={styles.deliveredCard}>
            <View style={styles.deliveredHeader}>
              <Ionicons name="checkmark-circle" size={26} color="#22c55e" />
              <View style={{ flex: 1 }}>
                <Text style={styles.deliveredTitle}>Edited video delivered!</Text>
                {job.deliveredAt && (
                  <Text style={styles.deliveredDate}>
                    {new Date(job.deliveredAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                )}
              </View>
            </View>
            <Text style={styles.deliveredNote}>
              Your finished video is ready to download. The file will open in a new tab or start downloading automatically.
            </Text>
            <Pressable style={styles.downloadBtn} onPress={handleDownload}>
              <Ionicons name="download-outline" size={18} color="#000" />
              <Text style={styles.downloadBtnText}>Download Finished Video</Text>
            </Pressable>
            <Pressable style={styles.newPlanBtn} onPress={() => router.replace("/ai-edit")}>
              <Ionicons name="add-circle-outline" size={15} color={C.textSec} />
              <Text style={styles.newPlanBtnText}>Create a New Edit Plan</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

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

  // Status card
  statusCard: {
    margin: 16,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.borderDim,
    gap: 8,
  },
  statusTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: "700" },
  revisionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.amber + "22",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  revisionBadgeText: { color: C.amber, fontSize: 10, fontWeight: "700" },
  planInfoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  planTag: {
    backgroundColor: C.accent + "22",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  planTagText: { color: C.accent, fontSize: 11, fontWeight: "700" },
  planTagDetail: { color: C.textMuted, fontSize: 11 },
  ticketTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: C.surface3,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  ticketTagText: { color: C.textMuted, fontSize: 11 },
  statusPrompt: { color: C.text, fontSize: 13, fontWeight: "600", lineHeight: 20 },
  metaChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.surface3,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  metaChipText: { color: C.textMuted, fontSize: 11 },
  sourceInfo: { color: C.textMuted, fontSize: 11 },

  // Processing
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

  // Failed
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

  // EDL
  planHeader: { marginHorizontal: 16, marginBottom: 8, gap: 6 },
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
  edlContent: { flex: 1, padding: 12, gap: 5 },
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

  // Actions
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 16,
  },
  approveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.accent,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  approveBtnText: { color: "#000", fontSize: 14, fontWeight: "800" },
  reviseBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.borderDim,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
  },
  reviseBtnFull: {
    flex: 0,
    marginHorizontal: 16,
    marginTop: 10,
  },
  reviseBtnText: { color: C.text, fontSize: 13, fontWeight: "700" },
  reviseBtnSub: { color: C.textMuted, fontSize: 11 },
  btnDisabled: { opacity: 0.45 },

  // Approved
  approvedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.accent + "18",
    borderWidth: 1,
    borderColor: C.accent + "44",
  },
  approvedText: { color: C.accent, fontSize: 14, fontWeight: "700" },

  // Delivered
  deliveredCard: {
    margin: 16,
    backgroundColor: "#052e16", // dark green tint
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#22c55e44",
    padding: 16,
    gap: 12,
  },
  deliveredHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  deliveredTitle: { color: "#22c55e", fontSize: 16, fontWeight: "800" },
  deliveredDate: { color: "#86efac", fontSize: 12, marginTop: 2 },
  deliveredNote: { color: "#bbf7d0", fontSize: 13, lineHeight: 20 },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  downloadBtnText: { color: "#000", fontSize: 15, fontWeight: "800" },

  // New plan / ghost
  newPlanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
    paddingVertical: 10,
  },
  newPlanBtnText: { color: C.textSec, fontSize: 13, fontWeight: "600" },
  ghostBtn: {
    backgroundColor: C.surface,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: C.borderDim,
  },
  ghostBtnText: { color: C.text, fontSize: 14, fontWeight: "700" },
});
