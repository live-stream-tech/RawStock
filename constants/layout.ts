import { Platform, type StyleProp, type ViewStyle } from "react-native";
import { isLikelyIosWeb, isPwaStandalone } from "@/lib/pwa-standalone";

/** Tab screens: top padding above header (aligned with profile). Web/PWA uses notch via insets.top. */
export function getTabTopInset(insets: { top: number }): number {
  if (Platform.OS === "web") {
    return Math.max(12, insets.top);
  }
  return insets.top;
}

/** Web: tab bar icon row height (home indicator handled separately via insets.bottom). */
export const WEB_TAB_BAR_CONTENT_HEIGHT = 60;

/**
 * Bottom padding under tab icons on web (home indicator / gesture bar).
 * iOS Safari in a normal tab often reports `insets.bottom === 0` even with `viewport-fit=cover`;
 * without a minimum, the tab bar ends above the home indicator and shows an empty band.
 */
export function getWebTabBarBottomPad(insetsBottom: number): number {
  if (Platform.OS !== "web") return Math.max(insetsBottom, 0);
  if (typeof window === "undefined") return Math.max(insetsBottom, 8);
  if (isPwaStandalone()) return Math.max(insetsBottom, 0);
  if (isLikelyIosWeb()) return Math.max(insetsBottom, 34);
  return Math.max(insetsBottom, 8);
}

/**
 * Tab screens: bottom inset for the footer tab bar.
 * On Web, absolute-positioned tabs need bar height + safe area + padding so content does not sit underneath.
 */
export function getTabBottomInset(insets?: { bottom?: number }): number {
  const b = Math.max(insets?.bottom ?? 0, 0);
  if (Platform.OS === "web") {
    const pad = getWebTabBarBottomPad(b);
    return WEB_TAB_BAR_CONTENT_HEIGHT + pad;
  }
  return b;
}

/**
 * Web: ScrollView inside a flex column. Without minHeight:0, min-height:auto lets the child grow to content and breaks scrolling.
 */
export const webFlexScrollStyle: ViewStyle | undefined =
  Platform.OS === "web"
    ? ({
        minHeight: 0,
        // Keep vertical scrollbar area stable on desktop web for easier grab/drag UX.
        overflowY: "scroll",
        scrollbarGutter: "stable",
      } as unknown as ViewStyle)
    : undefined;

/** Merge Web minHeight:0 into vertical ScrollView styles (do not use on horizontal ScrollViews). */
export function webScrollStyle(style: StyleProp<ViewStyle>): StyleProp<ViewStyle> {
  return webFlexScrollStyle ? [style, webFlexScrollStyle] : style;
}
