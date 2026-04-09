import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { C } from "@/constants/colors";
import { useAuth } from "@/lib/auth";

/**
 * 条項・プライバシー版が constants/legalVersions より古い場合に表示。
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
      <Text style={styles.title}>利用規約またはプライバシーポリシーが更新されています</Text>
      <Text style={styles.body}>
        続ける前に内容をご確認のうえ、同意してください。詳細は Terms / Privacy をご覧ください。
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
          <Text style={styles.acceptText}>確認したうえで同意する</Text>
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
