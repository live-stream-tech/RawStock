import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { scrollShowsHorizontal, scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { apiRequest } from "@/lib/query-client";
import { C } from "@/constants/colors";
import { webScrollStyle } from "@/constants/layout";

type Notif = {
  id: number;
  type: "purchase" | "follow" | "comment" | "live";
  title: string;
  body: string;
  amount: number | null;
  avatar: string | null;
  thumbnail: string | null;
  isRead: boolean;
  timeAgo: string;
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "purchase", label: "Purchases" },
  { id: "follow", label: "Following" },
  { id: "comment", label: "Comments" },
];

const TYPE_ICON: Record<string, { name: string; color: string; bg: string }> = {
  purchase: { name: "cash", color: "#fff", bg: C.green },
  follow: { name: "person-add", color: "#fff", bg: C.accent },
  comment: { name: "chatbubble", color: "#fff", bg: C.orange },
  live:    { name: "trophy", color: "#fff", bg: "#7C4DFF" },
};

function NotifItem({ item, onRead }: { item: Notif; onRead: (id: number) => void }) {
  const icon = TYPE_ICON[item.type] ?? TYPE_ICON.purchase;
  const revenue = item.amount !== null ? Math.floor(item.amount) : null;

  return (
    <Pressable
      style={[styles.item, !item.isRead && styles.itemUnread]}
      onPress={() => onRead(item.id)}
    >
      {!item.isRead && <View style={styles.unreadBar} />}

      <View style={styles.itemLeft}>
        <View style={styles.avatarWrap}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: icon.bg }]}>
              <Ionicons name={icon.name as any} size={20} color="#fff" />
            </View>
          )}
          <View style={[styles.typeIcon, { backgroundColor: icon.bg }]}>
            <Ionicons name={icon.name as any} size={9} color="#fff" />
          </View>
        </View>
      </View>

      <View style={styles.itemBody}>
        <Text style={[styles.itemTitle, !item.isRead && styles.itemTitleUnread]} numberOfLines={1}>
          {item.title}
        </Text>

        {item.type === "purchase" && revenue !== null ? (
          <View style={styles.purchaseRow}>
            <View style={styles.videoThumbWrap}>
              {item.thumbnail && (
                <Image source={{ uri: item.thumbnail }} style={styles.videoThumb} contentFit="cover" />
              )}
            </View>
            <View style={styles.purchaseInfo}>
              <Text style={styles.videoTitle} numberOfLines={1}>「{item.body}」</Text>
              <View style={styles.revenueBox}>
                <Ionicons name="cash-outline" size={12} color={C.green} />
                <Text style={styles.revenueAmount}>🎟{revenue.toLocaleString()}</Text>
                <Text style={styles.revenueLabel}>received</Text>
              </View>
            </View>
          </View>
        ) : (
          <Text style={styles.itemBodyText} numberOfLines={2}>{item.body}</Text>
        )}

        <Text style={styles.time}>{item.timeAgo}</Text>
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { filter: filterParam } = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState(filterParam ?? "all");

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : 0;

  const { data: notifs = [] } = useQuery<Notif[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30_000,
  });

  const filteredNotifs = filter === "all"
    ? notifs
    : notifs.filter((n) => n.type === filter);

  const unreadCount = notifs.filter((n) => !n.isRead).length;

  const readMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const readAllMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notifications/read-all"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const totalRevenue = notifs
    .filter((n) => n.type === "purchase" && n.amount !== null)
    .reduce((sum, n) => sum + (n.amount ?? 0), 0);

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <Pressable style={styles.readAllBtn} onPress={() => readAllMutation.mutate()}>
            <Text style={styles.readAllText}>Mark all read</Text>
          </Pressable>
        ) : (
          <View style={{ width: 64 }} />
        )}
      </View>

      {/* Revenue summary card */}
      {totalRevenue > 0 && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <Ionicons name="wallet-outline" size={20} color={C.green} />
            <View>
              <Text style={styles.summaryLabel}>Today's Revenue</Text>
              <Text style={styles.summaryAmount}>🎟{totalRevenue.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount} unread</Text>
          </View>
        </View>
      )}

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={scrollShowsHorizontal}
        contentContainerStyle={styles.filterScroll}
        style={styles.filterScrollView}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.id}
            style={[styles.filterPill, filter === f.id && styles.filterPillActive]}
            onPress={() => setFilter(f.id)}
          >
            <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>
              {f.label}
            </Text>
            {f.id === "purchase" && (
              <Text style={[styles.filterCount, filter === f.id && styles.filterCountActive]}>
                {notifs.filter((n) => n.type === "purchase").length}
              </Text>
            )}
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={webScrollStyle(styles.scroll)} showsVerticalScrollIndicator={scrollShowsVertical}>
        {filteredNotifs.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={40} color={C.textMuted} />
            <Text style={styles.emptyText}>No notifications</Text>
          </View>
        ) : (
          filteredNotifs.map((item) => (
            <NotifItem
              key={item.id}
              item={item}
              onRead={(id) => { if (!item.isRead) readMutation.mutate(id); }}
            />
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
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
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: C.text, fontSize: 18, fontWeight: "800" },
  readAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: C.surface,
    borderRadius: 8,
  },
  readAllText: { color: C.accent, fontSize: 12, fontWeight: "600" },

  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.green + "44",
  },
  summaryLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  summaryLabel: { color: C.textMuted, fontSize: 11, marginBottom: 2 },
  summaryAmount: { color: C.green, fontSize: 20, fontWeight: "800" },
  unreadBadge: {
    backgroundColor: C.live + "22",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  unreadBadgeText: { color: C.live, fontSize: 11, fontWeight: "600" },

  filterScrollView: { flexGrow: 0, marginBottom: 4 },
  filterScroll: { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterPillActive: { backgroundColor: C.accent, borderColor: C.accent },
  filterText: { color: C.textSec, fontSize: 13, fontWeight: "600" },
  filterTextActive: { color: "#fff" },
  filterCount: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: "700",
    backgroundColor: C.surface3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  filterCountActive: { color: C.accent, backgroundColor: "rgba(255,255,255,0.2)" },

  scroll: { flex: 1 },

  item: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    position: "relative",
  },
  itemUnread: { backgroundColor: C.surface + "66" },
  unreadBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: C.accent,
    borderRadius: 2,
  },
  itemLeft: {},
  avatarWrap: { position: "relative", width: 48, height: 48 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  typeIcon: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: C.bg,
  },
  itemBody: { flex: 1, gap: 4 },
  itemTitle: { color: C.textSec, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  itemTitleUnread: { color: C.text, fontWeight: "700" },
  itemBodyText: { color: C.textMuted, fontSize: 12, lineHeight: 17 },

  purchaseRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  videoThumbWrap: { flexShrink: 0 },
  videoThumb: { width: 44, height: 44, borderRadius: 6 },
  purchaseInfo: { flex: 1, gap: 3 },
  videoTitle: { color: C.textSec, fontSize: 12 },
  revenueBox: { flexDirection: "row", alignItems: "center", gap: 4 },
  revenueAmount: { color: C.green, fontSize: 15, fontWeight: "800" },
  revenueLabel: { color: C.textMuted, fontSize: 11 },

  time: { color: C.textMuted, fontSize: 11 },

  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { color: C.textMuted, fontSize: 14 },
});
