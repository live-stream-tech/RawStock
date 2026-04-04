import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, Platform, Alert } from "react-native";
import { webScrollStyle } from "@/constants/layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { C } from "@/constants/colors";
import { useAuth, AuthGuard } from "@/lib/auth";
import { apiRequest } from "@/lib/query-client";

export default function ConcertCreateScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { user, requireAuth } = useAuth();

  const [title, setTitle] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [concertDate, setConcertDate] = useState("");
  const [ticketUrl, setTicketUrl] = useState("");
  const [shootingAllowed, setShootingAllowed] = useState(false);
  const [shootingNotes, setShootingNotes] = useState("");
  const [shares, setShares] = useState({
    artist: 60,
    photographer: 20,
    editor: 10,
    venue: 10,
  });
  const [saving, setSaving] = useState(false);

  const sumShare = shares.artist + shares.photographer + shares.editor + shares.venue;
  const canSubmit =
    title.trim().length > 0 &&
    venueName.trim().length > 0 &&
    venueAddress.trim().length > 0 &&
    concertDate.trim().length > 0 &&
    sumShare === 100;

  const roleLabel = useMemo(() => user?.role ?? "USER", [user?.role]);

  const adjustShare = (key: keyof typeof shares, delta: number) => {
    setShares((prev) => {
      const nextVal = Math.max(0, Math.min(100, prev[key] + delta));
      return { ...prev, [key]: nextVal };
    });
  };

  const handleSubmit = async () => {
    if (!requireAuth("register a concert")) return;
    if (!canSubmit || saving) {
      if (sumShare !== 100) {
        Alert.alert("Error", "Revenue share must total 100%.");
      }
      return;
    }
    setSaving(true);
    try {
      const res = await apiRequest("POST", "/api/concerts", {
        title: title.trim(),
        venueName: venueName.trim(),
        venueAddress: venueAddress.trim(),
        concertDate: concertDate.trim(),
        ticketUrl: ticketUrl.trim() || null,
        shootingAllowed,
        shootingNotes: shootingNotes.trim() || null,
        artistShare: shares.artist,
        photographerShare: shares.photographer,
        editorShare: shares.editor,
        venueShare: shares.venue,
        status: "published",
      });
      const data = await res.json();
      Alert.alert("Concert registered!", "", [
        { text: "OK", onPress: () => router.replace(`/concert/${data.id}`) },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to register concert");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard>
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Register Concert</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{roleLabel}</Text>
          </View>
        </View>

        <ScrollView style={webScrollStyle(styles.scroll)} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>
            Concert Title <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. 1st Solo Live"
            placeholderTextColor={C.textMuted}
          />

          <Text style={styles.label}>
            Venue Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={venueName}
            onChangeText={setVenueName}
            placeholder="e.g. Shibuya Club Quattro"
            placeholderTextColor={C.textMuted}
          />

          <Text style={styles.label}>
            Venue Address <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={venueAddress}
            onChangeText={setVenueAddress}
            placeholder="e.g. 123 Main St, New York, NY"
            placeholderTextColor={C.textMuted}
          />

          <Text style={styles.label}>
            Date &amp; Time <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={concertDate}
            onChangeText={setConcertDate}
            placeholder="2026-04-01 19:00"
            placeholderTextColor={C.textMuted}
          />

          <Text style={styles.label}>Ticket URL</Text>
          <TextInput
            style={styles.input}
            value={ticketUrl}
            onChangeText={setTicketUrl}
            placeholder="https://example.com/tickets"
            placeholderTextColor={C.textMuted}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Photography Policy</Text>
          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggleBtn, !shootingAllowed && styles.toggleBtnActive]}
              onPress={() => setShootingAllowed(false)}
            >
              <Text style={[styles.toggleText, !shootingAllowed && styles.toggleTextActive]}>No Photography</Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, shootingAllowed && styles.toggleBtnActive]}
              onPress={() => setShootingAllowed(true)}
            >
              <Text style={[styles.toggleText, shootingAllowed && styles.toggleTextActive]}>Photography OK</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Photography Rules</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={shootingNotes}
            onChangeText={setShootingNotes}
            placeholder="e.g. No flash / specific songs only"
            placeholderTextColor={C.textMuted}
            multiline
          />

          <Text style={[styles.label, { marginTop: 24 }]}>Revenue Share (must total 100%)</Text>
          <View style={styles.shareBox}>
            {[
              { key: "artist", label: "Artist" },
              { key: "photographer", label: "Photographer" },
              { key: "editor", label: "Editor" },
              { key: "venue", label: "Venue" },
            ].map((item) => (
              <View key={item.key} style={styles.shareRow}>
                <Text style={styles.shareLabel}>{item.label}</Text>
                <View style={styles.shareControls}>
                  <Pressable
                    style={styles.shareBtn}
                    onPress={() => adjustShare(item.key as any, -5)}
                  >
                    <Text style={styles.shareBtnText}>-5</Text>
                  </Pressable>
                  <Text style={styles.shareValue}>{shares[item.key as keyof typeof shares]}%</Text>
                  <Pressable
                    style={styles.shareBtn}
                    onPress={() => adjustShare(item.key as any, +5)}
                  >
                    <Text style={styles.shareBtnText}>+5</Text>
                  </Pressable>
                </View>
              </View>
            ))}
            <Text style={[styles.shareSum, sumShare !== 100 && styles.shareSumError]}>
              Total: {sumShare}% {sumShare !== 100 && "(must be 100%)"}
            </Text>
          </View>

          <Pressable
            style={[styles.submitBtn, (!canSubmit || saving) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || saving}
          >
            <Text style={styles.submitText}>{saving ? "Saving..." : "Register Concert"}</Text>
          </Pressable>

          <View style={{ height: 40 }} />
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
  headerTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
  },
  roleText: { fontSize: 11, color: C.textMuted },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  label: { marginTop: 16, marginBottom: 6, color: C.text, fontSize: 14, fontWeight: "600" },
  required: { color: C.live },
  input: {
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 14,
    color: C.text,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  toggleRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: "rgba(41,182,207,0.18)",
    borderColor: C.accent,
  },
  toggleText: { fontSize: 13, color: C.textSec, fontWeight: "600" },
  toggleTextActive: { color: C.accent },
  shareBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    gap: 6,
  },
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  shareLabel: { fontSize: 13, color: C.textSec },
  shareControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  shareBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface2,
  },
  shareBtnText: { fontSize: 11, color: C.textSec },
  shareValue: { fontSize: 14, fontWeight: "700", color: C.text },
  shareSum: { marginTop: 6, fontSize: 12, color: C.textMuted },
  shareSumError: { color: C.live },
  submitBtn: {
    marginTop: 24,
    backgroundColor: C.accent,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});

