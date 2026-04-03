/**
 * AI Edit オーダーフォーム入力 → {@link RawStockVideoSpec}（UI はそのまま、裏で DSL 化）。
 */
import {
  rawStockClipEnergy,
  sortRawStockClipsByStart,
  type RawStockClip,
  type RawStockClipType,
  type RawStockStyle,
  type RawStockVideoFormat,
  type RawStockVideoSpec,
  type RawStockLogoPosition,
} from "../../shared/rawstock-video-spec";

export type OrderVideoFileMeta = {
  durationSec: number;
};

const DEFAULT_LOGO_POSITION: RawStockLogoPosition = "bottom-right";

/** トーン（既存チップ）→ cut_speed / caption_density / color_grade */
export function styleFromTone(tone: string): RawStockStyle {
  let cut_speed: RawStockStyle["cut_speed"] = "medium";
  if (tone === "Energetic" || tone === "Casual") cut_speed = "fast";
  if (tone === "Cinematic" || tone === "Emotional") cut_speed = "slow";

  let color_grade: RawStockStyle["color_grade"] = "natural";
  if (tone === "Energetic") color_grade = "high_contrast";
  if (tone === "Cool & Stylish") color_grade = "gritty";

  let caption_density: RawStockStyle["caption_density"] = "medium";
  if (tone === "Professional") caption_density = "low";
  if (tone === "Energetic") caption_density = "high";

  return { cut_speed, caption_density, color_grade };
}

/** トーン → 出力アスペクト（ライブ横長寄せ、勢い系は縦も許容） */
export function formatFromTone(tone: string): RawStockVideoFormat {
  if (tone === "Energetic" || tone === "Casual") return "vertical_9_16";
  if (tone === "Cinematic" || tone === "Professional") return "horizontal_16_9";
  return "horizontal_16_9";
}

function clipTypeForIndex(i: number, total: number): RawStockClipType {
  if (total <= 1) return "hook";
  if (i === 0) return "hook";
  if (i === total - 1) return "crowd";
  if (i === 1) return "drop";
  return "chorus";
}

/**
 * 複数ファイルを **1 本の仮想タイムライン** に直列化（start 昇順・区間連続）。
 * 編集指示は先頭クリップの `intent` に載せる。
 */
export function buildOrderVideoSpec(params: {
  videos: OrderVideoFileMeta[];
  hasLogo: boolean;
  tone: string;
  editingInstructions: string;
}): RawStockVideoSpec {
  const { videos, hasLogo, tone, editingInstructions } = params;
  if (videos.length === 0) {
    throw new Error("buildOrderVideoSpec: videos must be non-empty");
  }

  let timeline = 0;
  const clips: RawStockClip[] = videos.map((v, i) => {
    const dur = Math.max(0, v.durationSec);
    const start = timeline;
    const end = timeline + dur;
    timeline = end;
    const intentTrim = editingInstructions.trim();
    return {
      start,
      end,
      type: clipTypeForIndex(i, videos.length),
      energy: rawStockClipEnergy(0.5),
      intent: i === 0 && intentTrim ? intentTrim : undefined,
    };
  });

  return {
    clips: sortRawStockClipsByStart(clips),
    style: styleFromTone(tone),
    format: formatFromTone(tone),
    overlays: {
      logo: hasLogo,
      position: hasLogo ? DEFAULT_LOGO_POSITION : undefined,
    },
    duration: timeline > 0 ? timeline : undefined,
  };
}
