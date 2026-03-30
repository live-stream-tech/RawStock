import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Platform, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { C } from "@/constants/colors";
import { useAuth, AuthGuard } from "@/lib/auth";
import { apiRequest } from "@/lib/query-client";

type Concert = {
  id: number;
  title: string;
  venueName: string;
  concertDate: string;
};

export default function ConcertStaffRequestScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { user } = useAuth();
  const [query, setQuery] = useState("");

  const { data: concerts = [], isLoading } = useQuery<Concert[]>({
    queryKey: ["/api/concerts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/concerts");
      return res.json();
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return concerts;
    return concerts.filter((c) => c.title.includes(q) || c.venueName.includes(q));
  }, [concerts, query]);

  const handleRequest = async (concertId: number) => {
    try {
      await apiRequest("POST", `/api/concerts/${concertId}/staff-request`, {});
      Alert.alert("Request Sent", "Waiting for artist approval.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Request failed");
    }
  };

  return (
    <AuthGuard>
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Official Staff Request</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.searchBox}>
          <Text style={styles.searchLabel}>Search events</Text>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by event name or venue"
            placeholderTextColor={C.textMuted}
          />
        </View>

        {isLoading ? (
          <View style={[styles.centered, { flex: 1 }]}>
            <ActivityIndicator size="large" color={C.accent} />
          </View>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {filtered.length === 0 ? (
              <Text style={styles.emptyText}>No matching events found.</Text>
            ) : (
              filtered.map((c) => (
                <View key={c.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{c.title}</Text>
                  <Text style={styles.cardMeta}>{c.venueName}</Text>
                  <Text style={styles.cardMeta}>{c.concertDate}</Text>
                  <Pressable style={styles.requestBtn} onPress={() => handleRequest(c.id)}>
                    <Text style={styles.requestBtnText}>Request Official Staff</Text>
                  </Pressable>
                </View>
              ))
            )}
            <View style={{ height: 32 }} />
          </ScrollView>
        )}
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
  headerTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  searchBox: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchLabel: { fontSize: 12, color: C.textMuted, marginBottom: 4 },
  searchInput: {
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 14,
    color: C.text,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
  centered: { justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 13, color: C.textMuted, marginTop: 16 },
  card: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 4 },
  cardMeta: { fontSize: 12, color: C.textSec },
  requestBtn: {
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.accent,
    alignItems: "center",
  },
  requestBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});

