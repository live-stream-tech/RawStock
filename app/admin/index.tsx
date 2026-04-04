import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { webScrollStyle } from "@/constants/layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { AuthGuard, useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/query-client";
import { C } from "@/constants/colors";

type AdminStats = {
  userCount: number;
  videoCount: number;
  salesLast30Days: number;
};

function isAdminRole(role?: string | null) {
  return (role ?? "").toUpperCase() === "ADMIN";
}

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: () => apiRequest("GET", "/api/admin/stats").then((r) => r.json() as Promise<AdminStats>),
    enabled: isAdminRole(user?.role),
  });

  if (!user || !isAdminRole(user.role)) {
    return (
      <AuthGuard>
        <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
          <Text style={styles.messageText}>This screen is accessible by administrators only.</Text>
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
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView style={webScrollStyle(styles.scroll)} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          <View style={styles.grid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Users</Text>
              <Text style={styles.statValue}>{isLoading ? "..." : (data?.userCount ?? 0).toLocaleString()}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Videos</Text>
              <Text style={styles.statValue}>{isLoading ? "..." : (data?.videoCount ?? 0).toLocaleString()}</Text>
            </View>
            <View style={styles.statCardWide}>
              <Text style={styles.statLabel}>Sales (Last 30 Days)</Text>
              <Text style={styles.statValue}>
                {isLoading ? "..." : `¥${(data?.salesLast30Days ?? 0).toLocaleString()}`}
              </Text>
            </View>
          </View>

          <View style={styles.menuCard}>
            <Pressable style={styles.menuRow} onPress={() => router.push("/admin/users")}>
              <Ionicons name="people-outline" size={18} color={C.accent} />
              <Text style={styles.menuLabel}>User Management</Text>
              <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.menuRow} onPress={() => router.push("/admin/content")}>
              <Ionicons name="film-outline" size={18} color={C.accent} />
              <Text style={styles.menuLabel}>Content Management</Text>
              <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.menuRow} onPress={() => router.push("/admin/reports")}>
              <Ionicons name="warning-outline" size={18} color={C.accent} />
              <Text style={styles.menuLabel}>Report Queue</Text>
              <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
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
  grid: { gap: 10 },
  statCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
  },
  statCardWide: {
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
  },
  statLabel: { color: C.textMuted, fontSize: 12 },
  statValue: { color: C.text, fontSize: 24, fontWeight: "700", marginTop: 4 },
  menuCard: {
    marginTop: 14,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  menuLabel: { flex: 1, color: C.text, fontWeight: "600" },
  divider: { height: 1, backgroundColor: C.border },
  messageText: { color: C.textMuted, textAlign: "center" },
});
