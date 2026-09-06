import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/constants/colors";
import { WORK_POST_LIMITS } from "@/constants/upload-limits";
import { formatVideoTime } from "@/lib/formatVideoTime";
import { prepareVideoBlobForWebUpload } from "@/lib/compressVideoBlobWeb";
import { WEB_VIDEO_PREP_MAX_OUTPUT_BYTES } from "@/lib/media-upload-constants";
import { uploadLargeBlobViaR2Presigned } from "@/lib/r2-large-upload";
import { VIDEO_PREP_QUALITIES, type VideoPrepQualityId } from "@/lib/videoPrepTypes";
import { getVideoUploadPrepCopy } from "@/lib/videoUploadPrepStrings";
import { reportUploadFailure } from "@/lib/reportUploadFailure";

export type VideoUploadPrepModalProps = {
  visible: boolean;
  file: File | null;
  maxClipSec: number;
  isJaUi?: boolean;
  /** Telemetry label: daily | work */
  flow?: "daily" | "work";
  onClose: () => void;
  onPrepared: (result: {
    blob: Blob;
    previewUrl: string;
    durationSec: number;
    fileName: string;
    /** Set when the file was already uploaded (e.g. Upload original). */
    uploadedUrl?: string;
  }) => void;
};

const LIGHT_QUALITY = VIDEO_PREP_QUALITIES.find((q) => q.id === "light") ?? VIDEO_PREP_QUALITIES[2];

