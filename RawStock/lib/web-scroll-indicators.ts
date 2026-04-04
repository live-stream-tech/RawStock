import { Platform } from "react-native";

/**
 * react-native-web の ScrollView は、showsVertical / showsHorizontal のいずれかが false だと
 * scrollbar-width: none を付与する。モバイルでは従来どおり非表示、Web では OS スクロールバーを出す。
 */
export const scrollShowsVertical = Platform.OS === "web";
export const scrollShowsHorizontal = Platform.OS === "web";
