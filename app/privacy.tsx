import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { C } from "@/constants/colors";
import { webScrollStyle } from "@/constants/layout";
import { PolicyTranslateBanner } from "@/components/PolicyTranslateBanner";

const PAGE_FULL_TEXT = [
  "RawStock Privacy Policy",
  "Article 1 — Information We Collect: Account identifiers (Google sign-in, email, display name, profile image, bio); Content (videos, posts, comments, messages, live audio/video); Payment metadata via Stripe (we do not store full card numbers); Technical data (IP, device, cookies, logs); Language detection results stored as last_content_lang; Policy acceptance versions and timestamps.",
  "Article 2 — Purpose of Use: To provide and improve the Service, authenticate users, process payments and creator payouts, detect fraud, moderate content, send service notices, and produce aggregated statistics.",
  "Article 3 — Third-Party Sharing: We do not sell your personal information. We share data with subprocessors as needed, when you consent, when required by law, or to protect vital interests. California residents may opt out of certain sharing under CCPA/CPRA.",
  "Article 4 — Sub-processors: Neon (database), Cloudflare (CDN/streaming/security), Google (auth and YouTube), Stripe (payments and payouts), Upstash (caching), Anthropic or similar AI providers for moderation. Vendors may change.",
  "Article 5 — Cookies & Analytics: We use cookies for sign-in, preferences, security, and analytics. Limiting cookies may break some features.",
  "Article 6 — Security: We implement technical and organizational measures appropriate to the risk. No internet transmission is fully secure.",
  "Article 7 — Access, Correction & Deletion: You may request access, correction, or deletion by emailing info@rawstock.live. We will verify your identity before responding.",
  "Article 8 — GDPR (EU): EEA users may have rights to access, rectify, erase, restrict processing, object, and data portability, and to lodge a complaint with their supervisory authority.",
  "Article 8b — UK GDPR & DPA 2018: UK users have similar rights and may lodge complaints with the Information Commissioner's Office (ICO).",
  "Article 9 — Data Retention: We retain personal data only as long as necessary. After account deletion we typically delete or anonymize within 30 days, except where retention is required by law, for fraud prevention, or for backups.",
  "Article 10 — Minors: The Service is not directed to children under 13. Users 13–17 require parent or guardian consent.",
  "Article 11 — Policy Updates: We may update this Policy. Material changes will be communicated through the Service.",
  "Article 12 — Contact: Hiromi Kanokifu (trade name RawStock), Shibuya Dogenzaka Tokyu Bldg 2F-C, 1-10-8 Dogenzaka, Shibuya, Tokyo 150-0043, Japan. Email: info@rawstock.live.",
].join("\n\n");

function Article({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.article}>
      <Text style={styles.articleTitle}>{title}</Text>
      {typeof children === "string" ? <Text style={styles.articleBody}>{children}</Text> : <View>{children}</View>}
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
        style={webScrollStyle(styles.scroll)}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.docTitle}>RawStock Privacy Policy</Text>
        <Text style={styles.effectiveDate}>Effective: April 4, 2026</Text>

        <PolicyTranslateBanner text={PAGE_FULL_TEXT} srcLang="en" />

        <Article title="Article 1 — Information We Collect">
          {
            "Account: Google sign-in identifiers, email address, display name, profile image, and bio.\n\nContent: Videos, posts, comments, messages, community activity, and—if you use live or camera features—audio, video, and related metadata from your device.\n\nPayments: Payment and payout metadata processed by Stripe (we do not store full card numbers on our servers).\n\nTechnical: IP address, device type, cookies, usage logs, and diagnostics needed to operate and secure the Service.\n\nLanguage detection: When you post text (for example profile updates, community posts, or direct messages), we may run automatic language detection on the server (using the open-source franc library) to infer a short language code (such as ja or en) stored as last_content_lang on your account for product personalization. This processing happens on our infrastructure, not by sending your text to a separate language vendor.\n\nPolicy acceptance: We store which version of the Terms of Service and Privacy Policy you accepted and when, to evidence consent when policies change."
          }
        </Article>

        <Article title="Article 2 — Purpose of Use">
          To provide and improve the Service, authenticate users, process payments and creator payouts, detect fraud and
          abuse, moderate content (including automated assistance where used), send service-related notices, and produce
          aggregated statistics.
        </Article>

        <Article title="Article 3 — Third-Party Sharing">
          We do not sell your personal information. We share data with subprocessors listed in Article 4 as needed to
          operate the Service, when you consent, when required by law, or to protect vital interests. California residents
          may have rights to opt out of certain sharing under the CCPA/CPRA as described in applicable law and upon
          request to us.
        </Article>

        <Article title="Article 4 — Sub-processors">
          {
            "We may engage the following categories of providers (specific vendors may change; material updates will be reflected here):\n\n• Neon (database hosting)\n• Cloudflare (CDN, streaming, security, and related infrastructure)\n• Google (authentication; YouTube integrations where enabled)\n• Stripe (payments, payouts, Stripe Connect, tax and compliance tooling as applicable)\n• Upstash (caching / rate limiting where configured)\n• Anthropic or similar AI providers (content safety or moderation assistance where enabled)\n\nWe do not control third-party sites linked from the Service; their policies apply when you leave RawStock."
          }
        </Article>

        <Article title="Article 5 — Cookies & Analytics">
          We use cookies and similar technologies for sign-in, preferences, security, and analytics. You may limit cookies in
          your browser; some features may not work without them.
        </Article>

        <Article title="Article 6 — Security">
          We implement technical and organizational measures appropriate to the risk. No method of transmission over the
          Internet is completely secure.
        </Article>

        <Article title="Article 7 — Access, Correction & Deletion">
          You may request access, correction, or deletion of your personal data by contacting info@rawstock.live.
          We will verify your identity before responding.
        </Article>

        <Article title="Article 8 — GDPR (EU Users)">
          {
            "If you are in the European Economic Area, we process personal data under lawful bases such as contract, legitimate interests, and consent where applicable. You may have the right to access, rectify, erase, restrict processing, object, and data portability, and to lodge a complaint with your supervisory authority. Contact: info@rawstock.live."
          }
        </Article>

        <Article title="Article 8b — UK GDPR & Data Protection Act 2018">
          {
            "If you are in the United Kingdom, you have similar rights under the UK GDPR and the Data Protection Act 2018, including the right to lodge a complaint with the Information Commissioner’s Office (ICO): https://ico.org.uk/"
          }
        </Article>

        <Article title="Article 9 — Data Retention">
          {
            "We retain personal data only as long as needed for the purposes above and to comply with law. After you delete your account, we delete or anonymize personal data within a reasonable period (typically within 30 days) except where retention is necessary for legal, tax, fraud-prevention, or dispute-resolution purposes, for backups that roll off on a defined cycle, or where you own or moderate communities that must be transferred or closed before deletion—consistent with our account deletion flow in the app."
          }
        </Article>

        <Article title="Article 10 — Minors">
          The Service is not directed to children under 13. Users must be at least 13 (or the minimum age in their
          country). Users between 13 and 17 should use the Service only with a parent or guardian’s consent, consistent
          with our Terms of Service.
        </Article>

        <Article title="Article 11 — Policy Updates">
          We may update this Policy. Material changes will be communicated through the Service where appropriate.
        </Article>

        <Article title="Article 12 — Contact">
          Name: Hiromi Kanokifu{"\n"}
          Trade name: RawStock{"\n"}
          Address: Shibuya Dogenzaka Tokyu Bldg 2F-C, 1-10-8 Dogenzaka, Shibuya, Tokyo 150-0043, Japan{"\n"}
          Email: info@rawstock.live
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
