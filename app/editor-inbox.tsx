import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/constants/colors";
import { F } from "@/constants/fonts";
import { useAuth } from "@/lib/auth";
import { getQueryFn } from "@/lib/query-client";
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { webScrollStyle } from "@/constants/layout";

type EditRequest = {
  id: number;
  editorId: number;
  requesterId: string;
  requesterName: string;
  title: string;
  description: string;
  priceType: string;
  budget: number | null;
  deadline: string | null;
  createdAt: string;
};

function priceLabel(req: EditRequest): string {
  if (req.priceType === "per_minute") {
    return req.budget != null ? `${req.budget} tickets/min` : "Per minute";
  }
  if (req.priceType === "revenue_share") {
    return req.budget != null ? `${req.budget}% rev share` : "Revenue share";
  }
  return req.priceType;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function EditorInboxScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data: requests = [], isLoading, refetch } = useQuery<EditRequest[]>({
    queryKey: ["/api/editors/me/requests"],
    enabled: !!user,
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 16 }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Requests</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.accent} />
        </View>
      ) : (
        <ScrollView
          style={webScrollStyle(styles.scroll)}
          showsVerticalScrollIndicator={scrollShowsVertical}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        >
          {requests.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="mail-outline" size={40} color={C.textMuted} />
              <Text style={styles.emptyText}>No requests yet</Text>
              <Text style={styles.emptySubtext}>When creators send you edit requests they will appear here.</Text>
            </View>
          ) : (
            requests.map((req) => (
              <View key={req.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{req.title}</Text>
                  <Text style={styles.cardTime}>{timeAgo(req.createdAt)}</Text>
                </View>

                <Text style={styles.cardFrom}>From: {req.requesterName}</Text>

                <Text style={styles.cardDesc} numberOfLines={3}>{req.description}</Text>

                <View style={styles.cardMeta}>
                  <View style={styles.metaChip}>
                    <Ionicons name="ticket-outline" size={12} color={C.accent} />
                    <Text style={styles.metaChipText}>{priceLabel(req)}</Text>
                  </View>
                  {req.deadline ? (
                    <View style={styles.metaChip}>
                      <Ionicons name="calendar-outline" size={12} color={C.textSec} />
                      <Text style={[styles.metaChipText, { color: C.textSec }]}>{req.deadline}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.borderDim,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: C.text,
    fontSize: 16,
    fontWeight: "600",
  },
  scroll: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyText: {
    color: C.text,
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubtext: {
    color: C.textMuted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: C.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderDim,
    padding: 14,
    gap: 6,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    color: C.text,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  cardTime: {
    color: C.textMuted,
    fontSize: 11,
    fontFamily: F.mono,
    flexShrink: 0,
  },
  cardFrom: {
    color: C.textSec,
    fontSize: 12,
  },
  cardDesc: {
    color: C.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  cardMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.surface,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metaChipText: {
    color: C.accent,
    fontSize: 11,
    fontFamily: F.mono,
  },
});
