/**
 * mentor-book/[id].tsx
 * Mentor session booking page
 */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Alert,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/constants/colors";
import { F } from "@/constants/fonts";
import { useAuth } from "@/lib/auth";
import { getApiUrl } from "@/lib/query-client";
import { HorizontalScroll } from "@/components/HorizontalScroll";

const CATEGORY_LABELS: Record<string, string> = {
  counselor: "Counseling",
  english: "English Conversation",
  coaching: "Coaching",
  music: "Music Lesson",
  yoga: "Yoga & Meditation",
  fortune: "Fortune Telling",
  other: "Other",
};

interface MentorSession {
  id: number;
  title: string;
  category: string;
  description: string;
  price: number;
  duration: number;
  maxParticipants: number;
  userId: number;
}

interface Slot {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  maxSlots: number;
  bookedSlots: number;
}

export default function MentorBookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, token } = useAuth();

  const [session, setSession] = useState<MentorSession | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  const baseUrl = getApiUrl();
  const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  });

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(new URL(`/api/mentor/session/${id}`, baseUrl).toString());
        if (res.ok) {
          const s = await res.json();
          setSession(s);
          if (s.userId) {
            const slotsRes = await fetch(new URL(`/api/availability/${s.userId}`, baseUrl).toString());
            if (slotsRes.ok) {
              const slotsData = await slotsRes.json();
              setSlots(Array.isArray(slotsData) ? slotsData : []);
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleBook = async () => {
    if (!user) {
      Alert.alert("Login Required", "Please sign in to book a session");
      return;
    }
    if (!session) return;

    const scheduledAt = selectedSlot
      ? new Date(`${selectedSlot.date}T${selectedSlot.startTime}`).toISOString()
      : selectedDate?.toISOString();

    if (!scheduledAt) {
      Alert.alert("Please select a date and time");
      return;
    }

    setBooking(true);
    try {
      const res = await fetch(new URL("/api/mentor/bookings", baseUrl).toString(), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          sessionId: session.id,
          slotId: selectedSlot?.id,
          scheduledAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "creator_not_connected") {
          Alert.alert("Booking Unavailable", "This creator has not completed their payout setup yet");
        } else {
          Alert.alert("Error", data.error ?? "Booking failed");
        }
        return;
      }
      if (data.checkoutUrl) {
        if (Platform.OS === "web") {
          window.location.href = data.checkoutUrl;
        } else {
          Linking.openURL(data.checkoutUrl);
        }
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setBooking(false);
    }
  };

  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return d;
  });

  const formatDayLabel = (d: Date) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `${d.getMonth() + 1}/${d.getDate()} ${days[d.getDay()]}`;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Session not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const availableSlots = slots.filter(s => s.bookedSlots < s.maxSlots);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={24} color={C.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>BOOK SESSION</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.scroll}>
        <View style={styles.sessionCard}>
          <View style={styles.catBadge}>
            <Text style={styles.catText}>{CATEGORY_LABELS[session.category] ?? session.category}</Text>
          </View>
          <Text style={styles.sessionTitle}>{session.title}</Text>
          <Text style={styles.sessionDesc}>{session.description}</Text>
          <View style={styles.sessionMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={C.textMuted} />
              <Text style={styles.metaText}>{session.duration} min</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={14} color={C.textMuted} />
              <Text style={styles.metaText}>Up to {session.maxParticipants}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="videocam-outline" size={14} color={C.textMuted} />
              <Text style={styles.metaText}>Video call</Text>
            </View>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Price</Text>
            <Text style={styles.price}>🎟{session.price.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SELECT DATE & TIME</Text>

          {availableSlots.length > 0 ? (
            <>
              <Text style={styles.sectionSubtitle}>CREATOR AVAILABILITY</Text>
              {availableSlots.map(slot => (
                <TouchableOpacity
                  key={slot.id}
                  style={[styles.slotItem, selectedSlot?.id === slot.id && styles.slotItemSelected]}
                  onPress={() => { setSelectedSlot(slot); setSelectedDate(null); }}
                >
                  <View>
                    <Text style={[styles.slotDate, selectedSlot?.id === slot.id && styles.slotDateSelected]}>
                      {slot.date} {slot.startTime} – {slot.endTime}
                    </Text>
                    <Text style={styles.slotRemain}>{slot.maxSlots - slot.bookedSlots} spots left</Text>
                  </View>
                  {selectedSlot?.id === slot.id && (
                    <Ionicons name="checkmark-circle" size={20} color={C.accent} />
                  )}
                </TouchableOpacity>
              ))}
              <View style={styles.divider} />
              <Text style={styles.sectionSubtitle}>OR CHOOSE A PREFERRED DATE</Text>
            </>
          ) : (
            <Text style={styles.noSlotText}>Choose a preferred date and send a request</Text>
          )}

          <HorizontalScroll contentContainerStyle={styles.dateRow} showArrows={false}>
            {next7Days.map((d, i) => {
              const isSelected = selectedDate?.toDateString() === d.toDateString();
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.dateChip, isSelected && styles.dateChipSelected]}
                  onPress={() => { setSelectedDate(d); setSelectedSlot(null); }}
                >
                  <Text style={[styles.dateChipText, isSelected && styles.dateChipTextSelected]}>
                    {formatDayLabel(d)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </HorizontalScroll>
        </View>

        <View style={styles.noticeSection}>
          <Text style={styles.noticeTitle}>NOTES</Text>
          <Text style={styles.noticeText}>
            • Session is confirmed after payment is complete{"\n"}
            • Video calls are available via web browser{"\n"}
            • No refunds on digital content{"\n"}
            • RawStock deducts a 20% platform fee
          </Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerPrice}>
          <Text style={styles.footerPriceLabel}>Total</Text>
          <Text style={styles.footerPriceValue}>🎟{session.price.toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          style={[styles.bookBtn, (!selectedSlot && !selectedDate) && styles.bookBtnDisabled]}
          onPress={handleBook}
          disabled={booking || (!selectedSlot && !selectedDate)}
        >
          {booking ? (
            <ActivityIndicator color={C.bg} />
          ) : (
            <Text style={styles.bookBtnText}>Proceed to Payment</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 56 : 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.borderDim,
  },
  headerBack: { padding: 4 },
  headerTitle: { flex: 1, textAlign: "center", fontFamily: F.display, fontSize: 16, fontWeight: "800", color: C.text, letterSpacing: 2 },
  scroll: { flex: 1 },
  sessionCard: {
    margin: 16,
    padding: 20,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderDim,
  },
  catBadge: { backgroundColor: C.borderDim, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start", marginBottom: 10 },
  catText: { fontFamily: F.mono, fontSize: 11, color: C.accent },
  sessionTitle: { fontFamily: F.display, fontSize: 20, fontWeight: "800", color: C.text, marginBottom: 8 },
  sessionDesc: { fontFamily: F.mono, fontSize: 13, color: C.textSec, lineHeight: 20, marginBottom: 16 },
  sessionMeta: { flexDirection: "row", gap: 16, marginBottom: 16 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontFamily: F.mono, fontSize: 12, color: C.textMuted },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 16, borderTopWidth: 1, borderTopColor: C.borderDim },
  priceLabel: { fontFamily: F.mono, fontSize: 12, color: C.textMuted },
  price: { fontFamily: F.display, fontSize: 24, fontWeight: "800", color: C.accent },
  section: { paddingHorizontal: 16, paddingBottom: 16 },
  sectionTitle: { fontFamily: F.display, fontSize: 16, fontWeight: "800", color: C.text, letterSpacing: 1, marginBottom: 12, textTransform: "uppercase" },
  sectionSubtitle: { fontFamily: F.mono, fontSize: 11, color: C.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 },
  noSlotText: { fontFamily: F.mono, fontSize: 13, color: C.textMuted, marginBottom: 12 },
  slotItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderColor: C.borderDim,
    borderRadius: 8,
    marginBottom: 8,
  },
  slotItemSelected: { borderColor: C.accent, backgroundColor: `${C.accent}11` },
  slotDate: { fontFamily: F.mono, fontSize: 13, color: C.text },
  slotDateSelected: { color: C.accent },
  slotRemain: { fontFamily: F.mono, fontSize: 11, color: C.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: C.borderDim, marginVertical: 16 },
  dateRow: { flexDirection: "row" },
  dateChip: { borderWidth: 1, borderColor: C.borderDim, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, marginRight: 8 },
  dateChipSelected: { backgroundColor: C.accent, borderColor: C.accent },
  dateChipText: { fontFamily: F.mono, fontSize: 12, color: C.textSec },
  dateChipTextSelected: { color: C.bg },
  noticeSection: { marginHorizontal: 16, padding: 16, backgroundColor: C.surface2, borderRadius: 8 },
  noticeTitle: { fontFamily: F.display, fontSize: 13, fontWeight: "700", color: C.textMuted, marginBottom: 8, letterSpacing: 1 },
  noticeText: { fontFamily: F.mono, fontSize: 12, color: C.textMuted, lineHeight: 20 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.borderDim,
  },
  footerPrice: { flex: 1 },
  footerPriceLabel: { fontFamily: F.mono, fontSize: 11, color: C.textMuted },
  footerPriceValue: { fontFamily: F.display, fontSize: 22, fontWeight: "800", color: C.accent },
  bookBtn: { backgroundColor: C.accent, borderRadius: 8, paddingHorizontal: 28, paddingVertical: 14 },
  bookBtnDisabled: { opacity: 0.4 },
  bookBtnText: { fontFamily: F.display, fontSize: 16, fontWeight: "800", color: C.bg },
  errorText: { fontFamily: F.mono, fontSize: 14, color: C.live },
  backBtn: { borderWidth: 1, borderColor: C.accent, borderRadius: 4, paddingHorizontal: 20, paddingVertical: 10 },
  backBtnText: { fontFamily: F.mono, fontSize: 13, color: C.accent },
});
