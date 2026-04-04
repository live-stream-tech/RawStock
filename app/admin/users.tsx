import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from "react-native";
import { webScrollStyle } from "@/constants/layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { AuthGuard, useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/query-client";
import { C } from "@/constants/colors";

type AdminUser = {
  id: number;
  displayName: string;
  email: string | null;
  role: string;
  isBanned: boolean;
  createdAt?: string | null;
};

function isAdminRole(role?: string | null) {
  return (role ?? "").toUpperCase() === "ADMIN";
}

export default function AdminUsersScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: () => apiRequest("GET", "/api/admin/users").then((r) => r.json() as Promise<AdminUser[]>),
    enabled: isAdminRole(user?.role),
  });

  const patchUser = useMutation({
    mutationFn: async (payload: { id: number; role?: "USER" | "ADMIN"; isBanned?: boolean }) => {
      const { id, ...body } = payload;
      const res = await apiRequest("PATCH", `/api/admin/users/${id}`, body);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users"] }),
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed to update user"),
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
          <Text style={styles.headerTitle}>Users</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView style={webScrollStyle(styles.scroll)} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
          {isLoading ? (
            <Text style={styles.messageText}>Loading...</Text>
          ) : users.length === 0 ? (
            <Text style={styles.messageText}>No users found.</Text>
          ) : (
            users.map((u) => (
              <View key={u.id} style={styles.card}>
                <Text style={styles.name}>{u.displayName}</Text>
                <Text style={styles.email}>{u.email ?? "-"}</Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, isAdminRole(u.role) ? styles.badgeAdmin : styles.badgeUser]}>
                    <Text style={styles.badgeText}>{isAdminRole(u.role) ? "ADMIN" : "USER"}</Text>
                  </View>
                  {u.isBanned && (
                    <View style={[styles.badge, styles.badgeBanned]}>
                      <Text style={styles.badgeText}>BANNED</Text>
                    </View>
                  )}
                </View>

                <View style={styles.actions}>
                  <Pressable
                    style={[styles.actionBtn, styles.actionRole]}
                    disabled={patchUser.isPending}
                    onPress={() => patchUser.mutate({ id: u.id, role: isAdminRole(u.role) ? "USER" : "ADMIN" })}
                  >
                    <Text style={styles.actionBtnText}>{isAdminRole(u.role) ? "Set USER" : "Set ADMIN"}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.actionBan]}
                    disabled={patchUser.isPending}
                    onPress={() => patchUser.mutate({ id: u.id, isBanned: !u.isBanned })}
                  >
                    <Text style={styles.actionBtnText}>{u.isBanned ? "Unban" : "Ban"}</Text>
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
  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  name: { color: C.text, fontSize: 15, fontWeight: "700" },
  email: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  badgeRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  badgeAdmin: { backgroundColor: "#3b82f640" },
  badgeUser: { backgroundColor: C.surface2 },
  badgeBanned: { backgroundColor: "#ef444440" },
  badgeText: { color: C.text, fontSize: 11, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  actionBtn: { flex: 1, borderRadius: 8, paddingVertical: 9, alignItems: "center" },
  actionRole: { backgroundColor: C.accent },
  actionBan: { backgroundColor: C.orange },
  actionBtnText: { color: "#050505", fontSize: 12, fontWeight: "700" },
  messageText: { color: C.textMuted, textAlign: "center" },
});
