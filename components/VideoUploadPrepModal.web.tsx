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
import { formatVideoTime } from "@/lib/formatVideoTime";
import { prepareVideoBlobForWebUpload } from "@/lib/compressVideoBlobWeb";
import { R2_SAME_ORIGIN_UPLOAD_MAX_BYTES } from "@/lib/query-client";
import { VIDEO_PREP_QUALITIES, type VideoPrepQualityId } from "@/lib/videoPrepTypes";
import { reportUploadFailure } from "@/lib/reportUploadFailure";

export type VideoUploadPrepModalProps = {
  visible: boolean;
  file: File | null;
  maxClipSec: number;
  onClose: () => void;
  onPrepared: (result: { blob: Blob; previewUrl: string; durationSec: number; fileName: string }) => void;
};

export function VideoUploadPrepModal({
  visible,
  file,
  maxClipSec,
  onClose,
  onPrepared,
}: VideoUploadPrepModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(maxClipSec);
  const [qualityId, setQualityId] = useState<VideoPrepQualityId>("standard");
  const [preparing, setPreparing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

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
    setTrimEnd(Math.min(maxClipSec, 60));
    setDuration(0);
  }, [visible, file, maxClipSec]);

  const clipLen = Math.max(0, trimEnd - trimStart);
  const quality = VIDEO_PREP_QUALITIES.find((q) => q.id === qualityId) ?? VIDEO_PREP_QUALITIES[1];

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
      setError("Clip must be at least half a second.");
      return;
    }
    if (clipLen > maxClipSec + 0.01) {
      setError(`Clip must be ${maxClipSec} seconds or less.`);
      return;
    }

    setPreparing(true);
    setError(null);
    setProgress(0);

    try {
      const prepared = await prepareVideoBlobForWebUpload(file, {
        trimStartSec: trimStart,
        trimEndSec: trimEnd,
        quality,
        targetMaxBytes: R2_SAME_ORIGIN_UPLOAD_MAX_BYTES,
        onProgress: setProgress,
      });

      if (!prepared) {
        const errMsg = "Could not prepare this video in the browser. Try a shorter clip or lower quality.";
        reportUploadFailure({
          title: "Video prepare failed",
          message: errMsg,
          stage: "web_transcode_null",
          flow: "daily",
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
      const errMsg = e instanceof Error ? e.message : "Prepare failed";
      reportUploadFailure({
        title: "Video prepare error",
        message: errMsg,
        stage: "web_transcode_exception",
        flow: "daily",
        mediaType: "video",
        fileSizeBytes: file?.size,
      });
      setError(errMsg);
    } finally {
      setPreparing(false);
    }
  }, [file, preparing, clipLen, maxClipSec, trimStart, trimEnd, quality, onPrepared]);

  if (Platform.OS !== "web") return null;

  const sizeMb = file ? (file.size / (1024 * 1024)).toFixed(1) : "0";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Prepare video</Text>
            <Pressable onPress={onClose} disabled={preparing} hitSlop={12}>
              <Ionicons name="close" size={24} color={C.text} />
            </Pressable>
          </View>

          <Text style={styles.hint}>
            Trim and compress before upload. Only the selected segment is processed (faster than re-encoding
            the whole file). Original: {sizeMb} MB · max {maxClipSec}s per post.
          </Text>

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
                Clip: {formatVideoTime(trimStart)} – {formatVideoTime(trimEnd)} ({formatVideoTime(clipLen)})
              </Text>
              <WebRange
                label="Start"
                min={0}
                max={Math.max(0, trimEnd - 0.5)}
                step={0.1}
                value={trimStart}
                disabled={preparing}
                onChange={(v) => setTrimStart(Math.min(v, trimEnd - 0.5))}
              />
              <WebRange
                label="End"
                min={trimStart + 0.5}
                max={Math.min(duration, maxClipSec)}
                step={0.1}
                value={Math.min(trimEnd, duration, maxClipSec)}
                disabled={preparing}
                onChange={(v) => setTrimEnd(Math.max(v, trimStart + 0.5))}
              />
            </>
          ) : null}

          <Text style={styles.label}>Quality</Text>
          <View style={styles.qualityRow}>
            {VIDEO_PREP_QUALITIES.map((q) => (
              <Pressable
                key={q.id}
                style={[styles.qualityBtn, qualityId === q.id && styles.qualityBtnActive]}
                onPress={() => setQualityId(q.id)}
                disabled={preparing}
              >
                <Text style={[styles.qualityText, qualityId === q.id && styles.qualityTextActive]}>
                  {q.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {preparing ? (
            <View style={styles.progressRow}>
              <ActivityIndicator color={C.accent} />
              <Text style={styles.progressText}>Preparing… {Math.round(progress * 100)}%</Text>
            </View>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.primaryBtn, preparing && styles.primaryBtnDisabled]}
            onPress={handlePrepare}
            disabled={preparing || !file}
          >
            <Text style={styles.primaryBtnText}>Prepare & add</Text>
          </Pressable>
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
  hint: { color: C.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 12 },
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
});
