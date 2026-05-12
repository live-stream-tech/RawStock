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
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";
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
  const isJaUi = (user?.preferredLanguage ?? "").toLowerCase().startsWith("ja");

  async function handleDeleteAccount() {
    const msg = isJaUi
      ? "アカウントを削除すると、プライバシーポリシーに基づき個人データの削除手続きが開始されます。\n\n" +
        "コミュニティのオーナーである間は削除できません。先にオーナー権限の移譲またはコミュニティ削除を行ってください。\n\n" +
        "税務・不正防止など法令上必要な情報、紛争対応情報、バックアップ内データはポリシー記載の期間保持される場合があります。"
      : "Deleting your account starts erasure of your personal data in line with our Privacy Policy.\n\n" +
        "You cannot delete while you own a community—transfer ownership or delete those communities first.\n\n" +
        "Some data may be retained longer where required by law (for example tax or fraud prevention), for disputes, or in rolling backups, as described in the Privacy Policy.";
    const doDelete = async () => {
      try {
        await apiRequest("DELETE", "/api/auth/account");
        await AsyncStorage.removeItem("auth_token");
        logout();
      } catch (e: any) {
        let errMsg = isJaUi ? "削除に失敗しました" : "Deletion failed";
        if (e?.body) {
          try {
            const j = JSON.parse(e.body);
            if (j.error) errMsg = j.error;
          } catch {
            errMsg = e.message ?? errMsg;
          }
        } else if (e?.message) errMsg = e.message;
        Alert.alert(isJaUi ? "エラー" : "Error", errMsg);
      }
    };
    Alert.alert(isJaUi ? "アカウント削除" : "Delete Account", msg, [
      { text: isJaUi ? "キャンセル" : "Cancel", style: "cancel" },
      { text: isJaUi ? "削除する" : "Delete", style: "destructive", onPress: doDelete },
    ]);
  }

  function handleLogout() {
    const doLogout = async () => {
      try {
        await AsyncStorage.removeItem("auth_token");
        if (Platform.OS === "web" && typeof window !== "undefined") {
          try {
            window.localStorage?.removeItem("auth_token");
          } catch {
            /* ignore */
          }
        }
      } finally {
        logout();
      }
    };
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const ok = window.confirm(isJaUi ? "サインアウトしてもよろしいですか？" : "Are you sure you want to sign out?");
      if (ok) void doLogout();
      return;
    }
    Alert.alert(isJaUi ? "サインアウト" : "Sign Out", isJaUi ? "サインアウトしてもよろしいですか？" : "Are you sure you want to sign out?", [
      { text: isJaUi ? "キャンセル" : "Cancel", style: "cancel" },
      { text: isJaUi ? "サインアウト" : "Sign Out", style: "destructive", onPress: () => void doLogout() },
    ]);
  }

  return (
    <AuthGuard>
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </Pressable>
          <Text style={styles.headerTitle}>{isJaUi ? "設定" : "Settings"}</Text>
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
                <Text style={styles.profileSub}>{isJaUi ? "Googleでサインイン中" : "Signed in with Google"}</Text>
              </View>
            </View>
          )}

          <SectionHeader title={isJaUi ? "アカウント" : "Account"} />
          <View style={styles.section}>
            <SettingRow
              icon="person-outline"
              label={isJaUi ? "プロフィール編集" : "Edit Profile"}
              sublabel={isJaUi ? "名前・自己紹介・画像・SNSリンクなど" : "Name, bio, avatar, social links & more"}
              onPress={() => router.push("/account")}
            />
          </View>

        <SectionHeader title={isJaUi ? "収益・支払い" : "Revenue & Payments"} />
        <View style={styles.section}>
          <SettingRow
            icon="wallet-outline"
            label={isJaUi ? "収益ダッシュボード" : "Revenue Dashboard"}
            sublabel={isJaUi ? "売上確認と出金申請" : "View earnings & request payouts"}
            onPress={() => router.push("/revenue")}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="card-outline"
            label={isJaUi ? "出金設定" : "Payout Settings"}
            sublabel={isJaUi ? "銀行口座の登録・変更" : "Register or change your bank account"}
            onPress={() => router.push("/payout-settings")}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="receipt-outline"
            label={isJaUi ? "取引履歴" : "Transaction History"}
            sublabel={isJaUi ? "過去の売上・出金履歴" : "Past sales & payout records"}
            onPress={() => router.push("/revenue")}
          />
        </View>

        <SectionHeader title={isJaUi ? "クリエイターツール" : "Artist Tools"} />
        <View style={styles.section}>
          <SettingRow
            icon="calendar-outline"
            label={isJaUi ? "セッション予定" : "Session Schedule"}
            sublabel={isJaUi ? "予約枠の管理" : "Manage your bookable slots"}
            onPress={() => router.push("/liver-schedule")}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="analytics-outline"
            label={isJaUi ? "マイスコア" : "My Score"}
            sublabel={isJaUi ? "満足度・実施回数・出席率" : "Satisfaction, sessions & attendance"}
            onPress={() => Alert.alert(isJaUi ? "準備中" : "Coming Soon", isJaUi ? "この機能は近日公開予定です" : "This feature will be available soon")}
          />
        </View>

        <SectionHeader title={isJaUi ? "通知" : "Notifications"} />
        <View style={styles.section}>
          <SettingRow
            icon="notifications-outline"
            label={isJaUi ? "プッシュ通知" : "Push Notifications"}
            onPress={() => Alert.alert(isJaUi ? "準備中" : "Coming Soon", isJaUi ? "この機能は近日公開予定です" : "This feature will be available soon")}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="mail-unread-outline"
            label={isJaUi ? "メール通知" : "Email Notifications"}
            onPress={() => Alert.alert(isJaUi ? "準備中" : "Coming Soon", isJaUi ? "この機能は近日公開予定です" : "This feature will be available soon")}
          />
        </View>

        <SectionHeader title={isJaUi ? "サポート" : "Support"} />
        <View style={styles.section}>
          <SettingRow
            icon="help-circle-outline"
            label={isJaUi ? "ヘルプ・FAQ" : "Help & FAQ"}
            onPress={() => Alert.alert(isJaUi ? "準備中" : "Coming Soon", isJaUi ? "この機能は近日公開予定です" : "This feature will be available soon")}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="bug-outline"
            label="Report a Bug"
            sublabel="Tell us what broke and attach app context automatically"
            onPress={() => router.push({ pathname: "/bug-report", params: { source: "/settings" } } as any)}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="library-outline"
            label={isJaUi ? "利用規約・ポリシー" : "Legal & Policies"}
            sublabel={isJaUi ? "利用規約・プライバシー・DMCA・ガイドライン" : "Terms, Privacy, DMCA, Guidelines, notices"}
            onPress={() => router.push("/legal")}
          />
          {user?.role === "ADMIN" && (
            <>
              <View style={styles.rowDivider} />
              <SettingRow
                icon="warning-outline"
                label={isJaUi ? "通報管理" : "Report Management"}
                onPress={() => router.push("/admin/reports")}
              />
              <View style={styles.rowDivider} />
              <SettingRow
                icon="bug-outline"
                label="Bug Reports"
                onPress={() => router.push("/admin/bug-reports" as any)}
              />
            </>
          )}
        </View>

        <SectionHeader title={isJaUi ? "危険操作" : "Danger Zone"} />
        <View style={styles.section}>
          <SettingRow
            icon="trash-outline"
            label={isJaUi ? "アカウント削除" : "Delete Account"}
            sublabel={isJaUi ? "データは完全に削除されます。先にコミュニティを削除してください。" : "All your data will be permanently erased. Delete your communities first."}
            destructive
            chevron={false}
            onPress={handleDeleteAccount}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="log-out-outline"
            label={isJaUi ? "サインアウト" : "Sign Out"}
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
