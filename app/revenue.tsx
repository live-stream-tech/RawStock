import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Svg, { Rect, Text as SvgText } from "react-native-svg";
import { apiRequest } from "@/lib/query-client";
import { AuthGuard } from "@/lib/auth";
import { C } from "@/constants/colors";

type Summary = {
  totalEarned: number;
  totalWithdrawn: number;
  pendingWithdrawal: number;
  available: number;
  monthly: { month: string; amount: number }[];
};
type Earning = {
  id: number;
  type: string;
  title: string;
  amount: number;
  revenueShare: number;
  netAmount: number;
  createdAt: string;
};
type Withdrawal = {
  id: number;
  amount: number;
  status: string;
  bankName: string;
  bankBranch: string;
  accountType: string;
  accountNumber: string;
  accountName: string;
  requestedAt: string;
  processedAt: string | null;
};

const TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  video_sale: { label: "Video Sale", icon: "play-circle", color: C.accent },
  gift: { label: "Gift", icon: "gift", color: C.orange },
  mentor: { label: "Mentor Session", icon: "camera", color: "#E91E63" },
  twoshot: { label: "Mentor Session", icon: "camera", color: "#E91E63" },
  other: { label: "Other", icon: "cash", color: C.green },
};
const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: C.orange, bg: C.orange + "22" },
  processing: { label: "Processing", color: C.accent, bg: C.accent + "22" },
  completed: { label: "Completed", color: C.green, bg: C.green + "22" },
  failed: { label: "Failed", color: C.live, bg: C.live + "22" },
};

