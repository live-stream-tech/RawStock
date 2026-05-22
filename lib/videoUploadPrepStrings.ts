import type { VideoPrepQualityId } from "@/lib/videoPrepTypes";
import { formatPostVideoMaxDuration } from "@/lib/formatVideoTime";

export type VideoUploadPrepCopy = {
  title: string;
  hint: (sizeMb: string, maxClipSec: number) => string;
  clip: (start: string, end: string, len: string) => string;
  rangeStart: string;
  rangeEnd: string;
  quality: string;
  qualityLabels: Record<VideoPrepQualityId, string>;
  preparing: (percent: number) => string;
  prepareAdd: string;
  clipTooShort: string;
  clipTooLong: (maxClipSec: number) => string;
  prepareFailed: string;
  prepareTooLarge: (maxMb: number, outMb: string) => string;
  prepareError: string;
  uploadMaxNote: (maxMb: number) => string;
  uploadOriginal?: string;
  uploadingOriginal?: (percent: number) => string;
  originalTooLarge?: (maxMb: number) => string;
  reportTitlePrepareFailed: string;
  reportTitlePrepareError: string;
  reportTitlePrepareTooLarge: string;
};

const WORK_EN: VideoUploadPrepCopy = {
  title: "Prepare video",
  hint: (sizeMb, maxClipSec) => {
    const dur = formatPostVideoMaxDuration(maxClipSec, false);
    return `Trim and compress before upload. Only the selected segment is processed (faster than re-encoding the whole file). Original: ${sizeMb} MB · max ${dur} per post.`;
  },
  clip: (start, end, len) => `Clip: ${start} – ${end} (${len})`,
  rangeStart: "Start",
  rangeEnd: "End",
  quality: "Quality",
  qualityLabels: {
    hd: "HD (720p)",
    standard: "Standard",
    light: "Light (smaller)",
  },
  preparing: (percent) => `Preparing… ${percent}%`,
  prepareAdd: "Prepare & add",
  clipTooShort: "Clip must be at least half a second.",
  clipTooLong: (maxClipSec) => {
    const dur = formatPostVideoMaxDuration(maxClipSec, false);
    return `Video must be ${dur} or less.`;
  },
  prepareFailed:
    "Could not prepare this video in the browser. Try a shorter clip or choose Light quality.",
  prepareTooLarge: (maxMb, outMb) =>
    `Prepared file is ${outMb} MB (limit ${maxMb} MB for web upload). Use a shorter clip or Light quality.`,
  prepareError: "Prepare failed",
  uploadMaxNote: (maxMb) =>
    `Clips up to ${maxMb} MB upload directly to storage after compression (longer videos are supported).`,
  uploadOriginal: "Upload original",
  uploadingOriginal: (percent) => `Uploading original… ${percent}%`,
  originalTooLarge: (maxMb) => `Original file must be ${maxMb} MB or less for direct upload.`,
  reportTitlePrepareFailed: "Video prepare failed",
  reportTitlePrepareError: "Video prepare error",
  reportTitlePrepareTooLarge: "Video too large after prepare",
};

