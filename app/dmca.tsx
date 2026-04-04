import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Platform, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { C } from "@/constants/colors";
import { webScrollStyle } from "@/constants/layout";

const AGENT_EMAIL = "rawstock.infomation@gmail.com";

export default function DmcaScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>DMCA Policy</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={webScrollStyle(styles.scroll)}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.docTitle}>Copyright / DMCA Policy (U.S.)</Text>
        <Text style={styles.effectiveDate}>Effective: April 4, 2026</Text>

        <Text style={styles.body}>
          RawStock respects intellectual property rights. This policy describes how copyright owners may notify us of
          alleged infringement under the U.S. Digital Millennium Copyright Act (17 U.S.C. § 512). This page is provided
          for informational purposes and does not constitute legal advice.
        </Text>

        <Text style={styles.sectionTitle}>Designated agent</Text>
        <Text style={styles.body}>
          DMCA notices should be sent to our designated copyright agent at the email below. You may also use the same
          contact for other copyright-related inquiries.
        </Text>
        <Pressable onPress={() => Linking.openURL(`mailto:${AGENT_EMAIL}`)}>
          <Text style={styles.link}>{AGENT_EMAIL}</Text>
        </Pressable>
        <Text style={styles.body}>
          {"\n"}Operator: Hiromi Kanokifu (trade name: RawStock){"\n"}
          Address: Shibuya Dogenzaka Tokyu Bldg 2F-C, 1-10-8 Dogenzaka, Shibuya, Tokyo 150-0043, Japan
        </Text>

        <Text style={styles.sectionTitle}>What to include in a takedown notice</Text>
        <Text style={styles.body}>
          Your notice should include, to the best of your ability:{"\n\n"}
          • Identification of the copyrighted work claimed to have been infringed.{"\n"}
          • Identification of the material that is claimed to be infringing and information reasonably sufficient to permit
          us to locate it (e.g., URL or description within the Service).{"\n"}
          • Your contact information (name, address, telephone, email).{"\n"}
          • A statement that you have a good faith belief that use of the material is not authorized by the copyright
          owner, its agent, or the law.{"\n"}
          • A statement that the information in the notification is accurate, and under penalty of perjury, that you are
          authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.{"\n"}
          • A physical or electronic signature of the person authorized to act on behalf of the copyright owner.
        </Text>

        <Text style={styles.sectionTitle}>Counter-notification</Text>
        <Text style={styles.body}>
          If you believe material was removed in error, you may send us a counter-notification that includes the
          information required by 17 U.S.C. § 512(g)(3). We may restore material in accordance with applicable law.
        </Text>

        <Text style={styles.sectionTitle}>Repeat infringers</Text>
        <Text style={styles.body}>
          We may terminate or restrict accounts of users who are repeat infringers in appropriate circumstances.
        </Text>

        <Text style={styles.sectionTitle}>Non-U.S. rights</Text>
        <Text style={styles.body}>
          Copyright rules differ by country. If you are not relying on U.S. DMCA procedures, you may still contact us at
          the email above with details of your claim.
        </Text>

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
  headerTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24 },
  docTitle: { fontSize: 20, fontWeight: "700", color: C.text, marginBottom: 8, textAlign: "center" },
  effectiveDate: { fontSize: 13, color: C.textMuted, marginBottom: 20, textAlign: "center" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.accent,
    marginTop: 20,
    marginBottom: 10,
  },
  body: { fontSize: 14, lineHeight: 22, color: C.textSec, marginBottom: 12 },
  link: { fontSize: 14, lineHeight: 22, color: C.accent, textDecorationLine: "underline" },
});
