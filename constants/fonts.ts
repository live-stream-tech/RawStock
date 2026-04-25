import { Platform } from "react-native";

/**
 * RawStock font stack — aligned with the marketing LP (`public/lp-standalone.html`).
 *
 * - Display / Heading: Barlow Condensed (condensed sans-serif)
 * - Body / UI:         Courier Prime (monospace)
 */

export const F = {
  /** Headings, labels, badges: Barlow Condensed */
  display: Platform.select({
    ios: "Barlow Condensed",
    android: "Barlow Condensed",
    web: "'Barlow Condensed', sans-serif",
  }) as string,

  /** Body and UI copy: Courier Prime */
  mono: Platform.select({
    ios: "Courier Prime",
    android: "Courier Prime",
    web: "'Courier Prime', 'Courier New', monospace",
  }) as string,
} as const;
