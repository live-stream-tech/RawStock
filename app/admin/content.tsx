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

type AdminContent = {
  id: number;
  title: string;
  creator: string;
  hidden: boolean;
  visibility: string;
  price: number | null;
  createdAt?: string | null;
};

function isAdminRole(role?: string | null) {
  return (role ?? "").toUpperCase() === "ADMIN";
}

export default function AdminContentScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: contents = [], isLoading } = useQuery<AdminContent[]>({
    queryKey: ["/api/admin/content"],
    queryFn: () => apiRequest("GET", "/api/admin/content").then((r) => r.json() as Promise<AdminContent[]>),
    enabled: isAdminRole(user?.role),
  });

  const hideMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/admin/content/${id}`, { hidden: true });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/content"] }),
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed to hide content"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/admin/content/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/content"] }),
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed to delete content"),
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
          <Text style={styles.headerTitle}>Content</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView style={webScrollStyle(styles.scroll)} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
          {isLoading ? (
            <Text style={styles.messageText}>Loading...</Text>
          ) : contents.length === 0 ? (
            <Text style={styles.messageText}>No content found.</Text>
          ) : (
            contents.map((item) => (
              <View key={item.id} style={styles.card}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.meta}>Creator: {item.creator}</Text>
                <Text style={styles.meta}>Visibility: {item.visibility}</Text>
                <Text style={styles.meta}>Price: {item.price ? `¥${item.price.toLocaleString()}` : "Free"}</Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, item.hidden ? styles.badgeHidden : styles.badgePublic]}>
                    <Text style={styles.badgeText}>{item.hidden ? "HIDDEN" : "PUBLIC"}</Text>
                  </View>
                </View>
                <View style={styles.actions}>
                  <Pressable
                    style={[styles.actionBtn, styles.actionHide]}
                    disabled={hideMutation.isPending || item.hidden}
                    onPress={() => hideMutation.mutate(item.id)}
                  >
                    <Text style={styles.actionBtnText}>{item.hidden ? "Hidden" : "Hide"}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.actionDelete]}
                    disabled={deleteMutation.isPending}
                    onPress={() =>
                      Alert.alert("Delete Content", "This action cannot be undone.", [
                        { text: "Cancel", style: "cancel" },
                        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
                      ])
                    }
                  >
                    <Text style={styles.actionBtnText}>Delete</Text>
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
  title: { color: C.text, fontSize: 15, fontWeight: "700" },
  meta: { color: C.textMuted, fontSize: 12, marginTop: 3 },
  badgeRow: { flexDirection: "row", marginTop: 8 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  badgeHidden: { backgroundColor: "#ef444440" },
  badgePublic: { backgroundColor: "#22c55e40" },
  badgeText: { color: C.text, fontSize: 11, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  actionBtn: { flex: 1, borderRadius: 8, paddingVertical: 9, alignItems: "center" },
  actionHide: { backgroundColor: C.orange },
  actionDelete: { backgroundColor: C.live },
  actionBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  messageText: { color: C.textMuted, textAlign: "center" },
});
