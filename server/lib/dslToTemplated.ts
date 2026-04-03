/**
 * RawStock DSL → Templated.io 向け {@link TemplatedRenderRequest} 変換。
 * テンプレ ID は Templated ダッシュボード側の命名と揃える（未作成なら同じ文字列でテンプレを用意する）。
 */

import type {
  RawStockClip,
  RawStockClipType,
  RawStockStyle,
  RawStockVideoFormat,
  RawStockVideoSpec,
} from "../types/rawstock";
import type {
  TemplatedFormat,
  TemplatedModification,
  TemplatedRenderRequest,
  TemplatedTextStyle,
} from "../types/templated";

/** ソース URL 未確定時のプレースホルダ（パイプラインで差し替え） */
export const DSL_TO_TEMPLATED_INPUT_VIDEO_PLACEHOLDER = "INPUT_VIDEO_URL";

/** ロゴ URL 未指定時のプレースホルダ */
export const DSL_TO_TEMPLATED_LOGO_PLACEHOLDER = "INPUT_LOGO_URL";

export interface DslToTemplatedOptions {
  /** 各 clip の trim が参照する単一ソース動画の URL */
  inputVideoUrl: string;
  /** Templated 非同期完了通知先（任意） */
  webhookUrl?: string;
  /** `overlays.logo === true` のとき推奨。省略時は {@link DSL_TO_TEMPLATED_LOGO_PLACEHOLDER} */
  logoUrl?: string;
  /** デフォルト `true` */
  async?: boolean;
  /** 出力コンテナ。既定は mp4 */
  outputFormat?: TemplatedFormat;
}

const TEMPLATE_BY_CUT_SPEED = {
  fast: "rawstock-fast-cut",
  medium: "rawstock-standard",
  slow: "rawstock-cinematic",
} as const;

/** format をテンプレ ID に反映（vertical を最優先でサフィックス化） */
const FORMAT_TEMPLATE_SUFFIX: Record<RawStockVideoFormat, string> = {
  vertical_9_16: "vertical",
  square_1_1: "square",
  horizontal_16_9: "horizontal",
};

function resolveTemplateId(spec: RawStockVideoSpec): string {
  const base = TEMPLATE_BY_CUT_SPEED[spec.style.cut_speed];
  const suffix = FORMAT_TEMPLATE_SUFFIX[spec.format];
  return `${base}-${suffix}`;
}

function clipTypeToCaptionFallback(type: RawStockClipType): string {
  switch (type) {
    case "hook":
      return "HOOK";
    case "drop":
      return "DROP";
    case "chorus":
      return "CHORUS";
    case "crowd":
      return "CROWD";
  }
}

function captionValueForClip(clip: RawStockClip): string {
  const intent = clip.intent?.trim();
  if (intent) return intent;
  return clipTypeToCaptionFallback(clip.type);
}

/**
 * caption_density で「出す量」を変え、color_grade でテロップの見た目を寄せる。
 */
function mapCaptionTextStyle(style: RawStockStyle): TemplatedTextStyle {
  if (style.caption_density === "high") return "kinetic";
  if (style.caption_density === "low") return "minimal";
  if (style.color_grade === "gritty") return "bold";
  return "subtitle";
}

function shouldEmitCaptionForClip(clip: RawStockClip, style: RawStockStyle): boolean {
  switch (style.caption_density) {
    case "low":
      return Boolean(clip.intent?.trim());
    case "medium":
    case "high":
      return true;
  }
}

/**
 * `spec.clips` を Templated の video1.. / caption1.. に変換する。
 */
export function dslToTemplated(
  spec: RawStockVideoSpec,
  options: DslToTemplatedOptions,
): TemplatedRenderRequest {
  if (spec.clips.length === 0) {
    throw new Error("dslToTemplated: spec.clips must be non-empty");
  }

  const src = options.inputVideoUrl.trim() || DSL_TO_TEMPLATED_INPUT_VIDEO_PLACEHOLDER;
  const modifications: Record<string, TemplatedModification> = {};

  spec.clips.forEach((clip, i) => {
    const n = i + 1;
    const videoKey = `video${n}`;
    modifications[videoKey] = {
      video: {
        src,
        trim: [clip.start, clip.end] as const,
      },
    };

    if (shouldEmitCaptionForClip(clip, spec.style)) {
      const captionKey = `caption${n}`;
      modifications[captionKey] = {
        text: {
          value: captionValueForClip(clip),
          style: mapCaptionTextStyle(spec.style),
        },
      };
    }
  });

  if (spec.overlays?.logo === true) {
    const logoSrc =
      options.logoUrl?.trim() && options.logoUrl.trim().length > 0
        ? options.logoUrl.trim()
        : DSL_TO_TEMPLATED_LOGO_PLACEHOLDER;
    modifications.logo1 = {
      logo: {
        src: logoSrc,
        position: spec.overlays.position,
      },
    };
  }

  return {
    template: resolveTemplateId(spec),
    modifications,
    format: options.outputFormat ?? "mp4",
    webhook_url: options.webhookUrl,
    async: options.async !== false,
  };
}
