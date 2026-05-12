import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { webScrollStyle } from "@/constants/layout";
import { C } from "@/constants/colors";
import { AuthGuard, useAuth } from "@/lib/auth";
import { alertError } from "@/lib/alertCompat";
import { apiRequest } from "@/lib/query-client";

type BugReport = {
  id: number;
  userId: number | null;
  title: string;
  description: string;
  expectedBehavior: string | null;
  actualBehavior: string | null;
  route: string | null;
  sessionId: string | null;
  platform: string | null;
  userAgent: string | null;
  payloadJson: string | null;
  status: "open" | "reviewing" | "resolved";
  resolvedAt: string | null;
  resolvedBy: number | null;
  createdAt: string | null;
};

type StatusFilter = "all" | "open" | "reviewing" | "resolved";

function isAdminRole(role?: string | null) {
  return (role ?? "").toUpperCase() === "ADMIN";
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  const h = `${d.getHours()}`.padStart(2, "0");
  const min = `${d.getMinutes()}`.padStart(2, "0");
  return `${y}/${m}/${day} ${h}:${min}`;
}

export default function AdminBugReportsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const isAdmin = isAdminRole(user?.role);

  const { data: reports = [], isLoading } = useQuery<BugReport[]>({
    queryKey: ["/api/admin/bug-reports", statusFilter],
    queryFn: () =>
      apiRequest(
        "GET",
        `/api/admin/bug-reports?limit=100${statusFilter !== "all" ? `&status=${statusFilter}` : ""}`,
      ).then((r) => r.json() as Promise<BugReport[]>),
    enabled: isAdmin,
  });

  const patchMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: BugReport["status"] }) => {
      const res = await apiRequest("PATCH", `/api/admin/bug-reports/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/bug-reports"] });
    },
    onError: (err) => {
      alertError("Bug reports", err, "Failed to update bug report status.");
    },
  });

  if (!user || !isAdmin) {
    return (
      <AuthGuard>
        <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
          <View style={styles.header}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color={C.text} />
            </Pressable>
            <Text style={styles.headerTitle}>Bug Reports</Text>
            <View style={{ width: 36 }} />
          </View>
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>This screen is accessible by administrators only.</Text>
          </View>
        </View>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Bug Reports</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          style={webScrollStyle(styles.scroll)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {(["all", "open", "reviewing", "resolved"] as const).map((status) => (
              <Pressable
                key={status}
                style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
                onPress={() => setStatusFilter(status)}
              >
                <Text style={[styles.filterChipText, statusFilter === status && styles.filterChipTextActive]}>
                  {status === "all" ? "All" : status[0].toUpperCase() + status.slice(1)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {isLoading ? (
            <Text style={styles.messageText}>Loading...</Text>
          ) : reports.length === 0 ? (
            <Text style={styles.messageText}>No bug reports found.</Text>
          ) : (
            reports.map((report) => (
              <View key={report.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{report.title}</Text>
                  <View style={[styles.statusBadge, styles[`status_${report.status}` as keyof typeof styles] as object]}>
                    <Text style={styles.statusBadgeText}>{report.status.toUpperCase()}</Text>
                  </View>
                </View>

                <Text style={styles.metaText}>
                  {formatDateTime(report.createdAt)} · user {report.userId ?? "anon"} · {report.platform ?? "-"}
                </Text>
                {report.route ? <Text style={styles.metaText}>Route: {report.route}</Text> : null}

                <Text style={styles.sectionLabel}>Description</Text>
                <Text style={styles.bodyText}>{report.description}</Text>

                {report.expectedBehavior ? (
                  <>
                    <Text style={styles.sectionLabel}>Expected</Text>
                    <Text style={styles.bodyText}>{report.expectedBehavior}</Text>
                  </>
                ) : null}

                {report.actualBehavior ? (
                  <>
                    <Text style={styles.sectionLabel}>Actual</Text>
                    <Text style={styles.bodyText}>{report.actualBehavior}</Text>
                  </>
                ) : null}

                {report.payloadJson ? (
                  <>
                    <Text style={styles.sectionLabel}>Attached Context</Text>
                    <Text style={styles.codeBlock}>{report.payloadJson}</Text>
                  </>
                ) : null}

                <View style={styles.actionRow}>
                  {(["open", "reviewing", "resolved"] as const).map((status) => (
                    <Pressable
                      key={status}
                      style={[
                        styles.actionBtn,
                        report.status === status && styles.actionBtnActive,
                      ]}
                      disabled={patchMutation.isPending || report.status === status}
                      onPress={() => patchMutation.mutate({ id: report.id, status })}
                    >
                      <Text
                        style={[
                          styles.actionBtnText,
                          report.status === status && styles.actionBtnTextActive,
                        ]}
                      >
                        {status[0].toUpperCase() + status.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))
          )}
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
  filterRow: { gap: 8, paddingBottom: 12 },
  filterChip: {
    borderWidth: 1,
    borderColor: C.borderDim,
    backgroundColor: C.surface,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterChipActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  filterChipText: { color: C.text, fontSize: 12, fontWeight: "700" },
  filterChipTextActive: { color: C.bg },
  messageBox: {
    marginTop: 40,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  messageText: { color: C.textMuted, textAlign: "center" },
  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: { flex: 1, color: C.text, fontSize: 15, fontWeight: "700" },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  status_open: { backgroundColor: "#ef444433" },
  status_reviewing: { backgroundColor: "#f59e0b33" },
  status_resolved: { backgroundColor: "#10b98133" },
  statusBadgeText: { color: C.text, fontSize: 10, fontWeight: "800" },
  metaText: { color: C.textMuted, fontSize: 12, marginTop: 6 },
  sectionLabel: { color: C.text, fontSize: 12, fontWeight: "700", marginTop: 12, marginBottom: 4 },
  bodyText: { color: C.textSec, fontSize: 13, lineHeight: 19 },
  codeBlock: {
    color: C.textMuted,
    fontSize: 11,
    lineHeight: 16,
    backgroundColor: C.surface2,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.borderDim,
    backgroundColor: C.surface2,
    paddingVertical: 9,
  },
  actionBtnActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  actionBtnText: { color: C.text, fontSize: 12, fontWeight: "700" },
  actionBtnTextActive: { color: C.bg },
});
