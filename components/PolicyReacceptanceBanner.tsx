import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { C } from "@/constants/colors";
import { useAuth } from "@/lib/auth";

/**
 * Shown when the user's accepted Terms / Privacy versions are older than `constants/legalVersions`.
 */
export function PolicyReacceptanceBanner() {
  const { user, acceptPolicies } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!user || (!user.needsTermsReacceptance && !user.needsPrivacyReacceptance)) {
    return null;
  }

  async function onAccept() {
    setBusy(true);
    try {
      await acceptPolicies();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <Text style={styles.title}>Our Terms of Service or Privacy Policy has been updated</Text>
      <Text style={styles.body}>
        Please read the updated documents and agree before you continue. See Terms / Privacy for details.
      </Text>
      <View style={styles.row}>
        <Pressable onPress={() => router.push("/terms")} style={styles.linkBtn}>
          <Text style={styles.linkText}>Terms</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/privacy")} style={styles.linkBtn}>
          <Text style={styles.linkText}>Privacy</Text>
        </Pressable>
      </View>
      <Pressable
        style={[styles.acceptBtn, busy && styles.acceptBtnDisabled]}
        onPress={onAccept}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#050505" />
        ) : (
          <Text style={styles.acceptText}>I have read and agree</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#1a1528",
    borderBottomWidth: 1,
    borderBottomColor: C.accent,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  title: { color: C.text, fontSize: 13, fontWeight: "700", marginBottom: 6 },
  body: { color: C.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 10 },
  row: { flexDirection: "row", gap: 12, marginBottom: 10 },
  linkBtn: { paddingVertical: 4 },
  linkText: { color: C.accent, fontSize: 13, textDecorationLine: "underline" },
  acceptBtn: {
    backgroundColor: C.accent,
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: "center",
  },
  acceptBtnDisabled: { opacity: 0.6 },
  acceptText: { color: "#050505", fontSize: 14, fontWeight: "700" },
});
