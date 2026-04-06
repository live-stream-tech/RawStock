import { Platform } from "react-native";

/** 配信画面の UI 言語。ブラウザが日本語優先のときだけ日本語。 */
export function isBroadcastJapaneseUi(): boolean {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return true;
  const primary = (navigator.languages?.[0] ?? navigator.language ?? "").toLowerCase();
  return primary.startsWith("ja");
}
