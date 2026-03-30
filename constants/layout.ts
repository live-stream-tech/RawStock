import { Platform } from "react-native";

/** タブ画面共通: ヘッダー上部余白（マイページに合わせる） */
export function getTabTopInset(insets: { top: number }): number {
  return Platform.OS === "web" ? 12 : insets.top;
}

/** タブ画面共通: フッター（タブバー）分の下部余白（低めに調整） */
export function getTabBottomInset(insets?: { bottom?: number }): number {
  return Platform.OS === "web" ? 20 : (insets?.bottom ?? 0);
}
