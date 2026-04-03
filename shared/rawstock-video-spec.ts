/**
 * RawStock 編集 DSL（クライアント・サーバー共有）。
 * @see server/types/rawstock.ts から re-export
 */

/** Templated の TemplatedLogoPosition と同一。共有層では名前を分離 */
export type RawStockLogoPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center";

declare const rawStockClipEnergyBrand: unique symbol;

export type RawStockClipEnergy = number & {
  readonly [rawStockClipEnergyBrand]: "RawStockClipEnergy0to1";
};

export function rawStockClipEnergy(value: number): RawStockClipEnergy {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`RawStockClipEnergy must be finite and in [0, 1], got ${String(value)}`);
  }
  return value as RawStockClipEnergy;
}

export type RawStockClipType = "hook" | "drop" | "chorus" | "crowd";

export interface RawStockClip {
  start: number;
  end: number;
  type: RawStockClipType;
  energy: RawStockClipEnergy;
  intent?: string;
}

export type RawStockCutSpeed = "slow" | "medium" | "fast";

export type RawStockCaptionDensity = "low" | "medium" | "high";

export type RawStockColorGrade = "natural" | "high_contrast" | "gritty";

export interface RawStockStyle {
  cut_speed: RawStockCutSpeed;
  caption_density: RawStockCaptionDensity;
  color_grade: RawStockColorGrade;
}

export interface RawStockOverlays {
  logo: boolean;
  position?: RawStockLogoPosition;
}

export type RawStockVideoFormat =
  | "vertical_9_16"
  | "square_1_1"
  | "horizontal_16_9";

export function sortRawStockClipsByStart(clips: readonly RawStockClip[]): RawStockClip[] {
  return [...clips].sort((a, b) => a.start - b.start || a.end - b.end);
}

export interface RawStockVideoSpec {
  clips: RawStockClip[];
  style: RawStockStyle;
  format: RawStockVideoFormat;
  overlays?: RawStockOverlays;
  duration?: number;
}
