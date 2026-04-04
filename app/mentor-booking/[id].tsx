import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { scrollShowsHorizontal, scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/lib/auth";
import { C } from "@/constants/colors";
import { PRICE_PER_TICKET_USD } from "@/constants/tickets";

type LiveStream = {
  id: number;
  title: string;
  creator: string;
  avatar: string;
  thumbnail: string;
  viewers: number;
};

type Step = "terms" | "legal" | "confirm";

const TERMS = [
  {
    id: "no_record",
    icon: "camera-off" as const,
    title: "No Recording",
    body: "Photos, videos, audio recordings, and screenshots of any kind are strictly prohibited.",
  },
  {
    id: "no_sns",
    icon: "logo-twitter" as const,
    title: "No Social Media Posting",
    body: "Session content, creator statements, or any footage may not be posted or shared on social media.",
  },
  {
    id: "no_contact",
    icon: "warning" as const,
    title: "No Harassment",
    body: "Sexual remarks, inappropriate behaviour, harassment, or excessive demands will result in immediate removal.",
  },
  {
    id: "no_refund",
    icon: "card" as const,
    title: "No Refunds (in principle)",
    body: "Cancellations made by the user are non-refundable. Refunds are issued only in the event of creator cancellation.",
  },
];

const MENTOR_TICKET_PRICE = 500; // $5.00 — must match server/routes.ts

export default function MentorBookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const streamId = parseInt(id ?? "1");
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const [step, setStep] = useState<Step>("terms");
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const { user, requireAuth } = useAuth();

  const { data: stream } = useQuery<LiveStream>({
    queryKey: [`/api/live-streams/${streamId}`],
  });
  const { data: queueData } = useQuery<{ count: number }>({
    queryKey: [`/api/mentor/${streamId}/queue-count`],
  });
  const { data: ticketData, refetch: refetchTickets } = useQuery<{ balance: number }>({
    queryKey: ["/api/tickets/balance"],
  });

  const allAgreed = TERMS.every((t) => agreed[t.id]);
  const queuePos = (queueData?.count ?? 0) + 1;
  const ticketBalance = ticketData?.balance ?? 0;
  const canAfford = ticketBalance >= MENTOR_TICKET_PRICE;

  async function handleSpendTickets() {
    if (!requireAuth("Mentor Session")) return;
    if (!canAfford) {
      Alert.alert(
        "Not Enough Tickets",
        `You need ${MENTOR_TICKET_PRICE} 🎟 to book this session.\nYou currently have ${ticketBalance} 🎟.\n\nHead to the Ticket Shop to top up.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Get Tickets", onPress: () => router.push("/tickets") },
        ]
      );
      return;
    }
    setLoading(true);
    try {
      await apiRequest("POST", `/api/tickets/spend`, {
        amount: MENTOR_TICKET_PRICE,
        type: "spend_session",
        referenceId: String(streamId),
        description: `Mentor session with ${stream?.creator ?? "creator"} (stream #${streamId})`,
      });
      await refetchTickets();
      Alert.alert(
        "Booking Confirmed! 🎉",
        `You are #${queuePos} in the queue.\nYour session will begin when it's your turn during the live stream.\n\n${MENTOR_TICKET_PRICE} 🎟 have been deducted.`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (e: any) {
      const errBody = e?.body ?? e ?? {};
      if (errBody?.error === "Insufficient tickets") {
        Alert.alert("Not Enough Tickets", `You need ${MENTOR_TICKET_PRICE} 🎟 but only have ${errBody.balance ?? ticketBalance} 🎟.`);
      } else {
        Alert.alert("Error", "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Mentor Session</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepBar}>
        {(["terms", "legal", "confirm"] as Step[]).map((s, i) => {
          const labels = ["Agreement", "Legal Notice", "Confirm & Pay"];
          const isActive = step === s;
          const isDone =
            (s === "terms" && (step === "legal" || step === "confirm")) ||
            (s === "legal" && step === "confirm");
          return (
            <React.Fragment key={s}>
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepDot,
                    isActive && styles.stepDotActive,
                    isDone && styles.stepDotDone,
                  ]}
                >
                  {isDone ? (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  ) : (
                    <Text style={styles.stepNum}>{i + 1}</Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>
                  {labels[i]}
                </Text>
              </View>
              {i < 2 && <View style={[styles.stepLine, isDone && styles.stepLineDone]} />}
            </React.Fragment>
          );
        })}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={scrollShowsVertical}>
        {/* Stream info */}
        {stream && (
          <View style={styles.streamCard}>
            <Image source={{ uri: stream.thumbnail }} style={styles.streamThumb} contentFit="cover" />
            <View style={styles.streamCardOverlay} />
            <View style={styles.streamCardInfo}>
              <Image source={{ uri: stream.avatar }} style={styles.streamAvatar} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.streamCreator}>{stream.creator}</Text>
                <Text style={styles.streamTitle} numberOfLines={1}>{stream.title}</Text>
              </View>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>
            </View>
          </View>
        )}

        {/* STEP 1: Terms */}
        {step === "terms" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Session Rules & Agreement</Text>
            <Text style={styles.sectionDesc}>
              You must agree to all items below before proceeding to payment.
            </Text>
            {TERMS.map((term) => (
              <Pressable
                key={term.id}
                style={[styles.termCard, agreed[term.id] && styles.termCardAgreed]}
                onPress={() => setAgreed((prev) => ({ ...prev, [term.id]: !prev[term.id] }))}
              >
                <View style={styles.termHeader}>
                  <View style={[styles.termIconBox, agreed[term.id] && styles.termIconBoxAgreed]}>
                    <Ionicons
                      name={term.icon as any}
                      size={18}
                      color={agreed[term.id] ? "#fff" : C.textMuted}
                    />
                  </View>
                  <Text style={[styles.termTitle, agreed[term.id] && styles.termTitleAgreed]}>
                    {term.title}
                  </Text>
                  <View style={[styles.checkbox, agreed[term.id] && styles.checkboxChecked]}>
                    {agreed[term.id] && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </View>
                <Text style={styles.termBody}>{term.body}</Text>
              </Pressable>
            ))}
            <Pressable
              style={[styles.nextBtn, !allAgreed && styles.nextBtnDisabled]}
              onPress={() => allAgreed && setStep("legal")}
              disabled={!allAgreed}
            >
              <Text style={styles.nextBtnText}>View Legal Notice</Text>
              <Ionicons name="chevron-forward" size={16} color="#fff" />
            </Pressable>
          </View>
        )}

        {/* STEP 2: Legal Notice */}
        {step === "legal" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Legal Notice</Text>
            <View style={styles.tokushoCard}>
              {[
                ["Operator", "RawStock Operations"],
                ["Service", "Mentor Session Booking"],
                ["Price", `🎟 ${MENTOR_TICKET_PRICE.toLocaleString()} Tickets ($${(MENTOR_TICKET_PRICE * PRICE_PER_TICKET_USD).toFixed(2)} USD)`],
                ["Payment Timing", "At time of booking (Ticket deduction)"],
                ["Service Timing", "During the live stream, when your queue position is reached"],
                ["Cancellation", "No refunds for user-initiated cancellations. Full refund if cancelled by creator."],
                ["Payment Method", "RawStock Tickets (purchased via Stripe in USD)"],
                ["Support", "support@rawstock-app.com"],
              ].map(([label, value]) => (
                <View key={label} style={styles.tokushoRow}>
                  <Text style={styles.tokushoLabel}>{label}</Text>
                  <Text style={styles.tokushoValue}>{value}</Text>
                </View>
              ))}
            </View>
            <View style={styles.btnRow}>
              <Pressable style={styles.backStepBtn} onPress={() => setStep("terms")}>
                <Ionicons name="chevron-back" size={15} color={C.textSec} />
                <Text style={styles.backStepText}>Back</Text>
              </Pressable>
              <Pressable style={[styles.nextBtn, { flex: 1 }]} onPress={() => setStep("confirm")}>
                <Text style={styles.nextBtnText}>Confirm & Book</Text>
                <Ionicons name="chevron-forward" size={16} color="#fff" />
              </Pressable>
            </View>
          </View>
        )}

        {/* STEP 3: Confirm & Pay */}
        {step === "confirm" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Summary</Text>

            <View style={styles.confirmCard}>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Queue Position</Text>
                <Text style={styles.confirmValue}>
                  <Text style={styles.confirmHighlight}>{queuePos}</Text>
                  {" "}in line
                </Text>
              </View>
              <View style={styles.confirmDivider} />
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Service</Text>
                <Text style={styles.confirmValue}>Mentor Session</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Creator</Text>
                <Text style={styles.confirmValue}>{stream?.creator ?? "---"}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>When</Text>
                <Text style={styles.confirmValue}>During live stream</Text>
              </View>
              <View style={styles.confirmDivider} />
              <View style={styles.confirmRow}>
                <Text style={[styles.confirmLabel, { fontSize: 15 }]}>Cost</Text>
                <Text style={styles.priceText}>🎟 {MENTOR_TICKET_PRICE.toLocaleString()}</Text>
              </View>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>Your Balance</Text>
                <Text style={[styles.balanceValue, !canAfford && styles.balanceInsufficient]}>
                  🎟 {ticketBalance.toLocaleString()}
                </Text>
              </View>
            </View>

            {!canAfford && (
              <View style={styles.warningBox}>
                <Ionicons name="alert-circle" size={15} color={C.live} />
                <Text style={[styles.warningText, { color: C.live }]}>
                  You need {MENTOR_TICKET_PRICE} 🎟 but only have {ticketBalance}. Tap "Get Tickets" to top up.
                </Text>
              </View>
            )}

            <View style={styles.warningBox}>
              <Ionicons name="alert-circle" size={15} color={C.orange} />
              <Text style={styles.warningText}>
                A watermark will be displayed during the session. Unauthorised capture or redistribution is a violation of our terms.
              </Text>
            </View>

            <View style={styles.btnRow}>
              <Pressable style={styles.backStepBtn} onPress={() => setStep("legal")}>
                <Ionicons name="chevron-back" size={15} color={C.textSec} />
                <Text style={styles.backStepText}>Back</Text>
              </Pressable>
              {canAfford ? (
                <Pressable
                  style={[styles.payBtn, loading && styles.nextBtnDisabled]}
                  onPress={handleSpendTickets}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.ticketIcon}>🎟</Text>
                  )}
                  <Text style={styles.payBtnText}>
                    {loading ? "Processing..." : `Book for ${MENTOR_TICKET_PRICE} Tickets`}
                  </Text>
                </Pressable>
              ) : (
                <Pressable style={[styles.payBtn, { backgroundColor: C.accent }]} onPress={() => router.push("/tickets")}>
                  <Ionicons name="ticket-outline" size={16} color="#fff" />
                  <Text style={styles.payBtnText}>Get Tickets</Text>
                </Pressable>
              )}
            </View>

            <Text style={styles.stripeNote}>
              Tickets are purchased via Stripe in USD. 1 Ticket = $0.01.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: C.text,
    fontSize: 16,
    fontWeight: "700",
  },
  stepBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  stepItem: { alignItems: "center", gap: 4 },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.surface3,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: { backgroundColor: C.accent },
  stepDotDone: { backgroundColor: C.green },
  stepNum: { color: C.textMuted, fontSize: 11, fontWeight: "700" },
  stepLabel: { color: C.textMuted, fontSize: 10 },
  stepLabelActive: { color: C.accent, fontWeight: "700" },
  stepLine: { flex: 1, height: 2, backgroundColor: C.border, marginBottom: 14 },
  stepLineDone: { backgroundColor: C.green },
  scroll: { flex: 1 },
  streamCard: {
    height: 120,
    position: "relative",
    margin: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  streamThumb: { ...StyleSheet.absoluteFillObject },
  streamCardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  streamCardInfo: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  streamAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: C.accent,
  },
  streamCreator: { color: "#fff", fontSize: 13, fontWeight: "700" },
  streamTitle: { color: "rgba(255,255,255,0.75)", fontSize: 11 },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.live,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#fff" },
  liveBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  section: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: "800", marginTop: 4 },
  sectionDesc: { color: C.textSec, fontSize: 13, lineHeight: 19 },
  termCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  termCardAgreed: { borderColor: C.green, backgroundColor: "rgba(0,200,83,0.05)" },
  termHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  termIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: C.surface3,
    alignItems: "center",
    justifyContent: "center",
  },
  termIconBoxAgreed: { backgroundColor: C.green },
  termTitle: { flex: 1, color: C.text, fontSize: 14, fontWeight: "700" },
  termTitleAgreed: { color: C.green },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: C.green, borderColor: C.green },
  termBody: { color: C.textSec, fontSize: 12, lineHeight: 18 },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.accent,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  tokushoCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
  },
  tokushoRow: {
    flexDirection: "row",
    padding: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tokushoLabel: { color: C.textMuted, fontSize: 12, width: 90 },
  tokushoValue: { flex: 1, color: C.text, fontSize: 12, lineHeight: 18 },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  backStepBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 2,
  },
  backStepText: { color: C.textSec, fontSize: 14 },
  confirmCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  confirmRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  confirmLabel: { color: C.textSec, fontSize: 13 },
  confirmValue: { color: C.text, fontSize: 13, fontWeight: "600", textAlign: "right" },
  confirmHighlight: { color: C.accent, fontSize: 22, fontWeight: "800" },
  confirmDivider: { height: 1, backgroundColor: C.border },
  priceText: { color: C.accent, fontSize: 20, fontWeight: "800" },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  balanceLabel: { color: C.textMuted, fontSize: 12 },
  balanceValue: { color: C.green, fontSize: 13, fontWeight: "700" },
  balanceInsufficient: { color: C.live },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(255,139,0,0.08)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,139,0,0.2)",
  },
  warningText: { flex: 1, color: C.orange, fontSize: 12, lineHeight: 18 },
  payBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.green,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  payBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  ticketIcon: { fontSize: 16 },
  stripeNote: {
    color: C.textMuted,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    marginTop: 4,
  },
});
