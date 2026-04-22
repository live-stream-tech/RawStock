import React, { useEffect, useMemo, useState } from "react";
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
  BackHandler,
} from "react-native";
import { usePreventRemove } from "@react-navigation/native";
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, formatUserFacingApiError } from "@/lib/query-client";
import { buildOrderVideoSpec, formatFromTone, styleFromTone } from "@/lib/ai-edit/buildOrderVideoSpec";
import { useAuth } from "@/lib/auth";
import { C } from "@/constants/colors";
import { webScrollStyle } from "@/constants/layout";

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

/** Same mapping as `server/lib/dslToTemplated.ts` TEMPLATE_BY_CUT_SPEED. */
function motionTemplateFromTone(tone: string): { family: string; internalId: string } {
  const { cut_speed } = styleFromTone(tone);
  if (cut_speed === "fast") return { family: "Fast cut", internalId: "rawstock-fast-cut" };
  if (cut_speed === "slow") return { family: "Cinematic", internalId: "rawstock-cinematic" };
  return { family: "Standard", internalId: "rawstock-standard" };
}

function formatLabelForUi(tone: string): string {
  const f = formatFromTone(tone);
  if (f === "vertical_9_16") return "9:16 vertical";
  if (f === "square_1_1") return "1:1 square";
  return "16:9 horizontal";
}

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

const VIDEO_METADATA_TIMEOUT_MS = 120_000;

async function getVideoDuration(file: File): Promise<number> {
  if (typeof document === "undefined") return 0;
  return new Promise((resolve) => {
    let settled = false;
    const done = (dur: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(dur);
    };
    const timer = setTimeout(() => {
      try {
        URL.revokeObjectURL(video.src);
      } catch {
        /* ignore */
      }
      done(0);
    }, VIDEO_METADATA_TIMEOUT_MS);

    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const dur = video.duration;
      URL.revokeObjectURL(video.src);
      done(isFinite(dur) ? dur : 0);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      done(0);
    };
    video.src = URL.createObjectURL(file);
  });
}

function isLikelyBrowserNetworkBlock(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof Error) {
    const m = err.message;
    return /Failed to fetch|NetworkError|Load failed|network error/i.test(m);
  }
  return false;
}

/** 署名 URL の Content-Type と PUT ヘッダを一致させる（空 type は iPhone 動画などで起きる） */
function resolveUploadContentType(file: File): string {
  const t = file.type?.trim();
  if (t) return t;
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".mov") || lower.endsWith(".qt")) return "video/quicktime";
  return "application/octet-stream";
}

