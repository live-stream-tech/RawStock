import type { VideoPrepQualityId } from "@/lib/videoPrepTypes";

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
  reportTitlePrepareFailed: string;
  reportTitlePrepareError: string;
  reportTitlePrepareTooLarge: string;
};

const EN: VideoUploadPrepCopy = {
  title: "Prepare video",
  hint: (sizeMb, maxClipSec) =>
    `Trim and compress before upload. Only the selected segment is processed (faster than re-encoding the whole file). Original: ${sizeMb} MB · max ${maxClipSec}s per post.`,
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
  clipTooLong: (maxClipSec) => `Clip must be ${maxClipSec} seconds or less.`,
  prepareFailed:
    "Could not prepare this video in the browser. Try a shorter clip or choose Light quality.",
  prepareTooLarge: (maxMb, outMb) =>
    `Prepared file is ${outMb} MB (limit ${maxMb} MB for web upload). Use a shorter clip or Light quality.`,
  prepareError: "Prepare failed",
  uploadMaxNote: (maxMb) => `Web uploads must be under ${maxMb} MB after compression.`,
  reportTitlePrepareFailed: "Video prepare failed",
  reportTitlePrepareError: "Video prepare error",
  reportTitlePrepareTooLarge: "Video too large after prepare",
};

const JA: VideoUploadPrepCopy = {
  title: "動画を準備",
  hint: (sizeMb, maxClipSec) =>
    `アップロード前にトリミングと圧縮を行います。選択した部分だけを処理するため、ファイル全体より速く終わることがあります。元のサイズ: ${sizeMb} MB · 1投稿あたり最大 ${maxClipSec} 秒。`,
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
  clipTooLong: (maxClipSec) => `クリップは${maxClipSec}秒以内にしてください。`,
  prepareFailed:
    "ブラウザで動画を準備できませんでした。クリップを短くするか、「軽量」を選んでお試しください。",
  prepareTooLarge: (maxMb, outMb) =>
    `圧縮後も ${outMb} MB です（Webアップロード上限 ${maxMb} MB）。クリップを短くするか「軽量」を選んでください。`,
  prepareError: "準備に失敗しました",
  uploadMaxNote: (maxMb) => `圧縮後は ${maxMb} MB 未満である必要があります。`,
  reportTitlePrepareFailed: "動画の準備に失敗",
  reportTitlePrepareError: "動画準備エラー",
  reportTitlePrepareTooLarge: "圧縮後もサイズ超過",
};

export function getVideoUploadPrepCopy(isJaUi: boolean): VideoUploadPrepCopy {
  return isJaUi ? JA : EN;
}
