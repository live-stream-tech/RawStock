import type { VideoPrepQualityId } from "@/lib/videoPrepTypes";
import { formatPostVideoMaxDuration } from "@/lib/formatVideoTime";

export type VideoUploadPrepCopy = {
  title: string;
  hint: (sizeMb: string, maxClipSec: number) => string;
  trimNote: string;
  clip: (start: string, end: string, len: string) => string;
  rangeStart: string;
  rangeEnd: string;
  quality: string;
  qualityLabels: Record<VideoPrepQualityId, string>;
  preparing: (percent: number) => string;
  /** Primary action: trim + compress, then attach to post */
  addToPost: string;
  clipTooShort: string;
  clipTooLong: (maxClipSec: number) => string;
  prepareFailed: string;
  prepareTooLarge: (maxMb: number, outMb: string) => string;
  prepareError: string;
  /** Work only: optional full-file upload */
  uploadFullFile?: string;
  uploadFullFileHint?: (maxMb: number) => string;
  uploadingFullFile?: (percent: number) => string;
  fullFileTooLarge?: (maxMb: number) => string;
  /** Work only: reject .mov / QuickTime for untranscoded upload (browser playback). */
  movOriginalBlocked?: string;
  reportTitlePrepareFailed: string;
  reportTitlePrepareError: string;
  reportTitlePrepareTooLarge: string;
};

const WORK_EN: VideoUploadPrepCopy = {
  title: "Add video",
  hint: (sizeMb, maxClipSec) => {
    const dur = formatPostVideoMaxDuration(maxClipSec, false);
    return `Original file: ${sizeMb} MB. Max length per post: ${dur}.`;
  },
  trimNote: "Set the start and end, then add to your post. We compress the selected part for upload.",
  clip: (start, end, len) => `Segment: ${start} – ${end} (${len})`,
  rangeStart: "Start",
  rangeEnd: "End",
  quality: "Quality",
  qualityLabels: {
    hd: "HD (720p)",
    standard: "Standard",
    light: "Light (smaller)",
  },
  preparing: (percent) => `Uploading… ${percent}%`,
  addToPost: "Add to post",
  clipTooShort: "Choose at least half a second.",
  clipTooLong: (maxClipSec) => {
    const dur = formatPostVideoMaxDuration(maxClipSec, false);
    return `Video must be ${dur} or less.`;
  },
  prepareFailed:
    "Could not process this video in the browser. Try a shorter segment or Light quality.",
  prepareTooLarge: (maxMb, outMb) =>
    `After compression the file is ${outMb} MB (limit ${maxMb} MB). Shorten the segment or use Light quality.`,
  prepareError: "Could not add video",
  uploadFullFile: "Upload full file (no compression)",
  uploadFullFileHint: (maxMb) =>
    `Skips re-encoding. Trim sliders above do not apply. File must be ${maxMb} MB or less.`,
  uploadingFullFile: (percent) => `Uploading full file… ${percent}%`,
  fullFileTooLarge: (maxMb) => `Full file must be ${maxMb} MB or less.`,
  movOriginalBlocked:
    "QuickTime (.mov) files often do not play in browsers. Use “Add to post” to compress to MP4, or export as MP4 first.",
  reportTitlePrepareFailed: "Video prepare failed",
  reportTitlePrepareError: "Video prepare error",
  reportTitlePrepareTooLarge: "Video too large after prepare",
};

