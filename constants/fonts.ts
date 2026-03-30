import { Platform } from "react-native";

/**
 * RawStock フォントシステム
 * LP (rawstock-lp.vercel.app) と統一したタイポグラフィ
 *
 * - Display / Heading: Barlow Condensed (condensed sans-serif)
 * - Body / UI:         Courier Prime (monospace)
 */

export const F = {
  /** 見出し・ラベル・バッジ等: Barlow Condensed */
  display: Platform.select({
    ios: "Barlow Condensed",
    android: "Barlow Condensed",
    web: "'Barlow Condensed', sans-serif",
  }) as string,

  /** 本文・UI テキスト: Courier Prime */
  mono: Platform.select({
    ios: "Courier Prime",
    android: "Courier Prime",
    web: "'Courier Prime', 'Courier New', monospace",
  }) as string,
} as const;
