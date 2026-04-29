import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, formatUserFacingApiError, getQueryFn } from "@/lib/query-client";
import { C } from "@/constants/colors";
import { HorizontalScroll } from "@/components/HorizontalScroll";
import { webScrollStyle } from "@/constants/layout";
import { useAuth } from "@/lib/auth";

type LiverMe = { id: number; name: string; category: string };

type Slot = {
  id: number;
  liverId: number;
  date: string;
  startTime: string;
  endTime: string;
  maxSlots: number;
  bookedSlots: number;
  note: string;
};

type SlotKind = "open" | "paid";
type SlotUi = Slot & { slotKind: SlotKind; ticketPrice: number | null; noteText: string };
const SLOT_META_PREFIX = "[RS_SLOT_META]";
const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

function parseSlotNote(raw: string | null | undefined): { slotKind: SlotKind; ticketPrice: number | null; noteText: string } {
  const text = String(raw ?? "");
  if (!text.startsWith(SLOT_META_PREFIX)) {
    return { slotKind: "open", ticketPrice: null, noteText: text };
  }
  const firstLineEnd = text.indexOf("\n");
  const header = firstLineEnd >= 0 ? text.slice(0, firstLineEnd) : text;
  const rest = firstLineEnd >= 0 ? text.slice(firstLineEnd + 1) : "";
  try {
    const payload = JSON.parse(header.slice(SLOT_META_PREFIX.length)) as { kind?: SlotKind; price?: number | null };
    return {
      slotKind: payload.kind === "paid" ? "paid" : "open",
      ticketPrice: typeof payload.price === "number" && payload.price > 0 ? Math.floor(payload.price) : null,
      noteText: rest,
    };
  } catch {
    return { slotKind: "open", ticketPrice: null, noteText: text };
  }
}

function buildSlotNote(kind: SlotKind, ticketPrice: number | null, noteText: string): string {
  const safeNote = noteText.trim();
  const meta = `${SLOT_META_PREFIX}${JSON.stringify({
    kind,
    price: kind === "paid" ? (ticketPrice ?? 0) : null,
  })}`;
  return safeNote ? `${meta}\n${safeNote}` : meta;
}