const WORK_JA: VideoUploadPrepCopy = {
  title: "動画を追加",
  hint: (sizeMb, maxClipSec) => {
    const dur = formatPostVideoMaxDuration(maxClipSec, true);
    return `元ファイル: ${sizeMb} MB。1投稿あたり最長 ${dur}。`;
  },
  trimNote: "開始・終了を選んでから投稿に追加します。選択した部分を圧縮してアップロードします。",
  clip: (start, end, len) => `範囲: ${start} – ${end}（${len}）`,
  rangeStart: "開始",
  rangeEnd: "終了",
  quality: "画質",
  qualityLabels: {
    hd: "HD（720p）",
    standard: "標準",
    light: "軽量（小さい）",
  },
  preparing: (percent) => `アップロード中… ${percent}%`,
  addToPost: "投稿に追加",
  clipTooShort: "0.5秒以上の範囲を選んでください。",
  clipTooLong: (maxClipSec) => {
    const dur = formatPostVideoMaxDuration(maxClipSec, true);
    return `動画は${dur}以内にしてください。`;
  },
  prepareFailed:
    "ブラウザで動画を処理できませんでした。範囲を短くするか「軽量」をお試しください。",
  prepareTooLarge: (maxMb, outMb) =>
    `圧縮後も ${outMb} MB です（上限 ${maxMb} MB）。範囲を短くするか「軽量」を選んでください。`,
  prepareError: "動画を追加できませんでした",
  uploadFullFile: "そのままアップロード（圧縮しない）",
  uploadFullFileHint: (maxMb) =>
    `再エンコードしません。上のトリムは使われません。ファイルは ${maxMb} MB 以下である必要があります。`,
  uploadingFullFile: (percent) => `そのままアップロード中… ${percent}%`,
  fullFileTooLarge: (maxMb) => `そのまま送る場合は ${maxMb} MB 以下にしてください。`,
  movOriginalBlocked:
    "QuickTime（.mov）はブラウザで再生できないことが多いです。「投稿に追加」で MP4 に圧縮するか、先に MP4 で書き出してください。",
  reportTitlePrepareFailed: "動画の処理に失敗",
  reportTitlePrepareError: "動画処理エラー",
  reportTitlePrepareTooLarge: "圧縮後もサイズ超過",
};

const DAILY_EN: VideoUploadPrepCopy = {
  title: "Add video clip",
  hint: (_sizeMb, maxClipSec) => {
    const dur = formatPostVideoMaxDuration(maxClipSec, false);
    return `Short clip for a daily post (max ${dur}). We compress it automatically.`;
  },
  trimNote: "Pick the best moment, then add it to your post.",
  clip: WORK_EN.clip,
  rangeStart: WORK_EN.rangeStart,
  rangeEnd: WORK_EN.rangeEnd,
  quality: WORK_EN.quality,
  qualityLabels: WORK_EN.qualityLabels,
  preparing: WORK_EN.preparing,
  addToPost: "Add to post",
  clipTooShort: WORK_EN.clipTooShort,
  clipTooLong: WORK_EN.clipTooLong,
  prepareFailed: "Could not process this clip. Try a shorter segment.",
  prepareTooLarge: WORK_EN.prepareTooLarge,
  prepareError: WORK_EN.prepareError,
  reportTitlePrepareFailed: WORK_EN.reportTitlePrepareFailed,
  reportTitlePrepareError: WORK_EN.reportTitlePrepareError,
  reportTitlePrepareTooLarge: WORK_EN.reportTitlePrepareTooLarge,
};

const DAILY_JA: VideoUploadPrepCopy = {
  title: "動画クリップを追加",
  hint: (_sizeMb, maxClipSec) => {
    const dur = formatPostVideoMaxDuration(maxClipSec, true);
    return `日常投稿用の短いクリップ（最大${dur}）。自動で軽くしてアップロードします。`;
  },
  trimNote: "使いたい部分を選んで、投稿に追加してください。",
  clip: WORK_JA.clip,
  rangeStart: WORK_JA.rangeStart,
  rangeEnd: WORK_JA.rangeEnd,
  quality: WORK_JA.quality,
  qualityLabels: WORK_JA.qualityLabels,
  preparing: WORK_JA.preparing,
  addToPost: "投稿に追加",
  clipTooShort: WORK_JA.clipTooShort,
  clipTooLong: WORK_JA.clipTooLong,
  prepareFailed: "クリップを処理できませんでした。もう少し短くしてお試しください。",
  prepareTooLarge: WORK_JA.prepareTooLarge,
  prepareError: WORK_JA.prepareError,
  reportTitlePrepareFailed: WORK_JA.reportTitlePrepareFailed,
  reportTitlePrepareError: WORK_JA.reportTitlePrepareError,
  reportTitlePrepareTooLarge: WORK_JA.reportTitlePrepareTooLarge,
};

export function getVideoUploadPrepCopy(isJaUi: boolean, flow: "daily" | "work"): VideoUploadPrepCopy {
  if (flow === "daily") return isJaUi ? DAILY_JA : DAILY_EN;
  return isJaUi ? WORK_JA : WORK_EN;
}
