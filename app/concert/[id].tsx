import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Platform, ActivityIndicator, Alert, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { C } from "@/constants/colors";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/query-client";

type Concert = {
  id: number;
  artistUserId: number;
  title: string;
  venueName: string;
  venueAddress: string;
  concertDate: string;
  ticketUrl?: string | null;
  shootingAllowed: boolean;
  shootingNotes?: string | null;
  artistShare: number;
  photographerShare: number;
  editorShare: number;
  venueShare: number;
  status: string;
};

type StaffRow = {
  id: number;
  concertId: number;
  artistUserId: number;
  staffUserId: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

function GuestBanner() {
  return (
    <Pressable
      style={styles.guestBanner}
      onPress={() => router.push("/auth/login" as any)}
    >
      <Ionicons name="information-circle-outline" size={15} color="#E8A020" />
      <Text style={styles.guestBannerText}>
        Viewing as guest. Login required to purchase tickets or upload.
      </Text>
      <Text style={styles.guestBannerLink}>Log in</Text>
    </Pressable>
  );
}

export default function ConcertDetailScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { id } = useLocalSearchParams<{ id: string }>();
  const numericId = Number(id);
  const { user, requireAuth } = useAuth();
  const qc = useQueryClient();

  const { data: concert, isLoading } = useQuery<Concert | null>({
    queryKey: [`/api/concerts/${numericId}`],
    enabled: !Number.isNaN(numericId),
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/concerts/${numericId}`);
      return res.json();
    },
  });

  const isArtist = !!user && !!concert && user.id === concert.artistUserId;

  const { data: staffRequests = [], isLoading: loadingStaff } = useQuery<StaffRow[]>({
    queryKey: [`/api/concerts/${numericId}/staff-req`],
    enabled: !!concert && isArtist,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/concerts/${numericId}/staff-req`);
      return res.json();
    },
  });

  const handleTicket = () => {
    if (!requireAuth("purchase tickets")) return;
    if (!concert?.ticketUrl) return;
    Linking.openURL(concert.ticketUrl);
  };

  const handleUpload = () => {
    if (!requireAuth("upload videos")) return;
    router.push({ pathname: "/upload", params: { concertId: String(concert?.id ?? numericId) } });
  };

  const handleStaffRequest = async () => {
    if (!requireAuth("apply as staff")) return;
    try {
      await apiRequest("POST", `/api/concerts/${numericId}/staff-request`, {});
      Alert.alert("Request Sent", "Waiting for artist approval.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to submit request");
    }
  };

  const updateStaffStatus = async (staffId: number, action: "approve" | "reject") => {
    if (!requireAuth()) return;
    try {
      await apiRequest("PATCH", `/api/concerts/${numericId}/staff/${staffId}/${action}`, {});
      await qc.invalidateQueries({ queryKey: [`/api/concerts/${numericId}/staff-req`] });
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to update status");
    }
  };

  if (isLoading || !concert) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: topInset }]}>
        {isLoading ? <ActivityIndicator size="large" color={C.accent} /> : <Text style={styles.errorText}>Concert not found</Text>}
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      {!user && <GuestBanner />}

      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Concert Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{concert.title}</Text>

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color={C.textMuted} />
          <Text style={styles.infoText}>{concert.venueName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="map-outline" size={16} color={C.textMuted} />
          <Text style={styles.infoText}>{concert.venueAddress}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color={C.textMuted} />
          <Text style={styles.infoText}>{concert.concertDate}</Text>
        </View>

        <View style={styles.chipRow}>
          <View style={[styles.chip, concert.shootingAllowed ? styles.chipOn : styles.chipOff]}>
            <Ionicons
              name={concert.shootingAllowed ? "camera-outline" : "close-circle-outline"}
              size={14}
              color={concert.shootingAllowed ? "#0C3B2E" : "#5F2120"}
            />
            <Text style={[styles.chipText, concert.shootingAllowed ? styles.chipTextOn : styles.chipTextOff]}>
              {concert.shootingAllowed ? "Photography OK" : "No Photography"}
            </Text>
          </View>
        </View>

        {concert.shootingNotes ? (
          <View style={styles.box}>
            <Text style={styles.boxTitle}>Photography Rules</Text>
            <Text style={styles.boxBody}>{concert.shootingNotes}</Text>
          </View>
        ) : null}

        <View style={styles.box}>
          <Text style={styles.boxTitle}>Revenue Share</Text>
          <View style={styles.shareRow}>
            <Text style={styles.shareLabel}>Artist</Text>
            <Text style={styles.shareValue}>{concert.artistShare}%</Text>
          </View>
          <View style={styles.shareRow}>
            <Text style={styles.shareLabel}>Photographer</Text>
            <Text style={styles.shareValue}>{concert.photographerShare}%</Text>
          </View>
          <View style={styles.shareRow}>
            <Text style={styles.shareLabel}>Editor</Text>
            <Text style={styles.shareValue}>{concert.editorShare}%</Text>
          </View>
          <View style={styles.shareRow}>
            <Text style={styles.shareLabel}>Venue</Text>
            <Text style={styles.shareValue}>{concert.venueShare}%</Text>
          </View>
        </View>

        {concert.ticketUrl ? (
          <Pressable style={styles.primaryBtn} onPress={handleTicket}>
            <Ionicons name="ticket-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Buy Tickets</Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.secondaryBtn} onPress={handleUpload}>
          <Ionicons name="cloud-upload-outline" size={18} color={C.accent} />
          <Text style={styles.secondaryBtnText}>Upload Video for This Concert</Text>
        </Pressable>

        {!isArtist && (
          <Pressable style={styles.outlineBtn} onPress={handleStaffRequest}>
            <Ionicons name="people-outline" size={16} color={C.text} />
            <Text style={styles.outlineBtnText}>Apply as Official Staff for This Concert</Text>
          </Pressable>
        )}

        {isArtist && (
          <View style={{ marginTop: 28 }}>
            <Text style={styles.sectionTitle}>Staff Requests</Text>
            {loadingStaff ? (
              <ActivityIndicator size="small" color={C.accent} />
            ) : staffRequests.length === 0 ? (
              <Text style={styles.emptyText}>No requests at this time.</Text>
            ) : (
              staffRequests.map((s) => (
                <View key={s.id} style={styles.staffCard}>
                  <View style={styles.staffHeader}>
                    <Text style={styles.staffTitle}>Staff ID: {s.staffUserId}</Text>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusText}>{s.status}</Text>
                    </View>
                  </View>
                  <View style={styles.staffActions}>
                    <Pressable
                      style={[styles.staffBtn, styles.approveBtn]}
                      onPress={() => updateStaffStatus(s.id, "approve")}
                    >
                      <Text style={styles.staffBtnText}>Approve</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.staffBtn, styles.rejectBtn]}
                      onPress={() => updateStaffStatus(s.id, "reject")}
                    >
                      <Text style={styles.staffBtnText}>Reject</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered: { justifyContent: "center", alignItems: "center" },
  errorText: { color: C.text, fontSize: 14 },
  guestBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#1A1400",
    borderBottomWidth: 1,
    borderBottomColor: "#3A2C00",
  },
  guestBannerText: {
    flex: 1,
    fontSize: 11,
    color: "#C8920A",
    lineHeight: 15,
  },
  guestBannerLink: {
    fontSize: 11,
    fontWeight: "700",
    color: "#E8A020",
    textDecorationLine: "underline",
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
  headerTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  title: { fontSize: 20, fontWeight: "700", color: C.text, marginBottom: 12 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  infoText: { fontSize: 13, color: C.textSec },
  chipRow: { flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 12 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chipOn: { backgroundColor: "#C8E6C9" },
  chipOff: { backgroundColor: "#FFCDD2" },
  chipText: { fontSize: 11, fontWeight: "600" },
  chipTextOn: { color: "#0C3B2E" },
  chipTextOff: { color: "#5F2120" },
  box: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  boxTitle: { fontSize: 14, fontWeight: "700", color: C.text, marginBottom: 4 },
  boxBody: { fontSize: 13, color: C.textSec },
  shareRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  shareLabel: { fontSize: 13, color: C.textSec },
  shareValue: { fontSize: 13, color: C.text, fontWeight: "700" },
  primaryBtn: {
    marginTop: 20,
    backgroundColor: C.live,
    paddingVertical: 12,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  secondaryBtn: {
    marginTop: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.accent,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryBtnText: { color: C.accent, fontSize: 13, fontWeight: "700" },
  outlineBtn: {
    marginTop: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  outlineBtnText: { color: C.textSec, fontSize: 13, fontWeight: "600" },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: C.text, marginBottom: 6 },
  emptyText: { fontSize: 13, color: C.textMuted },
  staffCard: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  staffHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  staffTitle: { fontSize: 13, color: C.text },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
  },
  statusText: { fontSize: 11, color: C.textMuted },
  staffActions: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  staffBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  approveBtn: { backgroundColor: C.accent },
  rejectBtn: { backgroundColor: C.live },
  staffBtnText: { fontSize: 12, color: "#fff", fontWeight: "600" },
});
