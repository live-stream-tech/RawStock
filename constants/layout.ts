import { Platform, type StyleProp, type ViewStyle } from "react-native";

/** タブ画面共通: ヘッダー上部余白（マイページに合わせる） */
export function getTabTopInset(insets: { top: number }): number {
  return Platform.OS === "web" ? 12 : insets.top;
}

/** Web: タブバー実高さ（app/(tabs)/_layout の tabBarStyle.height と揃える） */
export const WEB_TAB_BAR_HEIGHT = 60;

/**
 * タブ画面共通: フッター（タブバー）分の下部余白。
 * Web は position:absolute のタブと重ならないようバー高さ＋余白を確保する。
 */
export function getTabBottomInset(insets?: { bottom?: number }): number {
  if (Platform.OS === "web") {
    return WEB_TAB_BAR_HEIGHT + 12;
  }
  return insets?.bottom ?? 0;
}

/**
 * Web の flex カラム内 ScrollView 用。min-height:auto だと子が中身の高さまで伸びてスクロール不能になる。
 */
export const webFlexScrollStyle: ViewStyle | undefined =
  Platform.OS === "web" ? { minHeight: 0 } : undefined;

/** 縦 ScrollView の style に Web 用 minHeight:0 を付与（`horizontal` の ScrollView では使わない） */
export function webScrollStyle(style: StyleProp<ViewStyle>): StyleProp<ViewStyle> {
  return webFlexScrollStyle ? [style, webFlexScrollStyle] : style;
}