export function VideoUploadPrepModal({
  visible,
  file,
  maxClipSec,
  isJaUi = false,
  flow = "daily",
  onClose,
  onPrepared,
}: VideoUploadPrepModalProps) {
  const isDaily = flow === "daily";
  const copy = useMemo(() => getVideoUploadPrepCopy(isJaUi, flow), [isJaUi, flow]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(maxClipSec);
  const [qualityId, setQualityId] = useState<VideoPrepQualityId>("light");
  const [preparing, setPreparing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [originalMode, setOriginalMode] = useState(false);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!visible || !file) return;
    setError(null);
    setProgress(0);
    setPreparing(false);
    setTrimStart(0);
    setTrimEnd(maxClipSec);
    setDuration(0);
    setQualityId("light");
    setOriginalMode(false);
  }, [visible, file, maxClipSec]);

  const clipLen = Math.max(0, trimEnd - trimStart);
  const quality = isDaily
    ? LIGHT_QUALITY
    : (VIDEO_PREP_QUALITIES.find((q) => q.id === qualityId) ?? VIDEO_PREP_QUALITIES[1]);

  const prepMaxMb = Math.floor(WEB_VIDEO_PREP_MAX_OUTPUT_BYTES / (1024 * 1024));
  const workMaxBytes = WORK_POST_LIMITS.maxFileSizeMB * 1024 * 1024;
  const isLikelyMov =
    !!file &&
    (/\.(mov|qt)$/i.test(file.name) || /quicktime/i.test(file.type || ""));
  const canUploadOriginal =
    !isDaily &&
    !!file &&
    !isLikelyMov &&
    file.size <= WEB_VIDEO_PREP_MAX_OUTPUT_BYTES &&
    file.size <= workMaxBytes;

  const onLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration)) return;
    const dur = v.duration;
    setDuration(dur);
    const end = Math.min(dur, maxClipSec);
    setTrimStart(0);
    setTrimEnd(end);
  }, [maxClipSec]);

  const handlePrepare = useCallback(async () => {
    if (!file || preparing) return;
    if (clipLen < 0.5) {
      setError(copy.clipTooShort);
      return;
    }
    if (clipLen > maxClipSec + 0.01) {
      setError(copy.clipTooLong(maxClipSec));
      return;
    }

    setPreparing(true);
    setOriginalMode(false);
    setError(null);
    setProgress(0);

    try {
      const prepared = await prepareVideoBlobForWebUpload(file, {
        trimStartSec: trimStart,
        trimEndSec: trimEnd,
        quality,
        targetMaxBytes: WEB_VIDEO_PREP_MAX_OUTPUT_BYTES,
        maxClipSec,
        onProgress: setProgress,
      });

      if (!prepared) {
        const errMsg = copy.prepareFailed;
        reportUploadFailure({
          title: copy.reportTitlePrepareFailed,
          message: errMsg,
          stage: "web_transcode_null",
          flow,
          mediaType: "video",
          fileSizeBytes: file?.size,
        });
        setError(errMsg);
        return;
      }

      const ext = prepared.ext;
      const base = file.name.replace(/\.[^.]+$/, "") || "video";
      const fileName = `${base}.${ext}`;
      const outUrl = URL.createObjectURL(prepared.blob);
      onPrepared({
        blob: prepared.blob,
        previewUrl: outUrl,
        durationSec: prepared.durationSec,
        fileName,
      });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : copy.prepareError;
      reportUploadFailure({
        title: copy.reportTitlePrepareError,
        message: errMsg,
        stage: "web_transcode_exception",
        flow,
        mediaType: "video",
        fileSizeBytes: file?.size,
      });
      setError(errMsg);
    } finally {
      setPreparing(false);
    }
  }, [file, preparing, clipLen, maxClipSec, trimStart, trimEnd, quality, onPrepared, copy, flow]);

  /**
   * Upload original: no re-encode. Sends the full selected File when metadata duration
   * is within maxClipSec. Trim sliders apply only to the compress/prepare path.
   */
  const resolveSourceDuration = useCallback((): number => {
    if (duration > 0) return duration;
    const v = videoRef.current;
    if (v && Number.isFinite(v.duration) && v.duration > 0) return v.duration;
    return 0;
  }, [duration]);

  const handleUploadOriginal = useCallback(async () => {
    if (!file || preparing || !canUploadOriginal) return;

    if (/\.(mov|qt)$/i.test(file.name) || /quicktime/i.test(file.type || "")) {
      setError(
        copy.movOriginalBlocked ??
          "QuickTime (.mov) files often do not play in browsers. Compress to MP4 first.",
      );
      return;
    }

    const sourceDuration = resolveSourceDuration();
    if (sourceDuration > maxClipSec + 0.01) {
      setError(copy.clipTooLong(maxClipSec));
      return;
    }
    if (file.size > WEB_VIDEO_PREP_MAX_OUTPUT_BYTES) {
      setError(
        copy.fullFileTooLarge?.(prepMaxMb) ??
          copy.prepareTooLarge(prepMaxMb, (file.size / (1024 * 1024)).toFixed(1)),
      );
      return;
    }

    setPreparing(true);
    setOriginalMode(true);
    setError(null);
    setProgress(0);

    try {
      const mime = file.type.split(";")[0].trim() || "video/mp4";
      const fileName = file.name || "video.mp4";
      const durationSec = sourceDuration > 0 ? sourceDuration : maxClipSec;

      const publicUrl = await uploadLargeBlobViaR2Presigned(file, fileName, mime, {
        onProgress: setProgress,
      });

      onPrepared({
        blob: file,
        previewUrl: publicUrl,
        durationSec,
        fileName,
        uploadedUrl: publicUrl,
      });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : copy.prepareError;
      reportUploadFailure({
        title: copy.reportTitlePrepareError,
        message: errMsg,
        stage: "web_upload_original",
        flow,
        mediaType: "video",
        fileSizeBytes: file?.size,
      });
      setError(errMsg);
    } finally {
      setPreparing(false);
    }
  }, [
    file,
    preparing,
    canUploadOriginal,
    resolveSourceDuration,
    maxClipSec,
    copy,
    flow,
    onPrepared,
    prepMaxMb,
  ]);

  if (Platform.OS !== "web" || !visible) return null;

  const sizeMb = file ? (file.size / (1024 * 1024)).toFixed(1) : "0";

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{copy.title}</Text>
            <Pressable onPress={onClose} disabled={preparing} hitSlop={12}>
              <Ionicons name="close" size={24} color={C.text} />
            </Pressable>
          </View>

          <Text style={styles.hint}>{copy.hint(sizeMb, maxClipSec)}</Text>
          <Text style={styles.hintCap}>{copy.trimNote}</Text>

          <View style={styles.previewWrap}>
            {previewUrl ? (
              <video
                ref={videoRef}
                src={previewUrl}
                style={{ width: "100%", maxHeight: 220, borderRadius: 8, backgroundColor: "#000" }}
                controls
                playsInline
                preload="metadata"
                onLoadedMetadata={onLoadedMetadata}
              />
            ) : null}
          </View>

          {duration > 0 ? (
            <>
              <Text style={styles.label}>
                {copy.clip(formatVideoTime(trimStart), formatVideoTime(trimEnd), formatVideoTime(clipLen))}
              </Text>
              <WebRange
                label={copy.rangeStart}
                min={0}
                max={Math.max(0, trimEnd - 0.5)}
                step={0.1}
                value={trimStart}
                disabled={preparing}
                onChange={(v) => setTrimStart(Math.min(v, trimEnd - 0.5))}
              />
              <WebRange
                label={copy.rangeEnd}
                min={trimStart + 0.5}
                max={Math.min(duration, maxClipSec)}
                step={0.1}
                value={Math.min(trimEnd, duration, maxClipSec)}
                disabled={preparing}
                onChange={(v) => setTrimEnd(Math.max(v, trimStart + 0.5))}
              />
            </>
          ) : null}

          {!isDaily ? (
            <>
              <Text style={styles.label}>{copy.quality}</Text>
              <View style={styles.qualityRow}>
                {VIDEO_PREP_QUALITIES.map((q) => (
                  <Pressable
                    key={q.id}
                    style={[styles.qualityBtn, qualityId === q.id && styles.qualityBtnActive]}
                    onPress={() => setQualityId(q.id as VideoPrepQualityId)}
                    disabled={preparing}
                  >
                    <Text style={[styles.qualityText, qualityId === q.id && styles.qualityTextActive]}>
                      {copy.qualityLabels[q.id as VideoPrepQualityId]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          {preparing ? (
            <View style={styles.progressRow}>
              <ActivityIndicator color={C.accent} />
              <Text style={styles.progressText}>
                {originalMode && copy.uploadingFullFile
                  ? copy.uploadingFullFile(Math.round(progress * 100))
                  : copy.preparing(Math.round(progress * 100))}
              </Text>
            </View>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.primaryBtn, preparing && styles.primaryBtnDisabled]}
            onPress={handlePrepare}
            disabled={preparing || !file}
          >
            <Text style={styles.primaryBtnText}>{copy.addToPost}</Text>
          </Pressable>

          {!isDaily && copy.uploadFullFile ? (
            <>
              {canUploadOriginal ? (
                <Pressable
                  style={[styles.secondaryBtn, preparing && styles.primaryBtnDisabled]}
                  onPress={handleUploadOriginal}
                  disabled={preparing || !file}
                >
                  <Text style={styles.secondaryBtnText}>{copy.uploadFullFile}</Text>
                </Pressable>
              ) : null}
              {copy.uploadFullFileHint ? (
                <Text style={styles.hintCap}>
                  {isLikelyMov && copy.movOriginalBlocked
                    ? copy.movOriginalBlocked
                    : canUploadOriginal
                      ? copy.uploadFullFileHint(prepMaxMb)
                      : copy.fullFileTooLarge?.(prepMaxMb) ?? copy.uploadFullFileHint(prepMaxMb)}
                </Text>
              ) : null}
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function WebRange({
  label,
  min,
  max,
  step,
  value,
  disabled,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  if (max <= min) return null;
  return (
    <View style={styles.rangeRow}>
      <Text style={styles.rangeLabel}>{label}</Text>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: C.accent }}
      />
      <Text style={styles.rangeValue}>{formatVideoTime(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    padding: 16,
  },
  sheet: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 20,
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: { color: C.text, fontSize: 18, fontWeight: "700" },
  hint: { color: C.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 6 },
  hintCap: { color: C.textMuted, fontSize: 12, lineHeight: 16, marginBottom: 12, fontStyle: "italic" },
  previewWrap: { marginBottom: 12, overflow: "hidden", borderRadius: 8 },
  label: { color: C.textSec, fontSize: 12, fontWeight: "600", marginBottom: 6, marginTop: 4 },
  rangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  rangeLabel: { color: C.textMuted, fontSize: 12, width: 36 },
  rangeValue: { color: C.textSec, fontSize: 12, width: 40, textAlign: "right" },
  qualityRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  qualityBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.borderDim,
  },
  qualityBtnActive: { borderColor: C.accent, backgroundColor: "rgba(0,255,204,0.12)" },
  qualityText: { color: C.textSec, fontSize: 12, fontWeight: "600" },
  qualityTextActive: { color: C.accent },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  progressText: { color: C.textSec, fontSize: 13 },
  errorText: { color: C.live, fontSize: 13, marginBottom: 12 },
  primaryBtn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: "#050505", fontSize: 15, fontWeight: "800" },
  secondaryBtn: {
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.borderDim,
  },
  secondaryBtnText: { color: C.text, fontSize: 15, fontWeight: "700" },
});
