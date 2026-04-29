import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  type LayoutChangeEvent,
} from "react-native";
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { C } from "@/constants/colors";
import { PRICE_PER_TICKET_USD } from "@/constants/tickets";
import { apiRequest, getQueryFn } from "@/lib/query-client";
import { HorizontalScroll } from "@/components/HorizontalScroll";
import {
  EDITOR_DELIVERY_PRESETS,
  EDITOR_GENRE_OPTIONS,
  EDITOR_STYLE_TAG_OPTIONS,
} from "@/constants/video-editor-profile";
import { webScrollStyle } from "@/constants/layout";

type Community = {
  id: number;
  name: string;
  thumbnail: string;
  category: string;
};

type EditorProfile = {
  id: number;
  userId: number | null;
  name: string;
  bio: string;
  genres: string;
  deliveryDays: number;
  priceType: string;
  pricePerMinute: number | null;
  revenueSharePercent: number | null;
  communityId: number;
  isAvailable: boolean;
  styleTags?: string[] | null;
};

export default function EditorProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [bio, setBio] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [deliveryDays, setDeliveryDays] = useState("3");
  const [priceType, setPriceType] = useState<"per_minute" | "revenue_share">("per_minute");
  const [pricePerMinute, setPricePerMinute] = useState("");
  const [revenueSharePercent, setRevenueSharePercent] = useState("");
  const [communityId, setCommunityId] = useState<number | null>(null);
  const [selectedStyleSlugs, setSelectedStyleSlugs] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const sectionAnchors = useRef<Record<string, number>>({});

  function bindSectionAnchor(key: string) {
    return (e: LayoutChangeEvent) => {
      sectionAnchors.current[key] = e.nativeEvent.layout.y;
    };
  }

  function jumpToSection(key: string) {
    const y = sectionAnchors.current[key];
    if (y == null) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
  }

  const { data: myEditor, isLoading: editorLoading } = useQuery<EditorProfile | null>({
    queryKey: ["/api/editors/me"],
    enabled: !!user,
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: communities = [] } = useQuery<Community[]>({
    queryKey: ["/api/communities"],
  });

  const isEditing = !!myEditor;

  useEffect(() => {
    if (myEditor) {
      setBio(myEditor.bio ?? "");
      setSelectedGenres(myEditor.genres ? myEditor.genres.split(",").map((g) => g.trim()).filter(Boolean) : []);
      setDeliveryDays(String(myEditor.deliveryDays ?? 3));
      setPriceType(myEditor.priceType === "revenue_share" ? "revenue_share" : "per_minute");
      setPricePerMinute(myEditor.pricePerMinute != null ? String(myEditor.pricePerMinute) : "");
      setRevenueSharePercent(myEditor.revenueSharePercent != null ? String(myEditor.revenueSharePercent) : "");
      setCommunityId(myEditor.communityId ?? null);
      setSelectedStyleSlugs(
        Array.isArray(myEditor.styleTags) ? [...myEditor.styleTags] : []
      );
    }
  }, [myEditor]);

  const isDirty = useMemo(() => {
    if (!myEditor) {
      return (
        bio.trim().length > 0 ||
        selectedGenres.length > 0 ||
        selectedStyleSlugs.length > 0 ||
        deliveryDays !== "3" ||
        pricePerMinute.length > 0 ||
        revenueSharePercent.length > 0 ||
        communityId != null
      );
    }
    const g0 = myEditor.genres ? myEditor.genres.split(",").map((x) => x.trim()).filter(Boolean).sort().join(",") : "";
    const g1 = [...selectedGenres].sort().join(",");
    const st0 = Array.isArray(myEditor.styleTags) ? [...myEditor.styleTags].sort().join(",") : "";
    const st1 = [...selectedStyleSlugs].sort().join(",");
    return (
      bio.trim() !== (myEditor.bio ?? "").trim() ||
      g0 !== g1 ||
      st0 !== st1 ||
      String(myEditor.deliveryDays ?? 3) !== deliveryDays ||
      (myEditor.priceType === "revenue_share" ? "revenue_share" : "per_minute") !== priceType ||
      (priceType === "per_minute"
        ? String(myEditor.pricePerMinute ?? "") !== pricePerMinute
        : String(myEditor.revenueSharePercent ?? "") !== revenueSharePercent) ||
      (myEditor.communityId ?? null) !== communityId
    );
  }, [
    myEditor,
    bio,
    selectedGenres,
    selectedStyleSlugs,
    deliveryDays,
    priceType,
    pricePerMinute,
    revenueSharePercent,
    communityId,
  ]);

  const communityName = communities.find((c) => c.id === communityId)?.name ?? "—";

  function toggleGenre(genre: string) {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  }

  function toggleStyleSlug(slug: string) {
    setSelectedStyleSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  async function handleSave() {
    if (!communityId) {
      Alert.alert("Error", "Please select a community");
      return;
    }
    if (!priceType) {
      Alert.alert("Error", "Please select a pricing type");
      return;
    }
    if (priceType === "per_minute" && !pricePerMinute) {
      Alert.alert("Error", "Please enter your rate per minute");
      return;
    }
    if (priceType === "revenue_share" && !revenueSharePercent) {
      Alert.alert("Error", "Please enter your revenue share percentage");
      return;
    }

    const payload = {
      bio: bio.trim(),
      genres: selectedGenres.join(","),
      deliveryDays: parseInt(deliveryDays, 10) || 3,
      priceType,
      pricePerMinute: priceType === "per_minute" ? (parseInt(pricePerMinute, 10) || null) : null,
      revenueSharePercent: priceType === "revenue_share" ? (parseInt(revenueSharePercent, 10) || null) : null,
      communityId,
      styleTags: selectedStyleSlugs,
    };

    setSaving(true);
    try {
      if (isEditing && myEditor) {
        await apiRequest("PUT", `/api/editors/${myEditor.id}`, payload);
      } else {
        await apiRequest("POST", "/api/editors", payload);
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/editors/me"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/profile/roles"] });
      if (isEditing) {
        Alert.alert("Saved", "Your editor listing has been updated.");
      } else {
        Alert.alert("Registered", "You are now listed as a Video Editor.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (editorLoading) {
    return (
      <View style={[styles.container, { paddingTop: topPad + 16 }]}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: 0 }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {isEditing ? "Editor listing" : "Register as Video Editor"}
        </Text>
        {isEditing ? (
          <Pressable
            style={styles.backBtn}
            onPress={() => router.push("/editor-inbox" as any)}
            hitSlop={8}
          >
            <Ionicons name="mail-outline" size={22} color={C.accent} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {isEditing ? (
        <View style={styles.quickNav}>
          <Text style={styles.quickNavTitle}>At a glance — tap to jump</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickNavScroll}>
            {(
              [
                ["bio", "Bio"],
                ["genres", "Genres"],
                ["styles", "Styles"],
                ["delivery", "Delivery"],
                ["pricing", "Pricing"],
                ["community", "Community"],
              ] as const
            ).map(([key, label]) => (
              <Pressable key={key} style={styles.quickNavChip} onPress={() => jumpToSection(key)}>
                <Text style={styles.quickNavChipText}>{label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        style={webScrollStyle(styles.scroll)}
        contentContainerStyle={{ paddingBottom: isDirty && isEditing ? 100 : 24 }}
        showsVerticalScrollIndicator={scrollShowsVertical}
        keyboardShouldPersistTaps="handled"
      >
        {/* Bio */}
        <View onLayout={bindSectionAnchor("bio")}>
        <View style={styles.section}>
          <Text style={styles.label}>Bio</Text>
          <Text style={styles.valuePreview} numberOfLines={2}>
            {bio.trim() ? bio.trim() : "Not set — introduce your work below"}
          </Text>
          <TextInput
            style={styles.textArea}
            placeholder="Introduce your skills and past work"
            placeholderTextColor={C.textMuted}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={styles.charCount}>{bio.length}/500</Text>
        </View>
        </View>

        {/* Genres */}
        <View onLayout={bindSectionAnchor("genres")}>
        <View style={styles.section}>
          <Text style={styles.label}>Genres</Text>
          <Text style={styles.valuePreview}>
            {selectedGenres.length ? selectedGenres.join(", ") : "None — pick specialties below"}
          </Text>
          <Text style={styles.sublabel}>Select all that apply</Text>
          <View style={styles.genreGrid}>
            {EDITOR_GENRE_OPTIONS.map((genre) => {
              const active = selectedGenres.includes(genre);
              return (
                <Pressable
                  key={genre}
                  style={[styles.genreChip, active && styles.genreChipActive]}
                  onPress={() => toggleGenre(genre)}
                >
                  <Text style={[styles.genreChipText, active && styles.genreChipTextActive]}>
                    {genre}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        </View>

        {/* Style tags */}
        <View onLayout={bindSectionAnchor("styles")}>
        <View style={styles.section}>
          <Text style={styles.label}>Style tags</Text>
          <Text style={styles.valuePreview}>
            {selectedStyleSlugs.length
              ? selectedStyleSlugs
                  .map((s) => EDITOR_STYLE_TAG_OPTIONS.find((o) => o.slug === s)?.label ?? s)
                  .join(", ")
              : "Optional — add tags below"}
          </Text>
          <Text style={styles.sublabel}>Optional — helps creators find your look</Text>
          <View style={styles.genreGrid}>
            {EDITOR_STYLE_TAG_OPTIONS.map(({ label, slug }) => {
              const active = selectedStyleSlugs.includes(slug);
              return (
                <Pressable
                  key={slug}
                  style={[styles.genreChip, active && styles.genreChipActive]}
                  onPress={() => toggleStyleSlug(slug)}
                >
                  <Text style={[styles.genreChipText, active && styles.genreChipTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        </View>

        {/* Delivery Days */}
        <View onLayout={bindSectionAnchor("delivery")}>
        <View style={styles.section}>
          <Text style={styles.label}>Standard delivery</Text>
          <Text style={styles.valuePreview}>{deliveryDays} days typical turnaround</Text>
          <View style={styles.row}>
            {EDITOR_DELIVERY_PRESETS.map((d) => (
              <Pressable
                key={d}
                style={[styles.dayChip, deliveryDays === d && styles.dayChipActive]}
                onPress={() => setDeliveryDays(d)}
              >
                <Text style={[styles.dayChipText, deliveryDays === d && styles.dayChipTextActive]}>
                  {d}d
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        </View>

        {/* Price Type */}
        <View onLayout={bindSectionAnchor("pricing")}>
        <View style={styles.section}>
          <Text style={styles.label}>Pricing</Text>
          <Text style={styles.valuePreview}>
            {priceType === "per_minute"
              ? pricePerMinute
                ? `🎟 ${pricePerMinute} / minute`
                : "Per minute — set rate below"
              : revenueSharePercent
                ? `${revenueSharePercent}% revenue share`
                : "Revenue share — set percent below"}
          </Text>
          <View style={styles.row}>
            <Pressable
              style={[styles.priceTypeBtn, priceType === "per_minute" && styles.priceTypeBtnActive]}
              onPress={() => setPriceType("per_minute")}
            >
              <Ionicons name="time-outline" size={16} color={priceType === "per_minute" ? "#050505" : C.textSec} />
              <Text style={[styles.priceTypeBtnText, priceType === "per_minute" && styles.priceTypeBtnTextActive]}>
                Per Minute
              </Text>
            </Pressable>
            <Pressable
              style={[styles.priceTypeBtn, priceType === "revenue_share" && styles.priceTypeBtnActive]}
              onPress={() => setPriceType("revenue_share")}
            >
              <Ionicons name="trending-up-outline" size={16} color={priceType === "revenue_share" ? "#050505" : C.textSec} />
              <Text style={[styles.priceTypeBtnText, priceType === "revenue_share" && styles.priceTypeBtnTextActive]}>
                Revenue Share
              </Text>
            </Pressable>
          </View>

          {priceType === "per_minute" && (
            <View style={styles.priceInputRow}>
              <Text style={styles.priceInputLabel}>Rate per minute (Tickets)</Text>
              <Text style={styles.priceSublabel}>
                1 Ticket = ${PRICE_PER_TICKET_USD.toFixed(2)} USD (same as Ticket Shop)
              </Text>
              <TextInput
                style={styles.priceInput}
                placeholder="e.g. 150"
                placeholderTextColor={C.textMuted}
                value={pricePerMinute}
                onChangeText={setPricePerMinute}
                keyboardType="numeric"
              />
            </View>
          )}
          {priceType === "revenue_share" && (
            <View style={styles.priceInputRow}>
              <Text style={styles.priceInputLabel}>Revenue Share (%)</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="e.g. 30"
                placeholderTextColor={C.textMuted}
                value={revenueSharePercent}
                onChangeText={setRevenueSharePercent}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
          )}
        </View>
        </View>

        {/* Community */}
        <View onLayout={bindSectionAnchor("community")}>
        <View style={styles.section}>
          <Text style={styles.label}>Community</Text>
          <Text style={styles.valuePreview}>Listed in: {communityName}</Text>
          <Text style={styles.sublabel}>Select the community where you will be listed</Text>
          <HorizontalScroll style={styles.communityScroll} showArrows={false}>
            {communities.map((c) => (
              <Pressable
                key={c.id}
                style={[styles.communityChip, communityId === c.id && styles.communityChipActive]}
                onPress={() => setCommunityId(c.id)}
              >
                <Text style={[styles.communityChipText, communityId === c.id && styles.communityChipTextActive]} numberOfLines={1}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </HorizontalScroll>
        </View>
        </View>

        {(!isEditing || !isDirty) && (
          <Pressable
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#050505" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#050505" />
                <Text style={styles.saveBtnText}>{isEditing ? "Save changes" : "Register as Video Editor"}</Text>
              </>
            )}
          </Pressable>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {isEditing && isDirty ? (
        <View style={[styles.stickySave, { paddingBottom: Platform.OS === "web" ? 20 : insets.bottom + 12 }]}>
          <Text style={styles.stickyHint}>You have unsaved changes</Text>
          <Pressable
            style={[styles.stickySaveBtn, saving && { opacity: 0.65 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#050505" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color="#050505" />
                <Text style={styles.stickySaveBtnText}>Save listing</Text>
              </>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.borderDim,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: C.text,
    fontSize: 16,
    fontWeight: "600",
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 24,
  },
  label: {
    color: C.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  sublabel: {
    color: C.textMuted,
    fontSize: 12,
    marginBottom: 8,
    marginTop: -4,
  },
  textArea: {
    backgroundColor: C.surface2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borderDim,
    color: C.text,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: "top",
  },
  charCount: {
    color: C.textMuted,
    fontSize: 11,
    textAlign: "right",
    marginTop: 4,
  },
  genreGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.borderDim,
  },
  genreChipActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  genreChipText: {
    color: C.textSec,
    fontSize: 13,
  },
  genreChipTextActive: {
    color: "#050505",
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.borderDim,
  },
  dayChipActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  dayChipText: {
    color: C.textSec,
    fontSize: 13,
  },
  dayChipTextActive: {
    color: "#050505",
    fontWeight: "600",
  },
  priceTypeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.borderDim,
  },
  priceTypeBtnActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  priceTypeBtnText: {
    color: C.textSec,
    fontSize: 13,
    fontWeight: "500",
  },
  priceTypeBtnTextActive: {
    color: "#050505",
    fontWeight: "700",
  },
  priceInputRow: {
    marginTop: 12,
  },
  priceInputLabel: {
    color: C.textSec,
    fontSize: 12,
    marginBottom: 6,
  },
  priceSublabel: {
    color: C.textMuted,
    fontSize: 11,
    marginBottom: 8,
    lineHeight: 15,
  },
  priceInput: {
    backgroundColor: C.surface2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borderDim,
    color: C.text,
    padding: 12,
    fontSize: 15,
  },
  communityScroll: {
    marginTop: 4,
  },
  communityChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.borderDim,
    marginRight: 8,
    maxWidth: 160,
  },
  communityChipActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  communityChipText: {
    color: C.textSec,
    fontSize: 13,
  },
  communityChipTextActive: {
    color: "#050505",
    fontWeight: "600",
  },
  saveBtn: {
    marginTop: 32,
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnText: {
    color: "#050505",
    fontSize: 15,
    fontWeight: "700",
  },
  quickNav: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.borderDim,
    backgroundColor: C.bg,
  },
  quickNavTitle: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  quickNavScroll: { flexDirection: "row", gap: 8, paddingRight: 8 },
  quickNavChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.borderDim,
  },
  quickNavChipText: { color: C.accent, fontSize: 12, fontWeight: "700" },
  valuePreview: {
    color: C.textSec,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
    marginTop: -2,
  },
  stickySave: {
    borderTopWidth: 1,
    borderTopColor: C.borderDim,
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  stickyHint: { color: C.textMuted, fontSize: 12, textAlign: "center" },
  stickySaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 14,
  },
  stickySaveBtnText: { color: "#050505", fontSize: 15, fontWeight: "800" },
});
