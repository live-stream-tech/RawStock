/**
 * mentor-manage.tsx
 * クリエイター向け：メンターセッション管理画面
 * - セッション商品の登録・編集・削除
 * - 予約一覧の確認
 * - ビデオ通話の開始
 */
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";
import { F } from "@/constants/fonts";
import { useAuth } from "@/lib/auth";
import { HorizontalScroll } from "@/components/HorizontalScroll";
import { webScrollStyle } from "@/constants/layout";


const CATEGORIES = [
  { value: "counselor", label: "Counseling" },
  { value: "english", label: "English Conversation" },
  { value: "coaching", label: "Coaching" },
  { value: "music", label: "Music Lesson" },
  { value: "yoga", label: "Yoga / Meditation" },
  { value: "fortune", label: "Fortune Telling" },
  { value: "other", label: "Other" },
];

const DURATIONS = [15, 30, 45, 60, 90];

interface MentorSession {
  id: number;
  title: string;
  category: string;
  description: string;
  price: number;
  duration: number;
  maxParticipants: number;
  isActive: boolean;
}

interface MentorBooking {
  booking: {
    id: number;
    sessionId: number;
    userId: number;
    userName: string;
    userAvatar: string | null;
    scheduledAt: string;
    price: number;
    status: string;
    whipUrl: string | null;
    whepUrl: string | null;
  };
  session: MentorSession;
}

