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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { buildOrderVideoSpec } from "@/lib/ai-edit/buildOrderVideoSpec";
import { useAuth } from "@/lib/auth";
import { C } from "@/constants/colors";

// ─── Plan definitions ────────────────────────────────────────────────────────

const PLANS = [
  { id: 15 as const, label: "Lite",     output: "15 min", maxVideos: 3,  maxTotalMin: 20,  tickets: 200 },
  { id: 30 as const, label: "Standard", output: "30 min", maxVideos: 5,  maxTotalMin: 45,  tickets: 400 },
  { id: 45 as const, label: "Pro",      output: "45 min", maxVideos: 7,  maxTotalMin: 70,  tickets: 600 },
  { id: 60 as const, label: "Full",     output: "60 min", maxVideos: 10, maxTotalMin: 100, tickets: 800 },
] as const;

type PlanId = 15 | 30 | 45 | 60;

const TARGET_OPTIONS = [
  "General",
  "Fans",
  "New Listeners",
  "Industry",
  "Youth (teens–20s)",
  "Adults (30s+)",
];

const TONE_OPTIONS = [
  "Energetic",
  "Emotional",
  "Cool & Stylish",
  "Cinematic",
  "Casual",
  "Professional",
];

// ─── Types ───────────────────────────────────────────────────────────────────

type VideoFile = {
  file: File;
  name: string;
  durationSec: number;
};

type LogoFile = {
  file: File;
  name: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDuration(totalSec: number): string {
  if (!isFinite(totalSec) || totalSec <= 0) return "0:00";
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

async function getVideoDuration(file: File): Promise<number> {
  if (typeof document === "undefined") return 0;
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const dur = video.duration;
      URL.revokeObjectURL(video.src);
      resolve(isFinite(dur) ? dur : 0);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve(0);
    };
    video.src = URL.createObjectURL(file);
  });
}

async function uploadToR2(file: File): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const res = await apiRequest("POST", "/api/upload-url", {
    fileName: safeName,
    contentType: file.type,
  });
  if (!res.ok) throw new Error("Failed to get upload URL");
  const { uploadUrl, url } = (await res.json()) as { uploadUrl: string; url: string };
  const put = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!put.ok) throw new Error("Upload to storage failed");
  return url;
}

