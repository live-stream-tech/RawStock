/**
 * Browser-side video trim + re-encode for same-origin POST (~4MB cap).
 * Trims only the selected range (does not play the whole file when clipping).
 */

import type { VideoPrepOptions, VideoPrepResult } from "./videoPrepTypes";
import { VIDEO_PREP_QUALITIES } from "./videoPrepTypes";
import { WEB_VIDEO_PREP_MAX_OUTPUT_BYTES } from "./media-upload-constants";

export { VIDEO_PREP_QUALITIES } from "./videoPrepTypes";
export type { VideoPrepOptions, VideoPrepQuality, VideoPrepQualityId, VideoPrepResult } from "./videoPrepTypes";

type Attempt = { maxWidth: number; videoBitsPerSecond: number };

/** Progressive re-encode ladder until output fits the same-origin upload cap. */
const SIZE_FALLBACK_ATTEMPTS: Attempt[] = [
  { maxWidth: 640, videoBitsPerSecond: 900_000 },
  { maxWidth: 480, videoBitsPerSecond: 600_000 },
  { maxWidth: 480, videoBitsPerSecond: 400_000 },
  { maxWidth: 360, videoBitsPerSecond: 280_000 },
  { maxWidth: 320, videoBitsPerSecond: 180_000 },
];

function pickRecorderMime(): { mime: string; ext: "webm" | "mp4" } {
  if (typeof MediaRecorder === "undefined") {
    return { mime: "video/webm", ext: "webm" };
  }
  const candidates: { mime: string; ext: "webm" | "mp4" }[] = [
    { mime: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", ext: "mp4" },
    { mime: "video/mp4;codecs=avc1.42E01E", ext: "mp4" },
    { mime: "video/mp4", ext: "mp4" },
    { mime: "video/webm;codecs=vp9,opus", ext: "webm" },
    { mime: "video/webm;codecs=vp8,opus", ext: "webm" },
    { mime: "video/webm;codecs=vp8", ext: "webm" },
    { mime: "video/webm", ext: "webm" },
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mime)) return c;
  }
  return { mime: "video/webm", ext: "webm" };
}

function eventOnce(el: HTMLVideoElement, name: keyof HTMLMediaElementEventMap): Promise<void> {
  return new Promise((resolve, reject) => {
    const ok = () => {
      cleanup();
      resolve();
    };
    const err = () => {
      cleanup();
      reject(new Error(`Video ${String(name)} failed`));
    };
    const cleanup = () => {
      el.removeEventListener(name, ok);
      el.removeEventListener("error", err);
    };
    el.addEventListener(name, ok, { once: true });
    el.addEventListener("error", err, { once: true });
  });
}

function seekTo(video: HTMLVideoElement, sec: number): Promise<void> {
  if (Math.abs(video.currentTime - sec) < 0.04) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(new Error("Seek failed"));
    };
    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onErr);
    };
    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onErr, { once: true });
    video.currentTime = Math.max(0, sec);
  });
}

async function transcodeClip(
  blob: Blob,
  attempt: Attempt,
  mimeHint: string,
  trimStartSec: number,
  trimEndSec: number,
  maxClipSec: number,
  onProgress?: (ratio: number) => void,
): Promise<Blob | null> {
  if (typeof document === "undefined" || typeof MediaRecorder === "undefined") return null;

  const url = URL.createObjectURL(blob);
  const video = document.createElement("video");
  video.playsInline = true;
  video.setAttribute("playsinline", "true");
  video.muted = true;  // required for autoplay after async ops (Safari policy)
  video.volume = 0;
  video.preload = "auto";
  video.src = url;

  try {
    await eventOnce(video, "loadedmetadata");
    try {
      await eventOnce(video, "canplay");
    } catch {
      await eventOnce(video, "loadeddata");
    }
    const dur = Number.isFinite(video.duration) ? video.duration : 0;
    if (dur <= 0) return null;

    const start = Math.max(0, Math.min(trimStartSec, dur - 0.1));
    const end = Math.max(start + 0.1, Math.min(trimEndSec, dur));
    const clipDuration = end - start;
    if (clipDuration > maxClipSec) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (vw < 2 || vh < 2) return null;

    const scale = Math.min(1, attempt.maxWidth / vw);
    const outW = Math.max(2, Math.round((vw * scale) / 2) * 2);
    const outH = Math.max(2, Math.round((vh * scale) / 2) * 2);

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const fps = 24;
    const canvasStream =
      typeof canvas.captureStream === "function" ? canvas.captureStream(fps) : null;
    if (!canvasStream || canvasStream.getVideoTracks().length === 0) return null;

    const cap = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.();
    const audioTracks = cap?.getAudioTracks?.() ?? [];
    const combined =
      audioTracks.length > 0
        ? new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks])
        : canvasStream;

    const mime = MediaRecorder.isTypeSupported(mimeHint) ? mimeHint : pickRecorderMime().mime;
    const recOpts: MediaRecorderOptions = { mimeType: mime, videoBitsPerSecond: attempt.videoBitsPerSecond };
    if (!MediaRecorder.isTypeSupported(recOpts.mimeType ?? "")) {
      delete recOpts.mimeType;
    }

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(combined, recOpts);
    } catch {
      try {
        recorder = new MediaRecorder(combined);
      } catch {
        return null;
      }
    }

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const stopped = new Promise<Blob>((resolve, reject) => {
      recorder.onerror = () => reject(new Error("MediaRecorder error"));
      recorder.onstop = () => {
        const outType = (recorder.mimeType || mime).split(";")[0].trim() || "video/webm";
        resolve(new Blob(chunks, { type: outType }));
      };
    });

    let stoppedEarly = false;
    const stopClip = () => {
      if (stoppedEarly) return;
      stoppedEarly = true;
      try {
        video.pause();
      } catch {
        /* ignore */
      }
      if (recorder.state !== "inactive") recorder.stop();
    };

    recorder.start(200);
    await seekTo(video, start);
    onProgress?.(0);

    try {
      await video.play();
    } catch {
      stopClip();
      await stopped.catch(() => new Blob());
      return null;
    }

    const paint = () => {
      if (stoppedEarly) return;
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        ctx.drawImage(video, 0, 0, outW, outH);
      }
      const t = video.currentTime;
      onProgress?.(Math.min(1, Math.max(0, (t - start) / clipDuration)));
      if (t >= end - 0.08 || video.ended) {
        stopClip();
        return;
      }
      if (!video.paused) requestAnimationFrame(paint);
    };
    requestAnimationFrame(paint);

    const timeoutMs = Math.min(maxClipSec * 1000, Math.ceil(clipDuration * 1000) + 45_000);
    try {
      await Promise.race([
        stopped,
        new Promise<void>((_, rej) => setTimeout(() => rej(new Error("transcode_timeout")), timeoutMs)),
      ]);
    } catch {
      stopClip();
      await stopped.catch(() => new Blob());
      return null;
    }

    onProgress?.(1);
    return await stopped;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
    video.removeAttribute("src");
    video.load();
  }
}