const WORK_JA: VideoUploadPrepCopy = {
  title: "動画を準備",
  hint: (sizeMb, maxClipSec) => {
    const dur = formatPostVideoMaxDuration(maxClipSec, true);
    return `アップロード前にトリミングと圧縮を行います。選択した部分だけを処理するため、ファイル全体より速く終わることがあります。元のサイズ: ${sizeMb} MB · 1投稿あたり最大 ${dur}。`;
  },
  clip: (start, end, len) => `クリップ: ${start} – ${end}（${len}）`,
  rangeStart: "開始",
  rangeEnd: "終了",
  quality: "画質",
  qualityLabels: {
    hd: "HD（720p）",
    standard: "標準",
    light: "軽量（小さい）",
  },
  preparing: (percent) => `準備中… ${percent}%`,
  prepareAdd: "準備して追加",
  clipTooShort: "クリップは0.5秒以上にしてください。",
  clipTooLong: (maxClipSec) => {
    const dur = formatPostVideoMaxDuration(maxClipSec, true);
    return `動画は${dur}以内にしてください。`;
  },
  prepareFailed:
    "ブラウザで動画を準備できませんでした。クリップを短くするか、「軽量」を選んでお試しください。",
  prepareTooLarge: (maxMb, outMb) =>
    `圧縮後も ${outMb} MB です（Webアップロード上限 ${maxMb} MB）。クリップを短くするか「軽量」を選んでください。`,
  prepareError: "準備に失敗しました",
  uploadMaxNote: (maxMb) =>
    `圧縮後は最大 ${maxMb} MB まで（長めの動画も直接アップロードできます）。`,
  uploadOriginal: "オリジナルをアップロード",
  uploadingOriginal: (percent) => `オリジナルをアップロード中… ${percent}%`,
  originalTooLarge: (maxMb) => `オリジナルは ${maxMb} MB 以下である必要があります。`,
  reportTitlePrepareFailed: "動画の準備に失敗",
  reportTitlePrepareError: "動画準備エラー",
  reportTitlePrepareTooLarge: "圧縮後もサイズ超過",
};

const DAILY_EN: VideoUploadPrepCopy = {
  title: "Add clip",
  hint: (_sizeMb, maxClipSec) => {
    const dur = formatPostVideoMaxDuration(maxClipSec, false);
    return `Trim a short social clip (max ${dur}). We'll compress it to Light quality for upload.`;
  },
  clip: WORK_EN.clip,
  rangeStart: WORK_EN.rangeStart,
  rangeEnd: WORK_EN.rangeEnd,
  quality: WORK_EN.quality,
  qualityLabels: WORK_EN.qualityLabels,
  preparing: WORK_EN.preparing,
  prepareAdd: "Add clip",
  clipTooShort: WORK_EN.clipTooShort,
  clipTooLong: WORK_EN.clipTooLong,
  prepareFailed: "Could not prepare this clip. Try a shorter segment.",
  prepareTooLarge: WORK_EN.prepareTooLarge,
  prepareError: WORK_EN.prepareError,
  uploadMaxNote: WORK_EN.uploadMaxNote,
  reportTitlePrepareFailed: WORK_EN.reportTitlePrepareFailed,
  reportTitlePrepareError: WORK_EN.reportTitlePrepareError,
  reportTitlePrepareTooLarge: WORK_EN.reportTitlePrepareTooLarge,
};

const DAILY_JA: VideoUploadPrepCopy = {
  title: "クリップを追加",
  hint: (_sizeMb, maxClipSec) => {
    const dur = formatPostVideoMaxDuration(maxClipSec, true);
    return `SNS向けの短いクリップ（最大${dur}）をトリミングします。アップロード用に軽量画質で圧縮します。`;
  },
  clip: WORK_JA.clip,
  rangeStart: WORK_JA.rangeStart,
  rangeEnd: WORK_JA.rangeEnd,
  quality: WORK_JA.quality,
  qualityLabels: WORK_JA.qualityLabels,
  preparing: WORK_JA.preparing,
  prepareAdd: "クリップを追加",
  clipTooShort: WORK_JA.clipTooShort,
  clipTooLong: WORK_JA.clipTooLong,
  prepareFailed: "クリップを準備できませんでした。もう少し短くしてお試しください。",
  prepareTooLarge: WORK_JA.prepareTooLarge,
  prepareError: WORK_JA.prepareError,
  uploadMaxNote: WORK_JA.uploadMaxNote,
  reportTitlePrepareFailed: WORK_JA.reportTitlePrepareFailed,
  reportTitlePrepareError: WORK_JA.reportTitlePrepareError,
  reportTitlePrepareTooLarge: WORK_JA.reportTitlePrepareTooLarge,
};

export function getVideoUploadPrepCopy(isJaUi: boolean, flow: "daily" | "work"): VideoUploadPrepCopy {
  if (flow === "daily") return isJaUi ? DAILY_JA : DAILY_EN;
  return isJaUi ? WORK_JA : WORK_EN;
}