function openFilePicker(options: {
  accept: string;
  multiple?: boolean;
  onFiles: (files: FileList) => void;
}) {
  if (typeof document === "undefined") return;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = options.accept;
  if (options.multiple) input.multiple = true;
  input.onchange = () => {
    if (input.files?.length) options.onFiles(input.files);
  };
  input.click();
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AIEditIndexScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const { user, requireAuth } = useAuth();

  const [selectedPlan, setSelectedPlan] = useState<PlanId>(15);
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [logo, setLogo] = useState<LogoFile | null>(null);
  const [telop, setTelop] = useState("");
  const [targetAudience, setTargetAudience] = useState<string | null>(null);
  const [tone, setTone] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  const plan = PLANS.find((p) => p.id === selectedPlan)!;
  const totalDurationSec = videos.reduce((sum, v) => sum + v.durationSec, 0);
  const totalDurationMin = totalDurationSec / 60;
  const durationExceeded = totalDurationMin > plan.maxTotalMin;
  const videoCountExceeded = videos.length > plan.maxVideos;

  const { data: balData } = useQuery<{ balance: number }>({
    queryKey: ["/api/tickets/balance"],
    enabled: !!user,
  });
  const ticketBalance = balData?.balance ?? 0;
  const canAfford = ticketBalance >= plan.tickets;

  // ── Pickers ───────────────────────────────────────────────────────────────

  function pickVideos() {
    openFilePicker({
      accept: "video/*",
      multiple: true,
      onFiles: async (files) => {
        const added: VideoFile[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const durationSec = await getVideoDuration(file);
          added.push({ file, name: file.name, durationSec });
        }
        setVideos((prev) => [...prev, ...added]);
      },
    });
  }

  function pickLogo() {
    openFilePicker({
      accept: "image/png",
      onFiles: (files) => {
        const file = files[0];
        if (!file.type.includes("png")) {
          Alert.alert("PNG only", "Logo must be a transparent PNG file.");
          return;
        }
        setLogo({ file, name: file.name });
      },
    });
  }

  function removeVideo(index: number) {
    setVideos((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!requireAuth("AI Edit Assistant")) return;
    if (videos.length === 0) {
      Alert.alert("No videos selected", "Please add at least one video file.");
      return;
    }
    if (videoCountExceeded) {
      Alert.alert("Too many videos", `The ${plan.label} plan allows up to ${plan.maxVideos} videos.`);
      return;
    }
    if (durationExceeded) {
      Alert.alert(
        "Duration exceeded",
        `Total material must be under ${plan.maxTotalMin} min for the ${plan.label} plan. Current: ${fmtDuration(totalDurationSec)}.`
      );
      return;
    }
    if (!targetAudience) {
      Alert.alert("Select target audience", "Please select a target audience.");
      return;
    }
    if (!tone) {
      Alert.alert("Select tone", "Please select a tone / style.");
      return;
    }
    if (!prompt.trim()) {
      Alert.alert("Missing instructions", "Please enter your editing instructions.");
      return;
    }
    if (!canAfford) {
      Alert.alert(
        "Insufficient tickets",
        `The ${plan.label} plan requires ${plan.tickets} tickets. You have ${ticketBalance}. Visit the Tickets page to purchase more.`
      );
      return;
    }

    setUploading(true);
    try {
      const videoUrls: string[] = [];
      for (let i = 0; i < videos.length; i++) {
        setUploadProgress(`Uploading video ${i + 1} of ${videos.length}…`);
        const url = await uploadToR2(videos[i].file);
        videoUrls.push(url);
      }

      let logoUrl: string | undefined;
      if (logo) {
        setUploadProgress("Uploading logo…");
        logoUrl = await uploadToR2(logo.file);
      }

      const spec = buildOrderVideoSpec({
        videos: videos.map((v) => ({ durationSec: v.durationSec })),
        hasLogo: logo !== null,
        tone: tone!,
        editingInstructions: prompt.trim(),
      });

      setUploadProgress("Submitting to Claude AI…");
      const res = await apiRequest("POST", "/api/ai-edit/jobs", {
        planMinutes: selectedPlan,
        videoUrls,
        logoUrl,
        telop: telop.trim() || undefined,
        targetAudience,
        tone,
        prompt: prompt.trim(),
        spec,
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Submission failed");
      }

      const data = (await res.json()) as { id: number; status: string };
      router.replace(`/ai-edit/${data.id}`);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Something went wrong. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  }

  const canSubmit =
    videos.length > 0 &&
    !durationExceeded &&
    !videoCountExceeded &&
    !!targetAudience &&
    !!tone &&
    !!prompt.trim() &&
    canAfford &&
    !uploading;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>AI Edit Assistant</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={13} color={C.accent} />
            <Text style={styles.heroBadgeText}>Powered by Claude AI</Text>
          </View>
          <Text style={styles.heroTitle}>AI generates your{"\n"}edit plan automatically</Text>
          <Text style={styles.heroSub}>
            Select a plan, upload your raw footage, and Claude will create a structured Edit Decision List tailored to your vision.
          </Text>
        </View>

        {/* Ticket balance */}
        <View style={styles.balanceRow}>
          <Ionicons name="ticket-outline" size={14} color={C.textSec} />
          <Text style={styles.balanceText}>
            Balance:{" "}
            <Text style={{ color: C.accent, fontWeight: "700" }}>
              {ticketBalance.toLocaleString()} tickets
            </Text>
          </Text>
        </View>

        {/* ── Plan selector ── */}
        <Text style={styles.sectionLabel}>SELECT PLAN</Text>
        <View style={styles.planGrid}>
          {PLANS.map((p) => {
            const selected = selectedPlan === p.id;
            const affordable = ticketBalance >= p.tickets;
            return (
              <Pressable
                key={p.id}
                style={[styles.planCard, selected && styles.planCardSelected]}
                onPress={() => setSelectedPlan(p.id)}
              >
                <Text style={[styles.planName, selected && styles.planNameSelected]}>
                  {p.label}
                </Text>
                <Text style={[styles.planOutput, selected && { color: C.accent }]}>
                  {p.output} output
                </Text>
                <View style={styles.planSpecs}>
                  <Text style={styles.planSpec}>Up to {p.maxVideos} videos</Text>
                  <Text style={styles.planSpec}>Max {p.maxTotalMin} min material</Text>
                </View>
                <View style={styles.planPriceRow}>
                  <Ionicons
                    name="ticket"
                    size={11}
                    color={selected ? C.accent : affordable ? C.textSec : C.live}
                  />
                  <Text
                    style={[
                      styles.planPriceText,
                      selected && { color: C.accent },
                      !affordable && !selected && { color: C.live },
                    ]}
                  >
                    {p.tickets} tickets
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* ── Video files ── */}
        <Text style={styles.sectionLabel}>VIDEO FILES *</Text>
        <Pressable style={styles.uploadZone} onPress={pickVideos}>
          <Ionicons name="cloud-upload-outline" size={26} color={C.textSec} />
          <Text style={styles.uploadZoneText}>Tap to select video files</Text>
          <Text style={styles.uploadZoneSubText}>
            Up to {plan.maxVideos} files · Max {plan.maxTotalMin} min total
          </Text>
        </Pressable>

        {videos.length > 0 && (
          <View style={styles.videoList}>
            {/* Duration bar */}
            <View style={[styles.durationBar, durationExceeded && styles.durationBarOver]}>
              <Ionicons
                name="time-outline"
                size={13}
                color={durationExceeded ? C.live : C.textSec}
              />
              <Text
                style={[styles.durationBarText, durationExceeded && { color: C.live }]}
              >
                {fmtDuration(totalDurationSec)} / {plan.maxTotalMin}:00 max
              </Text>
              {durationExceeded && (
                <Text style={styles.durationOverLabel}>Exceeds limit</Text>
              )}
            </View>

            {videoCountExceeded && (
              <Text style={styles.countOverLabel}>
                Too many videos ({videos.length}/{plan.maxVideos})
              </Text>
            )}

            {videos.map((v, i) => (
              <View key={i} style={styles.videoItem}>
                <Ionicons name="videocam" size={15} color={C.textSec} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.videoName} numberOfLines={1}>
                    {v.name}
                  </Text>
                  <Text style={styles.videoDuration}>{fmtDuration(v.durationSec)}</Text>
                </View>
                <Pressable onPress={() => removeVideo(i)} hitSlop={10}>
                  <Ionicons name="close-circle" size={18} color={C.textMuted} />
                </Pressable>
              </View>
            ))}

            {videos.length < plan.maxVideos && (
              <Pressable style={styles.addMoreBtn} onPress={pickVideos}>
                <Ionicons name="add" size={14} color={C.accent} />
                <Text style={styles.addMoreText}>Add more videos</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* ── Logo upload ── */}
        <Text style={styles.sectionLabel}>LOGO IMAGE (optional)</Text>
        <Pressable style={styles.logoRow} onPress={pickLogo}>
          {logo ? (
            <>
              <Ionicons name="image" size={16} color={C.accent} />
              <Text style={styles.logoName} numberOfLines={1}>
                {logo.name}
              </Text>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  setLogo(null);
                }}
                hitSlop={10}
              >
                <Ionicons name="close-circle" size={16} color={C.textMuted} />
              </Pressable>
            </>
          ) : (
            <>
              <Ionicons name="image-outline" size={16} color={C.textSec} />
              <Text style={styles.logoPlaceholder}>Upload transparent PNG</Text>
              <Ionicons name="add-circle-outline" size={16} color={C.textMuted} />
            </>
          )}
        </Pressable>

        {/* ── Telop ── */}
        <Text style={styles.sectionLabel}>TELOP TEXT (optional)</Text>
        <TextInput
          style={styles.input}
          value={telop}
          onChangeText={setTelop}
          placeholder="e.g.  Song Title · Artist · Date"
          placeholderTextColor={C.textMuted}
        />

        {/* ── Target audience ── */}
        <Text style={styles.sectionLabel}>TARGET AUDIENCE *</Text>
        <View style={styles.chips}>
          {TARGET_OPTIONS.map((opt) => {
            const sel = targetAudience === opt;
            return (
              <Pressable
                key={opt}
                style={[styles.chip, sel && styles.chipSelected]}
                onPress={() => setTargetAudience(sel ? null : opt)}
              >
                <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Tone ── */}
        <Text style={styles.sectionLabel}>TONE / STYLE *</Text>
        <View style={styles.chips}>
          {TONE_OPTIONS.map((opt) => {
            const sel = tone === opt;
            return (
              <Pressable
                key={opt}
                style={[styles.chip, sel && styles.chipSelected]}
                onPress={() => setTone(sel ? null : opt)}
              >
                <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Editing instructions ── */}
        <Text style={styles.sectionLabel}>EDITING INSTRUCTIONS *</Text>
        <TextInput
          style={[styles.input, styles.inputTall]}
          value={prompt}
          onChangeText={setPrompt}
          placeholder={"e.g.  Highlight the best 3 minutes of the guitar solo. Focus on the most exciting moments with crowd reactions."}
          placeholderTextColor={C.textMuted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* ── Upload progress ── */}
        {uploading && (
          <View style={styles.uploadingCard}>
            <ActivityIndicator size="small" color={C.accent} />
            <Text style={styles.uploadingText}>{uploadProgress || "Processing…"}</Text>
          </View>
        )}

        {/* ── Submit ── */}
        <Pressable
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Ionicons name="sparkles" size={16} color="#000" />
          )}
          <Text style={styles.submitBtnText}>
            {uploading ? "Processing…" : `Generate Edit Plan  ·  ${plan.tickets} tickets`}
          </Text>
        </Pressable>

        {!canAfford && !uploading && (
          <Pressable onPress={() => router.push("/tickets")} style={styles.noTicketsRow}>
            <Ionicons name="ticket-outline" size={13} color={C.live} />
            <Text style={styles.noTicketsText}>
              Not enough tickets — tap to purchase
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

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
  scroll: { flex: 1 },

  // Hero
  hero: { margin: 16, marginBottom: 4, gap: 8 },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.accent + "22",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  heroBadgeText: { color: C.accent, fontSize: 11, fontWeight: "700" },
  heroTitle: { color: C.text, fontSize: 22, fontWeight: "800", lineHeight: 30 },
  heroSub: { color: C.textSec, fontSize: 13, lineHeight: 20 },

  // Balance
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  balanceText: { color: C.textSec, fontSize: 13 },

  // Section label
  sectionLabel: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 4,
  },

  // Plan grid (2-column)
  planGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 20,
  },
  planCard: {
    width: "47%",
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderDim,
    padding: 12,
    gap: 4,
  },
  planCardSelected: {
    borderColor: C.accent,
    backgroundColor: C.accent + "12",
  },
  planName: { color: C.textSec, fontSize: 15, fontWeight: "800" },
  planNameSelected: { color: C.text },
  planOutput: { color: C.textMuted, fontSize: 12, fontWeight: "600" },
  planSpecs: { gap: 2, marginTop: 4 },
  planSpec: { color: C.textMuted, fontSize: 11 },
  planPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  planPriceText: { color: C.textSec, fontSize: 12, fontWeight: "700" },

  // Upload zone
  uploadZone: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderDim,
    borderStyle: "dashed",
    paddingVertical: 24,
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    backgroundColor: C.surface,
  },
  uploadZoneText: { color: C.textSec, fontSize: 14, fontWeight: "600" },
  uploadZoneSubText: { color: C.textMuted, fontSize: 11 },

  // Video list
  videoList: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderDim,
    overflow: "hidden",
  },
  durationBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.borderDim,
    backgroundColor: C.surface2,
  },
  durationBarOver: { backgroundColor: C.live + "18" },
  durationBarText: { color: C.textSec, fontSize: 12, fontWeight: "600", flex: 1 },
  durationOverLabel: {
    color: C.live,
    fontSize: 11,
    fontWeight: "700",
  },
  countOverLabel: {
    color: C.live,
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  videoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.borderDim,
  },
  videoName: { color: C.text, fontSize: 13, fontWeight: "600" },
  videoDuration: { color: C.textMuted, fontSize: 11 },
  addMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 12,
  },
  addMoreText: { color: C.accent, fontSize: 13, fontWeight: "600" },

  // Logo
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borderDim,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  logoName: { flex: 1, color: C.text, fontSize: 13, fontWeight: "600" },
  logoPlaceholder: { flex: 1, color: C.textMuted, fontSize: 13 },

  // Input
  input: {
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borderDim,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.text,
    fontSize: 14,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  inputTall: { minHeight: 100, textAlignVertical: "top" },

  // Chips
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  chip: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.borderDim,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipSelected: {
    backgroundColor: C.accent + "22",
    borderColor: C.accent,
  },
  chipText: { color: C.textSec, fontSize: 13, fontWeight: "600" },
  chipTextSelected: { color: C.accent },

  // Upload progress
  uploadingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borderDim,
    padding: 14,
  },
  uploadingText: { color: C.textSec, fontSize: 13, flex: 1 },

  // Submit
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.accent,
    marginHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 12,
    gap: 8,
    marginBottom: 10,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: "#000", fontSize: 15, fontWeight: "800" },

  // No tickets
  noTicketsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
  },
  noTicketsText: { color: C.live, fontSize: 12, fontWeight: "600" },
});
