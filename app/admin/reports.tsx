import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useAuth, AuthGuard } from "@/lib/auth";
import { apiRequest } from "@/lib/query-client";
import { C } from "@/constants/colors";

type Report = {
  id: number;
  reporterId: number;
  contentType: "video" | "comment";
  contentId: number;
  reason: string;
  aiVerdict: "clear_violation" | "gray_zone" | "no_violation";
  aiReason?: string | null;
  status: "pending" | "hidden" | "reviewed";
  createdAt: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  const h = `${d.getHours()}`.padStart(2, "0");
  const min = `${d.getMinutes()}`.padStart(2, "0");
  return `${y}/${m}/${day} ${h}:${min}`;
}

export default function AdminReportsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const qc = useQueryClient();

  if (!user || (user.role !== "ADMIN" && user.role !== "admin")) {
    return (
      <AuthGuard>
        <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
          <View style={styles.header}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color={C.text} />
            </Pressable>
            <Text style={styles.headerTitle}>Reports</Text>
            <View style={{ width: 36 }} />
          </View>
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>This screen is accessible by administrators only.</Text>
          </View>
        </View>
      </AuthGuard>
    );
  }

  const { data: reports = [], isLoading } = useQuery<Report[]>({
    queryKey: ["/api/admin/reports"],
    queryFn: () => apiRequest("GET", "/api/admin/reports").then((r) => r.json() as Promise<Report[]>),
  });

  const handleHide = async (id: number) => {
    try {
      await apiRequest("PATCH", `/api/admin/reports/${id}/hide`);
      qc.invalidateQueries({ queryKey: ["/api/admin/reports"] });
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to hide");
    }
  };

  const handleDismiss = async (id: number) => {
    try {
      await apiRequest("PATCH", `/api/admin/reports/${id}/dismiss`);
      qc.invalidateQueries({ queryKey: ["/api/admin/reports"] });
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to update");
    }
  };

  const verdictLabel = (v: Report["aiVerdict"]) => {
    if (v === "gray_zone") return "Gray Zone";
    if (v === "no_violation") return "No Violation";
    return "Clear Violation";
  };

  const statusLabel = (s: Report["status"]) => {
    if (s === "hidden") return "Hidden";
    if (s === "reviewed") return "Reviewed";
    return "Pending";
  };

  const reasonLabel = (r: string) => {
    if (r === "spam") return "Spam";
    if (r === "harassment") return "Harassment";
    if (r === "inappropriate") return "Inappropriate Content";
    if (r === "other") return "Other";
    return r;
  };

  return (
    <AuthGuard>
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Reports</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
          {isLoading ? (
            <Text style={styles.messageText}>Loading...</Text>
          ) : reports.length === 0 ? (
            <Text style={styles.messageText}>No pending reports at this time.</Text>
          ) : (
            reports.map((r) => (
              <View key={r.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardDate}>{formatDate(r.createdAt)}</Text>
                  <View style={styles.badgeRow}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{r.contentType === "video" ? "Video" : "Comment"}</Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        r.aiVerdict === "gray_zone" ? styles.badgeGray : r.aiVerdict === "no_violation" ? styles.badgeSafe : styles.badgeDanger,
                      ]}
                    >
                      <Text style={styles.badgeText}>{verdictLabel(r.aiVerdict)}</Text>
                    </View>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>{statusLabel(r.status)}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Reason</Text>
                  <Text style={styles.rowValue}>{reasonLabel(r.reason)}</Text>
                </View>
                {r.aiReason ? (
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>AI Note</Text>
                    <Text style={styles.rowValue}>{r.aiReason}</Text>
                  </View>
                ) : null}
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Content</Text>
                  <Text style={styles.rowValue}>
                    {r.contentType} #{r.contentId}
                  </Text>
                </View>

                <View style={styles.actionsRow}>
                  <Pressable
                    style={[styles.actionBtn, styles.hideBtn, r.status === "hidden" && styles.actionDisabled]}
                    disabled={r.status === "hidden"}
                    onPress={() => handleHide(r.id)}
                  >
                    <Ionicons name="eye-off-outline" size={16} color="#fff" />
                    <Text style={styles.actionText}>Hide</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.okBtn, r.status === "reviewed" && styles.actionDisabled]}
                    disabled={r.status === "reviewed"}
                    onPress={() => handleDismiss(r.id)}
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color="#050505" />
                    <Text style={[styles.actionText, styles.okText]}>No Issue</Text>
                  </Pressable>
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
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
    letterSpacing: 0.5,
  },
  scroll: {
    flex: 1,
  },
  messageBox: {
    marginTop: 40,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  messageText: {
    fontSize: 14,
    color: C.textSec,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginTop: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardDate: {
    fontSize: 12,
    color: C.textMuted,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: C.surface2,
  },
  badgeGray: {
    backgroundColor: "#37474F",
  },
  badgeSafe: {
    backgroundColor: "#1B5E20",
  },
  badgeDanger: {
    backgroundColor: "#B71C1C",
  },
  badgeText: {
    fontSize: 11,
    color: "#fff",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  statusPillText: {
    fontSize: 11,
    color: C.textMuted,
  },
  row: {
    flexDirection: "row",
    marginTop: 4,
  },
  rowLabel: {
    width: 78,
    fontSize: 12,
    color: C.textMuted,
  },
  rowValue: {
    flex: 1,
    fontSize: 13,
    color: C.textSec,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  hideBtn: {
    backgroundColor: C.live,
  },
  okBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: C.border,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  actionText: {
    fontSize: 12,
    color: "#FFFFFF",
  },
  okText: {
    color: "#050505",
  },
});
