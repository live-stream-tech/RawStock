import React, { useState } from "react";
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
import { scrollShowsHorizontal, scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { C } from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/lib/auth";
import { webScrollStyle } from "@/constants/layout";

type ReportItem = {
  id: number;
  contentType: string;
  contentId: number;
  reason: string;
  aiVerdict: string;
  status: string;
  createdAt: string;
};

type AdItem = {
  id: number;
  companyName: string;
  bannerUrl: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
};

type JukeboxItem = {
  id: number;
  videoTitle: string;
  addedBy: string;
  isPlayed: boolean;
};

type StaffData = {
  adminId: number | null;
  ownerId: number | null;
  admin: { id: number; displayName: string } | null;
  moderatorIds: number[];
};

export default function CommunityAdminScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const communityId = Number(id);
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { user, requireAuth } = useAuth();
  const qc = useQueryClient();
  const [actioningReportId, setActioningReportId] = useState<number | null>(null);

  const { data: staffData } = useQuery<StaffData>({
    queryKey: [`/api/communities/${communityId}/staff`],
    enabled: communityId > 0,
  });
  const isAdmin = !!staffData?.adminId && user?.id === staffData.adminId;
  const isOwner = !!staffData?.ownerId && user?.id === staffData.ownerId;
  const isMod = staffData?.moderatorIds?.includes(user?.id ?? 0) ?? false;
  const canAccess = isAdmin || isMod;

  const { data: reports = [], isLoading: reportsLoading } = useQuery<ReportItem[]>({
    queryKey: [`/api/communities/${communityId}/admin/reports`],
    enabled: canAccess && communityId > 0,
  });
  const { data: ads = [] } = useQuery<AdItem[]>({
    queryKey: [`/api/communities/${communityId}/admin/ads`],
    enabled: canAccess && communityId > 0,
  });
  const { data: jukeboxQueue = [], refetch: refetchJukebox } = useQuery<JukeboxItem[]>({
    queryKey: [`/api/communities/${communityId}/admin/jukebox-queue`],
    enabled: canAccess && communityId > 0,
  });

  async function handleReportHide(reportId: number) {
    if (!requireAuth("Hide")) return;
    setActioningReportId(reportId);
    try {
      await apiRequest("PATCH", `/api/communities/${communityId}/admin/reports/${reportId}/hide`);
      qc.invalidateQueries({ queryKey: [`/api/communities/${communityId}/admin/reports`] });
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Action failed");
    } finally {
      setActioningReportId(null);
    }
  }

  async function handleJukeboxRemove(itemId: number) {
    if (!requireAuth("Remove")) return;
    try {
      await apiRequest("DELETE", `/api/communities/${communityId}/admin/jukebox-queue/${itemId}`);
      refetchJukebox();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to remove");
    }
  }

  async function handleDeleteCommunity() {
    if (!requireAuth("Delete")) return;
    Alert.alert(
      "Delete Community",
      "Deleting this community will permanently remove all members, threads, polls, jukebox data, and cannot be undone. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiRequest("DELETE", `/api/communities/${communityId}`);
              qc.invalidateQueries({ queryKey: ["/api/communities"] });
              qc.invalidateQueries({ queryKey: ["/api/communities/me"] });
              router.replace("/(tabs)/community");
            } catch (e: any) {
              let errMsg = "Failed to delete";
              if (e?.body) {
                try {
                  const j = JSON.parse(e.body);
                  if (j.error) errMsg = j.error;
                } catch {}
              } else if (e?.message) errMsg = e.message;
              Alert.alert("Error", errMsg);
            }
          },
        },
      ]
    );
  }

  async function handleReportDismiss(reportId: number) {
    if (!requireAuth("Close")) return;
    setActioningReportId(reportId);
    try {
      await apiRequest("PATCH", `/api/communities/${communityId}/admin/reports/${reportId}/dismiss`);
      qc.invalidateQueries({ queryKey: [`/api/communities/${communityId}/admin/reports`] });
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Action failed");
    } finally {
      setActioningReportId(null);
    }
  }

  const pendingReports = reports.filter((r) => r.status === "pending" || r.aiVerdict === "gray_zone");

  if (!canAccess && staffData) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={C.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.denied}>
          <Text style={styles.deniedText}>Access restricted to admins and moderators</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Community Admin</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={webScrollStyle(styles.scroll)} showsVerticalScrollIndicator={scrollShowsVertical}>
        <Pressable
          style={styles.section}
          onPress={() => router.push(`/community/${communityId}`)}
        >
          <Ionicons name="people-outline" size={22} color={C.accent} />
          <View style={styles.sectionBody}>
            <Text style={styles.sectionTitle}>Staff Settings</Text>
            <Text style={styles.sectionSub}>Edit admin and moderators</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
        </Pressable>

        <Pressable
          style={styles.section}
          onPress={() => router.push(`/community/ad-review`)}
        >
          <Ionicons name="megaphone-outline" size={22} color={C.accent} />
          <View style={styles.sectionBody}>
            <Text style={styles.sectionTitle}>Ad Review</Text>
            <Text style={styles.sectionSub}>Approve or reject ad applications</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
        </Pressable>

        <View style={styles.sectionBlock}>
          <Text style={styles.blockTitle}>Ad Schedule</Text>
          {ads.length === 0 ? (
            <Text style={styles.emptyText}>No approved ads</Text>
          ) : (
            ads.map((ad) => (
              <View key={ad.id} style={styles.adRow}>
                <Text style={styles.adCompany}>{ad.companyName}</Text>
                <Text style={styles.adDates}>
                  {ad.startDate} – {ad.endDate}
                </Text>
                <Text style={styles.adAmount}>🎟{ad.totalAmount.toLocaleString()}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.blockTitle}>Jukebox Queue</Text>
          {jukeboxQueue.length === 0 ? (
            <Text style={styles.emptyText}>No videos in queue</Text>
          ) : (
            jukeboxQueue.slice(0, 10).map((item) => (
              <View key={item.id} style={styles.jukeRow}>
                <Text style={styles.jukeTitle} numberOfLines={1}>{item.videoTitle}</Text>
                <Text style={styles.jukeMeta}>Added by {item.addedBy}</Text>
                {!item.isPlayed && (
                  <Pressable
                    style={styles.jukeRemoveBtn}
                    onPress={() => Alert.alert("Remove", "Remove this video from the queue?", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Remove", style: "destructive", onPress: () => handleJukeboxRemove(item.id) },
                    ])}
                  >
                    <Ionicons name="trash-outline" size={14} color={C.live} />
                    <Text style={styles.jukeRemoveText}>Remove</Text>
                  </Pressable>
                )}
              </View>
            ))
          )}
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.blockTitle}>Reports</Text>
          {reportsLoading ? (
            <ActivityIndicator color={C.accent} style={{ marginVertical: 16 }} />
          ) : pendingReports.length === 0 ? (
            <Text style={styles.emptyText}>No reports awaiting action</Text>
          ) : (
            pendingReports.map((r) => (
              <View key={r.id} style={styles.reportRow}>
                <View style={styles.reportBody}>
                  <Text style={styles.reportType}>
                    {r.contentType === "video" ? "Video" : "Comment"} #{r.contentId}
                  </Text>
                  <Text style={styles.reportReason}>Reason: {r.reason} / AI: {r.aiVerdict}</Text>
                </View>
                <View style={styles.reportActions}>
                  <Pressable
                    style={[styles.reportBtn, styles.reportBtnHide]}
                    onPress={() => handleReportHide(r.id)}
                    disabled={actioningReportId === r.id}
                  >
                    {actioningReportId === r.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.reportBtnText}>Hide</Text>
                    )}
                  </Pressable>
                  <Pressable
                    style={[styles.reportBtn, styles.reportBtnDismiss]}
                    onPress={() => handleReportDismiss(r.id)}
                    disabled={actioningReportId === r.id}
                  >
                    <Text style={styles.reportBtnDismissText}>No Issue</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>

        {isOwner && (
          <View style={styles.sectionBlock}>
            <Text style={[styles.blockTitle, { color: C.live }]}>Danger Zone</Text>
            <Pressable style={styles.dangerBtn} onPress={handleDeleteCommunity}>
              <Ionicons name="trash-outline" size={18} color={C.live} />
              <Text style={styles.dangerBtnText}>Delete Community</Text>
            </Pressable>
          </View>
        )}

        <View style={{ height: 40 }} />
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
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: C.text, fontSize: 17, fontWeight: "700" },
  denied: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  deniedText: { color: C.textMuted, fontSize: 14 },
  scroll: { flex: 1 },
  section: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
  },
  sectionBody: { flex: 1 },
  sectionTitle: { color: C.text, fontSize: 15, fontWeight: "700" },
  sectionSub: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  sectionBlock: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  blockTitle: { color: C.text, fontSize: 15, fontWeight: "700", marginBottom: 12 },
  emptyText: { color: C.textMuted, fontSize: 13, paddingVertical: 8 },
  adRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  adCompany: { color: C.text, fontSize: 14, fontWeight: "600", flex: 1 },
  adDates: { color: C.textSec, fontSize: 12 },
  adAmount: { color: C.textMuted, fontSize: 12 },
  reportRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 8,
  },
  reportBody: { gap: 4 },
  reportType: { color: C.text, fontSize: 13, fontWeight: "600" },
  reportReason: { color: C.textMuted, fontSize: 11 },
  reportActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  reportBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reportBtnHide: { backgroundColor: C.live },
  reportBtnDismiss: { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border },
  reportBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  reportBtnDismissText: { color: C.textSec, fontSize: 12, fontWeight: "600" },
  jukeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  jukeTitle: { color: C.text, fontSize: 13, flex: 1 },
  jukeMeta: { color: C.textMuted, fontSize: 11 },
  jukeRemoveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  jukeRemoveText: { color: C.live, fontSize: 11, fontWeight: "600" },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,80,80,0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,80,80,0.3)",
  },
  dangerBtnText: { color: C.live, fontSize: 14, fontWeight: "700" },
});
