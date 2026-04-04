import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
} from "react-native";
import { scrollShowsHorizontal, scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth, AuthGuard } from "@/lib/auth";
import { apiRequest } from "@/lib/query-client";
import { C } from "@/constants/colors";
import { webScrollStyle } from "@/constants/layout";

function SettingRow({
  icon,
  label,
  sublabel,
  onPress,
  destructive,
  chevron = true,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  destructive?: boolean;
  chevron?: boolean;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={[styles.rowIcon, destructive && styles.rowIconDestructive]}>
        <Ionicons name={icon as any} size={18} color={destructive ? C.live : C.accent} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, destructive && { color: C.live }]}>{label}</Text>
        {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
      </View>
      {chevron && (
        <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
      )}
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { user, logout } = useAuth();

  async function handleDeleteAccount() {
    const msg =
      "Deleting your account starts erasure of your personal data in line with our Privacy Policy.\n\n" +
      "You cannot delete while you own a community—transfer ownership or delete those communities first.\n\n" +
      "Some data may be retained longer where required by law (for example tax or fraud prevention), for disputes, or in rolling backups, as described in the Privacy Policy.";
    const doDelete = async () => {
      try {
        await apiRequest("DELETE", "/api/auth/account");
        await AsyncStorage.removeItem("auth_token");
        logout();
      } catch (e: any) {
        let errMsg = "Deletion failed";
        if (e?.body) {
          try {
            const j = JSON.parse(e.body);
            if (j.error) errMsg = j.error;
          } catch {
            errMsg = e.message ?? errMsg;
          }
        } else if (e?.message) errMsg = e.message;
        Alert.alert("Error", errMsg);
      }
    };
    Alert.alert("Delete Account", msg, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: doDelete },
    ]);
  }

  function handleLogout() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  }

  return (
    <AuthGuard>
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView style={webScrollStyle(styles.scroll)} showsVerticalScrollIndicator={scrollShowsVertical}>
          {user && (
            <View style={styles.profileCard}>
              <View style={styles.profileAvatar}>
                <Ionicons name="person-circle" size={48} color={C.accent} />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{user.name}</Text>
                <Text style={styles.profileSub}>Signed in with Google</Text>
              </View>
            </View>
          )}

          <SectionHeader title="Account" />
          <View style={styles.section}>
            <SettingRow
              icon="person-outline"
              label="Edit Profile"
              sublabel="Name, bio, avatar, social links & more"
              onPress={() => router.push("/account")}
            />
          </View>

        <SectionHeader title="Revenue & Payments" />
        <View style={styles.section}>
          <SettingRow
            icon="wallet-outline"
            label="Revenue Dashboard"
            sublabel="View earnings & request payouts"
            onPress={() => router.push("/revenue")}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="card-outline"
            label="Payout Settings"
            sublabel="Register or change your bank account"
            onPress={() => router.push("/payout-settings")}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="receipt-outline"
            label="Transaction History"
            sublabel="Past sales & payout records"
            onPress={() => router.push("/revenue")}
          />
        </View>

        <SectionHeader title="Artist Tools" />
        <View style={styles.section}>
          <SettingRow
            icon="calendar-outline"
            label="Session Schedule"
            sublabel="Manage your bookable slots"
            onPress={() => router.push("/liver-schedule")}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="analytics-outline"
            label="My Score"
            sublabel="Satisfaction, sessions & attendance"
            onPress={() => Alert.alert("Coming Soon", "This feature will be available soon")}
          />
        </View>

        <SectionHeader title="Notifications" />
        <View style={styles.section}>
          <SettingRow
            icon="notifications-outline"
            label="Push Notifications"
            onPress={() => Alert.alert("Coming Soon", "This feature will be available soon")}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="mail-unread-outline"
            label="Email Notifications"
            onPress={() => Alert.alert("Coming Soon", "This feature will be available soon")}
          />
        </View>

        <SectionHeader title="Support" />
        <View style={styles.section}>
          <SettingRow
            icon="help-circle-outline"
            label="Help & FAQ"
            onPress={() => Alert.alert("Coming Soon", "This feature will be available soon")}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="library-outline"
            label="Legal & Policies"
            sublabel="Terms, Privacy, DMCA, Guidelines, notices"
            onPress={() => router.push("/legal")}
          />
          {user?.role === "ADMIN" && (
            <>
              <View style={styles.rowDivider} />
              <SettingRow
                icon="warning-outline"
                label="Report Management"
                onPress={() => router.push("/admin/reports")}
              />
            </>
          )}
        </View>

        <SectionHeader title="Danger Zone" />
        <View style={styles.section}>
          <SettingRow
            icon="trash-outline"
            label="Delete Account"
            sublabel="All your data will be permanently erased. Delete your communities first."
            destructive
            chevron={false}
            onPress={handleDeleteAccount}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="log-out-outline"
            label="Sign Out"
            destructive
            chevron={false}
            onPress={handleLogout}
          />
        </View>

        <Text style={styles.versionText}>RawStock v1.0.0</Text>
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
    </AuthGuard>
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
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  profileAvatar: {},
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 2 },
  profileSub: { fontSize: 12, color: C.textMuted },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textMuted,
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 6,
    marginHorizontal: 20,
    textTransform: "uppercase",
  },
  section: {
    backgroundColor: C.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconDestructive: {
    backgroundColor: "#3A1A1A",
  },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "600", color: C.text },
  rowSublabel: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  rowDivider: {
    height: 1,
    backgroundColor: C.border,
    marginLeft: 60,
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    color: C.textMuted,
    marginTop: 24,
    marginBottom: 8,
  },
});