/**
 * Trim + compress for web upload. Returns best effort blob (may still exceed target if re-encode fails).
 */
export async function prepareVideoBlobForWebUpload(
  blob: Blob,
  options: VideoPrepOptions,
): Promise<VideoPrepResult | null> {
  if (typeof document === "undefined") return null;

  const { mime, ext } = pickRecorderMime();
  const clipLen = Math.max(0.1, options.trimEndSec - options.trimStartSec);
  const maxClipSec = options.maxClipSec ?? Math.max(clipLen, 300);
  if (clipLen > maxClipSec) return null;
  const primaryAttempt: Attempt = {
    maxWidth: options.quality.maxWidth,
    videoBitsPerSecond: options.quality.videoBitsPerSecond,
  };

  const attempts: Attempt[] = [
    primaryAttempt,
    ...SIZE_FALLBACK_ATTEMPTS.map((a) => ({
      maxWidth: Math.min(a.maxWidth, primaryAttempt.maxWidth),
      videoBitsPerSecond: Math.min(a.videoBitsPerSecond, primaryAttempt.videoBitsPerSecond),
    })),
  ];

  let best: Blob | null = null;

  for (const attempt of attempts) {
    const out = await transcodeClip(
      blob,
      attempt,
      mime,
      options.trimStartSec,
      options.trimEndSec,
      maxClipSec,
      options.onProgress,
    );
    if (!out || out.size === 0) continue;
    if (!best || out.size < best.size) best = out;
    if (best.size <= options.targetMaxBytes) break;
  }

  // Re-encode unavailable (common with some HEVC sources) — allow small originals through.
  if (!best && blob.size > 0 && blob.size <= WEB_VIDEO_PREP_MAX_OUTPUT_BYTES) {
    const mimeType = blob.type.split(";")[0].trim() || mime.split(";")[0];
    const outExt = mimeType.includes("webm") ? "webm" : mimeType.includes("mp4") ? "mp4" : ext;
    return { blob, mimeType, ext: outExt, durationSec: clipLen };
  }

  if (!best) return null;

  if (best.size > WEB_VIDEO_PREP_MAX_OUTPUT_BYTES) return null;

  const mimeType = best.type.split(";")[0].trim() || mime.split(";")[0];
  const outExt = mimeType.includes("mp4") ? "mp4" : ext;

  return {
    blob: best,
    mimeType,
    ext: outExt,
    durationSec: clipLen,
  };
}

/** @deprecated Use prepareVideoBlobForWebUpload for trim + quality. */
export async function compressVideoBlobForWebSameOrigin(
  blob: Blob,
  _contentType: string,
  targetMaxBytes: number,
): Promise<Blob> {
  if (typeof document === "undefined") return blob;
  if (blob.size <= targetMaxBytes) return blob;

  const url = URL.createObjectURL(blob);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.src = url;
  let duration = 60;
  try {
    await eventOnce(video, "loadedmetadata");
    if (Number.isFinite(video.duration) && video.duration > 0) {
      duration = video.duration;
    }
  } catch {
    URL.revokeObjectURL(url);
    return blob;
  }
  URL.revokeObjectURL(url);

  const end = Math.min(duration, 300);
  const prepared = await prepareVideoBlobForWebUpload(blob, {
    trimStartSec: 0,
    trimEndSec: end,
    quality: VIDEO_PREP_QUALITIES[1],
    targetMaxBytes,
    maxClipSec: 300,
  });
  return prepared?.blob ?? blob;
}
