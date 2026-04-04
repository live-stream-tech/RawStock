import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { C } from "@/constants/colors";
import { webScrollStyle } from "@/constants/layout";

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

export default function CommunityGuidelinesScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Community Guidelines</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={webScrollStyle(styles.scroll)}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.docTitle}>RawStock Community Guidelines</Text>
        <Text style={styles.effectiveDate}>Effective: April 4, 2026</Text>

        <Text style={styles.intro}>
          These guidelines apply together with our Terms of Service and Privacy Policy. We may update them; continued
          use of the Service means you accept reasonable changes.
        </Text>

        <Section
          title="1. Be respectful"
          children={
            "Treat other users with respect. Do not harass, threaten, doxx, or target individuals or groups. Bullying, hate speech, and incitement to violence are not allowed."
          }
        />

        <Section
          title="2. Legal and safe content"
          children={
            "Do not post, stream, or share content that is illegal where you or viewers are located. This includes non-consensual intimate imagery, sexual content involving minors, trafficking, sale of illegal goods, or instructions for serious harm."
          }
        />

        <Section
          title="3. Live streaming"
          children={
            "Live content is harder to moderate in real time. You must comply with these guidelines during broadcasts. We may end streams, remove archives, or restrict accounts for violations. Use in-app reporting if you see dangerous or illegal live content."
          }
        />

        <Section
          title="4. Intellectual property"
          children={
            "Only upload or stream content you have the right to use. Respect copyrights, trademarks, and privacy. For U.S. copyright notices, see our DMCA Policy."
          }
        />

        <Section
          title="5. Spam and manipulation"
          children={
            "No spam, scams, impersonation of RawStock staff or other users, artificial engagement, or attempts to manipulate rankings, payments, or security."
          }
        />

        <Section
          title="6. Reporting and enforcement"
          children={
            "Use report tools in the app where available. We review reports as promptly as practical; timing depends on severity and volume. We may warn, remove content, suspend, or permanently ban accounts. Decisions may consider severity and repeat violations."
          }
        />

        <Section title="7. Contact" children={"Questions: rawstock.infomation@gmail.com"} />

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
  intro: { fontSize: 14, lineHeight: 22, color: C.textSec, marginBottom: 20 },
  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: C.accent, marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 22, color: C.textSec },
});