function generateNextDays(n: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${d.getMonth() + 1}/${d.getDate()} (${weekdays[d.getDay()]})`;
}

export default function LiverScheduleScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: liverMe, isLoading: meLoading, error: meError } = useQuery<LiverMe>({
    queryKey: ["/api/livers/me"],
    enabled: !!user,
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const liverId = liverMe?.id;

  const [showModal, setShowModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
  const [newStart, setNewStart] = useState("19:00");
  const [newEnd, setNewEnd] = useState("21:00");
  const [newMaxSlots, setNewMaxSlots] = useState("3");
  const [newNote, setNewNote] = useState("");
  const [newSlotKind, setNewSlotKind] = useState<SlotKind>("open");
  const [newTicketPrice, setNewTicketPrice] = useState("500");
  const [selectedDay, setSelectedDay] = useState(0);

  const days = generateNextDays(14);

  const { data: slots = [], isLoading: slotsLoading } = useQuery<Slot[]>({
    queryKey: [`/api/livers/${liverId}/availability`],
    enabled: !!liverId,
  });

  useEffect(() => {
    if (!showModal) {
      setEditingSlot(null);
    }
  }, [showModal]);

  function openAddModal() {
    setEditingSlot(null);
    setNewStart("19:00");
    setNewEnd("21:00");
    setNewMaxSlots("3");
    setNewNote("");
    setNewSlotKind("open");
    setNewTicketPrice("500");
    setShowModal(true);
  }

  function openEditModal(slot: Slot) {
    const parsed = parseSlotNote(slot.note);
    setEditingSlot(slot);
    setNewStart(slot.startTime);
    setNewEnd(slot.endTime);
    setNewMaxSlots(String(slot.maxSlots));
    setNewNote(parsed.noteText);
    setNewSlotKind(parsed.slotKind);
    setNewTicketPrice(parsed.ticketPrice != null ? String(parsed.ticketPrice) : "500");
    const dayIdx = days.findIndex((d) => d === slot.date);
    if (dayIdx >= 0) setSelectedDay(dayIdx);
    setShowModal(true);
  }

  const addMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      if (!liverId) throw new Error("No liver profile");
      return apiRequest("POST", `/api/livers/${liverId}/availability`, data);
    },
    onSuccess: () => {
      if (liverId) {
        queryClient.invalidateQueries({ queryKey: [`/api/livers/${liverId}/availability`] });
      }
      setShowModal(false);
      Alert.alert("Added", "Slot added successfully.");
    },
    onError: (e: unknown) => Alert.alert("Error", formatUserFacingApiError(e)),
  });

  const patchMutation = useMutation({
    mutationFn: async (vars: { slotId: number; body: Record<string, unknown> }) => {
      if (!liverId) throw new Error("No liver profile");
      return apiRequest("PATCH", `/api/livers/${liverId}/availability/${vars.slotId}`, vars.body);
    },
    onSuccess: () => {
      if (liverId) {
        queryClient.invalidateQueries({ queryKey: [`/api/livers/${liverId}/availability`] });
      }
      setShowModal(false);
      Alert.alert("Saved", "Slot updated.");
    },
    onError: (e: unknown) => Alert.alert("Error", formatUserFacingApiError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (slotId: number) => {
      if (!liverId) throw new Error("No liver profile");
      return apiRequest("DELETE", `/api/livers/${liverId}/availability/${slotId}`);
    },
    onSuccess: () => {
      if (liverId) {
        queryClient.invalidateQueries({ queryKey: [`/api/livers/${liverId}/availability`] });
      }
    },
    onError: (e: unknown) => Alert.alert("Error", formatUserFacingApiError(e)),
  });

  const selectedDate = days[selectedDay];
  const daySlots: SlotUi[] = slots
    .filter((s) => s.date === selectedDate)
    .map((s) => {
      const parsed = parseSlotNote(s.note);
      return { ...s, ...parsed };
    });

  function handleSaveModal() {
    if (newEnd <= newStart) {
      Alert.alert("時間エラー", "End time は Start time より後に設定してください。");
      return;
    }
    const maxN = parseInt(newMaxSlots, 10) || 3;
    const parsedPrice = parseInt(newTicketPrice, 10);
    const ticketPrice =
      newSlotKind === "paid"
        ? Number.isFinite(parsedPrice) && parsedPrice > 0
          ? parsedPrice
          : NaN
        : null;
    if (newSlotKind === "paid" && !Number.isFinite(ticketPrice as number)) {
      Alert.alert("料金エラー", "Paid の場合は ticket 料金を入力してください。");
      return;
    }
    const encodedNote = buildSlotNote(newSlotKind, ticketPrice as number | null, newNote);
    if (editingSlot) {
      patchMutation.mutate({
        slotId: editingSlot.id,
        body: {
          startTime: newStart,
          endTime: newEnd,
          maxSlots: maxN,
          note: encodedNote,
        },
      });
      return;
    }
    const date = days[selectedDay];
    addMutation.mutate({
      date,
      startTime: newStart,
      endTime: newEnd,
      maxSlots: maxN,
      note: encodedNote,
    });
  }

  function confirmDelete(slotId: number) {
    const run = () => deleteMutation.mutate(slotId);
    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm("Remove this slot?")) run();
      return;
    }
    Alert.alert("Delete Slot", "Remove this slot?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: run },
    ]);
  }

  const savingModal = addMutation.isPending || patchMutation.isPending;

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Live schedule</Text>
          <View style={{ width: 36 }} />
        </View>
        <Text style={styles.gateText}>Sign in to manage your live availability.</Text>
      </View>
    );
  }

  if (meLoading) {
    return (
      <View style={[styles.container, { paddingTop: topInset + 40 }]}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  if (meError || !liverId) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Live schedule</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.gateBox}>
          <Ionicons name="person-outline" size={40} color={C.textMuted} />
          <Text style={styles.gateTitle}>Session Liver profile required</Text>
          <Text style={styles.gateSub}>
            Register as a Session Liver in your profile first. Your display name must match your creator listing.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Live schedule</Text>
        <Pressable style={styles.addBtn} onPress={openAddModal}>
          <Ionicons name="add" size={20} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={16} color={C.accent} />
        <Text style={styles.infoText}>
          Slot ごとに Open / Paid を告知できます。Paid は ticket 料金を事前表示できます。時間は24時間表記で設定できます。
        </Text>
      </View>

      <HorizontalScroll
        style={styles.dayScroll}
        contentContainerStyle={styles.dayScrollContent}
        showArrows={false}
      >
        {days.map((d, i) => {
          const isSelected = i === selectedDay;
          const hasSlots = slots.some((s) => s.date === d);
          return (
            <Pressable
              key={d}
              style={[styles.dayPill, isSelected && styles.dayPillActive]}
              onPress={() => setSelectedDay(i)}
            >
              <Text style={[styles.dayPillDate, isSelected && styles.dayPillDateActive]}>
                {formatDate(d)}
              </Text>
              {hasSlots && <View style={[styles.dayDot, isSelected && { backgroundColor: "#fff" }]} />}
            </Pressable>
          );
        })}
      </HorizontalScroll>

      <ScrollView style={webScrollStyle(styles.scroll)} showsVerticalScrollIndicator={scrollShowsVertical}>
        <Text style={styles.dateLabel}>Slots for {formatDate(selectedDate)}</Text>

        {slotsLoading ? (
          <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />
        ) : daySlots.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={40} color={C.textMuted} />
            <Text style={styles.emptyText}>No slots for this day yet</Text>
            <Pressable style={styles.emptyAddBtn} onPress={openAddModal}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.emptyAddBtnText}>Add slot</Text>
            </Pressable>
          </View>
        ) : (
          daySlots.map((slot) => {
            const fillRate = slot.maxSlots > 0 ? (slot.bookedSlots / slot.maxSlots) * 100 : 0;
            const isFull = slot.bookedSlots >= slot.maxSlots;
            return (
              <Pressable
                key={slot.id}
                style={styles.slotCard}
                onPress={() => openEditModal(slot)}
              >
                <View style={styles.slotTop}>
                  <View style={styles.slotTimeBlock}>
                    <Ionicons name="time-outline" size={14} color={C.accent} />
                    <Text style={styles.slotTime}>
                      {slot.startTime} – {slot.endTime}
                    </Text>
                    <View style={[styles.kindBadge, slot.slotKind === "paid" ? styles.kindBadgePaid : styles.kindBadgeOpen]}>
                      <Text style={[styles.kindBadgeText, slot.slotKind === "paid" ? styles.kindBadgeTextPaid : styles.kindBadgeTextOpen]}>
                        {slot.slotKind === "paid" ? `Paid 🎟${(slot.ticketPrice ?? 0).toLocaleString()}` : "Open"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.slotActions}>
                    <View style={styles.editHint}>
                      <Ionicons name="create-outline" size={14} color={C.textMuted} />
                      <Text style={styles.editHintText}>Edit</Text>
                    </View>
                    <Pressable
                      style={styles.deleteBtn}
                      onPress={(e) => {
                        if (e.stopPropagation) e.stopPropagation();
                        confirmDelete(slot.id);
                      }}
                      hitSlop={8}
                    >
                      <Ionicons name="trash-outline" size={16} color={C.live} />
                    </Pressable>
                  </View>
                </View>

                {slot.noteText ? <Text style={styles.slotNote}>{slot.noteText}</Text> : null}

                <View style={styles.slotStats}>
                  <View style={styles.slotStatItem}>
                    <Ionicons name="people-outline" size={13} color={C.textMuted} />
                    <Text style={styles.slotStatText}>
                      <Text style={[styles.slotBooked, isFull && { color: C.live }]}>{slot.bookedSlots}</Text>
                      /{slot.maxSlots}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, isFull && styles.statusFull]}>
                    <Text style={[styles.statusText, isFull && { color: C.live }]}>
                      {isFull ? "Full" : `${slot.maxSlots - slot.bookedSlots} left`}
                    </Text>
                  </View>
                </View>

                <View style={styles.fillBarBg}>
                  <View
                    style={[
                      styles.fillBarFill,
                      { width: `${fillRate}%` as any, backgroundColor: isFull ? C.live : C.accent },
                    ]}
                  />
                </View>
              </Pressable>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={showModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => !savingModal && setShowModal(false)}>
          <Pressable
            style={[styles.modalSheet, { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 16 }]}
            onPress={(e) => e.stopPropagation?.()}
          >
            <View style={styles.modalHandle} />
            <View style={styles.modalTitleRow}>
              <Ionicons name={editingSlot ? "create-outline" : "calendar-outline"} size={18} color={C.accent} />
              <Text style={styles.modalTitle}>{editingSlot ? "Edit slot" : "Add slot"}</Text>
            </View>
            <Text style={styles.modalDateLabel}>
              {editingSlot
                ? `Date: ${formatDate(editingSlot.date)}`
                : `Adding for ${formatDate(days[selectedDay])}`}
            </Text>

            <Text style={styles.fieldLabel}>Start time</Text>
            <HorizontalScroll style={{ marginBottom: 12 }} showArrows={false}>
              {TIME_OPTIONS.slice(0, -1).map((t) => (
                <Pressable
                  key={t}
                  style={[styles.timePill, newStart === t && styles.timePillActive]}
                  onPress={() => setNewStart(t)}
                >
                  <Text style={[styles.timePillText, newStart === t && styles.timePillTextActive]}>{t}</Text>
                </Pressable>
              ))}
            </HorizontalScroll>

            <Text style={styles.fieldLabel}>End time</Text>
            <HorizontalScroll style={{ marginBottom: 12 }} showArrows={false}>
              {TIME_OPTIONS.map((t) => (
                <Pressable
                  key={t}
                  style={[styles.timePill, newEnd === t && styles.timePillActive]}
                  onPress={() => setNewEnd(t)}
                >
                  <Text style={[styles.timePillText, newEnd === t && styles.timePillTextActive]}>{t}</Text>
                </Pressable>
              ))}
            </HorizontalScroll>

            <Text style={styles.fieldLabel}>Schedule type</Text>
            <View style={styles.typeRow}>
              <Pressable
                style={[styles.typePill, newSlotKind === "open" && styles.typePillActive]}
                onPress={() => setNewSlotKind("open")}
              >
                <Text style={[styles.typePillText, newSlotKind === "open" && styles.typePillTextActive]}>Open</Text>
              </Pressable>
              <Pressable
                style={[styles.typePill, newSlotKind === "paid" && styles.typePillActive]}
                onPress={() => setNewSlotKind("paid")}
              >
                <Text style={[styles.typePillText, newSlotKind === "paid" && styles.typePillTextActive]}>Paid</Text>
              </Pressable>
            </View>

            {newSlotKind === "paid" ? (
              <>
                <Text style={styles.fieldLabel}>Ticket price</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.noteInput}
                    value={newTicketPrice}
                    onChangeText={(v) => setNewTicketPrice(v.replace(/[^0-9]/g, ""))}
                    keyboardType="number-pad"
                    placeholder="e.g. 500"
                    placeholderTextColor={C.textMuted}
                  />
                </View>
              </>
            ) : null}

            <Text style={styles.fieldLabel}>Max bookings</Text>
            <View style={styles.slotsRow}>
              {["1", "2", "3", "5", "10"].map((n) => (
                <Pressable
                  key={n}
                  style={[styles.slotPill, newMaxSlots === n && styles.slotPillActive]}
                  onPress={() => setNewMaxSlots(n)}
                >
                  <Text style={[styles.slotPillText, newMaxSlots === n && styles.slotPillTextActive]}>{n}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Note (optional)</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.noteInput}
                value={newNote}
                onChangeText={setNewNote}
                placeholder="e.g. DJ set / Q&A / guest info"
                placeholderTextColor={C.textMuted}
              />
            </View>

            <Pressable
              style={[styles.saveBtn, savingModal && { opacity: 0.6 }]}
              onPress={handleSaveModal}
              disabled={savingModal}
            >
              {savingModal ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={styles.saveBtnText}>{editingSlot ? "Save changes" : "Add slot"}</Text>
                </>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  gateText: { color: C.textMuted, padding: 24, textAlign: "center" },
  gateBox: { padding: 24, alignItems: "center", gap: 12 },
  gateTitle: { color: C.text, fontSize: 16, fontWeight: "700", textAlign: "center" },
  gateSub: { color: C.textMuted, fontSize: 13, textAlign: "center", lineHeight: 20 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.surface, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: C.text },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.accent, alignItems: "center", justifyContent: "center",
  },
  infoBanner: {
    flexDirection: "row", gap: 8, backgroundColor: C.surface,
    marginHorizontal: 16, marginBottom: 12, borderRadius: 10, padding: 12,
    borderLeftWidth: 3, borderLeftColor: C.accent,
  },
  infoText: { flex: 1, fontSize: 11, color: C.textSec, lineHeight: 16 },
  dayScroll: { flexGrow: 0, marginBottom: 8 },
  dayScrollContent: { paddingHorizontal: 16, gap: 8 },
  dayPill: {
    alignItems: "center", paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  dayPillActive: { backgroundColor: C.accent, borderColor: C.accent },
  dayPillDate: { fontSize: 12, fontWeight: "600", color: C.textSec },
  dayPillDateActive: { color: "#fff" },
  dayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.accent, marginTop: 3 },
  scroll: { flex: 1 },
  dateLabel: {
    fontSize: 14, fontWeight: "700", color: C.text,
    marginHorizontal: 16, marginVertical: 12,
  },
  emptyState: {
    alignItems: "center", paddingVertical: 48, gap: 12,
  },
  emptyText: { fontSize: 14, color: C.textMuted },
  emptyAddBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.accent, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
  },
  emptyAddBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  slotCard: {
    backgroundColor: C.surface, marginHorizontal: 16, marginBottom: 10,
    borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border,
  },
  slotTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  slotTimeBlock: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", flex: 1, marginRight: 8 },
  slotTime: { fontSize: 15, fontWeight: "700", color: C.text },
  kindBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  kindBadgeOpen: { backgroundColor: "rgba(41,182,207,0.12)", borderColor: "rgba(41,182,207,0.45)" },
  kindBadgePaid: { backgroundColor: "rgba(255,183,77,0.14)", borderColor: "rgba(255,183,77,0.5)" },
  kindBadgeText: { fontSize: 11, fontWeight: "700" },
  kindBadgeTextOpen: { color: C.accent },
  kindBadgeTextPaid: { color: C.amber },
  slotActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  editHint: { flexDirection: "row", alignItems: "center", gap: 4 },
  editHintText: { fontSize: 11, color: C.textMuted, fontWeight: "600" },
  deleteBtn: { padding: 4 },
  slotNote: { fontSize: 12, color: C.textMuted, marginBottom: 8 },
  slotStats: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  slotStatItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  slotStatText: { fontSize: 13, color: C.textSec },
  slotBooked: { fontWeight: "700", color: C.accent },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    backgroundColor: "#0D2330",
  },
  statusFull: { backgroundColor: "#2A0F0F" },
  statusText: { fontSize: 11, fontWeight: "600", color: C.accent },
  fillBarBg: { height: 4, backgroundColor: C.surface2, borderRadius: 2, overflow: "hidden" },
  fillBarFill: { height: "100%", borderRadius: 2 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20,
  },
  modalHandle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  modalTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: C.text },
  modalDateLabel: { fontSize: 13, color: C.textMuted, marginBottom: 16 },
  fieldLabel: {
    fontSize: 11, fontWeight: "700", color: C.textMuted, textTransform: "uppercase",
    letterSpacing: 0.5, marginBottom: 8,
  },
  timePill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, marginRight: 6,
  },
  timePillActive: { backgroundColor: C.accent, borderColor: C.accent },
  timePillText: { fontSize: 13, color: C.textSec, fontWeight: "600" },
  timePillTextActive: { color: "#fff" },
  typeRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  typePill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border,
  },
  typePillActive: { backgroundColor: C.accent, borderColor: C.accent },
  typePillText: { fontSize: 13, color: C.textSec, fontWeight: "600" },
  typePillTextActive: { color: "#fff" },
  slotsRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  slotPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border,
  },
  slotPillActive: { backgroundColor: C.accent, borderColor: C.accent },
  slotPillText: { fontSize: 13, color: C.textSec, fontWeight: "600" },
  slotPillTextActive: { color: "#fff" },
  inputWrap: {
    backgroundColor: C.surface2, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 16, borderWidth: 1, borderColor: C.border,
  },
  noteInput: { fontSize: 14, color: C.text },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14,
  },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
