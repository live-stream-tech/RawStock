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
      {typeof children === "string" ? (
        <Text style={styles.articleBody}>{children}</Text>
      ) : (
        <View>{children}</View>
      )}
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
        <Text style={styles.effectiveDate}>Effective Date: April 4, 2026</Text>

        <Text style={styles.intro}>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of the RawStock platform and services (the
          &quot;Service&quot;). The Service is operated by Hiromi Kanokifu, doing business under the trade name RawStock
          (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), a sole proprietor based in Japan. By accessing or using the Service, you agree to
          these Terms.
        </Text>

        <Article title="1. Acceptance of Terms & Eligibility">
          You must be at least 13 years old (or the minimum age required in your country) to use the Service. If you are
          between 13 and 17, you may use the Service only with the consent of a parent or legal guardian. California
          residents may have additional rights described in our Privacy Policy.
        </Article>

        <Article title="2. Governing Law & Disputes (Japan)">
          {
            "These Terms are governed by the laws of Japan, without regard to conflict-of-law principles, except that mandatory protections of the law of the country where you reside as a consumer may still apply to you.\n\nFor disputes arising from or relating to these Terms, you and we agree to the exclusive jurisdiction of the courts of Japan having jurisdiction over our principal place of business in Tokyo, Japan, subject to any non-waivable rights you may have under applicable law."
          }
        </Article>

        <Article title="3. User Accounts & Security">
          You are responsible for maintaining the confidentiality of your account credentials. You agree to provide
          accurate, current, and complete information. We are not liable for loss or damage arising from unauthorized
          access to your account.
        </Article>

        <Article title="4. Content Ownership & Licenses">
          <Text style={styles.articleBody}>
            {
              'Your Content: You retain ownership of text, videos, and live streams you post ("User Content").\n\nLicense to RawStock: By posting, you grant us a worldwide, non-exclusive, royalty-free license to host, reproduce, distribute, publicly display, and perform your User Content solely to operate, promote, and improve the Service—including reasonable promotional use of your content on or in connection with RawStock (for example, featuring your posts on the platform). A separate opt-in may apply for marketing beyond the Service where we introduce such a program.\n\nCopyright (U.S.): If you believe material on the Service infringes your copyright, see our '
            }
            <Text style={styles.inlineLink} onPress={() => router.push("/dmca")}>
              DMCA Policy
            </Text>
            {" for how to submit a notice."}
          </Text>
        </Article>

        <Article title="5. Prohibited Conduct">
          <Text style={styles.articleBody}>
            {
              "You agree not to:\n\n• Engage in illegal activity or promote prohibited goods or services.\n• Post hate speech, harass others, or share violent or sexually explicit content in violation of our policies.\n• Infringe intellectual property or privacy rights.\n• Abuse the Service technically (scraping, DDoS, circumventing security).\n• Use live streaming or chat to broadcast illegal content, non-consensual imagery, or content that endangers others.\n\nFor more detail, see our "
            }
            <Text style={styles.inlineLink} onPress={() => router.push("/community-guidelines")}>
              Community Guidelines
            </Text>
            {"."}
          </Text>
        </Article>

        <Article title="6. Live Streaming & UGC">
          <Text style={styles.articleBody}>
            {
              "Live streams and real-time features are user-generated content. We may moderate, interrupt, or terminate streams or accounts that violate these Terms, our "
            }
            <Text style={styles.inlineLink} onPress={() => router.push("/community-guidelines")}>
              Community Guidelines
            </Text>
            {
              ", or applicable law. Users can report concerns through in-app reporting. We aim to review serious reports promptly; timing depends on volume and severity."
            }
          </Text>
        </Article>

        <Article title="7. Payments, Subscriptions & Virtual Gifts">
          {
            'Purchases of paid content, tickets, or virtual gifts are final and non-refundable unless required by applicable law (for example, certain consumer rights in the EU or UK).\n\nCalifornia residents: Under California Civil Code § 1789.3, consumer rights information may be obtained by contacting rawstock.infomation@gmail.com.'
          }
        </Article>

        <Article title="8. Revenue Sharing (Creators)">
          {
            "Payouts are subject to identity verification (KYC) and tax reporting as required by Stripe and applicable law (e.g., IRS Forms W-9 / W-8BEN where relevant). Unless we notify you otherwise, creators receive 90% of applicable direct sales revenue, with platform fees retained by us. We may withhold or reverse payouts for suspected fraud, chargebacks, or violations of these Terms. Tax reporting and filing are your responsibility."
          }
        </Article>

        <Article title="9. Disclaimer of Warranties & Limitation of Liability">
          {
            'THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND TO THE MAXIMUM EXTENT PERMITTED BY LAW. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, WE SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. OUR TOTAL LIABILITY FOR CLAIMS ARISING OUT OF THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID TO US FOR THE SERVICE IN THE TWELVE (12) MONTHS BEFORE THE CLAIM OR (B) 10,000 JPY, EXCEPT WHERE LIABILITY CANNOT BE LIMITED UNDER MANDATORY LAW.'
          }
        </Article>

        <Article title="10. Privacy & Data Protection">
          Our data practices are described in our Privacy Policy, which addresses global requirements including, where
          applicable, the CCPA/CPRA, GDPR, and UK GDPR.
        </Article>

        <Article title="11. Termination">
          We may suspend or terminate your account if we reasonably believe you have violated these Terms or harmed other
          users or the Service.
        </Article>

        <Article title="12. Modifications">
          We may update these Terms. We will post the updated Terms in the Service. Continued use after changes constitutes
          acceptance where permitted by law.
        </Article>

        <Article title="Addendum — United Kingdom users">
          {
            "If you are in the United Kingdom: (1) You may have rights under the UK GDPR and the Data Protection Act 2018—see our Privacy Policy. (2) Nothing in these Terms limits non-waivable consumer rights under the Consumer Rights Act 2015 or other UK law. (3) You may lodge a complaint with the Information Commissioner's Office (ICO) regarding data protection. (4) Whether the Online Safety Act 2023 or related rules apply to RawStock is fact-specific; we may update policies as our service and guidance evolve."
          }
        </Article>

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
  inlineLink: {
    fontSize: 14,
    lineHeight: 22,
    color: C.accent,
    textDecorationLine: "underline",
  },
});