export default function MentorManageScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [sessions, setSessions] = useState<MentorSession[]>([]);
  const [bookings, setBookings] = useState<MentorBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"sessions" | "bookings">("sessions");

  // セッション作成モーダル
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<MentorSession | null>(null);
  const [form, setForm] = useState({
    title: "",
    category: "counselor",
    description: "",
    price: "",
    duration: 30,
    maxParticipants: 1,
  });
  const [saving, setSaving] = useState(false);

  const authHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }), [token]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [s, b] = await Promise.all([
        fetch(`${getApiUrl()}/api/mentor/my-sessions`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${getApiUrl()}/api/mentor/creator-bookings`, { headers: authHeaders() }).then(r => r.json()),
      ]);
      if (Array.isArray(s)) setSessions(s);
      if (Array.isArray(b)) setBookings(b);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, authHeaders]);

  React.useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ title: "", category: "counselor", description: "", price: "", duration: 30, maxParticipants: 1 });
    setShowModal(true);
  };

  const openEdit = (s: MentorSession) => {
    setEditTarget(s);
    setForm({
      title: s.title,
      category: s.category,
      description: s.description,
      price: String(s.price),
      duration: s.duration,
      maxParticipants: s.maxParticipants,
    });
    setShowModal(true);
  };

  const saveSession = async () => {
    if (!form.title.trim() || !form.price) {
      Alert.alert("Missing fields", "Title and price are required");
      return;
    }
    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim(),
        price: Number(form.price),
        duration: form.duration,
        maxParticipants: form.maxParticipants,
      };
      const url = editTarget
        ? `${getApiUrl()}/api/mentor/sessions/${editTarget.id}`
        : `${getApiUrl()}/api/mentor/sessions`;
      const method = editTarget ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Failed to save session");
      setShowModal(false);
      load();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteSession = (id: number) => {
    Alert.alert("Confirm", "Hide this session?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Hide", style: "destructive",
        onPress: async () => {
          await fetch(`${getApiUrl()}/api/mentor/sessions/${id}`, { method: "DELETE", headers: authHeaders() });
          load();
        },
      },
    ]);
  };

  const startSession = async (bookingId: number) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/mentor/bookings/${bookingId}/start`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start session");
      router.push(`/mentor-room/${bookingId}?role=mentor&whipUrl=${encodeURIComponent(data.whipUrl ?? "")}`);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      pending: "Awaiting Payment",
      confirmed: "Confirmed",
      in_progress: "In Call",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return map[s] ?? s;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={C.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MENTOR SESSIONS</Text>
        {tab === "sessions" && (
          <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
            <Ionicons name="add" size={24} color={C.accent} />
          </TouchableOpacity>
        )}
      </View>

      {/* タブ */}
      <View style={styles.tabRow}>
        {(["sessions", "bookings"] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
              {t === "sessions" ? "My Sessions" : `Bookings (${bookings.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={webScrollStyle(styles.scroll)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.accent} />}
      >
        {tab === "sessions" ? (
          sessions.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={C.textMuted} />
              <Text style={styles.emptyText}>No sessions yet</Text>
              <TouchableOpacity style={styles.createBtn} onPress={openCreate}>
                <Text style={styles.createBtnText}>+ Create Session</Text>
              </TouchableOpacity>
            </View>
          ) : (
            sessions.map(s => (
              <View key={s.id} style={[styles.card, !s.isActive && styles.cardInactive]}>
                <View style={styles.cardHeader}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{CATEGORIES.find(c => c.value === s.category)?.label ?? s.category}</Text>
                  </View>
                  {!s.isActive && <Text style={styles.inactiveBadge}>Hidden</Text>}
                </View>
                <Text style={styles.sessionTitle}>{s.title}</Text>
                <Text style={styles.sessionDesc} numberOfLines={2}>{s.description}</Text>
                <View style={styles.sessionMeta}>
                  <Text style={styles.metaText}>🎟{s.price.toLocaleString()}</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaText}>{s.duration} min</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaText}>Max {s.maxParticipants}</Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(s)}>
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteSession(s.id)}>
                    <Text style={styles.deleteBtnText}>Hide</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        ) : (
          bookings.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={C.textMuted} />
              <Text style={styles.emptyText}>No bookings yet</Text>
            </View>
          ) : (
            bookings.map(({ booking, session }) => (
              <View key={booking.id} style={styles.card}>
                <View style={styles.bookingHeader}>
                  <Text style={styles.bookingDate}>{formatDate(booking.scheduledAt)}</Text>
                  <View style={[styles.statusBadge, booking.status === "confirmed" && styles.statusConfirmed, booking.status === "in_progress" && styles.statusLive]}>
                    <Text style={styles.statusText}>{statusLabel(booking.status)}</Text>
                  </View>
                </View>
                <Text style={styles.sessionTitle}>{session.title}</Text>
                <Text style={styles.bookingUser}>Booked by: {booking.userName}</Text>
                <Text style={styles.metaText}>🎟{booking.price.toLocaleString()} · {session.duration} min</Text>
                {booking.status === "confirmed" && (
                  <TouchableOpacity style={styles.startBtn} onPress={() => startSession(booking.id)}>
                    <Ionicons name="videocam" size={16} color={C.bg} />
                    <Text style={styles.startBtnText}>Start Call</Text>
                  </TouchableOpacity>
                )}
                {booking.status === "in_progress" && (
                  <TouchableOpacity style={styles.startBtn} onPress={() => router.push(`/mentor-room/${booking.id}?role=mentor&whipUrl=${encodeURIComponent(booking.whipUrl ?? "")}`)}>
                    <Ionicons name="videocam" size={16} color={C.bg} />
                    <Text style={styles.startBtnText}>Rejoin Call</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* セッション作成・編集モーダル */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editTarget ? "Edit Session" : "Create Session"}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={C.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={webScrollStyle(undefined)}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={v => setForm(f => ({ ...f, title: v }))}
                placeholder="e.g. 30-min English Conversation"
                placeholderTextColor={C.textMuted}
              />

              <Text style={styles.label}>Category</Text>
              <HorizontalScroll style={styles.catRow} showArrows={false}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity
                    key={c.value}
                    style={[styles.catChip, form.category === c.value && styles.catChipActive]}
                    onPress={() => setForm(f => ({ ...f, category: c.value }))}
                  >
                    <Text style={[styles.catChipText, form.category === c.value && styles.catChipTextActive]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </HorizontalScroll>

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={form.description}
                onChangeText={v => setForm(f => ({ ...f, description: v }))}
                placeholder="What is covered, who it's for, any requirements..."
                placeholderTextColor={C.textMuted}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>Price (🎟 tickets) *</Text>
              <TextInput
                style={styles.input}
                value={form.price}
                onChangeText={v => setForm(f => ({ ...f, price: v.replace(/[^0-9]/g, "") }))}
                placeholder="e.g. 3000"
                placeholderTextColor={C.textMuted}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Duration</Text>
              <View style={styles.durationRow}>
                {DURATIONS.map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.durationChip, form.duration === d && styles.durationChipActive]}
                    onPress={() => setForm(f => ({ ...f, duration: d }))}
                  >
                    <Text style={[styles.durationText, form.duration === d && styles.durationTextActive]}>{d} min</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Max Participants</Text>
              <View style={styles.participantRow}>
                {[1, 2, 3, 5, 10, 20].map(n => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.durationChip, form.maxParticipants === n && styles.durationChipActive]}
                    onPress={() => setForm(f => ({ ...f, maxParticipants: n }))}
                  >
                    <Text style={[styles.durationText, form.maxParticipants === n && styles.durationTextActive]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={saveSession} disabled={saving}>
                {saving ? <ActivityIndicator color={C.bg} /> : <Text style={styles.saveBtnText}>{editTarget ? "Update" : "Create"}</Text>}
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 56 : 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.borderDim,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, textAlign: "center", fontFamily: F.display, fontSize: 18, fontWeight: "800", color: C.text, letterSpacing: 2, textTransform: "uppercase" },
  addBtn: { padding: 4 },
  tabRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.borderDim },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: C.accent },
  tabLabel: { fontFamily: F.mono, fontSize: 12, color: C.textMuted },
  tabLabelActive: { color: C.accent },
  scroll: { flex: 1 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontFamily: F.mono, fontSize: 14, color: C.textMuted },
  createBtn: { marginTop: 8, borderWidth: 1, borderColor: C.accent, borderRadius: 4, paddingHorizontal: 20, paddingVertical: 10 },
  createBtnText: { fontFamily: F.mono, fontSize: 13, color: C.accent },
  card: { margin: 12, marginBottom: 0, padding: 16, backgroundColor: C.surface, borderRadius: 8, borderWidth: 1, borderColor: C.borderDim },
  cardInactive: { opacity: 0.5 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  categoryBadge: { backgroundColor: C.borderDim, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  categoryText: { fontFamily: F.mono, fontSize: 10, color: C.accent },
  inactiveBadge: { fontFamily: F.mono, fontSize: 10, color: C.textMuted, borderWidth: 1, borderColor: C.textMuted, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  sessionTitle: { fontFamily: F.display, fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 4 },
  sessionDesc: { fontFamily: F.mono, fontSize: 12, color: C.textSec, marginBottom: 8 },
  sessionMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  metaText: { fontFamily: F.mono, fontSize: 12, color: C.textSec },
  metaDot: { color: C.textMuted },
  cardActions: { flexDirection: "row", gap: 8 },
  editBtn: { flex: 1, borderWidth: 1, borderColor: C.accent, borderRadius: 4, paddingVertical: 8, alignItems: "center" },
  editBtnText: { fontFamily: F.mono, fontSize: 12, color: C.accent },
  deleteBtn: { flex: 1, borderWidth: 1, borderColor: C.textMuted, borderRadius: 4, paddingVertical: 8, alignItems: "center" },
  deleteBtnText: { fontFamily: F.mono, fontSize: 12, color: C.textMuted },
  bookingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  bookingDate: { fontFamily: F.mono, fontSize: 13, color: C.accent },
  statusBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: C.borderDim },
  statusConfirmed: { backgroundColor: "#00ffcc22" },
  statusLive: { backgroundColor: "#ff4d0022" },
  statusText: { fontFamily: F.mono, fontSize: 10, color: C.text },
  bookingUser: { fontFamily: F.mono, fontSize: 12, color: C.textSec, marginBottom: 4 },
  startBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.accent, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 16, marginTop: 12, alignSelf: "flex-start" },
  startBtnText: { fontFamily: F.display, fontSize: 14, fontWeight: "700", color: C.bg },
  // モーダル
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: C.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "90%", padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontFamily: F.display, fontSize: 18, fontWeight: "800", color: C.text, letterSpacing: 1 },
  label: { fontFamily: F.mono, fontSize: 11, color: C.textMuted, marginBottom: 6, marginTop: 16, textTransform: "uppercase", letterSpacing: 1 },
  input: { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.borderDim, borderRadius: 6, padding: 12, fontFamily: F.mono, fontSize: 14, color: C.text },
  inputMulti: { height: 100, textAlignVertical: "top" },
  catRow: { flexDirection: "row" as const },
  catChip: { borderWidth: 1, borderColor: C.borderDim, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
  catChipActive: { backgroundColor: C.accent, borderColor: C.accent },
  catChipText: { fontFamily: F.mono, fontSize: 12, color: C.textSec },
  catChipTextActive: { color: C.bg },
  durationRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  participantRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  durationChip: { borderWidth: 1, borderColor: C.borderDim, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 8 },
  durationChipActive: { backgroundColor: C.accent, borderColor: C.accent },
  durationText: { fontFamily: F.mono, fontSize: 12, color: C.textSec },
  durationTextActive: { color: C.bg },
  saveBtn: { backgroundColor: C.accent, borderRadius: 6, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  saveBtnText: { fontFamily: F.display, fontSize: 16, fontWeight: "800", color: C.bg, letterSpacing: 1 },
});
