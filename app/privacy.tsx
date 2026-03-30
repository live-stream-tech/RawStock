import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { C } from "@/constants/colors";

function Article({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.article}>
      <Text style={styles.articleTitle}>{title}</Text>
      <Text style={styles.articleBody}>{children}</Text>
    </View>
  );
}

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.docTitle}>RawStock Privacy Policy</Text>
        <Text style={styles.effectiveDate}>Effective: March 13, 2026</Text>

        <Article title="Article 1 — Information We Collect">
          Google account information, email address, uploaded content, usage logs, and payment metadata (card numbers are never stored).
        </Article>

        <Article title="Article 2 — Purpose of Use">
          To provide and improve the service, respond to inquiries, detect fraudulent use, send notifications, and compile anonymized statistics.
        </Article>

        <Article title="Article 3 — Third-Party Sharing">
          We do not share your information with third parties except with your consent, as required by law, or to protect life or public health.
        </Article>

        <Article title="Article 4 — Sub-processors">
          We may share data with: Neon Inc. (database), Cloudflare, Inc. (storage), and Google LLC (authentication) for the purpose of service operation.
        </Article>

        <Article title="Article 5 — Cookies & Analytics">
          We use cookies and analytics tools to improve the service. You may disable cookies in your browser settings.
        </Article>

        <Article title="Article 6 — Security">
          We implement appropriate technical and organizational security measures to protect your data.
        </Article>

        <Article title="Article 7 — Access, Correction & Deletion">
          You may request access to, correction of, or deletion of your personal data by contacting rawstock.infomation@gmail.com. We will verify your identity before responding.
        </Article>

        <Article title="Article 8 — Minors">
          Users under 18 years of age must have parental or guardian consent to use this service.
        </Article>

        <Article title="Article 9 — Policy Updates">
          Material changes to this policy will be announced within the service.
        </Article>

        <Article title="Article 10 — Contact">
          Name: Hiromi Kanokifu{"\n"}
          Address: Shibuya Dogenzaka Tokyu Bldg 2F-C, 1-10-8 Dogenzaka, Shibuya, Tokyo 150-0043, Japan{"\n"}
          Email: rawstock.infomation@gmail.com{"\n\n"}
          Effective: March 13, 2026
        </Article>

        <View style={{ height: 80 }} />
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
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: C.text, letterSpacing: 0.5 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24 },
  docTitle: { fontSize: 20, fontWeight: "700", color: C.text, marginBottom: 8, textAlign: "center" },
  effectiveDate: { fontSize: 13, color: C.textMuted, marginBottom: 20, textAlign: "center" },
  article: { marginBottom: 24 },
  articleTitle: { fontSize: 16, fontWeight: "700", color: C.accent, marginBottom: 10 },
  articleBody: { fontSize: 14, lineHeight: 22, color: C.textSec },
});
