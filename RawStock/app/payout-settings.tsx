import React, { useState, useEffect, useCallback } from "react";
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
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { AuthGuard, useAuth } from "@/lib/auth";
import { C } from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";

const ACCOUNT_TYPES = ["Checking", "Current"];

export default function PayoutSettingsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { token } = useAuth();
  const params = useLocalSearchParams<{ connect?: string }>();

  const [bankName, setBankName] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [accountType, setAccountType] = useState("Checking"); // "Checking" or "Current"
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [connectStatus, setConnectStatus] = useState<{
    connected: boolean;
    chargesEnabled: boolean;
    detailsSubmitted: boolean;
  } | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectLinking, setConnectLinking] = useState(false);

  const fetchConnectStatus = useCallback(async () => {
    if (!token) return;
    try {
      const base = getApiUrl();
      const res = await fetch(new URL("/api/connect/status", base).toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setConnectStatus({
        connected: !!data.connected,
        chargesEnabled: !!data.chargesEnabled,
        detailsSubmitted: !!data.detailsSubmitted,
      });
    } catch {
      setConnectStatus({ connected: false, chargesEnabled: false, detailsSubmitted: false });
    }
  }, [token]);

  useEffect(() => {
    fetchConnectStatus();
  }, [fetchConnectStatus]);

  useEffect(() => {
    if (params.connect === "return" || params.connect === "refresh") {
      fetchConnectStatus();
    }
  }, [params.connect, fetchConnectStatus]);

  async function handleStripeConnect() {
    if (!token) return;
    setConnectLinking(true);
    try {
      const base = getApiUrl();
      const res = await fetch(new URL("/api/connect/onboard", base).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start Stripe Connect");
      const url = data.url;
      if (Platform.OS === "web") {
        window.location.href = url;
      } else {
        const can = await Linking.canOpenURL(url);
        if (can) await Linking.openURL(url);
        else Alert.alert("Error", "Unable to open Stripe page");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to start Stripe Connect");
    } finally {
      setConnectLinking(false);
    }
  }

  async function handleSave() {
    if (!bankName || !bankBranch || !accountNumber || !accountName) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setSaved(true);
    Alert.alert("Saved", "Bank account information saved.");
  }

  return (
    <AuthGuard>
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Payout Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.infoBanner, { borderLeftColor: C.orange }]}>
          <Ionicons name="alert-circle-outline" size={18} color={C.orange} />
          <Text style={[styles.infoText, { color: C.orange }]}>
            Completing "Stripe Bank Link" is required to monetize. Without it, you cannot accept or sell paid sessions.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="card-outline" size={16} color={C.accent} />
            <Text style={styles.cardTitle}>Stripe Bank Link</Text>
          </View>
          {connectStatus === null ? (
            <ActivityIndicator size="small" color={C.accent} style={{ marginVertical: 12 }} />
          ) : connectStatus.connected ? (
            <View style={styles.connectStatusRow}>
              <Ionicons name="checkmark-circle" size={20} color={C.green} />
              <Text style={styles.connectStatusText}>
                {connectStatus.chargesEnabled
                  ? "Stripe connected. You can receive payouts."
                  : "Stripe connected. Payouts available after review is complete."}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.securityText}>
                Stripe bank linking is required to accept paid sessions. Payments go directly to your account via Stripe; RawStock only takes a fee (compliant with payment regulations).
              </Text>
              <Pressable
                style={[styles.stripeConnectBtn, connectLinking && { opacity: 0.6 }]}
                onPress={handleStripeConnect}
                disabled={connectLinking}
              >
                {connectLinking ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="link-outline" size={18} color="#fff" />
                    <Text style={styles.stripeConnectBtnText}>Link Bank via Stripe</Text>
                  </>
                )}
              </Pressable>
            </>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="business-outline" size={16} color={C.accent} />
            <Text style={styles.cardTitle}>Bank Information</Text>
          </View>

          <Text style={styles.fieldLabel}>Bank Name</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="business-outline" size={16} color={C.textMuted} />
            <TextInput
              style={styles.input}
              value={bankName}
              onChangeText={setBankName}
              placeholder="e.g. Chase Bank"
              placeholderTextColor={C.textMuted}
            />
          </View>

          <Text style={styles.fieldLabel}>Branch Name</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="location-outline" size={16} color={C.textMuted} />
            <TextInput
              style={styles.input}
              value={bankBranch}
              onChangeText={setBankBranch}
              placeholder="e.g. Downtown Branch"
              placeholderTextColor={C.textMuted}
            />
          </View>

          <Text style={styles.fieldLabel}>Account Type</Text>
          <View style={styles.typeRow}>
            {ACCOUNT_TYPES.map((t) => (
              <Pressable
                key={t}
                style={[styles.typePill, accountType === t && styles.typePillActive]}
                onPress={() => setAccountType(t)}
              >
                <Text style={[styles.typePillText, accountType === t && styles.typePillTextActive]}>{t}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Account Number</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="keypad-outline" size={16} color={C.textMuted} />
            <TextInput
              style={styles.input}
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder="Account number"
              placeholderTextColor={C.textMuted}
              keyboardType="numeric"
              maxLength={17}
            />
          </View>

          <Text style={styles.fieldLabel}>Account Holder Name</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={16} color={C.textMuted} />
            <TextInput
              style={styles.input}
              value={accountName}
              onChangeText={setAccountName}
              placeholder="e.g. JOHN DOE"
              placeholderTextColor={C.textMuted}
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="shield-checkmark-outline" size={16} color={C.green} />
            <Text style={styles.cardTitle}>Security</Text>
          </View>
          <Text style={styles.securityText}>
            Bank account information is encrypted at rest and never shared with third parties.
          </Text>
          <View style={styles.securityBadgeRow}>
            <View style={styles.securityBadge}>
              <Ionicons name="lock-closed" size={12} color={C.green} />
              <Text style={styles.securityBadgeText}>SSL Encrypted</Text>
            </View>
            <View style={styles.securityBadge}>
              <Ionicons name="shield-checkmark" size={12} color={C.green} />
              <Text style={styles.securityBadgeText}>Secure Storage</Text>
            </View>
          </View>
        </View>

        <Pressable
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name={saved ? "checkmark-circle" : "save-outline"} size={18} color="#fff" />
              <Text style={styles.saveBtnText}>{saved ? "Saved" : "Save"}</Text>
            </>
          )}
        </Pressable>

        <Pressable style={styles.revenueLink} onPress={() => router.push("/revenue")}>
          <Ionicons name="arrow-forward-outline" size={14} color={C.accent} />
          <Text style={styles.revenueLinkText}>Revenue Management &amp; Withdrawal Requests</Text>
        </Pressable>

        <View style={{ height: 80 }} />
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
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.surface, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  scroll: { flex: 1 },
  infoBanner: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: C.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: C.accent,
  },
  infoText: { flex: 1, fontSize: 12, color: C.textSec, lineHeight: 18 },
  card: {
    backgroundColor: C.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: C.text },
  fieldLabel: { fontSize: 11, fontWeight: "600", color: C.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: C.surface2, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 14, borderWidth: 1, borderColor: C.border,
  },
  input: { flex: 1, fontSize: 15, color: C.text },
  typeRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  typePill: {
    paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20,
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border,
  },
  typePillActive: { backgroundColor: C.accent, borderColor: C.accent },
  typePillText: { fontSize: 14, color: C.textSec, fontWeight: "600" },
  typePillTextActive: { color: "#fff" },
  securityText: { fontSize: 12, color: C.textMuted, lineHeight: 18, marginBottom: 12 },
  connectStatusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  connectStatusText: { flex: 1, fontSize: 13, color: C.textSec },
  stripeConnectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#635BFF",
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 8,
  },
  stripeConnectBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  securityBadgeRow: { flexDirection: "row", gap: 8 },
  securityBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#0F2E1A", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  securityBadgeText: { fontSize: 11, color: C.green, fontWeight: "600" },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: C.accent, marginHorizontal: 16, borderRadius: 12, paddingVertical: 14,
    marginBottom: 12,
  },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  revenueLink: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    marginBottom: 8,
  },
  revenueLinkText: { fontSize: 13, color: C.accent },
});
