import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { C } from "@/constants/colors";
import { webScrollStyle } from "@/constants/layout";

const MIN_AMOUNT = 10000;
const DAILY_RATE_PER_MEMBER = 10;
const MAX_MONTHS_AHEAD = 3;

function parseDate(s: string): Date | null {
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000)) + 1;
}

export default function CommunityAdApplyScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { communityId: paramId } = useLocalSearchParams<{ communityId?: string }>();
  const communityId = parseInt(paramId ?? "0", 10);

  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: community, isLoading: loadingCommunity } = useQuery({
    queryKey: [`/api/communities/${communityId}`],
    enabled: communityId > 0,
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const res = await fetch(new URL(`/api/communities/${communityId}`, baseUrl).toString());
      if (!res.ok) throw new Error("Failed to load community");
      return res.json();
    },
  });

  const members = community?.members ?? 0;
  const dailyRate = members * DAILY_RATE_PER_MEMBER;

  const { totalAmount, days, error: amountError } = useMemo(() => {
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (!start || !end) return { totalAmount: 0, days: 0, error: "" };
    if (end < start) return { totalAmount: 0, days: 0, error: "End date must be on or after start date" };
    const d = daysBetween(start, end);
    const total = d * dailyRate;
    const maxEnd = new Date();
    maxEnd.setMonth(maxEnd.getMonth() + MAX_MONTHS_AHEAD);
    if (end > maxEnd) return { totalAmount: total, days: d, error: `End date must be within ${MAX_MONTHS_AHEAD} months` };
    if (total < MIN_AMOUNT) return { totalAmount: total, days: d, error: `Minimum ad spend is 🎟${MIN_AMOUNT.toLocaleString()}` };
    return { totalAmount: total, days: d, error: "" };
  }, [startDate, endDate, dailyRate]);

  const canSubmit =
    companyName.trim().length > 0 &&
    contactName.trim().length > 0 &&
    email.trim().length > 0 &&
    bannerUrl.trim().length > 0 &&
    startDate.trim().length > 0 &&
    endDate.trim().length > 0 &&
    !amountError &&
    totalAmount >= MIN_AMOUNT;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/community-ads", {
        communityId,
        companyName: companyName.trim(),
        contactName: contactName.trim(),
        email: email.trim(),
        bannerUrl: bannerUrl.trim(),
        startDate: startDate.trim(),
        endDate: endDate.trim(),
      });
      Alert.alert("Application Received", "Your ad application has been submitted. We will notify you of the review result by email.", [
        { text: "OK", onPress: () => router.replace(`/community/${communityId}`) },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  if (communityId <= 0) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: topInset }]}>
        <Text style={styles.errorText}>No community specified</Text>
        <Pressable style={styles.backBtnStandalone} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (loadingCommunity || !community) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: topInset }]}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Ad Application</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={webScrollStyle(styles.scroll)} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.communityLabel}>{community.name}</Text>
        <Text style={styles.hint}>Ad cost = members × 🎟10/day (min 🎟{MIN_AMOUNT.toLocaleString()}) · Up to 3 months ahead</Text>

        <Text style={styles.label}>Company Name <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          value={companyName}
          onChangeText={setCompanyName}
          placeholder="Acme Inc."
          placeholderTextColor={C.textMuted}
        />

        <Text style={styles.label}>Contact Name <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          value={contactName}
          onChangeText={setContactName}
          placeholder="Jane Smith"
          placeholderTextColor={C.textMuted}
        />

        <Text style={styles.label}>Email Address <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="contact@example.com"
          placeholderTextColor={C.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Banner Image URL <Text style={styles.required}>*</Text></Text>
        <Text style={styles.hintSmall}>Static image or GIF supported. Recommended: 16:9</Text>
        <TextInput
          style={styles.input}
          value={bannerUrl}
          onChangeText={setBannerUrl}
          placeholder="https://..."
          placeholderTextColor={C.textMuted}
          autoCapitalize="none"
        />
        {bannerUrl.trim() ? (
          <View style={styles.bannerPreviewWrap}>
            <Image source={{ uri: bannerUrl.trim() }} style={styles.bannerPreview} contentFit="cover" />
          </View>
        ) : null}

        <Text style={styles.label}>Start Date <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD (e.g. 2025-04-01)"
          placeholderTextColor={C.textMuted}
        />

        <Text style={styles.label}>End Date <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          value={endDate}
          onChangeText={setEndDate}
          placeholder="YYYY-MM-DD (up to 3 months ahead)"
          placeholderTextColor={C.textMuted}
        />

        <View style={styles.summaryBox}>
          <Text style={styles.summaryRow}>Members: {members.toLocaleString()}</Text>
          <Text style={styles.summaryRow}>Daily rate: 🎟{dailyRate.toLocaleString()}/day</Text>
          <Text style={styles.summaryRow}>Duration: {days} days</Text>
          <Text style={[styles.summaryRow, styles.summaryTotal]}>Total: 🎟{totalAmount.toLocaleString()}</Text>
          {amountError ? <Text style={styles.summaryError}>{amountError}</Text> : null}
        </View>

        <Pressable
          style={[styles.submitBtn, (!canSubmit || submitting) && styles.submitBtnDisabled]}
          disabled={!canSubmit || submitting}
          onPress={handleSubmit}
        >
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
          <Text style={styles.submitBtnText}>{submitting ? "Submitting..." : "Apply"}</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered: { justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnStandalone: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: C.surface, borderRadius: 12 },
  backBtnText: { color: C.text, fontSize: 14, fontWeight: "600" },
  headerTitle: { color: C.text, fontSize: 17, fontWeight: "700" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  communityLabel: { color: C.accent, fontSize: 14, fontWeight: "700", marginBottom: 4 },
  hint: { color: C.textMuted, fontSize: 12, marginBottom: 20 },
  hintSmall: { color: C.textMuted, fontSize: 11, marginBottom: 6 },
  label: { color: C.text, fontSize: 14, fontWeight: "600", marginBottom: 6, marginTop: 16 },
  required: { color: C.live },
  input: {
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.text,
    fontSize: 14,
  },
  bannerPreviewWrap: { marginTop: 8, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: C.border },
  bannerPreview: { width: "100%", height: 120 },
  summaryBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    gap: 6,
  },
  summaryRow: { color: C.textSec, fontSize: 14 },
  summaryTotal: { color: C.text, fontSize: 16, fontWeight: "800", marginTop: 4 },
  summaryError: { color: C.live, fontSize: 13, marginTop: 6 },
  submitBtn: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 15,
  },
  submitBtnDisabled: { backgroundColor: C.surface3, opacity: 0.8 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  errorText: { color: C.textMuted, fontSize: 14 },
});
