/**
 * クライアント送信の RawStockVideoSpec JSON を正規化して保存用文字列にする。
 */
import {
  rawStockClipEnergy,
  sortRawStockClipsByStart,
  type RawStockClip,
  type RawStockClipType,
  type RawStockOverlays,
  type RawStockStyle,
  type RawStockVideoFormat,
  type RawStockVideoSpec,
} from "../../shared/rawstock-video-spec";

const CLIP_TYPES: ReadonlySet<string> = new Set(["hook", "drop", "chorus", "crowd"]);
const CUT_SPEEDS: ReadonlySet<string> = new Set(["slow", "medium", "fast"]);
const CAPTION_DENSITIES: ReadonlySet<string> = new Set(["low", "medium", "high"]);
const COLOR_GRADES: ReadonlySet<string> = new Set(["natural", "high_contrast", "gritty"]);
const FORMATS: ReadonlySet<string> = new Set(["vertical_9_16", "square_1_1", "horizontal_16_9"]);
const LOGO_POSITIONS: ReadonlySet<string> = new Set([
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "center",
]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseClip(raw: unknown): RawStockClip | null {
  if (!isPlainObject(raw)) return null;
  const start = raw.start;
  const end = raw.end;
  const type = raw.type;
  const energy = raw.energy;
  if (typeof start !== "number" || typeof end !== "number" || !Number.isFinite(start) || !Number.isFinite(end)) {
    return null;
  }
  if (start > end) return null;
  if (typeof type !== "string" || !CLIP_TYPES.has(type)) return null;
  if (typeof energy !== "number" || !Number.isFinite(energy)) return null;
  try {
    const e = rawStockClipEnergy(energy);
    const intent = raw.intent;
    const out: RawStockClip = {
      start,
      end,
      type: type as RawStockClipType,
      energy: e,
    };
    if (typeof intent === "string" && intent.trim()) {
      out.intent = intent.trim();
    }
    return out;
  } catch {
    return null;
  }
}

function parseStyle(raw: unknown): RawStockStyle | null {
  if (!isPlainObject(raw)) return null;
  const { cut_speed, caption_density, color_grade } = raw;
  if (typeof cut_speed !== "string" || !CUT_SPEEDS.has(cut_speed)) return null;
  if (typeof caption_density !== "string" || !CAPTION_DENSITIES.has(caption_density)) return null;
  if (typeof color_grade !== "string" || !COLOR_GRADES.has(color_grade)) return null;
  return {
    cut_speed: cut_speed as RawStockStyle["cut_speed"],
    caption_density: caption_density as RawStockStyle["caption_density"],
    color_grade: color_grade as RawStockStyle["color_grade"],
  };
}

function parseOverlays(raw: unknown): RawStockOverlays | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isPlainObject(raw)) return undefined;
  if (typeof raw.logo !== "boolean") return undefined;
  const out: RawStockOverlays = { logo: raw.logo };
  const pos = raw.position;
  if (pos !== undefined) {
    if (typeof pos !== "string" || !LOGO_POSITIONS.has(pos)) return undefined;
    out.position = pos as RawStockOverlays["position"];
  }
  return out;
}

/**
 * @returns 正規化済み JSON 文字列、または不正時は null
 */
export function normalizeVideoSpecPayload(raw: unknown): string | null {
  if (!isPlainObject(raw)) return null;
  const clipsRaw = raw.clips;
  if (!Array.isArray(clipsRaw) || clipsRaw.length === 0) return null;
  const clips: RawStockClip[] = [];
  for (const c of clipsRaw) {
    const p = parseClip(c);
    if (!p) return null;
    clips.push(p);
  }
  const style = parseStyle(raw.style);
  if (!style) return null;
  const format = raw.format;
  if (typeof format !== "string" || !FORMATS.has(format)) return null;

  const spec: RawStockVideoSpec = {
    clips: sortRawStockClipsByStart(clips),
    style,
    format: format as RawStockVideoFormat,
    overlays: parseOverlays(raw.overlays),
  };
  const duration = raw.duration;
  if (typeof duration === "number" && Number.isFinite(duration) && duration >= 0) {
    spec.duration = duration;
  }
  return JSON.stringify(spec);
}

export function parseStoredVideoSpec(json: string | null): RawStockVideoSpec | null {
  if (!json?.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(json);
    const normalized = normalizeVideoSpecPayload(parsed);
    if (!normalized) return null;
    return JSON.parse(normalized) as RawStockVideoSpec;
  } catch {
    return null;
  }
}