function formatUsdFromTickets(tickets: number): string {
  return `$${(tickets / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function BarChart({ data }: { data: { month: string; amount: number }[] }) {
  const W = 280;
  const H = 100;
  const BAR_W = 30;
  const GAP = (W - data.length * BAR_W) / (data.length + 1);
  const maxVal = Math.max(...data.map((d) => d.amount), 1);
  const MAX_H = 70;

  return (
    <Svg width={W} height={H + 20}>
      {data.map((d, i) => {
        const barH = Math.max((d.amount / maxVal) * MAX_H, d.amount > 0 ? 4 : 0);
        const x = GAP + i * (BAR_W + GAP);
        const y = H - barH;
        const isLast = i === data.length - 1;
        return (
          <React.Fragment key={i}>
            <Rect
              x={x}
              y={y}
              width={BAR_W}
              height={barH}
              rx={6}
              fill={isLast ? C.accent : C.accent + "55"}
            />
            <SvgText
              x={x + BAR_W / 2}
              y={H + 14}
              fontSize="10"
              fill={isLast ? C.accent : "rgba(255,255,255,0.4)"}
              textAnchor="middle"
              fontWeight={isLast ? "700" : "400"}
            >
              {d.month}
            </SvgText>
            {d.amount > 0 && (
              <SvgText
                x={x + BAR_W / 2}
                y={y - 4}
                fontSize="8"
                fill={isLast ? C.accent : "rgba(255,255,255,0.5)"}
                textAnchor="middle"
              >
                {d.amount >= 1000 ? `${Math.floor(d.amount / 1000)}k` : String(d.amount)}
              </SvgText>
            )}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

const ACCOUNT_TYPES = ["Checking", "Current"];

function RevenueScreenContent() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const qc = useQueryClient();

  const [tab, setTab] = useState<"earnings" | "withdrawals">("earnings");
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [amountText, setAmountText] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [accountType, setAccountType] = useState("Checking"); // "Checking" or "Current"
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  const { data: summary } = useQuery<Summary>({ queryKey: ["/api/revenue/summary"] });
  const { data: earningsList = [] } = useQuery<Earning[]>({ queryKey: ["/api/revenue/earnings"] });
  const { data: withdrawalsList = [] } = useQuery<Withdrawal[]>({ queryKey: ["/api/revenue/withdrawals"] });

  const withdrawMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/revenue/withdraw", {
        amount: parseInt(amountText),
        bankName,
        bankBranch,
        accountType,
        accountNumber,
        accountName,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/revenue/summary"] });
      qc.invalidateQueries({ queryKey: ["/api/revenue/withdrawals"] });
      setShowWithdrawModal(false);
      resetForm();
      Alert.alert("Transfer Completed", "Your withdrawal was transferred successfully.");
    },
    onError: (e: any) => {
      Alert.alert("Error", e?.message ?? "Failed to submit request");
    },
  });

  function resetForm() {
    setAmountText("");
    setBankName("");
    setBankBranch("");
    setAccountType("Checking"); // reset to default
    setAccountNumber("");
    setAccountName("");
  }

  const canSubmit =
    amountText.trim() &&
    parseInt(amountText) >= 1000 &&
    bankName.trim() &&
    bankBranch.trim() &&
    accountNumber.trim() &&
    accountName.trim();

  const formatDate = (s: string) => {
    const d = new Date(s);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>REVENUE MANAGEMENT</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Available balance */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>
            🎟{(summary?.available ?? 0).toLocaleString()}
          </Text>
          <Text style={styles.balanceUsdHint}>{formatUsdFromTickets(summary?.available ?? 0)}</Text>
          <View style={styles.balanceStats}>
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatLabel}>Total Earned</Text>
              <Text style={styles.balanceStatValue}>🎟{(summary?.totalEarned ?? 0).toLocaleString()}</Text>
              <Text style={styles.balanceStatSub}>{formatUsdFromTickets(summary?.totalEarned ?? 0)}</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatLabel}>Withdrawn</Text>
              <Text style={[styles.balanceStatValue, { color: C.green }]}>
                🎟{(summary?.totalWithdrawn ?? 0).toLocaleString()}
              </Text>
              <Text style={styles.balanceStatSub}>{formatUsdFromTickets(summary?.totalWithdrawn ?? 0)}</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatLabel}>Pending</Text>
              <Text style={[styles.balanceStatValue, { color: C.orange }]}>
                🎟{(summary?.pendingWithdrawal ?? 0).toLocaleString()}
              </Text>
              <Text style={styles.balanceStatSub}>{formatUsdFromTickets(summary?.pendingWithdrawal ?? 0)}</Text>
            </View>
          </View>
          <Pressable
            style={[styles.withdrawBtn, !summary?.available && styles.withdrawBtnDisabled]}
            onPress={() => summary?.available && setShowWithdrawModal(true)}
          >
            <Ionicons name="arrow-up-circle-outline" size={18} color="#fff" />
            <Text style={styles.withdrawBtnText}>Withdraw</Text>
          </Pressable>
        </View>

        {/* Monthly chart */}
        <View style={styles.chartCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bar-chart-outline" size={14} color={C.accent} />
            <Text style={styles.sectionTitle}>Monthly Revenue (Net)</Text>
          </View>
          <View style={styles.chartWrap}>
            <BarChart data={summary?.monthly ?? []} />
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tabBtn, tab === "earnings" && styles.tabBtnActive]}
            onPress={() => setTab("earnings")}
          >
            <Text style={[styles.tabText, tab === "earnings" && styles.tabTextActive]}>Earnings</Text>
          </Pressable>
          <Pressable
            style={[styles.tabBtn, tab === "withdrawals" && styles.tabBtnActive]}
            onPress={() => setTab("withdrawals")}
          >
            <Text style={[styles.tabText, tab === "withdrawals" && styles.tabTextActive]}>Withdrawals</Text>
          </Pressable>
        </View>

        {/* Earnings list */}
        {tab === "earnings" && (
          <View style={styles.listCard}>
            {earningsList.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No earnings yet</Text>
              </View>
            ) : (
              earningsList.map((e) => {
                const meta = TYPE_META[e.type] ?? TYPE_META.other;
                return (
                  <View key={e.id} style={styles.earningRow}>
                    <View style={[styles.earningIcon, { backgroundColor: meta.color + "22" }]}>
                      <Ionicons name={meta.icon as any} size={16} color={meta.color} />
                    </View>
                    <View style={styles.earningInfo}>
                      <Text style={styles.earningTitle} numberOfLines={1}>{e.title}</Text>
                      <Text style={styles.earningMeta}>
                        {meta.label} • {formatDate(e.createdAt)} • {e.revenueShare}%
                      </Text>
                    </View>
                    <View style={styles.earningAmounts}>
                      <Text style={styles.earningNet}>+🎟{e.netAmount.toLocaleString()}</Text>
                      <Text style={styles.earningGross}>Gross 🎟{e.amount.toLocaleString()}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Withdrawals list */}
        {tab === "withdrawals" && (
          <View style={styles.listCard}>
            {withdrawalsList.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No withdrawals yet</Text>
              </View>
            ) : (
              withdrawalsList.map((w) => {
                const st = STATUS_META[w.status] ?? STATUS_META.pending;
                return (
                  <View key={w.id} style={styles.withdrawRow}>
                    <View style={styles.withdrawRowLeft}>
                      <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                        <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                      </View>
                      <View>
                        <Text style={styles.withdrawBank}>{w.bankName} {w.bankBranch}</Text>
                        <Text style={styles.withdrawAccount}>
                          {w.accountType} {w.accountNumber.replace(/\d(?=\d{4})/, "*")} {w.accountName}
                        </Text>
                        <Text style={styles.withdrawDate}>
                          Requested {formatDate(w.requestedAt)}
                          {w.processedAt ? ` → Completed ${formatDate(w.processedAt)}` : ""}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.withdrawAmount, { color: w.status === "completed" ? C.green : C.text }]}>
                      🎟{w.amount.toLocaleString()}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Withdrawal Modal */}
      <Modal visible={showWithdrawModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.modalBg} onPress={() => setShowWithdrawModal(false)} />
          <View style={[styles.modalSheet, { paddingBottom: bottomInset + 16 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalTitleRow}>
              <Ionicons name="arrow-up-circle" size={20} color={C.accent} />
              <Text style={styles.modalTitle}>Withdrawal Request</Text>
            </View>
            <Text style={styles.modalAvail}>
              Available: <Text style={{ color: C.accent, fontWeight: "800" }}>🎟{(summary?.available ?? 0).toLocaleString()}</Text> ({formatUsdFromTickets(summary?.available ?? 0)})
            </Text>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Amount */}
              <Text style={styles.fieldLabel}>Amount in tickets (1 ticket = $0.01, min. 🎟1,000 = $10.00)</Text>
              <View style={styles.amountRow}>
                <Text style={styles.ticketSign}>🎟</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amountText}
                  onChangeText={setAmountText}
                  keyboardType="numeric"
                  placeholder="e.g. 200"
                  placeholderTextColor={C.textMuted}
                />
              </View>
              {amountText && parseInt(amountText) < 1000 && (
                <Text style={styles.fieldError}>Minimum withdrawal is 🎟1,000 ($10.00)</Text>
              )}
              {amountText && parseInt(amountText) > (summary?.available ?? 0) && (
                <Text style={styles.fieldError}>Exceeds available balance</Text>
              )}

              {/* Divider */}
              <View style={styles.sectionDivider}>
                <Text style={styles.sectionDividerText}>Payout Account</Text>
              </View>

              <Text style={styles.fieldLabel}>Bank Name</Text>
              <TextInput
                style={styles.textInput}
                value={bankName}
                onChangeText={setBankName}
                placeholder="e.g. Chase Bank"
                placeholderTextColor={C.textMuted}
              />

              <Text style={styles.fieldLabel}>Branch / Routing</Text>
              <TextInput
                style={styles.textInput}
                value={bankBranch}
                onChangeText={setBankBranch}
                placeholder="e.g. New York Branch"
                placeholderTextColor={C.textMuted}
              />

              <Text style={styles.fieldLabel}>Account Type</Text>
              <View style={styles.accountTypeRow}>
                {ACCOUNT_TYPES.map((t) => (
                  <Pressable
                    key={t}
                    style={[styles.accountTypeBtn, accountType === t && styles.accountTypeBtnActive]}
                    onPress={() => setAccountType(t)}
                  >
                    <Text style={[styles.accountTypeText, accountType === t && styles.accountTypeTextActive]}>
                      {t}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Account Number</Text>
              <TextInput
                style={styles.textInput}
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder="e.g. 123456789"
                placeholderTextColor={C.textMuted}
                keyboardType="numeric"
                maxLength={8}
              />

              <Text style={styles.fieldLabel}>Account Holder Name</Text>
              <TextInput
                style={styles.textInput}
                value={accountName}
                onChangeText={setAccountName}
                placeholder="e.g. JOHN SMITH"
                placeholderTextColor={C.textMuted}
              />

              <View style={styles.noticeBox}>
                <Ionicons name="information-circle-outline" size={14} color={C.textMuted} />
                <Text style={styles.noticeText}>
                  Payouts are processed within 3–5 business days. No fees.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowWithdrawModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
                onPress={() => canSubmit && withdrawMutation.mutate()}
                disabled={!canSubmit || withdrawMutation.isPending}
              >
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                <Text style={styles.submitText}>
                  {withdrawMutation.isPending ? "Submitting..." : "Submit Request"}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

export default function RevenueScreen() {
  return (
    <AuthGuard>
      <RevenueScreenContent />
    </AuthGuard>
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
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: C.text, fontSize: 14, fontWeight: "800", letterSpacing: 0.5 },
  scroll: { flex: 1 },

  balanceCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: "#0F2030",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: C.accent + "44",
  },
  balanceLabel: { color: C.textMuted, fontSize: 12, fontWeight: "600", marginBottom: 4 },
  balanceAmount: { color: C.text, fontSize: 38, fontWeight: "800", marginBottom: 2 },
  balanceUsdHint: { color: C.textMuted, fontSize: 13, marginBottom: 14 },
  balanceStats: { flexDirection: "row", marginBottom: 20, gap: 0 },
  balanceStat: { flex: 1, alignItems: "center" },
  balanceDivider: { width: 1, backgroundColor: C.border },
  balanceStatLabel: { color: C.textMuted, fontSize: 10, marginBottom: 4 },
  balanceStatValue: { color: C.text, fontSize: 14, fontWeight: "700" },
  balanceStatSub: { color: C.textMuted, fontSize: 10, marginTop: 2 },
  withdrawBtn: {
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  withdrawBtnDisabled: { backgroundColor: C.surface2, opacity: 0.5 },
  withdrawBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  chartCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  sectionTitle: { color: C.accent, fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  chartWrap: { alignItems: "center" },

  tabRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
  },
  tabBtnActive: { backgroundColor: C.accent },
  tabText: { color: C.textMuted, fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: "#fff", fontWeight: "700" },

  listCard: {
    marginHorizontal: 16,
    backgroundColor: C.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
  },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { color: C.textMuted, fontSize: 13 },

  earningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  earningIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  earningInfo: { flex: 1 },
  earningTitle: { color: C.text, fontSize: 13, fontWeight: "600", marginBottom: 2 },
  earningMeta: { color: C.textMuted, fontSize: 11 },
  earningAmounts: { alignItems: "flex-end" },
  earningNet: { color: C.green, fontSize: 15, fontWeight: "800" },
  earningGross: { color: C.textMuted, fontSize: 10, marginTop: 2 },

  withdrawRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 10,
  },
  withdrawRowLeft: { flex: 1, gap: 6 },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: "700" },
  withdrawBank: { color: C.text, fontSize: 13, fontWeight: "600" },
  withdrawAccount: { color: C.textMuted, fontSize: 11 },
  withdrawDate: { color: C.textMuted, fontSize: 11 },
  withdrawAmount: { fontSize: 17, fontWeight: "800" },

  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  modalSheet: {
    backgroundColor: "#131E2A",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "90%",
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: "center",
    marginBottom: 18,
  },
  modalTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  modalTitle: { color: C.text, fontSize: 18, fontWeight: "800" },
  modalAvail: { color: C.textMuted, fontSize: 13, marginBottom: 20 },
  modalScroll: { maxHeight: 460 },
  fieldLabel: { color: C.textSec, fontSize: 12, fontWeight: "600", marginBottom: 6, marginTop: 12 },
  fieldError: { color: C.live, fontSize: 11, marginTop: 4 },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface2,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: C.accent + "44",
  },
  ticketSign: { color: C.accent, fontSize: 20, fontWeight: "800", marginRight: 4 },
  amountInput: {
    flex: 1,
    color: C.text,
    fontSize: 22,
    fontWeight: "700",
    paddingVertical: 12,
  },
  textInput: {
    backgroundColor: C.surface2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  accountTypeRow: { flexDirection: "row", gap: 10 },
  accountTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
  },
  accountTypeBtnActive: { backgroundColor: C.accent + "22", borderColor: C.accent },
  accountTypeText: { color: C.textMuted, fontSize: 14, fontWeight: "600" },
  accountTypeTextActive: { color: C.accent, fontWeight: "700" },
  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    gap: 8,
  },
  sectionDividerText: { color: C.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  noticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  noticeText: { color: C.textMuted, fontSize: 11, flex: 1, lineHeight: 16 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
  },
  cancelText: { color: C.textSec, fontSize: 14, fontWeight: "700" },
  submitBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  submitBtnDisabled: { backgroundColor: C.surface2, opacity: 0.5 },
  submitText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
