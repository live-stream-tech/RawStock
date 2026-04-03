/**
 * RawStock 編集パイプラインの中間層（RawStock DSL → Templated.io API 変換の入力型）。
 * - レイヤー名（例: video1, caption1, logo1）をキーに、差し替え内容を束ねる。
 * - video.trim は秒単位 [start, end] を必須とし、ffmpeg の -ss / -to（または同等）と揃えて解釈する。
 * - 非同期レンダリングでは webhook_url を付与し、Templated から完了通知を受ける想定。
 */

/** 元動画タイムライン上の秒区間 [start, end]（ffmpeg 連携時の in/out と対応） */
export type TemplatedVideoTrimSeconds = readonly [startSec: number, endSec: number];

export type TemplatedFormat = "mp4" | "gif" | "png" | "webp";

export type TemplatedRenderStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed";

/** RawStock DSL とのマッピングでブレを防ぐため限定 */
export type TemplatedTextStyle = "minimal" | "bold" | "kinetic" | "subtitle";

/** テンプレート内テキスト／テロップ差し替え */
export interface TemplatedTextModification {
  value: string;
  style?: TemplatedTextStyle;
}

/** RawStock DSL とのマッピングでブレを防ぐため限定 */
export type TemplatedLogoPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center";

/** ロゴ画像差し替え */
export interface TemplatedLogoModification {
  src: string;
  position?: TemplatedLogoPosition;
}

/** 動画ソース差し替え（trim 必須でパイプラインと ffmpeg を一貫させる） */
export interface TemplatedVideoModification {
  src: string;
  trim: TemplatedVideoTrimSeconds;
}

/**
 * 1 レイヤー分の変更。同一キーに video / text / logo を組み合わせ可能（テンプレに依存）。
 * video を含める場合は必ず trim を渡す。
 */
export interface TemplatedModification {
  video?: TemplatedVideoModification;
  text?: TemplatedTextModification;
  logo?: TemplatedLogoModification;
}

/**
 * Templated.io Create Render に近いペイロード。
 * async + webhook 前提運用のため webhook_url / async をオプションで保持（未設定時は呼び出し側でデフォルト注入可）。
 */
export interface TemplatedRenderRequest {
  template: string;
  modifications: Record<string, TemplatedModification>;
  format: TemplatedFormat;
  webhook_url?: string;
  async?: boolean;
}

/** Templated レンダジョブの応答（ポーリング or webhook 後のメタと同等の形を想定） */
export interface TemplatedRenderResponse {
  id: string;
  status: TemplatedRenderStatus;
  url?: string;
  error?: string;
  webhook_url?: string;
}
