import React, { useState } from "react";
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
import { scrollShowsHorizontal, scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { C } from "@/constants/colors";
import { HorizontalScroll } from "@/components/HorizontalScroll";
import { webScrollStyle } from "@/constants/layout";

const LIVER_ID = 1;

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

const TIME_OPTIONS = [
  "09:00", "10:00", "11:00", "12:00", "13:00", "14:00",
  "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00",
];

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

  const [showModal, setShowModal] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newStart, setNewStart] = useState("19:00");
  const [newEnd, setNewEnd] = useState("21:00");
  const [newMaxSlots, setNewMaxSlots] = useState("3");
  const [newNote, setNewNote] = useState("");
  const [selectedDay, setSelectedDay] = useState(0);

  const days = generateNextDays(14);

  const { data: slots = [], isLoading } = useQuery<Slot[]>({
    queryKey: [`/api/livers/${LIVER_ID}/availability`],
  });

  const addMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", `/api/livers/${LIVER_ID}/availability`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/livers/${LIVER_ID}/availability`] });
      setShowModal(false);
      Alert.alert("Added", "Slot added successfully.");
    },
    onError: () => Alert.alert("Error", "Failed to add slot."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (slotId: number) => apiRequest("DELETE", `/api/livers/${LIVER_ID}/availability/${slotId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/livers/${LIVER_ID}/availability`] }),
  });

  const selectedDate = days[selectedDay];
  const daySlots = slots.filter((s) => s.date === selectedDate);

  function handleAdd() {
    const date = days[selectedDay];
    addMutation.mutate({
      date,
      startTime: newStart,
      endTime: newEnd,
      maxSlots: parseInt(newMaxSlots) || 3,
      note: newNote,
    });
  }

  function confirmDelete(slotId: number) {
    Alert.alert("Delete Slot", "Remove this slot?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(slotId) },
    ]);
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Manage Availability</Text>
        <Pressable
          style={styles.addBtn}
          onPress={() => setShowModal(true)}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={16} color={C.accent} />
        <Text style={styles.infoText}>Set time slots fans can book. Slots close automatically when full.</Text>
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

        {isLoading ? (
          <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />
        ) : daySlots.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={40} color={C.textMuted} />
            <Text style={styles.emptyText}>No slots for this day yet</Text>
            <Pressable style={styles.emptyAddBtn} onPress={() => setShowModal(true)}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.emptyAddBtnText}>Add Slot</Text>
            </Pressable>
          </View>
        ) : (
          daySlots.map((slot) => {
            const fillRate = slot.maxSlots > 0 ? (slot.bookedSlots / slot.maxSlots) * 100 : 0;
            const isFull = slot.bookedSlots >= slot.maxSlots;
            return (
              <View key={slot.id} style={styles.slotCard}>
                <View style={styles.slotTop}>
                  <View style={styles.slotTimeBlock}>
                    <Ionicons name="time-outline" size={14} color={C.accent} />
                    <Text style={styles.slotTime}>{slot.startTime} 〜 {slot.endTime}</Text>
                  </View>
                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => confirmDelete(slot.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color={C.live} />
                  </Pressable>
                </View>

                {slot.note ? (
                  <Text style={styles.slotNote}>{slot.note}</Text>
                ) : null}

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
              </View>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={showModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
          <Pressable
            style={[styles.modalSheet, { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 16 }]}
            onPress={() => {}}
          >
            <View style={styles.modalHandle} />
            <View style={styles.modalTitleRow}>
              <Ionicons name="calendar-outline" size={18} color={C.accent} />
              <Text style={styles.modalTitle}>Add Slot</Text>
            </View>
            <Text style={styles.modalDateLabel}>Adding for {formatDate(days[selectedDay])}</Text>

            <Text style={styles.fieldLabel}>Start Time</Text>
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

            <Text style={styles.fieldLabel}>End Time</Text>
            <HorizontalScroll style={{ marginBottom: 12 }} showArrows={false}>
              {TIME_OPTIONS.slice(1).map((t) => (
                <Pressable
                  key={t}
                  style={[styles.timePill, newEnd === t && styles.timePillActive]}
                  onPress={() => setNewEnd(t)}
                >
                  <Text style={[styles.timePillText, newEnd === t && styles.timePillTextActive]}>{t}</Text>
                </Pressable>
              ))}
            </HorizontalScroll>

            <Text style={styles.fieldLabel}>Max Slots</Text>
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
                placeholder="e.g. Afternoon session"
                placeholderTextColor={C.textMuted}
              />
            </View>

            <Pressable
              style={[styles.saveBtn, addMutation.isPending && { opacity: 0.6 }]}
              onPress={handleAdd}
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={styles.saveBtnText}>Add</Text>
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
  slotTimeBlock: { flexDirection: "row", alignItems: "center", gap: 6 },
  slotTime: { fontSize: 15, fontWeight: "700", color: C.text },
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
