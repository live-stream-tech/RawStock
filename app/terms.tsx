import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { C } from "@/constants/colors";
import { webScrollStyle } from "@/constants/layout";

function Article({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.article}>
      <Text style={styles.articleTitle}>{title}</Text>
      <Text style={styles.articleBody}>{children}</Text>
    </View>
  );
}

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={webScrollStyle(styles.scroll)}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.docTitle}>RawStock Terms of Service</Text>
        <Text style={styles.effectiveDate}>Effective Date: March 18, 2026</Text>

        <Text style={styles.intro}>
          These Terms of Service ("Terms") govern your access to and use of the "RawStock" platform and services (the "Service") provided by RawStock ("Company," "we," "us," or "our"). By accessing or using the Service, you agree to be bound by these Terms.
        </Text>

        <Article title="1. Acceptance of Terms & Eligibility">
          By using the Service, you represent that you are at least 13 years of age (or the minimum age required in your country). If you are under 18, you must have the consent of a parent or legal guardian. If you are a resident of California, additional privacy rights may apply under our Privacy Policy.
        </Article>

        <Article title="2. Governing Law & Jurisdiction">
          {"Governing Law: These Terms and any dispute arising out of them shall be governed by the laws of the State of California, United States, without regard to conflict of law principles.\n\nArbitration Agreement: Any dispute shall be resolved through binding individual arbitration in California, rather than in court, except for small claims. You waive your right to a class action lawsuit."}
        </Article>

        <Article title="3. User Accounts & Security">
          You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate, current, and complete information. Company is not liable for any loss or damage arising from unauthorized access to your account.
        </Article>

        <Article title="4. Content Ownership & Licenses">
          {"Your Content: You retain all ownership rights to the text, videos, and live streams you post (\"User Content\").\n\nLicense to Company: By posting, you grant Company a worldwide, non-exclusive, royalty-free, sublicensable, and transferable license to use, reproduce, distribute, prepare derivative works of, and display your content in connection with the Service and Company's business (including marketing).\n\nDMCA Compliance: We respect intellectual property rights. If you believe your work has been infringed, please follow our Digital Millennium Copyright Act (DMCA) Notice and Takedown procedure."}
        </Article>

        <Article title="5. Prohibited Conduct">
          {"You agree not to engage in:\n\n• Illegal activities or promotion of prohibited goods/services.\n• Hate speech, harassment, or violent/sexually explicit content.\n• Infringement of third-party intellectual property or privacy rights.\n• Technical abuse (scraping, DDoS attacks, or bypassing security)."}
        </Article>

        <Article title="6. Payments, Subscriptions & Virtual Gifts">
          {"Final Sales: All purchases of \"Paid Content\" or \"Gifts\" are final and non-refundable unless required by local law (e.g., EU right of withdrawal).\n\nCalifornia Residents: Under California Civil Code Section 1789.3, users are entitled to specific consumer rights information which can be found in our Help Center."}
        </Article>

        <Article title="7. Revenue Sharing (Creator Terms)">
          Payouts to Creators are subject to identity verification (KYC) and tax reporting requirements (e.g., IRS Form W-9/W-8BEN). Creators receive 90% of all direct sales revenue. Company reserves the right to withhold payments for suspected fraud or violation of these Terms.
        </Article>

        <Article title="8. Disclaimer of Warranties & Limitation of Liability">
          {"\"As-Is\" Basis: THE SERVICE IS PROVIDED \"AS IS\" WITHOUT WARRANTIES OF ANY KIND.\n\nLimitation: TO THE MAXIMUM EXTENT PERMITTED BY LAW, COMPANY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES. OUR TOTAL LIABILITY SHALL NOT EXCEED $100 USD OR THE AMOUNT PAID BY YOU IN THE LAST MONTH."}
        </Article>

        <Article title="9. Privacy & Data Protection">
          Our data practices are governed by our Privacy Policy, which complies with the California Consumer Privacy Act (CCPA) and the General Data Protection Regulation (GDPR) for global users.
        </Article>

        <Article title="10. Termination">
          We reserve the right to suspend or terminate your account at any time, with or without notice, for conduct that we believe violates these Terms or is harmful to other users or our business interests.
        </Article>

        <Article title="11. Modifications">
          We may update these Terms from time to time. Your continued use of the Service after changes are posted constitutes your acceptance of the new Terms.
        </Article>

        <View style={styles.article}>
          <Text style={styles.articleTitle}>Addendum</Text>
          <Text style={styles.articleBody}>
            This version is intended for a global platform headquartered or legally centered in California, USA.
          </Text>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
    letterSpacing: 0.5,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24 },
  docTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: C.text,
    marginBottom: 8,
    textAlign: "center",
  },
  effectiveDate: {
    fontSize: 13,
    color: C.textMuted,
    marginBottom: 20,
    textAlign: "center",
  },
  intro: {
    fontSize: 14,
    lineHeight: 22,
    color: C.textSec,
    marginBottom: 24,
  },
  article: {
    marginBottom: 24,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.accent,
    marginBottom: 10,
  },
  articleBody: {
    fontSize: 14,
    lineHeight: 22,
    color: C.textSec,
  },
});
