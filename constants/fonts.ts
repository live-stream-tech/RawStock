import { Platform } from "react-native";

/**
 * RawStock font stack — aligned with the marketing LP (`public/lp-standalone.html`).
 *
 * - Display / Heading: Barlow Condensed (condensed sans-serif)
 * - Body / UI:         Courier Prime (monospace)
 */

const WEB_JA_SANS =
  "'Noto Sans JP', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic UI', 'Yu Gothic', sans-serif";
const NATIVE_JA_SANS = Platform.select({
  ios: "Hiragino Sans",
  android: "sans-serif",
  web: WEB_JA_SANS,
}) as string;

export const F = {
  /** Headings, labels, badges: Barlow Condensed */
  display: Platform.select({
    ios: "Barlow Condensed",
    android: "Barlow Condensed",
    web: "var(--rs-font-display, 'Barlow Condensed', sans-serif)",
  }) as string,

  /** Body and UI copy: Courier Prime */
  mono: Platform.select({
    ios: "Courier Prime",
    android: "Courier Prime",
    web: "var(--rs-font-body, 'Courier Prime', 'Courier New', monospace)",
  }) as string,

  /** Japanese-safe UI sans font */
  jp: NATIVE_JA_SANS,
} as const;

export function fontDisplayForUi(isJaUi: boolean): string {
  return isJaUi ? F.jp : F.display;
}

export function fontBodyForUi(isJaUi: boolean): string {
  return isJaUi ? F.jp : F.mono;
}
