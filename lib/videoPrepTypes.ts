/** Web video prep before upload (trim + re-encode). */

export type VideoPrepQualityId = "hd" | "standard" | "light";

export type VideoPrepQuality = {
  id: VideoPrepQualityId;
  label: string;
  maxWidth: number;
  videoBitsPerSecond: number;
};

export const VIDEO_PREP_QUALITIES: VideoPrepQuality[] = [
  { id: "hd", label: "HD (720p)", maxWidth: 1280, videoBitsPerSecond: 2_500_000 },
  { id: "standard", label: "Standard", maxWidth: 720, videoBitsPerSecond: 1_400_000 },
  { id: "light", label: "Light (smaller)", maxWidth: 480, videoBitsPerSecond: 750_000 },
];

export type VideoPrepOptions = {
  trimStartSec: number;
  trimEndSec: number;
  quality: VideoPrepQuality;
  targetMaxBytes: number;
  /** Max clip length (seconds) for trim + transcode validation. */
  maxClipSec?: number;
  onProgress?: (ratio: number) => void;
};

export type VideoPrepResult = {
  blob: Blob;
  mimeType: string;
  ext: "mp4" | "webm";
  durationSec: number;
};