async function uploadToR2(file: File): Promise<string> {
  const contentType = resolveUploadContentType(file);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const res = await apiRequest("POST", "/api/upload-url", {
    fileName: safeName,
    contentType,
  });
  const json = (await res.json()) as { uploadUrl?: string; url?: string };
  if (!json.uploadUrl || !json.url) {
    throw new Error("Could not start upload (invalid response from server).");
  }
  const presign = json.uploadUrl;
  if (
    /x-amz-sdk-checksum-algorithm=/i.test(presign) ||
    /x-amz-checksum-/i.test(presign) ||
    /[?&]x-amz-checksum-crc32=/i.test(presign) ||
    /_cksum-crc32/i.test(presign)
  ) {
    throw new Error(
      "The upload URL from the server includes SDK checksum parameters, which browsers cannot send on a simple PUT. " +
        "Redeploy the API with the latest server (R2 client uses requestChecksumCalculation WHEN_REQUIRED), " +
        "or unset AWS_REQUEST_CHECKSUM_CALCULATION on the server if it is set to WHEN_SUPPORTED.",
    );
  }
  let put: Response;
  try {
    put = await fetch(json.uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": contentType },
    });
  } catch (err: unknown) {
    console.error("[ai-edit] R2 PUT failed:", err);
    if (isLikelyBrowserNetworkBlock(err)) {
      throw new Error(
        "Browser could not upload the file to storage (often CORS or a blocked cross-origin request). " +
          "In Cloudflare R2, allow PUT from https://rawstock.live with header Content-Type, or try another browser.",
      );
    }
    throw err instanceof Error ? err : new Error(String(err));
  }
  if (!put.ok) {
    const detail = (await put.text().catch(() => "")).trim().replace(/\s+/g, " ");
    throw new Error(
      detail
        ? `Upload to storage failed (HTTP ${put.status}): ${detail.slice(0, 220)}${detail.length > 220 ? "…" : ""}`
        : `Upload to storage failed (HTTP ${put.status})`,
    );
  }
  return json.url;
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
  const [preparingVideos, setPreparingVideos] = useState(false);
  const [prepareProgress, setPrepareProgress] = useState("");
  const [flowError, setFlowError] = useState<string | null>(null);

  const blockingInteraction = uploading || preparingVideos;
  const blockerTitle = preparingVideos ? "Preparing videos" : "Upload in progress";
  const blockerMessage = preparingVideos
    ? prepareProgress || "Reading file metadata…"
    : uploadProgress || "Processing…";

  usePreventRemove(blockingInteraction, () => {
    Alert.alert(
      preparingVideos ? "Please wait" : "Upload in progress",
      preparingVideos
        ? "Still reading your video files. Please wait."
        : "Upload is still running. Please wait until it finishes.",
    );
  });

  useEffect(() => {
    if (!blockingInteraction) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, [blockingInteraction]);

  useEffect(() => {
    if (!blockingInteraction || Platform.OS !== "web" || typeof window === "undefined") return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [blockingInteraction]);

  const plan = PLANS.find((p) => p.id === selectedPlan)!;
  const motionPreview = useMemo(() => {
    if (!tone) return null;
    const mt = motionTemplateFromTone(tone);
    return { ...mt, frame: formatLabelForUi(tone) };
  }, [tone]);
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
        setPreparingVideos(true);
        setPrepareProgress("");
        setFlowError(null);
        try {
          const added: VideoFile[] = [];
          const n = files.length;
          for (let i = 0; i < n; i++) {
            const file = files[i];
            setPrepareProgress(`Reading video ${i + 1} of ${n}…`);
            const durationSec = await getVideoDuration(file);
            added.push({ file, name: file.name, durationSec });
          }
          setVideos((prev) => [...prev, ...added]);
        } catch (e: unknown) {
          const msg = formatUserFacingApiError(e);
          setFlowError(msg);
          console.error("[ai-edit] prepare videos:", e);
          Alert.alert("Could not prepare videos", msg);
        } finally {
          setPreparingVideos(false);
          setPrepareProgress("");
        }
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

    setFlowError(null);
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

      const data = (await res.json()) as { id: number; status: string };
      router.replace(`/ai-edit/${data.id}`);
    } catch (e: unknown) {
      const msg = formatUserFacingApiError(e);
      setFlowError(msg);
      console.error("[ai-edit] submit failed:", e);
      Alert.alert("Error", msg);
      if (Platform.OS === "web" && typeof window !== "undefined") {
        queueMicrotask(() => {
          try {
            window.alert(`Upload / submit failed\n\n${msg}`);
          } catch {
            /* ignore */
          }
        });
      }
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
    !uploading &&
    !preparingVideos;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <Modal visible={blockingInteraction} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.uploadBlocker}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={styles.uploadBlockerTitle}>{blockerTitle}</Text>
          <Text style={styles.uploadBlockerMessage}>{blockerMessage}</Text>
          <Text style={styles.uploadBlockerHint}>
            Do not leave this screen or close the app until this finishes.
          </Text>
        </View>
      </Modal>

      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Pressable
          style={[styles.backBtn, blockingInteraction && styles.backBtnDisabled]}
          onPress={() => !blockingInteraction && router.back()}
          disabled={blockingInteraction}
        >
          <Ionicons name="chevron-back" size={22} color={blockingInteraction ? C.textMuted : C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>AI Edit Assistant</Text>
        <View style={{ width: 40 }} />
      </View>

      {flowError ? (
        <View style={styles.flowErrorBanner}>
          <Ionicons name="warning-outline" size={20} color="#ffb4b4" style={{ marginTop: 1 }} />
          <Text style={styles.flowErrorText}>{flowError}</Text>
          <Pressable
            onPress={() => setFlowError(null)}
            hitSlop={12}
            accessibilityLabel="Dismiss error"
            style={styles.flowErrorDismiss}
          >
            <Ionicons name="close" size={22} color={C.textMuted} />
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        style={webScrollStyle(styles.scroll)}
        showsVerticalScrollIndicator={scrollShowsVertical}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroBadge}>
              <Ionicons name="sparkles" size={13} color={C.accent} />
              <Text style={styles.heroBadgeText}>Claude — edit plan</Text>
            </View>
            <View style={[styles.heroBadge, styles.heroBadgeMuted]}>
              <Ionicons name="film-outline" size={13} color={C.textSec} />
              <Text style={styles.heroBadgeTextMuted}>Templated — 3 motion styles</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>Plan, then render</Text>
          <Text style={styles.heroSub}>
            (1) Your plan tier sets ticket cost, upload limits, and the target length for Claude's Edit Decision List (text — URLs only, no full video watch).{"\n\n"}
            (2) After you approve, optional MP4 render uses Templated: Tone picks one of three motion templates plus frame shape (9:16 or 16:9). Four plan tiers are not four templates.
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
        <Text style={styles.sectionHint}>
          Billing and how much footage you can attach — not the Templated motion template. Template family comes from Tone below.
        </Text>
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
                  Claude target: {p.output}
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

        {motionPreview ? (
          <View style={styles.mechanismBox}>
            <Text style={styles.mechanismBoxTitle}>Motion render (Templated)</Text>
            <Text style={styles.mechanismBoxLine}>
              Template: <Text style={styles.mechanismBoxEm}>{motionPreview.family}</Text>
              {" · "}
              Frame: <Text style={styles.mechanismBoxEm}>{motionPreview.frame}</Text>
            </Text>
            <Text style={styles.mechanismBoxFine}>
              Maps to <Text style={styles.mechanismBoxMono}>{motionPreview.internalId}</Text> + format suffix (same rules as server).
            </Text>
          </View>
        ) : (
          <Text style={styles.sectionHint}>
            Select a Tone to see which of the three motion templates and frame shape apply when you render.
          </Text>
        )}

        {/* ── Editing instructions ── */}
        <Text style={styles.sectionLabel}>EDITING INSTRUCTIONS *</Text>
        <Text style={styles.sectionHint}>
          Sent to Claude with audience, tone, and video URLs as the main editing brief.
        </Text>
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

        {!canAfford && !uploading && !preparingVideos && (
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
  uploadBlocker: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    gap: 14,
  },
  uploadBlockerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  uploadBlockerMessage: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  uploadBlockerHint: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 4,
  },
  flowErrorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(180, 40, 40, 0.22)",
    borderWidth: 1,
    borderColor: "rgba(255, 120, 120, 0.45)",
  },
  flowErrorText: {
    flex: 1,
    color: "#ffc9c9",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  flowErrorDismiss: { padding: 2 },
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
  backBtnDisabled: { opacity: 0.45 },
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
  heroBadgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
  heroBadgeMuted: {
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.borderDim,
  },
  heroBadgeText: { color: C.accent, fontSize: 11, fontWeight: "700" },
  heroBadgeTextMuted: { color: C.textSec, fontSize: 11, fontWeight: "600" },
  heroTitle: { color: C.text, fontSize: 22, fontWeight: "800", lineHeight: 30 },
  heroSub: { color: C.textSec, fontSize: 13, lineHeight: 20 },
  sectionHint: {
    color: C.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginHorizontal: 16,
    marginTop: -4,
    marginBottom: 10,
  },
  mechanismBox: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.borderDim,
    gap: 6,
  },
  mechanismBoxTitle: { color: C.text, fontSize: 12, fontWeight: "800" },
  mechanismBoxLine: { color: C.textSec, fontSize: 12, lineHeight: 18 },
  mechanismBoxEm: { color: C.accent, fontWeight: "700" },
  mechanismBoxFine: { color: C.textMuted, fontSize: 11, lineHeight: 16 },
  mechanismBoxMono: { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 10 },

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
